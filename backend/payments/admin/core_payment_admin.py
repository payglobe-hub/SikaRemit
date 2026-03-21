"""Core payment admin: PaymentAdmin, filters, actions, basic model admins."""
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

@admin.action(description='Mark selected payments as completed')
def mark_completed(modeladmin, request, queryset):
    queryset.update(status='completed')

@admin.action(description='Mark selected payments as failed')
def mark_failed(modeladmin, request, queryset):
    queryset.update(status='failed')

@admin.action(description='Export selected payments to CSV')
def export_csv(modeladmin, request, queryset):
    import csv
    from django.http import HttpResponse
    
    response = HttpResponse(content_type='text/csv')
    response['Content-Disposition'] = 'attachment; filename="payments.csv"'
    
    writer = csv.writer(response)
    writer.writerow(['ID', 'Customer', 'Merchant', 'Amount', 'Currency', 'Status', 'Created At'])
    
    for payment in queryset:
        writer.writerow([
            payment.id,
            payment.customer.user.email,
            payment.merchant.business_name,
            payment.amount,
            payment.currency,
            payment.get_status_display(),
            payment.created_at
        ])
    
    return response

class StatusFilter(admin.SimpleListFilter):
    title = 'payment status'
    parameter_name = 'status'
    
    def lookups(self, request, model_admin):
        return (
            ('completed', 'Completed'),
            ('pending', 'Pending'),
            ('failed', 'Failed'),
            ('refunded', 'Refunded'),
        )
    
    def queryset(self, request, queryset):
        if self.value():
            return queryset.filter(status=self.value())
        return queryset

class PaymentTypeFilter(admin.SimpleListFilter):
    title = 'payment type'
    parameter_name = 'payment_type'
    
    def lookups(self, request, model_admin):
        return Payment.PAYMENT_TYPE_CHOICES
    
    def queryset(self, request, queryset):
        if self.value():
            return queryset.filter(payment_type=self.value())
        return queryset

class BillerFilter(admin.SimpleListFilter):
    title = 'is biller'
    parameter_name = 'is_biller'
    
    def lookups(self, request, model_admin):
        return (
            ('1', 'Yes'),
            ('0', 'No'),
        )
    
    def queryset(self, request, queryset):
        if self.value() == '1':
            return queryset.filter(merchant__is_biller=True)
        if self.value() == '0':
            return queryset.filter(merchant__is_biller=False)

class RemittanceAgentFilter(admin.SimpleListFilter):
    title = 'is remittance agent'
    parameter_name = 'is_remittance_agent'
    
    def lookups(self, request, model_admin):
        return (
            ('1', 'Yes'),
            ('0', 'No'),
        )
    
    def queryset(self, request, queryset):
        if self.value() == '1':
            return queryset.filter(merchant__is_remittance_agent=True)
        if self.value() == '0':
            return queryset.filter(merchant__is_remittance_agent=False)

class PaymentAnalytics(admin.AdminSite):
    def get_urls(self):
        urls = super().get_urls()
        custom_urls = [
            path('analytics/', self.admin_view(self.payment_analytics), name='payment-analytics'),
            path('export-report/', self.admin_view(self.export_report), name='export-report'),
        ]
        return custom_urls + urls
    
    def payment_analytics(self, request):
        # Daily payment volume
        daily_data = Payment.objects.annotate(
            day=TruncDay('created_at')
        ).values('day').annotate(
            total=Sum('amount'),
            count=Count('id')
        ).order_by('day')
        
        # Payment method distribution
        method_data = Payment.objects.values('payment_method').annotate(
            total=Sum('amount'),
            count=Count('id')
        ).order_by('-total')
        
        # Status distribution
        status_data = Payment.objects.values('status').annotate(
            count=Count('id')
        ).order_by('-count')
        
        context = {
            'daily_data': list(daily_data),
            'method_data': list(method_data),
            'status_data': list(status_data),
        }
        return JsonResponse(context)
    
    def export_report(self, request):
        # Generate comprehensive report
        report = {
            'summary': {
                'total_payments': Payment.objects.count(),
                'total_amount': Payment.objects.aggregate(Sum('amount'))['amount__sum'],
                'avg_amount': Payment.objects.aggregate(Avg('amount'))['amount__avg'],
            },
            'monthly_trends': list(
                Payment.objects.annotate(
                    month=TruncMonth('created_at')
                ).values('month').annotate(
                    total=Sum('amount'),
                    count=Count('id')
                ).order_by('month')
            ),
            'top_customers': list(
                Payment.objects.values('customer__user__email').annotate(
                    total=Sum('amount'),
                    count=Count('id')
                ).order_by('-total')[:10]
            ),
            'top_merchants': list(
                Payment.objects.values('merchant__business_name').annotate(
                    total=Sum('amount'),
                    count=Count('id')
                ).order_by('-total')[:10]
            )
        }
        
        response = JsonResponse(report)
        response['Content-Disposition'] = 'attachment; filename="payment_report.json"'
        return response

