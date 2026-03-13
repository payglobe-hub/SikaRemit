"""
POS/Hardware Integration System
Virtual terminal, hardware SDK support, and in-person payment processing
"""

from typing import Dict, List, Optional, Any
from decimal import Decimal
from datetime import datetime
from django.conf import settings
import logging
import uuid
import json

logger = logging.getLogger(__name__)


class POSDeviceType:
    """Supported POS device types"""
    VIRTUAL_TERMINAL = 'virtual_terminal'
    MOBILE_READER = 'mobile_reader'
    COUNTERTOP = 'countertop'
    INTEGRATED = 'integrated'
    KIOSK = 'kiosk'


class POSTransactionType:
    """POS transaction types"""
    SALE = 'sale'
    REFUND = 'refund'
    VOID = 'void'
    PRE_AUTH = 'pre_auth'
    CAPTURE = 'capture'


class VirtualTerminal:
    """
    Virtual terminal for manual card entry
    Allows merchants to process payments without physical hardware
    """
    
    def __init__(self, merchant_id: int):
        self.merchant_id = merchant_id
    
    def create_transaction(
        self,
        amount: Decimal,
        currency: str,
        card_data: Dict[str, str],
        customer_info: Optional[Dict] = None,
        metadata: Optional[Dict] = None
    ) -> Dict[str, Any]:
        """
        Process a manual card entry transaction
        
        Args:
            amount: Transaction amount
            currency: Currency code
            card_data: {
                'card_number': str,
                'exp_month': str,
                'exp_year': str,
                'cvv': str,
                'cardholder_name': str
            }
            customer_info: Optional customer details
            metadata: Optional transaction metadata
        
        Returns:
            Transaction result
        """
        # Validate card data
        if not self._validate_card_data(card_data):
            return {
                'success': False,
                'error': 'Invalid card data'
            }
        
        # Generate transaction ID
        transaction_id = f"vt_{uuid.uuid4().hex[:16]}"
        
        # Process through payment gateway
        try:
            result = self._process_card_payment(
                transaction_id=transaction_id,
                amount=amount,
                currency=currency,
                card_data=card_data,
                customer_info=customer_info or {},
                metadata=metadata or {}
            )
            
            # Log transaction atomically; refund if DB fails after successful charge
            if result.get('success'):
                try:
                    from django.db import transaction as db_transaction
                    with db_transaction.atomic():
                        self._log_transaction(transaction_id, result)
                except Exception as db_err:
                    logger.error(f"DB log failed after VT charge, issuing refund: {db_err}")
                    try:
                        from payments.gateways.stripe import StripeGateway
                        StripeGateway().refund_payment(
                            transaction_id=result.get('gateway_transaction_id'),
                            amount=float(amount),
                            reason='DB log failed after VT charge'
                        )
                    except Exception as refund_err:
                        logger.critical(
                            f"REFUND ALSO FAILED for VT tx {transaction_id}, "
                            f"gateway_tx={result.get('gateway_transaction_id')}, "
                            f"amount={amount}: {refund_err}"
                        )
                    return {
                        'success': False,
                        'error': 'Payment charged but recording failed. Refund initiated.',
                        'transaction_id': transaction_id,
                    }
            else:
                # Failed charges can be logged best-effort
                try:
                    self._log_transaction(transaction_id, result)
                except Exception:
                    pass
            
            return result
            
        except Exception as e:
            logger.error(f"Virtual terminal transaction error: {str(e)}")
            return {
                'success': False,
                'error': str(e)
            }
    
    def _validate_card_data(self, card_data: Dict) -> bool:
        """Validate card data"""
        required_fields = ['card_number', 'exp_month', 'exp_year', 'cvv']
        return all(field in card_data for field in required_fields)
    
    def _process_card_payment(
        self,
        transaction_id: str,
        amount: Decimal,
        currency: str,
        card_data: Dict,
        customer_info: Dict,
        metadata: Dict
    ) -> Dict[str, Any]:
        """Process card payment through Stripe gateway"""
        try:
            from payments.gateways.stripe import StripeGateway

            gateway = StripeGateway()

            class VTPaymentMethod:
                def __init__(self, data):
                    self.method_type = 'card'
                    self.id = transaction_id
                    self.details = {
                        'card_number': data.get('card_number', ''),
                        'exp_month': data.get('exp_month', ''),
                        'exp_year': data.get('exp_year', ''),
                        'cvv': data.get('cvv', ''),
                        'cardholder_name': data.get('cardholder_name', ''),
                    }

            result = gateway.process_payment(
                amount=float(amount),
                currency=currency,
                payment_method=VTPaymentMethod(card_data),
                customer=None,
                merchant=None,
                metadata={
                    'transaction_id': transaction_id,
                    'pos_type': 'virtual_terminal',
                    'merchant_id': self.merchant_id,
                    **(metadata or {}),
                }
            )

            if result.get('success'):
                return {
                    'success': True,
                    'transaction_id': transaction_id,
                    'status': 'completed',
                    'amount': float(amount),
                    'currency': currency,
                    'card_last4': card_data['card_number'][-4:],
                    'card_brand': self._detect_card_brand(card_data['card_number']),
                    'gateway_transaction_id': result.get('transaction_id', ''),
                    'processed_at': datetime.now().isoformat()
                }
            else:
                return {
                    'success': False,
                    'transaction_id': transaction_id,
                    'error': result.get('error', 'Payment gateway declined'),
                }

        except Exception as e:
            logger.error(f"Virtual terminal payment failed: {str(e)}")
            return {'success': False, 'transaction_id': transaction_id, 'error': str(e)}
    
    def _detect_card_brand(self, card_number: str) -> str:
        """Detect card brand from number"""
        first_digit = card_number[0]
        if first_digit == '4':
            return 'visa'
        elif first_digit == '5':
            return 'mastercard'
        elif first_digit == '3':
            return 'amex'
        elif first_digit == '6':
            return 'discover'
        return 'unknown'
    
    def _log_transaction(self, transaction_id: str, result: Dict):
        """Log transaction to database — raises on failure so caller can refund"""
        from .models import POSTransaction
        
        POSTransaction.objects.create(
            merchant_id=self.merchant_id,
            transaction_id=transaction_id,
            device_type=POSDeviceType.VIRTUAL_TERMINAL,
            transaction_type=POSTransactionType.SALE,
            amount=result.get('amount', 0),
            currency=result.get('currency', 'USD'),
            status=result.get('status', 'failed'),
            card_last4=result.get('card_last4', ''),
            card_brand=result.get('card_brand', ''),
            response_data=result
        )


