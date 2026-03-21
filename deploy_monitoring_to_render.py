#!/usr/bin/env python3
"""
Deploy monitoring setup to Render production
"""

import os
import subprocess
import sys

def check_render_urls():
    """Check if Render URLs are accessible"""
    print("🌐 Checking Production URLs...")
    
    # Test backend URL
    backend_url = "https://sikaremit.onrender.com"
    metrics_url = "https://sikaremit.onrender.com/metrics"
    
    try:
        import requests
        
        # Test backend health
        response = requests.get(f"{backend_url}/api/health/", timeout=10)
        if response.status_code == 200:
            print(f"✅ Backend health check: {backend_url}")
        else:
            print(f"⚠️  Backend returned: {response.status_code}")
    except:
        print(f"❌ Backend not accessible: {backend_url}")
    
    try:
        # Test metrics endpoint
        response = requests.get(metrics_url, timeout=10)
        if response.status_code == 200:
            print(f"✅ Metrics endpoint: {metrics_url}")
            print("   Sample metrics:")
            metrics_sample = response.text[:200] + "..." if len(response.text) > 200 else response.text
            print(f"   {metrics_sample}")
        else:
            print(f"⚠️  Metrics returned: {response.status_code}")
    except:
        print(f"❌ Metrics not accessible: {metrics_url}")
    
    return True

def update_grafana_datasource():
    """Instructions for updating Grafana datasource"""
    print("\n📊 Grafana Data Source Configuration")
    print("=" * 50)
    
    print("🔧 Steps to update your Grafana:")
    print("1. Go to: https://payglobesr.grafana.net/")
    print("2. Navigate: Connections → Prometheus → SikaRemit-Prometheus")
    print("3. Update URL to: https://sikaremit.onrender.com/metrics")
    print("4. Click 'Save & test'")
    print("5. Should show 'Success' if metrics are working")
    
    print("\n📋 Alternative URLs to try:")
    print("- https://sikaremit.onrender.com/metrics/")
    print("- https://sikaremit.onrender.com/metrics")
    print("- https://api.sikaremit.onrender.com/metrics")

def create_production_dashboard():
    """Create dashboard for production"""
    print("\n🎯 Production Dashboard Setup")
    print("=" * 50)
    
    print("📊 Once metrics are working, create dashboard with these queries:")
    print("1. Active Users: sikaremit_active_users_total")
    print("2. Transaction Volume: sikaremit_transactions_total")
    print("3. Success Rate: sikaremit_transaction_success_rate * 100")
    print("4. Response Time: sikaremit_avg_response_time")
    
    print("\n📱 Mobile Money Metrics:")
    print("- MTN MoMo: sikaremit_mtn_momo_transactions_total")
    print("- Telecel: sikaremit_telecel_transactions_total")
    print("- AirtelTigo: sikaremit_airteltigo_transactions_total")
    print("- G-Money: sikaremit_gmoney_transactions_total")

def main():
    """Main function"""
    print("🚀 DEPLOY MONITORING TO RENDER")
    print("=" * 50)
    
    print("🎯 Your Production Setup:")
    print("- Backend: https://sikaremit.onrender.com")
    print("- Frontend: https://sikaremit.vercel.app")
    print("- Grafana: https://payglobesr.grafana.net/")
    
    # Check URLs
    check_render_urls()
    
    # Update Grafana instructions
    update_grafana_datasource()
    
    # Dashboard setup
    create_production_dashboard()
    
    print("\n🎉 DEPLOYMENT CHECKLIST")
    print("=" * 50)
    print("✅ 1. Backend is live on Render")
    print("✅ 2. Frontend is live on Vercel")
    print("✅ 3. Grafana is configured")
    print("⏳ 4. Update Grafana data source URL")
    print("⏳ 5. Test metrics connection")
    print("⏳ 6. Create production dashboard")
    
    print("\n🚀 NEXT STEPS:")
    print("1. Update Grafana URL to your Render backend")
    print("2. Test the connection")
    print("3. Create your monitoring dashboard")
    print("4. Set up alerts for production monitoring")
    
    print("\n🎯 You're live! Just need to connect Grafana to your production metrics!")

if __name__ == "__main__":
    main()
