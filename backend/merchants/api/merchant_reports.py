from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework import status, permissions
from rest_framework import viewsets
from django.db.models import Sum, Count, Q, F, Avg, StdDev
from django.db.models.functions import TruncDate, TruncMonth, TruncWeek
from django.utils import timezone
from datetime import datetime, timedelta
from decimal import Decimal
from users.models import Merchant
from payments.models import Transaction, Payment
import calendar

class ReportTemplateViewSet(viewsets.ViewSet):
    """Manage report templates for merchants"""
    permission_classes = [permissions.IsAuthenticated]

    def list(self, request):
        """Get available report templates"""
        merchant = getattr(request.user, 'merchant_profile', None)
        if not merchant:
            return Response({'error': 'Merchant profile not found'}, status=status.HTTP_404_NOT_FOUND)

        templates = [
            {
                'id': 1,
                'name': 'Transaction Summary',
                'description': 'Summary of all transactions for the selected period',
                'report_type': 'transaction',
                'is_default': True,
                'is_active': True,
                'created_at': '2024-01-01T00:00:00Z'
            },
            {
                'id': 2,
                'name': 'Revenue Report',
                'description': 'Detailed revenue analysis and trends',
                'report_type': 'revenue',
                'is_default': False,
                'is_active': True,
                'created_at': '2024-01-01T00:00:00Z'
            },
            {
                'id': 3,
                'name': 'Customer Analysis',
                'description': 'Customer behavior and analytics report',
                'report_type': 'customer',
                'is_default': False,
                'is_active': True,
                'created_at': '2024-01-01T00:00:00Z'
            },
            {
                'id': 4,
                'name': 'Payment Method Performance',
                'description': 'Analysis of payment methods and success rates',
                'report_type': 'payment_methods',
                'is_default': False,
                'is_active': True,
                'created_at': '2024-01-01T00:00:00Z'
            },
            {
                'id': 5,
                'name': 'Geographic Distribution',
                'description': 'Customer geographic distribution analysis',
                'report_type': 'geographic',
                'is_default': False,
                'is_active': True,
                'created_at': '2024-01-01T00:00:00Z'
            }
        ]

        return Response(templates)

    def retrieve(self, request, pk=None):
        """Get specific report template"""
        templates = self.list(request).data
        template = next((t for t in templates if t['id'] == int(pk)), None)
        
        if not template:
            return Response({'error': 'Template not found'}, status=status.HTTP_404_NOT_FOUND)
        
        return Response(template)

