"""
Management command to generate USSD analytics reports and cleanup old data
"""

from django.core.management.base import BaseCommand
from django.utils import timezone
from datetime import timedelta
from payments.services.ussd_analytics_service import USSDAnalyticsService
import logging

logger = logging.getLogger(__name__)

class Command(BaseCommand):
    help = 'Generate USSD analytics reports and cleanup old data'

    def add_arguments(self, parser):
        parser.add_argument(
            '--days',
            type=int,
            default=30,
            help='Number of days to include in the report'
        )
        parser.add_argument(
            '--cleanup',
            action='store_true',
            help='Run cleanup of old analytics data'
        )
        parser.add_argument(
            '--cleanup-days',
            type=int,
            default=365,
            help='Keep analytics data for this many days during cleanup'
        )

    def handle(self, *args, **options):
        days = options['days']
        cleanup = options['cleanup']
        cleanup_days = options['cleanup_days']

        if cleanup:
            self.stdout.write('Running analytics cleanup...')
            deleted_count = USSDAnalyticsService.cleanup_old_analytics(cleanup_days)
            self.stdout.write(
                self.style.SUCCESS(f'Cleaned up {deleted_count} old analytics records')
            )
            return

        # Generate analytics report
        self.stdout.write(f'Generating USSD analytics report for the last {days} days...')

        end_date = timezone.now().date()
        start_date = end_date - timedelta(days=days)

        # Get period analytics
        period_analytics = USSDAnalyticsService.get_period_analytics(start_date, end_date)

        # Get provider performance
        provider_stats = USSDAnalyticsService.get_provider_performance()

        # Get user behavior insights
        user_insights = USSDAnalyticsService.get_user_behavior_insights(days)

        # Print report
        self.stdout.write('\n' + '='*60)
        self.stdout.write('SikaRemit USSD ANALYTICS REPORT')
        self.stdout.write('='*60)
        self.stdout.write(f'Period: {start_date} to {end_date}')
        self.stdout.write('='*60)

        # Session metrics
        session = period_analytics['session_metrics']
        self.stdout.write('\nSESSION METRICS:')
        self.stdout.write(f"  Total Sessions: {session['total_sessions']}")
        self.stdout.write(f"  Completed Sessions: {session['completed_sessions']}")
        self.stdout.write(f"  Failed Sessions: {session['failed_sessions']}")
        self.stdout.write(f"  Completion Rate: {session['completion_rate']:.1f}%")
        self.stdout.write(f"  Avg Session Duration: {session['avg_session_duration']:.1f}s")

        # Transaction metrics
        transaction = period_analytics['transaction_metrics']
        self.stdout.write('\nTRANSACTION METRICS:')
        self.stdout.write(f"  Total Transactions: {transaction['total_transactions']}")
        self.stdout.write(f"  Successful Transactions: {transaction['successful_transactions']}")
        self.stdout.write(f"  Failed Transactions: {transaction['failed_transactions']}")
        self.stdout.write(f"  Success Rate: {transaction['success_rate']:.1f}%")
        self.stdout.write(f"  Total Transaction Value: UGX {transaction['total_transaction_value']:,.0f}")
        self.stdout.write(f"  Avg Transaction Value: UGX {transaction['avg_transaction_value']:,.0f}")

        # Provider performance
        self.stdout.write('\nPROVIDER PERFORMANCE (Last 30 days):')
        for provider in provider_stats:
            self.stdout.write(f"\n  {provider['provider']} ({provider['short_code']}):")
            sess = provider['session_metrics']
            trans = provider['transaction_metrics']
            self.stdout.write(f"    Sessions: {sess['total_sessions']} ({sess['completion_rate']:.1f}% completion)")
            self.stdout.write(f"    Transactions: {trans['total_transactions']} ({trans['success_rate']:.1f}% success)")
            self.stdout.write(f"    Transaction Value: UGX {trans['total_value']:,.0f}")

        # User behavior insights
        self.stdout.write('\nUSER BEHAVIOR INSIGHTS:')
        if user_insights.get('popular_entry_points'):
            self.stdout.write('  Popular Entry Points:')
            for entry in user_insights['popular_entry_points'][:5]:
                self.stdout.write(f"    {entry['current_menu']}: {entry['count']} sessions")

        if user_insights.get('transaction_distribution'):
            self.stdout.write('  Transaction Types:')
            for txn_type in user_insights['transaction_distribution']:
                self.stdout.write(f"    {txn_type['transaction_type']}: {txn_type['count']} transactions (UGX {txn_type['total_value'] or 0:,.0f})")

        if user_insights.get('success_rates_by_type'):
            self.stdout.write('  Success Rates by Type:')
            for rate in user_insights['success_rates_by_type']:
                self.stdout.write(f"    {rate['type']}: {rate['success_rate']:.1f}% ({rate['successful']}/{rate['total']})")

        self.stdout.write('\n' + '='*60)
        self.stdout.write('Report generated successfully!')
        self.stdout.write('='*60)
