from django.utils import timezone
from datetime import timedelta
from rest_framework import viewsets, status
from rest_framework.decorators import action
from rest_framework.response import Response
from rest_framework.exceptions import PermissionDenied, ValidationError
from rest_framework.views import APIView
from rest_framework.pagination import PageNumberPagination

from core.response import APIResponse
from users.models import User, Merchant, Customer, KYCDocument, MerchantCustomer, MerchantKYCSubmission
from users.serializers import UserSerializer, MerchantSerializer, CustomerSerializer, KYCDocumentSerializer, MerchantCustomerSerializer, MerchantKYCSubmissionSerializer
from users.services import UserService, KYCService
from users.permissions import IsAdminUser, IsOwnerOrAdmin
from users.tasks import send_verification_email, send_merchant_approval_email
from shared.constants import ADMIN_HIERARCHY_LEVELS, USER_TYPE_SUPER_ADMIN, USER_TYPE_MERCHANT, USER_TYPE_CUSTOMER
from users.biometrics import BiometricVerifier
from rest_framework.decorators import api_view, permission_classes
from rest_framework.permissions import AllowAny

@api_view(['GET'])
@permission_classes([AllowAny])
def test_merchant_customers_stats(request):
    """Test endpoint for merchant customers stats"""
    return APIResponse({
        'total_customers': 0,
        'active_customers': 0,
        'suspended_customers': 0,
        'kyc_pending': 0,
        'kyc_approved': 0,
        'kyc_rejected': 0,
        'recent_onboardings': 0,
        'test_message': 'This is a test endpoint'
    })


class UserViewSet(viewsets.ModelViewSet):
    """ViewSet for managing users with admin-only access."""
    queryset = User.objects.all()
    serializer_class = UserSerializer
    permission_classes = [IsAdminUser]

    def get_queryset(self):
        """Return queryset based on user type."""
        user = self.request.user
        
        if not user.is_authenticated:
            return User.objects.none()
            
        if user.user_type == USER_TYPE_SUPER_ADMIN:  # Admin
            return User.objects.all()
        else:  # Merchant or Customer
            return User.objects.filter(pk=user.pk)

    def list(self, request, *args, **kwargs):
        """List users with proper permission filtering."""
        try:
            queryset = self.filter_queryset(self.get_queryset())
            page = self.paginate_queryset(queryset)
            
            if page is not None:
                serializer = self.get_serializer(page, many=True)
                return self.get_paginated_response(serializer.data)
                
            serializer = self.get_serializer(queryset, many=True)
            return APIResponse(serializer.data)
            
        except Exception as e:
            return APIResponse(
                {'error': 'Failed to retrieve users'}, 
                status=status.HTTP_500_INTERNAL_SERVER_ERROR
            )

    def retrieve(self, request, *args, **kwargs):
        """Retrieve a specific user."""
        try:
            instance = self.get_object()
            serializer = self.get_serializer(instance)
            return APIResponse(serializer.data)
        except Exception as e:
            return APIResponse(
                {'error': 'User not found'}, 
                status=status.HTTP_404_NOT_FOUND
            )

    @action(detail=False, methods=['get'])
    def me(self, request):
        """Get current user's profile."""
        try:
            serializer = self.get_serializer(request.user)
            return APIResponse(serializer.data)
        except Exception as e:
            return APIResponse(
                {'error': 'Failed to retrieve user profile'}, 
                status=status.HTTP_500_INTERNAL_SERVER_ERROR
            )

    @action(detail=False, methods=['get'])
    def search(self, request):
        """Search users with optional type filter."""
        try:
            query = request.query_params.get('q', '').strip()
            user_type = request.query_params.get('type')
            
            if not query:
                raise ValidationError('Search query is required')
                
            users = UserService.search_users(query, user_type)
            serializer = self.get_serializer(users, many=True)
            return APIResponse(serializer.data)
            
        except ValidationError as e:
            return APIResponse({'error': str(e)}, status=status.HTTP_400_BAD_REQUEST)
        except Exception as e:
            return APIResponse(
                {'error': 'Search failed'}, 
                status=status.HTTP_500_INTERNAL_SERVER_ERROR
            )

    @action(detail=True, methods=['post'])
    def resend_verification(self, request, pk=None):
        """Resend verification email to user."""
        try:
            user = self.get_object()
            
            # Check if user is already verified
            if user.is_verified:
                return APIResponse(
                    {'error': 'User is already verified'}, 
                    status=status.HTTP_400_BAD_REQUEST
                )
                
            user.verification_token = UserService.generate_verification_token()
            user.save()
            
            send_verification_email.delay(user.id)
            
            return APIResponse({'message': 'Verification email sent successfully'})
            
        except Exception as e:
            return APIResponse(
                {'error': 'Failed to resend verification email'}, 
                status=status.HTTP_500_INTERNAL_SERVER_ERROR
            )

    @action(detail=True, methods=['post'])
    def verify(self, request, pk=None):
        """Verify a user account."""
        try:
            user = self.get_object()
            
            if user.is_verified:
                return APIResponse(
                    {'error': 'User is already verified'}, 
                    status=status.HTTP_400_BAD_REQUEST
                )
                
            user.is_verified = True
            user.verified_at = timezone.now()
            user.save()
            
            return APIResponse({'message': 'User verified successfully'})
            
        except Exception as e:
            return APIResponse(
                {'error': 'Failed to verify user'}, 
                status=status.HTTP_500_INTERNAL_SERVER_ERROR
            )


