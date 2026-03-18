"""USSD payment admin: USSDTransactionAdmin, USSDMenuAdmin, USSDProviderAdmin."""
from .core_payment_admin import PaymentAnalytics, PaymentAdmin  # noqa: F401
from django.contrib import admin
from django.db.models import Q, Sum, Count, Avg, Max
from django.db.models.functions import TruncDay, TruncMonth
from payments.models.payment import Payment
from payments.models.payment_method import PaymentMethod
from payments.models.transaction import Transaction
from users.models import Merchant as PaymentsMerchant
from payments.models.payment_log import PaymentLog as PaymentsPaymentLog
from payments.models.subscriptions import Subscription
from payments.models.ussd_transaction import SimpleUSSDTransaction
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

@admin.register(SimpleUSSDTransaction)
class USSDTransactionAdmin(admin.ModelAdmin):
    list_display = ('id', 'phone_number', 'amount', 'status', 'created_at')
    list_filter = ('status', 'created_at')
    search_fields = ('phone_number',)
    readonly_fields = ('created_at', 'updated_at')
    ordering = ('-created_at',)

    fieldsets = (
        ('Transaction Details', {
            'fields': ('phone_number', 'status', 'transaction')
        }),
        ('Financial Information', {
            'fields': ('amount',)
        }),
        ('Timing', {
            'fields': ('created_at', 'updated_at'),
            'classes': ('collapse',)
        }),
    )

    def get_queryset(self, request):
        """Show only recent transactions by default"""
        qs = super().get_queryset(request)
        if not request.GET.get('show_all'):
            # Show last 30 days by default
            from django.utils import timezone
            from datetime import timedelta
            thirty_days_ago = timezone.now() - timedelta(days=30)
            return qs.filter(created_at__gte=thirty_days_ago)
        return qs

    def has_add_permission(self, request):
        return False  # Transactions are created automatically

    @admin.action(description='Approve selected pending transactions')
    def approve_transactions(self, request, queryset):
        approved_count = 0
        for transaction in queryset.filter(status='pending_approval'):
            success, message = transaction.approve_transaction(request.user)
            if success:
                approved_count += 1
                # Trigger approval notification
                self._send_approval_notification(transaction)

        self.message_user(request, f"Approved {approved_count} transactions")

    @admin.action(description='Reject selected pending transactions')
    def reject_transactions(self, request, queryset):
        rejected_count = 0
        for transaction in queryset.filter(status='pending_approval'):
            success, message = transaction.reject_transaction(request.user, "Rejected by admin")
            if success:
                rejected_count += 1
                # Trigger rejection notification
                self._send_rejection_notification(transaction)

        self.message_user(request, f"Rejected {rejected_count} transactions")

    def _send_approval_notification(self, transaction):
        """Send approval notification to user"""
        try:
            # Use the comprehensive notification service
            from payments.services.notification_service import NotificationService

            # Get user phone number from session
            phone_number = transaction.session.msisdn

            context = {
                'amount': float(transaction.amount),
                'type': transaction.get_transaction_type_display(),
                'transaction_id': transaction.transaction_id[-8:],
                'recipient': transaction.recipient,
                'status': 'Approved'
            }

            # Send SMS notification
            NotificationService.send_notification(
                notification_type='ussd_approval',  # This would need to be added to the notification service
                recipient_phone=phone_number,
                context=context,
                channels=['sms']
            )

            logger.info(f"Approval notification sent for transaction {transaction.transaction_id}")

        except Exception as e:
            logger.error(f"Failed to send approval notification: {e}")

    def _send_rejection_notification(self, transaction):
        """Send rejection notification to user"""
        try:
            # Use the comprehensive notification service
            from payments.services.notification_service import NotificationService

            # Get user phone number from session
            phone_number = transaction.session.msisdn

            context = {
                'amount': float(transaction.amount),
                'type': transaction.get_transaction_type_display(),
                'transaction_id': transaction.transaction_id[-8:],
                'reason': 'Rejected by admin',
                'status': 'Rejected'
            }

            # Send SMS notification
            NotificationService.send_notification(
                notification_type='ussd_rejection',  # This would need to be added to the notification service
                recipient_phone=phone_number,
                context=context,
                channels=['sms']
            )

            logger.info(f"Rejection notification sent for transaction {transaction.transaction_id}")

        except Exception as e:
            logger.error(f"Failed to send rejection notification: {e}")

    actions = [approve_transactions, reject_transactions]
    
    def generate_remittance_report(self, request, queryset):
        """Enhanced report with additional metrics and visualization data"""
        from django.db.models import Count, Sum, Q, F, Avg, Max, Min
        from datetime import timedelta
        
        thirty_days_ago = timezone.now() - timedelta(days=30)
        
        # Calculate time-based metrics
        time_metrics = {
            'avg_processing_time': queryset.filter(
                is_remitted=True
            ).aggregate(
                avg_time=Avg(F('remittance_date') - F('due_date'))
            )['avg_time'],
            'min_processing_time': queryset.filter(
                is_remitted=True
            ).aggregate(
                min_time=Min(F('remittance_date') - F('due_date'))
            )['min_time'],
            'max_processing_time': queryset.filter(
                is_remitted=True
            ).aggregate(
                max_time=Max(F('remittance_date') - F('due_date'))
            )['max_time']
        }
        
        # Enhanced report structure
        report = {
            'meta': {
                'generated_at': timezone.now().isoformat(),
                'time_range': {
                    'start': thirty_days_ago.isoformat(),
                    'end': timezone.now().isoformat()
                },
                'record_count': queryset.count()
            },
            'summary': {
                'total_amount': queryset.aggregate(Sum('amount'))['amount__sum'] or 0,
                'avg_amount': queryset.aggregate(Avg('amount'))['amount__avg'] or 0,
                'max_amount': queryset.aggregate(Max('amount'))['amount__max'] or 0,
                'completion_rate': queryset.filter(is_remitted=True).count() / max(1, queryset.count()),
                'time_metrics': time_metrics
            },
            'trends': {
                'daily': list(queryset.filter(
                    created_at__gte=thirty_days_ago
                ).extra({'date': "date(created_at)"}).values(
                    'date'
                ).annotate(
                    count=Count('id'),
                    amount=Sum('amount'),
                    avg_amount=Avg('amount')
                ).order_by('date')),
                'bill_types': list(queryset.values(
                    'bill_type'
                ).annotate(
                    count=Count('id'),
                    amount=Sum('amount'),
                    avg_time=Avg(F('remittance_date') - F('due_date'))
                ).order_by('-amount'))
            },
            'compliance': {
                'on_time': queryset.filter(
                    Q(is_remitted=True) & 
                    Q(remittance_date__lte=F('due_date'))
                ).count(),
                'late': queryset.filter(
                    Q(is_remitted=True) & 
                    Q(remittance_date__gt=F('due_date'))
                ).count(),
                'overdue': queryset.filter(
                    Q(is_remitted=False) & 
                    Q(due_date__lt=timezone.now())
                ).count(),
                'compliance_rate': (
                    queryset.filter(
                        Q(is_remitted=True) & 
                        Q(remittance_date__lte=F('due_date'))
                    ).count() / 
                    max(1, queryset.filter(is_remitted=True).count())
                ) * 100
            }
        }
        return report
    generate_remittance_report.short_description = "Generate detailed remittance report"
    
    def export_as_json(self, request, queryset):
        """Export report as JSON download"""
        import json
        from django.http import HttpResponse
        
        data = self.generate_remittance_report(request, queryset)
        response = HttpResponse(
            json.dumps(data, indent=2), 
            content_type='application/json'
        )
        response['Content-Disposition'] = 'attachment; filename=remittance_report.json'
        return response
    export_as_json.short_description = "Export report as JSON"
    
    def bulk_remit(self, request, queryset):
        """Bulk mark selected bills as remitted"""
        from payments.services import RemittanceService
        
        updated = 0
        for bill in queryset.filter(is_remitted=False):
            try:
                RemittanceService.process_remittance(bill)
                updated += 1
            except Exception as e:
                self.message_user(request, f"Failed to remit bill {bill.id}: {str(e)}", level='error')
        
        self.message_user(request, f"Successfully remitted {updated} bills")
    bulk_remit.short_description = "Mark as remitted"
    
    def get_urls(self):
        """Add custom report URLs"""
        from django.urls import path
        urls = super().get_urls()
        custom_urls = [
            path('remittance-dashboard/', self.admin_site.admin_view(self.remittance_dashboard),
                name='payments_billpayment_remittance_dashboard'),
            path('remittance-export/', self.admin_site.admin_view(self.export_remittance_data),
                name='payments_billpayment_remittance_export'),
        ]
        return custom_urls + urls
    
    def remittance_dashboard(self, request):
        """Interactive dashboard view"""
        from django.shortcuts import render
        
        # Get all bill payments for dashboard
        queryset = self.get_queryset(request)
        report = self.generate_remittance_report(request, queryset)
        
        context = {
            'report': report,
            'opts': self.model._meta,
            'title': 'Remittance Dashboard'
        }
        return render(request, 'admin/payments/remittance_dashboard.html', context)
    
    def export_remittance_data(self, request):
        """Export full remittance data"""
        from django.http import HttpResponse
        import csv
        
        queryset = self.get_queryset(request)
        response = HttpResponse(content_type='text/csv')
        response['Content-Disposition'] = 'attachment; filename="remittance_data.csv"'
        
        writer = csv.writer(response)
        writer.writerow([
            'ID', 'Customer', 'Biller', 'Amount', 'Currency',
            'Bill Reference', 'Bill Type', 'Due Date', 'Remitted',
            'Remittance Date', 'Days Late'
        ])
        
        for bill in queryset:
            days_late = (bill.remittance_date.date() - bill.due_date).days if \
                bill.is_remitted and bill.due_date else None
            
            writer.writerow([
                bill.id,
                bill.customer.user.email,
                bill.merchant.business_name,
                bill.amount,
                bill.currency,
                bill.bill_reference,
                bill.bill_type,
                bill.due_date,
                'Yes' if bill.is_remitted else 'No',
                bill.remittance_date if bill.is_remitted else '',
                days_late if days_late else ''
            ])
        
        return response

