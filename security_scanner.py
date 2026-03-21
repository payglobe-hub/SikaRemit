#!/usr/bin/env python3
"""
SikaRemit Security Scanner
Automated security scanning using OWASP ZAP and other tools
"""

import os
import sys
import subprocess
import json
import logging
from datetime import datetime
from pathlib import Path

# Add project root to path
sys.path.append(str(Path(__file__).parent))

# Configure logging
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s',
    handlers=[
        logging.FileHandler('security_scan.log'),
        logging.StreamHandler()
    ]
)
logger = logging.getLogger(__name__)

class SecurityScanner:
    """Automated security scanner for SikaRemit"""
    
    def __init__(self, target_url="http://localhost:8000"):
        self.target_url = target_url
        self.reports_dir = Path("security_reports")
        self.reports_dir.mkdir(exist_ok=True)
        
    def run_safety_scan(self):
        """Run Safety dependency scanner"""
        logger.info("Running Safety dependency scan...")
        
        try:
            result = subprocess.run([
                'safety', 'check', '--json', '--output', 
                str(self.reports_dir / 'safety_report.json')
            ], capture_output=True, text=True)
            
            if result.returncode == 0:
                logger.info("Safety scan completed - no vulnerabilities found")
                return True
            else:
                logger.warning("Safety scan found vulnerabilities")
                return True
                
        except FileNotFoundError:
            logger.error("Safety not installed. Run: pip install safety")
            return False
            
    def run_bandit_scan(self):
        """Run Bandit code security scanner"""
        logger.info("Running Bandit code security scan...")
        
        try:
            result = subprocess.run([
                'bandit', '-r', 'backend', '-f', 'json', '-o',
                str(self.reports_dir / 'bandit_report.json')
            ], capture_output=True, text=True)
            
            if result.returncode == 0:
                logger.info("Bandit scan completed - no high-severity issues found")
                return True
            else:
                logger.warning("Bandit scan found security issues")
                return True
                
        except FileNotFoundError:
            logger.error("Bandit not installed. Run: pip install bandit")
            return False
            
    def check_configuration_security(self):
        """Check Django configuration security"""
        logger.info("Checking configuration security...")
        
        try:
            import django
            from django.conf import settings
            
            # Setup Django
            os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'core.settings')
            django.setup()
            
            security_issues = []
            
            # Check SECRET_KEY
            secret_key = getattr(settings, 'SECRET_KEY', None)
            if not secret_key or 'django-insecure' in secret_key:
                security_issues.append("SECRET_KEY is not properly configured")
                
            # Check DEBUG mode
            if getattr(settings, 'DEBUG', False):
                security_issues.append("DEBUG mode is enabled in production")
                
            # Check ALLOWED_HOSTS
            allowed_hosts = getattr(settings, 'ALLOWED_HOSTS', [])
            if not allowed_hosts or 'localhost' in allowed_hosts:
                security_issues.append("ALLOWED_HOSTS contains development hosts")
                
            # Check database SSL
            databases = getattr(settings, 'DATABASES', {})
            default_db = databases.get('default', {})
            options = default_db.get('OPTIONS', {})
            if options.get('sslmode') != 'require':
                security_issues.append("Database SSL is not enforced")
                
            # Save configuration report
            config_report = {
                'scan_time': datetime.now().isoformat(),
                'security_issues': security_issues,
                'security_score': max(0, 10 - len(security_issues)),
                'recommendations': [
                    "Set SECRET_KEY in environment variables",
                    "Disable DEBUG in production",
                    "Configure ALLOWED_HOSTS properly",
                    "Enforce database SSL connections"
                ]
            }
            
            with open(self.reports_dir / 'config_security.json', 'w') as f:
                json.dump(config_report, f, indent=2)
                
            if security_issues:
                logger.warning(f"Found {len(security_issues)} configuration issues")
                return False
            else:
                logger.info("Configuration security check passed")
                return True
                
        except Exception as e:
            logger.error(f"Configuration security check failed: {e}")
            return False
            
    def run_ssl_check(self):
        """Run SSL/TLS configuration check"""
        logger.info("Running SSL/TLS configuration check...")
        
        try:
            import ssl
            import socket
            
            hostname = self.target_url.replace('https://', '').replace('http://', '').split(':')[0]
            
            try:
                context = ssl.create_default_context()
                with socket.create_connection((hostname, 443), timeout=10) as sock:
                    with context.wrap_socket(sock, server_hostname=hostname) as ssock:
                        cert = ssock.getpeercert()
                        cipher = ssock.cipher()
                        
                        ssl_report = {
                            'hostname': hostname,
                            'certificate': {
                                'subject': cert.get('subject'),
                                'issuer': cert.get('issuer'),
                                'version': cert.get('version'),
                                'serial_number': cert.get('serialNumber'),
                                'not_before': cert.get('notBefore'),
                                'not_after': cert.get('notAfter'),
                            },
                            'cipher': {
                                'name': cipher[0],
                                'version': cipher[1],
                                'bits': cipher[2],
                            },
                            'protocol_version': ssock.version(),
                            'scan_time': datetime.now().isoformat()
                        }
                        
                        with open(self.reports_dir / 'ssl_report.json', 'w') as f:
                            json.dump(ssl_report, f, indent=2)
                            
                        logger.info("SSL/TLS check completed")
                        return True
                        
            except (socket.timeout, ConnectionRefusedError) as e:
                logger.warning(f"SSL check failed - connection error: {e}")
                return False
                
        except Exception as e:
            logger.error(f"SSL check failed: {e}")
            return False
            
    def generate_summary_report(self):
        """Generate comprehensive security summary"""
        logger.info("Generating security summary report...")
        
        summary = {
            'scan_time': datetime.now().isoformat(),
            'target_url': self.target_url,
            'scans_performed': [],
            'findings': {},
            'recommendations': []
        }
        
        # Check for scan results
        scan_files = {
            'Safety Dependency Scan': 'safety_report.json',
            'Bandit Code Security': 'bandit_report.json',
            'Configuration Security': 'config_security.json',
            'SSL/TLS Check': 'ssl_report.json'
        }
        
        for scan_name, filename in scan_files.items():
            file_path = self.reports_dir / filename
            if file_path.exists():
                summary['scans_performed'].append(scan_name)
                
                # Load and analyze results
                try:
                    with open(file_path, 'r') as f:
                        data = json.load(f)
                        
                    if scan_name == 'Safety Dependency Scan':
                        vulnerabilities = data.get('vulnerabilities', [])
                        summary['findings'][scan_name] = {
                            'vulnerabilities': len(vulnerabilities),
                            'severity': 'high' if any(v.get('severity') == 'high' for v in vulnerabilities) else 'medium'
                        }
                        
                    elif scan_name == 'Bandit Code Security':
                        results = data.get('results', [])
                        high_severity = [r for r in results if r.get('issue_severity') == 'HIGH']
                        summary['findings'][scan_name] = {
                            'issues': len(results),
                            'high_severity': len(high_severity),
                            'severity': 'high' if high_severity else 'medium'
                        }
                        
                    elif scan_name == 'Configuration Security':
                        issues = data.get('security_issues', [])
                        summary['findings'][scan_name] = {
                            'issues': len(issues),
                            'security_score': data.get('security_score', 0),
                            'severity': 'high' if issues else 'low'
                        }
                        
                    elif scan_name == 'SSL/TLS Check':
                        summary['findings'][scan_name] = {
                            'status': 'passed',
                            'severity': 'low'
                        }
                        
                except Exception as e:
                    logger.error(f"Error analyzing {scan_name} results: {e}")
                    
                logger.info(f"✅ {scan_name} scan completed")
            else:
                logger.warning(f"❌ {scan_name} scan not found")
                
        # Generate recommendations
        summary['recommendations'] = [
            "Review and fix any configuration security issues",
            "Update dependencies if Safety found vulnerabilities",
            "Address high-severity code security issues from Bandit",
            "Implement SSL/TLS best practices",
            "Run regular security scans (weekly)",
            "Implement continuous security monitoring",
            "Set up automated security testing in CI/CD"
        ]
        
        # Calculate overall security score
        if summary['findings']:
            scores = []
            for finding in summary['findings'].values():
                if 'security_score' in finding:
                    scores.append(finding['security_score'])
                elif finding.get('severity') == 'low':
                    scores.append(9)
                elif finding.get('severity') == 'medium':
                    scores.append(7)
                elif finding.get('severity') == 'high':
                    scores.append(4)
                    
            overall_score = sum(scores) / len(scores) if scores else 0
        else:
            overall_score = 0
            
        summary['overall_security_score'] = round(overall_score, 1)
        
        # Save summary
        with open(self.reports_dir / 'security_summary.json', 'w') as f:
            json.dump(summary, f, indent=2)
            
        logger.info(f"Security summary report generated - Score: {overall_score}/10")
        return summary
        
    def run_full_scan(self):
        """Run complete security scan suite"""
        logger.info("Starting comprehensive security scan...")
        
        results = {
            'safety': self.run_safety_scan(),
            'bandit': self.run_bandit_scan(),
            'config': self.check_configuration_security(),
            'ssl': self.run_ssl_check()
        }
        
        summary = self.generate_summary_report()
        
        # Overall assessment
        completed_scans = sum(results.values())
        total_scans = len(results)
        
        logger.info(f"Security scan completed: {completed_scans}/{total_scans} scans successful")
        
        if completed_scans == total_scans:
            logger.info("🎉 All security scans completed successfully")
        else:
            logger.warning("⚠️ Some security scans failed - check logs")
            
        return results, summary

