from rest_framework import status, generics
from rest_framework.decorators import api_view, permission_classes, action
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response
from rest_framework.viewsets import ModelViewSet
from django.shortcuts import get_object_or_404
from django.utils import timezone
from django.db import models
from django.core.files.base import ContentFile
from datetime import datetime, timedelta
from decimal import Decimal

from .models.invoices import (
    BusinessClient, Invoice, InvoiceItem, InvoicePayment,
    InvoiceTemplate, InvoiceReminder
)
from .serializers.invoices import (
    BusinessClientSerializer, BusinessClientCreateSerializer,
    InvoiceSerializer, InvoiceCreateSerializer, InvoiceListSerializer,
    InvoiceItemSerializer, InvoicePaymentSerializer,
    InvoiceTemplateSerializer
)


def generate_invoice_pdf(invoice):
    """Generate PDF for an invoice"""
    buffer = BytesIO()
    doc = SimpleDocTemplate(buffer, pagesize=letter)
    styles = getSampleStyleSheet()
    story = []
    
    # Title
    title_style = ParagraphStyle(
        'CustomTitle',
        parent=styles['Heading1'],
        fontSize=16,
        spaceAfter=30,
    )
    story.append(Paragraph("INVOICE", title_style))
    story.append(Spacer(1, 12))
    
    # Invoice header information
    header_data = [
        ['Invoice Number:', invoice.invoice_number],
        ['Issue Date:', str(invoice.issue_date)],
        ['Due Date:', str(invoice.due_date)],
        ['Status:', invoice.get_status_display()],
    ]
    
    header_table = Table(header_data, colWidths=[2*inch, 4*inch])
    header_table.setStyle(TableStyle([
        ('ALIGN', (0, 0), (-1, -1), 'LEFT'),
        ('FONTNAME', (0, 0), (0, -1), 'Helvetica-Bold'),
        ('FONTNAME', (1, 0), (1, -1), 'Helvetica'),
        ('FONTSIZE', (0, 0), (-1, -1), 10),
        ('TOPPADDING', (0, 0), (-1, -1), 2),
        ('BOTTOMPADDING', (0, 0), (-1, -1), 2),
    ]))
    story.append(header_table)
    story.append(Spacer(1, 20))
    
    # From and To sections
    contact_style = ParagraphStyle(
        'Contact',
        parent=styles['Normal'],
        fontSize=10,
    )
    
    # From section
    story.append(Paragraph("<b>From:</b>", contact_style))
    from_info = f"""
    {invoice.user.get_full_name() or invoice.user.email}<br/>
    {invoice.user.email}<br/>
    """
    if hasattr(invoice.user, 'merchant_profile') and invoice.user.merchant_profile:
        merchant = invoice.user.merchant_profile
        from_info += f"{merchant.business_name}<br/>"
    
    story.append(Paragraph(from_info.strip(), contact_style))
    story.append(Spacer(1, 12))
    
    # To section
    story.append(Paragraph("<b>Bill To:</b>", contact_style))
    to_info = f"""
    {invoice.client.company_name or invoice.client.contact_person}<br/>
    {invoice.client.contact_person if invoice.client.company_name else ''}<br/>
    {invoice.client.email}<br/>
    {invoice.client.phone if invoice.client.phone else ''}<br/>
    {invoice.client.address if invoice.client.address else ''}
    """.strip().replace('<br/><br/>', '<br/>')
    story.append(Paragraph(to_info, contact_style))
    story.append(Spacer(1, 20))
    
    # Items table
    items_data = [['Description', 'Qty', 'Unit Price', 'Tax Rate', 'Total']]
    
    for item in invoice.items.all():
        tax_amount = (item.unit_price * item.quantity * item.tax_rate / 100) if item.tax_rate else 0
        line_total = (item.unit_price * item.quantity) + tax_amount
        items_data.append([
            item.description,
            str(item.quantity),
            f"${item.unit_price:.2f}",
            f"{item.tax_rate or 0}%",
            f"${line_total:.2f}"
        ])
    
    # Add totals
    subtotal = sum(item.unit_price * item.quantity for item in invoice.items.all())
    tax_total = sum((item.unit_price * item.quantity * item.tax_rate / 100) if item.tax_rate else 0 for item in invoice.items.all())
    
    items_data.append(['', '', '', 'Subtotal:', f"${subtotal:.2f}"])
    if tax_total > 0:
        items_data.append(['', '', '', 'Tax:', f"${tax_total:.2f}"])
    items_data.append(['', '', '', 'Total:', f"${invoice.total_amount:.2f}"])
    
    items_table = Table(items_data, colWidths=[3*inch, 0.75*inch, 1*inch, 1*inch, 1*inch])
    items_table.setStyle(TableStyle([
        ('ALIGN', (0, 0), (-1, -1), 'LEFT'),
        ('ALIGN', (1, 0), (4, -1), 'RIGHT'),
        ('FONTNAME', (0, 0), (-1, 0), 'Helvetica-Bold'),
        ('FONTSIZE', (0, 0), (-1, -1), 9),
        ('GRID', (0, 0), (-1, -1), 0.5, colors.black),
        ('BACKGROUND', (0, 0), (-1, 0), colors.lightgrey),
        ('TOPPADDING', (0, 0), (-1, -1), 5),
        ('BOTTOMPADDING', (0, 0), (-1, -1), 5),
        ('LEFTPADDING', (0, 0), (-1, -1), 5),
        ('RIGHTPADDING', (0, 0), (-1, -1), 5),
    ]))
    
    story.append(items_table)
    doc.build(story)
    buffer.seek(0)
    return buffer


