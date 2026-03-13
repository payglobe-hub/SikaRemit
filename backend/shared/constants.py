"""
Shared constants for SikaRemit backend.
This file centralizes all status choices, provider codes, and other constants
to ensure consistency across all models and apps.
"""

# =============================================================================
# GENERAL STATUS CHOICES
# =============================================================================

STATUS_PENDING = 'pending'
STATUS_COMPLETED = 'completed'
STATUS_FAILED = 'failed'
STATUS_CANCELLED = 'cancelled'
STATUS_PROCESSING = 'processing'

GENERAL_STATUS_CHOICES = [
    (STATUS_PENDING, 'Pending'),
    (STATUS_COMPLETED, 'Completed'),
    (STATUS_FAILED, 'Failed'),
    (STATUS_CANCELLED, 'Cancelled'),
]

PROCESSING_STATUS_CHOICES = [
    (STATUS_PENDING, 'Pending'),
    (STATUS_PROCESSING, 'Processing'),
    (STATUS_COMPLETED, 'Completed'),
    (STATUS_FAILED, 'Failed'),
    (STATUS_CANCELLED, 'Cancelled'),
]

# =============================================================================
# PAYMENT STATUS CHOICES
# =============================================================================

PAYMENT_STATUS_PENDING = 'pending'
PAYMENT_STATUS_COMPLETED = 'completed'
PAYMENT_STATUS_FAILED = 'failed'
PAYMENT_STATUS_REFUNDED = 'refunded'
PAYMENT_STATUS_PARTIALLY_REFUNDED = 'partially_refunded'

PAYMENT_STATUS_CHOICES = [
    (PAYMENT_STATUS_PENDING, 'Pending'),
    (PAYMENT_STATUS_COMPLETED, 'Completed'),
    (PAYMENT_STATUS_FAILED, 'Failed'),
    (PAYMENT_STATUS_REFUNDED, 'Refunded'),
    (PAYMENT_STATUS_PARTIALLY_REFUNDED, 'Partially Refunded'),
]

# =============================================================================
# KYC STATUS CHOICES
# =============================================================================

KYC_STATUS_NOT_REQUIRED = 'not_required'
KYC_STATUS_NOT_STARTED = 'not_started'
KYC_STATUS_IN_PROGRESS = 'in_progress'
KYC_STATUS_PENDING_REVIEW = 'pending_review'
KYC_STATUS_APPROVED = 'approved'
KYC_STATUS_REJECTED = 'rejected'
KYC_STATUS_SUSPENDED = 'suspended'

KYC_STATUS_CHOICES = [
    (KYC_STATUS_NOT_REQUIRED, 'Not Required'),
    (KYC_STATUS_NOT_STARTED, 'Not Started'),
    (KYC_STATUS_IN_PROGRESS, 'In Progress'),
    (KYC_STATUS_PENDING_REVIEW, 'Pending Review'),
    (KYC_STATUS_APPROVED, 'Approved'),
    (KYC_STATUS_REJECTED, 'Rejected'),
    (KYC_STATUS_SUSPENDED, 'Suspended'),
]

# Simple KYC status for documents
KYC_DOCUMENT_STATUS_CHOICES = [
    (STATUS_PENDING, 'Pending Review'),
    (KYC_STATUS_APPROVED, 'Approved'),
    (KYC_STATUS_REJECTED, 'Rejected'),
]

# =============================================================================
# KYC DOCUMENT TYPES
# =============================================================================

DOC_TYPE_PASSPORT = 'passport'
DOC_TYPE_NATIONAL_ID = 'national_id'
DOC_TYPE_DRIVERS_LICENSE = 'drivers_license'
DOC_TYPE_UTILITY_BILL = 'utility_bill'
DOC_TYPE_BANK_STATEMENT = 'bank_statement'

KYC_DOCUMENT_TYPES = [
    (DOC_TYPE_PASSPORT, 'Passport'),
    (DOC_TYPE_NATIONAL_ID, 'National ID'),
    (DOC_TYPE_DRIVERS_LICENSE, "Driver's License"),
    (DOC_TYPE_UTILITY_BILL, 'Utility Bill'),
    (DOC_TYPE_BANK_STATEMENT, 'Bank Statement'),
]

# =============================================================================
# MOBILE MONEY PROVIDERS
# =============================================================================

PROVIDER_MTN = 'mtn_momo'
PROVIDER_TELECEL = 'telecel'
PROVIDER_AIRTEL_TIGO = 'airtel_tigo'
PROVIDER_G_MONEY = 'g_money'

