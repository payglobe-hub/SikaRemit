from rest_framework import serializers
from django.contrib.auth import get_user_model
from django.utils import timezone

from .referrals import (
    ReferralCode, Referral, Reward, RewardTransaction, ReferralCampaign
)

User = get_user_model()

class UserBasicSerializer(serializers.ModelSerializer):
    """Basic user serializer for referrals"""
    class Meta:
        model = User
        fields = ['id', 'email', 'first_name', 'last_name']

class ReferralCodeSerializer(serializers.ModelSerializer):
    """Serializer for referral codes"""
    class Meta:
        model = ReferralCode
        fields = [
            'id', 'code', 'is_active', 'total_uses', 'successful_referrals',
            'success_rate', 'created_at', 'expires_at'
        ]
        read_only_fields = ['id', 'created_at', 'success_rate']

class ReferralSerializer(serializers.ModelSerializer):
    """Serializer for referrals"""
    referrer = UserBasicSerializer(read_only=True)
    referee = UserBasicSerializer(read_only=True)
    referral_code = ReferralCodeSerializer(read_only=True)

    # Computed fields
    is_qualified = serializers.ReadOnlyField()
    days_since_created = serializers.ReadOnlyField()
    is_expired = serializers.ReadOnlyField()

    class Meta:
        model = Referral
        fields = [
            'id', 'referrer', 'referee', 'referral_code', 'status',
            'qualified_at', 'rewarded_at', 'has_completed_kyc',
            'has_made_first_transaction', 'has_reached_transaction_threshold',
            'referral_source', 'is_qualified', 'days_since_created',
            'is_expired', 'created_at', 'updated_at'
        ]
        read_only_fields = [
            'id', 'qualified_at', 'rewarded_at', 'is_qualified',
            'days_since_created', 'is_expired', 'created_at', 'updated_at'
        ]

class RewardSerializer(serializers.ModelSerializer):
    """Serializer for rewards"""
    # Computed fields
    is_expired = serializers.ReadOnlyField()
    days_until_expiry = serializers.ReadOnlyField()

    class Meta:
        model = Reward
        fields = [
            'id', 'reward_type', 'amount', 'points', 'title', 'description',
            'status', 'is_redeemable', 'expires_at', 'is_expired',
            'days_until_expiry', 'created_at', 'updated_at', 'redeemed_at'
        ]
        read_only_fields = [
            'id', 'is_expired', 'days_until_expiry', 'created_at',
            'updated_at', 'redeemed_at'
        ]

class ReferralStatsSerializer(serializers.Serializer):
    """Serializer for referral statistics"""
    referral_code = serializers.CharField()
    total_referrals = serializers.IntegerField()
    successful_referrals = serializers.IntegerField()
    pending_referrals = serializers.IntegerField()
    success_rate = serializers.FloatField()
    total_earned = serializers.DecimalField(max_digits=15, decimal_places=2)
    available_rewards = serializers.DecimalField(max_digits=15, decimal_places=2)
    recent_referrals = serializers.ListField()

class ReferralCampaignSerializer(serializers.ModelSerializer):
    """Serializer for referral campaigns"""
    # Computed fields
    is_expired = serializers.ReadOnlyField()
    success_rate = serializers.ReadOnlyField()

    class Meta:
        model = ReferralCampaign
        fields = [
            'id', 'name', 'campaign_type', 'referrer_reward_amount',
            'referee_reward_amount', 'is_active', 'max_rewards_per_user',
            'require_kyc', 'require_transaction', 'transaction_threshold',
            'start_date', 'end_date', 'total_referrals', 'successful_referrals',
            'total_rewards_given', 'is_expired', 'success_rate', 'created_at'
        ]
        read_only_fields = [
            'id', 'total_referrals', 'successful_referrals', 'total_rewards_given',
            'is_expired', 'success_rate', 'created_at'
        ]

class LeaderboardEntrySerializer(serializers.Serializer):
    """Serializer for leaderboard entries"""
    user = UserBasicSerializer()
    successful_referrals = serializers.IntegerField()
    total_uses = serializers.IntegerField()
    success_rate = serializers.FloatField()

class LeaderboardSerializer(serializers.Serializer):
    """Serializer for referral leaderboard"""
    period = serializers.CharField()
    leaderboard = LeaderboardEntrySerializer(many=True)
