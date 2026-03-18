"""
Real-time utilities for sending WebSocket updates
"""
import json
import logging
from channels.layers import get_channel_layer
from asgiref.sync import async_to_sync
from typing import Dict, Any, Optional

logger = logging.getLogger(__name__)

channel_layer = get_channel_layer()

class RealtimeService:
    """Service for sending real-time updates to connected clients"""

    @staticmethod
    def send_balance_update(user_id: int, balance_data: Dict[str, Any]) -> None:
        """Send balance update to specific user"""
        try:
            group_name = f'balance_{user_id}'
            async_to_sync(channel_layer.group_send)(
                group_name,
                {
                    'type': 'balance_update',
                    'balance_data': balance_data
                }
            )
            logger.info(f"Sent balance update to user {user_id}")
        except Exception as e:
            logger.error(f"Failed to send balance update to user {user_id}: {e}")

    @staticmethod
    def send_transaction_update(user_id: int, transaction_data: Dict[str, Any]) -> None:
        """Send transaction update to specific user"""
        try:
            group_name = f'transactions_{user_id}'
            async_to_sync(channel_layer.group_send)(
                group_name,
                {
                    'type': 'transaction_update',
                    'transaction_data': transaction_data
                }
            )
            logger.info(f"Sent transaction update to user {user_id}")
        except Exception as e:
            logger.error(f"Failed to send transaction update to user {user_id}: {e}")

    @staticmethod
    def send_payment_status_update(user_id: int, payment_data: Dict[str, Any]) -> None:
        """Send payment status update to specific user"""
        try:
            group_name = f'payment_status_{user_id}'
            async_to_sync(channel_layer.group_send)(
                group_name,
                {
                    'type': 'payment_status_update',
                    'payment_data': payment_data
                }
            )
            logger.info(f"Sent payment status update to user {user_id}")
        except Exception as e:
            logger.error(f"Failed to send payment status update to user {user_id}: {e}")

    @staticmethod
    def send_notification(user_id: int, notification: Dict[str, Any]) -> None:
        """Send notification to specific user"""
        try:
            group_name = f'notifications_{user_id}'
            async_to_sync(channel_layer.group_send)(
                group_name,
                {
                    'type': 'notification_message',
                    'notification': notification
                }
            )
            logger.info(f"Sent notification to user {user_id}")
        except Exception as e:
            logger.error(f"Failed to send notification to user {user_id}: {e}")

    @staticmethod
    def send_bulk_notification(user_ids: list, notification: Dict[str, Any]) -> None:
        """Send notification to multiple users"""
        for user_id in user_ids:
            RealtimeService.send_notification(user_id, notification)
