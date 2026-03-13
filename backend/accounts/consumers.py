import json
from channels.generic.websocket import AsyncWebsocketConsumer
from channels.db import database_sync_to_async
from django.contrib.auth import get_user_model
from django.utils import timezone
import logging

logger = logging.getLogger(__name__)

User = get_user_model()


class ReportConsumer(AsyncWebsocketConsumer):
    """WebSocket consumer for real-time report updates"""
    
    async def connect(self):
        """Accept WebSocket connection"""
        self.user = self.scope["user"]
        
        if not self.user.is_authenticated:
            await self.close()
            return
        
        # Create group for this user
        self.group_name = f"reports_{self.user.id}"
        
        # Join group
        await self.channel_layer.group_add(
            self.group_name,
            self.channel_name
        )
        
        await self.accept()
        logger.info(f"User {self.user.email} connected to reports WebSocket")
    
    async def disconnect(self, close_code):
        """Handle WebSocket disconnection"""
        if hasattr(self, 'group_name'):
            await self.channel_layer.group_discard(
                self.group_name,
                self.channel_name
            )
        logger.info(f"User {self.user.email} disconnected from reports WebSocket")
    
    async def receive(self, text_data):
        """Handle incoming WebSocket messages"""
        try:
            data = json.loads(text_data)
            message_type = data.get('type')
            
            if message_type == 'subscribe':
                # Subscribe to specific report updates
                report_id = data.get('report_id')
                if report_id:
                    await self.handle_subscribe(report_id)
            elif message_type == 'unsubscribe':
                # Unsubscribe from report updates
                report_id = data.get('report_id')
                if report_id:
                    await self.handle_unsubscribe(report_id)
            elif message_type == 'ping':
                # Respond to ping
                await self.send(text_data=json.dumps({
                    'type': 'pong',
                    'timestamp': timezone.now().isoformat()
                }))
            else:
                await self.send(text_data=json.dumps({
                    'type': 'error',
                    'message': f'Unknown message type: {message_type}'
                }))
                
        except json.JSONDecodeError:
            await self.send(text_data=json.dumps({
                'type': 'error',
                'message': 'Invalid JSON format'
            }))
        except Exception as e:
            logger.error(f"Error handling WebSocket message: {str(e)}")
            await self.send(text_data=json.dumps({
                'type': 'error',
                'message': 'Internal server error'
            }))
    
    async def handle_subscribe(self, report_id):
        """Handle subscription to report updates"""
        # Add user to report-specific group
        report_group = f"report_{report_id}"
        await self.channel_layer.group_add(
            report_group,
            self.channel_name
        )
        
        await self.send(text_data=json.dumps({
            'type': 'subscribed',
            'report_id': report_id,
            'timestamp': timezone.now().isoformat()
        }))
    
    async def handle_unsubscribe(self, report_id):
        """Handle unsubscription from report updates"""
        # Remove user from report-specific group
        report_group = f"report_{report_id}"
        await self.channel_layer.group_discard(
            report_group,
            self.channel_name
        )
        
        await self.send(text_data=json.dumps({
            'type': 'unsubscribed',
            'report_id': report_id,
            'timestamp': timezone.now().isoformat()
        }))
    
    async def report_update(self, event):
        """Send report update to client"""
        await self.send(text_data=json.dumps({
            'type': 'report_update',
            'data': event['data'],
            'timestamp': timezone.now().isoformat()
        }))
    
    async def report_completed(self, event):
        """Send report completion notification"""
        await self.send(text_data=json.dumps({
            'type': 'report_completed',
            'data': event['data'],
            'timestamp': timezone.now().isoformat()
        }))
    
    async def report_failed(self, event):
        """Send report failure notification"""
        await self.send(text_data=json.dumps({
            'type': 'report_failed',
            'data': event['data'],
            'timestamp': timezone.now().isoformat()
        }))
    
    async def system_metrics(self, event):
        """Send system metrics update"""
        await self.send(text_data=json.dumps({
            'type': 'system_metrics',
            'data': event['data'],
            'timestamp': timezone.now().isoformat()
        }))


# Channel layer methods for sending updates
async def send_report_update(report_id, data):
    """Send report update to all subscribed users"""
    from channels.layers import get_channel_layer
    
    channel_layer = get_channel_layer()
    await channel_layer.group_send(
        f"report_{report_id}",
        {
            'type': 'report.update',
            'data': data
        }
    )


async def send_report_completed(report_id, data):
    """Send report completion notification"""
    from channels.layers import get_channel_layer
    
    channel_layer = get_channel_layer()
    await channel_layer.group_send(
        f"report_{report_id}",
        {
            'type': 'report.completed',
            'data': data
        }
    )


async def send_report_failed(report_id, data):
    """Send report failure notification"""
    from channels.layers import get_channel_layer
    
    channel_layer = get_channel_layer()
    await channel_layer.group_send(
        f"report_{report_id}",
        {
            'type': 'report.failed',
            'data': data
        }
    )


async def send_system_metrics(data):
    """Send system metrics to admin users"""
    from channels.layers import get_channel_layer
    
    channel_layer = get_channel_layer()
    await channel_layer.group_send(
        "system_metrics",
        {
            'type': 'system.metrics',
            'data': data
        }
    )
