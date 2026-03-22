from pathlib import Path
import os
import sys
from datetime import timedelta
from celery.schedules import crontab
import warnings
import logging

warnings.filterwarnings("ignore", message="pkg_resources is deprecated as an API", category=UserWarning)

# Build paths inside the project like this: BASE_DIR / 'subdir'.
BASE_DIR = Path(__file__).resolve().parent.parent

# Load .env file for local development
from dotenv import load_dotenv
load_dotenv(BASE_DIR / '.env')

# Force production environment if .env.production exists
if (BASE_DIR / '.env.production').exists() and not (BASE_DIR / '.env').exists():
    load_dotenv(BASE_DIR / '.env.production')

# Early environment detection to disable Prometheus before any Django imports
PORT = os.environ.get('PORT', '8000')
IS_CLOUD_ENVIRONMENT = any([
    os.environ.get('VERCEL', ''),
    os.environ.get('RENDER', ''),
    os.environ.get('HEROKU', ''),
    os.environ.get('GCP_PROJECT', ''),
    os.environ.get('AWS_REGION', ''),
    os.environ.get('DYNO', ''),  # Heroku
    PORT and PORT != '8000',  # Non-dev port
])

# Force disable Prometheus in cloud environments BEFORE any Django imports
if IS_CLOUD_ENVIRONMENT:
    os.environ['PROMETHEUS_METRICS_ENABLED'] = 'False'
    print(f"DEBUG: Cloud environment detected (PORT={PORT}), Prometheus disabled")

# Completely disable Prometheus for all deployments to prevent DNS issues
PROMETHEUS_METRICS_ENABLED = False
print("DEBUG: Prometheus completely disabled for all deployments")

import dj_database_url

# SECURITY WARNING: keep the secret key used in production secret!
SECRET_KEY = os.environ.get('SECRET_KEY', 'django-insecure-default-key-for-development-change-in-production')

# Custom user model
AUTH_USER_MODEL = 'users.User'

AUTHENTICATION_BACKENDS = [
    'axes.backends.AxesStandaloneBackend',
    'django.contrib.auth.backends.ModelBackend',
]

# SECURITY WARNING: don't run with debug turned on in production!
DEBUG = os.environ.get('DEBUG', 'False').lower() == 'true'

# Environment detection
IS_PRODUCTION = os.environ.get('ENVIRONMENT', 'development').lower() == 'production'

ALLOWED_HOSTS = os.environ.get('ALLOWED_HOSTS', 'localhost,127.0.0.1,192.168.43.210,testserver,sikaremit.onrender.com').split(',')

# Always ensure sikaremit.onrender.com is included
if 'sikaremit.onrender.com' not in ALLOWED_HOSTS:
    ALLOWED_HOSTS.append('sikaremit.onrender.com')

# Debug: Print ALLOWED_HOSTS to see what's actually being loaded
print(f"DEBUG: ALLOWED_HOSTS = {ALLOWED_HOSTS}")
print(f"DEBUG: ALLOWED_HOSTS env var = {os.environ.get('ALLOWED_HOSTS', 'NOT_SET')}")

CSRF_TRUSTED_ORIGINS = [
    'http://localhost:3000',
    'http://127.0.0.1:3000',
]

# Add production CSRF trusted origins from environment
_csrf_production_origins = os.environ.get('CSRF_TRUSTED_ORIGINS', '')
if _csrf_production_origins:
    CSRF_TRUSTED_ORIGINS.extend([o.strip() for o in _csrf_production_origins.split(',') if o.strip()])
elif IS_PRODUCTION:
    CSRF_TRUSTED_ORIGINS.extend([
        'https://sikaremit.com',
        'https://www.sikaremit.com',
        'https://sikaremit.vercel.app',
        'https://api.sikaremit.com',
    ])

