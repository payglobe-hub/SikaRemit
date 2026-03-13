"""Verification, P2P, webhook, and misc payment views.
Split from main_views.py for maintainability."""
from .main_method_views import PaymentRateThrottle  # noqa: F401
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

class VerificationViewSet(viewsets.ViewSet):
    """
    API for verification services
    """
    permission_classes = [IsAuthenticated]
    
    @action(detail=False, methods=['post'])
    def verify_phone(self, request):
        """
        Verify recipient phone number
        ---
        parameters:
          - name: phone_number
            type: string
            required: true
        responses:
          200:
            description: Verification result
          400:
            description: Invalid request
        """
        from ..services.verification import VerificationService
        
        try:
            verified = VerificationService.verify_phone_number(
                request.data['phone_number']
            )
            return Response({'verified': verified})
        except Exception as e:
            return Response(
                {'error': str(e)},
                status=status.HTTP_400_BAD_REQUEST
            )
    
    @action(detail=False, methods=['post'])
    def verify_funds(self, request):
        """Verify source of funds"""
        from ..services.verification import VerificationService
        
        try:
            customer = request.user.customer
            verified = VerificationService.verify_source_of_funds(customer)
            customer.source_of_funds_verified = verified
            customer.save()
            
            return Response({'verified': verified})
        except Exception as e:
            return Response(
                {'error': str(e)},
                status=status.HTTP_400_BAD_REQUEST
            )

    @action(detail=False, methods=['get'])
    def available_providers(self, request):
        """List available verification providers"""
        return Response({
            'providers': [
                {
                    'name': 'africastalking',
                    'configured': bool(settings.AFRICASTALKING_API_KEY)
                },
                {
                    'name': 'twilio',
                    'configured': bool(settings.TWILIO_ACCOUNT_SID)
                },
                {
                    'name': 'nexmo',
                    'configured': bool(settings.NEXMO_API_KEY)
                }
            ],
            'current_provider': settings.PHONE_VERIFICATION_PROVIDER
        })

    @action(detail=False, methods=['post'])
    def test_provider(self, request):
        """
        Test verification provider
        ---
        parameters:
          - name: phone_number
            type: string
            required: true
        responses:
          200:
            description: Verification result
          400:
            description: Invalid request
        """
        from ..services.verification import VerificationService
        
        phone_number = request.data.get('phone_number')
        if not phone_number:
            return Response(
                {'error': 'phone_number is required'},
                status=status.HTTP_400_BAD_REQUEST
            )
            
        try:
            verified = VerificationService.verify_phone_number(phone_number)
            return Response({'verified': verified})
        except Exception as e:
            return Response(
                {'error': str(e)},
                status=status.HTTP_400_BAD_REQUEST
            )

    @action(detail=False, methods=['post'])
    def verify_recipient(self, request):
        """Verify recipient details (bank account or mobile money)"""
        from ..services.verification import VerificationService

        recipient_type = request.data.get('recipient_type')

        if recipient_type not in ['bank', 'mobile_money']:
            return Response(
                {'error': 'recipient_type must be bank or mobile_money'},
                status=status.HTTP_400_BAD_REQUEST
            )

        if recipient_type == 'bank':
            account_number = (request.data.get('account_number') or '').strip()
            bank_code = (request.data.get('bank_code') or '').strip()

            if not account_number:
                return Response(
                    {'error': 'account_number is required'},
                    status=status.HTTP_400_BAD_REQUEST
                )

            if not bank_code:
                return Response(
                    {'error': 'bank_code is required'},
                    status=status.HTTP_400_BAD_REQUEST
                )

            # Real bank verification via direct banking integration
            from ..gateways.bank_transfer import BankTransferGateway
            
            gateway = BankTransferGateway()
            if not gateway.default_provider:
                return Response(
                    {
                        'verified': False,
                        'error': 'Bank verification service not available',
                        'provider': 'none',
                        'reason': 'Bank integration not configured'
                    },
                    status=status.HTTP_503_SERVICE_UNAVAILABLE
                )
            
            # Verify bank account through the gateway
            try:
                verification_result = gateway.verify_account(
                    bank_code=bank_code,
                    account_number=account_number,
                )
                return Response(
                    {
                        'verified': verification_result.get('verified', False),
                        'verified_name': verification_result.get('account_name', ''),
                        'provider': gateway.default_provider,
                        'reason': verification_result.get('reason', 'Bank account verification completed')
                    },
                    status=status.HTTP_200_OK
                )
            except AttributeError:
                # Gateway doesn't support verify_account — cannot verify
                return Response(
                    {
                        'verified': False,
                        'error': 'Bank account verification not supported by current provider',
                        'provider': gateway.default_provider,
                    },
                    status=status.HTTP_501_NOT_IMPLEMENTED
                )
            except Exception as verify_err:
                logger.error(f"Bank account verification failed: {verify_err}")
                return Response(
                    {
                        'verified': False,
                        'error': 'Bank account verification failed',
                        'provider': gateway.default_provider,
                    },
                    status=status.HTTP_500_INTERNAL_SERVER_ERROR
                )

        phone_number = (request.data.get('phone_number') or '').strip()
        mobile_provider = (request.data.get('mobile_provider') or '').strip()

        if not phone_number:
            return Response(
                {'error': 'phone_number is required'},
                status=status.HTTP_400_BAD_REQUEST
            )

        try:
            verified = VerificationService.verify_phone_number(phone_number)
            return Response({
                'verified': bool(verified),
                'verified_name': None,
                'provider': mobile_provider or 'phone_validation'
            })
        except Exception as e:
            return Response(
                {'error': str(e)},
                status=status.HTTP_400_BAD_REQUEST
            )

    @action(detail=False, methods=['post'])
    def verification_test_endpoint(self, request):
        """
        Test verification endpoint
        ---
        parameters:
          - name: phone_number
            type: string
            required: true
        responses:
          200:
            description: Verification result
          400:
            description: Invalid request
        """
        from ..services.verification import VerificationService
        
        phone_number = request.data.get('phone_number')
        if not phone_number:
            return Response(
                {'error': 'phone_number is required'},
                status=status.HTTP_400_BAD_REQUEST
            )
            
        try:
            verified = VerificationService.verify_phone_number(phone_number)
            return Response({'verified': verified})
        except Exception as e:
            return Response(
                {'error': str(e)},
                status=status.HTTP_400_BAD_REQUEST
            )

    @action(detail=False, methods=['get'])
    def analytics(self, request):
        """Comprehensive analytics data"""
        from ..models.verification import VerificationLog, VerificationTrend
        from ..utils.alerts import AlertService
        from django.db.utils import OperationalError, ProgrammingError
        
        try:
            providers = list(
                VerificationLog.objects.values('provider').annotate(
                    total=Count('id'),
                    success_rate=Avg(
                        Case(When(success=True, then=100), default=0, output_field=FloatField())
                    ),
                    avg_time=Avg('response_time'),
                ).order_by('-total')
            )
            trends = list(
                VerificationTrend.objects.order_by('-date').values('date', 'success_rate', 'avg_response_time')[:30]
            )
            geo = list(VerificationLog.geographic_stats())
        except (OperationalError, ProgrammingError):
            providers = []
            trends = []
            geo = []

        return Response({
            'alerts': AlertService.get_recent_alerts(),
            'providers': providers,
            'trends': trends,
            'geo': geo,
        })

    @action(detail=False, methods=['get'])
    def provider_stats(self, request):
        """
        Get provider performance statistics
        ---
        responses:
          200:
            description: Provider statistics
        """
        from ..models.verification import VerificationLog, ProviderHealth
        from django.db.models import Avg, Count
        from django.db.utils import OperationalError, ProgrammingError
        
        error = None

        try:
            # Get provider health status
            health_status = {
                p.provider: {
                    'healthy': p.is_healthy,
                    'last_checked': p.last_checked,
                    'success_rate': p.success_rate
                }
                for p in ProviderHealth.objects.all()
            }
            
            # Get verification statistics
            stats = list(
                VerificationLog.objects.values('provider').annotate(
                    total=Count('id'),
                    success_rate=Avg('success'),
                    avg_response_time=Avg('response_time')
                ).order_by('-total')
            )
        except (OperationalError, ProgrammingError):
            health_status = {}
            stats = []
        except Exception as e:
            health_status = {}
            stats = []
            error = str(e)

        payload = {
            'health_status': health_status,
            'verification_stats': stats
        }
        if error:
            payload['error'] = error

        return Response(payload)

    @action(detail=False, methods=['get'])
    def geographic_analytics(self, request):
        """Comprehensive analytics data"""
        from ..models.verification import VerificationLog, ProviderHealth
        
        return Response({
            'providers': [
                {
                    'name': p.provider,
                    'healthy': p.is_healthy,
                    'success_rate': p.success_rate,
                    'response_time': p.response_time
                }
                for p in ProviderHealth.objects.all()
            ],
            'geo': list(VerificationLog.geographic_stats()),
            'alerts': self._get_recent_alerts()
        })
    
    def _get_recent_alerts(self):
        """Get recent outage alerts"""
        # In production, query from actual alert system
        return [
            {
                'provider': 'africastalking',
                'status': 'critical',
                'message': 'Timeout errors',
                'timestamp': '2025-10-31 14:30'
            }
        ]