class MerchantReportViewSet(viewsets.ViewSet):
    """Manage merchant reports"""
    permission_classes = [permissions.IsAuthenticated]

    def list(self, request):
        """Get merchant reports"""
        merchant = getattr(request.user, 'merchant_profile', None)
        if not merchant:
            return Response({'error': 'Merchant profile not found'}, status=status.HTTP_404_NOT_FOUND)

        # Get reports from database
        from merchants.models import Report
        reports = Report.objects.filter(merchant=merchant).order_by('-created_at')
        
        # Serialize the reports
        serialized_reports = []
        for report in reports:
            report_data = {
                'id': report.id,
                'template': report.template.id if report.template else None,
                'template_name': report.template.name if report.template else 'Unknown',
                'report_type': report.template.report_type if report.template else 'unknown',
                'format': report.format,
                'status': report.status,
                'start_date': report.start_date.isoformat() if report.start_date else None,
                'end_date': report.end_date.isoformat() if report.end_date else None,
                'created_at': report.created_at.isoformat(),
                'completed_at': report.completed_at.isoformat() if report.completed_at else None,
                'file_url': report.file_url,
                'file_size': report.file_size,
                'total_records': report.total_records,
                'progress': report.progress
            }
            serialized_reports.append(report_data)

        return Response(serialized_reports)

    def create(self, request):
        """Generate new merchant report"""
        merchant = getattr(request.user, 'merchant_profile', None)
        if not merchant:
            return Response({'error': 'Merchant profile not found'}, status=status.HTTP_404_NOT_FOUND)

        template_id = request.data.get('template')
        format_type = request.data.get('format', 'pdf')
        start_date = request.data.get('start_date')
        end_date = request.data.get('end_date')

        # Generate report based on template
        report_data = self._generate_report_data(merchant, template_id, start_date, end_date)
        
        # Create report record
        report = {
            'id': 3,
            'template': template_id,
            'template_name': self._get_template_name(template_id),
            'report_type': self._get_report_type(template_id),
            'format': format_type,
            'status': 'generating',
            'start_date': start_date,
            'end_date': end_date,
            'created_at': timezone.now().isoformat(),
            'progress': 0
        }

        return Response(report, status=status.HTTP_201_CREATED)

    def retrieve(self, request, pk=None):
        """Get specific report"""
        reports = self.list(request).data
        report = next((r for r in reports if r['id'] == int(pk)), None)
        
        if not report:
            return Response({'error': 'Report not found'}, status=status.HTTP_404_NOT_FOUND)
        
        return Response(report)

    def _generate_report_data(self, merchant, template_id, start_date, end_date):
        """Generate report data based on template"""
        report_type = self._get_report_type(template_id)
        
        if report_type == 'transaction':
            return self._generate_transaction_report(merchant, start_date, end_date)
        elif report_type == 'revenue':
            return self._generate_revenue_report(merchant, start_date, end_date)
        elif report_type == 'customer':
            return self._generate_customer_report(merchant, start_date, end_date)
        elif report_type == 'payment_methods':
            return self._generate_payment_methods_report(merchant, start_date, end_date)
        elif report_type == 'geographic':
            return self._generate_geographic_report(merchant, start_date, end_date)
        else:
            return {}

    def _get_template_name(self, template_id):
        """Get template name by ID"""
        templates = {
            1: 'Transaction Summary',
            2: 'Revenue Report',
            3: 'Customer Analysis',
            4: 'Payment Method Performance',
            5: 'Geographic Distribution'
        }
        return templates.get(template_id, 'Unknown Template')

    def _get_report_type(self, template_id):
        """Get report type by template ID"""
        types = {
            1: 'transaction',
            2: 'revenue',
            3: 'customer',
            4: 'payment_methods',
            5: 'geographic'
        }
        return types.get(template_id, 'unknown')

    def _generate_transaction_report(self, merchant, start_date, end_date):
        """Generate transaction report"""
        queryset = Transaction.objects.filter(
            merchant=merchant,
            created_at__gte=start_date,
            created_at__lte=end_date
        )

        total_transactions = queryset.count()
        completed_transactions = queryset.filter(status='completed').count()
        failed_transactions = queryset.filter(status='failed').count()
        total_amount = queryset.aggregate(Sum('amount'))['amount__sum'] or Decimal('0')
        
        success_rate = (completed_transactions / total_transactions * 100) if total_transactions > 0 else 0
        avg_transaction = (total_amount / total_transactions) if total_transactions > 0 else Decimal('0')

        return {
            'total_transactions': total_transactions,
            'completed_transactions': completed_transactions,
            'failed_transactions': failed_transactions,
            'success_rate': round(success_rate, 2),
            'total_amount': float(total_amount),
            'avg_transaction': float(avg_transaction),
            'transactions': list(queryset.values(
                'id', 'amount', 'currency', 'status', 'created_at',
                'customer__user__first_name', 'customer__user__last_name'
            )[:100])  # Limit to 100 for performance
        }

    def _generate_revenue_report(self, merchant, start_date, end_date):
        """Generate revenue report"""
        queryset = Transaction.objects.filter(
            merchant=merchant,
            status='completed',
            created_at__gte=start_date,
            created_at__lte=end_date
        )

        # Daily revenue
        daily_revenue = queryset.annotate(
            date=TruncDate('created_at')
        ).values('date').annotate(
            total=Sum('amount'),
            count=Count('id')
        ).order_by('date')

        # Payment method breakdown
        payment_methods = queryset.values(
            'payment_method__method_type'
        ).annotate(
            total=Sum('amount'),
            count=Count('id')
        ).order_by('-total')

        total_revenue = queryset.aggregate(Sum('amount'))['amount__sum'] or Decimal('0')

        return {
            'total_revenue': float(total_revenue),
            'daily_revenue': list(daily_revenue),
            'payment_methods': list(payment_methods),
            'growth_rate': self._calculate_growth_rate(merchant, start_date, end_date)
        }

    def _generate_customer_report(self, merchant, start_date, end_date):
        """Generate customer analytics report"""
        queryset = Transaction.objects.filter(
            merchant=merchant,
            created_at__gte=start_date,
            created_at__lte=end_date
        )

        # Customer demographics
        unique_customers = queryset.values('customer').distinct().count()
        new_customers = queryset.filter(
            customer__user__date_joined__gte=start_date
        ).values('customer').distinct().count()
        returning_customers = unique_customers - new_customers

        # Customer behavior
        avg_transactions_per_customer = queryset.count() / unique_customers if unique_customers > 0 else 0
        avg_value_per_customer = queryset.aggregate(Sum('amount'))['amount__sum'] / unique_customers if unique_customers > 0 else 0

        # Top customers
        top_customers = queryset.values('customer__user__first_name', 'customer__user__last_name').annotate(
            total_spent=Sum('amount'),
            transaction_count=Count('id')
        ).order_by('-total_spent')[:10]

        return {
            'unique_customers': unique_customers,
            'new_customers': new_customers,
            'returning_customers': returning_customers,
            'retention_rate': round((returning_customers / unique_customers * 100) if unique_customers > 0 else 0, 2),
            'avg_transactions_per_customer': round(avg_transactions_per_customer, 2),
            'avg_value_per_customer': float(avg_value_per_customer),
            'top_customers': list(top_customers)
        }

    def _generate_payment_methods_report(self, merchant, start_date, end_date):
        """Generate payment methods performance report"""
        queryset = Transaction.objects.filter(
            merchant=merchant,
            created_at__gte=start_date,
            created_at__lte=end_date
        )

        payment_methods = queryset.values('payment_method__method_type').annotate(
            total_transactions=Count('id'),
            completed_transactions=Count('id', filter=Q(status='completed')),
            total_amount=Sum('amount'),
            completed_amount=Sum('amount', filter=Q(status='completed'))
        ).order_by('-total_amount')

        # Calculate success rates
        for method in payment_methods:
            success_rate = (method['completed_transactions'] / method['total_transactions'] * 100) if method['total_transactions'] > 0 else 0
            method['success_rate'] = round(success_rate, 2)

        return {
            'payment_methods': list(payment_methods),
            'most_used_method': payment_methods.first()['payment_method__method_type'] if payment_methods else None,
            'highest_success_rate': max([m['success_rate'] for m in payment_methods]) if payment_methods else 0
        }

    def _generate_geographic_report(self, merchant, start_date, end_date):
        """Generate geographic distribution report"""
        queryset = Transaction.objects.filter(
            merchant=merchant,
            created_at__gte=start_date,
            created_at__lte=end_date
        )

        # Geographic distribution (mock - would need location data)
        regions = [
            {'region': 'Greater Accra', 'customers': 1234, 'revenue': 567890.12, 'avg_order_value': 460.12},
            {'region': 'Ashanti', 'customers': 567, 'revenue': 345678.23, 'avg_order_value': 609.48},
            {'region': 'Western', 'customers': 345, 'revenue': 198765.43, 'avg_order_value': 576.13},
            {'region': 'Eastern', 'customers': 234, 'revenue': 123456.78, 'avg_order_value': 527.68},
            {'region': 'Other', 'customers': 467, 'revenue': 98777.33, 'avg_order_value': 211.51}
        ]

        return {
            'regions': regions,
            'top_region': max(regions, key=lambda x: x['revenue'])['region'],
            'total_regions': len(regions)
        }

    def _calculate_growth_rate(self, merchant, start_date, end_date):
        """Calculate growth rate compared to previous period"""
        # Calculate previous period dates
        start = datetime.strptime(start_date, '%Y-%m-%d')
        end = datetime.strptime(end_date, '%Y-%m-%d')
        period_days = (end - start).days
        
        prev_start = start - timedelta(days=period_days)
        prev_end = end - timedelta(days=period_days)

        # Current period revenue
        current_revenue = Transaction.objects.filter(
            merchant=merchant,
            status='completed',
            created_at__gte=start_date,
            created_at__lte=end_date
        ).aggregate(Sum('amount'))['amount__sum'] or Decimal('0')

        # Previous period revenue
        previous_revenue = Transaction.objects.filter(
            merchant=merchant,
            status='completed',
            created_at__gte=prev_start.strftime('%Y-%m-%d'),
            created_at__lte=prev_end.strftime('%Y-%m-%d')
        ).aggregate(Sum('amount'))['amount__sum'] or Decimal('0')

        # Calculate growth rate
        if previous_revenue > 0:
            growth_rate = ((current_revenue - previous_revenue) / previous_revenue * 100)
        else:
            growth_rate = 0

        return round(float(growth_rate), 2)

