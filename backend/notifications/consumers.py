import json
import logging
from channels.generic.websocket import AsyncWebsocketConsumer
from channels.db import database_sync_to_async
from django.contrib.auth.models import AnonymousUser
from decimal import Decimal

logger = logging.getLogger(__name__)

class NotificationConsumer(AsyncWebsocketConsumer):
    async def connect(self):
        if self.scope['user'] == AnonymousUser():
            await self.close()
            return

        self.user = self.scope['user']
        self.group_name = f'notifications_{self.user.id}'

        await self.channel_layer.group_add(
            self.group_name,
            self.channel_name
        )

        await self.accept()

    async def disconnect(self, close_code):
        if hasattr(self, 'group_name'):
            await self.channel_layer.group_discard(
                self.group_name,
                self.channel_name
            )

    async def notification_message(self, event):
        await self.send(text_data=json.dumps(event['notification']))

class BalanceConsumer(AsyncWebsocketConsumer):
    """Real-time balance updates for customers"""

    async def connect(self):
        if self.scope['user'] == AnonymousUser():
            await self.close()
            return

        self.user = self.scope['user']
        self.group_name = f'balance_{self.user.id}'

        await self.channel_layer.group_add(
            self.group_name,
            self.channel_name
        )

        await self.accept()
        logger.info(f"Balance consumer connected for user {self.user.id}")

    async def disconnect(self, close_code):
        if hasattr(self, 'group_name'):
            await self.channel_layer.group_discard(
                self.group_name,
                self.channel_name
            )

    async def balance_update(self, event):
        """Send balance update to connected client"""
        await self.send(text_data=json.dumps({
            'type': 'balance_update',
            'data': event['balance_data']
        }))

class TransactionConsumer(AsyncWebsocketConsumer):
    """Real-time transaction updates for customers"""

    async def connect(self):
        if self.scope['user'] == AnonymousUser():
            await self.close()
            return

        self.user = self.scope['user']
        self.group_name = f'transactions_{self.user.id}'

        await self.channel_layer.group_add(
            self.group_name,
            self.channel_name
        )

        await self.accept()
        logger.info(f"Transaction consumer connected for user {self.user.id}")

    async def disconnect(self, close_code):
        if hasattr(self, 'group_name'):
            await self.channel_layer.group_discard(
                self.group_name,
                self.channel_name
            )

    async def transaction_update(self, event):
        """Send transaction update to connected client"""
        await self.send(text_data=json.dumps({
            'type': 'transaction_update',
            'data': event['transaction_data']
        }))

class PaymentStatusConsumer(AsyncWebsocketConsumer):
    """Real-time payment status updates"""

    async def connect(self):
        if self.scope['user'] == AnonymousUser():
            await self.close()
            return

        self.user = self.scope['user']
        self.group_name = f'payment_status_{self.user.id}'

        await self.channel_layer.group_add(
            self.group_name,
            self.channel_name
        )

        await self.accept()
        logger.info(f"Payment status consumer connected for user {self.user.id}")

    async def disconnect(self, close_code):
        if hasattr(self, 'group_name'):
            await self.channel_layer.group_discard(
                self.group_name,
                self.channel_name
            )

    async def payment_status_update(self, event):
        """Send payment status update to connected client"""
        await self.send(text_data=json.dumps({
            'type': 'payment_status_update',
            'data': event['payment_data']
        }))

class DashboardConsumer(AsyncWebsocketConsumer):
    """Real-time dashboard updates for customers - aggregates balance, transactions, and payment status"""

    async def connect(self):
        if self.scope['user'] == AnonymousUser():
            await self.close()
            return

        self.user = self.scope['user']
        self.group_name = f'dashboard_{self.user.id}'

        await self.channel_layer.group_add(
            self.group_name,
            self.channel_name
        )

        await self.accept()
        logger.info(f"Dashboard consumer connected for user {self.user.id}")

    async def disconnect(self, close_code):
        if hasattr(self, 'group_name'):
            await self.channel_layer.group_discard(
                self.group_name,
                self.channel_name
            )

    async def balance_update(self, event):
        """Send balance update to dashboard"""
        await self.send(text_data=json.dumps({
            'type': 'balance_update',
            'data': event['balance_data'],
            'timestamp': event.get('timestamp')
        }))

    async def transaction_update(self, event):
        """Send transaction update to dashboard"""
        await self.send(text_data=json.dumps({
            'type': 'transaction_update',
            'data': event['transaction_data'],
            'timestamp': event.get('timestamp')
        }))

    async def payment_status_update(self, event):
        """Send payment status update to dashboard"""
        await self.send(text_data=json.dumps({
            'type': 'payment_status_update',
            'data': event['payment_data'],
            'timestamp': event.get('timestamp')
        }))
