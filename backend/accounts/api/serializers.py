from rest_framework import serializers
from ..models import UserActivity
from django.contrib.auth import get_user_model
from shared.constants import (
    USER_TYPE_SUPER_ADMIN, USER_TYPE_BUSINESS_ADMIN, USER_TYPE_OPERATIONS_ADMIN,
    USER_TYPE_VERIFICATION_ADMIN, USER_TYPE_MERCHANT, USER_TYPE_CUSTOMER
)

User = get_user_model()

class UserSerializer(serializers.ModelSerializer):
    firstName = serializers.CharField(source='first_name')
    lastName = serializers.CharField(source='last_name')  
    isActive = serializers.BooleanField(source='is_active')
    createdAt = serializers.DateTimeField(source='date_joined')
    
    class Meta:
        model = User
        fields = ['id', 'email', 'firstName', 'lastName', 'isActive', 'createdAt']

class UserActivitySerializer(serializers.ModelSerializer):
    action = serializers.CharField(source='event_type')
    user_email = serializers.CharField(source='user.email', read_only=True)
    admin_email = serializers.CharField(source='user.email', read_only=True)  # For admin context
    timestamp = serializers.DateTimeField(source='created_at')
    
    class Meta:
        model = UserActivity
        fields = [
            'id', 
            'action',
            'user_email',
            'admin_email', 
            'timestamp',
            'metadata'
        ]

class AdminUserSerializer(serializers.ModelSerializer):
    user_type = serializers.IntegerField()
    is_active = serializers.BooleanField()
    created_at = serializers.DateTimeField(source='date_joined', read_only=True)
    role = serializers.SerializerMethodField()
    
    class Meta:
        model = User
        fields = [
            'id', 'email', 'first_name', 'last_name', 
            'user_type', 'role', 'is_active', 'created_at'
        ]
        read_only_fields = ['id', 'created_at']
    
    def get_role(self, obj):
        """Compute role based on user_type"""
        user_type = obj.user_type
        if user_type == USER_TYPE_SUPER_ADMIN:
            return 'super_admin'
        elif user_type == USER_TYPE_BUSINESS_ADMIN:
            return 'business_admin'
        elif user_type == USER_TYPE_OPERATIONS_ADMIN:
            return 'operations_admin'
        elif user_type == USER_TYPE_VERIFICATION_ADMIN:
            return 'verification_admin'
        elif user_type == USER_TYPE_MERCHANT:
            return 'merchant'
        elif user_type == USER_TYPE_CUSTOMER:
            return 'customer'
        else:
            return 'unknown'
    
    def create(self, validated_data):
        # Set default password if not provided
        password = validated_data.pop('password', None)
        user = super().create(validated_data)
        if password:
            user.set_password(password)
            user.save()
        else:
            # Generate a random password or handle accordingly
            user.set_password('temp123!')  # Temporary password
            user.save()
        return user