class P2PPaymentView(APIView):
    """
    Handle peer-to-peer payment requests
    """
    permission_classes = [IsAuthenticated]
    throttle_classes = [PaymentRateThrottle]
    
    def post(self, request):
        """
        Process peer-to-peer payment
        Expected data: { amount, recipient, description, payment_method_id }
        """
        try:
            sender = Customer.objects.get(user=request.user)
            recipient_identifier = request.data.get('recipient')
            amount = Decimal(str(request.data.get('amount')))
            description = request.data.get('description', '')
            payment_method_id = request.data.get('payment_method_id')
            
            if not recipient_identifier or not amount or not payment_method_id:
                return Response(
                    {'error': 'recipient, amount, and payment_method_id are required'},
                    status=status.HTTP_400_BAD_REQUEST
                )
            
            # Find recipient by email or phone
            try:
                recipient = Customer.objects.get(
                    models.Q(user__email=recipient_identifier) | 
                    models.Q(phone_number=recipient_identifier)
                )
            except Customer.DoesNotExist:
                return Response(
                    {'error': 'Recipient not found'},
                    status=status.HTTP_404_NOT_FOUND
                )
            
            if recipient == sender:
                return Response(
                    {'error': 'Cannot send money to yourself'},
                    status=status.HTTP_400_BAD_REQUEST
                )
            
            # Get payment method
            try:
                payment_method = PaymentMethod.objects.get(
                    id=payment_method_id,
                    user=request.user
                )
            except PaymentMethod.DoesNotExist:
                return Response(
                    {'error': 'Invalid payment method'},
                    status=status.HTTP_400_BAD_REQUEST
                )
            
            # Create a special payment record for P2P
            # Note: This uses the Payment model but treats sender as customer and recipient as a pseudo-merchant
            payment = Payment.objects.create(
                customer=sender,
                merchant=None,  # P2P payment has no merchant
                amount=amount,
                currency=request.data.get('currency', 'GHS'),  # Use currency from request
                status='pending',
                payment_method=payment_method,  # Use the PaymentMethod object, not method_type string
                description=description,
                metadata={
                    'recipient_id': recipient.id,
                    'recipient_email': recipient.user.email,
                    'p2p_payment': True
                }
            )
            
            # Process the payment through the service
            result = PaymentService.process_p2p_payment(
                sender=sender,
                recipient=recipient,
                amount=amount,
                payment_method=payment_method,
                description=description
            )
            
            if result['success']:
                payment.status = 'completed'
                payment.transaction_id = result.get('transaction_id')
                payment.save()
                
                return Response({
                    'success': True,
                    'transaction_id': payment.transaction_id,
                    'amount': float(payment.amount),
                    'timestamp': payment.created_at.isoformat(),
                    'recipient': recipient.user.email
                }, status=status.HTTP_201_CREATED)
            else:
                payment.status = 'failed'
                payment.metadata['failure_reason'] = result.get('error', 'Payment failed')
                payment.save()
                
                return Response(
                    {'error': result.get('error', 'Payment failed')},
                    status=status.HTTP_400_BAD_REQUEST
                )
                
        except Exception as e:
            logger.error(f"P2P payment failed: {str(e)}")
            return Response(
                {'error': str(e)},
                status=status.HTTP_400_BAD_REQUEST
            )

