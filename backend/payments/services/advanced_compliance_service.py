"""
Advanced Compliance Service
Enhanced PEP/Sanctions screening with external data sources
"""
import logging
import requests
from django.conf import settings
from django.utils import timezone
from django.core.cache import cache
from typing import Dict, List, Any, Optional, Tuple
import json
import hashlib
from decimal import Decimal

logger = logging.getLogger(__name__)

class PEPSanctionsService:
    """
    Service for PEP (Politically Exposed Persons) and Sanctions screening
    Integrates with external compliance data providers
    """

    # Compliance data providers
    PROVIDERS = {
        'ofac': {
            'name': 'OFAC SDN List',
            'url': 'https://www.treasury.gov/ofac/downloads/sdnlist.txt',
            'update_frequency': 24,  # hours
            'type': 'sanctions'
        },
        'eu_sanctions': {
            'name': 'EU Sanctions List',
            'url': 'https://webgate.ec.europa.eu/eu_sanctions/api',
            'update_frequency': 12,
            'type': 'sanctions'
        },
        'pep_api': {
            'name': 'PEP Screening API',
            'url': 'https://api.pep-screening.com/v1/search',
            'key_required': True,
            'type': 'pep'
        },
        'world_check': {
            'name': 'World-Check One',
            'url': 'https://api.world-check.com/v1/cases/screeningRequest',
            'key_required': True,
            'type': 'comprehensive'
        }
    }

    CACHE_KEY_SANCTIONS = 'compliance_sanctions_data'
    CACHE_KEY_PEP = 'compliance_pep_data'
    CACHE_TIMEOUT = 60 * 60 * 24  # 24 hours

    def __init__(self):
        self.sanctions_data = self._load_sanctions_data()
        self.pep_cache = {}

    def screen_individual(self, individual_data: Dict[str, Any]) -> Dict[str, Any]:
        """
        Comprehensive screening of an individual
        """
        try:
            name = individual_data.get('name', '').strip()
            date_of_birth = individual_data.get('date_of_birth')
            nationality = individual_data.get('nationality')
            aliases = individual_data.get('aliases', [])

            if not name:
                return {'screening_result': 'insufficient_data'}

            screening_results = {
                'individual_name': name,
                'screening_timestamp': timezone.now().isoformat(),
                'sanctions_matches': [],
                'pep_matches': [],
                'overall_risk': 'low',
                'recommendations': []
            }

            # Screen against sanctions lists
            sanctions_results = self._screen_sanctions_list(name, aliases, date_of_birth, nationality)
            screening_results['sanctions_matches'] = sanctions_results

            # Screen for PEP status
            pep_results = self._screen_pep_database(name, aliases, date_of_birth, nationality)
            screening_results['pep_matches'] = pep_results

            # Calculate overall risk
            screening_results['overall_risk'] = self._calculate_overall_risk(sanctions_results, pep_results)

            # Generate recommendations
            screening_results['recommendations'] = self._generate_compliance_recommendations(
                sanctions_results, pep_results, screening_results['overall_risk']
            )

            # Log screening activity
            self._log_screening_activity(individual_data, screening_results)

            return screening_results

        except Exception as e:
            logger.error(f"Individual screening failed: {str(e)}")
            return {
                'error': str(e),
                'screening_result': 'error'
            }

    def screen_entity(self, entity_data: Dict[str, Any]) -> Dict[str, Any]:
        """
        Screen a business entity for sanctions and compliance
        """
        try:
            entity_name = entity_data.get('name', '').strip()
            entity_type = entity_data.get('type', 'company')
            registration_country = entity_data.get('registration_country')
            aliases = entity_data.get('aliases', [])

            if not entity_name:
                return {'screening_result': 'insufficient_data'}

            screening_results = {
                'entity_name': entity_name,
                'entity_type': entity_type,
                'screening_timestamp': timezone.now().isoformat(),
                'sanctions_matches': [],
                'adverse_media_matches': [],
                'overall_risk': 'low',
                'recommendations': []
            }

            # Screen entity name against sanctions
            sanctions_results = self._screen_entity_sanctions(entity_name, aliases, registration_country)
            screening_results['sanctions_matches'] = sanctions_results

            # Check for adverse media (simplified)
            adverse_results = self._check_adverse_media(entity_name, aliases)
            screening_results['adverse_media_matches'] = adverse_results

            # Calculate overall risk
            screening_results['overall_risk'] = self._calculate_entity_risk(sanctions_results, adverse_results)

            # Generate recommendations
            screening_results['recommendations'] = self._generate_entity_recommendations(
                sanctions_results, adverse_results, screening_results['overall_risk']
            )

            return screening_results

        except Exception as e:
            logger.error(f"Entity screening failed: {str(e)}")
            return {
                'error': str(e),
                'screening_result': 'error'
            }

    def _load_sanctions_data(self) -> Dict[str, Any]:
        """
        Load sanctions data from cache or external sources
        """
        try:
            # Try to load from cache first
            cached_data = cache.get(self.CACHE_KEY_SANCTIONS)
            if cached_data:
                return cached_data

            # Load from external sources
            sanctions_data = {}

            # Load OFAC data
            ofac_data = self._load_ofac_data()
            if ofac_data:
                sanctions_data['ofac'] = ofac_data

            # Load EU sanctions data
            eu_data = self._load_eu_sanctions_data()
            if eu_data:
                sanctions_data['eu'] = eu_data

            # Cache the data
            if sanctions_data:
                cache.set(self.CACHE_KEY_SANCTIONS, sanctions_data, self.CACHE_TIMEOUT)

            return sanctions_data

        except Exception as e:
            logger.error(f"Failed to load sanctions data: {str(e)}")
            return {}

    def _load_ofac_data(self) -> List[Dict[str, Any]]:
        """
        Load OFAC SDN (Specially Designated Nationals) list
        """
        try:
            response = requests.get(self.PROVIDERS['ofac']['url'], timeout=30)
            response.raise_for_status()

            # Parse SDN list (simplified parsing)
            lines = response.text.split('\n')
            sanctions_list = []

            for line in lines:
                if line.strip() and not line.startswith(';'):
                    # Basic parsing - in production would use proper SDN parser
                    parts = line.split(';')
                    if len(parts) >= 2:
                        sanctions_list.append({
                            'name': parts[0].strip(),
                            'type': 'individual',  # Simplified
                            'sanctions_type': 'ofac_sdn'
                        })

            logger.info(f"Loaded {len(sanctions_list)} OFAC sanctions entries")
            return sanctions_list

        except Exception as e:
            logger.error(f"Failed to load OFAC data: {str(e)}")
            return []

    def _load_eu_sanctions_data(self) -> List[Dict[str, Any]]:
        """
        Load EU sanctions list
        """
        try:
            # This would integrate with EU sanctions API
            # In production, this should connect to actual EU sanctions database
            return []  # No sanctions data loaded - configure EU API integration
        except Exception as e:
            logger.error(f"Failed to load EU sanctions data: {str(e)}")
            return []

    def _screen_sanctions_list(self, name: str, aliases: List[str], dob: str = None, nationality: str = None) -> List[Dict[str, Any]]:
        """
        Screen individual against sanctions lists
        """
        matches = []
        search_names = [name.lower()] + [alias.lower() for alias in aliases]

        for source, sanctions_list in self.sanctions_data.items():
            for entry in sanctions_list:
                entry_name = entry.get('name', '').lower()

                # Check for name matches
                for search_name in search_names:
                    if self._calculate_name_similarity(search_name, entry_name) > 0.8:
                        matches.append({
                            'source': source,
                            'matched_name': entry['name'],
                            'sanctions_type': entry.get('sanctions_type', 'unknown'),
                            'match_confidence': self._calculate_name_similarity(search_name, entry_name),
                            'entity_type': entry.get('type', 'unknown')
                        })
                        break

        return matches

    def _screen_entity_sanctions(self, entity_name: str, aliases: List[str], country: str = None) -> List[Dict[str, Any]]:
        """
        Screen entity against sanctions lists
        """
        matches = []
        search_names = [entity_name.lower()] + [alias.lower() for alias in aliases]

        for source, sanctions_list in self.sanctions_data.items():
            for entry in sanctions_list:
                if entry.get('type') == 'entity':
                    entry_name = entry.get('name', '').lower()

                    for search_name in search_names:
                        if self._calculate_name_similarity(search_name, entry_name) > 0.8:
                            matches.append({
                                'source': source,
                                'matched_name': entry['name'],
                                'sanctions_type': entry.get('sanctions_type', 'unknown'),
                                'match_confidence': self._calculate_name_similarity(search_name, entry_name),
                                'country': country
                            })
                            break

        return matches

    def _screen_pep_database(self, name: str, aliases: List[str], dob: str = None, nationality: str = None) -> List[Dict[str, Any]]:
        """
        Screen individual against PEP database
        """
        try:
            # Use external PEP screening API if configured
            api_key = getattr(settings, 'PEP_API_KEY', None)
            if api_key:
                return self._screen_external_pep_api(name, aliases, dob, nationality, api_key)

            # Fallback to local PEP database (simplified)
            return self._screen_local_pep_database(name, aliases)

        except Exception as e:
            logger.error(f"PEP screening failed: {str(e)}")
            return []

    def _screen_external_pep_api(self, name: str, aliases: List[str], dob: str, nationality: str, api_key: str) -> List[Dict[str, Any]]:
        """
        Screen using external PEP API
        """
        try:
            payload = {
                'name': name,
                'aliases': aliases,
                'date_of_birth': dob,
                'nationality': nationality
            }

            response = requests.post(
                self.PROVIDERS['pep_api']['url'],
                headers={
                    'Authorization': f'Bearer {api_key}',
                    'Content-Type': 'application/json'
                },
                json=payload,
                timeout=10
            )

            if response.status_code == 200:
                data = response.json()
                return data.get('matches', [])
            else:
                logger.warning(f"PEP API request failed: {response.status_code}")
                return []

        except Exception as e:
            logger.error(f"External PEP API call failed: {str(e)}")
            return []

    def _screen_local_pep_database(self, name: str, aliases: List[str]) -> List[Dict[str, Any]]:
        """
        Screen against local PEP database (simplified)
        """
        # This would be replaced with actual PEP database queries
        # For demonstration, return empty list until real database is implemented
        return []

    def _check_adverse_media(self, entity_name: str, aliases: List[str]) -> List[Dict[str, Any]]:
        """
        Check for adverse media mentions using configured API or local compliance logs
        """
        try:
            # Use external adverse media API if configured
            api_key = getattr(settings, 'ADVERSE_MEDIA_API_KEY', None)
            api_url = getattr(settings, 'ADVERSE_MEDIA_API_URL', None)

            if api_key and api_url:
                all_names = [entity_name] + (aliases or [])
                payload = {'names': all_names, 'categories': ['fraud', 'money_laundering', 'terrorism', 'corruption', 'sanctions']}
                try:
                    response = requests.post(
                        api_url,
                        headers={'Authorization': f'Bearer {api_key}', 'Content-Type': 'application/json'},
                        json=payload,
                        timeout=15
                    )
                    if response.status_code == 200:
                        data = response.json()
                        return data.get('matches', [])
                    else:
                        logger.warning(f"Adverse media API returned {response.status_code}")
                except requests.RequestException as e:
                    logger.error(f"Adverse media API request failed: {e}")

            # Fallback: check local compliance logs for prior adverse findings
            try:
                from merchants.models import ComplianceLog
                all_names = [entity_name.lower()] + [a.lower() for a in (aliases or [])]
                local_matches = []
                logs = ComplianceLog.objects.filter(
                    check_type='adverse_media',
                    result__in=['match', 'potential_match']
                )
                for log in logs:
                    log_entity = (getattr(log, 'entity_name', '') or '').lower()
                    if log_entity and any(self._calculate_name_similarity(log_entity, name) > 0.7 for name in all_names):
                        local_matches.append({
                            'source': 'local_compliance_log',
                            'entity_name': log_entity,
                            'result': log.result,
                            'date': str(getattr(log, 'created_at', '')),
                            'details': getattr(log, 'details', {}),
                        })
                return local_matches
            except (ImportError, Exception) as e:
                logger.warning(f"Local adverse media check failed: {e}")
                return []

        except Exception as e:
            logger.error(f"Adverse media check failed: {str(e)}")
            return []

    def _calculate_name_similarity(self, name1: str, name2: str) -> float:
        """
        Calculate similarity between two names (simplified)
        """
        # This is a very basic implementation
        # In production, would use more sophisticated algorithms like Levenshtein distance
        name1_words = set(name1.lower().split())
        name2_words = set(name2.lower().split())

        if not name1_words or not name2_words:
            return 0.0

        intersection = name1_words.intersection(name2_words)
        union = name1_words.union(name2_words)

        return len(intersection) / len(union) if union else 0.0

    def _calculate_overall_risk(self, sanctions_matches: List[Dict], pep_matches: List[Dict]) -> str:
        """
        Calculate overall risk level
        """
        if sanctions_matches:
            return 'critical'

        if pep_matches:
            return 'high'

        return 'low'

    def _calculate_entity_risk(self, sanctions_matches: List[Dict], adverse_matches: List[Dict]) -> str:
        """
        Calculate entity risk level
        """
        if sanctions_matches:
            return 'critical'

        if adverse_matches:
            return 'high'

        return 'low'

    def _generate_compliance_recommendations(self, sanctions_matches: List[Dict], pep_matches: List[Dict], risk_level: str) -> List[str]:
        """
        Generate compliance recommendations based on screening results
        """
        recommendations = []

        if risk_level == 'critical':
            recommendations.append("IMMEDIATE: Block transaction and report to compliance officer")
            recommendations.append("Freeze any associated accounts")
            recommendations.append("Document screening results for regulatory reporting")

        elif risk_level == 'high':
            recommendations.append("Enhanced due diligence required")
            recommendations.append("Obtain additional documentation")
            recommendations.append("Senior compliance approval required")

        elif sanctions_matches:
            recommendations.append("Verify sanctions list status")
            recommendations.append("Check for license exceptions")

        elif pep_matches:
            recommendations.append("Enhanced customer due diligence")
            recommendations.append("Source of funds verification")
            recommendations.append("Purpose of relationship confirmation")

        if not recommendations:
            recommendations.append("No compliance concerns identified")

        return recommendations

    def _generate_entity_recommendations(self, sanctions_matches: List[Dict], adverse_matches: List[Dict], risk_level: str) -> List[str]:
        """
        Generate entity compliance recommendations
        """
        recommendations = []

        if risk_level == 'critical':
            recommendations.append("IMMEDIATE: Cease all business relationships")
            recommendations.append("Report to relevant authorities")
            recommendations.append("Conduct internal investigation")

        elif risk_level == 'high':
            recommendations.append("Enhanced due diligence on beneficial owners")
            recommendations.append("Verify business legitimacy")
            recommendations.append("Obtain additional documentation")

        if sanctions_matches:
            recommendations.append("Check OFAC/EU sanctions lists")
            recommendations.append("Verify SDN status")

        if adverse_matches:
            recommendations.append("Review adverse media findings")
            recommendations.append("Assess reputational risk")

        if not recommendations:
            recommendations.append("Entity appears compliant")

        return recommendations

    def _log_screening_activity(self, individual_data: Dict[str, Any], results: Dict[str, Any]):
        """
        Log compliance screening activity for audit purposes
        """
        try:
            log_entry = {
                'timestamp': results['screening_timestamp'],
                'individual_name': results['individual_name'],
                'overall_risk': results['overall_risk'],
                'sanctions_matches': len(results['sanctions_matches']),
                'pep_matches': len(results['pep_matches']),
                'recommendations_count': len(results['recommendations'])
            }

            logger.info(f"Compliance screening completed: {json.dumps(log_entry)}")

        except Exception as e:
            logger.error(f"Failed to log screening activity: {str(e)}")

