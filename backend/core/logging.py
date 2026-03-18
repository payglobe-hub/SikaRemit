"""
Logging configuration for SikaRemit
"""

import logging


class GatewayWarningFilter(logging.Filter):
    """Filter to suppress gateway configuration warnings"""
    
    def filter(self, record):
        """Filter out gateway configuration warnings"""
        # Suppress specific gateway warning messages
        gateway_warnings = [
            'not fully configured',
            'Set G_MONEY_* environment variables',
            'Set MTN_MOMO_* environment variables', 
            'Set TELECEL_* environment variables',
            'Set AIRTEL_* environment variables',
            'Set STRIPE_* environment variables',
        ]
        
        # Check if the message contains any of the gateway warnings
        if record.getMessage():
            message = record.getMessage().lower()
            for warning in gateway_warnings:
                if warning.lower() in message:
                    return False
        
        return True
