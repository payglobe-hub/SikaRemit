from rest_framework import serializers
from django.contrib.auth import get_user_model
from .models import AdminActivity, BackupVerification, PasswordResetToken, AuthLog, Transaction, Session, Payout, SupportTicket, SupportMessage, Recipient
from users.models import User, Customer, Merchant
from merchants.models import Product
from notifications.models import Notification
from payments.models.payment_log import PaymentLog
from payments.models.cross_border import CrossBorderRemittance
from payments.models.payment import Payment
from django.utils.module_loading import import_string
from django.core.exceptions import ValidationError
from drf_spectacular.utils import extend_schema_serializer
from rest_framework_simplejwt.serializers import TokenObtainPairSerializer
from shared.constants import USER_TYPE_MERCHANT, USER_TYPE_CUSTOMER

User = get_user_model()

class UserRegisterSerializer(serializers.Serializer):
    email = serializers.EmailField(required=True)
    password = serializers.CharField(
        write_only=True,
        required=True,
        allow_blank=True
    )
    password2 = serializers.CharField(write_only=True, required=False, allow_blank=True)
    user_type = serializers.IntegerField(required=False, default=USER_TYPE_CUSTOMER)
    username = serializers.CharField(required=False, allow_blank=True)
    first_name = serializers.CharField(required=False, allow_blank=True)
    last_name = serializers.CharField(required=False, allow_blank=True)
    phone = serializers.CharField(required=False, allow_blank=True)

    def validate(self, attrs):
        # If password2 not provided, default to password (mobile apps skip confirm)
        password2 = attrs.get('password2') or attrs.get('password')
        if attrs['password'] != password2:
            raise serializers.ValidationError({"password": "Passwords don't match"})
        
        # Default user_type to CUSTOMER if not provided
        if 'user_type' not in attrs or attrs['user_type'] is None:
            attrs['user_type'] = USER_TYPE_CUSTOMER
        
        # SECURITY: Only allow customer and merchant account creation through public registration
        # Admin accounts should only be created through admin-only endpoints
        if attrs['user_type'] not in [USER_TYPE_MERCHANT, USER_TYPE_CUSTOMER]:
            raise serializers.ValidationError({
                "user_type": "Invalid user type. Only customer and merchant accounts can be created through public registration."
            })
        
        return attrs

class UserLoginSerializer(serializers.Serializer):
    email = serializers.EmailField(required=True)
    password = serializers.CharField(write_only=True, required=True, style={'input_type': 'password'})
    
    def validate(self, attrs):
        email = attrs.get('email')
        password = attrs.get('password')
        
        if email and password:
            from django.contrib.auth import get_user_model
            
            User = get_user_model()
            
            # Find user by email - handle potential duplicates
            try:
                # First try to get a single user
                user = User.objects.get(email=email)
            except User.MultipleObjectsReturned:
                # If multiple users exist with same email, get the first active verified one
                user = User.objects.filter(email=email, is_active=True, is_verified=True).first()
                if not user:
                    # If no active verified user found, get the first one (for backward compatibility)
                    user = User.objects.filter(email=email).first()
                if not user:
                    raise serializers.ValidationError('Invalid email or password.')
            except User.DoesNotExist:
                raise serializers.ValidationError('Invalid email or password.')
            
            # Check password
            if not user.check_password(password):
                raise serializers.ValidationError('Invalid email or password.')
            
            if not user.is_active:
                raise serializers.ValidationError('User account is disabled.')
                
            if user.mfa_enabled:
                raise serializers.ValidationError('mfa_required')
                
            attrs['user'] = user
            return attrs
        
        return attrs

class AccountsUserSerializer(serializers.ModelSerializer):
    role = serializers.SerializerMethodField()
    created_at = serializers.DateTimeField(source='date_joined', read_only=True)
    
    def get_role(self, obj):
        if obj.is_superuser or obj.is_staff:
            return 'admin'
        # Use correct user_type mappings from constants
        from shared.constants import (
            USER_TYPE_MERCHANT, USER_TYPE_CUSTOMER,
            USER_TYPE_SUPER_ADMIN, USER_TYPE_BUSINESS_ADMIN, 
            USER_TYPE_OPERATIONS_ADMIN, USER_TYPE_VERIFICATION_ADMIN
        )
        
        role_mapping = {
            USER_TYPE_MERCHANT: 'merchant',
            USER_TYPE_CUSTOMER: 'customer',
            USER_TYPE_SUPER_ADMIN: 'super_admin',
            USER_TYPE_BUSINESS_ADMIN: 'business_admin',
            USER_TYPE_OPERATIONS_ADMIN: 'operations_admin',
            USER_TYPE_VERIFICATION_ADMIN: 'verification_admin'
        }
        return role_mapping.get(obj.user_type, 'customer')
    
    class Meta:
        model = User
        fields = ['id', 'username', 'email', 'first_name', 'last_name', 'phone', 'role', 'user_type', 'is_verified', 'is_active', 'created_at']
        read_only_fields = ['id', 'role', 'is_verified', 'created_at']
        component_name = 'AccountsUser'

