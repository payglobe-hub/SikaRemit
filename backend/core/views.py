from django.http import JsonResponse
from rest_framework.views import APIView
from rest_framework.permissions import AllowAny

class HealthCheckView(APIView):
    permission_classes = [AllowAny]
    
    def get(self, request):
        return JsonResponse({'status': 'healthy', 'message': 'Backend is running'})

# Simple admin metrics view without complex imports
class AdminMetricsView(APIView):
    permission_classes = [AllowAny]  # Temporarily allow all for debugging
    
    def get(self, request):
        return JsonResponse({
            'totalUsers': 0,
            'activeUsers': 0,
            'transactionsToday': 0,
            'pendingVerifications': 0
        })

# Simple settings view
class AdminSettingsViewSet:
    """Placeholder for admin settings"""
    pass

# Simple country view
class CountryViewSet:
    """Placeholder for country view"""
    pass
