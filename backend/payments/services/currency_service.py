import requests
import logging
from decimal import Decimal, ROUND_DOWN, ROUND_UP
from django.conf import settings
from django.core.cache import cache
from django.utils import timezone
from django.db import transaction
from django.db.models import Q, Avg, Min, Max
from ..models import Currency, ExchangeRate, CurrencyPreference, WalletBalance
from typing import Optional, Dict, List, Tuple, Any
from datetime import timedelta, datetime
import time
import statistics

logger = logging.getLogger(__name__)

class CurrencyService:
    """
    Service for managing currencies, exchange rates, and conversions
    """

    CACHE_KEY_RATES = 'currency_rates'
    CACHE_TIMEOUT = 60 * 15  # 15 minutes

    @staticmethod
    def initialize_currencies():
        """
        Initialize default currencies in the system
        """
        currencies_data = [
            # Base currency - Ghana Cedi (BoG reference)
            {'code': 'GHS', 'name': 'Ghanaian Cedi', 'symbol': '₵', 'flag_emoji': '🇬🇭', 'is_base_currency': True},
            # Major international currencies (BoG rates available)
            {'code': 'USD', 'name': 'US Dollar', 'symbol': '$', 'flag_emoji': '🇺🇸'},
            {'code': 'EUR', 'name': 'Euro', 'symbol': '€', 'flag_emoji': '🇪🇺'},
            {'code': 'GBP', 'name': 'British Pound', 'symbol': '£', 'flag_emoji': '🇬🇧'},
            {'code': 'CHF', 'name': 'Swiss Franc', 'symbol': 'CHF', 'flag_emoji': '🇨🇭'},
            {'code': 'AUD', 'name': 'Australian Dollar', 'symbol': 'A$', 'flag_emoji': '🇦🇺'},
            {'code': 'CAD', 'name': 'Canadian Dollar', 'symbol': 'C$', 'flag_emoji': '🇨🇦'},
            {'code': 'JPY', 'name': 'Japanese Yen', 'symbol': '¥', 'flag_emoji': '🇯🇵', 'decimal_places': 0},
            {'code': 'NZD', 'name': 'New Zealand Dollar', 'symbol': 'NZ$', 'flag_emoji': '🇳🇿'},
            {'code': 'CNY', 'name': 'Chinese Yuan', 'symbol': '¥', 'flag_emoji': '🇨🇳'},
            {'code': 'ZAR', 'name': 'South African Rand', 'symbol': 'R', 'flag_emoji': '🇿🇦'},
            # Scandinavian currencies (BoG rates available)
            {'code': 'DKK', 'name': 'Danish Krone', 'symbol': 'kr', 'flag_emoji': '🇩🇰'},
            {'code': 'NOK', 'name': 'Norwegian Krone', 'symbol': 'kr', 'flag_emoji': '🇳🇴'},
            {'code': 'SEK', 'name': 'Swedish Krona', 'symbol': 'kr', 'flag_emoji': '🇸🇪'},
            # African currencies (BoG rates available)
            {'code': 'NGN', 'name': 'Nigerian Naira', 'symbol': '₦', 'flag_emoji': '🇳🇬'},
            {'code': 'XOF', 'name': 'West African CFA Franc', 'symbol': 'CFA', 'flag_emoji': '🌍'},
            {'code': 'GMD', 'name': 'Gambian Dalasi', 'symbol': 'D', 'flag_emoji': '🇬🇲'},
            {'code': 'MRU', 'name': 'Mauritanian Ouguiya', 'symbol': 'UM', 'flag_emoji': '🇲🇷'},
            {'code': 'SLL', 'name': 'Sierra Leonean Leone', 'symbol': 'Le', 'flag_emoji': '🇸🇱'},
            # East African currencies
            {'code': 'KES', 'name': 'Kenyan Shilling', 'symbol': 'KSh', 'flag_emoji': '🇰🇪'},
            {'code': 'UGX', 'name': 'Ugandan Shilling', 'symbol': 'USh', 'flag_emoji': '🇺🇬'},
            {'code': 'TZS', 'name': 'Tanzanian Shilling', 'symbol': 'TSh', 'flag_emoji': '🇹🇿'},
            {'code': 'RWF', 'name': 'Rwandan Franc', 'symbol': 'FRw', 'flag_emoji': '🇷🇼'},
            {'code': 'ETB', 'name': 'Ethiopian Birr', 'symbol': 'Br', 'flag_emoji': '🇪🇹'},
        ]

        for currency_data in currencies_data:
            Currency.objects.get_or_create(
                code=currency_data['code'],
                defaults=currency_data
            )

    @staticmethod
    def get_supported_currencies(active_only: bool = True) -> List[Currency]:
        """
        Get list of supported currencies
        """
        queryset = Currency.objects.all()
        if active_only:
            queryset = queryset.filter(is_active=True)
        return list(queryset.order_by('code'))

    @staticmethod
    def get_currency_by_code(code: str) -> Optional[Currency]:
        """
        Get currency by code
        """
        try:
            return Currency.objects.get(code=code.upper(), is_active=True)
        except Currency.DoesNotExist:
            return None

    @staticmethod
    def validate_currency_code(code: str) -> bool:
        """
        Validate if currency code exists and is active
        """
        return Currency.objects.filter(code=code.upper(), is_active=True).exists()

    @staticmethod
    def validate_amount(amount: Decimal, currency: Currency) -> bool:
        """
        Validate amount is within currency limits
        """
        if amount < currency.minimum_amount:
            return False
        if amount > currency.maximum_amount:
            return False
        return True

    @staticmethod
    def update_exchange_rates():
        """
        Update exchange rates from external API
        """
        try:
            # Get base currency (USD)
            base_currency = Currency.objects.get(is_base_currency=True)

            # Fetch rates from API with API key
            api_key = getattr(settings, 'EXCHANGE_RATE_API_KEY', None)
            api_url = getattr(settings, 'EXCHANGE_RATE_API_URL', 'https://v6.exchangerate-api.com/v6/')
            
            if not api_key:
                logger.warning("EXCHANGE_RATE_API_KEY not configured, skipping API update")
                return False
            
            full_url = f"{api_url}{api_key}/latest/{base_currency.code}"
            response = requests.get(full_url, timeout=30)
            response.raise_for_status()

            data = response.json()
            rates = data.get('conversion_rates', data.get('rates', {}))

            # Update rates in database
            with transaction.atomic():
                # Mark all existing rates as not latest
                ExchangeRate.objects.filter(is_latest=True).update(is_latest=False)

                # Create new rates
                for target_code, rate in rates.items():
                    try:
                        target_currency = Currency.objects.get(code=target_code, is_active=True)

                        # Skip if same currency
                        if target_currency == base_currency:
                            continue

                        ExchangeRate.objects.create(
                            from_currency=base_currency,
                            to_currency=target_currency,
                            rate=Decimal(str(rate)),
                            source='api',
                            metadata={'api_response': data}
                        )

                    except Currency.DoesNotExist:
                        continue

            # Update cache
            cache.set(CurrencyService.CACHE_KEY_RATES, rates, CurrencyService.CACHE_TIMEOUT)

            logger.info(f"Updated exchange rates for {len(rates)} currencies")
            return True

        except Exception as e:
            logger.error(f"Failed to update exchange rates: {str(e)}")
            return False

    @staticmethod
    def get_exchange_rate(from_currency: Currency, to_currency: Currency, use_cache: bool = True) -> Optional[Decimal]:
        """
        Get current exchange rate between two currencies from admin-set database rates
        """
        if from_currency == to_currency:
            return Decimal('1.0')

        # Try cache first
        if use_cache:
            cached_rates = cache.get(CurrencyService.CACHE_KEY_RATES)
            if cached_rates and from_currency.is_base_currency:
                rate = cached_rates.get(to_currency.code)
                if rate:
                    return Decimal(str(rate))

        # Try database - admin-set rates
        rate_obj = ExchangeRate.get_latest_rate(from_currency, to_currency)
        if rate_obj:
            return rate_obj.rate
        
        # Try inverse rate
        inverse_rate = ExchangeRate.get_latest_rate(to_currency, from_currency)
        if inverse_rate and inverse_rate.rate > 0:
            return Decimal('1') / inverse_rate.rate

        # No rate found - return None (caller should handle)
        return None

    @staticmethod
    def convert_amount(amount: Decimal, from_currency: Currency, to_currency: Currency) -> Optional[Decimal]:
        """
        Convert amount between currencies
        """
        rate = CurrencyService.get_exchange_rate(from_currency, to_currency)
        if rate:
            return (amount * rate).quantize(Decimal('0.01'), rounding=ROUND_DOWN)
        return None

    @staticmethod
    def format_amount(amount: Decimal, currency: Currency, user_preference: Optional[CurrencyPreference] = None) -> str:
        """
        Format amount according to currency and user preferences
        """
        # Use user preferences if available
        if user_preference:
            show_symbol = user_preference.show_symbol
            show_code = user_preference.show_code
            decimal_places = user_preference.decimal_places
        else:
            show_symbol = True
            show_code = False
            decimal_places = currency.decimal_places

        # Format the number
        formatted_amount = f"{amount:.{decimal_places}f}"

        # Add symbol and/or code
        parts = []
        if show_symbol and currency.symbol:
            parts.append(currency.symbol)
        parts.append(formatted_amount)
        if show_code:
            parts.append(currency.code)

        return ' '.join(parts).strip()