MOBILE_MONEY_PROVIDERS = [
    (PROVIDER_MTN, 'MTN Mobile Money'),
    (PROVIDER_TELECEL, 'Telecel Cash'),
    (PROVIDER_AIRTEL_TIGO, 'AirtelTigo Money'),
    (PROVIDER_G_MONEY, 'G-Money'),
]

# =============================================================================
# PAYMENT METHODS
# =============================================================================

METHOD_CREDIT_CARD = 'credit_card'
METHOD_BANK_TRANSFER = 'bank_transfer'
METHOD_MOBILE_MONEY = 'mobile_money'
METHOD_QR_PAYMENT = 'qr_payment'
METHOD_WALLET = 'wallet'

PAYMENT_METHOD_CHOICES = [
    (METHOD_CREDIT_CARD, 'Credit Card'),
    (METHOD_BANK_TRANSFER, 'Bank Transfer'),
    (PROVIDER_MTN, 'MTN Mobile Money'),
    (PROVIDER_TELECEL, 'Telecel Cash'),
    (PROVIDER_AIRTEL_TIGO, 'AirtelTigo Money'),
    (PROVIDER_G_MONEY, 'G-Money'),
    (METHOD_QR_PAYMENT, 'QR Payment'),
    (METHOD_WALLET, 'Digital Wallet'),
]

# Simplified payment method choices for Payment model
SIMPLE_PAYMENT_METHOD_CHOICES = [
    ('card', 'Credit/Debit Card'),
    ('bank', 'Bank Transfer'),
    ('mobile', 'Mobile Money'),
    ('wallet', 'Digital Wallet'),
]

# =============================================================================
# TRANSACTION TYPES
# =============================================================================

TXN_TYPE_SEND = 'send'
TXN_TYPE_REQUEST = 'request'
TXN_TYPE_TRANSFER = 'transfer'
TXN_TYPE_PAYMENT = 'payment'
TXN_TYPE_REMITTANCE = 'remittance'
TXN_TYPE_BILL = 'bill'

TRANSACTION_TYPE_CHOICES = [
    (TXN_TYPE_SEND, 'Send'),
    (TXN_TYPE_REQUEST, 'Request'),
    (TXN_TYPE_TRANSFER, 'Transfer'),
]

PAYMENT_TYPE_CHOICES = [
    (TXN_TYPE_PAYMENT, 'Regular Payment'),
    (TXN_TYPE_BILL, 'Bill Payment'),
    (TXN_TYPE_REMITTANCE, 'Remittance'),
]

# =============================================================================
# USER TYPES - Enhanced Admin Hierarchy
# =============================================================================

# Admin Hierarchy (Levels 1-4)
USER_TYPE_SUPER_ADMIN = 1      # Full system access
USER_TYPE_BUSINESS_ADMIN = 2   # KYC, compliance, risk, merchant approval
USER_TYPE_OPERATIONS_ADMIN = 3 # Customer support, basic operations
USER_TYPE_VERIFICATION_ADMIN = 4 # Document verification only

# Regular Users (Levels 5-6)
USER_TYPE_MERCHANT = 5
USER_TYPE_CUSTOMER = 6

USER_TYPE_CHOICES = [
    (USER_TYPE_SUPER_ADMIN, 'super_admin'),
    (USER_TYPE_BUSINESS_ADMIN, 'business_admin'),
    (USER_TYPE_OPERATIONS_ADMIN, 'operations_admin'),
    (USER_TYPE_VERIFICATION_ADMIN, 'verification_admin'),
    (USER_TYPE_MERCHANT, 'merchant'),
    (USER_TYPE_CUSTOMER, 'customer'),
]

# String-based user roles (for frontend compatibility)
ROLE_SUPER_ADMIN = 'super_admin'
ROLE_BUSINESS_ADMIN = 'business_admin'
ROLE_OPERATIONS_ADMIN = 'operations_admin'
ROLE_VERIFICATION_ADMIN = 'verification_admin'
ROLE_MERCHANT = 'merchant'
ROLE_CUSTOMER = 'customer'

USER_ROLE_CHOICES = [
    (ROLE_SUPER_ADMIN, 'Super Admin'),
    (ROLE_BUSINESS_ADMIN, 'Business Admin'),
    (ROLE_OPERATIONS_ADMIN, 'Operations Admin'),
    (ROLE_VERIFICATION_ADMIN, 'Verification Admin'),
    (ROLE_MERCHANT, 'Merchant'),
    (ROLE_CUSTOMER, 'Customer'),
]

