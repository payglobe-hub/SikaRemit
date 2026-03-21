from django.contrib import admin
from django.contrib.auth.admin import UserAdmin
from django.utils.html import format_html
from django.urls import reverse
from .models import User, Merchant, Customer, MerchantCustomer, MerchantKYCSubmission, KYCDocument

class CustomUserAdmin(UserAdmin):
    list_display = ('email', 'username', 'user_type', 'is_staff', 'is_verified')
    list_filter = ('user_type', 'is_staff', 'is_verified')

@admin.register(MerchantCustomer)
class MerchantCustomerAdmin(admin.ModelAdmin):
    list_display = ('merchant', 'customer', 'status', 'kyc_status', 'onboarded_at', 'days_since_onboarded')
    list_filter = ('status', 'kyc_status', 'kyc_required', 'onboarded_at')
    search_fields = ('merchant__business_name', 'customer__user__email', 'notes')
    readonly_fields = ('onboarded_at', 'kyc_completed_at', 'last_kyc_check', 'suspended_at')
    raw_id_fields = ('merchant', 'customer', 'suspended_by')

    fieldsets = (
        ('Relationship', {
            'fields': ('merchant', 'customer', 'onboarded_at')
        }),
        ('Status & KYC', {
            'fields': ('status', 'kyc_required', 'kyc_status', 'kyc_completed_at', 'last_kyc_check')
        }),
        ('Risk & Compliance', {
            'fields': ('risk_score', 'risk_level', 'notes')
        }),
        ('Suspension Details', {
            'fields': ('suspended_at', 'suspended_by', 'suspension_reason'),
            'classes': ('collapse',)
        }),
    )

    def days_since_onboarded(self, obj):
        from django.utils import timezone
        return (timezone.now().date() - obj.onboarded_at.date()).days
    days_since_onboarded.short_description = 'Days Onboarded'

    actions = ['suspend_customers', 'activate_customers']

    def suspend_customers(self, request, queryset):
        queryset.update(status='suspended', suspended_at=timezone.now())
        self.message_user(request, f'Suspended {queryset.count()} merchant customers.')
    suspend_customers.short_description = 'Suspend selected customers'

    def activate_customers(self, request, queryset):
        queryset.update(status='active', suspended_at=None, suspended_by=None, suspension_reason='')
        self.message_user(request, f'Activated {queryset.count()} merchant customers.')
    activate_customers.short_description = 'Activate selected customers'

@admin.register(MerchantKYCSubmission)
class MerchantKYCSubmissionAdmin(admin.ModelAdmin):
    list_display = ('merchant_customer', 'kyc_document', 'status', 'review_priority', 'submitted_at', 'reviewed_by', 'days_pending')
    list_filter = ('status', 'review_priority', 'submitted_at', 'reviewed_at')
    search_fields = ('merchant_customer__merchant__business_name', 'merchant_customer__customer__user__email')
    readonly_fields = ('submitted_at', 'reviewed_at', 'escalated_at')
    raw_id_fields = ('merchant_customer', 'kyc_document', 'reviewed_by')

    fieldsets = (
        ('Submission Details', {
            'fields': ('merchant_customer', 'kyc_document', 'submitted_at')
        }),
        ('Review Status', {
            'fields': ('status', 'review_priority', 'reviewed_by', 'reviewed_at', 'admin_notes')
        }),
        ('Escalation', {
            'fields': ('escalated_at', 'escalation_reason'),
            'classes': ('collapse',)
        }),
        ('Risk Assessment', {
            'fields': ('risk_score', 'risk_factors', 'compliance_flags'),
            'classes': ('collapse',)
        }),
    )

    def days_pending(self, obj):
        if obj.status != 'pending':
            return 0
        from django.utils import timezone
        return (timezone.now() - obj.submitted_at).days
    days_pending.short_description = 'Days Pending'

    def get_queryset(self, request):
        return super().get_queryset(request).select_related(
            'merchant_customer__merchant__user',
            'merchant_customer__customer__user',
            'kyc_document',
            'reviewed_by'
        )

    actions = ['mark_approved', 'mark_rejected', 'mark_escalated']

    def mark_approved(self, request, queryset):
        from .services import KYCService
        count = 0
        for submission in queryset.filter(status='pending'):
            KYCService.process_admin_kyc_decision(
                submission=submission,
                decision='approved',
                admin_user=request.user,
                admin_notes='Bulk approved by admin'
            )
            count += 1
        self.message_user(request, f'Approved {count} KYC submissions.')
    mark_approved.short_description = 'Approve selected submissions'

    def mark_rejected(self, request, queryset):
        from .services import KYCService
        count = 0
        for submission in queryset.filter(status='pending'):
            KYCService.process_admin_kyc_decision(
                submission=submission,
                decision='rejected',
                admin_user=request.user,
                admin_notes='Bulk rejected by admin'
            )
            count += 1
        self.message_user(request, f'Rejected {count} KYC submissions.')
    mark_rejected.short_description = 'Reject selected submissions'

    def mark_escalated(self, request, queryset):
        from .services import KYCService
        count = 0
        for submission in queryset.filter(status='pending'):
            KYCService.process_admin_kyc_decision(
                submission=submission,
                decision='escalated',
                admin_user=request.user,
                admin_notes='Bulk escalated by admin'
            )
            count += 1
        self.message_user(request, f'Escalated {count} KYC submissions.')
    mark_escalated.short_description = 'Escalate selected submissions'

@admin.register(KYCDocument)
class KYCDocumentAdmin(admin.ModelAdmin):
    list_display = ('user', 'document_type', 'status', 'reviewed_by', 'reviewed_at', 'created_at')
    list_filter = ('status', 'document_type', 'created_at', 'reviewed_at')
    search_fields = ('user__email', 'user__username')
    readonly_fields = ('created_at', 'reviewed_at')
    raw_id_fields = ('user', 'reviewed_by')

    actions = ['mark_approved', 'mark_rejected']

    def mark_approved(self, request, queryset):
        from .services import KYCService
        count = 0
        for doc in queryset.filter(status='PENDING'):
            KYCService.approve_verification(doc)
            count += 1
        self.message_user(request, f'Approved {count} KYC documents.')
    mark_approved.short_description = 'Approve selected documents'

    def mark_rejected(self, request, queryset):
        count = queryset.filter(status='PENDING').update(status='REJECTED')
        self.message_user(request, f'Rejected {count} KYC documents.')
    mark_rejected.short_description = 'Reject selected documents'

admin.site.register(User, CustomUserAdmin)
admin.site.register(Merchant)
admin.site.register(Customer)
