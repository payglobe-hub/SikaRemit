from rest_framework import serializers
from django.contrib.auth import get_user_model
from django.utils import timezone

from .social_payments import (
    PaymentRequest, SplitBill, SplitParticipant, SplitPayment,
    GroupSavings, GroupSavingsParticipant, GroupSavingsContribution,
    SocialPaymentInvite
)

User = get_user_model()

class UserSerializer(serializers.ModelSerializer):
    """Basic user serializer for social payments"""
    class Meta:
        model = User
        fields = ['id', 'email', 'first_name', 'last_name', 'phone_number']

class PaymentRequestSerializer(serializers.ModelSerializer):
    """Serializer for payment requests"""
    requester = UserSerializer(read_only=True)
    recipient = UserSerializer(read_only=True)
    is_overdue = serializers.ReadOnlyField()
    days_until_due = serializers.ReadOnlyField()

    class Meta:
        model = PaymentRequest
        fields = [
            'id', 'requester', 'recipient', 'amount', 'currency', 'title',
            'description', 'status', 'preferred_payment_method', 'created_at',
            'updated_at', 'due_date', 'paid_at', 'transaction', 'is_overdue',
            'days_until_due'
        ]
        read_only_fields = ['id', 'created_at', 'updated_at', 'paid_at', 'is_overdue', 'days_until_due']

class PaymentRequestCreateSerializer(serializers.ModelSerializer):
    """Serializer for creating payment requests"""
    recipient_id = serializers.IntegerField(write_only=True)

    class Meta:
        model = PaymentRequest
        fields = [
            'recipient_id', 'amount', 'currency', 'title', 'description',
            'preferred_payment_method', 'due_date'
        ]

    def validate_recipient_id(self, value):
        """Ensure recipient exists and is not the requester"""
        if value == self.context['request'].user.id:
            raise serializers.ValidationError("You cannot request payment from yourself")
        try:
            User.objects.get(id=value)
        except User.DoesNotExist:
            raise serializers.ValidationError("Recipient does not exist")
        return value

    def create(self, validated_data):
        recipient_id = validated_data.pop('recipient_id')
        recipient = User.objects.get(id=recipient_id)
        return PaymentRequest.objects.create(
            requester=self.context['request'].user,
            recipient=recipient,
            **validated_data
        )

class SplitParticipantSerializer(serializers.ModelSerializer):
    """Serializer for split bill participants"""
    user = UserSerializer(read_only=True)
    amount_remaining = serializers.ReadOnlyField()
    is_paid_in_full = serializers.ReadOnlyField()

    class Meta:
        model = SplitParticipant
        fields = [
            'id', 'user', 'amount_owed', 'amount_paid', 'is_settled',
            'settled_at', 'notes', 'amount_remaining', 'is_paid_in_full'
        ]
        read_only_fields = ['id', 'settled_at', 'amount_remaining', 'is_paid_in_full']

class SplitPaymentSerializer(serializers.ModelSerializer):
    """Serializer for split bill payments"""
    payer = UserSerializer(read_only=True)

    class Meta:
        model = SplitPayment
        fields = ['id', 'payer', 'amount', 'currency', 'description', 'transaction', 'created_at']

class SplitBillSerializer(serializers.ModelSerializer):
    """Serializer for split bills"""
    creator = UserSerializer(read_only=True)
    participants = SplitParticipantSerializer(many=True, read_only=True)
    payments = SplitPaymentSerializer(many=True, read_only=True)
    total_paid = serializers.ReadOnlyField()
    is_fully_paid = serializers.ReadOnlyField()

    class Meta:
        model = SplitBill
        fields = [
            'id', 'creator', 'title', 'description', 'total_amount', 'currency',
            'status', 'split_type', 'created_at', 'updated_at', 'settled_at',
            'participants', 'payments', 'total_paid', 'is_fully_paid'
        ]
        read_only_fields = ['id', 'created_at', 'updated_at', 'settled_at', 'total_paid', 'is_fully_paid']