# Admin role hierarchy levels
ADMIN_HIERARCHY_LEVELS = {
    USER_TYPE_SUPER_ADMIN: 1,
    USER_TYPE_BUSINESS_ADMIN: 2,
    USER_TYPE_OPERATIONS_ADMIN: 3,
    USER_TYPE_VERIFICATION_ADMIN: 4,
}

# =============================================================================
# ADMIN PERMISSIONS - Granular Permission System
# =============================================================================

# Permission categories
PERMISSION_USER_MANAGEMENT = 'user_management'
PERMISSION_KYC_REVIEW = 'kyc_review'
PERMISSION_COMPLIANCE_MONITORING = 'compliance_monitoring'
PERMISSION_TRANSACTION_OVERRIDE = 'transaction_override'
PERMISSION_MERCHANT_APPROVAL = 'merchant_approval'
PERMISSION_SUPPORT_MANAGEMENT = 'support_management'
PERMISSION_REPORTING = 'reporting'
PERMISSION_SYSTEM_SETTINGS = 'system_settings'
PERMISSION_VERIFICATION_ONLY = 'verification_only'
PERMISSION_AUDIT_LOGS = 'audit_logs'
PERMISSION_ADMIN_MANAGEMENT = 'admin_management'
PERMISSION_EMERGENCY_OVERRIDE = 'emergency_override'

# Granular permissions mapping
ADMIN_PERMISSIONS = {
    PERMISSION_USER_MANAGEMENT: {
        'roles': [USER_TYPE_SUPER_ADMIN],
        'description': 'Manage user accounts and permissions',
        'category': 'user_management'
    },
    PERMISSION_ADMIN_MANAGEMENT: {
        'roles': [USER_TYPE_SUPER_ADMIN],
        'description': 'Create, modify, and restrict admin accounts',
        'category': 'admin_management'
    },
    PERMISSION_KYC_REVIEW: {
        'roles': [USER_TYPE_BUSINESS_ADMIN, USER_TYPE_VERIFICATION_ADMIN],
        'description': 'Review and approve/reject KYC documents',
        'category': 'compliance'
    },
    PERMISSION_COMPLIANCE_MONITORING: {
        'roles': [USER_TYPE_BUSINESS_ADMIN],
        'description': 'Monitor compliance and regulatory requirements',
        'category': 'compliance'
    },
    PERMISSION_TRANSACTION_OVERRIDE: {
        'roles': [USER_TYPE_SUPER_ADMIN, USER_TYPE_BUSINESS_ADMIN],
        'description': 'Override transaction restrictions and limits',
        'category': 'transactions'
    },
    PERMISSION_MERCHANT_APPROVAL: {
        'roles': [USER_TYPE_BUSINESS_ADMIN],
        'description': 'Approve or reject merchant applications',
        'category': 'merchant_management'
    },
    PERMISSION_SUPPORT_MANAGEMENT: {
        'roles': [USER_TYPE_OPERATIONS_ADMIN],
        'description': 'Manage customer support operations',
        'category': 'support'
    },
    PERMISSION_REPORTING: {
        'roles': [USER_TYPE_BUSINESS_ADMIN, USER_TYPE_OPERATIONS_ADMIN],
        'description': 'Access and generate reports',
        'category': 'analytics'
    },
    PERMISSION_SYSTEM_SETTINGS: {
        'roles': [USER_TYPE_SUPER_ADMIN],
        'description': 'Modify system configuration and settings',
        'category': 'system'
    },
    PERMISSION_VERIFICATION_ONLY: {
        'roles': [USER_TYPE_VERIFICATION_ADMIN],
        'description': 'Document verification tasks only',
        'category': 'verification'
    },
    PERMISSION_AUDIT_LOGS: {
        'roles': [USER_TYPE_SUPER_ADMIN, USER_TYPE_BUSINESS_ADMIN],
        'description': 'Access comprehensive audit logs',
        'category': 'audit'
    },
    PERMISSION_EMERGENCY_OVERRIDE: {
        'roles': [USER_TYPE_SUPER_ADMIN],
        'description': 'Emergency system controls and overrides',
        'category': 'emergency'
    },
}

