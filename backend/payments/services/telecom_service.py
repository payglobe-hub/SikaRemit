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
