#!/usr/bin/env python
"""
Test script to verify Django application can start successfully
"""
import os
import sys
import django

# Set Django settings module
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'core.settings')

try:
    # Initialize Django
    django.setup()
    print("✅ Django setup completed successfully")
    
    # Test basic imports
    from django.contrib.auth.models import User
    print("✅ Django models imported successfully")
    
    # Test ASGI application
    from core.asgi import application
    print("✅ ASGI application imported successfully")
    
    # Test basic Django functionality
    from django.core.management import execute_from_command_line
    print("✅ Django management commands available")
    
    print("\n🎉 All startup tests passed! Application should start successfully.")
    
except Exception as e:
    print(f"❌ Startup test failed: {e}")
    import traceback
    traceback.print_exc()
    sys.exit(1)
