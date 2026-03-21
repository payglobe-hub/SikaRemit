from django.template.loader import render_to_string
from django.http import HttpResponse
from django.db.models import Sum
from .models.payment import Payment
from datetime import datetime, timedelta
import csv
import xlsxwriter
import io

class PaymentReporter:
    """
    Generates customizable payment reports in multiple formats
    """
    
    def __init__(self, queryset=None):
        self.queryset = queryset or Payment.objects.all()
    
    def generate_html_report(self, template='payments/report_template.html', context=None):
        """Generate HTML report using Django template"""
        context = context or self._get_default_context()
        return render_to_string(template, context)
    
    def generate_pdf_report(self):
        """Generate PDF report (requires reportlab)"""
        from reportlab.pdfgen import canvas
        from reportlab.lib.pagesizes import letter
        
        buffer = io.BytesIO()
        p = canvas.Canvas(buffer, pagesize=letter)
        
        # PDF generation logic
        p.drawString(100, 750, "Payment Report")
        p.drawString(100, 730, f"Generated: {datetime.now().strftime('%Y-%m-%d')}")
        
        y = 700
        for payment in self.queryset[:50]:  # First page only
            p.drawString(100, y, f"Payment #{payment.id}: {payment.amount} {payment.currency}")
            y -= 20
            
        p.showPage()
        p.save()
        buffer.seek(0)
        return buffer
    
    def generate_excel_report(self):
        """Generate Excel report"""
        output = io.BytesIO()
        workbook = xlsxwriter.Workbook(output)
        worksheet = workbook.add_worksheet()
        
        # Excel formatting
        header_format = workbook.add_format({'bold': True, 'bg_color': '#D7E4BC'})
        
        # Write data
        worksheet.write_row(0, 0, ["ID", "Date", "Customer", "Amount", "Status"], header_format)
        
        for row, payment in enumerate(self.queryset, start=1):
            worksheet.write(row, 0, payment.id)
            worksheet.write(row, 1, payment.created_at.strftime('%Y-%m-%d'))
            worksheet.write(row, 2, str(payment.customer))
            worksheet.write(row, 3, float(payment.amount))
            worksheet.write(row, 4, payment.get_status_display())
        
        workbook.close()
        output.seek(0)
        return output
    
    def _get_default_context(self):
        """Default report context data"""
        last_30_days = datetime.now() - timedelta(days=30)
        
        return {
            'payments': self.queryset,
            'total_amount': self.queryset.aggregate(Sum('amount'))['amount__sum'],
            'payment_count': self.queryset.count(),
            'recent_payments': self.queryset.filter(created_at__gte=last_30_days),
            'generated_at': datetime.now()
        }

# Admin view for custom reports
def custom_report_view(request):
    date_from = request.GET.get('date_from')
    date_to = request.GET.get('date_to')
    status = request.GET.get('status')
    format = request.GET.get('format', 'html')
    
    queryset = Payment.objects.all()
    
    if date_from:
        queryset = queryset.filter(created_at__gte=date_from)
    if date_to:
        queryset = queryset.filter(created_at__lte=date_to)
    if status:
        queryset = queryset.filter(status=status)
    
    reporter = PaymentReporter(queryset)
    
    if format == 'pdf':
        response = HttpResponse(content_type='application/pdf')
        response['Content-Disposition'] = 'attachment; filename="payment_report.pdf"'
        response.write(reporter.generate_pdf_report().read())
        return response
    elif format == 'excel':
        response = HttpResponse(content_type='application/vnd.ms-excel')
        response['Content-Disposition'] = 'attachment; filename="payment_report.xlsx"'
        response.write(reporter.generate_excel_report().read())
        return response
    else:
        return HttpResponse(reporter.generate_html_report())
