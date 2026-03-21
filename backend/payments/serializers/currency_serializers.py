from rest_framework import serializers
from ..models import Currency, ExchangeRate, CurrencyPreference, WalletBalance

class CurrencySerializer(serializers.ModelSerializer):
    """Serializer for Currency model"""
    class Meta:
        model = Currency
        fields = [
            'id', 'code', 'name', 'symbol', 'decimal_places',
            'is_active', 'is_base_currency', 'flag_emoji',
            'exchange_api_supported', 'minimum_amount', 'maximum_amount'
        ]

class ExchangeRateSerializer(serializers.ModelSerializer):
    """Serializer for ExchangeRate model"""
    from_currency = CurrencySerializer(read_only=True)
    to_currency = CurrencySerializer(read_only=True)

    class Meta:
        model = ExchangeRate
        fields = [
            'id', 'from_currency', 'to_currency', 'rate',
            'inverse_rate', 'source', 'timestamp', 'is_latest'
        ]

class CurrencyPreferenceSerializer(serializers.ModelSerializer):
    """Serializer for CurrencyPreference model"""
    base_currency = CurrencySerializer(read_only=True)
    display_currency = CurrencySerializer(read_only=True)
    base_currency_code = serializers.CharField(write_only=True, required=False)
    display_currency_code = serializers.CharField(write_only=True, required=False)

    class Meta:
        model = CurrencyPreference
        fields = [
            'id', 'base_currency', 'display_currency', 'show_symbol',
            'show_code', 'decimal_places', 'auto_update_rates',
            'notification_threshold', 'created_at', 'updated_at',
            'base_currency_code', 'display_currency_code'
        ]
        read_only_fields = ['id', 'created_at', 'updated_at']

    def create(self, validated_data):
        # Handle currency codes
        base_code = validated_data.pop('base_currency_code', None)
        display_code = validated_data.pop('display_currency_code', None)

        if base_code:
            try:
                validated_data['base_currency'] = Currency.objects.get(code=base_code.upper())
            except Currency.DoesNotExist:
                raise serializers.ValidationError(f"Invalid base currency code: {base_code}")

        if display_code:
            try:
                validated_data['display_currency'] = Currency.objects.get(code=display_code.upper())
            except Currency.DoesNotExist:
                raise serializers.ValidationError(f"Invalid display currency code: {display_code}")

        return super().create(validated_data)

    def update(self, instance, validated_data):
        # Handle currency codes
        base_code = validated_data.pop('base_currency_code', None)
        display_code = validated_data.pop('display_currency_code', None)

        if base_code:
            try:
                instance.base_currency = Currency.objects.get(code=base_code.upper())
            except Currency.DoesNotExist:
                raise serializers.ValidationError(f"Invalid base currency code: {base_code}")

        if display_code:
            try:
                instance.display_currency = Currency.objects.get(code=display_code.upper())
            except Currency.DoesNotExist:
                raise serializers.ValidationError(f"Invalid display currency code: {display_code}")

        return super().update(instance, validated_data)

class WalletBalanceSerializer(serializers.ModelSerializer):
    """Serializer for WalletBalance model"""
    currency = CurrencySerializer(read_only=True)
    currency_code = serializers.CharField(write_only=True, required=False)
    total_balance = serializers.DecimalField(max_digits=15, decimal_places=6, read_only=True)
    formatted_available = serializers.SerializerMethodField()
    formatted_pending = serializers.SerializerMethodField()
    formatted_reserved = serializers.SerializerMethodField()
    formatted_total = serializers.SerializerMethodField()

    class Meta:
        model = WalletBalance
        fields = [
            'id', 'currency', 'available_balance', 'pending_balance',
            'reserved_balance', 'last_updated', 'total_balance',
            'currency_code', 'formatted_available', 'formatted_pending',
            'formatted_reserved', 'formatted_total'
        ]
        read_only_fields = ['id', 'last_updated', 'total_balance']

    def get_formatted_available(self, obj):
        from ..services.currency_service import CurrencyService, CurrencyPreferenceService
        try:
            user = self.context.get('request').user
            preferences = CurrencyPreferenceService.get_user_preferences(user)
            return CurrencyService.format_amount(obj.available_balance, obj.currency, preferences)
        except:
            return CurrencyService.format_amount(obj.available_balance, obj.currency)

    def get_formatted_pending(self, obj):
        from ..services.currency_service import CurrencyService, CurrencyPreferenceService
        try:
            user = self.context.get('request').user
            preferences = CurrencyPreferenceService.get_user_preferences(user)
            return CurrencyService.format_amount(obj.pending_balance, obj.currency, preferences)
        except:
            return CurrencyService.format_amount(obj.pending_balance, obj.currency)

    def get_formatted_reserved(self, obj):
        from ..services.currency_service import CurrencyService, CurrencyPreferenceService
        try:
            user = self.context.get('request').user
            preferences = CurrencyPreferenceService.get_user_preferences(user)
            return CurrencyService.format_amount(obj.reserved_balance, obj.currency, preferences)
        except:
            return CurrencyService.format_amount(obj.reserved_balance, obj.currency)

    def get_formatted_total(self, obj):
        from ..services.currency_service import CurrencyService, CurrencyPreferenceService
        try:
            user = self.context.get('request').user
            preferences = CurrencyPreferenceService.get_user_preferences(user)
            return CurrencyService.format_amount(obj.total_balance, obj.currency, preferences)
        except:
            return CurrencyService.format_amount(obj.total_balance, obj.currency)
