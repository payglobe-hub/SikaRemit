from rest_framework import viewsets, status
from rest_framework.decorators import action, api_view, permission_classes, authentication_classes
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response
from django.db import transaction as db_transaction
from decimal import Decimal
from ..models import Currency, WalletBalance, CurrencyPreference, Transaction
from ..services.currency_service import WalletService, CurrencyService, CurrencyPreferenceService
from ..serializers import WalletBalanceSerializer, CurrencySerializer, CurrencyPreferenceSerializer
from django.utils import timezone
import logging
import uuid
from ..exceptions import (
    InvalidAmountException, InsufficientFundsException, PaymentGatewayException,
    InvalidPaymentMethodException, TransactionLimitExceededException
)

logger = logging.getLogger(__name__)

class WalletViewSet(viewsets.ViewSet):
    """
    API for managing multi-currency wallets
    """
    permission_classes = [IsAuthenticated]

    def list(self, request):
        """Get user's primary wallet balance"""
        try:
            # Get user's wallet balances
            balances = WalletService.get_all_wallet_balances(request.user)
            if balances:
                # Return the first currency balance (or USD if available)
                usd_balance = next((b for b in balances if b.currency and b.currency.code == 'USD'), None)
                if usd_balance:
                    primary_balance = usd_balance
                else:
                    primary_balance = balances[0]
                
                balance = {
                    'available': float(primary_balance.available_balance),
                    'pending': float(primary_balance.pending_balance),
                    'currency': primary_balance.currency.code if primary_balance.currency else 'USD',
                    'lastUpdated': primary_balance.last_updated.isoformat() if primary_balance.last_updated else timezone.now().isoformat()
                }
            else:
                # No balances yet, return zero balance
                balance = {
                    'available': 0.00,
                    'pending': 0.00,
                    'currency': 'USD',
                    'lastUpdated': timezone.now().isoformat()
                }
            return Response(balance)
        except Exception as e:
            logger.error(f"Error in wallet list view: {str(e)}", exc_info=True)
            import traceback
            traceback.print_exc()
            return Response(
                {'error': str(e)},
                status=status.HTTP_500_INTERNAL_SERVER_ERROR
            )

    @action(detail=False, methods=['get'])
    def balances(self, request):
        """Get all wallet balances for the user"""
        try:
            balances = WalletService.get_all_wallet_balances(request.user)
            serializer = WalletBalanceSerializer(balances, many=True)
            return Response(serializer.data)
        except Exception as e:
            return Response(
                {'error': str(e)},
                status=status.HTTP_500_INTERNAL_SERVER_ERROR
            )

    @action(detail=False, methods=['post'])
    def add_funds(self, request):
        """Add funds to wallet"""
        try:
            currency_code = request.data.get('currency')
            amount = Decimal(str(request.data.get('amount', 0)))

            if not currency_code or amount <= 0:
                return Response(
                    {'error': 'Valid currency and positive amount required'},
                    status=status.HTTP_400_BAD_REQUEST
                )

            currency = CurrencyService.get_currency_by_code(currency_code)
            if not currency:
                return Response(
                    {'error': 'Invalid currency'},
                    status=status.HTTP_400_BAD_REQUEST
                )

            success = WalletService.add_to_wallet(
                request.user,
                currency,
                amount,
                request.data.get('balance_type', 'available')
            )

            if success:
                return Response({'message': 'Funds added successfully'})
            else:
                return Response(
                    {'error': 'Failed to add funds'},
                    status=status.HTTP_500_INTERNAL_SERVER_ERROR
                )

        except Exception as e:
            return Response(
                {'error': str(e)},
                status=status.HTTP_400_BAD_REQUEST
            )

    @action(detail=False, methods=['post'])
    def transfer(self, request):
        """Transfer between wallet currencies"""
        try:
            from_currency_code = request.data.get('from_currency')
            to_currency_code = request.data.get('to_currency')
            amount = Decimal(str(request.data.get('amount', 0)))

            if not all([from_currency_code, to_currency_code, amount > 0]):
                return Response(
                    {'error': 'All fields required and amount must be positive'},
                    status=status.HTTP_400_BAD_REQUEST
                )

            from_currency = CurrencyService.get_currency_by_code(from_currency_code)
            to_currency = CurrencyService.get_currency_by_code(to_currency_code)

            if not from_currency or not to_currency:
                return Response(
                    {'error': 'Invalid currency codes'},
                    status=status.HTTP_400_BAD_REQUEST
                )

            success = WalletService.transfer_between_wallets(
                request.user,
                from_currency,
                to_currency,
                amount
            )

            if success:
                return Response({'message': 'Transfer completed successfully'})
            else:
                return Response(
                    {'error': 'Transfer failed - insufficient funds'},
                    status=status.HTTP_400_BAD_REQUEST
                )

        except Exception as e:
            return Response(
                {'error': str(e)},
                status=status.HTTP_400_BAD_REQUEST
            )

    @action(detail=False, methods=['get'])
    def total_balance(self, request):
        """Get total balance in user's preferred currency"""
        try:
            target_currency_code = request.query_params.get('currency')
            target_currency = None

            if target_currency_code:
                target_currency = CurrencyService.get_currency_by_code(target_currency_code)
                if not target_currency:
                    return Response(
                        {'error': 'Invalid target currency'},
                        status=status.HTTP_400_BAD_REQUEST
                    )
            else:
                # Use user's preferred display currency
                preferences = CurrencyPreferenceService.get_user_preferences(request.user)
                target_currency = preferences.display_currency

            preferences = CurrencyPreferenceService.get_user_preferences(request.user)
            total = WalletService.get_total_balance_in_currency(request.user, target_currency, preferences)

            return Response({
                'total_balance': float(total),
                'currency': target_currency.code,
                'formatted': CurrencyService.format_amount(total, target_currency, preferences)
            })

        except Exception as e:
            return Response(
                {'error': str(e)},
                status=status.HTTP_500_INTERNAL_SERVER_ERROR
            )

class CurrencyViewSet(viewsets.ReadOnlyModelViewSet):
    """
    API for currency information
    """
    queryset = Currency.objects.filter(is_active=True)
    serializer_class = CurrencySerializer
    # Remove authentication requirement - currencies should be publicly accessible
    permission_classes = []

    @action(detail=False, methods=['get'])
    def supported(self, request):
        """Get all supported currencies"""
        currencies = CurrencyService.get_supported_currencies()
        serializer = CurrencySerializer(currencies, many=True)
        return Response(serializer.data)

    @action(detail=True, methods=['get'])
    def rates(self, request, pk=None):
        """Get exchange rates for a currency"""
        currency = self.get_object()

        # Get base currency
        base_currency = Currency.objects.filter(is_base_currency=True).first()
        if not base_currency:
            return Response(
                {'error': 'No base currency configured'},
                status=status.HTTP_500_INTERNAL_SERVER_ERROR
            )

        # Get rate
        rate = CurrencyService.get_exchange_rate(base_currency, currency)
        if rate:
            return Response({
                'from_currency': base_currency.code,
                'to_currency': currency.code,
                'rate': float(rate),
                'inverse_rate': float(1 / rate) if rate != 0 else 0
            })
        else:
            return Response(
                {'error': 'Rate not available'},
                status=status.HTTP_404_NOT_FOUND
            )

