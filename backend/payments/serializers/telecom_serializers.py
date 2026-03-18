from rest_framework import serializers
from payments.models import TelecomProvider, TelecomPackage, BusinessRule

class TelecomProviderSerializer(serializers.ModelSerializer):
    """Serializer for TelecomProvider model"""
    country_name = serializers.CharField(source='country.name', read_only=True)
    country_code = serializers.CharField(source='country.code', read_only=True)
    packages_count = serializers.SerializerMethodField()

    class Meta:
        model = TelecomProvider
        fields = [
            'id', 'name', 'code', 'country', 'country_name', 'country_code',
            'logo_url', 'website', 'api_endpoint', 'supports_data',
            'supports_airtime', 'is_active', 'created_at', 'updated_at',
            'packages_count'
        ]
        read_only_fields = ['id', 'created_at', 'updated_at']

    def get_packages_count(self, obj):
        """Get count of active packages for this provider"""
        return obj.packages.filter(is_active=True).count()

class TelecomPackageSerializer(serializers.ModelSerializer):
    """Serializer for TelecomPackage model"""
    provider_name = serializers.CharField(source='provider.name', read_only=True)
    provider_code = serializers.CharField(source='provider.code', read_only=True)
    country_name = serializers.CharField(source='provider.country.name', read_only=True)
    country_code = serializers.CharField(source='country_code', read_only=True)
    formatted_price = serializers.CharField(read_only=True)
    validity_text = serializers.CharField(read_only=True)
    currency_code = serializers.CharField(source='currency.code', read_only=True)
    currency_symbol = serializers.CharField(source='currency.symbol', read_only=True)

    class Meta:
        model = TelecomPackage
        fields = [
            'id', 'package_id', 'name', 'description', 'provider', 'provider_name',
            'provider_code', 'country_name', 'country_code', 'package_type',
            'price', 'formatted_price', 'currency', 'currency_code', 'currency_symbol',
            'data_amount', 'validity_days', 'validity_text', 'airtime_amount',
            'is_active', 'is_featured', 'sort_order', 'provider_package_id',
            'created_at', 'updated_at'
        ]
        read_only_fields = ['id', 'formatted_price', 'validity_text', 'created_at', 'updated_at']

class BusinessRuleSerializer(serializers.ModelSerializer):
    """Serializer for BusinessRule model"""
    country_name = serializers.CharField(source='country.name', read_only=True)
    provider_name = serializers.CharField(source='telecom_provider.name', read_only=True)
    currency_code = serializers.CharField(source='currency.code', read_only=True)

    class Meta:
        model = BusinessRule
        fields = [
            'id', 'name', 'description', 'rule_type', 'scope',
            'country', 'country_name', 'telecom_provider', 'provider_name',
            'currency', 'currency_code', 'percentage_value', 'fixed_value',
            'is_active', 'priority', 'valid_from', 'valid_until',
            'created_at', 'updated_at'
        ]
        read_only_fields = ['id', 'created_at', 'updated_at']

class TelecomPackageListSerializer(serializers.ModelSerializer):
    """Lightweight serializer for package listing"""
    provider_name = serializers.CharField(source='provider.name', read_only=True)
    formatted_price = serializers.CharField(read_only=True)
    validity_text = serializers.CharField(read_only=True)
    currency_symbol = serializers.CharField(source='currency.symbol', read_only=True)

    class Meta:
        model = TelecomPackage
        fields = [
            'id', 'name', 'provider_name', 'package_type', 'data_amount',
            'formatted_price', 'validity_text', 'is_featured'
        ]