class PaymentAdmin(admin.ModelAdmin):
    def get_list_display(self, request):
        base_list = ['id', 'payment_type_badge', 'customer_link', 'merchant_link', 
                   'amount_with_currency', 'status_badge']
        if request.path.endswith('billpayment/'):
            base_list.extend(['bill_reference', 'bill_type'])
        elif request.path.endswith('remittance/'):
            base_list.extend(['recipient_name', 'recipient_country'])
        return base_list

    def get_changelist(self, request, **kwargs):
        if request.path.endswith('billpayment/'):
            self.list_display_links = ('id', 'bill_reference')
        elif request.path.endswith('remittance/'):
            self.list_display_links = ('id', 'recipient_name')
        return super().get_changelist(request, **kwargs)

    list_filter = (StatusFilter, PaymentTypeFilter, BillerFilter, RemittanceAgentFilter, 'created_at')
    
    def get_payment_type_display(self, obj):
        return obj.get_payment_type_display()
    get_payment_type_display.short_description = 'Payment Type'
    
    def get_fieldsets(self, request, obj=None):
        base_fieldsets = [
            ('Basic Information', {'fields': ('customer', 'merchant', 'payment_type')}),
            ('Payment Details', {'fields': ('amount', 'currency', 'payment_method', 'status')}),
            ('Dates', {'fields': ('created_at', 'updated_at'), 'classes': ('collapse',)})
        ]
        
        if obj and obj.payment_type == 'bill':
            base_fieldsets.insert(2, (
                'Bill Information', {
                    'fields': ('bill_reference', 'bill_due_date', 'bill_type'),
                    'classes': ('wide',)
                }
            ))
        elif obj and obj.payment_type == 'remittance':
            base_fieldsets.insert(2, (
                'Remittance Information', {
                    'fields': ('remittance_reference', 'recipient_country', 'recipient_name', 'exchange_rate'),
                    'classes': ('wide',)
                }
            ))
            
        return base_fieldsets
    
    def get_form(self, request, obj=None, **kwargs):
        # First check if payment_type exists in model AND database
        has_payment_type = hasattr(Payment, 'payment_type') \
            and any(f.name == 'payment_type' for f in Payment._meta.get_fields())
        
        # Explicitly declare fields to avoid any ambiguity
        if has_payment_type:
            self.fields = [
                'customer', 'merchant', 'payment_type',
                'amount', 'currency', 'payment_method', 'status'
            ]
        else:
            self.fields = [
                'customer', 'merchant',
                'amount', 'currency', 'payment_method', 'status'
            ]
            
        form = super().get_form(request, obj, **kwargs)
        
        # If field should exist but wasn't added automatically
        if has_payment_type and 'payment_type' not in form.base_fields:
            from django import forms
            form.base_fields['payment_type'] = forms.ChoiceField(
                choices=getattr(Payment, 'PAYMENT_TYPE_CHOICES', []),
                required=False
            )
            
        return form
    
    def customer_link(self, obj):
        url = reverse('admin:accounts_customer_change', args=[obj.customer.id])
        return format_html('<a href="{}">{}</a>', url, obj.customer.user.email)
    customer_link.short_description = 'Customer'
    
    def merchant_link(self, obj):
        url = reverse('admin:accounts_merchant_change', args=[obj.merchant.id])
        return format_html('<a href="{}">{}</a>', url, obj.merchant.business_name)
    merchant_link.short_description = 'Merchant'
    
    def amount_with_currency(self, obj):
        return f"{obj.amount} {obj.currency}"
    amount_with_currency.short_description = 'Amount'
    
    def status_badge(self, obj):
        colors = {
            'completed': 'green',
            'pending': 'orange',
            'failed': 'red',
            'refunded': 'blue'
        }
        return format_html(
            '<span style="color: white; background-color: {}; padding: 3px 8px; border-radius: 10px;">{}</span>',
            colors.get(obj.status, 'gray'),
            obj.get_status_display()
        )
    status_badge.short_description = 'Status'
    
    def payment_type_badge(self, obj):
        colors = {
            'regular': 'gray',
            'bill': 'blue',
            'remittance': 'purple'
        }
        return format_html(
            '<span style="color: white; background-color: {}; padding: 3px 8px; border-radius: 10px;">{}</span>',
            colors.get(obj.payment_type, 'gray'),
            obj.get_payment_type_display()
        )
    payment_type_badge.short_description = 'Type'

    def payment_details(self, obj):
        return format_html(
            '<strong>Method:</strong> {}<br><strong>Status:</strong> {}',
            obj.payment_method,
            obj.get_status_display()
        )
    payment_details.short_description = 'Details'
    
    def payment_actions(self, obj):
        return format_html(
            '<a class="button" href="{}?status=completed">Complete</a>',
            reverse('admin:payments_payment_change', args=[obj.id])
        )
    payment_actions.short_description = 'Actions'
    
    def save_model(self, request, obj, form, change):
        if not change:
            obj.created_by = request.user
        super().save_model(request, obj, form, change)

    change_list_template = 'admin/payments/payment/change_list.html'
    
    def changelist_view(self, request, extra_context=None):
        from payments.utils.alerts import AlertService
        
        extra_context = extra_context or {}
        extra_context['alerts'] = AlertService.get_recent_alerts()
        
        return super().changelist_view(request, extra_context=extra_context)

    @admin.action(description='Export selected bill payments to CSV')
    def export_bill_payments_csv(modeladmin, request, queryset):
        queryset = queryset.filter(payment_type='bill')
        response = HttpResponse(content_type='text/csv')
        response['Content-Disposition'] = 'attachment; filename="bill_payments.csv"'
        
        writer = csv.writer(response)
        writer.writerow(['ID', 'Customer', 'Biller', 'Amount', 'Bill Ref', 'Bill Type', 'Due Date', 'Status'])
        
        for payment in queryset:
            writer.writerow([
                payment.id,
                payment.customer.user.email,
                payment.merchant.business_name,
                payment.amount,
                payment.bill_reference,
                payment.bill_type,
                payment.bill_due_date,
                payment.get_status_display()
            ])
        
        return response

    @admin.action(description='Export selected remittances to CSV')
    def export_remittances_csv(modeladmin, request, queryset):
        queryset = queryset.filter(payment_type='remittance')
        response = HttpResponse(content_type='text/csv')
        response['Content-Disposition'] = 'attachment; filename="remittances.csv"'
        
        writer = csv.writer(response)
        writer.writerow(['ID', 'Sender', 'Agent', 'Amount', 'Recipient', 'Country', 'Exchange Rate', 'Status'])
        
        for payment in queryset:
            writer.writerow([
                payment.id,
                payment.customer.user.email,
                payment.merchant.business_name,
                payment.amount,
                payment.recipient_name,
                payment.recipient_country,
                payment.exchange_rate,
                payment.get_status_display()
            ])

    actions = [mark_completed, mark_failed, export_csv, export_bill_payments_csv, export_remittances_csv]

