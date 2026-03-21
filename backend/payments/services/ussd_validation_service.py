"""
USSD Validation Service
Provides comprehensive validation for USSD user inputs
"""

import re
from decimal import Decimal, InvalidOperation
from django.core.exceptions import ValidationError
import logging

logger = logging.getLogger(__name__)

class USSDValidationService:
    """
    Service for validating USSD user inputs with comprehensive error handling
    """

    # Phone number patterns for different countries
    PHONE_PATTERNS = {
        'UG': {
            'patterns': [r'^(\+256|256|0)?[7-9]\d{8}$'],
            'prefixes': ['+256', '256', '0'],
            'length': 9
        },
        'GH': {
            'patterns': [r'^(\+233|233|0)?[2-5]\d{8}$'],
            'prefixes': ['+233', '233', '0'],
            'length': 9
        },
        'KE': {
            'patterns': [r'^(\+254|254|0)?[7-9]\d{8}$'],
            'prefixes': ['+254', '254', '0'],
            'length': 9
        },
        'NG': {
            'patterns': [r'^(\+234|234|0)?[7-9]\d{9}$'],
            'prefixes': ['+234', '234', '0'],
            'length': 10
        }
    }

    @staticmethod
    def validate_phone_number(phone: str, country_code: str = 'UG') -> tuple[bool, str]:
        """
        Validate phone number format
        Returns: (is_valid, error_message or formatted_number)
        """
        if not phone or not phone.strip():
            return False, "Phone number is required"

        phone = phone.strip().replace(' ', '')

        # Get country patterns
        country_patterns = USSDValidationService.PHONE_PATTERNS.get(country_code, USSDValidationService.PHONE_PATTERNS['UG'])

        # Check against patterns
        for pattern in country_patterns['patterns']:
            if re.match(pattern, phone):
                # Format to international format
                if phone.startswith('0'):
                    phone = phone[1:]  # Remove leading 0
                if not phone.startswith('+'):
                    phone = f"+{country_patterns['prefixes'][0][1:]}{phone}"

                return True, phone

        return False, f"Invalid phone number format for {country_code}"

    @staticmethod
    def validate_amount(amount_str: str, currency: str = 'UGX') -> tuple[bool, str, Decimal]:
        """
        Validate and parse amount
        Returns: (is_valid, error_message or formatted_amount, parsed_amount)
        """
        if not amount_str or not amount_str.strip():
            return False, "Amount is required", Decimal('0')

        amount_str = amount_str.strip()

        # Check if it's a valid number
        try:
            amount = Decimal(amount_str)
        except (ValueError, InvalidOperation):
            return False, "Please enter a valid number", Decimal('0')

        # Check minimum amount
        min_amounts = {
            'UGX': Decimal('1000'),
            'GHS': Decimal('5'),
            'KES': Decimal('50'),
            'NGN': Decimal('100'),
            'ZAR': Decimal('10'),
            'USD': Decimal('1'),
            'EUR': Decimal('1'),
            'GBP': Decimal('1')
        }

        min_amount = min_amounts.get(currency, Decimal('1'))
        if amount < min_amount:
            return False, f"Minimum amount is {currency} {min_amount:,}", Decimal('0')

        # Check maximum amount
        max_amounts = {
            'UGX': Decimal('5000000'),  # 5M UGX
            'GHS': Decimal('5000'),     # 5K GHS
            'KES': Decimal('500000'),   # 500K KES
            'NGN': Decimal('1000000'),  # 1M NGN
            'ZAR': Decimal('50000'),    # 50K ZAR
            'USD': Decimal('10000'),    # 10K USD
            'EUR': Decimal('8000'),     # 8K EUR
            'GBP': Decimal('7000')      # 7K GBP
        }

        max_amount = max_amounts.get(currency, Decimal('1000000'))
        if amount > max_amount:
            return False, f"Maximum amount is {currency} {max_amount:,}", Decimal('0')

        # Check decimal places
        if amount != amount.quantize(Decimal('0.01')):
            return False, "Amount cannot have more than 2 decimal places", Decimal('0')

        return True, f"{currency} {amount:,.2f}", amount

    @staticmethod
    def validate_account_number(account: str, bill_type: str = None) -> tuple[bool, str]:
        """
        Validate bill account/reference numbers
        """
        if not account or not account.strip():
            return False, "Account number is required"

        account = account.strip()

        # Minimum length check
        if len(account) < 6:
            return False, "Account number too short (minimum 6 characters)"

        if len(account) > 20:
            return False, "Account number too long (maximum 20 characters)"

        # Type-specific validation
        if bill_type:
            if bill_type == 'electricity':
                # Electricity accounts often have specific formats
                if not re.match(r'^[A-Za-z0-9\-]+$', account):
                    return False, "Invalid electricity account format"
            elif bill_type == 'water':
                # Water accounts
                if not re.match(r'^[A-Za-z0-9\-]+$', account):
                    return False, "Invalid water account format"
            elif bill_type == 'tv':
                # TV subscriptions
                if not re.match(r'^[A-Za-z0-9\-]+$', account):
                    return False, "Invalid TV subscription account format"
            elif bill_type == 'internet':
                # Internet accounts
                if not re.match(r'^[A-Za-z0-9\-]+$', account):
                    return False, "Invalid internet account format"

        # General alphanumeric check
        if not re.match(r'^[A-Za-z0-9\-]+$', account):
            return False, "Account number can only contain letters, numbers, and hyphens"

        return True, account

    @staticmethod
    def validate_name(name: str) -> tuple[bool, str]:
        """
        Validate user name input
        """
        if not name or not name.strip():
            return False, "Name is required"

        name = name.strip()

        # Length checks
        if len(name) < 2:
            return False, "Name too short (minimum 2 characters)"

        if len(name) > 50:
            return False, "Name too long (maximum 50 characters)"

        # Character validation (allow letters, spaces, hyphens, apostrophes)
        if not re.match(r"^[A-Za-z\s\-']+$", name):
            return False, "Name can only contain letters, spaces, hyphens, and apostrophes"

        # Check for at least one letter
        if not re.search(r'[A-Za-z]', name):
            return False, "Name must contain at least one letter"

        return True, name.title()

    @staticmethod
    def validate_pin(pin: str) -> tuple[bool, str]:
        """
        Validate PIN input
        """
        if not pin or not pin.strip():
            return False, "PIN is required"

        pin = pin.strip()

        # Length check
        if len(pin) != 4:
            return False, "PIN must be exactly 4 digits"

        # Numeric check
        if not pin.isdigit():
            return False, "PIN must contain only numbers"

        # Common PIN check (avoid 1234, 0000, etc.)
        common_pins = ['0000', '1111', '2222', '3333', '4444', '5555', '6666', '7777', '8888', '9999', '1234', '4321']
        if pin in common_pins:
            return False, "Please choose a less common PIN"

        return True, pin

    @staticmethod
    def validate_menu_choice(choice: str, valid_options: list) -> tuple[bool, str]:
        """
        Validate menu choice against valid options
        """
        if not choice or not choice.strip():
            return False, "Please make a selection"

        choice = choice.strip()

        if choice not in valid_options:
            return False, f"Invalid choice. Please select from: {', '.join(valid_options)}"

        return True, choice

    @staticmethod
    def sanitize_input(input_str: str, max_length: int = 100) -> str:
        """
        Sanitize user input to prevent injection attacks
        """
        if not input_str:
            return ""

        # Remove potentially dangerous characters
        sanitized = re.sub(r'[<>]', '', input_str.strip())

        # Limit length
        if len(sanitized) > max_length:
            sanitized = sanitized[:max_length]

        return sanitized

    @staticmethod
    def validate_transaction_amount(amount: Decimal, user_balance: Decimal, currency: str) -> tuple[bool, str]:
        """
        Validate that user has sufficient balance for transaction
        """
        if amount > user_balance:
            return False, f"Insufficient balance. Available: {currency} {user_balance:,.2f}"

        return True, f"Transaction amount valid: {currency} {amount:,.2f}"

    @staticmethod
    def validate_recipient_phone(sender_phone: str, recipient_phone: str) -> tuple[bool, str]:
        """
        Validate recipient phone (ensure it's not the same as sender)
        """
        # Clean both numbers
        sender_clean = sender_phone.replace('+', '').replace(' ', '')
        recipient_clean = recipient_phone.replace('+', '').replace(' ', '')

        if sender_clean == recipient_clean:
            return False, "Cannot transfer to your own number"

        return True, "Recipient phone number is valid"

    @staticmethod
    def get_error_message(error_type: str, context: dict = None) -> str:
        """
        Get standardized error messages
        """
        messages = {
            'network_error': "Network error. Please try again.",
            'timeout': "Request timed out. Please try again.",
            'invalid_input': "Invalid input. Please check and try again.",
            'service_unavailable': "Service temporarily unavailable. Please try again later.",
            'insufficient_balance': "Insufficient balance for this transaction.",
            'account_locked': "Account temporarily locked. Please contact support.",
            'daily_limit_exceeded': "Daily transaction limit exceeded.",
            'system_error': "System error. Please try again or contact support."
        }

        message = messages.get(error_type, "An error occurred. Please try again.")

        if context:
            # Add context-specific information
            if 'amount' in context:
                message = f"{message} Amount: {context['amount']}"
            if 'currency' in context:
                message = f"{message} Currency: {context['currency']}"

        return message
