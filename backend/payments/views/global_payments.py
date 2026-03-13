"""
API Views for Global Payment Methods
"""

from rest_framework import status
from rest_framework.decorators import api_view, permission_classes
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response
from django.views.decorators.csrf import csrf_exempt
from decimal import Decimal
import logging

from ..global_payment_methods import (
    GlobalPaymentMethodRegistry,
    GlobalPaymentProcessor,
    PaymentMethodType,
    get_available_payment_methods
)
from ..models import Payment
from users.models import Customer, Merchant

logger = logging.getLogger(__name__)


@api_view(['GET'])
@permission_classes([IsAuthenticated])
def list_payment_methods(request):
    """
    Get available payment methods for a country and currency
    
    Query params:
    - country: ISO country code (e.g., 'US', 'GB', 'DE')
    - currency: ISO currency code (e.g., 'USD', 'EUR', 'GBP')
    """
    country = request.query_params.get('country', 'US')
    currency = request.query_params.get('currency', 'USD')
    
    try:
        methods = get_available_payment_methods(country, currency)
        
        return Response({
            'success': True,
            'country': country,
            'currency': currency,
            'payment_methods': methods,
            'total_methods': len(methods)
        })
    except Exception as e:
        logger.error(f"Error listing payment methods: {str(e)}")
        return Response({
            'success': False,
            'error': str(e)
        }, status=status.HTTP_500_INTERNAL_SERVER_ERROR)


@api_view(['GET'])
def get_all_payment_methods(request):
    """Get all available payment methods across all regions"""
    try:
        all_methods = GlobalPaymentMethodRegistry.get_all_methods()
        
        methods_data = [
            {
                'type': method.method_type.value,
                'display_name': method.display_name,
                'countries': method.countries,
                'currencies': method.currencies,
                'icon_url': method.icon_url,
                'description': method.description,
                'processing_time': method.processing_time,
                'requires_redirect': method.requires_redirect,
                'supports_refund': method.supports_refund,
                'supports_recurring': method.supports_recurring,
                'min_amount': float(method.min_amount),
                'max_amount': float(method.max_amount),
            }
            for method in all_methods
        ]
        
        return Response({
            'success': True,
            'payment_methods': methods_data,
            'total_methods': len(methods_data)
        })
    except Exception as e:
        logger.error(f"Error getting all payment methods: {str(e)}")
        return Response({
            'success': False,
            'error': str(e)
        }, status=status.HTTP_500_INTERNAL_SERVER_ERROR)


@api_view(['POST'])
@permission_classes([IsAuthenticated])
def process_global_payment(request):
    """
    Process a payment using a global payment method
    
    Request body:
    {
        "payment_method": "alipay",
        "amount": 100.00,
        "currency": "USD",
        "merchant_id": 123,
        "customer_data": {
            "email": "customer@example.com",
            "name": "John Doe"
        },
        "metadata": {}
    }
    """
    try:
        # Extract request data
        payment_method_str = request.data.get('payment_method')
        amount = Decimal(str(request.data.get('amount')))
        currency = request.data.get('currency', 'USD')
        merchant_id = request.data.get('merchant_id')
        customer_data = request.data.get('customer_data', {})
        metadata = request.data.get('metadata', {})
        
        # Validate payment method
        try:
            payment_method_type = PaymentMethodType(payment_method_str)
        except ValueError:
            return Response({
                'success': False,
                'error': f'Invalid payment method: {payment_method_str}'
            }, status=status.HTTP_400_BAD_REQUEST)
        
        # Get customer and merchant
        try:
            customer = Customer.objects.get(user=request.user)
            merchant = Merchant.objects.get(id=merchant_id)
        except (Customer.DoesNotExist, Merchant.DoesNotExist) as e:
            return Response({
                'success': False,
                'error': str(e)
            }, status=status.HTTP_404_NOT_FOUND)
        
        # Process payment
        processor = GlobalPaymentProcessor()
        result = processor.process_payment(
            method_type=payment_method_type,
            amount=amount,
            currency=currency,
            customer_data=customer_data,
            metadata=metadata
        )
        
        if result['success']:
            # Create payment record atomically; refund if DB fails
            try:
                from django.db import transaction as db_transaction
                with db_transaction.atomic():
                    payment = Payment.objects.create(
                        customer=customer,
                        merchant=merchant,
                        amount=amount,
                        currency=currency,
                        payment_method=payment_method_str,
                        transaction_id=result.get('transaction_id', ''),
                        status='pending',
                        metadata={
                            **metadata,
                            'payment_method_type': payment_method_str,
                            'redirect_url': result.get('redirect_url'),
                            'client_secret': result.get('client_secret')
                        }
                    )
            except Exception as db_err:
                logger.error(f"DB save failed after global payment charge, issuing refund: {db_err}")
                try:
                    processor.refund_payment(
                        transaction_id=result.get('transaction_id'),
                        amount=float(amount),
                        reason='DB save failed after charge'
                    )
                except Exception as refund_err:
                    logger.critical(
                        f"REFUND ALSO FAILED for global payment, "
                        f"gateway_tx={result.get('transaction_id')}, "
                        f"amount={amount}: {refund_err}"
                    )
                return Response({
                    'success': False,
                    'error': 'Payment charged but recording failed. A refund has been initiated.'
                }, status=status.HTTP_500_INTERNAL_SERVER_ERROR)
            
            return Response({
                'success': True,
                'payment_id': payment.id,
                'transaction_id': result.get('transaction_id'),
                'status': result.get('status'),
                'redirect_url': result.get('redirect_url'),
                'client_secret': result.get('client_secret'),
                'message': 'Payment initiated successfully'
            }, status=status.HTTP_201_CREATED)
        else:
            return Response({
                'success': False,
                'error': result.get('error', 'Payment processing failed')
            }, status=status.HTTP_400_BAD_REQUEST)
            
    except Exception as e:
        logger.error(f"Error processing global payment: {str(e)}")
        return Response({
            'success': False,
            'error': str(e)
        }, status=status.HTTP_500_INTERNAL_SERVER_ERROR)


