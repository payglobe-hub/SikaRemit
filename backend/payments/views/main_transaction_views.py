"""Transaction views: TransactionViewSet, AdminTransactionViewSet, SubscriptionViewSet, PaymentViewSet, USSD, mobile payment.
Split from main_views.py for maintainability."""
from .main_method_views import validate_payment_method  # noqa: F401
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
from rest_framework.permissions import IsAuthenticated
from users.permissions import IsAdminUser
from shared.constants import USER_TYPE_SUPER_ADMIN, USER_TYPE_MERCHANT, USER_TYPE_CUSTOMER
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

class TransactionViewSet(viewsets.ModelViewSet):
    serializer_class = TransactionSerializer
    permission_classes = [IsAuthenticated]
    throttle_classes = [EndpointThrottle]
    pagination_class = None  # Disable pagination for now, can be added later if needed

    def _ensure_user_profile(self, user):
        """Ensure user has the appropriate profile (Customer/Merchant)"""
        try:
            if user.user_type == USER_TYPE_CUSTOMER:  # customer
                if not hasattr(user, 'customer_profile'):
                    from users.models import Customer
                    Customer.objects.create(user=user)
                    logger.info(f"Created missing customer profile for user {user.id}")
            elif user.user_type == USER_TYPE_MERCHANT:  # merchant
                if not hasattr(user, 'merchant_profile'):
                    from users.models import Merchant
                    Merchant.objects.create(user=user)
                    logger.info(f"Created missing merchant profile for user {user.id}")
        except Exception as e:
            logger.error(f"Failed to create profile for user {user.id}: {e}")

    def get_queryset(self):
        user = self.request.user
        
        # Ensure profile exists
        self._ensure_user_profile(user)
        
        if user.user_type == USER_TYPE_MERCHANT:  # merchant
            # Check if merchant profile exists
            if hasattr(user, 'merchant_profile'):
                return Transaction.objects.filter(merchant__user=user)
            else:
                logger.warning(f"Merchant user {user.id} has no merchant profile")
                return Transaction.objects.none()
        elif user.user_type == USER_TYPE_CUSTOMER:  # customer
            # Check if customer profile exists
            if hasattr(user, 'customer_profile'):
                return Transaction.objects.filter(customer__user=user)
            else:
                logger.warning(f"Customer user {user.id} has no customer profile")
                return Transaction.objects.none()
        return Transaction.objects.none()  # Return empty queryset for other user types

    @action(detail=False, methods=['post'])
    @validate_payment_method
    def process_payment(self, request):
        """
        Process a new payment with KYC verification
        Required params:
        - merchant_id
        - amount
        - currency (default USD)
        - payment_method_id
        """
        try:
            logger.info(json.dumps({
                'type': 'payment_initiated',
                'request_id': request.request_id,
                'amount': request.data.get('amount'),
                'method': request.data.get('payment_method_id')
            }))

            # First check KYC eligibility before processing
            kyc_check = PaymentService._check_user_kyc_eligibility(request.user)
            if not kyc_check['eligible']:
                # User needs KYC verification
                return Response({
                    'error': kyc_check['error'],
                    'requires_kyc': True,
                    'kyc_status': kyc_check.get('kyc_status'),
                    'next_action': kyc_check.get('next_action'),
                    'transaction_attempts': kyc_check.get('transaction_attempts', 0)
                }, status=status.HTTP_403_FORBIDDEN)

            # User is verified, proceed with payment processing
            customer, _ = Customer.objects.get_or_create(user=request.user)
            merchant = Merchant.objects.get(id=request.data['merchant_id'])
            payment_method = request.payment_method

            txn = PaymentService.process_payment(
                customer=customer,
                merchant=merchant,
                amount=float(request.data['amount']),
                currency=request.data.get('currency', 'USD'),
                payment_method=payment_method,
                metadata=request.data.get('metadata')
            )

            logger.info(json.dumps({
                'type': 'payment_completed',
                'request_id': request.request_id,
                'transaction_id': txn.id,
                'status': 'success'
            }))

            serializer = self.get_serializer(txn)
            return Response(serializer.data, status=status.HTTP_201_CREATED)

        except Exception as e:
            logger.error(json.dumps({
                'type': 'payment_failed',
                'request_id': request.request_id,
                'error': str(e),
                'traceback': traceback.format_exc()
            }))
            return Response(
                {'error': str(e)},
                status=status.HTTP_400_BAD_REQUEST
            )
    
    @action(detail=True, methods=['post'])
    def refund(self, request, pk=None):
        """
        Process a refund for an existing transaction
        Optional params:
        - amount (partial refund if specified)
        """
        from ..gateways.stripe import StripeGateway
        from ..gateways.mobile_money import MobileMoneyGateway

        try:
            txn = self.get_object()
            amount = float(request.data.get('amount')) if 'amount' in request.data else None

            # Route to appropriate gateway based on payment method
            if txn.payment_method.method_type == PaymentMethod.CARD:
                gateway = StripeGateway()
            elif txn.payment_method.method_type in PaymentMethod.MOBILE_MONEY_TYPES:
                gateway = MobileMoneyGateway()
            elif txn.payment_method.method_type == PaymentMethod.SIKAREMIT_BALANCE:
                from ..gateways.sikaremit_balance import SikaRemitBalanceGateway
                gateway = SikaRemitBalanceGateway()
            elif txn.payment_method.method_type == PaymentMethod.BANK:
                # For bank transfers, refunds need to be processed manually
                return Response(
                    {'error': 'Bank transfers cannot be refunded automatically. Please contact support.'},
                    status=status.HTTP_400_BAD_REQUEST
                )
            else:
                return Response(
                    {'error': 'Refund not supported for this payment method'},
                    status=status.HTTP_400_BAD_REQUEST
                )

            # Process refund through gateway
            result = gateway.refund_payment(txn.transaction_id, amount)

            if result.get('success'):
                txn.status = Transaction.REFUNDED
                txn.save()

                serializer = self.get_serializer(txn)
                return Response(serializer.data)
            else:
                return Response(
                    {'error': result.get('error', 'Refund failed')},
                    status=status.HTTP_400_BAD_REQUEST
                )

        except Exception as e:
            return Response(
                {'error': str(e)},
                status=status.HTTP_400_BAD_REQUEST
            )

    @action(detail=False, methods=['post'])
    def process_bill_payment(self, request):
        """
        Process a bill payment
        ---
        parameters:
          - name: bill_reference
            required: true
            type: string
          - name: bill_type
            required: true
            type: string
            enum: [utility, tax, loan, other]
          - name: amount
            type: number
          - name: bill_issuer
            type: string
          - name: due_date
            type: string
            format: date
        responses:
          201:
            description: Bill payment processed
          400:
            description: Invalid bill payment data
        """
        try:
            serializer = BillPaymentSerializer(data=request.data)
            serializer.is_valid(raise_exception=True)
            
            payment = PaymentService.process_bill_payment(
                user=request.user,
                bill_data=serializer.validated_data
            )
            
            return Response(
                BillPaymentSerializer(payment).data,
                status=status.HTTP_201_CREATED
            )
        except Exception as e:
            logger.error(f"Bill payment failed: {str(e)}")
            return Response(
                {'error': str(e)},
                status=status.HTTP_400_BAD_REQUEST
            )

    @action(detail=False, methods=['get'])
    def pending_bills(self, request):
        """
        Get pending bill payments
        ---
        parameters:
          - name: bill_type
            type: string
            enum: [utility, tax, loan, other]
          - name: days_overdue
            type: integer
            description: Filter bills overdue by X days
        responses:
          200:
            description: List of pending bill payments
        """
        from django.utils import timezone
        from django.db.models import Q
        
        queryset = Payment.objects.filter(is_remitted=False)
        
        # Apply filters
        bill_type = request.query_params.get('bill_type')
        if bill_type:
            queryset = queryset.filter(bill_type=bill_type)
            
        days_overdue = request.query_params.get('days_overdue')
        if days_overdue:
            cutoff_date = timezone.now() - timezone.timedelta(days=int(days_overdue))
            queryset = queryset.filter(
                Q(due_date__lt=cutoff_date) | 
                Q(due_date__isnull=False, created_at__lt=cutoff_date)
            )
            
        serializer = BillPaymentSerializer(queryset, many=True)
        return Response(serializer.data)
    
    @action(detail=True, methods=['post'])
    def add_late_fee(self, request, pk=None):
        """
        Add late fee to overdue bill
        ---
        parameters:
          - name: amount
            type: number
            required: true
        responses:
          200:
            description: Updated bill payment
          400:
            description: Invalid request
        """
        from django.db import transaction
        
        payment = self.get_object()
        fee_amount = request.data.get('amount')
        
        if not fee_amount:
            return Response(
                {'error': 'Late fee amount is required'},
                status=status.HTTP_400_BAD_REQUEST
            )
            
        try:
            with transaction.atomic():
                payment.late_fee += float(fee_amount)
                payment.amount += float(fee_amount)
                payment.save()
                
                return Response(BillPaymentSerializer(payment).data)
        except Exception as e:
            return Response(
                {'error': str(e)},
                status=status.HTTP_400_BAD_REQUEST
            )

    @action(detail=False, methods=['get'])
    def detailed_remittance_report(self, request):
        """
        Get detailed remittance report with filters
        ---
        parameters:
          - name: bill_type
            type: string
            enum: [utility, tax, loan, other]
          - name: start_date
            type: string
            format: date
          - name: end_date
            type: string
            format: date
        responses:
          200:
            description: Detailed remittance report data
        """
        from .services.remittance_service import RemittanceService
        
        bill_type = request.query_params.get('bill_type')
        start_date = request.query_params.get('start_date')
        end_date = request.query_params.get('end_date')
        
        date_range = (start_date, end_date) if start_date or end_date else None
        
        report = RemittanceService.generate_detailed_remittance_report(
            bill_type=bill_type,
            date_range=date_range
        )
        
        return Response(report)

    @action(detail=False, methods=['get'])
    def recent(self, request):
        """
        Get recent transactions for the user
        ---
        parameters:
          - name: limit
            type: integer
            default: 10
            description: Number of recent transactions to return
        responses:
          200:
            description: List of recent transactions
        """
        limit = int(request.query_params.get('limit', 10))
        queryset = self.get_queryset().order_by('-created_at')[:limit]
        serializer = self.get_serializer(queryset, many=True)
        return Response(serializer.data)

    @action(detail=False, methods=['get'])
    def analytics(self, request):
        """Comprehensive analytics data"""
        from ..models.verification import VerificationLog, VerificationTrend
        from ..utils.alerts import AlertService
        from django.db.utils import OperationalError, ProgrammingError
        
        error = None

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
        except Exception as e:
            providers = []
            trends = []
            geo = []
            error = str(e)

        try:
            alerts = AlertService.get_recent_alerts()
        except Exception as e:
            alerts = []
            error = error or str(e)

        payload = {
            'alerts': alerts,
            'providers': providers,
            'trends': trends,
            'geo': geo,
        }
        if error:
            payload['error'] = error

        return Response(payload)

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
        
        try:
            health_status = {
                p.provider: {
                    'healthy': p.is_healthy,
                    'last_checked': p.last_checked,
                    'success_rate': p.success_rate,
                }
                for p in ProviderHealth.objects.all()
            }
            stats = list(
                VerificationLog.objects.values('provider').annotate(
                    total=Count('id'),
                    success_rate=Avg('success'),
                    avg_response_time=Avg('response_time'),
                ).order_by('-total')
            )
        except (OperationalError, ProgrammingError):
            health_status = {}
            stats = []

        return Response({
            'health_status': health_status,
            'verification_stats': stats,
        })

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

    @action(detail=False, methods=['post'])
    def verify_payment(self, request):
        """
        Verify a payment transaction
        """
        transaction_id = request.data.get('transaction_id')
        reference = request.data.get('reference')

        if not transaction_id or not reference:
            return Response(
                {'error': 'transaction_id and reference are required'},
                status=status.HTTP_400_BAD_REQUEST
            )

        try:
            transaction = Transaction.objects.get(
                id=transaction_id,
                customer__user=request.user
            )

            # Verify the payment with the gateway
            # This is a simplified implementation
            if transaction.status == Transaction.COMPLETED:
                return Response({
                    'success': True,
                    'status': 'verified',
                    'transaction': self.get_serializer(transaction).data
                })
            else:
                return Response({
                    'success': False,
                    'status': 'pending',
                    'message': 'Payment verification in progress'
                })

        except Transaction.DoesNotExist:
            return Response(
                {'error': 'Transaction not found'},
                status=status.HTTP_404_NOT_FOUND
            )
        except Exception as e:
            return Response(
                {'error': str(e)},
                status=status.HTTP_500_INTERNAL_SERVER_ERROR
            )

    @action(detail=False, methods=['post'])
    def request_refund(self, request):
        """
        Request a refund for a transaction
        """
        transaction_id = request.data.get('transaction_id')
        amount = request.data.get('amount')
        reason = request.data.get('reason')

        if not transaction_id or not reason:
            return Response(
                {'error': 'transaction_id and reason are required'},
                status=status.HTTP_400_BAD_REQUEST
            )

        try:
            transaction = Transaction.objects.get(
                id=transaction_id,
                customer__user=request.user
            )

            # Check if refund is possible
            if transaction.status != Transaction.COMPLETED:
                return Response(
                    {'error': 'Only completed transactions can be refunded'},
                    status=status.HTTP_400_BAD_REQUEST
                )

            # Route refund through the original payment gateway
            try:
                from payments.services.payment_service import PaymentProcessor
                processor = PaymentProcessor()
                refund_amount = Decimal(str(amount)) if amount else transaction.amount
                refunded_txn = processor.refund_payment(transaction, amount=float(refund_amount))

                return Response({
                    'success': True,
                    'message': 'Refund processed successfully',
                    'transaction': self.get_serializer(refunded_txn).data
                })
            except Exception as refund_err:
                logger.error(f"Gateway refund failed for transaction {transaction.id}: {refund_err}")
                return Response(
                    {'error': f'Refund processing failed: {str(refund_err)}'},
                    status=status.HTTP_500_INTERNAL_SERVER_ERROR
                )

        except Transaction.DoesNotExist:
            return Response(
                {'error': 'Transaction not found'},
                status=status.HTTP_404_NOT_FOUND
            )
        except Exception as e:
            return Response(
                {'error': str(e)},
                status=status.HTTP_500_INTERNAL_SERVER_ERROR
            )

