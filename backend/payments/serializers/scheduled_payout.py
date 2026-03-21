from rest_framework import serializers
from ..models.scheduled_payout import ScheduledPayout

class ScheduledPayoutSerializer(serializers.ModelSerializer):
    merchant_name = serializers.CharField(source='merchant.business_name', read_only=True)

    class Meta:
        model = ScheduledPayout
        fields = [
            'id', 'merchant', 'merchant_name', 'amount', 'schedule',
            'next_execution', 'status', 'created_at', 'updated_at'
        ]
        read_only_fields = ['id', 'created_at', 'updated_at', 'next_execution']

    def create(self, validated_data):
        # Calculate next execution when creating
        instance = super().create(validated_data)
        instance.calculate_next_execution()
        instance.save()
        return instance

    def update(self, instance, validated_data):
        # Recalculate next execution if schedule changed
        schedule_changed = 'schedule' in validated_data
        instance = super().update(instance, validated_data)
        if schedule_changed:
            instance.calculate_next_execution()
            instance.save()
        return instance