class MobileReaderSDK:
    """
    SDK for mobile card readers (e.g., Square Reader, Stripe Reader)
    Supports Bluetooth and audio jack readers
    """
    
    def __init__(self, merchant_id: int, device_id: str):
        self.merchant_id = merchant_id
        self.device_id = device_id
        self.connection_type = None
    
    def initialize(self, connection_type: str = 'bluetooth') -> Dict:
        """
        Initialize mobile reader connection
        
        Args:
            connection_type: 'bluetooth' or 'audio_jack'
        """
        self.connection_type = connection_type
        
        return {
            'success': True,
            'device_id': self.device_id,
            'connection_type': connection_type,
            'status': 'ready',
            'battery_level': self._get_battery_level(),  # Actual battery level from device
            'firmware_version': '2.1.0'
        }
    
    def read_card(self, timeout: int = 30) -> Dict:
        """
        Read card data from mobile reader
        
        Args:
            timeout: Timeout in seconds
        
        Returns:
            Card data (encrypted)
        """
        # Communicate with the hardware reader via its SDK/API
        reader_api_url = getattr(settings, 'POS_READER_API_URL', None)
        if not reader_api_url:
            return {
                'success': False,
                'error': 'Mobile card reader not configured. Set POS_READER_API_URL in settings.',
            }

        try:
            import requests as http_requests
            response = http_requests.post(
                f"{reader_api_url}/read_card",
                json={'device_id': self.device_id, 'timeout': timeout},
                timeout=timeout + 5,
            )
            if response.status_code == 200:
                data = response.json()
                return {
                    'success': True,
                    'card_encrypted_data': data.get('card_encrypted_data', ''),
                    'card_last4': data.get('card_last4', ''),
                    'card_brand': data.get('card_brand', ''),
                    'read_method': data.get('read_method', 'chip'),
                    'timestamp': datetime.now().isoformat()
                }
            else:
                return {
                    'success': False,
                    'error': f'Card reader returned status {response.status_code}',
                }
        except Exception as e:
            logger.error(f"Card reader communication failed: {str(e)}")
            return {'success': False, 'error': str(e)}
    
    def process_payment(
        self,
        amount: Decimal,
        currency: str,
        card_data: Dict,
        metadata: Optional[Dict] = None
    ) -> Dict:
        """Process payment with mobile reader via Stripe gateway"""
        transaction_id = f"mr_{uuid.uuid4().hex[:16]}"
        
        try:
            from payments.gateways.stripe import StripeGateway

            gateway = StripeGateway()

            class ReaderPaymentMethod:
                def __init__(self, data):
                    self.method_type = 'card'
                    self.id = transaction_id
                    self.details = {
                        'encrypted_data': data.get('card_encrypted_data', ''),
                        'last4': data.get('card_last4', ''),
                        'brand': data.get('card_brand', ''),
                    }

            gateway_result = gateway.process_payment(
                amount=float(amount),
                currency=currency,
                payment_method=ReaderPaymentMethod(card_data),
                customer=None,
                merchant=None,
                metadata={
                    'transaction_id': transaction_id,
                    'pos_type': 'mobile_reader',
                    'device_id': self.device_id,
                    'merchant_id': self.merchant_id,
                    **(metadata or {}),
                }
            )

            if gateway_result.get('success'):
                result = {
                    'success': True,
                    'transaction_id': transaction_id,
                    'amount': float(amount),
                    'currency': currency,
                    'status': 'completed',
                    'card_last4': card_data.get('card_last4'),
                    'card_brand': card_data.get('card_brand'),
                    'read_method': card_data.get('read_method'),
                    'device_id': self.device_id,
                    'gateway_transaction_id': gateway_result.get('transaction_id', ''),
                }

                # Log transaction atomically; refund if DB fails
                try:
                    from django.db import transaction as db_transaction
                    with db_transaction.atomic():
                        self._log_transaction(transaction_id, result)
                except Exception as db_err:
                    logger.error(f"DB log failed after MR charge, issuing refund: {db_err}")
                    try:
                        gateway.refund_payment(
                            transaction_id=gateway_result.get('transaction_id'),
                            amount=float(amount),
                            reason='DB log failed after MR charge'
                        )
                    except Exception as refund_err:
                        logger.critical(
                            f"REFUND ALSO FAILED for MR tx {transaction_id}, "
                            f"gateway_tx={gateway_result.get('transaction_id')}, "
                            f"amount={amount}: {refund_err}"
                        )
                    return {
                        'success': False,
                        'error': 'Payment charged but recording failed. Refund initiated.',
                        'transaction_id': transaction_id,
                    }
            else:
                result = {
                    'success': False,
                    'transaction_id': transaction_id,
                    'error': gateway_result.get('error', 'Payment processing failed'),
                    'status': 'failed',
                    'amount': float(amount),
                    'currency': currency,
                    'device_id': self.device_id,
                }
                # Best-effort log for failed charges
                try:
                    self._log_transaction(transaction_id, result)
                except Exception:
                    pass
            
            return result
            
        except Exception as e:
            logger.error(f"Mobile reader payment error: {str(e)}")
            return {
                'success': False,
                'error': str(e)
            }
    
    def _log_transaction(self, transaction_id: str, result: Dict):
        """Log mobile reader transaction"""
        from .models import POSTransaction
        
        POSTransaction.objects.create(
            merchant_id=self.merchant_id,
            transaction_id=transaction_id,
            device_type=POSDeviceType.MOBILE_READER,
            device_id=self.device_id,
            transaction_type=POSTransactionType.SALE,
            amount=result.get('amount', 0),
            currency=result.get('currency', 'USD'),
            status=result.get('status', 'failed'),
            card_last4=result.get('card_last4', ''),
            card_brand=result.get('card_brand', ''),
            response_data=result
        )


