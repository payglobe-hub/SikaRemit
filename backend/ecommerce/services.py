"""
E-commerce Business Logic Services

Handles cart operations, order processing, and payment logic
"""

from django.db import transaction
from decimal import Decimal
from merchants.models import Product
from .models_cart import ShoppingCart, CartItem
from .models import Order, OrderItem, Payment

class CartService:
    """Shopping cart business logic"""
    
    @staticmethod
    def add_item(cart, product, quantity=1):
        """Add item to cart or update quantity"""
        if quantity <= 0:
            raise ValueError("Quantity must be positive")
        
        if quantity > product.stock_quantity:
            raise ValueError(f"Only {product.stock_quantity} items available")
        
        cart_item, created = CartItem.objects.get_or_create(
            cart=cart,
            product=product,
            defaults={'quantity': quantity}
        )
        
        if not created:
            # Update existing item
            new_quantity = cart_item.quantity + quantity
            if new_quantity > product.stock_quantity:
                raise ValueError(f"Only {product.stock_quantity} items available")
            cart_item.quantity = new_quantity
            cart_item.save()
        
        return cart_item
    
    @staticmethod
    def update_item_quantity(cart, item_id, quantity):
        """Update cart item quantity"""
        if quantity <= 0:
            raise ValueError("Quantity must be positive")
        
        try:
            cart_item = CartItem.objects.get(id=item_id, cart=cart)
            
            if quantity > cart_item.product.stock_quantity:
                raise ValueError(f"Only {cart_item.product.stock_quantity} items available")
            
            cart_item.quantity = quantity
            cart_item.save()
            
            return cart_item
        except CartItem.DoesNotExist:
            raise ValueError("Item not found in cart")
    
    @staticmethod
    def remove_item(cart, item_id):
        """Remove item from cart"""
        try:
            cart_item = CartItem.objects.get(id=item_id, cart=cart)
            cart_item.delete()
        except CartItem.DoesNotExist:
            raise ValueError("Item not found in cart")
    
    @staticmethod
    def clear_cart(cart):
        """Clear all items from cart"""
        cart.items.all().delete()

class OrderService:
    """Order processing business logic"""
    
    @staticmethod
    def create_order_from_cart(user, shipping_data):
        """Create order from cart items"""
        cart = get_object_or_404(ShoppingCart, user=user)
        
        if not cart.items.exists():
            raise ValueError("Cart is empty")
        
        # Verify stock availability
        for cart_item in cart.items.all():
            if cart_item.quantity > cart_item.product.stock_quantity:
                raise ValueError(f"Insufficient stock for {cart_item.product.name}")
        
        with transaction.atomic():
            # Create order
            order = Order.objects.create(
                user=user,
                shipping_address=shipping_data.get('address'),
                shipping_city=shipping_data.get('city'),
                shipping_state=shipping_data.get('state'),
                shipping_postal_code=shipping_data.get('postal_code'),
                shipping_country=shipping_data.get('country'),
                shipping_phone=shipping_data.get('phone'),
                subtotal=cart.subtotal,
                shipping_cost=Decimal('0.00'),  # Calculate based on location
                tax=cart.subtotal * Decimal('0.05'),  # 5% tax
                total=cart.subtotal + (cart.subtotal * Decimal('0.05'))
            )
            
            # Create order items
            for cart_item in cart.items.all():
                OrderItem.objects.create(
                    order=order,
                    product=cart_item.product,
                    quantity=cart_item.quantity,
                    price=cart_item.product.price
                )
            
            # Clear cart
            cart.items.all().delete()
        
        return order
    
    @staticmethod
    def reduce_stock(order):
        """Reduce product stock when order is confirmed"""
        for order_item in order.items.all():
            product = order_item.product
            product.stock_quantity -= order_item.quantity
            product.save()
    
    @staticmethod
    def restore_stock(order):
        """Restore product stock when order is cancelled"""
        for order_item in order.items.all():
            product = order_item.product
            product.stock_quantity += order_item.quantity
            product.save()
    
    @staticmethod
    def calculate_shipping(cart, address_data):
        """Calculate shipping cost based on location and weight"""
        # Simple shipping calculation (can be enhanced with real shipping APIs)
        base_cost = Decimal('10.00')
        
        # Add cost based on location (example)
        if address_data.get('country') != 'Ghana':
            base_cost += Decimal('25.00')
        
        # Add cost based on total value
        if cart.subtotal > Decimal('500'):
            base_cost = Decimal('0.00')  # Free shipping for orders over 500
        
        return base_cost

