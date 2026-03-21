import logging
from django.conf import settings
from decimal import Decimal

logger = logging.getLogger(__name__)

class GhanaRemittanceCompliance:
    """
    Implements Bank of Ghana remittance regulations
    Reference: Bank of Ghana Foreign Exchange Act, 2022
    """
    
    # Approved corridors
    APPROVED_CORRIDORS = [
        ('US', 'GH'),
        ('UK', 'GH'),
        ('EU', 'GH')
    ]
    
    # Transaction limits (in USD)
    DAILY_LIMIT = Decimal('5000')
    MONTHLY_LIMIT = Decimal('10000')
    SINGLE_TXN_MAX = Decimal('2000')
    
    # Exempt entities
    EXEMPT_ENTITIES = [
        'GhanaGovernment',
        'UN Agencies',
        'DiplomaticMissions',
        'RegisteredNGOs',
        'CentralBanks',
        'ApprovedFintechs',
        'MultilateralInstitutions'
    ]
    
    EXEMPTION_DOCUMENTS = {
        'GhanaGovernment': ['ministerial_letter'],
        'UN Agencies': ['un_credentials'],
        'RegisteredNGOs': ['registration_certificate', 'boa_approval'],
        'ApprovedFintechs': ['bog_license']
    }
    
    @staticmethod
    def verify_sender(sender):
        """Verify sender meets BoG requirements"""
        if not sender.kyc_verified:
            return False, "Sender KYC not completed"
        if sender.risk_category == 'high':
            return False, "High-risk sender"
        return True, ""
    
    @staticmethod
    def verify_recipient(recipient_country, recipient_phone):
        """Enhanced recipient verification"""
        if recipient_country != 'GH':
            return False, "Recipient must be in Ghana"
            
        # Phone number validation
        if not (recipient_phone.startswith('233') and len(recipient_phone) == 12):
            return False, "Invalid Ghanaian phone number"
            
        # Network prefix validation (MTN, Telecel, AirtelTigo)
        prefix = recipient_phone[3:6]
        valid_prefixes = ['24', '54', '55', '59', '25', '26', '27', '57', '20', '50']
        
        if prefix not in valid_prefixes:
            return False, "Invalid mobile network prefix"
            
        return True, ""
    
    @staticmethod
    def verify_source_of_funds(sender):
        """Verify sender's source of funds"""
        if sender.risk_category == 'high' and not sender.source_of_funds_verified:
            return False, "Unverified source of funds"
        return True, ""
    
    @staticmethod
    def verify_exemption_docs(sender, doc_type):
        """Check if exempt entity has required docs"""
        if sender.organization not in GhanaRemittanceCompliance.EXEMPT_ENTITIES:
            return False
            
        required_docs = GhanaRemittanceCompliance.EXEMPTION_DOCUMENTS.get(
            sender.organization, []
        )
        
        return doc_type in required_docs and \
               sender.document_attachments.filter(doc_type=doc_type).exists()
    
    @staticmethod
    def check_limits(sender, amount):
        """Check transaction against BoG limits"""
        from ..models import CrossBorderRemittance
        
        # Single transaction limit
        if amount > GhanaRemittanceCompliance.SINGLE_TXN_MAX:
            return False, f"Amount exceeds single transaction limit of {GhanaRemittanceCompliance.SINGLE_TXN_MAX} USD"
        
        # Daily limit check
        daily_total = CrossBorderRemittance.objects.filter(
            sender=sender,
            created_at__date=timezone.now().date()
        ).aggregate(Sum('amount_sent'))['amount_sent__sum'] or Decimal('0')
        
        if daily_total + amount > GhanaRemittanceCompliance.DAILY_LIMIT:
            return False, f"Would exceed daily limit of {GhanaRemittanceCompliance.DAILY_LIMIT} USD"
            
        # Monthly limit check
        monthly_total = CrossBorderRemittance.objects.filter(
            sender=sender,
            created_at__month=timezone.now().month
        ).aggregate(Sum('amount_sent'))['amount_sent__sum'] or Decimal('0')
        
        if monthly_total + amount > GhanaRemittanceCompliance.MONTHLY_LIMIT:
            return False, f"Would exceed monthly limit of {GhanaRemittanceCompliance.MONTHLY_LIMIT} USD"
            
        return True, ""
    
    @staticmethod
    def check_exemptions(sender):
        """Check if sender qualifies for exemptions"""
        if hasattr(sender, 'organization') and \
           sender.organization in GhanaRemittanceCompliance.EXEMPT_ENTITIES:
            return True
        return False
    
    @staticmethod
    def full_compliance_check(sender, recipient_data, amount):
        """Complete BoG compliance verification"""
        # Check for exempt entities first
        if GhanaRemittanceCompliance.check_exemptions(sender):
            return True, "Exempt entity"
        
        # Verify sender
        valid, msg = GhanaRemittanceCompliance.verify_sender(sender)
        if not valid:
            return False, msg
        
        # Verify recipient
        valid, msg = GhanaRemittanceCompliance.verify_recipient(
            recipient_data['country'],
            recipient_data['phone']
        )
        if not valid:
            return False, msg
        
        # Verify source of funds
        valid, msg = GhanaRemittanceCompliance.verify_source_of_funds(sender)
        if not valid:
            return False, msg
        
        # Verify limits
        valid, msg = GhanaRemittanceCompliance.check_limits(sender, amount)
        if not valid:
            return False, msg
            
        return True, "Compliant with BoG regulations"
