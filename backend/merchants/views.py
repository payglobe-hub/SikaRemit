from rest_framework import viewsets, permissions, status
from rest_framework.decorators import action, api_view, permission_classes
from rest_framework.response import Response
from rest_framework.permissions import IsAuthenticated
from django.shortcuts import get_object_or_404
from django.db.models import Q, Sum, Count, Avg
from datetime import datetime, timedelta
from django.utils import timezone
from django.core.files.storage import default_storage
from django.core.files.base import ContentFile
from payments.serializers.transaction import TransactionSerializer
from payments.models.transaction import Transaction
from users.permissions import (
    IsAdminUser, CanApproveMerchants, CanReviewKYC, CanAccessReporting,
    require_permission
)
from invoice.models import Invoice, InvoiceItem

from .models import Store, Product, MerchantOnboarding, MerchantApplication, MerchantInvitation, ReportTemplate, Report, ScheduledReport, MerchantSettings, MerchantNotificationSettings, MerchantPayoutSettings
from users.models import MerchantCustomer  # MerchantCustomer moved to users app
from users.models import Merchant
from notifications.models import Notification
from .serializers import StoreSerializer, ProductSerializer, OnboardingSerializer, VerificationSerializer, MerchantApplicationSerializer, MerchantInvitationSerializer, ReportTemplateSerializer, ReportSerializer, ScheduledReportSerializer, MerchantCustomerSerializer, CreateMerchantCustomerSerializer, OnboardMerchantCustomerSerializer, MerchantSettingsSerializer, MerchantNotificationSettingsSerializer, MerchantPayoutSettingsSerializer, MerchantCustomerStatsSerializer
from invoice.serializers import InvoiceSerializer, CreateInvoiceSerializer
from users.permissions import IsMerchantUser, IsOwnerOrAdmin, IsAdminUser, IsAdminUser
from .permissions import SubscriptionRequiredMixin
from notifications.services import NotificationService
from shared.constants import USER_TYPE_SUPER_ADMIN, USER_TYPE_BUSINESS_ADMIN, USER_TYPE_MERCHANT

class MerchantApplicationViewSet(viewsets.ModelViewSet):
    """API for merchant applications"""
    serializer_class = MerchantApplicationSerializer
    permission_classes = [IsAuthenticated, CanApproveMerchants]
    queryset = MerchantApplication.objects.all()

    def get_queryset(self):
        user = self.request.user
        if user.user_type == USER_TYPE_SUPER_ADMIN:
            return MerchantApplication.objects.all()
        elif user.user_type == USER_TYPE_BUSINESS_ADMIN:
            return MerchantApplication.objects.all()
        # Other users cannot access applications
        return MerchantApplication.objects.none()

    def perform_create(self, serializer):
        """Save application and send notification"""
        application = serializer.save()

        # Send notification to all business admins about new application
        admin_users = User.objects.filter(user_type__in=[USER_TYPE_SUPER_ADMIN, USER_TYPE_BUSINESS_ADMIN])
        for admin in admin_users:
            NotificationService.create_notification(
                user=admin,
                title="New Merchant Application",
                message=f"A new merchant application has been submitted by {application.contact_first_name} {application.contact_last_name} for {application.business_name}.",
                level='info',
                notification_type='merchant_application_submitted',
                metadata={
                    'application_id': str(application.id),
                    'business_name': application.business_name,
                    'contact_email': application.contact_email
                }
            )

        # Send confirmation to applicant (if we had their user account)
        # For now, we'll skip this as applicants don't have accounts yet

    @action(detail=True, methods=['post'])
    def approve(self, request, pk=None):
        """Approve an application and create invitation"""
        if request.user.user_type not in [USER_TYPE_SUPER_ADMIN, USER_TYPE_BUSINESS_ADMIN]:
            return Response({'error': 'Business Admin access required'}, status=status.HTTP_403_FORBIDDEN)

        application = self.get_object()
        if application.status != 'pending':
            return Response({'error': 'Application is not pending'}, status=status.HTTP_400_BAD_REQUEST)

        # Update application status
        application.status = 'approved'
        application.reviewed_at = timezone.now()
        application.reviewed_by = request.user
        application.save()

        # Create invitation
        expires_at = timezone.now() + timedelta(days=14)
        invitation = MerchantInvitation.objects.create(
            email=application.contact_email,
            business_name=application.business_name,
            business_type=application.business_type,
            phone_number=application.contact_phone,
            notes=f"Application approved. Business: {application.business_name}",
            expires_at=expires_at,
            invited_by=request.user
        )

        # Send email notification to applicant
        # Since applicants don't have user accounts yet, we'll send a direct email
        NotificationService.send_email_notification_to_address(
            email=application.contact_email,
            subject="Your Merchant Application Has Been Approved",
            message=f"""
Dear {application.contact_first_name} {application.contact_last_name},

Congratulations! Your merchant application for {application.business_name} has been approved.

You can now complete your merchant registration by following this secure link:
{settings.FRONTEND_URL}/auth/merchant/invite/{invitation.invitation_token}

This invitation will expire in 14 days. Please complete your registration before then.

If you have any questions, please contact our support team.

Best regards,
SikaRemit Team
            """.strip()
        )

        return Response({
            'message': 'Application approved and invitation sent',
            'invitation_token': str(invitation.invitation_token)
        })

    @action(detail=True, methods=['post'])
    def reject(self, request, pk=None):
        """Reject an application with reason"""
        if request.user.user_type not in [USER_TYPE_SUPER_ADMIN, USER_TYPE_BUSINESS_ADMIN]:
            return Response({'error': 'Business Admin access required'}, status=status.HTTP_403_FORBIDDEN)

        application = self.get_object()
        reason = request.data.get('reason', '')

        if not reason.strip():
            return Response({'error': 'Rejection reason is required'}, status=status.HTTP_400_BAD_REQUEST)

        if application.status != 'pending':
            return Response({'error': 'Application is not pending'}, status=status.HTTP_400_BAD_REQUEST)

        application.status = 'rejected'
        application.reviewed_at = timezone.now()
        application.reviewed_by = request.user
        application.review_notes = reason
        application.save()

        # Send rejection email notification
        NotificationService.send_email_notification_to_address(
            email=application.contact_email,
            subject="Update on Your Merchant Application",
            message=f"""
Dear {application.contact_first_name} {application.contact_last_name},

Thank you for your interest in becoming a SikaRemit merchant. After careful review of your application for {application.business_name}, we regret to inform you that we are unable to approve it at this time.

Reason for rejection:
{reason}

If you believe this decision was made in error or if you have additional information that might change our decision, please contact our support team.

We appreciate your understanding and wish you the best in your business endeavors.

Best regards,
SikaRemit Team
            """.strip()
        )

        return Response({'message': 'Application rejected'})