def main():
    """Main execution function"""
    import django
    from django.conf import settings
    
    # Get target URL from environment or use default
    target_url = os.environ.get('SECURITY_SCAN_TARGET', 'http://localhost:8000')
    
    # Run security scan
    scanner = SecurityScanner(target_url)
    results, summary = scanner.run_full_scan()
    
    # Print summary
    print("\n" + "="*50)
    print("🔒 SIKAREMIT SECURITY SCAN SUMMARY")
    print("="*50)
    print(f"Target: {target_url}")
    print(f"Scans Completed: {sum(results.values())}/{len(results)}")
    print(f"Security Score: {summary.get('overall_security_score', 0)}/10")
    print(f"Reports Location: {scanner.reports_dir}")
    print("="*50)
    
    # Print findings
    if summary.get('findings'):
        print("\n📊 FINDINGS:")
        for scan_name, finding in summary['findings'].items():
            severity = finding.get('severity', 'unknown')
            icon = "🔴" if severity == 'high' else "🟡" if severity == 'medium' else "🟢"
            print(f"  {icon} {scan_name}: {finding}")
    
    print("\n📋 NEXT STEPS:")
    for rec in summary.get('recommendations', [])[:3]:
        print(f"  • {rec}")
    
    print("="*50)
    
    return 0 if all(results.values()) else 1

if __name__ == "__main__":
    sys.exit(main())
