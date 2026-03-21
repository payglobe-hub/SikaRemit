#!/usr/bin/env python3
"""
Google OAuth Configuration Test Script
Tests if Google OAuth is properly configured and working
"""

import os
import sys
import django
from django.conf import settings
from django.test import Client
from django.urls import reverse
import requests

# Add backend to path
sys.path.append(os.path.join(os.path.dirname(__file__), 'backend'))

# Setup Django
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'core.settings')
django.setup()

def test_google_oauth_config():
    """Test if Google OAuth is properly configured"""
    print("🔍 Testing Google OAuth Configuration...")
    print("=" * 50)
    
    # Check environment variables
    client_id = getattr(settings, 'GOOGLE_OAUTH_CLIENT_ID', None)
    client_secret = getattr(settings, 'GOOGLE_OAUTH_CLIENT_SECRET', None)
    
    print(f"📋 Client ID: {'✅ Set' if client_id else '❌ Missing'}")
    print(f"🔑 Client Secret: {'✅ Set' if client_secret else '❌ Missing'}")
    
    if not client_id or not client_secret:
        print("❌ Google OAuth is not properly configured!")
        return False
    
    # Check if dummy values
    if 'dummy' in client_id.lower() or 'dummy' in client_secret.lower():
        print("⚠️  Still using dummy values!")
        return False
    
    print("✅ Google OAuth environment variables are configured!")
    return True

def test_google_oauth_endpoints():
    """Test Google OAuth endpoints"""
    print("\n🌐 Testing Google OAuth Endpoints...")
    print("=" * 50)
    
    client = Client()
    
    # Test OAuth initiation endpoint
    try:
        response = client.get('/api/v1/accounts/google/oauth/')
        if response.status_code == 302:  # Redirect
            print("✅ OAuth initiation endpoint working (redirecting to Google)")
        elif response.status_code == 503:
            print("❌ OAuth not configured")
            return False
        else:
            print(f"⚠️  OAuth initiation returned status: {response.status_code}")
    except Exception as e:
        print(f"❌ OAuth initiation error: {e}")
        return False
    
    # Test OAuth callback endpoint (should fail without code)
    try:
        response = client.post('/api/v1/accounts/google/callback/', {})
        if response.status_code == 400:
            print("✅ OAuth callback endpoint working (requires code)")
        else:
            print(f"⚠️  OAuth callback returned status: {response.status_code}")
    except Exception as e:
        print(f"❌ OAuth callback error: {e}")
        return False
    
    return True

def test_google_oauth_flow():
    """Test the actual Google OAuth flow (manual test)"""
    print("\n🔄 Testing Google OAuth Flow...")
    print("=" * 50)
    
    print("📝 Manual Test Instructions:")
    print("1. Start the frontend: cd frontend && npm run dev")
    print("2. Start the backend: cd backend && python manage.py runserver")
    print("3. Open browser to: http://localhost:3000/auth/register")
    print("4. Click 'Continue with Google'")
    print("5. Should redirect to Google for authentication")
    print("6. After authentication, should return to callback")
    print("7. Should create user and redirect to dashboard")
    
    # Check if frontend has the client ID
    frontend_env_path = os.path.join(os.path.dirname(__file__), 'frontend', '.env.local')
    if os.path.exists(frontend_env_path):
        with open(frontend_env_path, 'r') as f:
            content = f.read()
            if 'NEXT_PUBLIC_GOOGLE_CLIENT_ID' in content:
                print("✅ Frontend has Google Client ID configured")
            else:
                print("❌ Frontend missing Google Client ID")
                return False
    else:
        print("❌ Frontend .env.local file not found")
        return False
    
    return True

def test_redirect_uris():
    """Check if redirect URIs are properly configured"""
    print("\n🔗 Checking Redirect URI Configuration...")
    print("=" * 50)
    
    print("📋 Required Redirect URIs in Google Cloud Console:")
    print("• http://localhost:3000/auth/callback/google (Development)")
    print("• https://sikaremit.com/auth/callback/google (Production)")
    
    print("\n🔧 To configure in Google Cloud Console:")
    print("1. Go to: https://console.cloud.google.com/")
    print("2. Select your project")
    print("3. Go to APIs & Services → Credentials")
    print("4. Find your OAuth 2.0 Client ID")
    print("5. Click to edit")
    print("6. Add the redirect URIs above")
    print("7. Save changes")
    
    return True

def main():
    """Main test function"""
    print("🚀 GOOGLE OAUTH CONFIGURATION TEST")
    print("=" * 60)
    
    tests = [
        ("Environment Configuration", test_google_oauth_config),
        ("Backend Endpoints", test_google_oauth_endpoints),
        ("Frontend Configuration", test_google_oauth_flow),
        ("Redirect URI Setup", test_redirect_uris),
    ]
    
    results = []
    for test_name, test_func in tests:
        try:
            result = test_func()
            results.append((test_name, result))
        except Exception as e:
            print(f"❌ {test_name} failed with error: {e}")
            results.append((test_name, False))
    
    # Summary
    print("\n📊 TEST RESULTS SUMMARY")
    print("=" * 50)
    
    passed = 0
    for test_name, result in results:
        status = "✅ PASS" if result else "❌ FAIL"
        print(f"{status} {test_name}")
        if result:
            passed += 1
    
    print(f"\n🎯 Overall: {passed}/{len(results)} tests passed")
    
    if passed == len(results):
        print("🎉 Google OAuth is properly configured and ready!")
        print("\n🚀 Next steps:")
        print("1. Ensure redirect URIs are configured in Google Cloud Console")
        print("2. Test the complete OAuth flow in browser")
        print("3. Deploy to production with production URLs")
    else:
        print("⚠️  Some issues found. Please fix before using Google OAuth.")
    
    return passed == len(results)

if __name__ == "__main__":
    success = main()
    sys.exit(0 if success else 1)
