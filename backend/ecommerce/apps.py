"""
E-commerce App Configuration
"""

from django.apps import AppConfig


class EcommerceConfig(AppConfig):
    default_auto_field = 'django.db.models.BigAutoField'
    name = 'ecommerce'
    verbose_name = 'E-commerce'
    
    def ready(self):
        """Import signals when app is ready"""
        try:
            import ecommerce.signals
        except ImportError:
            pass
