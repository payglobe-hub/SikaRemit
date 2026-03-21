from rest_framework import serializers
from .models import RegulatorySubmission
from users.serializers import UserSerializer

class RegulatorySubmissionSerializer(serializers.ModelSerializer):
    user_detail = UserSerializer(source='user', read_only=True)
    
    class Meta:
        model = RegulatorySubmission
        fields = [
            'id',
            'user_detail',
            'report_data',
            'submitted_at',
            'success',
            'response'
        ]
        read_only_fields = ['submitted_at']
