"""
Comprehensive Input Validation for SikaRemit
Provides validators for all critical data inputs
"""
import re
from decimal import Decimal, InvalidOperation
from typing import Optional, Tuple, List
from django.core.exceptions import ValidationError
from django.core.validators import EmailValidator, RegexValidator
from django.utils.translation import gettext_lazy as _

class PhoneNumberValidator:
    """Validate phone numbers for Ghana and international formats"""
    
    # Ghana phone patterns
    GHANA_PATTERNS = {
        'mtn': r'^(024|054|055|059)\d{7}$',
        'telecel': r'^(020|050)\d{7}$',
        'airteltigo': r'^(026|027|056|057)\d{7}$',
    }
    
    # International format
    INTERNATIONAL_PATTERN = r'^\+\d{10,15}$'
    
    @classmethod
    def validate(cls, phone: str, country_code: str = 'GH') -> Tuple[bool, str, Optional[str]]:
        """
        Validate phone number
        Returns: (is_valid, cleaned_number, network_provider)
        """
        if not phone:
            return False, '', None
        
        # Clean the phone number
        cleaned = re.sub(r'[\s\-\(\)]', '', phone)
        
        # Handle Ghana numbers
        if country_code == 'GH':
            # Remove country code if present
            if cleaned.startswith('+233'):
                cleaned = '0' + cleaned[4:]
            elif cleaned.startswith('233'):
                cleaned = '0' + cleaned[3:]
            
            # Validate against Ghana patterns
            for provider, pattern in cls.GHANA_PATTERNS.items():
                if re.match(pattern, cleaned):
                    return True, cleaned, provider
            
            return False, cleaned, None
        
        # International format
        if re.match(cls.INTERNATIONAL_PATTERN, cleaned):
            return True, cleaned, None
        
        return False, cleaned, None
    
    @classmethod
    def get_network_provider(cls, phone: str) -> Optional[str]:
        """Get network provider from phone number"""
        _, _, provider = cls.validate(phone, 'GH')
        return provider

class AmountValidator:
    """Validate monetary amounts"""
    
    # Limits per currency (in base units)
    LIMITS = {
        'GHS': {'min': Decimal('0.01'), 'max': Decimal('100000.00')},
        'USD': {'min': Decimal('0.01'), 'max': Decimal('50000.00')},
        'EUR': {'min': Decimal('0.01'), 'max': Decimal('50000.00')},
        'GBP': {'min': Decimal('0.01'), 'max': Decimal('50000.00')},
        'NGN': {'min': Decimal('1.00'), 'max': Decimal('10000000.00')},
    }
    
    @classmethod
    def validate(cls, amount: any, currency: str = 'GHS') -> Tuple[bool, Decimal, str]:
        """
        Validate amount
        Returns: (is_valid, decimal_amount, error_message)
        """
        try:
            decimal_amount = Decimal(str(amount))
        except (InvalidOperation, ValueError, TypeError):
            return False, Decimal('0'), 'Invalid amount format'
        
        if decimal_amount <= 0:
            return False, decimal_amount, 'Amount must be greater than zero'
        
        limits = cls.LIMITS.get(currency, cls.LIMITS['GHS'])
        
        if decimal_amount < limits['min']:
            return False, decimal_amount, f"Minimum amount is {limits['min']} {currency}"
        
        if decimal_amount > limits['max']:
            return False, decimal_amount, f"Maximum amount is {limits['max']} {currency}"
        
        # Check decimal places (max 2)
        if decimal_amount.as_tuple().exponent < -2:
            return False, decimal_amount, 'Amount cannot have more than 2 decimal places'
        
        return True, decimal_amount, ''

class NameValidator:
    """Validate names (first name, last name, business name)"""
    
    # Allowed characters in names
    NAME_PATTERN = r'^[a-zA-Z\s\-\'\.]+$'
    BUSINESS_NAME_PATTERN = r'^[a-zA-Z0-9\s\-\'\.&,]+$'
    
    @classmethod
    def validate_person_name(cls, name: str, field_name: str = 'Name') -> Tuple[bool, str, str]:
        """
        Validate person name
        Returns: (is_valid, cleaned_name, error_message)
        """
        if not name or not name.strip():
            return False, '', f'{field_name} is required'
        
        cleaned = name.strip()
        
        if len(cleaned) < 2:
            return False, cleaned, f'{field_name} must be at least 2 characters'
        
        if len(cleaned) > 100:
            return False, cleaned, f'{field_name} cannot exceed 100 characters'
        
        if not re.match(cls.NAME_PATTERN, cleaned):
            return False, cleaned, f'{field_name} contains invalid characters'
        
        return True, cleaned, ''
    
    @classmethod
    def validate_business_name(cls, name: str) -> Tuple[bool, str, str]:
        """Validate business name"""
        if not name or not name.strip():
            return False, '', 'Business name is required'
        
        cleaned = name.strip()
        
        if len(cleaned) < 2:
            return False, cleaned, 'Business name must be at least 2 characters'
        
        if len(cleaned) > 200:
            return False, cleaned, 'Business name cannot exceed 200 characters'
        
        if not re.match(cls.BUSINESS_NAME_PATTERN, cleaned):
            return False, cleaned, 'Business name contains invalid characters'
        
        return True, cleaned, ''