class MerchantInvitationViewSet(viewsets.ModelViewSet):
    """API for merchant invitations"""
    serializer_class = MerchantInvitationSerializer
    permission_classes = [IsAuthenticated, IsAdminUser]
    queryset = MerchantInvitation.objects.all()

    def get_queryset(self):
        return MerchantInvitation.objects.all().order_by('-invited_at')

    def perform_create(self, serializer):
        """Create invitation and send email"""
        invitation = serializer.save(invited_by=self.request.user)

        # Send invitation email
        NotificationService.send_email_notification_to_address(
            email=invitation.email,
            subject="You're Invited to Join SikaRemit as a Merchant",
            message=f"""
Dear Merchant,

You have been invited to join SikaRemit as a merchant for {invitation.business_name}.

Complete your registration by following this secure link:
{settings.FRONTEND_URL}/auth/merchant/invite/{invitation.invitation_token}

This invitation will expire in 14 days. Please complete your registration before then.

If you have any questions, please contact our support team.

Best regards,
SikaRemit Team
            """.strip()
        )

        return invitation

    @action(detail=True, methods=['post'])
    def resend(self, request, pk=None):
        """Resend invitation email"""
        invitation = self.get_object()
        if invitation.status != 'pending':
            return Response({'error': 'Can only resend pending invitations'}, status=status.HTTP_400_BAD_REQUEST)

        # Update expiration if needed
        if invitation.is_expired:
            invitation.expires_at = timezone.now() + timedelta(days=14)
            invitation.save()

        # Send invitation email again
        NotificationService.send_email_notification_to_address(
            email=invitation.email,
            subject="Reminder: You're Invited to Join SikaRemit as a Merchant",
            message=f"""
Dear Merchant,

This is a reminder about your invitation to join SikaRemit as a merchant for {invitation.business_name}.

Complete your registration by following this secure link:
{settings.FRONTEND_URL}/auth/merchant/invite/{invitation.invitation_token}

This invitation will expire in 14 days. Please complete your registration before then.

If you have any questions, please contact our support team.

Best regards,
SikaRemit Team
            """.strip()
        )

        return Response({'message': 'Invitation resent'})

    @action(detail=True, methods=['post'])
    def cancel(self, request, pk=None):
        """Cancel invitation"""
        invitation = self.get_object()
        if invitation.status not in ['pending', 'expired']:
            return Response({'error': 'Can only cancel pending or expired invitations'}, status=status.HTTP_400_BAD_REQUEST)

        invitation.status = 'cancelled'
        invitation.save()

        return Response({'message': 'Invitation cancelled'})

    @action(detail=False, methods=['post'])
    def bulk_create(self, request):
        """Create multiple invitations at once"""
        invitations_data = request.data.get('invitations', [])
        if not invitations_data:
            return Response({'error': 'No invitations provided'}, status=status.HTTP_400_BAD_REQUEST)

        created_invitations = []
        errors = []

        for i, inv_data in enumerate(invitations_data):
            serializer = self.get_serializer(data=inv_data)
            if serializer.is_valid():
                invitation = serializer.save(invited_by=request.user)
                
                # Send invitation email
                try:
                    subject = f"You're invited to join {request.user.get_full_name() or request.user.email}'s merchant network on SikaRemit"
                    message = f"""
Dear {invitation.email},

You have been invited to join {request.user.get_full_name() or request.user.email}'s merchant network on SikaRemit.

Please click the following link to accept the invitation and create your account:
{settings.FRONTEND_URL}/merchant/invitation/{invitation.invitation_token}

This invitation will expire in 7 days.

If you have any questions, please contact us.

Best regards,
SikaRemit Team
                    """.strip()
                    
                    NotificationService.send_email_notification_to_address(
                        email=invitation.email,
                        subject=subject,
                        message=message
                    )
                    
                    # Update invitation as sent
                    invitation.sent_at = timezone.now()
                    invitation.save()
                    
                except Exception as e:
                    import logging
                    logger = logging.getLogger(__name__)
                    logger.error(f"Failed to send invitation email to {invitation.email}: {str(e)}")
                    # Continue with next invitation
                    
                created_invitations.append(serializer.data)
            else:
                errors.append({'index': i, 'errors': serializer.errors})

        response_data = {'created': created_invitations}
        if errors:
            response_data['errors'] = errors

        return Response(response_data, status=status.HTTP_207_MULTI_STATUS if errors else status.HTTP_201_CREATED)

@api_view(['GET'])
def validate_invitation_token(request, token):
    """Validate invitation token and return invitation details"""
    try:
        invitation = MerchantInvitation.objects.get(invitation_token=token)
    except MerchantInvitation.DoesNotExist:
        return Response({'error': 'Invalid invitation token'}, status=status.HTTP_404_NOT_FOUND)

    # Check if expired
    if invitation.is_expired:
        invitation.status = 'expired'
        invitation.save()
        return Response({'error': 'Invitation has expired'}, status=status.HTTP_410_GONE)

    # Check if already used
    if invitation.status == 'accepted':
        return Response({'error': 'Invitation has already been used'}, status=status.HTTP_409_CONFLICT)

    # Check if cancelled
    if invitation.status == 'cancelled':
        return Response({'error': 'Invitation has been cancelled'}, status=status.HTTP_410_GONE)

    serializer = MerchantInvitationSerializer(invitation)
    return Response(serializer.data)