# Admin activity types for audit logging
ADMIN_ACTIVITY_USER_CREATED = 'user_created'
ADMIN_ACTIVITY_USER_MODIFIED = 'user_modified'
ADMIN_ACTIVITY_USER_SUSPENDED = 'user_suspended'
ADMIN_ACTIVITY_USER_ACTIVATED = 'user_activated'
ADMIN_ACTIVITY_ADMIN_CREATED = 'admin_created'
ADMIN_ACTIVITY_ADMIN_MODIFIED = 'admin_modified'
ADMIN_ACTIVITY_ADMIN_SUSPENDED = 'admin_suspended'
ADMIN_ACTIVITY_PERMISSION_GRANTED = 'permission_granted'
ADMIN_ACTIVITY_PERMISSION_REVOKED = 'permission_revoked'
ADMIN_ACTIVITY_KYC_APPROVED = 'kyc_approved'
ADMIN_ACTIVITY_KYC_REJECTED = 'kyc_rejected'
ADMIN_ACTIVITY_MERCHANT_APPROVED = 'merchant_approved'
ADMIN_ACTIVITY_MERCHANT_REJECTED = 'merchant_rejected'
ADMIN_ACTIVITY_TRANSACTION_OVERRIDE = 'transaction_override'
ADMIN_ACTIVITY_SYSTEM_SETTING_CHANGED = 'system_setting_changed'
ADMIN_ACTIVITY_EMERGENCY_ACTION = 'emergency_action'
ADMIN_ACTIVITY_LOGIN = 'admin_login'
ADMIN_ACTIVITY_LOGOUT = 'admin_logout'
ADMIN_ACTIVITY_PASSWORD_CHANGE = 'password_change'
ADMIN_ACTIVITY_PROFILE_UPDATE = 'profile_update'

ENHANCED_ADMIN_ACTIVITY_TYPES = [
    (ADMIN_ACTIVITY_USER_CREATED, 'User Account Created'),
    (ADMIN_ACTIVITY_USER_MODIFIED, 'User Account Modified'),
    (ADMIN_ACTIVITY_USER_SUSPENDED, 'User Account Suspended'),
    (ADMIN_ACTIVITY_USER_ACTIVATED, 'User Account Activated'),
    (ADMIN_ACTIVITY_ADMIN_CREATED, 'Admin Account Created'),
    (ADMIN_ACTIVITY_ADMIN_MODIFIED, 'Admin Account Modified'),
    (ADMIN_ACTIVITY_ADMIN_SUSPENDED, 'Admin Account Suspended'),
    (ADMIN_ACTIVITY_PERMISSION_GRANTED, 'Permission Granted'),
    (ADMIN_ACTIVITY_PERMISSION_REVOKED, 'Permission Revoked'),
    (ADMIN_ACTIVITY_KYC_APPROVED, 'KYC Approved'),
    (ADMIN_ACTIVITY_KYC_REJECTED, 'KYC Rejected'),
    (ADMIN_ACTIVITY_MERCHANT_APPROVED, 'Merchant Approved'),
    (ADMIN_ACTIVITY_MERCHANT_REJECTED, 'Merchant Rejected'),
    (ADMIN_ACTIVITY_TRANSACTION_OVERRIDE, 'Transaction Override'),
    (ADMIN_ACTIVITY_SYSTEM_SETTING_CHANGED, 'System Setting Changed'),
    (ADMIN_ACTIVITY_EMERGENCY_ACTION, 'Emergency Action Taken'),
    (ADMIN_ACTIVITY_LOGIN, 'Admin Login'),
    (ADMIN_ACTIVITY_LOGOUT, 'Admin Logout'),
    (ADMIN_ACTIVITY_PASSWORD_CHANGE, 'Password Changed'),
    (ADMIN_ACTIVITY_PROFILE_UPDATE, 'Profile Updated'),
]

# =============================================================================
# RECIPIENT TYPES
# =============================================================================

RECIPIENT_TYPE_BANK = 'bank'
RECIPIENT_TYPE_MOBILE = 'mobile'
RECIPIENT_TYPE_SIKAREMIT = 'sikaremit'

RECIPIENT_TYPE_CHOICES = [
    (RECIPIENT_TYPE_BANK, 'Bank Account'),
    (RECIPIENT_TYPE_MOBILE, 'Mobile Money'),
    (RECIPIENT_TYPE_SIKAREMIT, 'SikaRemit Account'),
]

# =============================================================================
# NOTIFICATION LEVELS
# =============================================================================

NOTIF_LEVEL_INFO = 'info'
NOTIF_LEVEL_WARNING = 'warning'
NOTIF_LEVEL_SUCCESS = 'success'
NOTIF_LEVEL_ERROR = 'error'
NOTIF_LEVEL_PAYMENT = 'payment'
NOTIF_LEVEL_SECURITY = 'security'

