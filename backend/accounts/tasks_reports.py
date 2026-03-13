from celery import shared_task
from django.core.mail import send_mail
from django.conf import settings
from django.utils import timezone
from .models_reports import CustomerStatement, MerchantReport, AdminReport, ReportGenerationJob
import logging
import uuid
import io
import xlsxwriter
from reportlab.pdfgen import canvas
from reportlab.lib.pagesizes import letter
from channels.layers import get_channel_layer

logger = logging.getLogger(__name__)


# Report Generation Tasks

@shared_task(bind=True, max_retries=3)
def generate_customer_statement(self, statement_id):
    """Generate customer statement in background"""
    try:
        statement = CustomerStatement.objects.get(id=statement_id)
        
        # Update job status
        job, created = ReportGenerationJob.objects.get_or_create(
            job_type='customer_statement',
            object_id=statement_id,
            defaults={'status': 'processing'}
        )
        
        if not created:
            job.status = 'processing'
            job.progress = 0
            job.save()
        
        # Send update notification
        _send_report_update(str(statement_id), {
            'status': 'processing',
            'progress': 0,
            'message': 'Starting statement generation...'
        })
        
        # Generate statement data
        statement_data = _generate_statement_data(statement)
        
        # Update progress
        job.progress = 25
        job.save()
        _send_report_update(str(statement_id), {
            'status': 'processing',
            'progress': 25,
            'message': 'Data collection complete...'
        })
        
        # Generate file based on format
        if statement.format == 'pdf':
            file_url, file_size = _generate_pdf_statement(statement, statement_data)
        elif statement.format == 'excel':
            file_url, file_size = _generate_excel_statement(statement, statement_data)
        else:
            raise ValueError(f"Unsupported format: {statement.format}")
        
        # Update progress
        job.progress = 90
        job.save()
        _send_report_update(str(statement_id), {
            'status': 'processing',
            'progress': 90,
            'message': 'File generation complete...'
        })
        
        # Update statement
        statement.file_url = file_url
        statement.file_size = file_size
        statement.status = 'completed'
        statement.generated_at = timezone.now()
        statement.save()
        
        # Complete job
        job.status = 'completed'
        job.progress = 100
        job.completed_at = timezone.now()
        job.save()
        
        # Send completion notification
        _send_report_completed(str(statement_id), {
            'status': 'completed',
            'file_url': file_url,
            'file_size': file_size
        })
        
        logger.info(f"Customer statement {statement_id} generated successfully")
        
    except Exception as e:
        logger.error(f"Error generating customer statement {statement_id}: {str(e)}")
        
        # Update statement status
        try:
            statement = CustomerStatement.objects.get(id=statement_id)
            statement.status = 'failed'
            statement.save()
            
            # Update job status
            job = ReportGenerationJob.objects.get(
                job_type='customer_statement',
                object_id=statement_id
            )
            job.status = 'failed'
            job.error_message = str(e)
            job.completed_at = timezone.now()
            job.save()
            
            # Send failure notification
            _send_report_failed(str(statement_id), {
                'status': 'failed',
                'error': str(e)
            })
            
        except Exception:
            pass
        
        raise self.retry(exc=e, countdown=60 * (2 ** self.request.retries))


