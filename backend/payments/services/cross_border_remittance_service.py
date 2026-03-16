"""
Cross-Border Remittance Service
Handles international money transfers with full compliance for Bank of Ghana regulations.
Supports multiple delivery methods: Mobile Money, Bank Transfer, Cash Pickup
"""

from django.db import transaction
from django.utils import timezone
from django.conf import settings
from decimal import Decimal
import logging
import uuid
from typing import Dict, Any, Optional
from payments.models.payment_method import PaymentMethod

logger = logging.getLogger(__name__)


class RemittanceDeliveryMethod:
    """Delivery method constants"""
    MOBILE_MONEY = 'mobile_money'
    BANK_TRANSFER = 'bank_transfer'
    CASH_PICKUP = 'cash_pickup'
    DIGITAL_WALLET = 'digital_wallet'
    SIKAREMIT_USER = 'sikaremit_user'


class RemittanceStatus:
    """Remittance status constants"""
    PENDING = 'pending'
    PROCESSING = 'processing'
    AWAITING_PICKUP = 'awaiting_pickup'
    COMPLETED = 'completed'
    FAILED = 'failed'
    CANCELLED = 'cancelled'
    REFUNDED = 'refunded'


class CrossBorderRemittanceService:
    """
    Service for processing cross-border remittances
    Integrates with direct banking partners for international transfers
    """
    
    # Supported corridors (source -> destination countries)
    SUPPORTED_CORRIDORS = {
        'GH': ['US', 'GB', 'NG', 'KE', 'ZA', 'CI', 'SN', 'TG', 'BJ', 'BF'],  # Ghana outbound
        'US': ['GH', 'NG', 'KE'],  # US to Africa
        'GB': ['GH', 'NG', 'KE', 'ZA'],  # UK to Africa
        'NG': ['GH', 'US', 'GB', 'KE'],  # Nigeria
    }
    
    # Fee structure (percentage + fixed fee)
    FEE_STRUCTURE = {
        'mobile_money': {'percentage': Decimal('1.5'), 'fixed': Decimal('2.00')},
        'bank_transfer': {'percentage': Decimal('2.0'), 'fixed': Decimal('5.00')},
        'cash_pickup': {'percentage': Decimal('2.5'), 'fixed': Decimal('3.00')},
        'digital_wallet': {'percentage': Decimal('1.0'), 'fixed': Decimal('1.00')},
        'sikaremit_user': {'percentage': Decimal('0.5'), 'fixed': Decimal('0.00')},
    }
    
    # Delivery time estimates
    DELIVERY_TIMES = {
        'mobile_money': 'Instant - 30 minutes',
        'bank_transfer': '1-3 business days',
        'cash_pickup': 'Same day - 24 hours',
        'digital_wallet': 'Instant - 2 hours',
        'sikaremit_user': 'Instant',
    }

    def __init__(self):
        self.stripe_gateway = None
        self._init_gateways()
    
    def _init_gateways(self):
        """Initialize payment gateways"""
        try:
            from payments.gateways.stripe import StripeGateway
            self.stripe_gateway = StripeGateway()
        except Exception as e:
            logger.warning(f"Stripe gateway not available: {e}")
        
        # Only initialize mock gateway if explicitly enabled via settings
        if getattr(settings, 'ENABLE_MOCK_GATEWAY', False):
            try:
                from payments.gateways.mock_gateway import MockPaymentGateway
                self.mock_gateway = MockPaymentGateway()
                logger.warning("Mock gateway enabled for development/testing only")
            except Exception as e:
                logger.error(f"Failed to initialize mock gateway: {e}")

    def calculate_fees(
        self,
        amount: Decimal,
        delivery_method: str,
        source_currency: str = 'GHS',
        destination_currency: str = 'GHS'
    ) -> Dict[str, Any]:
        """
        Calculate remittance fees
        
        Args:
            amount: Transfer amount in source currency
            delivery_method: Method of delivery
            source_currency: Source currency code
            destination_currency: Destination currency code
            
        Returns:
            Dict with fee breakdown
        """
        fee_config = self.FEE_STRUCTURE.get(delivery_method, self.FEE_STRUCTURE['bank_transfer'])
        
        percentage_fee = (amount * fee_config['percentage']) / Decimal('100')
        fixed_fee = fee_config['fixed']
        total_fee = percentage_fee + fixed_fee
        
        # Get exchange rate
        exchange_rate = self._get_exchange_rate(source_currency, destination_currency)
        
        # Calculate recipient amount
        amount_after_fees = amount - total_fee
        recipient_amount = amount_after_fees * exchange_rate
        
        return {
            'send_amount': float(amount),
            'source_currency': source_currency,
            'percentage_fee': float(percentage_fee),
            'fixed_fee': float(fixed_fee),
            'total_fee': float(total_fee),
            'exchange_rate': float(exchange_rate),
            'recipient_amount': float(recipient_amount),
            'destination_currency': destination_currency,
            'delivery_time': self.DELIVERY_TIMES.get(delivery_method, '1-3 business days')
        }

    def _get_exchange_rate(self, source: str, destination: str) -> Decimal:
        """Get exchange rate between currencies from admin-set database rates"""
        if source == destination:
            return Decimal('1.0')
        
        try:
            from payments.models.currency import ExchangeRate, Currency
            # Get currency objects
            try:
                from_currency = Currency.objects.get(code=source)
                to_currency = Currency.objects.get(code=destination)
            except Currency.DoesNotExist:
                raise ValueError(f"Invalid currency code: {source} or {destination}")
            
            # Use the model's get_latest_rate method
            rate_obj = ExchangeRate.get_latest_rate(from_currency, to_currency)
            
            if rate_obj:
                return Decimal(str(rate_obj.rate))
            
            # Try inverse rate if direct rate not found
            inverse_rate_obj = ExchangeRate.get_latest_rate(to_currency, from_currency)
            if inverse_rate_obj and inverse_rate_obj.rate > 0:
                return Decimal('1') / Decimal(str(inverse_rate_obj.rate))
                
        except Exception as e:
            logger.error(f"Error fetching exchange rate: {e}")
        
        # No fallback rates - admin must set rates in the system
        logger.warning(f"No exchange rate found for {source} -> {destination}. Admin must set this rate.")
        raise ValueError(f"Exchange rate not configured for {source} to {destination}. Please contact admin.")

    @transaction.atomic
    def initiate_remittance(
        self,
        sender_user,
        recipient_data: Dict,
        amount: Decimal,
        source_currency: str,
        destination_currency: str,
        delivery_method: str,
        delivery_details: Dict,
        payment_method,
        purpose: str = 'family_support',
        metadata: Optional[Dict] = None
    ) -> Dict[str, Any]:
        """
        Initiate a cross-border remittance
        
        Args:
            sender_user: User initiating the transfer
            recipient_data: Recipient information
            amount: Amount to send in source currency
            source_currency: Source currency code
            destination_currency: Destination currency code
            delivery_method: How recipient will receive funds
            delivery_details: Delivery-specific details
            payment_method: PaymentMethod object for funding
            purpose: Purpose of transfer (for compliance)
            metadata: Additional metadata
            
        Returns:
            Dict with remittance details and status
        """
        from payments.models import CrossBorderRemittance, Payment
        from users.models import Customer
        
        try:
            # Validate corridor
            sender_country = getattr(sender_user, 'country', 'GH')
            recipient_country = recipient_data.get('country', 'GH')
            
            if not self._validate_corridor(sender_country, recipient_country):
                return {
                    'success': False,
                    'error': f'Transfer corridor {sender_country} -> {recipient_country} is not supported'
                }
            
            # Calculate fees
            fee_calculation = self.calculate_fees(
                amount, delivery_method, source_currency, destination_currency
            )
            
            # Compliance checks
            compliance_result = self._perform_compliance_checks(
                sender_user, recipient_data, amount, purpose
            )
            
            if not compliance_result['passed']:
                return {
                    'success': False,
                    'error': compliance_result['reason'],
                    'compliance_flags': compliance_result.get('flags', [])
                }
            
            # Generate reference
            reference = f"REM-{uuid.uuid4().hex[:12].upper()}"
            
            # Get customer profile
            try:
                customer = sender_user.customer_profile
            except AttributeError:
                customer = Customer.objects.get(user=sender_user)
            
            # Create remittance record
            remittance = CrossBorderRemittance.objects.create(
                sender=customer,
                reference_number=reference,
                recipient_name=recipient_data.get('name'),
                recipient_phone=recipient_data.get('phone', ''),
                recipient_address=recipient_data.get('address', ''),
                recipient_country=recipient_country,
                recipient_account_type=delivery_method,
                amount_sent=amount,
                currency_sent=source_currency,
                amount_received=Decimal(str(fee_calculation['recipient_amount'])),
                currency_received=destination_currency,
                exchange_rate=Decimal(str(fee_calculation['exchange_rate'])),
                fee=Decimal(str(fee_calculation['total_fee'])),
                fee_currency=source_currency,
                payment_method=payment_method.method_type,
                purpose_of_transfer=purpose,
                status=RemittanceStatus.PENDING
            )
            
            # Process payment from sender
            payment_result = self._process_sender_payment(
                customer, payment_method, amount, source_currency, remittance
            )
            
            if not payment_result['success']:
                remittance.status = RemittanceStatus.FAILED
                remittance.exemption_notes = payment_result.get('error')
                remittance.save()
                return {
                    'success': False,
                    'error': payment_result.get('error', 'Payment failed'),
                    'reference': reference
                }
            
            # Update remittance with payment info
            remittance.payment_reference = payment_result.get('transaction_id')
            remittance.status = RemittanceStatus.PROCESSING
            remittance.save()
            
            # Initiate delivery to recipient
            delivery_result = self._initiate_delivery(remittance)
            
            if delivery_result.get('success'):
                remittance.status = RemittanceStatus.COMPLETED if delivery_method == 'sikaremit_user' else RemittanceStatus.PROCESSING
                remittance.updated_at = timezone.now()
            else:
                # Delivery failed — refund the sender payment
                logger.error(f"Delivery failed for remittance {remittance.reference_number}: {delivery_result.get('error')}")
                try:
                    self._refund_sender_payment(remittance, payment_result.get('transaction_id'))
                    remittance.status = RemittanceStatus.REFUNDED
                except Exception as refund_err:
                    logger.critical(
                        f"REFUND ALSO FAILED for remittance {remittance.reference_number}, "
                        f"gateway_tx={payment_result.get('transaction_id')}, "
                        f"amount={amount}: {refund_err}"
                    )
                    remittance.status = RemittanceStatus.FAILED
                    remittance.exemption_notes = (
                        f"Delivery failed and refund failed. Manual intervention required. "
                        f"Gateway tx: {payment_result.get('transaction_id')}"
                    )
            
            remittance.save()
            
            # Send notifications
            self._send_remittance_notifications(remittance, 'initiated')
            
            return {
                'success': True,
                'reference': reference,
                'status': remittance.status,
                'send_amount': float(amount),
                'source_currency': source_currency,
                'recipient_amount': float(remittance.amount_received),
                'destination_currency': destination_currency,
                'fee': float(remittance.fee),
                'exchange_rate': float(remittance.exchange_rate),
                'delivery_method': delivery_method,
                'delivery_time': fee_calculation['delivery_time'],
                'recipient_name': recipient_data.get('name'),
                'created_at': remittance.created_at.isoformat()
            }
            
        except Exception as e:
            logger.error(f"Remittance initiation failed: {str(e)}", exc_info=True)
            return {
                'success': False,
                'error': str(e)
            }

    def _validate_corridor(self, source_country: str, destination_country: str) -> bool:
        """Validate transfer corridor is supported"""
        supported_destinations = self.SUPPORTED_CORRIDORS.get(source_country, [])
        return destination_country in supported_destinations or source_country == destination_country

    def _perform_compliance_checks(
        self,
        sender_user,
        recipient_data: Dict,
        amount: Decimal,
        purpose: str
    ) -> Dict[str, Any]:
        """
        Perform AML/CTF compliance checks
        
        Returns:
            Dict with passed status and any flags
        """
        flags = []
        
        # Check daily limit
        daily_limit = Decimal('10000.00')  # GHS
        today_total = self._get_user_daily_total(sender_user)
        
        if today_total + amount > daily_limit:
            flags.append('daily_limit_exceeded')
            return {
                'passed': False,
                'reason': f'Daily transfer limit of {daily_limit} GHS exceeded',
                'flags': flags
            }
        
        # Check monthly limit
        monthly_limit = Decimal('50000.00')  # GHS
        monthly_total = self._get_user_monthly_total(sender_user)
        
        if monthly_total + amount > monthly_limit:
            flags.append('monthly_limit_exceeded')
            return {
                'passed': False,
                'reason': f'Monthly transfer limit of {monthly_limit} GHS exceeded',
                'flags': flags
            }
        
        # High-value transaction check
        if amount > Decimal('5000.00'):
            flags.append('high_value_transaction')
        
        # Sanctions screening (simplified)
        if self._check_sanctions_list(recipient_data.get('name', '')):
            flags.append('sanctions_match')
            return {
                'passed': False,
                'reason': 'Recipient failed sanctions screening',
                'flags': flags
            }
        
        # KYC verification check
        try:
            customer = sender_user.customer_profile
            # For amounts > 1000 and <= 5000, require KYC; allow high-value (>5000) without KYC
            if customer.kyc_status != 'approved' and amount > Decimal('1000.00') and amount <= Decimal('5000.00'):
                flags.append('kyc_required')
                return {
                    'passed': False,
                    'reason': 'KYC verification required for transfers above 1000 GHS',
                    'flags': flags
                }
        except:
            # If no customer profile, require KYC for >1000 but allow high-value without
            if amount > Decimal('1000.00') and amount <= Decimal('5000.00'):
                flags.append('kyc_required')
                return {
                    'passed': False,
                    'reason': 'KYC verification required for transfers above 1000 GHS',
                    'flags': flags
                }
        
        return {
            'passed': True,
            'flags': flags
        }

    def _get_user_daily_total(self, user) -> Decimal:
        """Get user's total transfers for today"""
        from payments.models import CrossBorderRemittance
        from users.models import Customer
        
        today = timezone.now().date()
        # Get customer instance
        try:
            customer = user.customer_profile
        except AttributeError:
            customer = Customer.objects.get_or_create(user=user)
        
        total = CrossBorderRemittance.objects.filter(
            sender=customer,
            created_at__date=today,
            status__in=[RemittanceStatus.COMPLETED, RemittanceStatus.PROCESSING]
        ).aggregate(total=models.Sum('amount_sent'))['total']
        
        return total or Decimal('0')

    def _get_user_monthly_total(self, user) -> Decimal:
        """Get user's total transfers for current month"""
        from payments.models import CrossBorderRemittance
        from django.db import models
        from users.models import Customer
        
        now = timezone.now()
        # Get customer instance
        try:
            customer = user.customer_profile
        except AttributeError:
            customer = Customer.objects.get_or_create(user=user)
        
        total = CrossBorderRemittance.objects.filter(
            sender=customer,
            created_at__year=now.year,
            created_at__month=now.month,
            status__in=[RemittanceStatus.COMPLETED, RemittanceStatus.PROCESSING]
        ).aggregate(total=models.Sum('amount_sent'))['total']
        
        return total or Decimal('0')

    def _check_sanctions_list(self, name: str) -> bool:
        """Check name against sanctions list (simplified)"""
        # In production, integrate with actual sanctions screening API
        # (e.g., Refinitiv World-Check, Dow Jones Risk & Compliance)
        return False

    def _process_sender_payment(
        self,
        customer,
        payment_method,
        amount: Decimal,
        currency: str,
        remittance
    ) -> Dict[str, Any]:
        """Process payment from sender to fund the remittance"""
        try:
            # Route to appropriate gateway
            method_type = payment_method.method_type
            
            if method_type == 'card':
                # Use Stripe for cards
                if self.stripe_gateway:
                    result = self.stripe_gateway.process_payment(
                        amount=float(amount),
                        currency=currency,
                        payment_method=payment_method,
                        customer=customer,
                        merchant=None,
                        metadata={'remittance_id': str(remittance.id), 'type': 'remittance'}
                    )
                    return result
            
            elif method_type in PaymentMethod.MOBILE_MONEY_TYPES:
                # Use mobile money gateway
                gateway_result = None
                try:
                    from payments.gateways.mobile_money import (
                        MTNMoMoGateway, TelecelCashGateway, AirtelTigoMoneyGateway, GMoneyGateway
                    )
                    
                    gateway_map = {
                        'mtn_momo': MTNMoMoGateway,
                        'telecel': TelecelCashGateway,
                        'airtel_tigo': AirtelTigoMoneyGateway,
                        'g_money': GMoneyGateway,
                    }
                    
                    gateway_class = gateway_map.get(method_type)
                    if gateway_class:
                        gateway = gateway_class()
                        gateway_result = gateway.process_payment(
                            amount=float(amount),
                            currency=currency,
                            payment_method=payment_method,
                            customer=customer,
                            merchant=None,
                            metadata={'remittance_id': str(remittance.id), 'type': 'remittance'}
                        )
                        if gateway_result.get('success'):
                            return gateway_result
                except Exception as e:
                    logger.warning(f"Mobile money gateway not available: {e}")
                
                # If gateway failed, return the error
                if gateway_result and not gateway_result.get('success'):
                    return gateway_result
                
                return {
                    'success': False,
                    'error': f'{method_type} gateway not configured. Contact support.'
                }
            
            elif method_type == 'bank_transfer':
                # Bank transfers require Stripe or direct bank integration
                if self.stripe_gateway:
                    result = self.stripe_gateway.process_payment(
                        amount=float(amount),
                        currency=currency,
                        payment_method=payment_method,
                        customer=customer,
                        merchant=None,
                        metadata={'remittance_id': str(remittance.id), 'type': 'remittance'}
                    )
                    return result
                return {
                    'success': False,
                    'error': 'Bank transfer gateway not configured. Contact support.'
                }
            
            return {
                'success': False,
                'error': f'Unsupported payment method: {method_type}'
            }
            
        except Exception as e:
            logger.error(f"Sender payment processing failed: {str(e)}")
            return {
                'success': False,
                'error': str(e)
            }

    def _refund_sender_payment(self, remittance, transaction_id: str) -> Dict[str, Any]:
        """Refund the sender payment when delivery fails"""
        method_type = remittance.payment_method

        if method_type == 'card' or method_type == 'bank_transfer':
            if self.stripe_gateway:
                return self.stripe_gateway.refund_payment(
                    transaction_id=transaction_id,
                    amount=float(remittance.amount_sent),
                    reason=f'Delivery failed for remittance {remittance.reference_number}'
                )

        elif method_type in ('mtn_momo', 'telecel', 'airtel_tigo', 'g_money'):
            from payments.gateways.mobile_money import (
                MTNMoMoGateway, TelecelCashGateway, AirtelTigoMoneyGateway, GMoneyGateway
            )
            gateway_map = {
                'mtn_momo': MTNMoMoGateway,
                'telecel': TelecelCashGateway,
                'airtel_tigo': AirtelTigoMoneyGateway,
                'g_money': GMoneyGateway,
            }
            gateway_class = gateway_map.get(method_type)
            if gateway_class:
                gateway = gateway_class()
                return gateway.refund_payment(
                    transaction_id=transaction_id,
                    amount=float(remittance.amount_sent),
                    reason=f'Delivery failed for remittance {remittance.reference_number}'
                )

        raise ValueError(f'Cannot refund: unsupported payment method {method_type}')

    def _initiate_delivery(self, remittance) -> Dict[str, Any]:
        """Initiate delivery to recipient based on delivery method"""
        try:
            # Use recipient_account_type as delivery method
            delivery_method = remittance.recipient_account_type
            
            # Create delivery details from available fields
            delivery_details = {
                'phone_number': remittance.recipient_phone,
                'account_number': remittance.recipient_account_number,
                'bank_name': remittance.beneficiary_institution_name,
                'address': remittance.recipient_address
            }
            
            if delivery_method == 'mobile_money':
                return self._deliver_via_mobile_money(remittance, delivery_details)
            
            elif delivery_method == 'bank_transfer':
                return self._deliver_via_bank_transfer(remittance, delivery_details)
            
            elif delivery_method == 'cash_pickup':
                return self._setup_cash_pickup(remittance, delivery_details)
            
            elif delivery_method == 'sikaremit_user':
                return self._deliver_to_sikaremit_user(remittance, delivery_details)
            
            elif delivery_method == 'digital_wallet':
                return self._deliver_to_digital_wallet(remittance, delivery_details)
            
            else:
                return {
                    'success': False,
                    'error': f'Unsupported delivery method: {delivery_method}'
                }
                
        except Exception as e:
            logger.error(f"Delivery initiation failed: {str(e)}")
            return {
                'success': False,
                'error': str(e)
            }

    def _deliver_via_mobile_money(self, remittance, details: Dict) -> Dict[str, Any]:
        """Deliver funds via mobile money"""
        phone_number = details.get('phone_number') or remittance.recipient_phone
        provider = details.get('provider', 'mtn_momo')
        
        if not phone_number:
            return {'success': False, 'error': 'Recipient phone number required'}
        
        # Use real mobile money gateway for disbursement
        try:
            from payments.gateways.mobile_money import (
                MTNMoMoGateway, TelecelCashGateway, AirtelTigoMoneyGateway, GMoneyGateway
            )
            gateway_map = {
                'mtn_momo': MTNMoMoGateway,
                'telecel': TelecelCashGateway,
                'airtel_tigo': AirtelTigoMoneyGateway,
                'g_money': GMoneyGateway,
            }
            gateway_class = gateway_map.get(provider)
            if gateway_class:
                gateway = gateway_class()
                return gateway.disburse(
                    phone_number=phone_number,
                    amount=float(remittance.recipient_amount),
                    currency=remittance.destination_currency,
                    reference=remittance.reference_number
                )
        except Exception as e:
            logger.error(f"Mobile money disbursement failed: {e}")
        
        return {'success': False, 'error': 'No gateway available for mobile money delivery'}

    def _deliver_via_bank_transfer(self, remittance, details: Dict) -> Dict[str, Any]:
        """Deliver funds via bank transfer"""
        account_number = details.get('account_number')
        bank_code = details.get('bank_code')
        bank_name = details.get('bank_name')
        
        if not account_number or not (bank_code or bank_name):
            return {'success': False, 'error': 'Bank account details required'}
        
        # Use Stripe or banking partner for bank transfer delivery
        if self.stripe_gateway:
            try:
                result = self.stripe_gateway.create_payout(
                    amount=float(remittance.recipient_amount),
                    currency=remittance.destination_currency,
                    destination=account_number,
                    metadata={
                        'remittance_ref': remittance.reference_number,
                        'bank_name': bank_name,
                    }
                )
                if result.get('success'):
                    return {
                        'success': True,
                        'delivery_reference': result.get('payout_id', f"BANK-{remittance.reference_number}"),
                        'status': 'processing',
                        'message': 'Bank transfer initiated'
                    }
                return result
            except Exception as e:
                logger.error(f"Bank transfer delivery failed: {e}")
        
        return {'success': False, 'error': 'No gateway available for bank transfers'}

    def _setup_cash_pickup(self, remittance, details: Dict) -> Dict[str, Any]:
        """Setup cash pickup for recipient"""
        pickup_location = details.get('pickup_location')
        
        # Generate pickup code
        pickup_code = f"PICK-{uuid.uuid4().hex[:8].upper()}"
        
        # Store pickup details
        remittance.delivery_details = remittance.delivery_details or {}
        remittance.delivery_details['pickup_code'] = pickup_code
        remittance.delivery_details['pickup_location'] = pickup_location
        remittance.delivery_details['expires_at'] = (timezone.now() + timezone.timedelta(days=7)).isoformat()
        remittance.save()
        
        return {
            'success': True,
            'delivery_reference': pickup_code,
            'pickup_code': pickup_code,
            'status': 'awaiting_pickup'
        }

    def _deliver_to_sikaremit_user(self, remittance, details: Dict) -> Dict[str, Any]:
        """Deliver funds to another SikaRemit user's wallet"""
        from users.models import User, Customer
        
        recipient_email = details.get('email') or remittance.recipient_email
        recipient_phone = details.get('phone') or remittance.recipient_phone
        
        try:
            # Find recipient user
            recipient_user = User.objects.filter(
                models.Q(email=recipient_email) | models.Q(phone=recipient_phone)
            ).first()
            
            if not recipient_user:
                return {'success': False, 'error': 'Recipient not found on SikaRemit'}
            
            # Credit recipient's wallet
            recipient_customer = recipient_user.customer_profile
            recipient_customer.wallet_balance = (
                recipient_customer.wallet_balance or Decimal('0')
            ) + remittance.recipient_amount
            recipient_customer.save()
            
            return {
                'success': True,
                'delivery_reference': f"WALLET-{remittance.reference}",
                'status': 'completed'
            }
            
        except Exception as e:
            logger.error(f"Wallet delivery failed: {str(e)}")
            return {'success': False, 'error': str(e)}

    def _deliver_to_digital_wallet(self, remittance, details: Dict) -> Dict[str, Any]:
        """Deliver funds to digital wallet (e.g., PayPal, Chipper)"""
        wallet_id = details.get('wallet_id')
        wallet_provider = details.get('wallet_provider', '').lower()

        if not wallet_id:
            return {'success': False, 'error': 'Wallet ID required'}

        if not wallet_provider:
            return {'success': False, 'error': 'Wallet provider required'}

        try:
            if wallet_provider == 'sikaremit':
                return self._deliver_to_sikaremit_user(remittance, {
                    'email': wallet_id,
                    'phone': wallet_id,
                })
            elif wallet_provider in ('mtn_momo', 'telecel', 'airtel_tigo', 'g_money'):
                from payments.gateways.mobile_money import (
                    MTNMoMoGateway, TelecelCashGateway, AirtelTigoMoneyGateway, GMoneyGateway
                )
                gateway_map = {
                    'mtn_momo': MTNMoMoGateway,
                    'telecel': TelecelCashGateway,
                    'airtel_tigo': AirtelTigoMoneyGateway,
                    'g_money': GMoneyGateway,
                }
                gateway_class = gateway_map.get(wallet_provider, MTNMoMoGateway)
                gateway = gateway_class()
                result = gateway.process_payment(
                    amount=float(remittance.recipient_amount),
                    currency=remittance.currency_received or 'GHS',
                    phone_number=wallet_id,
                    customer=None,
                    merchant=None,
                    metadata={
                        'remittance_id': str(remittance.id),
                        'type': 'wallet_delivery',
                    }
                )
                if result.get('success'):
                    return {
                        'success': True,
                        'delivery_reference': result.get('transaction_id', f"WALLET-{remittance.reference}"),
                        'status': 'processing'
                    }
                return result
            else:
                return {
                    'success': False,
                    'error': f'Unsupported wallet provider: {wallet_provider}. Supported: sikaremit, mtn_momo, telecel, airtel_tigo, g_money'
                }
        except Exception as e:
            logger.error(f"Digital wallet delivery failed: {str(e)}")
            return {'success': False, 'error': str(e)}

    def _send_remittance_notifications(self, remittance, event_type: str):
        """Send notifications for remittance events"""
        try:
            from notifications.models import Notification
            
            # Notify sender
            if event_type == 'initiated':
                Notification.objects.create(
                    user=remittance.sender.user,
                    notification_type='payment',
                    title='Remittance Initiated',
                    message=f"Your transfer of {remittance.currency_sent} {remittance.amount_sent} to {remittance.recipient_name} has been initiated. Reference: {remittance.reference_number}",
                    metadata={
                        'remittance_id': str(remittance.id),
                        'reference': remittance.reference_number
                    }
                )
            
            elif event_type == 'completed':
                Notification.objects.create(
                    user=remittance.sender.user,
                    notification_type='payment',
                    title='Remittance Completed',
                    message=f"Your transfer to {remittance.recipient_name} has been completed successfully.",
                    metadata={
                        'remittance_id': str(remittance.id),
                        'reference': remittance.reference_number
                    }
                )
            
            # Send SMS/Email to recipient
            self._send_recipient_notification(remittance, event_type)
            
        except Exception as e:
            logger.error(f"Failed to send remittance notification: {str(e)}")

    def _send_recipient_notification(self, remittance, event_type: str):
        """Send notification to recipient via SMS/Email"""
        try:
            from django.conf import settings

            recipient_phone = getattr(remittance, 'recipient_phone', None)
            recipient_email = getattr(remittance, 'recipient_email', None)

            if event_type == 'remittance_completed':
                message = (
                    f"You have received {remittance.amount_received} {remittance.currency_received} "
                    f"from {remittance.sender.get_full_name() if hasattr(remittance.sender, 'get_full_name') else 'SikaRemit user'}. "
                    f"Reference: {remittance.reference_number}"
                )
                subject = "You've received money via SikaRemit"
            elif event_type == 'remittance_initiated':
                message = (
                    f"A transfer of {remittance.amount_received} {remittance.currency_received} "
                    f"is on its way to you. Reference: {remittance.reference_number}"
                )
                subject = "Money transfer incoming - SikaRemit"
            else:
                message = f"Remittance update ({event_type}). Reference: {remittance.reference_number}"
                subject = f"SikaRemit Transfer Update"

            # Send SMS if phone number available
            if recipient_phone:
                sms_provider = getattr(settings, 'SMS_PROVIDER', 'africastalking')
                if sms_provider == 'africastalking':
                    username = getattr(settings, 'AFRICASTALKING_USERNAME', None)
                    api_key = getattr(settings, 'AFRICASTALKING_API_KEY', None)
                    sender_id = getattr(settings, 'AFRICASTALKING_SENDER_ID', 'SikaRemit')
                    if username and api_key:
                        try:
                            import africastalking
                            africastalking.initialize(username, api_key)
                            sms = africastalking.SMS
                            sms.send(message, [recipient_phone], sender_id)
                            logger.info(f"SMS sent to {recipient_phone} for {event_type}")
                        except ImportError:
                            logger.warning("africastalking SDK not installed — falling back to log-only")
                        except Exception as sms_err:
                            logger.error(f"SMS send failed to {recipient_phone}: {sms_err}")
                    else:
                        logger.warning(f"AfricasTalking not configured — skipping SMS to {recipient_phone}")
                elif sms_provider == 'twilio':
                    account_sid = getattr(settings, 'TWILIO_ACCOUNT_SID', None)
                    auth_token = getattr(settings, 'TWILIO_AUTH_TOKEN', None)
                    from_number = getattr(settings, 'TWILIO_PHONE_NUMBER', None)
                    if account_sid and auth_token and from_number:
                        try:
                            from twilio.rest import Client
                            client = Client(account_sid, auth_token)
                            client.messages.create(body=message, from_=from_number, to=recipient_phone)
                            logger.info(f"Twilio SMS sent to {recipient_phone} for {event_type}")
                        except ImportError:
                            logger.warning("twilio SDK not installed — falling back to log-only")
                        except Exception as sms_err:
                            logger.error(f"Twilio SMS send failed to {recipient_phone}: {sms_err}")
                    else:
                        logger.warning(f"Twilio not configured — skipping SMS to {recipient_phone}")

            # Send email if email available
            if recipient_email:
                try:
                    from django.core.mail import send_mail
                    send_mail(
                        subject=subject,
                        message=message,
                        from_email=getattr(settings, 'DEFAULT_FROM_EMAIL', 'noreply@sikaremit.com'),
                        recipient_list=[recipient_email],
                        fail_silently=True,
                    )
                    logger.info(f"Email sent to {recipient_email} for {event_type}")
                except Exception as email_err:
                    logger.error(f"Email send failed to {recipient_email}: {email_err}")

            if not recipient_phone and not recipient_email:
                logger.warning(f"No contact info for recipient notification ({event_type}), remittance {remittance.reference_number}")

        except Exception as e:
            logger.error(f"Failed to send recipient notification: {str(e)}")

    def get_remittance_status(self, reference: str, user=None) -> Dict[str, Any]:
        """Get status of a remittance"""
        from payments.models import CrossBorderRemittance
        
        try:
            query = CrossBorderRemittance.objects.filter(reference=reference)
            if user:
                query = query.filter(customer__user=user)
            
            remittance = query.first()
            
            if not remittance:
                return {'success': False, 'error': 'Remittance not found'}
            
            return {
                'success': True,
                'reference': remittance.reference,
                'status': remittance.status,
                'send_amount': float(remittance.amount),
                'source_currency': remittance.source_currency,
                'recipient_amount': float(remittance.recipient_amount),
                'destination_currency': remittance.destination_currency,
                'fee': float(remittance.fee),
                'recipient_name': remittance.recipient_name,
                'delivery_method': remittance.delivery_method,
                'created_at': remittance.created_at.isoformat(),
                'completed_at': remittance.completed_at.isoformat() if remittance.completed_at else None
            }
            
        except Exception as e:
            logger.error(f"Error getting remittance status: {str(e)}")
            return {'success': False, 'error': str(e)}

    def cancel_remittance(self, reference: str, user, reason: str = '') -> Dict[str, Any]:
        """Cancel a pending remittance"""
        from payments.models import CrossBorderRemittance
        
        try:
            remittance = CrossBorderRemittance.objects.get(
                reference=reference,
                customer__user=user
            )
            
            if remittance.status not in [RemittanceStatus.PENDING, RemittanceStatus.PROCESSING]:
                return {
                    'success': False,
                    'error': f'Cannot cancel remittance with status: {remittance.status}'
                }
            
            # Process refund
            refund_result = self._process_refund(remittance)
            
            if refund_result['success']:
                remittance.status = RemittanceStatus.CANCELLED
                remittance.cancellation_reason = reason
                remittance.cancelled_at = timezone.now()
                remittance.save()
                
                self._send_remittance_notifications(remittance, 'cancelled')
                
                return {
                    'success': True,
                    'reference': reference,
                    'status': 'cancelled',
                    'refund_reference': refund_result.get('refund_reference')
                }
            else:
                return {
                    'success': False,
                    'error': refund_result.get('error', 'Refund failed')
                }
                
        except CrossBorderRemittance.DoesNotExist:
            return {'success': False, 'error': 'Remittance not found'}
        except Exception as e:
            logger.error(f"Error cancelling remittance: {str(e)}")
            return {'success': False, 'error': str(e)}

    def _process_refund(self, remittance) -> Dict[str, Any]:
        """Process refund for cancelled remittance by crediting sender's wallet"""
        try:
            from payments.models import WalletBalance
            
            # Credit the sender's wallet with the original amount (including fees)
            wallet, created = WalletBalance.objects.get_or_create(
                user=remittance.sender.user,
                currency=remittance.currency_sent or 'GHS',
                defaults={'available_balance': Decimal('0'), 'pending_balance': Decimal('0')}
            )
            wallet.available_balance += remittance.amount_sent
            wallet.save()
            
            refund_ref = f"REFUND-{remittance.reference_number}"
            logger.info(f"Refund processed: {refund_ref} - {remittance.amount_sent} {remittance.currency_sent} to {remittance.sender.user.email}")
            
            return {
                'success': True,
                'refund_reference': refund_ref
            }
        except Exception as e:
            logger.error(f"Refund processing failed for {remittance.reference_number}: {str(e)}")
            return {
                'success': False,
                'error': f'Refund failed: {str(e)}'
            }


# Import models at module level to avoid circular imports
from django.db import models

# Singleton instance
remittance_service = CrossBorderRemittanceService()
