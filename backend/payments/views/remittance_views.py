"""Remittance view classes: RemittanceView, OutboundRemittanceView, GlobalRemittanceView.
Split from main_remittance_views.py for maintainability."""

from rest_framework.views import APIView
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response
from rest_framework import status
from ..models.payment_method import PaymentMethod
import logging

logger = logging.getLogger(__name__)

class RemittanceView(APIView):
    """
    Handle international remittance requests
    """
    permission_classes = [IsAuthenticated]

    def post(self, request):
        """
        Process international remittance
        Expected data: {
            recipient, amount, currency, payment_method_id, purpose,
            delivery_method, delivery_phone, delivery_account_number,
            delivery_bank_name, delivery_bank_branch, delivery_mobile_provider
        }
        """
        try:
            # Basic validation
            required_fields = ['recipient', 'amount', 'currency', 'payment_method_id', 'delivery_method']
            for field in required_fields:
                if not request.data.get(field):
                    return Response(
                        {'error': f'{field} is required'},
                        status=status.HTTP_400_BAD_REQUEST
                    )

            # Validate delivery method specific fields
            delivery_method = request.data.get('delivery_method')
            if delivery_method == 'mobile_money':
                if not request.data.get('delivery_phone'):
                    return Response(
                        {'error': 'delivery_phone is required for mobile money delivery'},
                        status=status.HTTP_400_BAD_REQUEST
                    )
                if not request.data.get('delivery_mobile_provider'):
                    return Response(
                        {'error': 'delivery_mobile_provider is required for mobile money delivery'},
                        status=status.HTTP_400_BAD_REQUEST
                    )
            elif delivery_method == 'bank_account':
                if not request.data.get('delivery_account_number'):
                    return Response(
                        {'error': 'delivery_account_number is required for bank delivery'},
                        status=status.HTTP_400_BAD_REQUEST
                    )
                if not request.data.get('delivery_bank_name'):
                    return Response(
                        {'error': 'delivery_bank_name is required for bank delivery'},
                        status=status.HTTP_400_BAD_REQUEST
                    )

            # Get payment method
            try:
                payment_method = PaymentMethod.objects.get(
                    id=request.data.get('payment_method_id'),
                    user=request.user
                )
            except PaymentMethod.DoesNotExist:
                return Response(
                    {'error': 'Invalid payment method'},
                    status=status.HTTP_400_BAD_REQUEST
                )

            # Process remittance using the cross-border service
            from ..services.cross_border_remittance_service import remittance_service
            from decimal import Decimal

            recipient_data = request.data.get('recipient', {})
            if isinstance(recipient_data, str):
                recipient_data = {'name': recipient_data}

            delivery_details = {
                'phone_number': request.data.get('delivery_phone'),
                'provider': request.data.get('delivery_mobile_provider'),
                'account_number': request.data.get('delivery_account_number'),
                'bank_name': request.data.get('delivery_bank_name'),
                'bank_branch': request.data.get('delivery_bank_branch'),
            }

            result = remittance_service.initiate_remittance(
                sender_user=request.user,
                recipient_data=recipient_data,
                amount=Decimal(str(request.data.get('amount'))),
                source_currency=request.data.get('currency', 'GHS'),
                destination_currency=request.data.get('destination_currency', 'GHS'),
                delivery_method=delivery_method,
                delivery_details=delivery_details,
                payment_method=payment_method,
                purpose=request.data.get('purpose', 'family_support'),
                metadata=request.data.get('metadata')
            )

            if result.get('success'):
                return Response(result, status=status.HTTP_201_CREATED)
            else:
                return Response(
                    {'error': result.get('error', 'Remittance failed')},
                    status=status.HTTP_400_BAD_REQUEST
                )

        except Exception as e:
            logger.error(f"Remittance failed: {str(e)}")
            return Response(
                {'error': str(e)},
                status=status.HTTP_400_BAD_REQUEST
            )

