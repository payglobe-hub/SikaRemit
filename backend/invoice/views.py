from rest_framework import viewsets, status
from rest_framework.decorators import action
from rest_framework.response import Response
from rest_framework.permissions import IsAuthenticated
from django.http import HttpResponse
from django.utils import timezone
from django.db import models
from .models import Invoice, InvoiceItem
from .serializers import InvoiceSerializer, CreateInvoiceSerializer

class InvoiceViewSet(viewsets.ModelViewSet):
    serializer_class = InvoiceSerializer
    permission_classes = [IsAuthenticated]

    def get_queryset(self):
        user = self.request.user
        # Return invoices created by or for this user
        return Invoice.objects.filter(
            models.Q(created_by=user) | models.Q(merchant=user)
        ).distinct()

    def get_serializer_class(self):
        if self.action == 'create':
            return CreateInvoiceSerializer
        return InvoiceSerializer

    def perform_create(self, serializer):
        serializer.save(created_by=self.request.user)

    @action(detail=True, methods=['post'])
    def send(self, request, pk=None):
        invoice = self.get_object()
        if invoice.created_by != request.user:
            return Response({'error': 'Permission denied'}, status=status.HTTP_403_FORBIDDEN)
        
        invoice.status = 'sent'
        invoice.sent_at = timezone.now()
        invoice.save()
        
        # TODO: Send email notification to customer
        # send_invoice_email(invoice)
        
        return Response({'message': 'Invoice sent successfully'})

    @action(detail=True, methods=['post'])
    def mark_paid(self, request, pk=None):
        invoice = self.get_object()
        if invoice.created_by != request.user:
            return Response({'error': 'Permission denied'}, status=status.HTTP_403_FORBIDDEN)
        
        invoice.status = 'paid'
        invoice.paid_at = timezone.now()
        invoice.save()
        
        return Response({'message': 'Invoice marked as paid'})

    @action(detail=True, methods=['get'])
    def download(self, request, pk=None):
        invoice = self.get_object()
        if invoice.created_by != request.user and invoice.merchant != request.user:
            return Response({'error': 'Permission denied'}, status=status.HTTP_403_FORBIDDEN)
        
        # Generate PDF or simple HTML response
        # For now, return simple text response
        content = f"""
        Invoice: {invoice.invoice_number}
        Customer: {invoice.customer_name}
        Amount: {invoice.amount} {invoice.currency}
        Status: {invoice.status}
        Due Date: {invoice.due_date}
        """
        
        response = HttpResponse(content, content_type='text/plain')
        response['Content-Disposition'] = f'attachment; filename="invoice_{invoice.invoice_number}.txt"'
        return response

    @action(detail=False, methods=['get'])
    def stats(self, request):
        user = request.user
        invoices = self.get_queryset()
        
        total_invoices = invoices.count()
        total_amount = sum(invoice.amount for invoice in invoices)
        paid_invoices = invoices.filter(status='paid')
        paid_amount = sum(invoice.amount for invoice in paid_invoices)
        pending_amount = total_amount - paid_amount
        overdue_invoices = invoices.filter(status='overdue')
        overdue_amount = sum(invoice.amount for invoice in overdue_invoices)
        
        return Response({
            'total_invoices': total_invoices,
            'total_amount': total_amount,
            'paid_amount': paid_amount,
            'pending_amount': pending_amount,
            'overdue_amount': overdue_amount,
        })

# Alias for backwards compatibility
CustomerInvoiceViewSet = InvoiceViewSet
