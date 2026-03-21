from rest_framework import status, generics
from rest_framework.decorators import api_view, permission_classes, action
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response
from rest_framework.viewsets import ModelViewSet
from django.shortcuts import get_object_or_404
from django.utils import timezone
from django.db import models
from datetime import timedelta
import uuid

from .models.social_payments import (
    PaymentRequest, SplitBill, SplitParticipant, SplitPayment,
    GroupSavings, GroupSavingsParticipant, GroupSavingsContribution,
    SocialPaymentInvite
)
from .serializers.social_payments import (
    PaymentRequestSerializer, PaymentRequestCreateSerializer,
    SplitBillSerializer, SplitBillCreateSerializer,
    SplitParticipantSerializer, GroupSavingsSerializer,
    GroupSavingsCreateSerializer, SocialPaymentInviteSerializer
)

# Payment Requests Views
class PaymentRequestViewSet(ModelViewSet):
    """
    ViewSet for managing payment requests between users
    """
    permission_classes = [IsAuthenticated]
    serializer_class = PaymentRequestSerializer

    def get_queryset(self):
        user = self.request.user
        return PaymentRequest.objects.filter(
            models.Q(requester=user) | models.Q(recipient=user)
        ).select_related('requester', 'recipient', 'transaction')

    def get_serializer_class(self):
        if self.action in ['create', 'update', 'partial_update']:
            return PaymentRequestCreateSerializer
        return PaymentRequestSerializer

    def perform_create(self, serializer):
        serializer.save(requester=self.request.user)

    @action(detail=True, methods=['post'])
    def pay_request(self, request, pk=None):
        """Pay a payment request"""
        payment_request = self.get_object()

        # Validate that user is the recipient
        if payment_request.recipient != request.user:
            return Response(
                {'error': 'You can only pay requests sent to you'},
                status=status.HTTP_403_FORBIDDEN
            )

        if payment_request.status != 'pending':
            return Response(
                {'error': 'Payment request is not pending'},
                status=status.HTTP_400_BAD_REQUEST
            )

        # Process payment through the payment gateway
        payment_method_id = request.data.get('payment_method_id')
        if not payment_method_id:
            return Response(
                {'error': 'payment_method_id is required'},
                status=status.HTTP_400_BAD_REQUEST
            )

        try:
            from django.db import transaction as db_transaction
            from payments.models import PaymentMethod
            from payments.services.payment_service import PaymentProcessor

            pay_method = PaymentMethod.objects.get(id=payment_method_id, user=request.user)
            processor = PaymentProcessor()

            gateway = processor._get_gateway_for_payment_method(pay_method)
            gateway_result = gateway.process_payment(
                amount=float(payment_request.amount),
                currency=getattr(payment_request, 'currency', 'GHS'),
                payment_method=pay_method,
                customer=request.user.customer_profile if hasattr(request.user, 'customer_profile') else None,
                merchant=None,
                metadata={
                    'type': 'payment_request',
                    'payment_request_id': str(payment_request.id),
                    'requester_id': str(payment_request.requester.id),
                }
            )

            if not gateway_result.get('success'):
                return Response(
                    {'error': gateway_result.get('error', 'Payment processing failed')},
                    status=status.HTTP_400_BAD_REQUEST
                )

            # DB update inside atomic block — if it fails, issue a refund
            try:
                with db_transaction.atomic():
                    payment_request.status = 'paid'
                    payment_request.paid_at = timezone.now()
                    payment_request.save()
            except Exception as db_err:
                logger.error(f"DB save failed after successful charge, issuing refund: {db_err}")
                try:
                    gateway.refund_payment(
                        transaction_id=gateway_result.get('transaction_id'),
                        amount=float(payment_request.amount),
                        reason='DB save failed after charge'
                    )
                except Exception as refund_err:
                    logger.critical(
                        f"REFUND ALSO FAILED for payment_request {payment_request.id}, "
                        f"gateway_tx={gateway_result.get('transaction_id')}, "
                        f"amount={payment_request.amount}: {refund_err}"
                    )
                return Response(
                    {'error': 'Payment was charged but recording failed. A refund has been initiated.'},
                    status=status.HTTP_500_INTERNAL_SERVER_ERROR
                )

        except PaymentMethod.DoesNotExist:
            return Response(
                {'error': 'Payment method not found'},
                status=status.HTTP_404_NOT_FOUND
            )
        except Exception as e:
            logger.error(f"Payment request processing failed: {e}")
            return Response(
                {'error': f'Payment processing failed: {str(e)}'},
                status=status.HTTP_500_INTERNAL_SERVER_ERROR
            )

        serializer = self.get_serializer(payment_request)
        return Response(serializer.data)

    @action(detail=True, methods=['post'])
    def cancel_request(self, request, pk=None):
        """Cancel a payment request"""
        payment_request = self.get_object()

        # Only requester can cancel
        if payment_request.requester != request.user:
            return Response(
                {'error': 'Only the requester can cancel this payment request'},
                status=status.HTTP_403_FORBIDDEN
            )

        if payment_request.status != 'pending':
            return Response(
                {'error': 'Can only cancel pending requests'},
                status=status.HTTP_400_BAD_REQUEST
            )

        payment_request.status = 'cancelled'
        payment_request.save()

        serializer = self.get_serializer(payment_request)
        return Response(serializer.data)