class EmailValidatorCustom:
    """Enhanced email validation"""
    
    DISPOSABLE_DOMAINS = [
        'tempmail.com', 'throwaway.com', 'mailinator.com', 'guerrillamail.com',
        'temp-mail.org', '10minutemail.com', 'fakeinbox.com', 'trashmail.com',
    ]
    
    @classmethod
    def validate(cls, email: str, allow_disposable: bool = False) -> Tuple[bool, str, str]:
        """
        Validate email address
        Returns: (is_valid, cleaned_email, error_message)
        """
        if not email:
            return False, '', 'Email is required'
        
        cleaned = email.strip().lower()
        
        # Basic format validation
        try:
            EmailValidator()(cleaned)
        except ValidationError:
            return False, cleaned, 'Invalid email format'
        
        # Check for disposable email domains
        if not allow_disposable:
            domain = cleaned.split('@')[1]
            if domain in cls.DISPOSABLE_DOMAINS:
                return False, cleaned, 'Disposable email addresses are not allowed'
        
        return True, cleaned, ''

class PasswordValidator:
    """Strong password validation"""
    
    MIN_LENGTH = 8
    MAX_LENGTH = 128
    
    @classmethod
    def validate(cls, password: str) -> Tuple[bool, List[str]]:
        """
        Validate password strength
        Returns: (is_valid, list_of_errors)
        """
        errors = []
        
        if not password:
            return False, ['Password is required']
        
        if len(password) < cls.MIN_LENGTH:
            errors.append(f'Password must be at least {cls.MIN_LENGTH} characters')
        
        if len(password) > cls.MAX_LENGTH:
            errors.append(f'Password cannot exceed {cls.MAX_LENGTH} characters')
        
        if not re.search(r'[A-Z]', password):
            errors.append('Password must contain at least one uppercase letter')
        
        if not re.search(r'[a-z]', password):
            errors.append('Password must contain at least one lowercase letter')
        
        if not re.search(r'\d', password):
            errors.append('Password must contain at least one digit')
        
        if not re.search(r'[!@#$%^&*(),.?":{}|<>]', password):
            errors.append('Password must contain at least one special character')
        
        # Check for common patterns
        common_patterns = ['password', '123456', 'qwerty', 'admin', 'letmein']
        if any(pattern in password.lower() for pattern in common_patterns):
            errors.append('Password contains common patterns')
        
        return len(errors) == 0, errors

class BankAccountValidator:
    """Validate bank account details"""
    
    # Ghana bank codes
    GHANA_BANKS = {
        'GCB': {'name': 'GCB Bank', 'account_length': 13},
        'ECOBANK': {'name': 'Ecobank Ghana', 'account_length': 13},
        'STANBIC': {'name': 'Stanbic Bank', 'account_length': 13},
        'ABSA': {'name': 'Absa Bank Ghana', 'account_length': 10},
        'ZENITH': {'name': 'Zenith Bank Ghana', 'account_length': 10},
        'FIDELITY': {'name': 'Fidelity Bank Ghana', 'account_length': 13},
        'CAL': {'name': 'CAL Bank', 'account_length': 12},
        'UBA': {'name': 'UBA Ghana', 'account_length': 14},
        'ACCESS': {'name': 'Access Bank Ghana', 'account_length': 13},
        'GTB': {'name': 'GT Bank Ghana', 'account_length': 10},
    }
    
    @classmethod
    def validate(cls, account_number: str, bank_code: str) -> Tuple[bool, str, str]:
        """
        Validate bank account
        Returns: (is_valid, cleaned_account, error_message)
        """
        if not account_number:
            return False, '', 'Account number is required'
        
        # Clean account number
        cleaned = re.sub(r'[\s\-]', '', account_number)
        
        if not cleaned.isdigit():
            return False, cleaned, 'Account number must contain only digits'
        
        # Validate against bank-specific rules
        bank = cls.GHANA_BANKS.get(bank_code.upper())
        if bank:
            expected_length = bank['account_length']
            if len(cleaned) != expected_length:
                return False, cleaned, f"Account number for {bank['name']} must be {expected_length} digits"
        else:
            # Generic validation
            if len(cleaned) < 8 or len(cleaned) > 20:
                return False, cleaned, 'Account number must be between 8 and 20 digits'
        
        return True, cleaned, ''