class WebhookView(APIView):
    """Base webhook view with HMAC verification"""
    def verify_webhook(self, request):
        secret = settings.WEBHOOK_SECRET
        signature = request.headers.get('X-Signature')
        
        if not signature:
            return False
            
        expected_sig = hmac.new(
            secret.encode(),
            request.body,
            hashlib.sha256
        ).hexdigest()
        
        return hmac.compare_digest(signature, expected_sig)
    
    def post(self, request, *args, **kwargs):
        if not self.verify_webhook(request):
            return Response({'error': 'Invalid signature'}, status=403)
            
        try:
            payload = json.loads(request.body)
            return self.handle_webhook(payload)
        except json.JSONDecodeError:
            return Response({'error': 'Invalid payload'}, status=400)
    
    def handle_webhook(self, payload):
        """To be implemented by specific webhook handlers"""
        raise NotImplementedError



# Missing Payment API Endpoints Implementation

@api_view(['POST'])
@permission_classes([IsAuthenticated])
def verify_payment_view(request):
    """Verify payment status"""
    try:
        transaction_id = request.data.get('transaction_id')
        reference = request.data.get('reference')
        
        if not transaction_id:
            return Response({'error': 'Transaction ID required'}, status=400)
        
        # Real verification - check transaction status in database
        try:
            from ..models import Transaction
            transaction = Transaction.objects.get(id=transaction_id)
            return Response({
                'verified': transaction.status == 'completed',
                'status': transaction.status,
                'transaction_id': transaction_id,
                'amount': float(transaction.amount),
                'currency': transaction.currency_code,
                'created_at': transaction.created_at.isoformat()
            })
        except Transaction.DoesNotExist:
            return Response({
                'verified': False,
                'status': 'not_found',
                'transaction_id': transaction_id,
                'error': 'Transaction not found'
            }, status=status.HTTP_404_NOT_FOUND)
    except Exception as e:
        logger.error(f"Payment verification failed: {str(e)}")
        return Response({'error': str(e)}, status=500)