class AccountsTransactionSerializer(serializers.ModelSerializer):
    sender = serializers.StringRelatedField()
    recipient = serializers.StringRelatedField()
    
    class Meta:
        model = Transaction
        fields = '__all__'
        read_only_fields = ['created_at', 'completed_at']
        component_name = 'AccountsTransaction'

class PaymentsTransactionSerializer(serializers.ModelSerializer):
    customer_email = serializers.EmailField(source='customer.user.email', read_only=True)
    merchant_email = serializers.EmailField(source='merchant.user.email', read_only=True)
    payment_method_name = serializers.CharField(source='payment_method.name', read_only=True)
    
    class Meta:
        model = Transaction
        fields = ['id', 'customer', 'customer_email', 'merchant', 'merchant_email', 'amount', 'currency', 'status', 'payment_method', 'payment_method_name', 'created_at', 'updated_at']
        read_only_fields = ['created_at', 'updated_at']
        component_name = 'PaymentsTransaction'

class PaymentSerializer(serializers.ModelSerializer):
    customer_email = serializers.EmailField(source='customer.user.email', read_only=True)
    merchant_email = serializers.EmailField(source='merchant.user.email', read_only=True, allow_null=True)
    payment_method_name = serializers.CharField(source='payment_method.name', read_only=True)
    
    class Meta:
        model = Payment
        fields = ['id', 'customer', 'customer_email', 'merchant', 'merchant_email', 'amount', 'currency', 'status', 'payment_method', 'payment_method_name', 'reference', 'created_at', 'updated_at', 'payment_type', 'bill_issuer', 'bill_reference', 'due_date']
        read_only_fields = ['created_at', 'updated_at']
        component_name = 'Payment'

class AdminActivitySerializer(serializers.ModelSerializer):
    admin_email = serializers.EmailField(source='admin.email', read_only=True)
    
    class Meta:
        model = AdminActivity
        fields = [
            'id',
            'admin_email',
            'action_type',
            'object_type',
            'object_id',
            'ip_address',
            'timestamp',
            'metadata'
        ]
        read_only_fields = fields

class BackupVerificationSerializer(serializers.ModelSerializer):
    verified_by_email = serializers.EmailField(source='verified_by.email', read_only=True)
    
    class Meta:
        model = BackupVerification
        fields = [
            'id',
            'verification_type',
            'started_at',
            'completed_at',
            'status',
            'checksum',
            'file_size',
            'verified_by_email',
            'notes'
        ]
        read_only_fields = ['started_at', 'completed_at', 'status', 'verified_by_email']

class SessionSerializer(serializers.ModelSerializer):
    device_info = serializers.SerializerMethodField()
    
    class Meta:
        model = Session
        fields = ['id', 'ip_address', 'user_agent', 'device_info', 'created_at', 'expiry_date']
    
    def get_device_info(self, obj):
        return {
            'is_mobile': 'Mobile' in obj.user_agent,
            'browser': self._parse_browser(obj.user_agent),
            'os': self._parse_os(obj.user_agent)
        }

class PasswordResetTokenSerializer(serializers.ModelSerializer):
    user_email = serializers.EmailField(source='user.email', read_only=True)
    
    class Meta:
        model = PasswordResetToken
        fields = [
            'id',
            'user_email',
            'token',
            'created_at',
            'expires_at',
            'used'
        ]
        read_only_fields = ['user_email', 'token', 'created_at']

class AuthLogSerializer(serializers.ModelSerializer):
    user_email = serializers.EmailField(source='user.email', read_only=True)
    
    class Meta:
        model = AuthLog
        fields = [
            'id',
            'user_email',
            'ip_address',
            'device_id',
            'success',
            'reason',
            'timestamp'
        ]
        read_only_fields = fields

class PaymentInitiationSerializer(serializers.Serializer):
    amount = serializers.DecimalField(max_digits=12, decimal_places=2)
    currency = serializers.CharField(max_length=3)
    payment_method = serializers.CharField(max_length=20)
    metadata = serializers.JSONField(required=False, default=dict)

class PaymentLogSerializer(serializers.ModelSerializer):
    user = serializers.StringRelatedField()
    metadata = serializers.JSONField()
    
    class Meta:
        model = PaymentLog
        fields = '__all__'
        read_only_fields = ['created_at', 'error']

class ProductSerializer(serializers.ModelSerializer):
    class Meta:
        model = Product
        fields = ['id', 'name', 'description', 'price', 'store']
        extra_kwargs = {
            'store': {'required': True}
        }