class MerchantViewSet(viewsets.ModelViewSet):
    """ViewSet for managing merchant profiles."""
    queryset = Merchant.objects.all()
    serializer_class = MerchantSerializer
    permission_classes = [IsOwnerOrAdmin]

    def get_queryset(self):
        """Return queryset based on user permissions."""
        user = self.request.user
        
        if not user.is_authenticated:
            return Merchant.objects.none()
            
        if user.user_type == USER_TYPE_SUPER_ADMIN:  # Admin
            return Merchant.objects.all()
        else:  # Merchant can only see their own profile
            return Merchant.objects.filter(user=user)

    def list(self, request, *args, **kwargs):
        """List merchants with proper permission filtering."""
        try:
            queryset = self.filter_queryset(self.get_queryset())
            page = self.paginate_queryset(queryset)
            
            if page is not None:
                serializer = self.get_serializer(page, many=True)
                return self.get_paginated_response(serializer.data)
                
            serializer = self.get_serializer(queryset, many=True)
            return APIResponse(serializer.data)
            
        except Exception as e:
            return APIResponse(
                {'error': 'Failed to retrieve merchants'}, 
                status=status.HTTP_500_INTERNAL_SERVER_ERROR
            )

    def retrieve(self, request, *args, **kwargs):
        """Retrieve a specific merchant."""
        try:
            instance = self.get_object()
            serializer = self.get_serializer(instance)
            return APIResponse(serializer.data)
        except Exception as e:
            return APIResponse(
                {'error': 'Merchant not found'}, 
                status=status.HTTP_404_NOT_FOUND
            )

    @action(detail=False, methods=['get'])
    def search(self, request):
        """Search and filter merchants."""
        try:
            is_approved = request.query_params.get('approved')
            business_name = request.query_params.get('name', '').strip()
            
            # Convert string to boolean if provided
            if is_approved is not None:
                is_approved = is_approved.lower() in ['true', '1', 'yes']
            
            merchants = UserService.filter_merchants(
                is_approved=is_approved,
                business_name=business_name
            )
            
            serializer = self.get_serializer(merchants, many=True)
            return APIResponse(serializer.data)
            
        except Exception as e:
            return APIResponse(
                {'error': 'Search failed'}, 
                status=status.HTTP_500_INTERNAL_SERVER_ERROR
            )

    @action(detail=False, methods=['get'])
    def profile(self, request):
        """Get current merchant's profile."""
        try:
            # For merchants, return their own profile
            if request.user.user_type == USER_TYPE_MERCHANT:  # Merchant
                merchant = self.get_queryset().filter(user=request.user).first()
                if not merchant:
                    return APIResponse(
                        {'error': 'Merchant profile not found'}, 
                        status=status.HTTP_404_NOT_FOUND
                    )
                serializer = self.get_serializer(merchant)
                return APIResponse(serializer.data)
            else:
                return APIResponse(
                    {'error': 'Only merchants can access this endpoint'}, 
                    status=status.HTTP_403_FORBIDDEN
                )
        except Exception as e:
            return APIResponse(
                {'error': 'Failed to retrieve merchant profile'}, 
                status=status.HTTP_500_INTERNAL_SERVER_ERROR
            )

    @action(detail=True, methods=['post'], permission_classes=[IsAdminUser])
    def approve(self, request, pk=None):
        """Approve a merchant (admin only)."""
        try:
            merchant = self.get_object()
            
            if merchant.is_approved:
                return APIResponse(
                    {'error': 'Merchant is already approved'}, 
                    status=status.HTTP_400_BAD_REQUEST
                )
                
            merchant.is_approved = True
            merchant.approved_by = request.user
            merchant.approved_at = timezone.now()
            merchant.save()
            
            send_merchant_approval_email.delay(merchant.user.id, request.user.id)
            
            return APIResponse({'message': 'Merchant approved successfully'})
            
        except Exception as e:
            return APIResponse(
                {'error': 'Failed to approve merchant'}, 
                status=status.HTTP_500_INTERNAL_SERVER_ERROR
            )

    @action(detail=True, methods=['post'], permission_classes=[IsAdminUser])
    def reject(self, request, pk=None):
        """Reject a merchant (admin only)."""
        try:
            merchant = self.get_object()
            
            if not merchant.is_approved:
                return APIResponse(
                    {'error': 'Merchant is not approved'}, 
                    status=status.HTTP_400_BAD_REQUEST
                )
                
            merchant.is_approved = False
            merchant.approved_by = None
            merchant.approved_at = None
            merchant.save()
            
            return APIResponse({'message': 'Merchant rejected successfully'})
            
        except Exception as e:
            return APIResponse(
                {'error': 'Failed to reject merchant'}, 
                status=status.HTTP_500_INTERNAL_SERVER_ERROR
            )