class WalletService:
    """
    Service for managing multi-currency wallet balances
    """

    @staticmethod
    def get_wallet_balance(user, currency: Currency) -> WalletBalance:
        """
        Get or create wallet balance for user and currency
        """
        balance, created = WalletBalance.objects.get_or_create(
            user=user,
            currency=currency,
            defaults={'available_balance': 0, 'pending_balance': 0, 'reserved_balance': 0}
        )
        return balance

    @staticmethod
    def get_all_wallet_balances(user) -> List[WalletBalance]:
        """
        Get all wallet balances for a user
        """
        return list(WalletBalance.objects.filter(user=user).select_related('currency'))

    @staticmethod
    def add_to_wallet(user, currency: Currency, amount: Decimal, balance_type: str = 'available') -> bool:
        """
        Add amount to user's wallet
        """
        try:
            with transaction.atomic():
                balance = WalletService.get_wallet_balance(user, currency)
                old_balance = balance.available_balance if balance_type == 'available' else balance.pending_balance
                
                balance.add_balance(amount, balance_type)
                
                # Create transaction record for wallet top-up
                from ..models.transaction import Transaction
                from ..models.payment_method import PaymentMethod
                
                # Create a wallet top-up transaction
                txn = Transaction.objects.create(
                    customer=user.customer_profile,
                    merchant=None,  # Wallet top-ups don't have a merchant
                    amount=amount,
                    currency=currency.code,
                    status=Transaction.COMPLETED,
                    payment_method=None,  # Wallet operations don't have a specific payment method
                    description=f"Wallet top-up: {amount} {currency.code}",
                    metadata={
                        'transaction_type': 'wallet_topup',
                        'balance_type': balance_type,
                        'old_balance': float(old_balance),
                        'new_balance': float(balance.available_balance if balance_type == 'available' else balance.pending_balance)
                    }
                )
                
                # Send notification for balance change
                WalletService._send_balance_notification(user, currency, amount, balance_type, 'credit')
                
            return True
        except Exception as e:
            logger.error(f"Failed to add to wallet: {str(e)}")
            return False

    @staticmethod
    def _send_balance_notification(user, currency: Currency, amount: Decimal, balance_type: str, transaction_type: str):
        """
        Send notification for balance changes with improved error handling
        """
        try:
            from accounts.models import Notification
            from accounts.api.notifications import NotificationService
            
            # Get current balance
            balance = WalletService.get_wallet_balance(user, currency)
            current_balance = balance.available_balance if balance_type == 'available' else balance.pending_balance
            
            # Create notification with correct type
            title = f"Wallet {transaction_type.title()}"
            message = f"Your {currency.code} wallet has been {'credited' if transaction_type == 'credit' else 'debited'} with {currency.symbol}{amount}. Current balance: {currency.symbol}{current_balance}"
            
            NotificationService.create_notification(
                user=user,
                title=title,
                message=message,
                level='payment',
                notification_type='WALLET_BALANCE',  # Updated to match model
                metadata={
                    'currency': currency.code,
                    'amount': float(amount),
                    'balance_type': balance_type,
                    'transaction_type': transaction_type,
                    'current_balance': float(current_balance)
                }
            )
            logger.info(f"Successfully created notification for {currency.code} wallet {transaction_type}")
            
        except Exception as e:
            logger.error(f"Failed to send balance notification: {str(e)}", exc_info=True)
            # Attempt one retry
            try:
                NotificationService.create_notification(
                    user=user,
                    title="Wallet Update",
                    message=f"Your {currency.code} wallet balance has changed",
                    level='payment',
                    notification_type='WALLET_BALANCE'
                )
            except Exception as retry_ex:
                logger.error(f"Retry also failed for balance notification: {str(retry_ex)}")

    @staticmethod
    def deduct_from_wallet(user, currency: Currency, amount: Decimal, balance_type: str = 'available') -> bool:
        """
        Deduct amount from user's wallet
        """
        try:
            with transaction.atomic():
                balance = WalletService.get_wallet_balance(user, currency)
                old_balance = balance.available_balance if balance_type == 'available' else balance.pending_balance
                
                success = balance.deduct_balance(amount, balance_type)
                if success:
                    # Create transaction record for wallet deduction
                    from ..models.transaction import Transaction
                    from ..models.payment_method import PaymentMethod
                    
                    txn = Transaction.objects.create(
                        customer=user.customer_profile,
                        merchant=None,  # Wallet deductions don't have a merchant
                        amount=amount,
                        currency=currency.code,
                        status=Transaction.COMPLETED,
                        payment_method=None,  # Wallet operations don't have a specific payment method
                        description=f"Wallet deduction: {amount} {currency.code}",
                        metadata={
                            'transaction_type': 'wallet_deduction',
                            'balance_type': balance_type,
                            'old_balance': float(old_balance),
                            'new_balance': float(balance.available_balance if balance_type == 'available' else balance.pending_balance)
                        }
                    )
                    
                    # Send notification for balance change
                    WalletService._send_balance_notification(user, currency, amount, balance_type, 'debit')
                    
                return success
        except Exception as e:
            logger.error(f"Failed to deduct from wallet: {str(e)}")
            return False

    @staticmethod
    def transfer_between_wallets(user, from_currency: Currency, to_currency: Currency, amount: Decimal) -> bool:
        """
        Transfer amount between user's wallets (with conversion)
        """
        try:
            with transaction.atomic():
                # Convert amount
                converted_amount = CurrencyService.convert_amount(amount, from_currency, to_currency)
                if not converted_amount:
                    return False

                # Deduct from source
                if not WalletService.deduct_from_wallet(user, from_currency, amount):
                    return False

                # Add to destination
                WalletService.add_to_wallet(user, to_currency, converted_amount)

            return True
        except Exception as e:
            logger.error(f"Failed wallet transfer: {str(e)}")
            return False

    @staticmethod
    def transfer_to_user(sender, recipient, currency: Currency, amount: Decimal, description: str = None) -> bool:
        """
        Transfer money from one user to another (P2P transfer / domestic transfer)
        """
        try:
            with transaction.atomic():
                # Calculate transfer fee using dynamic fee calculator
                from .fee_calculator import DynamicFeeCalculator
                fee_result = DynamicFeeCalculator.calculate_fee(
                    fee_type='domestic_transfer',
                    amount=amount,
                    currency=currency.code,
                    user=sender,
                    log_calculation=True,
                    transaction_id=f"P2P-{sender.id}-{recipient.id}"
                )
                
                fee_amount = Decimal(str(fee_result.get('total_fee', 0))) if fee_result.get('success') else Decimal('0')
                total_deduction = amount + fee_amount
                
                # Deduct from sender (amount + fee)
                if not WalletService.deduct_from_wallet(sender, currency, total_deduction):
                    return False

                # Add to recipient (only the amount, not the fee)
                WalletService.add_to_wallet(recipient, currency, amount)

                # Create transaction record for sender (debit)
                from ..models.transaction import Transaction
                from ..models.payment_method import PaymentMethod

                sender_txn = Transaction.objects.create(
                    customer=sender.customer_profile,
                    merchant=None,  # P2P transfers don't have a merchant
                    amount=amount,
                    currency=currency.code,
                    status=Transaction.COMPLETED,
                    payment_method=None,  # P2P transfers don't have a specific payment method
                    description=description or f"Transfer to {recipient.email}: {amount} {currency.code}",
                    metadata={
                        'transaction_type': 'p2p_send',
                        'recipient_id': recipient.id,
                        'recipient_email': recipient.email,
                        'sender_id': sender.id,
                        'transfer_type': 'p2p'
                    }
                )

                # Create transaction record for recipient (credit)
                recipient_txn = Transaction.objects.create(
                    customer=recipient.customer_profile,
                    merchant=None,  # P2P transfers don't have a merchant
                    amount=amount,
                    currency=currency.code,
                    status=Transaction.COMPLETED,
                    payment_method=None,  # P2P transfers don't have a specific payment method
                    description=description or f"Transfer from {sender.email}: {amount} {currency.code}",
                    metadata={
                        'transaction_type': 'p2p_receive',
                        'sender_id': sender.id,
                        'sender_email': sender.email,
                        'recipient_id': recipient.id,
                        'transfer_type': 'p2p'
                    }
                )

                # Send notifications
                WalletService._send_transfer_notification(sender, recipient, currency, amount, 'send')
                WalletService._send_transfer_notification(recipient, sender, currency, amount, 'receive')

            return True
        except Exception as e:
            logger.error(f"Failed P2P transfer: {str(e)}")
            return False

    @staticmethod
    def _send_transfer_notification(user, other_party, currency: Currency, amount: Decimal, transfer_type: str):
        """
        Send notification for P2P transfers
        """
        try:
            from notifications.models import Notification
            from notifications.services import NotificationService
            
            if transfer_type == 'send':
                title = "Money Sent"
                message = f"You sent {currency.symbol}{amount} to {other_party.email}"
                notification_type = 'p2p_send'
            else:  # receive
                title = "Money Received"
                message = f"You received {currency.symbol}{amount} from {other_party.email}"
                notification_type = 'p2p_receive'
            
            NotificationService.create_notification(
                user=user,
                title=title,
                message=message,
                level='payment',
                notification_type=notification_type,
                metadata={
                    'amount': float(amount),
                    'currency': currency.code,
                    'other_party_id': other_party.id,
                    'other_party_email': other_party.email,
                    'transfer_type': transfer_type
                }
            )
            
        except Exception as e:
            logger.error(f"Failed to send transfer notification: {str(e)}")

    @staticmethod
    def pay_bill(user, biller, amount: Decimal, currency: Currency, bill_type: str, bill_reference: str = None) -> bool:
        """
        Process bill payment (electricity, water, TV, internet, etc.)
        """
        try:
            with transaction.atomic():
                # Calculate bill payment fee using dynamic fee calculator
                from .fee_calculator import DynamicFeeCalculator
                fee_result = DynamicFeeCalculator.calculate_fee(
                    fee_type='bill_payment',
                    amount=amount,
                    currency=currency.code,
                    user=user,
                    log_calculation=True,
                    transaction_id=f"BILL-{user.id}-{bill_reference or 'NA'}"
                )
                
                fee_amount = Decimal(str(fee_result.get('total_fee', 0))) if fee_result.get('success') else Decimal('0')
                total_deduction = amount + fee_amount
                
                # Deduct from user's wallet (amount + fee)
                if not WalletService.deduct_from_wallet(user, currency, total_deduction):
                    return False

                # Create transaction record
                from ..models.transaction import Transaction

                txn = Transaction.objects.create(
                    customer=user.customer_profile,
                    merchant=biller,  # Bill payments have a merchant (biller)
                    amount=amount,
                    currency=currency.code,
                    status=Transaction.COMPLETED,
                    payment_method=None,  # Bill payments use wallet balance
                    description=f"{bill_type.title()} bill payment: {amount} {currency.code}",
                    metadata={
                        'transaction_type': 'bill_payment',
                        'bill_type': bill_type,
                        'bill_reference': bill_reference,
                        'biller_id': biller.id if biller else None,
                        'biller_name': biller.business_name if biller else None,
                        'fee_amount': float(fee_amount),
                        'fee_config_id': fee_result.get('fee_config_id')
                    }
                )

                # Send notification
                WalletService._send_bill_payment_notification(user, biller, currency, amount, bill_type, bill_reference)

            return True
        except Exception as e:
            logger.error(f"Failed bill payment: {str(e)}")
            return False

    @staticmethod
    def _send_bill_payment_notification(user, biller, currency: Currency, amount: Decimal, bill_type: str, bill_reference: str = None):
        """
        Send notification for bill payments
        """
        try:
            from notifications.models import Notification
            from notifications.services import NotificationService
            
            biller_name = biller.business_name if biller else bill_type.title()
            
            NotificationService.create_notification(
                user=user,
                title=f"{bill_type.title()} Bill Paid",
                message=f"Your {biller_name} bill payment of {currency.symbol}{amount} was successful",
                level='payment',
                notification_type='bill_payment',
                metadata={
                    'amount': float(amount),
                    'currency': currency.code,
                    'bill_type': bill_type,
                    'bill_reference': bill_reference,
                    'biller_id': biller.id if biller else None,
                    'biller_name': biller_name
                }
            )
            
        except Exception as e:
            logger.error(f"Failed to send bill payment notification: {str(e)}")

    @staticmethod
    def buy_airtime(user, recipient_phone: str, amount: Decimal, currency: Currency, provider: str) -> bool:
        """
        Purchase airtime/data for self or others
        """
        try:
            with transaction.atomic():
                # Calculate airtime fee using dynamic fee calculator
                from .fee_calculator import DynamicFeeCalculator
                fee_result = DynamicFeeCalculator.calculate_fee(
                    fee_type='airtime',
                    amount=amount,
                    currency=currency.code,
                    user=user,
                    log_calculation=True,
                    transaction_id=f"AIRTIME-{user.id}-{recipient_phone}"
                )
                
                fee_amount = Decimal(str(fee_result.get('total_fee', 0))) if fee_result.get('success') else Decimal('0')
                total_deduction = amount + fee_amount
                
                # Deduct from user's wallet (amount + fee)
                if not WalletService.deduct_from_wallet(user, currency, total_deduction):
                    return False

                # Create transaction record
                from ..models.transaction import Transaction

                txn = Transaction.objects.create(
                    customer=user.customer_profile,
                    merchant=None,  # Airtime purchases don't have a traditional merchant
                    amount=amount,
                    currency=currency.code,
                    status=Transaction.COMPLETED,
                    payment_method=None,  # Airtime purchases use wallet balance
                    description=f"Airtime purchase for {recipient_phone}: {amount} {currency.code}",
                    metadata={
                        'transaction_type': 'airtime_purchase',
                        'recipient_phone': recipient_phone,
                        'provider': provider,
                        'service_type': 'airtime',
                        'fee_amount': float(fee_amount),
                        'fee_config_id': fee_result.get('fee_config_id')
                    }
                )

                # Send notification
                WalletService._send_airtime_notification(user, recipient_phone, currency, amount, provider)

            return True
        except Exception as e:
            logger.error(f"Failed airtime purchase: {str(e)}")
            return False

    @staticmethod
    def _send_airtime_notification(user, recipient_phone: str, currency: Currency, amount: Decimal, provider: str):
        """
        Send notification for airtime purchases
        """
        try:
            from notifications.models import Notification
            from notifications.services import NotificationService
            
            NotificationService.create_notification(
                user=user,
                title="Airtime Purchase",
                message=f"Airtime purchase of {currency.symbol}{amount} for {recipient_phone} ({provider}) was successful",
                level='payment',
                notification_type='airtime_purchase',
                metadata={
                    'amount': float(amount),
                    'currency': currency.code,
                    'recipient_phone': recipient_phone,
                    'provider': provider,
                    'service_type': 'airtime'
                }
            )
            
        except Exception as e:
            logger.error(f"Failed to send airtime notification: {str(e)}")
            # Don't fail the transaction if notification fails