class CurrencyPreferenceViewSet(viewsets.ViewSet):
    """
    API for managing currency preferences
    """
    permission_classes = [IsAuthenticated]

    @action(detail=False, methods=['get'])
    def preferences(self, request):
        """Get user currency preferences"""
        preferences = CurrencyPreferenceService.get_user_preferences(request.user)
        serializer = CurrencyPreferenceSerializer(preferences)
        return Response(serializer.data)

    @action(detail=False, methods=['patch'])
    def update_preferences(self, request):
        """Update user currency preferences"""
        try:
            preferences = CurrencyPreferenceService.update_user_preferences(request.user, **request.data)
            serializer = CurrencyPreferenceSerializer(preferences)
            return Response(serializer.data)
        except Exception as e:
            return Response(
                {'error': str(e)},
                status=status.HTTP_400_BAD_REQUEST
            )

@api_view(['GET'])
@authentication_classes([])
@permission_classes([])
def exchange_rates(request):
    """
    Get current exchange rates
    """
    try:
        base_currency_code = request.query_params.get('base', 'USD')
        target_currency_code = request.query_params.get('target')

        # Handle empty database case
        if Currency.objects.count() == 0:
            return Response({
                'base': base_currency_code,
                'rates': {},
                'message': 'Currency data not available. Please contact administrator.'
            })

        base_currency = CurrencyService.get_currency_by_code(base_currency_code)
        if not base_currency:
            return Response(
                {'error': 'Invalid base currency'},
                status=status.HTTP_400_BAD_REQUEST
            )

        if target_currency_code:
            # Single rate
            target_currency = CurrencyService.get_currency_by_code(target_currency_code)
            if not target_currency:
                return Response(
                    {'error': 'Invalid target currency'},
                    status=status.HTTP_400_BAD_REQUEST
                )

            rate = CurrencyService.get_exchange_rate(base_currency, target_currency)
            if rate:
                return Response({
                    'base': base_currency_code,
                    'target': target_currency_code,
                    'rate': float(rate)
                })
            else:
                return Response(
                    {'error': 'Rate not available'},
                    status=status.HTTP_404_NOT_FOUND
                )
        else:
            # All rates
            currencies = Currency.objects.filter(is_active=True, exchange_api_supported=True)
            rates = {}

            for currency in currencies:
                if currency.code != base_currency_code:
                    rate = CurrencyService.get_exchange_rate(base_currency, currency)
                    if rate:
                        rates[currency.code] = float(rate)

            return Response({
                'base': base_currency_code,
                'rates': rates
            })

    except Exception as e:
        return Response(
            {'error': str(e)},
            status=status.HTTP_500_INTERNAL_SERVER_ERROR
        )

@api_view(['POST'])
@authentication_classes([])
@permission_classes([])
def convert_currency(request):
    """
    Convert currency amount (public endpoint for testing)
    """
    try:
        amount = request.data.get('amount')
        from_currency_code = request.data.get('from_currency')
        to_currency_code = request.data.get('to_currency')

        if not all([amount, from_currency_code, to_currency_code]):
            return Response(
                {'error': 'amount, from_currency, and to_currency are required'},
                status=status.HTTP_400_BAD_REQUEST
            )

        try:
            amount = Decimal(str(amount))
        except:
            return Response(
                {'error': 'Invalid amount format'},
                status=status.HTTP_400_BAD_REQUEST
            )

        from_currency = CurrencyService.get_currency_by_code(from_currency_code)
        to_currency = CurrencyService.get_currency_by_code(to_currency_code)

        if not from_currency or not to_currency:
            return Response(
                {'error': 'Invalid currency codes'},
                status=status.HTTP_400_BAD_REQUEST
            )

        converted_amount = CurrencyService.convert_amount(amount, from_currency, to_currency)
        if converted_amount:
            rate = CurrencyService.get_exchange_rate(from_currency, to_currency)
            return Response({
                'original_amount': float(amount),
                'from_currency': from_currency_code,
                'converted_amount': float(converted_amount),
                'to_currency': to_currency_code,
                'exchange_rate': float(rate) if rate else None
            })
        else:
            return Response(
                {'error': 'Conversion failed - rate not available'},
                status=status.HTTP_400_BAD_REQUEST
            )

    except Exception as e:
        return Response(
            {'error': str(e)},
            status=status.HTTP_500_INTERNAL_SERVER_ERROR
        )

@api_view(['GET'])
@permission_classes([])
def currencies_list_view(request):
    """
    List all active currencies (public endpoint)
    """
    try:
        currencies = Currency.objects.filter(is_active=True)
        serializer = CurrencySerializer(currencies, many=True)
        return Response(serializer.data)
    except Exception as e:
        return Response(
            {'error': str(e)},
            status=status.HTTP_500_INTERNAL_SERVER_ERROR
        )

# ============== DEPOSIT ENDPOINTS ==============

