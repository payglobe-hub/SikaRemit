"""
USSD Analytics Service for SikaRemit Ghana
Provides comprehensive analytics and reporting for USSD usage in Ghana
"""

import logging
from datetime import datetime, timedelta
from django.db.models import Count, Sum, Avg
from django.utils import timezone
from ..models import USSDSession, USSDTransaction, USSDAnalytics, USSDProvider
from typing import Dict, List, Any

logger = logging.getLogger(__name__)

class USSDAnalyticsService:
    """
    Service for collecting and analyzing USSD usage data
    """

    @staticmethod
    def record_session_analytics(session: USSDSession):
        """
        Record analytics data for a completed USSD session
        """
        try:
            # Calculate session duration
            if session.created_at and session.updated_at:
                duration = (session.updated_at - session.created_at).total_seconds()
            else:
                duration = 0

            # Get or create analytics record for today
            today = timezone.now().date()
            analytics, created = USSDAnalytics.objects.get_or_create(
                date=today,
                network=session.network or 'unknown',
                defaults={
                    'total_sessions': 0,
                    'completed_sessions': 0,
                    'failed_sessions': 0,
                    'avg_session_duration': 0,
                    'total_transactions': 0,
                    'successful_transactions': 0,
                    'failed_transactions': 0,
                    'total_transaction_value': 0,
                    'popular_menus': {},
                    'drop_off_points': {},
                    'avg_response_time': 0
                }
            )

            # Update session metrics
            analytics.total_sessions += 1
            if session.state == 'completed':
                analytics.completed_sessions += 1
            elif session.state == 'error':
                analytics.failed_sessions += 1

            # Update duration average
            if analytics.avg_session_duration == 0:
                analytics.avg_session_duration = duration
            else:
                total_sessions = analytics.total_sessions
                analytics.avg_session_duration = (
                    (analytics.avg_session_duration * (total_sessions - 1)) + duration
                ) / total_sessions

            # Track menu navigation
            current_menu = session.current_menu or 'main'
            if current_menu not in analytics.popular_menus:
                analytics.popular_menus[current_menu] = 0
            analytics.popular_menus[current_menu] += 1

            # Track drop-off points (incomplete sessions)
            if session.state != 'completed':
                drop_off_key = f"{current_menu}_{session.failed_attempts}"
                if drop_off_key not in analytics.drop_off_points:
                    analytics.drop_off_points[drop_off_key] = 0
                analytics.drop_off_points[drop_off_key] += 1

            analytics.save()

        except Exception as e:
            logger.error(f"Failed to record session analytics: {str(e)}")

    @staticmethod
    def record_transaction_analytics(transaction: USSDTransaction):
        """
        Record analytics data for a USSD transaction
        """
        try:
            # Get or create analytics record for today
            today = timezone.now().date()
            analytics, created = USSDAnalytics.objects.get_or_create(
                date=today,
                network=transaction.session.network or 'unknown',
                defaults={
                    'total_sessions': 0,
                    'completed_sessions': 0,
                    'failed_sessions': 0,
                    'avg_session_duration': 0,
                    'total_transactions': 0,
                    'successful_transactions': 0,
                    'failed_transactions': 0,
                    'total_transaction_value': 0,
                    'popular_menus': {},
                    'drop_off_points': {},
                    'avg_response_time': 0
                }
            )

            # Update transaction metrics
            analytics.total_transactions += 1
            if transaction.status == 'completed':
                analytics.successful_transactions += 1
                analytics.total_transaction_value += float(transaction.amount or 0)
            elif transaction.status == 'failed':
                analytics.failed_transactions += 1

            analytics.save()

        except Exception as e:
            logger.error(f"Failed to record transaction analytics: {str(e)}")

    @staticmethod
    def get_daily_analytics(date: datetime.date = None, network: str = None) -> Dict[str, Any]:
        """
        Get comprehensive analytics for a specific date
        """
        if not date:
            date = timezone.now().date()

        filters = {'date': date}
        if network:
            filters['network'] = network

        try:
            analytics = USSDAnalytics.objects.filter(**filters).first()
            if not analytics:
                return USSDAnalyticsService._get_empty_analytics()

            return {
                'date': date.isoformat(),
                'network': network or 'all',
                'session_metrics': {
                    'total_sessions': analytics.total_sessions,
                    'completed_sessions': analytics.completed_sessions,
                    'failed_sessions': analytics.failed_sessions,
                    'completion_rate': (
                        analytics.completed_sessions / analytics.total_sessions * 100
                        if analytics.total_sessions > 0 else 0
                    ),
                    'avg_session_duration': analytics.avg_session_duration
                },
                'transaction_metrics': {
                    'total_transactions': analytics.total_transactions,
                    'successful_transactions': analytics.successful_transactions,
                    'failed_transactions': analytics.failed_transactions,
                    'success_rate': (
                        analytics.successful_transactions / analytics.total_transactions * 100
                        if analytics.total_transactions > 0 else 0
                    ),
                    'total_transaction_value': float(analytics.total_transaction_value),
                    'avg_transaction_value': (
                        analytics.total_transaction_value / analytics.successful_transactions
                        if analytics.successful_transactions > 0 else 0
                    )
                },
                'user_engagement': {
                    'popular_menus': analytics.popular_menus,
                    'drop_off_points': analytics.drop_off_points
                },
                'performance': {
                    'avg_response_time': analytics.avg_response_time
                }
            }

        except Exception as e:
            logger.error(f"Failed to get daily analytics: {str(e)}")
            return USSDAnalyticsService._get_empty_analytics()

    @staticmethod
    def get_period_analytics(start_date: datetime.date, end_date: datetime.date, network: str = None) -> Dict[str, Any]:
        """
        Get analytics for a date range
        """
        filters = {'date__range': (start_date, end_date)}
        if network:
            filters['network'] = network

        try:
            analytics = USSDAnalytics.objects.filter(**filters).aggregate(
                total_sessions=Sum('total_sessions'),
                completed_sessions=Sum('completed_sessions'),
                failed_sessions=Sum('failed_sessions'),
                total_transactions=Sum('total_transactions'),
                successful_transactions=Sum('successful_transactions'),
                failed_transactions=Sum('failed_transactions'),
                total_transaction_value=Sum('total_transaction_value'),
                avg_session_duration=Avg('avg_session_duration'),
                avg_response_time=Avg('avg_response_time')
            )

            # Fill in None values with 0
            for key, value in analytics.items():
                if value is None:
                    analytics[key] = 0

            total_sessions = analytics['total_sessions'] or 0
            total_transactions = analytics['total_transactions'] or 0

            return {
                'period': {
                    'start_date': start_date.isoformat(),
                    'end_date': end_date.isoformat(),
                    'network': network or 'all'
                },
                'session_metrics': {
                    'total_sessions': total_sessions,
                    'completed_sessions': analytics['completed_sessions'],
                    'failed_sessions': analytics['failed_sessions'],
                    'completion_rate': (
                        analytics['completed_sessions'] / total_sessions * 100
                        if total_sessions > 0 else 0
                    ),
                    'avg_session_duration': float(analytics['avg_session_duration'] or 0)
                },
                'transaction_metrics': {
                    'total_transactions': total_transactions,
                    'successful_transactions': analytics['successful_transactions'],
                    'failed_transactions': analytics['failed_transactions'],
                    'success_rate': (
                        analytics['successful_transactions'] / total_transactions * 100
                        if total_transactions > 0 else 0
                    ),
                    'total_transaction_value': float(analytics['total_transaction_value'] or 0),
                    'avg_transaction_value': (
                        analytics['total_transaction_value'] / analytics['successful_transactions']
                        if analytics['successful_transactions'] and analytics['successful_transactions'] > 0 else 0
                    )
                },
                'performance': {
                    'avg_response_time': float(analytics['avg_response_time'] or 0)
                }
            }

        except Exception as e:
            logger.error(f"Failed to get period analytics: {str(e)}")
            return USSDAnalyticsService._get_empty_analytics()

    @staticmethod
    def get_provider_performance() -> List[Dict[str, Any]]:
        """
        Get performance metrics by USSD provider
        """
        try:
            providers = USSDProvider.objects.filter(is_active=True)

            provider_stats = []
            for provider in providers:
                # Get recent sessions for this provider
                recent_sessions = USSDSession.objects.filter(
                    network=provider.provider_type,
                    created_at__gte=timezone.now() - timedelta(days=30)
                ).aggregate(
                    total_sessions=Count('id'),
                    completed_sessions=Count('id', filter={'state': 'completed'}),
                    avg_duration=Avg('updated_at' - 'created_at')
                )

                # Get recent transactions
                recent_transactions = USSDTransaction.objects.filter(
                    session__network=provider.provider_type,
                    created_at__gte=timezone.now() - timedelta(days=30)
                ).aggregate(
                    total_transactions=Count('id'),
                    successful_transactions=Count('id', filter={'status': 'completed'}),
                    total_value=Sum('amount')
                )

                total_sessions = recent_sessions['total_sessions'] or 0
                total_transactions = recent_transactions['total_transactions'] or 0

                provider_stats.append({
                    'provider': provider.name,
                    'short_code': provider.short_code,
                    'session_metrics': {
                        'total_sessions': total_sessions,
                        'completed_sessions': recent_sessions['completed_sessions'] or 0,
                        'completion_rate': (
                            (recent_sessions['completed_sessions'] or 0) / total_sessions * 100
                            if total_sessions > 0 else 0
                        ),
                        'avg_session_duration': recent_sessions['avg_duration'].total_seconds() if recent_sessions['avg_duration'] else 0
                    },
                    'transaction_metrics': {
                        'total_transactions': total_transactions,
                        'successful_transactions': recent_transactions['successful_transactions'] or 0,
                        'success_rate': (
                            (recent_transactions['successful_transactions'] or 0) / total_transactions * 100
                            if total_transactions > 0 else 0
                        ),
                        'total_value': float(recent_transactions['total_value'] or 0)
                    }
                })

            return provider_stats

        except Exception as e:
            logger.error(f"Failed to get provider performance: {str(e)}")
            return []

    @staticmethod
    def get_user_behavior_insights(days: int = 30) -> Dict[str, Any]:
        """
        Get insights into user behavior patterns
        """
        try:
            start_date = timezone.now() - timedelta(days=days)

            # Most popular entry points
            popular_entry_menus = USSDSession.objects.filter(
                created_at__gte=start_date
            ).values('current_menu').annotate(
                count=Count('id')
            ).order_by('-count')[:5]

            # Transaction type distribution
            transaction_types = USSDTransaction.objects.filter(
                created_at__gte=start_date
            ).values('transaction_type').annotate(
                count=Count('id'),
                total_value=Sum('amount')
            ).order_by('-count')

            # Peak usage hours
            hourly_usage = USSDSession.objects.filter(
                created_at__gte=start_date
            ).extra(select={'hour': 'EXTRACT(hour FROM created_at)'}).values('hour').annotate(
                count=Count('id')
            ).order_by('hour')

            # Success rates by transaction type
            success_rates = USSDTransaction.objects.filter(
                created_at__gte=start_date
            ).values('transaction_type').annotate(
                total=Count('id'),
                successful=Count('id', filter={'status': 'completed'})
            )

            return {
                'popular_entry_points': list(popular_entry_menus),
                'transaction_distribution': list(transaction_types),
                'hourly_usage_pattern': list(hourly_usage),
                'success_rates_by_type': [
                    {
                        'type': item['transaction_type'],
                        'total': item['total'],
                        'successful': item['successful'],
                        'success_rate': (item['successful'] / item['total'] * 100) if item['total'] > 0 else 0
                    }
                    for item in success_rates
                ]
            }

        except Exception as e:
            logger.error(f"Failed to get user behavior insights: {str(e)}")
            return {}

    @staticmethod
    def _get_empty_analytics() -> Dict[str, Any]:
        """
        Return empty analytics structure
        """
        return {
            'date': None,
            'network': 'unknown',
            'session_metrics': {
                'total_sessions': 0,
                'completed_sessions': 0,
                'failed_sessions': 0,
                'completion_rate': 0,
                'avg_session_duration': 0
            },
            'transaction_metrics': {
                'total_transactions': 0,
                'successful_transactions': 0,
                'failed_transactions': 0,
                'success_rate': 0,
                'total_transaction_value': 0,
                'avg_transaction_value': 0
            },
            'user_engagement': {
                'popular_menus': {},
                'drop_off_points': {}
            },
            'performance': {
                'avg_response_time': 0
            }
        }

    @staticmethod
    def cleanup_old_analytics(days_to_keep: int = 365):
        """
        Clean up old analytics records to prevent database bloat
        """
        try:
            cutoff_date = timezone.now().date() - timedelta(days=days_to_keep)
            deleted_count = USSDAnalytics.objects.filter(date__lt=cutoff_date).delete()
            logger.info(f"Cleaned up {deleted_count[0]} old USSD analytics records")
            return deleted_count[0]
        except Exception as e:
            logger.error(f"Failed to cleanup old analytics: {str(e)}")
            return 0