class CustomerViewSet(viewsets.ModelViewSet):
    """ViewSet for managing customer profiles."""
    queryset = Customer.objects.all()
    serializer_class = CustomerSerializer
    permission_classes = [IsOwnerOrAdmin]

    def get_queryset(self):
        user = self.request.user
        if not user.is_authenticated:
            return Customer.objects.none()
        if user.user_type == USER_TYPE_SUPER_ADMIN:  # Admin
            return Customer.objects.all()
        return Customer.objects.filter(user=user)

    @action(detail=False, methods=['get'])
    def me(self, request):
        """Get current user's customer profile."""
        try:
            customer = self.get_queryset().first()
            if not customer:
                return APIResponse({'error': 'Customer profile not found'}, status=status.HTTP_404_NOT_FOUND)
            serializer = self.get_serializer(customer)
            return APIResponse(serializer.data)
        except Exception as e:
            return APIResponse({'error': str(e)}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)

    def list(self, request, *args, **kwargs):
        """List customers with proper permission filtering."""
        try:
            queryset = self.filter_queryset(self.get_queryset())
            page = self.paginate_queryset(queryset)
            
            if page is not None:
                serializer = self.get_serializer(page, many=True)
                return self.get_paginated_response(serializer.data)
                
            serializer = self.get_serializer(queryset, many=True)
            return APIResponse(serializer.data)
            
        except Exception as e:
            return APIResponse(
                {'error': 'Failed to retrieve customers'}, 
                status=status.HTTP_500_INTERNAL_SERVER_ERROR
            )

    def retrieve(self, request, *args, **kwargs):
        """Retrieve a specific customer."""
        try:
            instance = self.get_object()
            serializer = self.get_serializer(instance)
            return APIResponse(serializer.data)
        except Exception as e:
            return APIResponse(
                {'error': 'Customer not found'}, 
                status=status.HTTP_404_NOT_FOUND
            )

    @action(detail=True, methods=['post'])
    def submit_kyc(self, request, pk=None):
        customer = self.get_object()
        try:
            document = KYCService.submit_kyc(
                user=customer.user,
                document_type=request.data['document_type'],
                front_image=request.data['front_image'],
                back_image=request.data.get('back_image')
            )
            return APIResponse(
                KYCDocumentSerializer(document).data,
                status=status.HTTP_201_CREATED
            )
        except Exception as e:
            return APIResponse(
                {'error': str(e)},
                status=status.HTTP_400_BAD_REQUEST
            )

    @action(detail=True, methods=['get'])
    def kyc_status(self, request, pk=None):
        customer = self.get_object()
        documents = KYCDocument.objects.filter(user=customer.user)
        return APIResponse({
            'kyc_verified': customer.kyc_verified,
            'documents': KYCDocumentSerializer(documents, many=True).data
        })

    @action(detail=True, methods=['post'])
    def verify_biometrics(self, request, pk=None):
        customer = self.get_object()
        try:
            result = BiometricVerifier.verify_face(
                request.data['document_image_url'],
                request.data['selfie_image_url']
            )
            
            if result.get('error'):
                return APIResponse(result, status=status.HTTP_400_BAD_REQUEST)
                
            customer.user.biometric_data['face_match'] = result
            customer.user.verification_level = 2 if result['is_match'] else 0
            customer.user.last_biometric_verify = timezone.now()
            customer.user.save()
            
            return APIResponse(result)
        except Exception as e:
            return APIResponse({'error': str(e)}, status=status.HTTP_400_BAD_REQUEST)

    @action(detail=True, methods=['post'])
    def check_liveness(self, request, pk=None):
        customer = self.get_object()
        try:
            result = BiometricVerifier.check_liveness(request.data['video_url'])

            if result.get('error'):
                return APIResponse(result, status=status.HTTP_400_BAD_REQUEST)

            biometric_data = customer.user.biometric_data or {}
            biometric_data['liveness'] = result
            customer.user.biometric_data = biometric_data
            customer.user.verification_level = max(customer.user.verification_level, 1)
            customer.user.last_biometric_verify = timezone.now()
            customer.user.save()

            return APIResponse(result)
        except KeyError:
            return APIResponse({'error': 'video_url is required'}, status=status.HTTP_400_BAD_REQUEST)
        except Exception as e:
            return APIResponse({'error': str(e)}, status=status.HTTP_400_BAD_REQUEST)

    @action(detail=False, methods=['post'], url_path='realtime_subscribe')
    def subscribe(self, request):
        """Subscribe to real-time updates."""
        try:
            # Placeholder implementation
            return APIResponse({'message': 'Subscribed to real-time updates'})
        except Exception as e:
            return APIResponse(
                {'error': 'Failed to subscribe'},
                status=status.HTTP_500_INTERNAL_SERVER_ERROR
            )

    @action(detail=False, methods=['post'], url_path='realtime_unsubscribe')
    def unsubscribe(self, request):
        """Unsubscribe from real-time updates."""
        try:
            # Placeholder implementation
            return APIResponse({'message': 'Unsubscribed from real-time updates'})
        except Exception as e:
            return APIResponse(
                {'error': 'Failed to unsubscribe'},
                status=status.HTTP_500_INTERNAL_SERVER_ERROR
            )

    @action(detail=False, methods=['get'], url_path='realtime_status')
    def realtime_status(self, request):
        """Get real-time connection status."""
        try:
            # Return mock status for now - in production this would check WebSocket connections
            return APIResponse({
                'isConnected': True,
                'connectionType': 'websocket',
                'lastHeartbeat': timezone.now().isoformat(),
                'reconnectAttempts': 0,
                'subscribedChannels': ['balance', 'transactions', 'notifications']
            })
        except Exception as e:
            return APIResponse(
                {'error': 'Failed to get realtime status'},
                status=status.HTTP_500_INTERNAL_SERVER_ERROR
            )

    @action(detail=False, methods=['get'], url_path='balance')
    def balance(self, request):
        """Get customer account balance."""
        try:
            from payments.services.currency_service import WalletService, CurrencyService
            
            # Get user's wallet balances
            balances = WalletService.get_all_wallet_balances(request.user)
            if balances:
                # Return the first currency balance (or USD if available)
                usd_balance = next((b for b in balances if b.currency and b.currency.code == 'USD'), None)
                if usd_balance:
                    primary_balance = usd_balance
                else:
                    primary_balance = balances[0]
                
                balance = {
                    'available': float(primary_balance.available_balance),
                    'pending': float(primary_balance.pending_balance),
                    'currency': primary_balance.currency.code if primary_balance.currency else 'USD',
                    'lastUpdated': primary_balance.last_updated.isoformat() if primary_balance.last_updated else timezone.now().isoformat()
                }
            else:
                # No balances yet, return zero balance
                balance = {
                    'available': 0.00,
                    'pending': 0.00,
                    'currency': 'USD',
                    'lastUpdated': timezone.now().isoformat()
                }
            return APIResponse(balance)
        except Exception as e:
            return APIResponse(
                {'error': 'Failed to get balance'},
                status=status.HTTP_500_INTERNAL_SERVER_ERROR
            )


