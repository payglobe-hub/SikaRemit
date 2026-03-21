import logging
from django.utils import timezone
from merchants.models import BusinessKYC, BusinessDocument, BusinessComplianceLog, BusinessAccount
from accounts.models import User

logger = logging.getLogger(__name__)

class BusinessKYCService:
    """
    Service for handling business KYC and compliance operations
    """

    @staticmethod
    def create_business_kyc(business_account, kyc_data):
        """
        Create KYC record for a business account
        """
        kyc = BusinessKYC.objects.create(
            business_account=business_account,
            **kyc_data
        )

        # Calculate initial risk score
        kyc.update_risk_score()

        # Create required documents
        BusinessKYCService._create_required_documents(business_account)

        return kyc

    @staticmethod
    def _create_required_documents(business_account):
        """
        Create default required documents for a business account
        """
        required_documents = [
            {
                'document_type': 'business_registration',
                'document_name': 'Business Registration Certificate',
                'is_required': True,
            },
            {
                'document_type': 'tax_certificate',
                'document_name': 'Tax Clearance Certificate',
                'is_required': True,
            },
            {
                'document_type': 'identity_proof',
                'document_name': 'Director Identity Proof',
                'is_required': True,
            },
            {
                'document_type': 'address_proof',
                'document_name': 'Business Address Proof',
                'is_required': True,
            },
        ]

        for doc_data in required_documents:
            BusinessDocument.objects.create(
                business_account=business_account,
                **doc_data
            )

    @staticmethod
    def perform_compliance_checks(business_account):
        """
        Perform comprehensive compliance checks
        """
        kyc = business_account.kyc

        checks_passed = {
            'sanctions_check': BusinessKYCService._check_sanctions_list(business_account),
            'pep_check': BusinessKYCService._check_pep_list(business_account),
            'adverse_media_check': BusinessKYCService._check_adverse_media(business_account),
            'document_verification': BusinessKYCService._verify_documents(business_account),
        }

        # Update KYC with check results
        kyc.sanctions_check_passed = checks_passed['sanctions_check']
        kyc.pep_associated = not checks_passed['pep_check']
        kyc.adverse_media_check = checks_passed['adverse_media_check']
        kyc.save()

        # Recalculate risk score
        kyc.update_risk_score()

        # Log compliance check
        BusinessComplianceLog.objects.create(
            business_account=business_account,
            action_type='risk_assessment',
            description='Automated compliance check performed',
            performed_by=None,  # System action
            risk_impact=kyc.risk_level,
            compliance_status_changed=True,
        )

        return checks_passed

    @staticmethod
    def _check_sanctions_list(business_account):
        """
        Check if business is on sanctions list using PEPSanctionsService
        """
        try:
            from payments.services.advanced_compliance_service import PEPSanctionsService
            service = PEPSanctionsService()

            entity_data = {
                'name': business_account.business_name,
                'nationality': getattr(business_account, 'country', None),
                'aliases': [],
            }
            result = service.screen_individual(entity_data)
            sanctions_matches = result.get('sanctions_matches', [])

            if sanctions_matches:
                logger.warning(
                    f"Sanctions match for business {business_account.id}: "
                    f"{len(sanctions_matches)} matches found"
                )
                BusinessComplianceLog.objects.create(
                    business_account=business_account,
                    action_type='sanctions_check',
                    description=f'Sanctions match detected: {len(sanctions_matches)} matches',
                    performed_by=None,
                    risk_impact='high',
                    compliance_status_changed=True,
                )
                return False  # Failed sanctions check

            return True  # Passed sanctions check
        except Exception as e:
            logger.error(f"Sanctions check failed for business {business_account.id}: {e}")
            return False  # Fail closed on error

    @staticmethod
    def _check_pep_list(business_account):
        """
        Check if business is associated with politically exposed persons
        """
        try:
            from payments.services.advanced_compliance_service import PEPSanctionsService
            service = PEPSanctionsService()

            # Screen business owner/representatives
            owner = getattr(business_account, 'user', None)
            if not owner:
                return False

            entity_data = {
                'name': f"{owner.first_name} {owner.last_name}",
                'date_of_birth': getattr(owner, 'date_of_birth', None),
                'nationality': getattr(owner, 'nationality', None),
                'aliases': [],
            }
            result = service.screen_individual(entity_data)
            pep_matches = result.get('pep_matches', [])

            if pep_matches:
                logger.warning(
                    f"PEP match for business {business_account.id} owner: "
                    f"{len(pep_matches)} matches found"
                )
                BusinessComplianceLog.objects.create(
                    business_account=business_account,
                    action_type='pep_check',
                    description=f'PEP match detected: {len(pep_matches)} matches',
                    performed_by=None,
                    risk_impact='high',
                    compliance_status_changed=True,
                )
                return True  # PEP detected

            return False  # No PEP match
        except Exception as e:
            logger.error(f"PEP check failed for business {business_account.id}: {e}")
            return True  # Fail closed — treat as PEP to trigger review

    @staticmethod
    def _check_adverse_media(business_account):
        """
        Check for adverse media mentions using compliance screening
        """
        try:
            from payments.services.advanced_compliance_service import PEPSanctionsService
            service = PEPSanctionsService()

            entity_data = {
                'name': business_account.business_name,
                'nationality': getattr(business_account, 'country', None),
                'aliases': [],
            }
            result = service.screen_individual(entity_data)
            overall_risk = result.get('overall_risk', 'unknown')

            if overall_risk in ['high', 'critical']:
                logger.warning(
                    f"Adverse media / high risk for business {business_account.id}: risk={overall_risk}"
                )
                BusinessComplianceLog.objects.create(
                    business_account=business_account,
                    action_type='adverse_media_check',
                    description=f'High risk detected during media screening: {overall_risk}',
                    performed_by=None,
                    risk_impact=overall_risk,
                    compliance_status_changed=True,
                )
                return False  # Failed adverse media check

            return True  # Passed
        except Exception as e:
            logger.error(f"Adverse media check failed for business {business_account.id}: {e}")
            return False  # Fail closed on error

    @staticmethod
    def _verify_documents(business_account):
        """
        Verify that all required documents are present and valid
        """
        required_docs = business_account.documents.filter(is_required=True)
        approved_docs = required_docs.filter(status='approved')

        return len(approved_docs) >= len(required_docs)

    @staticmethod
    def generate_compliance_report(business_account, report_type, start_date, end_date):
        """
        Generate compliance report for a business
        """
        from merchants.models import ComplianceReport

        # Gather compliance data
        report_data = BusinessKYCService._gather_compliance_data(business_account, start_date, end_date)

        report = ComplianceReport.objects.create(
            business_account=business_account,
            report_type=report_type,
            title=f"{report_type.replace('_', ' ').title()} Report",
            report_period_start=start_date,
            report_period_end=end_date,
            report_data=report_data,
        )

        return report

    @staticmethod
    def _gather_compliance_data(business_account, start_date, end_date):
        """
        Gather compliance data for reporting
        """
        # Get transactions in period
        transactions = business_account.bulk_payments.filter(
            created_at__date__gte=start_date,
            created_at__date__lte=end_date
        )

        # Get compliance logs
        compliance_logs = business_account.compliance_logs.filter(
            performed_at__date__gte=start_date,
            performed_at__date__lte=end_date
        )

        return {
            'total_transactions': transactions.count(),
            'total_volume': sum(t.total_amount for t in transactions),
            'high_value_transactions': transactions.filter(total_amount__gte=10000).count(),
            'compliance_events': compliance_logs.count(),
            'risk_assessments': compliance_logs.filter(action_type='risk_assessment').count(),
            'document_verifications': compliance_logs.filter(action_type='document_review').count(),
            'current_risk_level': business_account.risk_level,
            'compliance_status': business_account.compliance_status,
        }

