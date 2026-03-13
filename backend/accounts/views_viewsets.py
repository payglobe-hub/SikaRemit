"""
Generic ViewSets: User, Merchant, Transaction, Payment, Product, Support, Payout.
Split from accounts/views.py for maintainability.
"""
from rest_framework.response import Response
from rest_framework import status, viewsets
from rest_framework.views import APIView
from rest_framework.permissions import IsAuthenticated
from rest_framework.decorators import action
from rest_framework_simplejwt.authentication import JWTAuthentication
from django.contrib.auth import get_user_model
import logging

from shared.constants import USER_TYPE_MERCHANT, USER_TYPE_CUSTOMER
from .serializers import (
    AccountsUserSerializer, PaymentsTransactionSerializer, PaymentSerializer,
    PaymentLogSerializer, MerchantProductSerializer, PasswordResetTokenSerializer,
    AuthLogSerializer, SupportTicketSerializer, SupportMessageSerializer,
    CreateSupportTicketSerializer, CreateSupportMessageSerializer, PayoutSerializer,
)
from .models import (
    PasswordResetToken, AuthLog, Transaction, Payout, SupportTicket, SupportMessage
)
from .permissions import IsAdminUser
from .services import AuthService
from merchants.models import Product
from payments.models.payment import Payment
from payments.models.payment_log import PaymentLog

logger = logging.getLogger(__name__)
User = get_user_model()


class UserViewSet(viewsets.ModelViewSet):
    queryset = User.objects.all()
    serializer_class = AccountsUserSerializer
    permission_classes = [IsAuthenticated]
    
    def get_queryset(self):
        queryset = super().get_queryset()
        # Add filtering capabilities
        email = self.request.query_params.get('email')
        if email:
            queryset = queryset.filter(email__icontains=email)
        return queryset


class MerchantViewSet(viewsets.ModelViewSet):
    """
    API endpoint for managing merchants
    """
    queryset = User.objects.filter(user_type=USER_TYPE_MERCHANT)  # Using proper constant
    serializer_class = AccountsUserSerializer
    permission_classes = [IsAdminUser]
    
    def get_queryset(self):
        queryset = super().get_queryset()
        # Add filtering by email
        email = self.request.query_params.get('email')
        if email:
            queryset = queryset.filter(email__icontains=email)
        return queryset


class PasswordResetTokenViewSet(viewsets.ModelViewSet):
    """
    API endpoint for managing password reset tokens
    """
    queryset = PasswordResetToken.objects.all()
    serializer_class = PasswordResetTokenSerializer
    permission_classes = [IsAdminUser]
    
    def get_queryset(self):
        queryset = super().get_queryset()
        # Add filtering by user email
        email = self.request.query_params.get('email')
        if email:
            queryset = queryset.filter(user__email__icontains=email)
        return queryset
    
    def perform_destroy(self, instance):
        # Custom logic when deleting tokens
        AuthService.invalidate_reset_token(instance.token)
        instance.delete()


class AuthLogViewSet(viewsets.ReadOnlyModelViewSet):
    """
    API endpoint for viewing authentication logs
    """
    queryset = AuthLog.objects.all().order_by('-timestamp')
    serializer_class = AuthLogSerializer
    permission_classes = [IsAdminUser]
    
    def get_queryset(self):
        queryset = super().get_queryset()
        # Add filtering capabilities
        user_id = self.request.query_params.get('user_id')
        ip_address = self.request.query_params.get('ip_address')
        action = self.request.query_params.get('action')
        
        if user_id:
            queryset = queryset.filter(user_id=user_id)
        if ip_address:
            queryset = queryset.filter(ip_address=ip_address)
        if action:
            queryset = queryset.filter(action=action)
            
        return queryset


class TransactionViewSet(viewsets.ReadOnlyModelViewSet):
    """
    API endpoint for managing financial transactions
    """
    queryset = Transaction.objects.all().order_by('-created_at')
    serializer_class = PaymentsTransactionSerializer
    permission_classes = [IsAuthenticated]
    authentication_classes = [JWTAuthentication]
    
    def get_queryset(self):
        queryset = super().get_queryset()
        # Filter by current user - if customer, show transactions where user is customer
        # if merchant, show transactions where user is merchant
        if not self.request.user.is_staff:
            if self.request.user.user_type == USER_TYPE_CUSTOMER:  # customer
                queryset = queryset.filter(customer__user=self.request.user)
            elif self.request.user.user_type == USER_TYPE_MERCHANT:  # merchant
                queryset = queryset.filter(merchant__user=self.request.user)
            
        # Add additional filters
        status_filter = self.request.query_params.get('status')
        currency = self.request.query_params.get('currency')
        date_from = self.request.query_params.get('date_from')
        date_to = self.request.query_params.get('date_to')
        
        if status_filter:
            queryset = queryset.filter(status=status_filter)
        if currency:
            queryset = queryset.filter(currency=currency)
        if date_from:
            queryset = queryset.filter(created_at__gte=date_from)
        if date_to:
            queryset = queryset.filter(created_at__lte=date_to)
            
        return queryset
    
    def perform_create(self, serializer):
        # Add transaction processing logic
        transaction = serializer.save(user=self.request.user)
        AuthService.process_transaction(transaction)


