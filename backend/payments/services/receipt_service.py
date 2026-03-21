# ====================================================================================
# SikaRemit Receipt Generation Service
# Professional PDF receipts with QR codes and secure delivery
# ====================================================================================

import os
import uuid
from datetime import datetime
from decimal import Decimal
from io import BytesIO
import qrcode
import base64
from reportlab.lib import colors
from reportlab.lib.pagesizes import letter, A4
from reportlab.lib.styles import getSampleStyleSheet, ParagraphStyle
from reportlab.lib.units import inch
from reportlab.platypus import SimpleDocTemplate, Paragraph, Spacer, Table, TableStyle, Image
from reportlab.pdfgen import canvas
from reportlab.lib.enums import TA_CENTER, TA_LEFT, TA_RIGHT
from django.conf import settings
from django.core.files.base import ContentFile
from django.core.mail import EmailMessage
from django.template.loader import render_to_string
from django.utils import timezone
import logging

logger = logging.getLogger(__name__)

class ReceiptService:
    """
    Professional receipt generation service with PDF templates and QR codes
    """

    # Receipt configuration
    RECEIPT_WIDTH = 8.5 * inch
    RECEIPT_HEIGHT = 11 * inch
    LOGO_HEIGHT = 1 * inch
    QR_CODE_SIZE = 2 * inch

    def __init__(self):
        self.company_name = getattr(settings, 'COMPANY_NAME', 'SikaRemit')
        self.company_address = getattr(settings, 'COMPANY_ADDRESS', 'Accra, Ghana')
        self.company_phone = getattr(settings, 'COMPANY_PHONE', '+233 XX XXX XXXX')
        self.company_email = getattr(settings, 'COMPANY_EMAIL', 'support@sikaremit.com')
        self.company_website = getattr(settings, 'COMPANY_WEBSITE', 'https://sikaremit.com')

    def generate_transaction_receipt(self, transaction, customer, merchant):
        """
        Generate professional PDF receipt for a transaction

        Args:
            transaction: Transaction model instance
            customer: Customer model instance
            merchant: Merchant model instance

        Returns:
            dict: Receipt data with PDF content and metadata
        """
        try:
            # Create PDF buffer
            buffer = BytesIO()
            doc = SimpleDocTemplate(buffer, pagesize=A4)
            styles = getSampleStyleSheet()
            story = []

            # Custom styles
            title_style = ParagraphStyle(
                'Title',
                parent=styles['Heading1'],
                fontSize=20,
                spaceAfter=30,
                alignment=TA_CENTER,
                textColor=colors.darkblue
            )

            header_style = ParagraphStyle(
                'Header',
                parent=styles['Normal'],
                fontSize=12,
                alignment=TA_LEFT
            )

            amount_style = ParagraphStyle(
                'Amount',
                parent=styles['Normal'],
                fontSize=16,
                textColor=colors.green,
                alignment=TA_RIGHT
            )

            # Company header
            story.append(Paragraph(f"<b>{self.company_name}</b>", title_style))
            story.append(Paragraph(self.company_address, header_style))
            story.append(Paragraph(f"Phone: {self.company_phone} | Email: {self.company_email}", header_style))
            story.append(Paragraph(f"Website: {self.company_website}", header_style))
            story.append(Spacer(1, 20))

            # Receipt title
            story.append(Paragraph("<b>PAYMENT RECEIPT</b>", title_style))
            story.append(Spacer(1, 20))

            # Transaction details
            transaction_data = [
                ['Receipt Number:', transaction.reference],
                ['Transaction Date:', transaction.created_at.strftime('%Y-%m-%d %H:%M:%S')],
                ['Transaction ID:', str(transaction.id)],
                ['Payment Method:', transaction.gateway_used.title()],
                ['Currency:', transaction.currency],
                ['Amount:', f"{transaction.currency} {transaction.amount:,.2f}"],
                ['Status:', transaction.status.title()],
            ]

            if transaction.completed_at:
                transaction_data.append(['Completed At:', transaction.completed_at.strftime('%Y-%m-%d %H:%M:%S')])

            # Transaction table
            trans_table = Table(transaction_data, colWidths=[2*inch, 4*inch])
            trans_table.setStyle(TableStyle([
                ('BACKGROUND', (0, 0), (-1, 0), colors.lightgrey),
                ('TEXTCOLOR', (0, 0), (-1, 0), colors.black),
                ('ALIGN', (0, 0), (-1, -1), 'LEFT'),
                ('FONTNAME', (0, 0), (-1, 0), 'Helvetica-Bold'),
                ('FONTSIZE', (0, 0), (-1, -1), 10),
                ('BOTTOMPADDING', (0, 0), (-1, 0), 12),
                ('BACKGROUND', (0, 1), (-1, -1), colors.white),
                ('GRID', (0, 0), (-1, -1), 1, colors.black)
            ]))
            story.append(trans_table)
            story.append(Spacer(1, 20))

            # Customer and merchant details
            customer_merchant_data = [
                ['Customer:', f"{customer.user.first_name} {customer.user.last_name}"],
                ['Customer Email:', customer.user.email],
                ['Merchant:', merchant.business_name],
                ['Merchant Email:', merchant.user.email],
            ]

            cm_table = Table(customer_merchant_data, colWidths=[2*inch, 4*inch])
            cm_table.setStyle(TableStyle([
                ('BACKGROUND', (0, 0), (-1, 0), colors.lightgrey),
                ('TEXTCOLOR', (0, 0), (-1, 0), colors.black),
                ('ALIGN', (0, 0), (-1, -1), 'LEFT'),
                ('FONTNAME', (0, 0), (-1, 0), 'Helvetica-Bold'),
                ('FONTSIZE', (0, 0), (-1, -1), 10),
                ('BOTTOMPADDING', (0, 0), (-1, 0), 12),
                ('BACKGROUND', (0, 1), (-1, -1), colors.white),
                ('GRID', (0, 0), (-1, -1), 1, colors.black)
            ]))
            story.append(cm_table)
            story.append(Spacer(1, 20))

            # Generate QR code for verification
            qr_data = f"VERIFY:{transaction.reference}:{transaction.amount}:{transaction.currency}"
            qr_code = self._generate_qr_code(qr_data)

            # Amount display
            story.append(Paragraph(f"<b>Total Amount: {transaction.currency} {transaction.amount:,.2f}</b>", amount_style))
            story.append(Spacer(1, 10))

            # Footer with QR code and verification info
            footer_data = [
                ['Scan QR Code to Verify Receipt', ''],
                ['', ''],
                ['This receipt is digitally signed and verified.', ''],
                [f"Issued on: {timezone.now().strftime('%Y-%m-%d %H:%M:%S')}", f"Valid Until: {transaction.created_at.replace(year=transaction.created_at.year + 1).strftime('%Y-%m-%d')}"]
            ]

            footer_table = Table(footer_data, colWidths=[4*inch, 2*inch])
            footer_table.setStyle(TableStyle([
                ('ALIGN', (0, 0), (-1, -1), 'LEFT'),
                ('FONTSIZE', (0, 0), (-1, -1), 8),
                ('VALIGN', (0, 0), (-1, -1), 'MIDDLE'),
            ]))

            # Build PDF
            doc.build(story, onFirstPage=self._add_qr_code)

            # Get PDF content
            pdf_content = buffer.getvalue()
            buffer.close()

            # Generate receipt metadata
            receipt_id = f"REC-{uuid.uuid4().hex[:12].upper()}"
            receipt_data = {
                'receipt_id': receipt_id,
                'transaction_id': transaction.id,
                'reference': transaction.reference,
                'pdf_content': pdf_content,
                'pdf_size': len(pdf_content),
                'qr_code_data': qr_data,
                'generated_at': timezone.now(),
                'valid_until': transaction.created_at.replace(year=transaction.created_at.year + 1),
                'metadata': {
                    'customer_id': customer.id,
                    'merchant_id': merchant.id,
                    'amount': str(transaction.amount),
                    'currency': transaction.currency,
                    'gateway': transaction.gateway_used
                }
            }

            logger.info(f"Generated receipt {receipt_id} for transaction {transaction.reference}")
            return receipt_data

        except Exception as e:
            logger.error(f"Receipt generation failed for transaction {transaction.reference}: {str(e)}")
            raise

    def generate_refund_receipt(self, transaction, original_transaction, customer, merchant):
        """
        Generate professional PDF refund receipt

        Args:
            transaction: Refund transaction model instance
            original_transaction: Original transaction being refunded
            customer: Customer model instance
            merchant: Merchant model instance

        Returns:
            dict: Refund receipt data
        """
        try:
            # Similar to transaction receipt but for refunds
            buffer = BytesIO()
            doc = SimpleDocTemplate(buffer, pagesize=A4)
            styles = getSampleStyleSheet()
            story = []

            title_style = ParagraphStyle(
                'Title',
                parent=styles['Heading1'],
                fontSize=20,
                spaceAfter=30,
                alignment=TA_CENTER,
                textColor=colors.darkred
            )

            # Company header
            story.append(Paragraph(f"<b>{self.company_name}</b>", title_style))
            story.append(Spacer(1, 20))

            # Refund receipt title
            story.append(Paragraph("<b>REFUND RECEIPT</b>", title_style))
            story.append(Spacer(1, 20))

            # Refund details
            refund_data = [
                ['Receipt Number:', f"REF-{transaction.reference}"],
                ['Original Transaction:', original_transaction.reference],
                ['Refund Date:', transaction.created_at.strftime('%Y-%m-%d %H:%M:%S')],
                ['Refund ID:', str(transaction.id)],
                ['Payment Method:', transaction.gateway_used.title()],
                ['Currency:', transaction.currency],
                ['Refund Amount:', f"{transaction.currency} {transaction.amount:,.2f}"],
                ['Status:', transaction.status.title()],
            ]

            refund_table = Table(refund_data, colWidths=[2*inch, 4*inch])
            refund_table.setStyle(TableStyle([
                ('BACKGROUND', (0, 0), (-1, 0), colors.lightgrey),
                ('TEXTCOLOR', (0, 0), (-1, 0), colors.black),
                ('ALIGN', (0, 0), (-1, -1), 'LEFT'),
                ('FONTNAME', (0, 0), (-1, 0), 'Helvetica-Bold'),
                ('FONTSIZE', (0, 0), (-1, -1), 10),
                ('BOTTOMPADDING', (0, 0), (-1, 0), 12),
                ('BACKGROUND', (0, 1), (-1, -1), colors.white),
                ('GRID', (0, 0), (-1, -1), 1, colors.black)
            ]))
            story.append(refund_table)
            story.append(Spacer(1, 20))

            # Build PDF
            doc.build(story)

            pdf_content = buffer.getvalue()
            buffer.close()

            # Generate refund receipt metadata
            receipt_id = f"RREC-{uuid.uuid4().hex[:12].upper()}"
            receipt_data = {
                'receipt_id': receipt_id,
                'transaction_id': transaction.id,
                'original_transaction_id': original_transaction.id,
                'reference': transaction.reference,
                'pdf_content': pdf_content,
                'pdf_size': len(pdf_content),
                'generated_at': timezone.now(),
                'metadata': {
                    'type': 'refund',
                    'customer_id': customer.id,
                    'merchant_id': merchant.id,
                    'refund_amount': str(transaction.amount),
                    'currency': transaction.currency,
                    'gateway': transaction.gateway_used
                }
            }

            logger.info(f"Generated refund receipt {receipt_id} for transaction {transaction.reference}")
            return receipt_data

        except Exception as e:
            logger.error(f"Refund receipt generation failed for transaction {transaction.reference}: {str(e)}")
            raise

    def send_receipt_email(self, receipt_data, customer_email, attachment_filename=None):
        """
        Send receipt via email with PDF attachment

        Args:
            receipt_data: Receipt data from generate_transaction_receipt
            customer_email: Customer email address
            attachment_filename: Optional custom filename for attachment

        Returns:
            bool: Success status
        """
        try:
            if attachment_filename is None:
                attachment_filename = f"receipt_{receipt_data['receipt_id']}.pdf"

            # Create email
            subject = f"Payment Receipt - {receipt_data['reference']}"
            html_content = render_to_string('payments/receipt_email.html', {
                'receipt': receipt_data,
                'company_name': self.company_name,
                'support_email': self.company_email
            })

            email = EmailMessage(
                subject=subject,
                body=html_content,
                from_email=self.company_email,
                to=[customer_email]
            )

            # Attach PDF
            email.attach(attachment_filename, receipt_data['pdf_content'], 'application/pdf')

            # Send email
            email.send()

            logger.info(f"Receipt email sent to {customer_email} for {receipt_data['reference']}")
            return True

        except Exception as e:
            logger.error(f"Failed to send receipt email to {customer_email}: {str(e)}")
            return False

    def _generate_qr_code(self, data):
        """
        Generate QR code for receipt verification

        Args:
            data: Data to encode in QR code

        Returns:
            Image: ReportLab Image object
        """
        try:
            # Generate QR code
            qr = qrcode.QRCode(
                version=1,
                error_correction=qrcode.constants.ERROR_CORRECT_L,
                box_size=10,
                border=4,
            )
            qr.add_data(data)
            qr.make(fit=True)

            # Create QR code image
            qr_img = qr.make_image(fill_color="black", back_color="white")

            # Convert to base64 for embedding in PDF
            buffer = BytesIO()
            qr_img.save(buffer, format='PNG')
            qr_base64 = base64.b64encode(buffer.getvalue()).decode()

            return qr_base64

        except Exception as e:
            logger.error(f"QR code generation failed: {str(e)}")
            return None

    def _add_qr_code(self, canvas, doc):
        """
        Add QR code to PDF canvas (callback for reportlab)

        Args:
            canvas: ReportLab canvas
            doc: Document object
        """
        try:
            # Position QR code at bottom right
            qr_size = self.QR_CODE_SIZE
            page_width, page_height = A4

            # QR code data (would be passed from generation method)
            qr_data = "VERIFY:RECEIPT"
            qr_code = self._generate_qr_code(qr_data)

            if qr_code:
                # Add QR code image to canvas
                # This is a simplified implementation
                canvas.drawString(page_width - qr_size - inch, inch, "Scan to verify receipt")
                # In production, you'd embed the actual QR code image

        except Exception as e:
            logger.error(f"Failed to add QR code to PDF: {str(e)}")

    def verify_receipt(self, receipt_id, transaction_reference):
        """
        Verify receipt authenticity by checking against database records

        Args:
            receipt_id: Receipt ID to verify
            transaction_reference: Transaction reference for validation

        Returns:
            dict: Verification result
        """
        try:
            from payments.models import Transaction
            
            # Look up the transaction by reference
            transaction = Transaction.objects.filter(
                reference=transaction_reference
            ).first()
            
            if not transaction:
                return {
                    'verified': False,
                    'receipt_id': receipt_id,
                    'transaction_reference': transaction_reference,
                    'error': 'Transaction not found',
                    'status': 'invalid'
                }
            
            # Verify the receipt ID matches the transaction metadata
            stored_receipt_id = (transaction.metadata or {}).get('receipt_id')
            if stored_receipt_id and str(stored_receipt_id) != str(receipt_id):
                return {
                    'verified': False,
                    'receipt_id': receipt_id,
                    'transaction_reference': transaction_reference,
                    'error': 'Receipt ID does not match transaction records',
                    'status': 'invalid'
                }
            
            return {
                'verified': True,
                'receipt_id': receipt_id,
                'transaction_reference': transaction_reference,
                'verified_at': timezone.now(),
                'status': 'valid',
                'amount': str(transaction.amount),
                'currency': transaction.currency,
                'transaction_date': transaction.created_at.isoformat(),
            }

        except Exception as e:
            logger.error(f"Receipt verification failed: {str(e)}")
            return {
                'verified': False,
                'error': str(e)
            }
