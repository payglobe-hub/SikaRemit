from rest_framework import status, generics
from rest_framework.decorators import api_view, permission_classes, action
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response
from rest_framework.viewsets import ModelViewSet
from django.shortcuts import get_object_or_404
from django.utils import timezone
from django.db import models
from django.core.exceptions import ValidationError

from .models.referrals import (
    ReferralCode, Referral, Reward, RewardTransaction, ReferralCampaign
)
from .serializers.referrals import (
    ReferralCodeSerializer, ReferralSerializer, RewardSerializer,
    ReferralStatsSerializer, ReferralCampaignSerializer
)

class ReferralCodeViewSet(generics.RetrieveAPIView):
    """
    ViewSet for managing user's referral code
    """
    permission_classes = [IsAuthenticated]
    serializer_class = ReferralCodeSerializer

    def get_object(self):
        # Get or create referral code for the user
        referral_code, created = ReferralCode.objects.get_or_create(
            user=self.request.user,
            defaults={'code': None}  # Will be auto-generated
        )
        return referral_code

    @action(detail=True, methods=['post'])
    def regenerate(self, request, pk=None):
        """Regenerate the referral code"""
        referral_code = self.get_object()

        # Generate new code
        old_code = referral_code.code
        referral_code.code = referral_code._generate_unique_code()
        referral_code.save()

        serializer = self.get_serializer(referral_code)
        return Response({
            'message': 'Referral code regenerated successfully',
            'old_code': old_code,
            'new_code': referral_code.code,
            'data': serializer.data
        })

class ReferralViewSet(generics.ListAPIView):
    """
    ViewSet for managing referrals
    """
    permission_classes = [IsAuthenticated]
    serializer_class = ReferralSerializer

    def get_queryset(self):
        return Referral.objects.filter(referrer=self.request.user).select_related(
            'referrer', 'referee', 'referral_code'
        )

    @action(detail=False, methods=['post'])
    def process_signup(self, request):
        """Process a referral signup (called when new user signs up with referral code)"""
        referral_code = request.data.get('referral_code')

        if not referral_code:
            return Response(
                {'error': 'Referral code is required'},
                status=status.HTTP_400_BAD_REQUEST
            )

        try:
            # Find the referral code
            code_obj = ReferralCode.objects.get(code=referral_code.upper())

            # Prevent self-referral
            if code_obj.user == request.user:
                return Response(
                    {'error': 'You cannot use your own referral code'},
                    status=status.HTTP_400_BAD_REQUEST
                )

            # Check if referral already exists
            existing_referral = Referral.objects.filter(
                referrer=code_obj.user,
                referee=request.user
            ).first()

            if existing_referral:
                return Response(
                    {'message': 'Referral already exists', 'data': ReferralSerializer(existing_referral).data}
                )

            # Create referral
            referral = Referral.objects.create(
                referrer=code_obj.user,
                referee=request.user,
                referral_code=code_obj,
                referral_source='code'
            )

            # Increment code usage
            code_obj.increment_uses()

            serializer = ReferralSerializer(referral)
            return Response({
                'message': 'Referral created successfully',
                'data': serializer.data
            })

        except ReferralCode.DoesNotExist:
            return Response(
                {'error': 'Invalid referral code'},
                status=status.HTTP_404_NOT_FOUND
            )

class RewardViewSet(ModelViewSet):
    """
    ViewSet for managing rewards
    """
    permission_classes = [IsAuthenticated]
    serializer_class = RewardSerializer

    def get_queryset(self):
        return Reward.objects.filter(user=self.request.user)

    @action(detail=True, methods=['post'])
    def redeem(self, request, pk=None):
        """Redeem a reward"""
        reward = self.get_object()

        if reward.user != request.user:
            return Response(
                {'error': 'You can only redeem your own rewards'},
                status=status.HTTP_403_FORBIDDEN
            )

        if reward.status != 'available':
            return Response(
                {'error': f'Reward is not available for redemption. Status: {reward.status}'},
                status=status.HTTP_400_BAD_REQUEST
            )

        if reward.is_expired:
            reward.status = 'expired'
            reward.save()
            return Response(
                {'error': 'Reward has expired'},
                status=status.HTTP_400_BAD_REQUEST
            )

        try:
            # Process redemption based on reward type
            if reward.reward_type in ['referral_bonus', 'signup_bonus', 'cashback']:
                # For cash rewards, add to user's wallet
                # This would integrate with the wallet system
                reward.redeem()

                return Response({
                    'message': f'${reward.amount} has been added to your wallet',
                    'reward': RewardSerializer(reward).data
                })

            elif reward.reward_type == 'premium_feature':
                # Grant premium access
                reward.redeem()
                return Response({
                    'message': 'Premium feature access granted',
                    'reward': RewardSerializer(reward).data
                })

            else:
                return Response(
                    {'error': f'Reward type {reward.reward_type} not supported yet'},
                    status=status.HTTP_400_BAD_REQUEST
                )

        except Exception as e:
            return Response(
                {'error': f'Failed to redeem reward: {str(e)}'},
                status=status.HTTP_500_INTERNAL_SERVER_ERROR
            )