@api_view(['POST'])
@permission_classes([IsAuthenticated])
def deposit_mobile_money(request):
    """
    Deposit funds via Mobile Money
    
    Request body:
    {
        "amount": 100.00,
        "provider": "MTN",  # MTN, Telecel, AirtelTigo
        "phone_number": "0241234567",
        "currency": "GHS"
    }
    """
    try:
        amount = request.data.get('amount')
        provider = request.data.get('provider')
        phone_number = request.data.get('phone_number')
        currency_code = request.data.get('currency', 'GHS')
        
        # Validate required fields
        if not all([amount, provider, phone_number]):
            raise InvalidAmountException("amount, provider, and phone_number are required")
        
        try:
            amount = Decimal(str(amount))
            if amount <= 0:
                raise InvalidAmountException("Amount must be positive")
        except (ValueError, TypeError):
            raise InvalidAmountException("Invalid amount format")
        
        # Minimum deposit amount
        if amount < Decimal('1.00'):
            raise TransactionLimitExceededException("Minimum deposit amount is 1.00")
        
        # Create deposit transaction
        with db_transaction.atomic():
            tx = Transaction.objects.create(
                user=request.user,
                transaction_type='deposit',
                amount=amount,
                currency_code=currency_code,
                status='pending',
                reference=f"DEP-MM-{uuid.uuid4().hex[:12].upper()}",
                description=f"Mobile Money Deposit - {provider}",
                metadata={
                    'deposit_method': 'mobile_money',
                    'provider': provider,
                    'phone_number': phone_number,
                    'currency': currency_code
                }
            )
            
            # REAL MOBILE MONEY INTEGRATION
            # Initiate payment request to user's phone via provider API
            try:
                from ..gateways.mobile_money import MTNMoMoGateway, TelecelCashGateway, AirtelTigoMoneyGateway, GMoneyGateway
                
                # Select appropriate gateway based on provider
                if provider.upper() == 'MTN':
                    gateway = MTNMoMoGateway()
                elif provider.upper() == 'TELECEL':
                    gateway = TelecelCashGateway()
                elif provider.upper() in ['AIRTELTIGO', 'AIRTEL_TIGO']:
                    gateway = AirtelTigoMoneyGateway()
                elif provider.upper() in ['G_MONEY', 'G-MONEY']:
                    gateway = GMoneyGateway()
                else:
                    raise ValueError(f"Unsupported mobile money provider: {provider}")
                
                # Check if gateway is properly configured
                if not gateway.is_configured():
                    tx.status = 'failed'
                    tx.failure_reason = f"{provider} gateway not configured"
                    tx.save()
                    return Response({
                        'error': f'{provider} payment service is temporarily unavailable. Please try again later.'
                    }, status=status.HTTP_503_SERVICE_UNAVAILABLE)
                
                # Process mobile money payment request
                payment_result = gateway.process_payment(
                    amount=float(amount),
                    currency=currency_code,
                    phone_number=phone_number,
                    customer=request.user.customer_profile,
                    merchant=None,  # Self-deposit
                    metadata={
                        'transaction_reference': tx.reference,
                        'deposit_type': 'mobile_money',
                        'user_id': request.user.id
                    }
                )
                
                if payment_result.get('success'):
                    tx.status = 'pending'
                    tx.metadata.update({
                        'provider_reference': payment_result.get('transaction_id'),
                        'provider': provider,
                        'payment_request_sent': True,
                        'instructions': payment_result.get('instructions', f'Please enter your {provider} PIN to confirm')
                    })
                    tx.save()
                    
                    return Response({
                        'success': True,
                        'message': f'Deposit request initiated successfully via {provider}.',
                        'transaction_id': tx.reference,
                        'amount': float(amount),
                        'currency': currency_code,
                        'provider': provider,
                        'phone_number': phone_number,
                        'status': tx.status,
                        'instructions': payment_result.get('instructions', f'A payment request has been sent to {phone_number}. Please enter your PIN to confirm.'),
                        'provider_reference': payment_result.get('transaction_id')
                    }, status=status.HTTP_201_CREATED)
                else:
                    tx.status = 'failed'
                    tx.failure_reason = payment_result.get('error', 'Payment request failed')
                    tx.save()
                    return Response({
                        'error': payment_result.get('error', f'Failed to initiate {provider} payment. Please try again.')
                    }, status=status.HTTP_400_BAD_REQUEST)
                    
            except ImportError as e:
                logger.error(f"Mobile money gateway not available: {str(e)}")
                tx.status = 'failed'
                tx.failure_reason = 'Mobile money service unavailable'
                tx.save()
                return Response({
                    'error': 'Mobile money payment service is temporarily unavailable. Please try again later.'
                }, status=status.HTTP_503_SERVICE_UNAVAILABLE)
            except Exception as e:
                logger.error(f"Mobile money payment failed: {str(e)}")
                tx.status = 'failed'
                tx.failure_reason = str(e)
                tx.save()
                return Response({
                    'error': f'Payment processing failed: {str(e)}'
                }, status=status.HTTP_500_INTERNAL_SERVER_ERROR)
        
        return Response({
            'success': True,
            'message': f'Deposit request initiated. Please approve the payment on your phone.',
            'transaction_id': tx.reference,
            'amount': float(amount),
            'currency': currency_code,
            'provider': provider,
            'phone_number': phone_number,
            'status': tx.status,
            'instructions': f'A payment request has been sent to {phone_number}. Please enter your PIN to confirm.'
        }, status=status.HTTP_201_CREATED)
        
    except Exception as e:
        logger.error(f"Error processing mobile money deposit: {str(e)}")
        return Response(
            {'error': 'Failed to process deposit'},
            status=status.HTTP_500_INTERNAL_SERVER_ERROR
        )

@api_view(['POST'])
@permission_classes([IsAuthenticated])
def deposit_bank_transfer(request):
    """
    Initiate bank transfer deposit
    
    Request body:
    {
        "amount": 500.00,
        "currency": "GHS"
    }
    
    Returns bank account details for the user to transfer to
    """
    try:
        amount = request.data.get('amount')
        currency_code = request.data.get('currency', 'GHS')
        
        if not amount:
            return Response(
                {'error': 'amount is required'},
                status=status.HTTP_400_BAD_REQUEST
            )
        
        try:
            amount = Decimal(str(amount))
            if amount <= 0:
                raise ValueError("Amount must be positive")
        except (ValueError, TypeError):
            return Response(
                {'error': 'Invalid amount format'},
                status=status.HTTP_400_BAD_REQUEST
            )
        
        # Minimum deposit amount for bank transfer
        if amount < Decimal('10.00'):
            return Response(
                {'error': 'Minimum bank transfer deposit is 10.00'},
                status=status.HTTP_400_BAD_REQUEST
            )
        
        # Create deposit transaction
        with db_transaction.atomic():
            tx = Transaction.objects.create(
                user=request.user,
                transaction_type='deposit',
                amount=amount,
                currency_code=currency_code,
                status='pending',
                reference=f"DEP-BT-{uuid.uuid4().hex[:12].upper()}",
                description=f"Bank Transfer Deposit",
                metadata={
                    'deposit_method': 'bank_transfer',
                    'currency': currency_code
                }
            )
        
        # Return bank account details from settings
        from django.conf import settings as django_settings
        bank_details = {
            'bank_name': getattr(django_settings, 'SIKAREMIT_BANK_NAME', ''),
            'account_name': getattr(django_settings, 'SIKAREMIT_BANK_ACCOUNT_NAME', ''),
            'account_number': getattr(django_settings, 'SIKAREMIT_BANK_ACCOUNT_NUMBER', ''),
            'branch': getattr(django_settings, 'SIKAREMIT_BANK_BRANCH', ''),
            'swift_code': getattr(django_settings, 'SIKAREMIT_BANK_SWIFT_CODE', ''),
            'reference': tx.reference  # User must include this as payment reference
        }

        if not bank_details['account_number']:
            tx.status = 'failed'
            tx.failure_reason = 'Bank deposit details not configured'
            tx.save()
            return Response(
                {'error': 'Bank deposit service is temporarily unavailable. Please try another method.'},
                status=status.HTTP_503_SERVICE_UNAVAILABLE
            )

        return Response({
            'success': True,
            'message': 'Please transfer the amount to the bank account below',
            'transaction_id': tx.reference,
            'amount': float(amount),
            'currency': currency_code,
            'status': tx.status,
            'bank_details': bank_details,
            'instructions': f'Please transfer exactly {currency_code} {amount} and include reference {tx.reference} in your payment description.'
        }, status=status.HTTP_201_CREATED)
        
    except Exception as e:
        logger.error(f"Error processing bank transfer deposit: {str(e)}")
        return Response(
            {'error': 'Failed to process deposit'},
            status=status.HTTP_500_INTERNAL_SERVER_ERROR
        )

