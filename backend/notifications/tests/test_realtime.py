"""
Comprehensive tests for real-time WebSocket functionality
"""
import json
import pytest
from django.test import TestCase
from django.contrib.auth import get_user_model
from channels.testing import WebsocketCommunicator
from channels.layers import get_channel_layer
from asgiref.sync import async_to_sync
from unittest.mock import patch, MagicMock

from notifications.consumers import BalanceConsumer, TransactionConsumer, PaymentStatusConsumer, NotificationConsumer
from notifications.realtime import RealtimeService
from accounts.models import Customer
from payments.models.transaction import Transaction

User = get_user_model()

class TestRealtimeWebSocketConsumers(TestCase):
    """Test WebSocket consumers for real-time functionality"""

    def setUp(self):
        self.user = User.objects.create_user(
            username='testuser',
            email='test@example.com',
            password='testpass123',
            user_type=3  # customer
        )
        self.customer = Customer.objects.create(
            user=self.user,
            available_balance=1000.00,
            pending_balance=50.00,
            currency='USD'
        )

    def tearDown(self):
        self.customer.delete()
        self.user.delete()

    async def test_balance_consumer_connection(self):
        """Test balance consumer connects and accepts authenticated users"""
        communicator = WebsocketCommunicator(
            BalanceConsumer.as_asgi(),
            '/ws/balance/',
            headers=[(b'cookie', f'sessionid=test; user_id={self.user.id}'.encode())]
        )
        communicator.scope['user'] = self.user

        connected, _ = await communicator.connect()
        self.assertTrue(connected)

        await communicator.disconnect()

    async def test_balance_consumer_rejects_anonymous_users(self):
        """Test balance consumer rejects anonymous users"""
        from django.contrib.auth.models import AnonymousUser

        communicator = WebsocketCommunicator(
            BalanceConsumer.as_asgi(),
            '/ws/balance/'
        )
        communicator.scope['user'] = AnonymousUser()

        connected, _ = await communicator.connect()
        self.assertFalse(connected)

    async def test_balance_consumer_receives_updates(self):
        """Test balance consumer receives and forwards balance updates"""
        communicator = WebsocketCommunicator(
            BalanceConsumer.as_asgi(),
            '/ws/balance/'
        )
        communicator.scope['user'] = self.user

        connected, _ = await communicator.connect()
        self.assertTrue(connected)

        # Send balance update via channel layer
        channel_layer = get_channel_layer()
        await channel_layer.group_send(
            f'balance_{self.user.id}',
            {
                'type': 'balance_update',
                'balance_data': {
                    'available': '1500.00',
                    'pending': '100.00',
                    'currency': 'USD',
                    'last_updated': '2024-01-01T00:00:00Z',
                    'change': {
                        'available_change': '500.00',
                        'pending_change': '50.00'
                    }
                }
            }
        )

        # Receive the message
        response = await communicator.receive_json_from()
        expected_response = {
            'type': 'balance_update',
            'data': {
                'available': '1500.00',
                'pending': '100.00',
                'currency': 'USD',
                'last_updated': '2024-01-01T00:00:00Z',
                'change': {
                    'available_change': '500.00',
                    'pending_change': '50.00'
                }
            }
        }
        self.assertEqual(response, expected_response)

        await communicator.disconnect()

    async def test_transaction_consumer_connection(self):
        """Test transaction consumer connects properly"""
        communicator = WebsocketCommunicator(
            TransactionConsumer.as_asgi(),
            '/ws/transactions/'
        )
        communicator.scope['user'] = self.user

        connected, _ = await communicator.connect()
        self.assertTrue(connected)

        await communicator.disconnect()

    async def test_transaction_consumer_receives_updates(self):
        """Test transaction consumer receives transaction updates"""
        communicator = WebsocketCommunicator(
            TransactionConsumer.as_asgi(),
            '/ws/transactions/'
        )
        communicator.scope['user'] = self.user

        connected, _ = await communicator.connect()
        self.assertTrue(connected)

        # Send transaction update
        channel_layer = get_channel_layer()
        await channel_layer.group_send(
            f'transactions_{self.user.id}',
            {
                'type': 'transaction_update',
                'transaction_data': {
                    'id': 123,
                    'amount': '50.00',
                    'status': 'completed',
                    'type': 'debit'
                }
            }
        )

        response = await communicator.receive_json_from()
        expected_response = {
            'type': 'transaction_update',
            'data': {
                'id': 123,
                'amount': '50.00',
                'status': 'completed',
                'type': 'debit'
            }
        }
        self.assertEqual(response, expected_response)

        await communicator.disconnect()

    async def test_payment_status_consumer_connection(self):
        """Test payment status consumer connects properly"""
        communicator = WebsocketCommunicator(
            PaymentStatusConsumer.as_asgi(),
            '/ws/payment-status/'
        )
        communicator.scope['user'] = self.user

        connected, _ = await communicator.connect()
        self.assertTrue(connected)

        await communicator.disconnect()

    async def test_payment_status_consumer_receives_updates(self):
        """Test payment status consumer receives payment status updates"""
        communicator = WebsocketCommunicator(
            PaymentStatusConsumer.as_asgi(),
            '/ws/payment-status/'
        )
        communicator.scope['user'] = self.user

        connected, _ = await communicator.connect()
        self.assertTrue(connected)

        # Send payment status update
        channel_layer = get_channel_layer()
        await channel_layer.group_send(
            f'payment_status_{self.user.id}',
            {
                'type': 'payment_status_update',
                'payment_data': {
                    'id': 456,
                    'status': 'completed',
                    'amount': '100.00'
                }
            }
        )

        response = await communicator.receive_json_from()
        expected_response = {
            'type': 'payment_status_update',
            'data': {
                'id': 456,
                'status': 'completed',
                'amount': '100.00'
            }
        }
        self.assertEqual(response, expected_response)

        await communicator.disconnect()

    async def test_notification_consumer_connection(self):
        """Test notification consumer connects properly"""
        communicator = WebsocketCommunicator(
            NotificationConsumer.as_asgi(),
            '/ws/notifications/'
        )
        communicator.scope['user'] = self.user

        connected, _ = await communicator.connect()
        self.assertTrue(connected)

        await communicator.disconnect()

    async def test_notification_consumer_receives_messages(self):
        """Test notification consumer receives notification messages"""
        communicator = WebsocketCommunicator(
            NotificationConsumer.as_asgi(),
            '/ws/notifications/'
        )
        communicator.scope['user'] = self.user

        connected, _ = await communicator.connect()
        self.assertTrue(connected)

        # Send notification
        channel_layer = get_channel_layer()
        await channel_layer.group_send(
            f'notifications_{self.user.id}',
            {
                'type': 'notification_message',
                'notification': {
                    'id': '789',
                    'title': 'Payment Received',
                    'message': 'You received $50.00',
                    'type': 'money_received'
                }
            }
        )

        response = await communicator.receive_json_from()
        expected_response = {
            'id': '789',
            'title': 'Payment Received',
            'message': 'You received $50.00',
            'type': 'money_received'
        }
        self.assertEqual(response, expected_response)

        await communicator.disconnect()