# Business Clients
class BusinessClientViewSet(ModelViewSet):
    """
    ViewSet for managing business clients
    """
    permission_classes = [IsAuthenticated]
    serializer_class = BusinessClientSerializer

    def get_queryset(self):
        return BusinessClient.objects.filter(user=self.request.user)

    def get_serializer_class(self):
        if self.action in ['create', 'update', 'partial_update']:
            return BusinessClientCreateSerializer
        return BusinessClientSerializer

    def perform_create(self, serializer):
        serializer.save(user=self.request.user)

    @action(detail=False, methods=['get'])
    def search(self, request):
        """Search clients by name or email"""
        query = request.query_params.get('q', '')
        if not query:
            return Response({'results': []})

        clients = self.get_queryset().filter(
            models.Q(company_name__icontains=query) |
            models.Q(email__icontains=query) |
            models.Q(contact_person__icontains=query)
        )[:10]

        serializer = self.get_serializer(clients, many=True)
        return Response({'results': serializer.data})


# Invoice Templates
class InvoiceTemplateViewSet(ModelViewSet):
    """
    ViewSet for managing invoice templates
    """
    permission_classes = [IsAuthenticated]
    serializer_class = InvoiceTemplateSerializer

    def get_queryset(self):
        return InvoiceTemplate.objects.filter(user=self.request.user)

    def perform_create(self, serializer):
        # Handle default template logic
        if serializer.validated_data.get('is_default', False):
            InvoiceTemplate.objects.filter(
                user=self.request.user,
                is_default=True
            ).update(is_default=False)

        serializer.save(user=self.request.user)


# Invoices
class InvoiceViewSet(ModelViewSet):
    """
    ViewSet for managing invoices
    """
    permission_classes = [IsAuthenticated]

    def get_queryset(self):
        queryset = Invoice.objects.filter(user=self.request.user).select_related(
            'client', 'template'
        ).prefetch_related('items', 'payments')

        # Filter by status
        status_filter = self.request.query_params.get('status')
        if status_filter:
            queryset = queryset.filter(status=status_filter)

        # Filter by client
        client_filter = self.request.query_params.get('client')
        if client_filter:
            queryset = queryset.filter(client_id=client_filter)

        # Filter by date range
        start_date = self.request.query_params.get('start_date')
        end_date = self.request.query_params.get('end_date')

        if start_date:
            queryset = queryset.filter(issue_date__gte=start_date)
        if end_date:
            queryset = queryset.filter(issue_date__lte=end_date)

        return queryset.order_by('-created_at')

    def get_serializer_class(self):
        if self.action == 'list':
            return InvoiceListSerializer
        elif self.action in ['create', 'update', 'partial_update']:
            return InvoiceCreateSerializer
        return InvoiceSerializer

    def perform_create(self, serializer):
        with transaction.atomic():
            invoice = serializer.save(user=self.request.user)

            # Create invoice items
            items_data = self.request.data.get('items', [])
            for item_data in items_data:
                InvoiceItem.objects.create(
                    invoice=invoice,
                    description=item_data['description'],
                    quantity=item_data['quantity'],
                    unit_price=item_data['unit_price'],
                    sku=item_data.get('sku', ''),
                    tax_rate=item_data.get('tax_rate', 0)
                )

            # Recalculate totals
            invoice.save()

    @action(detail=True, methods=['post'])
    def send_invoice(self, request, pk=None):
        """Send invoice to client via email"""
        invoice = self.get_object()

        # Mark as sent
        invoice.mark_as_sent()

        # Send email notification
        frGaoer.eeces 
