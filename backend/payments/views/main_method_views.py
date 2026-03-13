"""Payment method views: PaymentMethodViewSet, throttle, decorator.
Split from main_views.py for maintainability."""
from rest_framework import viewsets
from rest_framework.decorators import action, api_view, permission_classes
from rest_framework.throttling import UserRateThrottle
from ..models.payment_method import PaymentMethod
from ..models.transaction import Transaction
from ..models import USSDTransaction
from ..models.subscriptions import Subscription
from ..models.scheduled_payout import ScheduledPayout
from ..models.cross_border import CrossBorderRemittance
from payments.models import DomesticTransfer
from ..models.verification import VerificationLog
from users.models import Customer, Merchant
from ..serializers import PaymentMethodSerializer, TransactionSerializer, SubscriptionSerializer, ScheduledPayoutSerializer, USSDTransactionSerializer, AdminTransactionSerializer, DomesticTransferSerializer
from ..serializers.cross_border import CrossBorderRemittanceSerializer
# from accounts.serializers import BillPaymentSerializer
from rest_framework.permissions import IsAuthenticated, IsAdminUser
from rest_framework.response import Response
from rest_framework import status
from rest_framework.views import APIView
from rest_framework_simplejwt.authentication import JWTAuthentication
from ..services import PaymentService
import logging
import traceback
from django.db import models
from django.core.cache import cache
from uuid import uuid4
from ..throttling import EndpointThrottle
from decimal import Decimal
from django.conf import settings
from django.db.models import Count, Avg, Case, When, IntegerField, FloatField
import json
import hashlib
import hmac
from datetime import datetime, timedelta
from django.utils import timezone
from cryptography.hazmat.primitives import hashes
from cryptography.hazmat.primitives.hmac import HMAC
from cryptography.hazmat.backends import default_backend
from functools import wraps
from django.http import JsonResponse
from django.utils import timezone
import hmac
import hashlib
import json
import requests

logger = logging.getLogger(__name__)

def validate_payment_method(view_func):
    """Decorator to validate payment method before processing"""
    @wraps(view_func)
    def wrapper(request, *args, **kwargs):
        payment_method_id = request.data.get('payment_method_id')
        if not payment_method_id:
            return JsonResponse({'error': 'Payment method ID is required'}, status=400)
        try:
            payment_method = PaymentMethod.objects.get(
                id=payment_method_id,
                user=request.user
            )
            
            if not payment_method.is_active:
                return JsonResponse({'error': 'Payment method not active'}, status=400)
                
            request.payment_method = payment_method
            return view_func(request, *args, **kwargs)
            
        except PaymentMethod.DoesNotExist:
            return JsonResponse({'error': 'Invalid payment method'}, status=400)
    return wrapper

@api_view(['POST'])
@permission_classes([IsAuthenticated])

class PaymentRateThrottle(UserRateThrottle):
    """Custom rate limit for payment endpoints"""
    scope = 'payment'
    rate = '30/hour'

