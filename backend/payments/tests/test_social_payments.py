"""
Social Payments Tests.

Tests payment requests, split bills, group savings,
participant management, contributions, and settlement.
"""
from django.test import TestCase
from django.contrib.auth import get_user_model
from django.utils import timezone
from decimal import Decimal
from datetime import timedelta

from payments.models.social_payments import (
    PaymentRequest, SplitBill, SplitParticipant, SplitPayment,
    GroupSavings, GroupSavingsParticipant, GroupSavingsContribution,
    SocialPaymentInvite
)
from shared.constants import USER_TYPE_CUSTOMER

User = get_user_model()


class PaymentRequestTests(TestCase):
    """Test payment request creation and status."""

    def setUp(self):
        self.requester = User.objects.create_user(
            username='requester', email='req@test.com',
            password='testpass123', user_type=USER_TYPE_CUSTOMER
        )
        self.recipient = User.objects.create_user(
            username='recipient', email='rec@test.com',
            password='testpass123', user_type=USER_TYPE_CUSTOMER
        )

    def test_create_payment_request(self):
        pr = PaymentRequest.objects.create(
            requester=self.requester, recipient=self.recipient,
            amount=Decimal('50.00'), currency='GHS',
            title='Dinner payment'
        )
        self.assertEqual(pr.status, 'pending')
        self.assertEqual(pr.amount, Decimal('50.00'))

    def test_payment_request_with_due_date(self):
        due = timezone.now() + timedelta(days=7)
        pr = PaymentRequest.objects.create(
            requester=self.requester, recipient=self.recipient,
            amount=Decimal('100.00'), title='Rent',
            due_date=due
        )
        self.assertIsNotNone(pr.due_date)
        self.assertFalse(pr.is_overdue)

    def test_overdue_payment_request(self):
        pr = PaymentRequest.objects.create(
            requester=self.requester, recipient=self.recipient,
            amount=Decimal('100.00'), title='Past due',
            due_date=timezone.now() - timedelta(days=1)
        )
        self.assertTrue(pr.is_overdue)

    def test_paid_request_not_overdue(self):
        pr = PaymentRequest.objects.create(
            requester=self.requester, recipient=self.recipient,
            amount=Decimal('50.00'), title='Paid',
            due_date=timezone.now() - timedelta(days=1),
            status='paid'
        )
        self.assertFalse(pr.is_overdue)

    def test_cancel_payment_request(self):
        pr = PaymentRequest.objects.create(
            requester=self.requester, recipient=self.recipient,
            amount=Decimal('50.00'), title='Cancel me'
        )
        pr.status = 'cancelled'
        pr.save()
        pr.refresh_from_db()
        self.assertEqual(pr.status, 'cancelled')

    def test_days_until_due(self):
        pr = PaymentRequest.objects.create(
            requester=self.requester, recipient=self.recipient,
            amount=Decimal('50.00'), title='Future',
            due_date=timezone.now() + timedelta(days=5)
        )
        self.assertIsNotNone(pr.days_until_due)
        self.assertGreaterEqual(pr.days_until_due, 4)

    def test_no_due_date_returns_none(self):
        pr = PaymentRequest.objects.create(
            requester=self.requester, recipient=self.recipient,
            amount=Decimal('50.00'), title='No due'
        )
        self.assertIsNone(pr.days_until_due)


