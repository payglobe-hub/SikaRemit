from rest_framework import viewsets
from rest_framework.decorators import action
from rest_framework.response import Response
from rest_framework import status
from rest_framework.permissions import IsAuthenticated
from .services.sms_service import sms_service

class SMSVerificationViewSet(viewsets.ViewSet):
    """
    SMS verification endpoints
    """
    permission_classes = [IsAuthenticated]

    @action(detail=False, methods=['post'])
    def send_code(self, request):
        """
        Send SMS verification code
        ---
        parameters:
          - name: phone_number
            type: string
            required: true
        responses:
          200:
            description: SMS sent successfully
          400:
            description: Invalid request
        """
        phone_number = request.data.get('phone_number')
        if not phone_number:
            return Response(
                {'error': 'phone_number is required'},
                status=status.HTTP_400_BAD_REQUEST
            )

        result = sms_service.send_verification_code(phone_number)

        if result['success']:
            return Response({
                'success': True,
                'message': 'Verification code sent',
                'message_id': result.get('message_id')
            })
        else:
            return Response({
                'success': False,
                'error': result.get('error', 'Failed to send SMS')
            }, status=status.HTTP_400_BAD_REQUEST)

    @action(detail=False, methods=['post'])
    def verify_code(self, request):
        """
        Verify SMS code
        ---
        parameters:
          - name: phone_number
            type: string
            required: true
          - name: code
            type: string
            required: true
        responses:
          200:
            description: Code verified successfully
          400:
            description: Invalid code or request
        """
        phone_number = request.data.get('phone_number')
        code = request.data.get('code')

        if not phone_number or not code:
            return Response(
                {'error': 'phone_number and code are required'},
                status=status.HTTP_400_BAD_REQUEST
            )

        result = sms_service.verify_code(phone_number, code)

        if result['valid']:
            return Response({
                'success': True,
                'message': 'Phone number verified successfully'
            })
        else:
            return Response({
                'success': False,
                'error': result.get('error', 'Invalid verification code')
            }, status=status.HTTP_400_BAD_REQUEST)

    @action(detail=False, methods=['get'])
    def providers(self, request):
        """Get SMS provider status"""
        return Response(sms_service.get_provider_status())