class RegenerateReportView(APIView):
    """Regenerate an existing report"""
    permission_classes = [permissions.IsAuthenticated]

    def post(self, request, report_id):
        """Regenerate report"""
        merchant = getattr(request.user, 'merchant', None)
        if not merchant:
            return Response({'error': 'Merchant profile not found'}, status=status.HTTP_404_NOT_FOUND)

        # Find and regenerate report
        # In production would update database record
        return Response({'message': 'Report regeneration started'})

class CancelReportView(APIView):
    """Cancel report generation"""
    permission_classes = [permissions.IsAuthenticated]

    def post(self, request, report_id):
        """Cancel report generation"""
        merchant = getattr(request.user, 'merchant', None)
        if not merchant:
            return Response({'error': 'Merchant profile not found'}, status=status.HTTP_404_NOT_FOUND)

        # Cancel report
        # In production would update database record
        return Response({'message': 'Report cancelled'})

class DeleteReportView(APIView):
    """Delete a report"""
    permission_classes = [permissions.IsAuthenticated]

    def delete(self, request, report_id):
        """Delete report"""
        merchant = getattr(request.user, 'merchant', None)
        if not merchant:
            return Response({'error': 'Merchant profile not found'}, status=status.HTTP_404_NOT_FOUND)

        # Delete report
        # In production would delete database record
        return Response({'message': 'Report deleted'})

