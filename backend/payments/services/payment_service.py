from django.db import transaction
import logging
from typing import Dict, Optional
from django.conf import settings
from ..gateway_hierarchy import gateway_registry

logger = logging.getLogger(__name__)

class BasePaymentProcessor:
    """
    Base class for payment processors providing common functionality
    """
    def __init__(self):
        self.gateways: Dict[str, object] = {}
    
    def register_gateway(self, name: str, gateway):
        """Register a payment gateway implementation"""
        self.gateways[name] = gateway
    
    def get_gateway(self, name: str) -> Optional[object]:
        """Retrieve a registered gateway"""
        return self.gateways.get(name)

class PaymentProcessor(BasePaymentProcessor):
    """
    Core payment processing engine that handles:
    - Payment authorization
    - Transaction processing
    - Settlement
    - Refunds

    Uses hierarchical gateway selection for optimal reliability
    """

    def __init__(self):
        super().__init__()
        self._register_gateways()

    def _register_gateways(self):
        """Register all available payment gateways using hierarchical registry"""
        try:
            # Import gateway classes
            from payments.gateways.stripe import StripeGateway
            from payments.gateways.mobile_money import (
                MTNMoMoGateway, TelecelCashGateway, AirtelTigoMoneyGateway, GMoneyGateway
            )
            from payments.gateways.bank_transfer import BankTransferGateway
            from payments.gateways.sikaremit_balance import SikaRemitBalanceGateway

            # Gateway mapping - Core gateways for Ghana market
            gateway_classes = {
                'stripe': StripeGateway,
                'mtn_momo': MTNMoMoGateway,
                'telecel': TelecelCashGateway,
                'airtel_tigo': AirtelTigoMoneyGateway,
                'g_money': GMoneyGateway,
                'bank_transfer': BankTransferGateway,
                'sikaremit_balance': SikaRemitBalanceGateway,
            }

            # Register active gateways from hierarchy registry
            for gateway_name, gateway_config in gateway_registry._active_gateways.items():
                if gateway_name in gateway_classes:
                    try:
                        gateway_instance = gateway_classes[gateway_name]()
                        self.register_gateway(gateway_name, gateway_instance)
                        logger.info(f"Gateway '{gateway_name}' registered successfully")
                    except Exception as e:
                        logger.error(f"Failed to initialize gateway '{gateway_name}': {str(e)}")

            # Mock gateway removed for production security

        except ImportError as e:
            logger.error(f"Failed to register gateways: {str(e)}")
    
    @transaction.atomic
    def process_payment(self, customer, merchant, amount, currency, payment_method, metadata=None):
        """
        Process a payment from customer to merchant
        Returns: Transaction object
        """
        from ..models.transaction import Transaction
        from users.models import Customer, Merchant
        
        try:
            # Create transaction record
            txn = Transaction.objects.create(
                customer=customer,
                merchant=merchant,
                amount=amount,
                currency=currency,
                payment_method=payment_method,
                status=Transaction.PENDING
            )
            
            # Get appropriate gateway based on payment method
            gateway = self._get_gateway_for_payment_method(payment_method)
            
            # Process payment with gateway
            gateway_response = gateway.process_payment(
                amount=amount,
                currency=currency,
                payment_method=payment_method,
                customer=customer,
                merchant=merchant,
                metadata=metadata
            )
            
            # Update transaction based on gateway response
            if gateway_response['success']:
                try:
                    txn.status = Transaction.COMPLETED
                    txn.save()
                    logger.info(f"Payment processed successfully: {txn.id}")
                except Exception as db_err:
                    logger.error(f"DB save failed after gateway charge, issuing refund: {db_err}")
                    try:
                        gateway.refund_payment(
                            transaction_id=gateway_response.get('transaction_id'),
                            amount=float(amount),
                            reason='DB save failed after charge'
                        )
                    except Exception as refund_err:
                        logger.critical(
                            f"REFUND ALSO FAILED for txn {txn.id}, "
                            f"gateway_tx={gateway_response.get('transaction_id')}, "
                            f"amount={amount}: {refund_err}"
                        )
                    raise
            else:
                txn.status = Transaction.FAILED
                txn.save()
                logger.error(f"Payment failed: {txn.id}. Reason: {gateway_response.get('error')}")
                
            return txn
            
        except Exception as e:
            logger.exception(f"Payment processing failed: {str(e)}")
            raise
    
    def refund_payment(self, transaction, amount=None):
        """
        Process a refund for an existing transaction
        Args:
            transaction: Transaction object to refund
            amount: Optional partial refund amount
        Returns: Updated Transaction object
        """
        try:
            gateway = self._get_gateway_for_payment_method(transaction.payment_method)
            gateway_response = gateway.refund_payment(
                transaction_id=transaction.id,
                amount=amount
            )
            
            if gateway_response['success']:
                transaction.status = Transaction.REFUNDED
                transaction.save()
                logger.info(f"Refund processed successfully: {transaction.id}")
            else:
                logger.error(f"Refund failed: {transaction.id}. Reason: {gateway_response.get('error')}")
                raise ValueError(gateway_response.get('error'))
                
            return transaction
            
        except Exception as e:
            logger.exception(f"Refund processing failed: {str(e)}")
            raise
    
    def _get_gateway_for_payment_method(self, payment_method):
        """Resolve gateway based on payment method type using hierarchical selection"""
        # Use the gateway hierarchy registry for intelligent selection
        gateway_name = gateway_registry.get_gateway_for_method(payment_method.method_type)

        if not gateway_name or gateway_name not in self.gateways:
            # CRITICAL: No mock fallback in production - fail gracefully
            logger.error(f"No gateway available for payment method: {payment_method.method_type}")
            logger.error(f"Available gateways: {list(self.gateways.keys())}")
            logger.error(f"Requested gateway: {gateway_name}")
            raise ValueError(f"Payment processing unavailable: No gateway configured for {payment_method.method_type}. Please contact support.")

        return self.gateways[gateway_name]

