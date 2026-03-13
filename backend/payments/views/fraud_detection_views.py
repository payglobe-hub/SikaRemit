"""
Fraud Detection API Views
Provides endpoints for fraud detection and monitoring
"""
from rest_framework import viewsets, status
from rest_framework.decorators import action
from rest_framework.response import Response
from rest_framework.permissions import IsAuthenticated, IsAdminUser
from django.utils import timezone
from payments.services.fraud_detection_ml_service import MLFraudDetectionService, BehavioralAnalysisService
from payments.models import Transaction
from django.db.models import Count, Sum


class FraudDetectionViewSet(viewsets.ViewSet):
    """
    Fraud detection and analysis API endpoints
    """
    permission_classes = [IsAuthenticated]

    @action(detail=True, methods=['post'], permission_classes=[IsAdminUser])
    def analyze_transaction(self, request, pk=None):
        """
        Analyze a specific transaction for fraud
        """
        try:
            transaction = Transaction.objects.get(id=pk)
            fraud_service = MLFraudDetectionService()

            analysis_result = fraud_service.analyze_transaction(transaction)

            return Response(analysis_result)

        except Transaction.DoesNotExist:
            return Response(
                {'error': 'Transaction not found'},
                status=status.HTTP_404_NOT_FOUND
            )
        except Exception as e:
            return Response(
                {'error': f'Fraud analysis failed: {str(e)}'},
                status=status.HTTP_500_INTERNAL_SERVER_ERROR
            )

    @action(detail=False, methods=['get'], permission_classes=[IsAdminUser])
    def fraud_statistics(self, request):
        """
        Get fraud detection statistics
        Query params:
        - days: Analysis period in days (default: 30)
        """
        try:
            days = int(request.query_params.get('days', 30))
            fraud_service = MLFraudDetectionService()

            stats = fraud_service.get_fraud_statistics(days)

            # Get additional statistics from database
            end_date = timezone.now()
            start_date = end_date - timezone.timedelta(days=days)

            db_stats = Transaction.objects.filter(
                created_at__gte=start_date
            ).aggregate(
                total_transactions=Count('id'),
                flagged_transactions=Count('id', filter=Q(status='pending')),  # Simplified
                blocked_transactions=Count('id', filter=Q(status='failed'))
            )

            return Response({
                'period_days': days,
                'ml_statistics': stats,
                'database_statistics': db_stats,
                'timestamp': end_date.isoformat()
            })

        except Exception as e:
            return Response(
                {'error': f'Failed to fetch fraud statistics: {str(e)}'},
                status=status.HTTP_500_INTERNAL_SERVER_ERROR
            )

    @action(detail=False, methods=['post'], permission_classes=[IsAdminUser])
    def update_fraud_model(self, request):
        """
        Update fraud detection model with feedback
        Request body:
        - transaction_id: Transaction ID
        - is_fraud: Boolean indicating if transaction was fraudulent
        """
        try:
            transaction_id = request.data.get('transaction_id')
            is_fraud = request.data.get('is_fraud')

            if not transaction_id or is_fraud is None:
                return Response(
                    {'error': 'transaction_id and is_fraud are required'},
                    status=status.HTTP_400_BAD_REQUEST
                )

            fraud_service = MLFraudDetectionService()
            fraud_service.update_model_with_feedback(transaction_id, bool(is_fraud))

            return Response({
                'message': 'Fraud model updated successfully',
                'transaction_id': transaction_id,
                'feedback': 'fraud' if is_fraud else 'legitimate'
            })

        except Exception as e:
            return Response(
                {'error': f'Model update failed: {str(e)}'},
                status=status.HTTP_500_INTERNAL_SERVER_ERROR
            )

    @action(detail=False, methods=['get'], permission_classes=[IsAdminUser])
    def high_risk_transactions(self, request):
        """
        Get list of high-risk transactions requiring review
        Query params:
        - days: Lookback period (default: 7)
        - limit: Maximum results (default: 50)
        """
        try:
            days = int(request.query_params.get('days', 7))
            limit = int(request.query_params.get('limit', 50))

            end_date = timezone.now()
            start_date = end_date - timezone.timedelta(days=days)

            # Get transactions that might be high-risk
            # This is simplified - in production you'd have a fraud_score field
            high_risk_transactions = Transaction.objects.filter(
                created_at__gte=start_date,
                amount__gte=1000  # High amount threshold
            ).select_related('customer__user', 'payment_method').order_by('-created_at')[:limit]

            results = []
            fraud_service = MLFraudDetectionService()

            for transaction in high_risk_transactions:
                analysis = fraud_service.analyze_transaction(transaction)
                results.append({
                    'transaction_id': transaction.id,
                    'amount': float(transaction.amount),
                    'currency': transaction.currency,
                    'customer': transaction.customer.user.email,
                    'payment_method': transaction.payment_method.method_type,
                    'created_at': transaction.created_at.isoformat(),
                    'fraud_analysis': analysis
                })

            return Response({
                'total_results': len(results),
                'period_days': days,
                'transactions': results
            })

        except Exception as e:
            return Response(
                {'error': f'Failed to fetch high-risk transactions: {str(e)}'},
                status=status.HTTP_500_INTERNAL_SERVER_ERROR
            )

    @action(detail=True, methods=['post'], permission_classes=[IsAdminUser])
    def behavioral_analysis(self, request, pk=None):
        """
        Perform behavioral analysis on a user
        URL param: user_id
        """
        try:
            from django.contrib.auth import get_user_model
            User = get_user_model()

            user = User.objects.get(id=pk)
            behavioral_service = BehavioralAnalysisService()

            # Get recent transaction for analysis
            recent_transaction = user.customer.customer_transactions.filter(
                status='completed'
            ).order_by('-created_at').first()

            if not recent_transaction:
                return Response({
                    'user_id': pk,
                    'message': 'No recent transactions found for analysis'
                })

            analysis = behavioral_service.analyze_user_behavior(user, recent_transaction)

            return Response(analysis)

        except User.DoesNotExist:
            return Response(
                {'error': 'User not found'},
                status=status.HTTP_404_NOT_FOUND
            )
        except Exception as e:
            return Response(
                {'error': f'Behavioral analysis failed: {str(e)}'},
                status=status.HTTP_500_INTERNAL_SERVER_ERROR
            )