class DocumentValidator:
    """Validate identity documents"""
    
    DOCUMENT_PATTERNS = {
        'ghana_card': r'^GHA-\d{9}-\d$',
        'passport': r'^G\d{7}$',
        'voter_id': r'^\d{10}$',
        'drivers_license': r'^[A-Z]{2}\d{8}$',
    }
    
    @classmethod
    def validate(cls, document_number: str, document_type: str) -> Tuple[bool, str, str]:
        """
        Validate document number
        Returns: (is_valid, cleaned_number, error_message)
        """
        if not document_number:
            return False, '', 'Document number is required'
        
        cleaned = document_number.strip().upper()
        
        pattern = cls.DOCUMENT_PATTERNS.get(document_type)
        if pattern:
            if not re.match(pattern, cleaned):
                return False, cleaned, f'Invalid {document_type.replace("_", " ")} format'
        
        return True, cleaned, ''

class TransactionValidator:
    """Validate transaction data"""
    
    @classmethod
    def validate_transfer(
        cls,
        sender_id: str,
        recipient_phone: str,
        amount: any,
        currency: str = 'GHS'
    ) -> Tuple[bool, dict, List[str]]:
        """
        Validate transfer transaction
        Returns: (is_valid, validated_data, errors)
        """
        errors = []
        validated_data = {}
        
        # Validate recipient phone
        phone_valid, cleaned_phone, provider = PhoneNumberValidator.validate(recipient_phone)
        if not phone_valid:
            errors.append('Invalid recipient phone number')
        else:
            validated_data['recipient_phone'] = cleaned_phone
            validated_data['network_provider'] = provider
        
        # Validate amount
        amount_valid, decimal_amount, amount_error = AmountValidator.validate(amount, currency)
        if not amount_valid:
            errors.append(amount_error)
        else:
            validated_data['amount'] = decimal_amount
            validated_data['currency'] = currency
        
        # Check sender != recipient
        if sender_id and cleaned_phone:
            # This would need to check against database
            pass
        
        return len(errors) == 0, validated_data, errors
    
    @classmethod
    def validate_remittance(
        cls,
        recipient_name: str,
        recipient_phone: str,
        recipient_country: str,
        amount: any,
        source_currency: str,
        target_currency: str
    ) -> Tuple[bool, dict, List[str]]:
        """
        Validate remittance transaction
        Returns: (is_valid, validated_data, errors)
        """
        errors = []
        validated_data = {}
        
        # Validate recipient name
        name_valid, cleaned_name, name_error = NameValidator.validate_person_name(
            recipient_name, 'Recipient name'
        )
        if not name_valid:
            errors.append(name_error)
        else:
            validated_data['recipient_name'] = cleaned_name
        
        # Validate phone
        phone_valid, cleaned_phone, _ = PhoneNumberValidator.validate(
            recipient_phone, recipient_country
        )
        if not phone_valid:
            errors.append('Invalid recipient phone number')
        else:
            validated_data['recipient_phone'] = cleaned_phone
        
        # Validate amount
        amount_valid, decimal_amount, amount_error = AmountValidator.validate(
            amount, source_currency
        )
        if not amount_valid:
            errors.append(amount_error)
        else:
            validated_data['amount'] = decimal_amount
            validated_data['source_currency'] = source_currency
            validated_data['target_currency'] = target_currency
        
        # Validate country
        SUPPORTED_COUNTRIES = ['GH', 'NG', 'KE', 'US', 'GB', 'DE', 'FR']
        if recipient_country not in SUPPORTED_COUNTRIES:
            errors.append(f'Unsupported destination country: {recipient_country}')
        else:
            validated_data['recipient_country'] = recipient_country
        
        return len(errors) == 0, validated_data, errors

# Django model validators
phone_validator = RegexValidator(
    regex=r'^(\+233|0)(20|24|26|27|50|54|55|56|57|59)\d{7}$',
    message='Enter a valid Ghana phone number'
)

ghana_card_validator = RegexValidator(
    regex=r'^GHA-\d{9}-\d$',
    message='Enter a valid Ghana Card number (format: GHA-XXXXXXXXX-X)'
)

amount_validator = RegexValidator(
    regex=r'^\d+(\.\d{1,2})?$',
    message='Enter a valid amount (up to 2 decimal places)'
)