class DownloadReportView(APIView):
    """Download a report"""
    permission_classes = [permissions.IsAuthenticated]

    def get(self, request, report_id):
        """Download report file"""
        merchant = getattr(request.user, 'merchant', None)
        if not merchant:
            return Response({'error': 'Merchant profile not found'}, status=status.HTTP_404_NOT_FOUND)

        # Generate and return report file
        # In production would serve actual file
        return Response({'message': 'Report download started'})

class ScheduledReportViewSet(viewsets.ViewSet):
    """Manage scheduled reports"""
    permission_classes = [permissions.IsAuthenticated]

    def list(self, request):
        """Get scheduled reports"""
        merchant = getattr(request.user, 'merchant_profile', None)
        if not merchant:
            return Response({'error': 'Merchant profile not found'}, status=status.HTTP_404_NOT_FOUND)

        # Get scheduled reports from database
        from merchants.models import ScheduledReport
        scheduled_reports = ScheduledReport.objects.filter(merchant=merchant).order_by('-created_at')
        
        # Serialize the scheduled reports
        serialized_scheduled_reports = []
        for scheduled_report in scheduled_reports:
            report_data = {
                'id': scheduled_report.id,
                'name': scheduled_report.name,
                'template': scheduled_report.template.id if scheduled_report.template else None,
                'template_name': scheduled_report.template.name if scheduled_report.template else 'Unknown',
                'frequency': scheduled_report.frequency,
                'next_run': scheduled_report.next_run.isoformat() if scheduled_report.next_run else None,
                'last_run': scheduled_report.last_run.isoformat() if scheduled_report.last_run else None,
                'status': scheduled_report.status,
                'email_recipients': scheduled_report.email_recipients,
                'created_at': scheduled_report.created_at.isoformat()
            }
            serialized_scheduled_reports.append(report_data)

        return Response(serialized_scheduled_reports)

    def create(self, request):
        """Create new scheduled report"""
        merchant = getattr(request.user, 'merchant_profile', None)
        if not merchant:
            return Response({'error': 'Merchant profile not found'}, status=status.HTTP_404_NOT_FOUND)

        name = request.data.get('name')
        template = request.data.get('template')
        frequency = request.data.get('frequency')
        email_recipients = request.data.get('email_recipients', [])

        # Create scheduled report
        # In production would create database record
        scheduled_report = {
            'id': 3,
            'name': name,
            'template': template,
            'frequency': frequency,
            'next_run': self._calculate_next_run(frequency),
            'status': 'active',
            'email_recipients': email_recipients,
            'created_at': timezone.now().isoformat()
        }

        return Response(scheduled_report, status=status.HTTP_201_CREATED)

    def _calculate_next_run(self, frequency):
        """Calculate next run time based on frequency"""
        now = timezone.now()
        
        if frequency == 'daily':
            next_run = now + timedelta(days=1)
        elif frequency == 'weekly':
            next_run = now + timedelta(weeks=1)
        elif frequency == 'monthly':
            # Add approximately one month
            if now.month == 12:
                next_run = now.replace(year=now.year + 1, month=1)
            else:
                next_run = now.replace(month=now.month + 1)
        elif frequency == 'quarterly':
            # Add approximately three months
            if now.month > 9:
                next_run = now.replace(year=now.year + 1, month=(now.month - 9) % 12 + 1)
            else:
                next_run = now.replace(month=now.month + 3)
        else:
            next_run = now + timedelta(days=1)

        return next_run.isoformat()

