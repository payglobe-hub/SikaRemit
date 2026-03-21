from django.core.exceptions import ValidationError
from django.utils.translation import gettext as _
import re
from zxcvbn import zxcvbn
from rest_framework import serializers

class MinimumLengthValidator:
    code = 'length'
    def __init__(self, min_length=8):
        self.min_length = min_length

    def validate(self, password, user=None):
        if len(password) < self.min_length:
            raise ValidationError(
                _("Password must be at least %(min_length)d characters long."),
                code='password_too_short',
                params={'min_length': self.min_length},
            )

    def get_help_text(self):
        return _(
            "Your password must be at least %(min_length)d characters long."
            % {'min_length': self.min_length}
        )

class ComplexityValidator:
    code = 'complexity'
    def validate(self, password, user=None):
        if not re.search(r'[A-Z]', password):
            raise ValidationError(
                _("Password must contain at least one uppercase letter."),
                code='password_no_upper'
            )
        if not re.search(r'[a-z]', password):
            raise ValidationError(
                _("Password must contain at least one lowercase letter."),
                code='password_no_lower'
            )
        if not re.search(r'[0-9]', password):
            raise ValidationError(
                _("Password must contain at least one digit."),
                code='password_no_digit'
            )
        if not re.search(r'[^A-Za-z0-9]', password):
            raise ValidationError(
                _("Password must contain at least one special character."),
                code='password_no_special'
            )

    def get_help_text(self):
        return _(
            """Your password must contain:
            - 1 uppercase letter
            - 1 lowercase letter
            - 1 digit
            - 1 special character"""
        )

class DisallowCommonPasswordsValidator:
    COMMON_PASSWORDS = [
        'password', '123456', 'qwerty', 'letmein', 'welcome'
    ]
    
    def validate(self, password, user=None):
        if password.lower() in self.COMMON_PASSWORDS:
            raise ValidationError(
                _("This password is too common."),
                code='password_too_common'
            )
    
    def get_help_text(self):
        return _("Your password cannot be a commonly used password.")

class ZxcvbnValidator:
    code = 'strength'
    def __init__(self, min_score=3):
        self.min_score = min_score

    def validate(self, password, user=None):
        result = zxcvbn(password, user_inputs=[user.email] if user else [])
        if result['score'] < self.min_score:
            raise ValidationError(
                _("Password is too weak. %(feedback)s"),
                code='password_too_weak',
                params={'feedback': result['feedback']['warning']},
            )

    def get_help_text(self):
        return _("Password must withstand advanced cracking attempts")

class MetadataValidator:
    def validate(self, password, user=None):
        pass

    def validate_metadata(self, value):
        """Ensure metadata is well-structured"""
        if not isinstance(value, dict):
            raise ValidationError("Metadata must be a dictionary")
        if len(value) > 20:
            raise ValidationError("Max 20 metadata items")
        # Additional validation rules...

    def get_help_text(self):
        return _("Metadata must be well-structured")