# Application definition
INSTALLED_APPS = [
    'django.contrib.admin',
    'django.contrib.auth',
    'django.contrib.contenttypes',
    'django.contrib.sessions',
    'django.contrib.messages',
    'django.contrib.staticfiles',
    'rest_framework',
    'rest_framework_simplejwt',
    'rest_framework_simplejwt.token_blacklist',
    'corsheaders',
    'channels',
    'django_extensions',
    'axes',
    'drf_spectacular_sidecar',
    'drf_spectacular',
    'allauth',
    'allauth.account',
    'allauth.socialaccount',
    'allauth.socialaccount.providers.google',
    'accounts',
    'core',
    'payments',
    'merchants',
    'compliance',
    'notifications',
    'dashboard',
    'users',
    'ussd',
    'kyc',
    'invoice',
    'fcm_django',
    'ecommerce',
    'django_celery_beat',
]

# Prometheus completely disabled - do not add to INSTALLED_APPS
print("DEBUG: Prometheus disabled - django_prometheus NOT added to INSTALLED_APPS")

# Django Allauth Configuration
ACCOUNT_EMAIL_VERIFICATION = 'none'
ACCOUNT_EMAIL_REQUIRED = True
ACCOUNT_USERNAME_REQUIRED = False
ACCOUNT_AUTHENTICATION_METHOD = 'email'
ACCOUNT_USER_MODEL_USERNAME_FIELD = None

SOCIALACCOUNT_PROVIDERS = {
    'google': {
        'SCOPE': ['profile', 'email'],
        'AUTH_PARAMS': {'access_type': 'online'},
        'APP': {
            'client_id': os.environ.get('GOOGLE_CLIENT_ID', ''),
            'secret': os.environ.get('GOOGLE_CLIENT_SECRET', ''),
            'key': ''
        }
    }
}

# drf-spectacular settings
SPECTACULAR_SETTINGS = {
    'SWAGGER_UI_DIST': 'SIDECAR',
    'SWAGGER_UI_FAVICON_HREF': 'SIDECAR',
    'REDOC_DIST': 'SIDECAR',
}

MIDDLEWARE = [
    'django.middleware.security.SecurityMiddleware',
    # 'core.middleware.security.SecurityHeadersMiddleware',
    # 'core.middleware.security.SSLRedirectMiddleware',
    # 'core.middleware.security.RateLimitMiddleware',
    # 'core.middleware.security.SecurityAuditMiddleware',
    'whitenoise.middleware.WhiteNoiseMiddleware',
    'django.contrib.sessions.middleware.SessionMiddleware',
    'django.middleware.csrf.CsrfViewMiddleware',
    'corsheaders.middleware.CorsMiddleware',
    'django.middleware.common.CommonMiddleware',
    'django.contrib.auth.middleware.AuthenticationMiddleware',
    'django.contrib.messages.middleware.MessageMiddleware',
    'django.middleware.clickjacking.XFrameOptionsMiddleware',
    'allauth.account.middleware.AccountMiddleware',
    'axes.middleware.AxesMiddleware',
    # 'core.middleware.security_middleware.IPTrackingMiddleware',
    # 'core.middleware.security_middleware.DeviceTrackingMiddleware',
    # 'core.middleware.security_middleware.AuditLoggingMiddleware',
    # Prometheus middleware
    'django_prometheus.middleware.PrometheusBeforeMiddleware',
    'backend.monitoring.prometheus_metrics.PrometheusMiddleware',
    'django_prometheus.middleware.PrometheusAfterMiddleware',
]

# Add production-only security middleware
if IS_PRODUCTION:
    MIDDLEWARE.insert(2, 'core.middleware.security_middleware.APIRateLimitMiddleware')
    MIDDLEWARE.append('core.middleware.security_middleware.SQLInjectionProtectionMiddleware')
    MIDDLEWARE.append('core.middleware.security_middleware.XSSProtectionMiddleware')

ROOT_URLCONF = 'core.urls'

TEMPLATES = [
    {
        'BACKEND': 'django.template.backends.django.DjangoTemplates',
        'DIRS': [],
        'APP_DIRS': True,
        'OPTIONS': {
            'context_processors': [
                'django.template.context_processors.debug',
                'django.template.context_processors.request',
                'django.contrib.auth.context_processors.auth',
                'django.contrib.messages.context_processors.messages',
            ],
        },
    },
]