class SplitBillTests(TestCase):
    """Test split bill creation, participants, and payments."""

    def setUp(self):
        self.creator = User.objects.create_user(
            username='creator', email='creator@test.com',
            password='testpass123', user_type=USER_TYPE_CUSTOMER
        )
        self.user2 = User.objects.create_user(
            username='user2', email='user2@test.com',
            password='testpass123', user_type=USER_TYPE_CUSTOMER
        )
        self.user3 = User.objects.create_user(
            username='user3', email='user3@test.com',
            password='testpass123', user_type=USER_TYPE_CUSTOMER
        )

    def test_create_equal_split(self):
        bill = SplitBill.objects.create(
            creator=self.creator, title='Dinner',
            total_amount=Decimal('90.00'), currency='GHS',
            split_type='equal'
        )
        self.assertEqual(bill.status, 'active')
        self.assertEqual(bill.split_type, 'equal')

    def test_add_participants(self):
        bill = SplitBill.objects.create(
            creator=self.creator, title='Lunch',
            total_amount=Decimal('60.00')
        )
        SplitParticipant.objects.create(
            split_bill=bill, user=self.creator,
            amount_owed=Decimal('20.00')
        )
        SplitParticipant.objects.create(
            split_bill=bill, user=self.user2,
            amount_owed=Decimal('20.00')
        )
        SplitParticipant.objects.create(
            split_bill=bill, user=self.user3,
            amount_owed=Decimal('20.00')
        )
        self.assertEqual(bill.participants.count(), 3)

    def test_participant_amount_remaining(self):
        bill = SplitBill.objects.create(
            creator=self.creator, title='Test',
            total_amount=Decimal('100.00')
        )
        participant = SplitParticipant.objects.create(
            split_bill=bill, user=self.user2,
            amount_owed=Decimal('50.00'), amount_paid=Decimal('20.00')
        )
        self.assertEqual(participant.amount_remaining, Decimal('30.00'))
        self.assertFalse(participant.is_paid_in_full)

    def test_participant_mark_as_paid(self):
        bill = SplitBill.objects.create(
            creator=self.creator, title='Test',
            total_amount=Decimal('100.00')
        )
        participant = SplitParticipant.objects.create(
            split_bill=bill, user=self.user2,
            amount_owed=Decimal('50.00')
        )
        participant.mark_as_paid()
        self.assertTrue(participant.is_paid_in_full)
        self.assertTrue(participant.is_settled)
        self.assertIsNotNone(participant.settled_at)

    def test_participant_partial_payment(self):
        bill = SplitBill.objects.create(
            creator=self.creator, title='Test',
            total_amount=Decimal('100.00')
        )
        participant = SplitParticipant.objects.create(
            split_bill=bill, user=self.user2,
            amount_owed=Decimal('50.00')
        )
        participant.mark_as_paid(payment_amount=Decimal('25.00'))
        self.assertFalse(participant.is_paid_in_full)
        self.assertEqual(participant.amount_paid, Decimal('25.00'))

    def test_split_bill_total_paid(self):
        bill = SplitBill.objects.create(
            creator=self.creator, title='Test',
            total_amount=Decimal('60.00')
        )
        SplitPayment.objects.create(
            split_bill=bill, payer=self.user2,
            amount=Decimal('20.00')
        )
        SplitPayment.objects.create(
            split_bill=bill, payer=self.user3,
            amount=Decimal('20.00')
        )
        self.assertEqual(bill.total_paid, Decimal('40.00'))
        self.assertFalse(bill.is_fully_paid)

    def test_split_bill_fully_paid(self):
        bill = SplitBill.objects.create(
            creator=self.creator, title='Test',
            total_amount=Decimal('40.00')
        )
        SplitPayment.objects.create(
            split_bill=bill, payer=self.user2,
            amount=Decimal('20.00')
        )
        SplitPayment.objects.create(
            split_bill=bill, payer=self.user3,
            amount=Decimal('20.00')
        )
        self.assertTrue(bill.is_fully_paid)

    def test_settle_bill(self):
        bill = SplitBill.objects.create(
            creator=self.creator, title='Settle',
            total_amount=Decimal('30.00')
        )
        bill.settle_bill()
        self.assertEqual(bill.status, 'settled')
        self.assertIsNotNone(bill.settled_at)

    def test_unique_participant_per_bill(self):
        bill = SplitBill.objects.create(
            creator=self.creator, title='Unique',
            total_amount=Decimal('50.00')
        )
        SplitParticipant.objects.create(
            split_bill=bill, user=self.user2,
            amount_owed=Decimal('25.00')
        )
        with self.assertRaises(Exception):
            SplitParticipant.objects.create(
                split_bill=bill, user=self.user2,
                amount_owed=Decimal('25.00')
            )


