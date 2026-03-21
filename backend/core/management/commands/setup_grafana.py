"""
Django management command to set up Grafana dashboards and data sources
"""

from django.core.management.base import BaseCommand
from django.conf import settings
import requests
import json
import os
import logging

logger = logging.getLogger(__name__)

class Command(BaseCommand):
    help = 'Set up Grafana dashboards and data sources for SikaRemit monitoring'
    
    def add_arguments(self, parser):
        parser.add_argument(
            '--api-key',
            type=str,
            help='Grafana API key (if not provided, will use GRAFANA_API_KEY from settings)'
        )
        parser.add_argument(
            '--url',
            type=str,
            default='https://payglobesr.grafana.net/',
            help='Grafana URL (default: https://payglobesr.grafana.net/)'
        )
        parser.add_argument(
            '--skip-datasource',
            action='store_true',
            help='Skip data source creation'
        )
        parser.add_argument(
            '--skip-dashboard',
            action='store_true',
            help='Skip dashboard creation'
        )
    
    def handle(self, *args, **options):
        grafana_url = options['url']
        api_key = options['api_key'] or getattr(settings, 'GRAFANA_API_KEY', None)
        
        if not api_key:
            self.stdout.write(
                self.style.ERROR('Grafana API key not found. Please provide --api-key or set GRAFANA_API_KEY in settings')
            )
            return
        
        self.stdout.write(f'Setting up Grafana at {grafana_url}')
        
        # Test connection
        if not self.test_grafana_connection(grafana_url, api_key):
            self.stdout.write(self.style.ERROR('Failed to connect to Grafana'))
            return
        
        # Create data source
        if not options['skip_datasource']:
            if self.create_prometheus_datasource(grafana_url, api_key):
                self.stdout.write(self.style.SUCCESS('Prometheus data source created'))
            else:
                self.stdout.write(self.style.ERROR('Failed to create Prometheus data source'))
        
        # Create dashboard
        if not options['skip_dashboard']:
            if self.create_sikaremit_dashboard(grafana_url, api_key):
                self.stdout.write(self.style.SUCCESS('SikaRemit dashboard created'))
            else:
                self.stdout.write(self.style.ERROR('Failed to create SikaRemit dashboard'))
        
        self.stdout.write(self.style.SUCCESS('Grafana setup completed'))
    
    def test_grafana_connection(self, grafana_url, api_key):
        """Test connection to Grafana"""
        try:
            headers = {
                'Authorization': f'Bearer {api_key}',
                'Content-Type': 'application/json'
            }
            
            response = requests.get(f'{grafana_url}/api/health', headers=headers)
            return response.status_code == 200
            
        except Exception as e:
            logger.error(f"Error connecting to Grafana: {e}")
            return False
    
    def create_prometheus_datasource(self, grafana_url, api_key):
        """Create Prometheus data source"""
        try:
            headers = {
                'Authorization': f'Bearer {api_key}',
                'Content-Type': 'application/json'
            }
            
            datasource_data = {
                "name": "SikaRemit-Prometheus",
                "type": "prometheus",
                "url": "http://localhost:8001",  # Prometheus metrics endpoint
                "access": "proxy",
                "isDefault": True,
                "editable": True,
                "jsonData": {
                    "timeInterval": "30s",
                    "queryTimeout": "60s",
                    "httpMethod": "POST"
                }
            }
            
            # Check if data source already exists
            response = requests.get(f'{grafana_url}/api/datasources/name/SikaRemit-Prometheus', headers=headers)
            
            if response.status_code == 200:
                self.stdout.write('Data source already exists, updating...')
                response = requests.put(
                    f'{grafana_url}/api/datasources/uid/{response.json()["uid"]}',
                    headers=headers,
                    json=datasource_data
                )
            else:
                response = requests.post(
                    f'{grafana_url}/api/datasources',
                    headers=headers,
                    json=datasource_data
                )
            
            return response.status_code in [200, 201]
            
        except Exception as e:
            logger.error(f"Error creating Prometheus data source: {e}")
            return False
    
    def create_sikaremit_dashboard(self, grafana_url, api_key):
        """Create SikaRemit dashboard"""
        try:
            headers = {
                'Authorization': f'Bearer {api_key}',
                'Content-Type': 'application/json'
            }
            
            # Load dashboard configuration
            dashboard_path = os.path.join(
                os.path.dirname(__file__),
                '../../../monitoring/grafana_dashboard.json'
            )
            
            if not os.path.exists(dashboard_path):
                self.stdout.write(
                    self.style.ERROR('Grafana dashboard configuration file not found')
                )
                return False
            
            with open(dashboard_path, 'r') as f:
                dashboard_config = json.load(f)
            
            # Prepare dashboard for import
            dashboard_data = {
                "dashboard": dashboard_config['dashboard'],
                "overwrite": True,
                "inputs": []
            }
            
            response = requests.post(
                f'{grafana_url}/api/dashboards/db',
                headers=headers,
                json=dashboard_data
            )
            
            if response.status_code in [200, 201]:
                dashboard_info = response.json()
                dashboard_url = f"{grafana_url}{dashboard_info.get('url', '')}"
                self.stdout.write(f'Dashboard created: {dashboard_url}')
                return True
            else:
                self.stdout.write(f'Error creating dashboard: {response.text}')
                return False
                
        except Exception as e:
            logger.error(f"Error creating SikaRemit dashboard: {e}")
            return False