@api_view(['POST'])
@permission_classes([IsAuthenticated])
def deposit_card(request):
    """
    Deposit funds via Debit/Credit Card
    
    Request body:
    {
        "amount": 100.00,
        "currency": "GHS",
        "card_token": "tok_xxx"  # Tokenized card from payment processor
    }
    """
    try:
        amount = request.data.get('amount')
        currency_code = request.data.get('currency', 'GHS')
        card_token = request.data.get('card_token')
        
        if not all([amount]):
            return Response(
                {'error': 'amount is required'},
                status=status.HTTP_400_BAD_REQUEST
            )
        
        try:
            amount = Decimal(str(amount))
            if amount <= 0:
                raise ValueError("Amount must be positive")
        except (ValueError, TypeError):
            return Response(
                {'error': 'Invalid amount format'},
                status=status.HTTP_400_BAD_REQUEST
            )
        
        # Minimum deposit amount
        if amount < Decimal('5.00'):
            return Response(
                {'error': 'Minimum card deposit is 5.00'},
                status=status.HTTP_400_BAD_REQUEST
            )
        
        # Create deposit transaction
        with db_transaction.atomic():
            tx = Transaction.objects.create(
                user=request.user,
                transaction_type='deposit',
                amount=amount,
                currency_code=currency_code,
                status='pending',
                reference=f"DEP-CD-{uuid.uuid4().hex[:12].upper()}",
                description=f"Card Deposit",
                metadata={
                    'deposit_method': 'card',
                    'currency': currency_code,
                    'card_token': card_token
                }
            )
            
            # REAL CARD PAYMENT INTEGRATION
            # Process card payment via Stripe or other payment processor
            try:
                from ..gateways.stripe import StripeGateway
                
                # Initialize Stripe gateway
                stripe_gateway = StripeGateway()
                
                # Create a mock payment method object for the gateway
                class CardPaymentMethod:
                    def __init__(self, token):
                        self.method_type = 'card'
                        self.details = {'payment_method_id': token}
                        self.id = f"card_{token[:8]}"
                
                payment_method = CardPaymentMethod(card_token)
                
                # Process card payment
                payment_result = stripe_gateway.process_payment(
                    amount=float(amount),
                    currency=currency_code.lower(),  # Stripe expects lowercase
                    payment_method=payment_method,
                    customer=request.user.customer_profile,
                    merchant=None,  # Self-deposit
                    metadata={
                        'transaction_reference': tx.reference,
                        'deposit_type': 'card',
                        'user_id': request.user.id
                    }
                )
                
                if payment_result.get('success'):
                    # Record transaction + credit wallet atomically; refund if DB fails
                    try:
                        from django.db import transaction as db_transaction
                        with db_transaction.atomic():
                            tx.status = 'completed'
                            tx.metadata.update({
                                'provider_reference': payment_result.get('transaction_id'),
                                'provider': 'stripe',
                                'payment_completed': True,
                                'card_last4': payment_result.get('card_last4'),
                                'card_brand': payment_result.get('card_brand')
                            })
                            tx.save()

                            # Add funds to user's wallet
                            currency = CurrencyService.get_currency_by_code(currency_code)
                            if currency:
                                wallet_balance, created = WalletBalance.objects.get_or_create(
                                    user=request.user,
                                    currency=currency,
                                    defaults={
                                        'available_balance': Decimal('0'),
                                        'pending_balance': Decimal('0')
                                    }
                                )
                                wallet_balance.available_balance += amount
                                wallet_balance.save()
                    except Exception as db_err:
                        logger.error(f"DB save failed after card deposit charge, issuing refund: {db_err}")
                        try:
                            stripe_gateway.refund_payment(
                                transaction_id=payment_result.get('transaction_id'),
                                amount=float(amount),
                                reason='DB save failed after card deposit charge'
                            )
                        except Exception as refund_err:
                            logger.critical(
                                f"REFUND ALSO FAILED for card deposit tx {tx.reference}, "
                                f"gateway_tx={payment_result.get('transaction_id')}, "
                                f"amount={amount}: {refund_err}"
                            )
                        return Response({
                            'error': 'Deposit charged but recording failed. A refund has been initiated.'
                        }, status=status.HTTP_500_INTERNAL_SERVER_ERROR)
                    
                    return Response({
                        'success': True,
                        'message': f'Card deposit of {currency_code} {amount} processed successfully.',
                        'transaction_id': tx.reference,
                        'amount': float(amount),
                        'currency': currency_code,
                        'status': tx.status,
                        'provider_reference': payment_result.get('transaction_id'),
                        'card_last4': payment_result.get('card_last4'),
                        'card_brand': payment_result.get('card_brand')
                    }, status=status.HTTP_201_CREATED)
                else:
                    tx.status = 'failed'
                    tx.failure_reason = payment_result.get('error', 'Card payment failed')
                    tx.save()
                    return Response({
                        'error': payment_result.get('error', 'Card payment failed. Please try again.')
                    }, status=status.HTTP_400_BAD_REQUEST)
                    
            except ImportError as e:
                logger.error(f"Card payment gateway not available: {str(e)}")
                tx.status = 'failed'
                tx.failure_reason = 'Card payment service unavailable'
                tx.save()
                return Response({
                    'error': 'Card payment service is temporarily unavailable. Please try again later.'
                }, status=status.HTTP_503_SERVICE_UNAVAILABLE)
            except Exception as e:
                logger.error(f"Card payment failed: {str(e)}")
                tx.status = 'failed'
                tx.failure_reason = str(e)
                tx.save()
                return Response({
                    'error': f'Card payment processing failed: {str(e)}'
                }, status=status.HTTP_500_INTERNAL_SERVER_ERROR)
        
    except Exception as e:
        logger.error(f"Error processing card deposit: {str(e)}")
        return Response(
            {'error': 'Failed to process deposit'},
            status=status.HTTP_500_INTERNAL_SERVER_ERROR
        )

# ============== WITHDRAW ENDPOINTS ==============