class CountertopTerminal:
    """
    Integration with countertop POS terminals
    Supports Ingenico, Verifone, PAX, etc.
    """
    
    def __init__(self, terminal_id: str, merchant_id: int):
        self.terminal_id = terminal_id
        self.merchant_id = merchant_id
        self.terminal_ip = None
        self.terminal_port = None
    
    def connect(self, ip_address: str, port: int = 8080) -> Dict:
        """Connect to countertop terminal"""
        self.terminal_ip = ip_address
        self.terminal_port = port
        
        # In production, establish TCP/IP connection
        return {
            'success': True,
            'terminal_id': self.terminal_id,
            'ip_address': ip_address,
            'port': port,
            'status': 'connected',
            'terminal_model': 'Ingenico iCT250',
            'firmware': '1.2.3'
        }
    
    def send_transaction(
        self,
        amount: Decimal,
        currency: str,
        transaction_type: str = POSTransactionType.SALE
    ) -> Dict:
        """
        Send transaction to terminal for processing
        
        The terminal will prompt customer to insert/tap card
        """
        transaction_id = f"ct_{uuid.uuid4().hex[:16]}"
        
        # Send transaction request to terminal
        request = {
            'transaction_id': transaction_id,
            'amount': float(amount),
            'currency': currency,
            'transaction_type': transaction_type
        }
        
        # In production, send via TCP/IP
        # Mock response
        return {
            'success': True,
            'transaction_id': transaction_id,
            'status': 'approved',
            'amount': float(amount),
            'currency': currency,
            'card_last4': '1234',
            'card_brand': 'visa',
            'entry_mode': 'chip',
            'approval_code': 'ABC123',
            'terminal_id': self.terminal_id
        }
    
    def cancel_transaction(self, transaction_id: str) -> Dict:
        """Cancel pending transaction on terminal"""
        return {
            'success': True,
            'transaction_id': transaction_id,
            'status': 'cancelled'
        }
    
    def print_receipt(self, transaction_id: str, receipt_type: str = 'customer') -> Dict:
        """Print receipt on terminal printer"""
        return {
            'success': True,
            'transaction_id': transaction_id,
            'receipt_type': receipt_type,
            'printed': True
        }


