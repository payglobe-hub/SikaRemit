from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework import status, viewsets
from accounts.permissions import IsAdminUser
from rest_framework.decorators import api_view, permission_classes, action
from rest_framework import serializers
from django.db.models import Count, Sum
from django.utils import timezone
from datetime import datetime, timedelta
from django.http import HttpResponse
from django.template.loader import render_to_string
import csv
import xlsxwriter
import io
from payments.models import Transaction, Payment
from users.models import Customer, Merchant
from accounts.models import User
from core.api_utils import api_success
from .models_reports import AdminReport

class AdminReportSerializer(serializers.ModelSerializer):
    """Serializer for AdminReport model"""
    class Meta:
        model = AdminReport
        fields = [
            'id', 'admin_user', 'report_type', 'format', 'status',
            'date_from', 'date_to', 'total_records', 'file_url',
            'file_size', 'created_at', 'completed_at', 'progress',
            'include_charts', 'include_summary', 'filters'
        ]
        read_only_fields = ['id', 'created_at', 'completed_at']

class AdminReportViewSet(viewsets.ModelViewSet):
    """Admin viewset for managing generated reports"""
    permission_classes = [IsAdminUser]

    def get_queryset(self):
        """Return actual reports from database"""
        from .models_reports import AdminReport
        return AdminReport.objects.all().order_by('-created_at')

    def list(self, request):
        """List generated reports"""
        queryset = self.get_queryset()
        serializer = AdminReportSerializer(queryset, many=True)
        return Response(serializer.data)

    def retrieve(self, request, pk=None):
        """Retrieve a specific report"""
        try:
            report = self.get_queryset().get(pk=pk)
            serializer = AdminReportSerializer(report)
            return Response(serializer.data)
        except AdminReport.DoesNotExist:
            return Response({"error": "Report not found"}, status=404)

    def destroy(self, request, pk=None):
        """Delete a report"""
        try:
            report = self.get_queryset().get(pk=pk)
            report.delete()
            return Response({"message": "Report deleted successfully"})
        except AdminReport.DoesNotExist:
            return Response({"error": "Report not found"}, status=404)

@api_view(['POST'])
@permission_classes([IsAdminUser])
def generate_admin_report(request):
    """Generate admin reports in various formats"""

    report_type = request.data.get('report_type', 'payments')
    format_type = request.data.get('format', 'pdf')
    date_from = request.data.get('date_from')
    date_to = request.data.get('date_to')

    # Generate report data based on type
    if report_type == 'transactions':
        data = generate_transaction_report(date_from, date_to)
    elif report_type == 'users':
        data = generate_user_report(date_from, date_to)
    elif report_type == 'revenue':
        data = generate_revenue_report(date_from, date_to)
    elif report_type == 'payments':
        data = generate_payment_report(date_from, date_to)
    else:
        return Response({"error": "Invalid report type"}, status=400)

    # Return report in requested format
    if format_type == 'pdf':
        return generate_pdf_response(data, report_type)
    elif format_type == 'excel':
        return generate_excel_response(data, report_type)
    elif format_type == 'csv':
        return generate_csv_response(data, report_type)
    else:
        return Response({"error": "Invalid format"}, status=400)

@api_view(['GET'])
@permission_classes([IsAdminUser])
def get_admin_report_stats(request):
    """Get statistics for admin reports"""
    report_type = request.query_params.get('report_type')
    date_from = request.query_params.get('date_from')
    date_to = request.query_params.get('date_to')

    # Base queryset with date filtering
    queryset = Transaction.objects.all()
    if date_from:
        queryset = queryset.filter(created_at__gte=date_from)
    if date_to:
        queryset = queryset.filter(created_at__lte=date_to)

    total_count = queryset.count()
    total_amount = queryset.aggregate(Sum('amount'))['amount__sum'] or 0
    
    # Calculate by_status breakdown
    by_status = {}
    status_counts = queryset.values('status').annotate(count=Count('id'))
    for item in status_counts:
        by_status[item['status'] or 'unknown'] = item['count']
    
    # If no status data, provide defaults
    if not by_status:
        by_status = {'pending': 0, 'completed': 0, 'failed': 0}

    stats = {
        'total_transactions': total_count,
        'total_amount': float(total_amount) if total_amount else 0,
        'average_amount': float(total_amount / total_count) if total_count > 0 else 0,
        'total_users': Customer.objects.count() + Merchant.objects.count(),
        'period_days': calculate_period_days(date_from, date_to),
        'report_type': report_type or 'all',
        'by_status': by_status
    }

    return api_success(stats, request=request)

