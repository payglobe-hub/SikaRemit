#!/bin/bash

echo "🚀 Starting SikaRemit Backend..."

# Set Django settings module
export DJANGO_SETTINGS_MODULE=core.settings

echo "📋 Environment variables:"
echo "  DJANGO_SETTINGS_MODULE=$DJANGO_SETTINGS_MODULE"
echo "  PORT=${PORT:-8000}"
echo "  ENVIRONMENT=${ENVIRONMENT:-development}"

# Test Django setup
echo "🧪 Testing Django setup..."
python test_startup.py
if [ $? -ne 0 ]; then
    echo "❌ Django setup test failed"
    exit 1
fi

# Collect static files
echo "📦 Collecting static files..."
python manage.py collectstatic --noinput

# Run database migrations
echo "🗄️ Running database migrations..."
python manage.py migrate --noinput

# Create superuser if needed (non-interactive)
echo "👤 Checking for admin user..."
python manage.py shell -c "
from django.contrib.auth import get_user_model
User = get_user_model()
if not User.objects.filter(is_superuser=True).exists():
    print('Creating default admin user...')
    User.objects.create_superuser('admin@sikaremit.com', 'admin123', is_staff=True, is_superuser=True)
    print('Default admin user created: admin@sikaremit.com / admin123')
else:
    print('Admin user already exists')
"

echo "🎯 Starting Gunicorn server..."
exec gunicorn core.asgi:application \
    --bind 0.0.0.0:${PORT:-8000} \
    --worker-class uvicorn.workers.UvicornWorker \
    --workers 2 \
    --threads 4 \
    --timeout 120 \
    --graceful-timeout 30 \
    --max-requests 1000 \
    --max-requests-jitter 50 \
    --access-logfile - \
    --error-logfile - \
    --log-level info