# Update admin site registration
from django.contrib.admin.sites import NotRegistered

try:
    admin.site.unregister(Payment)
except NotRegistered:
    pass

# admin.site.register(Payment, BillPaymentAdmin)

@admin.register(USSDMenu)
class USSDMenuAdmin(admin.ModelAdmin):
    """Admin interface for USSD menu configuration"""
    list_display = ('menu_id', 'menu_type', 'title', 'language', 'is_default', 'is_active', 'updated_at')
    list_filter = ('menu_type', 'language', 'is_default', 'is_active', 'created_at')
    search_fields = ('menu_id', 'title', 'content')
    ordering = ('menu_type', 'language', 'menu_id')

    fieldsets = (
        ('Menu Configuration', {
            'fields': ('menu_id', 'menu_type', 'title', 'content', 'language', 'is_default')
        }),
        ('Navigation', {
            'fields': ('parent_menu', 'timeout_seconds')
        }),
        ('Options', {
            'fields': ('options',),
            'classes': ('collapse',),
            'description': 'JSON format: [{"input": "1", "text": "Option 1", "action": "next_menu"}]'
        }),
        ('Status', {
            'fields': ('is_active',)
        }),
        ('Timestamps', {
            'fields': ('created_at', 'updated_at'),
            'classes': ('collapse',)
        }),
    )

    readonly_fields = ('created_at', 'updated_at')

    def get_queryset(self, request):
        """Show only active menus by default, with option to show all"""
        qs = super().get_queryset(request)
        if request.GET.get('show_all') != '1':
            return qs.filter(is_active=True)
        return qs

    def changelist_view(self, request, extra_context=None):
        """Add custom context to show inactive count"""
        response = super().changelist_view(request, extra_context)
        if hasattr(response, 'context_data') and 'cl' in response.context_data:
            queryset = self.get_queryset(request)
            inactive_count = queryset.filter(is_active=False).count()
            response.context_data['inactive_count'] = inactive_count
        return response