@api_view(['POST'])
@permission_classes([IsAuthenticated])
def withdraw_mobile_money(request):
    """
    Withdraw funds to Mobile Money
    
    Request body:
    {
        "amount": 100.00,
        "provider": "MTN",  # MTN, Telecel, AirtelTigo
        "phone_number": "0241234567",
        "currency": "GHS"
    }
    """
    try:
        amount = request.data.get('amount')
        provider = request.data.get('provider')
        phone_number = request.data.get('phone_number')
        currency_code = request.data.get('currency', 'GHS')
        
        # Validate required fields
        if not all([amount, provider, phone_number]):
            return Response(
                {'error': 'amount, provider, and phone_number are required'},
                status=status.HTTP_400_BAD_REQUEST
            )
        
        try:
            amount = Decimal(str(amount))
            if amount <= 0:
                raise ValueError("Amount must be positive")
        except (ValueError, TypeError):
            return Response(
                {'error': 'Invalid amount format'},
                status=status.HTTP_400_BAD_REQUEST
            )
        
        # Minimum withdrawal amount
        if amount < Decimal('1.00'):
            return Response(
                {'error': 'Minimum withdrawal amount is 1.00'},
                status=status.HTTP_400_BAD_REQUEST
            )
        
        # Maximum withdrawal amount per transaction
        if amount > Decimal('10000.00'):
            return Response(
                {'error': 'Maximum withdrawal amount is 10,000.00 per transaction'},
                status=status.HTTP_400_BAD_REQUEST
            )
        
        # Check user's wallet balance
        currency = CurrencyService.get_currency_by_code(currency_code)
        if not currency:
            return Response(
                {'error': 'Invalid currency'},
                status=status.HTTP_400_BAD_REQUEST
            )
        
        # Get user's balance for this currency
        wallet_balance = WalletBalance.objects.filter(
            user=request.user,
            currency=currency
        ).first()
        
        if not wallet_balance or wallet_balance.available_balance < amount:
            return Response(
                {'error': 'Insufficient balance'},
                status=status.HTTP_400_BAD_REQUEST
            )
        
        # Calculate withdrawal fee (1% with minimum of 0.50)
        fee = max(amount * Decimal('0.01'), Decimal('0.50'))
        total_deduction = amount + fee
        
        if wallet_balance.available_balance < total_deduction:
            return Response(
                {'error': f'Insufficient balance. You need {currency_code} {total_deduction} (including {currency_code} {fee} fee)'},
                status=status.HTTP_400_BAD_REQUEST
            )
        
        # Create withdrawal transaction
        with db_transaction.atomic():
            tx = Transaction.objects.create(
                user=request.user,
                transaction_type='withdrawal',
                amount=amount,
                currency_code=currency_code,
                status='pending',
                reference=f"WDR-MM-{uuid.uuid4().hex[:12].upper()}",
                description=f"Mobile Money Withdrawal - {provider}",
                metadata={
                    'withdrawal_method': 'mobile_money',
                    'provider': provider,
                    'phone_number': phone_number,
                    'currency': currency_code,
                    'fee': float(fee),
                    'total_deduction': float(total_deduction)
                }
            )
            
            # Deduct from wallet (move to pending)
            wallet_balance.available_balance -= total_deduction
            wallet_balance.pending_balance += total_deduction
            wallet_balance.save()
            
            # REAL MOBILE MONEY WITHDRAWAL INTEGRATION
            # Process disbursement to user's phone via provider API
            try:
                from ..gateways.mobile_money import MTNMoMoGateway, TelecelCashGateway, AirtelTigoMoneyGateway, GMoneyGateway
                
                # Select appropriate gateway based on provider
                if provider.upper() == 'MTN':
                    gateway = MTNMoMoGateway()
                elif provider.upper() == 'TELECEL':
                    gateway = TelecelCashGateway()
                elif provider.upper() in ['AIRTELTIGO', 'AIRTEL_TIGO']:
                    gateway = AirtelTigoMoneyGateway()
                elif provider.upper() in ['G_MONEY', 'G-MONEY']:
                    gateway = GMoneyGateway()
                else:
                    raise ValueError(f"Unsupported mobile money provider: {provider}")
                
                # Check if gateway is properly configured
                if not gateway.is_configured():
                    # Refund the pending balance back to available
                    wallet_balance.available_balance += total_deduction
                    wallet_balance.pending_balance -= total_deduction
                    wallet_balance.save()
                    
                    tx.status = 'failed'
                    tx.failure_reason = f"{provider} gateway not configured"
                    tx.save()
                    return Response({
                        'error': f'{provider} withdrawal service is temporarily unavailable. Please try again later.'
                    }, status=status.HTTP_503_SERVICE_UNAVAILABLE)
                
                # Process mobile money disbursement
                disbursement_result = gateway.disburse_funds(
                    amount=float(amount),
                    currency=currency_code,
                    phone_number=phone_number,
                    recipient_name=request.user.get_full_name() or request.user.email,
                    metadata={
                        'transaction_reference': tx.reference,
                        'withdrawal_type': 'mobile_money',
                        'user_id': request.user.id,
                        'fee': float(fee)
                    }
                )
                
                if disbursement_result.get('success'):
                    try:
                        from django.db import transaction as db_transaction
                        with db_transaction.atomic():
                            tx.status = 'processing'
                            tx.metadata.update({
                                'provider_reference': disbursement_result.get('transaction_id'),
                                'provider': provider,
                                'disbursement_initiated': True,
                                'estimated_time': disbursement_result.get('estimated_time', '1-5 minutes')
                            })
                            tx.save()
                    except Exception as db_err:
                        logger.critical(
                            f"DB save failed after withdrawal disbursement for tx {tx.reference}, "
                            f"gateway_tx={disbursement_result.get('transaction_id')}, "
                            f"amount={amount}, pending_balance not cleared. "
                            f"Manual reconciliation required: {db_err}"
                        )
                        return Response({
                            'error': 'Withdrawal sent but recording failed. Please contact support with your reference.'
                        }, status=status.HTTP_500_INTERNAL_SERVER_ERROR)
                    
                    return Response({
                        'success': True,
                        'message': f'Withdrawal initiated successfully via {provider}.',
                        'transaction_id': tx.reference,
                        'amount': float(amount),
                        'fee': float(fee),
                        'total_deduction': float(total_deduction),
                        'currency': currency_code,
                        'provider': provider,
                        'phone_number': phone_number,
                        'status': tx.status,
                        'estimated_time': disbursement_result.get('estimated_time', '1-5 minutes'),
                        'provider_reference': disbursement_result.get('transaction_id')
                    }, status=status.HTTP_201_CREATED)
                else:
                    # Refund the pending balance back to available
                    wallet_balance.available_balance += total_deduction
                    wallet_balance.pending_balance -= total_deduction
                    wallet_balance.save()
                    
                    tx.status = 'failed'
                    tx.failure_reason = disbursement_result.get('error', 'Disbursement failed')
                    tx.save()
                    return Response({
                        'error': disbursement_result.get('error', f'Failed to process {provider} withdrawal. Please try again.')
                    }, status=status.HTTP_400_BAD_REQUEST)
                    
            except ImportError as e:
                logger.error(f"Mobile money gateway not available: {str(e)}")
                # Refund the pending balance back to available
                wallet_balance.available_balance += total_deduction
                wallet_balance.pending_balance -= total_deduction
                wallet_balance.save()
                
                tx.status = 'failed'
                tx.failure_reason = 'Mobile money service unavailable'
                tx.save()
                return Response({
                    'error': 'Mobile money withdrawal service is temporarily unavailable. Please try again later.'
                }, status=status.HTTP_503_SERVICE_UNAVAILABLE)
            except Exception as e:
                logger.error(f"Mobile money withdrawal failed: {str(e)}")
                # Refund the pending balance back to available
                wallet_balance.available_balance += total_deduction
                wallet_balance.pending_balance -= total_deduction
                wallet_balance.save()
                
                tx.status = 'failed'
                tx.failure_reason = str(e)
                tx.save()
                return Response({
                    'error': f'Withdrawal processing failed: {str(e)}'
                }, status=status.HTTP_500_INTERNAL_SERVER_ERROR)
        
        return Response({
            'success': True,
            'message': f'Withdrawal initiated. You will receive {currency_code} {amount} on {phone_number} shortly.',
            'transaction_id': tx.reference,
            'amount': float(amount),
            'fee': float(fee),
            'total_deduction': float(total_deduction),
            'currency': currency_code,
            'provider': provider,
            'phone_number': phone_number,
            'status': tx.status,
            'estimated_time': '1-5 minutes'
        }, status=status.HTTP_201_CREATED)
        
    except Exception as e:
        logger.error(f"Error processing mobile money withdrawal: {str(e)}")
        return Response(
            {'error': 'Failed to process withdrawal'},
            status=status.HTTP_500_INTERNAL_SERVER_ERROR
        )

