class BasePaymentService:
    """
    Base class for all payment services
    Provides common functionality and interfaces
    """
    def validate_payment_method(self, payment_method):
        """Validate payment method is active and valid"""
        if not payment_method.is_active:
            raise ValueError("Payment method is not active")
        
    def create_transaction_record(self, **kwargs):
        """Create standardized transaction record"""
        pass
    
    def log_activity(self, message, metadata=None):
        """Log service activity"""
        pass
