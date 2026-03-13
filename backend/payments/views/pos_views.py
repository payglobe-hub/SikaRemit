"""
POS (Point of Sale) API Views
Provides REST API endpoints for POS device management, transactions, and receipts
"""

from rest_framework import viewsets, status
from rest_framework.decorators import action, api_view, permission_classes
from rest_framework.response import Response
from rest_framework.permissions import IsAuthenticated
from rest_framework.pagination import PageNumberPagination
from django.shortcuts import get_object_or_404
from django.db.models import Q, Sum, Count
from django.utils import timezone
from decimal import Decimal
from datetime import datetime, timedelta
import logging

from ..models import POSDevice, POSTransaction
from ..pos_integration import (
    POSIntegrationAPI,
    POSReceiptGenerator,
    create_virtual_terminal,
    create_mobile_reader,
    create_countertop_terminal,
    POSDeviceType,
    POSTransactionType
)
from ..serializers import (
    POSDeviceSerializer,
    POSTransactionSerializer,
    POSDeviceRegistrationSerializer,
    POSTransactionCreateSerializer
)

logger = logging.getLogger(__name__)


class POSDeviceViewSet(viewsets.ModelViewSet):
    """
    POS Device Management ViewSet
    Handles CRUD operations for POS devices
    """
    serializer_class = POSDeviceSerializer
    permission_classes = [IsAuthenticated]

    def get_queryset(self):
        """Filter devices by authenticated merchant"""
        # Check if user has merchant profile
        if not hasattr(self.request.user, 'merchant_profile'):
            return POSDevice.objects.none()
        
        return POSDevice.objects.filter(merchant_id=self.request.user.merchant_profile.id)

    def perform_create(self, serializer):
        """Set merchant when creating device"""
        if hasattr(self.request.user, 'merchant_profile'):
            serializer.save(merchant_id=self.request.user.merchant_profile.id)
        else:
            from rest_framework.exceptions import ValidationError
            raise ValidationError("Merchant profile required to create POS devices")

    @action(detail=True, methods=['post'])
    def activate(self, request, pk=None):
        """Activate a POS device"""
        device = self.get_object()
        device.status = 'active'
        device.last_seen = timezone.now()
        device.save()

        serializer = self.get_serializer(device)
        return Response(serializer.data)

    @action(detail=True, methods=['post'])
    def deactivate(self, request, pk=None):
        """Deactivate a POS device"""
        device = self.get_object()
        device.status = 'inactive'
        device.save()

        serializer = self.get_serializer(device)
        return Response(serializer.data)

    @action(detail=True, methods=['post'])
    def update_location(self, request, pk=None):
        """Update device location"""
        device = self.get_object()
        location = request.data.get('location', {})

        device.location = location
        device.last_seen = timezone.now()
        device.save()

        serializer = self.get_serializer(device)
        return Response(serializer.data)

    @action(detail=False, methods=['get'])
    def stats(self, request):
        """Get POS device statistics for merchant"""
        merchant_id = self.request.user.merchant.id
        devices = POSDevice.objects.filter(merchant_id=merchant_id)

        stats = {
            'total_devices': devices.count(),
            'active_devices': devices.filter(status='active').count(),
            'inactive_devices': devices.filter(status='inactive').count(),
            'devices_by_type': devices.values('device_type').annotate(
                count=Count('id')
            ).order_by('device_type')
        }

        return Response(stats)


class POSTransactionViewSet(viewsets.ModelViewSet):
    """
    POS Transaction Management ViewSet
    Handles POS transaction operations
    """
    serializer_class = POSTransactionSerializer
    permission_classes = [IsAuthenticated]
    pagination_class = PageNumberPagination

    def get_queryset(self):
        """Filter transactions by authenticated merchant"""
        # Check if user has merchant profile
        if not hasattr(self.request.user, 'merchant_profile'):
            return POSTransaction.objects.none()
        
        queryset = POSTransaction.objects.filter(merchant_id=self.request.user.merchant_profile.id)

        # Filter by device if specified
        device_id = self.request.query_params.get('device_id')
        if device_id:
            queryset = queryset.filter(device_id=device_id)

        # Filter by status
        status_filter = self.request.query_params.get('status')
        if status_filter:
            queryset = queryset.filter(status=status_filter)

        # Filter by date range
        start_date = self.request.query_params.get('start_date')
        end_date = self.request.query_params.get('end_date')
        if start_date:
            queryset = queryset.filter(created_at__gte=start_date)
        if end_date:
            queryset = queryset.filter(created_at__lte=end_date)

        return queryset.order_by('-created_at')

    @action(detail=False, methods=['get'])
    def summary(self, request):
        """Get transaction summary for merchant"""
        merchant_id = self.request.user.merchant.id
        today = timezone.now().date()

        # Today's transactions
        today_transactions = POSTransaction.objects.filter(
            merchant_id=merchant_id,
            created_at__date=today
        )

        # Monthly summary
        month_start = today.replace(day=1)
        monthly_transactions = POSTransaction.objects.filter(
            merchant_id=merchant_id,
            created_at__date__gte=month_start
        )

        summary = {
            'today': {
                'count': today_transactions.count(),
                'total_amount': today_transactions.aggregate(
                    total=Sum('amount')
                )['total'] or 0,
                'completed': today_transactions.filter(status='completed').count(),
                'failed': today_transactions.filter(status='failed').count()
            },
            'monthly': {
                'count': monthly_transactions.count(),
                'total_amount': monthly_transactions.aggregate(
                    total=Sum('amount')
                )['total'] or 0,
                'completed': monthly_transactions.filter(status='completed').count(),
                'failed': monthly_transactions.filter(status='failed').count()
            }
        }

        return Response(summary)