class GroupSavingsTests(TestCase):
    """Test group savings goals and contributions."""

    def setUp(self):
        self.creator = User.objects.create_user(
            username='gsaver', email='gsaver@test.com',
            password='testpass123', user_type=USER_TYPE_CUSTOMER
        )
        self.member = User.objects.create_user(
            username='gmember', email='gmember@test.com',
            password='testpass123', user_type=USER_TYPE_CUSTOMER
        )

    def test_create_group_savings(self):
        gs = GroupSavings.objects.create(
            creator=self.creator, title='Vacation Fund',
            target_amount=Decimal('5000.00'), currency='GHS',
            target_date=timezone.now().date() + timedelta(days=90)
        )
        self.assertEqual(gs.status, 'active')
        self.assertEqual(gs.current_amount, Decimal('0'))

    def test_progress_percentage(self):
        gs = GroupSavings.objects.create(
            creator=self.creator, title='Progress',
            target_amount=Decimal('1000.00'),
            current_amount=Decimal('250.00'),
            target_date=timezone.now().date() + timedelta(days=30)
        )
        self.assertEqual(gs.progress_percentage, 25)

    def test_days_remaining(self):
        gs = GroupSavings.objects.create(
            creator=self.creator, title='Days',
            target_amount=Decimal('1000.00'),
            target_date=timezone.now().date() + timedelta(days=10)
        )
        self.assertIsNotNone(gs.days_remaining)
        self.assertGreaterEqual(gs.days_remaining, 9)

    def test_add_contribution(self):
        gs = GroupSavings.objects.create(
            creator=self.creator, title='Contrib',
            target_amount=Decimal('1000.00'),
            target_date=timezone.now().date() + timedelta(days=30)
        )
        contribution = gs.add_contribution(self.member, Decimal('200.00'))
        self.assertIsNotNone(contribution)
        gs.refresh_from_db()
        self.assertEqual(gs.current_amount, Decimal('200.00'))

    def test_goal_completed_on_reaching_target(self):
        gs = GroupSavings.objects.create(
            creator=self.creator, title='Complete',
            target_amount=Decimal('100.00'),
            target_date=timezone.now().date() + timedelta(days=30)
        )
        gs.add_contribution(self.creator, Decimal('60.00'))
        gs.add_contribution(self.member, Decimal('50.00'))
        gs.refresh_from_db()
        self.assertTrue(gs.is_completed)
        self.assertEqual(gs.status, 'completed')
        self.assertIsNotNone(gs.completed_at)

    def test_expired_savings(self):
        gs = GroupSavings.objects.create(
            creator=self.creator, title='Expired',
            target_amount=Decimal('1000.00'),
            target_date=timezone.now().date() - timedelta(days=1)
        )
        self.assertTrue(gs.is_expired)

    def test_add_participant(self):
        gs = GroupSavings.objects.create(
            creator=self.creator, title='Participant',
            target_amount=Decimal('1000.00'),
            target_date=timezone.now().date() + timedelta(days=30)
        )
        participant = GroupSavingsParticipant.objects.create(
            group_savings=gs, user=self.member,
            contribution_amount=Decimal('100.00'),
            contribution_frequency='monthly', role='member'
        )
        self.assertTrue(participant.is_active)
        self.assertEqual(participant.role, 'member')

    def test_unique_participant_per_group(self):
        gs = GroupSavings.objects.create(
            creator=self.creator, title='Unique',
            target_amount=Decimal('1000.00'),
            target_date=timezone.now().date() + timedelta(days=30)
        )
        GroupSavingsParticipant.objects.create(
            group_savings=gs, user=self.member
        )
        with self.assertRaises(Exception):
            GroupSavingsParticipant.objects.create(
                group_savings=gs, user=self.member
            )


class SocialPaymentInviteTests(TestCase):
    """Test social payment invites to non-users."""

    def setUp(self):
        self.sender = User.objects.create_user(
            username='sender', email='sender@test.com',
            password='testpass123', user_type=USER_TYPE_CUSTOMER
        )

    def test_create_invite(self):
        invite = SocialPaymentInvite.objects.create(
            sender=self.sender,
            recipient_email='friend@external.com',
            invite_type='split_bill',
            related_object_id=1,
            title='Join our dinner split',
            invite_token='unique-token-123',
            expires_at=timezone.now() + timedelta(days=7)
        )
        self.assertEqual(invite.status, 'sent')
        self.assertFalse(invite.is_expired)

    def test_expired_invite(self):
        invite = SocialPaymentInvite.objects.create(
            sender=self.sender,
            recipient_email='old@external.com',
            invite_type='payment_request',
            related_object_id=1,
            title='Old request',
            invite_token='expired-token-123',
            expires_at=timezone.now() - timedelta(days=1)
        )
        self.assertTrue(invite.is_expired)

    def test_invite_types(self):
        for i, (invite_type, _) in enumerate(SocialPaymentInvite.INVITE_TYPE_CHOICES):
            invite = SocialPaymentInvite.objects.create(
                sender=self.sender,
                recipient_email=f'{invite_type}@test.com',
                invite_type=invite_type,
                related_object_id=i + 1,
                title=f'{invite_type} invite',
                invite_token=f'token-{invite_type}-{i}',
                expires_at=timezone.now() + timedelta(days=7)
            )
            self.assertEqual(invite.invite_type, invite_type)
