"""
Customer views: balance, payments, receipts, stats, profile, search, loyalty.
Split from accounts/views.py for maintainability.
"""
from rest_framework.response import Response
from rest_framework import status, viewsets
from rest_framework.views import APIView
from rest_framework.permissions import IsAuthenticated
from rest_framework.decorators import action
from django.contrib.auth import get_user_model
from django.utils import timezone
from django.db.models import Q
from datetime import timedelta
import logging

from .serializers import (
    AccountsUserSerializer, PaymentsTransactionSerializer, PaymentSerializer,
)
from .models import Transaction
from .services import AuthService
from payments.models.payment import Payment

logger = logging.getLogger(__name__)
User = get_user_model()

class CustomerBalanceView(APIView):
    """
    Customer balance endpoint
    """
    permission_classes = [IsAuthenticated]

    def get(self, request):
        try:
            # Get customer profile
            customer = getattr(request.user, 'customer_profile', None)
            if not customer:
                return Response({'error': 'Customer profile not found'}, status=status.HTTP_404_NOT_FOUND)

            # Return balance information
            balance_data = {
                'balance': str(customer.balance),
                'currency': 'GHS',  # Default currency
                'available_balance': str(customer.balance),
                'pending_balance': '0.00'
            }
            return Response(balance_data, status=status.HTTP_200_OK)
        except Exception as e:
            return Response(
                {'error': str(e)},
                status=status.HTTP_400_BAD_REQUEST
            )

class CustomerPaymentsView(APIView):
    """
    Customer payments/transactions endpoint
    """
    permission_classes = [IsAuthenticated]

    def get(self, request):
        try:
            # Get customer profile
            customer = getattr(request.user, 'customer_profile', None)
            if not customer:
                return Response({'error': 'Customer profile not found'}, status=status.HTTP_404_NOT_FOUND)

            # Get customer transactions (simplified for now)
            transactions = Transaction.objects.filter(customer=customer).order_by('-created_at')[:20]

            serializer = PaymentsTransactionSerializer(transactions, many=True)
            return Response({
                'transactions': serializer.data,
                'count': len(serializer.data)
            }, status=status.HTTP_200_OK)
        except Exception as e:
            return Response(
                {'error': str(e)},
                status=status.HTTP_400_BAD_REQUEST
            )

class CustomerReceiptsView(APIView):
    """
    Customer receipts endpoint
    """
    permission_classes = [IsAuthenticated]

    def get(self, request):
        try:
            # Get customer profile
            customer = getattr(request.user, 'customer_profile', None)
            if not customer:
                return Response({'error': 'Customer profile not found'}, status=status.HTTP_404_NOT_FOUND)

            # Get customer receipts/payments (simplified for now)
            payments = Payment.objects.filter(customer=customer).order_by('-created_at')[:20]

            serializer = PaymentSerializer(payments, many=True)
            return Response({
                'receipts': serializer.data,
                'count': len(serializer.data)
            }, status=status.HTTP_200_OK)
        except Exception as e:
            return Response(
                {'error': str(e)},
                status=status.HTTP_400_BAD_REQUEST
            )

class CustomerStatsView(APIView):
    """
    Customer statistics endpoint
    """
    permission_classes = [IsAuthenticated]

    def get(self, request):
        try:
            # Get customer profile
            customer = getattr(request.user, 'customer_profile', None)
            
            # Get transactions for this month
            thirty_days_ago = timezone.now() - timedelta(days=30)
            
            # Query payments Payment model (has customer field)
            if customer:
                all_transactions = Payment.objects.filter(customer=customer)
            else:
                # Fallback: use accounts Transaction model with sender field
                all_transactions = Transaction.objects.filter(
                    Q(sender=request.user) | Q(recipient=request.user)
                )
            
            this_month_transactions = all_transactions.filter(created_at__gte=thirty_days_ago)
            
            total_transactions = all_transactions.count()
            transactions_this_month = this_month_transactions.count()
            completed_transactions = all_transactions.filter(status='completed').count()
            failed_transactions = all_transactions.filter(status='failed').count()
            
            # Calculate success rate
            success_rate = 0
            if total_transactions > 0:
                success_rate = (completed_transactions / total_transactions) * 100

            return Response({
                'transactions_this_month': transactions_this_month,
                'success_rate': round(success_rate, 1),
                'total_transactions': total_transactions,
                'completed_transactions': completed_transactions,
                'failed_transactions': failed_transactions,
            }, status=status.HTTP_200_OK)
        except Exception as e:
            return Response(
                {'error': str(e)},
                status=status.HTTP_400_BAD_REQUEST
            )

