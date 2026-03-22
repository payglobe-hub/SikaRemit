#!/bin/bash

echo "🚀 Starting SikaRemit Backend..."
echo "🔥 BUILD TIMESTAMP: $(date)"
echo "🔥 GIT COMMIT: $(git rev-parse HEAD 2>/dev/null || echo 'unknown')"
echo "🔥 WORKING DIR: $(pwd)"

# Set Django settings module
export DJANGO_SETTINGS_MODULE=core.settings

echo "📋 Environment variables:"
echo "  DJANGO_SETTINGS_MODULE=$DJANGO_SETTINGS_MODULE"
echo "  PORT=${PORT:-8000}"
echo "  ENVIRONMENT=${ENVIRONMENT:-development}"

# CRITICAL: Force disable Prometheus before anything else
export PROMETHEUS_METRICS_ENABLED=False
echo "🔥 CRITICAL: PROMETHEUS FORCE DISABLED"

# Skip Django setup test for faster startup
echo "⚡ Skipping Django setup test for faster deployment..."

# Collect static files
echo "📦 Collecting static files..."
python manage.py collectstatic --noinput

# Run database migrations
echo "🗄️ Running database migrations..."
python manage.py migrate --noinput || echo "⚠️ Migration failed, continuing..."

# Test Django import before starting Gunicorn
echo "🧪 Testing Django import..."
python -c "
import os
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'core.settings')
print('🔥 CRITICAL: About to import Django...')
import django
print('🔥 CRITICAL: About to setup Django...')
django.setup()
print('✅ Django setup successful')
print('🔥 CRITICAL: INSTALLED_APPS:')
from django.conf import settings
for app in settings.INSTALLED_APPS:
    if 'prometheus' in app.lower():
        print(f'🔥🔥🔥 FOUND PROMETHEUS APP: {app}')
    else:
        print(f'  - {app}')
" || echo "❌ Django setup failed"

# Start Gunicorn directly without admin user creation
echo "🎯 Starting Gunicorn server..."
echo "🔍 Command: gunicorn core.asgi:application --bind 0.0.0.0:${PORT:-8000} --worker-class uvicorn.workers.UvicornWorker --workers 1 --threads 2 --timeout 60 --graceful-timeout 30 --max-requests 500 --access-logfile - --error-logfile - --log-level info"

exec gunicorn core.asgi:application \
    --bind 0.0.0.0:${PORT:-8000} \
    --worker-class uvicorn.workers.UvicornWorker \
    --workers 1 \
    --threads 2 \
    --timeout 60 \
    --graceful-timeout 30 \
    --max-requests 500 \
    --access-logfile - \
    --error-logfile - \
    --log-level info