class KYCDocumentViewSet(viewsets.ModelViewSet):
    queryset = KYCDocument.objects.all()
    serializer_class = KYCDocumentSerializer
    permission_classes = [IsAdminUser]

    def get_queryset(self):
        queryset = super().get_queryset()
        user_id = self.request.query_params.get('user_id')
        if user_id:
            queryset = queryset.filter(user__id=user_id)
        return queryset

    @action(detail=True, methods=['post'])
    def approve(self, request, pk=None):
        document = self.get_object()
        try:
            document.status = 'APPROVED'
            document.reviewed_by = request.user
            document.reviewed_at = timezone.now()
            document.rejection_reason = ''
            document.save()

            # Keep Customer KYC status in sync for direct-customer KYC
            try:
                customer = document.user.customer_profile
                customer.update_kyc_status('approved')
            except Exception:
                pass

            return APIResponse(self.get_serializer(document).data)
        except Exception as e:
            return APIResponse({'error': str(e)}, status=status.HTTP_400_BAD_REQUEST)

    @action(detail=True, methods=['post'])
    def reject(self, request, pk=None):
        document = self.get_object()
        try:
            reason = request.data['reason']
            document.status = 'REJECTED'
            document.rejection_reason = reason
            document.reviewed_by = request.user
            document.reviewed_at = timezone.now()
            document.save()

            # Keep Customer KYC status in sync for direct-customer KYC
            try:
                customer = document.user.customer_profile
                customer.update_kyc_status('rejected', notes=reason)
            except Exception:
                pass

            return APIResponse(self.get_serializer(document).data)
        except Exception as e:
            return APIResponse({'error': str(e)}, status=status.HTTP_400_BAD_REQUEST)


