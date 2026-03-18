import requests
import logging
from django.conf import settings
from django.core.management.base import BaseCommand
from django.utils import timezone
from django.db import transaction
from apscheduler.schedulers.background import BackgroundScheduler
from apscheduler.triggers.interval import IntervalTrigger
import time
from ..models import Currency, ExchangeRate
from decimal import Decimal
from channels.layers import get_channel_layer
from asgiref.sync import async_to_sync

logger = logging.getLogger(__name__)

class ExchangeRateUpdateService:
    """
    Service for updating exchange rates from external APIs
    """

    # API endpoints for different providers
    API_PROVIDERS = {
        'exchangerate_api': {
            'url': 'https://api.exchangerate-api.com/v4/latest/{base}',
            'key_required': False,
            'rate_limit': 1000,  # requests per day
        },
        'fixer': {
            'url': 'http://data.fixer.io/api/latest?access_key={key}&base={base}',
            'key_required': True,
            'rate_limit': 1000,
        },
        'currencyapi': {
            'url': 'https://api.currencyapi.com/v3/latest?apikey={key}&base_currency={base}',
            'key_required': True,
            'rate_limit': 300,
        },
        'openexchangerates': {
            'url': 'https://openexchangerates.org/api/latest.json?app_id={key}&base={base}',
            'key_required': True,
            'rate_limit': 1000,
        }
    }

    def __init__(self):
        self.scheduler = None
        self.base_currency = None

    def initialize(self):
        """
        Initialize the service
        """
        try:
            self.base_currency = Currency.objects.get(is_base_currency=True)
        except Currency.DoesNotExist:
            logger.error("No base currency found. Please set is_base_currency=True for USD or another base currency.")
            return False

        # Initialize scheduler for periodic updates
        self.scheduler = BackgroundScheduler()
        return True

    def update_rates_from_api(self, provider: str = None) -> bool:
        """
        Update exchange rates from external API
        """
        if not self.base_currency:
            if not self.initialize():
                return False

        # Choose provider
        if not provider:
            provider = getattr(settings, 'EXCHANGE_RATE_PROVIDER', 'exchangerate_api')

        if provider not in self.API_PROVIDERS:
            logger.error(f"Unknown exchange rate provider: {provider}")
            return False

        provider_config = self.API_PROVIDERS[provider]

        try:
            # Build API URL
            api_key = getattr(settings, f'{provider.upper()}_API_KEY', None)
            if provider_config['key_required'] and not api_key:
                logger.warning(f"API key required for {provider} but not configured. Using fallback rates.")
                return self._update_fallback_rates()

            url = provider_config['url'].format(
                base=self.base_currency.code,
                key=api_key or ''
            )

            # Make API request
            response = requests.get(url, timeout=30)
            response.raise_for_status()

            data = response.json()

            # Parse rates based on provider
            rates = self._parse_rates_from_response(data, provider)
            if not rates:
                return False

            # Update database
            return self._update_database_rates(rates, provider)

        except requests.RequestException as e:
            logger.error(f"API request failed for {provider}: {str(e)}")
            return self._update_fallback_rates()
        except Exception as e:
            logger.error(f"Failed to update rates from {provider}: {str(e)}")
            return False

    def _parse_rates_from_response(self, data: dict, provider: str) -> dict:
        """
        Parse exchange rates from API response
        """
        try:
            if provider == 'exchangerate_api':
                return data.get('rates', {})
            elif provider == 'fixer':
                return data.get('rates', {})
            elif provider == 'currencyapi':
                return {k: v.get('value', 0) for k, v in data.get('data', {}).items()}
            elif provider == 'openexchangerates':
                return data.get('rates', {})
            else:
                return {}
        except Exception as e:
            logger.error(f"Failed to parse rates from {provider}: {str(e)}")
            return {}

    def _update_database_rates(self, rates: dict, source: str) -> bool:
        """
        Update exchange rates in database
        """
        try:
            with transaction.atomic():
                # Mark all existing rates as not latest
                ExchangeRate.objects.filter(
                    from_currency=self.base_currency,
                    is_latest=True
                ).update(is_latest=False)

                # Create new rates
                created_count = 0
                updated_rates = {}

                for currency_code, rate_value in rates.items():
                    try:
                        # Skip if same as base currency
                        if currency_code == self.base_currency.code:
                            continue

                        # Get target currency
                        target_currency = Currency.objects.get(
                            code=currency_code,
                            is_active=True,
                            exchange_api_supported=True
                        )

                        # Create rate record
                        ExchangeRate.objects.create(
                            from_currency=self.base_currency,
                            to_currency=target_currency,
                            rate=Decimal(str(rate_value)),
                            source=source,
                            metadata={'provider': source}
                        )

                        updated_rates[currency_code] = float(rate_value)
                        created_count += 1

                    except Currency.DoesNotExist:
                        continue
                    except Exception as e:
                        logger.warning(f"Failed to create rate for {currency_code}: {str(e)}")
                        continue

                # Broadcast update via WebSocket
                if created_count > 0:
                    self._broadcast_rate_update(updated_rates, source)

                logger.info(f"Updated {created_count} exchange rates from {source}")
                return created_count > 0

        except Exception as e:
            logger.error(f"Database update failed: {str(e)}")
            return False

    def _broadcast_rate_update(self, rates: dict, source: str):
        """
        Broadcast rate update to WebSocket clients
        """
        try:
            channel_layer = get_channel_layer()
            async_to_sync(channel_layer.group_send)(
                'rates_exchange_rates',
                {
                    'type': 'rates_update',
                    'rates_data': {
                        'rates': rates,
                        'timestamp': timezone.now().isoformat(),
                        'source': source
                    }
                }
            )
        except Exception as e:
            logger.error(f"Failed to broadcast rate update: {str(e)}")

    def notify_significant_rate_change(self, currency_code: str, old_rate: float, new_rate: float, threshold_percent: float = 5.0):
        """
        Notify users about significant exchange rate changes
        """
        try:
            from notifications.services import NotificationService
            from users.models import User
            
            # Calculate percentage change
            if old_rate == 0:
                return
            change_percent = abs((new_rate - old_rate) / old_rate * 100)
            
            if change_percent >= threshold_percent:
                direction = "increased" if new_rate > old_rate else "decreased"
                
                # Notify all active users who might be affected
                # (customers and merchants who use this currency)
                active_users = User.objects.filter(is_active=True)
                
                for user in active_users[:100]:  # Limit to prevent overload
                    NotificationService.create_notification(
                        user=user,
                        title=f"Exchange Rate Alert: {currency_code}",
                        message=f"The {currency_code} exchange rate has {direction} by {change_percent:.1f}%. New rate: {new_rate:.4f}",
                        level='info',
                        notification_type='exchange_rate_update',
                        metadata={
                            'currency_code': currency_code,
                            'old_rate': str(old_rate),
                            'new_rate': str(new_rate),
                            'change_percent': str(change_percent),
                            'direction': direction
                        }
                    )
                
                logger.info(f"Sent exchange rate change notifications for {currency_code} ({change_percent:.1f}% change)")
        except Exception as e:
            logger.error(f"Failed to send exchange rate notifications: {e}")

    def _update_fallback_rates(self) -> bool:
        """
        Update with fallback rates when API is unavailable
        Fallback rates removed - should rely on API or cached rates instead
        """
        logger.warning("Fallback rates not available - API rate update failed")
        return False

    def start_periodic_updates(self, interval_minutes: int = 60):
        """
        Start periodic rate updates
        """
        if not self.scheduler:
            self.initialize()

        if self.scheduler:
            self.scheduler.add_job(
                self.update_rates_from_api,
                trigger=IntervalTrigger(minutes=interval_minutes),
                id='exchange_rate_update',
                name='Update Exchange Rates',
                replace_existing=True
            )

            if not self.scheduler.running:
                self.scheduler.start()
                logger.info(f"Started periodic exchange rate updates every {interval_minutes} minutes")

    def stop_periodic_updates(self):
        """
        Stop periodic rate updates
        """
        if self.scheduler and self.scheduler.running:
            self.scheduler.shutdown()
            logger.info("Stopped periodic exchange rate updates")

    def get_rate_history(self, from_currency: Currency, to_currency: Currency,
                        days: int = 30) -> list:
        """
        Get historical exchange rates
        """
        since = timezone.now() - timezone.timedelta(days=days)

        return list(
            ExchangeRate.objects.filter(
                from_currency=from_currency,
                to_currency=to_currency,
                timestamp__gte=since
            ).order_by('timestamp').values(
                'rate', 'timestamp', 'source'
            )
        )

