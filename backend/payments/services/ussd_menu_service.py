"""
USSD Menu System for SikaRemit
Manages menu definitions, navigation, and user interaction flows
"""

import json
from django.utils import timezone
from ..models.ussd import USSDMenu, USSDSession

class USSDMenuManager:
    """Manages USSD menus and navigation"""

    @staticmethod
    def get_menu(menu_type, language='en'):
        """Get menu by type and language"""
        try:
            menu = USSDMenu.objects.get(
                menu_type=menu_type,
                language=language,
                is_active=True
            )
            return menu
        except USSDMenu.DoesNotExist:
            # Return default English menu
            return USSDMenu.objects.filter(
                menu_type=menu_type,
                is_default=True,
                is_active=True
            ).first()

    @staticmethod
    def create_default_menus():
        """Create default USSD menus"""

        menus_data = [
            {
                'menu_id': 'main_menu',
                'menu_type': 'main',
                'title': 'SikaRemit Ghana Main Menu',
                'content': 'Welcome to SikaRemit Ghana - Your Mobile Money Solution',
                'options': [
                    {'input': '1', 'text': 'Make Payment', 'action': 'payment'},
                    {'input': '2', 'text': 'Check Balance', 'action': 'balance'},
                    {'input': '3', 'text': 'Transfer Money', 'action': 'transfer'},
                    {'input': '4', 'text': 'Pay Bills', 'action': 'bill_payment'},
                    {'input': '5', 'text': 'Buy Airtime', 'action': 'airtime'},
                    {'input': '6', 'text': 'Check Transaction Status', 'action': 'transaction_status'},
                    {'input': '7', 'text': 'Register/Login', 'action': 'registration'},
                    {'input': '0', 'text': 'Exit', 'action': 'exit'}
                ],
                'is_default': True
            },
            {
                'menu_id': 'payment_menu',
                'menu_type': 'payment',
                'title': 'Make Payment',
                'content': 'Enter payment details',
                'options': [],
                'is_default': True
            },
            {
                'menu_id': 'payment_method_menu',
                'menu_type': 'payment',
                'title': 'Select Payment Method',
                'content': 'Choose how to pay',
                'options': [
                    {'input': '1', 'text': 'Mobile Money', 'action': 'mobile_money'},
                    {'input': '2', 'text': 'Card Payment', 'action': 'card'},
                    {'input': '0', 'text': 'Back', 'action': 'back'}
                ],
                'is_default': True
            },
            {
                'menu_id': 'balance_menu',
                'menu_type': 'balance',
                'title': 'Account Balance',
                'content': 'Your SikaRemit balance',
                'options': [],
                'is_default': True
            },
            {
                'menu_id': 'transfer_menu',
                'menu_type': 'transfer',
                'title': 'Transfer Money',
                'content': 'Send money to another number',
                'options': [],
                'is_default': True
            },
            {
                'menu_id': 'bill_payment_menu',
                'menu_type': 'bill_payment',
                'title': 'Bill Payment Services',
                'content': 'Pay your bills conveniently',
                'options': [
                    {'input': '1', 'text': 'Electricity', 'action': 'electricity'},
                    {'input': '2', 'text': 'Water', 'action': 'water'},
                    {'input': '3', 'text': 'TV Subscription', 'action': 'tv'},
                    {'input': '4', 'text': 'Internet', 'action': 'internet'},
                    {'input': '0', 'text': 'Back', 'action': 'back'}
                ],
                'is_default': True
            },
            {
                'menu_id': 'airtime_menu',
                'menu_type': 'airtime',
                'title': 'Buy Airtime',
                'content': 'Purchase airtime for yourself or others',
                'options': [],
                'is_default': True
            },
            {
                'menu_id': 'registration_menu',
                'menu_type': 'registration',
                'title': 'User Registration',
                'content': 'Register for SikaRemit services',
                'options': [],
                'is_default': True
            }
        ]

        for menu_data in menus_data:
            USSDMenu.objects.get_or_create(
                menu_id=menu_data['menu_id'],
                defaults=menu_data
            )

    @staticmethod
    def render_menu(session, menu_type='main'):
        """Render menu for display"""
        menu = USSDMenuManager.get_menu(menu_type, session.language)

        if not menu:
            return "END Menu not available. Please try again."

        # Build menu text
        menu_text = f"CON {menu.content}\n"

        for option in menu.options:
            menu_text += f"{option['input']}. {option['text']}\n"

        return menu_text

    @staticmethod
    def process_menu_selection(session, user_input):
        """Process user menu selection"""
        current_menu = USSDMenuManager.get_menu(session.current_menu, session.language)

        if not current_menu:
            return "END Invalid menu. Please try again."

        # Find selected option
        selected_option = None
        for option in current_menu.options:
            if str(option.get('input')) == str(user_input):
                selected_option = option
                break

        if not selected_option:
            return "END Invalid selection. Please try again."

        action = selected_option.get('action')

        # Route to appropriate handler
        if action == 'exit':
            session.state = 'completed'
            session.save()
            return "END Thank you for using SikaRemit!"
        elif action == 'back':
            # Navigate to parent menu or main menu
            if current_menu.parent_menu:
                session.current_menu = current_menu.parent_menu.menu_type
            else:
                session.current_menu = 'main'
            session.save()
            return USSDMenuManager.render_menu(session, session.current_menu)
        elif action == 'payment':
            session.current_menu = 'payment'
            session.save()
            return USSDMenuManager.render_menu(session, 'payment')
        elif action == 'balance':
            return USSDMenuManager.handle_balance_check(session)
        elif action == 'transfer':
            session.current_menu = 'transfer'
            session.save()
            return USSDMenuManager.render_menu(session, 'transfer')
        elif action == 'bill_payment':
            session.current_menu = 'bill_payment'
            session.save()
            return USSDMenuManager.render_menu(session, 'bill_payment')
        elif action == 'airtime':
            session.current_menu = 'airtime'
            session.save()
            return USSDMenuManager.render_menu(session, 'airtime')
        elif action == 'transaction_status':
            session.current_menu = 'transaction_status'
            session.save()
            return USSDMenuManager.handle_transaction_status_check(session)
        elif action == 'mobile_money':
            return USSDMenuManager.handle_mobile_money_payment(session)
        elif action in ['electricity', 'water', 'tv', 'internet']:
            return USSDMenuManager.handle_bill_payment(session, action)
        else:
            return USSDMenuManager.render_menu(session, 'main')

    @staticmethod
    def handle_transaction_status_check(session):
        """Handle transaction status checking"""
        try:
            # Get user by phone number
            user = USSDSessionManager.get_user_by_msisdn(session.msisdn)
            if not user:
                return "END You need to register first. Dial *165*1# to register."

            # Get recent transactions (last 7 days)
            from datetime import timedelta
            from django.utils import timezone
            from ..models import USSDTransaction

            week_ago = timezone.now() - timedelta(days=7)
            recent_transactions = USSDTransaction.objects.filter(
                session__msisdn=session.msisdn,
                created_at__gte=week_ago
            ).order_by('-created_at')[:5]  # Last 5 transactions

            if not recent_transactions:
                session.state = 'completed'
                session.save()
                return "END No recent transactions found. Make a transaction to see status updates."

            # Check for pending approvals first
            pending_approvals = recent_transactions.filter(status='pending_approval')

            if pending_approvals.exists():
                pending_list = []
                for txn in pending_approvals[:3]:  # Show up to 3 pending
                    pending_list.append(f"ID: {txn.transaction_id[-8:]}\nAmount: GHS {txn.amount:,}\nType: {txn.get_transaction_type_display()}")

                pending_text = "\n\n".join(pending_list)
                session.state = 'completed'
                session.save()
                return f"END You have pending approvals:\n\n{pending_text}\n\nYou will receive notification when approved."

            # Show recent transaction statuses
            status_list = []
            for txn in recent_transactions[:3]:  # Show up to 3 recent
                status_emoji = {
                    'completed': '✅',
                    'pending_approval': '⏳',
                    'approved': '✅',
                    'rejected': '❌',
                    'failed': '❌'
                }.get(txn.status, '❓')

                status_list.append(f"{status_emoji} {txn.transaction_id[-8:]}\nGHS {txn.amount:,} - {txn.get_status_display()}")

            status_text = "\n\n".join(status_list)
            session.state = 'completed'
            session.save()
            return f"END Recent Transactions:\n\n{status_text}"

        except Exception as e:
            logger.error(f"Transaction status check error: {str(e)}")
            return "END Unable to check transaction status. Please try again."

    @staticmethod
    def handle_balance_check(session):
        """Handle balance check"""
        try:
            # Get user by phone number
            user = USSDSessionManager.get_user_by_msisdn(session.msisdn)
            if not user:
                return "END You need to register first. Dial *165*1# to register."

            # Get user's wallet balances
            from .currency_service import WalletService, CurrencyPreferenceService
            balances = WalletService.get_all_wallet_balances(user)

            if not balances:
                return "END Your wallet has no balances. Add funds to get started."

            # Get user preferences for formatting
            preferences = CurrencyPreferenceService.get_user_preferences(user)

            # Format balance information
            balance_lines = []
            total_value = 0

            for balance in balances:
                if balance.available_balance > 0:
                    formatted = balance.currency.format_amount(
                        balance.available_balance,
                        preferences
                    )
                    balance_lines.append(f"{balance.currency.code}: {formatted}")

                    # Convert to display currency for total
                    if preferences.display_currency and balance.currency != preferences.display_currency:
                        converted = balance.currency.convert_amount(
                            balance.available_balance,
                            balance.currency,
                            preferences.display_currency
                        )
                        if converted:
                            total_value += converted
                    else:
                        total_value += balance.available_balance

            if not balance_lines:
                return "END Your available balance is GHS 0. Add funds to get started."

            # Format total in display currency
            if preferences.display_currency:
                total_formatted = preferences.display_currency.format_amount(
                    total_value,
                    preferences
                )
                balance_lines.append(f"Total: {total_formatted}")

            balance_text = "\n".join(balance_lines)
            session.state = 'completed'
            session.save()
            return f"END Your SikaRemit Balance:\n{balance_text}"

        except Exception as e:
            logger.error(f"Balance check error: {str(e)}")
            return "END Unable to check balance. Please try again."

    @staticmethod
    def handle_mobile_money_payment(session):
        """Handle mobile money payment flow"""
        session.current_menu = 'payment_amount'
        session.save()
        return "CON Enter payment amount (UGX):"

    @staticmethod
    def handle_bill_payment(session, bill_type):
        """Handle bill payment"""
        session.menu_data['bill_type'] = bill_type
        session.current_menu = f'bill_{bill_type}_account'
        session.save()

        bill_names = {
            'electricity': 'Electricity',
            'water': 'Water',
            'tv': 'TV Subscription',
            'internet': 'Internet'
        }

        bill_name = bill_names.get(bill_type, 'Bill')
        return f"CON Enter your {bill_name} account number:"

    @staticmethod
    def validate_user_input(session, user_input, input_type):
        """Validate user input based on type"""
        if input_type == 'amount':
            try:
                amount = int(user_input)
                if amount < 1000:
                    return False, "Minimum amount is UGX 1,000"
                if amount > 5000000:
                    return False, "Maximum amount is UGX 5,000,000"
                return True, amount
            except ValueError:
                return False, "Please enter a valid amount"

        elif input_type == 'phone':
            if not user_input.startswith('+256') and not user_input.startswith('256'):
                return False, "Phone number must start with +256 or 256"
            if len(user_input.replace('+', '').replace(' ', '')) != 12:
                return False, "Please enter a valid phone number"
            return True, user_input

        elif input_type == 'account_number':
            if len(user_input) < 6:
                return False, "Account number too short"
            return True, user_input

        return True, user_input