@api_view(['POST'])
def accept_invitation(request, token):
    """Accept invitation and create merchant account"""
    try:
        invitation = MerchantInvitation.objects.get(invitation_token=token)
    except MerchantInvitation.DoesNotExist:
        return Response({'error': 'Invalid invitation token'}, status=status.HTTP_404_NOT_FOUND)

    # Validate invitation status
    if invitation.status != 'pending':
        if invitation.status == 'expired':
            return Response({'error': 'Invitation has expired'}, status=status.HTTP_410_GONE)
        elif invitation.status == 'cancelled':
            return Response({'error': 'Invitation has been cancelled'}, status=status.HTTP_410_GONE)
        elif invitation.status == 'accepted':
            return Response({'error': 'Invitation has already been used'}, status=status.HTTP_409_CONFLICT)

    # Validate required fields
    required_fields = ['firstName', 'lastName', 'email', 'password', 'businessName']
    for field in required_fields:
        if not request.data.get(field):
            return Response({'error': f'{field} is required'}, status=status.HTTP_400_BAD_REQUEST)

    # Check if user with this email already exists
    User = get_user_model()
    if User.objects.filter(email=request.data['email']).exists():
        return Response({'error': 'User with this email already exists'}, status=status.HTTP_409_CONFLICT)

    try:
        # Create user
        user = User.objects.create_user(
            email=request.data['email'],
            password=request.data['password'],
            first_name=request.data['firstName'],
            last_name=request.data['lastName'],
            user_type=USER_TYPE_MERCHANT,
            phone=request.data.get('phoneNumber', ''),
            is_verified=True
        )

        # Create merchant profile
        merchant = Merchant.objects.create(
            user=user,
            business_name=request.data['businessName'],
            tax_id=request.data.get('taxId', ''),
            bank_account_number='',  # Will be set during onboarding
            is_approved=True  # Pre-approved since invited
        )

        # Update invitation
        invitation.status = 'accepted'
        invitation.accepted_at = timezone.now()
        invitation.merchant_profile = merchant
        invitation.save()

        # Create onboarding record
        MerchantOnboarding.objects.create(merchant=merchant)

        # Send welcome notification to the new merchant
        NotificationService.create_notification(
            user=user,
            title="Welcome to SikaRemit!",
            message=f"Welcome {user.first_name}! Your merchant account for {merchant.business_name} has been created successfully. Please complete your onboarding to start accepting payments.",
            level='success',
            notification_type='merchant_account_created',
            metadata={
                'merchant_id': str(merchant.id),
                'business_name': merchant.business_name
            }
        )

        # Notify admins about the new merchant registration
        NotificationService.notify_admins(
            title="New Merchant Registered",
            message=f"Merchant '{merchant.business_name}' ({user.email}) has accepted their invitation and registered.",
            level='info',
            notification_type='merchant_invitation_accepted',
            metadata={
                'merchant_id': str(merchant.id),
                'user_id': user.id,
                'business_name': merchant.business_name,
                'email': user.email
            }
        )

        # Send welcome email
        NotificationService.send_email_notification(
            user=user,
            subject="Welcome to SikaRemit - Account Created Successfully",
            message=f"""
Dear {user.first_name},

Congratulations! Your merchant account for {merchant.business_name} has been created successfully.

You can now log in to your merchant dashboard to:
- Set up your store and products
- Configure payment methods
- View transaction history
- Access analytics and reports

Your login credentials:
Email: {user.email}
Password: [The password you set during registration]

Please complete your onboarding process to start accepting payments.

If you need any assistance, our support team is here to help.

Best regards,
SikaRemit Team
            """.strip()
        )

        return Response({
            'message': 'Merchant account created successfully',
            'user_id': user.id,
            'merchant_id': merchant.id
        })

    except Exception as e:
        return Response({'error': str(e)}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)

class StoreViewSet(SubscriptionRequiredMixin, viewsets.ModelViewSet):
    serializer_class = StoreSerializer
    permission_classes = [permissions.IsAuthenticated, IsMerchantUser]

    def get_queryset(self):
        """Return stores belonging to the current merchant"""
        return Store.objects.filter(merchant__user=self.request.user)

    def perform_create(self, serializer):
        """Automatically set the merchant when creating a store"""
        serializer.save(merchant=self.request.user.merchant_profile)

    @action(detail=True, methods=['post'])
    def toggle_active(self, request, pk=None):
        """Toggle store active status"""
        store = self.get_object()
        store.is_active = not store.is_active
        store.save()
        return Response({'status': 'success', 'is_active': store.is_active})

class ProductViewSet(viewsets.ModelViewSet):
    serializer_class = ProductSerializer
    permission_classes = [permissions.IsAuthenticated]

    def get_queryset(self):
        user = self.request.user
        if user.user_type == USER_TYPE_SUPER_ADMIN:
            return Product.objects.all()
        return Product.objects.filter(store__merchant__user=user)

    def perform_create(self, serializer):
        """Ensure product belongs to merchant's store"""
        store = serializer.validated_data['store']
        if store.merchant.user != self.request.user:
            raise serializers.ValidationError("You can only add products to your own stores")
        serializer.save()

    @action(detail=True, methods=['post'])
    def toggle_availability(self, request, pk=None):
        """Toggle product availability"""
        product = self.get_object()
        product.is_available = not product.is_available
        product.save()
        return Response({'status': 'success', 'is_available': product.is_available})

    @action(detail=False, methods=['get'])
    def search(self, request):
        """Search products by name/description"""
        query = request.query_params.get('q', '').strip()
        if not query:
            return Response([])
            
        products = self.get_queryset().filter(
            Q(name__icontains=query) | 
            Q(description__icontains=query)
        )
        serializer = self.get_serializer(products, many=True)
        return Response(serializer.data)