class KYCViewSet(viewsets.ViewSet):
    """ViewSet for KYC verification workflows"""
    permission_classes = [IsOwnerOrAdmin]

    @action(detail=False, methods=['post'], url_path='initiate')
    def initiate_verification(self, request):
        """Initiate KYC verification process"""
        try:
            document = KYCService.initiate_verification(
                user=request.user,
                document_type=request.data['document_type'],
                document_file=request.data['document_file']
            )
            return APIResponse(
                KYCDocumentSerializer(document).data,
                status=status.HTTP_201_CREATED
            )
        except Exception as e:
            return APIResponse({'error': str(e)}, status=status.HTTP_400_BAD_REQUEST)

    @action(detail=False, methods=['get'], url_path='status')
    def verification_status(self, request):
        """Check current KYC verification status"""
        try:
            document = KYCService.check_verification_status(request.user)
            return APIResponse(KYCDocumentSerializer(document).data)
        except Exception as e:
            return APIResponse({'error': str(e)}, status=status.HTTP_400_BAD_REQUEST)

    @action(detail=True, methods=['post'], permission_classes=[IsAdminUser], url_path='approve')
    def approve_verification(self, request, pk=None):
        """Approve KYC verification (admin only)"""
        try:
            document = KYCDocument.objects.get(pk=pk)
            document = KYCService.approve_verification(document)
            return APIResponse(KYCDocumentSerializer(document).data)
        except Exception as e:
            return APIResponse({'error': str(e)}, status=status.HTTP_400_BAD_REQUEST)

    @action(detail=True, methods=['post'], permission_classes=[IsAdminUser], url_path='reject')
    def reject_verification(self, request, pk=None):
        """Reject KYC verification with reason (admin only)"""
        try:
            document = KYCDocument.objects.get(pk=pk)
            document = KYCService.reject_verification(
                document,
                request.data['reason']
            )
            return APIResponse(KYCDocumentSerializer(document).data)
        except Exception as e:
            return APIResponse({'error': str(e)}, status=status.HTTP_400_BAD_REQUEST)