class PaymentService:
    """Main payment service handling all payment processing using hierarchical gateway selection"""

    def __init__(self):
        self.gateways = {}
        self._register_gateways()

    def _register_gateways(self):
        """Register available payment gateways using hierarchical registry"""
        try:
            from payments.gateways.stripe import StripeGateway
            from payments.gateways.mobile_money import (
                MTNMoMoGateway, TelecelCashGateway, AirtelTigoMoneyGateway, GMoneyGateway
            )
            from payments.gateways.bank_transfer import BankTransferGateway
            from payments.gateways.sikaremit_balance import SikaRemitBalanceGateway

            gateway_classes = {
                'stripe': StripeGateway,
                'mtn_momo': MTNMoMoGateway,
                'telecel': TelecelCashGateway,
                'airtel_tigo': AirtelTigoMoneyGateway,
                'g_money': GMoneyGateway,
                'bank_transfer': BankTransferGateway,
                'sikaremit_balance': SikaRemitBalanceGateway,
            }

            for gateway_name, gateway_config in gateway_registry._active_gateways.items():
                if gateway_name in gateway_classes:
                    try:
                        gateway_instance = gateway_classes[gateway_name]()
                        self.gateways[gateway_name] = gateway_instance
                        logger.info(f"Gateway '{gateway_name}' registered in PaymentService")
                    except Exception as e:
                        logger.error(f"Failed to initialize gateway '{gateway_name}': {str(e)}")

        except ImportError as e:
            logger.error(f"Failed to register gateways: {str(e)}")

    def get_available_payment_methods(self):
        """Get all available payment methods organized by category for frontend display"""
        return gateway_registry.get_all_available_methods()

    def get_gateway_for_method(self, method_type: str):
        """Get the best gateway for a payment method type"""
        gateway_name = gateway_registry.get_gateway_for_method(method_type)
        return self.gateways.get(gateway_name) if gateway_name else None

    def process_payment(self, customer, merchant, amount, currency, payment_method, metadata=None):
        """Process payment with appropriate gateway using hierarchical selection"""
        try:
            gateway = self.get_gateway_for_method(payment_method.method_type)
            if not gateway:
                raise ValueError(f'No gateway available for payment method: {payment_method.method_type}')

            return gateway.process_payment(amount, currency, payment_method, customer, merchant, metadata)

        except Exception as e:
            logger.error(f"Payment processing failed: {str(e)}")
            raise

payment_service = PaymentService()
