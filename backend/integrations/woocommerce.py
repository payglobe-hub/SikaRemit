"""
WooCommerce Integration
SikaRemit payment gateway plugin for WooCommerce/WordPress
"""

from typing import Dict, Optional
from decimal import Decimal
import logging

logger = logging.getLogger(__name__)

class WooCommerceIntegration:
    """
    WooCommerce payment gateway integration
    Compatible with WooCommerce REST API
    """
    
    def __init__(self, store_url: str, consumer_key: str, consumer_secret: str):
        self.store_url = store_url
        self.consumer_key = consumer_key
        self.consumer_secret = consumer_secret
        self.api_version = 'wc/v3'
    
    def process_payment(self, order_data: Dict) -> Dict:
        """
        Process WooCommerce order payment
        
        Args:
            order_data: {
                'order_id': int,
                'total': str,
                'currency': str,
                'billing': Dict,
                'items': List[Dict]
            }
        
        Returns:
            Payment result with redirect URL
        """
        try:
            order_id = order_data.get('order_id')
            amount = Decimal(str(order_data.get('total')))
            currency = order_data.get('currency', 'USD')
            
            # Create payment session
            session_id = f"woo_{order_id}"
            
            # Generate checkout URL
            checkout_url = f"https://SikaRemit.com/checkout/{session_id}"
            
            return {
                'result': 'success',
                'redirect': checkout_url,
                'session_id': session_id
            }
            
        except Exception as e:
            logger.error(f"WooCommerce payment error: {str(e)}")
            return {
                'result': 'failure',
                'messages': [str(e)]
            }
    
    def handle_webhook(self, webhook_data: Dict) -> Dict:
        """Handle WooCommerce webhook"""
        event = webhook_data.get('event')
        
        if event == 'order.created':
            return self._handle_order_created(webhook_data)
        elif event == 'order.updated':
            return self._handle_order_updated(webhook_data)
        
        return {'success': True}
    
    def _handle_order_created(self, data: Dict) -> Dict:
        """Handle new order creation"""
        order_id = data.get('id')
        logger.info(f"WooCommerce order {order_id} created")
        return {'success': True}
    
    def _handle_order_updated(self, data: Dict) -> Dict:
        """Handle order update"""
        order_id = data.get('id')
        status = data.get('status')
        logger.info(f"WooCommerce order {order_id} updated to {status}")
        return {'success': True}
    
    def complete_order(self, order_id: int, transaction_id: str) -> Dict:
        """Mark WooCommerce order as completed"""
        # In production, call WooCommerce API
        return {
            'success': True,
            'order_id': order_id,
            'transaction_id': transaction_id,
            'status': 'completed'
        }
    
    def refund_order(self, order_id: int, amount: Optional[Decimal] = None) -> Dict:
        """Process refund for WooCommerce order"""
        try:
            from payments.global_payment_methods import GlobalPaymentProcessor
            
            # Get transaction ID from order
            # In production, fetch from WooCommerce API
            transaction_id = f"woo_{order_id}_txn"
            
            processor = GlobalPaymentProcessor()
            result = processor.refund_payment(
                transaction_id=transaction_id,
                amount=amount,
                reason='WooCommerce refund'
            )
            
            return result
            
        except Exception as e:
            logger.error(f"WooCommerce refund error: {str(e)}")
            return {
                'success': False,
                'error': str(e)
            }

def generate_woocommerce_plugin():
    """
    Generate WooCommerce plugin PHP code structure
    This would be the actual plugin files
    """
    plugin_info = {
        'name': 'SikaRemit for WooCommerce',
        'version': '1.0.0',
        'description': 'Accept payments via SikaRemit payment gateway',
        'author': 'SikaRemit',
        'requires_woocommerce': '5.0',
        'tested_up_to': '8.5',
        'features': [
            'Multiple payment methods',
            'Multi-currency support',
            'Fraud detection',
            'Refund support',
            'Subscription payments',
            'Mobile-optimized checkout'
        ],
        'settings': [
            {
                'id': 'enabled',
                'title': 'Enable/Disable',
                'type': 'checkbox',
                'label': 'Enable SikaRemit Payment Gateway',
                'default': 'yes'
            },
            {
                'id': 'title',
                'title': 'Title',
                'type': 'text',
                'description': 'Payment method title shown to customers',
                'default': 'SikaRemit',
                'desc_tip': True
            },
            {
                'id': 'api_key',
                'title': 'API Key',
                'type': 'text',
                'description': 'Your SikaRemit API key',
                'default': ''
            },
            {
                'id': 'test_mode',
                'title': 'Test Mode',
                'type': 'checkbox',
                'label': 'Enable test mode',
                'default': 'yes'
            }
        ]
    }
    
    return plugin_info