class MerchantDashboardViewSet(viewsets.ViewSet):
    """Provides merchant business analytics"""
    permission_classes = [permissions.IsAuthenticated, IsMerchantUser]
    
    def list(self, request):
        """Get merchant business summary"""
        merchant = request.user.merchant_profile
        
        # Store stats
        stores = Store.objects.filter(merchant=merchant)
        active_stores = stores.filter(is_active=True).count()
        
        # Product stats
        products = Product.objects.filter(store__merchant=merchant)
        available_products = products.filter(is_available=True).count()
        
        # Transaction stats (last 30 days)
        thirty_days_ago = datetime.now() - timedelta(days=30)
        transactions = Transaction.objects.filter(
            merchant=merchant,
            created_at__gte=thirty_days_ago
        )
        
        total_sales = transactions.filter(status=Transaction.COMPLETED).aggregate(
            Sum('amount')
        )['amount__sum'] or 0
        
        return Response({
            'stores': stores.count(),
            'active_stores': active_stores,
            'products': products.count(),
            'available_products': available_products,
            'total_sales': float(total_sales),
            'transactions': transactions.count(),
            'completed_transactions': transactions.filter(status=Transaction.COMPLETED).count()
        })
    
    @action(detail=False, methods=['get'])
    def sales_trend(self, request):
        """Get daily sales for last 30 days"""
        from datetime import datetime, timedelta
        from django.db.models import Sum, Count
        from payments.models import Transaction
        
        merchant = request.user.merchant_profile
        thirty_days_ago = datetime.now() - timedelta(days=30)
        
        daily_sales = Transaction.objects.filter(
            merchant=merchant,
            status=Transaction.COMPLETED,
            created_at__gte=thirty_days_ago
        ).extra({
            'date': "date(created_at)"
        }).values('date').annotate(
            total=Sum('amount'),
            count=Count('id')
        ).order_by('date')
        
        return Response(daily_sales)

@api_view(['GET', 'POST'])
def onboarding_status(request):
    """Get or update onboarding status"""
    try:
        onboarding = MerchantOnboarding.objects.get(merchant=request.user.merchant_profile)
    except MerchantOnboarding.DoesNotExist:
        onboarding = MerchantOnboarding.objects.create(merchant=request.user.merchant_profile)
    
    if request.method == 'GET':
        serializer = OnboardingSerializer(onboarding)
        return Response(serializer.data)
    
    elif request.method == 'POST':
        serializer = OnboardingSerializer(onboarding, data=request.data, partial=True)
        serializer.is_valid(raise_exception=True)
        
        # Update step if data is valid
        if 'data' in request.data:
            onboarding.data.update(request.data['data'])
            onboarding.current_step = min(onboarding.current_step + 1, onboarding.total_steps)
            onboarding.status = MerchantOnboarding.BUSINESS_INFO if onboarding.current_step == 1 else \
                               MerchantOnboarding.BANK_DETAILS if onboarding.current_step == 2 else \
                               MerchantOnboarding.VERIFICATION if onboarding.current_step == 3 else \
                               MerchantOnboarding.COMPLETED
            onboarding.save()
        
        return Response(OnboardingSerializer(onboarding).data)

@api_view(['POST'])
@permission_classes([IsAuthenticated, IsMerchantUser])
def upload_verification(request):
    """Upload verification documents with actual file storage"""
    try:
        from django.core.files.storage import default_storage
        from django.conf import settings
        import uuid
        import os
        
        serializer = VerificationSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        
        onboarding = MerchantOnboarding.objects.get(merchant=request.user.merchant_profile)
        if onboarding.status != MerchantOnboarding.VERIFICATION:
            return Response({'error': 'Not in verification stage'}, status=400)
        
        # Get the uploaded file
        doc_type = serializer.validated_data['document_type']
        document_file = serializer.validated_data['document_file']
        
        # Generate unique filename
        file_extension = os.path.splitext(document_file.name)[1]
        unique_filename = f"{doc_type}_{request.user.id}_{uuid.uuid4()}{file_extension}"
        
        # Create directory structure
        upload_path = f"merchant_documents/{request.user.id}/"
        full_path = os.path.join(upload_path, unique_filename)
        
        # Save file to storage
        if default_storage.exists(full_path):
            default_storage.delete(full_path)
        
        saved_path = default_storage.save(full_path, document_file)
        file_url = default_storage.url(saved_path)
        
        # Store file info in onboarding data
        if 'documents' not in onboarding.data:
            onboarding.data['documents'] = {}
        
        onboarding.data['documents'][doc_type] = {
            'filename': unique_filename,
            'original_name': document_file.name,
            'file_path': saved_path,
            'file_url': file_url,
            'uploaded_at': timezone.now().isoformat(),
            'file_size': document_file.size
        }
        
        onboarding.save()
        
        # Check if all required docs are uploaded
        required_docs = ['id_card', 'business_license']
        uploaded_docs = list(onboarding.data.get('documents', {}).keys())
        
        if all(doc in uploaded_docs for doc in required_docs):
            onboarding.status = MerchantOnboarding.COMPLETED
            onboarding.is_verified = True
            onboarding.save()
            
            # Send completion notification
            NotificationService.create_notification(
                user=request.user,
                title="Onboarding Completed!",
                message=f"Congratulations! Your merchant onboarding has been completed successfully.",
                level='success',
                notification_type='merchant_onboarding_completed',
                metadata={
                    'merchant_id': str(onboarding.merchant.id),
                    'completed_at': timezone.now().isoformat()
                }
            )
        
        return Response({
            'status': 'success',
            'message': f'{doc_type.replace("_", " ").title()} uploaded successfully',
            'document_type': doc_type,
            'file_url': file_url,
            'all_required_uploaded': all(doc in uploaded_docs for doc in required_docs),
            'onboarding_completed': onboarding.status == MerchantOnboarding.COMPLETED
        })
        
    except Exception as e:
        return Response({
            'status': 'error',
            'message': f'Failed to upload document: {str(e)}'
        }, status=500)