class SubscriptionViewSet(viewsets.ModelViewSet):
    serializer_class = SubscriptionSerializer
    permission_classes = [IsAuthenticated]

    def get_queryset(self):
        return Subscription.objects.filter(customer__user=self.request.user)
    
    @action(detail=True, methods=['post'])
    def cancel(self, request, pk=None):
        """Cancel an active subscription"""
        subscription = self.get_object()
        subscription.status = Subscription.CANCELLED
        subscription.save()
        return Response({'status': 'subscription cancelled'})

    @action(detail=False, methods=['post'])
    def upgrade(self, request):
        """
        Upgrade subscription plan
        """
        plan_id = request.data.get('plan_id')
        payment_method_id = request.data.get('payment_method_id')

        if not plan_id or not payment_method_id:
            return Response(
                {'error': 'plan_id and payment_method_id are required'},
                status=status.HTTP_400_BAD_REQUEST
            )

        try:
            # Get user's current subscription
            current_subscription = Subscription.objects.filter(
                customer__user=request.user,
                status=Subscription.ACTIVE
            ).first()

            if not current_subscription:
                return Response(
                    {'error': 'No active subscription found'},
                    status=status.HTTP_400_BAD_REQUEST
                )

            # Get payment method
            payment_method = PaymentMethod.objects.get(
                id=payment_method_id,
                user=request.user
            )

            # Real subscription upgrade with payment processing
            from ..services.payment_service import PaymentService
            
            payment_service = PaymentService()
            upgrade_result = payment_service.process_subscription_upgrade(
                subscription=current_subscription,
                new_plan_id=plan_id,
                payment_method_id=request.data.get('payment_method_id'),
                user=request.user
            )
            
            if upgrade_result.get('success'):
                current_subscription.plan_id = plan_id
                current_subscription.save()
                
                return Response({
                    'status': 'success',
                    'message': 'Subscription upgraded successfully',
                    'new_plan': current_subscription.plan.name,
                    'next_billing_date': current_subscription.next_billing_date.isoformat()
                })
            else:
                return Response({
                    'error': 'Subscription upgrade failed',
                    'details': upgrade_result.get('error', 'Payment processing failed')
                }, status=status.HTTP_400_BAD_REQUEST)

        except PaymentMethod.DoesNotExist:
            return Response(
                {'error': 'Invalid payment method'},
                status=status.HTTP_400_BAD_REQUEST
            )
        except Exception as e:
            return Response(
                {'error': str(e)},
                status=status.HTTP_500_INTERNAL_SERVER_ERROR
            )

