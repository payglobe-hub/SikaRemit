#!/usr/bin/env python3
"""
Test environment variable loading
"""

import os
import sys
from pathlib import Path

# Add project root to path
sys.path.append(str(Path(__file__).parent / 'backend'))

def test_env_loading():
    """Test if environment variables are loading correctly"""
    print("🔍 ENVIRONMENT VARIABLE LOADING TEST")
    print("=" * 40)
    
    # Check if .env file exists
    env_file = Path('.env')
    print(f".env file exists: {env_file.exists()}")
    
    if env_file.exists():
        print(f".env file size: {env_file.stat().st_size} bytes")
        
        # Read first few lines
        with open(env_file, 'r') as f:
            lines = f.readlines()[:5]
            print("First 5 lines of .env:")
            for i, line in enumerate(lines, 1):
                print(f"  {i}: {line.strip()}")
    
    # Check environment variables
    print("\n📋 Environment Variables:")
    debug = os.environ.get('DEBUG', 'NOT_SET')
    secret_key = os.environ.get('SECRET_KEY', 'NOT_SET')
    allowed_hosts = os.environ.get('ALLOWED_HOSTS', 'NOT_SET')
    
    print(f"  DEBUG: {debug}")
    print(f"  SECRET_KEY: {secret_key[:20]}..." if secret_key != 'NOT_SET' else f"  SECRET_KEY: {secret_key}")
    print(f"  ALLOWED_HOSTS: {allowed_hosts}")
    
    # Try to load .env manually
    print("\n🔧 Manual .env loading test:")
    try:
        from dotenv import load_dotenv
        result = load_dotenv()
        print(f"  load_dotenv() result: {result}")
        
        # Check variables again
        debug_after = os.environ.get('DEBUG', 'NOT_SET')
        secret_key_after = os.environ.get('SECRET_KEY', 'NOT_SET')
        allowed_hosts_after = os.environ.get('ALLOWED_HOSTS', 'NOT_SET')
        
        print(f"  DEBUG after: {debug_after}")
        print(f"  SECRET_KEY after: {secret_key_after[:20]}..." if secret_key_after != 'NOT_SET' else f"  SECRET_KEY after: {secret_key_after}")
        print(f"  ALLOWED_HOSTS after: {allowed_hosts_after}")
        
    except Exception as e:
        print(f"  Error loading .env: {e}")

if __name__ == "__main__":
    test_env_loading()