WSGI_APPLICATION = 'core.wsgi.application'

# ASGI application for WebSocket support
ASGI_APPLICATION = 'core.asgi.application'

# Database
use_sqlite = os.environ.get('DJANGO_USE_SQLITE', 'true').lower() in {'1', 'true', 'yes'}

if use_sqlite and ('test' in sys.argv or 'pytest' in sys.argv[0]):
    # Explicit SQLite for testing (only when DJANGO_USE_SQLITE is set)
    DATABASES = {
        'default': {
            'ENGINE': 'django.db.backends.sqlite3',
            'NAME': BASE_DIR / 'test_db.sqlite3',
            'ATOMIC_REQUESTS': False,
        }
    }
elif use_sqlite:
    # Optional SQLite database for local development
    DATABASES = {
        'default': {
            'ENGINE': 'django.db.backends.sqlite3',
            'NAME': BASE_DIR / 'db.sqlite3',
            'ATOMIC_REQUESTS': False,
        }
    }
else:
    # Production database configuration
    DATABASE_URL = os.environ.get('DATABASE_URL')
    if DATABASE_URL:
        DATABASES = {
            'default': dj_database_url.config(
                default=DATABASE_URL,
                conn_max_age=600,
                ssl_require=True if DATABASE_URL.startswith('postgres://') else False
            )
        }
    else:
        # Fallback to individual environment variables
        DATABASES = {
            'default': {
                'ENGINE': 'django.db.backends.postgresql',
                'NAME': os.environ.get('DB_NAME', 'SikaRemit'),
                'USER': os.environ.get('DB_USER', 'postgres'),
                'PASSWORD': os.environ.get('DB_PASSWORD'),  
                'HOST': os.environ.get('DB_HOST', 'localhost'),
                'PORT': os.environ.get('DB_PORT', '5432'),
                'ATOMIC_REQUESTS': False,
            }
        }

# Password validation
AUTH_PASSWORD_VALIDATORS = [
    {
        'NAME': 'django.contrib.auth.password_validation.UserAttributeSimilarityValidator',
    },
    {
        'NAME': 'django.contrib.auth.password_validation.MinimumLengthValidator',
    },
    {
        'NAME': 'django.contrib.auth.password_validation.CommonPasswordValidator',
    },
    {
        'NAME': 'django.contrib.auth.password_validation.NumericPasswordValidator',
    },
]

# Internationalization
LANGUAGE_CODE = 'en-us'
TIME_ZONE = 'UTC'
USE_I18N = True
USE_TZ = True

# Static files (CSS, JavaScript, Images)
STATIC_URL = 'static/'
STATIC_ROOT = BASE_DIR / 'staticfiles'

# Media files (Product images, uploads)
MEDIA_URL = '/media/'
MEDIA_ROOT = BASE_DIR / 'media'

# Default primary key field type
DEFAULT_AUTO_FIELD = 'django.db.models.BigAutoField'

# REST Framework Configuration
REST_FRAMEWORK = {
    'DEFAULT_RENDERER_CLASSES': [
        'rest_framework.renderers.JSONRenderer',
    ],
    'DEFAULT_PARSER_CLASSES': [
        'rest_framework.parsers.JSONParser',
        'rest_framework.parsers.MultiPartParser',
        'rest_framework.parsers.FormParser',
    ],
    'DEFAULT_AUTHENTICATION_CLASSES': [
        'rest_framework_simplejwt.authentication.JWTAuthentication',
        'rest_framework.authentication.SessionAuthentication',
    ],
    'DEFAULT_PERMISSION_CLASSES': [
        'rest_framework.permissions.IsAuthenticated',
    ],
    'DEFAULT_THROTTLE_CLASSES': [],  # Configured conditionally below based on environment
    'DEFAULT_THROTTLE_RATES': {
        'anon': '200/hour',
        'user': '2000/hour',
        'admin': '20000/hour',
        'payment': '100/hour',  # Stricter rate for payment endpoints
        'login': '10/minute',   # Prevent brute force attacks
    },
    'EXCEPTION_HANDLER': 'rest_framework.views.exception_handler',
    'DEFAULT_SCHEMA_CLASS': 'drf_spectacular.openapi.AutoSchema',
}