# Split Bills Views
class SplitBillViewSet(ModelViewSet):
    """
    ViewSet for managing split bills
    """
    permission_classes = [IsAuthenticated]
    serializer_class = SplitBillSerializer

    def get_queryset(self):
        user = self.request.user
        return SplitBill.objects.filter(
            models.Q(creator=user) | models.Q(participants__user=user)
        ).distinct().prefetch_related('participants', 'payments')

    def get_serializer_class(self):
        if self.action in ['create', 'update', 'partial_update']:
            return SplitBillCreateSerializer
        return SplitBillSerializer

    def perform_create(self, serializer):
        with transaction.atomic():
            split_bill = serializer.save(creator=self.request.user)

            # Create participants based on the data
            participants_data = self.request.data.get('participants', [])
            for participant_data in participants_data:
                user_id = participant_data.get('user_id')
                amount_owed = participant_data.get('amount_owed')

                try:
                    user = User.objects.get(id=user_id)
                    SplitParticipant.objects.create(
                        split_bill=split_bill,
                        user=user,
                        amount_owed=amount_owed
                    )
                except User.DoesNotExist:
                    # Handle non-existent users (could create invites later)
                    pass

    @action(detail=True, methods=['post'])
    def add_payment(self, request, pk=None):
        """Add a payment to a split bill"""
        split_bill = self.get_object()

        amount = request.data.get('amount')
        payment_method_id = request.data.get('payment_method_id')
        description = request.data.get('description', '')

        if not amount:
            return Response(
                {'error': 'Amount is required'},
                status=status.HTTP_400_BAD_REQUEST
            )

        if not payment_method_id:
            return Response(
                {'error': 'payment_method_id is required'},
                status=status.HTTP_400_BAD_REQUEST
            )

        # Route payment through gateway
        try:
            from django.db import transaction as db_transaction
            from payments.models import PaymentMethod
            from payments.services.payment_service import PaymentProcessor

            pay_method = PaymentMethod.objects.get(id=payment_method_id, user=request.user)
            processor = PaymentProcessor()
            gateway = processor._get_gateway_for_payment_method(pay_method)

            gateway_result = gateway.process_payment(
                amount=float(amount),
                currency=getattr(split_bill, 'currency', 'GHS'),
                payment_method=pay_method,
                customer=request.user.customer_profile if hasattr(request.user, 'customer_profile') else None,
                merchant=None,
                metadata={
                    'type': 'split_bill_payment',
                    'split_bill_id': str(split_bill.id),
                }
            )

            if not gateway_result.get('success'):
                return Response(
                    {'error': gateway_result.get('error', 'Payment processing failed')},
                    status=status.HTTP_400_BAD_REQUEST
                )

            # Record payment + update participants atomically; refund if DB fails
            try:
                with db_transaction.atomic():
                    payment = SplitPayment.objects.create(
                        split_bill=split_bill,
                        payer=request.user,
                        amount=amount,
                        description=description
                    )

                    participants = split_bill.participants.filter(is_settled=False)
                    if participants.exists():
                        amount_per_participant = float(amount) / participants.count()
                        for participant in participants:
                            participant.amount_paid += amount_per_participant
                            if participant.is_paid_in_full:
                                participant.is_settled = True
                                participant.settled_at = timezone.now()
                            participant.save()
            except Exception as db_err:
                logger.error(f"DB save failed after split bill charge, issuing refund: {db_err}")
                try:
                    gateway.refund_payment(
                        transaction_id=gateway_result.get('transaction_id'),
                        amount=float(amount),
                        reason='DB save failed after charge'
                    )
                except Exception as refund_err:
                    logger.critical(
                        f"REFUND ALSO FAILED for split_bill {split_bill.id}, "
                        f"gateway_tx={gateway_result.get('transaction_id')}, "
                        f"amount={amount}: {refund_err}"
                    )
                return Response(
                    {'error': 'Payment was charged but recording failed. A refund has been initiated.'},
                    status=status.HTTP_500_INTERNAL_SERVER_ERROR
                )

        except PaymentMethod.DoesNotExist:
            return Response({'error': 'Payment method not found'}, status=status.HTTP_404_NOT_FOUND)
        except Exception as e:
            logger.error(f"Split bill payment failed: {e}")
            return Response(
                {'error': f'Payment processing failed: {str(e)}'},
                status=status.HTTP_500_INTERNAL_SERVER_ERROR
            )

        serializer = SplitBillSerializer(split_bill)
        return Response(serializer.data)

    @action(detail=True, methods=['post'])
    def settle_bill(self, request, pk=None):
        """Mark a split bill as settled"""
        split_bill = self.get_object()

        # Only creator can settle
        if split_bill.creator != request.user:
            return Response(
                {'error': 'Only the creator can settle this bill'},
                status=status.HTTP_403_FORBIDDEN
            )

        split_bill.settle_bill()

        serializer = self.get_serializer(split_bill)
        return Response(serializer.data)

