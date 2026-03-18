"""
Comprehensive KYC Flow Tests.

Tests customer KYC submission, document upload, status transitions,
admin review (approve/reject/escalate), merchant-customer KYC onboarding,
and transaction eligibility checks.
"""
from django.test import TestCase, RequestFactory
from django.contrib.auth import get_user_model
from django.core.files.uploadedfile import SimpleUploadedFile
from django.utils import timezone
from unittest.mock import patch, MagicMock

from users.models import Customer, Merchant, KYCDocument, MerchantCustomer, MerchantKYCSubmission
from users.services import KYCService
from shared.constants import (
    USER_TYPE_SUPER_ADMIN, USER_TYPE_BUSINESS_ADMIN,
    USER_TYPE_VERIFICATION_ADMIN, USER_TYPE_MERCHANT, USER_TYPE_CUSTOMER,
    KYC_STATUS_NOT_STARTED, KYC_STATUS_IN_PROGRESS, KYC_STATUS_PENDING_REVIEW,
    KYC_STATUS_APPROVED, KYC_STATUS_REJECTED, STATUS_PENDING
)

User = get_user_model()

class CustomerKYCStatusTests(TestCase):
    """Test customer KYC status transitions and properties."""

    def setUp(self):
        self.user = User.objects.create_user(
            username='testcustomer', email='customer@test.com',
            password='testpass123', user_type=USER_TYPE_CUSTOMER
        )
        self.customer = Customer.objects.get(user=self.user)

    def test_initial_kyc_status_is_not_started(self):
        self.assertEqual(self.customer.kyc_status, KYC_STATUS_NOT_STARTED)

    def test_cannot_make_transactions_without_kyc(self):
        self.assertFalse(self.customer.can_make_transactions)

    def test_needs_kyc_verification_when_not_started(self):
        self.assertTrue(self.customer.needs_kyc_verification)

    def test_start_kyc_process(self):
        self.customer.start_kyc_process()
        self.assertEqual(self.customer.kyc_status, KYC_STATUS_IN_PROGRESS)
        self.assertIsNotNone(self.customer.kyc_started_at)

    def test_start_kyc_only_from_not_started(self):
        self.customer.kyc_status = KYC_STATUS_IN_PROGRESS
        self.customer.save()
        old_started = self.customer.kyc_started_at
        self.customer.start_kyc_process()
        self.assertEqual(self.customer.kyc_started_at, old_started)

    def test_update_kyc_status_to_pending_review(self):
        self.customer.update_kyc_status(KYC_STATUS_PENDING_REVIEW)
        self.assertEqual(self.customer.kyc_status, KYC_STATUS_PENDING_REVIEW)
        self.assertTrue(self.customer.is_kyc_pending_review)

    def test_update_kyc_status_to_approved(self):
        self.customer.update_kyc_status(KYC_STATUS_APPROVED)
        self.assertEqual(self.customer.kyc_status, KYC_STATUS_APPROVED)
        self.assertTrue(self.customer.is_kyc_approved)
        self.assertTrue(self.customer.can_make_transactions)
        self.assertFalse(self.customer.needs_kyc_verification)
        self.assertTrue(self.customer.kyc_verified)

    def test_update_kyc_status_to_rejected(self):
        self.customer.update_kyc_status(KYC_STATUS_REJECTED)
        self.assertEqual(self.customer.kyc_status, KYC_STATUS_REJECTED)
        self.assertFalse(self.customer.can_make_transactions)
        self.assertTrue(self.customer.needs_kyc_verification)
        self.assertFalse(self.customer.kyc_verified)

    def test_update_kyc_status_invalid_raises(self):
        with self.assertRaises(ValueError):
            self.customer.update_kyc_status('invalid_status')

    def test_complete_kyc_approved(self):
        self.customer.complete_kyc(approved=True)
        self.assertEqual(self.customer.kyc_status, KYC_STATUS_APPROVED)
        self.assertTrue(self.customer.kyc_verified)
        self.assertIsNotNone(self.customer.kyc_verified_at)
        self.assertIsNotNone(self.customer.kyc_completed_at)

    def test_complete_kyc_rejected(self):
        self.customer.complete_kyc(approved=False)
        self.assertEqual(self.customer.kyc_status, KYC_STATUS_REJECTED)
        self.assertFalse(self.customer.kyc_verified)
        self.assertIsNone(self.customer.kyc_verified_at)

    def test_record_transaction_attempt(self):
        self.assertEqual(self.customer.transaction_attempts_count, 0)
        self.assertIsNone(self.customer.first_transaction_attempt)

        self.customer.record_transaction_attempt()
        self.assertEqual(self.customer.transaction_attempts_count, 1)
        self.assertIsNotNone(self.customer.first_transaction_attempt)

        first_attempt_time = self.customer.first_transaction_attempt
        self.customer.record_transaction_attempt()
        self.assertEqual(self.customer.transaction_attempts_count, 2)
        self.assertEqual(self.customer.first_transaction_attempt, first_attempt_time)

