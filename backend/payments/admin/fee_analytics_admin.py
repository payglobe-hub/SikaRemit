"""Fee configuration and analytics admin classes."""
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

@admin.register(FeeConfiguration)
class FeeConfigurationAdmin(admin.ModelAdmin):
    list_display = [
        'name', 'fee_type_badge', 'scope_display', 'corridor_display',
        'calculation_method_display', 'fee_amount_display', 'is_active_badge',
        'effective_period', 'created_by', 'created_at'
    ]
    list_filter = [
        'fee_type', 'calculation_method', 'is_active', 'merchant',
        'corridor_from', 'corridor_to', 'currency', 'is_platform_default',
        'requires_approval', 'created_by'
    ]
    search_fields = ['name', 'description', 'merchant__business_name']
    readonly_fields = ['created_at', 'updated_at', 'id']
    ordering = ['-created_at']

    fieldsets = (
        ('Basic Information', {
            'fields': ('name', 'fee_type', 'description', 'merchant', 'is_platform_default')
        }),
        ('Geographic Scope', {
            'fields': ('corridor_from', 'corridor_to', 'currency')
        }),
        ('Fee Calculation', {
            'fields': ('calculation_method', 'fixed_fee', 'percentage_fee', 'min_fee', 'max_fee')
        }),
        ('Transaction Limits', {
            'fields': ('min_transaction_amount', 'max_transaction_amount')
        }),
        ('Validity Period', {
            'fields': ('effective_from', 'effective_to')
        }),
        ('Settings & Audit', {
            'fields': ('is_active', 'requires_approval', 'created_by', 'approved_by'),
            'classes': ('collapse',)
        }),
    )

    def fee_type_badge(self, obj):
        colors = {
            'remittance': 'blue',
            'domestic_transfer': 'green',
            'payment': 'purple',
            'merchant_service': 'orange',
            'platform_fee': 'red',
            'withdrawal': 'yellow',
            'deposit': 'cyan',
            'bill_payment': 'pink',
            'airtime': 'indigo',
            'data_bundle': 'teal',
        }
        color = colors.get(obj.fee_type, 'gray')
        return format_html(
            '<span class="badge badge-{}">{}</span>',
            color,
            obj.get_fee_type_display()
        )
    fee_type_badge.short_description = 'Fee Type'

    def scope_display(self, obj):
        if obj.merchant:
            return format_html('<strong>Merchant:</strong> {}', obj.merchant.business_name)
        elif obj.is_platform_default:
            return format_html('<span class="text-green-600"><strong>Platform Default</strong></span>')
        else:
            return format_html('<span class="text-blue-600"><strong>Platform</strong></span>')
    scope_display.short_description = 'Scope'

    def corridor_display(self, obj):
        if obj.corridor_from and obj.corridor_to:
            return f"{obj.corridor_from} → {obj.corridor_to}"
        elif obj.corridor_from:
            return f"{obj.corridor_from} → ALL"
        elif obj.corridor_to:
            return f"ALL → {obj.corridor_to}"
        else:
            return "ALL → ALL"
    corridor_display.short_description = 'Corridor'

    def calculation_method_display(self, obj):
        method_map = {
            'fixed': 'Fixed Amount',
            'percentage': 'Percentage',
            'tiered': 'Tiered',
            'volume_based': 'Volume Based'
        }
        return method_map.get(obj.calculation_method, obj.calculation_method)
    calculation_method_display.short_description = 'Calculation'

    def fee_amount_display(self, obj):
        if obj.calculation_method == 'fixed':
            return f"${obj.fixed_fee}"
        elif obj.calculation_method == 'percentage':
            return f"{obj.percentage_fee * 100:.2f}%"
        else:
            parts = []
            if obj.fixed_fee:
                parts.append(f"${obj.fixed_fee}")
            if obj.percentage_fee:
                parts.append(f"{obj.percentage_fee * 100:.2f}%")
            return " + ".join(parts) if parts else "Complex"
    fee_amount_display.short_description = 'Fee Amount'

    def is_active_badge(self, obj):
        if obj.is_active:
            return format_html('<span class="text-green-600">✓ Active</span>')
        else:
            return format_html('<span class="text-red-600">✗ Inactive</span>')
    is_active_badge.short_description = 'Status'

    def effective_period(self, obj):
        if obj.effective_to:
            return f"{obj.effective_from.strftime('%Y-%m-%d')} to {obj.effective_to.strftime('%Y-%m-%d')}"
        else:
            return f"From {obj.effective_from.strftime('%Y-%m-%d')}"
    effective_period.short_description = 'Effective Period'

    def save_model(self, request, obj, form, change):
        if not change:  # New object
            obj.created_by = request.user
        super().save_model(request, obj, form, change)

    def has_change_permission(self, request, obj=None):
        if obj and obj.requires_approval and not request.user.is_superuser:
            # Only allow changes by the creator or superuser
            return obj.created_by == request.user or request.user.is_superuser
        return super().has_change_permission(request, obj)

    def has_delete_permission(self, request, obj=None):
        if obj and obj.requires_approval and not request.user.is_superuser:
            return obj.created_by == request.user
        return super().has_delete_permission(request, obj)

