from rest_framework import viewsets, status
from rest_framework.decorators import action
from rest_framework.response import Response
from users.permissions import IsAdminUser, IsSuperAdmin
from rest_framework import serializers
from django.db.models import Count, Sum
from django.utils import timezone
import requests
import hashlib
import hmac
import json
import uuid

from ..models.webhook import Webhook, WebhookEvent

class WebhookSerializer(serializers.ModelSerializer):
    class Meta:
        model = Webhook
        fields = ['id', 'url', 'events', 'is_active', 'secret', 'created_at', 
                  'updated_at', 'success_count', 'failure_count', 'last_triggered']
        read_only_fields = ['id', 'created_at', 'updated_at', 'success_count', 
                           'failure_count', 'last_triggered']
    
    def create(self, validated_data):
        # Generate a secret if not provided
        if not validated_data.get('secret'):
            validated_data['secret'] = str(uuid.uuid4())
        return super().create(validated_data)

class WebhookEventSerializer(serializers.ModelSerializer):
    webhook_id = serializers.IntegerField(source='webhook.id', read_only=True)
    
    class Meta:
        model = WebhookEvent
        fields = ['id', 'webhook_id', 'event_type', 'status', 'payload', 
                  'response_status', 'error_message', 'retry_count', 
                  'created_at', 'delivered_at']

class WebhookViewSet(viewsets.ModelViewSet):
    """Admin viewset for managing webhooks"""
    queryset = Webhook.objects.all()
    serializer_class = WebhookSerializer
    permission_classes = [IsSuperAdmin]  # Only super admin can manage webhooks
    
    @action(detail=False, methods=['get'])
    def stats(self, request):
        """Get webhook statistics"""
        total_webhooks = Webhook.objects.count()
        active_webhooks = Webhook.objects.filter(is_active=True).count()
        
        total_events = WebhookEvent.objects.count()
        delivered_events = WebhookEvent.objects.filter(status='delivered').count()
        failed_events = WebhookEvent.objects.filter(status='failed').count()
        pending_events = WebhookEvent.objects.filter(status='pending').count()
        
        # Calculate success rate
        success_rate = (delivered_events / total_events * 100) if total_events > 0 else 0
        
        return Response({
            'total_webhooks': total_webhooks,
            'active_webhooks': active_webhooks,
            'total_events': total_events,
            'delivered_events': delivered_events,
            'failed_events': failed_events,
            'pending_events': pending_events,
            'success_rate': round(success_rate, 2)
        })
    
    @action(detail=True, methods=['post'])
    def test(self, request, pk=None):
        """Test a webhook by sending a test payload"""
        webhook = self.get_object()
        
        test_payload = {
            'event': 'test',
            'timestamp': timezone.now().isoformat(),
            'data': {
                'message': 'This is a test webhook from SikaRemit'
            }
        }
        
        try:
            # Create signature
            payload_str = json.dumps(test_payload)
            signature = hmac.new(
                webhook.secret.encode(),
                payload_str.encode(),
                hashlib.sha256
            ).hexdigest()
            
            headers = {
                'Content-Type': 'application/json',
                'X-Webhook-Signature': signature
            }
            
            response = requests.post(
                webhook.url,
                json=test_payload,
                headers=headers,
                timeout=10
            )
            
            # Log the event
            WebhookEvent.objects.create(
                webhook=webhook,
                event_type='test',
                status='delivered' if response.ok else 'failed',
                payload=test_payload,
                response_status=response.status_code,
                error_message='' if response.ok else response.text[:500],
                delivered_at=timezone.now() if response.ok else None
            )
            
            if response.ok:
                webhook.success_count += 1
            else:
                webhook.failure_count += 1
            webhook.last_triggered = timezone.now()
            webhook.save()
            
            return Response({
                'success': response.ok,
                'status_code': response.status_code,
                'message': 'Test webhook sent successfully' if response.ok else 'Webhook delivery failed'
            })
            
        except requests.exceptions.RequestException as e:
            WebhookEvent.objects.create(
                webhook=webhook,
                event_type='test',
                status='failed',
                payload=test_payload,
                error_message=str(e)
            )
            webhook.failure_count += 1
            webhook.last_triggered = timezone.now()
            webhook.save()
            
            return Response({
                'success': False,
                'message': f'Failed to send webhook: {str(e)}'
            }, status=status.HTTP_400_BAD_REQUEST)
    
    @action(detail=True, methods=['get'])
    def events(self, request, pk=None):
        """Get events for a specific webhook"""
        webhook = self.get_object()
        events = webhook.webhook_events.all()[:100]
        serializer = WebhookEventSerializer(events, many=True)
        return Response(serializer.data)

class WebhookEventViewSet(viewsets.ReadOnlyModelViewSet):
    """Admin viewset for viewing webhook events"""
    queryset = WebhookEvent.objects.all()
    serializer_class = WebhookEventSerializer
    permission_classes = [IsAdminUser]
    
    @action(detail=True, methods=['post'])
    def retry(self, request, pk=None):
        """Retry a failed webhook event"""
        event = self.get_object()
        webhook = event.webhook
        
        if not webhook.is_active:
            return Response({
                'success': False,
                'message': 'Webhook is not active'
            }, status=status.HTTP_400_BAD_REQUEST)
        
        try:
            payload_str = json.dumps(event.payload)
            signature = hmac.new(
                webhook.secret.encode(),
                payload_str.encode(),
                hashlib.sha256
            ).hexdigest()
            
            headers = {
                'Content-Type': 'application/json',
                'X-Webhook-Signature': signature
            }
            
            response = requests.post(
                webhook.url,
                json=event.payload,
                headers=headers,
                timeout=10
            )
            
            event.retry_count += 1
            event.response_status = response.status_code
            
            if response.ok:
                event.status = 'delivered'
                event.delivered_at = timezone.now()
                event.error_message = ''
                webhook.success_count += 1
            else:
                event.status = 'failed'
                event.error_message = response.text[:500]
                webhook.failure_count += 1
            
            event.save()
            webhook.last_triggered = timezone.now()
            webhook.save()
            
            return Response({
                'success': response.ok,
                'status_code': response.status_code,
                'message': 'Retry successful' if response.ok else 'Retry failed'
            })
            
        except requests.exceptions.RequestException as e:
            event.retry_count += 1
            event.error_message = str(e)
            event.save()
            
            return Response({
                'success': False,
                'message': f'Retry failed: {str(e)}'
            }, status=status.HTTP_400_BAD_REQUEST)