class MerchantCustomerViewSet(viewsets.ModelViewSet):
    """ViewSet for managing merchant-customer relationships"""
    serializer_class = MerchantCustomerSerializer
    permission_classes = [IsOwnerOrAdmin]

    def get_queryset(self):
        user = self.request.user
        if not user.is_authenticated:
            return MerchantCustomer.objects.none()

        if user.user_type in ADMIN_HIERARCHY_LEVELS:  # Any admin
            queryset = MerchantCustomer.objects.all()
        elif user.user_type == USER_TYPE_MERCHANT:
            # Check if user has merchant profile
            if not hasattr(user, 'merchant_profile'):
                return MerchantCustomer.objects.none()
            
            merchant = user.merchant_profile
            queryset = MerchantCustomer.objects.filter(merchant=merchant)
        else:  # Customer - can only see their own merchant relationships
            # Check if user has customer profile
            if not hasattr(user, 'customer_profile'):
                return MerchantCustomer.objects.none()
                
            customer = user.customer_profile
            queryset = MerchantCustomer.objects.filter(customer=customer)

        # Apply filters
        merchant_id = self.request.query_params.get('merchant_id')
        customer_id = self.request.query_params.get('customer_id')
        status_filter = self.request.query_params.get('status')
        kyc_status = self.request.query_params.get('kyc_status')

        if merchant_id:
            queryset = queryset.filter(merchant_id=merchant_id)
        if customer_id:
            queryset = queryset.filter(customer_id=customer_id)
        if status_filter:
            queryset = queryset.filter(status=status_filter)
        if kyc_status:
            queryset = queryset.filter(kyc_status=kyc_status)

        return queryset.select_related('merchant__user', 'customer__user')

    @action(detail=False, methods=['post'])
    def onboard(self, request):
        """Onboard a customer to a merchant"""
        try:
            # Check if user has merchant profile
            if not hasattr(request.user, 'merchant_profile'):
                return APIResponse({'error': 'Merchant profile not found'}, status=status.HTTP_404_NOT_FOUND)
            
            merchant = request.user.merchant_profile
            customer = get_object_or_404(Customer, id=request.data['customer_id'])

            merchant_customer = KYCService.onboard_merchant_customer(
                merchant=merchant,
                customer=customer,
                kyc_required=request.data.get('kyc_required', True),
                notes=request.data.get('notes', '')
            )

            serializer = self.get_serializer(merchant_customer)
            return APIResponse(serializer.data, status=status.HTTP_201_CREATED)
        except Exception as e:
            return APIResponse({'error': str(e)}, status=status.HTTP_400_BAD_REQUEST)

    @action(detail=True, methods=['post'])
    def submit_kyc(self, request, pk=None):
        """Submit KYC documents for a merchant customer"""
        try:
            merchant_customer = self.get_object()

            # Verify merchant owns this relationship
            if request.user.user_type == USER_TYPE_MERCHANT:
                if not hasattr(request.user, 'merchant_profile'):
                    return APIResponse({'error': 'Merchant profile not found'}, status=status.HTTP_404_NOT_FOUND)
                
                merchant = request.user.merchant_profile
                if merchant_customer.merchant != merchant:
                    raise PermissionDenied("You can only manage your own customers")

            document = KYCService.submit_merchant_customer_kyc(
                merchant_customer=merchant_customer,
                document_type=request.data['document_type'],
                document_file=request.data['document_file'],
                auto_escalate=request.data.get('auto_escalate', True)
            )

            return APIResponse(MerchantKYCSubmissionSerializer(document).data, status=status.HTTP_201_CREATED)
        except Exception as e:
            return APIResponse({'error': str(e)}, status=status.HTTP_400_BAD_REQUEST)

    @action(detail=True, methods=['get'])
    def kyc_status(self, request, pk=None):
        """Get detailed KYC status for a merchant customer"""
        try:
            merchant_customer = self.get_object()
            status_data = KYCService.get_merchant_customer_kyc_status(merchant_customer)
            return APIResponse(status_data)
        except Exception as e:
            return APIResponse({'error': str(e)}, status=status.HTTP_400_BAD_REQUEST)

    @action(detail=True, methods=['post'])
    def suspend(self, request, pk=None):
        """Suspend a merchant customer"""
        try:
            merchant_customer = self.get_object()

            # Only merchant or admin can suspend
            if request.user.user_type == USER_TYPE_MERCHANT:
                if not hasattr(request.user, 'merchant_profile'):
                    return APIResponse({'error': 'Merchant profile not found'}, status=status.HTTP_404_NOT_FOUND)
                
                merchant = request.user.merchant_profile
                if merchant_customer.merchant != merchant:
                    raise PermissionDenied("You can only manage your own customers")

            merchant_customer.status = 'suspended'
            merchant_customer.suspended_at = timezone.now()
            merchant_customer.suspended_by = request.user
            merchant_customer.suspension_reason = request.data.get('reason', '')
            merchant_customer.save()

            serializer = self.get_serializer(merchant_customer)
            return APIResponse(serializer.data)
        except Exception as e:
            return APIResponse({'error': str(e)}, status=status.HTTP_400_BAD_REQUEST)

    @action(detail=True, methods=['post'])
    def activate(self, request, pk=None):
        """Activate a suspended merchant customer"""
        try:
            merchant_customer = self.get_object()

            # Only merchant or admin can activate
            if request.user.user_type == USER_TYPE_MERCHANT:
                if not hasattr(request.user, 'merchant_profile'):
                    return APIResponse({'error': 'Merchant profile not found'}, status=status.HTTP_404_NOT_FOUND)
                
                merchant = request.user.merchant_profile
                if merchant_customer.merchant != merchant:
                    raise PermissionDenied("You can only manage your own customers")

            merchant_customer.status = 'active'
            merchant_customer.suspended_at = None
            merchant_customer.suspended_by = None
            merchant_customer.suspension_reason = ''
            merchant_customer.save()

            serializer = self.get_serializer(merchant_customer)
            return APIResponse(serializer.data)
        except Exception as e:
            return APIResponse({'error': str(e)}, status=status.HTTP_400_BAD_REQUEST)

    @action(detail=False, methods=['get'], permission_classes=[])
    def stats(self, request):
        """Get merchant customer statistics"""
        # Simple working version - return empty stats for now
        return APIResponse({
            'total_customers': 0,
            'active_customers': 0,
            'suspended_customers': 0,
            'kyc_pending': 0,
            'kyc_approved': 0,
            'kyc_rejected': 0,
            'recent_onboardings': 0
        })


