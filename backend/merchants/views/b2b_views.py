from rest_framework import viewsets, status
from rest_framework.decorators import action
from rest_framework.response import Response
from rest_framework.permissions import IsAuthenticated
from django.db import transaction
from django.utils import timezone
from merchants.models import (
    BusinessAccount, BusinessRole, BusinessUser, ApprovalWorkflow,
    BulkPayment, BulkPaymentItem, BusinessAnalytics, AccountingIntegration
)
from merchants.serializers.b2b_serializers import (
    BusinessAccountSerializer, BusinessRoleSerializer, BusinessUserSerializer,
    ApprovalWorkflowSerializer, BulkPaymentSerializer, BulkPaymentItemSerializer,
    BusinessAnalyticsSerializer, AccountingIntegrationSerializer,
    BusinessKYCSerializer, BusinessDocumentSerializer, ComplianceReportSerializer,
    BusinessComplianceLogSerializer, BusinessAccountDetailSerializer
)
from merchants.services import BusinessKYCService, DocumentVerificationService
from merchants.permissions import IsBusinessOwnerOrAdmin, CanManageBusinessUsers
from merchants.services import BulkPaymentService, ApprovalWorkflowService

class BusinessAccountViewSet(viewsets.ModelViewSet):
    """
    ViewSet for business accounts
    """
    serializer_class = BusinessAccountSerializer
    permission_classes = [IsAuthenticated]

    def get_queryset(self):
        return BusinessAccount.objects.filter(
            models.Q(primary_contact=self.request.user) |
            models.Q(business_users__user=self.request.user, business_users__status='active')
        ).distinct()

    def perform_create(self, serializer):
        serializer.save(primary_contact=self.request.user)

    @action(detail=False, methods=['get'])
    def my_account(self, request):
        """Get current user's business account"""
        try:
            business_account = self.get_queryset().first()
            if business_account:
                serializer = self.get_serializer(business_account)
                return Response(serializer.data)
            else:
                return Response({'error': 'No business account found'}, status=status.HTTP_404_NOT_FOUND)
        except Exception as e:
            return Response({'error': str(e)}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)

    @action(detail=True, methods=['post'])
    def activate(self, request, pk=None):
        """Activate a business account"""
        business_account = self.get_object()
        if business_account.primary_contact != request.user:
            return Response({'error': 'Only primary contact can activate account'},
                          status=status.HTTP_403_FORBIDDEN)

        business_account.is_active = True
        business_account.activated_at = timezone.now()
        business_account.save()

        # Create default roles
        self._create_default_roles(business_account)

        serializer = self.get_serializer(business_account)
        return Response(serializer.data)

    def _create_default_roles(self, business_account):
        """Create default roles for new business accounts"""
        default_roles = [
            {
                'name': 'Owner',
                'role_type': 'owner',
                'can_create_payments': True,
                'can_approve_payments': True,
                'can_manage_users': True,
                'can_view_reports': True,
                'can_manage_settings': True,
                'single_transaction_limit': 100000,
                'daily_limit': 500000,
                'monthly_limit': 5000000,
                'is_default': True,
            },
            {
                'name': 'Administrator',
                'role_type': 'admin',
                'can_create_payments': True,
                'can_approve_payments': True,
                'can_manage_users': True,
                'can_view_reports': True,
                'can_manage_settings': True,
                'single_transaction_limit': 50000,
                'daily_limit': 200000,
                'monthly_limit': 1000000,
                'is_default': False,
            },
            {
                'name': 'Manager',
                'role_type': 'manager',
                'can_create_payments': True,
                'can_approve_payments': False,
                'can_manage_users': False,
                'can_view_reports': True,
                'can_manage_settings': False,
                'single_transaction_limit': 10000,
                'daily_limit': 50000,
                'monthly_limit': 200000,
                'is_default': False,
            },
            {
                'name': 'Employee',
                'role_type': 'employee',
                'can_create_payments': True,
                'can_approve_payments': False,
                'can_manage_users': False,
                'can_view_reports': False,
                'can_manage_settings': False,
                'single_transaction_limit': 1000,
                'daily_limit': 5000,
                'monthly_limit': 20000,
                'is_default': False,
            }
        ]

        for role_data in default_roles:
            BusinessRole.objects.create(business_account=business_account, **role_data)

class BusinessRoleViewSet(viewsets.ModelViewSet):
    """
    ViewSet for business roles
    """
    serializer_class = BusinessRoleSerializer
    permission_classes = [IsAuthenticated, IsBusinessOwnerOrAdmin]

    def get_queryset(self):
        return BusinessRole.objects.filter(business_account__primary_contact=self.request.user)

    def perform_create(self, serializer):
        # Get business account from user's primary business account
        business_account = BusinessAccount.objects.get(primary_contact=self.request.user)
        serializer.save(business_account=business_account)

