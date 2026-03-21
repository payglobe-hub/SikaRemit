from core.response import APIResponse
from rest_framework import viewsets, permissions
from rest_framework.decorators import action
from .models import Notification, NotificationPreferences
from .serializers import NotificationSerializer
from .services import NotificationService  # Assuming NotificationService is in .services module
from django.db import models
from users.models import Customer
from django.utils import timezone

class NotificationViewSet(viewsets.ModelViewSet):
    serializer_class = NotificationSerializer
    permission_classes = [permissions.IsAuthenticated]
    
    def get_queryset(self):
        return Notification.objects.filter(user=self.request.user)
    
    def list(self, request, *args, **kwargs):
        queryset = self.filter_queryset(self.get_queryset())
        serializer = self.get_serializer(queryset, many=True)
        return APIResponse(serializer.data)
    
    def retrieve(self, request, *args, **kwargs):
        instance = self.get_object()
        serializer = self.get_serializer(instance)
        return APIResponse(serializer.data)
    
    def perform_create(self, serializer):
        serializer.save(user=self.request.user)

    @action(detail=True, methods=['post'])
    def mark_read(self, request, pk=None):
        if NotificationService.mark_as_read(pk):
            return APIResponse({"status": "marked as read"})
        return APIResponse({"error": "Notification not found"}, status=404)

    @action(detail=True, methods=['patch'])
    def read(self, request, pk=None):
        """Mark notification as read using PATCH method"""
        notification = self.get_object()
        notification.is_read = True
        notification.read_at = timezone.now()
        notification.save()
        return APIResponse({"status": "marked as read"})

    @action(detail=False, methods=['get'])
    def analytics(self, request):
        user_notifications = self.get_queryset()
        
        metrics = {
            'total': user_notifications.count(),
            'read': user_notifications.filter(is_read=True).count(),
            'delivery_success_rate': user_notifications.filter(
                delivery_metrics__has_key='delivered_at'
            ).count() / max(1, user_notifications.count()),
            'categories': dict(user_notifications.values_list('category').annotate(
                count=models.Count('id')
            ))
        }
        
        return APIResponse(metrics)

    @action(detail=False, methods=['get', 'patch'])
    def preferences(self, request):
        try:
            prefs, created = NotificationPreferences.objects.get_or_create(
                user=request.user,
                defaults={
                    'email_enabled': True,
                    'sms_enabled': False,
                    'push_enabled': True,
                    'web_enabled': True
                }
            )
        except Exception as e:
            return APIResponse({"error": f"Failed to get preferences: {str(e)}"}, status=500)
        
        if request.method == 'GET':
            preferences = {
                'emailNotifications': prefs.email_enabled,
                'smsNotifications': prefs.sms_enabled,
                'pushNotifications': prefs.push_enabled,
                'webNotifications': prefs.web_enabled,
            }
            return APIResponse(preferences)
        
        elif request.method == 'PATCH':
            data = request.data
            # Map camelCase to snake_case
            field_mapping = {
                'emailNotifications': 'email_enabled',
                'smsNotifications': 'sms_enabled',
                'pushNotifications': 'push_enabled',
                'webNotifications': 'web_enabled',
            }
            
            for camel_field, snake_field in field_mapping.items():
                if camel_field in data:
                    setattr(prefs, snake_field, data[camel_field])
            
            try:
                prefs.save()
                return APIResponse({"status": "Preferences updated"})
            except Exception as e:
                return APIResponse({"error": f"Failed to update preferences: {str(e)}"}, status=500)

    @action(detail=False, methods=['patch'])
    def mark_all_read(self, request):
        """Mark all notifications as read for the current user"""
        user_notifications = self.get_queryset()
        updated_count = user_notifications.filter(is_read=False).update(is_read=True)
        return APIResponse({"status": f"Marked {updated_count} notifications as read"})