# Custom Throttle Classes
THROTTLE_CLASSES = {
    'payment': 'payments.throttling.PaymentThrottle',
    'admin': 'payments.throttling.AdminThrottle',
    'public': 'payments.throttling.PublicThrottle',
    'endpoint': 'payments.throttling.EndpointThrottle',
}

# JWT Settings
SIMPLE_JWT = {
    'ACCESS_TOKEN_LIFETIME': timedelta(minutes=60),
    'REFRESH_TOKEN_LIFETIME': timedelta(days=1),
}

# CORS settings
CORS_ALLOWED_ORIGINS = os.environ.get('CORS_ALLOWED_ORIGINS', 'http://localhost:3000,http://127.0.0.1:3000').split(',')
CORS_ALLOW_CREDENTIALS = True
CORS_ALLOW_METHODS = [
    "DELETE",
    "GET",
    "OPTIONS",
    "PATCH",
    "POST",
    "PUT",
]
CORS_ALLOW_HEADERS = [
    "accept",
    "accept-encoding",
    "authorization",
    "content-type",
    "dnt",
    "origin",
    "user-agent",
    "x-csrftoken",
    "x-requested-with",
]

# Email settings - SendGrid for production
SENDGRID_API_KEY = os.environ.get('SENDGRID_API_KEY', '')

if IS_PRODUCTION and SENDGRID_API_KEY:
    # Use SendGrid in production
    EMAIL_BACKEND = 'core.email_backend.SendGridBackend'
else:
    # Use console backend for development/testing
    EMAIL_BACKEND = os.environ.get('EMAIL_BACKEND', 'django.core.mail.backends.console.EmailBackend')

# Fallback SMTP settings (if not using SendGrid)
EMAIL_HOST = os.environ.get('EMAIL_HOST', 'smtp.sendgrid.net')
EMAIL_PORT = int(os.environ.get('EMAIL_PORT', 587))
EMAIL_USE_TLS = os.environ.get('EMAIL_USE_TLS', 'True').lower() == 'true'
EMAIL_HOST_USER = os.environ.get('EMAIL_HOST_USER', 'apikey')
EMAIL_HOST_PASSWORD = os.environ.get('EMAIL_HOST_PASSWORD', SENDGRID_API_KEY)
DEFAULT_FROM_EMAIL = os.environ.get('DEFAULT_FROM_EMAIL', 'noreply@sikaremit.com')

# Default country for mobile money operations
BASE_COUNTRY = os.environ.get('BASE_COUNTRY', 'GHA')  # Ghana

# Default currency for the application
DEFAULT_CURRENCY = os.environ.get('DEFAULT_CURRENCY', 'GHS')  # Ghanaian Cedi
RATE_LIMIT = int(os.environ.get('RATE_LIMIT', 300))  # Increased from 100 to 300/min

# Caching configuration
# Use local memory cache for development
CACHES = {
    'default': {
        'BACKEND': 'django.core.cache.backends.locmem.LocMemCache',
        'LOCATION': 'unique-snowflake',
    }
}

# Cache timeouts
CACHE_MIDDLEWARE_SECONDS = 300  # 5 minutes
CACHE_MIDDLEWARE_KEY_PREFIX = 'sikaremit'

# Celery Configuration
CELERY_BROKER_URL = os.environ.get('REDIS_URL', 'redis://localhost:6379/0')
CELERY_RESULT_BACKEND = os.environ.get('REDIS_URL', 'redis://localhost:6379/0')
CELERY_ACCEPT_CONTENT = ['json']
CELERY_TASK_SERIALIZER = 'json'
CELERY_RESULT_SERIALIZER = 'json'
CELERY_TIMEZONE = 'UTC'

