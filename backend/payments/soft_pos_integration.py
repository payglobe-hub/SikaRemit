"""
Modern Soft POS Integration System
Supports NFC payments, mobile money, smartphone POS terminals, and PIN security
"""

from typing import Dict, List, Optional, Any, Tuple
from decimal import Decimal
from datetime import datetime, timedelta
from django.conf import settings
from django.utils import timezone
import logging
import uuid
import json
import hashlib
import hmac
import requests
from cryptography.fernet import Fernet

logger = logging.getLogger(__name__)

class SoftPOSType:
    """Modern Soft POS device types"""
    SMARTPHONE_POS = 'smartphone_pos'
    NFC_READER = 'nfc_reader'
    VIRTUAL_TERMINAL = 'virtual_terminal'
    MOBILE_READER = 'mobile_reader'
    TABLET_POS = 'tablet_pos'

class PaymentMethod:
    """Payment methods for Soft POS"""
    CREDIT_CARD = 'credit_card'
    DEBIT_CARD = 'debit_card'
    NFC_CREDIT = 'nfc_credit'
    NFC_DEBIT = 'nfc_debit'
    MOBILE_WALLET = 'mobile_wallet'
    MTN_MONEY = 'mtn_money'
    TELECEL_CASH = 'telecel_cash'
    AIRTELTIGO_MONEY = 'airteltigo_money'
    QR_PAYMENT = 'qr_payment'

