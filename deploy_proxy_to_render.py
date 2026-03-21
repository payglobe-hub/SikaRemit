#!/usr/bin/env python3
"""
Deploy metrics proxy to Render
"""

import subprocess
import os

def install_requirements():
    """Install proxy requirements"""
    print("📦 Installing proxy requirements...")
    try:
        subprocess.run([sys.executable, "-m", "pip", "install", "-r", "requirements-proxy.txt"], check=True)
        print("✅ Requirements installed")
        return True
    except Exception as e:
        print(f"❌ Failed to install requirements: {e}")
        return False

def create_render_config():
    """Create Render configuration for proxy"""
    render_config = {
        "services": {
            "type": "web",
            "name": "sikaremit-metrics-proxy",
            "env": "python",
            "buildCommand": "pip install -r requirements-proxy.txt",
            "startCommand": "python metrics_proxy.py",
            "healthCheckPath": "/health"
        }
    }
    
    # Create render.yaml
    with open("render.yaml", "w") as f:
        import yaml
        yaml.dump(render_config, f, default_flow_style=False)
    
    print("✅ Created render.yaml")
    return True

def main():
    """Main deployment function"""
    print("🚀 DEPLOYING METRICS PROXY TO RENDER")
    print("=" * 50)
    
    # Install requirements
    if not install_requirements():
        return False
    
    # Create Render config
    if not create_render_config():
        return False
    
    print("\n🎯 NEXT STEPS:")
    print("1. Push these files to your Git repository:")
    print("   - metrics_proxy.py")
    print("   - requirements-proxy.txt")
    print("   - render.yaml")
    print("2. Go to Render dashboard")
    print("3. Connect your repository")
    print("4. Deploy the 'sikaremit-metrics-proxy' service")
    print("5. Get the proxy URL (like https://sikaremit-metrics-proxy.onrender.com)")
    print("6. Update Grafana data source to use the proxy URL")
    
    print("\n📊 Grafana Configuration:")
    print("URL: https://sikaremit-metrics-proxy.onrender.com")
    print("HTTP method: GET")
    print("Authentication: None")
    
    print("\n🎉 This proxy will bridge Grafana to your metrics!")
    
    return True

if __name__ == "__main__":
    import sys
    success = main()
    sys.exit(0 if success else 1)