@api_view(['POST'])
@permission_classes([IsAuthenticated])
def withdraw_bank_transfer(request):
    """
    Withdraw funds to Bank Account
    
    Request body:
    {
        "amount": 500.00,
        "currency": "GHS",
        "bank_code": "GCB",
        "account_number": "1234567890",
        "account_name": "John Doe"
    }
    """
    try:
        amount = request.data.get('amount')
        currency_code = request.data.get('currency', 'GHS')
        bank_code = request.data.get('bank_code')
        account_number = request.data.get('account_number')
        account_name = request.data.get('account_name')
        
        # Validate required fields
        if not all([amount, bank_code, account_number, account_name]):
            return Response(
                {'error': 'amount, bank_code, account_number, and account_name are required'},
                status=status.HTTP_400_BAD_REQUEST
            )
        
        try:
            amount = Decimal(str(amount))
            if amount <= 0:
                raise ValueError("Amount must be positive")
        except (ValueError, TypeError):
            return Response(
                {'error': 'Invalid amount format'},
                status=status.HTTP_400_BAD_REQUEST
            )
        
        # Minimum withdrawal amount for bank transfer
        if amount < Decimal('10.00'):
            return Response(
                {'error': 'Minimum bank transfer withdrawal is 10.00'},
                status=status.HTTP_400_BAD_REQUEST
            )
        
        # Maximum withdrawal amount per transaction
        if amount > Decimal('50000.00'):
            return Response(
                {'error': 'Maximum bank transfer withdrawal is 50,000.00 per transaction'},
                status=status.HTTP_400_BAD_REQUEST
            )
        
        # Check user's wallet balance
        currency = CurrencyService.get_currency_by_code(currency_code)
        if not currency:
            return Response(
                {'error': 'Invalid currency'},
                status=status.HTTP_400_BAD_REQUEST
            )
        
        # Get user's balance for this currency
        wallet_balance = WalletBalance.objects.filter(
            user=request.user,
            currency=currency
        ).first()
        
        if not wallet_balance or wallet_balance.available_balance < amount:
            return Response(
                {'error': 'Insufficient balance'},
                status=status.HTTP_400_BAD_REQUEST
            )
        
        # Calculate withdrawal fee (0.5% with minimum of 2.00)
        fee = max(amount * Decimal('0.005'), Decimal('2.00'))
        total_deduction = amount + fee
        
        if wallet_balance.available_balance < total_deduction:
            return Response(
                {'error': f'Insufficient balance. You need {currency_code} {total_deduction} (including {currency_code} {fee} fee)'},
                status=status.HTTP_400_BAD_REQUEST
            )
        
        # Create withdrawal transaction
        with db_transaction.atomic():
            tx = Transaction.objects.create(
                user=request.user,
                transaction_type='withdrawal',
                amount=amount,
                currency_code=currency_code,
                status='pending',
                reference=f"WDR-BT-{uuid.uuid4().hex[:12].upper()}",
                description=f"Bank Transfer Withdrawal - {bank_code}",
                metadata={
                    'withdrawal_method': 'bank_transfer',
                    'bank_code': bank_code,
                    'account_number': account_number,
                    'account_name': account_name,
                    'currency': currency_code,
                    'fee': float(fee),
                    'total_deduction': float(total_deduction)
                }
            )
            
            # Deduct from wallet (move to pending)
            wallet_balance.available_balance -= total_deduction
            wallet_balance.pending_balance += total_deduction
            wallet_balance.save()
            
            # REAL BANK TRANSFER INTEGRATION
            # Process withdrawal via bank transfer API
            try:
                from ..gateways.bank_transfer import BankTransferGateway
                
                gateway = BankTransferGateway()
                
                # Check if any bank transfer providers are configured
                if not gateway.default_provider:
                    # Refund the pending balance back to available
                    wallet_balance.available_balance += total_deduction
                    wallet_balance.pending_balance -= total_deduction
                    wallet_balance.save()
                    
                    tx.status = 'failed'
                    tx.failure_reason = 'Bank transfer service not configured'
                    tx.save()
                    return Response({
                        'error': 'Bank transfer service is temporarily unavailable. Please try again later.'
                    }, status=status.HTTP_503_SERVICE_UNAVAILABLE)
                
                # Create a mock payment method for the bank transfer
                class BankTransferPaymentMethod:
                    def __init__(self, bank_code, account_number, account_name):
                        self.method_type = 'bank_transfer'
                        self.details = {
                            'bank_code': bank_code,
                            'account_number': account_number,
                            'account_name': account_name
                        }
                        self.id = f"bank_{bank_code}_{account_number}"
                
                payment_method = BankTransferPaymentMethod(bank_code, account_number, account_name)
                
                # Process bank transfer disbursement
                disbursement_result = gateway.disburse_funds(
                    amount=float(amount),
                    currency=currency_code,
                    bank_code=bank_code,
                    account_number=account_number,
                    account_name=account_name,
                    recipient_name=request.user.get_full_name() or request.user.email,
                    recipient_email=request.user.email,
                    metadata={
                        'transaction_reference': tx.reference,
                        'withdrawal_type': 'bank_transfer',
                        'user_id': request.user.id,
                        'fee': float(fee)
                    }
                )
                
                if disbursement_result.get('success'):
                    try:
                        from django.db import transaction as db_transaction
                        with db_transaction.atomic():
                            tx.status = 'processing'
                            tx.metadata.update({
                                'provider_reference': disbursement_result.get('transaction_id'),
                                'bank_code': bank_code,
                                'account_number': account_number,
                                'account_name': account_name,
                                'disbursement_initiated': True,
                                'estimated_time': disbursement_result.get('estimated_time', '1-3 business days'),
                                'instructions': disbursement_result.get('instructions')
                            })
                            tx.save()
                    except Exception as db_err:
                        logger.critical(
                            f"DB save failed after bank withdrawal disbursement for tx {tx.reference}, "
                            f"gateway_tx={disbursement_result.get('transaction_id')}, "
                            f"amount={amount}, pending_balance not cleared. "
                            f"Manual reconciliation required: {db_err}"
                        )
                        return Response({
                            'error': 'Withdrawal sent but recording failed. Please contact support with your reference.'
                        }, status=status.HTTP_500_INTERNAL_SERVER_ERROR)
                    
                    return Response({
                        'success': True,
                        'message': f'Bank transfer initiated successfully to {account_name} ({bank_code}).',
                        'transaction_id': tx.reference,
                        'amount': float(amount),
                        'fee': float(fee),
                        'total_deduction': float(total_deduction),
                        'currency': currency_code,
                        'bank_code': bank_code,
                        'account_number': account_number,
                        'account_name': account_name,
                        'status': tx.status,
                        'estimated_time': disbursement_result.get('estimated_time', '1-3 business days'),
                        'provider_reference': disbursement_result.get('transaction_id'),
                        'instructions': disbursement_result.get('instructions')
                    }, status=status.HTTP_201_CREATED)
                else:
                    # Refund the pending balance back to available
                    wallet_balance.available_balance += total_deduction
                    wallet_balance.pending_balance -= total_deduction
                    wallet_balance.save()
                    
                    tx.status = 'failed'
                    tx.failure_reason = disbursement_result.get('error', 'Bank transfer failed')
                    tx.save()
                    return Response({
                        'error': disbursement_result.get('error', 'Failed to process bank transfer. Please try again.')
                    }, status=status.HTTP_400_BAD_REQUEST)
                    
            except ImportError as e:
                logger.error(f"Bank transfer gateway not available: {str(e)}")
                # Refund the pending balance back to available
                wallet_balance.available_balance += total_deduction
                wallet_balance.pending_balance -= total_deduction
                wallet_balance.save()
                
                tx.status = 'failed'
                tx.failure_reason = 'Bank transfer service unavailable'
                tx.save()
                return Response({
                    'error': 'Bank transfer service is temporarily unavailable. Please try again later.'
                }, status=status.HTTP_503_SERVICE_UNAVAILABLE)
            except Exception as e:
                logger.error(f"Bank transfer withdrawal failed: {str(e)}")
                # Refund the pending balance back to available
                wallet_balance.available_balance += total_deduction
                wallet_balance.pending_balance -= total_deduction
                wallet_balance.save()
                
                tx.status = 'failed'
                tx.failure_reason = str(e)
                tx.save()
                return Response({
                    'error': f'Bank transfer processing failed: {str(e)}'
                }, status=status.HTTP_500_INTERNAL_SERVER_ERROR)
        
        return Response({
            'success': True,
            'message': f'Bank transfer initiated. {currency_code} {amount} will be sent to account {account_number}.',
            'transaction_id': tx.reference,
            'amount': float(amount),
            'fee': float(fee),
            'total_deduction': float(total_deduction),
            'currency': currency_code,
            'bank_code': bank_code,
            'account_number': account_number,
            'account_name': account_name,
            'status': tx.status,
            'estimated_time': '1-3 business days'
        }, status=status.HTTP_201_CREATED)
        
    except Exception as e:
        logger.error(f"Error processing bank transfer withdrawal: {str(e)}")
        return Response(
            {'error': 'Failed to process withdrawal'},
            status=status.HTTP_500_INTERNAL_SERVER_ERROR
        )