class AdminTransactionViewSet(viewsets.ModelViewSet):
    queryset = Transaction.objects.all().select_related('customer', 'merchant', 'payment_method')
    serializer_class = AdminTransactionSerializer
    permission_classes = [IsAdminUser]
    
    def get_queryset(self):
        queryset = super().get_queryset()
        # Add filtering capabilities
        user_id = self.request.query_params.get('user_id')
        status = self.request.query_params.get('status')
        
        if user_id:
            queryset = queryset.filter(user_id=user_id)
        if status:
            queryset = queryset.filter(status=status)
            
        return queryset.order_by('-created_at')

    @action(detail=True, methods=['post'])
    def override_status(self, request, pk=None):
        """
        Manually override transaction status (admin only)
        ---
        parameters:
          - name: status
            required: true
            type: string
            enum: [pending, completed, failed, refunded]
          - name: reason
            required: true
            type: string
            description: Reason for status override
        responses:
          200:
            description: Status updated successfully
          400:
            description: Invalid request or status transition
        """
        transaction = self.get_object()
        new_status = request.data.get('status')
        reason = request.data.get('reason')

        if not new_status or not reason:
            return Response(
                {'error': 'status and reason are required'},
                status=status.HTTP_400_BAD_REQUEST
            )

        # Validate status transition
        valid_statuses = [Transaction.PENDING, Transaction.COMPLETED, Transaction.FAILED, Transaction.REFUNDED]
        if new_status not in valid_statuses:
            return Response(
                {'error': f'Invalid status. Must be one of: {", ".join(valid_statuses)}'},
                status=status.HTTP_400_BAD_REQUEST
            )

        # Prevent invalid transitions
        if transaction.status == Transaction.REFUNDED and new_status != Transaction.REFUNDED:
            return Response(
                {'error': 'Cannot change status from refunded'},
                status=status.HTTP_400_BAD_REQUEST
            )

        # Update transaction
        old_status = transaction.status
        transaction.status = new_status
        transaction.description = f"{transaction.description or ''} [ADMIN OVERRIDE: {old_status} -> {new_status}] Reason: {reason}".strip()
        transaction.save()

        # Log admin action
        logger.info(f"Admin {request.user.id} manually changed transaction {transaction.id} status from {old_status} to {new_status}. Reason: {reason}")

        return Response({
            'message': f'Transaction status updated from {old_status} to {new_status}',
            'transaction': self.get_serializer(transaction).data
        })

    @action(detail=True, methods=['post'])
    def process_refund(self, request, pk=None):
        """
        Process a refund for a transaction (admin only)
        ---
        parameters:
          - name: refund_amount
            type: number
            description: Amount to refund (defaults to full transaction amount)
          - name: reason
            required: true
            type: string
            description: Reason for refund
        responses:
          200:
            description: Refund processed successfully
          400:
            description: Invalid refund request
        """
        transaction = self.get_object()
        refund_amount = request.data.get('refund_amount', transaction.amount)
        reason = request.data.get('reason')

        if not reason:
            return Response(
                {'error': 'reason is required'},
                status=status.HTTP_400_BAD_REQUEST
            )

        # Validate refund conditions
        if transaction.status == Transaction.REFUNDED:
            return Response(
                {'error': 'Transaction already refunded'},
                status=status.HTTP_400_BAD_REQUEST
            )

        if float(refund_amount) > float(transaction.amount):
            return Response(
                {'error': 'Refund amount cannot exceed transaction amount'},
                status=status.HTTP_400_BAD_REQUEST
            )

        # Update transaction status
        transaction.status = Transaction.REFUNDED
        transaction.description = f"{transaction.description or ''} [REFUNDED: ${refund_amount}] Reason: {reason}".strip()
        transaction.save()

        # Log refund action
        logger.info(f"Admin {request.user.id} processed refund for transaction {transaction.id} - Amount: ${refund_amount}, Reason: {reason}")

        return Response({
            'message': f'Refund processed for ${refund_amount}',
            'transaction': self.get_serializer(transaction).data
        })

    @action(detail=True, methods=['post'])
    def create_dispute(self, request, pk=None):
        """
        Create a dispute for a transaction (admin only)
        ---
        parameters:
          - name: reason
            required: true
            type: string
            description: Reason for the dispute
        responses:
          201:
            description: Dispute created successfully
          400:
            description: Invalid request
        """
        from ..models import Dispute

        transaction = self.get_object()
        reason = request.data.get('reason')

        if not reason:
            return Response(
                {'error': 'reason is required'},
                status=status.HTTP_400_BAD_REQUEST
            )

        # Check if dispute already exists
        if hasattr(transaction, 'dispute'):
            return Response(
                {'error': 'Dispute already exists for this transaction'},
                status=status.HTTP_400_BAD_REQUEST
            )

        # Create dispute
        dispute = Dispute.objects.create(
            transaction=transaction,
            reason=reason,
            created_by=request.user
        )

        # Log dispute creation
        logger.info(f"Admin {request.user.id} created dispute for transaction {transaction.id}. Reason: {reason}")

        return Response({
            'message': 'Dispute created successfully',
            'dispute': {
                'id': dispute.id,
                'status': dispute.status,
                'reason': dispute.reason,
                'created_at': dispute.created_at
            }
        }, status=status.HTTP_201_CREATED)

    @action(detail=True, methods=['post'])
    def resolve_dispute(self, request, pk=None):
        """
        Resolve a transaction dispute (admin only)
        ---
        parameters:
          - name: resolution
            required: true
            type: string
            description: Resolution details
          - name: action
            type: string
            enum: [refund, complete, close]
            description: Action to take when resolving dispute
        responses:
          200:
            description: Dispute resolved successfully
          400:
            description: Invalid request
        """
        from ..models import Dispute

        transaction = self.get_object()
        resolution = request.data.get('resolution')
        action = request.data.get('action', 'close')

        if not resolution:
            return Response(
                {'error': 'resolution is required'},
                status=status.HTTP_400_BAD_REQUEST
            )

        # Check if dispute exists
        if not hasattr(transaction, 'dispute'):
            return Response(
                {'error': 'No dispute exists for this transaction'},
                status=status.HTTP_400_BAD_REQUEST
            )

        dispute = transaction.dispute

        # Resolve dispute
        dispute.resolve(request.user, resolution)

        # Take additional action based on resolution
        if action == 'refund':
            transaction.status = Transaction.REFUNDED
            transaction.description = f"{transaction.description or ''} [DISPUTE RESOLVED - REFUNDED]".strip()
        elif action == 'complete':
            transaction.status = Transaction.COMPLETED
            transaction.description = f"{transaction.description or ''} [DISPUTE RESOLVED - COMPLETED]".strip()

        transaction.save()

        # Log dispute resolution
        logger.info(f"Admin {request.user.id} resolved dispute for transaction {transaction.id}. Action: {action}, Resolution: {resolution}")

        return Response({
            'message': f'Dispute resolved with action: {action}',
            'transaction': self.get_serializer(transaction).data,
            'dispute': {
                'id': dispute.id,
                'status': dispute.status,
                'resolution': dispute.resolution,
                'resolved_at': dispute.resolved_at
            }
        })

    @action(detail=True, methods=['post'])
    def manual_complete(self, request, pk=None):
        """
        Manually complete a pending transaction (admin only)
        ---
        parameters:
          - name: reason
            required: true
            type: string
            description: Reason for manual completion
        responses:
          200:
            description: Transaction manually completed
          400:
            description: Invalid request
        """
        transaction = self.get_object()
        reason = request.data.get('reason')

        if not reason:
            return Response(
                {'error': 'reason is required'},
                status=status.HTTP_400_BAD_REQUEST
            )

        # Validate current status
        if transaction.status not in [Transaction.PENDING, Transaction.FAILED]:
            return Response(
                {'error': 'Only pending or failed transactions can be manually completed'},
                status=status.HTTP_400_BAD_REQUEST
            )

        # Update transaction
        old_status = transaction.status
        transaction.status = Transaction.COMPLETED
        transaction.description = f"{transaction.description or ''} [MANUALLY COMPLETED from {old_status}] Reason: {reason}".strip()
        transaction.save()

        # Log manual completion
        logger.info(f"Admin {request.user.id} manually completed transaction {transaction.id} (was {old_status}). Reason: {reason}")

        return Response({
            'message': f'Transaction manually completed from {old_status}',
            'transaction': self.get_serializer(transaction).data
        })