class PaymentsAdminSite(admin.AdminSite):
    def get_app_list(self, request):
        app_list = super().get_app_list(request)
        
        # Reorganize payments app
        for app in app_list:
            if app['app_label'] == 'payments':
                # Create new groups
                bill_payments = {
                    'name': 'Bill Payments',
                    'models': []
                }
                remittances = {
                    'name': 'Remittances', 
                    'models': []
                }
                
                # Categorize models
                for model in app['models']:
                    if model['object_name'] == 'Payment' and 'BillPaymentAdmin' in str(type(model['model'])):
                        bill_payments['models'].append(model)
                    elif model['object_name'] == 'Payment' and 'RemittanceAdmin' in str(type(model['model'])):
                        remittances['models'].append(model)
                    else:
                        # Keep other models in main payments group
                        if 'models' not in app:
                            app['models'] = []
                        app['models'].append(model)
                
                # Add new groups if they have models
                if bill_payments['models']:
                    app['models'].append(bill_payments)
                if remittances['models']:
                    app['models'].append(remittances)
                
        return app_list

# Replace default admin site
payments_admin = PaymentsAdminSite(name='payments_admin')

# Register additional payment models
@admin.register(PaymentMethod)
class PaymentMethodAdmin(admin.ModelAdmin):
    list_display = ('user', 'method_type', 'is_default', 'created_at')
    list_filter = ('method_type', 'is_default', 'created_at')
    search_fields = ('user__email',)