NOTIFICATION_LEVEL_CHOICES = [
    (NOTIF_LEVEL_INFO, 'Info'),
    (NOTIF_LEVEL_WARNING, 'Warning'),
    (NOTIF_LEVEL_SUCCESS, 'Success'),
    (NOTIF_LEVEL_ERROR, 'Error'),
    (NOTIF_LEVEL_PAYMENT, 'Payment'),
    (NOTIF_LEVEL_SECURITY, 'Security'),
]

# =============================================================================
# NOTIFICATION CHANNELS
# =============================================================================

CHANNEL_EMAIL = 'email'
CHANNEL_SMS = 'sms'
CHANNEL_PUSH = 'push'
CHANNEL_WEB = 'web'

NOTIFICATION_CHANNEL_CHOICES = [
    (CHANNEL_EMAIL, 'Email'),
    (CHANNEL_SMS, 'SMS'),
    (CHANNEL_PUSH, 'Push'),
    (CHANNEL_WEB, 'Web'),
]

# =============================================================================
# PRIORITY CHOICES
# =============================================================================

PRIORITY_LOW = 'low'
PRIORITY_MEDIUM = 'medium'
PRIORITY_HIGH = 'high'
PRIORITY_URGENT = 'urgent'

PRIORITY_CHOICES = [
    (PRIORITY_LOW, 'Low'),
    (PRIORITY_MEDIUM, 'Medium'),
    (PRIORITY_HIGH, 'High'),
    (PRIORITY_URGENT, 'Urgent'),
]

# =============================================================================
# CURRENCY DEFAULTS
# =============================================================================

DEFAULT_CURRENCY = 'GHS'
DEFAULT_CURRENCY_USD = 'USD'

SUPPORTED_CURRENCIES = ['GHS', 'USD', 'EUR', 'GBP', 'NGN', 'KES', 'ZAR']

# =============================================================================
# COUNTRY DEFAULTS
# =============================================================================

DEFAULT_COUNTRY = 'GH'
DEFAULT_COUNTRY_CODE = 'GHA'

# =============================================================================
# BILL TYPES
# =============================================================================

BILL_TYPE_UTILITY = 'utility'
BILL_TYPE_TAX = 'tax'
BILL_TYPE_LOAN = 'loan'
BILL_TYPE_OTHER = 'other'

BILL_TYPE_CHOICES = [
    (BILL_TYPE_UTILITY, 'Utility Bill'),
    (BILL_TYPE_TAX, 'Tax Payment'),
    (BILL_TYPE_LOAN, 'Loan Payment'),
    (BILL_TYPE_OTHER, 'Other'),
]

# =============================================================================
# MERCHANT STATUS CHOICES
# =============================================================================

MERCHANT_STATUS_ACTIVE = 'active'
MERCHANT_STATUS_SUSPENDED = 'suspended'
MERCHANT_STATUS_BLOCKED = 'blocked'
MERCHANT_STATUS_INACTIVE = 'inactive'

MERCHANT_CUSTOMER_STATUS_CHOICES = [
    (MERCHANT_STATUS_ACTIVE, 'Active'),
    (MERCHANT_STATUS_SUSPENDED, 'Suspended'),
    (MERCHANT_STATUS_BLOCKED, 'Blocked'),
]

# =============================================================================
# FRAUD ALERT STATUS
# =============================================================================

FRAUD_STATUS_PENDING = 'pending_review'
FRAUD_STATUS_APPROVED = 'approved'
FRAUD_STATUS_BLOCKED = 'blocked'
FRAUD_STATUS_FALSE_POSITIVE = 'false_positive'

FRAUD_ALERT_STATUS_CHOICES = [
    (FRAUD_STATUS_PENDING, 'Pending Review'),
    (FRAUD_STATUS_APPROVED, 'Approved'),
    (FRAUD_STATUS_BLOCKED, 'Blocked'),
    (FRAUD_STATUS_FALSE_POSITIVE, 'False Positive'),
]

# =============================================================================
# PAYOUT STATUS
# =============================================================================

PAYOUT_STATUS_PENDING = 'pending'
PAYOUT_STATUS_PROCESSING = 'processing'
PAYOUT_STATUS_COMPLETED = 'completed'
PAYOUT_STATUS_FAILED = 'failed'