class FraudMonitoringViewSet(viewsets.ViewSet):
    """
    Real-time fraud monitoring and alerting
    """
    permission_classes = [IsAdminUser]

    @action(detail=False, methods=['get'])
    def alerts(self, request):
        """
        Get active fraud alerts
        """
        try:
            # Query actual fraud alerts from database
            from ..models import FraudAlert
            
            alerts = FraudAlert.objects.filter(
                status='active'
            ).order_by('-created_at')[:50]  # Get 50 most recent
            
            alert_data = []
            for alert in alerts:
                alert_data.append({
                    'id': str(alert.id),
                    'type': alert.alert_type,
                    'severity': alert.severity,
                    'message': alert.description,
                    'transaction_id': str(alert.transaction_id) if alert.transaction_id else None,
                    'user_id': str(alert.user.id) if alert.user else None,
                    'timestamp': alert.created_at.isoformat(),
                    'status': alert.status,
                    'risk_score': alert.risk_score,
                    'auto_blocked': alert.auto_blocked
                })

            return Response({
                'alerts': alert_data,
                'total_active': len(alert_data),
                'timestamp': timezone.now().isoformat()
            })
            
        except Exception as e:
            logger.error(f"Error fetching fraud alerts: {str(e)}")
            return Response({
                'alerts': [],
                'total_active': 0,
                'timestamp': timezone.now().isoformat(),
                'error': 'Failed to fetch fraud alerts'
            }, status=status.HTTP_500_INTERNAL_SERVER_ERROR)

    @action(detail=True, methods=['post'])
    def resolve_alert(self, request, pk=None):
        """
        Resolve a fraud alert
        Request body:
        - resolution: 'approved', 'rejected', 'investigating'
        - notes: Optional resolution notes
        """
        try:
            resolution = request.data.get('resolution')
            notes = request.data.get('notes', '')

            if resolution not in ['approved', 'rejected', 'investigating']:
                return Response(
                    {'error': 'Invalid resolution type'},
                    status=status.HTTP_400_BAD_REQUEST
                )

            # In production, this would update the alert status in database
            logger.info(f"Alert {pk} resolved: {resolution} - {notes}")

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
    def risk_dashboard(self, request):
        """
        Get comprehensive risk dashboard data
        """
        try:
            # Aggregate risk metrics
            end_date = timezone.now()
            start_date = end_date - timezone.timedelta(days=7)

            # Transaction risk metrics
            transactions = Transaction.objects.filter(created_at__gte=start_date)

            risk_metrics = {
                'total_transactions': transactions.count(),
                'high_amount_transactions': transactions.filter(amount__gte=1000).count(),
                'failed_transactions': transactions.filter(status='failed').count(),
                'pending_reviews': transactions.filter(status='pending').count(),
                'risk_trends': self._calculate_risk_trends(start_date, end_date)
            }

            # Geographic risk from actual transaction data
            from django.db.models import Count
            country_failures = transactions.filter(status='failed').values('country_to').annotate(
                fail_count=Count('id')
            ).order_by('-fail_count')[:10]

            high_risk_regions = []
            for cf in country_failures:
                country = cf['country_to'] or 'Unknown'
                total_for_country = transactions.filter(country_to=cf['country_to']).count()
                if total_for_country > 0 and cf['fail_count'] / total_for_country > 0.3:
                    high_risk_regions.append({
                        'region': country,
                        'failure_rate': round(cf['fail_count'] / total_for_country, 3),
                        'failed_transactions': cf['fail_count'],
                    })

            suspicious_locations = transactions.filter(
                status='failed', amount__gte=5000
            ).values('country_to').distinct().count()

            geographic_risk = {
                'high_risk_regions': high_risk_regions,
                'suspicious_locations': suspicious_locations
            }

            # Time-based risk
            time_risk = {
                'peak_risk_hours': [2, 3, 4, 5],  # 2-5 AM
                'weekend_risk_multiplier': 1.3
            }

            return Response({
                'risk_metrics': risk_metrics,
                'geographic_risk': geographic_risk,
                'time_risk': time_risk,
                'overall_risk_score': self._calculate_overall_risk_score(risk_metrics),
                'recommendations': self._generate_risk_recommendations(risk_metrics)
            })

        except Exception as e:
            return Response(
                {'error': f'Risk dashboard failed: {str(e)}'},
                status=status.HTTP_500_INTERNAL_SERVER_ERROR
            )

    def _calculate_risk_trends(self, start_date, end_date):
        """Calculate risk trends over time from actual transaction data"""
        from django.db.models import Count, Q
        trends = []
        current = start_date
        while current <= end_date:
            day_end = current + timezone.timedelta(days=1)
            day_txns = Transaction.objects.filter(created_at__range=(current, day_end))
            total = day_txns.count()
            failed = day_txns.filter(status='failed').count()
            high_amount = day_txns.filter(amount__gte=1000).count()

            if total > 0:
                failure_rate = failed / total
                high_amount_rate = high_amount / total
                risk_score = round(min((failure_rate * 0.6) + (high_amount_rate * 0.4), 1.0), 3)
            else:
                risk_score = 0.0

            trends.append({
                'date': current.date().isoformat() if hasattr(current, 'date') else str(current)[:10],
                'risk_score': risk_score,
                'total_transactions': total,
                'failed_transactions': failed,
                'high_amount_transactions': high_amount,
            })
            current += timezone.timedelta(days=1)
        return trends

    def _calculate_overall_risk_score(self, risk_metrics):
        """Calculate overall risk score"""
        try:
            total_txns = risk_metrics['total_transactions']
            if total_txns == 0:
                return 0.0

            # Weighted risk calculation
            high_amount_ratio = risk_metrics['high_amount_transactions'] / total_txns
            failed_ratio = risk_metrics['failed_transactions'] / total_txns
            pending_ratio = risk_metrics['pending_reviews'] / total_txns

            risk_score = (high_amount_ratio * 0.4) + (failed_ratio * 0.4) + (pending_ratio * 0.2)
            return min(risk_score, 1.0)

        except Exception:
            return 0.5

    def _generate_risk_recommendations(self, risk_metrics):
        """Generate risk mitigation recommendations"""
        recommendations = []

        if risk_metrics['failed_transactions'] > risk_metrics['total_transactions'] * 0.05:
            recommendations.append("High failure rate detected. Review payment processing.")

        if risk_metrics['high_amount_transactions'] > risk_metrics['total_transactions'] * 0.1:
            recommendations.append("Large number of high-value transactions. Consider enhanced monitoring.")

        if risk_metrics['pending_reviews'] > 10:
            recommendations.append("Multiple transactions pending review. Consider additional review staff.")

        if not recommendations:
            recommendations.append("Risk levels appear normal.")

        return recommendations
