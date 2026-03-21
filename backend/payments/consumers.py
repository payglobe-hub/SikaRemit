import json
import logging
from channels.generic.websocket import AsyncWebsocketConsumer
from django.core.cache import cache
from django.contrib.auth import get_user_model
from ..services.currency_service import CurrencyService
from ..models import Currency

logger = logging.getLogger(__name__)

User = get_user_model()

class ExchangeRateConsumer(AsyncWebsocketConsumer):
    """
    WebSocket consumer for real-time exchange rate updates
    """

    async def connect(self):
        """Handle WebSocket connection"""
        self.room_name = 'exchange_rates'
        self.room_group_name = f'rates_{self.room_name}'

        # Join room group
        await self.channel_layer.group_add(
            self.room_group_name,
            self.channel_name
        )

        await self.accept()

        # Send initial rates
        await self.send_initial_rates()

    async def disconnect(self, close_code):
        """Handle WebSocket disconnection"""
        # Leave room group
        await self.channel_layer.group_discard(
            self.room_group_name,
            self.channel_name
        )

    async def receive(self, text_data):
        """Handle incoming WebSocket messages"""
        try:
            data = json.loads(text_data)
            message_type = data.get('type')

            if message_type == 'subscribe_currency':
                await self.handle_currency_subscription(data)
            elif message_type == 'unsubscribe_currency':
                await self.handle_currency_unsubscription(data)
            elif message_type == 'request_rates':
                await self.send_initial_rates()

        except json.JSONDecodeError:
            await self.send_error('Invalid JSON format')
        except Exception as e:
            logger.error(f"WebSocket receive error: {str(e)}")
            await self.send_error('Internal server error')

    async def handle_currency_subscription(self, data):
        """Handle currency subscription request"""
        currency_code = data.get('currency')
        if currency_code:
            # Add to user's subscribed currencies
            # In a real implementation, you'd store this per user
            await self.send_success(f'Subscribed to {currency_code} rates')

    async def handle_currency_unsubscription(self, data):
        """Handle currency unsubscription request"""
        currency_code = data.get('currency')
        if currency_code:
            await self.send_success(f'Unsubscribed from {currency_code} rates')

    async def send_initial_rates(self):
        """Send current exchange rates to client"""
        try:
            # Get base currency
            base_currency = await self.get_base_currency()
            if not base_currency:
                await self.send_error('No base currency configured')
                return

            # Get all active currencies
            currencies = await self.get_active_currencies()

            # Build rates data
            rates_data = {
                'type': 'rates_update',
                'base_currency': base_currency.code,
                'rates': {},
                'timestamp': self.get_current_timestamp()
            }

            # Get rates for each currency
            for currency in currencies:
                if currency.code != base_currency.code:
                    rate = CurrencyService.get_exchange_rate(base_currency, currency, use_cache=True)
                    if rate:
                        rates_data['rates'][currency.code] = float(rate)

            # Send rates
            await self.send(text_data=json.dumps(rates_data))

        except Exception as e:
            logger.error(f"Error sending initial rates: {str(e)}")
            await self.send_error('Failed to load exchange rates')

    async def rates_update(self, event):
        """Handle rate update broadcast from other parts of the system"""
        rates_data = event['rates_data']

        # Send update to WebSocket
        await self.send(text_data=json.dumps({
            'type': 'rates_update',
            'rates': rates_data.get('rates', {}),
            'timestamp': rates_data.get('timestamp'),
            'source': rates_data.get('source', 'api')
        }))

    async def send_error(self, message):
        """Send error message to client"""
        await self.send(text_data=json.dumps({
            'type': 'error',
            'message': message
        }))

    async def send_success(self, message):
        """Send success message to client"""
        await self.send(text_data=json.dumps({
            'type': 'success',
            'message': message
        }))

    @staticmethod
    async def get_base_currency():
        """Get base currency asynchronously"""
        try:
            return await Currency.objects.aget(is_base_currency=True)
        except Currency.DoesNotExist:
            return None

    @staticmethod
    async def get_active_currencies():
        """Get active currencies asynchronously"""
        return [currency async for currency in Currency.objects.filter(is_active=True)]

    @staticmethod
    def get_current_timestamp():
        """Get current timestamp"""
        from django.utils import timezone
        return timezone.now().isoformat()