# Group Savings Views
class GroupSavingsViewSet(ModelViewSet):
    """
    ViewSet for managing group savings goals
    """
    permission_classes = [IsAuthenticated]
    serializer_class = GroupSavingsSerializer

    def get_queryset(self):
        user = self.request.user
        return GroupSavings.objects.filter(
            models.Q(creator=user) | models.Q(participants__user=user)
        ).distinct().prefetch_related('participants', 'contributions')

    def get_serializer_class(self):
        if self.action in ['create', 'update', 'partial_update']:
            return GroupSavingsCreateSerializer
        return GroupSavingsSerializer

    def perform_create(self, serializer):
        with transaction.atomic():
            group_savings = serializer.save(creator=self.request.user)

            # Add creator as admin participant
            GroupSavingsParticipant.objects.create(
                group_savings=group_savings,
                user=self.request.user,
                role='admin'
            )

    @action(detail=True, methods=['post'])
    def join_group(self, request, pk=None):
        """Join a public group savings goal"""
        group_savings = self.get_object()

        if not group_savings.is_public:
            return Response(
                {'error': 'This group is not public'},
                status=status.HTTP_403_FORBIDDEN
            )

        # Check if already a participant
        if GroupSavingsParticipant.objects.filter(
            group_savings=group_savings,
            user=request.user
        ).exists():
            return Response(
                {'error': 'You are already a participant in this group'},
                status=status.HTTP_400_BAD_REQUEST
            )

        # Create participant record
        participant = GroupSavingsParticipant.objects.create(
            group_savings=group_savings,
            user=request.user
        )

        serializer = GroupSavingsSerializer(group_savings)
        return Response(serializer.data)

    @action(detail=True, methods=['post'])
    def add_contribution(self, request, pk=None):
        """Add a contribution to group savings"""
        group_savings = self.get_object()

        amount = request.data.get('amount')
        payment_method_id = request.data.get('payment_method_id')
        message = request.data.get('message', '')

        if not amount:
            return Response(
                {'error': 'Amount is required'},
                status=status.HTTP_400_BAD_REQUEST
            )

        if not payment_method_id:
            return Response(
                {'error': 'payment_method_id is required'},
                status=status.HTTP_400_BAD_REQUEST
            )

        # Check if user is a participant
        try:
            participant = GroupSavingsParticipant.objects.get(
                group_savings=group_savings,
                user=request.user
            )
        except GroupSavingsParticipant.DoesNotExist:
            return Response(
                {'error': 'You are not a participant in this group'},
                status=status.HTTP_403_FORBIDDEN
            )

        # Route contribution through payment gateway
        try:
            from django.db import transaction as db_transaction
            from payments.models import PaymentMethod
            from payments.services.payment_service import PaymentProcessor

            pay_method = PaymentMethod.objects.get(id=payment_method_id, user=request.user)
            processor = PaymentProcessor()
            gateway = processor._get_gateway_for_payment_method(pay_method)

            gateway_result = gateway.process_payment(
                amount=float(amount),
                currency=getattr(group_savings, 'currency', 'GHS'),
                payment_method=pay_method,
                customer=request.user.customer_profile if hasattr(request.user, 'customer_profile') else None,
                merchant=None,
                metadata={
                    'type': 'group_savings_contribution',
                    'group_savings_id': str(group_savings.id),
                    'message': message,
                }
            )

            if not gateway_result.get('success'):
                return Response(
                    {'error': gateway_result.get('error', 'Payment processing failed')},
                    status=status.HTTP_400_BAD_REQUEST
                )

            # Record contribution atomically; refund if DB fails
            try:
                with db_transaction.atomic():
                    contribution = group_savings.add_contribution(request.user, amount)
                    participant.total_contributed += amount
                    participant.save()
            except Exception as db_err:
                logger.error(f"DB save failed after group savings charge, issuing refund: {db_err}")
                try:
                    gateway.refund_payment(
                        transaction_id=gateway_result.get('transaction_id'),
                        amount=float(amount),
                        reason='DB save failed after charge'
                    )
                except Exception as refund_err:
                    logger.critical(
                        f"REFUND ALSO FAILED for group_savings {group_savings.id}, "
                        f"gateway_tx={gateway_result.get('transaction_id')}, "
                        f"amount={amount}: {refund_err}"
                    )
                return Response(
                    {'error': 'Payment was charged but recording failed. A refund has been initiated.'},
                    status=status.HTTP_500_INTERNAL_SERVER_ERROR
                )

        except PaymentMethod.DoesNotExist:
            return Response({'error': 'Payment method not found'}, status=status.HTTP_404_NOT_FOUND)
        except Exception as e:
            logger.error(f"Group savings contribution payment failed: {e}")
            return Response(
                {'error': f'Payment processing failed: {str(e)}'},
                status=status.HTTP_500_INTERNAL_SERVER_ERROR
            )

        serializer = GroupSavingsSerializer(group_savings)
        return Response(serializer.data)

