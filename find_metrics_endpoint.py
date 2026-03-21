#!/usr/bin/env python3
"""
Find the correct metrics endpoint on Render
"""

import requests
import sys

def test_endpoints():
    """Test different possible metrics endpoints"""
    base_url = "https://sikaremit.onrender.com"
    
    endpoints = [
        "/metrics",
        "/metrics/",
        "/api/metrics",
        "/api/metrics/",
        "/prometheus/metrics",
        "/admin/metrics",
        "/django-prometheus/metrics",
    ]
    
    print("🔍 Testing metrics endpoints...")
    print("=" * 50)
    
    working_endpoints = []
    
    for endpoint in endpoints:
        url = f"{base_url}{endpoint}"
        try:
            response = requests.get(url, timeout=10)
            if response.status_code == 200:
                print(f"✅ {endpoint} - WORKING ({len(response.text)} chars)")
                working_endpoints.append(endpoint)
                
                # Show sample of metrics
                sample = response.text[:200] + "..." if len(response.text) > 200 else response.text
                print(f"   Sample: {sample}")
            else:
                print(f"❌ {endpoint} - {response.status_code}")
        except Exception as e:
            print(f"❌ {endpoint} - Error: {e}")
    
    return working_endpoints

def main():
    """Main function"""
    print("🚀 FINDING METRICS ENDPOINT")
    print("=" * 50)
    
    working_endpoints = test_endpoints()
    
    if working_endpoints:
        print("\n🎉 WORKING ENDPOINTS FOUND:")
        for endpoint in working_endpoints:
            print(f"   ✅ {endpoint}")
        
        print(f"\n📊 Update your Grafana URL to:")
        print(f"   https://sikaremit.onrender.com{working_endpoints[0]}")
    else:
        print("\n❌ No working metrics endpoints found")
        print("\n🔧 Possible issues:")
        print("   1. Django middleware not properly configured")
        print("   2. URLs not properly set up")
        print("   3. Render deployment issue")
        
        print("\n🔧 Try these solutions:")
        print("   1. Redeploy your backend with monitoring enabled")
        print("   2. Check Django settings for PROMETHEUS_METRICS_ENABLED")
        print("   3. Verify django_prometheus is in INSTALLED_APPS")

if __name__ == "__main__":
    main()