class PaymentViewSet(viewsets.ViewSet):
    throttle_classes = [EndpointThrottle]
    
    def create(self, request):
        """Handle payment with idempotency key"""
        idempotency_key = request.headers.get('Idempotency-Key') or str(uuid4())
        
        # Check cache for existing response
        cached_response = cache.get(f'payment_{idempotency_key}')
        if cached_response:
            return Response(cached_response)
            
        try:
            # Get payment data from request
            amount = request.data.get('amount')
            payment_method = request.data.get('payment_method')
            payment_token = request.data.get('payment_token')
            
            # Process payment through payment service
            result = PaymentService.process_payment(
                user=request.user,
                amount=amount,
                payment_method=payment_method,
                payment_token=payment_token
            )
            
            # Cache successful responses for 24 hours
            if result.get('success'):
                cache.set(f'payment_{idempotency_key}', result, 86400)
                
            return Response(result)
        except Exception as e:
            return Response(
                {'error': str(e)},
                status=status.HTTP_400_BAD_REQUEST
            )

class VerifyMobilePaymentView(APIView):
    @staticmethod
    def post(request):
        """
        Verify mobile money payments
        """
        try:
            transaction_id = request.data.get('transaction_id')
            provider = request.data.get('provider')
            
            # Verify payment through payment service
            result = PaymentService.verify_mobile_payment(
                transaction_id=transaction_id,
                provider=provider
            )
            
            return Response(result, status=status.HTTP_200_OK)
        except Exception as e:
            return Response(
                {'error': str(e)},
                status=status.HTTP_400_BAD_REQUEST
            )