@api_view(['POST'])
@permission_classes([IsAuthenticated])
def verify_global_payment(request, payment_id):
    """Verify the status of a global payment"""
    try:
        payment = Payment.objects.get(id=payment_id, customer__user=request.user)
        
        processor = GlobalPaymentProcessor()
        payment_method_type = PaymentMethodType(payment.payment_method)
        
        result = processor.verify_payment(
            transaction_id=payment.transaction_id,
            method_type=payment_method_type
        )
        
        if result['verified']:
            # Update payment status
            payment.status = result['status']
            payment.save()
            
            return Response({
                'success': True,
                'payment_id': payment.id,
                'status': payment.status,
                'verified': True
            })
        else:
            return Response({
                'success': False,
                'error': 'Payment verification failed'
            }, status=status.HTTP_400_BAD_REQUEST)
            
    except Payment.DoesNotExist:
        return Response({
            'success': False,
            'error': 'Payment not found'
        }, status=status.HTTP_404_NOT_FOUND)
    except Exception as e:
        logger.error(f"Error verifying payment: {str(e)}")
        return Response({
            'success': False,
            'error': str(e)
        }, status=status.HTTP_500_INTERNAL_SERVER_ERROR)


@api_view(['POST'])
@permission_classes([IsAuthenticated])
def refund_global_payment(request, payment_id):
    """
    Refund a global payment
    
    Request body:
    {
        "amount": 50.00,  # Optional, defaults to full refund
        "reason": "Customer request"
    }
    """
    try:
        payment = Payment.objects.get(id=payment_id)
        
        # Check if user has permission to refund
        if not (request.user.is_staff or payment.merchant.user == request.user):
            return Response({
                'success': False,
                'error': 'Permission denied'
            }, status=status.HTTP_403_FORBIDDEN)
        
        # Check if payment can be refunded
        if not payment.can_refund():
            return Response({
                'success': False,
                'error': 'Payment cannot be refunded'
            }, status=status.HTTP_400_BAD_REQUEST)
        
        refund_amount = request.data.get('amount')
        if refund_amount:
            refund_amount = Decimal(str(refund_amount))
        
        reason = request.data.get('reason', '')
        
        processor = GlobalPaymentProcessor()
        result = processor.refund_payment(
            transaction_id=payment.transaction_id,
            amount=refund_amount,
            reason=reason
        )
        
        if result['success']:
            # Update payment status
            if refund_amount and refund_amount < payment.amount:
                payment.status = 'partially_refunded'
            else:
                payment.status = 'refunded'
            
            payment.metadata['refund_id'] = result.get('refund_id')
            payment.metadata['refund_reason'] = reason
            payment.save()
            
            return Response({
                'success': True,
                'payment_id': payment.id,
                'refund_id': result.get('refund_id'),
                'status': payment.status,
                'message': 'Refund processed successfully'
            })
        else:
            return Response({
                'success': False,
                'error': result.get('error', 'Refund failed')
            }, status=status.HTTP_400_BAD_REQUEST)
            
    except Payment.DoesNotExist:
        return Response({
            'success': False,
            'error': 'Payment not found'
        }, status=status.HTTP_404_NOT_FOUND)
    except Exception as e:
        logger.error(f"Error processing refund: {str(e)}")
        return Response({
            'success': False,
            'error': str(e)
        }, status=status.HTTP_500_INTERNAL_SERVER_ERROR)