class OutboundRemittanceView(APIView):
    """
    Handle outbound international remittance requests (Ghana to other countries)
    """
    permission_classes = [IsAuthenticated]

    def post(self, request):
        """
        Process outbound international remittance
        Expected data: {
            recipient, amount, currency, payment_method_id, purpose,
            delivery_method, delivery_phone, delivery_account_number,
            delivery_bank_name, delivery_bank_branch, delivery_routing_number,
            delivery_swift_code, delivery_mobile_provider, delivery_address,
            delivery_city, delivery_postal_code, delivery_wallet_id
        }
        """
        try:
            # Basic validation
            required_fields = ['recipient', 'amount', 'currency', 'payment_method_id', 'delivery_method', 'purpose']
            for field in required_fields:
                if not request.data.get(field):
                    return Response(
                        {'error': f'{field} is required'},
                        status=status.HTTP_400_BAD_REQUEST
                    )

            # Validate delivery method specific fields
            delivery_method = request.data.get('delivery_method')
            if delivery_method == 'bank_transfer':
                if not request.data.get('delivery_account_number') or not request.data.get('delivery_bank_name'):
                    return Response(
                        {'error': 'Account number and bank name are required for bank transfers'},
                        status=status.HTTP_400_BAD_REQUEST
                    )
            elif delivery_method == 'mobile_money':
                if not request.data.get('delivery_phone') or not request.data.get('delivery_mobile_provider'):
                    return Response(
                        {'error': 'Phone number and mobile provider are required for mobile money'},
                        status=status.HTTP_400_BAD_REQUEST
                    )
            elif delivery_method == 'cash_pickup':
                if not request.data.get('delivery_address') or not request.data.get('delivery_city'):
                    return Response(
                        {'error': 'Address and city are required for cash pickup'},
                        status=status.HTTP_400_BAD_REQUEST
                    )

            # Get payment method
            try:
                payment_method = PaymentMethod.objects.get(
                    id=request.data.get('payment_method_id'),
                    user=request.user
                )
            except PaymentMethod.DoesNotExist:
                return Response(
                    {'error': 'Invalid payment method'},
                    status=status.HTTP_400_BAD_REQUEST
                )

            # Process outbound remittance using the cross-border service
            from ..services.cross_border_remittance_service import remittance_service
            from decimal import Decimal

            recipient_data = request.data.get('recipient', {})
            if isinstance(recipient_data, str):
                recipient_data = {'name': recipient_data}
            recipient_data['country'] = request.data.get('recipient_country', 'GH')

            delivery_details = {
                'phone_number': request.data.get('delivery_phone'),
                'provider': request.data.get('delivery_mobile_provider'),
                'account_number': request.data.get('delivery_account_number'),
                'bank_name': request.data.get('delivery_bank_name'),
                'bank_code': request.data.get('delivery_bank_code'),
                'bank_branch': request.data.get('delivery_bank_branch'),
                'routing_number': request.data.get('delivery_routing_number'),
                'swift_code': request.data.get('delivery_swift_code'),
                'pickup_location': request.data.get('delivery_address'),
                'city': request.data.get('delivery_city'),
                'postal_code': request.data.get('delivery_postal_code'),
                'wallet_id': request.data.get('delivery_wallet_id'),
            }

            result = remittance_service.initiate_remittance(
                sender_user=request.user,
                recipient_data=recipient_data,
                amount=Decimal(str(request.data.get('amount'))),
                source_currency=request.data.get('currency', 'GHS'),
                destination_currency=request.data.get('destination_currency', request.data.get('currency', 'GHS')),
                delivery_method=delivery_method,
                delivery_details=delivery_details,
                payment_method=payment_method,
                purpose=request.data.get('purpose', 'family_support'),
                metadata=request.data.get('metadata')
            )

            if result.get('success'):
                result['delivery_time'] = self._calculate_delivery_time(delivery_method)
                return Response(result, status=status.HTTP_201_CREATED)
            else:
                return Response(
                    {'error': result.get('error', 'Outbound remittance failed')},
                    status=status.HTTP_400_BAD_REQUEST
                )

        except Exception as e:
            logger.error(f"Outbound remittance failed: {str(e)}")
            return Response(
                {'error': str(e)},
                status=status.HTTP_400_BAD_REQUEST
            )

    def _calculate_delivery_time(self, delivery_method: str) -> str:
        """Calculate estimated delivery time based on delivery method"""
        if delivery_method == 'mobile_money':
            return 'Instant - 30 minutes'
        elif delivery_method == 'wallet':
            return 'Instant - 2 hours'
        elif delivery_method == 'cash_pickup':
            return 'Same day - 2 business days'
        elif delivery_method == 'bank_transfer':
            return '1-5 business days'
        else:
            return '1-3 business days'

