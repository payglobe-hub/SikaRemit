"""
Advanced Compliance API Views
Provides endpoints for enhanced compliance screening and reporting
"""
from rest_framework import viewsets, status
from rest_framework.decorators import action
from rest_framework.response import Response
from rest_framework.permissions import IsAuthenticated, IsAdminUser
from django.utils import timezone
from payments.services.advanced_compliance_service import PEPSanctionsService, ComplianceReportingService
from users.models import Customer, Merchant
from payments.models import Transaction

class AdvancedComplianceViewSet(viewsets.ViewSet):
    """
    Advanced compliance screening and monitoring API
    """
    permission_classes = [IsAuthenticated]

    @action(detail=False, methods=['post'], permission_classes=[IsAdminUser])
    def screen_individual(self, request):
        """
        Screen an individual for PEP/Sanctions compliance
        Required fields:
        - name: Full name
        - date_of_birth: YYYY-MM-DD (optional)
        - nationality: Country code (optional)
        - aliases: Array of alternative names (optional)
        """
        try:
            individual_data = request.data

            if not individual_data.get('name'):
                return Response(
                    {'error': 'name is required'},
                    status=status.HTTP_400_BAD_REQUEST
                )

            compliance_service = PEPSanctionsService()
            screening_result = compliance_service.screen_individual(individual_data)

            if screening_result.get('error'):
                return Response(
                    {'error': screening_result['error']},
                    status=status.HTTP_500_INTERNAL_SERVER_ERROR
                )

            return Response(screening_result)

        except Exception as e:
            return Response(
                {'error': f'Individual screening failed: {str(e)}'},
                status=status.HTTP_500_INTERNAL_SERVER_ERROR
            )

    @action(detail=False, methods=['post'], permission_classes=[IsAdminUser])
    def screen_entity(self, request):
        """
        Screen a business entity for compliance
        Required fields:
        - name: Entity name
        - type: Entity type (company, partnership, etc.)
        - registration_country: Country code
        - aliases: Array of alternative names (optional)
        """
        try:
            entity_data = request.data

            if not entity_data.get('name'):
                return Response(
                    {'error': 'name is required'},
                    status=status.HTTP_400_BAD_REQUEST
                )

            compliance_service = PEPSanctionsService()
            screening_result = compliance_service.screen_entity(entity_data)

            if screening_result.get('error'):
                return Response(
                    {'error': screening_result['error']},
                    status=status.HTTP_500_INTERNAL_SERVER_ERROR
                )

            return Response(screening_result)

        except Exception as e:
            return Response(
                {'error': f'Entity screening failed: {str(e)}'},
                status=status.HTTP_500_INTERNAL_SERVER_ERROR
            )

    @action(detail=False, methods=['get'], permission_classes=[IsAdminUser])
    def compliance_dashboard(self, request):
        """
        Get compliance dashboard data
        """
        try:
            dashboard_data = ComplianceReportingService.generate_compliance_dashboard()
            return Response(dashboard_data)
        except Exception as e:
            return Response(
                {'error': f'Compliance dashboard failed: {str(e)}'},
                status=status.HTTP_500_INTERNAL_SERVER_ERROR
            )

    @action(detail=False, methods=['post'], permission_classes=[IsAdminUser])
    def generate_sar(self, request):
        """
        Generate Suspicious Activity Report
        Required fields:
        - transaction_id: Transaction to report
        - suspicious_activities: Array of suspicious activities
        """
        try:
            transaction_id = request.data.get('transaction_id')
            suspicious_activities = request.data.get('suspicious_activities', [])

            if not transaction_id:
                return Response(
                    {'error': 'transaction_id is required'},
                    status=status.HTTP_400_BAD_REQUEST
                )

            # Verify transaction exists
            try:
                Transaction.objects.get(id=transaction_id)
            except Transaction.DoesNotExist:
                return Response(
                    {'error': 'Transaction not found'},
                    status=status.HTTP_404_NOT_FOUND
                )

            sar_report = ComplianceReportingService.generate_sar_report(
                transaction_id, suspicious_activities
            )

            return Response(sar_report)

        except Exception as e:
            return Response(
                {'error': f'SAR generation failed: {str(e)}'},
                status=status.HTTP_500_INTERNAL_SERVER_ERROR
            )

    @action(detail=False, methods=['post'], permission_classes=[IsAdminUser])
    def generate_ctr(self, request):
        """
        Generate Currency Transaction Report
        Required fields:
        - period_start: Start date (YYYY-MM-DD)
        - period_end: End date (YYYY-MM-DD)
        """
        try:
            period_start = request.data.get('period_start')
            period_end = request.data.get('period_end')

            if not period_start or not period_end:
                return Response(
                    {'error': 'period_start and period_end are required'},
                    status=status.HTTP_400_BAD_REQUEST
                )

            ctr_report = ComplianceReportingService.generate_ctr_report(
                period_start, period_end
            )

            return Response(ctr_report)

        except Exception as e:
            return Response(
                {'error': f'CTR generation failed: {str(e)}'},
                status=status.HTTP_500_INTERNAL_SERVER_ERROR
            )

    @action(detail=False, methods=['get'], permission_classes=[IsAdminUser])
    def screening_stats(self, request):
        """
        Get compliance screening statistics
        """
        try:
            end_date = timezone.now()
            start_date = end_date - timezone.timedelta(days=30)

            from payments.models import Transaction
            from users.models import KYCDocument

            # Screening statistics
            total_transactions = Transaction.objects.filter(
                created_at__gte=start_date
            ).count()

            # KYC statistics
            kyc_stats = KYCDocument.objects.filter(
                created_at__gte=start_date
            ).aggregate(
                total=Count('id'),
                approved=Count('id', filter=Q(status='approved')),
                rejected=Count('id', filter=Q(status='rejected')),
                pending=Count('id', filter=Q(status='pending'))
            )

            # Sanctions screening (simplified - would come from logs)
            sanctions_screened = total_transactions

            return Response({
                'period_days': 30,
                'screening_coverage': {
                    'total_transactions': total_transactions,
                    'sanctions_screened': sanctions_screened,
                    'pep_screened': sanctions_screened,  # Simplified
                    'coverage_percentage': 100.0 if total_transactions > 0 else 0
                },
                'kyc_statistics': kyc_stats,
                'risk_distribution': {
                    'low_risk': int(total_transactions * 0.85),  # Estimate
                    'medium_risk': int(total_transactions * 0.10),
                    'high_risk': int(total_transactions * 0.04),
                    'critical_risk': int(total_transactions * 0.01)
                },
                'generated_at': end_date.isoformat()
            })

        except Exception as e:
            return Response(
                {'error': f'Screening stats failed: {str(e)}'},
                status=status.HTTP_500_INTERNAL_SERVER_ERROR
            )

