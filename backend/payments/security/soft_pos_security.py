"""
Soft POS Security and Compliance System
Provides comprehensive security monitoring, compliance checks, and fraud detection
"""

from typing import Dict, List, Optional, Any, Tuple
from datetime import datetime, timedelta
from django.utils import timezone
from django.db.models import Q, Count, Avg, Sum, Max, Min
from django.conf import settings
import logging
import json
import hashlib
import hmac
import uuid
from dataclasses import dataclass
from enum import Enum

from ..models import POSDevice, POSTransaction, SmartphonePOSDevice, NFCPayment, MobileMoneyPayment

logger = logging.getLogger(__name__)


class SecurityEventType(Enum):
    """Security event types for monitoring"""
    AUTHENTICATION_SUCCESS = 'authentication_success'
    AUTHENTICATION_FAILURE = 'authentication_failure'
    PIN_ATTEMPT = 'pin_attempt'
    BIOMETRIC_ATTEMPT = 'biometric_attempt'
    DEVICE_JAILBREAK = 'device_jailbreak'
    USB_CONNECTED = 'usb_connected'
    SCREENSHOT_ATTEMPT = 'screenshot_attempt'
    UNUSUAL_LOCATION = 'unusual_location'
    BATTERY_CRITICAL = 'battery_critical'
    NETWORK_CHANGE = 'network_change'
    APP_BACKGROUNDED = 'app_backgrounded'
    SECURITY_POLICY_VIOLATION = 'security_policy_violation'
    SUSPICIOUS_TRANSACTION = 'suspicious_transaction'
    MULTIPLE_FAILED_ATTEMPTS = 'multiple_failed_attempts'
    OFFLINE_TRANSACTION = 'offline_transaction'
    DEVICE_OFFLINE = 'device_offline'
    UNAUTHORIZED_ACCESS = 'unauthorized_access'


class ComplianceLevel(Enum):
    """PCI DSS compliance levels"""
    LEVEL_1 = 'level_1'  # >6M transactions/year
    LEVEL_2 = 'level_2'  # 1M-6M transactions/year
    LEVEL_3 = 'level_3'  # 20K-1M transactions/year
    LEVEL_4 = 'level_4'  # <20K transactions/year


class RiskLevel(Enum):
    """Risk assessment levels"""
    LOW = 'low'
    MEDIUM = 'medium'
    HIGH = 'high'
    CRITICAL = 'critical'


@dataclass
class SecurityEvent:
    """Security event data structure"""
    event_type: SecurityEventType
    device_id: str
    timestamp: datetime
    details: Dict[str, Any]
    risk_level: RiskLevel
    user_action: Optional[str] = None
    ip_address: Optional[str] = None
    resolved: bool = False


@dataclass
class ComplianceReport:
    """PCI DSS compliance report data"""
    merchant_id: int
    report_date: datetime
    compliance_level: ComplianceLevel
    requirements_met: List[str]
    requirements_failed: List[str]
    security_score: float
    recommendations: List[str]
    audit_trail: List[Dict[str, Any]]