@shared_task(bind=True, max_retries=3)
def generate_merchant_report(self, report_id):
    """Generate merchant report in background"""
    try:
        report = MerchantReport.objects.get(id=report_id)
        
        # Update job status
        job, created = ReportGenerationJob.objects.get_or_create(
            job_type='merchant_report',
            object_id=report_id,
            defaults={'status': 'processing'}
        )
        
        if not created:
            job.status = 'processing'
            job.progress = 0
            job.save()
        
        # Send update notification
        _send_report_update(str(report_id), {
            'status': 'processing',
            'progress': 0,
            'message': 'Starting report generation...'
        })
        
        # Generate report data
        report_data = _generate_merchant_report_data(report)
        
        # Update progress
        job.progress = 50
        job.save()
        _send_report_update(str(report_id), {
            'status': 'processing',
            'progress': 50,
            'message': 'Data collection complete...'
        })
        
        # Generate file based on format
        if report.format == 'pdf':
            file_url, file_size = _generate_pdf_merchant_report(report, report_data)
        elif report.format == 'excel':
            file_url, file_size = _generate_excel_merchant_report(report, report_data)
        elif report.format == 'csv':
            file_url, file_size = _generate_csv_merchant_report(report, report_data)
        else:
            raise ValueError(f"Unsupported format: {report.format}")
        
        # Update progress
        job.progress = 90
        job.save()
        _send_report_update(str(report_id), {
            'status': 'processing',
            'progress': 90,
            'message': 'File generation complete...'
        })
        
        # Update report
        report.file_url = file_url
        report.file_size = file_size
        report.status = 'completed'
        report.completed_at = timezone.now()
        report.save()
        
        # Complete job
        job.status = 'completed'
        job.progress = 100
        job.completed_at = timezone.now()
        job.save()
        
        # Send completion notification
        _send_report_completed(str(report_id), {
            'status': 'completed',
            'file_url': file_url,
            'file_size': file_size
        })
        
        logger.info(f"Merchant report {report_id} generated successfully")
        
    except Exception as e:
        logger.error(f"Error generating merchant report {report_id}: {str(e)}")
        
        # Update report status
        try:
            report = MerchantReport.objects.get(id=report_id)
            report.status = 'failed'
            report.error_message = str(e)
            report.save()
            
            # Update job status
            job = ReportGenerationJob.objects.get(
                job_type='merchant_report',
                object_id=report_id
            )
            job.status = 'failed'
            job.error_message = str(e)
            job.completed_at = timezone.now()
            job.save()
            
            # Send failure notification
            _send_report_failed(str(report_id), {
                'status': 'failed',
                'error': str(e)
            })
            
        except Exception:
            pass
        
        raise self.retry(exc=e, countdown=60 * (2 ** self.request.retries))


@shared_task(bind=True, max_retries=3)
def generate_admin_report(self, report_id):
    """Generate admin report in background"""
    try:
        report = AdminReport.objects.get(id=report_id)
        
        # Update job status
        job, created = ReportGenerationJob.objects.get_or_create(
            job_type='admin_report',
            object_id=report_id,
            defaults={'status': 'processing'}
        )
        
        if not created:
            job.status = 'processing'
            job.progress = 0
            job.save()
        
        # Send update notification
        _send_report_update(str(report_id), {
            'status': 'processing',
            'progress': 0,
            'message': 'Starting report generation...'
        })
        
        # Generate report data
        report_data = _generate_admin_report_data(report)
        
        # Update progress
        job.progress = 50
        job.save()
        _send_report_update(str(report_id), {
            'status': 'processing',
            'progress': 50,
            'message': 'Data collection complete...'
        })
        
        # Generate file based on format
        if report.format == 'pdf':
            file_url, file_size = _generate_pdf_admin_report(report, report_data)
        elif report.format == 'excel':
            file_url, file_size = _generate_excel_admin_report(report, report_data)
        elif report.format == 'csv':
            file_url, file_size = _generate_csv_admin_report(report, report_data)
        elif report.format == 'json':
            file_url, file_size = _generate_json_admin_report(report, report_data)
        elif report.format == 'xml':
            file_url, file_size = _generate_xml_admin_report(report, report_data)
        else:
            raise ValueError(f"Unsupported format: {report.format}")
        
        # Update progress
        job.progress = 90
        job.save()
        _send_report_update(str(report_id), {
            'status': 'processing',
            'progress': 90,
            'message': 'File generation complete...'
        })
        
        # Update report
        report.file_url = file_url
        report.file_size = file_size
        report.status = 'completed'
        report.completed_at = timezone.now()
        report.save()
        
        # Complete job
        job.status = 'completed'
        job.progress = 100
        job.completed_at = timezone.now()
        job.save()
        
        # Send completion notification
        _send_report_completed(str(report_id), {
            'status': 'completed',
            'file_url': file_url,
            'file_size': file_size
        })
        
        logger.info(f"Admin report {report_id} generated successfully")
        
    except Exception as e:
        logger.error(f"Error generating admin report {report_id}: {str(e)}")
        
        # Update report status
        try:
            report = AdminReport.objects.get(id=report_id)
            report.status = 'failed'
            report.error_message = str(e)
            report.save()
            
            # Update job status
            job = ReportGenerationJob.objects.get(
                job_type='admin_report',
                object_id=report_id
            )
            job.status = 'failed'
            job.error_message = str(e)
            job.completed_at = timezone.now()
            job.save()
            
            # Send failure notification
            _send_report_failed(str(report_id), {
                'status': 'failed',
                'error': str(e)
            })
            
        except Exception:
            pass
        
        raise self.retry(exc=e, countdown=60 * (2 ** self.request.retries))


