from rest_framework import serializers

class BulkUserUpdateSerializer(serializers.Serializer):
    user_ids = serializers.ListField(
        child=serializers.CharField(),
        min_length=1
    )
    is_active = serializers.BooleanField()

class BulkVerificationActionSerializer(serializers.Serializer):
    verification_ids = serializers.ListField(
        child=serializers.CharField(),
        min_length=1
    )
    reason = serializers.CharField(required=False)