@admin.register(FeeCalculationLog)
class FeeCalculationLogAdmin(admin.ModelAdmin):
    list_display = [
        'transaction_type', 'transaction_id', 'merchant_display',
        'amount_display', 'calculated_fee_display', 'corridor_display',
        'user_display', 'calculated_at'
    ]
    list_filter = [
        'transaction_type', 'merchant', 'corridor_from', 'corridor_to',
        'currency', 'calculated_at', 'fee_configuration'
    ]
    search_fields = ['transaction_id', 'merchant__business_name', 'user__email']
    readonly_fields = ['calculated_at', 'breakdown_json']
    ordering = ['-calculated_at']
    date_hierarchy = 'calculated_at'

    def merchant_display(self, obj):
        return obj.merchant.business_name if obj.merchant else "Platform"
    merchant_display.short_description = 'Merchant'

    def amount_display(self, obj):
        return f"${obj.amount} {obj.currency}"
    amount_display.short_description = 'Amount'

    def calculated_fee_display(self, obj):
        return f"${obj.calculated_fee} {obj.currency}"
    calculated_fee_display.short_description = 'Fee'

    def corridor_display(self, obj):
        if obj.corridor_from and obj.corridor_to:
            return f"{obj.corridor_from} → {obj.corridor_to}"
        else:
            return "N/A"
    corridor_display.short_description = 'Corridor'

    def user_display(self, obj):
        return obj.user.email if obj.user else "N/A"
    user_display.short_description = 'User'

    def breakdown_json(self, obj):
        return format_html('<pre>{}</pre>', json.dumps(obj.breakdown, indent=2))
    breakdown_json.short_description = 'Calculation Breakdown'

@admin.register(MerchantFeeOverride)
class MerchantFeeOverrideAdmin(admin.ModelAdmin):
    list_display = [
        'merchant_display', 'fee_configuration_display', 'status_badge',
        'requested_by', 'reviewed_by', 'created_at'
    ]
    list_filter = [
        'status', 'fee_configuration__fee_type', 'merchant',
        'requested_by', 'reviewed_by', 'created_at'
    ]
    search_fields = ['merchant__business_name', 'fee_configuration__name', 'justification']
    readonly_fields = ['created_at', 'updated_at', 'reviewed_at']
    ordering = ['-created_at']

    fieldsets = (
        ('Request Information', {
            'fields': ('merchant', 'fee_configuration', 'justification')
        }),
        ('Proposed Changes', {
            'fields': ('proposed_fixed_fee', 'proposed_percentage_fee',
                      'proposed_min_fee', 'proposed_max_fee')
        }),
        ('Review Information', {
            'fields': ('status', 'reviewed_by', 'reviewed_at', 'review_notes',
                      'effective_from', 'effective_to')
        }),
    )

    def merchant_display(self, obj):
        return obj.merchant.business_name
    merchant_display.short_description = 'Merchant'

    def fee_configuration_display(self, obj):
        return format_html(
            '<strong>{}</strong><br><small>{}</small>',
            obj.fee_configuration.name,
            obj.fee_configuration.get_fee_type_display()
        )
    fee_configuration_display.short_description = 'Fee Configuration'

    def status_badge(self, obj):
        colors = {
            'pending': 'yellow',
            'approved': 'green',
            'rejected': 'red',
            'expired': 'gray'
        }
        color = colors.get(obj.status, 'gray')
        return format_html(
            '<span class="badge badge-{}">{}</span>',
            color,
            obj.get_status_display()
        )
    status_badge.short_description = 'Status'

    actions = ['approve_override', 'reject_override']

    @admin.action(description='Approve selected fee overrides')
    def approve_override(self, request, queryset):
        for override in queryset.filter(status='pending'):
            override.status = 'approved'
            override.reviewed_by = request.user
            override.reviewed_at = timezone.now()
            override.save()

            # Create the actual fee configuration
            FeeConfiguration.objects.create(
                name=f"{override.merchant.business_name} - {override.fee_configuration.fee_type}",
                fee_type=override.fee_configuration.fee_type,
                merchant=override.merchant,
                corridor_from=override.fee_configuration.corridor_from,
                corridor_to=override.fee_configuration.corridor_to,
                currency=override.fee_configuration.currency,
                calculation_method=override.fee_configuration.calculation_method,
                fixed_fee=override.proposed_fixed_fee or override.fee_configuration.fixed_fee,
                percentage_fee=override.proposed_percentage_fee or override.fee_configuration.percentage_fee,
                min_fee=override.proposed_min_fee or override.fee_configuration.min_fee,
                max_fee=override.proposed_max_fee or override.fee_configuration.max_fee,
                effective_from=override.effective_from or timezone.now(),
                effective_to=override.effective_to,
                is_active=True,
                requires_approval=False,
                created_by=request.user,
                approved_by=request.user,
            )

        self.message_user(request, f"Approved {queryset.filter(status='pending').count()} fee overrides")

    @admin.action(description='Reject selected fee overrides')
    def reject_override(self, request, queryset):
        updated = queryset.filter(status='pending').update(
            status='rejected',
            reviewed_by=request.user,
            reviewed_at=timezone.now()
        )
        self.message_user(request, f"Rejected {updated} fee overrides")

    def has_change_permission(self, request, obj=None):
        if obj and obj.status != 'pending':
            return False  # Can't modify approved/rejected overrides
        return super().has_change_permission(request, obj)