class CurrencyNotificationConsumer(AsyncWebsocketConsumer):
    """
    WebSocket consumer for currency-related notifications
    """

    async def connect(self):
        """Handle WebSocket connection"""
        # Get user from scope
        self.user = self.scope.get('user')
        if not self.user or not self.user.is_authenticated:
            await self.close()
            return

        self.room_name = f'user_{self.user.id}_currency'
        self.room_group_name = f'currency_{self.room_name}'

        # Join user-specific room
        await self.channel_layer.group_add(
            self.room_group_name,
            self.channel_name
        )

        await self.accept()

    async def disconnect(self, close_code):
        """Handle WebSocket disconnection"""
        await self.channel_layer.group_discard(
            self.room_group_name,
            self.channel_name
        )

    async def receive(self, text_data):
        """Handle incoming messages"""
        try:
            data = json.loads(text_data)
            message_type = data.get('type')

            if message_type == 'get_wallet_balance':
                await self.send_wallet_balance()
            elif message_type == 'get_preferences':
                await self.send_preferences()

        except json.JSONDecodeError:
            await self.send_error('Invalid JSON format')

    async def send_wallet_balance(self):
        """Send current wallet balance"""
        from ..services.currency_service import WalletService, CurrencyPreferenceService

        try:
            # Get wallet balances
            balances = WalletService.get_all_wallet_balances(self.user)

            # Get user preferences for formatting
            preferences = CurrencyPreferenceService.get_user_preferences(self.user)

            # Format balances
            formatted_balances = []
            for balance in balances:
                formatted_balances.append({
                    'currency': balance.currency.code,
                    'available': CurrencyService.format_amount(
                        balance.available_balance,
                        balance.currency,
                        preferences
                    ),
                    'pending': CurrencyService.format_amount(
                        balance.pending_balance,
                        balance.currency,
                        preferences
                    ),
                    'total': CurrencyService.format_amount(
                        balance.total_balance,
                        balance.currency,
                        preferences
                    )
                })

            await self.send(text_data=json.dumps({
                'type': 'wallet_balance',
                'balances': formatted_balances
            }))

        except Exception as e:
            logger.error(f"Error sending wallet balance: {str(e)}")
            await self.send_error('Failed to load wallet balance')

    async def send_preferences(self):
        """Send user currency preferences"""
        from ..services.currency_service import CurrencyPreferenceService

        try:
            preferences = CurrencyPreferenceService.get_user_preferences(self.user)

            await self.send(text_data=json.dumps({
                'type': 'preferences',
                'preferences': {
                    'base_currency': preferences.base_currency.code,
                    'display_currency': preferences.display_currency.code,
                    'show_symbol': preferences.show_symbol,
                    'show_code': preferences.show_code,
                    'decimal_places': preferences.decimal_places,
                    'auto_update_rates': preferences.auto_update_rates
                }
            }))

        except Exception as e:
            logger.error(f"Error sending preferences: {str(e)}")
            await self.send_error('Failed to load preferences')

    async def wallet_update(self, event):
        """Handle wallet update notifications"""
        await self.send_wallet_balance()

    async def preference_update(self, event):
        """Handle preference update notifications"""
        await self.send_preferences()

    async def send_error(self, message):
        """Send error message"""
        await self.send(text_data=json.dumps({
            'type': 'error',
            'message': message
        }))

class NotificationConsumer(AsyncWebsocketConsumer):
    async def connect(self):
        if self.scope["user"].is_anonymous:
            await self.close()
        else:
            self.user = self.scope["user"]
            self.notification_group_name = f"notifications_{self.user.id}"
            
            # Join notification group
            await self.channel_layer.group_add(
                self.notification_group_name,
                self.channel_name
            )
            
            await self.accept()

    async def disconnect(self, close_code):
        if hasattr(self, 'notification_group_name'):
            await self.channel_layer.group_discard(
                self.notification_group_name,
                self.channel_name
            )

    async def notification_update(self, event):
        # Send notification update to client
        await self.send(text_data=json.dumps({
            "type": "notification",
            "notification_id": event["notification_id"],
            "is_read": event["is_read"]
        }))

    async def notification_new(self, event):
        # Send new notification to client
        await self.send(text_data=json.dumps({
            "type": "notification",
            "notification": event["notification"],
            "unread_count": event["unread_count"]
        }))
