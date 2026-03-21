#!/usr/bin/env python3
"""
Install monitoring dependencies for SikaRemit
"""

import subprocess
import sys
import os

def install_package(package):
    """Install a Python package"""
    try:
        print(f"📦 Installing {package}...")
        result = subprocess.run([sys.executable, "-m", "pip", "install", package], 
                              capture_output=True, text=True)
        
        if result.returncode == 0:
            print(f"✅ {package} installed successfully")
            return True
        else:
            print(f"❌ Failed to install {package}: {result.stderr}")
            return False
            
    except Exception as e:
        print(f"❌ Error installing {package}: {e}")
        return False

def verify_installation():
    """Verify that packages are installed"""
    packages = ['django_prometheus', 'prometheus_client', 'requests']
    
    print("\n🔍 Verifying installations...")
    
    for package in packages:
        try:
            __import__(package)
            print(f"✅ {package} is available")
        except ImportError:
            print(f"❌ {package} is not available")
            return False
    
    return True

def main():
    """Main installation function"""
    print("🚀 INSTALLING MONITORING DEPENDENCIES")
    print("=" * 50)
    
    packages = [
        'django-prometheus',
        'prometheus-client', 
        'requests'
    ]
    
    failed_packages = []
    
    for package in packages:
        if not install_package(package):
            failed_packages.append(package)
    
    if failed_packages:
        print(f"\n❌ Failed to install: {', '.join(failed_packages)}")
        return False
    
    # Verify installations
    if verify_installation():
        print("\n🎉 All monitoring dependencies installed successfully!")
        print("\n🚀 Next steps:")
        print("1. Update GRAFANA_API_KEY in backend/.env")
        print("2. Run: python manage.py setup_grafana --api-key=your-key")
        print("3. Start the application with metrics enabled")
        return True
    else:
        print("\n❌ Some packages are not working correctly")
        return False

if __name__ == "__main__":
    success = main()
    sys.exit(0 if success else 1)
