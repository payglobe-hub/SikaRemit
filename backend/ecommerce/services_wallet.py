"""
Wallet Payment Integration for E-commerce

Integrates SikaRemit wallet balance with shopping payments
"""

from django.db import transaction
from django.contrib.auth import get_user_model
from decimal import Decimal
from rest_framework import status
from rest_framework.response import Response
from .models import Order, Payment
from .services import PaymentService
from payments.models import WalletBalance

User = get_user_model()


class WalletPaymentService:
    """Service for processing wallet payments"""
    
    @staticmethod
    def validate_wallet_balance(user, amount):
        """Validate if user has sufficient wallet balance"""
        try:
            wallet_balance = WalletBalance.objects.filter(user=user).first()
            if not wallet_balance:
                return {
                    'sufficient': False,
                    'balance': Decimal('0'),
                    'deficit': amount
                }
            
            return {
                'sufficient': wallet_balance.available_balance >= amount,
                'balance': wallet_balance.available_balance,
                'deficit': amount - wallet_balance.available_balance if wallet_balance.available_balance < amount else Decimal('0')
            }
        except Exception:
            return {
                'sufficient': False,
                'balance': Decimal('0'),
                'deficit': amount
            }
    
    @staticmethod
    def process_wallet_payment(user, order, payment_details=None):
        """Process payment using wallet balance"""
        with transaction.atomic():
            # Validate wallet balance
            validation = WalletPaymentService.validate_wallet_balance(user, order.total)
            
            if not validation['sufficient']:
                raise ValueError(f"Insufficient wallet balance. Available: {validation['balance']}, Required: {order.total}")
            
            # Get wallet balance
            wallet_balance = WalletBalance.objects.filter(user=user).first()
            if not wallet_balance:
                raise ValueError("No wallet found for user")
            
            # Create payment record
            payment = Payment.objects.create(
                order=order,
                payment_method='wallet',
                amount=order.total,
                currency='GHS',
                status='succeeded',
                gateway_transaction_id=f"WALLET-{order.id}",
                gateway_response={
                    'wallet_id': str(wallet_balance.id),
                    'previous_balance': float(wallet_balance.available_balance),
                    'new_balance': float(wallet_balance.available_balance - order.total)
                }
            )
            
            # Deduct from wallet balance
            wallet_balance.available_balance -= order.total
            wallet_balance.save()
            
            # Update order status
            order.status = 'confirmed'
            order.payment_status = 'paid'
            order.save()
            
            # Reduce stock
            PaymentService.reduce_stock(order)
            
            return payment
    
    @staticmethod
    def refund_wallet_payment(payment, amount=None):
        """Refund wallet payment"""
        with transaction.atomic():
            refund_amount = amount or payment.amount
            
            # Get payment details
            gateway_response = payment.gateway_response or {}
            wallet_id = gateway_response.get('wallet_id')
            
            if not wallet_id:
                raise ValueError("Cannot refund wallet payment: wallet ID not found")
            
            # Get wallet balance
            try:
                wallet_balance = WalletBalance.objects.get(id=wallet_id)
            except WalletBalance.DoesNotExist:
                raise ValueError("Wallet not found for refund")
            
            # Refund to wallet balance
            wallet_balance.available_balance += refund_amount
            wallet_balance.save()
            
            # Update payment status
            payment.status = 'refunded'
            payment.gateway_response = {
                **gateway_response,
                'refund_amount': float(refund_amount),
                'refund_date': payment.updated_at.isoformat(),
                'refunded_to_wallet': str(wallet_balance.id)
            }
            payment.save()
            
            # Update order status
            if payment.order:
                payment.order.status = 'refunded'
                payment.order.save()
                # Restore stock
                PaymentService.restore_stock(payment.order)
            
            return payment
    
    @staticmethod
    def get_wallet_transaction_history(user, limit=20):
        """Get wallet transaction history for shopping"""
        try:
            wallet_balance = WalletBalance.objects.filter(user=user).first()
            
            # Get payments made with wallet
            payments = Payment.objects.filter(
                payment_method='wallet',
                gateway_response__wallet_id=str(wallet_balance.id)
            ).order_by('-created_at')[:limit]
            
            transactions = []
            for payment in payments:
                transactions.append({
                    'id': payment.id,
                    'type': 'payment',
                    'amount': payment.amount,
                    'currency': payment.currency,
                    'description': f'Order {payment.order.order_number}' if payment.order else 'Payment',
                    'status': payment.status,
                    'created_at': payment.created_at,
                    'order_id': str(payment.order.id) if payment.order else None,
                    'order_number': payment.order.order_number if payment.order else None
                })
            
            return transactions
        except Exception:
            return []
    
    @staticmethod
    def get_wallet_balance_for_checkout(user):
        """Get wallet balance formatted for checkout"""
        try:
            wallet_balance = WalletBalance.objects.filter(user=user).first()
            if not wallet_balance:
                return {
                    'balance': Decimal('0'),
                    'currency': 'GHS',
                    'formatted_balance': 'GHS 0.00',
                    'available_for_payment': False
                }
            
            return {
                'balance': wallet_balance.available_balance,
                'currency': wallet_balance.currency.code,
                'formatted_balance': f"{wallet_balance.currency.code} {wallet_balance.available_balance:.2f}",
                'available_for_payment': wallet_balance.available_balance > 0
            }
        except Exception:
            return {
                'balance': Decimal('0'),
                'currency': 'GHS',
                'formatted_balance': 'GHS 0.00',
                'available_for_payment': False
            }