# Global service instance
rate_update_service = ExchangeRateUpdateService()

class Command(BaseCommand):
    """
    Django management command for updating exchange rates
    """
    help = 'Update exchange rates from external API'

    def add_arguments(self, parser):
        parser.add_argument(
            '--provider',
            type=str,
            choices=ExchangeRateUpdateService.API_PROVIDERS.keys(),
            help='Exchange rate provider to use'
        )
        parser.add_argument(
            '--interval',
            type=int,
            default=60,
            help='Update interval in minutes for continuous mode'
        )
        parser.add_argument(
            '--continuous',
            action='store_true',
            help='Run continuous updates'
        )

    def handle(self, *args, **options):
        service = ExchangeRateUpdateService()

        if options['continuous']:
            logger.info("Starting continuous exchange rate updates...")
            service.start_periodic_updates(options['interval'])

            try:
                # Keep running
                while True:
                    time.sleep(60)
            except KeyboardInterrupt:
                service.stop_periodic_updates()
                logger.info("Stopped continuous updates")
        else:
            # Single update
            success = service.update_rates_from_api(options.get('provider'))
            if success:
                self.stdout.write(
                    self.style.SUCCESS('Successfully updated exchange rates')
                )
            else:
                self.stdout.write(
                    self.style.ERROR('Failed to update exchange rates')
                )
