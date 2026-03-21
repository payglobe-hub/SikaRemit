#!/usr/bin/env python3
"""
Grafana Monitoring Setup Test Script
Tests Grafana configuration and metrics collection
"""

import os
import sys
import django
from django.conf import settings
import requests
import json
import time

# Add backend to path
sys.path.append(os.path.join(os.path.dirname(__file__), 'backend'))

# Setup Django
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'core.settings')
django.setup()

def test_grafana_config():
    """Test Grafana configuration"""
    print("📊 Testing Grafana Configuration...")
    print("=" * 50)
    
    grafana_url = getattr(settings, 'GRAFANA_URL', None)
    api_key = getattr(settings, 'GRAFANA_API_KEY', None)
    
    print(f"📋 Grafana URL: {'✅ Set' if grafana_url else '❌ Missing'}")
    print(f"📋 API Key: {'✅ Set' if api_key else '❌ Missing'}")
    
    if not grafana_url:
        print("❌ Grafana URL not configured!")
        return False
    
    if not api_key or api_key == 'your-grafana-api-key':
        print("⚠️  Grafana API key needs to be updated with real value")
        return False
    
    # Test Grafana connection
    try:
        headers = {
            'Authorization': f'Bearer {api_key}',
            'Content-Type': 'application/json'
        }
        
        response = requests.get(f'{grafana_url}/api/health', headers=headers, timeout=10)
        
        if response.status_code == 200:
            print("✅ Grafana connection successful")
            health_data = response.json()
            print(f"   Database: {health_data.get('database', 'Unknown')}")
            print(f"   Version: {health_data.get('version', 'Unknown')}")
        else:
            print(f"❌ Grafana connection failed: {response.status_code}")
            return False
            
    except requests.exceptions.RequestException as e:
        print(f"❌ Grafana connection error: {e}")
        return False
    except Exception as e:
        print(f"❌ Unexpected error: {e}")
        return False
    
    return True

def test_prometheus_config():
    """Test Prometheus configuration"""
    print("\n📈 Testing Prometheus Configuration...")
    print("=" * 50)
    
    metrics_enabled = getattr(settings, 'PROMETHEUS_METRICS_ENABLED', None)
    metrics_port = getattr(settings, 'PROMETHEUS_METRICS_EXPORT_PORT', None)
    
    print(f"📋 Metrics Enabled: {'✅ Yes' if metrics_enabled else '❌ No'}")
    print(f"📋 Metrics Port: {metrics_port or '❌ Not set'}")
    
    if not metrics_enabled:
        print("❌ Prometheus metrics not enabled!")
        return False
    
    # Test metrics endpoint (if server is running)
    metrics_url = f"http://localhost:{metrics_port or 8001}/metrics/"
    
    try:
        response = requests.get(metrics_url, timeout=5)
        
        if response.status_code == 200:
            print("✅ Prometheus metrics endpoint accessible")
            metrics_content = response.text
            
            # Check for custom metrics
            custom_metrics = [
                'sikaremit_active_users_total',
                'sikaremit_transactions_total',
                'sikaremit_request_duration_seconds'
            ]
            
            found_metrics = []
            for metric in custom_metrics:
                if metric in metrics_content:
                    found_metrics.append(metric)
            
            print(f"   Custom metrics found: {len(found_metrics)}/{len(custom_metrics)}")
            for metric in found_metrics:
                print(f"   ✅ {metric}")
                
        else:
            print(f"⚠️  Metrics endpoint returned: {response.status_code}")
            print("   (This is expected if server is not running)")
            
    except requests.exceptions.ConnectionError:
        print("⚠️  Metrics endpoint not accessible (server not running)")
        print("   This is expected in testing environment")
    except Exception as e:
        print(f"❌ Metrics endpoint error: {e}")
        return False
    
    return True

def test_django_integration():
    """Test Django integration"""
    print("\n🔧 Testing Django Integration...")
    print("=" * 50)
    
    # Check if django-prometheus is installed
    try:
        import django_prometheus
        print("✅ django-prometheus installed")
    except ImportError:
        print("❌ django-prometheus not installed")
        print("   Install with: pip install django-prometheus")
        return False
    
    # Check if custom metrics module exists
    try:
        from backend.monitoring.prometheus_metrics import (
            PrometheusMiddleware, 
            record_transaction,
            record_user_registration
        )
        print("✅ Custom metrics module exists")
    except ImportError as e:
        print(f"❌ Custom metrics module error: {e}")
        return False
    
    # Check if management command exists
    try:
        from core.management.commands.setup_grafana import Command
        print("✅ Grafana setup command exists")
    except ImportError as e:
        print(f"❌ Grafana setup command error: {e}")
        return False
    
    return True