class TestRealtimeService(TestCase):
    """Test the RealtimeService utility functions"""

    def setUp(self):
        self.user = User.objects.create_user(
            username='testuser2',
            email='test2@example.com',
            password='testpass123',
            user_type=3
        )

    def tearDown(self):
        self.user.delete()

    @patch('notifications.realtime.get_channel_layer')
    def test_send_balance_update(self, mock_get_channel_layer):
        """Test sending balance updates via RealtimeService"""
        mock_channel_layer = MagicMock()
        mock_get_channel_layer.return_value = mock_channel_layer

        balance_data = {
            'available': '1000.00',
            'pending': '50.00',
            'currency': 'USD'
        }

        RealtimeService.send_balance_update(self.user.id, balance_data)

        mock_channel_layer.group_send.assert_called_once_with(
            f'balance_{self.user.id}',
            {
                'type': 'balance_update',
                'balance_data': balance_data
            }
        )

    @patch('notifications.realtime.get_channel_layer')
    def test_send_transaction_update(self, mock_get_channel_layer):
        """Test sending transaction updates via RealtimeService"""
        mock_channel_layer = MagicMock()
        mock_get_channel_layer.return_value = mock_channel_layer

        transaction_data = {
            'id': 123,
            'amount': '50.00',
            'status': 'completed'
        }

        RealtimeService.send_transaction_update(self.user.id, transaction_data)

        mock_channel_layer.group_send.assert_called_once_with(
            f'transactions_{self.user.id}',
            {
                'type': 'transaction_update',
                'transaction_data': transaction_data
            }
        )

    @patch('notifications.realtime.get_channel_layer')
    def test_send_payment_status_update(self, mock_get_channel_layer):
        """Test sending payment status updates via RealtimeService"""
        mock_channel_layer = MagicMock()
        mock_get_channel_layer.return_value = mock_channel_layer

        payment_data = {
            'id': 456,
            'status': 'completed',
            'amount': '100.00'
        }

        RealtimeService.send_payment_status_update(self.user.id, payment_data)

        mock_channel_layer.group_send.assert_called_once_with(
            f'payment_status_{self.user.id}',
            {
                'type': 'payment_status_update',
                'payment_data': payment_data
            }
        )

    @patch('notifications.realtime.get_channel_layer')
    def test_send_notification(self, mock_get_channel_layer):
        """Test sending notifications via RealtimeService"""
        mock_channel_layer = MagicMock()
        mock_get_channel_layer.return_value = mock_channel_layer

        notification = {
            'id': '789',
            'title': 'Test Notification',
            'message': 'Test message'
        }

        RealtimeService.send_notification(self.user.id, notification)

        mock_channel_layer.group_send.assert_called_once_with(
            f'notifications_{self.user.id}',
            {
                'type': 'notification_message',
                'notification': notification
            }
        )

    @patch('notifications.realtime.get_channel_layer')
    def test_send_bulk_notification(self, mock_get_channel_layer):
        """Test sending bulk notifications"""
        mock_channel_layer = MagicMock()
        mock_get_channel_layer.return_value = mock_channel_layer

        user_ids = [1, 2, 3]
        notification = {
            'title': 'Bulk Notification',
            'message': 'Message for all users'
        }

        RealtimeService.send_bulk_notification(user_ids, notification)

        self.assertEqual(mock_channel_layer.group_send.call_count, 3)
        for user_id in user_ids:
            mock_channel_layer.group_send.assert_any_call(
                f'notifications_{user_id}',
                {
                    'type': 'notification_message',
                    'notification': notification
                }
            )

