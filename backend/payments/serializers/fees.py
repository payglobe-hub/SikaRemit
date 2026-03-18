from rest_framework import serializers
from ..models.fees import FeeConfiguration, FeeCalculationLog, MerchantFeeOverride

class FeeConfigurationSerializer(serializers.ModelSerializer):
    # Explicitly declare merchant as optional
    merchant = serializers.IntegerField(required=False, allow_null=True, default=None)

    class Meta:
        model = FeeConfiguration
        fields = '__all__'
        read_only_fields = ['created_by', 'approved_by', 'created_at', 'updated_at']

    def create(self, validated_data):
        # Automatically set created_by from the request user
        request = self.context.get('request')
        if request and request.user:
            validated_data['created_by'] = request.user
        
        # Handle merchant field - convert ID to object or set to None
        merchant_id = validated_data.pop('merchant', None)
        if merchant_id:
            from users.models import Merchant
            try:
                validated_data['merchant'] = Merchant.objects.get(id=merchant_id)
            except Merchant.DoesNotExist:
                validated_data['merchant'] = None
        else:
            validated_data['merchant'] = None
        
        # Set is_platform_default=True for platform-wide configs (no merchant, no corridors)
        if validated_data.get('merchant') is None:
            if not validated_data.get('corridor_from') and not validated_data.get('corridor_to'):
                validated_data['is_platform_default'] = True
            
        return super().create(validated_data)

class MerchantFeeOverrideSerializer(serializers.ModelSerializer):
    merchant_name = serializers.SerializerMethodField()
    fee_configuration_name = serializers.SerializerMethodField()

    class Meta:
        model = MerchantFeeOverride
        fields = [
            'id', 'merchant', 'merchant_name', 'fee_configuration',
            'fee_configuration_name', 'proposed_fixed_fee',
            'proposed_percentage_fee', 'proposed_min_fee', 'proposed_max_fee',
            'justification', 'status', 'requested_by', 'reviewed_by',
            'reviewed_at', 'review_notes', 'effective_from', 'effective_to',
            'created_at', 'updated_at',
        ]
        read_only_fields = [
            'id', 'merchant', 'merchant_name', 'requested_by',
            'reviewed_by', 'reviewed_at', 'status', 'created_at', 'updated_at',
        ]

    def get_merchant_name(self, obj):
        return obj.merchant.business_name if obj.merchant else None

    def get_fee_configuration_name(self, obj):
        return obj.fee_configuration.name if obj.fee_configuration else None

class FeeCalculationLogSerializer(serializers.ModelSerializer):
    fee_configuration_name = serializers.SerializerMethodField()
    merchant_name = serializers.SerializerMethodField()

    class Meta:
        model = FeeCalculationLog
        fields = [
            'id', 'transaction_type', 'transaction_id', 'amount',
            'fee_configuration', 'fee_configuration_name',
            'calculated_fee', 'breakdown', 'merchant', 'merchant_name',
            'user', 'corridor_from', 'corridor_to', 'currency',
            'calculated_at',
        ]
        read_only_fields = fields

    def get_fee_configuration_name(self, obj):
        return obj.fee_configuration.name if obj.fee_configuration else None

    def get_merchant_name(self, obj):
        return obj.merchant.business_name if obj.merchant else None