class DocumentVerificationService:
    """
    Service for document verification and processing
    """

    @staticmethod
    def process_document_upload(document, uploaded_file, uploaded_by):
        """
        Process uploaded document
        """
        document.document_file = uploaded_file
        document.uploaded_by = uploaded_by
        document.status = 'pending'
        document.uploaded_at = timezone.now()
        document.save()

        # Log document upload
        BusinessComplianceLog.objects.create(
            business_account=document.business_account,
            action_type='document_upload',
            description=f'Document uploaded: {document.document_name}',
            performed_by=uploaded_by,
            old_value='',
            new_value=document.document_file.name if document.document_file else '',
        )

    @staticmethod
    def review_document(document, reviewer, status, notes):
        """
        Review and update document status
        """
        old_status = document.status
        document.status = status
        document.verification_notes = notes
        document.reviewed_by = reviewer
        document.reviewed_at = timezone.now()
        document.save()

        # Log document review
        BusinessComplianceLog.objects.create(
            business_account=document.business_account,
            action_type='document_review',
            description=f'Document {document.document_name} reviewed: {status}',
            performed_by=reviewer,
            old_value=old_status,
            new_value=status,
        )

        # Update business compliance status
        document.business_account.update_compliance_status()

    @staticmethod
    def check_document_expiry():
        """
        Check for expired documents and update status
        """
        expired_docs = BusinessDocument.objects.filter(
            expiry_date__lt=timezone.now().date(),
            status__in=['approved', 'pending']
        )

        for doc in expired_docs:
            doc.status = 'expired'
            doc.save()

            # Log expiry
            BusinessComplianceLog.objects.create(
                business_account=doc.business_account,
                action_type='document_review',
                description=f'Document {doc.document_name} expired',
                performed_by=None,  # System action
            )