i       pdf_buffer = mport Ne_onvtice_pdf(iivoice)ficationService
        
        Save PD tivice
       fil_name = f"invoice_{invoice.invoice_nmbe}.pdf"
        ivoice.df_file.save(fie_nm, CntentFie(pf_buffer.getvalue()), sav=Tue)
        invoice.save()
        # Create email subject and message
        subject = f"Invoice {invoice.invoice_number} from {invoice.user.get_full_name() or invoice.user.email}"
        edsuccssfuly
        message = f"""
Dear {invoice.client.contact_person or invoice.client.company_name},',
            'file_name: file_name

Please find attached invoice {invoice.invoice_number} for {invoice.total_amount}.

Invoice Details:
- Invoice Number: {invoice.invoice_number}
- Issue Date: {invoice.issue_date}
- Due Date: {invoice.due_date}
- Total Amount: ${invoice.total_amount}
- Amount Due: ${invoice.amount_due}

You can view and download your invoice at: {settings.FRONTEND_URL}/invoices/{invoice.id}

If you have any questions, please contact us.

Best regards,
{invoice.user.get_full_name() or invoice.user.email}
SikaRemit
        """.strip()
        
        try:
            # Send email to client
            NotificationService.send_email_notification_to_address(
                email=invoice.client.email,
                subject=subject,
                message=message
            )
            
            # Also send notification to the user who sent the invoice
            NotificationService.create_notification(
                user=request.user,
                title=f"Invoice {invoice.invoice_number} sent",
                message=f"Invoice {invoice.invoice_number} has been sent to {invoice.client.company_name or invoice.client.contact_person}",
                level='success',
                notification_type='invoice_sent',
                metadata={
                    'invoice_id': str(invoice.id),
                    'client_email': invoice.client.email
                }
            )
            
        except Exception as e:
            # If email fails, still mark as sent but log the error
            import logging
            logger = logging.getLogger(__name__)
            logger.error(f"Failed to send invoice email for invoice {invoice.invoice_number}: {str(e)}")
            
            # Create error notification for the user
            NotificationService.create_notification(
                user=request.user,
                title=f"Invoice {invoice.invoice_number} sent (email failed)",
                message=f"Invoice sent but email delivery failed. Please try again or contact support.",
                level='warning',
                notification_type='invoice_sent_email_failed',
                metadata={
                    'invoice_id': str(invoice.id),
                    'error': str(e)
                }
            )

        serializer = self.get_serializer(invoice)
        return Response({
            'message': f'Invoice {invoice.invoice_number} sent successfully',
            'invoice': serializer.data
        })

    @action(detail=True, methods=['post'])
    def record_payment(self, request, pk=None):
        """Record a payment against the invoice"""
        invoice = self.get_object()

        amount = request.data.get('amount')
        payment_method = request.data.get('payment_method', 'bank_transfer')
        notes = request.data.get('notes', '')

        if not amount:
            return Response(
                {'error': 'Amount is required'},
                status=status.HTTP_400_BAD_REQUEST
            )

        try:
            payment = invoice.record_payment(
                amount=amount,
                payment_method=payment_method,
                notes=notes
            )

            serializer = InvoicePaymentSerializer(payment)
            return Response({
                'message': f'Payment of ${amount} recorded successfully',
                'payment': serializer.data,
                'invoice': InvoiceSerializer(invoice).data
            })

        except Exception as e:
            return Response(
                {'error': f'Failed to record payment: {str(e)}'},
                status=status.HTTP_500_INTERNAL_SERVER_ERROR
            )

    @action(detail=True, methods=['post'])
    def generate_pdf(self, request, pk=None):
        """Generate PDF for the invoice"""
        invoice = self.get_object()

        try:
            pdf_buffer = generate_invoice_pdf(invoice)
            filename = f"invoice_{invoice.invoice_number}.pdf"
            invoice.pdf_file.save(filename, ContentFile(pdf_buffer.read()), save=True)

            return Response({
                'message': 'PDF generated successfully',
                'invoice_id': invoice.id,
                'download_url': f'/api/payments/invoices/{invoice.id}/download_pdf/'
            })
        except Exception as e:
            logger.error(f"PDF generation failed for invoice {invoice.id}: {e}")
            return Response(
                {'error': f'PDF generation failed: {str(e)}'},
                status=status.HTTP_500_INTERNAL_SERVER_ERROR
            )

    @action(detail=True, methods=['get'])
    def download_pdf(self, request, pk=None):
        """Download invoice PDF"""
        invoice = self.get_object()

        if not invoice.pdf_file:
            return Response(
                {'error': 'PDF not generated yet'},
                status=status.HTTP_404_NOT_FOUND
            )

        # Read the file and return it
        try:
            with invoice.pdf_file.open('rb') as pdf_file:
                response = HttpResponse(pdf_file.read(), content_type='application/pdf')
                response['Content-Disposition'] = f'attachment; filename="invoice_{invoice.invoice_number}.pdf"'
                return response
        except Exception as e:
            return Response(
                {'error': f'Error downloading PDF: {str(e)}'},
                status=status.HTTP_500_INTERNAL_SERVER_ERROR
            )

    @action(detail=False, methods=['get'])
    def analytics(self, request):
        """Get invoice analytics"""
        user = request.user

        # Date range
        period = request.query_params.get('period', 'month')
        now = timezone.now()

        if period == 'week':
            start_date = now - timedelta(days=7)
        elif period == 'month':
            start_date = now.replace(day=1)
        elif period == 'quarter':
            quarter = (now.month - 1) // 3 + 1
            start_date = now.replace(month=((quarter - 1) * 3 + 1), day=1)
        else:  # year
            start_date = now.replace(month=1, day=1)

        # Get invoices in period
        invoices = Invoice.objects.filter(
            user=user,
            created_at__gte=start_date
        )

        analytics = {
            'period': {
                'start': start_date.date(),
                'end': now.date(),
                'type': period
            },
            'summary': {
                'total_invoices': invoices.count(),
                'sent_invoices': invoices.filter(status__in=['sent', 'viewed', 'paid', 'partially_paid', 'overdue']).count(),
                'paid_invoices': invoices.filter(status='paid').count(),
                'overdue_invoices': invoices.filter(status='overdue').count(),
                'total_amount': invoices.aggregate(total=models.Sum('total_amount'))['total'] or 0,
                'paid_amount': invoices.aggregate(total=models.Sum('amount_paid'))['total'] or 0,
                'pending_amount': invoices.aggregate(total=models.Sum('amount_due'))['total'] or 0,
            },
            'status_breakdown': [
                {
                    'status': status_choice[0],
                    'count': invoices.filter(status=status_choice[0]).count(),
                    'amount': invoices.filter(status=status_choice[0]).aggregate(
                        total=models.Sum('total_amount')
                    )['total'] or 0
                }
                for status_choice in Invoice.STATUS_CHOICES
            ]
        }

        return Response(analytics)