class PaymentMethodViewSet(viewsets.ModelViewSet):
    serializer_class = PaymentMethodSerializer
    permission_classes = [IsAuthenticated]

    def get_queryset(self):
        return PaymentMethod.objects.filter(user=self.request.user)
    
    def perform_create(self, serializer):
        serializer.save(user=self.request.user)
    
    def perform_destroy(self, instance):
        instance.delete()
    
    @action(detail=True, methods=['post'])
    def set_default(self, request, pk=None):
        """Set a payment method as default"""
        payment_method = self.get_object()
        
        # Remove default from all other methods
        PaymentMethod.objects.filter(
            user=request.user,
            is_default=True
        ).update(is_default=False)
        
        # Set this method as default
        payment_method.is_default = True
        payment_method.save()
        
        serializer = self.get_serializer(payment_method)
        return Response({
            'status': 'success',
            'message': 'Default payment method updated',
            'data': serializer.data
        })
    
    @action(detail=True, methods=['post'])
    def verify(self, request, pk=None):
        """Verify a payment method"""
        from ..gateways.stripe import StripeGateway
        from ..gateways.mobile_money import MobileMoneyGateway

        payment_method = self.get_object()
        verification_type = request.data.get('verification_type', 'micro_deposit')

        try:
            if payment_method.method_type == PaymentMethod.CARD:
                # For cards, use Stripe's verification
                gateway = StripeGateway()
                # Create a verification charge to confirm card ownership
                verification_result = gateway.verify_payment_method(
                    payment_method_id=payment_method.id,
                    customer=request.user.customer_profile
                )
                
                if verification_result.get('success'):
                    payment_method.details['verified'] = True
                    payment_method.details['verified_at'] = str(timezone.now())
                    payment_method.details['verification_id'] = verification_result.get('verification_id')
                    payment_method.save()
                else:
                    return Response({
                        'error': 'Card verification failed',
                        'details': verification_result.get('error', 'Unable to verify card')
                    }, status=status.HTTP_400_BAD_REQUEST)

                return Response({
                    'status': 'success',
                    'message': 'Card verification completed successfully'
                })

            elif payment_method.method_type in PaymentMethod.MOBILE_MONEY_TYPES:
                # For mobile money, use direct mobile money verification
                gateway = MobileMoneyGateway()
                # Send verification request to user's phone
                verification_result = gateway.verify_payment_method(
                    payment_method_id=payment_method.id,
                    customer=request.user.customer_profile
                )
                
                if verification_result.get('success'):
                    payment_method.details['verified'] = True
                    payment_method.details['verified_at'] = str(timezone.now())
                    payment_method.details['verification_reference'] = verification_result.get('reference')
                    payment_method.save()
                else:
                    return Response({
                        'error': 'Mobile money verification failed',
                        'details': verification_result.get('error', 'Unable to verify mobile money')
                    }, status=status.HTTP_400_BAD_REQUEST)

                return Response({
                    'status': 'success',
                    'message': 'Mobile money verification completed successfully'
                })

            elif payment_method.method_type == PaymentMethod.BANK:
                # For bank accounts, we would use micro-deposits or instant verification
                # This would require integration with bank APIs
                return Response({
                    'status': 'pending',
                    'message': 'Bank verification initiated. Please check your account in 1-2 business days.',
                    'verification_id': f'VER-{payment_method.id}-{uuid4().hex[:8]}'
                })

            else:
                # Default verification for other methods
                payment_method.details['verified'] = True
                payment_method.details['verified_at'] = str(timezone.now())
                payment_method.save()

                return Response({
                    'status': 'success',
                    'message': 'Payment method verified'
                })

        except Exception as e:
            return Response(
                {'error': f'Verification failed: {str(e)}'},
                status=status.HTTP_400_BAD_REQUEST
            )
    
    @action(detail=True, methods=['post'])
    def confirm_verification(self, request, pk=None):
        """Confirm payment method verification"""
        payment_method = self.get_object()
        verification_code = request.data.get('code')
        verification_id = request.data.get('verification_id')

        try:
            if not verification_code:
                return Response(
                    {'error': 'Verification code is required'},
                    status=status.HTTP_400_BAD_REQUEST
                )

            # Verify code against the stored verification code from the gateway
            stored_code = payment_method.details.get('pending_verification_code')
            stored_id = payment_method.details.get('pending_verification_id')

            if not stored_code and not stored_id:
                return Response(
                    {'error': 'No pending verification found. Please initiate verification first.'},
                    status=status.HTTP_400_BAD_REQUEST
                )

            # If we have a verification_id, verify against the gateway
            if verification_id and stored_id:
                try:
                    method_type = payment_method.method_type
                    if method_type == 'card':
                        from payments.gateways.stripe import StripeGateway
                        gateway = StripeGateway()
                        verified = gateway.confirm_verification(stored_id, verification_code)
                    elif method_type in ('mtn_momo', 'telecel', 'airtel_tigo', 'g_money'):
                        from payments.gateways.mobile_money import (
                            MTNMoMoGateway, TelecelCashGateway, AirtelTigoMoneyGateway, GMoneyGateway
                        )
                        gw_map = {
                            'mtn_momo': MTNMoMoGateway, 'telecel': TelecelCashGateway,
                            'airtel_tigo': AirtelTigoMoneyGateway, 'g_money': GMoneyGateway,
                        }
                        gateway = gw_map.get(method_type, MTNMoMoGateway)()
                        verified = gateway.confirm_verification(stored_id, verification_code)
                    else:
                        verified = False

                    if verified:
                        payment_method.details['verified'] = True
                        payment_method.details['verified_at'] = str(timezone.now())
                        payment_method.details.pop('pending_verification_code', None)
                        payment_method.details.pop('pending_verification_id', None)
                        payment_method.save()
                        return Response({'status': 'success', 'message': 'Payment method verified successfully'})
                    else:
                        return Response({'error': 'Verification failed. Invalid code.'}, status=status.HTTP_400_BAD_REQUEST)
                except AttributeError:
                    # Gateway doesn't have confirm_verification — fall through to code match
                    pass

            # Fallback: match against stored OTP code
            if stored_code and verification_code == stored_code:
                payment_method.details['verified'] = True
                payment_method.details['verified_at'] = str(timezone.now())
                payment_method.details.pop('pending_verification_code', None)
                payment_method.details.pop('pending_verification_id', None)
                payment_method.save()
                return Response({'status': 'success', 'message': 'Payment method verified successfully'})
            else:
                return Response(
                    {'error': 'Invalid verification code'},
                    status=status.HTTP_400_BAD_REQUEST
                )

        except Exception as e:
            return Response(
                {'error': f'Verification confirmation failed: {str(e)}'},
                status=status.HTTP_400_BAD_REQUEST
            )
    
    @action(detail=False, methods=['get'])
    def analytics(self, request):
        """Get payment method usage analytics"""
        from django.db.models import Count, Sum, Avg
        from ..models.transaction import Transaction
        from datetime import timedelta
        from django.utils import timezone
        
        user_methods = self.get_queryset()
        
        # Get date range from query params
        days = int(request.query_params.get('days', 30))
        start_date = timezone.now() - timedelta(days=days)
        
        analytics_data = []
        
        for method in user_methods:
            # Get transactions using this payment method
            transactions = Transaction.objects.filter(
                payment_method=method,
                created_at__gte=start_date
            )
            
            method_analytics = {
                'id': method.id,
                'method_type': method.method_type,
                'display_name': self._get_display_name(method),
                'is_default': method.is_default,
                'total_transactions': transactions.count(),
                'total_amount': float(transactions.aggregate(Sum('amount'))['amount__sum'] or 0),
                'avg_transaction': float(transactions.aggregate(Avg('amount'))['amount__avg'] or 0),
                'success_rate': self._calculate_success_rate(transactions),
                'last_used': transactions.order_by('-created_at').first().created_at if transactions.exists() else None,
                'created_at': method.created_at
            }
            
            analytics_data.append(method_analytics)
        
        # Sort by total transactions
        analytics_data.sort(key=lambda x: x['total_transactions'], reverse=True)
        
        return Response({
            'period_days': days,
            'total_methods': len(analytics_data),
            'methods': analytics_data,
            'summary': {
                'most_used': analytics_data[0] if analytics_data else None,
                'total_transactions': sum(m['total_transactions'] for m in analytics_data),
                'total_amount': sum(m['total_amount'] for m in analytics_data)
            }
        })
    
    def _get_display_name(self, method):
        """Get display name for payment method"""
        if method.method_type == PaymentMethod.CARD:
            return f"{method.details.get('brand', 'Card')} ending in {method.details.get('last4', '****')}"
        elif method.method_type == PaymentMethod.BANK:
            return f"{method.details.get('bank_name', 'Bank')} - {method.details.get('account_number', '')[-4:]}"
        elif method.method_type == PaymentMethod.MTN_MOMO:
            return f"MTN Mobile Money - {method.details.get('phone_number', '')}"
        elif method.method_type == PaymentMethod.TELECEL:
            return f"Telecel Cash - {method.details.get('phone_number', '')}"
        elif method.method_type == PaymentMethod.AIRTEL_TIGO:
            return f"AirtelTigo Money - {method.details.get('phone_number', '')}"
        else:
            return method.get_method_type_display()
    
    def _calculate_success_rate(self, transactions):
        """Calculate success rate for transactions"""
        total = transactions.count()
        if total == 0:
            return 100.0
        
        from ..models.transaction import Transaction
        successful = transactions.filter(status=Transaction.COMPLETED).count()
        return round((successful / total) * 100, 2)