# Social Payment Invites
@api_view(['POST'])
@permission_classes([IsAuthenticated])
def send_social_invite(request):
    """
    Send an invitation for social payments to non-registered users
    ---
    parameters:
      - name: recipient_email
        type: string
        required: true
      - name: invite_type
        type: string
        enum: [payment_request, split_bill, group_savings]
        required: true
      - name: related_object_id
        type: integer
        required: true
      - name: title
        type: string
        required: true
      - name: message
        type: string
    """
    recipient_email = request.data.get('recipient_email')
    invite_type = request.data.get('invite_type')
    related_object_id = request.data.get('related_object_id')
    title = request.data.get('title')
    message = request.data.get('message', '')

    if not all([recipient_email, invite_type, related_object_id, title]):
        return Response(
            {'error': 'Missing required fields'},
            status=status.HTTP_400_BAD_REQUEST
        )

    # Generate unique token
    invite_token = str(uuid.uuid4())

    # Create invite
    invite = SocialPaymentInvite.objects.create(
        sender=request.user,
        recipient_email=recipient_email,
        invite_type=invite_type,
        related_object_id=related_object_id,
        title=title,
        message=message,
        invite_token=invite_token,
        expires_at=timezone.now() + timedelta(days=7)  # 7 days expiry
    )

    # Send email invitation to recipient
    try:
        from django.core.mail import send_mail
        from django.conf import settings as django_settings

        invite_url = f"{django_settings.FRONTEND_URL or 'https://sikaremit.com'}/invite/{invite_token}"
        email_body = (
            f"{request.user.get_full_name() or request.user.email} has invited you to {title}.\n\n"
            f"{message}\n\n"
            f"Accept the invitation here: {invite_url}\n\n"
            f"This invitation expires in 7 days."
        )
        send_mail(
            subject=f"SikaRemit Invitation: {title}",
            message=email_body,
            from_email=getattr(django_settings, 'DEFAULT_FROM_EMAIL', 'noreply@sikaremit.com'),
            recipient_list=[recipient_email],
            fail_silently=True,
        )
    except Exception as e:
        logger.error(f"Failed to send invite email to {recipient_email}: {e}")

    serializer = SocialPaymentInviteSerializer(invite)
    return Response(serializer.data)