def generate_transaction_report(date_from=None, date_to=None):
    """Generate transaction report data"""
    queryset = Transaction.objects.select_related('customer', 'merchant').all()

    if date_from:
        queryset = queryset.filter(created_at__gte=date_from)
    if date_to:
        queryset = queryset.filter(created_at__lte=date_to)

    return {
        'title': 'Transaction Report',
        'generated_at': datetime.now(),
        'date_from': date_from,
        'date_to': date_to,
        'transactions': list(queryset.values(
            'id', 'amount', 'currency', 'status', 'created_at',
            'customer__user__first_name', 'customer__user__last_name',
            'merchant__business_name'
        )),
        'summary': {
            'total_count': queryset.count(),
            'total_amount': queryset.aggregate(Sum('amount'))['amount__sum'] or 0,
            'completed_count': queryset.filter(status='completed').count(),
            'pending_count': queryset.filter(status='pending').count()
        }
    }

def generate_user_report(date_from=None, date_to=None):
    """Generate user report data"""
    customers = Customer.objects.select_related('user').all()
    merchants = Merchant.objects.select_related('user').all()

    return {
        'title': 'User Report',
        'generated_at': datetime.now(),
        'customers': list(customers.values(
            'user__first_name', 'user__last_name', 'user__email',
            'user__date_joined', 'user__phone'
        )),
        'merchants': list(merchants.values(
            'user__first_name', 'user__last_name', 'user__email',
            'business_name', 'user__date_joined'
        )),
        'summary': {
            'total_customers': customers.count(),
            'total_merchants': merchants.count(),
            'total_users': customers.count() + merchants.count()
        }
    }

def generate_revenue_report(date_from=None, date_to=None):
    """Generate revenue report data"""
    from django.db.models.functions import TruncDate
    
    queryset = Transaction.objects.filter(status='completed')

    if date_from:
        queryset = queryset.filter(created_at__gte=date_from)
    if date_to:
        queryset = queryset.filter(created_at__lte=date_to)

    daily_revenue = queryset.annotate(
        date=TruncDate('created_at')
    ).values('date').annotate(
        total=Sum('amount'),
        count=Count('id')
    ).order_by('date')

    total_amount = queryset.aggregate(Sum('amount'))['amount__sum'] or 0
    total_count = queryset.count()

    return {
        'title': 'Revenue Report',
        'generated_at': datetime.now(),
        'date_from': date_from,
        'date_to': date_to,
        'daily_revenue': list(daily_revenue),
        'summary': {
            'total_revenue': float(total_amount),
            'total_transactions': total_count,
            'avg_transaction': float(total_amount / max(total_count, 1))
        }
    }

def generate_payment_report(date_from=None, date_to=None):
    """Generate payment report data"""
    queryset = Payment.objects.select_related('customer', 'payment_method').all()

    if date_from:
        queryset = queryset.filter(created_at__gte=date_from)
    if date_to:
        queryset = queryset.filter(created_at__lte=date_to)

    return {
        'title': 'Payment Report',
        'generated_at': datetime.now(),
        'date_from': date_from,
        'date_to': date_to,
        'payments': list(queryset.values(
            'id', 'amount', 'currency', 'status', 'created_at',
            'customer__user__first_name', 'customer__user__last_name',
            'payment_method__method_type'
        )),
        'summary': {
            'total_count': queryset.count(),
            'total_amount': queryset.aggregate(Sum('amount'))['amount__sum'] or 0,
            'completed_count': queryset.filter(status='completed').count(),
            'failed_count': queryset.filter(status='failed').count()
        }
    }

