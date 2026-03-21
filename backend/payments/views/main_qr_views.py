"""QR payment views: validation, processing, generation.
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

def validate_qr_payment(request):
    """Validate QR code for payment"""
    qr_data = request.data.get('qr_data')
    
    if not qr_data:
        return Response(
            {'error': 'QR data is required'},
            status=status.HTTP_400_BAD_REQUEST
        )
    
    try:
        # Parse QR data
        try:
            qr_payload = json.loads(qr_data)
        except json.JSONDecodeError:
            # If not JSON, treat as reference
            qr_payload = {'reference': qr_data}
        
        # Validate QR structure
        if qr_payload.get('type') == 'sikaremit_payment':
            # Validate merchant QR code
            validation_result = _validate_merchant_qr(qr_payload, request.user)
        elif qr_payload.get('reference', '').startswith('QR_'):
            # Validate payment reference QR
            validation_result = _validate_payment_reference_qr(qr_payload, request.user)
        else:
            return Response({
                'valid': False, 
                'error': 'Invalid QR code format'
            }, status=status.HTTP_400_BAD_REQUEST)
        
        return Response(validation_result)
        
    except Exception as e:
        logger.error(f"Error validating QR: {str(e)}")
        return Response(
            {'valid': False, 'error': 'QR validation failed'},
            status=status.HTTP_400_BAD_REQUEST
        )

@api_view(['POST'])
@permission_classes([IsAuthenticated])
def process_qr_payment(request):
    """Process QR payment"""
    qr_reference = request.data.get('qr_reference')
    payment_method_id = request.data.get('payment_method_id')
    
    if not qr_reference:
        return Response(
            {'error': 'QR reference is required'},
            status=status.HTTP_400_BAD_REQUEST
        )
    
    try:
        # Get QR details from cache or database
        qr_details = cache.get(f'qr_{qr_reference}')
        if not qr_details:
            return Response(
                {'success': False, 'error': 'QR code not found or expired'},
                status=status.HTTP_400_BAD_REQUEST
            )
        
        # Verify QR is not expired
        if qr_details.get('expiry'):
            expiry_time = datetime.fromisoformat(qr_details['expiry'].replace('Z', '+00:00'))
            if timezone.now() > expiry_time:
                cache.delete(f'qr_{qr_reference}')
                return Response(
                    {'success': False, 'error': 'QR code has expired'},
                    status=status.HTTP_400_BAD_REQUEST
                )
        
        # Process payment using PaymentService
        payment_service = PaymentService()
        transaction = payment_service.process_payment(
            user=request.user,
            amount=Decimal(str(qr_details['amount'])),
            currency=qr_details['currency'],
            payment_method_id=payment_method_id,
            reference=qr_reference,
            description=f"QR Payment to {qr_details['merchant_name']}"
        )
        
        # Clear QR from cache after successful payment
        cache.delete(f'qr_{qr_reference}')
        
        return Response({
            'success': True,
            'transaction_id': transaction.id,
            'amount': float(transaction.amount),
            'currency': transaction.currency,
            'merchant': qr_details['merchant_name'],
            'reference': qr_reference,
            'status': transaction.status
        })
        
    except Exception as e:
        logger.error(f"Error processing QR payment: {str(e)}")
        return Response(
            {'success': False, 'error': 'Payment processing failed'},
            status=status.HTTP_500_INTERNAL_SERVER_ERROR
        )

@api_view(['POST'])
@permission_classes([IsAuthenticated])
def generate_qr_code(request):
    """Generate QR code for merchant"""
    amount = request.data.get('amount')
    currency = request.data.get('currency', 'GHS')
    merchant_name = request.data.get('merchant_name')
    expiry_minutes = int(request.data.get('expiry_minutes', 15))
    description = request.data.get('description', '')
    
    if not all([amount, merchant_name]):
        return Response(
            {'error': 'Amount and merchant name are required'},
            status=status.HTTP_400_BAD_REQUEST
        )
    
    try:
        # Validate user is merchant
        from shared.constants import USER_TYPE_MERCHANT
        from users.models import Merchant
        
        if request.user.user_type != USER_TYPE_MERCHANT:
            return Response(
                {'error': 'Only merchants can generate QR codes'},
                status=status.HTTP_403_FORBIDDEN
            )
        
        # Check if merchant profile exists
        try:
            merchant = Merchant.objects.get(user=request.user)
        except Merchant.DoesNotExist:
            return Response(
                {'error': 'Merchant profile required'},
                status=status.HTTP_403_FORBIDDEN
            )
        
        # Generate QR reference
        reference = f"QR_{uuid4().hex[:12].upper()}"
        
        # Create QR payload
        qr_payload = {
            'version': '2.0',
            'type': 'sikaremit_payment',
            'merchant_id': merchant.id,
            'merchant_name': merchant_name,
            'amount': float(amount),
            'currency': currency,
            'reference': reference,
            'timestamp': timezone.now().isoformat(),
            'expiry': (timezone.now() + timedelta(minutes=expiry_minutes)).isoformat(),
            'description': description,
        }
        
        # Generate signature for anti-tampering
        qr_payload['signature'] = _generate_qr_signature(qr_payload)
        
        # Store QR details in cache with expiry
        cache.set(f'qr_{reference}', qr_payload, timeout=expiry_minutes * 60)
        
        # Generate QR code data (base64 encoded JSON)
        qr_data = json.dumps(qr_payload)
        
        return Response({
            'qr_code': qr_data,  # In production, this would be actual QR image
            'qr_data': qr_data,
            'reference': reference,
            'expiry': qr_payload['expiry'],
            'amount': qr_payload['amount'],
            'currency': qr_payload['currency'],
            'merchant_name': qr_payload['merchant_name']
        })
        
    except Exception as e:
        logger.error(f"Error generating QR code: {str(e)}")
        return Response(
            {'error': 'QR generation failed'},
            status=status.HTTP_500_INTERNAL_SERVER_ERROR
        )

def _validate_merchant_qr(qr_payload, user):
    """Validate merchant-generated QR code"""
    try:
        # Verify signature
        if not _verify_qr_signature(qr_payload):
            return {
                'valid': False,
                'error': 'QR signature verification failed'
            }
        
        # Check expiry
        if qr_payload.get('expiry'):
            expiry_time = datetime.fromisoformat(qr_payload['expiry'].replace('Z', '+00:00'))
            if timezone.now() > expiry_time:
                return {
                    'valid': False,
                    'error': 'QR code has expired'
                }
        
        # Validate merchant exists
        try:
            merchant = Merchant.objects.get(id=qr_payload['merchant_id'])
        except Merchant.DoesNotExist:
            return {
                'valid': False,
                'error': 'Merchant not found'
            }
        
        return {
            'valid': True,
            'payment_details': {
                'amount': qr_payload['amount'],
                'currency': qr_payload['currency'],
                'merchant_name': qr_payload['merchant_name'],
                'reference': qr_payload['reference'],
                'merchant_id': qr_payload['merchant_id'],
                'expiry': qr_payload.get('expiry')
            }
        }
        
    except Exception as e:
        logger.error(f"Error validating merchant QR: {str(e)}")
        return {
            'valid': False,
            'error': 'QR validation failed'
        }

def _validate_payment_reference_qr(qr_payload, user):
    """Validate payment reference QR code"""
    try:
        reference = qr_payload['reference']
        
        # Get QR details from cache
        qr_details = cache.get(f'qr_{reference}')
        if not qr_details:
            return {
                'valid': False,
                'error': 'QR code not found or expired'
            }
        
        # Verify signature
        if not _verify_qr_signature(qr_details):
            return {
                'valid': False,
                'error': 'QR signature verification failed'
            }
        
        return {
            'valid': True,
            'payment_details': {
                'amount': qr_details['amount'],
                'currency': qr_details['currency'],
                'merchant_name': qr_details['merchant_name'],
                'reference': qr_details['reference'],
                'merchant_id': qr_details['merchant_id'],
                'expiry': qr_details.get('expiry')
            }
        }
        
    except Exception as e:
        logger.error(f"Error validating payment reference QR: {str(e)}")
        return {
            'valid': False,
            'error': 'QR validation failed'
        }

def _generate_qr_signature(payload):
    """Generate HMAC signature for QR payload"""
    # Remove signature field if present
    payload_copy = payload.copy()
    payload_copy.pop('signature', None)
    
    # Create canonical string representation
    canonical_string = json.dumps(payload_copy, sort_keys=True, separators=(',', ':'))
    
    # Generate HMAC using secret key
    secret_key = settings.SECRET_KEY.encode('utf-8')
    h = HMAC(secret_key, hashes.SHA256(), backend=default_backend())
    h.update(canonical_string.encode('utf-8'))
    
    return h.finalize().hex()

def _verify_qr_signature(payload):
    """Verify HMAC signature of QR payload"""
    if 'signature' not in payload:
        return False
    
    stored_signature = payload['signature']
    computed_signature = _generate_qr_signature(payload)
    
    # Use constant-time comparison to prevent timing attacks
    return hmac.compare_digest(stored_signature, computed_signature)
            