# Analytics Admin Classes
@admin.register(DashboardSnapshot)
class DashboardSnapshotAdmin(admin.ModelAdmin):
    list_display = [
        'date', 'total_transactions', 'total_transaction_value',
        'total_fee_revenue', 'success_rate', 'active_merchants', 'active_customers'
    ]
    readonly_fields = [
        'date', 'total_transactions', 'total_transaction_value', 'total_fee_revenue',
        'active_merchants', 'active_customers', 'new_registrations',
        'successful_transactions', 'failed_transactions', 'success_rate',
        'transactions_by_country', 'revenue_by_country', 'payment_method_usage',
        'top_merchants_by_volume', 'top_merchants_by_revenue',
        'kyc_completion_rate', 'high_risk_transactions', 'reported_to_regulator'
    ]
    ordering = ['-date']
    date_hierarchy = 'date'

    def has_add_permission(self, request):
        return False  # Snapshots are created automatically

    def has_change_permission(self, request, obj=None):
        return False  # Snapshots are read-only

@admin.register(MerchantAnalytics)
class MerchantAnalyticsAdmin(admin.ModelAdmin):
    list_display = [
        'merchant', 'date', 'transaction_count', 'transaction_value',
        'fee_revenue', 'success_rate', 'unique_customers'
    ]
    list_filter = ['date', 'merchant']
    search_fields = ['merchant__business_name']
    readonly_fields = [
        'merchant', 'date', 'transaction_count', 'transaction_value', 'fee_revenue',
        'unique_customers', 'new_customers', 'success_rate', 'average_transaction_value',
        'transactions_by_country', 'payment_method_usage', 'high_risk_transactions',
        'kyc_pending_customers'
    ]
    ordering = ['-date', '-transaction_value']

    def has_add_permission(self, request):
        return False

    def has_change_permission(self, request, obj=None):
        return False

@admin.register(PerformanceAlert)
class PerformanceAlertAdmin(admin.ModelAdmin):
    list_display = [
        'alert_type', 'severity', 'title', 'is_active', 'acknowledged_by',
        'created_at', 'resolved_at'
    ]
    list_filter = ['alert_type', 'severity', 'is_active', 'created_at']
    search_fields = ['title', 'description']
    readonly_fields = [
        'alert_type', 'severity', 'title', 'description', 'affected_entities',
        'metrics', 'threshold_breached', 'suggested_actions', 'created_at',
        'acknowledged_at', 'resolved_at'
    ]
    ordering = ['-created_at']

    actions = ['acknowledge_alerts', 'resolve_alerts']

    @admin.action(description='Acknowledge selected alerts')
    def acknowledge_alerts(self, request, queryset):
        updated = queryset.filter(is_active=True).update(
            acknowledged_by=request.user,
            acknowledged_at=timezone.now()
        )
        self.message_user(request, f'Acknowledged {updated} alerts')

    @admin.action(description='Resolve selected alerts')
    def resolve_alerts(self, request, queryset):
        updated = queryset.filter(is_active=True).update(
            resolved_at=timezone.now(),
            is_active=False
        )
        self.message_user(request, f'Resolved {updated} alerts')

@admin.register(TransactionAnalytics)
class TransactionAnalyticsAdmin(admin.ModelAdmin):
    list_display = [
        'transaction_type', 'transaction_id', 'merchant', 'customer',
        'amount', 'fee_amount', 'status', 'risk_score', 'created_at'
    ]
    list_filter = [
        'transaction_type', 'status', 'risk_score', 'created_at',
        'merchant', 'country_from', 'country_to'
    ]
    search_fields = ['transaction_id', 'merchant__business_name', 'customer__user__email']
    readonly_fields = [
        'transaction_type', 'transaction_id', 'merchant', 'customer', 'amount',
        'fee_amount', 'currency', 'payment_method', 'country_from', 'country_to',
        'status', 'risk_score', 'processing_time_ms', 'device_info', 'ip_address',
        'user_agent', 'created_at'
    ]
    ordering = ['-created_at']
    date_hierarchy = 'created_at'

    def has_add_permission(self, request):
        return False

    def has_change_permission(self, request, obj=None):
        return False
