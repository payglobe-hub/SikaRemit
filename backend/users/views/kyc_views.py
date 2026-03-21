from rest_framework import status, generics
from rest_framework.decorators import api_view, permission_classes
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response
from django.utils import timezone
from django.db import transaction as db_transaction

from users.models import Customer, KYCDocument
from users.serializers import KYCDocumentSerializer, CustomerSerializer

class KYCVerificationView(generics.GenericAPIView):
    """
    Handle lazy KYC verification flow.

    GET: Get current KYC status
    POST: Start or continue KYC verification process
    """
    permission_classes = [IsAuthenticated]
    serializer_class = KYCDocumentSerializer

    def get(self, request):
        """Get current KYC status for the user"""
        try:
            customer = request.user.customer_profile
        except Customer.DoesNotExist:
            return Response(
                {"error": "Customer profile not found"},
                status=status.HTTP_404_NOT_FOUND
            )

        serializer = CustomerSerializer(customer)
        return Response(serializer.data)

    def post(self, request):
        """Start or continue KYC verification process"""
        try:
            customer = request.user.customer_profile
        except Customer.DoesNotExist:
            return Response(
                {"error": "Customer profile not found"},
                status=status.HTTP_404_NOT_FOUND
            )

        # Start KYC process if not already started
        if customer.kyc_status == 'not_started':
            customer.start_kyc_process()

        # Handle different KYC steps based on current status
        action = request.data.get('action', 'upload_document')

        if action == 'upload_document':
            return self._handle_document_upload(request, customer)
        elif action == 'submit_personal_info':
            return self._handle_personal_info(request, customer)
        elif action == 'complete_verification':
            return self._handle_completion(request, customer)

        return Response(
            {"error": "Invalid action"},
            status=status.HTTP_400_BAD_REQUEST
        )

    def _handle_document_upload(self, request, customer):
        """Handle document upload step"""
        serializer = self.get_serializer(data=request.data)
        if serializer.is_valid():
            # Associate document with customer
            document = serializer.save(user=request.user)

            # Update customer status
            customer.update_kyc_status('pending_review')

            return Response({
                "message": "Document uploaded successfully. Under review.",
                "document_id": document.id,
                "status": customer.kyc_status
            }, status=status.HTTP_201_CREATED)

        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)

    def _handle_personal_info(self, request, customer):
        """Handle personal information submission"""
        # Update customer with personal info
        customer.date_of_birth = request.data.get('date_of_birth')
        customer.address = request.data.get('address', {})

        # Basic validation
        if not customer.date_of_birth:
            return Response(
                {"error": "Date of birth is required"},
                status=status.HTTP_400_BAD_REQUEST
            )

        customer.save()

        return Response({
            "message": "Personal information updated",
            "status": customer.kyc_status
        })

    def _handle_completion(self, request, customer):
        """Handle final verification step"""
        # This would typically trigger additional verification steps
        # For now, mark as completed (in real implementation, this would
        # go through admin review)

        customer.update_kyc_status('pending_review')

        return Response({
            "message": "KYC verification submitted for review",
            "status": customer.kyc_status
        })

@api_view(['POST'])
@permission_classes([IsAuthenticated])
def check_transaction_eligibility(request):
    """
    Check if user can perform transactions.
    This is called before any transaction attempt.
    """
    try:
        customer = request.user.customer_profile
    except Customer.DoesNotExist:
        return Response(
            {"error": "Customer profile not found"},
            status=status.HTTP_404_NOT_FOUND
        )

    # Record transaction attempt for analytics
    customer.record_transaction_attempt()

    if customer.can_make_transactions:
        return Response({
            "eligible": True,
            "message": "User can perform transactions"
        })
    else:
        # User needs verification
        return Response({
            "eligible": False,
            "reason": "KYC verification required",
            "kyc_status": customer.kyc_status,
            "kyc_required": customer.needs_kyc_verification,
            "next_action": "start_kyc" if customer.kyc_status == 'not_started' else "continue_kyc"
        }, status=status.HTTP_403_FORBIDDEN)

@api_view(['GET'])
@permission_classes([IsAuthenticated])
def get_kyc_documents(request):
    """Get user's KYC documents"""
    documents = KYCDocument.objects.filter(user=request.user)
    serializer = KYCDocumentSerializer(documents, many=True)
    return Response(serializer.data)

@api_view(['POST'])
@permission_classes([IsAuthenticated])
def resubmit_kyc(request):
    """Allow users to resubmit KYC if previously rejected"""
    try:
        customer = request.user.customer_profile
    except Customer.DoesNotExist:
        return Response(
            {"error": "Customer profile not found"},
            status=status.HTTP_404_NOT_FOUND
        )

    # Only allow resubmission if rejected or not started
    if customer.kyc_status not in ['rejected', 'not_started']:
        return Response(
            {"error": "Cannot resubmit KYC at this time"},
            status=status.HTTP_400_BAD_REQUEST
        )

    # Reset status to allow new submission
    customer.update_kyc_status('not_started')

    return Response({
        "message": "KYC can be resubmitted",
        "status": customer.kyc_status
    })