class TestRealtimeSignals(TestCase):
    """Test that real-time signals are triggered correctly"""

    def setUp(self):
        self.user = User.objects.create_user(
            username='testuser3',
            email='test3@example.com',
            password='testpass123',
            user_type=3
        )
        self.customer = Customer.objects.create(
            user=self.user,
            available_balance=1000.00,
            pending_balance=50.00,
            currency='USD'
        )

    def tearDown(self):
        Transaction.objects.filter(customer=self.customer).delete()
        self.customer.delete()
        self.user.delete()

    @patch('notifications.signals.RealtimeService.send_balance_update')
    def test_balance_update_signal_on_customer_save(self, mock_send_balance_update):
        """Test that balance updates are sent when customer balance changes"""
        # Update customer balance
        self.customer.available_balance = 1500.00
        self.customer.save()

        # Verify real-time update was sent
        mock_send_balance_update.assert_called_once_with(
            self.user.id,
            {
                'available': '1500.00',
                'pending': '50.00',
                'currency': 'USD',
                'last_updated': None,
                'change': {
                    'available_change': '500.00',
                    'pending_change': '0.00'
                }
            }
        )

    @patch('notifications.signals.RealtimeService.send_transaction_update')
    @patch('notifications.signals.NotificationService.create_notification')
    def test_transaction_signals(self, mock_create_notification, mock_send_transaction_update):
        """Test that transaction signals trigger real-time updates"""
        from payments.models.merchant import Merchant

        # Create a merchant for the transaction
        merchant_user = User.objects.create_user(
            username='merchant',
            email='merchant@example.com',
            password='merchant123',
            user_type=2  # merchant
        )
        merchant = Merchant.objects.create(
            user=merchant_user,
            business_name='Test Merchant'
        )

        # Create a transaction
        transaction = Transaction.objects.create(
            customer=self.customer,
            merchant=merchant,
            amount=50.00,
            currency='USD',
            status='completed'
        )

        # Verify transaction update was sent
        mock_send_transaction_update.assert_called_once_with(
            self.user.id,
            {
                'id': transaction.id,
                'amount': '50.00',
                'currency': 'USD',
                'status': 'completed',
                'created_at': transaction.created_at.isoformat(),
                'merchant': 'Test Merchant',
                'type': 'debit'
            }
        )

        # Cleanup
        transaction.delete()
        merchant.delete()
        merchant_user.delete()

    @patch('notifications.signals.RealtimeService.send_payment_status_update')
    def test_payment_status_signal(self, mock_send_payment_status_update):
        """Test that payment status updates are sent"""
        from payments.models.merchant import Merchant

        # Create a merchant
        merchant_user = User.objects.create_user(
            username='merchant2',
            email='merchant2@example.com',
            password='merchant123',
            user_type=2
        )
        merchant = Merchant.objects.create(
            user=merchant_user,
            business_name='Test Merchant 2'
        )

        # Create transaction
        transaction = Transaction.objects.create(
            customer=self.customer,
            merchant=merchant,
            amount=100.00,
            currency='USD',
            status='processing'
        )

        # Update status
        transaction.status = 'completed'
        transaction.save()

        # Verify payment status update was sent
        mock_send_payment_status_update.assert_called_once_with(
            self.user.id,
            {
                'id': transaction.id,
                'status': 'completed',
                'amount': '100.00',
                'currency': 'USD',
                'created_at': transaction.created_at.isoformat(),
                'updated_at': transaction.updated_at.isoformat(),
                'merchant': 'Test Merchant 2'
            }
        )

        # Cleanup
        transaction.delete()
        merchant.delete()
        merchant_user.delete()
