"""
Advanced Fraud Detection System
ML-based fraud scoring, risk management, and transaction monitoring
"""

from typing import Dict, List, Optional, Tuple
from decimal import Decimal
from datetime import datetime, timedelta
from django.db.models import Count, Sum, Avg, Q
from django.core.cache import cache
from django.utils import timezone
import logging
import hashlib
import json

logger = logging.getLogger(__name__)

class FraudRiskLevel:
    """Fraud risk level constants"""
    LOW = 'low'
    MEDIUM = 'medium'
    HIGH = 'high'
    CRITICAL = 'critical'

class FraudRule:
    """Base class for fraud detection rules"""
    
    def __init__(self, name: str, weight: float, threshold: float):
        self.name = name
        self.weight = weight
        self.threshold = threshold
    
    def evaluate(self, transaction_data: Dict) -> Tuple[bool, float, str]:
        """
        Evaluate the rule against transaction data
        
        Returns:
            Tuple of (triggered, score, reason)
        """
        raise NotImplementedError

class VelocityRule(FraudRule):
    """Detect unusual transaction velocity"""
    
    def __init__(self):
        super().__init__('velocity_check', weight=0.3, threshold=5)
    
    def evaluate(self, transaction_data: Dict) -> Tuple[bool, float, str]:
        from .models import Payment
        
        customer_id = transaction_data.get('customer_id')
        amount = transaction_data.get('amount', 0)
        
        # Check transactions in last hour
        one_hour_ago = timezone.now() - timedelta(hours=1)
        recent_transactions = Payment.objects.filter(
            customer_id=customer_id,
            created_at__gte=one_hour_ago
        ).count()
        
        if recent_transactions >= self.threshold:
            score = min(1.0, recent_transactions / (self.threshold * 2))
            return (
                True,
                score * self.weight,
                f"High velocity: {recent_transactions} transactions in 1 hour"
            )
        
        return (False, 0.0, "")

class AmountAnomalyRule(FraudRule):
    """Detect unusual transaction amounts"""
    
    def __init__(self):
        super().__init__('amount_anomaly', weight=0.25, threshold=3.0)
    
    def evaluate(self, transaction_data: Dict) -> Tuple[bool, float, str]:
        from .models import Payment
        
        customer_id = transaction_data.get('customer_id')
        amount = Decimal(str(transaction_data.get('amount', 0)))
        
        # Get customer's average transaction amount
        thirty_days_ago = timezone.now() - timedelta(days=30)
        avg_amount = Payment.objects.filter(
            customer_id=customer_id,
            created_at__gte=thirty_days_ago,
            status='completed'
        ).aggregate(Avg('amount'))['amount__avg']
        
        if avg_amount and amount > (avg_amount * self.threshold):
            score = min(1.0, float(amount / (avg_amount * self.threshold)))
            return (
                True,
                score * self.weight,
                f"Amount ${amount} is {score:.1f}x higher than average ${avg_amount}"
            )
        
        return (False, 0.0, "")