@api_view(['POST'])
def process_payment(request):
    """
    Process payment API endpoint
    """
    try:
        # Get payment data from request
        amount = request.data.get('amount')
        payment_method = request.data.get('payment_method')
        payment_token = request.data.get('payment_token')
        
        # Process payment through payment service
        result = PaymentService.process_payment(
            user=request.user,
            amount=amount,
            payment_method=payment_method,
            payment_token=payment_token
        )
        
        return Response(result, status=status.HTTP_200_OK)
    except Exception as e:
        return Response(
            {'error': str(e)},
            status=status.HTTP_400_BAD_REQUEST
        )

@api_view(['POST'])
def verify_mobile_payment(request):
    """
    Verify mobile payment API endpoint
    """
    try:
        transaction_id = request.data.get('transaction_id')
        provider = request.data.get('provider')
        
        # Verify payment through payment service
        result = PaymentService.verify_mobile_payment(
            transaction_id=transaction_id,
            provider=provider
        )
        
        return Response(result, status=status.HTTP_200_OK)
    except Exception as e:
        return Response(
            {'error': str(e)},
            status=status.HTTP_400_BAD_REQUEST
        )

class USSDCallbackView(APIView):
    """
    Handle USSD gateway callbacks and manage USSD payment flow
    Expected request format:
    {
        "sessionId": "unique-session-id",
        "phoneNumber": "233123456789",
        "serviceCode": "*123#",
        "text": "user input"  # Empty string for first request
    }
    """
    @staticmethod
    def post(request):
        from .models import USSDTransaction, Transaction
        from ..services import PaymentService
        
        session_id = request.data.get('sessionId')
        phone_number = request.data.get('phoneNumber')
        user_input = request.data.get('text', '')
        
        try:
            # Get or create USSD session
            ussd_txn, created = USSDTransaction.objects.get_or_create(
                session_id=session_id,
                defaults={
                    'phone_number': phone_number,
                    'status': USSDTransaction.NEW
                }
            )
            
            # Process user input based on current state
            if ussd_txn.status == USSDTransaction.NEW:
                if user_input:
                    # First input should be amount
                    try:
                        amount = float(user_input)
                        ussd_txn.amount = amount
                        ussd_txn.status = USSDTransaction.AMOUNT_ENTERED
                        ussd_txn.save()
                        response = ussd_txn.get_next_menu()
                    except ValueError:
                        response = "Invalid amount. Please enter a valid amount"
                else:
                    response = "Welcome to SikaRemit\nEnter amount:"
                    
            elif ussd_txn.status == USSDTransaction.AMOUNT_ENTERED:
                if user_input == '1':  # Confirmed
                    # Create payment transaction
                    transaction = Transaction.objects.create(
                        amount=ussd_txn.amount,
                        status=Transaction.PENDING,
                        payment_method=PaymentMethod.objects.get(method_type=PaymentMethod.MTN_MOMO)
                    )
                    
                    # Process payment
                    result = PaymentService._process_mobile_payment(
                        phone_number=ussd_txn.phone_number,
                        amount=ussd_txn.amount
                    )
                    
                    if result['success']:
                        ussd_txn.status = USSDTransaction.COMPLETED
                        ussd_txn.transaction = transaction
                        response = f"Payment of {ussd_txn.amount} processed successfully"
                    else:
                        ussd_txn.status = USSDTransaction.FAILED
                        response = f"Payment failed: {result.get('error')}"
                    
                    ussd_txn.save()
                elif user_input == '2':  # Cancelled
                    ussd_txn.status = USSDTransaction.FAILED
                    ussd_txn.save()
                    response = "Payment cancelled"
                else:
                    response = "Invalid input. Please select 1 to confirm or 2 to cancel"
            
            return Response({
                'response': response,
                'continueSession': ussd_txn.status not in [USSDTransaction.COMPLETED, USSDTransaction.FAILED]
            })
            
        except Exception as e:
            return Response(
                {'error': str(e)},
                status=status.HTTP_400_BAD_REQUEST
            )