@api_view(['GET'])
@permission_classes([IsAuthenticated])
def referral_stats(request):
    """
    Get comprehensive referral statistics for the authenticated user
    ---
    responses:
      200:
        description: Referral statistics and performance metrics
    """
    user = request.user

    try:
        # Get or create referral code
        referral_code, created = ReferralCode.objects.get_or_create(
            user=user,
            defaults={'code': None}
        )

        # Calculate statistics
        total_referrals = Referral.objects.filter(referrer=user).count()
        successful_referrals = Referral.objects.filter(
            referrer=user,
            status__in=['qualified', 'rewarded']
        ).count()

        pending_referrals = Referral.objects.filter(
            referrer=user,
            status='pending'
        ).count()

        # Calculate earnings
        total_earned = Reward.objects.filter(
            user=user,
            reward_type__in=['referral_bonus', 'signup_bonus'],
            status='redeemed'
        ).aggregate(total=models.Sum('amount'))['total'] or 0

        available_rewards = Reward.objects.filter(
            user=user,
            status='available'
        ).aggregate(total=models.Sum('amount'))['total'] or 0

        # Recent referrals
        recent_referrals = Referral.objects.filter(
            referrer=user
        ).select_related('referee').order_by('-created_at')[:5]

        stats = {
            'referral_code': referral_code.code,
            'total_referrals': total_referrals,
            'successful_referrals': successful_referrals,
            'pending_referrals': pending_referrals,
            'success_rate': (successful_referrals / total_referrals * 100) if total_referrals > 0 else 0,
            'total_earned': float(total_earned),
            'available_rewards': float(available_rewards),
            'recent_referrals': [
                {
                    'referee_name': ref.referee.get_full_name() or ref.referee.email,
                    'status': ref.status,
                    'created_at': ref.created_at,
                    'qualified_at': ref.qualified_at,
                }
                for ref in recent_referrals
            ]
        }

        return Response(stats)

    except Exception as e:
        return Response(
            {'error': f'Failed to get referral stats: {str(e)}'},
            status=status.HTTP_500_INTERNAL_SERVER_ERROR
        )

@api_view(['POST'])
@permission_classes([IsAuthenticated])
def update_referral_qualification(request):
    """
    Update referral qualification status (called by system when user completes actions)
    ---
    parameters:
      - name: user_id
        type: integer
        required: true
        description: User ID to update qualification for
      - name: action
        type: string
        enum: [kyc_completed, first_transaction, transaction_threshold]
        required: true
        description: Qualification action completed
    """
    user_id = request.data.get('user_id')
    action = request.data.get('action')

    if not user_id or not action:
        return Response(
            {'error': 'user_id and action are required'},
            status=status.HTTP_400_BAD_REQUEST
        )

    try:
        # Find referrals where this user is the referee
        referrals = Referral.objects.filter(referee_id=user_id, status='pending')

        updated_count = 0
        for referral in referrals:
            if action == 'kyc_completed':
                referral.has_completed_kyc = True
            elif action == 'first_transaction':
                referral.has_made_first_transaction = True
            elif action == 'transaction_threshold':
                referral.has_reached_transaction_threshold = True
            else:
                continue

            # Check if now qualified
            referral.check_qualification()
            updated_count += 1

        return Response({
            'message': f'Updated {updated_count} referrals',
            'updated_count': updated_count
        })

    except Exception as e:
        return Response(
            {'error': f'Failed to update qualification: {str(e)}'},
            status=status.HTTP_500_INTERNAL_SERVER_ERROR
        )

@api_view(['GET'])
@permission_classes([IsAuthenticated])
def active_campaigns(request):
    """
    Get active referral campaigns
    ---
    responses:
      200:
        description: List of active referral campaigns
    """
    campaigns = ReferralCampaign.objects.filter(
        is_active=True
    ).exclude(
        end_date__lt=timezone.now()
    ).order_by('-created_at')

    serializer = ReferralCampaignSerializer(campaigns, many=True)
    return Response(serializer.data)

@api_view(['GET'])
@permission_classes([IsAuthenticated])
def leaderboard(request):
    """
    Get referral leaderboard
    ---
    parameters:
      - name: period
        type: string
        enum: [all_time, monthly, weekly]
        default: monthly
        description: Time period for leaderboard
      - name: limit
        type: integer
        default: 10
        description: Number of top referrers to return
    responses:
      200:
        description: Referral leaderboard
    """
    period = request.query_params.get('period', 'monthly')
    limit = int(request.query_params.get('limit', 10))

    # Calculate date range
    now = timezone.now()
    if period == 'weekly':
        start_date = now - timezone.timedelta(days=7)
    elif period == 'monthly':
        start_date = now.replace(day=1)
    else:  # all_time
        start_date = None

    # Get top referrers
    queryset = ReferralCode.objects.filter(is_active=True).select_related('user')

    if start_date:
        # Filter by referrals in the period
        successful_referrals = Referral.objects.filter(
            referral_code__in=queryset,
            status__in=['qualified', 'rewarded'],
            created_at__gte=start_date
        ).values('referral_code').annotate(
            count=models.Count('id')
        ).order_by('-count')[:limit]
    else:
        successful_referrals = Referral.objects.filter(
            referral_code__in=queryset,
            status__in=['qualified', 'rewarded']
        ).values('referral_code').annotate(
            count=models.Count('id')
        ).order_by('-count')[:limit]

    # Build leaderboard
    leaderboard_data = []
    for item in successful_referrals:
        code = ReferralCode.objects.get(id=item['referral_code'])
        leaderboard_data.append({
            'user': {
                'id': code.user.id,
                'name': code.user.get_full_name() or code.user.email,
            },
            'successful_referrals': item['count'],
            'total_uses': code.total_uses,
            'success_rate': code.success_rate,
        })

    return Response({
        'period': period,
        'leaderboard': leaderboard_data
    })