class NFCProcessor:
    """NFC payment processing for Soft POS"""
    
    def __init__(self, merchant_id: int):
        self.merchant_id = merchant_id
        self.encryption_key = getattr(settings, 'NFC_ENCRYPTION_KEY', None)
    
    def process_nfc_payment(
        self,
        nfc_data: Dict[str, Any],
        amount: Decimal,
        currency: str = 'GHS'
    ) -> Dict[str, Any]:
        """
        Process NFC payment from contactless card or mobile wallet
        
        Args:
            nfc_data: Raw NFC data from reader
            amount: Transaction amount
            currency: Currency code
        
        Returns:
            Processing result with transaction details
        """
        try:
            # Validate NFC data
            validation_result = self._validate_nfc_data(nfc_data)
            if not validation_result['valid']:
                return {
                    'success': False,
                    'error': validation_result['error'],
                    'error_code': 'INVALID_NFC_DATA'
                }
            
            # Extract card/token information
            card_info = self._extract_card_info(nfc_data)
            
            # Generate transaction ID
            transaction_id = f"nfc_{uuid.uuid4().hex[:16]}"
            
            # Process through payment gateway
            gateway_result = self._process_gateway_payment(
                transaction_id=transaction_id,
                amount=amount,
                currency=currency,
                card_info=card_info,
                payment_method=PaymentMethod.NFC_CREDIT if card_info['type'] == 'credit' else PaymentMethod.NFC_DEBIT
            )
            
            if gateway_result['success']:
                # Create NFC payment record atomically; refund if DB fails
                try:
                    from django.db import transaction as db_transaction
                    with db_transaction.atomic():
                        nfc_payment = self._create_nfc_payment_record(
                            transaction_id=transaction_id,
                            nfc_data=nfc_data,
                            card_info=card_info,
                            gateway_result=gateway_result
                        )
                except Exception as db_err:
                    logger.error(f"DB save failed after NFC charge, issuing refund: {db_err}")
                    try:
                        from payments.gateways.stripe import StripeGateway
                        StripeGateway().refund_payment(
                            transaction_id=gateway_result.get('gateway_transaction_id'),
                            amount=float(amount),
                            reason='DB save failed after NFC charge'
                        )
                    except Exception as refund_err:
                        logger.critical(
                            f"REFUND ALSO FAILED for NFC tx {transaction_id}, "
                            f"gateway_tx={gateway_result.get('gateway_transaction_id')}, "
                            f"amount={amount}: {refund_err}"
                        )
                    return {
                        'success': False,
                        'error': 'Payment charged but recording failed. Refund initiated.',
                        'transaction_id': transaction_id,
                    }
                
                return {
                    'success': True,
                    'transaction_id': transaction_id,
                    'amount': float(amount),
                    'currency': currency,
                    'card_last4': card_info['last4'],
                    'card_brand': card_info['brand'],
                    'wallet_provider': card_info.get('wallet_provider'),
                    'nfc_type': card_info['type'],
                    'authorization_code': gateway_result.get('authorization_code'),
                    'processed_at': datetime.now().isoformat()
                }
            else:
                return {
                    'success': False,
                    'error': gateway_result.get('error', 'Payment processing failed'),
                    'error_code': gateway_result.get('error_code', 'GATEWAY_ERROR')
                }
                
        except Exception as e:
            logger.error(f"NFC payment processing error: {str(e)}")
            return {
                'success': False,
                'error': 'NFC payment processing failed',
                'error_code': 'PROCESSING_ERROR'
            }
    
    def _validate_nfc_data(self, nfc_data: Dict) -> Dict[str, Any]:
        """Validate NFC data structure and security"""
        required_fields = ['nfc_id', 'emv_tags', 'cryptogram']
        
        for field in required_fields:
            if field not in nfc_data:
                return {
                    'valid': False,
                    'error': f'Missing required field: {field}'
                }
        
        # Validate EMV tags
        emv_tags = nfc_data.get('emv_tags', {})
        if not emv_tags.get('9F02'):  # Amount
            return {
                'valid': False,
                'error': 'Invalid EMV data: missing amount'
            }
        
        return {'valid': True}
    
    def _extract_card_info(self, nfc_data: Dict) -> Dict[str, Any]:
        """Extract card information from NFC data"""
        emv_tags = nfc_data.get('emv_tags', {})
        
        # Extract PAN (Primary Account Number) if available
        pan = emv_tags.get('5A', '')  # Tag 5A = PAN
        
        # Determine card type from EMV data
        card_type = 'credit'  # Default to credit
        
        # Extract card brand from BIN
        if pan:
            first_digit = pan[0]
            if first_digit == '4':
                brand = 'visa'
            elif first_digit == '5':
                brand = 'mastercard'
            elif first_digit == '3':
                brand = 'amex'
            else:
                brand = 'unknown'
        else:
            # For mobile wallets, determine from application identifier
            aic = emv_tags.get('9F06', '')  # Application Identifier
            if 'A0000000031010' in aic:  # Visa
                brand = 'visa'
            elif 'A0000000041010' in aic:  # Mastercard
                brand = 'mastercard'
            else:
                brand = 'mobile_wallet'
        
        # Check if it's a mobile wallet
        wallet_provider = None
        if brand == 'mobile_wallet':
            wallet_provider = self._detect_wallet_provider(emv_tags)
        
        return {
            'type': card_type,
            'brand': brand,
            'last4': pan[-4:] if pan else '****',
            'wallet_provider': wallet_provider,
            'pan': pan,
            'aic': emv_tags.get('9F06', ''),
            'un': emv_tags.get('9F37', '')  # Unpredictable Number
        }
    
    def _detect_wallet_provider(self, emv_tags: Dict) -> Optional[str]:
        """Detect mobile wallet provider from EMV tags"""
        aic = emv_tags.get('9F06', '')
        
        if 'A0000001524010' in aic:  # Apple Pay
            return 'apple_pay'
        elif 'A0000001544442' in aic:  # Google Pay
            return 'google_pay'
        elif 'A0000006541010' in aic:  # Samsung Pay
            return 'samsung_pay'
        else:
            return 'unknown_wallet'
    
    def _process_gateway_payment(
        self,
        transaction_id: str,
        amount: Decimal,
        currency: str,
        card_info: Dict,
        payment_method: str
    ) -> Dict[str, Any]:
        """Process payment through Stripe gateway for NFC/card payments"""
        try:
            from payments.gateways.stripe import StripeGateway

            gateway = StripeGateway()

            class POSPaymentMethod:
                def __init__(self, info):
                    self.method_type = 'card'
                    self.id = info.get('pan', transaction_id)
                    self.details = {
                        'token': info.get('pan', ''),
                        'last4': info.get('last4', ''),
                        'brand': info.get('brand', ''),
                        'nfc': True,
                    }

            result = gateway.process_payment(
                amount=float(amount),
                currency=currency,
                payment_method=POSPaymentMethod(card_info),
                customer=None,
                merchant=None,
                metadata={
                    'transaction_id': transaction_id,
                    'payment_method': payment_method,
                    'pos_type': 'soft_pos_nfc',
                    'merchant_id': self.merchant_id,
                }
            )

            if result.get('success'):
                return {
                    'success': True,
                    'transaction_id': transaction_id,
                    'authorization_code': result.get('authorization_code', ''),
                    'approval_code': result.get('approval_code', ''),
                    'gateway_transaction_id': result.get('transaction_id', ''),
                    'processed_at': datetime.now().isoformat()
                }
            else:
                return {
                    'success': False,
                    'error': result.get('error', 'Gateway payment failed'),
                    'transaction_id': transaction_id,
                }

        except Exception as e:
            logger.error(f"POS gateway payment failed: {str(e)}")
            return {'success': False, 'error': str(e), 'transaction_id': transaction_id}
    
    def _create_nfc_payment_record(
        self,
        transaction_id: str,
        nfc_data: Dict,
        card_info: Dict,
        gateway_result: Dict
    ) -> Any:
        """Create NFC payment record in database"""
        from ..models import NFCPayment, POSTransaction
        
        # Create main transaction
        transaction = POSTransaction.objects.create(
            transaction_id=transaction_id,
            merchant_id=self.merchant_id,
            transaction_type='sale',
            payment_method=PaymentMethod.NFC_CREDIT if card_info['type'] == 'credit' else PaymentMethod.NFC_DEBIT,
            entry_mode='nfc',
            amount=gateway_result.get('amount', 0),
            currency='GHS',
            card_last4=card_info['last4'],
            card_brand=card_info['brand'],
            status='completed',
            authorization_code=gateway_result.get('authorization_code'),
            approval_code=gateway_result.get('approval_code'),
            gateway_transaction_id=gateway_result.get('gateway_transaction_id'),
            completed_at=timezone.now()
        )
        
        # Create NFC payment record
        nfc_payment = NFCPayment.objects.create(
            transaction=transaction,
            nfc_type=card_info['type'],
            nfc_id=nfc_data['nfc_id'],
            card_token=card_info.get('pan', ''),
            wallet_provider=card_info.get('wallet_provider'),
            reader_id=nfc_data.get('reader_id', 'default'),
            reader_type=nfc_data.get('reader_type', 'nfc'),
            cryptogram=nfc_data.get('cryptogram', ''),
            aic=card_info.get('aic', ''),
            un=card_info.get('un', ''),
            nfc_data=nfc_data,
            emv_tags=nfc_data.get('emv_tags', {})
        )
        
        return nfc_payment