# Celery Beat Settings (for scheduled tasks)
CELERY_BEAT_SCHEDULE = {
    'cleanup-expired-tokens': {
        'task': 'accounts.tasks.cleanup_expired_tokens',
        'schedule': 3600.0,  # Every hour
    },
    'process-scheduled-payments': {
        'task': 'payments.tasks.process_scheduled_payments',
        'schedule': 300.0,  # Every 5 minutes
    },
    'update-exchange-rates': {
        'task': 'payments.tasks.update_exchange_rates',
        'schedule': 900.0,  # Every 15 minutes
    },
    'daily-reconciliation': {
        'task': 'payments.tasks.daily_reconciliation',
        'schedule': crontab(hour=3, minute=0),  # Daily at 3am
    },
    'daily-merchant-settlements': {
        'task': 'payments.tasks.run_merchant_settlements',
        'schedule': crontab(hour=2, minute=0),  # Daily at 2am
    },
}

# Channels configuration for WebSocket support
_channels_redis_url = os.environ.get('REDIS_URL')
if _channels_redis_url:
    CHANNEL_LAYERS = {
        'default': {
            'BACKEND': 'channels_redis.core.RedisChannelLayer',
            'CONFIG': {
                'hosts': [_channels_redis_url],
            },
        },
    }
else:
    # Fallback for local dev without Redis (single-worker only)
    CHANNEL_LAYERS = {
        'default': {
            'BACKEND': 'channels.layers.InMemoryChannelLayer',
        },
    }

# Sentry Configuration for Error Monitoring
SENTRY_DSN = os.environ.get('SENTRY_DSN', '')
SENTRY_TRACES_SAMPLE_RATE = float(os.environ.get('SENTRY_TRACES_SAMPLE_RATE', '0.1'))
ENVIRONMENT = os.environ.get('ENVIRONMENT', 'development')
RELEASE_VERSION = os.environ.get('RELEASE_VERSION', 'dev')

# Disable Sentry initialization for deployment stability
# TODO: Enable Sentry when proper DSN is configured
# if SENTRY_DSN and SENTRY_DSN.startswith(('http://', 'https://')) and 'test' not in sys.argv:
#     try:
#         from core.error_monitoring import initialize_sentry
#         initialize_sentry()
#     except Exception as e:
#         import logging
#         logger = logging.getLogger(__name__)
#         logger.warning(f"Failed to initialize Sentry: {e}. Continuing without error monitoring.")

# API Versioning
REST_FRAMEWORK['DEFAULT_VERSIONING_CLASS'] = 'core.versioning.SikaRemitAPIVersioning'
REST_FRAMEWORK['DEFAULT_VERSION'] = 'v1'
REST_FRAMEWORK['ALLOWED_VERSIONS'] = ['v1', 'v2']
REST_FRAMEWORK['VERSION_PARAM'] = 'version'

# Currency settings for Stripe (amounts in cents)
STRIPE_CURRENCY_PRECISION = {
    'USD': 100,  # dollars to cents
    'GHS': 100,  # cedis to pesewas
    'EUR': 100   # euros to cents
}

# =============================================================================
# PAYMENT GATEWAY CONFIGURATION
# IMPORTANT: Set these environment variables for PRODUCTION use
# =============================================================================

# MTN Mobile Money (MoMo)
# Production URL: https://proxy.momoapi.mtn.com
# Sandbox URL: https://sandbox.momodeveloper.mtn.com
MTN_MOMO_API_KEY = os.environ.get('MTN_MOMO_API_KEY')
MTN_MOMO_API_SECRET = os.environ.get('MTN_MOMO_API_SECRET')
MTN_MOMO_SUBSCRIPTION_KEY = os.environ.get('MTN_MOMO_SUBSCRIPTION_KEY')
MTN_MOMO_WEBHOOK_SECRET = os.environ.get('MTN_MOMO_WEBHOOK_SECRET')
MTN_MOMO_API_URL = os.environ.get('MTN_MOMO_API_URL')  # REQUIRED - No default, must be explicitly set

