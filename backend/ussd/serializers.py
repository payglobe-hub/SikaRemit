from rest_framework import serializers
from .models import USSDSession, USSDTransaction, USSDService
from payments.models.ussd import USSDMenu

class USSDSessionSerializer(serializers.ModelSerializer):
    """Serializer for USSD sessions"""

    class Meta:
        model = USSDSession
        fields = [
            'id', 'phone_number', 'session_id', 'service_code', 'status',
            'current_menu', 'started_at', 'ended_at', 'created_at', 'last_activity',
            'menu_history', 'data', 'steps'
        ]
        read_only_fields = ['id', 'started_at', 'created_at', 'last_activity']

class USSDTransactionSerializer(serializers.ModelSerializer):
    """Serializer for USSD transactions"""
    session_details = USSDSessionSerializer(source='session', read_only=True)

    class Meta:
        model = USSDTransaction
        fields = [
            'id', 'session', 'phone_number', 'amount', 'currency', 'status',
            'service_code', 'current_menu', 'text', 'menu_data', 'payment',
            'created_at', 'updated_at', 'session_details'
        ]
        read_only_fields = ['id', 'created_at', 'updated_at']

class USSDStatsSerializer(serializers.Serializer):
    """Serializer for USSD statistics"""
    total_sessions = serializers.IntegerField()
    active_sessions = serializers.IntegerField()
    completed_sessions = serializers.IntegerField()
    timeout_sessions = serializers.IntegerField()
    completed_transactions = serializers.IntegerField()
    total_amount = serializers.FloatField()
    success_rate = serializers.FloatField()
    average_duration = serializers.IntegerField()
    by_service = serializers.ListField(child=serializers.DictField())
    popular_menus = serializers.ListField(child=serializers.DictField())

class USSDSimulateSerializer(serializers.Serializer):
    """Serializer for USSD simulation request"""
    phone_number = serializers.CharField(max_length=20)
    service_code = serializers.CharField(max_length=50)
    input = serializers.CharField(max_length=100, required=False, allow_blank=True)

class USSDServiceSerializer(serializers.ModelSerializer):
    """Serializer for USSD services"""

    class Meta:
        model = USSDService
        fields = [
            'id', 'code', 'name', 'service_type', 'description',
            'menu_config', 'is_active', 'created_at', 'updated_at'
        ]
        read_only_fields = ['id', 'created_at', 'updated_at']

class USSDMenuSerializer(serializers.ModelSerializer):
    """Serializer for USSD menus"""
    parent_menu_id = serializers.PrimaryKeyRelatedField(
        queryset=USSDMenu.objects.all(),
        source='parent_menu',
        required=False,
        allow_null=True
    )
    parent_menu_title = serializers.CharField(source='parent_menu.title', read_only=True)

    class Meta:
        model = USSDMenu
        fields = [
            'id', 'menu_id', 'menu_type', 'title', 'content', 'options',
            'language', 'is_default', 'parent_menu_id', 'parent_menu_title',
            'timeout_seconds', 'is_active', 'created_at', 'updated_at'
        ]
        read_only_fields = ['id', 'created_at', 'updated_at']

    def validate_options(self, value):
        """Validate menu options format"""
        if not isinstance(value, list):
            raise serializers.ValidationError("Options must be a list")
        for option in value:
            if not isinstance(option, dict):
                raise serializers.ValidationError("Each option must be a dictionary")
            if 'input' not in option or 'text' not in option:
                raise serializers.ValidationError("Each option must have 'input' and 'text' fields")
        return value

class USSDMenuCreateSerializer(serializers.ModelSerializer):
    """Serializer for creating USSD menus"""

    class Meta:
        model = USSDMenu
        fields = [
            'menu_id', 'menu_type', 'title', 'content', 'options',
            'language', 'is_default', 'parent_menu', 'timeout_seconds', 'is_active'
        ]

    def validate_options(self, value):
        """Validate menu options format"""
        if not isinstance(value, list):
            raise serializers.ValidationError("Options must be a list")
        for option in value:
            if not isinstance(option, dict):
                raise serializers.ValidationError("Each option must be a dictionary")
            if 'input' not in option or 'text' not in option:
                raise serializers.ValidationError("Each option must have 'input' and 'text' fields")
        return value