class ReportTemplateViewSet(viewsets.ReadOnlyModelViewSet):
    """API for report templates"""
    serializer_class = ReportTemplateSerializer
    permission_classes = [permissions.IsAuthenticated, IsMerchantUser]

    def get_queryset(self):
        """Return active report templates"""
        return ReportTemplate.objects.filter(is_active=True)

class ReportViewSet(SubscriptionRequiredMixin, viewsets.ModelViewSet):
    """API for merchant reports"""
    serializer_class = ReportSerializer
    permission_classes = [permissions.IsAuthenticated, IsMerchantUser]

    def get_queryset(self):
        """Return reports belonging to the current merchant"""
        return Report.objects.filter(merchant=self.request.user.merchant_profile)

    def perform_create(self, serializer):
        """Automatically set the merchant when creating a report and trigger generation"""
        report = serializer.save(merchant=self.request.user.merchant_profile)

        # Trigger report generation
        try:
            self._generate_report_file(report)
        except Exception as e:
            report.status = 'failed'
            report.error_message = str(e)
            report.save()
            raise

        return report

    def _generate_report_file(self, report):
        """Generate the actual report file based on template type"""
        import csv
        import json
        from io import StringIO
        from django.core.files.base import ContentFile

        report.status = 'generating'
        report.save()

        try:
            # Get transaction data for the report
            transactions = Transaction.objects.filter(
                merchant=report.merchant,
                created_at__date__gte=report.start_date,
                created_at__date__lte=report.end_date
            ).select_related('customer').order_by('-created_at')

            if report.format == 'csv':
                # Generate CSV report
                output = StringIO()
                writer = csv.writer(output)

                # Write header
                writer.writerow(['Date', 'Amount', 'Currency', 'Status', 'Customer Email', 'Description'])

                # Write data
                for transaction in transactions:
                    writer.writerow([
                        transaction.created_at.strftime('%Y-%m-%d %H:%M:%S'),
                        str(transaction.amount),
                        transaction.currency,
                        transaction.status,
                        transaction.customer.user.email if transaction.customer else '',
                        transaction.description or ''
                    ])

                content = output.getvalue()
                file_name = f"report_{report.id}.csv"

            elif report.format == 'json':
                # Generate JSON report
                data = {
                    'report_info': {
                        'name': report.name,
                        'merchant': report.merchant.business_name,
                        'start_date': str(report.start_date),
                        'end_date': str(report.end_date),
                        'generated_at': timezone.now().isoformat()
                    },
                    'transactions': [
                        {
                            'id': str(transaction.id),
                            'date': transaction.created_at.isoformat(),
                            'amount': str(transaction.amount),
                            'currency': transaction.currency,
                            'status': transaction.status,
                            'customer_email': transaction.customer.user.email if transaction.customer else None,
                            'description': transaction.description
                        }
                        for transaction in transactions
                    ],
                    'summary': {
                        'total_transactions': transactions.count(),
                        'total_amount': str(sum(t.amount for t in transactions.filter(status='completed'))),
                        'completed_count': transactions.filter(status='completed').count(),
                        'pending_count': transactions.filter(status='pending').count(),
                        'failed_count': transactions.filter(status='failed').count()
                    }
                }
                content = json.dumps(data, indent=2)
                file_name = f"report_{report.id}.json"

            else:
                # Default to CSV for unsupported formats
                content = "Format not supported yet"
                file_name = f"report_{report.id}.txt"

            # Save report file using Django default storage
            import os
            from django.conf import settings
            from django.core.files.storage import default_storage
            from django.core.files.base import ContentFile

            storage_path = f"reports/{file_name}"
            saved_path = default_storage.save(storage_path, ContentFile(content.encode('utf-8')))
            report.file_url = default_storage.url(saved_path)
            report.record_count = transactions.count()
            report.file_size = len(content.encode('utf-8'))
            report.status = 'completed'
            report.completed_at = timezone.now()
            report.save()

        except Exception as e:
            report.status = 'failed'
            report.error_message = str(e)
            report.save()
            raise
    def regenerate(self, request, pk=None):
        """Regenerate an existing report"""
        report = self.get_object()
        if report.status not in ['completed', 'failed']:
            return Response({'error': 'Report is still processing'}, status=status.HTTP_400_BAD_REQUEST)

        # Reset report status and trigger regeneration
        report.status = 'pending'
        report.error_message = ''
        report.file_url = None
        report.file_size = None
        report.record_count = 0
        report.processing_time = None
        report.completed_at = None
        report.save()

        # Generate the report file
        try:
            self._generate_report_file(report)
        except Exception as e:
            report.status = 'failed'
            report.error_message = str(e)
            report.save()

        return Response({'message': 'Report regeneration started'})

    @action(detail=True, methods=['post'])
    def cancel(self, request, pk=None):
        """Cancel a pending report"""
        report = self.get_object()
        if report.status not in ['pending', 'generating']:
            return Response({'error': 'Report cannot be cancelled'}, status=status.HTTP_400_BAD_REQUEST)

        report.status = 'failed'
        report.error_message = 'Cancelled by user'
        report.save()

        return Response({'message': 'Report cancelled'})

    @action(detail=True, methods=['get'])
    def download(self, request, pk=None):
        """Download the completed report file"""
        report = self.get_object()
        if report.status != 'completed' or not report.file_url:
            return Response({'error': 'Report is not ready for download'}, status=status.HTTP_400_BAD_REQUEST)

        # Serve the file from the local storage
        import os
        from django.conf import settings
        from django.http import HttpResponse

        file_name = os.path.basename(report.file_url)
        file_path = os.path.join(settings.MEDIA_ROOT, 'reports', file_name)

        if not os.path.exists(file_path):
            return Response({'error': 'File not found'}, status=status.HTTP_404_NOT_FOUND)

        with open(file_path, 'rb') as f:
            file_data = f.read()

        # Create response with appropriate content type
        if report.format == 'csv':
            content_type = 'text/csv'
        elif report.format == 'json':
            content_type = 'application/json'
        else:
            content_type = 'text/plain'

        response = HttpResponse(file_data, content_type=content_type)
        response['Content-Disposition'] = f'attachment; filename="{report.name}.{report.format}"'
        response['Content-Length'] = len(file_data)

        return response

    @action(detail=False, methods=['get'])
    def generate(self, request):
        """Generate a new report with parameters"""
        template_id = request.query_params.get('template')
        start_date = request.query_params.get('start_date')
        end_date = request.query_params.get('end_date')
        format_type = request.query_params.get('format', 'pdf')

        if not all([template_id, start_date, end_date]):
            return Response({'error': 'template, start_date, and end_date are required'}, status=status.HTTP_400_BAD_REQUEST)

        try:
            template = ReportTemplate.objects.get(id=template_id, is_active=True)
        except ReportTemplate.DoesNotExist:
            return Response({'error': 'Invalid template'}, status=status.HTTP_400_BAD_REQUEST)

        # Create report
        report = Report.objects.create(
            merchant=request.user.merchant_profile,
            template=template,
            name=f"{template.name} - {start_date} to {end_date}",
            start_date=start_date,
            end_date=end_date,
            format=format_type,
            filters=request.query_params.dict()
        )

        # Generate the report file
        try:
            self._generate_report_file(report)
        except Exception as e:
            report.status = 'failed'
            report.error_message = str(e)
            report.save()

        serializer = self.get_serializer(report)
        return Response(serializer.data, status=status.HTTP_201_CREATED)