class BusinessUserViewSet(viewsets.ModelViewSet):
    """
    ViewSet for business users
    """
    serializer_class = BusinessUserSerializer
    permission_classes = [IsAuthenticated, CanManageBusinessUsers]

    def get_queryset(self):
        return BusinessUser.objects.filter(
            business_account__primary_contact=self.request.user
        )

    @action(detail=True, methods=['post'])
    def approve(self, request, pk=None):
        """Approve a pending user invitation"""
        business_user = self.get_object()
        business_user.status = 'active'
        business_user.joined_at = timezone.now()
        business_user.save()

        serializer = self.get_serializer(business_user)
        return Response(serializer.data)

    @action(detail=True, methods=['post'])
    def suspend(self, request, pk=None):
        """Suspend a business user"""
        business_user = self.get_object()
        business_user.status = 'suspended'
        business_user.save()

        serializer = self.get_serializer(business_user)
        return Response(serializer.data)

class ApprovalWorkflowViewSet(viewsets.ModelViewSet):
    """
    ViewSet for approval workflows
    """
    serializer_class = ApprovalWorkflowSerializer
    permission_classes = [IsAuthenticated, IsBusinessOwnerOrAdmin]

    def get_queryset(self):
        return ApprovalWorkflow.objects.filter(business_account__primary_contact=self.request.user)

    def perform_create(self, serializer):
        business_account = BusinessAccount.objects.get(primary_contact=self.request.user)
        serializer.save(business_account=business_account)

class BulkPaymentViewSet(viewsets.ModelViewSet):
    """
    ViewSet for bulk payments
    """
    serializer_class = BulkPaymentSerializer
    permission_classes = [IsAuthenticated]

    def get_queryset(self):
        return BulkPayment.objects.filter(
            models.Q(created_by=self.request.user) |
            models.Q(business_account__business_users__user=self.request.user,
                    business_account__business_users__status='active')
        ).distinct()

    def perform_create(self, serializer):
        # Get user's business account
        business_user = BusinessUser.objects.get(
            user=self.request.user,
            status='active'
        )
        serializer.save(
            business_account=business_user.business_account,
            created_by=self.request.user
        )

    @action(detail=True, methods=['post'])
    def submit_for_approval(self, request, pk=None):
        """Submit bulk payment for approval"""
        bulk_payment = self.get_object()
        bulk_payment.status = 'pending_approval'
        bulk_payment.save()

        # Trigger approval workflow
        ApprovalWorkflowService.trigger_approval(bulk_payment)

        serializer = self.get_serializer(bulk_payment)
        return Response(serializer.data)

    @action(detail=True, methods=['post'])
    def approve(self, request, pk=None):
        """Approve a bulk payment"""
        bulk_payment = self.get_object()

        # Check if user can approve
        business_user = BusinessUser.objects.get(
            user=request.user,
            business_account=bulk_payment.business_account,
            status='active'
        )

        if not business_user.role.can_approve_payments:
            return Response({'error': 'User does not have approval permissions'},
                          status=status.HTTP_403_FORBIDDEN)

        bulk_payment.approved_by.add(request.user)

        # Check if all required approvals are met
        if ApprovalWorkflowService.check_approval_requirements(bulk_payment):
            bulk_payment.status = 'approved'
            bulk_payment.approved_at = timezone.now()

        bulk_payment.save()

        serializer = self.get_serializer(bulk_payment)
        return Response(serializer.data)

    @action(detail=True, methods=['post'])
    def process(self, request, pk=None):
        """Process an approved bulk payment"""
        bulk_payment = self.get_object()

        if bulk_payment.status != 'approved':
            return Response({'error': 'Payment must be approved first'},
                          status=status.HTTP_400_BAD_REQUEST)

        # Process bulk payment
        with transaction.atomic():
            bulk_payment.status = 'processing'
            bulk_payment.processed_at = timezone.now()
            bulk_payment.save()

            # Process individual payment items
            BulkPaymentService.process_bulk_payment(bulk_payment)

            bulk_payment.status = 'completed'
            bulk_payment.completed_at = timezone.now()
            bulk_payment.save()

        serializer = self.get_serializer(bulk_payment)
        return Response(serializer.data)

class BusinessAnalyticsViewSet(viewsets.ReadOnlyModelViewSet):
    """
    ViewSet for business analytics
    """
    serializer_class = BusinessAnalyticsSerializer
    permission_classes = [IsAuthenticated]

    def get_queryset(self):
        return BusinessAnalytics.objects.filter(
            business_account__primary_contact=self.request.user
        )

class AccountingIntegrationViewSet(viewsets.ModelViewSet):
    """
    ViewSet for accounting integrations
    """
    serializer_class = AccountingIntegrationSerializer
    permission_classes = [IsAuthenticated, IsBusinessOwnerOrAdmin]

    def get_queryset(self):
        return AccountingIntegration.objects.filter(
            business_account__primary_contact=self.request.user
        )

    def perform_create(self, serializer):
        business_account = BusinessAccount.objects.get(primary_contact=self.request.user)
        serializer.save(business_account=business_account)

    @action(detail=True, methods=['post'])
    def sync(self, request, pk=None):
        """Trigger manual sync with accounting software"""
        integration = self.get_object()

        # Implement sync logic here
        # This would integrate with QuickBooks, Xero, etc.

        integration.last_sync = timezone.now()
        integration.sync_status = 'success'
        integration.save()

        serializer = self.get_serializer(integration)
        return Response(serializer.data)

    @action(detail=True, methods=['post'])
    def test_connection(self, request, pk=None):
        """Test connection to accounting software"""
        integration = self.get_object()

        # Implement connection test logic here

        return Response({'status': 'success', 'message': 'Connection successful'})

