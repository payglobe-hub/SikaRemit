from rest_framework import serializers
from ..models.analytics import PerformanceAlert


class PerformanceAlertSerializer(serializers.ModelSerializer):
    acknowledged_by_name = serializers.SerializerMethodField()

    class Meta:
        model = PerformanceAlert
        fields = [
            'id', 'alert_type', 'severity', 'title', 'description',
            'affected_entities', 'metrics', 'threshold_breached',
            'suggested_actions', 'is_active', 'acknowledged_by',
            'acknowledged_by_name', 'acknowledged_at', 'resolved_at',
            'created_at', 'updated_at',
        ]
        read_only_fields = [
            'id', 'acknowledged_by', 'acknowledged_by_name',
            'acknowledged_at', 'resolved_at', 'created_at', 'updated_at',
        ]

    def get_acknowledged_by_name(self, obj):
        if obj.acknowledged_by:
            return obj.acknowledged_by.get_full_name() or obj.acknowledged_by.email
        return None