class SoftPOSSecurityManager:
    """Comprehensive security management for Soft POS"""
    
    def __init__(self):
        self.security_rules = self._load_security_rules()
        self.compliance_requirements = self._load_compliance_requirements()
        self.fraud_detection_rules = self._load_fraud_rules()
    
    def _load_security_rules(self) -> Dict[str, Any]:
        """Load security configuration rules"""
        return {
            'max_failed_attempts': 3,
            'session_timeout_minutes': 30,
            'location_change_threshold_km': 50,
            'offline_transaction_limit': 1000.00,
            'suspicious_amount_threshold': 5000.00,
            'rapid_transaction_limit': 10,  # transactions per minute
            'device_offline_threshold_minutes': 15,
            'security_event_retention_days': 365,
            'encryption_required': True,
            'biometric_required_for_large_amounts': 1000.00,
            'pin_complexity_required': True,
        }
    
    def _load_compliance_requirements(self) -> Dict[str, List[str]]:
        """Load PCI DSS compliance requirements"""
        return {
            'level_4': [
                'maintain_secure_network',
                'protect_cardholder_data',
                'maintain_vulnerability_program',
                'implement_strong_access_control',
                'regularly_monitor_networks',
                'maintain_policy',
            ],
            'additional_requirements': [
                'end_to_end_encryption',
                'secure_key_management',
                'audit_logging',
                'fraud_detection',
                'incident_response',
            ]
        }
    
    def _load_fraud_rules(self) -> Dict[str, Any]:
        """Load fraud detection rules"""
        return {
            'velocity_checking': {
                'max_transactions_per_hour': 50,
                'max_amount_per_hour': 10000.00,
                'max_same_card_per_day': 5,
            },
            'behavioral_analysis': {
                'unusual_time_patterns': True,
                'location_anomalies': True,
                'device_anomalies': True,
                'transaction_anomalies': True,
            },
            'blacklist_checking': {
                'blacklisted_cards': True,
                'blacklisted_devices': True,
                'blacklisted_locations': True,
            }
        }
    
    def log_security_event(
        self,
        event_type: SecurityEventType,
        device_id: str,
        details: Dict[str, Any],
        user_action: Optional[str] = None,
        ip_address: Optional[str] = None
    ) -> SecurityEvent:
        """Log and analyze security event"""
        
        # Create security event
        event = SecurityEvent(
            event_type=event_type,
            device_id=device_id,
            timestamp=timezone.now(),
            details=details,
            risk_level=self._assess_event_risk(event_type, details),
            user_action=user_action,
            ip_address=ip_address
        )
        
        # Store in device security events
        try:
            device = SmartphonePOSDevice.objects.get(device_id_hash=device_id)
            device.add_security_event(event_type.value, details)
            
            # Check for security policy violations
            self._check_security_violations(event)
            
            # Trigger alerts if needed
            if event.risk_level in [RiskLevel.HIGH, RiskLevel.CRITICAL]:
                self._trigger_security_alert(event)
            
            logger.warning(f"Security event logged: {event_type.value} for device {device_id}")
            
        except SmartphonePOSDevice.DoesNotExist:
            logger.error(f"Device not found for security event: {device_id}")
        
        return event
    
    def _assess_event_risk(self, event_type: SecurityEventType, details: Dict[str, Any]) -> RiskLevel:
        """Assess risk level of security event"""
        
        # High-risk events
        if event_type in [
            SecurityEventType.DEVICE_JAILBREAK,
            SecurityEventType.UNAUTHORIZED_ACCESS,
            SecurityEventType.SUSPICIOUS_TRANSACTION,
        ]:
            return RiskLevel.CRITICAL
        
        # Medium-risk events
        if event_type in [
            SecurityEventType.AUTHENTICATION_FAILURE,
            SecurityEventType.MULTIPLE_FAILED_ATTEMPTS,
            SecurityEventType.UNUSUAL_LOCATION,
            SecurityEventType.USB_CONNECTED,
        ]:
            # Check if multiple failures
            if details.get('consecutive_failures', 0) > self.security_rules['max_failed_attempts']:
                return RiskLevel.HIGH
            return RiskLevel.MEDIUM
        
        # Low-risk events
        return RiskLevel.LOW
    
    def _check_security_violations(self, event: SecurityEvent):
        """Check for security policy violations"""
        
        violations = []
        
        # Check consecutive failed attempts
        if event.event_type == SecurityEventType.AUTHENTICATION_FAILURE:
            consecutive_failures = event.details.get('consecutive_failures', 0)
            if consecutive_failures >= self.security_rules['max_failed_attempts']:
                violations.append({
                    'type': 'max_failed_attempts_exceeded',
                    'severity': 'high',
                    'description': f'Maximum failed attempts ({consecutive_failures}) exceeded'
                })
        
        # Check unusual location
        if event.event_type == SecurityEventType.UNUSUAL_LOCATION:
            distance_km = event.details.get('distance_km', 0)
            if distance_km > self.security_rules['location_change_threshold_km']:
                violations.append({
                    'type': 'unusual_location_change',
                    'severity': 'medium',
                    'description': f'Device location changed by {distance_km}km'
                })
        
        # Check device offline
        if event.event_type == SecurityEventType.DEVICE_OFFLINE:
            offline_minutes = event.details.get('offline_minutes', 0)
            if offline_minutes > self.security_rules['device_offline_threshold_minutes']:
                violations.append({
                    'type': 'device_offline_too_long',
                    'severity': 'medium',
                    'description': f'Device offline for {offline_minutes} minutes'
                })
        
        # Log violations
        for violation in violations:
            self._log_security_violation(event.device_id, violation)
    
    def _log_security_violation(self, device_id: str, violation: Dict[str, Any]):
        """Log security policy violation"""
        
        violation_data = {
            'violation_type': violation['type'],
            'severity': violation['severity'],
            'description': violation['description'],
            'timestamp': timezone.now().isoformat(),
            'device_id': device_id
        }
        
        logger.error(f"Security violation: {violation_data}")
        
        # In production, send to security monitoring system
        # self._send_to_security_monitoring(violation_data)
    
    def _trigger_security_alert(self, event: SecurityEvent):
        """Trigger security alert for high-risk events"""
        
        alert_data = {
            'alert_type': 'security_event',
            'risk_level': event.risk_level.value,
            'event_type': event.event_type.value,
            'device_id': event.device_id,
            'timestamp': event.timestamp.isoformat(),
            'details': event.details,
            'requires_immediate_action': event.risk_level == RiskLevel.CRITICAL
        }
        
        logger.critical(f"Security alert triggered: {alert_data}")
        
        # In production, send alerts via email, SMS, or monitoring system
        # self._send_security_alert(alert_data)
    
    def analyze_transaction_risk(self, transaction: POSTransaction) -> Tuple[RiskLevel, List[str]]:
        """Analyze transaction for fraud risk"""
        
        risk_factors = []
        risk_level = RiskLevel.LOW
        
        # Amount analysis
        if transaction.amount > self.fraud_detection_rules['velocity_checking']['max_amount_per_hour']:
            risk_factors.append("High transaction amount")
            risk_level = RiskLevel.HIGH
        
        # Time pattern analysis
        transaction_hour = transaction.created_at.hour
        if transaction_hour < 6 or transaction_hour > 22:  # Unusual hours
            risk_factors.append("Unusual transaction time")
            risk_level = max(risk_level, RiskLevel.MEDIUM)
        
        # Device behavior analysis
        if hasattr(transaction, 'device') and transaction.device:
            device_risk = self._analyze_device_risk(transaction.device, transaction)
            risk_factors.extend(device_risk['factors'])
            risk_level = max(risk_level, device_risk['level'])
        
        # Payment method analysis
        if transaction.payment_method in ['nfc_credit', 'nfc_debit']:
            # Check for rapid NFC transactions
            recent_nfc = POSTransaction.objects.filter(
                device=transaction.device,
                payment_method__in=['nfc_credit', 'nfc_debit'],
                created_at__gte=transaction.created_at - timedelta(minutes=5)
            ).count()
            
            if recent_nfc > 5:
                risk_factors.append("Rapid NFC transactions")
                risk_level = max(risk_level, RiskLevel.MEDIUM)
        
        # Mobile money analysis
        if 'money' in transaction.payment_method:
            # Check for multiple mobile money transactions to same number
            recent_same_number = POSTransaction.objects.filter(
                mobile_number=transaction.mobile_number,
                payment_method=transaction.payment_method,
                created_at__gte=transaction.created_at - timedelta(hours=1)
            ).count()
            
            if recent_same_number > 3:
                risk_factors.append("Multiple transactions to same number")
                risk_level = max(risk_level, RiskLevel.MEDIUM)
        
        return risk_level, risk_factors
    
    def _analyze_device_risk(self, device: POSDevice, transaction: POSTransaction) -> Dict[str, Any]:
        """Analyze device-specific risk factors"""
        
        risk_factors = []
        risk_level = RiskLevel.LOW
        
        # Check device security events
        if hasattr(device, 'smartphone_config'):
            security_events = device.smartphone_config.security_events
            
            # Recent security issues
            recent_events = [
                event for event in security_events
                if datetime.fromisoformat(event['timestamp'].replace('Z', '+00:00')) > 
                timezone.now() - timedelta(hours=24)
            ]
            
            high_risk_events = [
                event for event in recent_events
                if event['type'] in [
                    'device_jailbreak',
                    'unauthorized_access',
                    'security_policy_violation'
                ]
            ]
            
            if high_risk_events:
                risk_factors.append("Recent high-risk security events")
                risk_level = RiskLevel.HIGH
        
        # Check device location
        if hasattr(device, 'smartphone_config') and device.smartphone_config.last_location_lat:
            # Analyze location patterns (simplified)
            if device.smartphone_config.location_timestamp:
                time_since_location = timezone.now() - device.smartphone_config.location_timestamp
                if time_since_location > timedelta(days=1):
                    risk_factors.append("Stale location data")
                    risk_level = max(risk_level, RiskLevel.MEDIUM)
        
        return {
            'level': risk_level,
            'factors': risk_factors
        }
    
    def generate_compliance_report(self, merchant_id: int) -> ComplianceReport:
        """Generate PCI DSS compliance report"""
        
        # Get merchant data
        start_date = timezone.now() - timedelta(days=365)
        end_date = timezone.now()
        
        transactions = POSTransaction.objects.filter(
            merchant_id=merchant_id,
            created_at__gte=start_date,
            created_at__lte=end_date
        )
        
        # Determine compliance level
        annual_volume = transactions.aggregate(
            total=Sum('amount')
        )['total'] or 0
        
        transaction_count = transactions.count()
        
        if transaction_count > 6000000:
            compliance_level = ComplianceLevel.LEVEL_1
        elif transaction_count > 1000000:
            compliance_level = ComplianceLevel.LEVEL_2
        elif transaction_count > 20000:
            compliance_level = ComplianceLevel.LEVEL_3
        else:
            compliance_level = ComplianceLevel.LEVEL_4
        
        # Check requirements
        requirements_met = []
        requirements_failed = []
        
        # Requirement 1: Maintain secure network
        if self._check_secure_network_compliance(merchant_id):
            requirements_met.append('maintain_secure_network')
        else:
            requirements_failed.append('maintain_secure_network')
        
        # Requirement 2: Protect cardholder data
        if self._check_data_protection_compliance(merchant_id):
            requirements_met.append('protect_cardholder_data')
        else:
            requirements_failed.append('protect_cardholder_data')
        
        # Requirement 3: Maintain vulnerability program
        if self._check_vulnerability_compliance(merchant_id):
            requirements_met.append('maintain_vulnerability_program')
        else:
            requirements_failed.append('maintain_vulnerability_program')
        
        # Requirement 4: Implement strong access control
        if self._check_access_control_compliance(merchant_id):
            requirements_met.append('implement_strong_access_control')
        else:
            requirements_failed.append('implement_strong_access_control')
        
        # Requirement 5: Regularly monitor networks
        if self._check_monitoring_compliance(merchant_id):
            requirements_met.append('regularly_monitor_networks')
        else:
            requirements_failed.append('regularly_monitor_networks')
        
        # Requirement 6: Maintain policy
        if self._check_policy_compliance(merchant_id):
            requirements_met.append('maintain_policy')
        else:
            requirements_failed.append('maintain_policy')
        
        # Calculate security score
        total_requirements = len(requirements_met) + len(requirements_failed)
        security_score = (len(requirements_met) / total_requirements) * 100 if total_requirements > 0 else 0
        
        # Generate recommendations
        recommendations = self._generate_compliance_recommendations(
            requirements_failed,
            security_score,
            compliance_level
        )
        
        # Create audit trail
        audit_trail = self._generate_audit_trail(merchant_id, start_date, end_date)
        
        return ComplianceReport(
            merchant_id=merchant_id,
            report_date=timezone.now(),
            compliance_level=compliance_level,
            requirements_met=requirements_met_met,
            requirements_failed=requirements_failed,
            security_score=security_score,
            recommendations=recommendations,
            audit_trail=audit_trail
        )
    
    def _check_secure_network_compliance(self, merchant_id: int) -> bool:
        """Check network security compliance"""
        # Check if all devices use encrypted connections
        devices = POSDevice.objects.filter(merchant_id=merchant_id)
        
        for device in devices:
            if not device.encryption_enabled:
                return False
        
        return True
    
    def _check_data_protection_compliance(self, merchant_id: int) -> bool:
        """Check data protection compliance"""
        # Check if sensitive data is encrypted
        transactions = POSTransaction.objects.filter(merchant_id=merchant_id)
        
        for transaction in transactions[:100]:  # Sample check
            if transaction.card_last4 and len(transaction.card_last4) != 4:
                return False  # Should only store last 4 digits
        
        return True
    
    def _check_vulnerability_compliance(self, merchant_id: int) -> bool:
        """Check vulnerability management compliance"""
        # Check for recent security updates
        devices = SmartphonePOSDevice.objects.filter(
            pos_device__merchant_id=merchant_id
        )
        
        for device in devices:
            # Check if app version is recent (simplified)
            if device.app_version < '1.0.0':  # Should check against minimum version
                return False
        
        return True
    
    def _check_access_control_compliance(self, merchant_id: int) -> bool:
        """Check access control compliance"""
        # Check if devices require authentication
        devices = SmartphonePOSDevice.objects.filter(
            pos_device__merchant_id=merchant_id
        )
        
        for device in devices:
            if not device.pin_required:
                return False
        
        return True
    
    def _check_monitoring_compliance(self, merchant_id: int) -> bool:
        """Check monitoring compliance"""
        # Check if security events are being logged
        devices = SmartphonePOSDevice.objects.filter(
            pos_device__merchant_id=merchant_id
        )
        
        for device in devices:
            if not device.security_events:
                return False  # Should have some security events
        
        return True
    
    def _check_policy_compliance(self, merchant_id: int) -> bool:
        """Check policy compliance"""
        # Check if devices have security policies configured
        devices = POSDevice.objects.filter(merchant_id=merchant_id)
        
        for device in devices:
            if device.security_level == 'basic':
                return False  # Should be at least standard
        
        return True
    
    def _generate_compliance_recommendations(
        self,
        failed_requirements: List[str],
        security_score: float,
        compliance_level: ComplianceLevel
    ) -> List[str]:
        """Generate compliance recommendations"""
        
        recommendations = []
        
        if security_score < 80:
            recommendations.append("Improve overall security posture to achieve higher compliance score")
        
        if 'maintain_secure_network' in failed_requirements:
            recommendations.append("Enable encryption for all device connections")
        
        if 'protect_cardholder_data' in failed_requirements:
            recommendations.append("Implement stronger data protection measures")
        
        if 'maintain_vulnerability_program' in failed_requirements:
            recommendations.append("Update all devices to latest security patches")
        
        if 'implement_strong_access_control' in failed_requirements:
            recommendations.append("Enforce multi-factor authentication for all devices")
        
        if 'regularly_monitor_networks' in failed_requirements:
            recommendations.append("Implement comprehensive security monitoring")
        
        if 'maintain_policy' in failed_requirements:
            recommendations.append("Review and update security policies")
        
        # Level-specific recommendations
        if compliance_level in [ComplianceLevel.LEVEL_1, ComplianceLevel.LEVEL_2]:
            recommendations.append("Consider quarterly security audits")
            recommendations.append("Implement advanced fraud detection systems")
        
        return recommendations
    
    def _generate_audit_trail(
        self,
        merchant_id: int,
        start_date: datetime,
        end_date: datetime
    ) -> List[Dict[str, Any]]:
        """Generate audit trail for compliance reporting"""
        
        audit_trail = []
        
        # Transaction audit
        transactions = POSTransaction.objects.filter(
            merchant_id=merchant_id,
            created_at__gte=start_date,
            created_at__lte=end_date
        )
        
        audit_trail.append({
            'category': 'transactions',
            'total_count': transactions.count(),
            'total_amount': float(transactions.aggregate(Sum('amount'))['total'] or 0),
            'success_rate': (
                transactions.filter(status='completed').count() / 
                max(transactions.count(), 1)
            ) * 100,
            'period': f"{start_date.date()} to {end_date.date()}"
        })
        
        # Security events audit
        devices = SmartphonePOSDevice.objects.filter(
            pos_device__merchant_id=merchant_id
        )
        
        total_security_events = 0
        high_risk_events = 0
        
        for device in devices:
            events = device.security_events
            total_security_events += len(events)
            
            event_start = start_date.isoformat()
            event_end = end_date.isoformat()
            
            period_events = [
                event for event in events
                if event_start <= event['timestamp'] <= event_end
            ]
            
            high_risk_events += len([
                event for event in period_events
                if event['type'] in [
                    'device_jailbreak',
                    'unauthorized_access',
                    'security_policy_violation'
                ]
            ])
        
        audit_trail.append({
            'category': 'security_events',
            'total_events': total_security_events,
            'high_risk_events': high_risk_events,
            'period': f"{start_date.date()} to {end_date.date()}"
        })
        
        # Device compliance audit
        compliant_devices = 0
        total_devices = devices.count()
        
        for device in devices:
            if (device.pin_required and 
                device.pos_device.encryption_enabled and
                device.pos_device.security_level in ['standard', 'enhanced', 'pci_compliant']):
                compliant_devices += 1
        
        audit_trail.append({
            'category': 'device_compliance',
            'total_devices': total_devices,
            'compliant_devices': compliant_devices,
            'compliance_rate': (compliant_devices / max(total_devices, 1)) * 100,
            'period': f"{start_date.date()} to {end_date.date()}"
        })
        
        return audit_trail
    
    def get_security_dashboard(self, merchant_id: int) -> Dict[str, Any]:
        """Get security dashboard data"""
        
        # Get recent security events
        devices = SmartphonePOSDevice.objects.filter(
            pos_device__merchant_id=merchant_id
        )
        
        recent_events = []
        total_events = 0
        high_risk_events = 0
        
        for device in devices:
            events = device.security_events
            total_events += len(events)
            
            # Get last 7 days of events
            week_ago = timezone.now() - timedelta(days=7)
            
            for event in events:
                event_time = datetime.fromisoformat(event['timestamp'].replace('Z', '+00:00'))
                if event_time >= week_ago:
                    recent_events.append({
                        'device_id': device.device_id_hash,
                        'event_type': event['type'],
                        'timestamp': event['timestamp'],
                        'details': event['details']
                    })
                    
                    if event['type'] in [
                        'device_jailbreak',
                        'unauthorized_access',
                        'security_policy_violation'
                    ]:
                        high_risk_events += 1
        
        # Sort recent events by timestamp
        recent_events.sort(key=lambda x: x['timestamp'], reverse=True)
        
        # Get risk assessment
        risk_assessment = self._get_merchant_risk_assessment(merchant_id)
        
        # Get compliance status
        compliance_report = self.generate_compliance_report(merchant_id)
        
        return {
            'security_overview': {
                'total_events': total_events,
                'recent_events': len(recent_events),
                'high_risk_events': high_risk_events,
                'risk_level': risk_assessment['level'].value,
                'security_score': compliance_report.security_score
            },
            'recent_events': recent_events[:20],  # Last 20 events
            'risk_assessment': risk_assessment,
            'compliance_status': {
                'level': compliance_report.compliance_level.value,
                'requirements_met': len(compliance_report.requirements_met),
                'requirements_failed': len(compliance_report.requirements_failed),
                'score': compliance_report.security_score
            },
            'device_security': {
                'total_devices': devices.count(),
                'compliant_devices': sum(1 for device in devices if self._is_device_compliant(device)),
                'devices_with_issues': sum(1 for device in devices if not self._is_device_compliant(device))
            }
        }
    
    def _get_merchant_risk_assessment(self, merchant_id: int) -> Dict[str, Any]:
        """Get overall risk assessment for merchant"""
        
        risk_factors = []
        risk_level = RiskLevel.LOW
        
        # Analyze recent transactions
        recent_transactions = POSTransaction.objects.filter(
            merchant_id=merchant_id,
            created_at__gte=timezone.now() - timedelta(days=7)
        )
        
        high_risk_transactions = 0
        for transaction in recent_transactions:
            transaction_risk, factors = self.analyze_transaction_risk(transaction)
            if transaction_risk in [RiskLevel.HIGH, RiskLevel.CRITICAL]:
                high_risk_transactions += 1
                risk_factors.extend(factors)
        
        if high_risk_transactions > 10:
            risk_level = RiskLevel.HIGH
            risk_factors.append("High number of risky transactions")
        elif high_risk_transactions > 3:
            risk_level = RiskLevel.MEDIUM
        
        # Analyze device security
        devices = SmartphonePOSDevice.objects.filter(
            pos_device__merchant_id=merchant_id
        )
        
        devices_with_issues = 0
        for device in devices:
            if not self._is_device_compliant(device):
                devices_with_issues += 1
        
        if devices_with_issues > devices.count() * 0.3:  # More than 30% have issues
            risk_level = max(risk_level, RiskLevel.MEDIUM)
            risk_factors.append("Multiple devices with security issues")
        
        return {
            'level': risk_level,
            'factors': risk_factors,
            'recommendations': self._get_risk_recommendations(risk_level, risk_factors)
        }
    
    def _is_device_compliant(self, device: SmartphonePOSDevice) -> bool:
        """Check if device is compliant with security policies"""
        
        return (
            device.pin_required and
            device.pos_device.encryption_enabled and
            device.pos_device.security_level in ['standard', 'enhanced', 'pci_compliant'] and
            device.status == 'active'
        )
    
    def _get_risk_recommendations(self, risk_level: RiskLevel, risk_factors: List[str]) -> List[str]:
        """Get risk mitigation recommendations"""
        
        recommendations = []
        
        if risk_level == RiskLevel.CRITICAL:
            recommendations.append("Immediate security review required")
            recommendations.append("Consider suspending high-risk devices")
        
        if risk_level == RiskLevel.HIGH:
            recommendations.append("Enhanced monitoring recommended")
            recommendations.append("Review authentication procedures")
        
        if "High number of risky transactions" in risk_factors:
            recommendations.append("Implement additional transaction verification")
        
        if "Multiple devices with security issues" in risk_factors:
            recommendations.append("Update device security configurations")
        
        if risk_level in [RiskLevel.MEDIUM, RiskLevel.HIGH]:
            recommendations.append("Conduct security training for staff")
        
        return recommendations


# Utility functions
def get_security_manager() -> SoftPOSSecurityManager:
    """Get security manager instance"""
    return SoftPOSSecurityManager()


def log_security_event(
    event_type: SecurityEventType,
    device_id: str,
    details: Dict[str, Any],
    user_action: Optional[str] = None,
    ip_address: Optional[str] = None
) -> SecurityEvent:
    """Log security event using security manager"""
    manager = get_security_manager()
    return manager.log_security_event(
        event_type, device_id, details, user_action, ip_address
    )


def analyze_transaction_security(transaction: POSTransaction) -> Tuple[RiskLevel, List[str]]:
    """Analyze transaction security"""
    manager = get_security_manager()
    return manager.analyze_transaction_risk(transaction)


def generate_merchant_compliance_report(merchant_id: int) -> ComplianceReport:
    """Generate compliance report for merchant"""
    manager = get_security_manager()
    return manager.generate_compliance_report(merchant_id)
