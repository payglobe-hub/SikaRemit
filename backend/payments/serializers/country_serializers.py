from rest_framework import serializers
from ..models import Country

class CountrySerializer(serializers.ModelSerializer):
    """
    Serializer for Country model
    """
    currency_code = serializers.CharField(source='currency.code', read_only=True)
    currency_symbol = serializers.CharField(source='currency.symbol', read_only=True)
    phone_code_formatted = serializers.CharField(read_only=True)

    class Meta:
        model = Country
        fields = [
            'id', 'code', 'name', 'flag_emoji', 'phone_code', 'phone_code_formatted',
            'currency', 'currency_code', 'currency_symbol', 'is_active',
            'created_at', 'updated_at'
        ]
        read_only_fields = ['id', 'created_at', 'updated_at']