class ScheduledReportViewSet(SubscriptionRequiredMixin, viewsets.ModelViewSet):
    """API for scheduled reports"""
    serializer_class = ScheduledReportSerializer
    permission_classes = [permissions.IsAuthenticated, IsMerchantUser]

    def get_queryset(self):
        """Return scheduled reports belonging to the current merchant"""
        return ScheduledReport.objects.filter(merchant=self.request.user.merchant_profile)

    def perform_create(self, serializer):
        """Automatically set the merchant and created_by when creating a scheduled report"""
        serializer.save(
            merchant=self.request.user.merchant_profile,
            created_by=self.request.user
        )

    @action(detail=True, methods=['post'])
    def pause(self, request, pk=None):
        """Pause a scheduled report"""
        scheduled_report = self.get_object()
        scheduled_report.status = 'paused'
        scheduled_report.save()
        return Response({'message': 'Scheduled report paused'})

    @action(detail=True, methods=['post'])
    def resume(self, request, pk=None):
        """Resume a paused scheduled report"""
        scheduled_report = self.get_object()
        if scheduled_report.status != 'paused':
            return Response({'error': 'Report is not paused'}, status=status.HTTP_400_BAD_REQUEST)

        scheduled_report.status = 'active'
        scheduled_report.calculate_next_run()
        scheduled_report.save()
        return Response({'message': 'Scheduled report resumed'})

    @action(detail=True, methods=['post'])
    def run_now(self, request, pk=None):
        """Trigger immediate execution of a scheduled report"""
        scheduled_report = self.get_object()
        if scheduled_report.status != 'active':
            return Response({'error': 'Scheduled report is not active'}, status=status.HTTP_400_BAD_REQUEST)

        # Create a one-time report based on the schedule
        report = Report.objects.create(
            merchant=scheduled_report.merchant,
            template=scheduled_report.template,
            name=f"{scheduled_report.name} - Manual Run",
            start_date=timezone.now().date() - timedelta(days=30),  # Last 30 days
            end_date=timezone.now().date(),
            format=scheduled_report.format,
            filters=scheduled_report.filters,
            is_scheduled=True
        )

        # Update last_run
        scheduled_report.last_run = timezone.now()
        scheduled_report.calculate_next_run()
        scheduled_report.save()

        # TODO: Trigger async report generation

        serializer = ReportSerializer(report)
        return Response(serializer.data, status=status.HTTP_201_CREATED)

class MerchantCustomerViewSet(viewsets.ModelViewSet):
    """API for merchant customers"""
    serializer_class = MerchantCustomerSerializer
    permission_classes = [IsAuthenticated, IsMerchantUser]

    def get_queryset(self):
        merchant = self.request.user.merchant_profile
        return MerchantCustomer.objects.filter(merchant=merchant)

    def get_serializer_class(self):
        if self.action == 'create':
            return CreateMerchantCustomerSerializer
        return MerchantCustomerSerializer

    def perform_create(self, serializer):
        serializer.save()

    @action(detail=True, methods=['post'])
    def onboard(self, request, pk=None):
        """Onboard a customer with optional KYC requirement"""
        customer = self.get_object()
        serializer = OnboardMerchantCustomerSerializer(data=request.data)
        
        if serializer.is_valid():
            customer.kyc_required = serializer.validated_data['kyc_required']
            customer.notes = serializer.validated_data.get('notes', '')
            customer.status = 'active'
            customer.save()
            
            customer_serializer = self.get_serializer(customer)
            return Response(customer_serializer.data)
        
        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)

    @action(detail=True, methods=['post'])
    def suspend(self, request, pk=None):
        """Suspend a customer"""
        customer = self.get_object()
        customer.status = 'suspended'
        customer.save()
        
        customer_serializer = self.get_serializer(customer)
        return Response(customer_serializer.data)

    @action(detail=True, methods=['post'])
    def activate(self, request, pk=None):
        """Activate a customer"""
        customer = self.get_object()
        customer.status = 'active'
        customer.save()
        
        customer_serializer = self.get_serializer(customer)
        return Response(customer_serializer.data)

    @action(detail=True, methods=['post'])
    def submit_kyc(self, request, pk=None):
        """Submit KYC for a customer"""
        customer = self.get_object()
        # TODO: Implement KYC submission logic
        customer.kyc_status = 'pending'
        customer.save()
        
        customer_serializer = self.get_serializer(customer)
        return Response(customer_serializer.data)

    @action(detail=False, methods=['get'])
    def stats(self, request):
        """Get customer statistics for the merchant"""
        merchant = request.user.merchant_profile
        customers = self.get_queryset()
        
        stats = {
            'total_customers': customers.count(),
            'active_customers': customers.filter(status='active').count(),
            'suspended_customers': customers.filter(status='suspended').count(),
            'pending_kyc': customers.filter(kyc_status='pending').count(),
        }
        
        return Response(stats)