PAYOUT_STATUS_CHOICES = [
    (PAYOUT_STATUS_PENDING, 'Pending'),
    (PAYOUT_STATUS_PROCESSING, 'Processing'),
    (PAYOUT_STATUS_COMPLETED, 'Completed'),
    (PAYOUT_STATUS_FAILED, 'Failed'),
]

PAYOUT_METHOD_CHOICES = [
    (METHOD_BANK_TRANSFER, 'Bank Transfer'),
    (PROVIDER_MTN, 'MTN Mobile Money'),
    (PROVIDER_TELECEL, 'Telecel Cash'),
    (PROVIDER_AIRTEL_TIGO, 'AirtelTigo Money'),
    (PROVIDER_G_MONEY, 'G-Money'),
]

# =============================================================================
# SUPPORT TICKET STATUS
# =============================================================================

TICKET_STATUS_OPEN = 'open'
TICKET_STATUS_IN_PROGRESS = 'in_progress'
TICKET_STATUS_RESOLVED = 'resolved'
TICKET_STATUS_CLOSED = 'closed'

SUPPORT_TICKET_STATUS_CHOICES = [
    (TICKET_STATUS_OPEN, 'Open'),
    (TICKET_STATUS_IN_PROGRESS, 'In Progress'),
    (TICKET_STATUS_RESOLVED, 'Resolved'),
    (TICKET_STATUS_CLOSED, 'Closed'),
]

# =============================================================================
# ADMIN ACTIVITY TYPES
# =============================================================================

ACTIVITY_USER_MOD = 'user_mod'
ACTIVITY_PAYMENT_OVERRIDE = 'payment_override'
ACTIVITY_SETTINGS_CHANGE = 'settings_change'
ACTIVITY_ACCESS_CONTROL = 'access_control'
ACTIVITY_LOGIN = 'login'
ACTIVITY_LOGOUT = 'logout'
ACTIVITY_PROFILE_UPDATE = 'profile_update'
ACTIVITY_PASSWORD_CHANGE = 'password_change'
ACTIVITY_TRANSACTION = 'transaction'
ACTIVITY_VERIFICATION = 'verification'

ADMIN_ACTIVITY_TYPES = [
    (ACTIVITY_USER_MOD, 'User Modification'),
    (ACTIVITY_PAYMENT_OVERRIDE, 'Payment Override'),
    (ACTIVITY_SETTINGS_CHANGE, 'System Settings Change'),
    (ACTIVITY_ACCESS_CONTROL, 'Access Control Change'),
    (ACTIVITY_LOGIN, 'Login'),
    (ACTIVITY_LOGOUT, 'Logout'),
    (ACTIVITY_PROFILE_UPDATE, 'Profile Update'),
    (ACTIVITY_PASSWORD_CHANGE, 'Password Change'),
    (ACTIVITY_TRANSACTION, 'Transaction'),
    (ACTIVITY_VERIFICATION, 'Verification Submitted'),
]

# =============================================================================
# USER ACTIVITY TYPES
# =============================================================================

USER_ACTIVITY_TYPES = [
    (ACTIVITY_LOGIN, 'User Login'),
    (ACTIVITY_LOGOUT, 'User Logout'),
    (ACTIVITY_PROFILE_UPDATE, 'Profile Update'),
    (ACTIVITY_PASSWORD_CHANGE, 'Password Change'),
    (ACTIVITY_TRANSACTION, 'Transaction'),
    (ACTIVITY_VERIFICATION, 'Verification Submitted'),
]

# =============================================================================
# BACKUP VERIFICATION TYPES
# =============================================================================

BACKUP_TYPE_DB = 'db'
BACKUP_TYPE_MEDIA = 'media'
BACKUP_TYPE_LOGS = 'logs'
BACKUP_TYPE_FULL = 'full'

BACKUP_VERIFICATION_TYPES = [
    (BACKUP_TYPE_DB, 'Database'),
    (BACKUP_TYPE_MEDIA, 'Media Files'),
    (BACKUP_TYPE_LOGS, 'Log Files'),
    (BACKUP_TYPE_FULL, 'Full Backup'),
]

# =============================================================================
# GDPR SEVERITY CHOICES
# =============================================================================

SEVERITY_LOW = 'low'
SEVERITY_MEDIUM = 'medium'
SEVERITY_HIGH = 'high'
SEVERITY_CRITICAL = 'critical'

SEVERITY_CHOICES = [
    (SEVERITY_LOW, 'Low'),
    (SEVERITY_MEDIUM, 'Medium'),
    (SEVERITY_HIGH, 'High'),
    (SEVERITY_CRITICAL, 'Critical'),
]