class PaymentsViewSet(viewsets.ReadOnlyModelViewSet):
    """
    API endpoint for managing financial payments
    """
    queryset = Payment.objects.all().order_by('-created_at')
    serializer_class = PaymentSerializer
    permission_classes = [IsAuthenticated]
    authentication_classes = [JWTAuthentication]
    
    def get_queryset(self):
        queryset = super().get_queryset()
        # Filter by current user - payments where user is customer
        if not self.request.user.is_staff:
            if self.request.user.user_type == USER_TYPE_CUSTOMER:  # customer
                queryset = queryset.filter(customer__user=self.request.user)
            elif self.request.user.user_type == USER_TYPE_MERCHANT:  # merchant
                queryset = queryset.filter(merchant__user=self.request.user)
                
        # Add additional filters
        status_filter = self.request.query_params.get('status')
        currency = self.request.query_params.get('currency')
        date_from = self.request.query_params.get('date_from')
        date_to = self.request.query_params.get('date_to')
        
        if status_filter:
            queryset = queryset.filter(status=status_filter)
        if currency:
            queryset = queryset.filter(currency=currency)
        if date_from:
            queryset = queryset.filter(created_at__gte=date_from)
        if date_to:
            queryset = queryset.filter(created_at__lte=date_to)
            
        return queryset


class MerchantProductViewSet(viewsets.ModelViewSet):
    """
    API endpoint for managing merchant products
    """
    queryset = Product.objects.all()
    serializer_class = MerchantProductSerializer
    permission_classes = [IsAuthenticated]
    
    def get_queryset(self):
        queryset = super().get_queryset()
        # Filter by current merchant unless admin
        if not self.request.user.is_staff:
            queryset = queryset.filter(store=self.request.user)
            
        # Add additional filters
        status_filter = self.request.query_params.get('status')
        product_type = self.request.query_params.get('type')
        
        if status_filter:
            queryset = queryset.filter(status=status_filter)
        if product_type:
            queryset = queryset.filter(product_type=product_type)
            
        return queryset
    
    def perform_create(self, serializer):
        # Set store to current user
        if not self.request.user.is_staff:
            serializer.save(store=self.request.user)
        else:
            serializer.save()


class ProductInventoryView(APIView):
    """
    Product inventory endpoint
    """
    permission_classes = [IsAuthenticated]
    
    def get(self, request):
        try:
            # Get inventory data with optional filters
            inventory = AuthService.get_product_inventory(
                product_id=request.query_params.get('product_id'),
                merchant_id=request.query_params.get('merchant_id'),
                in_stock=request.query_params.get('in_stock')
            )
            return Response(inventory, status=status.HTTP_200_OK)
        except Exception as e:
            return Response(
                {'error': str(e)},
                status=status.HTTP_400_BAD_REQUEST
            )


class PaymentLogViewSet(viewsets.ReadOnlyModelViewSet):
    """
    API endpoint for viewing payment logs
    """
    queryset = PaymentLog.objects.all().order_by('-created_at')
    serializer_class = PaymentLogSerializer
    permission_classes = [IsAuthenticated]
    
    def get_queryset(self):
        queryset = super().get_queryset()
        # Filter by current user unless admin
        if not self.request.user.is_staff:
            queryset = queryset.filter(user=self.request.user)
            
        # Add additional filters
        status_filter = self.request.query_params.get('status')
        payment_method = self.request.query_params.get('payment_method')
        
        if status_filter:
            queryset = queryset.filter(status=status_filter)
        if payment_method:
            queryset = queryset.filter(payment_method=payment_method)
            
        return queryset


class SupportTicketViewSet(viewsets.ModelViewSet):
    serializer_class = SupportTicketSerializer
    permission_classes = [IsAuthenticated]
    
    def get_queryset(self):
        return SupportTicket.objects.filter(user=self.request.user)
    
    def get_serializer_class(self):
        if self.action == 'create':
            return CreateSupportTicketSerializer
        return SupportTicketSerializer
    
    def perform_create(self, serializer):
        serializer.save(user=self.request.user)
    
    @action(detail=True, methods=['post'])
    def add_message(self, request, pk=None):
        ticket = self.get_object()
        serializer = CreateSupportMessageSerializer(data=request.data, context={'ticket': ticket})
        if serializer.is_valid():
            serializer.save()
            return Response(serializer.data, status=status.HTTP_201_CREATED)
        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)


class PayoutViewSet(viewsets.ModelViewSet):
    serializer_class = PayoutSerializer
    permission_classes = [IsAuthenticated]

    def get_queryset(self):
        return Payout.objects.filter(merchant=self.request.user)

    def perform_create(self, serializer):
        serializer.save(merchant=self.request.user)

    @action(detail=False, methods=['get'])
    def balance(self, request):
        """Get merchant payout balance"""
        # For now, return a mock balance
        # In real implementation, calculate from transactions
        balance = {
            'available': 1500.00,
            'pending': 250.00,
            'currency': 'GHS'
        }
        return Response(balance)
