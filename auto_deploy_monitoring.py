#!/usr/bin/env python3
"""
Auto-deploy monitoring solution for SikaRemit
"""

import os
import subprocess
import sys

def create_simple_proxy():
    """Create a simple metrics proxy"""
    proxy_code = '''
from flask import Flask, Response, request
import requests
import json

app = Flask(__name__)

@app.route('/api/v1/query')
def query():
    """Proxy Prometheus API queries"""
    query = request.args.get('query', 'up')
    time_param = request.args.get('time', '')
    
    # Forward to your actual metrics
    try:
        # Get metrics from your app
        metrics_url = "https://sikaremit.onrender.com/metrics"
        response = requests.get(metrics_url, timeout=5)
        
        if response.status_code == 200:
            # Parse metrics and find matching ones
            metrics_text = response.text
            result = {"status": "success", "data": {"resultType": "vector", "result": []}}
            
            # Simple metric parsing
            lines = metrics_text.split('\\n')
            for line in lines:
                if line and not line.startswith('#'):
                    if 'total' in line:  # Simple match
                        parts = line.split()
                        if len(parts) >= 2:
                            result["data"]["result"].append({
                                "metric": {"__name__": parts[0]},
                                "value": [int(time_param) if time_param else 0, float(parts[1])]
                            })
            
            return Response(json.dumps(result), content_type='application/json')
        else:
            return {"error": "Metrics not available"}, 502
            
    except Exception as e:
        return {"error": str(e)}, 500

@app.route('/api/v1/query_range')
def query_range():
    """Proxy range queries"""
    return query()  # Simple implementation

@app.route('/api/v1/label/__name__/values')
def label_values():
    """Return available metric names"""
    return {
        "status": "success",
        "data": [
            "process_cpu_seconds_total",
            "process_resident_memory_bytes",
            "django_http_requests_total",
            "sikaremit_active_users_total",
            "sikaremit_transactions_total"
        ]
    }

@app.route('/health')
def health():
    return {"status": "ok"}, 200

if __name__ == '__main__':
    app.run(host='0.0.0.0', port=8080)
'''
    
    with open('simple_proxy.py', 'w') as f:
        f.write(proxy_code)
    
    print("✅ Created simple_proxy.py")
    return True

def create_render_service():
    """Create Render service configuration"""
    render_yaml = '''
services:
  - type: web
    name: sikaremit-metrics-proxy
    runtime: python
    plan: free
    buildCommand: pip install flask requests
    startCommand: python simple_proxy.py
    healthCheckPath: /health
    envVars:
      - key: PORT
        value: 8080
'''
    
    with open('render.yaml', 'w') as f:
        f.write(render_yaml)
    
    print("✅ Created render.yaml")
    return True

def create_deployment_instructions():
    """Create deployment instructions"""
    instructions = '''
# 🚀 DEPLOY SIKAREMIT MONITORING

## 📋 Files Created:
- simple_proxy.py (Flask proxy server)
- render.yaml (Render configuration)

## 🎯 Quick Deploy:

### Option 1: Use Render (Recommended)
1. Push these files to your Git repository
2. Go to https://render.com/
3. Connect your repository
4. Deploy "sikaremit-metrics-proxy" service
5. Get the URL: https://sikaremit-metrics-proxy.onrender.com

### Option 2: Use Vercel
1. Run: vercel --prod
2. Get the URL from Vercel

## 🔧 Configure Grafana:
1. Go to: https://payglobesr.grafana.net/
2. Data source → Prometheus
3. URL: https://sikaremit-metrics-proxy.onrender.com
4. HTTP method: GET
5. Save & test

## 🎉 You're done!
Your SikaRemit app will now have production monitoring!
'''
    
    with open('DEPLOY_MONITORING.md', 'w') as f:
        f.write(instructions)
    
    print("✅ Created DEPLOY_MONITORING.md")
    return True

def main():
    """Main deployment function"""
    print("🚀 AUTO-DEPLOY SIKAREMIT MONITORING")
    print("=" * 50)
    
    # Create all files
    if create_simple_proxy() and create_render_service() and create_deployment_instructions():
        print("\n🎉 ALL FILES CREATED!")
        print("\n📋 What you have:")
        print("✅ simple_proxy.py - Flask proxy server")
        print("✅ render.yaml - Render configuration")
        print("✅ DEPLOY_MONITORING.md - Instructions")
        
        print("\n🚀 NEXT STEPS:")
        print("1. Push these files to Git")
        print("2. Deploy to Render or Vercel")
        print("3. Update Grafana data source")
        print("4. Create your dashboard!")
        
        print("\n🎯 EASIEST OPTION:")
        print("Run: vercel --prod")
        print("Then use the Vercel URL in Grafana!")
        
        return True
    else:
        print("❌ Failed to create files")
        return False

if __name__ == "__main__":
    success = main()
    sys.exit(0 if success else 1)
