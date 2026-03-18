"""
Invoice System Tests.

Tests business clients, invoice templates, invoice creation,
line items, payment recording, status transitions, and overdue detection.
"""
from django.test import TestCase
from django.contrib.auth import get_user_model
from django.utils import timezone
from decimal import Decimal
from datetime import timedelta

from payments.models.invoices import (
    BusinessClient, InvoiceTemplate, Invoice
)
from shared.constants import USER_TYPE_MERCHANT

User = get_user_model()

class BusinessClientTests(TestCase):
    """Test business client management."""

    def setUp(self):
        self.user = User.objects.create_user(
            username='invoicer', email='invoicer@test.com',
            password='testpass123', user_type=USER_TYPE_MERCHANT
        )

    def test_create_business_client(self):
        client = BusinessClient.objects.create(
            user=self.user, company_name='Acme Corp',
            email='acme@test.com', address_line_1='123 Business St',
            city='Accra', country='Ghana'
        )
        self.assertEqual(client.company_name, 'Acme Corp')
        self.assertTrue(client.is_active)
        self.assertEqual(client.default_payment_terms, 30)

    def test_client_full_address(self):
        client = BusinessClient.objects.create(
            user=self.user, company_name='Address Corp',
            email='addr@test.com', address_line_1='456 Main St',
            address_line_2='Suite 100', city='Kumasi',
            state='Ashanti', postal_code='00234', country='Ghana'
        )
        addr = client.full_address
        self.assertIn('456 Main St', addr)
        self.assertIn('Ghana', addr)

    def test_unique_client_per_user_email(self):
        BusinessClient.objects.create(
            user=self.user, company_name='Corp A',
            email='dupe@test.com', address_line_1='Test',
            city='Accra', country='Ghana'
        )
        with self.assertRaises(Exception):
            BusinessClient.objects.create(
                user=self.user, company_name='Corp B',
                email='dupe@test.com', address_line_1='Test',
                city='Accra', country='Ghana'
            )

class InvoiceTemplateTests(TestCase):
    """Test invoice template management."""

    def setUp(self):
        self.user = User.objects.create_user(
            username='tmpluser', email='tmpl@test.com',
            password='testpass123', user_type=USER_TYPE_MERCHANT
        )

    def test_create_template(self):
        template = InvoiceTemplate.objects.create(
            user=self.user, name='Default Template',
            company_name='My Company', company_address='123 St',
            company_email='co@test.com', is_default=True
        )
        self.assertTrue(template.is_default)
        self.assertTrue(template.is_active)

    def test_only_one_default_template(self):
        t1 = InvoiceTemplate.objects.create(
            user=self.user, name='Template 1',
            company_name='Co', company_address='St',
            company_email='a@test.com', is_default=True
        )
        t2 = InvoiceTemplate.objects.create(
            user=self.user, name='Template 2',
            company_name='Co', company_address='St',
            company_email='b@test.com', is_default=True
        )
        t1.refresh_from_db()
        self.assertFalse(t1.is_default)
        self.assertTrue(t2.is_default)

class InvoiceTests(TestCase):
    """Test invoice creation, totals, and status."""

    def setUp(self):
        self.user = User.objects.create_user(
            username='invuser', email='inv@test.com',
            password='testpass123', user_type=USER_TYPE_MERCHANT
        )
        self.client = BusinessClient.objects.create(
            user=self.user, company_name='Client Corp',
            email='client@test.com', address_line_1='Test',
            city='Accra', country='Ghana'
        )

    def test_create_draft_invoice(self):
        invoice = Invoice.objects.create(
            user=self.user, client=self.client,
            due_date=timezone.now().date() + timedelta(days=30),
            currency='GHS'
        )
        self.assertEqual(invoice.status, 'draft')
        self.assertTrue(invoice.invoice_number.startswith('INV-'))

    def test_invoice_auto_generates_number(self):
        inv1 = Invoice.objects.create(
            user=self.user, client=self.client,
            due_date=timezone.now().date() + timedelta(days=30)
        )
        inv2 = Invoice.objects.create(
            user=self.user, client=self.client,
            due_date=timezone.now().date() + timedelta(days=30)
        )
        self.assertNotEqual(inv1.invoice_number, inv2.invoice_number)

    def test_mark_invoice_as_sent(self):
        invoice = Invoice.objects.create(
            user=self.user, client=self.client,
            due_date=timezone.now().date() + timedelta(days=30)
        )
        invoice.mark_as_sent()
        self.assertEqual(invoice.status, 'sent')
        self.assertIsNotNone(invoice.sent_at)

    def test_overdue_invoice(self):
        invoice = Invoice.objects.create(
            user=self.user, client=self.client,
            due_date=timezone.now().date() - timedelta(days=5),
            total_amount=Decimal('100.00'),
            amount_due=Decimal('100.00')
        )
        self.assertTrue(invoice.is_overdue)
        self.assertGreaterEqual(invoice.days_overdue, 5)

    def test_invoice_status_transitions(self):
        invoice = Invoice.objects.create(
            user=self.user, client=self.client,
            due_date=timezone.now().date() + timedelta(days=30)
        )
        for new_status in ['sent', 'viewed', 'cancelled']:
            invoice.status = new_status
            invoice.save()
            invoice.refresh_from_db()
            self.assertEqual(invoice.status, new_status)

    def test_payment_percentage_zero(self):
        invoice = Invoice.objects.create(
            user=self.user, client=self.client,
            due_date=timezone.now().date() + timedelta(days=30),
            total_amount=Decimal('100.00'), amount_paid=Decimal('0')
        )
        self.assertEqual(invoice.payment_percentage, 0)

    def test_payment_percentage_partial(self):
        invoice = Invoice.objects.create(
            user=self.user, client=self.client,
            due_date=timezone.now().date() + timedelta(days=30),
            total_amount=Decimal('100.00'), amount_paid=Decimal('50.00')
        )
        self.assertEqual(invoice.payment_percentage, 50)

    def test_recurring_invoice_settings(self):
        invoice = Invoice.objects.create(
            user=self.user, client=self.client,
            due_date=timezone.now().date() + timedelta(days=30),
            is_recurring=True, recurring_frequency='monthly',
            next_recurring_date=timezone.now().date() + timedelta(days=30)
        )
        self.assertTrue(invoice.is_recurring)
        self.assertEqual(invoice.recurring_frequency, 'monthly')