@api_view(['POST'])
@permission_classes([IsAuthenticated])
def request_refund_view(request):
    """Request payment refund"""
    try:
        transaction_id = request.data.get('transaction_id')
        amount = request.data.get('amount')
        reason = request.data.get('reason')
        
        if not all([transaction_id, amount, reason]):
            return Response({'error': 'Transaction ID, amount, and reason required'}, status=400)
        
        # Real refund processing
        try:
            from ..models import Transaction
            from ..services.payment_service import PaymentService
            
            transaction = Transaction.objects.get(id=transaction_id)
            
            # Check if refund is possible
            if transaction.status != 'completed':
                return Response({
                    'error': 'Only completed transactions can be refunded',
                    'transaction_status': transaction.status
                }, status=status.HTTP_400_BAD_REQUEST)
            
            # Process refund through payment service
            payment_service = PaymentService()
            refund_result = payment_service.refund_payment(
                transaction_id=transaction_id,
                amount=amount,
                reason=reason
            )
            
            if refund_result.get('success'):
                return Response({
                    'success': True,
                    'refund_id': refund_result.get('refund_id'),
                    'status': 'pending',
                    'amount': float(amount),
                    'currency': transaction.currency_code
                })
            else:
                return Response({
                    'error': refund_result.get('error', 'Refund processing failed'),
                    'success': False
                }, status=status.HTTP_400_BAD_REQUEST)
                
        except Transaction.DoesNotExist:
            return Response({
                'error': 'Transaction not found',
                'success': False
            }, status=status.HTTP_404_NOT_FOUND)
    except Exception as e:
        logger.error(f"Refund request failed: {str(e)}")
        return Response({'error': str(e)}, status=500)


