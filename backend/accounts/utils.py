from datetime import timedelta
from django.utils import timezone
from rest_framework_simplejwt.settings import api_settings

class AuthUtils:
    @staticmethod
    def set_cookie_httponly(response, key, value, expires_in):
        """Secure HTTP-only cookie setup"""
        response.set_cookie(
            key=key,
            value=value,
            expires=timezone.now() + timedelta(seconds=expires_in),
            httponly=True,
            secure=not api_settings.DEBUG,
            samesite='Strict'
        )
        return response
