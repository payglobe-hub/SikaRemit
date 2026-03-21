"""Remittance and verification admin classes."""
from django.contrib import admin
from django.db.models import Q, Sum, Count, Avg, Max
from django.db.models.functions import TruncDay, TruncMonth
from payments.models.payment import Payment
from payments.models.payment_method import PaymentMethod
from payments.models.transaction import Transaction
from users.models import Merchant as PaymentsMerchant
from payments.models.payment_log import PaymentLog as PaymentsPaymentLog
from payments.models.subscriptions import Subscription
from payments.models.ussd_transaction import SimpleUSSDTransaction as USSDTransaction
from payments.models.scheduled_payout import ScheduledPayout
from payments.models.cross_border import CrossBorderRemittance
from payments.models.verification import VerificationLog, ProviderHealth
from payments.models.fees import FeeConfiguration, FeeCalculationLog, MerchantFeeOverride
from payments.models.analytics import DashboardSnapshot, MerchantAnalytics, PerformanceAlert, TransactionAnalytics
from payments.models.ussd import USSDMenu, USSDProvider
from django.utils.html import format_html
from django.urls import reverse, path
from django.http import HttpResponse, JsonResponse
import csv
import json
import logging
from django.utils import timezone
from django.contrib import messages
from datetime import timedelta

logger = logging.getLogger(__name__)

@admin.register(CrossBorderRemittance)
class CrossBorderRemittanceAdmin(admin.ModelAdmin):
    change_form_template = 'admin/payments/crossborderremittance/change_form.html'
    list_display = [
        'reference_number', 
        'sender', 
        'recipient_country',
        'amount_sent', 
        'amount_received',
        'status',
        'created_at'
    ]
    list_filter = ['status', 'recipient_country', 'created_at']
    search_fields = ['reference_number', 'sender__user__email', 'recipient_phone']
    date_hierarchy = 'created_at'
    
    fieldsets = (
        ('Sender Information', {
            'fields': ('sender', 'amount_sent')
        }),
        ('Recipient Information', {
            'fields': (
                'recipient_name', 
                'recipient_phone',
                'recipient_country',
                'amount_received'
            )
        }),
        ('Transaction Details', {
            'fields': (
                'exchange_rate',
                'fee',
                'status',
                'reference_number'
            )
        })
    )
    
    readonly_fields = ['reference_number', 'amount_received', 'exchange_rate']
    
    actions = ['verify_recipients', 'verify_sources', 'approve_exemptions', 'reject_exemptions']
    
    def verify_recipients(self, request, queryset):
        """Bulk verify recipients"""
        from payments.services.verification import VerificationService
        
        for remittance in queryset:
            remittance.recipient_verified = VerificationService.verify_phone_number(
                remittance.recipient_phone
            )
            remittance.save()
        self.message_user(request, f"Verified {queryset.count()} recipients")
    verify_recipients.short_description = "Verify selected recipients"
    
    def verify_sources(self, request, queryset):
        """Bulk verify sources of funds"""
        from payments.services.verification import VerificationService
        
        for remittance in queryset:
            remittance.source_of_funds_verified = \
                VerificationService.verify_source_of_funds(remittance.sender)
            remittance.save()
        self.message_user(request, f"Verified {queryset.count()} sources")
    verify_sources.short_description = "Verify sources of funds"
    
    def approve_exemptions(self, request, queryset):
        """Admin action to approve exemptions"""
        for remittance in queryset.filter(exemption_status='pending'):
            remittance.exemption_status = 'approved'
            remittance.exemption_approver = request.user
            remittance.save()
        self.message_user(request, f"Approved {queryset.count()} exemptions")
    approve_exemptions.short_description = "Approve selected exemptions"
    
    def reject_exemptions(self, request, queryset):
        """Admin action to reject exemptions"""
        for remittance in queryset.filter(exemption_status='pending'):
            remittance.exemption_status = 'rejected'
            remittance.exemption_approver = request.user
            remittance.save()
        self.message_user(request, f"Rejected {queryset.count()} exemptions")
    reject_exemptions.short_description = "Reject selected exemptions"

# @admin.register(VerificationDashboard)
# class VerificationDashboardAdmin(admin.ModelAdmin):
#     change_list_template = 'admin/payments/verification_dashboard.html'
#     
#     def changelist_view(self, request, extra_context=None):
#         from payments.services.verification import VerificationService
#         from payments.models.verification import VerificationLog
#         
#         extra_context = extra_context or {}
#         extra_context.update({
#             'providers': VerificationService._provider_status,
#             'geo_stats': VerificationLog.geographic_stats()[:5],
#             'alerts': VerificationService.get_recent_alerts()
#         })
#         
#         return super().changelist_view(request, extra_context=extra_context)

@admin.register(VerificationLog)
class VerificationLogAdmin(admin.ModelAdmin):
    list_display = ['phone_number', 'provider', 'success', 'response_time', 'created_at']
    list_filter = ['provider', 'success', 'created_at']
    search_fields = ['phone_number']
    date_hierarchy = 'created_at'

@admin.register(ProviderHealth)
class ProviderHealthAdmin(admin.ModelAdmin):
    list_display = ['provider', 'is_healthy', 'last_checked', 'success_rate']
    list_filter = ['is_healthy', 'provider']
    readonly_fields = ['last_checked']
    ordering = ['-last_checked']