class KYCDocumentTests(TestCase):
    """Test KYC document creation and review."""

    def setUp(self):
        self.customer_user = User.objects.create_user(
            username='kycuser', email='kyc@test.com',
            password='testpass123', user_type=USER_TYPE_CUSTOMER
        )
        self.admin_user = User.objects.create_user(
            username='kycadmin', email='kycadmin@test.com',
            password='testpass123', user_type=USER_TYPE_BUSINESS_ADMIN
        )
        self.customer = Customer.objects.get(user=self.customer_user)
        self.test_image = SimpleUploadedFile(
            "test_doc.jpg", b"fake_image_data", content_type="image/jpeg"
        )

    def test_create_kyc_document(self):
        doc = KYCDocument.objects.create(
            user=self.customer_user,
            document_type='passport',
            front_image=self.test_image,
            status=STATUS_PENDING
        )
        self.assertEqual(doc.status, STATUS_PENDING)
        self.assertEqual(doc.user, self.customer_user)
        self.assertIsNone(doc.reviewed_by)

    def test_approve_kyc_document(self):
        doc = KYCDocument.objects.create(
            user=self.customer_user,
            document_type='passport',
            front_image=self.test_image,
            status=STATUS_PENDING
        )
        approved = KYCService.approve_verification(doc)
        self.assertEqual(approved.status, 'APPROVED')

    def test_reject_kyc_document(self):
        doc = KYCDocument.objects.create(
            user=self.customer_user,
            document_type='passport',
            front_image=self.test_image,
            status=STATUS_PENDING
        )
        rejected = KYCService.reject_verification(doc, 'Document is blurry')
        self.assertEqual(rejected.status, 'REJECTED')
        self.assertEqual(rejected.rejection_reason, 'Document is blurry')