class CustomerViewSet(viewsets.ModelViewSet):
    """
    Customer-specific API endpoints
    """
    queryset = User.objects.all()  # Required for router registration
    permission_classes = [IsAuthenticated]

    @action(detail=False, methods=['get'])
    def payments(self, request):
        """Get customer recent payments"""
        try:
            # Check if user has customer profile
            try:
                customer_profile = request.user.customer_profile
            except:
                # Return empty array instead of 404 to allow dashboard to render
                return Response([])

            # Get user's transactions
            transactions = Payment.objects.filter(
                customer=customer_profile
            ).select_related('merchant', 'payment_method').order_by('-created_at')[:10]  # Limit to recent payments

            data = []
            for transaction in transactions:
                # Determine merchant name based on transaction type
                transaction_type = transaction.metadata.get('transaction_type', 'payment') if transaction.metadata else 'payment'
                
                if transaction_type == 'p2p_send':
                    merchant_name = f"To: {transaction.metadata.get('recipient_email', 'Unknown')}"
                    payment_method_name = 'P2P Transfer'
                elif transaction_type == 'p2p_receive':
                    merchant_name = f"From: {transaction.metadata.get('sender_email', 'Unknown')}"
                    payment_method_name = 'P2P Transfer'
                elif transaction_type == 'bill_payment':
                    bill_type = transaction.metadata.get('bill_type', 'Bill') if transaction.metadata else 'Bill'
                    merchant_name = transaction.merchant.business_name if transaction.merchant else bill_type.title()
                    payment_method_name = 'Wallet Balance'
                elif transaction_type == 'airtime_purchase':
                    recipient_phone = transaction.metadata.get('recipient_phone', 'Unknown') if transaction.metadata else 'Unknown'
                    provider = transaction.metadata.get('provider', 'Unknown') if transaction.metadata else 'Unknown'
                    merchant_name = f"Airtime: {recipient_phone} ({provider})"
                    payment_method_name = 'Wallet Balance'
                elif transaction_type == 'wallet_topup':
                    merchant_name = 'Wallet'
                    payment_method_name = transaction.metadata.get('payment_method', 'Top-up') if transaction.metadata else 'Top-up'
                elif transaction_type == 'wallet_deduction':
                    merchant_name = transaction.metadata.get('description', 'Wallet').split(':')[0] if transaction.metadata and 'description' in transaction.metadata else 'Wallet'
                    payment_method_name = 'Wallet Deduction'
                else:
                    merchant_name = transaction.merchant.business_name if transaction.merchant else 'Unknown'
                    payment_method_name = transaction.payment_method.name if transaction.payment_method else 'Unknown'
                
                # Use transaction description if available, otherwise create one
                description = transaction.description or f"Payment to {merchant_name}"
                
                data.append({
                    'id': str(transaction.id),
                    'amount': float(transaction.amount),
                    'currency': transaction.currency,
                    'status': transaction.status,
                    'merchant': merchant_name,
                    'description': description,
                    'created_at': transaction.created_at.isoformat(),
                    'payment_method': payment_method_name,
                    'transaction_type': transaction_type
                })

            return Response(data)
        except Exception as e:
            logger.error(f"Error fetching customer payments: {str(e)}")
            return Response({'error': 'Failed to fetch payments'}, status=500)

    @action(detail=False, methods=['get'])
    def receipts(self, request):
        """Get customer receipts"""
        try:
            # Check if user has customer profile
            try:
                customer_profile = request.user.customer_profile
            except:
                # Return empty array instead of 404 to allow dashboard to render
                return Response([])

            # Get user's successful transactions as receipts
            transactions = Payment.objects.filter(
                customer=customer_profile,
                status='completed'
            ).select_related('merchant', 'payment_method').order_by('-created_at')[:5]  # Limit to recent receipts

            data = []
            for transaction in transactions:
                # Determine merchant name based on transaction type
                transaction_type = transaction.metadata.get('transaction_type', 'payment') if transaction.metadata else 'payment'
                
                if transaction_type == 'p2p_send':
                    merchant_name = f"To: {transaction.metadata.get('recipient_email', 'Unknown')}"
                elif transaction_type == 'p2p_receive':
                    merchant_name = f"From: {transaction.metadata.get('sender_email', 'Unknown')}"
                elif transaction_type == 'bill_payment':
                    bill_type = transaction.metadata.get('bill_type', 'Bill') if transaction.metadata else 'Bill'
                    merchant_name = transaction.merchant.business_name if transaction.merchant else bill_type.title()
                elif transaction_type == 'airtime_purchase':
                    recipient_phone = transaction.metadata.get('recipient_phone', 'Unknown') if transaction.metadata else 'Unknown'
                    provider = transaction.metadata.get('provider', 'Unknown') if transaction.metadata else 'Unknown'
                    merchant_name = f"Airtime: {recipient_phone} ({provider})"
                elif transaction_type == 'wallet_topup':
                    merchant_name = 'Wallet'
                elif transaction_type == 'wallet_deduction':
                    merchant_name = transaction.metadata.get('description', 'Wallet').split(':')[0] if transaction.metadata and 'description' in transaction.metadata else 'Wallet'
                else:
                    merchant_name = transaction.merchant.business_name if transaction.merchant else 'Unknown'
                
                data.append({
                    'id': str(transaction.id),
                    'payment_id': str(transaction.id),
                    'amount': float(transaction.amount),
                    'currency': transaction.currency,
                    'merchant': merchant_name,
                    'date': transaction.created_at.date().isoformat(),
                    'receipt_number': f"RCP-{transaction.id}",
                    'download_url': f"/api/receipts/{transaction.id}/download/",
                    'transaction_type': transaction_type
                })

            return Response(data)
        except Exception as e:
            logger.error(f"Error fetching customer receipts: {str(e)}")
            return Response({'error': 'Failed to fetch receipts'}, status=500)

    @action(detail=False, methods=['get'])
    def balance(self, request):
        """Get customer account balance"""
        try:
            from payments.models.currency import WalletBalance
            from django.conf import settings as app_settings

            default_currency = getattr(app_settings, 'DEFAULT_CURRENCY', 'GHS')
            wallet = WalletBalance.objects.filter(
                user=request.user,
                currency__code=default_currency
            ).select_related('currency').first()

            if wallet:
                balance_data = {
                    'available': float(wallet.available_balance),
                    'pending': float(wallet.pending_balance),
                    'currency': wallet.currency.code,
                    'last_updated': wallet.last_updated.isoformat()
                }
            else:
                balance_data = {
                    'available': 0.00,
                    'pending': 0.00,
                    'currency': default_currency,
                    'last_updated': timezone.now().isoformat()
                }
            return Response(balance_data)
        except Exception as e:
            logger.error(f"Error fetching customer balance: {str(e)}")
            return Response({'error': 'Failed to fetch balance'}, status=500)

    @action(detail=False, methods=['get', 'patch'])
    def profile(self, request):
        """Get or update customer profile"""
        try:
            user = request.user
            customer_profile = getattr(user, 'customer_profile', None)
            
            if request.method == 'GET':
                profile_data = {
                    'id': user.id,
                    'email': user.email,
                    'first_name': user.first_name,
                    'last_name': user.last_name,
                    'phone': user.phone,
                    'date_joined': user.date_joined.isoformat(),
                    'role': dict(user.USER_TYPE_CHOICES).get(user.user_type, 'customer'),
                    'is_verified': user.is_verified,
                    'customer_profile': {
                        'date_of_birth': customer_profile.date_of_birth.isoformat() if customer_profile and customer_profile.date_of_birth else None,
                        'kyc_verified': customer_profile.kyc_verified if customer_profile else False,
                        'address': customer_profile.address if customer_profile else {}
                    } if customer_profile else None
                }
                return Response(profile_data)
            elif request.method == 'PATCH':
                # Update user profile
                allowed_fields = ['first_name', 'last_name', 'phone']
                for field in allowed_fields:
                    if field in request.data:
                        setattr(user, field, request.data[field])
                user.save()

                # Update customer profile if it exists
                if customer_profile and 'customer_profile' in request.data:
                    customer_data = request.data['customer_profile']
                    if 'date_of_birth' in customer_data:
                        customer_profile.date_of_birth = customer_data['date_of_birth']
                    if 'address' in customer_data:
                        customer_profile.address = customer_data['address']
                    customer_profile.save()

                profile_data = {
                    'id': user.id,
                    'email': user.email,
                    'first_name': user.first_name,
                    'last_name': user.last_name,
                    'phone': user.phone,
                    'date_joined': user.date_joined.isoformat(),
                    'role': dict(user.USER_TYPE_CHOICES).get(user.user_type, 'customer'),
                    'is_verified': user.is_verified,
                    'customer_profile': {
                        'date_of_birth': customer_profile.date_of_birth.isoformat() if customer_profile and customer_profile.date_of_birth else None,
                        'kyc_verified': customer_profile.kyc_verified if customer_profile else False,
                        'address': customer_profile.address if customer_profile else {}
                    } if customer_profile else None
                }
                return Response(profile_data)
        except Exception as e:
            logger.error(f"Error with customer profile: {str(e)}")
            return Response({'error': 'Failed to process profile request'}, status=500)

