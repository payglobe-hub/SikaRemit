"""
Trust & Brand Recognition System
Merchant verification, trust badges, security seals, and reputation management
"""

from typing import Dict, List, Optional
from datetime import datetime, timedelta
from decimal import Decimal
from django.db.models import Avg, Count, Sum
import logging

logger = logging.getLogger(__name__)

class TrustLevel:
    """Trust level constants"""
    UNVERIFIED = 'unverified'
    BASIC = 'basic'
    VERIFIED = 'verified'
    PREMIUM = 'premium'
    ENTERPRISE = 'enterprise'

class MerchantVerification:
    """
    Merchant verification and trust scoring system
    """
    
    VERIFICATION_LEVELS = {
        TrustLevel.UNVERIFIED: {
            'name': 'Unverified',
            'requirements': [],
            'benefits': ['Basic payment processing'],
            'badge': None
        },
        TrustLevel.BASIC: {
            'name': 'Basic Verified',
            'requirements': [
                'Email verification',
                'Phone verification',
                'Business information'
            ],
            'benefits': [
                'Trust badge',
                'Higher transaction limits',
                'Customer support'
            ],
            'badge': 'basic_verified.svg'
        },
        TrustLevel.VERIFIED: {
            'name': 'Verified Merchant',
            'requirements': [
                'Identity verification (KYC)',
                'Business registration documents',
                'Bank account verification',
                'Address verification'
            ],
            'benefits': [
                'Verified badge',
                'Priority support',
                'Lower fees',
                'Advanced features'
            ],
            'badge': 'verified_merchant.svg'
        },
        TrustLevel.PREMIUM: {
            'name': 'Premium Merchant',
            'requirements': [
                'All verified requirements',
                'Financial statements',
                'Credit check',
                '6+ months good standing',
                'Minimum transaction volume'
            ],
            'benefits': [
                'Premium badge',
                'Dedicated account manager',
                'Lowest fees',
                'Custom integrations',
                'Featured in marketplace'
            ],
            'badge': 'premium_merchant.svg'
        },
        TrustLevel.ENTERPRISE: {
            'name': 'Enterprise Partner',
            'requirements': [
                'All premium requirements',
                'Enterprise agreement',
                'Security audit',
                'Compliance certification'
            ],
            'benefits': [
                'Enterprise badge',
                'White-label options',
                'API priority',
                'Custom SLA',
                'Co-marketing opportunities'
            ],
            'badge': 'enterprise_partner.svg'
        }
    }
    
    def __init__(self, merchant_id: int):
        self.merchant_id = merchant_id
    
    def get_verification_status(self) -> Dict:
        """Get current verification status"""
        from users.models import Merchant
        
        try:
            merchant = Merchant.objects.get(id=self.merchant_id)
            
            return {
                'merchant_id': self.merchant_id,
                'trust_level': merchant.verification_status,
                'verification_details': self.VERIFICATION_LEVELS.get(merchant.verification_status),
                'trust_score': self.calculate_trust_score(),
                'badges': self.get_earned_badges(),
                'next_level': self._get_next_level(merchant.verification_status)
            }
        except Merchant.DoesNotExist:
            return {
                'error': 'Merchant not found'
            }
    
    def calculate_trust_score(self) -> int:
        """
        Calculate merchant trust score (0-100)
        Based on multiple factors
        """
        from users.models import Merchant
        from payments.models import Payment
        
        try:
            merchant = Merchant.objects.get(id=self.merchant_id)
            score = 0
            
            # Verification level (40 points)
            level_scores = {
                TrustLevel.UNVERIFIED: 0,
                TrustLevel.BASIC: 10,
                TrustLevel.VERIFIED: 20,
                TrustLevel.PREMIUM: 30,
                TrustLevel.ENTERPRISE: 40
            }
            score += level_scores.get(merchant.verification_status, 0)
            
            # Account age (15 points)
            account_age_days = (datetime.now().date() - merchant.created_at.date()).days
            if account_age_days >= 365:
                score += 15
            elif account_age_days >= 180:
                score += 10
            elif account_age_days >= 90:
                score += 5
            
            # Transaction history (25 points)
            payments = Payment.objects.filter(merchant=merchant, status='completed')
            total_transactions = payments.count()
            
            if total_transactions >= 1000:
                score += 25
            elif total_transactions >= 500:
                score += 20
            elif total_transactions >= 100:
                score += 15
            elif total_transactions >= 50:
                score += 10
            elif total_transactions >= 10:
                score += 5
            
            # Success rate (10 points)
            all_payments = Payment.objects.filter(merchant=merchant)
            if all_payments.count() > 0:
                success_rate = payments.count() / all_payments.count()
                score += int(success_rate * 10)
            
            # Dispute rate (10 points - deducted for disputes)
            # In production, check actual disputes
            dispute_rate = 0  # Mock
            score += max(0, 10 - (dispute_rate * 100))
            
            return min(100, score)
            
        except Exception as e:
            logger.error(f"Error calculating trust score: {str(e)}")
            return 0
    
    def _get_next_level(self, current_level: str) -> Optional[Dict]:
        """Get information about next verification level"""
        levels = [
            TrustLevel.UNVERIFIED,
            TrustLevel.BASIC,
            TrustLevel.VERIFIED,
            TrustLevel.PREMIUM,
            TrustLevel.ENTERPRISE
        ]
        
        try:
            current_index = levels.index(current_level)
            if current_index < len(levels) - 1:
                next_level = levels[current_index + 1]
                return {
                    'level': next_level,
                    'details': self.VERIFICATION_LEVELS[next_level]
                }
        except ValueError:
            pass
        
        return None
    
    def get_earned_badges(self) -> List[Dict]:
        """Get all badges earned by merchant"""
        from users.models import Merchant
        
        badges = []
        
        try:
            merchant = Merchant.objects.get(id=self.merchant_id)
            
            # Verification badge
            level_badge = self.VERIFICATION_LEVELS.get(merchant.verification_status, {}).get('badge')
            if level_badge:
                badges.append({
                    'type': 'verification',
                    'name': self.VERIFICATION_LEVELS[merchant.verification_status]['name'],
                    'icon': level_badge,
                    'earned_at': merchant.updated_at.isoformat()
                })
            
            # Volume badges
            from payments.models import Payment
            total_volume = Payment.objects.filter(
                merchant=merchant,
                status='completed'
            ).aggregate(Sum('amount'))['amount__sum'] or 0
            
            if total_volume >= 1000000:
                badges.append({
                    'type': 'volume',
                    'name': 'Million Dollar Merchant',
                    'icon': 'million_dollar.svg',
                    'description': 'Processed over $1M in transactions'
                })
            elif total_volume >= 100000:
                badges.append({
                    'type': 'volume',
                    'name': 'High Volume Merchant',
                    'icon': 'high_volume.svg',
                    'description': 'Processed over $100K in transactions'
                })
            
            # Longevity badge
            account_age_days = (datetime.now().date() - merchant.created_at.date()).days
            if account_age_days >= 365:
                badges.append({
                    'type': 'longevity',
                    'name': 'Established Merchant',
                    'icon': 'established.svg',
                    'description': 'Active for over 1 year'
                })
            
            # Excellence badge (high trust score)
            trust_score = self.calculate_trust_score()
            if trust_score >= 90:
                badges.append({
                    'type': 'excellence',
                    'name': 'Excellence Award',
                    'icon': 'excellence.svg',
                    'description': 'Maintains excellent trust score'
                })
            
        except Exception as e:
            logger.error(f"Error getting badges: {str(e)}")
        
        return badges
    
    def submit_verification_documents(self, documents: Dict) -> Dict:
        """Submit documents for verification"""
        from .models import MerchantVerificationDocument
        
        try:
            doc = MerchantVerificationDocument.objects.create(
                merchant_id=self.merchant_id,
                document_type=documents.get('type'),
                document_data=documents,
                submitted_at=datetime.now(),
                status='pending_review'
            )
            
            return {
                'success': True,
                'document_id': doc.id,
                'status': 'pending_review',
                'estimated_review_time': '1-3 business days'
            }
        except Exception as e:
            logger.error(f"Error submitting documents: {str(e)}")
            return {
                'success': False,
                'error': str(e)
            }

