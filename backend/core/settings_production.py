from decimal import Decimal
import os

# Production Static Files Configuration
STATICFILES_STORAGE = 'whitenoise.storage.CompressedManifestStaticFilesStorage'

# WhiteNoise Configuration
WHITENOISE_USE_FINDERS = True
WHITENOISE_AUTOREFRESH = True

# Security Configuration for Production
if not DEBUG:
    # HTTPS settings
    SECURE_SSL_REDIRECT = True
    SECURE_HSTS_SECONDS = 31536000  # 1 year
    SECURE_HSTS_INCLUDE_SUBDOMAINS = True
    SECURE_HSTS_PRELOAD = True
    SECURE_CONTENT_TYPE_NOSNIFF = True
    SECURE_BROWSER_XSS_FILTER = True
    SECURE_REFERRER_POLICY = 'strict-origin-when-cross-origin'
    
    # Session Security
    SESSION_COOKIE_SECURE = True
    SESSION_COOKIE_HTTPONLY = True
    SESSION_COOKIE_SAMESITE = 'Strict'
    CSRF_COOKIE_SECURE = True
    CSRF_COOKIE_HTTPONLY = True
    CSRF_COOKIE_SAMESITE = 'Strict'
    
    # Database Security
    DATABASES = {
        'default': {
            'OPTIONS': {
                'sslmode': 'require',  # Force SSL connection
            }
        }
    }
    
    # CORS Security (Production Only)
    CORS_ALLOWED_ORIGINS = [
        "https://sikaremit.com",
        "https://www.sikaremit.com",
    ]
    CORS_ALLOW_CREDENTIALS = True
    
    # Security Headers
    SECURITY_HEADERS = {
        'X-Content-Type-Options': 'nosniff',
        'X-Frame-Options': 'DENY',
        'X-XSS-Protection': '1; mode=block',
        'Strict-Transport-Security': 'max-age=31536000; includeSubDomains; preload',
        'Content-Security-Policy': "default-src 'self'; script-src 'self' 'unsafe-inline'; style-src 'self' 'unsafe-inline'; img-src 'self' data: https:; font-src 'self'; connect-src 'self' https://api.stripe.com",
    }

# Stripe Configuration
STRIPE_LIVE_MODE = os.environ.get('STRIPE_SECRET_KEY', '').startswith('sk_live_')

# SendGrid Configuration
SENDGRID_API_KEY = os.environ.get('EMAIL_HOST_PASSWORD')  # Same as SMTP password

# Africa's Talking Configuration
AFRICASTALKING_USERNAME = os.environ.get('AFRICASTALKING_USERNAME')
AFRICASTALKING_API_KEY = os.environ.get('AFRICASTALKING_API_KEY')

# Twilio Configuration
TWILIO_ACCOUNT_SID = os.environ.get('TWILIO_ACCOUNT_SID')
TWILIO_AUTH_TOKEN = os.environ.get('TWILIO_AUTH_TOKEN')
TWILIO_PHONE_NUMBER = os.environ.get('TWILIO_PHONE_NUMBER')

# Monitoring Configuration
PROMETHEUS_METRICS_EXPORT_PORT = os.environ.get('PROMETHEUS_METRICS_EXPORT_PORT', 8001)
PROMETHEUS_METRICS_EXPORT_ADDRESS = os.environ.get('PROMETHEUS_METRICS_EXPORT_ADDRESS', '0.0.0.0')

# Sentry Configuration (for error monitoring)
SENTRY_DSN = os.environ.get('SENTRY_DSN')
if SENTRY_DSN:
    import sentry_sdk
    sentry_sdk.init(
        dsn=SENTRY_DSN,
        environment='production' if not DEBUG else 'development',
        traces_sample_rate=1.0,
    )

# New Relic Configuration (for application monitoring)
NEW_RELIC_LICENSE_KEY = os.environ.get('NEW_RELIC_LICENSE_KEY')
NEW_RELIC_APP_NAME = os.environ.get('NEW_RELIC_APP_NAME', 'SikaRemit Backend')

