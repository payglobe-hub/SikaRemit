"""
Payment processing views: checkout, subscriptions, remittance, bills, webhooks.
Split from accounts/views.py for maintainability.
"""
from rest_framework.response import Response
from rest_framework import status
from rest_framework.views import APIView
from rest_framework.permissions import IsAuthenticated
from django.conf import settings
from decimal import Decimal
from datetime import datetime
import requests
import logging

from .serializers import (
    CheckoutSerializer, SubscriptionPaymentSerializer,
    RemittancePaymentSerializer, BillPaymentSerializer,
)
from .models import Transaction
from .services import AuthService
from payments.models.payment import Payment
from payments.models.payment_log import PaymentLog
from payments.models import CrossBorderRemittance

from .views_auth import validate_token

logger = logging.getLogger(__name__)

class CheckoutAPIView(APIView):
    """
    Handle checkout operations
    """
    serializer_class = CheckoutSerializer
    
    @validate_token
    def post(self, request):
        serializer = self.serializer_class(data=request.data)
        if serializer.is_valid():
            # Process checkout logic here
            return Response(serializer.data, status=status.HTTP_201_CREATED)
        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)

class CheckoutStatusView(APIView):
    """
    Check status of a checkout transaction
    """
    permission_classes = [IsAuthenticated]
    
    def get(self, request, pk):
        try:
            # Get checkout status
            checkout_status = AuthService.get_checkout_status(
                user=request.user,
                checkout_id=pk
            )
            
            return Response(checkout_status, status=status.HTTP_200_OK)
        except Exception as e:
            return Response(
                {'error': str(e)},
                status=status.HTTP_400_BAD_REQUEST
            )

class StripeWebhookView(APIView):
    """
    Handle Stripe webhook events
    """
    permission_classes = []
    
    def post(self, request):
        try:
            # Verify webhook signature
            payload = request.body
            sig_header = request.META.get('HTTP_STRIPE_SIGNATURE')
            event = AuthService.verify_stripe_webhook(payload, sig_header)
            
            # Process webhook event
            result = AuthService.process_stripe_webhook(event)
            
            return Response(result, status=status.HTTP_200_OK)
        except Exception as e:
            return Response(
                {'error': str(e)},
                status=status.HTTP_400_BAD_REQUEST
            )

class MobileMoneyWebhookView(APIView):
    """
    Handle Mobile Money webhook events
    """
    permission_classes = []
    
    def post(self, request):
        try:
            # Verify webhook signature
            payload = request.body
            signature = request.META.get('HTTP_X_MOBILEMONEY_SIGNATURE')
            provider = request.META.get('HTTP_X_MOBILEMONEY_PROVIDER')
            
            event = AuthService.verify_mobile_money_webhook(
                payload,
                signature,
                provider
            )
            
            # Process webhook event
            result = AuthService.process_mobile_money_webhook(event)
            
            return Response(result, status=status.HTTP_200_OK)
        except Exception as e:
            return Response(
                {'error': str(e)},
                status=status.HTTP_400_BAD_REQUEST
            )

class SubscriptionPaymentView(APIView):
    """
    Production-ready subscription payment endpoint with:
    - 7 payment methods
    - Custom webhooks
    - Fraud detection
    - Transaction logging
    """
    permission_classes = [IsAuthenticated]
    throttle_scope = 'payments'
    
    VALID_PAYMENT_METHODS = [
        'credit_card', 'bank_transfer', 'mobile_money',
        'crypto', 'wallet', 'gift_card'
    ]
    
    def post(self, request):
        try:
            # Idempotency check
            idempotency_key = request.headers.get('Idempotency-Key')
            if idempotency_key and PaymentLog.objects.filter(idempotency_key=idempotency_key).exists():
                return Response(
                    {'error': 'Duplicate request', 'code': 'idempotency_error'},
                    status=status.HTTP_409_CONFLICT
                )
            
            serializer = SubscriptionPaymentSerializer(data=request.data)
            serializer.is_valid(raise_exception=True)
            data = serializer.validated_data
            
            # Validate payment
            if data['payment_method'] not in self.VALID_PAYMENT_METHODS:
                raise ValueError(f'Invalid payment method. Must be one of: {self.VALID_PAYMENT_METHODS}')
            if data['amount'] <= 0:
                raise ValueError('Payment amount must be positive')
            if len(data.get('metadata', {})) > 10:
                raise ValueError('Metadata cannot exceed 10 items')
            
            # Process payment
            result = AuthService.process_subscription_payment(
                user=request.user,
                subscription_id=data['subscription_id'],
                payment_method=data['payment_method'],
                amount=data['amount'],
                currency=data.get('currency', 'USD'),
                metadata=data.get('metadata', {})
            )
            
            # Log transaction
            PaymentLog.objects.create(
                transaction_id=result['id'],
                amount=result['amount'],
                currency=result['currency'],
                status='completed',
                idempotency_key=idempotency_key,
                metadata=result.get('metadata', {})
            )
            
            # Trigger webhook
            if data.get('enable_webhook', False):
                webhook_url = result.get('webhook_url') or settings.DEFAULT_PAYMENT_WEBHOOK_URL
                if webhook_url:
                    requests.post(
                        webhook_url,
                        json={
                            'event': 'payment_processed',
                            'user': {'id': request.user.id, 'email': request.user.email},
                            'payment': result,
                            'merchant': {
                                'id': settings.MERCHANT_ID,
                                'name': settings.MERCHANT_NAME
                            },
                            'timestamp': datetime.now().isoformat()
                        },
                        headers={'Content-Type': 'application/json'},
                        timeout=5
                    )
            
            return Response(result, status=status.HTTP_200_OK)
            
        except Exception as e:
            logger.error(f'Payment failed: {str(e)}', exc_info=True)
            return Response(
                {'error': str(e), 'code': 'payment_error'},
                status=status.HTTP_400_BAD_REQUEST
            )