# Invoice Items
class InvoiceItemViewSet(ModelViewSet):
    """
    ViewSet for managing invoice items
    """
    permission_classes = [IsAuthenticated]
    serializer_class = InvoiceItemSerializer

    def get_queryset(self):
        invoice_id = self.request.query_params.get('invoice_id')
        if invoice_id:
            return InvoiceItem.objects.filter(
                invoice__user=self.request.user,
                invoice_id=invoice_id
            )
        return InvoiceItem.objects.filter(invoice__user=self.request.user)

    def perform_create(self, serializer):
        invoice_id = self.request.data.get('invoice_id')
        invoice = get_object_or_404(
            Invoice,
            id=invoice_id,
            user=self.request.user
        )
        serializer.save(invoice=invoice)

        # Recalculate invoice totals
        invoice.save()


# Invoice Payments
class InvoicePaymentViewSet(generics.ListCreateAPIView):
    """
    ViewSet for managing invoice payments
    """
    permission_classes = [IsAuthenticated]
    serializer_class = InvoicePaymentSerializer

    def get_queryset(self):
        invoice_id = self.request.query_params.get('invoice_id')
        if invoice_id:
            return InvoicePayment.objects.filter(
                invoice__user=self.request.user,
                invoice_id=invoice_id
            )
        return InvoicePayment.objects.filter(invoice__user=self.request.user)

    def perform_create(self, serializer):
        invoice_id = self.request.data.get('invoice_id')
        invoice = get_object_or_404(
            Invoice,
            id=invoice_id,
            user=self.request.user
        )

        payment = serializer.save(invoice=invoice, recorded_by=self.request.user)

        # Update invoice amounts
        invoice.amount_paid += payment.amount
        invoice.save()


# Utility APIs
@api_view(['GET'])
@permission_classes([IsAuthenticated])
def overdue_invoices(request):
    """
    Get list of overdue invoices
    ---
    parameters:
      - name: days
        type: integer
        default: 30
        description: Maximum days overdue to include
    """
    days = int(request.query_params.get('days', 30))
    cutoff_date = timezone.now().date() - timedelta(days=days)

    invoices = Invoice.objects.filter(
        user=request.user,
        status__in=['sent', 'viewed', 'partially_paid'],
        due_date__lt=timezone.now().date(),
        amount_due__gt=0
    ).select_related('client').order_by('due_date')

    serializer = InvoiceListSerializer(invoices, many=True)
    return Response({
        'overdue_invoices': serializer.data,
        'total_overdue': invoices.count(),
        'total_amount_overdue': invoices.aggregate(total=models.Sum('amount_due'))['total'] or 0
    })


