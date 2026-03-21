import requests
import logging
from django.conf import settings
from django.core.cache import cache
from typing import List, Dict, Any, Optional
import json

logger = logging.getLogger(__name__)

class TelecomService:
    """Service for fetching telecom data packages from providers"""

    def __init__(self):
        self.providers = {
            'mtn': {
                'name': 'MTN',
                'api_url': getattr(settings, 'MTN_DATA_PACKAGES_API_URL', None),
                'api_key': getattr(settings, 'MTN_DATA_PACKAGES_API_KEY', None),
            },
            'telecel': {
                'name': 'Telecel',
                'api_url': getattr(settings, 'TELECEL_DATA_PACKAGES_API_URL', None),
                'api_key': getattr(settings, 'TELECEL_DATA_PACKAGES_API_KEY', None),
            },
            'airteltigo': {
                'name': 'AirtelTigo',
                'api_url': getattr(settings, 'AIRTEL_DATA_PACKAGES_API_URL', None),
                'api_key': getattr(settings, 'AIRTEL_DATA_PACKAGES_API_KEY', None),
            },
            'glo': {
                'name': 'Glo',
                'api_url': getattr(settings, 'GLO_DATA_PACKAGES_API_URL', None),
                'api_key': getattr(settings, 'GLO_DATA_PACKAGES_API_KEY', None),
            }
        }

    def get_data_packages(self, provider: str) -> List[Dict[str, Any]]:
        """
        Fetch data packages for a specific provider.
        Returns packages from API or empty list if API unavailable.
        """
        if provider not in self.providers:
            raise ValueError(f"Unsupported provider: {provider}")

        provider_config = self.providers[provider]
        cache_key = f"telecom_packages_{provider}"

        # Try to get from cache first
        cached_packages = cache.get(cache_key)
        if cached_packages:
            return cached_packages

        # Try to fetch from API
        packages = self._fetch_from_api(provider_config)
        if packages:
            # Cache for 1 hour
            cache.set(cache_key, packages, 3600)
            return packages

        # No packages available
        logger.warning(f"No data packages available for {provider} - API unavailable")
        return []

    def _fetch_from_api(self, provider_config: Dict) -> Optional[List[Dict[str, Any]]]:
        """Fetch packages from provider API"""
        api_url = provider_config.get('api_url')
        api_key = provider_config.get('api_key')

        if not api_url or not api_key:
            return None

        try:
            headers = {
                'Authorization': f'Bearer {api_key}',
                'Content-Type': 'application/json'
            }

            response = requests.get(api_url, headers=headers, timeout=10)
            response.raise_for_status()

            data = response.json()

            # Transform API response to our standard format
            return self._transform_api_response(data, provider_config['name'])

        except Exception as e:
            logger.error(f"Failed to fetch packages from {provider_config['name']} API: {str(e)}")
            return None

    def _transform_api_response(self, api_data: Dict, provider_name: str) -> List[Dict[str, Any]]:
        """Transform provider API response to standard format"""
        packages = []

        # This is a generic transformer - each provider might need specific logic
        # For now, assume API returns packages in a standard format
        for item in api_data.get('packages', []):
            package = {
                'id': f"{provider_name.lower()}-{item.get('id', item.get('code', ''))}",
                'network': provider_name.lower(),
                'name': item.get('name', ''),
                'size': item.get('data_amount', item.get('size', '')),
                'validity': item.get('validity_period', item.get('validity', '')),
                'price': float(item.get('price', 0)),
                'description': item.get('description', ''),
                'is_active': item.get('is_active', True)
            }
            packages.append(package)

        return packages

    def get_all_providers(self) -> List[Dict[str, str]]:
        """Get list of available providers"""
        return [
            {'value': key, 'label': config['name']}
            for key, config in self.providers.items()
        ]
    
    def get_providers_by_country(self, country_code: str) -> List[Dict[str, Any]]:
        """Get providers available in a specific country"""
        # For now, return all providers for Ghana
        if country_code.upper() == 'GH':
            return [
                {
                    'code': 'mtn',
                    'name': 'MTN',
                    'display_name': 'MTN Ghana',
                    'country': 'GH',
                    'is_active': True
                },
                {
                    'code': 'telecel',
                    'name': 'Telecel',
                    'display_name': 'Telecel Ghana',
                    'country': 'GH',
                    'is_active': True
                },
                {
                    'code': 'airteltigo',
                    'name': 'AirtelTigo',
                    'display_name': 'AirtelTigo Ghana',
                    'country': 'GH',
                    'is_active': True
                }
            ]
        return []
    
    def get_data_packages_by_country(self, provider: str, country_code: str) -> List[Dict[str, Any]]:
        """Get data packages for a provider in a specific country"""
        if country_code.upper() != 'GH':
            return []
        
        # Return mock data packages for testing
        mock_packages = {
            'mtn': [
                {
                    'id': 'mtn-100mb',
                    'code': 'DATA_100MB',
                    'name': '100MB Daily',
                    'size': '100MB',
                    'validity': '24 hours',
                    'price': 2.50,
                    'description': '100MB data valid for 24 hours'
                },
                {
                    'id': 'mtn-1gb',
                    'code': 'DATA_1GB',
                    'name': '1GB Weekly',
                    'size': '1GB',
                    'validity': '7 days',
                    'price': 15.00,
                    'description': '1GB data valid for 7 days'
                }
            ],
            'telecel': [
                {
                    'id': 'telecel-500mb',
                    'code': 'DATA_500MB',
                    'name': '500MB Daily',
                    'size': '500MB',
                    'validity': '24 hours',
                    'price': 5.00,
                    'description': '500MB data valid for 24 hours'
                }
            ],
            'airteltigo': [
                {
                    'id': 'airteltigo-2gb',
                    'code': 'DATA_2GB',
                    'name': '2GB Monthly',
                    'size': '2GB',
                    'validity': '30 days',
                    'price': 30.00,
                    'description': '2GB data valid for 30 days'
                }
            ]
        }
        
        return mock_packages.get(provider.lower(), [])