@api_view(['POST'])
@permission_classes([IsAuthenticated])
def register_pos_device(request):
    """
    Register a new POS device for the authenticated merchant
    """
    # Check if user has merchant profile
    if not hasattr(request.user, 'merchant_profile'):
        return Response(
            {'error': 'Merchant profile not found'}, 
            status=status.HTTP_404_NOT_FOUND
        )
    
    serializer = POSDeviceRegistrationSerializer(data=request.data)
    if not serializer.is_valid():
        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)

    merchant_id = request.user.merchant_profile.id
    device_type = serializer.validated_data['device_type']
    device_name = serializer.validated_data['device_name']
    device_info = serializer.validated_data.get('device_info', {})

    result = POSIntegrationAPI.register_device(
        merchant_id=merchant_id,
        device_type=device_type,
        device_name=device_name,
        device_info=device_info
    )

    if result['success']:
        return Response(result, status=status.HTTP_201_CREATED)
    else:
        return Response(result, status=status.HTTP_400_BAD_REQUEST)


@api_view(['POST'])
@permission_classes([IsAuthenticated])
def process_pos_transaction(request):
    """
    Process a POS transaction through the specified device
    """
    # Check if user has merchant profile
    if not hasattr(request.user, 'merchant_profile'):
        return Response(
            {'error': 'Merchant profile not found'}, 
            status=status.HTTP_404_NOT_FOUND
        )
    
    serializer = POSTransactionCreateSerializer(data=request.data)
    if not serializer.is_valid():
        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)

    merchant_id = request.user.merchant_profile.id
    device_id = serializer.validated_data['device_id']
    device_type = serializer.validated_data['device_type']
    amount = serializer.validated_data['amount']
    currency = serializer.validated_data.get('currency', 'USD')
    transaction_type = serializer.validated_data.get('transaction_type', POSTransactionType.SALE)
    customer_info = serializer.validated_data.get('customer_info', {})
    metadata = serializer.validated_data.get('metadata', {})

    # Verify device ownership
    device = get_object_or_404(POSDevice, device_id=device_id, merchant_id=merchant_id)

    try:
        if device_type == POSDeviceType.VIRTUAL_TERMINAL:
            # Virtual terminal - manual card entry
            card_data = serializer.validated_data.get('card_data', {})
            if not card_data:
                return Response(
                    {'error': 'Card data required for virtual terminal'},
                    status=status.HTTP_400_BAD_REQUEST
                )

            terminal = create_virtual_terminal(merchant_id)
            result = terminal.create_transaction(
                amount=amount,
                currency=currency,
                card_data=card_data,
                customer_info=customer_info,
                metadata=metadata
            )

        elif device_type == POSDeviceType.MOBILE_READER:
            # Mobile reader - hardware integration
            reader = create_mobile_reader(merchant_id, device_id)

            # Initialize if needed
            init_result = reader.initialize()
            if not init_result['success']:
                return Response(init_result, status=status.HTTP_400_BAD_REQUEST)

            # Read card data
            card_result = reader.read_card()
            if not card_result['success']:
                return Response(card_result, status=status.HTTP_400_BAD_REQUEST)

            # Process payment
            result = reader.process_payment(
                amount=amount,
                currency=currency,
                card_data=card_result,
                metadata=metadata
            )

        elif device_type == POSDeviceType.COUNTERTOP:
            # Countertop terminal - direct hardware connection
            terminal_ip = serializer.validated_data.get('terminal_ip')
            terminal_port = serializer.validated_data.get('terminal_port', 8080)

            if not terminal_ip:
                return Response(
                    {'error': 'Terminal IP required for countertop terminal'},
                    status=status.HTTP_400_BAD_REQUEST
                )

            terminal = create_countertop_terminal(device_id, merchant_id)
            connect_result = terminal.connect(terminal_ip, terminal_port)

            if not connect_result['success']:
                return Response(connect_result, status=status.HTTP_400_BAD_REQUEST)

            result = terminal.send_transaction(
                amount=amount,
                currency=currency,
                transaction_type=transaction_type
            )

        else:
            return Response(
                {'error': f'Unsupported device type: {device_type}'},
                status=status.HTTP_400_BAD_REQUEST
            )

        if result['success']:
            return Response(result, status=status.HTTP_201_CREATED)
        else:
            return Response(result, status=status.HTTP_400_BAD_REQUEST)

    except Exception as e:
        logger.error(f"POS transaction error: {str(e)}")
        return Response(
            {'error': 'Transaction processing failed', 'details': str(e)},
            status=status.HTTP_500_INTERNAL_SERVER_ERROR
        )