@shared_task
def run_scheduled_reports():
    """Run all scheduled reports that are due"""
    from .models_reports import ScheduledReport
    
    now = timezone.now()
    due_reports = ScheduledReport.objects.filter(
        status='active',
        next_run__lte=now
    )
    
    for scheduled_report in due_reports:
        try:
            # Create appropriate report based on owner
            if scheduled_report.merchant:
                # Create merchant report
                report = MerchantReport.objects.create(
                    merchant=scheduled_report.merchant,
                    template=scheduled_report.template,
                    report_type=scheduled_report.template.report_type,
                    format=scheduled_report.format,
                    start_date=now.date() - timezone.timedelta(days=30),  # Last 30 days
                    end_date=now.date(),
                    status='generating'
                )
                
                # Trigger background task
                generate_merchant_report.delay(str(report.id))
                
            elif scheduled_report.admin_user:
                # Create admin report
                report = AdminReport.objects.create(
                    admin_user=scheduled_report.admin_user,
                    report_type=scheduled_report.template.report_type,
                    format=scheduled_report.format,
                    start_date=now.date() - timezone.timedelta(days=30),
                    end_date=now.date(),
                    status='generating'
                )
                
                # Trigger background task
                generate_admin_report.delay(str(report.id))
            
            # Update next run time
            scheduled_report.last_run = now
            scheduled_report.next_run = _calculate_next_run(scheduled_report.frequency)
            scheduled_report.save()
            
            logger.info(f"Scheduled report {scheduled_report.id} triggered")
            
        except Exception as e:
            logger.error(f"Error running scheduled report {scheduled_report.id}: {str(e)}")


@shared_task
def cleanup_expired_cache():
    """Clean up expired report cache entries"""
    from .models_reports import ReportCache
    
    expired_cache = ReportCache.objects.filter(
        expires_at__lte=timezone.now()
    )
    
    count = expired_cache.count()
    expired_cache.delete()
    
    logger.info(f"Cleaned up {count} expired cache entries")


# Helper functions for report generation

def _generate_statement_data(statement):
    """Generate statement data for customer"""
    from .api.customer_reports import CustomerStatementAPIView
    
    view = CustomerStatementAPIView()
    return view._generate_statement_data(
        statement.customer,
        statement.start_date.strftime('%Y-%m-%d'),
        statement.end_date.strftime('%Y-%m-%d')
    )


def _generate_pdf_statement(statement, data):
    """Generate PDF statement"""
    buffer = io.BytesIO()
    p = canvas.Canvas(buffer, pagesize=letter)
    
    # PDF content
    p.drawString(100, 750, f"Statement - {statement.period_name}")
    p.drawString(100, 730, f"Period: {statement.start_date} to {statement.end_date}")
    p.drawString(100, 710, f"Opening Balance: GHS {data['opening_balance']}")
    p.drawString(100, 690, f"Closing Balance: GHS {data['closing_balance']}")
    p.drawString(100, 670, f"Transactions: {len(data['transactions'])}")
    
    p.showPage()
    p.save()
    buffer.seek(0)
    
    # Save file (mock implementation)
    file_url = f"/media/statements/{statement.id}.pdf"
    file_size = buffer.getbuffer().size
    
    return file_url, file_size