@api_view(['POST'])
@permission_classes([IsAuthenticated])
def request_money_view(request):
    """Request money from another user"""
    try:
        amount = request.data.get('amount')
        currency = request.data.get('currency', 'USD')
        description = request.data.get('description', '')
        recipient = request.data.get('recipient')
        
        if not all([amount, recipient]):
            return Response({'error': 'Amount and recipient required'}, status=400)
        
        # Real money request processing
        try:
            from ..models import MoneyRequest
            from django.contrib.auth import get_user_model
            
            User = get_user_model()
            
            # Create money request record
            money_request = MoneyRequest.objects.create(
                sender=request.user,
                recipient_email=recipient,
                amount=amount,
                currency=currency,
                description=description,
                status='sent'
            )
            
            return Response({
                'success': True,
                'request_id': str(money_request.id),
                'status': 'sent',
                'amount': float(amount),
                'currency': currency,
                'recipient': recipient,
                'created_at': money_request.created_at.isoformat()
            })
            
        except Exception as e:
            logger.error(f"Money request creation failed: {str(e)}")
            return Response({
                'error': 'Failed to create money request',
                'details': str(e)
            }, status=status.HTTP_500_INTERNAL_SERVER_ERROR)
    except Exception as e:
        logger.error(f"Money request failed: {str(e)}")
        return Response({'error': str(e)}, status=500)


@api_view(['GET'])
@permission_classes([IsAuthenticated])
def data_plans_view(request):
    """Get available data plans"""
    try:
        # Real data plans from database
        from ..models import DataPlan
        
        data_plans = DataPlan.objects.filter(is_active=True).order_by('price')
        
        plans_data = []
        for plan in data_plans:
            plans_data.append({
                'id': str(plan.id),
                'name': plan.name,
                'data_amount': plan.data_amount,
                'validity_period': plan.validity_period,
                'price': float(plan.price),
                'provider': plan.provider,
                'is_active': plan.is_active,
                'description': plan.description
            })
        
        return Response({'results': plans_data})
    except Exception as e:
        logger.error(f"Data plans fetch failed: {str(e)}")
        return Response({'error': str(e)}, status=500)


