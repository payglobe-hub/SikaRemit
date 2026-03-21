from django.db import models
from users.models import User

class NotificationPreferences(models.Model):
    user = models.OneToOneField(User, on_delete=models.CASCADE, related_name='notification_prefs')
    email_enabled = models.BooleanField(default=True)
    sms_enabled = models.BooleanField(default=False)
    push_enabled = models.BooleanField(default=True)
    web_enabled = models.BooleanField(default=True)
    
    def __str__(self):
        return f"Preferences for {self.user.email}"

class Notification(models.Model):
    INFO = 'info'
    WARNING = 'warning'
    SUCCESS = 'success'
    ERROR = 'error'
    PAYMENT = 'payment'
    SECURITY = 'security'
    
    LEVEL_CHOICES = [
        (INFO, 'Info'),
        (WARNING, 'Warning'),
        (SUCCESS, 'Success'),
        (ERROR, 'Error'),
        (PAYMENT, 'Payment'),
        (SECURITY, 'Security'),
    ]
    
    PAYMENT_RECEIVED = 'payment_received'
    PAYMENT_FAILED = 'payment_failed'
    PAYMENT_SUCCESSFUL = 'payment_successful'
    PAYMENT_PENDING = 'payment_pending'
    WITHDRAWAL = 'withdrawal'
    WITHDRAWAL_FAILED = 'withdrawal_failed'
    TRANSFER_SENT = 'transfer_sent'
    TRANSFER_RECEIVED = 'transfer_received'
    TRANSFER_FAILED = 'transfer_failed'
    
    # Account & Authentication
    ACCOUNT_REGISTERED = 'account_registered'
    ACCOUNT_VERIFIED = 'account_verified'
    LOGIN_SUCCESSFUL = 'login_successful'
    LOGIN_FAILED = 'login_failed'
    PASSWORD_CHANGED = 'password_changed'
    PASSWORD_RESET = 'password_reset'
    EMAIL_VERIFIED = 'email_verified'
    PHONE_VERIFIED = 'phone_verified'
    MFA_ENABLED = 'mfa_enabled'
    MFA_DISABLED = 'mfa_disabled'
    
    # KYC & Compliance
    KYC_SUBMITTED = 'kyc_submitted'
    KYC_APPROVED = 'kyc_approved'
    KYC_REJECTED = 'kyc_rejected'
    KYC_PENDING = 'kyc_pending'
    
    # Merchant & Business
    MERCHANT_APPLICATION_SUBMITTED = 'merchant_application_submitted'
    MERCHANT_APPLICATION_APPROVED = 'merchant_application_approved'
    MERCHANT_APPLICATION_REJECTED = 'merchant_application_rejected'
    MERCHANT_INVITATION_SENT = 'merchant_invitation_sent'
    MERCHANT_INVITATION_ACCEPTED = 'merchant_invitation_accepted'
    MERCHANT_INVITATION_EXPIRED = 'merchant_invitation_expired'
    MERCHANT_ACCOUNT_CREATED = 'merchant_account_created'
    MERCHANT_PAYMENT_RECEIVED = 'merchant_payment_received'
    MERCHANT_WITHDRAWAL = 'merchant_withdrawal'
    
    # Security & Alerts
    SECURITY_LOGIN_FROM_NEW_DEVICE = 'security_login_from_new_device'
    SECURITY_SUSPICIOUS_ACTIVITY = 'security_suspicious_activity'
    SECURITY_ACCOUNT_LOCKED = 'security_account_locked'
    SECURITY_PASSWORD_EXPIRED = 'security_password_expired'
    SECURITY_API_KEY_CREATED = 'security_api_key_created'
    SECURITY_API_KEY_REVOKED = 'security_api_key_revoked'
    
    # System & Administrative
    SYSTEM_MAINTENANCE = 'system_maintenance'
    SYSTEM_UPDATE = 'system_update'
    ADMIN_MESSAGE = 'admin_message'
    PROMOTIONAL_OFFER = 'promotional_offer'
    
    # Wallet & Balance
    WALLET_TOPUP = 'wallet_topup'
    WALLET_LOW_BALANCE = 'wallet_low_balance'
    WALLET_CREDIT = 'wallet_credit'
    WALLET_DEBIT = 'wallet_debit'
    
    # Remittance & International
    REMITTANCE_SENT = 'remittance_sent'
    REMITTANCE_RECEIVED = 'remittance_received'
    REMITTANCE_FAILED = 'remittance_failed'
    EXCHANGE_RATE_UPDATE = 'exchange_rate_update'
    
    TYPE_CHOICES = [
        # Payment & Transactions
        (PAYMENT_RECEIVED, 'Payment Received'),
        (PAYMENT_FAILED, 'Payment Failed'),
        (PAYMENT_SUCCESSFUL, 'Payment Successful'),
        (PAYMENT_PENDING, 'Payment Pending'),
        (WITHDRAWAL, 'Withdrawal'),
        (WITHDRAWAL_FAILED, 'Withdrawal Failed'),
        (TRANSFER_SENT, 'Transfer Sent'),
        (TRANSFER_RECEIVED, 'Transfer Received'),
        (TRANSFER_FAILED, 'Transfer Failed'),
        
        # Account & Authentication
        (ACCOUNT_REGISTERED, 'Account Registered'),
        (ACCOUNT_VERIFIED, 'Account Verified'),
        (LOGIN_SUCCESSFUL, 'Login Successful'),
        (LOGIN_FAILED, 'Login Failed'),
        (PASSWORD_CHANGED, 'Password Changed'),
        (PASSWORD_RESET, 'Password Reset'),
        (EMAIL_VERIFIED, 'Email Verified'),
        (PHONE_VERIFIED, 'Phone Verified'),
        (MFA_ENABLED, 'MFA Enabled'),
        (MFA_DISABLED, 'MFA Disabled'),
        
        # KYC & Compliance
        (KYC_SUBMITTED, 'KYC Submitted'),
        (KYC_APPROVED, 'KYC Approved'),
        (KYC_REJECTED, 'KYC Rejected'),
        (KYC_PENDING, 'KYC Pending'),
        
        # Merchant & Business
        (MERCHANT_APPLICATION_SUBMITTED, 'Merchant Application Submitted'),
        (MERCHANT_APPLICATION_APPROVED, 'Merchant Application Approved'),
        (MERCHANT_APPLICATION_REJECTED, 'Merchant Application Rejected'),
        (MERCHANT_INVITATION_SENT, 'Merchant Invitation Sent'),
        (MERCHANT_INVITATION_ACCEPTED, 'Merchant Invitation Accepted'),
        (MERCHANT_INVITATION_EXPIRED, 'Merchant Invitation Expired'),
        (MERCHANT_ACCOUNT_CREATED, 'Merchant Account Created'),
        (MERCHANT_PAYMENT_RECEIVED, 'Merchant Payment Received'),
        (MERCHANT_WITHDRAWAL, 'Merchant Withdrawal'),
        
        # Security & Alerts
        (SECURITY_LOGIN_FROM_NEW_DEVICE, 'Login from New Device'),
        (SECURITY_SUSPICIOUS_ACTIVITY, 'Suspicious Activity Detected'),
        (SECURITY_ACCOUNT_LOCKED, 'Account Locked'),
        (SECURITY_PASSWORD_EXPIRED, 'Password Expired'),
        (SECURITY_API_KEY_CREATED, 'API Key Created'),
        (SECURITY_API_KEY_REVOKED, 'API Key Revoked'),
        
        # System & Administrative
        (SYSTEM_MAINTENANCE, 'System Maintenance'),
        (SYSTEM_UPDATE, 'System Update'),
        (ADMIN_MESSAGE, 'Admin Message'),
        (PROMOTIONAL_OFFER, 'Promotional Offer'),
        
        # Wallet & Balance
        (WALLET_TOPUP, 'Wallet Top-up'),
        (WALLET_LOW_BALANCE, 'Low Balance Warning'),
        (WALLET_CREDIT, 'Wallet Credit'),
        (WALLET_DEBIT, 'Wallet Debit'),
        
        # Remittance & International
        (REMITTANCE_SENT, 'Remittance Sent'),
        (REMITTANCE_RECEIVED, 'Remittance Received'),
        (REMITTANCE_FAILED, 'Remittance Failed'),
        (EXCHANGE_RATE_UPDATE, 'Exchange Rate Update'),
    ]
    
    CHANNEL_CHOICES = [
        ('email', 'Email'),
        ('sms', 'SMS'),
        ('push', 'Push'),
        ('web', 'Web'),
    ]
    
    SCHEDULED = 'scheduled'
    EXPIRING = 'expiring'
    ACTIONABLE = 'actionable'
    
    CATEGORY_CHOICES = [
        (SCHEDULED, 'Scheduled'),
        (EXPIRING, 'Expiring'),
        (ACTIONABLE, 'Actionable'),
    ]
    
    user = models.ForeignKey(User, on_delete=models.CASCADE)
    title = models.CharField(max_length=255)
    message = models.TextField()
    level = models.CharField(max_length=10, choices=LEVEL_CHOICES, default=INFO)
    notification_type = models.CharField(max_length=30, choices=TYPE_CHOICES, blank=True, null=True)
    is_read = models.BooleanField(default=False)
    read_at = models.DateTimeField(null=True, blank=True)
    push_sent = models.BooleanField(default=False)
    push_received = models.BooleanField(default=False)
    metadata = models.JSONField(default=dict, blank=True)
    created_at = models.DateTimeField(auto_now_add=True)
    channel = models.CharField(max_length=10, choices=CHANNEL_CHOICES, default='web')
    category = models.CharField(max_length=20, choices=CATEGORY_CHOICES, default='')
    scheduled_for = models.DateTimeField(null=True, blank=True)
    expires_at = models.DateTimeField(null=True, blank=True)
    actions = models.JSONField(default=list)
    delivery_attempts = models.PositiveSmallIntegerField(default=0)
    last_attempt = models.DateTimeField(null=True, blank=True)
    delivery_metrics = models.JSONField(default=dict)
    
    def __str__(self):
        return f"{self.title} - {self.user.email}"