class LoyaltyPointsView(APIView):
    """
    Get current loyalty points balance for authenticated user
    """
    permission_classes = [IsAuthenticated]
    
    def get(self, request):
        try:
            points = AuthService.get_loyalty_points(request.user)
            return Response({'points': points}, status=status.HTTP_200_OK)
        except Exception as e:
            return Response(
                {'error': str(e)},
                status=status.HTTP_400_BAD_REQUEST
            )

class RedeemPointsView(APIView):
    """
    Redeem loyalty points for rewards
    """
    permission_classes = [IsAuthenticated]
    
    def post(self, request):
        try:
            reward_id = request.data.get('reward_id')
            points_to_redeem = request.data.get('points')
            
            if not all([reward_id, points_to_redeem]):
                raise ValueError('Both reward_id and points are required')
                
            result = AuthService.redeem_loyalty_points(
                user=request.user,
                reward_id=reward_id,
                points=points_to_redeem
            )
            return Response(result, status=status.HTTP_200_OK)
        except Exception as e:
            return Response(
                {'error': str(e)},
                status=status.HTTP_400_BAD_REQUEST
            )

class BalanceView(APIView):
    """
    Get current account balance for authenticated user
    """
    permission_classes = [IsAuthenticated]

    def get(self, request):
        try:
            # Get balance from user's account
            balance = AuthService.get_account_balance(request.user)
            return Response(balance, status=status.HTTP_200_OK)
        except Exception as e:
            return Response(
                {'error': str(e)},
                status=status.HTTP_400_BAD_REQUEST
            )

class UserSearchView(APIView):
    """
    API endpoint for searching SikaRemit users by email or phone
    Used for p2p transfers to find recipients
    """
    permission_classes = [IsAuthenticated]

    def get(self, request):
        query = request.GET.get('q', '').strip()
        
        if not query or len(query) < 2:
            return Response(
                {'error': 'Search query must be at least 2 characters long'},
                status=status.HTTP_400_BAD_REQUEST
            )
        
        # Search users by email or phone (excluding current user)
        users = User.objects.filter(
            Q(email__icontains=query) | Q(phone__icontains=query)
        ).exclude(id=request.user.id).select_related()[:10]  # Limit to 10 results
        
        # Format response
        results = []
        for user in users:
            results.append({
                'id': user.id,
                'email': user.email,
                'phone': user.phone,
                'first_name': user.first_name,
                'last_name': user.last_name,
                'full_name': f"{user.first_name} {user.last_name}".strip(),
                'is_verified': user.is_verified,
            })
        
        return Response({
            'results': results,
            'count': len(results)
        })