class MobileMoneyProcessor:
    """Mobile money payment processing for Ghana networks"""
    
    def __init__(self, merchant_id: int):
        self.merchant_id = merchant_id
        self.api_keys = {
            'mtn': getattr(settings, 'MTN_MOMO_API_KEY', ''),
            'telecel': getattr(settings, 'TELECEL_CASH_API_KEY', ''),
            'airteltigo': getattr(settings, 'AIRTELTIGO_MONEY_API_KEY', ''),
        }
    
    def process_mobile_money_payment(
        self,
        network: str,
        mobile_number: str,
        amount: Decimal,
        currency: str = 'GHS',
        customer_name: str = '',
        reference: str = ''
    ) -> Dict[str, Any]:
        """
        Process mobile money payment
        
        Args:
            network: Mobile network (mtn, telecel, airteltigo, glo)
            mobile_number: Customer mobile number
            amount: Transaction amount
            currency: Currency code
            customer_name: Customer name
            reference: Transaction reference
        
        Returns:
            Processing result
        """
        try:
            # Validate mobile number
            if not self._validate_mobile_number(mobile_number, network):
                return {
                    'success': False,
                    'error': 'Invalid mobile number format',
                    'error_code': 'INVALID_MOBILE_NUMBER'
                }
            
            # Generate transaction IDs
            transaction_id = f"mm_{uuid.uuid4().hex[:16]}"
            mobile_money_transaction_id = f"{network.upper()}_{uuid.uuid4().hex[:12]}"
            
            # Create transaction record
            transaction = self._create_mobile_money_transaction(
                transaction_id=transaction_id,
                mobile_money_transaction_id=mobile_money_transaction_id,
                network=network,
                mobile_number=mobile_number,
                amount=amount,
                customer_name=customer_name,
                reference=reference
            )
            
            # Send payment prompt to customer
            prompt_result = self._send_payment_prompt(
                mobile_money_transaction_id=mobile_money_transaction_id,
                network=network,
                mobile_number=mobile_number,
                amount=amount,
                reference=reference or f"SikaRemit-{transaction_id[:8]}"
            )
            
            if prompt_result['success']:
                # Update payment status
                transaction.mobile_money_payment.send_prompt()
                
                return {
                    'success': True,
                    'transaction_id': transaction_id,
                    'mobile_money_transaction_id': mobile_money_transaction_id,
                    'network': network,
                    'mobile_number': mobile_number,
                    'amount': float(amount),
                    'currency': currency,
                    'status': 'pending_customer_confirmation',
                    'expires_at': (timezone.now() + timedelta(minutes=5)).isoformat(),
                    'message': 'Payment prompt sent to customer. Please wait for confirmation.'
                }
            else:
                # Mark as failed
                transaction.status = 'failed'
                transaction.failure_reason = prompt_result.get('error', 'Failed to send payment prompt')
                transaction.save()
                
                return {
                    'success': False,
                    'error': prompt_result.get('error', 'Failed to send payment prompt'),
                    'error_code': 'PROMPT_SEND_FAILED'
                }
                
        except Exception as e:
            logger.error(f"Mobile money payment error: {str(e)}")
            return {
                'success': False,
                'error': 'Mobile money payment processing failed',
                'error_code': 'PROCESSING_ERROR'
            }
    
    def check_payment_status(self, mobile_money_transaction_id: str) -> Dict[str, Any]:
        """Check the status of a mobile money payment"""
        try:
            from ..models import MobileMoneyPayment
            
            payment = MobileMoneyPayment.objects.get(
                mobile_money_transaction_id=mobile_money_transaction_id
            )
            
            # Check with network API for latest status
            network_status = self._check_network_status(payment.network, mobile_money_transaction_id)
            
            if network_status['confirmed']:
                # Mark as confirmed
                payment.confirm_payment(network_status.get('confirmation_code'))
                payment.transaction.mark_completed(
                    authorization_code=network_status.get('authorization_code'),
                    approval_code=network_status.get('approval_code')
                )
                
                return {
                    'success': True,
                    'status': 'confirmed',
                    'transaction_id': payment.transaction.transaction_id,
                    'confirmed_at': payment.confirmed_at.isoformat(),
                    'confirmation_code': payment.confirmation_code
                }
            elif network_status['failed']:
                # Mark as failed
                payment.status = 'failed'
                payment.transaction.mark_failed(
                    failure_reason=network_status.get('reason', 'Payment failed'),
                    response_code=network_status.get('response_code')
                )
                
                return {
                    'success': False,
                    'status': 'failed',
                    'reason': network_status.get('reason', 'Payment failed')
                }
            else:
                # Still pending or expired
                if payment.is_expired():
                    payment.status = 'timeout'
                    payment.transaction.mark_failed('Payment expired')
                    
                    return {
                        'success': False,
                        'status': 'expired',
                        'reason': 'Payment timed out'
                    }
                
                return {
                    'success': False,
                    'status': 'pending',
                    'expires_at': payment.expires_at.isoformat() if payment.expires_at else None
                }
                
        except MobileMoneyPayment.DoesNotExist:
            return {
                'success': False,
                'error': 'Mobile money transaction not found',
                'error_code': 'TRANSACTION_NOT_FOUND'
            }
        except Exception as e:
            logger.error(f"Mobile money status check error: {str(e)}")
            return {
                'success': False,
                'error': 'Status check failed',
                'error_code': 'STATUS_CHECK_ERROR'
            }
    
    def _validate_mobile_number(self, mobile_number: str, network: str) -> bool:
        """Validate mobile number format for specific network"""
        # Remove any spaces, dashes, or parentheses
        clean_number = ''.join(c for c in mobile_number if c.isdigit())
        
        # Ghana mobile numbers: 10 digits starting with specific prefixes
        if len(clean_number) != 10:
            return False
        
        # Network prefixes
        prefixes = {
            'mtn': ['024', '054', '055', '059'],
            'telecel': ['020', '050'],
            'airteltigo': ['026', '027', '056', '057'],
            'glo': ['023']
        }
        
        prefix = clean_number[:3]
        return prefix in prefixes.get(network, [])
    
    def _create_mobile_money_transaction(
        self,
        transaction_id: str,
        mobile_money_transaction_id: str,
        network: str,
        mobile_number: str,
        amount: Decimal,
        customer_name: str,
        reference: str
    ) -> Any:
        """Create mobile money transaction record"""
        from ..models import POSTransaction, MobileMoneyPayment
        
        # Create main transaction
        transaction = POSTransaction.objects.create(
            transaction_id=transaction_id,
            merchant_id=self.merchant_id,
            transaction_type='sale',
            payment_method=f"{network}_money",
            entry_mode='mobile_app',
            amount=amount,
            currency='GHS',
            mobile_number=mobile_number,
            mobile_network=network,
            mobile_money_transaction_id=mobile_money_transaction_id,
            customer_name=customer_name,
            status='pending'
        )
        
        # Create mobile money payment record
        mobile_payment = MobileMoneyPayment.objects.create(
            transaction=transaction,
            network=network,
            mobile_number=mobile_number,
            customer_name=customer_name,
            mobile_money_transaction_id=mobile_money_transaction_id,
            reference_number=reference,
            status='pending'
        )
        
        return transaction
    
    def _send_payment_prompt(
        self,
        mobile_money_transaction_id: str,
        network: str,
        mobile_number: str,
        amount: Decimal,
        reference: str
    ) -> Dict[str, Any]:
        """Send payment prompt to customer via mobile money gateway"""
        try:
            from payments.gateways.mobile_money import (
                MTNMoMoGateway, TelecelCashGateway, AirtelTigoMoneyGateway, GMoneyGateway
            )

            gateway_map = {
                'mtn': MTNMoMoGateway,
                'mtn_momo': MTNMoMoGateway,
                'telecel': TelecelCashGateway,
                'vodafone': TelecelCashGateway,
                'airtel_tigo': AirtelTigoMoneyGateway,
                'airteltigo': AirtelTigoMoneyGateway,
                'g_money': GMoneyGateway,
            }

            gateway_class = gateway_map.get(network.lower(), MTNMoMoGateway)
            gateway = gateway_class()

            logger.info(f"Sending {network} payment prompt to {mobile_number} for GHS {amount}")

            result = gateway.process_payment(
                amount=float(amount),
                currency='GHS',
                phone_number=mobile_number,
                customer=None,
                merchant=None,
                metadata={
                    'transaction_id': mobile_money_transaction_id,
                    'reference': reference,
                    'pos_type': 'soft_pos_mobile_money',
                    'merchant_id': self.merchant_id,
                }
            )

            if result.get('success'):
                return {
                    'success': True,
                    'prompt_id': result.get('transaction_id', f"prompt_{uuid.uuid4().hex[:8]}"),
                    'sent_at': datetime.now().isoformat()
                }
            else:
                return {
                    'success': False,
                    'error': result.get('error', 'Failed to send payment prompt'),
                }

        except Exception as e:
            logger.error(f"Payment prompt failed for {network}: {str(e)}")
            return {'success': False, 'error': str(e)}
    
    def _check_network_status(self, network: str, transaction_id: str) -> Dict[str, Any]:
        """Check payment status with mobile money gateway"""
        try:
            from payments.gateways.mobile_money import (
                MTNMoMoGateway, TelecelCashGateway, AirtelTigoMoneyGateway, GMoneyGateway
            )

            gateway_map = {
                'mtn': MTNMoMoGateway,
                'mtn_momo': MTNMoMoGateway,
                'telecel': TelecelCashGateway,
                'vodafone': TelecelCashGateway,
                'airtel_tigo': AirtelTigoMoneyGateway,
                'airteltigo': AirtelTigoMoneyGateway,
                'g_money': GMoneyGateway,
            }

            gateway_class = gateway_map.get(network.lower(), MTNMoMoGateway)
            gateway = gateway_class()

            status_result = gateway.check_payment_status(transaction_id)

            if status_result.get('status') == 'completed':
                return {
                    'confirmed': True,
                    'failed': False,
                    'confirmation_code': status_result.get('confirmation_code', ''),
                    'authorization_code': status_result.get('authorization_code', ''),
                    'approval_code': status_result.get('approval_code', ''),
                }
            elif status_result.get('status') == 'failed':
                return {
                    'confirmed': False,
                    'failed': True,
                    'reason': status_result.get('error', 'Payment failed'),
                    'response_code': status_result.get('response_code', 'FAILED'),
                }
            else:
                return {
                    'confirmed': False,
                    'failed': False,
                    'reason': status_result.get('message', 'Payment pending confirmation'),
                }

        except AttributeError:
            # Gateway doesn't support check_payment_status
            return {
                'confirmed': False,
                'failed': False,
                'reason': 'Status check not supported by gateway',
            }
        except Exception as e:
            logger.error(f"Network status check failed for {network}: {str(e)}")
            return {
                'confirmed': False,
                'failed': False,
                'reason': f'Status check error: {str(e)}',
            }

