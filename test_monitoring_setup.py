#!/usr/bin/env python3
"""
Test the monitoring setup without requiring network access
"""

import os
import sys

# Add backend to path
sys.path.append(os.path.join(os.path.dirname(__file__), 'backend'))

def test_django_config():
    """Test Django configuration"""
    print("🔧 Testing Django Configuration...")
    
    try:
        os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'core.settings')
        import django
        django.setup()
        
        from django.conf import settings
        
        # Check Prometheus settings
        grafana_url = getattr(settings, 'GRAFANA_URL', None)
        grafana_key = getattr(settings, 'GRAFANA_API_KEY', None)
        metrics_enabled = getattr(settings, 'PROMETHEUS_METRICS_ENABLED', None)
        
        print(f"✅ Grafana URL: {grafana_url}")
        print(f"✅ Grafana API Key: {'Set' if grafana_key else 'Not set'}")
        print(f"✅ Metrics Enabled: {metrics_enabled}")
        
        # Check middleware
        middleware = getattr(settings, 'MIDDLEWARE', [])
        prometheus_middleware = [m for m in middleware if 'prometheus' in m.lower()]
        
        print(f"✅ Prometheus Middleware: {len(prometheus_middleware)} items")
        for middleware_item in prometheus_middleware:
            print(f"   - {middleware_item}")
        
        # Check URLs
        from django.urls import get_resolver
        resolver = get_resolver()
        url_patterns = []
        
        def collect_urls(patterns, prefix=''):
            for pattern in patterns:
                if hasattr(pattern, 'url_patterns'):
                    collect_urls(pattern.url_patterns, prefix + str(pattern.pattern))
                else:
                    url_patterns.append(prefix + str(pattern.pattern))
        
        collect_urls(resolver.url_patterns)
        prometheus_urls = [url for url in url_patterns if 'metrics' in url or 'prometheus' in url]
        
        print(f"✅ Prometheus URLs: {len(prometheus_urls)} found")
        for url in prometheus_urls:
            print(f"   - {url}")
        
        return True
        
    except Exception as e:
        print(f"❌ Django configuration error: {e}")
        return False

def test_imports():
    """Test that all required modules can be imported"""
    print("\n📦 Testing Imports...")
    
    try:
        import django_prometheus
        print("✅ django_prometheus imported")
    except ImportError as e:
        print(f"❌ django_prometheus import failed: {e}")
        return False
    
    try:
        import prometheus_client
        print("✅ prometheus_client imported")
    except ImportError as e:
        print(f"❌ prometheus_client import failed: {e}")
        return False
    
    try:
        from backend.monitoring.prometheus_metrics import PrometheusMiddleware
        print("✅ PrometheusMiddleware imported")
    except ImportError as e:
        print(f"❌ PrometheusMiddleware import failed: {e}")
        return False
    
    return True

def test_environment_files():
    """Test environment file configuration"""
    print("\n🔧 Testing Environment Files...")
    
    # Check development env
    dev_env_path = os.path.join(os.path.dirname(__file__), 'backend', '.env')
    if os.path.exists(dev_env_path):
        with open(dev_env_path, 'r') as f:
            content = f.read()
        
        checks = {
            'GRAFANA_URL': 'https://payglobesr.grafana.net/',
            'GRAFANA_API_KEY': 'glsa_',
            'PROMETHEUS_METRICS_ENABLED': 'True'
        }
        
        print("📋 Development Environment:")
        for key, expected in checks.items():
            if expected in content:
                print(f"   ✅ {key}: Configured")
            else:
                print(f"   ❌ {key}: Missing")
    else:
        print("❌ Development .env file not found")
        return False
    
    return True

def main():
    """Main test function"""
    print("🚀 MONITORING SETUP TEST")
    print("=" * 50)
    
    tests = [
        ("Environment Files", test_environment_files),
        ("Imports", test_imports),
        ("Django Configuration", test_django_config),
    ]
    
    results = []
    for test_name, test_func in tests:
        try:
            result = test_func()
            results.append((test_name, result))
        except Exception as e:
            print(f"❌ {test_name} failed: {e}")
            results.append((test_name, False))
    
    print("\n📊 TEST RESULTS")
    print("=" * 50)
    
    passed = 0
    for test_name, result in results:
        status = "✅ PASS" if result else "❌ FAIL"
        print(f"{status} {test_name}")
        if result:
            passed += 1
    
    print(f"\n🎯 Overall: {passed}/{len(results)} tests passed")
    
    if passed == len(results):
        print("\n🎉 Monitoring setup is configured correctly!")
        print("\n🚀 Next steps:")
        print("1. Install Docker or use ngrok to expose your local server")
        print("2. Start Django server: python manage.py runserver")
        print("3. Test metrics endpoint: http://localhost:8000/metrics/")
        print("4. Connect Grafana to your metrics")
    else:
        print("\n⚠️  Some issues found. Please fix before proceeding.")
    
    return passed == len(results)

if __name__ == "__main__":
    success = main()
    sys.exit(0 if success else 1)