class DomesticTransferViewSet(viewsets.ModelViewSet):
    serializer_class = DomesticTransferSerializer
    permission_classes = [IsAuthenticated]
    authentication_classes = [JWTAuthentication]

    def get_queryset(self):
        user = self.request.user
        customer = getattr(user, 'customer_profile', None) or getattr(user, 'customer', None)
        if customer:
            return DomesticTransfer.objects.filter(sender=customer)
        return DomesticTransfer.objects.none()

    def get_serializer_context(self):
        context = super().get_serializer_context()
        context['request'] = self.request
        return context

    def create(self, request, *args, **kwargs):
        try:
            logger.info(f"DomesticTransfer create request data: {request.data}")
            return super().create(request, *args, **kwargs)
        except Exception as e:
            import traceback
            error_trace = traceback.format_exc()
            logger.error(f"DomesticTransfer create error: {str(e)}\n{error_trace}")
            print(f"DomesticTransfer create error: {str(e)}\n{error_trace}")
            return Response({'error': str(e), 'detail': error_trace}, status=500)

    def perform_create(self, serializer):
        from rest_framework import serializers as drf_serializers
        user = self.request.user
        customer = getattr(user, 'customer_profile', None) or getattr(user, 'customer', None)
        if customer:
            serializer.save(sender=customer)
        else:
            raise drf_serializers.ValidationError("User must be a customer to create domestic transfers")

    @action(detail=True, methods=['post'])
    def process_transfer(self, request, pk=None):
        """Process a pending domestic transfer"""
        transfer = self.get_object()
        
        if transfer.status != 'pending':
            return Response({'error': 'Transfer is not in pending status'}, status=400)
        
        try:
            from payments.services.payment_processing_service import PaymentProcessingService
            processing_service = PaymentProcessingService()

            # Determine transfer method and route through appropriate gateway
            payment_method_type = getattr(transfer, 'payment_method_type', 'mobile_money')

            if payment_method_type in ('mobile_money', 'mtn_momo', 'telecel', 'airtel_tigo', 'g_money'):
                from payments.gateways.mobile_money import (
                    MTNMoMoGateway, TelecelCashGateway, AirtelTigoMoneyGateway, GMoneyGateway
                )
                gateway_map = {
                    'mtn_momo': MTNMoMoGateway,
                    'telecel': TelecelCashGateway,
                    'airtel_tigo': AirtelTigoMoneyGateway,
                    'g_money': GMoneyGateway,
                    'mobile_money': MTNMoMoGateway,
                }
                gateway_class = gateway_map.get(payment_method_type, MTNMoMoGateway)
                gateway = gateway_class()
                result = gateway.process_payment(
                    amount=float(transfer.amount),
                    currency=getattr(transfer, 'currency', 'GHS'),
                    phone_number=getattr(transfer, 'recipient_phone', ''),
                    customer=transfer.sender,
                    merchant=None,
                    metadata={'transfer_id': str(transfer.id), 'type': 'domestic_transfer'}
                )
            elif payment_method_type == 'bank_transfer':
                from payments.gateways.bank_transfer import BankTransferGateway
                gateway = BankTransferGateway()
                if not gateway.default_provider:
                    return Response({'error': 'Bank transfer gateway not configured'}, status=503)
                result = gateway.disburse_funds(
                    amount=float(transfer.amount),
                    currency=getattr(transfer, 'currency', 'GHS'),
                    bank_code=getattr(transfer, 'recipient_bank_code', ''),
                    account_number=getattr(transfer, 'recipient_account_number', ''),
                    account_name=getattr(transfer, 'recipient_name', ''),
                    recipient_name=getattr(transfer, 'recipient_name', ''),
                    recipient_email='',
                    metadata={'transfer_id': str(transfer.id), 'type': 'domestic_transfer'}
                )
            else:
                return Response({'error': f'Unsupported transfer method: {payment_method_type}'}, status=400)

            if not result.get('success'):
                transfer.status = 'failed'
                transfer.save()
                return Response({'error': result.get('error', 'Transfer processing failed')}, status=400)

            # DB update inside atomic block — refund if save fails
            try:
                from django.db import transaction as db_transaction
                with db_transaction.atomic():
                    transfer.status = 'processing'
                    transfer.processed_at = timezone.now()
                    transfer.save()
            except Exception as db_err:
                logger.error(f"DB save failed after transfer charge, issuing refund: {db_err}")
                try:
                    gateway_tx_id = result.get('transaction_id')
                    if payment_method_type in ('mobile_money', 'mtn_momo', 'telecel', 'airtel_tigo', 'g_money'):
                        gateway.refund_payment(
                            transaction_id=gateway_tx_id,
                            amount=float(transfer.amount),
                            reason='DB save failed after charge'
                        )
                    else:
                        gateway.refund_payment(
                            transaction_id=gateway_tx_id,
                            amount=float(transfer.amount),
                            reason='DB save failed after charge'
                        )
                except Exception as refund_err:
                    logger.critical(
                        f"REFUND ALSO FAILED for transfer {transfer.id}, "
                        f"gateway_tx={result.get('transaction_id')}, "
                        f"amount={transfer.amount}: {refund_err}"
                    )
                return Response(
                    {'error': 'Transfer was charged but recording failed. A refund has been initiated.'},
                    status=500
                )

            return Response({'message': 'Transfer submitted for processing', 'gateway_ref': result.get('transaction_id')})

        except Exception as e:
            transfer.status = 'failed'
            transfer.save()
            logger.error(f"Transfer processing failed: {str(e)}")
            return Response({'error': str(e)}, status=500)