@api_view(['GET'])
@permission_classes([IsAuthenticated])
def payment_method_stats(request):
    """Get statistics about payment method usage"""
    try:
        # Get payment statistics grouped by payment method
        from django.db.models import Count, Sum, Avg
        
        stats = Payment.objects.values('payment_method').annotate(
            total_payments=Count('id'),
            total_amount=Sum('amount'),
            avg_amount=Avg('amount'),
            successful_payments=Count('id', filter=models.Q(status='completed'))
        ).order_by('-total_payments')
        
        return Response({
            'success': True,
            'statistics': list(stats)
        })
    except Exception as e:
        return Response({
            'success': False,
            'error': str(e)
        }, status=status.HTTP_500_INTERNAL_SERVER_ERROR)


@api_view(['POST'])
@permission_classes([IsAuthenticated])
def qr_payment_validate(request):
    """
    Validate a scanned QR payment code

    Request body:
    {
        "qr_data": "json_string_or_object_containing_qr_payload"
    }
    """
    try:
        qr_data = request.data.get('qr_data')
        if not qr_data:
            return Response({
                'valid': False,
                'error': 'QR data is required'
            }, status=status.HTTP_400_BAD_REQUEST)

        from ..gateways.qr import QRPaymentGateway
        gateway = QRPaymentGateway()

        result = gateway.validate_qr_payment(qr_data, request.user)

        if result['valid']:
            return Response({
                'valid': True,
                'payment_details': {
                    'amount': result['payment_data']['amount'],
                    'currency': result['payment_data']['currency'],
                    'merchant_name': result.get('qr_data', {}).get('merchant_name'),
                    'reference': result['reference']
                },
                'message': 'QR code is valid. Ready to process payment.'
            })
        else:
            return Response({
                'valid': False,
                'error': result['error']
            }, status=status.HTTP_400_BAD_REQUEST)

    except Exception as e:
        logger.error(f"QR validation error: {str(e)}")
        return Response({
            'valid': False,
            'error': 'QR validation failed'
        }, status=status.HTTP_500_INTERNAL_SERVER_ERROR)


@api_view(['POST'])
@permission_classes([IsAuthenticated])
def qr_payment_process(request):
    """
    Process a validated QR payment

    Request body:
    {
        "qr_reference": "qr_payment_reference",
        "payment_method_id": "optional_payment_method_id_for_record"
    }
    """
    try:
        qr_reference = request.data.get('qr_reference')
        payment_method_id = request.data.get('payment_method_id')

        if not qr_reference:
            return Response({
                'success': False,
                'error': 'QR reference is required'
            }, status=status.HTTP_400_BAD_REQUEST)

        from ..gateways.qr import QRPaymentGateway
        from ..models.payment_method import PaymentMethod

        gateway = QRPaymentGateway()

        # Get payment method if provided
        payment_method = None
        if payment_method_id:
            try:
                payment_method = PaymentMethod.objects.get(id=payment_method_id, user=request.user)
            except PaymentMethod.DoesNotExist:
                payment_method = None

        result = gateway.process_qr_scan(qr_reference, request.user, payment_method)

        if result['success']:
            return Response({
                'success': True,
                'transaction_id': result['transaction_id'],
                'amount': result['amount'],
                'currency': result['currency'],
                'merchant': result['merchant'],
                'reference': result['reference'],
                'message': 'Payment processed successfully'
            })
        else:
            return Response({
                'success': False,
                'error': result['error']
            }, status=status.HTTP_400_BAD_REQUEST)

    except Exception as e:
        logger.error(f"QR processing error: {str(e)}")
        return Response({
            'success': False,
            'error': 'Payment processing failed'
        }, status=status.HTTP_500_INTERNAL_SERVER_ERROR)
