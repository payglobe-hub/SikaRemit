#!/usr/bin/env python3
"""
Complete Grafana setup script for SikaRemit
"""

import os
import sys
import subprocess

def check_api_key():
    """Check if API key is configured"""
    backend_env_path = os.path.join(os.path.dirname(__file__), 'backend', '.env')
    
    if not os.path.exists(backend_env_path):
        print("❌ backend/.env file not found")
        return False
    
    with open(backend_env_path, 'r') as f:
        content = f.read()
    
    if 'ADD-YOUR-REAL-GRAFANA-API-KEY-HERE' in content:
        print("❌ Please update GRAFANA_API_KEY in backend/.env")
        print("   Get your API key from: https://payglobesr.grafana.net/")
        return False
    
    return True

def run_grafana_setup():
    """Run the Grafana setup command"""
    print("🔧 Running Grafana setup...")
    
    try:
        # Change to backend directory
        backend_path = os.path.join(os.path.dirname(__file__), 'backend')
        
        # Run the setup command
        result = subprocess.run([
            sys.executable, 'manage.py', 'setup_grafana'
        ], cwd=backend_path, capture_output=True, text=True)
        
        if result.returncode == 0:
            print("✅ Grafana setup completed successfully!")
            print(result.stdout)
            return True
        else:
            print(f"❌ Grafana setup failed: {result.stderr}")
            return False
            
    except Exception as e:
        print(f"❌ Error running Grafana setup: {e}")
        return False

def start_application():
    """Start the application with metrics"""
    print("\n🚀 Starting application with metrics...")
    
    backend_path = os.path.join(os.path.dirname(__file__), 'backend')
    
    print("📋 To start the application manually:")
    print(f"   cd {backend_path}")
    print("   python manage.py runserver 0.0.0.0:8000")
    print("\n📊 Metrics will be available at: http://localhost:8001/metrics/")
    print("📊 Grafana dashboard: https://payglobesr.grafana.net/")
    
    return True

def main():
    """Main setup function"""
    print("🚀 GRAFANA COMPLETE SETUP")
    print("=" * 50)
    
    # Check API key
    if not check_api_key():
        print("\n📋 Instructions:")
        print("1. Go to: https://payglobesr.grafana.net/")
        print("2. Login and navigate to Configuration → API Keys")
        print("3. Create new API key with Admin role")
        print("4. Copy the API key and update backend/.env")
        print("5. Run this script again")
        return False
    
    # Run Grafana setup
    if not run_grafana_setup():
        return False
    
    # Start application
    start_application()
    
    print("\n🎉 Grafana monitoring setup is complete!")
    print("\n📊 Next steps:")
    print("1. Start the application: python manage.py runserver 0.0.0.0:8000")
    print("2. Visit your Grafana dashboard: https://payglobesr.grafana.net/")
    print("3. Check metrics at: http://localhost:8001/metrics/")
    print("4. Monitor your SikaRemit application in real-time!")
    
    return True

if __name__ == "__main__":
    success = main()
    sys.exit(0 if success else 1)