class PaymentService:
    """Payment processing business logic"""
    
    @staticmethod
    def process_payment(order, payment_method, payment_details):
        """Process payment for an order"""
        if order.payment_status != 'pending':
            raise ValueError("Order already processed")
        
        # Create payment record
        payment = Payment.objects.create(
            order=order,
            payment_method=payment_method,
            amount=order.total,
            status='pending'
        )
        
        # Process payment based on method
        if payment_method == 'card':
            payment = PaymentService._process_card_payment(payment, payment_details)
        elif payment_method == 'paypal':
            payment = PaymentService._process_paypal_payment(payment, payment_details)
        elif payment_method == 'mobile_money':
            payment = PaymentService._process_mobile_money_payment(payment, payment_details)
        else:
            raise ValueError("Unsupported payment method")
        
        return payment
    
    @staticmethod
    def _process_card_payment(payment, payment_details):
        """Process credit/debit card payment via Stripe"""
        try:
            from django.db import transaction as db_transaction
            from payments.gateways.stripe import StripeGateway
            import logging
            logger = logging.getLogger(__name__)

            gateway = StripeGateway()

            class EcomCardMethod:
                def __init__(self, details):
                    self.method_type = 'card'
                    self.id = str(payment.id)
                    self.details = details or {}

            result = gateway.process_payment(
                amount=float(payment.amount),
                currency=getattr(payment, 'currency', 'GHS'),
                payment_method=EcomCardMethod(payment_details),
                customer=None,
                merchant=None,
                metadata={'ecommerce_payment_id': str(payment.id), 'type': 'ecommerce_card'}
            )

            if not result.get('success'):
                payment.status = 'failed'
                payment.gateway_response = result
                payment.save()
                raise ValueError(result.get('error', 'Card payment failed'))

            try:
                with db_transaction.atomic():
                    payment.status = 'succeeded'
                    payment.gateway_transaction_id = result.get('transaction_id', '')
                    payment.gateway_response = result
                    payment.processed_at = timezone.now()
                    payment.save()
            except Exception as db_err:
                logger.error(f"DB save failed after card charge, issuing refund: {db_err}")
                try:
                    gateway.refund_payment(
                        transaction_id=result.get('transaction_id'),
                        amount=float(payment.amount),
                        reason='DB save failed after charge'
                    )
                except Exception as refund_err:
                    logger.critical(
                        f"REFUND ALSO FAILED for ecommerce payment {payment.id}, "
                        f"gateway_tx={result.get('transaction_id')}, "
                        f"amount={payment.amount}: {refund_err}"
                    )
                raise ValueError('Payment charged but recording failed. Refund initiated.')

            return payment
        except ValueError:
            raise
        except Exception as e:
            payment.status = 'failed'
            payment.gateway_response = {'error': str(e)}
            payment.save()
            raise ValueError("Payment processing failed")
    
    @staticmethod
    def _process_paypal_payment(payment, payment_details):
        """Process PayPal payment via Stripe (PayPal payment method)"""
        try:
            from django.db import transaction as db_transaction
            from payments.gateways.stripe import StripeGateway
            import logging
            logger = logging.getLogger(__name__)

            gateway = StripeGateway()

            class EcomPayPalMethod:
                def __init__(self, details):
                    self.method_type = 'paypal'
                    self.id = str(payment.id)
                    self.details = details or {}

            result = gateway.process_payment(
                amount=float(payment.amount),
                currency=getattr(payment, 'currency', 'GHS'),
                payment_method=EcomPayPalMethod(payment_details),
                customer=None,
                merchant=None,
                metadata={'ecommerce_payment_id': str(payment.id), 'type': 'ecommerce_paypal'}
            )

            if not result.get('success'):
                payment.status = 'failed'
                payment.gateway_response = result
                payment.save()
                raise ValueError(result.get('error', 'PayPal payment failed'))

            try:
                with db_transaction.atomic():
                    payment.status = 'succeeded'
                    payment.gateway_transaction_id = result.get('transaction_id', '')
                    payment.gateway_response = result
                    payment.processed_at = timezone.now()
                    payment.save()
            except Exception as db_err:
                logger.error(f"DB save failed after PayPal charge, issuing refund: {db_err}")
                try:
                    gateway.refund_payment(
                        transaction_id=result.get('transaction_id'),
                        amount=float(payment.amount),
                        reason='DB save failed after charge'
                    )
                except Exception as refund_err:
                    logger.critical(
                        f"REFUND ALSO FAILED for ecommerce PayPal payment {payment.id}, "
                        f"gateway_tx={result.get('transaction_id')}, "
                        f"amount={payment.amount}: {refund_err}"
                    )
                raise ValueError('Payment charged but recording failed. Refund initiated.')

            return payment
        except ValueError:
            raise
        except Exception as e:
            payment.status = 'failed'
            payment.gateway_response = {'error': str(e)}
            payment.save()
            raise ValueError("PayPal payment failed")
    
    @staticmethod
    def _process_mobile_money_payment(payment, payment_details):
        """Process mobile money payment via appropriate MoMo gateway"""
        try:
            from django.db import transaction as db_transaction
            from payments.gateways.mobile_money import (
                MTNMoMoGateway, TelecelCashGateway, AirtelTigoMoneyGateway, GMoneyGateway
            )
            import logging
            logger = logging.getLogger(__name__)

            provider = (payment_details or {}).get('provider', 'mtn').lower()
            gateway_map = {
                'mtn': MTNMoMoGateway,
                'mtn_momo': MTNMoMoGateway,
                'telecel': TelecelCashGateway,
                'vodafone': TelecelCashGateway,
                'airtel_tigo': AirtelTigoMoneyGateway,
                'airteltigo': AirtelTigoMoneyGateway,
                'g_money': GMoneyGateway,
            }
            gateway_class = gateway_map.get(provider, MTNMoMoGateway)
            gateway = gateway_class()

            result = gateway.process_payment(
                amount=float(payment.amount),
                currency=getattr(payment, 'currency', 'GHS'),
                phone_number=(payment_details or {}).get('phone_number', ''),
                customer=None,
                merchant=None,
                metadata={'ecommerce_payment_id': str(payment.id), 'type': 'ecommerce_mobile_money'}
            )

            if not result.get('success'):
                payment.status = 'failed'
                payment.gateway_response = result
                payment.save()
                raise ValueError(result.get('error', 'Mobile money payment failed'))

            try:
                with db_transaction.atomic():
                    payment.status = 'succeeded'
                    payment.gateway_transaction_id = result.get('transaction_id', '')
                    payment.gateway_response = result
                    payment.processed_at = timezone.now()
                    payment.save()
            except Exception as db_err:
                logger.error(f"DB save failed after MoMo charge, issuing refund: {db_err}")
                try:
                    gateway.refund_payment(
                        transaction_id=result.get('transaction_id'),
                        amount=float(payment.amount),
                        reason='DB save failed after charge'
                    )
                except Exception as refund_err:
                    logger.critical(
                        f"REFUND ALSO FAILED for ecommerce MoMo payment {payment.id}, "
                        f"gateway_tx={result.get('transaction_id')}, "
                        f"amount={payment.amount}: {refund_err}"
                    )
                raise ValueError('Payment charged but recording failed. Refund initiated.')

            return payment
        except ValueError:
            raise
        except Exception as e:
            payment.status = 'failed'
            payment.gateway_response = {'error': str(e)}
            payment.save()
            raise ValueError("Mobile money payment failed")

# Import needed for timezone and get_object_or_404
from django.utils import timezone
from django.shortcuts import get_object_or_404