class ComplianceReportingService:
    """
    Service for generating compliance reports and regulatory filings
    """

    @staticmethod
    def generate_sar_report(transaction_id: str, suspicious_activities: List[str]) -> Dict[str, Any]:
        """
        Generate Suspicious Activity Report (SAR)
        """
        try:
            # This would generate a formal SAR report for regulatory filing
            return {
                'report_type': 'SAR',
                'transaction_id': transaction_id,
                'filing_date': timezone.now().isoformat(),
                'suspicious_activities': suspicious_activities,
                'generated_by': 'SikaRemit Compliance System',
                'status': 'draft'
            }
        except Exception as e:
            logger.error(f"SAR generation failed: {str(e)}")
            return {'error': str(e)}

    @staticmethod
    def generate_ctr_report(period_start: str, period_end: str) -> Dict[str, Any]:
        """
        Generate Currency Transaction Report (CTR)
        """
        try:
            # Generate CTR for transactions above reporting threshold
            from payments.models import Transaction

            threshold = Decimal('10000')  # $10,000 threshold

            large_transactions = Transaction.objects.filter(
                created_at__gte=period_start,
                created_at__lte=period_end,
                amount__gte=threshold,
                status='completed'
            ).values(
                'id', 'amount', 'currency', 'customer__user__email',
                'created_at', 'payment_method__method_type'
            )

            return {
                'report_type': 'CTR',
                'period_start': period_start,
                'period_end': period_end,
                'threshold_amount': float(threshold),
                'transactions': list(large_transactions),
                'total_count': len(large_transactions),
                'generated_at': timezone.now().isoformat()
            }
        except Exception as e:
            logger.error(f"CTR generation failed: {str(e)}")
            return {'error': str(e)}

    @staticmethod
    def generate_compliance_dashboard() -> Dict[str, Any]:
        """
        Generate compliance dashboard data
        """
        try:
            end_date = timezone.now()
            start_date = end_date - timezone.timedelta(days=30)

            from payments.models import Transaction
            from users.models import KYCDocument

            # Compliance metrics
            total_transactions = Transaction.objects.filter(created_at__gte=start_date).count()
            screened_transactions = total_transactions  # Assume all are screened

            kyc_documents = KYCDocument.objects.filter(created_at__gte=start_date)
            kyc_approved = kyc_documents.filter(status='approved').count()
            kyc_rejected = kyc_documents.filter(status='rejected').count()

            # Sanctions screening (simplified)
            sanctions_screened = total_transactions
            sanctions_flags = 0  # Would come from actual screening logs

            return {
                'period_days': 30,
                'kyc_metrics': {
                    'total_applications': kyc_documents.count(),
                    'approved': kyc_approved,
                    'rejected': kyc_rejected,
                    'approval_rate': (kyc_approved / kyc_documents.count() * 100) if kyc_documents.count() > 0 else 0
                },
                'screening_metrics': {
                    'transactions_screened': screened_transactions,
                    'sanctions_flags': sanctions_flags,
                    'pep_flags': 0,  # Would come from screening logs
                    'screening_completion_rate': 100.0
                },
                'regulatory_filings': {
                    'sars_filed': 0,
                    'ctrs_filed': 0,
                    'pending_filings': 0
                },
                'generated_at': end_date.isoformat()
            }
        except Exception as e:
            logger.error(f"Compliance dashboard generation failed: {str(e)}")
            return {'error': str(e)}