class SplitBillCreateSerializer(serializers.ModelSerializer):
    """Serializer for creating split bills"""
    participants = serializers.ListField(
        child=serializers.DictField(),
        write_only=True,
        help_text="List of participants with user_id and amount_owed"
    )

    class Meta:
        model = SplitBill
        fields = [
            'title', 'description', 'total_amount', 'currency', 'split_type', 'participants'
        ]

    def validate_participants(self, value):
        """Validate participants data"""
        if not value:
            raise serializers.ValidationError("At least one participant is required")

        total_owed = sum(float(p.get('amount_owed', 0)) for p in value)
        total_amount = float(self.initial_data.get('total_amount', 0))

        if abs(total_owed - total_amount) > 0.01:  # Allow small rounding differences
            raise serializers.ValidationError("Sum of participant amounts must equal total bill amount")

        return value

    def create(self, validated_data):
        participants_data = validated_data.pop('participants')
        split_bill = SplitBill.objects.create(
            creator=self.context['request'].user,
            **validated_data
        )

        # Create participants
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
                # Skip invalid users - could send invites later
                pass

        return split_bill

class GroupSavingsParticipantSerializer(serializers.ModelSerializer):
    """Serializer for group savings participants"""
    user = UserSerializer(read_only=True)

    class Meta:
        model = GroupSavingsParticipant
        fields = [
            'id', 'user', 'contribution_amount', 'contribution_frequency',
            'total_contributed', 'role', 'is_active', 'joined_at'
        ]
        read_only_fields = ['id', 'total_contributed', 'joined_at']

class GroupSavingsContributionSerializer(serializers.ModelSerializer):
    """Serializer for group savings contributions"""
    contributor = UserSerializer(read_only=True)

    class Meta:
        model = GroupSavingsContribution
        fields = ['id', 'contributor', 'amount', 'currency', 'message', 'transaction', 'created_at']

class GroupSavingsSerializer(serializers.ModelSerializer):
    """Serializer for group savings goals"""
    creator = UserSerializer(read_only=True)
    participants = GroupSavingsParticipantSerializer(many=True, read_only=True)
    contributions = GroupSavingsContributionSerializer(many=True, read_only=True)
    progress_percentage = serializers.ReadOnlyField()
    days_remaining = serializers.ReadOnlyField()
    is_completed = serializers.ReadOnlyField()
    is_expired = serializers.ReadOnlyField()

    class Meta:
        model = GroupSavings
        fields = [
            'id', 'creator', 'title', 'description', 'target_amount', 'currency',
            'current_amount', 'target_date', 'status', 'is_public', 'allow_auto_contributions',
            'created_at', 'updated_at', 'completed_at', 'participants', 'contributions',
            'progress_percentage', 'days_remaining', 'is_completed', 'is_expired'
        ]
        read_only_fields = [
            'id', 'created_at', 'updated_at', 'completed_at', 'progress_percentage',
            'days_remaining', 'is_completed', 'is_expired'
        ]

class GroupSavingsCreateSerializer(serializers.ModelSerializer):
    """Serializer for creating group savings goals"""

    class Meta:
        model = GroupSavings
        fields = [
            'title', 'description', 'target_amount', 'currency', 'target_date',
            'is_public', 'allow_auto_contributions'
        ]

class SocialPaymentInviteSerializer(serializers.ModelSerializer):
    """Serializer for social payment invites"""
    sender = UserSerializer(read_only=True)
    is_expired = serializers.ReadOnlyField()

    class Meta:
        model = SocialPaymentInvite
        fields = [
            'id', 'sender', 'recipient_email', 'recipient_phone', 'invite_type',
            'related_object_id', 'title', 'message', 'status', 'invite_token',
            'expires_at', 'created_at', 'accepted_at', 'is_expired'
        ]
        read_only_fields = [
            'id', 'invite_token', 'expires_at', 'created_at', 'accepted_at', 'is_expired'
        ]