class ProductInventorySerializer(serializers.ModelSerializer):
    available = serializers.IntegerField()
    
    class Meta:
        model = Product
        fields = ['id', 'name', 'price', 'available']

class MerchantProductSerializer(serializers.ModelSerializer):
    merchant_email = serializers.EmailField(source='store.email', read_only=True)
    
    class Meta:
        model = Product
        fields = [
            'id', 
            'name', 
            'description', 
            'price',
            'merchant_email',
            'created_at',
            'updated_at'
        ]
        read_only_fields = ['merchant_email', 'created_at', 'updated_at']
        extra_kwargs = {
            'price': {'min_value': 0.01}
        }
    
    def validate(self, data):
        # Ensure price is positive
        if 'price' in data and data['price'] <= 0:
            raise serializers.ValidationError({'price': 'Price must be greater than 0'})
        return data

class RemittancePaymentSerializer(serializers.ModelSerializer):
    class Meta:
        model = CrossBorderRemittance
        fields = [
            'id', 'amount_sent', 'recipient_name', 
            'recipient_phone', 'recipient_country', 'created_at'
        ]
        extra_kwargs = {
            'amount_sent': {'min_value': 0.01}
        }

class BillPaymentSerializer(serializers.ModelSerializer):
    class Meta:
        model = Payment
        fields = [
            'id', 'amount', 'bill_issuer', 
            'bill_reference', 'due_date', 'created_at'
        ]
        extra_kwargs = {
            'amount': {'min_value': 0.01},
            'due_date': {'required': True}
        }

class CheckoutSerializer(serializers.ModelSerializer):
    items = serializers.JSONField()
    payment_method = serializers.CharField(max_length=20)
    payment_token = serializers.CharField(required=False)
    shipping_address = serializers.CharField(required=False)
    
    class Meta:
        model = PaymentLog
        fields = [
            'items', 'amount', 'payment_type',
            'mobile_money_provider', 'mobile_money_number',
            'payment_method', 'payment_token', 'shipping_address'
        ]
        extra_kwargs = {
            'amount': {'min_value': 0.01}
        }
    
    def validate_payment_method(self, value):
        valid_methods = ['CARD', 'BANK_TRANSFER', 'WALLET', 'MOBILE_MONEY', 
                        'GOOGLE_PAY', 'APPLE_PAY', 'QR_CODE']
        if value not in valid_methods:
            raise serializers.ValidationError('Invalid payment method')
        return value
    
    def validate(self, data):
        if data['payment_method'] == 'CARD' and not data.get('payment_token'):
            raise serializers.ValidationError('Payment token required for card payments')
        if data['payment_method'] == 'MOBILE_MONEY' and not data.get('mobile_money_number'):
            raise serializers.ValidationError('Mobile money number required')
        return data

class SubscriptionPaymentSerializer(serializers.ModelSerializer):
    subscriber_email = serializers.EmailField(source='customer.email', read_only=True)
    
    class Meta:
        model = PaymentLog
        fields = [
            'id', 'amount', 'subscriber_email', 
            'subscription_id', 'billing_cycle', 'next_billing_date', 'created_at'
        ]
        extra_kwargs = {
            'amount': {'min_value': 0.01},
            'next_billing_date': {'required': True}
        }

class CustomerSerializer(serializers.ModelSerializer):
    user = AccountsUserSerializer(read_only=True)
    
    class Meta:
        model = Customer
        fields = '__all__'

class MerchantSerializer(serializers.ModelSerializer):
    user = AccountsUserSerializer(read_only=True)
    
    class Meta:
        model = Merchant
        fields = '__all__'

class NotificationSerializer(serializers.ModelSerializer):
    notification_type_display = serializers.CharField(source='get_notification_type_display', read_only=True)
    
    class Meta:
        model = Notification
        fields = [
            'id',
            'notification_type',
            'notification_type_display',
            'title',
            'message',
            'is_read',
            'created_at',
            'metadata'
        ]
        read_only_fields = ['created_at', 'metadata']

class PayoutSerializer(serializers.ModelSerializer):
    merchant_email = serializers.EmailField(source='merchant.email', read_only=True)
    
    class Meta:
        model = Payout
        fields = [
            'id', 'merchant', 'merchant_email', 'amount', 'status', 'method', 'reference',
            'recipient_name', 'recipient_email', 'created_at', 'processed_at'
        ]
        extra_kwargs = {
            'merchant': {'write_only': True},
            'recipient_name': {'required': False, 'help_text': 'Full name of the payout recipient'},
            'recipient_email': {'required': False, 'help_text': 'Email address for notifications and verification'}
        }

