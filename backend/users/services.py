from django.contrib.auth import get_user_model
from .models import Merchant, Customer, KYCDocument, MerchantCustomer, MerchantKYCSubmission
from core.response import APIResponse
from django.db.models import Q
from django.utils import timezone
from shared.constants import USER_TYPE_MERCHANT, USER_TYPE_CUSTOMER

User = get_user_model()

class UserService:
    
    @staticmethod
    def get_user_profile(user):
        if user.user_type == USER_TYPE_MERCHANT:
            return user.merchant_profile
        elif user.user_type == USER_TYPE_CUSTOMER:
            return user.customer_profile
        return None

    @staticmethod
    def search_users(query=None, user_type=None):
        queryset = User.objects.all()
        
        if query:
            queryset = queryset.filter(
                Q(email__icontains=query) |
                Q(username__icontains=query)
            )
            
        if user_type:
            queryset = queryset.filter(user_type=user_type)
            
        return queryset
    
    @staticmethod
    def filter_merchants(is_approved=None, business_name=None):
        queryset = Merchant.objects.select_related('user')
        
        if is_approved is not None:
            queryset = queryset.filter(is_approved=is_approved)
            
        if business_name:
            queryset = queryset.filter(business_name__icontains=business_name)
            
        return queryset


class KYCService:
    @staticmethod
    def initiate_verification(user, document_type, document_file):
        """Start KYC verification process"""
        # Validate document
        if not document_file:
            raise ValueError('Document file is required')
            
        # Create KYC record
        kyc_doc = KYCDocument.objects.create(
            user=user,
            document_type=document_type,
            document_file=document_file,
            status='PENDING'
        )
        
        # Here you would typically:
        # 1. Upload to verification service
        # 2. Initiate background check
        # 3. Send confirmation email
        
        return kyc_doc
    
    @staticmethod
    def check_verification_status(user):
        """Get current KYC status for user"""
        return KYCDocument.objects.filter(user=user).latest('created_at')
    
    @staticmethod
    def approve_verification(kyc_document):
        """Mark KYC as approved"""
        kyc_document.status = 'APPROVED'
        kyc_document.save()
        # Additional approval logic would go here
        return kyc_document
    
    @staticmethod
    def reject_verification(kyc_document, reason):
        """Mark KYC as rejected with reason"""
        kyc_document.status = 'REJECTED'
        kyc_document.rejection_reason = reason
        kyc_document.save()
        # Additional rejection logic would go here
        return kyc_document

    # Merchant-Customer KYC Methods
    
    @staticmethod
    def onboard_merchant_customer(merchant, customer, kyc_required=True, notes=''):
        """Onboard a customer to a merchant for management"""
        if MerchantCustomer.objects.filter(merchant=merchant, customer=customer).exists():
            raise ValueError('Customer is already onboarded to this merchant')
            
        merchant_customer = MerchantCustomer.objects.create(
            merchant=merchant,
            customer=customer,
            kyc_required=kyc_required,
            notes=notes
        )
        
        # If KYC is required, set initial status
        if kyc_required:
            merchant_customer.kyc_status = 'not_started'
        else:
            merchant_customer.kyc_status = 'not_required'
        merchant_customer.save()
        
        return merchant_customer
    
    @staticmethod
    def submit_merchant_customer_kyc(merchant_customer, document_type, document_file, auto_escalate=True):
        """Submit KYC documents for a merchant's customer"""
        customer = merchant_customer.customer
        
        # Create the KYC document
        kyc_doc = KYCDocument.objects.create(
            user=customer.user,
            document_type=document_type,
            document_file=document_file,
            status='PENDING'
        )
        
        # Update merchant customer status
        merchant_customer.kyc_status = 'in_progress'
        merchant_customer.last_kyc_check = timezone.now()
        merchant_customer.save()
        
        # If auto-escalate is enabled, create admin submission
        if auto_escalate:
            return KYCService.escalate_to_admin_review(merchant_customer, kyc_doc)
        
        return kyc_doc
    
    @staticmethod
    def escalate_to_admin_review(merchant_customer, kyc_document, priority='normal', escalation_reason=''):
        """Escalate merchant customer KYC to admin for review"""
        submission = MerchantKYCSubmission.objects.create(
            merchant_customer=merchant_customer,
            kyc_document=kyc_document,
            review_priority=priority,
            escalation_reason=escalation_reason,
            risk_score=merchant_customer.risk_score,
            risk_factors=merchant_customer.notes.split(',') if merchant_customer.notes else []
        )
        
        # Update merchant customer status
        merchant_customer.kyc_status = 'pending_review'
        merchant_customer.save()
        
        # Here you would trigger admin notifications
        # KYCService.notify_admin_of_kyc_submission(submission)
        
        return submission
    
    @staticmethod
    def process_admin_kyc_decision(submission, decision, admin_user, admin_notes=''):
        """Process admin decision on merchant customer KYC"""
        submission.status = decision
        submission.reviewed_by = admin_user
        submission.reviewed_at = timezone.now()
        submission.admin_notes = admin_notes
        submission.save()
        
        merchant_customer = submission.merchant_customer
        kyc_document = submission.kyc_document
        
        if decision == 'approved':
            # Approve the KYC document
            kyc_document.status = 'APPROVED'
            kyc_document.reviewed_by = admin_user
            kyc_document.reviewed_at = timezone.now()
            kyc_document.save()
            
            # Update merchant customer
            merchant_customer.kyc_status = 'approved'
            merchant_customer.kyc_completed_at = timezone.now()
            merchant_customer.status = 'active'
            merchant_customer.save()
            
        elif decision == 'rejected':
            # Reject the KYC document
            kyc_document.status = 'REJECTED'
            kyc_document.rejection_reason = admin_notes
            kyc_document.reviewed_by = admin_user
            kyc_document.reviewed_at = timezone.now()
            kyc_document.save()
            
            # Update merchant customer
            merchant_customer.kyc_status = 'rejected'
            merchant_customer.status = 'suspended'
            merchant_customer.suspension_reason = admin_notes
            merchant_customer.suspended_by = admin_user
            merchant_customer.suspended_at = timezone.now()
            merchant_customer.save()
            
        elif decision == 'escalated':
            # Mark for further review (e.g., compliance team)
            submission.escalated_at = timezone.now()
            submission.save()
            
        return submission
    
    @staticmethod
    def get_merchant_customer_kyc_status(merchant_customer):
        """Get comprehensive KYC status for a merchant customer"""
        submissions = MerchantKYCSubmission.objects.filter(
            merchant_customer=merchant_customer
        ).select_related('kyc_document', 'reviewed_by')
        
        return {
            'merchant_customer': merchant_customer,
            'kyc_status': merchant_customer.kyc_status,
            'is_active': merchant_customer.is_active,
            'kyc_passed': merchant_customer.kyc_passed,
            'needs_admin_review': merchant_customer.needs_admin_review,
            'risk_score': merchant_customer.risk_score,
            'submissions': submissions,
            'latest_submission': submissions.first() if submissions.exists() else None
        }
    
    @staticmethod
    def bulk_process_kyc_decisions(submissions_data, admin_user):
        """Process multiple KYC decisions in bulk"""
        results = []
        for submission_data in submissions_data:
            try:
                submission = MerchantKYCSubmission.objects.get(id=submission_data['id'])
                result = KYCService.process_admin_kyc_decision(
                    submission=submission,
                    decision=submission_data['decision'],
                    admin_user=admin_user,
                    admin_notes=submission_data.get('admin_notes', '')
                )
                results.append({'success': True, 'submission_id': submission.id, 'result': result})
            except Exception as e:
                results.append({'success': False, 'submission_id': submission_data['id'], 'error': str(e)})
        
        return results