class TrustBadgeGenerator:
    """Generate embeddable trust badges for merchant websites"""
    
    @staticmethod
    def generate_badge_html(merchant_id: int, badge_type: str = 'standard') -> str:
        """
        Generate HTML code for trust badge
        
        Args:
            merchant_id: Merchant ID
            badge_type: 'standard', 'compact', 'icon-only'
        
        Returns:
            HTML code for embedding
        """
        verification = MerchantVerification(merchant_id)
        status = verification.get_verification_status()
        
        trust_level = status.get('trust_level', TrustLevel.UNVERIFIED)
        trust_score = status.get('trust_score', 0)
        
        if badge_type == 'standard':
            return f'''
<div class="SikaRemit-trust-badge" data-merchant="{merchant_id}">
    <div class="badge-header">
        <img src="https://cdn.SikaRemit.com/badges/{trust_level}.svg" alt="Trust Badge" />
        <span class="badge-title">SikaRemit {trust_level.title()}</span>
    </div>
    <div class="badge-score">
        <span class="score-label">Trust Score:</span>
        <span class="score-value">{trust_score}/100</span>
    </div>
    <div class="badge-footer">
        <a href="https://SikaRemit.com/verify/{merchant_id}" target="_blank">Verify</a>
    </div>
</div>
<link rel="stylesheet" href="https://cdn.SikaRemit.com/badge.css" />
'''
        elif badge_type == 'compact':
            return f'''
<a href="https://SikaRemit.com/verify/{merchant_id}" class="SikaRemit-badge-compact">
    <img src="https://cdn.SikaRemit.com/badges/{trust_level}_compact.svg" alt="Verified by SikaRemit" />
</a>
'''
        else:  # icon-only
            return f'''
<img src="https://cdn.SikaRemit.com/badges/{trust_level}_icon.svg" 
     alt="SikaRemit Verified" 
     class="SikaRemit-badge-icon" />
'''
    
    @staticmethod
    def generate_badge_json(merchant_id: int) -> Dict:
        """Generate badge data in JSON format for custom implementations"""
        verification = MerchantVerification(merchant_id)
        status = verification.get_verification_status()
        
        return {
            'merchant_id': merchant_id,
            'trust_level': status.get('trust_level'),
            'trust_score': status.get('trust_score'),
            'badges': status.get('badges', []),
            'verification_url': f'https://SikaRemit.com/verify/{merchant_id}',
            'badge_images': {
                'standard': f"https://cdn.SikaRemit.com/badges/{status.get('trust_level')}.svg",
                'compact': f"https://cdn.SikaRemit.com/badges/{status.get('trust_level')}_compact.svg",
                'icon': f"https://cdn.SikaRemit.com/badges/{status.get('trust_level')}_icon.svg"
            }
        }