@api_view(['POST'])
@permission_classes([IsAuthenticated])
def send_reminder(request, invoice_id):
    """
    Send a payment reminder for an overdue invoice
    """
    invoice = get_object_or_404(Invoice, id=invoice_id, user=request.user)

    if not invoice.is_overdue:
        return Response(
            {'error': 'Invoice is not overdue'},
            status=status.HTTP_400_BAD_REQUEST
        )

    # Create reminder record
    reminder = InvoiceReminder.objects.create(
        invoice=invoice,
        reminder_type='email',
        subject=f'Payment Reminder: Invoice {invoice.invoice_number}',
        message=f'Dear {invoice.client.contact_person or invoice.client.company_name},\n\nThis is a reminder that invoice {invoice.invoice_number} for ${invoice.total_amount} is overdue by {invoice.days_overdue} days.\n\nPlease arrange payment at your earliest convenience.',
        scheduled_for=timezone.now()
    )

    # Send email reminder
    from notifications.services import NotificationService
    
    try:
        NotificationService.send_email_notification_to_address(
            email=invoice.client.email,
            subject=reminder.subject,
            message=reminder.message
        )
        
        # Update reminder as sent
        reminder.sent_at = timezone.now()
        reminder.save()
        
        # Create notification for the user
        NotificationService.create_notification(
            user=request.user,
            title=f'Reminder sent for Invoice {invoice.invoice_number}',
            message=f'Payment reminder sent to {invoice.client.company_name or invoice.client.contact_person}',
            level='info',
            notification_type='reminder_sent',
            metadata={
                'invoice_id': str(invoice.id),
                'reminder_id': str(reminder.id)
            }
        )
        
    except Exception as e:
        import logging
        logger = logging.getLogger(__name__)
        logger.error(f"Failed to send reminder email for invoice {invoice.invoice_number}: {str(e)}")
        
        # Create error notification
        NotificationService.create_notification(
            user=request.user,
            title=f'Reminder failed for Invoice {invoice.invoice_number}',
            message=f'Failed to send payment reminder. Please try again.',
            level='warning',
            notification_type='reminder_failed',
            metadata={
                'invoice_id': str(invoice.id),
                'reminder_id': str(reminder.id),
                'error': str(e)
            }
        )
        
        return Response({
            'message': 'Reminder record created but email failed to send',
            'reminder_id': reminder.id,
            'error': str(e)
        }, status=status.HTTP_500_INTERNAL_SERVER_ERROR)

    return Response({
        'message': 'Reminder sent successfully',
        'reminder_id': reminder.id
    })


@api_view(['POST'])
@permission_classes([IsAuthenticated])
def bulk_send_invoices(request):
    """
    Send multiple invoices at once
    ---
    parameters:
      - name: invoice_ids
        type: array
        required: true
        description: List of invoice IDs to send
    """
    invoice_ids = request.data.get('invoice_ids', [])

    if not invoice_ids:
        return Response(
            {'error': 'invoice_ids is required'},
            status=status.HTTP_400_BAD_REQUEST
        )

    sent_count = 0
    errors = []

    for invoice_id in invoice_ids:
        try:
            invoice = Invoice.objects.get(id=invoice_id, user=request.user)

            if invoice.status == 'draft':
                invoice.mark_as_sent()
                sent_count += 1
            else:
                errors.append(f'Invoice {invoice.invoice_number} is not in draft status')

        except Invoice.DoesNotExist:
            errors.append(f'Invoice with ID {invoice_id} not found')
        except Exception as e:
            errors.append(f'Error sending invoice {invoice_id}: {str(e)}')

    return Response({
        'message': f'Successfully sent {sent_count} invoices',
        'sent_count': sent_count,
        'errors': errors
    })


@api_view(['GET'])
@permission_classes([IsAuthenticated])
def invoice_templates(request):
    """
    Get available invoice templates for the user
    """
    templates = InvoiceTemplate.objects.filter(
        user=request.user,
        is_active=True
    ).order_by('-is_default', 'name')

    serializer = InvoiceTemplateSerializer(templates, many=True)
    return Response({
        'templates': serializer.data,
        'default_template': templates.filter(is_default=True).first()
    })