class SmartphonePOSManager:
    """Smartphone POS device management and security"""
    
    def __init__(self):
        self.encryption_key = getattr(settings, 'SMARTPOS_ENCRYPTION_KEY', Fernet.generate_key())
        self.cipher_suite = Fernet(self.encryption_key)
    
    def register_smartphone_device(
        self,
        merchant_id: int,
        device_info: Dict[str, Any],
        security_credentials: Dict[str, Any]
    ) -> Dict[str, Any]:
        """
        Register a new smartphone as POS device
        
        Args:
            merchant_id: Merchant ID
            device_info: Device information (model, OS, etc.)
            security_credentials: Security credentials (device ID hash, etc.)
        
        Returns:
            Registration result
        """
        try:
            from ..models import POSDevice, SmartphonePOSDevice
            
            # Validate device info
            required_fields = ['device_model', 'os_type', 'os_version', 'app_version']
            for field in required_fields:
                if field not in device_info:
                    return {
                        'success': False,
                        'error': f'Missing required device info: {field}'
                    }
            
            # Validate security credentials
            if 'device_id_hash' not in security_credentials:
                return {
                    'success': False,
                    'error': 'Missing device ID hash for security'
                }
            
            # Generate device ID
            device_id = f"sp_{uuid.uuid4().hex[:12]}"
            
            # Create POS device record
            pos_device = POSDevice.objects.create(
                device_id=device_id,
                merchant_id=merchant_id,
                device_type=SoftPOSType.SMARTPHONE_POS,
                device_name=f"{device_info['device_model']} POS",
                connection_type='internet',
                supports_nfc=device_info.get('nfc_capable', False),
                supports_mobile_money=True,
                supports_chip=False,  # Smartphone doesn't have chip reader
                supports_swipe=False,  # Smartphone doesn't have swipe reader
                supports_contactless=device_info.get('nfc_capable', False),
                pin_required=True,
                biometric_supported=device_info.get('biometric_available', False),
                encryption_enabled=True,
                security_level='pci_compliant',
                device_info=device_info,
                hardware_specs=device_info.get('hardware_specs', {}),
                pci_certified=False,  # Needs certification
                emv_certified=False   # Needs certification
            )
            
            # Create smartphone-specific config
            smartphone_config = SmartphonePOSDevice.objects.create(
                pos_device=pos_device,
                device_model=device_info['device_model'],
                os_type=device_info['os_type'],
                os_version=device_info['os_version'],
                app_version=device_info['app_version'],
                device_id_hash=security_credentials['device_id_hash'],
                encryption_key=self.cipher_suite.encrypt(
                    f"key_{uuid.uuid4().hex[:24]}".encode()
                ).decode(),
                biometric_enabled=device_info.get('biometric_enabled', False),
                pin_required=True,
                nfc_capable=device_info.get('nfc_capable', False),
                bluetooth_capable=device_info.get('bluetooth_capable', True),
                camera_available=device_info.get('camera_available', True),
                status='active'
            )
            
            return {
                'success': True,
                'device_id': device_id,
                'smartphone_config_id': str(smartphone_config.id),
                'encryption_key': self.cipher_suite.decrypt(
                    smartphone_config.encryption_key.encode()
                ).decode(),
                'status': 'registered',
                'registered_at': datetime.now().isoformat()
            }
            
        except Exception as e:
            logger.error(f"Smartphone POS registration error: {str(e)}")
            return {
                'success': False,
                'error': 'Device registration failed',
                'error_code': 'REGISTRATION_ERROR'
            }
    
    def authenticate_device(
        self,
        device_id_hash: str,
        authentication_data: Dict[str, Any]
    ) -> Dict[str, Any]:
        """
        Authenticate smartphone POS device
        
        Args:
            device_id_hash: Hashed device identifier
            authentication_data: Authentication credentials
        
        Returns:
            Authentication result
        """
        try:
            from ..models import SmartphonePOSDevice
            
            device = SmartphonePOSDevice.objects.select_related('pos_device').get(
                device_id_hash=device_id_hash
            )
            
            # Check device status
            if device.status != 'active':
                return {
                    'success': False,
                    'error': f'Device is {device.status}',
                    'error_code': 'DEVICE_INACTIVE'
                }
            
            # Verify PIN if required
            if device.pin_required and 'pin' in authentication_data:
                pin = authentication_data['pin']
                if len(pin) != 4 or not pin.isdigit():
                    return {
                        'success': False,
                        'error': 'Invalid PIN format',
                        'error_code': 'INVALID_PIN'
                    }
                # Verify PIN against stored hashed PIN
                stored_pin_hash = getattr(device, 'pin_hash', None)
                if not stored_pin_hash:
                    return {
                        'success': False,
                        'error': 'Device PIN not configured. Please set up your PIN first.',
                        'error_code': 'PIN_NOT_SET'
                    }
                import hashlib
                pin_hash = hashlib.sha256(
                    (pin + str(device.device_id_hash)).encode()
                ).hexdigest()
                if pin_hash != stored_pin_hash:
                    device.add_security_event('pin_failure', {
                        'timestamp': datetime.now().isoformat(),
                        'ip_address': authentication_data.get('ip_address'),
                    })
                    return {
                        'success': False,
                        'error': 'Incorrect PIN',
                        'error_code': 'WRONG_PIN'
                    }
            
            # Verify biometric if enabled
            if device.biometric_enabled and 'biometric_data' in authentication_data:
                biometric_token = authentication_data.get('biometric_data', {}).get('token')
                if not biometric_token:
                    return {
                        'success': False,
                        'error': 'Biometric authentication token required',
                        'error_code': 'BIOMETRIC_REQUIRED'
                    }
            
            # Update heartbeat
            device.update_heartbeat(
                battery_level=authentication_data.get('battery_level'),
                location=authentication_data.get('location')
            )
            
            # Add security event
            device.add_security_event('authentication_success', {
                'timestamp': datetime.now().isoformat(),
                'ip_address': authentication_data.get('ip_address'),
                'user_agent': authentication_data.get('user_agent')
            })
            
            return {
                'success': True,
                'device_id': device.pos_device.device_id,
                'authenticated_at': datetime.now().isoformat(),
                'session_token': f"session_{uuid.uuid4().hex[:16]}",
                'expires_at': (datetime.now() + timedelta(hours=24)).isoformat()
            }
            
        except SmartphonePOSDevice.DoesNotExist:
            return {
                'success': False,
                'error': 'Device not found',
                'error_code': 'DEVICE_NOT_FOUND'
            }
        except Exception as e:
            logger.error(f"Device authentication error: {str(e)}")
            return {
                'success': False,
                'error': 'Authentication failed',
                'error_code': 'AUTH_ERROR'
            }
    
    def update_device_status(
        self,
        device_id_hash: str,
        status_data: Dict[str, Any]
    ) -> Dict[str, Any]:
        """Update device status and metrics"""
        try:
            from ..models import SmartphonePOSDevice
            
            device = SmartphonePOSDevice.objects.get(device_id_hash=device_id_hash)
            
            # Update device metrics
            if 'battery_level' in status_data:
                device.battery_level = status_data['battery_level']
            
            if 'storage_available' in status_data:
                device.storage_available = status_data['storage_available']
            
            if 'location' in status_data:
                location = status_data['location']
                device.last_location_lat = location.get('lat')
                device.last_location_lng = location.get('lng')
                device.location_timestamp = datetime.now()
            
            # Update heartbeat
            device.last_heartbeat = datetime.now()
            device.save()
            
            return {
                'success': True,
                'updated_at': datetime.now().isoformat()
            }
            
        except SmartphonePOSDevice.DoesNotExist:
            return {
                'success': False,
                'error': 'Device not found',
                'error_code': 'DEVICE_NOT_FOUND'
            }
        except Exception as e:
            logger.error(f"Device status update error: {str(e)}")
            return {
                'success': False,
                'error': 'Status update failed',
                'error_code': 'UPDATE_ERROR'
            }