@admin.register(USSDProvider)
class USSDProviderAdmin(admin.ModelAdmin):
    """Admin interface for USSD provider configuration"""
    list_display = ('name', 'provider_type', 'short_code', 'is_active', 'health_status', 'last_health_check')
    list_filter = ('provider_type', 'is_active', 'health_status')
    search_fields = ('name', 'provider_type', 'short_code')
    ordering = ('provider_type', 'name')

    fieldsets = (
        ('Provider Information', {
            'fields': ('name', 'provider_type', 'short_code')
        }),
        ('API Configuration', {
            'fields': ('api_url', 'api_key', 'api_secret'),
            'classes': ('collapse',),
            'description': 'Secure API credentials for provider integration'
        }),
        ('Service Limits', {
            'fields': ('max_session_time', 'max_menu_depth', 'requests_per_minute', 'burst_limit')
        }),
        ('Language Support', {
            'fields': ('supported_languages',)
        }),
        ('Health Monitoring', {
            'fields': ('last_health_check', 'health_status'),
            'classes': ('collapse',)
        }),
        ('Status', {
            'fields': ('is_active',)
        }),
    )

    readonly_fields = ('last_health_check',)

    def get_queryset(self, request):
        """Show only active providers by default"""
        qs = super().get_queryset(request)
        if request.GET.get('show_inactive') != '1':
            return qs.filter(is_active=True)
        return qs

