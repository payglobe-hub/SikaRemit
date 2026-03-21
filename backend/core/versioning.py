"""
API Versioning Strategy for SikaRemit
Implements URL path versioning with backward compatibility
"""
from rest_framework.versioning import URLPathVersioning
from rest_framework.exceptions import NotFound
from django.conf import settings
import logging

logger = logging.getLogger(__name__)

class SikaRemitAPIVersioning(URLPathVersioning):
    """
    Custom API versioning class for SikaRemit
    
    Supports:
    - URL path versioning: /api/v1/, /api/v2/
    - Default version fallback
    - Version deprecation warnings
    - Version sunset dates
    """
    
    default_version = 'v1'
    allowed_versions = ['v1', 'v2']
    version_param = 'version'
    
    # Version deprecation info
    DEPRECATED_VERSIONS = {
        # 'v1': {
        #     'sunset_date': '2026-12-31',
        #     'message': 'API v1 will be sunset on December 31, 2026. Please migrate to v2.'
        # }
    }
    
    def determine_version(self, request, *args, **kwargs):
        """
        Determine API version from URL path
        """
        version = super().determine_version(request, *args, **kwargs)
        
        # Check if version is deprecated
        if version in self.DEPRECATED_VERSIONS:
            deprecation_info = self.DEPRECATED_VERSIONS[version]
            logger.warning(
                f"Deprecated API version {version} accessed by {request.user}. "
                f"Sunset date: {deprecation_info['sunset_date']}"
            )
            # Add deprecation header
            request.META['X-API-Deprecation-Warning'] = deprecation_info['message']
        
        return version

class APIVersionRouter:
    """
    Routes requests to appropriate API version handlers
    """
    
    @staticmethod
    def get_serializer_class(base_serializer, version):
        """
        Get version-specific serializer class
        
        Args:
            base_serializer: Base serializer class
            version: API version (e.g., 'v1', 'v2')
            
        Returns:
            Serializer class for the specified version
        """
        version_serializer_name = f"{base_serializer.__name__}{version.upper()}"
        
        # Try to import version-specific serializer
        try:
            module = __import__(
                base_serializer.__module__,
                fromlist=[version_serializer_name]
            )
            return getattr(module, version_serializer_name)
        except (ImportError, AttributeError):
            # Fall back to base serializer
            return base_serializer
    
    @staticmethod
    def get_queryset_for_version(base_queryset, version):
        """
        Apply version-specific queryset filters
        
        Args:
            base_queryset: Base queryset
            version: API version
            
        Returns:
            Filtered queryset for the version
        """
        # Version-specific logic can be added here
        # For example, v1 might exclude certain fields
        return base_queryset

# Mixin for versioned viewsets
class VersionedViewSetMixin:
    """
    Mixin to add versioning support to ViewSets
    """
    versioning_class = SikaRemitAPIVersioning
    
    def get_serializer_class(self):
        """
        Get version-specific serializer class
        """
        base_serializer = super().get_serializer_class()
        version = self.request.version
        
        return APIVersionRouter.get_serializer_class(base_serializer, version)
    
    def get_queryset(self):
        """
        Get version-specific queryset
        """
        base_queryset = super().get_queryset()
        version = self.request.version
        
        return APIVersionRouter.get_queryset_for_version(base_queryset, version)
    
    def finalize_response(self, request, response, *args, **kwargs):
        """
        Add version headers to response
        """
        response = super().finalize_response(request, response, *args, **kwargs)
        
        # Add version header
        response['X-API-Version'] = request.version
        
        # Add deprecation warning if applicable
        if hasattr(request, 'META') and 'X-API-Deprecation-Warning' in request.META:
            response['X-API-Deprecation-Warning'] = request.META['X-API-Deprecation-Warning']
        
        return response

# Version-specific response transformers
class APIVersionTransformer:
    """
    Transforms API responses based on version
    """
    
    @staticmethod
    def transform_payment_response(data, version):
        """
        Transform payment response for specific API version
        
        Args:
            data: Payment data dict
            version: API version
            
        Returns:
            Transformed data dict
        """
        if version == 'v1':
            # V1 format
            return {
                'id': data.get('id'),
                'amount': data.get('amount'),
                'currency': data.get('currency'),
                'status': data.get('status'),
                'created_at': data.get('created_at'),
                'payment_method': data.get('payment_method')
            }
        elif version == 'v2':
            # V2 format with additional fields
            return {
                'id': data.get('id'),
                'amount': {
                    'value': data.get('amount'),
                    'currency': data.get('currency')
                },
                'status': data.get('status'),
                'timestamps': {
                    'created': data.get('created_at'),
                    'updated': data.get('updated_at')
                },
                'payment_method': data.get('payment_method'),
                'metadata': data.get('metadata', {})
            }
        
        return data
    
    @staticmethod
    def transform_user_response(data, version):
        """
        Transform user response for specific API version
        """
        if version == 'v1':
            return {
                'id': data.get('id'),
                'email': data.get('email'),
                'name': f"{data.get('first_name', '')} {data.get('last_name', '')}".strip(),
                'role': data.get('role')
            }
        elif version == 'v2':
            return {
                'id': data.get('id'),
                'email': data.get('email'),
                'profile': {
                    'first_name': data.get('first_name'),
                    'last_name': data.get('last_name'),
                    'phone': data.get('phone')
                },
                'role': data.get('role'),
                'verification': {
                    'is_verified': data.get('is_verified'),
                    'verification_level': data.get('verification_level', 0)
                }
            }
        
        return data

# Version migration helpers
class APIVersionMigrationHelper:
    """
    Helpers for migrating between API versions
    """
    
    @staticmethod
    def get_migration_guide(from_version, to_version):
        """
        Get migration guide for version upgrade
        
        Returns:
            dict: Migration guide with breaking changes and recommendations
        """
        migrations = {
            ('v1', 'v2'): {
                'breaking_changes': [
                    {
                        'endpoint': '/api/v1/payments/',
                        'change': 'Response format changed',
                        'old': '{"amount": 100, "currency": "USD"}',
                        'new': '{"amount": {"value": 100, "currency": "USD"}}'
                    },
                    {
                        'endpoint': '/api/v1/users/',
                        'change': 'User profile structure changed',
                        'old': '{"name": "John Doe"}',
                        'new': '{"profile": {"first_name": "John", "last_name": "Doe"}}'
                    }
                ],
                'new_features': [
                    'Enhanced error responses with error codes',
                    'Pagination improvements',
                    'Webhook signature verification',
                    'Rate limiting headers'
                ],
                'recommendations': [
                    'Update client libraries to v2',
                    'Test thoroughly in staging environment',
                    'Monitor error rates after migration'
                ]
            }
        }
        
        return migrations.get((from_version, to_version), {})
    
    @staticmethod
    def validate_version_compatibility(client_version, server_version):
        """
        Check if client version is compatible with server
        
        Returns:
            tuple: (is_compatible, message)
        """
        # Define compatibility matrix
        compatibility = {
            'v1': ['v1'],
            'v2': ['v1', 'v2']  # v2 is backward compatible with v1
        }
        
        if client_version in compatibility.get(server_version, []):
            return True, "Version compatible"
        
        return False, f"Client version {client_version} is not compatible with server version {server_version}"