class AdvancedCurrencyService:
    """
    Advanced currency conversion service with multiple providers and arbitrage detection
    """

    # Multiple rate providers for comparison
    PROVIDERS = {
        'exchangerate_api': {
            'url': getattr(settings, 'EXCHANGERATE_API_V6_URL', 'https://v6.exchangerate-api.com/v6/{}/latest/{}'),
            'key_required': True
        },
        'currencyapi': {
            'url': getattr(settings, 'CURRENCYAPI_URL', 'https://api.currencyapi.com/v3/latest?apikey={}&base_currency={}'),
            'key_required': True
        },
        'openexchangerates': {
            'url': getattr(settings, 'OPENEXCHANGERATES_API_URL', 'https://openexchangerates.org/api/latest.json?app_id={}&base={}'),
            'key_required': True
        },
        'fallback': {
            'url': getattr(settings, 'EXCHANGERATE_HOST_URL', 'https://api.exchangerate.host/latest?base={}'),
            'key_required': False
        }
    }

    @staticmethod
    def get_multi_provider_rates(base_currency: str, target_currencies: List[str] = None) -> Dict[str, Any]:
        """
        Get exchange rates from multiple providers for comparison
        """
        results = {}
        providers_used = []

        for provider_name, provider_config in AdvancedCurrencyService.PROVIDERS.items():
            try:
                rates = AdvancedCurrencyService._fetch_provider_rates(
                    provider_name, provider_config, base_currency, target_currencies
                )
                if rates:
                    results[provider_name] = rates
                    providers_used.append(provider_name)
            except Exception as e:
                logger.warning(f"Failed to fetch rates from {provider_name}: {str(e)}")

        # Calculate arbitrage opportunities
        arbitrage_opportunities = AdvancedCurrencyService._detect_arbitrage(results)

        return {
            'timestamp': timezone.now().isoformat(),
            'base_currency': base_currency,
            'providers': results,
            'providers_used': providers_used,
            'arbitrage_opportunities': arbitrage_opportunities,
            'recommended_rate': AdvancedCurrencyService._get_recommended_rate(results)
        }

    @staticmethod
    def _fetch_provider_rates(provider_name: str, config: Dict, base_currency: str, target_currencies: List[str] = None) -> Optional[Dict]:
        """
        Fetch rates from a specific provider
        """
        cache_key = f"currency_rates_{provider_name}_{base_currency}"
        cached_result = cache.get(cache_key)

        if cached_result:
            return cached_result

        try:
            if config['key_required']:
                api_key = getattr(settings, f'{provider_name.upper()}_API_KEY', None)
                if not api_key:
                    logger.warning(f"API key not configured for {provider_name}")
                    return None
            else:
                api_key = None

            url = config['url']
            if api_key:
                if '{}' in url:
                    url = url.format(api_key, base_currency)
                else:
                    url = url.replace('{}', api_key if api_key else '')
            else:
                url = url.format(base_currency)

            response = requests.get(url, timeout=10)
            response.raise_for_status()

            data = response.json()
            rates = {}

            if provider_name == 'exchangerate_api':
                rates = data.get('conversion_rates', {})
            elif provider_name == 'currencyapi':
                rates = {k: v for k, v in data.get('data', {}).items()}
            elif provider_name == 'openexchangerates':
                rates = data.get('rates', {})
            elif provider_name == 'fallback':
                rates = data.get('rates', {})

            # Filter to target currencies if specified
            if target_currencies:
                rates = {k: v for k, v in rates.items() if k in target_currencies}

            # Cache the result
            cache.set(cache_key, rates, CurrencyService.CACHE_TIMEOUT)

            return rates

        except Exception as e:
            logger.error(f"Error fetching rates from {provider_name}: {str(e)}")
            return None

    @staticmethod
    def _detect_arbitrage(provider_rates: Dict[str, Dict]) -> List[Dict]:
        """
        Detect arbitrage opportunities across providers
        """
        opportunities = []

        if len(provider_rates) < 2:
            return opportunities

        # Get all currencies present in at least 2 providers
        all_currencies = set()
        for rates in provider_rates.values():
            all_currencies.update(rates.keys())

        for currency in all_currencies:
            rates_for_currency = []
            providers_for_currency = []

            for provider, rates in provider_rates.items():
                if currency in rates:
                    rates_for_currency.append(rates[currency])
                    providers_for_currency.append(provider)

            if len(rates_for_currency) >= 2:
                max_rate = max(rates_for_currency)
                min_rate = min(rates_for_currency)
                spread_percentage = ((max_rate - min_rate) / min_rate) * 100

                # Arbitrage opportunity if spread > 1%
                if spread_percentage > 1.0:
                    opportunities.append({
                        'currency': currency,
                        'max_rate': max_rate,
                        'min_rate': min_rate,
                        'spread_percentage': spread_percentage,
                        'best_provider': providers_for_currency[rates_for_currency.index(max_rate)],
                        'worst_provider': providers_for_currency[rates_for_currency.index(min_rate)]
                    })

        return opportunities

    @staticmethod
    def _get_recommended_rate(provider_rates: Dict[str, Dict]) -> Optional[Dict]:
        """
        Get the most reliable rate using statistical analysis
        """
        if not provider_rates:
            return None

        # Get all currencies
        all_currencies = set()
        for rates in provider_rates.values():
            all_currencies.update(rates.keys())

        recommended_rates = {}

        for currency in all_currencies:
            rates = []
            for provider_rates_data in provider_rates.values():
                if currency in provider_rates_data:
                    rates.append(provider_rates_data[currency])

            if len(rates) >= 2:
                # Use median to avoid outliers
                median_rate = statistics.median(rates)
                mean_rate = statistics.mean(rates)
                std_dev = statistics.stdev(rates) if len(rates) > 1 else 0

                recommended_rates[currency] = {
                    'rate': median_rate,
                    'confidence': max(0, 100 - (std_dev / mean_rate * 100)) if mean_rate > 0 else 0,
                    'providers_count': len(rates),
                    'spread': (max(rates) - min(rates)) / min(rates) * 100 if min(rates) > 0 else 0
                }

        return recommended_rates

    @staticmethod
    def convert_with_arbitrage_check(amount: Decimal, from_currency: str, to_currency: str) -> Dict[str, Any]:
        """
        Convert currency with arbitrage opportunity detection
        """
        try:
            # Get rates from multiple providers
            multi_provider_data = AdvancedCurrencyService.get_multi_provider_rates(
                from_currency, [to_currency]
            )

            if not multi_provider_data['recommended_rate']:
                # Fallback to standard conversion
                rate = CurrencyService.get_exchange_rate(from_currency, to_currency)
                converted_amount = amount * rate
                return {
                    'original_amount': float(amount),
                    'converted_amount': float(converted_amount),
                    'exchange_rate': float(rate),
                    'from_currency': from_currency,
                    'to_currency': to_currency,
                    'arbitrage_available': False
                }

            recommended_rate = multi_provider_data['recommended_rate'][to_currency]
            converted_amount = amount * Decimal(str(recommended_rate['rate']))

            arbitrage_opportunities = [
                opp for opp in multi_provider_data['arbitrage_opportunities']
                if opp['currency'] == to_currency
            ]

            return {
                'original_amount': float(amount),
                'converted_amount': float(converted_amount),
                'exchange_rate': recommended_rate['rate'],
                'from_currency': from_currency,
                'to_currency': to_currency,
                'confidence': recommended_rate['confidence'],
                'arbitrage_available': len(arbitrage_opportunities) > 0,
                'arbitrage_details': arbitrage_opportunities[0] if arbitrage_opportunities else None,
                'providers_used': multi_provider_data['providers_used']
            }

        except Exception as e:
            logger.error(f"Advanced currency conversion failed: {str(e)}")
            # Fallback to standard conversion
            rate = CurrencyService.get_exchange_rate(from_currency, to_currency)
            converted_amount = amount * rate
            return {
                'original_amount': float(amount),
                'converted_amount': float(converted_amount),
                'exchange_rate': float(rate),
                'from_currency': from_currency,
                'to_currency': to_currency,
                'arbitrage_available': False,
                'fallback_used': True
            }

    @staticmethod
    def get_historical_rates(from_currency: str, to_currency: str, days: int = 30) -> List[Dict[str, Any]]:
        """
        Get historical exchange rates for charting
        """
        try:
            api_key = getattr(settings, 'EXCHANGE_RATE_API_KEY', None)
            api_url = getattr(settings, 'EXCHANGE_RATE_API_URL', 'https://v6.exchangerate-api.com/v6/')
            
            if not api_key:
                logger.warning("EXCHANGE_RATE_API_KEY not configured, cannot fetch historical rates")
                return []

            # Get base currency
            base_currency = Currency.objects.get(code=from_currency.upper())
            target_currency = Currency.objects.get(code=to_currency.upper())

            historical_data = []
            end_date = timezone.now()

            # Fetch rates for the last 'days' days
            for i in range(days):
                date = end_date - timedelta(days=i)
                date_str = date.strftime('%Y-%m-%d')

                # Check cache first
                cache_key = f"historical_rate_{from_currency}_{to_currency}_{date_str}"
                cached_rate = cache.get(cache_key)
                if cached_rate:
                    historical_data.append({
                        'date': date_str,
                        'rate': cached_rate
                    })
                    continue

                try:
                    # Fetch historical rate
                    full_url = f"{api_url}{api_key}/history/{base_currency.code}/{date_str}"
                    response = requests.get(full_url, timeout=10)
                    response.raise_for_status()

                    data = response.json()
                    rates = data.get('conversion_rates', {})

                    if to_currency in rates:
                        rate = rates[to_currency]
                        historical_data.append({
                            'date': date_str,
                            'rate': rate
                        })
                        # Cache for 24 hours
                        cache.set(cache_key, rate, 86400)

                except Exception as e:
                    logger.warning(f"Failed to fetch historical rate for {date_str}: {str(e)}")
                    continue

            # Sort by date
            historical_data.sort(key=lambda x: x['date'])
            return historical_data

        except Exception as e:
            logger.error(f"Failed to get historical rates: {str(e)}")
            return []

    @staticmethod
    def get_currency_volatility(currency_code: str, days: int = 30) -> Dict[str, Any]:
        """
        Calculate currency volatility metrics
        """
        try:
            end_date = timezone.now()
            start_date = end_date - timedelta(days=days)

            # Get historical rates
            historical_rates = ExchangeRate.objects.filter(
                from_currency__code=currency_code,
                created_at__gte=start_date
            ).order_by('created_at').values_list('rate', flat=True)

            if len(historical_rates) < 2:
                return {'volatility': 0, 'available': False}

            rates = list(historical_rates)

            # Calculate daily returns
            returns = []
            for i in range(1, len(rates)):
                if rates[i-1] > 0:
                    daily_return = (rates[i] - rates[i-1]) / rates[i-1]
                    returns.append(daily_return)

            if not returns:
                return {'volatility': 0, 'available': False}

            # Calculate volatility (standard deviation of returns)
            volatility = statistics.stdev(returns) if len(returns) > 1 else 0

            # Calculate annualized volatility
            annualized_volatility = volatility * (365 ** 0.5)

            return {
                'volatility': volatility,
                'annualized_volatility': annualized_volatility,
                'avg_daily_return': statistics.mean(returns),
                'max_daily_return': max(returns),
                'min_daily_return': min(returns),
                'period_days': days,
                'data_points': len(returns),
                'available': True
            }

        except Exception as e:
            logger.error(f"Currency volatility calculation failed: {str(e)}")
            return {'volatility': 0, 'available': False}

class CurrencyPreferenceService:
    """
    Service for managing user currency preferences
    """

    @staticmethod
    def get_user_preferences(user) -> CurrencyPreference:
        """
        Get or create user currency preferences
        """
        preference, created = CurrencyPreference.objects.get_or_create(
            user=user,
            defaults={
                'base_currency': Currency.objects.get(code='USD'),
                'display_currency': Currency.objects.get(code='USD'),
            }
        )
        return preference

    @staticmethod
    def update_user_preferences(user, **kwargs) -> CurrencyPreference:
        """
        Update user currency preferences
        """
        preference = CurrencyPreferenceService.get_user_preferences(user)

        valid_fields = ['base_currency', 'display_currency', 'show_symbol', 'show_code', 'decimal_places', 'auto_update_rates', 'notification_threshold']

        for field, value in kwargs.items():
            if field in valid_fields:
                if field in ['base_currency', 'display_currency']:
                    # Handle currency objects or codes
                    if isinstance(value, str):
                        value = Currency.objects.get(code=value.upper())
                setattr(preference, field, value)

        preference.save()
        return preference