# @admin.register(ReportDashboard)
# class ReportDashboardAdmin(admin.ModelAdmin):
#     change_list_template = 'admin/payments/report_dashboard.html'
#     
#     def changelist_view(self, request, extra_context=None):
#         from payments.services.remittance_service import RemittanceService
#         
#         response = super().changelist_view(
#             request,
#             extra_context=extra_context or {},
#         )
#         
#         # Add visualization data to context
#         if not hasattr(response, 'context_data'):
#             response.context_data = {}
#             
#         response.context_data['visualization_data'] = (
#             RemittanceService.generate_visualization_data()
#         )
#         
#         return response
#     
#     def get_urls(self):
#         from django.urls import path
#         urls = super().get_urls()
#         custom_urls = [
#             path('visualization-data/', self.admin_site.admin_view(
#                 self.visualization_data_api),
#                 name='payment_visualization_data'),
#         ]
#         return custom_urls + urls
#     
#     def visualization_data_api(self, request):
#         """JSON API endpoint for visualization data"""
#         from django.http import JsonResponse
#         from payments.services.remittance_service import RemittanceService
#         
#         date_range = (
#             request.GET.get('start_date'),
#             request.GET.get('end_date')
#         ) if 'start_date' in request.GET else None
#         
#         data = RemittanceService.generate_visualization_data(date_range)
#         return JsonResponse(data)

# Register models with both the default admin and payment analytics admin
payment_analytics_admin = PaymentAnalytics(name='payment_admin')
payment_analytics_admin.register(Payment, PaymentAdmin)

# @admin.register(VerificationConfig)
# class VerificationConfigAdmin(admin.ModelAdmin):
#     list_display = ['provider', 'is_active']
#     actions = ['activate_provider']
#     
#     def activate_provider(self, request, queryset):
#         """Set selected provider as active"""
#         if queryset.count() != 1:
#             self.message_user(request, "Select exactly one provider", messages.ERROR)
#             return
#             
#         provider = queryset.first()
#         settings.PHONE_VERIFICATION_PROVIDER = provider.name
#         self.message_user(request, f"Activated {provider.name} provider")
#     activate_provider.short_description = "Activate selected provider"