class GeolocationRule(FraudRule):
    """Detect suspicious location changes using IP geolocation"""
    
    def __init__(self):
        super().__init__('geolocation_check', weight=0.2, threshold=1000)  # km
    
    @staticmethod
    def _get_coordinates_from_ip(ip_address: str) -> Optional[Tuple[float, float]]:
        """Resolve IP address to (latitude, longitude) using GeoIP2"""
        try:
            from django.contrib.gis.geoip2 import GeoIP2
            g = GeoIP2()
            result = g.lat_lon(ip_address)
            if result and result[0] and result[1]:
                return (float(result[0]), float(result[1]))
        except Exception:
            pass
        return None

    @staticmethod
    def _haversine_distance(coord1: Tuple[float, float], coord2: Tuple[float, float]) -> float:
        """Calculate distance in km between two (lat, lon) coordinates"""
        import math
        lat1, lon1 = math.radians(coord1[0]), math.radians(coord1[1])
        lat2, lon2 = math.radians(coord2[0]), math.radians(coord2[1])
        dlat = lat2 - lat1
        dlon = lon2 - lon1
        a = math.sin(dlat / 2) ** 2 + math.cos(lat1) * math.cos(lat2) * math.sin(dlon / 2) ** 2
        return 6371 * 2 * math.asin(math.sqrt(a))

    def evaluate(self, transaction_data: Dict) -> Tuple[bool, float, str]:
        customer_id = transaction_data.get('customer_id')
        current_ip = transaction_data.get('ip_address')
        
        cache_key = f"last_location:{customer_id}"
        last_coords = cache.get(cache_key)
        
        current_coords = None
        if current_ip:
            current_coords = self._get_coordinates_from_ip(current_ip)
        
        if last_coords and current_coords:
            distance = self._haversine_distance(last_coords, current_coords)
            
            if distance > self.threshold:
                score = min(1.0, distance / (self.threshold * 2))
                return (
                    True,
                    score * self.weight,
                    f"Location changed by {distance:.0f}km in short time"
                )
        
        if current_coords:
            cache.set(cache_key, current_coords, 3600)
        
        return (False, 0.0, "")

class DeviceFingerprintRule(FraudRule):
    """Detect suspicious device changes"""
    
    def __init__(self):
        super().__init__('device_fingerprint', weight=0.15, threshold=0.5)
    
    def evaluate(self, transaction_data: Dict) -> Tuple[bool, float, str]:
        customer_id = transaction_data.get('customer_id')
        device_fingerprint = transaction_data.get('device_fingerprint')
        
        if not device_fingerprint:
            return (False, 0.0, "")
        
        # Check if device is known
        cache_key = f"known_devices:{customer_id}"
        known_devices = cache.get(cache_key, set())
        
        if device_fingerprint not in known_devices:
            # New device
            if len(known_devices) > 0:
                return (
                    True,
                    self.weight,
                    "Transaction from new/unknown device"
                )
            
            # Add to known devices
            known_devices.add(device_fingerprint)
            cache.set(cache_key, known_devices, 86400 * 30)  # 30 days
        
        return (False, 0.0, "")

class BINCheckRule(FraudRule):
    """Check card BIN against fraud databases"""
    
    def __init__(self):
        super().__init__('bin_check', weight=0.2, threshold=0.7)
    
    def evaluate(self, transaction_data: Dict) -> Tuple[bool, float, str]:
        card_bin = transaction_data.get('card_bin')
        
        if not card_bin:
            return (False, 0.0, "")
        
        # Check against known fraud BINs (would use external service)
        # For now, check against local blacklist
        blacklisted_bins = self._get_blacklisted_bins()
        
        if card_bin in blacklisted_bins:
            return (
                True,
                self.weight,
                f"Card BIN {card_bin} is blacklisted"
            )
        
        return (False, 0.0, "")
    
    def _get_blacklisted_bins(self) -> set:
        """Get blacklisted BINs from cache/database"""
        cache_key = "blacklisted_bins"
        bins = cache.get(cache_key)
        
        if bins is None:
            # Load from database
            from .models import BlacklistedBIN
            bins = set(BlacklistedBIN.objects.values_list('bin', flat=True))
            cache.set(cache_key, bins, 3600)
        
        return bins

class EmailDomainRule(FraudRule):
    """Check email domain reputation"""
    
    def __init__(self):
        super().__init__('email_domain', weight=0.1, threshold=0.5)
    
    def evaluate(self, transaction_data: Dict) -> Tuple[bool, float, str]:
        email = transaction_data.get('email', '')
        
        if not email or '@' not in email:
            return (False, 0.0, "")
        
        domain = email.split('@')[1].lower()
        
        # Check against disposable email domains
        disposable_domains = self._get_disposable_domains()
        
        if domain in disposable_domains:
            return (
                True,
                self.weight,
                f"Disposable email domain: {domain}"
            )
        
        return (False, 0.0, "")
    
    def _get_disposable_domains(self) -> set:
        """Get list of disposable email domains"""
        # Common disposable email domains
        return {
            'tempmail.com', 'guerrillamail.com', '10minutemail.com',
            'mailinator.com', 'throwaway.email', 'temp-mail.org'
        }

