from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework import permissions, status
from accounts.models import UserActivity
from accounts.api.serializers import UserActivitySerializer
from accounts.permissions import IsAdminUser

class AuditLogAPIView(APIView):
    permission_classes = [permissions.IsAuthenticated, IsAdminUser]

    def get(self, request):
        logs = UserActivity.objects.all().order_by('-created_at')[:100]
        serializer = UserActivitySerializer(logs, many=True)
        return Response(serializer.data)
