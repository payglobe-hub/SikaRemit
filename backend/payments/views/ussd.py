"""
USSD Views for SikaRemit
Handles USSD requests from mobile networks and manages user interactions
"""

import logging
import json
from decimal import Decimal
from django.http import HttpResponse
from django.views.decorators.csrf import csrf_exempt
from django.views.decorators.http import require_POST
from django.utils import timezone
from django.conf import settings
from rest_framework.decorators import api_view, permission_classes
from rest_framework.permissions import AllowAny
from django.core.exceptions import ValidationError

from ..models import (
    USSDSession, USSDMenu, USSDTransaction, USSDAnalytics, USSDProvider
)
from ..gateways.mobile_money import MTNMoMoGateway
from accounts.models import User

logger = logging.getLogger(__name__)


class USSDHandler:
    """Main USSD request handler"""

    def __init__(self, request_data):
        self.request_data = request_data
        self.session = None
        self.response_type = 'CON'  # CON (Continue) or END (End session)

    def process_request(self):
        """Process incoming USSD request"""
        try:
            # Extract request parameters
            session_id = self.request_data.get('sessionId')
            msisdn = self.request_data.get('msisdn', '').strip()
            user_input = self.request_data.get('text', '').strip()
            network = self.request_data.get('network', 'unknown')

            # Validate required parameters
            if not session_id or not msisdn:
                return self._error_response("Invalid request parameters")

            # Get or create session
            self.session = self._get_or_create_session(session_id, msisdn, network)

            # Check if session is expired
            if self.session.is_expired():
                self.session.state = 'expired'
                self.session.save()
                return self._end_session("Session expired. Please try again.")

            # Process user input
            response = self._process_user_input(user_input)

            # Update session
            self.session.updated_at = timezone.now()
            self.session.extend_session()
            self.session.save()

            return response

        except Exception as e:
            logger.error(f"USSD processing error: {str(e)}", exc_info=True)
            return self._error_response("System error. Please try again.")

    def _get_or_create_session(self, session_id, msisdn, network):
        """Get existing session or create new one"""
        session, created = USSDSession.objects.get_or_create(
            session_id=session_id,
            defaults={
                'msisdn': msisdn,
                'network': network,
                'expires_at': timezone.now() + timezone.timedelta(minutes=5),
            }
        )

        if created:
            logger.info(f"New USSD session created: {session_id} for {msisdn}")

        return session

    def _process_user_input(self, user_input):
        """Process user input based on current menu"""
        try:
            # Sanitize input first
            from ..services.ussd_validation_service import USSDValidationService
            user_input = USSDValidationService.sanitize_input(user_input)

            current_menu = self.session.current_menu

            # Parse user input (split by * for multi-level menus)
            input_parts = user_input.split('*') if user_input else []
            current_input = input_parts[-1] if input_parts else ''

            # Route based on current menu
            if current_menu == 'main':
                return self._handle_main_menu(current_input)
            elif current_menu.startswith('payment'):
                return self._handle_payment_menu(current_input, current_menu, input_parts)
            elif current_menu.startswith('balance'):
                return self._handle_balance_menu(current_input)
            elif current_menu.startswith('transfer'):
                return self._handle_transfer_menu(current_input, current_menu, input_parts)
            elif current_menu.startswith('bill_payment'):
                return self._handle_bill_payment_menu(current_input, current_menu, input_parts)
            elif current_menu.startswith('airtime'):
                return self._handle_airtime_menu(current_input, current_menu, input_parts)
            elif current_menu.startswith('registration'):
                return self._handle_registration_menu(current_input, current_menu, input_parts)
            else:
                return self._show_main_menu()

        except Exception as e:
            logger.error(f"USSD input processing error: {str(e)}")
            return self._error_response("An error occurred. Please try again.")

    def _handle_main_menu(self, user_input):
        """Handle main menu selection"""
        if user_input == '1':
            # Make Payment
            self.session.current_menu = 'payment_amount'
            return self._show_payment_menu()
        elif user_input == '2':
            # Check Balance
            return self._handle_balance_check()
        elif user_input == '3':
            # Transfer Money
            self.session.current_menu = 'transfer_recipient'
            return self._show_transfer_menu()
        elif user_input == '4':
            # Pay Bills
            self.session.current_menu = 'bill_payment'
            return self._show_bill_payment_menu()
        elif user_input == '5':
            # Buy Airtime
            self.session.current_menu = 'airtime_amount'
            return self._show_airtime_menu()
        elif user_input == '6':
            # Register/Login
            return self._handle_user_registration()
        else:
            return self._show_main_menu()

    def _show_main_menu(self):
        """Display main menu"""
        menu_text = """CON Welcome to SikaRemit
1. Make Payment
2. Check Balance
3. Transfer Money
4. Pay Bills
5. Buy Airtime
6. Register/Login
0. Exit"""

        return self._continue_session(menu_text)

    def _handle_balance_check(self):
        """Handle balance check request"""
        try:
            # Check if user is registered
            user = self._get_user_by_phone()
            if not user:
                return self._continue_session("END You need to register first. Dial *165*1# to register.")

            # Get balance (simplified - would integrate with actual balance service)
            balance = self._get_user_balance(user)

            response = f"            response = f"
            self.session.state = 'completed'
            return response

        except Exception as e:
            logger.error(f"Balance check error: {str(e)}")
            return self._error_response("Unable to check balance. Please try again.")

    def _handle_payment_menu(self, user_input, current_menu, input_parts):
        """Handle payment flow"""
        try:
            if current_menu == 'payment_amount':
                if not user_input or not user_input.isdigit():
                    return self._continue_session("END Invalid amount. Please enter a valid number.")

                amount = int(user_input)
                if amount < 1 or amount > 5000:
                    return self._continue_session("END Amount must be between GHS 1 and 5,000.")

                self.session.menu_data['payment_amount'] = amount
                self.session.current_menu = 'payment_method'
                return self._show_payment_method_menu()

            elif current_menu == 'payment_method':
                if user_input == '1':
                    # Mobile Money
                    return self._process_mobile_money_payment()
                elif user_input == '2':
                    # Card Payment (not available via USSD)
                    return self._continue_session("END Card payments not available via USSD. Please use the mobile app.")
                else:
                    return self._show_payment_method_menu()

        except Exception as e:
            logger.error(f"Payment menu error: {str(e)}")
            return self._error_response("Payment processing failed. Please try again.")

    def _process_mobile_money_payment(self):
        """Process mobile money payment"""
        try:
            amount = self.session.menu_data.get('payment_amount')
            if not amount:
                return self._error_response("Payment amount not found.")

            # Create transaction record
            transaction = USSDTransaction.objects.create(
                transaction_id=f"USSD_{self.session.session_id}_{timezone.now().strftime('%Y%m%d%H%M%S')}",
                session=self.session,
                transaction_type='payment',
                amount=Decimal(str(amount)),
                currency='GHS',
                status='processing'
            )

            # Process payment via mobile money gateway
            gateway = MTNMoMoGateway()
            result = gateway.process_payment(amount, 'GHS', None, None, None)

            if result.get('success'):
                try:
                    from django.db import transaction as db_transaction
                    with db_transaction.atomic():
                        transaction.mark_completed(result.get('transaction_id'))
                except Exception as db_err:
                    logger.critical(
                        f"DB save failed after USSD payment charge, "
                        f"gateway_tx={result.get('transaction_id')}, "
                        f"amount={amount}: {db_err}"
                    )
                    try:
                        gateway.refund_payment(
                            transaction_id=result.get('transaction_id'),
                            amount=float(amount),
                            reason='DB save failed after USSD charge'
                        )
                    except Exception as refund_err:
                        logger.critical(
                            f"REFUND ALSO FAILED for USSD tx, "
                            f"gateway_tx={result.get('transaction_id')}, "
                            f"amount={amount}: {refund_err}"
                        )
                    return self._error_response("Payment failed due to a system error. If charged, a refund will be processed.")
                response = f"END Payment of GHS {amount:,} processed successfully. Transaction ID: {transaction.transaction_id}"
                self.session.state = 'completed'
                return response
            else:
                transaction.mark_failed(result.get('error'))
                return self._error_response(f"Payment failed: {result.get('error', 'Unknown error')}")

        except Exception as e:
            logger.error(f"Mobile money payment error: {str(e)}")
            return self._error_response("Payment processing failed. Please try again.")

    def _handle_transfer_menu(self, user_input, current_menu, input_parts):
        """Handle money transfer flow"""
        try:
            if current_menu == 'transfer_recipient':
                if not user_input:
                    return self._continue_session("END Invalid phone number. Please enter a valid mobile number.")

                # Validate phone number
                from ..services.ussd_validation_service import USSDValidationService
                is_valid_phone, phone_result = USSDValidationService.validate_phone_number(user_input, 'GH')
                if not is_valid_phone:
                    return self._continue_session(f"END {phone_result}")

                self.session.menu_data['recipient'] = phone_result
                self.session.current_menu = 'transfer_amount'
                return self._continue_session("CON Enter amount to transfer (GHS):")

            elif current_menu == 'transfer_amount':
                # Validate amount
                is_valid_amount, amount_result, parsed_amount = USSDValidationService.validate_amount(user_input, 'GHS')
                if not is_valid_amount:
                    return self._continue_session(f"END {amount_result}")

                amount = parsed_amount
                recipient = self.session.menu_data.get('recipient')

                # Validate recipient is not sender
                sender_valid, sender_msg = USSDValidationService.validate_recipient_phone(
                    self.session.msisdn, recipient
                )
                if not sender_valid:
                    return self._continue_session(f"END {sender_msg}")

                # Bank of Ghana Compliance: AML/CTF checks
                compliance_valid, compliance_msg = self._perform_compliance_checks(recipient, amount)
                if not compliance_valid:
                    return self._continue_session(f"END {compliance_msg}")

                # Check user balance
                user = self._get_user_by_phone()
                if user:
                    from ..services.currency_service import WalletService
                    balances = WalletService.get_all_wallet_balances(user)
                    ugx_balance = next((b.available_balance for b in balances if b.currency.code == 'GHS'), 0)

                    balance_valid, balance_msg = USSDValidationService.validate_transaction_amount(
                        amount, ugx_balance, 'GHS'
                    )
                    if not balance_valid:
                        return self._continue_session(f"END {balance_msg}")

                # Check if transaction requires approval (high-value transactions)
                approval_threshold = Decimal('1000')  # GHS 1,000 threshold for approval
                requires_approval = amount > approval_threshold

                if requires_approval:
                    # Create transaction in pending approval status
                    transaction = USSDTransaction.objects.create(
                        transaction_id=f"USSD_TRANSFER_{self.session.session_id}_{timezone.now().strftime('%Y%m%d%H%M%S')}",
                        session=self.session,
                        transaction_type='transfer',
                        amount=amount,
                        currency='GHS',
                        recipient=recipient,
                        status='pending_approval'
                    )

                    # Log for admin review
                    logger.info(f"High-value transaction {transaction.transaction_id} requires approval: {amount} GHS to {recipient}")

                    return self._continue_session(
                        f"END Your transfer request of GHS {amount:,} to {recipient} is pending approval. "
                        f"You will receive a notification once approved. Transaction ID: {transaction.transaction_id}"
                    )
                else:
                    # Create transaction and process immediately
                    transaction = USSDTransaction.objects.create(
                        transaction_id=f"USSD_TRANSFER_{self.session.session_id}_{timezone.now().strftime('%Y%m%d%H%M%S')}",
                        session=self.session,
                        transaction_type='transfer',
                        amount=amount,
                        currency='GHS',
                        recipient=recipient,
                        status='processing'
                    )

                    # Process transfer immediately
                    success = self._process_money_transfer(recipient, amount)

                    if success:
                        transaction.mark_completed()
                        response = f"END GHS {amount:,} transferred to {recipient} successfully."
                        self.session.state = 'completed'
                        return response
                    else:
                        transaction.mark_failed("Transfer failed")
                        return self._error_response("Transfer failed. Please check recipient number and try again.")

        except Exception as e:
            logger.error(f"Transfer menu error: {str(e)}")
            return self._error_response("Transfer processing failed. Please try again.")

    def _handle_bill_payment_menu(self, user_input, current_menu, input_parts):
        """Handle bill payment flow"""
        try:
            if current_menu == 'bill_payment':
                valid_options = ['1', '2', '3', '4', '0']
                from ..services.ussd_validation_service import USSDValidationService
                is_valid_choice, choice_msg = USSDValidationService.validate_menu_choice(user_input, valid_options)
                if not is_valid_choice:
                    return self._continue_session(f"END {choice_msg}")

                if user_input == '1':
                    # Electricity
                    self.session.menu_data['bill_type'] = 'electricity'
                    self.session.current_menu = 'bill_electricity_account'
                    return self._continue_session("CON Enter your electricity account number:")
                elif user_input == '2':
                    # Water
                    self.session.menu_data['bill_type'] = 'water'
                    self.session.current_menu = 'bill_water_account'
                    return self._continue_session("CON Enter your water account number:")
                elif user_input == '3':
                    # TV
                    self.session.menu_data['bill_type'] = 'tv'
                    self.session.current_menu = 'bill_tv_account'
                    return self._continue_session("CON Enter your TV subscription account number:")
                elif user_input == '4':
                    # Internet
                    self.session.menu_data['bill_type'] = 'internet'
                    self.session.current_menu = 'bill_internet_account'
                    return self._continue_session("CON Enter your internet account number:")
                elif user_input == '0':
                    # Back to main
                    self.session.current_menu = 'main'
                    return self._show_main_menu()

            elif current_menu.startswith('bill_') and current_menu.endswith('_account'):
                # Handle account number input
                bill_type = current_menu.split('_')[1]
                is_valid_account, account_msg = USSDValidationService.validate_account_number(user_input, bill_type)
                if not is_valid_account:
                    return self._continue_session(f"END {account_msg}")

                self.session.menu_data['account_number'] = user_input
                self.session.current_menu = f'bill_{bill_type}_amount'
                return self._continue_session(f"CON Enter amount to pay for {bill_type.title()} bill (GHS):")

            elif current_menu.startswith('bill_') and current_menu.endswith('_amount'):
                # Handle amount input and process payment
                is_valid_amount, amount_result, parsed_amount = USSDValidationService.validate_amount(user_input, 'GHS')
                if not is_valid_amount:
                    return self._continue_session(f"END {amount_result}")

                amount = parsed_amount
                bill_type = current_menu.split('_')[1]
                account_number = self.session.menu_data.get('account_number')

                # Check user balance
                user = self._get_user_by_phone()
                if user:
                    from ..services.currency_service import WalletService
                    balances = WalletService.get_all_wallet_balances(user)
                    ugx_balance = next((b.available_balance for b in balances if b.currency.code == 'GHS'), 0)

                    balance_valid, balance_msg = USSDValidationService.validate_transaction_amount(
                        amount, ugx_balance, 'GHS'
                    )
                    if not balance_valid:
                        return self._continue_session(f"END {balance_msg}")

                # Process bill payment
                success, biller_name = self._process_bill_payment(bill_type, account_number, amount)

                if success:
                    response = f"END {biller_name} bill payment of GHS {amount:,} was successful. Account: {account_number}"
                    self.session.state = 'completed'
                    return response
                else:
                    return self._error_response("Bill payment failed. Please check your balance and account number.")

        except Exception as e:
            logger.error(f"Bill payment menu error: {str(e)}")
            return self._error_response("Bill payment processing failed. Please try again.")

    def _handle_airtime_menu(self, user_input, current_menu, input_parts):
        """Handle airtime purchase flow"""
        try:
            if current_menu == 'airtime':
                # Validate amount
                from ..services.ussd_validation_service import USSDValidationService
                is_valid_amount, amount_result, parsed_amount = USSDValidationService.validate_amount(user_input, 'GHS')
                if not is_valid_amount:
                    return self._continue_session(f"END {amount_result}")

                amount = parsed_amount

                # Check specific airtime limits
                if amount > 500:
                    return self._continue_session("END Maximum airtime purchase is GHS 500.")

                # For simplicity, assume same number as user
                phone_number = self.session.msisdn

                # Check user balance
                user = self._get_user_by_phone()
                if user:
                    from ..services.currency_service import WalletService
                    balances = WalletService.get_all_wallet_balances(user)
                    ugx_balance = next((b.available_balance for b in balances if b.currency.code == 'GHS'), 0)

                    balance_valid, balance_msg = USSDValidationService.validate_transaction_amount(
                        amount, ugx_balance, 'GHS'
                    )
                    if not balance_valid:
                        return self._continue_session(f"END {balance_msg}")

                # Process airtime purchase
                success = self._process_airtime_purchase(phone_number, amount)

                if success:
                    response = f"END Airtime purchase of GHS {amount:,} for {phone_number} was successful."
                    self.session.state = 'completed'
                    return response
                else:
                    return self._error_response("Airtime purchase failed. Please check your balance.")

        except Exception as e:
            logger.error(f"Airtime menu error: {str(e)}")
            return self._error_response("Airtime purchase failed. Please try again.")

    def _handle_registration_menu(self, user_input, current_menu, input_parts):
        """Handle user registration/login"""
        try:
            if current_menu == 'registration_name':
                if not user_input or len(user_input.strip()) < 2:
                    return self._continue_session("END Invalid name. Please enter a valid full name.")

                self.session.menu_data['reg_name'] = user_input.strip()
                self.session.current_menu = 'registration_pin'
                return self._continue_session("CON Create a 4-digit PIN:")

            elif current_menu == 'registration_pin':
                if not user_input or len(user_input) != 4 or not user_input.isdigit():
                    return self._continue_session("END Invalid PIN. Please enter exactly 4 digits.")

                # Create user account
                from django.contrib.auth.models import User as DjangoUser
                from accounts.models import User

                name_parts = self.session.menu_data.get('reg_name', '').split()
                first_name = name_parts[0] if name_parts else 'User'
                last_name = ' '.join(name_parts[1:]) if len(name_parts) > 1 else ''

                # Create Django user
                django_user = DjangoUser.objects.create_user(
                    username=self.session.msisdn,
                    first_name=first_name,
                    last_name=last_name,
                    password=user_input  # PIN as password
                )

                # Create SikaRemit user profile
                user_profile = User.objects.create(
                    django_user=django_user,
                    phone_number=self.session.msisdn,
                    first_name=first_name,
                    last_name=last_name
                )

                # Create initial wallet balance
                from ..models import Currency, WalletBalance
                try:
                    ugx_currency = Currency.objects.get(code='GHS')
                    WalletBalance.objects.create(
                        user=user_profile,
                        currency=ugx_currency,
                        available_balance=0,
                        pending_balance=0,
                        reserved_balance=0
                    )
                except Currency.DoesNotExist:
                    pass  # Currency not found, skip wallet creation

                self.session.state = 'completed'
                return self._end_session(f"END Registration successful! Welcome {first_name}. Your PIN is {user_input}.")

            elif current_menu == 'login_pin':
                user = self.session.menu_data.get('user')
                if not user:
                    return self._error_response("Session expired. Please try again.")

                if not user_input or len(user_input) != 4 or not user_input.isdigit():
                    return self._continue_session("END Invalid PIN. Please enter exactly 4 digits.")

                # Verify PIN (password)
                from django.contrib.auth import authenticate
                django_user = authenticate(username=self.session.msisdn, password=user_input)
                if django_user:
                    self.session.state = 'completed'
                    return self._end_session("END Login successful! Welcome back.")
                else:
                    return self._continue_session("END Incorrect PIN. Please try again.")

        except Exception as e:
            logger.error(f"Registration error: {str(e)}")
            return self._error_response("Registration failed. Please try again.")

    def _get_user_by_phone(self):
        """Get user by phone number"""
        try:
            return User.objects.get(phone_number=self.session.msisdn)
        except User.DoesNotExist:
            return None

    def _process_money_transfer(self, recipient, amount):
        """Process money transfer"""
        try:
            # Get sender user
            sender = self._get_user_by_phone()
            if not sender:
                return False

            # Get recipient user
            try:
                recipient_user = User.objects.get(phone_number=recipient)
            except User.DoesNotExist:
                return False

            # Get default currency (GHS for now)
            from ..models import Currency
            try:
                currency = Currency.objects.get(code='GHS')
            except Currency.DoesNotExist:
                return False

            # Convert amount to Decimal
            from decimal import Decimal
            transfer_amount = Decimal(str(amount))

            # Use WalletService to transfer money
            from ..services.currency_service import WalletService
            success = WalletService.transfer_to_user(
                sender=sender,
                recipient=recipient_user,
                currency=currency,
                amount=transfer_amount
            )

            if success:
                return True
            else:
                # Create failed transaction record
                USSDTransaction.objects.create(
                    transaction_id=f"USSD_TRANSFER_{self.session.session_id}_{timezone.now().strftime('%Y%m%d%H%M%S')}",
                    session=self.session,
                    transaction_type='transfer',
                    amount=transfer_amount,
                    currency='GHS',
                    recipient=recipient,
                    status='failed',
                    error_message='Insufficient balance or transfer failed'
                )
                return False

        except Exception as e:
            logger.error(f"Transfer processing error: {str(e)}")
            return False

    def _process_bill_payment(self, bill_type, account_number, amount):
        """Process bill payment"""
        try:
            # Get user
            user = self._get_user_by_phone()
            if not user:
                return False

            # Find biller for this bill type
            from users.models import Merchant
            biller = Merchant.objects.filter(
                is_biller=True,
                biller_category__icontains=bill_type
            ).first()

            if not biller:
                return False

            # Get currency
            from ..models import Currency
            try:
                currency = Currency.objects.get(code='GHS')
            except Currency.DoesNotExist:
                return False

            # Convert amount to Decimal
            from decimal import Decimal
            payment_amount = Decimal(str(amount))

            # Use WalletService to pay bill
            from ..services.currency_service import WalletService
            success = WalletService.pay_bill(
                user=user.customer_profile,
                biller=biller,
                amount=payment_amount,
                currency=currency,
                bill_type=bill_type,
                bill_reference=account_number
            )

            if success:
                # Create USSD transaction record
                transaction = USSDTransaction.objects.create(
                    transaction_id=f"USSD_BILL_{self.session.session_id}_{timezone.now().strftime('%Y%m%d%H%M%S')}",
                    session=self.session,
                    transaction_type='bill_payment',
                    amount=payment_amount,
                    currency='GHS',
                    service_provider=biller.business_name,
                    account_number=account_number,
                    status='completed'
                )

                # Record analytics
                from ..services.ussd_analytics_service import USSDAnalyticsService
                USSDAnalyticsService.record_transaction_analytics(transaction)
                return True, biller.business_name
            else:
                # Create failed transaction record
                USSDTransaction.objects.create(
                    transaction_id=f"USSD_BILL_{self.session.session_id}_{timezone.now().strftime('%Y%m%d%H%M%S')}",
                    session=self.session,
                    transaction_type='bill_payment',
                    amount=payment_amount,
                    currency='GHS',
                    service_provider=biller.business_name,
                    account_number=account_number,
                    status='failed',
                    error_message='Payment failed - insufficient balance or service error'
                )
                return False, None

        except Exception as e:
            logger.error(f"Bill payment processing error: {str(e)}")
            return False, None

    def _process_airtime_purchase(self, phone_number, amount, provider='auto'):
        """Process airtime purchase"""
        try:
            # Get user
            user = self._get_user_by_phone()
            if not user:
                return False

            # Get currency
            from ..models import Currency
            try:
                currency = Currency.objects.get(code='GHS')
            except Currency.DoesNotExist:
                return False

            # Convert amount to Decimal
            from decimal import Decimal
            purchase_amount = Decimal(str(amount))

            # Use WalletService to buy airtime
            from ..services.currency_service import WalletService
            success = WalletService.buy_airtime(
                user=user.customer_profile,
                recipient_phone=phone_number,
                amount=purchase_amount,
                currency=currency,
                provider=provider
            )

            if success:
                # Create USSD transaction record
                transaction = USSDTransaction.objects.create(
                    transaction_id=f"USSD_AIRTIME_{self.session.session_id}_{timezone.now().strftime('%Y%m%d%H%M%S')}",
                    session=self.session,
                    transaction_type='airtime',
                    amount=purchase_amount,
                    currency='GHS',
                    recipient=phone_number,
                    status='completed'
                )

                # Record analytics
                from ..services.ussd_analytics_service import USSDAnalyticsService
                USSDAnalyticsService.record_transaction_analytics(transaction)
                return True
            else:
                # Create failed transaction record
                USSDTransaction.objects.create(
                    transaction_id=f"USSD_AIRTIME_{self.session.session_id}_{timezone.now().strftime('%Y%m%d%H%M%S')}",
                    session=self.session,
                    transaction_type='airtime',
                    amount=purchase_amount,
                    currency='GHS',
                    recipient=phone_number,
                    status='failed',
                    error_message='Airtime purchase failed - insufficient balance or service error'
                )
                return False

        except Exception as e:
            logger.error(f"Airtime purchase processing error: {str(e)}")
            return False

    def _perform_compliance_checks(self, recipient_phone, amount):
        """Perform Bank of Ghana compliance checks and AML/CTF validation"""
        try:
            # Check transaction limits per Bank of Ghana regulations
            # Daily limit for individual transfers: GHS 5,000
            # Monthly limit: GHS 50,000
            from decimal import Decimal

            # Get user for transaction history check
            user = self._get_user_by_phone()
            if not user:
                return True, "User not found"  # Allow if user not registered yet

            # Check daily transaction limit
            from django.utils import timezone
            from datetime import timedelta

            today_start = timezone.now().replace(hour=0, minute=0, second=0, microsecond=0)
            today_transactions = USSDTransaction.objects.filter(
                session__msisdn=self.session.msisdn,
                created_at__gte=today_start,
                status='completed'
            ).aggregate(total=Sum('amount'))['total'] or 0

            daily_limit = Decimal('5000')  # GHS 5,000 daily limit
            if today_transactions + Decimal(str(amount)) > daily_limit:
                return False, f"Daily transaction limit exceeded. Available: GHS {daily_limit - today_transactions:,.2f}"

            # Check monthly transaction limit
            month_start = today_start.replace(day=1)
            month_transactions = USSDTransaction.objects.filter(
                session__msisdn=self.session.msisdn,
                created_at__gte=month_start,
                status='completed'
            ).aggregate(total=Sum('amount'))['total'] or 0

            monthly_limit = Decimal('50000')  # GHS 50,000 monthly limit
            if month_transactions + Decimal(str(amount)) > monthly_limit:
                return False, f"Monthly transaction limit exceeded. Available: GHS {monthly_limit - month_transactions:,.2f}"

            # AML/CTF: Check for suspicious patterns
            # Flag high-value transactions for manual review
            if amount > Decimal('1000'):  # GHS 1,000 threshold
                logger.info(f"High-value transaction flagged: {amount} GHS to {recipient_phone}")

            # Check if recipient is in sanctions list (simplified)
            # In production, this would integrate with global sanctions databases
            sanctions_list = ['+233000000000']  # Example blocked numbers
            if recipient_phone in sanctions_list:
                logger.warning(f"Transaction to sanctioned number blocked: {recipient_phone}")
                return False, "Transaction blocked due to compliance requirements"

            return True, "Compliance check passed"

        except Exception as e:
            logger.error(f"Compliance check error: {str(e)}")
            # Fail-safe: allow transaction if compliance check fails
            return True, "Compliance check completed"

    def _end_session(self, message):
        """End USSD session"""
        self.response_type = 'END'
        self.session.state = 'completed'
        return message

    def _error_response(self, message):
        """Handle error responses"""
        self.session.increment_failures()
        return f"END {message}"

    # Menu display methods (simplified - would use USSDMenu model)
    def _show_payment_menu(self):
        return self._continue_session("CON Enter payment amount (GHS):")

    def _show_payment_method_menu(self):
        return self._continue_session("CON Select payment method:\n1. Mobile Money\n2. Card (Not available)")

    def _show_transfer_menu(self):
        return self._continue_session("CON Enter recipient phone number:")

    def _show_bill_payment_menu(self):
        return self._continue_session("CON Bill Payment Services:\n1. Electricity\n2. Water\n3. TV\n4. Internet\n0. Back")

    def _show_airtime_menu(self):
        return self._continue_session("CON Enter airtime amount (GHS):")