class FraudDetectionEngine:
    """Main fraud detection engine"""
    
    def __init__(self):
        self.rules = [
            VelocityRule(),
            AmountAnomalyRule(),
            GeolocationRule(),
            DeviceFingerprintRule(),
            BINCheckRule(),
            EmailDomainRule(),
        ]
    
    def analyze_transaction(self, transaction_data: Dict) -> Dict:
        """
        Analyze transaction for fraud
        
        Returns:
            {
                'risk_score': float (0-1),
                'risk_level': str,
                'triggered_rules': List[Dict],
                'recommendation': str,
                'requires_review': bool
            }
        """
        triggered_rules = []
        total_score = 0.0
        
        # Evaluate all rules
        for rule in self.rules:
            try:
                triggered, score, reason = rule.evaluate(transaction_data)
                
                if triggered:
                    triggered_rules.append({
                        'rule': rule.name,
                        'score': score,
                        'reason': reason
                    })
                    total_score += score
            except Exception as e:
                logger.error(f"Error evaluating rule {rule.name}: {str(e)}")
        
        # Normalize score to 0-1 range
        risk_score = min(1.0, total_score)
        
        # Determine risk level
        risk_level = self._calculate_risk_level(risk_score)
        
        # Generate recommendation
        recommendation = self._generate_recommendation(risk_level, triggered_rules)
        
        # Determine if manual review is needed
        requires_review = risk_level in [FraudRiskLevel.HIGH, FraudRiskLevel.CRITICAL]
        
        result = {
            'risk_score': round(risk_score, 3),
            'risk_level': risk_level,
            'triggered_rules': triggered_rules,
            'recommendation': recommendation,
            'requires_review': requires_review,
            'analyzed_at': datetime.now().isoformat()
        }
        
        # Log high-risk transactions
        if risk_level in [FraudRiskLevel.HIGH, FraudRiskLevel.CRITICAL]:
            self._log_high_risk_transaction(transaction_data, result)
        
        return result
    
    def _calculate_risk_level(self, risk_score: float) -> str:
        """Calculate risk level from score"""
        if risk_score >= 0.8:
            return FraudRiskLevel.CRITICAL
        elif risk_score >= 0.6:
            return FraudRiskLevel.HIGH
        elif risk_score >= 0.3:
            return FraudRiskLevel.MEDIUM
        else:
            return FraudRiskLevel.LOW
    
    def _generate_recommendation(self, risk_level: str, triggered_rules: List[Dict]) -> str:
        """Generate action recommendation"""
        if risk_level == FraudRiskLevel.CRITICAL:
            return "BLOCK: Transaction should be blocked immediately"
        elif risk_level == FraudRiskLevel.HIGH:
            return "REVIEW: Transaction requires manual review before processing"
        elif risk_level == FraudRiskLevel.MEDIUM:
            return "MONITOR: Process with additional verification (3DS, email confirmation)"
        else:
            return "APPROVE: Transaction appears legitimate"
    
    def _log_high_risk_transaction(self, transaction_data: Dict, analysis_result: Dict):
        """Log high-risk transactions for review"""
        from .models import FraudAlert
        
        try:
            FraudAlert.objects.create(
                customer_id=transaction_data.get('customer_id'),
                transaction_id=transaction_data.get('transaction_id'),
                risk_score=analysis_result['risk_score'],
                risk_level=analysis_result['risk_level'],
                triggered_rules=analysis_result['triggered_rules'],
                transaction_data=transaction_data,
                status='pending_review'
            )
        except Exception as e:
            logger.error(f"Error logging fraud alert: {str(e)}")

