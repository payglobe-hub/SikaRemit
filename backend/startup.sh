#!/bin/bash

echo "🚀 Starting SikaRemit Backend..."

# Set Django settings module
export DJANGO_SETTINGS_MODULE=core.settings

echo "📋 Environment variables:"
echo "  DJANGO_SETTINGS_MODULE=$DJANGO_SETTINGS_MODULE"
echo "  PORT=${PORT:-8000}"
echo "  ENVIRONMENT=${ENVIRONMENT:-development}"

# Skip Django setup test for faster startup
echo "⚡ Skipping Django setup test for faster deployment..."

# Collect static files
echo "📦 Collecting static files..."
python manage.py collectstatic --noinput

# Run database migrations
echo "🗄️ Running database migrations..."
python manage.py migrate --noinput || echo "⚠️ Migration failed, continuing..."

# Start Gunicorn directly without admin user creation
echo "🎯 Starting Gunicorn server..."
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
    --log-level info \
    --keepalive 2 \
    --max-keepalive-requests 1000
