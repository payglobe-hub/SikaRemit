"""
Wallet Payment API Views

Additional views for wallet payment functionality
"""

from rest_framework.decorators import api_view, permission_classes
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response
from django.shortcuts import get_object_or_404
from .models import Order, Payment
from .services_wallet import WalletPaymentService
from .serializers_cart import PaymentSerializer

@api_view(['GET'])
@permission_classes([IsAuthenticated])
def wallet_balance(request):
    """Get wallet balance for shopping"""
    try:
        balance_info = WalletPaymentService.get_wallet_balance_for_checkout(request.user)
        return Response({
            'success': True,
            'data': balance_info
        })
    except Exception as e:
        return Response({
            'success': False,
            'error': 'Failed to get wallet balance'
        }, status=500)

@api_view(['POST'])
@permission_classes([IsAuthenticated])
def validate_wallet_payment(request):
    """Validate wallet balance for payment"""
    try:
        amount = float(request.data.get('amount', 0))
        if amount <= 0:
            return Response({
                'success': False,
                'error': 'Invalid amount'
            }, status=400)
        
        validation = WalletPaymentService.validate_wallet_balance(request.user, amount)
        return Response({
            'success': True,
            'data': validation
        })
    except Exception as e:
        return Response({
            'success': False,
            'error': 'Validation failed'
        }, status=500)

@api_view(['POST'])
@permission_classes([IsAuthenticated])
def process_wallet_payment(request):
    """Process wallet payment for an order"""
    try:
        order_id = request.data.get('order_id')
        if not order_id:
            return Response({
                'success': False,
                'error': 'Order ID is required'
            }, status=400)
        
        order = get_object_or_404(Order, id=order_id, user=request.user)
        
        if order.payment_status != 'pending':
            return Response({
                'success': False,
                'error': 'Order already processed'
            }, status=400)
        
        payment = WalletPaymentService.process_wallet_payment(
            user=request.user,
            order=order,
            payment_details=request.data.get('payment_details', {})
        )
        
        serializer = PaymentSerializer(payment)
        return Response({
            'success': True,
            'data': serializer.data
        })
        
    except ValueError as e:
        return Response({
            'success': False,
            'error': str(e)
        }, status=400)
    except Exception as e:
        return Response({
            'success': False,
            'error': 'Payment processing failed'
        }, status=500)

@api_view(['GET'])
@permission_classes([IsAuthenticated])
def wallet_transaction_history(request):
    """Get wallet transaction history for shopping"""
    try:
        limit = int(request.GET.get('limit', 20))
        transactions = WalletPaymentService.get_wallet_transaction_history(request.user, limit)
        return Response({
            'success': True,
            'data': transactions
        })
    except Exception as e:
        return Response({
            'success': False,
            'error': 'Failed to get transaction history'
        }, status=500)