@api_view(['GET'])
@permission_classes([IsAuthenticated])
def get_withdrawal_limits(request):
    """
    Get withdrawal limits and fees for the user
    """
    try:
        currency_code = request.query_params.get('currency', 'GHS')
        
        # Get user's wallet balance
        currency = CurrencyService.get_currency_by_code(currency_code)
        available_balance = Decimal('0.00')
        
        if currency:
            wallet_balance = WalletBalance.objects.filter(
                user=request.user,
                currency=currency
            ).first()
            if wallet_balance:
                available_balance = wallet_balance.available_balance
        
        return Response({
            'currency': currency_code,
            'available_balance': float(available_balance),
            'mobile_money': {
                'min_amount': 1.00,
                'max_amount': 10000.00,
                'fee_percentage': 1.0,
                'min_fee': 0.50,
                'estimated_time': '1-5 minutes'
            },
            'bank_transfer': {
                'min_amount': 10.00,
                'max_amount': 50000.00,
                'fee_percentage': 0.5,
                'min_fee': 2.00,
                'estimated_time': '1-3 business days'
            }
        })
        
    except Exception as e:
        logger.error(f"Error getting withdrawal limits: {str(e)}")
        return Response(
            {'error': 'Failed to get withdrawal limits'},
            status=status.HTTP_500_INTERNAL_SERVER_ERROR
        )

@api_view(['POST'])
@permission_classes([IsAuthenticated])
def transfer_to_sikaremit_wallet(request):
    """
    Transfer funds to another SikaRemit user's wallet (wallet-to-wallet transfer)
    
    Request body:
    {
        "amount": 100.00,
        "currency": "GHS",
        "recipient_identifier": "0241234567",  # Phone number or email
        "description": "Payment for services"
    }
    """
    try:
        from django.contrib.auth import get_user_model
        User = get_user_model()
        
        amount = request.data.get('amount')
        currency_code = request.data.get('currency', 'GHS')
        recipient_identifier = request.data.get('recipient_identifier')
        description = request.data.get('description', '')
        
        # Validate required fields
        if not all([amount, recipient_identifier]):
            return Response(
                {'error': 'amount and recipient_identifier are required'},
                status=status.HTTP_400_BAD_REQUEST
            )
        
        try:
            amount = Decimal(str(amount))
            if amount <= 0:
                raise ValueError("Amount must be positive")
        except (ValueError, TypeError):
            return Response(
                {'error': 'Invalid amount format'},
                status=status.HTTP_400_BAD_REQUEST
            )
        
        # Minimum transfer amount
        if amount < Decimal('1.00'):
            return Response(
                {'error': 'Minimum transfer amount is 1.00'},
                status=status.HTTP_400_BAD_REQUEST
            )
        
        # Find recipient by phone number or email
        recipient_identifier = recipient_identifier.strip()
        recipient = None
        
        # Try to find by phone number
        if recipient_identifier.replace('+', '').replace(' ', '').isdigit():
            # Clean phone number
            phone = recipient_identifier.replace('+', '').replace(' ', '').replace('-', '')
            if phone.startswith('233'):
                phone = '0' + phone[3:]
            elif not phone.startswith('0') and len(phone) == 9:
                phone = '0' + phone
            
            recipient = User.objects.filter(phone_number__endswith=phone[-9:]).first()
            if not recipient:
                recipient = User.objects.filter(phone_number=phone).first()
        
        # Try to find by email if not found by phone
        if not recipient and '@' in recipient_identifier:
            recipient = User.objects.filter(email__iexact=recipient_identifier).first()
        
        if not recipient:
            return Response(
                {'error': 'Recipient not found. Please check the phone number or email.'},
                status=status.HTTP_404_NOT_FOUND
            )
        
        # Prevent self-transfer
        if recipient.id == request.user.id:
            return Response(
                {'error': 'You cannot transfer to yourself'},
                status=status.HTTP_400_BAD_REQUEST
            )
        
        # Get currency
        currency = CurrencyService.get_currency_by_code(currency_code)
        if not currency:
            return Response(
                {'error': 'Invalid currency'},
                status=status.HTTP_400_BAD_REQUEST
            )
        
        # Check sender's wallet balance
        sender_wallet = WalletBalance.objects.filter(
            user=request.user,
            currency=currency
        ).first()
        
        if not sender_wallet or sender_wallet.available_balance < amount:
            return Response(
                {'error': 'Insufficient balance'},
                status=status.HTTP_400_BAD_REQUEST
            )
        
        # Get or create recipient's wallet
        recipient_wallet, created = WalletBalance.objects.get_or_create(
            user=recipient,
            currency=currency,
            defaults={'available_balance': Decimal('0.00'), 'pending_balance': Decimal('0.00')}
        )
        
        # Perform the transfer
        with db_transaction.atomic():
            # Create transaction record for sender (debit)
            sender_tx = Transaction.objects.create(
                user=request.user,
                transaction_type='transfer_out',
                amount=amount,
                currency_code=currency_code,
                status='completed',
                reference=f"TRF-SR-{uuid.uuid4().hex[:12].upper()}",
                description=description or f"Transfer to {recipient.get_full_name() or recipient.email}",
                metadata={
                    'transfer_type': 'sikaremit_wallet',
                    'recipient_id': str(recipient.id),
                    'recipient_name': recipient.get_full_name() or recipient.email,
                    'recipient_phone': getattr(recipient, 'phone_number', ''),
                    'currency': currency_code,
                }
            )
            
            # Create transaction record for recipient (credit)
            recipient_tx = Transaction.objects.create(
                user=recipient,
                transaction_type='transfer_in',
                amount=amount,
                currency_code=currency_code,
                status='completed',
                reference=f"TRF-SR-{uuid.uuid4().hex[:12].upper()}",
                description=description or f"Transfer from {request.user.get_full_name() or request.user.email}",
                metadata={
                    'transfer_type': 'sikaremit_wallet',
                    'sender_id': str(request.user.id),
                    'sender_name': request.user.get_full_name() or request.user.email,
                    'currency': currency_code,
                    'related_transaction': sender_tx.reference,
                }
            )
            
            # Update sender_tx with related transaction
            sender_tx.metadata['related_transaction'] = recipient_tx.reference
            sender_tx.save()
            
            # Deduct from sender's wallet
            sender_wallet.available_balance -= amount
            sender_wallet.save()
            
            # Add to recipient's wallet
            recipient_wallet.available_balance += amount
            recipient_wallet.save()
        
        # Get recipient display name
        recipient_name = recipient.get_full_name()
        if not recipient_name:
            recipient_name = recipient.email or getattr(recipient, 'phone_number', 'SikaRemit User')
        
        return Response({
            'success': True,
            'message': f'Successfully transferred {currency_code} {amount} to {recipient_name}',
            'transaction_id': sender_tx.reference,
            'amount': float(amount),
            'currency': currency_code,
            'recipient': {
                'name': recipient_name,
                'identifier': recipient_identifier,
            },
            'status': 'completed',
            'estimated_time': 'Instant'
        }, status=status.HTTP_201_CREATED)
        
    except Exception as e:
        logger.error(f"Error processing SikaRemit wallet transfer: {str(e)}")
        return Response(
            {'error': 'Failed to process transfer'},
            status=status.HTTP_500_INTERNAL_SERVER_ERROR
        )