class BusinessKYCViewSet(viewsets.ModelViewSet):
    """
    ViewSet for business KYC information
    """
    serializer_class = BusinessKYCSerializer
    permission_classes = [IsAuthenticated]

    def get_queryset(self):
        return BusinessKYC.objects.filter(business_account__primary_contact=self.request.user)

    @action(detail=True, methods=['post'])
    def update_risk_assessment(self, request, pk=None):
        """Update risk assessment for a business account"""
        kyc = self.get_object()
        kyc.update_risk_score()

        serializer = self.get_serializer(kyc)
        return Response(serializer.data)

    @action(detail=True, methods=['post'])
    def update_compliance_status(self, request, pk=None):
        """Update compliance status"""
        kyc = self.get_object()
        new_status = request.data.get('compliance_status')
        notes = request.data.get('compliance_notes')

        if new_status in ['pending', 'under_review', 'approved', 'rejected', 'requires_attention']:
            kyc.compliance_status = new_status
            kyc.compliance_notes = notes or kyc.compliance_notes
            kyc.reviewed_by = request.user
            kyc.reviewed_at = timezone.now()
            kyc.save()

            # Update business account compliance status
            kyc.business_account.update_compliance_status()

        serializer = self.get_serializer(kyc)
        return Response(serializer.data)

class BusinessDocumentViewSet(viewsets.ModelViewSet):
    """
    ViewSet for business verification documents
    """
    serializer_class = BusinessDocumentSerializer
    permission_classes = [IsAuthenticated]

    def get_queryset(self):
        return BusinessDocument.objects.filter(
            business_account__primary_contact=self.request.user
        )

    @action(detail=True, methods=['post'])
    def upload_document(self, request, pk=None):
        """Upload a document file"""
        document = self.get_object()
        uploaded_file = request.FILES.get('document_file')

        if uploaded_file:
            document.document_file = uploaded_file
            document.uploaded_by = request.user
            document.status = 'pending'
            document.save()

        serializer = self.get_serializer(document)
        return Response(serializer.data)

    @action(detail=True, methods=['post'])
    def review_document(self, request, pk=None):
        """Review and update document status"""
        document = self.get_object()
        new_status = request.data.get('status')
        notes = request.data.get('verification_notes')

        if new_status in ['pending', 'under_review', 'approved', 'rejected', 'expired']:
            document.status = new_status
            document.verification_notes = notes or document.verification_notes
            document.reviewed_by = request.user
            document.reviewed_at = timezone.now()
            document.save()

            # Update business account compliance status
            document.business_account.update_compliance_status()

        serializer = self.get_serializer(document)
        return Response(serializer.data)

class ComplianceReportViewSet(viewsets.ModelViewSet):
    """
    ViewSet for compliance reports
    """
    serializer_class = ComplianceReportSerializer
    permission_classes = [IsAuthenticated]

    def get_queryset(self):
        return ComplianceReport.objects.filter(
            business_account__primary_contact=self.request.user
        )

    @action(detail=True, methods=['post'])
    def submit_for_review(self, request, pk=None):
        """Submit compliance report for review"""
        report = self.get_object()
        report.submit_report(request.user)

        serializer = self.get_serializer(report)
        return Response(serializer.data)

    @action(detail=True, methods=['post'])
    def review_report(self, request, pk=None):
        """Review compliance report"""
        report = self.get_object()
        new_status = request.data.get('status')
        review_notes = request.data.get('review_notes')

        if new_status in ['approved', 'rejected']:
            report.status = new_status
            report.review_notes = review_notes
            report.reviewed_by = request.user
            report.reviewed_at = timezone.now()
            report.save()

        serializer = self.get_serializer(report)
        return Response(serializer.data)

class BusinessComplianceLogViewSet(viewsets.ReadOnlyModelViewSet):
    """
    ViewSet for business compliance audit logs
    """
    serializer_class = BusinessComplianceLogSerializer
    permission_classes = [IsAuthenticated]

    def get_queryset(self):
        return BusinessComplianceLog.objects.filter(
            business_account__primary_contact=self.request.user
        )

# Enhanced Business Account ViewSet with KYC details
class BusinessAccountDetailViewSet(BusinessAccountViewSet):
    """
    Enhanced business account ViewSet with KYC and compliance details
    """
    serializer_class = BusinessAccountDetailSerializer

    @action(detail=True, methods=['post'])
    def complete_onboarding(self, request, pk=None):
        """Mark business account onboarding as complete"""
        business_account = self.get_object()

        # Check if all requirements are met
        if business_account.kyc_completed and len(business_account.documents.filter(status='approved', is_required=True)) >= 3:
            business_account.onboarding_completed = True
            business_account.save()

        serializer = self.get_serializer(business_account)
        return Response(serializer.data)