class PauseScheduledReportView(APIView):
    """Pause scheduled report"""
    permission_classes = [permissions.IsAuthenticated]

    def post(self, request, report_id):
        """Pause scheduled report"""
        merchant = getattr(request.user, 'merchant', None)
        if not merchant:
            return Response({'error': 'Merchant profile not found'}, status=status.HTTP_404_NOT_FOUND)

        # Pause scheduled report
        # In production would update database record
        return Response({'message': 'Scheduled report paused'})

class ResumeScheduledReportView(APIView):
    """Resume scheduled report"""
    permission_classes = [permissions.IsAuthenticated]

    def post(self, request, report_id):
        """Resume scheduled report"""
        merchant = getattr(request.user, 'merchant', None)
        if not merchant:
            return Response({'error': 'Merchant profile not found'}, status=status.HTTP_404_NOT_FOUND)

        # Resume scheduled report
        # In production would update database record
        return Response({'message': 'Scheduled report resumed'})

class RunScheduledReportNowView(APIView):
    """Run scheduled report immediately"""
    permission_classes = [permissions.IsAuthenticated]

    def post(self, request, report_id):
        """Run scheduled report immediately"""
        merchant = getattr(request.user, 'merchant', None)
        if not merchant:
            return Response({'error': 'Merchant profile not found'}, status=status.HTTP_404_NOT_FOUND)

        # Run scheduled report immediately
        # In production would trigger background job
        return Response({'message': 'Scheduled report execution started'})

class DeleteScheduledReportView(APIView):
    """Delete scheduled report"""
    permission_classes = [permissions.IsAuthenticated]

    def delete(self, request, report_id):
        """Delete scheduled report"""
        merchant = getattr(request.user, 'merchant', None)
        if not merchant:
            return Response({'error': 'Merchant profile not found'}, status=status.HTTP_404_NOT_FOUND)

        # Delete scheduled report
        # In production would delete database record
        return Response({'message': 'Scheduled report deleted'})
