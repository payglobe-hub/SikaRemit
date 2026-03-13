from rest_framework import viewsets, status
from rest_framework.decorators import action
from users.permissions import IsAdminUser
from rest_framework.response import Response
from django.db.models import Count, Q
from django.utils import timezone
from .models import MerchantInvitation, MerchantApplication
from .serializers import MerchantInvitationSerializer, MerchantApplicationSerializer
from users.models import Merchant


class MerchantInvitationViewSet(viewsets.ModelViewSet):
    queryset = MerchantInvitation.objects.all().select_related('invited_by')
    serializer_class = MerchantInvitationSerializer
    permission_classes = [IsAdminUser]

    def get_queryset(self):
        queryset = super().get_queryset()
        status_filter = self.request.query_params.get('status')
        search = self.request.query_params.get('search')

        if status_filter:
            queryset = queryset.filter(status=status_filter)
        if search:
            queryset = queryset.filter(
                Q(business_name__icontains=search) |
                Q(email__icontains=search)
            )

        return queryset.order_by('-invited_at')

    def perform_create(self, serializer):
        from django.utils import timezone
        serializer.save(
            invited_by=self.request.user,
            expires_at=timezone.now() + timezone.timedelta(days=14)
        )

    @action(detail=True, methods=['post'])
    def resend(self, request, pk=None):
        invitation = self.get_object()
        if invitation.status != 'pending':
            return Response(
                {'error': 'Can only resend pending invitations'},
                status=status.HTTP_400_BAD_REQUEST
            )

        # Reset expiry and resend logic here
        invitation.expires_at = timezone.now() + timezone.timedelta(days=14)
        invitation.save()

        # TODO: Send email notification

        return Response({'message': 'Invitation resent successfully'})

    @action(detail=True, methods=['post'])
    def cancel(self, request, pk=None):
        invitation = self.get_object()
        reason = request.data.get('reason', '')

        if invitation.status not in ['pending', 'expired']:
            return Response(
                {'error': 'Can only cancel pending or expired invitations'},
                status=status.HTTP_400_BAD_REQUEST
            )

        invitation.status = 'cancelled'
        invitation.save()

        return Response({'message': 'Invitation cancelled successfully'})


class MerchantApplicationViewSet(viewsets.ReadOnlyModelViewSet):
    queryset = MerchantApplication.objects.all().select_related('reviewed_by')
    serializer_class = MerchantApplicationSerializer
    permission_classes = [IsAdminUser]

    def get_queryset(self):
        queryset = super().get_queryset()
        status_filter = self.request.query_params.get('status')
        search = self.request.query_params.get('search')

        if status_filter:
            queryset = queryset.filter(status=status_filter)
        if search:
            queryset = queryset.filter(
                Q(business_name__icontains=search) |
                Q(business_email__icontains=search) |
                Q(contact_first_name__icontains=search) |
                Q(contact_last_name__icontains=search)
            )

        return queryset.order_by('-submitted_at')

    @action(detail=True, methods=['post'])
    def approve(self, request, pk=None):
        application = self.get_object()
        notes = request.data.get('notes', '')

        if application.status != 'pending':
            return Response(
                {'error': 'Can only approve pending applications'},
                status=status.HTTP_400_BAD_REQUEST
            )

        application.status = 'approved'
        application.reviewed_by = request.user
        application.reviewed_at = timezone.now()
        application.review_notes = notes
        application.save()

        # Create invitation for the approved merchant
        invitation = MerchantInvitation.objects.create(
            email=application.contact_email,
            business_name=application.business_name,
            business_type=application.business_type,
            phone_number=application.business_phone,
            notes=f"Auto-generated from approved application #{application.id}",
            invited_by=request.user,
            expires_at=timezone.now() + timezone.timedelta(days=14)
        )

        return Response({
            'message': 'Application approved and invitation sent',
            'invitation_token': str(invitation.invitation_token)
        })

    @action(detail=True, methods=['post'])
    def reject(self, request, pk=None):
        application = self.get_object()
        reason = request.data.get('reason')

        if not reason:
            return Response(
                {'error': 'Rejection reason is required'},
                status=status.HTTP_400_BAD_REQUEST
            )

        if application.status != 'pending':
            return Response(
                {'error': 'Can only reject pending applications'},
                status=status.HTTP_400_BAD_REQUEST
            )

        application.status = 'rejected'
        application.review_notes = reason
        application.reviewed_by = request.user
        application.reviewed_at = timezone.now()
        application.save()

        return Response({'message': 'Application rejected'})


class MerchantInvitationStatsView(viewsets.ViewSet):
    permission_classes = [IsAdminUser]

    def list(self, request):
        invitations = MerchantInvitation.objects.aggregate(
            total_invitations=Count('id'),
            pending_invitations=Count('id', filter=Q(status='pending')),
            accepted_invitations=Count('id', filter=Q(status='accepted')),
            expired_invitations=Count('id', filter=Q(status='expired')),
            cancelled_invitations=Count('id', filter=Q(status='cancelled')),
        )

        applications = MerchantApplication.objects.aggregate(
            total_applications=Count('id'),
            pending_applications=Count('id', filter=Q(status='pending')),
            approved_applications=Count('id', filter=Q(status='approved')),
            rejected_applications=Count('id', filter=Q(status='rejected')),
        )

        return Response({**invitations, **applications})
