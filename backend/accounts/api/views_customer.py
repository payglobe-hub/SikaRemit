from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework import status, permissions
from django.contrib.auth import get_user_model
from users.models import Customer
from shared.constants import USER_TYPE_CUSTOMER
from accounts.permissions import IsAdminUser
from accounts.api.serializers import UserSerializer

User = get_user_model()

class CreateCustomerAPIView(APIView):
    """
    API endpoint for creating customer users (type 3)
    """
    permission_classes = [permissions.IsAuthenticated, IsAdminUser]  # Only admins can create customers

    def post(self, request):
        try:
            email = request.data.get('email')
            password = request.data.get('password')
            first_name = request.data.get('first_name', 'Customer')
            last_name = request.data.get('last_name', 'User')

            # Validate required fields
            if not email or not password:
                return Response(
                    {'error': 'Email and password are required'},
                    status=status.HTTP_400_BAD_REQUEST
                )

            # Check if user already exists
            if User.objects.filter(email=email).exists():
                return Response(
                    {'error': 'User with this email already exists'},
                    status=status.HTTP_400_BAD_REQUEST
                )

            # Create user
            user = User.objects.create_user(
                username=email,
                email=email,
                password=password,
                first_name=first_name,
                last_name=last_name,
                user_type=USER_TYPE_CUSTOMER,
                is_verified=True,
                is_active=True,
            )

            # Create customer profile
            customer = Customer.objects.create(user=user)

            # Return created user data
            serializer = UserSerializer(user)
            
            return Response({
                'success': True,
                'message': 'Customer user created successfully',
                'user': serializer.data,
                'customer_id': customer.id,
                'credentials': {
                    'email': email,
                    'password': password,  # Only shown once for admin
                }
            }, status=status.HTTP_201_CREATED)

        except Exception as e:
            return Response(
                {'error': f'Failed to create customer: {str(e)}'},
                status=status.HTTP_500_INTERNAL_SERVER_ERROR
            )