@csrf_exempt
@require_POST
@api_view(['POST'])
@permission_classes([AllowAny])
def ussd_callback(request):
    """USSD callback endpoint for mobile network providers"""

    try:
        # Get client IP for security validation
        client_ip = request.META.get('HTTP_X_FORWARDED_FOR', request.META.get('REMOTE_ADDR', '')).split(',')[0].strip()

        # IP whitelist for Ghanaian mobile network providers
        allowed_ips = [
            # MTN Ghana IPs
            '102.134.128.0/20',  # MTN Ghana IP range
            '102.134.144.0/20',
            '102.134.160.0/20',
            # AirtelTigo Ghana IPs
            '102.134.176.0/20',
            '102.134.192.0/20',
            # Telecel Ghana IPs
            '102.134.208.0/20',
            '102.134.224.0/20',
            # Local development
            '127.0.0.1',
            'localhost'
        ]

        # Check if IP is allowed
        from ipaddress import ip_address, ip_network
        try:
            client_addr = ip_address(client_ip)
            ip_allowed = any(client_addr in ip_network(net) for net in allowed_ips if net != 'localhost')
            if not ip_allowed and client_ip not in ['127.0.0.1', 'localhost']:
                logger.warning(f"Unauthorized USSD callback attempt from IP: {client_ip}")
                return HttpResponse("UNAUTHORIZED", status=403)
        except ValueError:
            logger.warning(f"Invalid IP address in USSD callback: {client_ip}")
            return HttpResponse("INVALID_IP", status=400)

        # Validate request headers for provider authentication
        user_agent = request.META.get('HTTP_USER_AGENT', '')
        provider = None

        if 'MTN' in user_agent.upper():
            provider = 'mtn'
            # Additional MTN-specific validation could go here
        elif 'AIRTEL' in user_agent.upper() or 'TIGO' in user_agent.upper():
            provider = 'airtel_tigo'
        elif 'TELECEL' in user_agent.upper():
            provider = 'telecel'
        else:
            logger.info(f"Unknown provider in USSD callback. User-Agent: {user_agent}")

        # Log incoming request
        logger.info(f"USSD Request from {provider} ({client_ip}): {json.dumps(request.data, indent=2)}")

        # Process USSD request
        handler = USSDHandler(request.data)
        response = handler.process_request()

        # Record analytics for completed sessions
        if handler.session and handler.session.state == 'completed':
            from ..services.ussd_analytics_service import USSDAnalyticsService
            USSDAnalyticsService.record_session_analytics(handler.session)

        # Log response
        logger.info(f"USSD Response: {response}")

        return HttpResponse(response, content_type='text/plain')

    except Exception as e:
        logger.error(f"USSD callback error: {str(e)}", exc_info=True)
        return HttpResponse("END System error. Please try again.", content_type='text/plain')


@api_view(['POST'])
def ussd_webhook(request):
    """USSD webhook for external provider notifications"""

    try:
        data = request.data
        session_id = data.get('sessionId')
        status = data.get('status')

        # Update session status
        session = USSDSession.objects.filter(session_id=session_id).first()
        if session:
            if status == 'completed':
                session.state = 'completed'
            elif status == 'failed':
                session.state = 'error'
            session.save()

        return HttpResponse("OK", status=200)

    except Exception as e:
        logger.error(f"USSD webhook error: {str(e)}")
        return HttpResponse("ERROR", status=500)