class ScheduledPayoutViewSet(viewsets.ModelViewSet):
    queryset = ScheduledPayout.objects.all()
    serializer_class = ScheduledPayoutSerializer
    permission_classes = [IsAuthenticated]
    
    def get_queryset(self):
        """Filter payouts by merchant or show all for admin"""
        user = self.request.user
        if user.user_type == USER_TYPE_SUPER_ADMIN:  # admin
            return self.queryset
        return self.queryset.filter(merchant__user=user)
    
    @action(detail=True, methods=['post'])
    def process_now(self, request, pk=None):
        """Process payout immediately through payment gateway"""
        scheduled_payout = self.get_object()

        if scheduled_payout.status == ScheduledPayout.COMPLETED:
            return Response(
                {'error': 'Payout already processed'},
                status=status.HTTP_400_BAD_REQUEST
            )

        try:
            from payments.services.payment_processing_service import PaymentProcessingService
            processing_service = PaymentProcessingService()

            merchant = scheduled_payout.merchant
            payout_method = getattr(scheduled_payout, 'payout_method', 'mobile_money')
            provider = getattr(scheduled_payout, 'provider', 'mtn_momo')

            if payout_method in ('mobile_money', 'mtn_momo', 'telecel', 'airtel_tigo'):
                result = processing_service._process_mobile_payment(
                    phone_number=getattr(merchant, 'phone_number', ''),
                    amount=float(scheduled_payout.amount),
                    provider=provider,
                    currency=getattr(scheduled_payout, 'currency', 'GHS'),
                    metadata={
                        'type': 'scheduled_payout',
                        'payout_id': str(scheduled_payout.id),
                        'merchant_id': str(merchant.id) if merchant else '',
                    }
                )
            else:
                result = {'success': False, 'error': f'Unsupported payout method: {payout_method}'}

            if result.get('success'):
                scheduled_payout.status = ScheduledPayout.PROCESSING
                scheduled_payout.save()
                return Response({'status': 'payout submitted for processing'})
            else:
                scheduled_payout.status = ScheduledPayout.FAILED
                scheduled_payout.save()
                return Response(
                    {'error': result.get('error', 'Payout processing failed')},
                    status=status.HTTP_400_BAD_REQUEST
                )

        except Exception as e:
            logger.error(f"Payout processing failed for {scheduled_payout.id}: {e}")
            scheduled_payout.status = ScheduledPayout.FAILED
            scheduled_payout.save()
            return Response(
                {'error': 'Payout processing failed'},
                status=status.HTTP_500_INTERNAL_SERVER_ERROR
            )
    
    @action(detail=True, methods=['post'])
    def update_schedule(self, request, pk=None):
        """Update cron schedule and recalculate next execution"""
        scheduled_payout = self.get_object()
        schedule = request.data.get('schedule')
        if not schedule:
            return Response(
                {'error': 'schedule is required'},
                status=status.HTTP_400_BAD_REQUEST
            )
        
        scheduled_payout.schedule = schedule
        scheduled_payout.calculate_next_execution()
        scheduled_payout.save()
        
        serializer = self.get_serializer(scheduled_payout)
        return Response(serializer.data)

class USSDTransactionViewSet(viewsets.ModelViewSet):
    queryset = USSDTransaction.objects.all()
    serializer_class = USSDTransactionSerializer
    permission_classes = [IsAdminUser]