@api_view(['POST'])
@permission_classes([IsAuthenticated])
def generate_pos_receipt(request):
    """
    Generate a receipt for a POS transaction
    """
    # Check if user has merchant profile
    if not hasattr(request.user, 'merchant_profile'):
        return Response(
            {'error': 'Merchant profile not found'}, 
            status=status.HTTP_404_NOT_FOUND
        )
    
    transaction_id = request.data.get('transaction_id')
    receipt_type = request.data.get('receipt_type', 'customer')

    if not transaction_id:
        return Response(
            {'error': 'Transaction ID required'},
            status=status.HTTP_400_BAD_REQUEST
        )

    # Get transaction and verify ownership
    transaction = get_object_or_404(
        POSTransaction,
        transaction_id=transaction_id,
        merchant_id=request.user.merchant_profile.id
    )

    # Prepare transaction data for receipt
    transaction_data = {
        'transaction_id': transaction.transaction_id,
        'merchant_name': request.user.merchant_profile.business_name,
        'amount': float(transaction.amount),
        'currency': transaction.currency,
        'card_last4': transaction.card_last4,
        'card_brand': transaction.card_brand,
        'status': transaction.status,
        'date': transaction.created_at.strftime('%Y-%m-%d %H:%M:%S')
    }

    # Generate receipt
    receipt_text = POSReceiptGenerator.generate_receipt(
        transaction_data=transaction_data,
        receipt_type=receipt_type
    )

    return Response({
        'receipt_text': receipt_text,
        'transaction_id': transaction_id,
        'receipt_type': receipt_type
    })


@api_view(['GET'])
@permission_classes([IsAuthenticated])
def get_pos_dashboard_data(request):
    """
    Get comprehensive POS dashboard data for merchant
    """
    # Check if user has merchant profile
    if not hasattr(request.user, 'merchant_profile'):
        return Response(
            {'error': 'Merchant profile not found'}, 
            status=status.HTTP_404_NOT_FOUND
        )
    
    merchant_id = request.user.merchant_profile.id

    # Device summary
    devices = POSDevice.objects.filter(merchant_id=merchant_id)
    device_summary = {
        'total': devices.count(),
        'active': devices.filter(status='active').count(),
        'inactive': devices.filter(status='inactive').count(),
        'by_type': list(devices.values('device_type').annotate(
            count=Count('id')
        ).order_by('device_type'))
    }

    # Transaction summary (last 30 days)
    thirty_days_ago = timezone.now() - timedelta(days=30)
    transactions = POSTransaction.objects.filter(
        merchant_id=merchant_id,
        created_at__gte=thirty_days_ago
    )

    transaction_summary = {
        'total_count': transactions.count(),
        'total_amount': transactions.aggregate(total=Sum('amount'))['total'] or 0,
        'completed_count': transactions.filter(status='completed').count(),
        'failed_count': transactions.filter(status='failed').count(),
        'by_device_type': list(transactions.values('device__device_type').annotate(
            count=Count('id'),
            total_amount=Sum('amount')
        ).order_by('device__device_type')),
        'daily_totals': list(transactions.extra(
            select={'date': 'DATE(created_at)'}
        ).values('date').annotate(
            count=Count('id'),
            amount=Sum('amount')
        ).order_by('date'))
    }

    # Recent transactions
    recent_transactions = transactions.order_by('-created_at')[:10]
    recent_data = []
    for txn in recent_transactions:
        recent_data.append({
            'transaction_id': txn.transaction_id,
            'device_type': txn.device.device_type if txn.device else None,
            'amount': float(txn.amount),
            'currency': txn.currency,
            'status': txn.status,
            'card_brand': txn.card_brand,
            'created_at': txn.created_at.isoformat()
        })

    return Response({
        'devices': device_summary,
        'transactions': transaction_summary,
        'recent_transactions': recent_data
    })