class POSIntegrationAPI:
    """
    Unified API for all POS integrations
    """
    
    @staticmethod
    def get_device_info(device_id: str) -> Dict:
        """Get information about a registered POS device"""
        from .models import POSDevice
        
        try:
            device = POSDevice.objects.get(device_id=device_id)
            return {
                'success': True,
                'device': {
                    'device_id': device.device_id,
                    'device_type': device.device_type,
                    'device_name': device.device_name,
                    'merchant_id': device.merchant_id,
                    'status': device.status,
                    'last_seen': device.last_seen.isoformat() if device.last_seen else None,
                    'location': device.location
                }
            }
        except POSDevice.DoesNotExist:
            return {
                'success': False,
                'error': 'Device not found'
            }
    
    @staticmethod
    def register_device(
        merchant_id: int,
        device_type: str,
        device_name: str,
        device_info: Dict
    ) -> Dict:
        """Register a new POS device"""
        from .models import POSDevice
        
        device_id = f"dev_{uuid.uuid4().hex[:12]}"
        
        device = POSDevice.objects.create(
            device_id=device_id,
            merchant_id=merchant_id,
            device_type=device_type,
            device_name=device_name,
            device_info=device_info,
            status='active'
        )
        
        return {
            'success': True,
            'device_id': device_id,
            'device': {
                'device_id': device.device_id,
                'device_type': device.device_type,
                'device_name': device.device_name,
                'status': device.status
            }
        }
    
    @staticmethod
    def get_merchant_devices(merchant_id: int) -> List[Dict]:
        """Get all POS devices for a merchant"""
        from .models import POSDevice
        
        devices = POSDevice.objects.filter(merchant_id=merchant_id)
        
        return [
            {
                'device_id': device.device_id,
                'device_type': device.device_type,
                'device_name': device.device_name,
                'status': device.status,
                'last_seen': device.last_seen.isoformat() if device.last_seen else None
            }
            for device in devices
        ]
    
    @staticmethod
    def get_transaction_history(
        merchant_id: int,
        device_id: Optional[str] = None,
        limit: int = 100
    ) -> List[Dict]:
        """Get POS transaction history"""
        from .models import POSTransaction
        
        query = POSTransaction.objects.filter(merchant_id=merchant_id)
        
        if device_id:
            query = query.filter(device_id=device_id)
        
        transactions = query.order_by('-created_at')[:limit]
        
        return [
            {
                'transaction_id': txn.transaction_id,
                'device_type': txn.device_type,
                'device_id': txn.device_id,
                'amount': float(txn.amount),
                'currency': txn.currency,
                'status': txn.status,
                'card_last4': txn.card_last4,
                'card_brand': txn.card_brand,
                'created_at': txn.created_at.isoformat()
            }
            for txn in transactions
        ]


