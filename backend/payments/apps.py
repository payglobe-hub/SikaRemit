from django.apps import AppConfig
import logging

logger = logging.getLogger(__name__)

class PaymentsConfig(AppConfig):
    default_auto_field = 'django.db.models.BigAutoField'
    name = 'payments'
    
    def ready(self):
        # Import models
        from .models.verification import VerificationLog, ProviderHealth
        
        # Connect signals
        from . import signals
        signals.connect_signals()
        
        # Connect webhook signals
        from .webhooks import connect_signals
        connect_signals()
        
        # Ensure static files are collected
        from django.contrib.staticfiles.finders import find
        try:
            find('admin/js/exemption_workflow.js')
        except LookupError:
            logger.warning("Exemption workflow static files not found")
        
        # Schedule periodic health checks
        # from django_q.tasks import schedule
        # schedule('payments.services.verification.VerificationService.check_provider_health',
        #         schedule_type='MINUTES',
        #         minutes=5,
        #         repeats=-1)