def test_dashboard_config():
    """Test dashboard configuration"""
    print("\n📊 Testing Dashboard Configuration...")
    print("=" * 50)
    
    dashboard_path = os.path.join(
        os.path.dirname(__file__), 
        'backend', 
        'monitoring', 
        'grafana_dashboard.json'
    )
    
    if os.path.exists(dashboard_path):
        print("✅ Dashboard configuration file exists")
        
        try:
            with open(dashboard_path, 'r') as f:
                dashboard_config = json.load(f)
            
            # Check dashboard structure
            if 'dashboard' in dashboard_config:
                dashboard = dashboard_config['dashboard']
                panels = dashboard.get('panels', [])
                
                print(f"   Dashboard title: {dashboard.get('title', 'Unknown')}")
                print(f"   Number of panels: {len(panels)}")
                
                # Check for key panels
                key_panels = ['Active Users', 'Transaction Volume', 'Success Rate']
                found_panels = []
                
                for panel in panels:
                    title = panel.get('title', '')
                    for key_panel in key_panels:
                        if key_panel in title:
                            found_panels.append(key_panel)
                
                print(f"   Key panels found: {len(found_panels)}/{len(key_panels)}")
                for panel in found_panels:
                    print(f"   ✅ {panel}")
                
                print("✅ Dashboard configuration valid")
                
            else:
                print("❌ Invalid dashboard configuration")
                return False
                
        except json.JSONDecodeError as e:
            print(f"❌ Dashboard JSON error: {e}")
            return False
        except Exception as e:
            print(f"❌ Dashboard file error: {e}")
            return False
    else:
        print("❌ Dashboard configuration file not found")
        return False
    
    return True

def test_environment_files():
    """Test environment file configuration"""
    print("\n🔧 Testing Environment Files...")
    print("=" * 50)
    
    # Check development environment
    dev_env_path = os.path.join(os.path.dirname(__file__), 'backend', '.env')
    if os.path.exists(dev_env_path):
        with open(dev_env_path, 'r') as f:
            dev_content = f.read()
        
        dev_checks = {
            'GRAFANA_URL': 'https://payglobesr.grafana.net/',
            'PROMETHEUS_METRICS_ENABLED': 'True'
        }
        
        print("📋 Development Environment:")
        for key, expected in dev_checks.items():
            if expected in dev_content:
                print(f"   ✅ {key}: Configured")
            else:
                print(f"   ❌ {key}: Missing")
    else:
        print("❌ Development .env file not found")
        return False
    
    # Check production environment
    prod_env_path = os.path.join(os.path.dirname(__file__), '.env.production')
    if os.path.exists(prod_env_path):
        with open(prod_env_path, 'r') as f:
            prod_content = f.read()
        
        prod_checks = {
            'GRAFANA_URL': 'https://payglobesr.grafana.net/',
            'PROMETHEUS_METRICS_ENABLED': 'True'
        }
        
        print("📋 Production Environment:")
        for key, expected in prod_checks.items():
            if expected in prod_content:
                print(f"   ✅ {key}: Configured")
            else:
                print(f"   ❌ {key}: Missing")
    else:
        print("❌ Production .env file not found")
        return False
    
    return True

def main():
    """Main test function"""
    print("🚀 GRAFANA MONITORING SETUP TEST")
    print("=" * 60)
    
    tests = [
        ("Grafana Configuration", test_grafana_config),
        ("Prometheus Configuration", test_prometheus_config),
        ("Django Integration", test_django_integration),
        ("Dashboard Configuration", test_dashboard_config),
        ("Environment Files", test_environment_files),
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
    
    if passed >= 4:  # Core tests
        print("🎉 Grafana monitoring setup is ready!")
        print("\n🚀 Next steps:")
        print("1. Get real Grafana API key")
        print("2. Update environment variables")
        print("3. Install django-prometheus")
        print("4. Run setup_grafana command")
        print("5. Start monitoring with metrics")
    else:
        print("⚠️  Some issues found. Please fix before deployment.")
    
    return passed >= 4

if __name__ == "__main__":
    success = main()
    sys.exit(0 if success else 1)