# Airtel/Tigo Money
AIRTEL_API_KEY = os.environ.get('AIRTEL_API_KEY')
AIRTEL_API_URL = os.environ.get('AIRTEL_API_URL')
AIRTEL_CLIENT_ID = os.environ.get('AIRTEL_CLIENT_ID')
AIRTEL_CLIENT_SECRET = os.environ.get('AIRTEL_CLIENT_SECRET')
AIRTEL_WEBHOOK_SECRET = os.environ.get('AIRTEL_WEBHOOK_SECRET')

# Telecel Cash Configuration
TELECEL_API_KEY = os.environ.get('TELECEL_API_KEY')
TELECEL_API_URL = os.environ.get('TELECEL_API_URL')
TELECEL_MERCHANT_ID = os.environ.get('TELECEL_MERCHANT_ID')
TELECEL_WEBHOOK_SECRET = os.environ.get('TELECEL_WEBHOOK_SECRET')

# Payment callback URL - MUST be set to your production domain
PAYMENT_CALLBACK_URL = os.environ.get('PAYMENT_CALLBACK_URL')  # e.g., https://api.sikaremit.com/api/v1/payments/webhooks

# Google OAuth Configuration
GOOGLE_OAUTH_CLIENT_ID = os.environ.get('GOOGLE_OAUTH_CLIENT_ID')
GOOGLE_OAUTH_CLIENT_SECRET = os.environ.get('GOOGLE_OAUTH_CLIENT_SECRET')

# Exchange Rate API Configuration (for live FX rates)
EXCHANGE_RATE_API_KEY = os.environ.get('EXCHANGE_RATE_API_KEY', '')
EXCHANGE_RATE_API_URL = os.environ.get('EXCHANGE_RATE_API_URL', 'https://v6.exchangerate-api.com/v6/')

# Stripe Payments Configuration
STRIPE_SECRET_KEY = os.environ.get('STRIPE_SECRET_KEY')
STRIPE_PUBLIC_KEY = os.environ.get('STRIPE_PUBLIC_KEY')
STRIPE_WEBHOOK_SECRET = os.environ.get('STRIPE_WEBHOOK_SECRET', '')

# G-Money Payment Gateway Configuration (GCB Bank Ghana)
G_MONEY_API_KEY = os.environ.get('G_MONEY_API_KEY')
G_MONEY_API_SECRET = os.environ.get('G_MONEY_API_SECRET')
G_MONEY_API_URL = os.environ.get('G_MONEY_API_URL', 'https://api.gcb.com.gh/nexus')
G_MONEY_WEBHOOK_SECRET = os.environ.get('G_MONEY_WEBHOOK_SECRET')

# MFA Configuration
MFA_ISSUER_NAME = os.environ.get('MFA_ISSUER_NAME', 'SikaRemit')

# SMS Configuration (AfricasTalking - Default)
SMS_PROVIDER = os.environ.get('SMS_PROVIDER', 'africastalking')
AFRICASTALKING_USERNAME = os.environ.get('AFRICASTALKING_USERNAME')
AFRICASTALKING_API_KEY = os.environ.get('AFRICASTALKING_API_KEY')
AFRICASTALKING_SENDER_ID = os.environ.get('AFRICASTALKING_SENDER_ID', 'SikaRemit')

# Twilio SMS Configuration (Alternative)
TWILIO_ACCOUNT_SID = os.environ.get('TWILIO_ACCOUNT_SID')
TWILIO_AUTH_TOKEN = os.environ.get('TWILIO_AUTH_TOKEN')
TWILIO_PHONE_NUMBER = os.environ.get('TWILIO_PHONE_NUMBER')

# Axes Configuration - Enable only in production
AXES_ENABLED = IS_PRODUCTION
AXES_FAILURE_LIMIT = 5  # Lock after 5 failed attempts
AXES_COOLOFF_TIME = 1  # 1 hour lockout
AXES_LOCKOUT_TEMPLATE = 'account/locked.html'

# =============================================================================
# PRODUCTION-ONLY SECURITY SETTINGS
# =============================================================================
# These settings are only enabled in production to avoid interfering with development