class SoftPOSIntegration:
    """Unified Soft POS integration system"""
    
    def __init__(self, merchant_id: int):
        self.merchant_id = merchant_id
        self.nfc_processor = NFCProcessor(merchant_id)
        self.mobile_money_processor = MobileMoneyProcessor(merchant_id)
        self.smartphone_manager = SmartphonePOSManager()
    
    def process_payment(
        self,
        payment_method: str,
        payment_data: Dict[str, Any],
        amount: Decimal,
        currency: str = 'GHS'
    ) -> Dict[str, Any]:
        """
        Process payment through appropriate method
        
        Args:
            payment_method: Payment method type
            payment_data: Payment-specific data
            amount: Transaction amount
            currency: Currency code
        
        Returns:
            Processing result
        """
        try:
            if payment_method in [PaymentMethod.NFC_CREDIT, PaymentMethod.NFC_DEBIT]:
                return self.nfc_processor.process_nfc_payment(
                    nfc_data=payment_data,
                    amount=amount,
                    currency=currency
                )
            
            elif payment_method in [
                PaymentMethod.MTN_MONEY,
                PaymentMethod.TELECEL_CASH,
                PaymentMethod.AIRTELTIGO_MONEY
            ]:
                network = payment_method.replace('_money', '')
                return self.mobile_money_processor.process_mobile_money_payment(
                    network=network,
                    mobile_number=payment_data['mobile_number'],
                    amount=amount,
                    currency=currency,
                    customer_name=payment_data.get('customer_name', ''),
                    reference=payment_data.get('reference', '')
                )
            
            else:
                return {
                    'success': False,
                    'error': f'Unsupported payment method: {payment_method}',
                    'error_code': 'UNSUPPORTED_METHOD'
                }
                
        except Exception as e:
            logger.error(f"Soft POS payment processing error: {str(e)}")
            return {
                'success': False,
                'error': 'Payment processing failed',
                'error_code': 'PROCESSING_ERROR'
            }
    
    def check_payment_status(self, transaction_id: str) -> Dict[str, Any]:
        """Check status of any payment transaction"""
        try:
            from ..models import POSTransaction
            
            transaction = POSTransaction.objects.get(transaction_id=transaction_id)
            
            if transaction.payment_method in [
                PaymentMethod.MTN_MONEY,
                PaymentMethod.TELECEL_CASH,
                PaymentMethod.AIRTELTIGO_MONEY
            ]:
                if hasattr(transaction, 'mobile_money_payment'):
                    return self.mobile_money_processor.check_payment_status(
                        transaction.mobile_money_payment.mobile_money_transaction_id
                    )
            
            # For other payment methods, return current status
            return {
                'success': transaction.is_successful(),
                'status': transaction.status,
                'transaction_id': transaction_id,
                'amount': float(transaction.amount),
                'currency': transaction.currency,
                'payment_method': transaction.payment_method,
                'created_at': transaction.created_at.isoformat(),
                'completed_at': transaction.completed_at.isoformat() if transaction.completed_at else None
            }
            
        except POSTransaction.DoesNotExist:
            return {
                'success': False,
                'error': 'Transaction not found',
                'error_code': 'TRANSACTION_NOT_FOUND'
            }
        except Exception as e:
            logger.error(f"Payment status check error: {str(e)}")
            return {
                'success': False,
                'error': 'Status check failed',
                'error_code': 'STATUS_CHECK_ERROR'
            }

# Utility functions
def create_soft_pos_integration(merchant_id: int) -> SoftPOSIntegration:
    """Create Soft POS integration instance"""
    return SoftPOSIntegration(merchant_id)

def register_smartphone_pos(merchant_id: int, device_info: Dict, security_creds: Dict) -> Dict:
    """Register smartphone POS device"""
    manager = SmartphonePOSManager()
    return manager.register_smartphone_device(merchant_id, device_info, security_creds)

def authenticate_smartphone_pos(device_id_hash: str, auth_data: Dict) -> Dict:
    """Authenticate smartphone POS device"""
    manager = SmartphonePOSManager()
    return manager.authenticate_device(device_id_hash, auth_data)