class FraudPreventionService:
    """Service for fraud prevention and monitoring"""
    
    def __init__(self):
        self.engine = FraudDetectionEngine()
    
    def check_transaction(self, payment_data: Dict) -> Dict:
        """Check transaction before processing"""
        analysis = self.engine.analyze_transaction(payment_data)
        
        # Store analysis result
        self._store_analysis(payment_data.get('transaction_id'), analysis)
        
        return analysis
    
    def _store_analysis(self, transaction_id: str, analysis: Dict):
        """Store fraud analysis result"""
        cache_key = f"fraud_analysis:{transaction_id}"
        cache.set(cache_key, analysis, 86400)  # 24 hours
    
    def get_analysis(self, transaction_id: str) -> Optional[Dict]:
        """Get stored fraud analysis"""
        cache_key = f"fraud_analysis:{transaction_id}"
        return cache.get(cache_key)
    
    def report_fraud(self, transaction_id: str, reason: str, reporter_id: int):
        """Report a transaction as fraudulent"""
        from .models import FraudReport
        
        FraudReport.objects.create(
            transaction_id=transaction_id,
            reason=reason,
            reported_by_id=reporter_id,
            reported_at=timezone.now()
        )
        
        # Update fraud patterns
        self._update_fraud_patterns(transaction_id)
    
    def _update_fraud_patterns(self, transaction_id: str):
        """Update fraud detection patterns based on reported fraud"""
        # This would use ML to update fraud detection models
        logger.info(f"Updating fraud patterns based on transaction {transaction_id}")
    
    def get_merchant_fraud_stats(self, merchant_id: int) -> Dict:
        """Get fraud statistics for a merchant"""
        from .models import Payment, FraudAlert
        
        thirty_days_ago = timezone.now() - timedelta(days=30)
        
        total_transactions = Payment.objects.filter(
            merchant_id=merchant_id,
            created_at__gte=thirty_days_ago
        ).count()
        
        fraud_alerts = FraudAlert.objects.filter(
            payment__merchant_id=merchant_id,
            created_at__gte=thirty_days_ago
        ).count()
        
        fraud_rate = (fraud_alerts / total_transactions * 100) if total_transactions > 0 else 0
        
        return {
            'total_transactions': total_transactions,
            'fraud_alerts': fraud_alerts,
            'fraud_rate': round(fraud_rate, 2),
            'period_days': 30
        }
    
    def blacklist_entity(
        self,
        entity_type: str,
        entity_value: str,
        reason: str,
        added_by_id: int
    ):
        """Add entity to blacklist"""
        from .models import FraudBlacklist
        
        FraudBlacklist.objects.create(
            entity_type=entity_type,
            entity_value=entity_value,
            reason=reason,
            added_by_id=added_by_id
        )
        
        # Clear relevant caches
        if entity_type == 'bin':
            cache.delete('blacklisted_bins')
    
    def is_blacklisted(self, entity_type: str, entity_value: str) -> bool:
        """Check if entity is blacklisted"""
        from .models import FraudBlacklist
        
        return FraudBlacklist.objects.filter(
            entity_type=entity_type,
            entity_value=entity_value,
            is_active=True
        ).exists()

# Utility functions
def generate_device_finger -> str:
    """Generate device fingerprint from request"""
    components = [
        request.META.get('HTTP_USER_AGENT', ''),
        request.META.get('HTTP_ACCEPT_LANGUAGE', ''),
        request.META.get('HTTP_ACCEPT_ENCODING', ''),
    ]
    
    fingerprint_string = '|'.join(components)
    return hashlib.sha256(fingerprint_string.encode()).hexdigest()

def get_client_ip(request) -> str:
    """Get client IP address from request"""
    x_forwarded_for = request.META.get('HTTP_X_FORWARDED_FOR')
    if x_forwarded_for:
        ip = x_forwarded_for.split(',')[0]
    else:
        ip = request.META.get('REMOTE_ADDR')
    return ip