def generate_pdf_response(data, report_type):
    """Generate PDF response"""
    from reportlab.pdfgen import canvas
    from reportlab.lib.pagesizes import letter

    buffer = io.BytesIO()
    p = canvas.Canvas(buffer, pagesize=letter)

    # PDF generation logic
    p.drawString(100, 750, f"{data['title']}")
    p.drawString(100, 730, f"Generated: {data['generated_at'].strftime('%Y-%m-%d %H:%M')}")
    p.drawString(100, 710, f"Period: {data.get('date_from', 'All time')} to {data.get('date_to', 'Present')}")

    y = 680
    if 'summary' in data:
        p.drawString(100, y, "Summary:")
        y -= 20
        for key, value in data['summary'].items():
            p.drawString(120, y, f"{key.replace('_', ' ').title()}: {value}")
            y -= 15

    p.showPage()
    p.save()
    buffer.seek(0)

    response = HttpResponse(content_type='application/pdf')
    response['Content-Disposition'] = f'attachment; filename="{report_type}_report.pdf"'
    response.write(buffer.read())
    return response

def generate_excel_response(data, report_type):
    """Generate Excel response"""
    output = io.BytesIO()
    workbook = xlsxwriter.Workbook(output)
    worksheet = workbook.add_worksheet()

    # Formatting
    header_format = workbook.add_format({'bold': True, 'bg_color': '#D7E4BC'})

    # Write summary
    if 'summary' in data:
        worksheet.write_row(0, 0, ["Summary"], header_format)
        row = 1
        for key, value in data['summary'].items():
            worksheet.write(row, 0, key.replace('_', ' ').title())
            worksheet.write(row, 1, value)
            row += 1

    # Write data
    if 'transactions' in data:
        worksheet.write_row(row + 2, 0, ["Transactions"], header_format)
        worksheet.write_row(row + 3, 0, ["ID", "Amount", "Currency", "Status", "Customer", "Created"])
        for i, transaction in enumerate(data['transactions'][:1000]):  # Limit to 1000 rows
            worksheet.write(row + 4 + i, 0, transaction['id'])
            worksheet.write(row + 4 + i, 1, float(transaction['amount']))
            worksheet.write(row + 4 + i, 2, transaction['currency'])
            worksheet.write(row + 4 + i, 3, transaction['status'])
            worksheet.write(row + 4 + i, 4, f"{transaction['customer__user__first_name']} {transaction['customer__user__last_name']}")
            worksheet.write(row + 4 + i, 5, transaction['created_at'])

    workbook.close()
    output.seek(0)

    response = HttpResponse(content_type='application/vnd.ms-excel')
    response['Content-Disposition'] = f'attachment; filename="{report_type}_report.xlsx"'
    response.write(output.read())
    return response

def generate_csv_response(data, report_type):
    """Generate CSV response"""
    response = HttpResponse(content_type='text/csv')
    response['Content-Disposition'] = f'attachment; filename="{report_type}_report.csv"'

    writer = csv.writer(response)

    # Write summary
    if 'summary' in data:
        writer.writerow(['Summary'])
        for key, value in data['summary'].items():
            writer.writerow([key.replace('_', ' ').title(), value])
        writer.writerow([])

    # Write data
    if 'transactions' in data:
        writer.writerow(['Transactions'])
        writer.writerow(['ID', 'Amount', 'Currency', 'Status', 'Customer', 'Created'])
        for transaction in data['transactions'][:1000]:  # Limit to 1000 rows
            writer.writerow([
                transaction['id'],
                transaction['amount'],
                transaction['currency'],
                transaction['status'],
                f"{transaction['customer__user__first_name']} {transaction['customer__user__last_name']}",
                transaction['created_at']
            ])

    return response

def calculate_period_days(date_from, date_to):
    """Calculate the number of days in the reporting period"""
    if not date_from or not date_to:
        return 30  # Default to 30 days

    try:
        from_date = datetime.fromisoformat(date_from)
        to_date = datetime.fromisoformat(date_to)
        return (to_date - from_date).days
    except:
        return 30
