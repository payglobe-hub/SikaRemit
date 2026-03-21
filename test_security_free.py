#!/usr/bin/env python3
"""
FREE Security Testing for SikaRemit
Tests the security hardening we just implemented
"""

import os
import sys
import json
from pathlib import Path

# Add project root to path
sys.path.append(str(Path(__file__).parent / 'backend'))

def test_security_configuration():
    """Test security configuration for free"""
    print("🔒 SIKAREMIT SECURITY CONFIGURATION TEST")
    print("=" * 50)
    
    try:
        # Load environment variables first
        from dotenv import load_dotenv
        from pathlib import Path
        load_dotenv(Path(__file__).parent / '.env')
        
        # Setup Django
        os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'core.settings')
        import django
        django.setup()
        
        from core.security_middleware import SecurityConfigurationValidator
        validator = SecurityConfigurationValidator()
        errors, warnings = validator.validate_configuration()
        
        print(f"🚨 Critical Issues: {len(errors)}")
        print(f"⚠️  Warnings: {len(warnings)}")
        print()
        
        if errors:
            print("🚨 CRITICAL SECURITY ISSUES:")
            for error in errors:
                print(f"  ❌ {error}")
            print()
        
        if warnings:
            print("⚠️ SECURITY WARNINGS:")
            for warning in warnings:
                print(f"  ⚠️ {warning}")
            print()
        
        if not errors and not warnings:
            print("✅ SECURITY CONFIGURATION IS SECURE")
            security_score = 10
        else:
            security_score = max(0, 10 - len(errors) - len(warnings))
            print(f"📊 SECURITY SCORE: {security_score}/10")
        
        return security_score, errors, warnings
        
    except Exception as e:
        print(f"❌ Security test failed: {e}")
        return 0, ["Test failed"], []

def test_security_headers():
    """Test security headers implementation"""
    print("\n🛡️ SECURITY HEADERS TEST")
    print("=" * 50)
    
    try:
        from django.test import Client
        from django.urls import reverse
        
        client = Client()
        
        # Test a simple endpoint
        response = client.get('/health/')
        
        security_headers = {
            'X-Content-Type-Options': 'nosniff',
            'X-Frame-Options': 'DENY',
            'X-XSS-Protection': '1; mode=block',
            'Content-Security-Policy': 'default-src',
            'Strict-Transport-Security': 'max-age',
        }
        
        headers_found = 0
        headers_total = len(security_headers)
        
        print("Security Headers Check:")
        for header, expected_value in security_headers.items():
            if header in response:
                headers_found += 1
                print(f"  ✅ {header}: Present")
            else:
                print(f"  ❌ {header}: Missing")
        
        header_score = (headers_found / headers_total) * 10
        print(f"\n📊 HEADERS SCORE: {header_score:.1f}/10")
        
        return header_score
        
    except Exception as e:
        print(f"❌ Headers test failed: {e}")
        return 0

def test_database_ssl():
    """Test database SSL configuration"""
    print("\n🗄️ DATABASE SSL TEST")
    print("=" * 50)
    
    try:
        from django.conf import settings
        
        databases = getattr(settings, 'DATABASES', {})
        default_db = databases.get('default', {})
        
        if not default_db:
            print("❌ No database configuration found")
            return 0
        
        # Check SSL configuration
        options = default_db.get('OPTIONS', {})
        sslmode = options.get('sslmode')
        
        print("Database SSL Configuration:")
        print(f"  Engine: {default_db.get('ENGINE', 'Not set')}")
        print(f"  Host: {default_db.get('HOST', 'Not set')}")
        print(f"  SSL Mode: {sslmode or 'Not set'}")
        
        if sslmode == 'require':
            print("  ✅ SSL is enforced")
            ssl_score = 10
        elif sslmode:
            print(f"  ⚠️ SSL mode is {sslmode} (should be 'require')")
            ssl_score = 7
        else:
            print("  ❌ SSL is not enforced")
            ssl_score = 0
        
        print(f"\n📊 SSL SCORE: {ssl_score}/10")
        
        return ssl_score
        
    except Exception as e:
        print(f"❌ Database SSL test failed: {e}")
        return 0

