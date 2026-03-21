#!/usr/bin/env python3
"""
Test Grafana's exact request format
"""

import requests
import json

def test_grafana_request():
    """Test the exact request Grafana makes"""
    url = "https://sikaremit.onrender.com/metrics"
    
    # Test different user agents (Grafana might use specific headers)
    user_agents = [
        "Grafana/1.0",
        "Mozilla/5.0 (compatible; Grafana/1.0)",
        "curl/7.68.0",
        "Python-requests/2.28.1"
    ]
    
    print("🔍 Testing different request formats...")
    print("=" * 50)
    
    for ua in user_agents:
        try:
            headers = {
                'User-Agent': ua,
                'Accept': 'text/plain',
                'Accept-Encoding': 'gzip'
            }
            
            response = requests.get(url, headers=headers, timeout=10)
            
            print(f"✅ User-Agent: {ua}")
            print(f"   Status: {response.status_code}")
            print(f"   Content-Type: {response.headers.get('content-type', 'N/A')}")
            print(f"   Content-Length: {len(response.text)}")
            
            if response.status_code == 200:
                print("   🎉 SUCCESS! This format works!")
                return True
            else:
                print(f"   ❌ Failed with {response.status_code}")
                
        except Exception as e:
            print(f"❌ User-Agent: {ua} - Error: {e}")
    
    return False

def test_with_query_params():
    """Test with query parameters like Grafana might use"""
    url = "https://sikaremit.onrender.com/metrics"
    
    # Test different query parameters
    test_params = [
        {},
        {"": ""},  # Empty parameter
        {"query": "up"},
        {"time": "1234567890"},
        {"start": "1234567890", "end": "1234567891"}
    ]
    
    print("\n🔍 Testing with query parameters...")
    print("=" * 50)
    
    for params in test_params:
        try:
            response = requests.get(url, params=params, timeout=10)
            
            param_str = str(params) if params else "No params"
            print(f"✅ Params: {param_str}")
            print(f"   Status: {response.status_code}")
            
            if response.status_code == 200:
                print("   🎉 SUCCESS! This works!")
                return True
            else:
                print(f"   ❌ Failed with {response.status_code}")
                
        except Exception as e:
            print(f"❌ Params: {params} - Error: {e}")
    
    return False

def test_alternative_endpoints():
    """Test alternative endpoints that might work"""
    base_url = "https://sikaremit.onrender.com"
    
    endpoints = [
        "/metrics",
        "/metrics?",
        "/metrics/",
        "/prometheus",
        "/prometheus/",
        "/api/v1/metrics",
        "/django-prometheus/metrics"
    ]
    
    print("\n🔍 Testing alternative endpoints...")
    print("=" * 50)
    
    for endpoint in endpoints:
        url = f"{base_url}{endpoint}"
        try:
            response = requests.get(url, timeout=10)
            
            print(f"✅ {endpoint}")
            print(f"   Status: {response.status_code}")
            
            if response.status_code == 200:
                print(f"   🎉 SUCCESS! Working endpoint: {url}")
                print(f"   Content-Type: {response.headers.get('content-type', 'N/A')}")
                return url
            else:
                print(f"   ❌ Failed with {response.status_code}")
                
        except Exception as e:
            print(f"❌ {endpoint} - Error: {e}")
    
    return None

def main():
    """Main function"""
    print("🚀 TESTING GRAFANA REQUEST FORMAT")
    print("=" * 60)
    
    # Test 1: Different user agents
    if test_grafana_request():
        print("\n🎉 Found a working request format!")
        return
    
    # Test 2: Query parameters
    if test_with_query_params():
        print("\n🎉 Found working parameters!")
        return
    
    # Test 3: Alternative endpoints
    working_endpoint = test_alternative_endpoints()
    if working_endpoint:
        print(f"\n🎉 Found working endpoint: {working_endpoint}")
        print("📊 Update your Grafana URL to this endpoint!")
        return
    
    print("\n❌ No working configuration found")
    print("\n🔧 Possible solutions:")
    print("1. Check if there are CORS issues")
    print("2. Verify Render deployment is correct")
    print("3. Check Django middleware configuration")
    print("4. Try using a different Grafana data source type")

if __name__ == "__main__":
    main()