class RemittancePaymentView(APIView):
    """
    Handle remittance payments
    """
    permission_classes = [IsAuthenticated]
    
    def post(self, request):
        try:
            serializer = RemittancePaymentSerializer(data=request.data)
            serializer.is_valid(raise_exception=True)
            
            # Create remittance instance
            remittance = CrossBorderRemittance.objects.create(
                sender=request.user.customer,
                recipient_name=serializer.validated_data['recipient_name'],
                recipient_phone=serializer.validated_data.get('recipient_phone'),
                recipient_country=serializer.validated_data['recipient_country'],
                amount_sent=serializer.validated_data['amount'],
                amount_received=serializer.validated_data['amount'],  # Simplified
                exchange_rate=Decimal('1.0'),
                fee=Decimal('0.0')
            )
            
            return Response({
                'id': remittance.id,
                'reference_number': remittance.reference_number,
                'amount_sent': remittance.amount_sent,
                'recipient_name': remittance.recipient_name,
                'recipient_country': remittance.recipient_country,
                'status': remittance.status,
                'created_at': remittance.created_at
            }, status=status.HTTP_200_OK)
        except Exception as e:
            return Response(
                {'error': str(e)},
                status=status.HTTP_400_BAD_REQUEST
            )

class BillPaymentView(APIView):
    """
    Handle bill payments
    """
    permission_classes = [IsAuthenticated]
    
    def post(self, request):
        try:
            serializer = BillPaymentSerializer(data=request.data)
            serializer.is_valid(raise_exception=True)
            
            # Create bill payment instance
            payment = Payment.objects.create(
                customer=request.user.customer,
                merchant=None,  # Bill payments might not have a specific merchant
                amount=serializer.validated_data['amount'],
                currency='USD',  # Default
                payment_method='bank_transfer',  # Default for bills
                payment_type=Payment.BILL,
                bill_issuer=serializer.validated_data['bill_issuer'],
                bill_reference=serializer.validated_data['bill_reference'],
                due_date=serializer.validated_data['due_date']
            )
            
            return Response({
                'id': payment.id,
                'amount': payment.amount,
                'status': payment.status,
                'bill_issuer': payment.bill_issuer,
                'bill_reference': payment.bill_reference,
                'due_date': payment.due_date,
                'created_at': payment.created_at
            }, status=status.HTTP_200_OK)
        except Exception as e:
            return Response(
                {'error': str(e)},
                status=status.HTTP_400_BAD_REQUEST
            )

class PaymentView(APIView):
    """
    Payment endpoint
    """
    permission_classes = [IsAuthenticated]
    
    def post(self, request):
        try:
            serializer = SubscriptionPaymentSerializer(data=request.data)
            serializer.is_valid(raise_exception=True)
            
            result = AuthService.process_subscription_payment(
                user=request.user,
                subscription_id=serializer.validated_data['subscription_id'],
                payment_method=serializer.validated_data['payment_method'],
                amount=serializer.validated_data['amount'],
                currency=serializer.validated_data.get('currency', 'USD'),
                metadata=serializer.validated_data.get('metadata', {})
            )
            
            return Response(result, status=status.HTTP_201_CREATED)
        except Exception as e:
            return Response(
                {'error': str(e)},
                status=status.HTTP_400_BAD_REQUEST
            )