class USSDSessionManager:
    """Manages USSD sessions and state"""

    @staticmethod
    def create_session(session_id, msisdn, network='unknown'):
        """Create new USSD session"""
        session = USSDSession.objects.create(
            session_id=session_id,
            msisdn=msisdn,
            network=network,
            expires_at=timezone.now() + timezone.timedelta(minutes=5)
        )
        return session

    @staticmethod
    def get_session(session_id):
        """Get existing session"""
        try:
            return USSDSession.objects.get(session_id=session_id)
        except USSDSession.DoesNotExist:
            return None

    @staticmethod
    def update_session_menu(session, menu_type, menu_data=None):
        """Update session menu and data"""
        session.current_menu = menu_type
        if menu_data:
            session.menu_data.update(menu_data)
        session.save()

    @staticmethod
    def extend_session(session, minutes=5):
        """Extend session timeout"""
        session.expires_at = timezone.now() + timezone.timedelta(minutes=minutes)
        session.save()

    @staticmethod
    def end_session(session, final_response="END Thank you for using SikaRemit!"):
        """End USSD session"""
        session.state = 'completed'
        session.save()
        return final_response

    @staticmethod
    def get_user_by_msisdn(msisdn):
        """Get user by phone number (MSISDN)"""
        try:
            from accounts.models import User
            # Clean the MSISDN (remove + and spaces)
            clean_msisdn = msisdn.replace('+', '').replace(' ', '')
            return User.objects.get(phone_number=clean_msisdn)
        except User.DoesNotExist:
            return None