@admin.register(Transaction)
class TransactionAdmin(admin.ModelAdmin):
    list_display = ('id', 'customer', 'merchant', 'amount', 'status', 'created_at')
    list_filter = ('status', 'created_at', 'payment_method__method_type')
    search_fields = ('customer__user__email', 'merchant__business_name')
    actions = ['process_refunds', 'update_statuses', 'export_transactions']
    
    def process_refunds(self, request, queryset):
        """Admin action to process refunds for selected transactions"""
        from payments.services import PaymentProcessor
        processor = PaymentProcessor()
        
        for txn in queryset.filter(status='completed'):
            try:
                processor.refund_payment(txn)
                self.message_user(request, f"Refund processed for transaction {txn.id}")
            except Exception as e:
                self.message_user(request, f"Failed to refund {txn.id}: {str(e)}", level='error')
    process_refunds.short_description = "Process refunds for selected transactions"
    
    def update_statuses(self, request, queryset):
        """Admin action to bulk update transaction statuses"""
        status = request.POST.get('status')
        if status and status in dict(Transaction.STATUS_CHOICES):
            updated = queryset.update(status=status)
            self.message_user(request, f"Updated {updated} transactions to {status}")
        else:
            self.message_user(request, "Invalid status selected", level='error')
    update_statuses.short_description = "Update status of selected transactions"
    
    def export_transactions(self, request, queryset):
        """Export selected transactions to CSV"""
        response = HttpResponse(content_type='text/csv')
        response['Content-Disposition'] = 'attachment; filename="transactions.csv"'
        
        writer = csv.writer(response)
        writer.writerow(['ID', 'Customer', 'Merchant', 'Amount', 'Currency', 'Status', 'Date'])
        
        for txn in queryset:
            writer.writerow([
                txn.id,
                txn.customer.user.email,
                txn.merchant.business_name,
                txn.amount,
                txn.currency,
                txn.get_status_display(),
                txn.created_at
            ])
        
        return response
    export_transactions.short_description = "Export selected transactions to CSV"
    
    def changelist_view(self, request, extra_context=None):
        """Add summary stats to admin list view"""
        response = super().changelist_view(request, extra_context=extra_context)
        
        if hasattr(response, 'context_data') and 'cl' in response.context_data:
            queryset = response.context_data['cl'].queryset
            response.context_data['summary'] = {
                'total_count': queryset.count(),
                'total_amount': sum(t.amount for t in queryset if t.amount),
                'completed_count': queryset.filter(status='completed').count(),
                'failed_count': queryset.filter(status='failed').count()
            }
        
        return response

# Merchant is already registered in users/admin.py
# @admin.register(PaymentsMerchant)
# class PaymentsMerchantAdmin(admin.ModelAdmin):
#     list_display = ('user', 'business_name', 'is_biller', 'is_subscription_provider')
#     list_filter = ('is_biller', 'is_subscription_provider', 'is_remittance_agent')
#     search_fields = ('user__email', 'business_name')

@admin.register(PaymentsPaymentLog)
class PaymentsPaymentLogAdmin(admin.ModelAdmin):
    list_display = ('user', 'amount', 'payment_type', 'created_at')
    list_filter = ('payment_type', 'created_at')
    search_fields = ('user__email',)

@admin.register(Subscription)
class SubscriptionAdmin(admin.ModelAdmin):
    list_display = ('user', 'plan', 'status', 'start_date', 'current_period_end')
    list_filter = ('status', 'created_at')
    search_fields = ('user__email', 'plan')

class RemittanceAdmin(PaymentAdmin):
    def get_queryset(self, request):
        return super().get_queryset(request).filter(payment_type='remittance')

    list_display = ('id', 'customer_link', 'merchant_link', 'amount_with_currency', 'recipient_name', 'recipient_country', 'status_badge')

# Fee Management Admin Classes
from payments.models.fees import FeeConfiguration, FeeCalculationLog, MerchantFeeOverride
from payments.models.analytics import AnalyticsMetric, DashboardSnapshot, MerchantAnalytics, TransactionAnalytics, PerformanceAlert

