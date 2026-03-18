"""
Shopify Integration
SikaRemit payment gateway for Shopify stores
"""

from typing import Dict, Optional
from decimal import Decimal
import hmac
import hashlib
import json
import logging

logger = logging.getLogger(__name__)

class ShopifyIntegration:
    """
    Shopify payment gateway integration
    Implements Shopify's payment gateway API
    """
    
    def __init__(self, shop_domain: str, api_key: str, api_secret: str):
        self.shop_domain = shop_domain
        self.api_key = api_key
        self.api_secret = api_secret
        self.base_url = f"https://{shop_domain}/admin/api/2024-01"
    
    def verify_webhook(self, data: bytes, hmac_header: str) -> bool:
        """Verify Shopify webhook signature"""
        computed_hmac = hmac.new(
            self.api_secret.encode('utf-8'),
            data,
            hashlib.sha256
        ).hexdigest()
        
        return hmac.compare_digest(computed_hmac, hmac_header)
    
    def create_payment_session(self, order_data: Dict) -> Dict:
        """
        Create payment session for Shopify checkout
        
        Args:
            order_data: {
                'order_id': str,
                'amount': Decimal,
                'currency': str,
                'customer': Dict,
                'items': List[Dict]
            }
        
        Returns:
            Payment session data
        """
        session_id = f"shopify_{order_data['order_id']}"
        
        return {
            'session_id': session_id,
            'payment_url': f"https://SikaRemit.com/checkout/{session_id}",
            'expires_at': '2024-12-31T23:59:59Z',
            'status': 'pending'
        }
    
    def process_payment(self, payment_data: Dict) -> Dict:
        """
        Process payment from Shopify checkout
        
        Args:
            payment_data: Payment information from Shopify
        
        Returns:
            Payment result
        """
        try:
            # Extract payment details
            amount = Decimal(str(payment_data.get('amount')))
            currency = payment_data.get('currency', 'USD')
            order_id = payment_data.get('order_id')
            
            # Process through SikaRemit
            from payments.global_payment_methods import GlobalPaymentProcessor
            
            processor = GlobalPaymentProcessor()
            result = processor.process_payment(
                method_type=payment_data.get('payment_method'),
                amount=amount,
                currency=currency,
                customer_data=payment_data.get('customer', {}),
                metadata={'shopify_order_id': order_id}
            )
            
            if result['success']:
                # Notify Shopify of successful payment
                self._notify_shopify_payment_success(order_id, result)
            
            return result
            
        except Exception as e:
            logger.error(f"Shopify payment processing error: {str(e)}")
            return {
                'success': False,
                'error': str(e)
            }
    
    def _notify_shopify_payment_success(self, order_id: str, payment_result: Dict):
        """Notify Shopify that payment was successful"""
        # In production, call Shopify API to mark order as paid
        logger.info(f"Shopify order {order_id} paid successfully")
    
    def handle_refund(self, refund_data: Dict) -> Dict:
        """Handle refund request from Shopify"""
        try:
            transaction_id = refund_data.get('transaction_id')
            amount = Decimal(str(refund_data.get('amount')))
            
            from payments.global_payment_methods import GlobalPaymentProcessor
            
            processor = GlobalPaymentProcessor()
            result = processor.refund_payment(
                transaction_id=transaction_id,
                amount=amount,
                reason=refund_data.get('reason', 'Shopify refund')
            )
            
            return result
            
        except Exception as e:
            logger.error(f"Shopify refund error: {str(e)}")
            return {
                'success': False,
                'error': str(e)
            }
    
    def get_payment_methods(self) -> list:
        """Get available payment methods for Shopify store"""
        from payments.global_payment_methods import GlobalPaymentMethodRegistry
        
        # Get all available methods
        methods = GlobalPaymentMethodRegistry.get_all_methods()
        
        # Format for Shopify
        return [
            {
                'id': method.method_type.value,
                'name': method.display_name,
                'icon_url': method.icon_url,
                'supported_currencies': method.currencies
            }
            for method in methods
        ]

def create_shopify_app_extension():
    """
    Generate Shopify app extension configuration
    This would be used to create a Shopify app
    """
    return {
        'name': 'SikaRemit Payments',
        'handle': 'SikaRemit-payments',
        'type': 'payment_gateway',
        'configuration': {
            'payment_session_url': 'https://api.SikaRemit.com/shopify/payment-session',
            'refund_url': 'https://api.SikaRemit.com/shopify/refund',
            'supports_network_tokenization': True,
            'supports_installments': True,
            'test_mode': True
        },
        'scopes': [
            'read_orders',
            'write_orders',
            'read_customers',
            'write_payment_gateways'
        ]
    }