class GlobalRemittanceView(APIView):
    """
    Handle global international remittance requests (any country to any country)
    """
    permission_classes = [IsAuthenticated]

    def post(self, request):
        """
        Process global international remittance
        Expected data: {
            sender_name, sender_email, sender_phone, sender_address, sender_country,
            recipient, recipient_name, recipient_email, recipient_phone, recipient_country,
            amount, currency, payment_method_id, purpose,
            delivery_method, delivery_phone, delivery_account_number,
            delivery_bank_name, delivery_bank_branch, delivery_routing_number,
            delivery_swift_code, delivery_mobile_provider, delivery_address,
            delivery_city, delivery_postal_code, delivery_wallet_id
        }
        """
        try:
            # Basic validation
            required_fields = [
                'sender_name', 'sender_email', 'sender_country',
                'recipient', 'recipient_name', 'recipient_country',
                'amount', 'currency', 'payment_method_id', 'delivery_method', 'purpose'
            ]
            for field in required_fields:
                if not request.data.get(field):
                    return Response(
                        {'error': f'{field} is required'},
                        status=status.HTTP_400_BAD_REQUEST
                    )

            # Validate delivery method specific fields
            delivery_method = request.data.get('delivery_method')
            if delivery_method == 'bank_transfer':
                if not request.data.get('delivery_account_number') or not request.data.get('delivery_bank_name'):
                    return Response(
                        {'error': 'Account number and bank name are required for bank transfers'},
                        status=status.HTTP_400_BAD_REQUEST
                    )
            elif delivery_method == 'mobile_money':
                if not request.data.get('delivery_phone') or not request.data.get('delivery_mobile_provider'):
                    return Response(
                        {'error': 'Phone number and mobile provider are required for mobile money'},
                        status=status.HTTP_400_BAD_REQUEST
                    )
            elif delivery_method == 'cash_pickup':
                if not request.data.get('delivery_address') or not request.data.get('delivery_city'):
                    return Response(
                        {'error': 'Address and city are required for cash pickup'},
                        status=status.HTTP_400_BAD_REQUEST
                    )
            elif delivery_method == 'digital_wallet':
                if not request.data.get('delivery_wallet_id'):
                    return Response(
                        {'error': 'Wallet ID is required for digital wallet transfers'},
                        status=status.HTTP_400_BAD_REQUEST
                    )

            # Get payment method
            try:
                payment_method = PaymentMethod.objects.get(
                    id=request.data.get('payment_method_id'),
                    user=request.user
                )
            except PaymentMethod.DoesNotExist:
                return Response(
                    {'error': 'Invalid payment method'},
                    status=status.HTTP_400_BAD_REQUEST
                )

            # Process global remittance using the cross-border service
            from ..services.cross_border_remittance_service import remittance_service
            from decimal import Decimal

            sender_country = request.data.get('sender_country', 'GH')
            recipient_country = request.data.get('recipient_country', 'GH')

            recipient_data = {
                'name': request.data.get('recipient_name'),
                'email': request.data.get('recipient_email'),
                'phone': request.data.get('recipient_phone'),
                'country': recipient_country,
                'address': request.data.get('recipient_address'),
            }

            delivery_details = {
                'phone_number': request.data.get('delivery_phone'),
                'provider': request.data.get('delivery_mobile_provider'),
                'account_number': request.data.get('delivery_account_number'),
                'bank_name': request.data.get('delivery_bank_name'),
                'bank_code': request.data.get('delivery_bank_code'),
                'bank_branch': request.data.get('delivery_bank_branch'),
                'routing_number': request.data.get('delivery_routing_number'),
                'swift_code': request.data.get('delivery_swift_code'),
                'pickup_location': request.data.get('delivery_address'),
                'city': request.data.get('delivery_city'),
                'postal_code': request.data.get('delivery_postal_code'),
                'wallet_id': request.data.get('delivery_wallet_id'),
                'wallet_provider': request.data.get('delivery_wallet_provider'),
            }

            result = remittance_service.initiate_remittance(
                sender_user=request.user,
                recipient_data=recipient_data,
                amount=Decimal(str(request.data.get('amount'))),
                source_currency=request.data.get('currency', 'GHS'),
                destination_currency=request.data.get('destination_currency', request.data.get('currency', 'GHS')),
                delivery_method=delivery_method,
                delivery_details=delivery_details,
                payment_method=payment_method,
                purpose=request.data.get('purpose', 'family_support'),
                metadata={
                    'sender_name': request.data.get('sender_name'),
                    'sender_email': request.data.get('sender_email'),
                    'sender_phone': request.data.get('sender_phone'),
                    'sender_country': sender_country,
                    'sender_address': request.data.get('sender_address'),
                }
            )

            if result.get('success'):
                result['delivery_time'] = self._calculate_delivery_time(
                    delivery_method, sender_country, recipient_country
                )
                return Response(result, status=status.HTTP_201_CREATED)
            else:
                return Response(
                    {'error': result.get('error', 'Global remittance failed')},
                    status=status.HTTP_400_BAD_REQUEST
                )

        except Exception as e:
            logger.error(f"Global remittance failed: {str(e)}")
            return Response(
                {'error': str(e)},
                status=status.HTTP_400_BAD_REQUEST
            )

    def _calculate_delivery_time(self, delivery_method: str, sender_country: str, recipient_country: str) -> str:
        """Calculate estimated delivery time based on delivery method and countries"""
        # Same country transfers are faster
        is_domestic = sender_country == recipient_country

        if delivery_method == 'mobile_money':
            return 'Instant - 30 minutes' if is_domestic else 'Instant - 2 hours'
        elif delivery_method == 'digital_wallet':
            return 'Instant - 1 hour' if is_domestic else 'Instant - 4 hours'
        elif delivery_method == 'sikaRemit_user':
            return 'Instant - 15 minutes'
        elif delivery_method == 'cash_pickup':
            return 'Same day' if is_domestic else '1-3 business days'
        elif delivery_method == 'bank_transfer':
            return '1-2 business days' if is_domestic else '2-7 business days'
        else:
            return '1-5 business days'