# Cloud Storage Configuration (AWS S3)
AWS_ACCESS_KEY_ID = os.environ.get('AWS_ACCESS_KEY_ID')
AWS_SECRET_ACCESS_KEY = os.environ.get('AWS_SECRET_ACCESS_KEY')
AWS_STORAGE_BUCKET_NAME = os.environ.get('AWS_STORAGE_BUCKET_NAME')
AWS_S3_REGION_NAME = os.environ.get('AWS_S3_REGION_NAME', 'us-east-1')
AWS_S3_CUSTOM_DOMAIN = os.environ.get('AWS_S3_CUSTOM_DOMAIN')

if AWS_STORAGE_BUCKET_NAME:
    AWS_S3_OBJECT_PARAMETERS = {
        'CacheControl': 'max-age=86400',
    }
    AWS_DEFAULT_ACL = 'public-read'
    AWS_S3_SECURE_URLS = True
    AWS_QUERYSTRING_AUTH = False

    # Use S3 for media files
    DEFAULT_FILE_STORAGE = 'storages.backends.s3boto3.S3Boto3Storage'
    MEDIA_URL = f'https://{AWS_S3_CUSTOM_DOMAIN}/media/'

# Axes Configuration (Brute force protection)
AXES_FAILURE_LIMIT = 5
AXES_COOLOFF_TIME = 1  # hours
AXES_RESET_ON_SUCCESS = True
AXES_LOCKOUT_URL = '/accounts/locked/'
AXES_LOCKOUT_TEMPLATE = 'accounts/lockout.html'

# Cache Configuration
CACHES = {
    'default': {
        'BACKEND': 'django_redis.cache.RedisCache',
        'LOCATION': os.environ.get('REDIS_URL', 'redis://127.0.0.1:6379/1'),
        'OPTIONS': {
            'CLIENT_CLASS': 'django_redis.client.DefaultClient',
        }
    }
}

# Session Configuration for Production
if not DEBUG:
    SESSION_ENGINE = 'django.contrib.sessions.backends.cache'
    SESSION_CACHE_ALIAS = 'default'

# Logging Configuration for Production
if not DEBUG:
    LOGGING = {
        'version': 1,
        'disable_existing_loggers': False,
        'formatters': {
            'verbose': {
                'format': '{levelname} {asctime} {module} {process:d} {thread:d} {message}',
                'style': '{',
            },
            'json': {
                '()': 'pythonjsonlogger.jsonlogger.JsonFormatter',
                'format': '%(asctime)s %(name)s %(levelname)s %(message)s',
            },
        },
        'handlers': {
            'console': {
                'class': 'logging.StreamHandler',
                'formatter': 'verbose',
            },
            'file': {
                'class': 'logging.FileHandler',
                'filename': 'logs/SikaRemit.log',
                'formatter': 'json',
            },
        },
        'root': {
            'handlers': ['console', 'file'],
            'level': 'INFO',
        },
        'loggers': {
            'django': {
                'handlers': ['console', 'file'],
                'level': 'INFO',
                'propagate': False,
            },
            'SikaRemit': {
                'handlers': ['console', 'file'],
                'level': 'DEBUG',
                'propagate': False,
            },
        },
    }

# Health Check Configuration
HEALTH_CHECK = {
    'DISK_USAGE_MAX': 90,  # percent
    'MEMORY_MIN': 100,    # in MB
}

# Webhook Configuration
WEBHOOK_TIMEOUT = 30  # seconds
WEBHOOK_MAX_RETRIES = 3
WEBHOOK_RETRY_DELAY = 5  # seconds

# Cross-Border Remittance Configuration (BoG Compliance)
REPORTING_THRESHOLD = Decimal('1000.00')  # USD - transactions above this must be reported to BoG
REMITTANCE_FEE_BASE = Decimal('5.00')  # USD - base fee for remittances
REMITTANCE_FEE_PERCENTAGE = Decimal('0.025')  # 2.5% percentage fee
BASE_COUNTRY = 'US'  # Base country for exchange rate calculations

# BoG Regulatory API Configuration
BOG_API_ENDPOINT = os.environ.get('BOG_API_ENDPOINT', 'https://api.bog.gov.gh/remittances')
BOG_API_KEY = os.environ.get('BOG_API_KEY')
BOG_REPORTING_ENABLED = os.environ.get('BOG_REPORTING_ENABLED', 'True').lower() == 'true'

# Exchange Rate API Configuration
EXCHANGE_API_URL = os.environ.get('EXCHANGE_API_URL', 'https://api.exchangerate-api.com/v4')