class MerchantTransactionViewSet(viewsets.ReadOnlyModelViewSet):
    """API for merchant transactions"""
    serializer_class = TransactionSerializer
    permission_classes = [IsAuthenticated, IsMerchantUser]
    
    def get_queryset(self):
        if not hasattr(self.request.user, 'merchant_profile'):
            return Transaction.objects.none()
        return Transaction.objects.filter(merchant=self.request.user.merchant_profile)

    @action(detail=False, methods=['get'])
    def stats(self, request):
        """Get transaction statistics for the merchant"""
        qs = self.get_queryset()
        total = qs.count()
        completed = qs.filter(status='completed').count()
        failed = qs.filter(status='failed').count()
        pending = qs.filter(status='pending').count()
        processing = qs.filter(status='processing').count()

        total_volume = qs.filter(status='completed').aggregate(
            vol=Sum('amount'))['vol'] or 0.0
        avg_tx = qs.filter(status='completed').aggregate(
            avg=Avg('amount'))['avg'] or 0.0
        success_rate = round((completed / total) * 100, 2) if total > 0 else 0.0

        return Response({
            'total_volume': float(total_volume),
            'success_rate': success_rate,
            'average_transaction': float(avg_tx),
            'processing_count': processing,
            'total_transactions': total,
            'completed_count': completed,
            'failed_count': failed,
            'pending_count': pending,
        })

class MerchantNotificationViewSet(viewsets.ModelViewSet):
    """API for merchant notifications"""
    permission_classes = [IsAuthenticated, IsMerchantUser]
    
    def get_queryset(self):
        merchant = self.request.user.merchant_profile
        # Get notifications for this merchant user
        return Notification.objects.filter(user=self.request.user)

class MerchantAnalyticsViewSet(viewsets.ViewSet):
    """API for merchant analytics"""
    permission_classes = [IsAuthenticated, IsMerchantUser]
    
    def _get_merchant_analytics(self, merchant):
        """Shared analytics computation used by both list and overview"""
        try:
            now = timezone.now()
            current_month_start = now.replace(day=1, hour=0, minute=0, second=0, microsecond=0)
            prev_month_start = (current_month_start - timedelta(days=1)).replace(day=1)
            
            # Current period totals
            total_transactions = Transaction.objects.filter(merchant=merchant).count()
            total_customers = MerchantCustomer.objects.filter(merchant=merchant).count()
            active_customers = MerchantCustomer.objects.filter(merchant=merchant, status='active').count()
            total_revenue = Transaction.objects.filter(
                merchant=merchant, status='completed'
            ).aggregate(total=Sum('amount'))['total'] or 0
            
            # Previous month totals for change %
            prev_revenue = Transaction.objects.filter(
                merchant=merchant, status='completed',
                created_at__gte=prev_month_start, created_at__lt=current_month_start
            ).aggregate(total=Sum('amount'))['total'] or 0
            curr_revenue = Transaction.objects.filter(
                merchant=merchant, status='completed',
                created_at__gte=current_month_start
            ).aggregate(total=Sum('amount'))['total'] or 0
            
            prev_txn_count = Transaction.objects.filter(
                merchant=merchant, created_at__gte=prev_month_start, created_at__lt=current_month_start
            ).count()
            curr_txn_count = Transaction.objects.filter(
                merchant=merchant, created_at__gte=current_month_start
            ).count()
            
            prev_cust_count = MerchantCustomer.objects.filter(
                merchant=merchant, onboarded_at__gte=prev_month_start, onboarded_at__lt=current_month_start
            ).count()
            curr_cust_count = MerchantCustomer.objects.filter(
                merchant=merchant, onboarded_at__gte=current_month_start
            ).count()
            
            def pct_change(current, previous):
                if previous == 0:
                    return 100.0 if current > 0 else 0.0
                return round(((current - previous) / previous) * 100, 1)
            
            revenue_change = pct_change(float(curr_revenue), float(prev_revenue))
            txn_change = pct_change(curr_txn_count, prev_txn_count)
            cust_change = pct_change(curr_cust_count, prev_cust_count)
            
            # Pending payouts from Payout model
            from accounts.models import Payout
            pending_payouts = Payout.objects.filter(
                merchant=merchant, status='pending'
            ).aggregate(total=Sum('amount'))['total'] or 0
            
            # Monthly revenue chart data (last 6 months)
            chart_data = []
            for i in range(5, -1, -1):
                month_start = (now - timedelta(days=30 * i)).replace(day=1, hour=0, minute=0, second=0, microsecond=0)
                if i > 0:
                    month_end = (now - timedelta(days=30 * (i - 1))).replace(day=1, hour=0, minute=0, second=0, microsecond=0)
                else:
                    month_end = now
                month_rev = Transaction.objects.filter(
                    merchant=merchant, status='completed',
                    created_at__gte=month_start, created_at__lt=month_end
                ).aggregate(total=Sum('amount'))['total'] or 0
                chart_data.append({
                    'month': month_start.strftime('%b %Y'),
                    'revenue': float(month_rev)
                })
            
            return {
                'total_transactions': total_transactions,
                'total_customers': total_customers,
                'active_customers': active_customers,
                'total_revenue': float(total_revenue),
                'pending_payouts': float(pending_payouts),
                'revenue_change': revenue_change,
                'txn_change': txn_change,
                'cust_change': cust_change,
                'chart_data': chart_data,
            }
        except Exception as e:
            print(f"Error in analytics: {str(e)}")
            return {
                'total_transactions': 0,
                'total_customers': 0,
                'active_customers': 0,
                'total_revenue': 0.0,
                'pending_payouts': 0.0,
                'revenue_change': 0.0,
                'txn_change': 0.0,
                'cust_change': 0.0,
                'chart_data': [],
            }
    
    def list(self, request):
        """Get merchant analytics data"""
        try:
            merchant = request.user.merchant_profile
        except Merchant.DoesNotExist:
            return Response({
                'error': 'Merchant profile not found',
                'message': 'Please complete merchant onboarding to access analytics'
            }, status=status.HTTP_400_BAD_REQUEST)
        
        data = self._get_merchant_analytics(merchant)
        
        analytics = {
            'revenue': {
                'total': data['total_revenue'],
                'change_percentage': data['revenue_change'],
                'chart_data': data['chart_data']
            },
            'transactions': {
                'total': data['total_transactions'],
                'change_percentage': data['txn_change']
            },
            'customers': {
                'total': data['total_customers'],
                'change_percentage': data['cust_change']
            },
            'sales': {
                'total': data['total_revenue'],
                'change_percentage': data['revenue_change'],
                'by_category': []
            }
        }
        
        return Response(analytics)
    
    @action(detail=False, methods=['get'])
    def overview(self, request):
        """Get merchant analytics overview"""
        try:
            merchant = request.user.merchant_profile
        except Merchant.DoesNotExist:
            return Response({
                'error': 'Merchant profile not found'
            }, status=status.HTTP_400_BAD_REQUEST)
        
        data = self._get_merchant_analytics(merchant)
        
        analytics = {
            'total_transactions': data['total_transactions'],
            'total_customers': data['total_customers'],
            'active_customers': data['active_customers'],
            'total_revenue': data['total_revenue'],
            'pending_payouts': data['pending_payouts'],
            'overview': {
                'total_revenue': data['total_revenue'],
                'total_transactions': data['total_transactions'],
                'pending_payouts': data['pending_payouts'],
            }
        }
        
        return Response(analytics)

