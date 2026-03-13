"""Cross-border remittance views: CrossBorderRemittanceViewSet.
Split from main_remittance_views.py for maintainability."""

from rest_framework import viewsets
from rest_framework.decorators import action
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response
from rest_framework import status
from ..models.cross_border import CrossBorderRemittance
from ..serializers.cross_border import CrossBorderRemittanceSerializer
import logging

logger = logging.getLogger(__name__)


class CrossBorderRemittanceViewSet(viewsets.ModelViewSet):
    """
    API for international money transfers
    """
    queryset = CrossBorderRemittance.objects.all()
    serializer_class = CrossBorderRemittanceSerializer
    permission_classes = [IsAuthenticated]

    @action(detail=False, methods=['post'])
    def initiate_transfer(self, request):
        """
        Initiate cross-border money transfer
        ---
        parameters:
          - name: recipientName
            type: string
            required: true
          - name: recipientPhone
            type: string
            required: true
          - name: recipientCountry
            type: string
            required: true
          - name: recipientAddress
            type: string
            required: false
          - name: recipientAccountType
            type: string
            required: false
          - name: recipientAccountNumber
            type: string
            required: false
          - name: beneficiaryInstitutionName
            type: string
            required: false
          - name: beneficiaryInstitutionAddress
            type: string
            required: false
          - name: amount
            type: number
            required: true
          - name: senderAddress
            type: string
            required: false
          - name: senderIdType
            type: string
            required: false
          - name: senderIdNumber
            type: string
            required: false
        """
        try:
            remittance = CrossBorderRemittance.objects.create(
                user=request.user,
                recipient_name=request.data.get('recipientName'),
                recipient_phone=request.data.get('recipientPhone'),
                recipient_country=request.data.get('recipientCountry'),
                recipient_address=request.data.get('recipientAddress'),
                recipient_account_type=request.data.get('recipientAccountType'),
                recipient_account_number=request.data.get('recipientAccountNumber'),
                beneficiary_institution_name=request.data.get('beneficiaryInstitutionName'),
                beneficiary_institution_address=request.data.get('beneficiaryInstitutionAddress'),
                # Transaction Details
                amount_sent=request.data['amount'],
                user_reference_number=request.data.get('userReferenceNumber'),
                payment_method=request.data.get('paymentMethod'),
            )

            # Use the CrossBorderService for processing exchange rate and fee calculation
            from ..services.cross_border_service import CrossBorderService

            # Calculate exchange rate and fee
            exchange_rate = CrossBorderService.get_exchange_rate('USD', remittance.recipient_country)
            fee = CrossBorderService.calculate_fees(remittance.amount_sent, ('US', remittance.recipient_country))

            # Update remittance with calculated values
            remittance.exchange_rate = exchange_rate
            remittance.fee = fee
            remittance.amount_received = remittance.amount_sent * exchange_rate - fee
            remittance.save()

            # Send notification for initiated transfer
            CrossBorderService._send_remittance_notification(remittance, 'initiated')

            serializer = self.get_serializer(remittance)
            return Response(
                serializer.data,
                status=status.HTTP_201_CREATED
            )

        except ValueError as e:
            return Response(
                {'error': str(e)},
                status=status.HTTP_400_BAD_REQUEST
            )
        except Exception as e:
            logger.error(f"Cross-border transfer initiation failed: {str(e)}")
            return Response(
                {'error': 'Transfer initiation failed'},
                status=status.HTTP_500_INTERNAL_SERVER_ERROR
            )

    @action(detail=True, methods=['post'])
    def request_exemption(self, request, pk=None):
        """
        Request exemption for a remittance
        ---
        parameters:
          - name: exemption_type
            type: string
            required: true
          - name: justification
            type: string
            required: true
        responses:
          200:
            description: Exemption request submitted
          400:
            description: Invalid request
        """
        remittance = self.get_object()

        try:
            remittance.exempt_status = request.data['exemption_type']
            remittance.exemption_status = 'pending'
            remittance.exemption_notes = request.data['justification']
            remittance.save()

            return Response(
                {'status': 'exemption_requested'},
                status=status.HTTP_200_OK
            )
        except Exception as e:
            return Response(
                {'error': str(e)},
                status=status.HTTP_400_BAD_REQUEST
            )

    @action(detail=True, methods=['post'])
    def approve_exemption(self, request, pk=None):
        """API to approve exemption"""
        remittance = self.get_object()
        try:
            remittance.approve_exemption(
                request.user,
                request.data.get('notes', '')
            )
            return Response({'status': 'approved'})
        except Exception as e:
            return Response(
                {'error': str(e)},
                status=status.HTTP_400_BAD_REQUEST
            )

    @action(detail=True, methods=['post'])
    def reject_exemption(self, request, pk=None):
        """API to reject exemption"""
        remittance = self.get_object()
        try:
            remittance.reject_exemption(
                request.user,
                request.data['notes']
            )
            return Response({'status': 'rejected'})
        except Exception as e:
            return Response(
                {'error': str(e)},
                status=status.HTTP_400_BAD_REQUEST
            )

    @action(detail=False, methods=['post'])
    def calculate_transfer_fees(self, request):
        """
        Calculate transfer fees and exchange rates
        ---
        parameters:
          - name: amount
            type: number
            required: true
          - name: destination
            type: string
            required: true
          - name: from_currency
            type: string
            required: false
            default: USD
        responses:
          200:
            description: Fee calculation result
          400:
            description: Invalid request
        """
        try:
            from decimal import Decimal
            amount = Decimal(str(request.data.get('amount', 0)))
            destination = request.data.get('destination')
            from_currency = request.data.get('from_currency', 'USD')

            if not amount or not destination:
                return Response(
                    {'error': 'amount and destination are required'},
                    status=status.HTTP_400_BAD_REQUEST
                )

            # Use CrossBorderService for calculations
            from ..services.cross_border_service import CrossBorderService

            # Get exchange rate
            exchange_rate = CrossBorderService.get_exchange_rate(from_currency, destination)

            # Calculate fees
            fee = CrossBorderService.calculate_fees(amount, ('US', destination))

            # Calculate recipient receives
            recipient_receives = amount * exchange_rate - fee

            return Response({
                'baseFee': float(settings.REMITTANCE_FEE_BASE),
                'percentageFee': float(amount * settings.REMITTANCE_FEE_PERCENTAGE),
                'totalFee': float(fee),
                'exchangeRate': float(exchange_rate),
                'recipientReceives': float(recipient_receives),
                'amount': float(amount),
                'destination': destination,
                'fromCurrency': from_currency
            })

        except Exception as e:
            logger.error(f"Fee calculation failed: {str(e)}")
            return Response(
                {'error': 'Fee calculation failed'},
                status=status.HTTP_500_INTERNAL_SERVER_ERROR
            )

    @action(detail=False, methods=['get'])
    def exchange_rates(self, request):
        """
        Get current exchange rates
        ---
        parameters:
          - name: from_currency
            type: string
            required: false
            default: USD
          - name: to_currency
            type: string
            required: false
            default: GHS
        responses:
          200:
            description: Exchange rate data
        """
        try:
            from django.conf import settings
            from django.utils import timezone
            from ..services.cross_border_service import CrossBorderService

            from_currency = request.query_params.get('from_currency', 'USD')
            to_currency = request.query_params.get('to_currency', 'GHS')

            exchange_rate = CrossBorderService.get_exchange_rate(from_currency, to_currency)

            return Response({
                'rate': float(exchange_rate),
                'fromCurrency': from_currency,
                'toCurrency': to_currency,
                'timestamp': timezone.now().isoformat()
            })

        except Exception as e:
            logger.error(f"Exchange rate lookup failed: {str(e)}")
            return Response(
                {'error': 'Exchange rate lookup failed'},
                status=status.HTTP_500_INTERNAL_SERVER_ERROR
            )
