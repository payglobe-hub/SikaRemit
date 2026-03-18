"""
Production Readiness Startup Checks
Validates critical configuration before application starts
"""
import os
import logging
from django.conf import settings
from django.core.checks import Error, Warning, register

logger = logging.getLogger(__name__)

@register()
def check_production_configuration(app_configs, **kwargs):
    """
    Check production configuration on startup
    """
    errors = []
    
    # Only run in production
    if not getattr(settings, 'IS_PRODUCTION', False):
        return errors
    
    # 1. Check SECRET_KEY
    secret_key = getattr(settings, 'SECRET_KEY', None)
    if not secret_key or len(secret_key) < 50:
        errors.append(
            Error(
                'SECRET_KEY must be set and at least 50 characters in production',
                id='sikaremit.E001',
            )
        )
    
    # 2. Check DEBUG is False
    if getattr(settings, 'DEBUG', True):
        errors.append(
            Error(
                'DEBUG must be False in production',
                id='sikaremit.E002',
            )
        )
    
    # 3. Check Database Configuration
    database_url = os.environ.get('DATABASE_URL')
    if not database_url and getattr(settings, 'DJANGO_USE_SQLITE', 'false').lower() == 'false':
        errors.append(
            Warning(
                'DATABASE_URL not configured. Using fallback database settings.',
                hint='Set DATABASE_URL environment variable for production database',
                id='sikaremit.W001',
            )
        )
    
    # 4. Check Redis Configuration
    redis_url = os.environ.get('REDIS_URL')
    if not redis_url:
        errors.append(
            Warning(
                'REDIS_URL not configured. Caching and Celery may not work properly.',
                hint='Set REDIS_URL environment variable',
                id='sikaremit.W002',
            )
        )
    
    # 5. Check Email Configuration (SendGrid)
    sendgrid_key = getattr(settings, 'SENDGRID_API_KEY', '')
    if not sendgrid_key:
        errors.append(
            Warning(
                'SENDGRID_API_KEY not configured. Emails will not be sent.',
                hint='Set SENDGRID_API_KEY environment variable',
                id='sikaremit.W003',
            )
        )
    
    # 6. Check Sentry Configuration
    sentry_dsn = getattr(settings, 'SENTRY_DSN', '')
    if not sentry_dsn:
        errors.append(
            Warning(
                'SENTRY_DSN not configured. Error monitoring disabled.',
                hint='Set SENTRY_DSN environment variable for error tracking',
                id='sikaremit.W004',
            )
        )
    
    # 7. Check Payment Gateway Configuration
    payment_warnings = check_payment_gateways()
    errors.extend(payment_warnings)
    
    # 8. Check ALLOWED_HOSTS
    allowed_hosts = getattr(settings, 'ALLOWED_HOSTS', [])
    if not allowed_hosts or allowed_hosts == ['localhost', '127.0.0.1', 'testserver']:
        errors.append(
            Error(
                'ALLOWED_HOSTS must be configured with production domains',
                hint='Set ALLOWED_HOSTS environment variable',
                id='sikaremit.E003',
            )
        )
    
    return errors

