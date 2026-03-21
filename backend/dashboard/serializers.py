from rest_framework import serializers
from .models import DashboardStats
from users.serializers import UserSerializer

class DashboardStatsSerializer(serializers.ModelSerializer):
    user_detail = UserSerializer(source='user', read_only=True)
    
    class Meta:
        model = DashboardStats
        fields = [
            'id',
            'user_detail',
            'total_transactions',
            'total_volume',
            'last_updated'
        ]
        read_only_fields = ['last_updated']
