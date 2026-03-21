from django.contrib import admin
from .models import (
    AdminActivity, PasswordResetToken, AuthLog, BackupVerification,
    Transaction, PaymentLog, Session,
    UserActivity, Payout
)
from users.models import Customer, Merchant
# NOTE: Product is now in merchants app - admin registration is in merchants/admin.py
# NOTE: Notification is now in notifications app - admin registration is in notifications/admin.py

@admin.register(AdminActivity)
class AdminActivityAdmin(admin.ModelAdmin):
    list_display = ('admin', 'action_type', 'timestamp')
    list_filter = ('action_type', 'timestamp')
    search_fields = ('admin__email', 'details')
    readonly_fields = ('ip_address', 'user_agent', 'timestamp')
    
    def has_add_permission(self, request):
        return False
    
    def has_change_permission(self, request, obj=None):
        return False

@admin.register(PasswordResetToken)
class PasswordResetTokenAdmin(admin.ModelAdmin):
    list_display = ('user', 'token', 'created_at', 'expires_at', 'used')
    list_filter = ('used', 'created_at')
    search_fields = ('user__email', 'token')
    readonly_fields = ('token', 'created_at')

@admin.register(AuthLog)
class AuthLogAdmin(admin.ModelAdmin):
    list_display = ('user', 'ip_address', 'success', 'timestamp')
    list_filter = ('success', 'timestamp')
    search_fields = ('user__email', 'ip_address', 'device_id')
    readonly_fields = ('timestamp',)

@admin.register(BackupVerification)
class BackupVerificationAdmin(admin.ModelAdmin):
    list_display = ('verification_type', 'status', 'started_at', 'verified_by')
    list_filter = ('verification_type', 'status')
    search_fields = ('notes',)
    readonly_fields = ('started_at', 'completed_at')

# @admin.register(Customer)
# class CustomerAdmin(admin.ModelAdmin):
#     list_display = ('user', 'loyalty_points', 'loyalty_tier')
#     list_filter = ('loyalty_tier',)
#     search_fields = ('user__email',)

@admin.register(Transaction)
class TransactionAdmin(admin.ModelAdmin):
    list_display = ('sender', 'recipient', 'amount', 'transaction_type', 'status', 'created_at')
    list_filter = ('transaction_type', 'status', 'created_at')
    search_fields = ('sender__email', 'recipient__email', 'description')

@admin.register(PaymentLog)
class PaymentLogAdmin(admin.ModelAdmin):
    list_display = ('user', 'amount', 'payment_type', 'created_at')
    list_filter = ('payment_type', 'created_at')
    search_fields = ('user__email', 'recipient_name', 'biller_name')

# NOTE: ProductAdmin moved to merchants/admin.py

# @admin.register(Merchant)
# class MerchantAdmin(admin.ModelAdmin):
#     list_display = ('user', 'business_name', 'approved', 'approved_at')
#     list_filter = ('approved',)
#     search_fields = ('user__email', 'business_name')

@admin.register(Session)
class SessionAdmin(admin.ModelAdmin):
    list_display = ('user', 'ip_address', 'device_id', 'created_at', 'is_active')
    list_filter = ('is_active', 'created_at')
    search_fields = ('user__email', 'ip_address', 'device_id')

@admin.register(UserActivity)
class UserActivityAdmin(admin.ModelAdmin):
    list_display = ('user', 'event_type', 'ip_address', 'created_at')
    list_filter = ('event_type', 'created_at')
    search_fields = ('user__email',)

# NOTE: NotificationAdmin moved to notifications/admin.py

@admin.register(Payout)
class PayoutAdmin(admin.ModelAdmin):
    list_display = ('merchant', 'amount', 'status', 'method', 'created_at')
    list_filter = ('status', 'method', 'created_at')
    search_fields = ('merchant__email', 'reference')
