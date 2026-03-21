from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework import permissions, status
from notifications.models import Notification
from accounts.serializers import NotificationSerializer
from channels.layers import get_channel_layer
from asgiref.sync import async_to_sync

class NotificationService:
    @staticmethod
    def create_notification(user, title, message, level, notification_type, metadata=None):
        return Notification.objects.create(
            user=user,
            title=title,
            message=message,
            notification_type=notification_type,
            metadata=metadata or {}
        )

class NotificationAPIView(APIView):
    permission_classes = [permissions.IsAuthenticated]
    
    def get(self, request):
        notifications = Notification.objects.filter(user=request.user)
        unread_count = notifications.filter(is_read=False).count()
        serializer = NotificationSerializer(notifications, many=True)
        return Response({
            'notifications': serializer.data,
            'unread_count': unread_count
        })
    
    def post(self, request, pk=None):
        if pk:  # Mark as read
            notification = Notification.objects.get(pk=pk, user=request.user)
            notification.mark_as_read()
            
            # Push update to client
            channel_layer = get_channel_layer()
            async_to_sync(channel_layer.group_send)(
                f"notifications_{request.user.id}",
                {
                    "type": "notification.update",
                    "notification_id": pk,
                    "is_read": True
                }
            )
            
            return Response(status=status.HTTP_204_NO_CONTENT)
        return Response(status=status.HTTP_400_BAD_REQUEST)