class SupportMessageSerializer(serializers.ModelSerializer):
    user_name = serializers.CharField(source='user.get_full_name', read_only=True)
    user_email = serializers.EmailField(source='user.email', read_only=True)
    
    class Meta:
        model = SupportMessage
        fields = ['id', 'user', 'user_name', 'user_email', 'message', 'is_staff', 'created_at']
        read_only_fields = ['id', 'created_at']

class SupportTicketSerializer(serializers.ModelSerializer):
    messages = SupportMessageSerializer(many=True, read_only=True)
    user_name = serializers.CharField(source='user.get_full_name', read_only=True)
    user_email = serializers.EmailField(source='user.email', read_only=True)
    status_display = serializers.CharField(source='get_status_display', read_only=True)
    priority_display = serializers.CharField(source='get_priority_display', read_only=True)
    
    class Meta:
        model = SupportTicket
        fields = [
            'id', 'user', 'user_name', 'user_email', 'subject', 'description', 
            'status', 'status_display', 'priority', 'priority_display', 
            'created_at', 'updated_at', 'messages'
        ]
        read_only_fields = ['id', 'created_at', 'updated_at', 'user']

class CreateSupportTicketSerializer(serializers.ModelSerializer):
    class Meta:
        model = SupportTicket
        fields = ['subject', 'description', 'priority']
    
    def create(self, validated_data):
        validated_data['user'] = self.context['request'].user
        return super().create(validated_data)

class CreateSupportMessageSerializer(serializers.ModelSerializer):
    class Meta:
        model = SupportMessage
        fields = ['message']
    
    def create(self, validated_data):
        validated_data['user'] = self.context['request'].user
        validated_data['ticket'] = self.context['ticket']
        return super().create(validated_data)

class RecipientSerializer(serializers.ModelSerializer):
    type = serializers.SerializerMethodField()

    class Meta:
        model = Recipient
        fields = ['id', 'name', 'phone', 'email', 'account_number', 'bank_name', 'mobile_provider', 'type']
        read_only_fields = ['id']

    def get_type(self, obj):
        return obj.recipient_type

    def to_representation(self, instance):
        data = super().to_representation(instance)
        # Map model fields to frontend expected field names
        data['accountNumber'] = instance.account_number
        data['bankName'] = instance.bank_name
        return data

class MyTokenObtainPairSerializer(TokenObtainPairSerializer):
    def validate(self, attrs):
        data = super().validate(attrs)
        serializer = AccountsUserSerializer(self.user)
        user_data = serializer.data
        
        # Add routing information for frontend
        user_data['routing_info'] = self.get_routing_info()
        
        data['user'] = user_data
        return data
    
    def get_routing_info(self):
        """Provide routing information for frontend based on user type"""
        user_type = self.user.user_type
        
        # Import constants to get role names
        from shared.constants import (
            USER_TYPE_SUPER_ADMIN, USER_TYPE_BUSINESS_ADMIN, 
            USER_TYPE_OPERATIONS_ADMIN, USER_TYPE_VERIFICATION_ADMIN,
            USER_TYPE_MERCHANT, USER_TYPE_CUSTOMER,
            USER_TYPE_CHOICES
        )
        
        # Get role name from choices
        role_name = dict(USER_TYPE_CHOICES).get(user_type, 'unknown')
        
        # Determine routing target
        if user_type == USER_TYPE_SUPER_ADMIN:
            return {
                'target': 'admin_super',
                'path': '/admin/super',
                'role': 'super_admin',
                'permissions': ['all']
            }
        elif user_type == USER_TYPE_BUSINESS_ADMIN:
            return {
                'target': 'admin_business',
                'path': '/admin/business',
                'role': 'business_admin',
                'permissions': ['kyc_review', 'merchant_approval', 'compliance']
            }
        elif user_type == USER_TYPE_OPERATIONS_ADMIN:
            return {
                'target': 'admin_operations',
                'path': '/admin/operations',
                'role': 'operations_admin',
                'permissions': ['user_management', 'support', 'reporting']
            }
        elif user_type == USER_TYPE_VERIFICATION_ADMIN:
            return {
                'target': 'admin_verification',
                'path': '/admin/verification',
                'role': 'verification_admin',
                'permissions': ['document_verification']
            }
        elif user_type == USER_TYPE_MERCHANT:
            return {
                'target': 'merchant',
                'path': '/merchant',
                'role': 'merchant',
                'permissions': ['payments', 'analytics']
            }
        elif user_type == USER_TYPE_CUSTOMER:
            return {
                'target': 'customer',
                'path': '/customer',
                'role': 'customer',
                'permissions': ['send_money', 'view_transactions']
            }
        else:
            return {
                'target': 'unknown',
                'path': '/login',
                'role': 'unknown',
                'permissions': []
            }