if IS_PRODUCTION:
    # Enable rate limiting in production
    REST_FRAMEWORK['DEFAULT_THROTTLE_CLASSES'] = [
        'rest_framework.throttling.AnonRateThrottle',
        'rest_framework.throttling.UserRateThrottle',
    ]
    
    # Stricter CSRF settings for production
    CSRF_COOKIE_SECURE = True
    CSRF_COOKIE_HTTPONLY = True
    CSRF_USE_SESSIONS = True
    
    # Session security
    SESSION_COOKIE_SECURE = True
    SESSION_COOKIE_HTTPONLY = True
    SESSION_COOKIE_SAMESITE = 'Lax'
    
    # Security headers
    SECURE_BROWSER_XSS_FILTER = True
    SECURE_CONTENT_TYPE_NOSNIFF = True
    SECURE_HSTS_SECONDS = 31536000  # 1 year
    SECURE_HSTS_INCLUDE_SUBDOMAINS = True
    SECURE_HSTS_PRELOAD = True
    SECURE_SSL_REDIRECT = True
    
    # X-Frame-Options
    X_FRAME_OPTIONS = 'DENY'
    
    # Use Redis cache in production if available, otherwise local memory
    redis_url = os.environ.get('REDIS_URL')
    if redis_url:
        CACHES = {
            'default': {
                'BACKEND': 'django_redis.cache.RedisCache',
                'LOCATION': redis_url,
                'OPTIONS': {
                    'CLIENT_CLASS': 'django_redis.client.DefaultClient',
                }
            }
        }
    else:
        CACHES = {
            'default': {
                'BACKEND': 'django.core.cache.backends.locmem.LocMemCache',
                'LOCATION': 'unique-snowflake-prod',
            }
        }
    
    # Use WhiteNoise for static files in production
    STATICFILES_STORAGE = 'whitenoise.storage.CompressedStaticFilesStorage'
else:
    # Development settings - relaxed security for easier testing
    CSRF_COOKIE_SECURE = False
    SESSION_COOKIE_SECURE = False
    SECURE_SSL_REDIRECT = False

# Compliance settings
COMPLIANCE_REPORTING_ENABLED = os.environ.get('COMPLIANCE_REPORTING_ENABLED', 'False').lower() == 'true'

# System checks configuration
SYSTEM_CHECKS = [
    'users.system_checks.check_user_type_hardcoded_values', 
    'users.system_checks.check_user_type_constants_import',
    'users.system_checks.check_user_type_signal_consistency',
    'core.startup_checks.check_production_configuration',
]

# Grafana Monitoring Configuration
GRAFANA_URL = os.environ.get('GRAFANA_URL', 'https://payglobesr.grafana.net/')
GRAFANA_API_KEY = os.environ.get('GRAFANA_API_KEY', 'your-grafana-api-key')
GRAFANA_USERNAME = os.environ.get('GRAFANA_USERNAME', 'admin')
GRAFANA_PASSWORD = os.environ.get('GRAFANA_PASSWORD', 'your-grafana-password')

# Prometheus Metrics Configuration - Completely Disabled
PROMETHEUS_METRICS_ENABLED = False
PROMETHEUS_METRICS_EXPORT_PORT = 8001
PROMETHEUS_MULTIPROC_DIR = '/tmp/prometheus_multiproc_dir'

# Logging configuration to suppress gateway warnings
LOGGING = {
    'version': 1,
    'disable_existing_loggers': False,
    'filters': {
        'suppress_gateway_warnings': {
            '()': 'core.logging.GatewayWarningFilter',
        },
    },
    'handlers': {
        'console': {
            'class': 'logging.StreamHandler',
            'filters': ['suppress_gateway_warnings'],
        },
    },
    'root': {
        'handlers': ['console'],
        'level': 'INFO',
    },
}

# Initialize Sentry if DSN is configured and valid, and not running tests
if SENTRY_DSN and SENTRY_DSN.startswith(('http://', 'https://')) and 'test' not in sys.argv:
    from core.error_monitoring import initialize_sentry
    initialize_sentry()