def check_payment_gateways():
    """
    Check payment gateway configurations
    Returns list of warnings for unconfigured gateways
    """
    warnings = []
    
    # MTN MoMo
    mtn_configured = all([
        os.environ.get('MTN_MOMO_API_KEY'),
        os.environ.get('MTN_MOMO_API_SECRET'),
        os.environ.get('MTN_MOMO_SUBSCRIPTION_KEY'),
        os.environ.get('MTN_MOMO_API_URL'),
    ])
    if not mtn_configured:
        warnings.append(
            Warning(
                'MTN MoMo gateway not fully configured. MTN payments will fail.',
                hint='Set MTN_MOMO_* environment variables',
                id='sikaremit.W101',
            )
        )
    
    # Telecel
    telecel_configured = all([
        os.environ.get('TELECEL_API_KEY'),
        os.environ.get('TELECEL_API_URL'),
        os.environ.get('TELECEL_MERCHANT_ID'),
    ])
    if not telecel_configured:
        warnings.append(
            Warning(
                'Telecel gateway not fully configured. Telecel payments will fail.',
                hint='Set TELECEL_* environment variables',
                id='sikaremit.W102',
            )
        )
    
    # AirtelTigo
    airtel_configured = all([
        os.environ.get('AIRTEL_API_KEY'),
        os.environ.get('AIRTEL_CLIENT_ID'),
        os.environ.get('AIRTEL_CLIENT_SECRET'),
        os.environ.get('AIRTEL_API_URL'),
    ])
    if not airtel_configured:
        warnings.append(
            Warning(
                'AirtelTigo gateway not fully configured. AirtelTigo payments will fail.',
                hint='Set AIRTEL_* environment variables',
                id='sikaremit.W103',
            )
        )
    
    # Stripe
    stripe_configured = all([
        os.environ.get('STRIPE_SECRET_KEY'),
        os.environ.get('STRIPE_PUBLIC_KEY'),
    ])
    if not stripe_configured:
        warnings.append(
            Warning(
                'Stripe gateway not fully configured. Card payments will fail.',
                hint='Set STRIPE_* environment variables',
                id='sikaremit.W104',
            )
        )
    
    # Check if at least one payment gateway is configured
    if not any([mtn_configured, telecel_configured, airtel_configured, stripe_configured]):
        warnings.append(
            Error(
                'No payment gateways configured. System cannot process payments.',
                hint='Configure at least one payment gateway (MTN, Telecel, AirtelTigo, or Stripe)',
                id='sikaremit.E101',
            )
        )
    
    return warnings

def log_startup_configuration():
    """
    Log configuration status on startup (non-sensitive info only)
    """
    logger.info("=" * 60)
    logger.info("SikaRemit Production Configuration Status")
    logger.info("=" * 60)
    
    logger.info(f"Environment: {getattr(settings, 'ENVIRONMENT', 'unknown')}")
    logger.info(f"Debug Mode: {getattr(settings, 'DEBUG', True)}")
    logger.info(f"Allowed Hosts: {getattr(settings, 'ALLOWED_HOSTS', [])}")
    
    # Database
    db_configured = bool(os.environ.get('DATABASE_URL'))
    logger.info(f"Database: {'✓ Configured' if db_configured else '✗ Not configured'}")
    
    # Redis
    redis_configured = bool(os.environ.get('REDIS_URL'))
    logger.info(f"Redis: {'✓ Configured' if redis_configured else '✗ Not configured'}")
    
    # Email
    email_configured = bool(getattr(settings, 'SENDGRID_API_KEY', ''))
    logger.info(f"Email (SendGrid): {'✓ Configured' if email_configured else '✗ Not configured'}")
    
    # Sentry
    sentry_configured = bool(getattr(settings, 'SENTRY_DSN', ''))
    logger.info(f"Sentry: {'✓ Configured' if sentry_configured else '✗ Not configured'}")
    
    # Payment Gateways
    logger.info("\nPayment Gateways:")
    
    mtn_configured = all([
        os.environ.get('MTN_MOMO_API_KEY'),
        os.environ.get('MTN_MOMO_API_SECRET'),
        os.environ.get('MTN_MOMO_SUBSCRIPTION_KEY'),
    ])
    logger.info(f"  MTN MoMo: {'✓ Configured' if mtn_configured else '✗ Not configured'}")
    
    telecel_configured = all([
        os.environ.get('TELECEL_API_KEY'),
        os.environ.get('TELECEL_MERCHANT_ID'),
    ])
    logger.info(f"  Telecel: {'✓ Configured' if telecel_configured else '✗ Not configured'}")
    
    airtel_configured = all([
        os.environ.get('AIRTEL_CLIENT_ID'),
        os.environ.get('AIRTEL_CLIENT_SECRET'),
    ])
    logger.info(f"  AirtelTigo: {'✓ Configured' if airtel_configured else '✗ Not configured'}")
    
    stripe_configured = bool(os.environ.get('STRIPE_SECRET_KEY'))
    logger.info(f"  Stripe: {'✓ Configured' if stripe_configured else '✗ Not configured'}")
    
    logger.info("=" * 60)

# Call on module import (when Django starts)
if getattr(settings, 'IS_PRODUCTION', False):
    log_startup_configuration()