class MerchantKYCSubmissionViewSet(viewsets.ModelViewSet):
    """ViewSet for managing KYC submissions that need admin review"""
    serializer_class = MerchantKYCSubmissionSerializer
    permission_classes = [IsAdminUser]

    def get_queryset(self):
        queryset = MerchantKYCSubmission.objects.select_related(
            'merchant_customer__merchant__user',
            'merchant_customer__customer__user',
            'kyc_document',
            'reviewed_by'
        )

        # Apply filters
        status_filter = self.request.query_params.get('status', 'pending')
        priority = self.request.query_params.get('priority')
        merchant_id = self.request.query_params.get('merchant_id')
        days_pending = self.request.query_params.get('days_pending')

        if status_filter != 'all':
            queryset = queryset.filter(status=status_filter)
        if priority:
            queryset = queryset.filter(review_priority=priority)
        if merchant_id:
            queryset = queryset.filter(merchant_customer__merchant_id=merchant_id)
        if days_pending:
            from django.db.models import F, Value
            from django.db.models.functions import Now
            queryset = queryset.filter(
                submitted_at__lte=Now() - Value(int(days_pending)) * Value(1)  # days
            )

        return queryset.order_by('-submitted_at')

    @action(detail=True, methods=['post'])
    def approve(self, request, pk=None):
        """Approve a KYC submission"""
        try:
            submission = self.get_object()
            result = KYCService.process_admin_kyc_decision(
                submission=submission,
                decision='approved',
                admin_user=request.user,
                admin_notes=request.data.get('notes', '')
            )
            serializer = self.get_serializer(result)
            return APIResponse(serializer.data)
        except Exception as e:
            return APIResponse({'error': str(e)}, status=status.HTTP_400_BAD_REQUEST)

    @action(detail=True, methods=['post'])
    def reject(self, request, pk=None):
        """Reject a KYC submission"""
        try:
            submission = self.get_object()
            result = KYCService.process_admin_kyc_decision(
                submission=submission,
                decision='rejected',
                admin_user=request.user,
                admin_notes=request.data['reason']
            )
            serializer = self.get_serializer(result)
            return APIResponse(serializer.data)
        except Exception as e:
            return APIResponse({'error': str(e)}, status=status.HTTP_400_BAD_REQUEST)

    @action(detail=True, methods=['post'])
    def escalate(self, request, pk=None):
        """Escalate a KYC submission for further review"""
        try:
            submission = self.get_object()
            result = KYCService.process_admin_kyc_decision(
                submission=submission,
                decision='escalated',
                admin_user=request.user,
                admin_notes=request.data.get('notes', '')
            )
            serializer = self.get_serializer(result)
            return APIResponse(serializer.data)
        except Exception as e:
            return APIResponse({'error': str(e)}, status=status.HTTP_400_BAD_REQUEST)

    @action(detail=False, methods=['post'])
    def bulk_decide(self, request):
        """Process multiple KYC decisions in bulk"""
        try:
            results = KYCService.bulk_process_kyc_decisions(
                submissions_data=request.data['submissions'],
                admin_user=request.user
            )
            return APIResponse({'results': results})
        except Exception as e:
            return APIResponse({'error': str(e)}, status=status.HTTP_400_BAD_REQUEST)

    @action(detail=False, methods=['get'])
    def stats(self, request):
        """Get KYC submission statistics"""
        try:
            queryset = self.get_queryset()
            total = queryset.count()
            pending = queryset.filter(status='pending').count()
            approved = queryset.filter(status='approved').count()
            rejected = queryset.filter(status='rejected').count()
            escalated = queryset.filter(status='escalated').count()

            # Priority breakdown
            from django.db.models import Count
            priority_stats = queryset.values('review_priority').annotate(
                count=Count('id')
            ).order_by('review_priority')

            return APIResponse({
                'total': total,
                'pending': pending,
                'approved': approved,
                'rejected': rejected,
                'escalated': escalated,
                'priority_breakdown': list(priority_stats)
            })
        except Exception as e:
            return APIResponse({'error': str(e)}, status=status.HTTP_400_BAD_REQUEST)


class AdminKYCInboxPagination(PageNumberPagination):
    page_size = 20
    page_size_query_param = 'page_size'
    max_page_size = 100