def _generate_excel_statement(statement, data):
    """Generate Excel statement"""
    output = io.BytesIO()
    workbook = xlsxwriter.Workbook(output)
    worksheet = workbook.add_worksheet()
    
    # Excel content
    worksheet.write(0, 0, "Statement Summary")
    worksheet.write(1, 0, "Period:")
    worksheet.write(1, 1, statement.period_name)
    worksheet.write(2, 0, "Opening Balance:")
    worksheet.write(2, 1, data['opening_balance'])
    worksheet.write(3, 0, "Closing Balance:")
    worksheet.write(3, 1, data['closing_balance'])
    
    workbook.close()
    output.seek(0)
    
    # Save file (mock implementation)
    file_url = f"/media/statements/{statement.id}.xlsx"
    file_size = output.getbuffer().size
    
    return file_url, file_size


def _generate_merchant_report_data(report):
    """Generate merchant report data"""
    from .api.merchant_reports import MerchantReportViewSet
    
    viewset = MerchantReportViewSet()
    return viewset._generate_report_data(
        report.merchant,
        report.template.id,
        report.start_date.strftime('%Y-%m-%d'),
        report.end_date.strftime('%Y-%m-%d')
    )


def _generate_pdf_merchant_report(report, data):
    """Generate PDF merchant report"""
    buffer = io.BytesIO()
    p = canvas.Canvas(buffer, pagesize=letter)
    
    # PDF content
    p.drawString(100, 750, f"Merchant Report - {report.get_report_type_display()}")
    p.drawString(100, 730, f"Period: {report.start_date} to {report.end_date}")
    p.drawString(100, 710, f"Total Records: {data.get('total_transactions', 0)}")
    
    p.showPage()
    p.save()
    buffer.seek(0)
    
    file_url = f"/media/reports/{report.id}.pdf"
    file_size = buffer.getbuffer().size
    
    return file_url, file_size


def _generate_excel_merchant_report(report, data):
    """Generate Excel merchant report"""
    output = io.BytesIO()
    workbook = xlsxwriter.Workbook(output)
    worksheet = workbook.add_worksheet()
    
    worksheet.write(0, 0, "Merchant Report")
    worksheet.write(1, 0, "Report Type:")
    worksheet.write(1, 1, report.get_report_type_display())
    
    workbook.close()
    output.seek(0)
    
    file_url = f"/media/reports/{report.id}.xlsx"
    file_size = output.getbuffer().size
    
    return file_url, file_size


def _generate_csv_merchant_report(report, data):
    """Generate CSV merchant report"""
    import csv
    
    output = io.StringIO()
    writer = csv.writer(output)
    
    writer.writerow(["Merchant Report"])
    writer.writerow(["Report Type", report.get_report_type_display()])
    
    file_url = f"/media/reports/{report.id}.csv"
    file_size = len(output.getvalue().encode())
    
    return file_url, file_size


def _generate_admin_report_data(report):
    """Generate admin report data"""
    # Mock implementation - would depend on report type
    return {
        'total_records': 1000,
        'generated_at': timezone.now().isoformat()
    }


def _generate_pdf_admin_report(report, data):
    """Generate PDF admin report"""
    buffer = io.BytesIO()
    p = canvas.Canvas(buffer, pagesize=letter)
    
    p.drawString(100, 750, f"Admin Report - {report.get_report_type_display()}")
    p.drawString(100, 730, f"Generated: {timezone.now().strftime('%Y-%m-%d %H:%M')}")
    p.drawString(100, 710, f"Total Records: {data.get('total_records', 0)}")
    
    p.showPage()
    p.save()
    buffer.seek(0)
    
    file_url = f"/media/admin_reports/{report.id}.pdf"
    file_size = buffer.getbuffer().size
    
    return file_url, file_size