def test_cors_configuration():
    """Test CORS configuration"""
    print("\n🌐 CORS CONFIGURATION TEST")
    print("=" * 50)
    
    try:
        from django.conf import settings
        
        cors_origins = getattr(settings, 'CORS_ALLOWED_ORIGINS', [])
        
        print("CORS Configuration:")
        print(f"  Allowed Origins: {len(cors_origins)} configured")
        
        # Check for development origins
        dev_origins = ['localhost', '127.0.0.1', '0.0.0.0', '192.168', 'vercel.app']
        dev_found = []
        
        for origin in cors_origins:
            for dev in dev_origins:
                if dev in origin:
                    dev_found.append(origin)
                    break
        
        if dev_found:
            print("  ⚠️ Development origins found:")
            for origin in dev_found:
                print(f"    - {origin}")
            cors_score = 5
        elif cors_origins:
            print("  ✅ Production origins only")
            cors_score = 10
        else:
            print("  ❌ No CORS origins configured")
            cors_score = 0
        
        print(f"\n📊 CORS SCORE: {cors_score}/10")
        
        return cors_score
        
    except Exception as e:
        print(f"❌ CORS test failed: {e}")
        return 0

def test_secret_key():
    """Test SECRET_KEY configuration"""
    print("\n🔑 SECRET KEY TEST")
    print("=" * 50)
    
    try:
        from django.conf import settings
        
        secret_key = getattr(settings, 'SECRET_KEY', None)
        
        print("SECRET_KEY Analysis:")
        
        if not secret_key:
            print("  ❌ SECRET_KEY is not set")
            return 0
        
        if 'django-insecure' in secret_key:
            print("  ❌ Using default Django secret key")
            return 0
        
        if 'default' in secret_key.lower() or 'test' in secret_key.lower():
            print("  ⚠️ Using weak/default secret key")
            score = 5
        else:
            print("  ✅ Custom secret key configured")
            score = 10
        
        # Check length
        if len(secret_key) < 50:
            print(f"  ⚠️ Secret key is {len(secret_key)} characters (should be 50+)")
            score = max(score - 2, 0)
        else:
            print(f"  ✅ Secret key is {len(secret_key)} characters")
        
        print(f"\n📊 SECRET KEY SCORE: {score}/10")
        
        return score
        
    except Exception as e:
        print(f"❌ Secret key test failed: {e}")
        return 0

def run_free_security_tests():
    """Run all free security tests"""
    print("🧪 FREE SIKAREMIT SECURITY TESTING")
    print("=" * 60)
    print("Testing the security hardening we just implemented...")
    print()
    
    # Run all tests
    config_score, config_errors, config_warnings = test_security_configuration()
    headers_score = test_security_headers()
    ssl_score = test_database_ssl()
    cors_score = test_cors_configuration()
    secret_score = test_secret_key()
    
    # Calculate overall score
    scores = [config_score, headers_score, ssl_score, cors_score, secret_score]
    overall_score = sum(scores) / len(scores)
    
    # Final results
    print("\n" + "=" * 60)
    print("🎯 FINAL SECURITY TEST RESULTS")
    print("=" * 60)
    print(f"📊 OVERALL SECURITY SCORE: {overall_score:.1f}/10")
    print()
    
    print("Individual Scores:")
    print(f"  🔧 Configuration: {config_score}/10")
    print(f"  🛡️ Security Headers: {headers_score:.1f}/10")
    print(f"  🗄️ Database SSL: {ssl_score}/10")
    print(f"  🌐 CORS Config: {cors_score}/10")
    print(f"  🔑 Secret Key: {secret_score}/10")
    print()
    
    # Assessment
    if overall_score >= 8:
        print("🎉 EXCELLENT: Security hardening is working well!")
        print("✅ Ready for production deployment")
    elif overall_score >= 6:
        print("👍 GOOD: Security is mostly implemented")
        print("⚠️ Some improvements needed")
    else:
        print("⚠️ NEEDS WORK: Security requires attention")
        print("🔧 Review and fix identified issues")
    
    print()
    print("💰 COST SAVINGS:")
    print("  ✅ Free security testing: $0")
    print("  ✅ Immediate risk reduction: High")
    print("  ✅ Foundation for future audits: Ready")
    
    return overall_score

if __name__ == "__main__":
    try:
        score = run_free_security_tests()
        print(f"\n🏁 Test completed with score: {score:.1f}/10")
    except Exception as e:
        print(f"❌ Test failed: {e}")
        import traceback
        traceback.print_exc()