class MerchantCustomerKYCTests(TestCase):
    """Test merchant-customer KYC onboarding and admin review."""

    def setUp(self):
        self.merchant_user = User.objects.create_user(
            username='merchant', email='merchant@test.com',
            password='testpass123', user_type=USER_TYPE_MERCHANT
        )
        self.customer_user = User.objects.create_user(
            username='customer', email='customer@test.com',
            password='testpass123', user_type=USER_TYPE_CUSTOMER
        )
        self.admin_user = User.objects.create_user(
            username='admin', email='admin@test.com',
            password='testpass123', user_type=USER_TYPE_BUSINESS_ADMIN
        )
        self.merchant = Merchant.objects.get(user=self.merchant_user)
        self.merchant.business_name = 'Test Merchant'
        self.merchant.tax_id = 'TAX123'
        self.merchant.save()
        self.customer = Customer.objects.get(user=self.customer_user)

    def test_onboard_merchant_customer_with_kyc(self):
        mc = KYCService.onboard_merchant_customer(
            merchant=self.merchant,
            customer=self.customer,
            kyc_required=True,
            notes='New customer'
        )
        self.assertIsNotNone(mc)
        self.assertEqual(mc.merchant, self.merchant)
        self.assertEqual(mc.customer, self.customer)
        self.assertEqual(mc.kyc_status, 'not_started')

    def test_onboard_merchant_customer_without_kyc(self):
        mc = KYCService.onboard_merchant_customer(
            merchant=self.merchant,
            customer=self.customer,
            kyc_required=False
        )
        self.assertEqual(mc.kyc_status, 'not_required')

    def test_duplicate_onboarding_raises_error(self):
        KYCService.onboard_merchant_customer(
            merchant=self.merchant, customer=self.customer
        )
        with self.assertRaises(ValueError):
            KYCService.onboard_merchant_customer(
                merchant=self.merchant, customer=self.customer
            )

    def test_admin_approve_merchant_customer_kyc(self):
        mc = KYCService.onboard_merchant_customer(
            merchant=self.merchant, customer=self.customer
        )
        test_image = SimpleUploadedFile("id.jpg", b"img", content_type="image/jpeg")
        doc = KYCDocument.objects.create(
            user=self.customer_user,
            document_type='national_id',
            front_image=test_image,
            status=STATUS_PENDING
        )
        submission = MerchantKYCSubmission.objects.create(
            merchant_customer=mc,
            kyc_document=doc,
            status=STATUS_PENDING
        )
        result = KYCService.process_admin_kyc_decision(
            submission=submission,
            decision='approved',
            admin_user=self.admin_user,
            admin_notes='Documents verified'
        )
        self.assertEqual(result.status, 'approved')
        self.assertEqual(result.reviewed_by, self.admin_user)
        self.assertIsNotNone(result.reviewed_at)

        mc.refresh_from_db()
        self.assertEqual(mc.kyc_status, 'approved')
        self.assertEqual(mc.status, 'active')

        doc.refresh_from_db()
        self.assertEqual(doc.status, 'APPROVED')

    def test_admin_reject_merchant_customer_kyc(self):
        mc = KYCService.onboard_merchant_customer(
            merchant=self.merchant, customer=self.customer
        )
        test_image = SimpleUploadedFile("id.jpg", b"img", content_type="image/jpeg")
        doc = KYCDocument.objects.create(
            user=self.customer_user,
            document_type='national_id',
            front_image=test_image,
            status=STATUS_PENDING
        )
        submission = MerchantKYCSubmission.objects.create(
            merchant_customer=mc,
            kyc_document=doc,
            status=STATUS_PENDING
        )
        result = KYCService.process_admin_kyc_decision(
            submission=submission,
            decision='rejected',
            admin_user=self.admin_user,
            admin_notes='Fraudulent document'
        )
        self.assertEqual(result.status, 'rejected')

        mc.refresh_from_db()
        self.assertEqual(mc.kyc_status, 'rejected')
        self.assertEqual(mc.status, 'suspended')

        doc.refresh_from_db()
        self.assertEqual(doc.status, 'REJECTED')
        self.assertEqual(doc.rejection_reason, 'Fraudulent document')

    def test_admin_escalate_merchant_customer_kyc(self):
        mc = KYCService.onboard_merchant_customer(
            merchant=self.merchant, customer=self.customer
        )
        test_image = SimpleUploadedFile("id.jpg", b"img", content_type="image/jpeg")
        doc = KYCDocument.objects.create(
            user=self.customer_user,
            document_type='national_id',
            front_image=test_image,
            status=STATUS_PENDING
        )
        submission = MerchantKYCSubmission.objects.create(
            merchant_customer=mc,
            kyc_document=doc,
            status=STATUS_PENDING
        )
        result = KYCService.process_admin_kyc_decision(
            submission=submission,
            decision='escalated',
            admin_user=self.admin_user,
            admin_notes='Needs compliance review'
        )
        self.assertEqual(result.status, 'escalated')
        self.assertIsNotNone(result.escalated_at)

    def test_bulk_process_kyc_decisions(self):
        mc = KYCService.onboard_merchant_customer(
            merchant=self.merchant, customer=self.customer
        )
        test_image = SimpleUploadedFile("id.jpg", b"img", content_type="image/jpeg")
        doc = KYCDocument.objects.create(
            user=self.customer_user,
            document_type='national_id',
            front_image=test_image,
            status=STATUS_PENDING
        )
        submission = MerchantKYCSubmission.objects.create(
            merchant_customer=mc,
            kyc_document=doc,
            status=STATUS_PENDING
        )
        results = KYCService.bulk_process_kyc_decisions(
            submissions_data=[
                {'id': submission.id, 'decision': 'approved', 'admin_notes': 'Bulk approved'}
            ],
            admin_user=self.admin_user
        )
        self.assertEqual(len(results), 1)
        self.assertTrue(results[0]['success'])

    def test_merchant_kyc_submission_pending_days(self):
        mc = KYCService.onboard_merchant_customer(
            merchant=self.merchant, customer=self.customer
        )
        test_image = SimpleUploadedFile("id.jpg", b"img", content_type="image/jpeg")
        doc = KYCDocument.objects.create(
            user=self.customer_user,
            document_type='national_id',
            front_image=test_image,
            status=STATUS_PENDING
        )
        submission = MerchantKYCSubmission.objects.create(
            merchant_customer=mc,
            kyc_document=doc,
            status=STATUS_PENDING
        )
        self.assertTrue(submission.is_pending)
        self.assertEqual(submission.days_pending, 0)

    def test_approved_submission_zero_days_pending(self):
        mc = KYCService.onboard_merchant_customer(
            merchant=self.merchant, customer=self.customer
        )
        test_image = SimpleUploadedFile("id.jpg", b"img", content_type="image/jpeg")
        doc = KYCDocument.objects.create(
            user=self.customer_user,
            document_type='national_id',
            front_image=test_image,
            status=STATUS_PENDING
        )
        submission = MerchantKYCSubmission.objects.create(
            merchant_customer=mc,
            kyc_document=doc,
            status='approved'
        )
        self.assertFalse(submission.is_pending)
        self.assertEqual(submission.days_pending, 0)