def _generate_excel_admin_report(report, data):
    """Generate Excel admin report"""
    output = io.BytesIO()
    workbook = xlsxwriter.Workbook(output)
    worksheet = workbook.add_worksheet()
    
    worksheet.write(0, 0, "Admin Report")
    worksheet.write(1, 0, "Report Type:")
    worksheet.write(1, 1, report.get_report_type_display())
    
    workbook.close()
    output.seek(0)
    
    file_url = f"/media/admin_reports/{report.id}.xlsx"
    file_size = output.getbuffer().size
    
    return file_url, file_size


def _generate_csv_admin_report(report, data):
    """Generate CSV admin report"""
    import csv
    
    output = io.StringIO()
    writer = csv.writer(output)
    
    writer.writerow(["Admin Report"])
    writer.writerow(["Report Type", report.get_report_type_display()])
    
    file_url = f"/media/admin_reports/{report.id}.csv"
    file_size = len(output.getvalue().encode())
    
    return file_url, file_size


def _generate_json_admin_report(report, data):
    """Generate JSON admin report"""
    import json
    
    json_data = {
        'report_type': report.get_report_type_display(),
        'generated_at': timezone.now().isoformat(),
        'data': data
    }
    
    file_url = f"/media/admin_reports/{report.id}.json"
    file_size = len(json.dumps(json_data).encode())
    
    return file_url, file_size


def _generate_xml_admin_report(report, data):
    """Generate XML admin report"""
    from xml.etree.ElementTree import Element, SubElement, tostring
    
    root = Element('admin_report')
    SubElement(root, 'report_type').text = report.get_report_type_display()
    SubElement(root, 'generated_at').text = timezone.now().isoformat()
    
    xml_data = tostring(root, encoding='unicode')
    
    file_url = f"/media/admin_reports/{report.id}.xml"
    file_size = len(xml_data.encode())
    
    return file_url, file_size


def _calculate_next_run(frequency):
    """Calculate next run time based on frequency"""
    now = timezone.now()
    
    if frequency == 'daily':
        return now + timezone.timedelta(days=1)
    elif frequency == 'weekly':
        return now + timezone.timedelta(weeks=1)
    elif frequency == 'monthly':
        if now.month == 12:
            return now.replace(year=now.year + 1, month=1)
        else:
            return now.replace(month=now.month + 1)
    elif frequency == 'quarterly':
        if now.month > 9:
            return now.replace(year=now.year + 1, month=(now.month - 9) % 12 + 1)
        else:
            return now.replace(month=now.month + 3)
    else:
        return now + timezone.timedelta(days=1)


# WebSocket notification functions (synchronous versions)

def _send_report_update(report_id, data):
    """Send report update to WebSocket"""
    try:
        channel_layer = get_channel_layer()
        channel_layer.group_send(
            f"report_{report_id}",
            {
                'type': 'report.update',
                'data': data
            }
        )
    except Exception as e:
        logger.error(f"Error sending report update: {str(e)}")


def _send_report_completed(report_id, data):
    """Send report completion notification"""
    try:
        channel_layer = get_channel_layer()
        channel_layer.group_send(
            f"report_{report_id}",
            {
                'type': 'report.completed',
                'data': data
            }
        )
    except Exception as e:
        logger.error(f"Error sending report completion: {str(e)}")


def _send_report_failed(report_id, data):
    """Send report failure notification"""
    try:
        channel_layer = get_channel_layer()
        channel_layer.group_send(
            f"report_{report_id}",
            {
                'type': 'report.failed',
                'data': data
            }
        )
    except Exception as e:
        logger.error(f"Error sending report failure: {str(e)}")