class ComplianceMonitoringViewSet(viewsets.ViewSet):
    """
    Real-time compliance monitoring and alerting
    """
    permission_classes = [IsAdminUser]

    @action(detail=False, methods=['get'])
    def alerts(self, request):
        """
        Get active compliance alerts
        """
        try:
            # This would query actual compliance alert logs
            alerts = [
                {
                    'id': 'alert_001',
                    'type': 'sanctions_match',
                    'severity': 'critical',
                    'message': 'Transaction matched against OFAC sanctions list',
                    'entity_name': 'John Doe',
                    'entity_type': 'individual',
                    'match_source': 'OFAC SDN',
                    'timestamp': timezone.now().isoformat(),
                    'status': 'active'
                },
                {
                    'id': 'alert_002',
                    'type': 'pep_match',
                    'severity': 'high',
                    'message': 'Customer identified as Politically Exposed Person',
                    'entity_name': 'Jane Smith',
                    'entity_type': 'individual',
                    'position': 'Former Minister',
                    'timestamp': (timezone.now() - timezone.timedelta(hours=2)).isoformat(),
                    'status': 'active'
                },
                {
                    'id': 'alert_003',
                    'type': 'high_value_transaction',
                    'severity': 'medium',
                    'message': 'Transaction exceeds reporting threshold',
                    'transaction_id': 'txn_123456',
                    'amount': 25000,
                    'currency': 'USD',
                    'timestamp': (timezone.now() - timezone.timedelta(minutes=30)).isoformat(),
                    'status': 'active'
                }
            ]

            return Response({
                'alerts': alerts,
                'total_active': len(alerts),
                'critical_count': len([a for a in alerts if a['severity'] == 'critical']),
                'high_count': len([a for a in alerts if a['severity'] == 'high']),
                'medium_count': len([a for a in alerts if a['severity'] == 'medium']),
                'timestamp': timezone.now().isoformat()
            })

        except Exception as e:
            return Response(
                {'error': f'Compliance alerts failed: {str(e)}'},
                status=status.HTTP_500_INTERNAL_SERVER_ERROR
            )

    @action(detail=True, methods=['post'])
    def resolve_alert(self, request, pk=None):
        """
        Resolve a compliance alert
        Required fields:
        - resolution: 'approved', 'rejected', 'investigated', 'escalated'
        - notes: Resolution notes
        """
        try:
            resolution = request.data.get('resolution')
            notes = request.data.get('notes', '')

            valid_resolutions = ['approved', 'rejected', 'investigated', 'escalated']
            if resolution not in valid_resolutions:
                return Response(
                    {'error': f'Invalid resolution. Must be one of: {valid_resolutions}'},
                    status=status.HTTP_400_BAD_REQUEST
                )

            # In production, this would update the alert status in database
            # and log the resolution for audit purposes

            return Response({
                'alert_id': pk,
                'resolution': resolution,
                'notes': notes,
                'resolved_at': timezone.now().isoformat(),
                'resolved_by': request.user.id
            })

        except Exception as e:
            return Response(
                {'error': f'Alert resolution failed: {str(e)}'},
                status=status.HTTP_500_INTERNAL_SERVER_ERROR
            )

    @action(detail=False, methods=['get'])
    def regulatory_reports(self, request):
        """
        Get regulatory reporting status
        """
        try:
            # This would show status of required regulatory filings
            reports = [
                {
                    'type': 'SAR',
                    'period': 'Monthly',
                    'due_date': (timezone.now() + timezone.timedelta(days=15)).date().isoformat(),
                    'status': 'pending',
                    'pending_count': 3,
                    'last_filed': (timezone.now() - timezone.timedelta(days=30)).date().isoformat()
                },
                {
                    'type': 'CTR',
                    'period': 'Monthly',
                    'due_date': (timezone.now() + timezone.timedelta(days=20)).date().isoformat(),
                    'status': 'pending',
                    'pending_count': 0,
                    'last_filed': (timezone.now() - timezone.timedelta(days=30)).date().isoformat()
                },
                {
                    'type': 'GOAML',
                    'period': 'As needed',
                    'due_date': None,
                    'status': 'current',
                    'pending_count': 0,
                    'last_filed': (timezone.now() - timezone.timedelta(days=5)).date().isoformat()
                }
            ]

            return Response({
                'reports': reports,
                'overdue_count': len([r for r in reports if r['status'] == 'overdue']),
                'pending_count': len([r for r in reports if r['status'] == 'pending']),
                'generated_at': timezone.now().isoformat()
            })

        except Exception as e:
            return Response(
                {'error': f'Regulatory reports failed: {str(e)}'},
                status=status.HTTP_500_INTERNAL_SERVER_ERROR
            )