class AdminKYCInboxView(APIView):
    permission_classes = [IsAdminUser]

    def _normalize_merchant_submission(self, submission: MerchantKYCSubmission):
        serialized = MerchantKYCSubmissionSerializer(submission).data
        return {
            'id': f"merchant_customer:{submission.id}",
            'subject_type': 'merchant_customer',
            'source_id': submission.id,
            'status': submission.status,
            'submitted_at': submission.submitted_at,
            'review_priority': submission.review_priority,
            'risk_score': submission.risk_score,
            'risk_factors': submission.risk_factors,
            'escalation_reason': submission.escalation_reason,
            'merchant_customer': serialized.get('merchant_customer'),
            'customer': None,
            'kyc_document': serialized.get('kyc_document'),
            'reviewed_by': serialized.get('reviewed_by'),
            'reviewed_at': submission.reviewed_at,
            'admin_notes': submission.admin_notes,
            'days_pending': submission.days_pending,
        }

    def _normalize_direct_customer_document(self, document: KYCDocument):
        normalized_status = 'pending'
        if document.status == 'APPROVED':
            normalized_status = 'approved'
        elif document.status == 'REJECTED':
            normalized_status = 'rejected'

        customer_data = None
        try:
            customer = document.user.customer_profile
            customer_data = CustomerSerializer(customer).data
        except Exception:
            customer_data = None

        return {
            'id': f"direct_customer:{document.id}",
            'subject_type': 'direct_customer',
            'source_id': document.id,
            'status': normalized_status,
            'submitted_at': document.created_at,
            'review_priority': None,
            'risk_score': 0,
            'risk_factors': [],
            'escalation_reason': '',
            'merchant_customer': None,
            'customer': customer_data,
            'kyc_document': KYCDocumentSerializer(document).data,
            'reviewed_by': UserSerializer(document.reviewed_by).data if document.reviewed_by else None,
            'reviewed_at': document.reviewed_at,
            'admin_notes': '',
            'days_pending': None,
        }

    def get(self, request):
        status_filter = request.query_params.get('status', 'pending')
        subject_filter = request.query_params.get('subject', 'all')

        items = []

        if subject_filter in ['all', 'merchant_customer']:
            merchant_qs = MerchantKYCSubmission.objects.select_related(
                'merchant_customer__merchant__user',
                'merchant_customer__customer__user',
                'kyc_document',
                'reviewed_by'
            )
            if status_filter != 'all':
                merchant_qs = merchant_qs.filter(status=status_filter)
            items.extend([self._normalize_merchant_submission(s) for s in merchant_qs])

        if subject_filter in ['all', 'direct_customer']:
            direct_qs = KYCDocument.objects.select_related('user', 'reviewed_by').filter(
                user__customer_profile__isnull=False
            )

            if status_filter == 'pending':
                direct_qs = direct_qs.filter(status='PENDING')
            elif status_filter == 'approved':
                direct_qs = direct_qs.filter(status='APPROVED')
            elif status_filter == 'rejected':
                direct_qs = direct_qs.filter(status='REJECTED')
            elif status_filter == 'escalated':
                direct_qs = direct_qs.none()

            items.extend([self._normalize_direct_customer_document(d) for d in direct_qs])

        items.sort(key=lambda x: x['submitted_at'], reverse=True)

        paginator = AdminKYCInboxPagination()
        page = paginator.paginate_queryset(items, request)

        def _serialize_item(item):
            item = dict(item)
            if item.get('submitted_at'):
                item['submitted_at'] = item['submitted_at'].isoformat()
            if item.get('reviewed_at'):
                item['reviewed_at'] = item['reviewed_at'].isoformat()
            return item

        return APIResponse({
            'count': len(items),
            'results': [_serialize_item(i) for i in (page or [])]
        })


class AdminKYCInboxStatsView(APIView):
    permission_classes = [IsAdminUser]

    def get(self, request):
        merchant_qs = MerchantKYCSubmission.objects.all()
        m_total = merchant_qs.count()
        m_pending = merchant_qs.filter(status='pending').count()
        m_approved = merchant_qs.filter(status='approved').count()
        m_rejected = merchant_qs.filter(status='rejected').count()
        m_escalated = merchant_qs.filter(status='escalated').count()

        direct_qs = KYCDocument.objects.filter(user__customer_profile__isnull=False)
        d_total = direct_qs.count()
        d_pending = direct_qs.filter(status='PENDING').count()
        d_approved = direct_qs.filter(status='APPROVED').count()
        d_rejected = direct_qs.filter(status='REJECTED').count()

        return APIResponse({
            'total': m_total + d_total,
            'pending': m_pending + d_pending,
            'approved': m_approved + d_approved,
            'rejected': m_rejected + d_rejected,
            'escalated': m_escalated,
            'by_subject': {
                'merchant_customer': {
                    'total': m_total,
                    'pending': m_pending,
                    'approved': m_approved,
                    'rejected': m_rejected,
                    'escalated': m_escalated,
                },
                'direct_customer': {
                    'total': d_total,
                    'pending': d_pending,
                    'approved': d_approved,
                    'rejected': d_rejected,
                    'escalated': 0,
                }
            }
        })


def verify_email(request, token):
    """Verify user email using verification token"""
    try:
        user = get_object_or_404(User, verification_token=token)
        if user.is_verified:
            return APIResponse(
                {'message': 'Email already verified'},
                status=status.HTTP_200_OK
            )
            
        user.is_verified = True
        user.verification_token = None
        user.verified_at = timezone.now()
        user.save()
        
        return APIResponse({'message': 'Email successfully verified'})
    except Exception as e:
        return APIResponse(
            {'error': 'Invalid verification token'},
            status=status.HTTP_400_BAD_REQUEST
        )