@api_view(['GET'])
@permission_classes([IsAuthenticated])
def lookup_sikaremit_user(request):
    """
    Look up a SikaRemit user by phone number or email
    
    Query params:
    - identifier: Phone number or email to look up
    """
    try:
        from django.contrib.auth import get_user_model
        User = get_user_model()
        
        identifier = request.query_params.get('identifier', '').strip()
        
        if not identifier:
            return Response(
                {'error': 'identifier is required'},
                status=status.HTTP_400_BAD_REQUEST
            )
        
        recipient = None
        
        # Try to find by phone number
        if identifier.replace('+', '').replace(' ', '').replace('-', '').isdigit():
            phone = identifier.replace('+', '').replace(' ', '').replace('-', '')
            if phone.startswith('233'):
                phone = '0' + phone[3:]
            elif not phone.startswith('0') and len(phone) == 9:
                phone = '0' + phone
            
            recipient = User.objects.filter(phone_number__endswith=phone[-9:]).first()
            if not recipient:
                recipient = User.objects.filter(phone_number=phone).first()
        
        # Try to find by email
        if not recipient and '@' in identifier:
            recipient = User.objects.filter(email__iexact=identifier).first()
        
        if not recipient:
            return Response({
                'found': False,
                'message': 'No SikaRemit user found with this phone number or email'
            })
        
        # Don't allow looking up yourself
        if recipient.id == request.user.id:
            return Response({
                'found': False,
                'message': 'This is your own account'
            })
        
        # Return limited info for privacy
        recipient_name = recipient.get_full_name()
        if not recipient_name:
            # Mask email for privacy
            if recipient.email:
                email_parts = recipient.email.split('@')
                if len(email_parts[0]) > 2:
                    masked_email = email_parts[0][:2] + '***@' + email_parts[1]
                else:
                    masked_email = '***@' + email_parts[1]
                recipient_name = masked_email
            else:
                recipient_name = 'SikaRemit User'
        
        return Response({
            'found': True,
            'recipient': {
                'name': recipient_name,
                'identifier': identifier,
                'verified': True
            }
        })
        
    except Exception as e:
        logger.error(f"Error looking up SikaRemit user: {str(e)}")
        return Response(
            {'error': 'Failed to look up user'},
            status=status.HTTP_500_INTERNAL_SERVER_ERROR
        )

@api_view(['GET'])
@permission_classes([IsAuthenticated])
def get_supported_banks(request):
    """
    Get list of supported banks for withdrawal
    """
    try:
        country_code = request.query_params.get('country', 'GH')
        
        # Ghana banks
        ghana_banks = [
            {'code': 'GCB', 'name': 'Ghana Commercial Bank', 'swift': 'GHCBGHAC'},
            {'code': 'ECOBANK', 'name': 'Ecobank Ghana', 'swift': 'EABORHAC'},
            {'code': 'STANBIC', 'name': 'Stanbic Bank Ghana', 'swift': 'SBICGHAC'},
            {'code': 'ABSA', 'name': 'Absa Bank Ghana', 'swift': 'BABORHAC'},
            {'code': 'ZENITH', 'name': 'Zenith Bank Ghana', 'swift': 'ZEABORHAC'},
            {'code': 'FIDELITY', 'name': 'Fidelity Bank Ghana', 'swift': 'FABORHAC'},
            {'code': 'CAL', 'name': 'CAL Bank', 'swift': 'ACABORHAC'},
            {'code': 'UBA', 'name': 'United Bank for Africa', 'swift': 'UNABORHAC'},
            {'code': 'ACCESS', 'name': 'Access Bank Ghana', 'swift': 'ABNGGHAC'},
            {'code': 'GTB', 'name': 'Guaranty Trust Bank Ghana', 'swift': 'GTBIGHAC'},
            {'code': 'SOCIETE', 'name': 'Societe Generale Ghana', 'swift': 'SGGHGHAC'},
            {'code': 'STANDARD', 'name': 'Standard Chartered Bank Ghana', 'swift': 'SCBLGHAC'},
            {'code': 'FBN', 'name': 'First Bank Nigeria (Ghana)', 'swift': 'FBNIRHAC'},
            {'code': 'PRUDENTIAL', 'name': 'Prudential Bank', 'swift': 'PABORHAC'},
            {'code': 'REPUBLIC', 'name': 'Republic Bank Ghana', 'swift': 'HABORHAC'},
            {'code': 'ADB', 'name': 'Agricultural Development Bank', 'swift': 'ADNTGHAC'},
            {'code': 'NIB', 'name': 'National Investment Bank', 'swift': 'NIBORGHAC'},
            {'code': 'CONSOLIDATED', 'name': 'Consolidated Bank Ghana', 'swift': 'CBGHGHAC'},
        ]
        
        banks_by_country = {
            'GH': ghana_banks,
        }
        
        banks = banks_by_country.get(country_code, ghana_banks)
        
        return Response({
            'country': country_code,
            'banks': banks
        })
        
    except Exception as e:
        logger.error(f"Error getting supported banks: {str(e)}")
        return Response(
            {'error': 'Failed to get supported banks'},
            status=status.HTTP_500_INTERNAL_SERVER_ERROR
        )