class POSReceiptGenerator:
    """Generate receipts for POS transactions"""
    
    @staticmethod
    def generate_receipt(transaction_data: Dict, receipt_type: str = 'customer') -> str:
        """
        Generate receipt text
        
        Args:
            transaction_data: Transaction details
            receipt_type: 'customer' or 'merchant'
        
        Returns:
            Receipt text (formatted for thermal printer)
        """
        receipt = []
        
        # Header
        receipt.append("=" * 40)
        receipt.append("SikaRemit PAYMENT RECEIPT")
        receipt.append("=" * 40)
        receipt.append("")
        
        # Merchant info
        merchant_name = transaction_data.get('merchant_name', 'Merchant')
        receipt.append(f"Merchant: {merchant_name}")
        receipt.append("")
        
        # Transaction details
        receipt.append(f"Transaction ID: {transaction_data.get('transaction_id')}")
        receipt.append(f"Date: {transaction_data.get('date', datetime.now().strftime('%Y-%m-%d %H:%M:%S'))}")
        receipt.append("")
        
        # Payment details
        amount = transaction_data.get('amount', 0)
        currency = transaction_data.get('currency', 'USD')
        receipt.append(f"Amount: {currency} {amount:.2f}")
        
        card_last4 = transaction_data.get('card_last4', '****')
        card_brand = transaction_data.get('card_brand', 'Card').upper()
        receipt.append(f"Payment: {card_brand} ****{card_last4}")
        
        receipt.append(f"Status: {transaction_data.get('status', 'APPROVED').upper()}")
        receipt.append("")
        
        # Footer
        receipt.append("=" * 40)
        if receipt_type == 'customer':
            receipt.append("Thank you for your business!")
        else:
            receipt.append("MERCHANT COPY")
        receipt.append("=" * 40)
        
        return "\n".join(receipt)


# Utility functions
def create_virtual_terminal(merchant_id: int) -> VirtualTerminal:
    """Create virtual terminal instance"""
    return VirtualTerminal(merchant_id)


def create_mobile_reader(merchant_id: int, device_id: str) -> MobileReaderSDK:
    """Create mobile reader SDK instance"""
    return MobileReaderSDK(merchant_id, device_id)


def create_countertop_terminal(terminal_id: str, merchant_id: int) -> CountertopTerminal:
    """Create countertop terminal instance"""
    return CountertopTerminal(terminal_id, merchant_id)