class MerchantInvoiceViewSet(viewsets.ModelViewSet):
    """API for merchant invoices"""
    permission_classes = [IsAuthenticated, IsMerchantUser]
    serializer_class = InvoiceSerializer
    
    def get_serializer_class(self):
        if self.action == 'create':
            return CreateInvoiceSerializer
        return InvoiceSerializer
    
    def get_queryset(self):
        # Check if user has merchant profile
        if not hasattr(self.request.user, 'merchant_profile'):
            return Invoice.objects.none()
        
        # Get invoices created by this merchant user
        return Invoice.objects.filter(
            created_by=self.request.user,
            invoice_type='merchant'
        )
    
    def perform_create(self, serializer):
        # Set merchant if creating merchant invoice
        if hasattr(self.request.user, 'merchant_profile'):
            serializer.save(merchant=self.request.user)

from rest_framework import viewsets, permissions
from rest_framework.decorators import action
from rest_framework.response import Response
from django.shortcuts import get_object_or_404

from core.response import APIResponse
from .models import MerchantSettings, MerchantNotificationSettings, MerchantPayoutSettings
from .serializers import (
    MerchantSettingsSerializer,
    MerchantNotificationSettingsSerializer,
    MerchantPayoutSettingsSerializer
)

class MerchantSettingsViewSet(viewsets.ModelViewSet):
    """
    API endpoint for managing merchant settings
    """
    serializer_class = MerchantSettingsSerializer
    permission_classes = [permissions.IsAuthenticated]

    def get_queryset(self):
        return MerchantSettings.objects.filter(merchant=self.request.user.merchant_profile)

    def get_object(self):
        queryset = self.get_queryset()
        obj = get_object_or_404(queryset)
        return obj

    def perform_create(self, serializer):
        serializer.save(merchant=self.request.user.merchant_profile)

    @action(detail=False, methods=['get', 'patch'])
    def business(self, request):
        """Get or update business settings"""
        settings, created = MerchantSettings.objects.get_or_create(
            merchant=request.user.merchant_profile,
            defaults={}
        )

        if request.method == 'GET':
            serializer = self.get_serializer(settings)
            return APIResponse(serializer.data)

        elif request.method == 'PATCH':
            serializer = self.get_serializer(settings, data=request.data, partial=True)
            if serializer.is_valid():
                serializer.save()
                return APIResponse({"message": "Business settings updated successfully"})
            return APIResponse(serializer.errors, status=400)

    @action(detail=False, methods=['get', 'patch'])
    def notifications(self, request):
        """Get or update notification settings"""
        settings, created = MerchantNotificationSettings.objects.get_or_create(
            merchant=request.user.merchant_profile,
            defaults={}
        )

        if request.method == 'GET':
            serializer = MerchantNotificationSettingsSerializer(settings)
            return APIResponse(serializer.data)

        elif request.method == 'PATCH':
            serializer = MerchantNotificationSettingsSerializer(settings, data=request.data, partial=True)
            if serializer.is_valid():
                serializer.save()
                return APIResponse({"message": "Notification settings updated successfully"})
            return APIResponse(serializer.errors, status=400)

    @action(detail=False, methods=['get', 'patch'])
    def payouts(self, request):
        """Get or update payout settings"""
        settings, created = MerchantPayoutSettings.objects.get_or_create(
            merchant=request.user.merchant_profile,
            defaults={}
        )

        if request.method == 'GET':
            serializer = MerchantPayoutSettingsSerializer(settings)
            return APIResponse(serializer.data)

        elif request.method == 'PATCH':
            serializer = MerchantPayoutSettingsSerializer(settings, data=request.data, partial=True)
            if serializer.is_valid():
                serializer.save()
                return APIResponse({"message": "Payout settings updated successfully"})
            return APIResponse(serializer.errors, status=400)
