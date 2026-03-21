from rest_framework import serializers
from django.contrib.auth import get_user_model
from merchants.models import (
    BusinessAccount, BusinessRole, BusinessUser, ApprovalWorkflow,
    BulkPayment, BulkPaymentItem, BusinessAnalytics, AccountingIntegration,
    BusinessKYC, BusinessDocument, ComplianceReport, BusinessComplianceLog
)

User = get_user_model()

class BusinessRoleSerializer(serializers.ModelSerializer):
    """Serializer for business roles"""
    class Meta:
        model = BusinessRole
        fields = [
            'id', 'name', 'role_type', 'can_create_payments', 'can_approve_payments',
            'can_manage_users', 'can_view_reports', 'can_manage_settings',
            'single_transaction_limit', 'daily_limit', 'monthly_limit',
            'is_default', 'created_at', 'updated_at'
        ]
        read_only_fields = ['id', 'created_at', 'updated_at']

class BusinessUserSerializer(serializers.ModelSerializer):
    """Serializer for business users"""
    user_details = serializers.SerializerMethodField()
    role_details = BusinessRoleSerializer(source='role', read_only=True)

    class Meta:
        model = BusinessUser
        fields = [
            'id', 'user', 'user_details', 'role', 'role_details', 'status',
            'invited_at', 'joined_at', 'employee_id', 'department', 'position'
        ]
        read_only_fields = ['id', 'invited_at', 'joined_at']

    def get_user_details(self, obj):
        return {
            'id': obj.user.id,
            'first_name': obj.user.first_name,
            'last_name': obj.user.last_name,
            'email': obj.user.email,
            'phone_number': getattr(obj.user, 'phone_number', None),
        }

class ApprovalWorkflowSerializer(serializers.ModelSerializer):
    """Serializer for approval workflows"""
    required_roles_details = BusinessRoleSerializer(source='required_roles', many=True, read_only=True)

    class Meta:
        model = ApprovalWorkflow
        fields = [
            'id', 'name', 'description', 'workflow_type', 'min_amount', 'max_amount',
            'requires_dual_approval', 'required_roles', 'required_roles_details',
            'required_approvers', 'is_active', 'created_at', 'updated_at'
        ]
        read_only_fields = ['id', 'created_at', 'updated_at']

class BusinessAccountSerializer(serializers.ModelSerializer):
    """Serializer for business accounts"""
    primary_contact_details = serializers.SerializerMethodField()
    total_users = serializers.ReadOnlyField()
    active_users = serializers.ReadOnlyField()
    roles = BusinessRoleSerializer(many=True, read_only=True)
    approval_workflows = ApprovalWorkflowSerializer(many=True, read_only=True)

    class Meta:
        model = BusinessAccount
        fields = [
            'id', 'business_name', 'account_type', 'account_tier',
            'registration_number', 'tax_id', 'business_address',
            'business_phone', 'business_email', 'primary_contact',
            'primary_contact_details', 'industry', 'employee_count',
            'annual_revenue', 'is_active', 'credit_limit', 'payment_terms',
            'total_users', 'active_users', 'roles', 'approval_workflows',
            'created_at', 'updated_at', 'activated_at'
        ]
        read_only_fields = [
            'id', 'primary_contact_details', 'total_users', 'active_users',
            'roles', 'approval_workflows', 'created_at', 'updated_at', 'activated_at'
        ]

    def get_primary_contact_details(self, obj):
        return {
            'id': obj.primary_contact.id,
            'first_name': obj.primary_contact.first_name,
            'last_name': obj.primary_contact.last_name,
            'email': obj.primary_contact.email,
        }

    def create(self, validated_data):
        validated_data['primary_contact'] = self.context['request'].user
        return super().create(validated_data)

class BulkPaymentItemSerializer(serializers.ModelSerializer):
    """Serializer for bulk payment items"""
    class Meta:
        model = BulkPaymentItem
        fields = [
            'id', 'recipient_name', 'recipient_phone', 'recipient_email',
            'recipient_account', 'amount', 'description', 'payment_method',
            'status', 'transaction_id', 'processed_at', 'failure_reason',
            'reference', 'custom_fields', 'created_at', 'updated_at'
        ]
        read_only_fields = [
            'id', 'status', 'transaction_id', 'processed_at', 'failure_reason',
            'reference', 'created_at', 'updated_at'
        ]

class BulkPaymentSerializer(serializers.ModelSerializer):
    """Serializer for bulk payments"""
    created_by_details = serializers.SerializerMethodField()
    approved_by_details = serializers.SerializerMethodField()
    payment_items = BulkPaymentItemSerializer(many=True, read_only=True)
    approval_workflow_details = ApprovalWorkflowSerializer(source='approval_workflow', read_only=True)

    class Meta:
        model = BulkPayment
        fields = [
            'id', 'name', 'description', 'total_amount', 'currency',
            'status', 'approval_workflow', 'approval_workflow_details',
            'approved_by', 'approved_by_details', 'approved_at',
            'processed_at', 'completed_at', 'reference_number',
            'notes', 'csv_file', 'created_by', 'created_by_details',
            'payment_items', 'created_at', 'updated_at'
        ]
        read_only_fields = [
            'id', 'status', 'approved_by', 'approved_at', 'processed_at',
            'completed_at', 'reference_number', 'created_by', 'created_by_details',
            'payment_items', 'created_at', 'updated_at'
        ]

    def get_created_by_details(self, obj):
        return {
            'id': obj.created_by.id,
            'first_name': obj.created_by.first_name,
            'last_name': obj.created_by.last_name,
            'email': obj.created_by.email,
        }

    def get_approved_by_details(self, obj):
        return [{
            'id': user.id,
            'first_name': user.first_name,
            'last_name': user.last_name,
            'email': user.email,
        } for user in obj.approved_by.all()]

class BusinessAnalyticsSerializer(serializers.ModelSerializer):
    """Serializer for business analytics"""
    class Meta:
        model = BusinessAnalytics
        fields = [
            'total_payments', 'total_volume', 'average_transaction',
            'monthly_volume', 'monthly_transactions', 'active_users',
            'total_users', 'failed_payments', 'high_value_transactions',
            'last_updated'
        ]

class AccountingIntegrationSerializer(serializers.ModelSerializer):
    """Serializer for accounting integrations"""
    class Meta:
        model = AccountingIntegration
        fields = [
            'integration_type', 'is_enabled', 'api_key', 'api_secret',
            'access_token', 'refresh_token', 'company_id', 'base_url',
            'sync_frequency', 'sync_payments', 'sync_customers', 'sync_invoices',
            'last_sync', 'sync_status', 'error_message', 'created_at', 'updated_at'
        ]
        read_only_fields = ['last_sync', 'sync_status', 'error_message', 'created_at', 'updated_at']
        extra_kwargs = {
            'api_key': {'write_only': True},
            'api_secret': {'write_only': True},
            'access_token': {'write_only': True},
            'refresh_token': {'write_only': True},
        }