@api_view(['POST'])
@permission_classes([IsAuthenticated])
def accept_social_invite(request, token):
    """
    Accept a social payment invitation using token
    ---
    parameters:
      - name: token
        type: string
        description: Invitation token from URL
    """
    try:
        invite = SocialPaymentInvite.objects.get(
            invite_token=token,
            expires_at__gt=timezone.now()
        )
    except SocialPaymentInvite.DoesNotExist:
        return Response(
            {'error': 'Invalid or expired invitation'},
            status=status.HTTP_404_NOT_FOUND
        )

    if invite.status != 'sent':
        return Response(
            {'error': 'Invitation has already been processed'},
            status=status.HTTP_400_BAD_REQUEST
        )

    # Mark invite as accepted
    invite.status = 'accepted'
    invite.accepted_at = timezone.now()
    invite.save()

    # Add user to the appropriate group/object
    if invite.invite_type == 'group_savings':
        try:
            group_savings = GroupSavings.objects.get(id=invite.related_object_id)
            if not GroupSavingsParticipant.objects.filter(
                group_savings=group_savings,
                user=request.user
            ).exists():
                GroupSavingsParticipant.objects.create(
                    group_savings=group_savings,
                    user=request.user
                )
        except GroupSavings.DoesNotExist:
            return Response(
                {'error': 'Group savings not found'},
                status=status.HTTP_404_NOT_FOUND
            )

    elif invite.invite_type == 'split_bill':
        try:
            split_bill = SplitBill.objects.get(id=invite.related_object_id)
            if not SplitBillParticipant.objects.filter(
                split_bill=split_bill,
                user=request.user
            ).exists():
                SplitBillParticipant.objects.create(
                    split_bill=split_bill,
                    user=request.user
                )
        except SplitBill.DoesNotExist:
            return Response(
                {'error': 'Split bill not found'},
                status=status.HTTP_404_NOT_FOUND
            )

    elif invite.invite_type == 'payment_request':
        try:
            payment_request = PaymentRequest.objects.get(id=invite.related_object_id)
            payment_request.recipient = request.user
            payment_request.status = 'accepted'
            payment_request.save()
        except PaymentRequest.DoesNotExist:
            return Response(
                {'error': 'Payment request not found'},
                status=status.HTTP_404_NOT_FOUND
            )

    return Response({
        'message': 'Invitation accepted successfully',
        'invite_type': invite.invite_type,
        'title': invite.title
    })