class SecuritySealManager:
    """Manage security seals and certifications"""
    
    AVAILABLE_SEALS = {
        'pci_dss': {
            'name': 'PCI DSS Compliant',
            'icon': 'pci_dss_seal.svg',
            'description': 'Payment Card Industry Data Security Standard certified',
            'verification_url': 'https://SikaRemit.com/security/pci-dss'
        },
        'gdpr': {
            'name': 'GDPR Compliant',
            'icon': 'gdpr_seal.svg',
            'description': 'General Data Protection Regulation compliant',
            'verification_url': 'https://SikaRemit.com/privacy/gdpr'
        },
        'ssl': {
            'name': 'SSL Secured',
            'icon': 'ssl_seal.svg',
            'description': '256-bit SSL encryption',
            'verification_url': 'https://SikaRemit.com/security/ssl'
        },
        'fraud_protected': {
            'name': 'Fraud Protected',
            'icon': 'fraud_protection_seal.svg',
            'description': 'Advanced fraud detection enabled',
            'verification_url': 'https://SikaRemit.com/security/fraud-protection'
        },
        'verified_business': {
            'name': 'Verified Business',
            'icon': 'verified_business_seal.svg',
            'description': 'Business identity verified',
            'verification_url': 'https://SikaRemit.com/trust/verified'
        }
    }
    
    @classmethod
    def get_merchant_seals(cls, merchant_id: int) -> List[Dict]:
        """Get all applicable security seals for merchant"""
        verification = MerchantVerification(merchant_id)
        status = verification.get_verification_status()
        
        seals = []
        
        # All merchants get SSL seal
        seals.append(cls.AVAILABLE_SEALS['ssl'])
        
        # Verified merchants get additional seals
        if status.get('trust_level') in [TrustLevel.VERIFIED, TrustLevel.PREMIUM, TrustLevel.ENTERPRISE]:
            seals.append(cls.AVAILABLE_SEALS['pci_dss'])
            seals.append(cls.AVAILABLE_SEALS['gdpr'])
            seals.append(cls.AVAILABLE_SEALS['fraud_protected'])
            seals.append(cls.AVAILABLE_SEALS['verified_business'])
        
        return seals
    
    @classmethod
    def generate_seal_widget(cls, merchant_id: int) -> str:
        """Generate HTML widget displaying all security seals"""
        seals = cls.get_merchant_seals(merchant_id)
        
        seal_html = '<div class="SikaRemit-security-seals">'
        
        for seal in seals:
            seal_html += f'''
    <div class="security-seal" title="{seal['description']}">
        <a href="{seal['verification_url']}" target="_blank">
            <img src="https://cdn.SikaRemit.com/seals/{seal['icon']}" alt="{seal['name']}" />
        </a>
    </div>
'''
        
        seal_html += '</div>'
        return seal_html

# Utility functions
def get_merchant_trust_profile(merchant_id: int) -> Dict:
    """Get complete trust profile for merchant"""
    verification = MerchantVerification(merchant_id)
    status = verification.get_verification_status()
    seals = SecuritySealManager.get_merchant_seals(merchant_id)
    
    return {
        'merchant_id': merchant_id,
        'verification_status': status,
        'security_seals': seals,
        'trust_badge_html': TrustBadgeGenerator.generate_badge_html(merchant_id),
        'badge_json': TrustBadgeGenerator.generate_badge_json(merchant_id)
    }

def verify_merchant_badge(merchant_id: int, badge_token: str) -> Dict:
    """Verify authenticity of a merchant's trust badge"""
    # In production, validate badge token
    verification = MerchantVerification(merchant_id)
    status = verification.get_verification_status()
    
    return {
        'valid': True,
        'merchant_id': merchant_id,
        'trust_level': status.get('trust_level'),
        'trust_score': status.get('trust_score'),
        'verified_at': datetime.now().isoformat()
    }
