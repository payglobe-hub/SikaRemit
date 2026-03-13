from rest_framework import serializers
from django.contrib.auth import get_user_model
from ..models.currency import ExchangeRate

User = get_user_model()


class ExchangeRateSerializer(serializers.ModelSerializer):
    """Serializer for ExchangeRate model from currency.py"""
    from_currency_code = serializers.CharField(source='from_currency.code', read_only=True)
    to_currency_code = serializers.CharField(source='to_currency.code', read_only=True)
    from_currency_name = serializers.CharField(source='from_currency.name', read_only=True)
    to_currency_name = serializers.CharField(source='to_currency.name', read_only=True)

    class Meta:
        model = ExchangeRate
        fields = [
            'id', 'from_currency', 'to_currency', 'from_currency_code', 'to_currency_code',
            'from_currency_name', 'to_currency_name', 'rate', 'inverse_rate', 'source',
            'timestamp', 'is_latest', 'valid_from', 'valid_to', 'spread', 'metadata'
        ]
        read_only_fields = ['id', 'timestamp', 'inverse_rate']


class ExchangeRateBulkUpdateSerializer(serializers.Serializer):
    """Serializer for bulk updating exchange rates"""
    rates = serializers.ListField(
        child=serializers.DictField(
            child=serializers.CharField(),
            allow_empty=False
        ),
        allow_empty=False
    )

    def validate_rates(self, value):
        """Validate that each rate has required fields"""
        for rate_data in value:
            required_fields = ['from_currency', 'to_currency', 'rate']
            missing_fields = [field for field in required_fields if field not in rate_data]

            if missing_fields:
                raise serializers.ValidationError(
                    f"Rate data missing required fields: {', '.join(missing_fields)}"
                )

            # Validate currency codes are 3 characters
            if len(rate_data['from_currency']) != 3 or len(rate_data['to_currency']) != 3:
                raise serializers.ValidationError(
                    "Currency codes must be exactly 3 characters"
                )

        return value
