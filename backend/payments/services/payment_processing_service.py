from django.db import transaction
from ..models.transaction import Transaction
from ..models.payment_method import PaymentMethod
from ..models.payment import Payment
from users.models import Customer, Merchant
import logging
import time
from typing import Dict, Any

logger = logging.getLogger(__name__)

class PaymentServiceWithKYC:
    """
    Service class for handling payment processing logic
    """
    @staticmethod
    def process_payment(user, amount, payment_method, payment_token=None):
        """
        Process a payment transaction using the appropriate payment gateway
        """
        from ..gateways.stripe import StripeGateway
        from ..gateways.mobile_money import MobileMoneyGateway
        from ..models import PaymentMethod as PaymentMethodModel
        import uuid

        transaction = None
        try:
            logger.info(f"Processing payment for user {user.id}: amount={amount}, method={payment_method}")

            # Validate inputs
            if not user or not amount or amount <= 0:
                raise ValueError("Invalid payment parameters")

            # Get payment method object
            try:
                payment_method_obj = PaymentMethodModel.objects.get(
                    id=payment_method,
                    user=user
                )
            except PaymentMethodModel.DoesNotExist:
                logger.error(f"Payment method {payment_method} not found for user {user.id}")
                raise ValueError("Payment method not found")

            # Create transaction record
            transaction = Transaction.objects.create(
                customer=user.customer_profile,
                amount=amount,
                payment_method=payment_method_obj,
                status='pending',
                currency='GHS' if payment_method_obj.method_type in PaymentMethodModel.MOBILE_MONEY_TYPES else 'USD'
            )
            logger.info(f"Created transaction {transaction.id} for user {user.id}")

            # Route to appropriate gateway based on payment method type
            gateway_result = None
            try:
                if payment_method_obj.method_type == PaymentMethodModel.CARD:
                    # Use Stripe for cards (most reliable global option)
                    logger.info(f"Routing to Stripe gateway for transaction {transaction.id}")
                    try:
                        from ..gateways.stripe import StripeGateway
                        gateway = StripeGateway()
                        gateway_result = gateway.process_payment(
                            amount=amount,
                            currency='USD',  # Default to USD for cards
                            payment_method=payment_method_obj,
                            customer=user.customer_profile,
                            merchant=None,  # Will be set by calling view
                            metadata={'transaction_id': transaction.id}
                        )
                    except Exception as e:
                        logger.warning(f"Stripe gateway failed: {e}")

                elif payment_method_obj.method_type in PaymentMethodModel.MOBILE_MONEY_TYPES:
                    # Use direct mobile money gateway for Ghanaian mobile money
                    logger.info(f"Routing to mobile money gateway for transaction {transaction.id}")
                    try:
                        # Import specific gateways
                        from ..gateways.mobile_money import MTNMoMoGateway, TelecelCashGateway, AirtelTigoMoneyGateway, GMoneyGateway
                        
                        # Get provider from payment method details
                        provider = payment_method_obj.details.get('provider', '').lower()
                        
                        # Select appropriate gateway based on provider
                        if provider == 'mtn':
                            gateway = MTNMoMoGateway()
                        elif provider == 'telecel':
                            gateway = TelecelCashGateway()
                        elif provider == 'airtel_tigo':
                            gateway = AirtelTigoMoneyGateway()
                        elif provider == 'g_money':
                            gateway = GMoneyGateway()
                        else:
                            # Fallback to generic mobile money gateway
                            from ..gateways.mobile_money import MobileMoneyGateway
                            gateway = MobileMoneyGateway()
                        
                        gateway_result = gateway.process_payment(
                            amount=amount,
                            currency='GHS',  # Ghanaian payments default to GHS
                            payment_method=payment_method_obj,
                            customer=user.customer_profile,
                            merchant=None,
                            metadata={'transaction_id': transaction.id}
                        )
                    except Exception as e:
                        logger.warning(f"Mobile money gateway failed: {e}")

                elif payment_method_obj.method_type == PaymentMethodModel.BANK:
                    # Use direct bank transfer gateway
                    logger.info(f"Routing to bank transfer gateway for transaction {transaction.id}")
                    try:
                        from ..gateways.bank_transfer import BankTransferGateway
                        gateway = BankTransferGateway()
                        gateway_result = gateway.process_payment(
                            amount=amount,
                            currency='GHS',  # Default to GHS for bank transfers
                            payment_method=payment_method_obj,
                            customer=user.customer_profile,
                            merchant=None,
                            metadata={'transaction_id': transaction.id}
                        )
                    except Exception as e:
                        logger.warning(f"Bank transfer gateway failed: {e}")

                elif payment_method_obj.method_type == PaymentMethodModel.SIKAREMIT_BALANCE:
                    # Use internal wallet balance gateway — instant, zero fees
                    logger.info(f"Routing to SikaRemit balance gateway for transaction {transaction.id}")
                    try:
                        from ..gateways.sikaremit_balance import SikaRemitBalanceGateway
                        gateway = SikaRemitBalanceGateway()
                        gateway_result = gateway.process_payment(
                            amount=amount,
                            currency=transaction.currency,
                            payment_method=payment_method_obj,
                            customer=user.customer_profile,
                            merchant=None,
                            metadata={'transaction_id': transaction.id}
                        )
                    except Exception as e:
                        logger.warning(f"SikaRemit balance gateway failed: {e}")
                else:
                    logger.error(f"Unsupported payment method type: {payment_method_obj.method_type}")
                    raise ValueError(f"Unsupported payment method: {payment_method_obj.method_type}")
            except Exception as e:
                logger.error(f"Real gateway failed for {payment_method_obj.method_type}: {e}")
                logger.error(f"Transaction ID: {transaction.id}")
                logger.error(f"Payment Method: {payment_method_obj.method_type}")
                logger.error(f"Amount: {amount} {currency}")
                
                # CRITICAL: No mock fallback in production - fail gracefully
                transaction.status = 'failed'
                transaction.failure_reason = f"Payment processing unavailable: {str(e)}"
                transaction.save()
                
                error_msg = f"Payment processing failed for {payment_method_obj.method_type}. Please try again later or contact support."
                logger.error(f"Payment processing failed for transaction {transaction.id}: {error_msg}")
                raise ValueError(error_msg)

            # Update transaction status based on gateway result
            if gateway_result.get('success'):
                transaction.status = 'completed'
                # Store transaction ID in metadata
                transaction.metadata = transaction.metadata or {}
                transaction.metadata['gateway_transaction_id'] = gateway_result.get('transaction_id', str(uuid.uuid4()))
                if gateway_result.get('authorization_url'):
                    transaction.metadata['authorization_url'] = gateway_result['authorization_url']
                logger.info(f"Payment successful for transaction {transaction.id}")

                try:
                    transaction.save()
                except Exception as db_err:
                    logger.error(f"DB save failed after gateway charge for tx {transaction.id}, issuing refund: {db_err}")
                    try:
                        gateway.refund_payment(
                            transaction_id=gateway_result.get('transaction_id'),
                            amount=float(amount),
                            reason='DB save failed after charge'
                        )
                    except Exception as refund_err:
                        logger.critical(
                            f"REFUND ALSO FAILED for tx {transaction.id}, "
                            f"gateway_tx={gateway_result.get('transaction_id')}, "
                            f"amount={amount}: {refund_err}"
                        )
                    raise ValueError('Payment charged but recording failed. Refund initiated.')
            else:
                transaction.status = 'failed'
                transaction.failure_reason = gateway_result.get('error', 'Payment failed')
                logger.error(f"Payment failed for transaction {transaction.id}: {gateway_result.get('error')}")
                transaction.save()

            # Perform fraud detection analysis on completed transactions
            if transaction.status == 'completed':
                try:
                    fraud_analysis = self._perform_fraud_analysis(transaction)

                    if fraud_analysis.get('auto_block'):
                        transaction.status = 'failed'
                        transaction.metadata = transaction.metadata or {}
                        transaction.metadata['fraud_blocked'] = True
                        transaction.metadata['fraud_score'] = fraud_analysis.get('fraud_score')
                        transaction.save()
                        logger.warning(f"Transaction {transaction.id} blocked by fraud detection")

                        return {
                            'success': False,
                            'transaction_id': transaction.transaction_id,
                            'status': transaction.status,
                            'error': 'Transaction blocked by fraud detection',
                            'fraud_analysis': fraud_analysis
                        }

                    # Attach fraud analysis to successful transaction metadata
                    transaction.metadata = transaction.metadata or {}
                    transaction.metadata['fraud_score'] = fraud_analysis.get('fraud_score')
                    transaction.save()
                except Exception as fraud_err:
                    logger.error(f"Fraud analysis failed for transaction {transaction.id}: {fraud_err}")

            return transaction

        except ValueError as e:
            logger.warning(f"Payment validation error for user {user.id}: {str(e)}")
            if transaction:
                transaction.status = 'failed'
                transaction.metadata = {'error': str(e)}
                transaction.save()
            return {'success': False, 'error': str(e)}

        except Exception as e:
            logger.error(f"Payment processing failed for user {user.id}: {str(e)}", exc_info=True)
            if transaction:
                transaction.status = 'failed'
                transaction.metadata = {'error': str(e)}
                transaction.save()
            return {'success': False, 'error': 'Payment processing failed'}
    
    @staticmethod
    def _perform_fraud_analysis(transaction) -> Dict[str, Any]:
        """
        Perform fraud detection analysis on transaction
        """
        try:
            from .fraud_detection_ml_service import MLFraudDetectionService
            fraud_service = MLFraudDetectionService()
            return fraud_service.analyze_transaction(transaction)
        except Exception as e:
            logger.error(f"Fraud analysis failed: {str(e)}")
            return {
                'fraud_score': 0.0,
                'risk_level': 'unknown',
                'error': str(e)
            }
    
    @staticmethod
    def verify_mobile_payment(transaction_id, provider):
        """
        Verify a mobile money payment status with the provider
        """
        try:
            from ..gateways.mobile_money import (
                MTNMoMoGateway, TelecelCashGateway, AirtelTigoMoneyGateway
            )
            
            gateway_map = {
                'mtn_momo': MTNMoMoGateway,
                'mtn': MTNMoMoGateway,
                'telecel': TelecelCashGateway,
                'telecel_cash': TelecelCashGateway,
                'airtel_tigo': AirtelTigoMoneyGateway,
                'airteltigo': AirtelTigoMoneyGateway,
            }
            
            gateway_class = gateway_map.get(provider.lower())
            if not gateway_class:
                return {
                    'success': False,
                    'error': f'Unknown mobile money provider: {provider}'
                }
            
            gateway = gateway_class()
            result = gateway.check_transaction_status(transaction_id)
            
            return {
                'success': result.get('success', False),
                'status': result.get('status'),
                'amount': result.get('amount'),
                'verified': result.get('status') in ['SUCCESSFUL', 'completed', 'SUCCESS'],
                'raw_response': result.get('raw_response')
            }
            
        except Exception as e:
            logger.error(f"Mobile payment verification failed: {str(e)}")
            return {
                'success': False,
                'error': str(e)
            }
    
    @staticmethod
    def _process_card_payment(token, amount, currency='USD', customer=None, metadata=None):
        """
        Process card payment through Stripe gateway
        """
        try:
            from ..gateways.stripe import StripeGateway
            
            gateway = StripeGateway()
            
            # Adapter to pass card token to the gateway interface
            class CardPaymentMethod:
                def __init__(self, token):
                    self.details = {'payment_method_id': token}
            
            payment_method = CardPaymentMethod(token)
            
            result = gateway.process_payment(
                amount=amount,
                currency=currency,
                payment_method=payment_method,
                customer=customer,
                merchant=None,
                metadata=metadata or {}
            )
            
            return result
            
        except Exception as e:
            logger.error(f"Card payment processing failed: {str(e)}")
            return {
                'success': False,
                'error': str(e)
            }
    
    @staticmethod
    def _process_mobile_payment(phone_number, amount, provider='mtn_momo', currency='GHS', metadata=None):
        """
        Process mobile money payment
        Args:
            phone_number: Customer phone number
            amount: Payment amount
            provider: Mobile money provider (mtn_momo, telecel, airtel_tigo)
            currency: Currency code
            metadata: Additional metadata
        """
        try:
            from ..gateways.mobile_money import (
                MTNMoMoGateway, TelecelCashGateway, AirtelTigoMoneyGateway
            )
            
            gateway_map = {
                'mtn_momo': MTNMoMoGateway,
                'mtn': MTNMoMoGateway,
                'telecel': TelecelCashGateway,
                'telecel_cash': TelecelCashGateway,
                'airtel_tigo': AirtelTigoMoneyGateway,
                'airteltigo': AirtelTigoMoneyGateway,
            }
            
            gateway_class = gateway_map.get(provider.lower())
            if not gateway_class:
                return {
                    'success': False,
                    'error': f'Unknown mobile money provider: {provider}'
                }
            
            gateway = gateway_class()
            
            # Adapter classes to pass mobile payment data to gateway interface
            class MobilePaymentMethod:
                def __init__(self, phone):
                    self.details = {'phone_number': phone}
                    self.id = f"mobile_{phone}"
            
            payment_method = MobilePaymentMethod(phone_number)
            
            result = gateway.process_payment(
                amount=amount,
                currency=currency,
                payment_method=payment_method,
                customer=None,
                merchant=None,
                metadata=metadata or {}
            )
            
            return result
            
        except Exception as e:
            logger.error(f"Mobile payment processing failed: {str(e)}")
            return {
                'success': False,
                'error': str(e)
            }

    @staticmethod
    def process_payout(merchant, amount):
        """
        Process a payout to a merchant
        Args:
            merchant: Merchant object
            amount: Payout amount
        Returns:
            dict: {'success': bool, 'transaction_id': str, 'error': str}
        """
        try:
            # Verify merchant has sufficient balance
            if merchant.balance < amount:
                return {
                    'success': False,
                    'error': 'Insufficient merchant balance'
                }
            
            # Create payout transaction
            txn = Transaction.objects.create(
                merchant=merchant,
                amount=amount,
                currency='USD',
                status=Transaction.PENDING,
                transaction_type=Transaction.PAYOUT
            )
            
            # Process payout via merchant's default payout method
            payout_method = merchant.default_payout_method
            if payout_method.method_type == PaymentMethod.BANK:
                result = PaymentService._process_bank_payout(merchant, amount)
            elif payout_method.method_type in PaymentMethod.MOBILE_MONEY_TYPES:
                result = PaymentService._process_mobile_payout(merchant, amount)
            else:
                raise ValueError(f"Unsupported payout method: {payout_method.method_type}")
            
            # Update transaction status
            if result['success']:
                txn.status = Transaction.COMPLETED
                merchant.balance -= amount
                merchant.save()
            else:
                txn.status = Transaction.FAILED
                
            txn.save()
            
            return {
                'success': True,
                'transaction_id': txn.id,
                'status': txn.status
            }
            
        except Exception as e:
            logger.error(f"Payout processing failed: {str(e)}")
            return {
                'success': False,
                'error': str(e)
            }
    
    @staticmethod
    def _process_bank_payout(merchant, amount, currency='GHS'):
        """
        Process bank transfer payout using BankTransferGateway
        """
        try:
            from payments.gateways.bank_transfer import BankTransferGateway

            gateway = BankTransferGateway()
            if not gateway.default_provider:
                return {'success': False, 'error': 'Bank transfer gateway not configured'}

            payout_method = merchant.default_payout_method
            bank_details = getattr(payout_method, 'details', {}) if payout_method else {}

            result = gateway.disburse_funds(
                amount=float(amount),
                currency=currency,
                bank_code=bank_details.get('bank_code', ''),
                account_number=bank_details.get('account_number', ''),
                account_name=bank_details.get('account_name', merchant.business_name),
                recipient_name=merchant.business_name,
                recipient_email=getattr(merchant, 'email', ''),
                metadata={
                    'type': 'merchant_payout',
                    'merchant_id': str(merchant.id),
                }
            )
            return result
        except Exception as e:
            logger.error(f"Bank payout failed: {str(e)}")
            return {'success': False, 'error': str(e)}
    
    @staticmethod
    def _process_mobile_payout(merchant, amount, currency='GHS'):
        """
        Process mobile money payout using mobile money gateway
        """
        try:
            from payments.gateways.mobile_money import (
                MTNMoMoGateway, TelecelCashGateway, AirtelTigoMoneyGateway, GMoneyGateway
            )

            payout_method = merchant.default_payout_method
            method_type = getattr(payout_method, 'method_type', 'mtn_momo') if payout_method else 'mtn_momo'
            phone_number = getattr(payout_method, 'details', {}).get('phone_number', '') if payout_method else ''

            gateway_map = {
                'mtn_momo': MTNMoMoGateway,
                'telecel': TelecelCashGateway,
                'airtel_tigo': AirtelTigoMoneyGateway,
                'g_money': GMoneyGateway,
            }

            gateway_class = gateway_map.get(method_type, MTNMoMoGateway)
            gateway = gateway_class()

            result = gateway.process_payment(
                amount=float(amount),
                currency=currency,
                phone_number=phone_number,
                customer=None,
                merchant=merchant,
                metadata={
                    'type': 'merchant_payout',
                    'merchant_id': str(merchant.id),
                }
            )
            return result
        except Exception as e:
            logger.error(f"Mobile payout failed: {str(e)}")
            return {'success': False, 'error': str(e)}

    @staticmethod
    def _check_user_kyc_eligibility(user):
        """
        Check if user is eligible to make transactions based on KYC status
        Returns dict with eligibility status and details
        """
        try:
            from users.models import Customer

            # Get customer profile
            customer = Customer.objects.get(user=user)

            # Record transaction attempt for analytics
            customer.record_transaction_attempt()

            # Check if user can make transactions
            if customer.can_make_transactions:
                return {
                    'eligible': True,
                    'message': 'User is verified and can make transactions'
                }
            else:
                # User needs verification
                return {
                    'eligible': False,
                    'error': 'KYC verification required before making transactions',
                    'kyc_status': customer.kyc_status,
                    'kyc_required': customer.needs_kyc_verification,
                    'next_action': 'start_kyc' if customer.kyc_status == 'not_started' else 'continue_kyc',
                    'transaction_attempts': customer.transaction_attempts_count
                }

        except Customer.DoesNotExist:
            return {
                'eligible': False,
                'error': 'Customer profile not found. Please complete registration.'
            }
        except Exception as e:
            logger.error(f"KYC eligibility check failed for user {user.id}: {str(e)}")
            return {
                'eligible': False,
                'error': 'Unable to verify user eligibility. Please try again.'
            }

    @transaction.atomic
    def process_bill_payment(self, user, bill_data):
        """
        Process bill payment with additional validation
        Args:
            user: User making payment
            bill_data: Dict containing bill payment details
        Returns: Payment object
        """
        from ..models import Payment
        from accounts.models import Customer
        
        # Validate required bill fields
        required_fields = ['bill_reference', 'bill_type', 'amount']
        if not all(field in bill_data for field in required_fields):
            raise ValueError(f'Missing required bill fields: {required_fields}')
        
        customer = Customer.objects.get(user=user)
        
        # Create bill payment
        payment = Payment.objects.create(
            customer=customer,
            amount=bill_data['amount'],
            bill_reference=bill_data['bill_reference'],
            bill_type=bill_data['bill_type'],
            bill_issuer=bill_data.get('bill_issuer'),
            bill_issuer_code=bill_data.get('bill_issuer_code'),
            due_date=bill_data.get('due_date'),
            late_fee=bill_data.get('late_fee', 0),
            status=Payment.PENDING
        )
        
        # Process payment based on method
        # (Implementation would vary based on payment gateway)
        payment.status = Payment.COMPLETED
        payment.save()
        
        return payment

    @staticmethod
    def process_p2p_payment(sender, recipient, amount, payment_method, description=''):
        """
        Process peer-to-peer payment between customers
        Args:
            sender: Customer sending money
            recipient: Customer receiving money
            amount: Payment amount
            payment_method: PaymentMethod object
            description: Optional payment description
        Returns: dict with success status and transaction details
        """
        try:
            from .fee_calculator import DynamicFeeCalculator
            from decimal import Decimal
            
            # Calculate P2P/domestic transfer fee using dynamic fee calculator
            fee_result = DynamicFeeCalculator.calculate_fee(
                fee_type='domestic_transfer',
                amount=Decimal(str(amount)),
                user=sender.user if hasattr(sender, 'user') else None,
                log_calculation=True,
                transaction_id=f"P2P-{sender.id}-{recipient.id}"
            )
            
            fee_amount = Decimal(str(fee_result.get('total_fee', 0))) if fee_result.get('success') else Decimal('0')
            total_amount = Decimal(str(amount)) + fee_amount
            
            # Validate sender has sufficient funds (simplified check)
            # In a real app, you'd check wallet balance or account balance
            if hasattr(sender, 'balance') and sender.balance < total_amount:
                return {
                    'success': False,
                    'error': 'Insufficient funds'
                }
            
            # Process payment based on method type
            if payment_method.method_type in PaymentMethod.MOBILE_MONEY_TYPES:
                result = PaymentService._process_mobile_payment(sender.phone_number, amount)
            elif payment_method.method_type == 'credit_card':
                # For P2P, card payments might be handled differently
                result = PaymentService._process_card_payment(None, amount)
            elif payment_method.method_type == 'bank_transfer':
                result = {'success': True, 'transaction_id': f"BANK-{int(time.time())}"}
            elif payment_method.method_type == PaymentMethod.SIKAREMIT_BALANCE:
                from payments.gateways.sikaremit_balance import SikaRemitBalanceGateway
                gateway = SikaRemitBalanceGateway()
                result = gateway.process_payment(
                    amount=amount,
                    currency='GHS',
                    payment_method=payment_method,
                    customer=sender,
                    merchant=recipient if hasattr(recipient, 'user') else None,
                    metadata={'type': 'p2p_transfer'}
                )
            else:
                return {
                    'success': False,
                    'error': f'Unsupported payment method for P2P: {payment_method.method_type}'
                }
            
            if result['success']:
                # Update balances (simplified - in real app, use proper transaction handling)
                if hasattr(sender, 'balance'):
                    sender.balance -= float(total_amount)  # Deduct amount + fee from sender
                    sender.save()
                if hasattr(recipient, 'balance'):
                    recipient.balance += float(amount)  # Recipient gets the original amount (no fee)
                    recipient.save()
                
                return {
                    'success': True,
                    'transaction_id': result.get('transaction_id', f"P2P-{int(time.time())}"),
                    'message': f'Successfully sent {amount} to {recipient.user.email}',
                    'fee_amount': float(fee_amount),
                    'fee_config_id': fee_result.get('fee_config_id')
                }
            else:
                return result
                
        except Exception as e:
            logger.error(f"P2P payment processing failed: {str(e)}")
            return {
                'success': False,
                'error': str(e)
            }
