from rest_framework import serializers
from .models import AuditLog, SystemSettings, Country

class AuditLogSerializer(serializers.ModelSerializer):
    user_email = serializers.CharField(source='user.email', read_only=True)
    admin_email = serializers.CharField(source='admin.email', read_only=True)
    action_display = serializers.CharField(source='get_action_display', read_only=True)
    
    class Meta:
        model = AuditLog
        fields = [
            'id', 
            'action',
            'action_display',
            'user_email',
            'admin_email',
            'ip_address',
            'metadata',
            'created_at'
        ]

class SystemSettingsSerializer(serializers.ModelSerializer):
    """Serializer for system settings"""

    class Meta:
        model = SystemSettings
        fields = '__all__'
        read_only_fields = ['id', 'created_at', 'updated_at']

class CountrySerializer(serializers.ModelSerializer):
    """Serializer for country data"""

    class Meta:
        model = Country
        fields = [
            'id',
            'code',
            'name',
            'flag_emoji',
            'phone_code',
            'phone_code_formatted',
            'currency',
            'currency_code',
            'currency_symbol',
            'is_active'
        ]
        read_only_fields = ['id', 'created_at', 'updated_at']
