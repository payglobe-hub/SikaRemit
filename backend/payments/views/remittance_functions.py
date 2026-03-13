"""Remittance function-based views: send_remittance_view, initiate_payment_view, etc.
Split from main_remittance_views.py for maintainability."""

from rest_framework.decorators import api_view, permission_classes
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response
from rest_framework import status
from ..models.payment_method import PaymentMethod
import logging

logger = logging.getLogger(__name__)


@api_view(['POST'])
@permission_classes([IsAuthenticated])
def send_remittance_view(request):
    """
    Handle international remittance payments
    """
    from ..gateways.mobile_money import MobileMoneyGateway
    from ..models import PaymentMethod as PaymentMethodModel

    try:
        data = request.data
        recipient = data.get('recipient')
        amount = data.get('amount')
        currency = data.get('currency', 'GHS')
        payment_method_id = data.get('payment_method_id')
        purpose = data.get('purpose', '')

        # Validate required fields with detailed error messages
        missing_fields = []
        if not recipient:
            missing_fields.append('recipient')
        if not amount:
            missing_fields.append('amount')
        if not payment_method_id:
            missing_fields.append('payment_method_id')

        if missing_fields:
            return Response({
                'success': False,
                'error': {
                    'code': 'MISSING_REQUIRED_FIELDS',
                    'message': 'Required fields are missing',
                    'details': f'Missing fields: {", ".join(missing_fields)}',
                    'missing_fields': missing_fields
                }
            }, status=status.HTTP_400_BAD_REQUEST)

        # Validate amount
        try:
            amount = float(amount)
            if amount <= 0:
                return Response({
                    'success': False,
                    'error': {
                        'code': 'INVALID_AMOUNT',
                        'message': 'Amount must be greater than zero',
                        'details': f'Provided amount: {amount}'
                    }
                }, status=status.HTTP_400_BAD_REQUEST)
        except (ValueError, TypeError):
            return Response({
                'success': False,
                'error': {
                    'code': 'INVALID_AMOUNT_FORMAT',
                    'message': 'Amount must be a valid number',
                    'details': f'Provided value: {data.get("amount")}'
                }
            }, status=status.HTTP_400_BAD_REQUEST)

        # Get payment method
        try:
            payment_method = PaymentMethodModel.objects.get(
                id=payment_method_id,
                user=request.user
            )
        except PaymentMethodModel.DoesNotExist:
            return Response({
                'success': False,
                'error': {
                    'code': 'INVALID_PAYMENT_METHOD',
                    'message': 'Payment method not found or does not belong to user',
                    'details': f'Payment method ID: {payment_method_id}'
                }
            }, status=status.HTTP_400_BAD_REQUEST)

        # Check if payment method is active
        if not payment_method.is_active:
            return Response({
                'success': False,
                'error': {
                    'code': 'INACTIVE_PAYMENT_METHOD',
                    'message': 'Payment method is not active',
                    'details': f'Payment method ID: {payment_method_id}'
                }
            }, status=status.HTTP_400_BAD_REQUEST)

        # Route to appropriate gateway
        if payment_method.method_type in PaymentMethod.MOBILE_MONEY_TYPES:
            gateway = MobileMoneyGateway()
        else:
            # For other payment types, use appropriate gateways
            if payment_method.method_type == 'card':
                from ..gateways.stripe import StripeGateway
                gateway = StripeGateway()
            elif payment_method.method_type == 'bank_transfer':
                from ..gateways.bank_transfer import BankTransferGateway
                gateway = BankTransferGateway()
            elif payment_method.method_type == PaymentMethod.SIKAREMIT_BALANCE:
                from ..gateways.sikaremit_balance import SikaRemitBalanceGateway
                gateway = SikaRemitBalanceGateway()
            else:
                # Unsupported payment method type
                return Response({
                    'success': False,
                    'error': {
                        'code': 'UNSUPPORTED_PAYMENT_METHOD',
                        'message': f'Payment method type {payment_method.method_type} is not supported',
                        'details': f'Supported types: mtn_momo, telecel, airtel_tigo, g_money, card, bank_transfer, sikaremit_balance'
                    }
                }, status=status.HTTP_400_BAD_REQUEST)

        # Process payment
        result = gateway.process_payment(
            amount=amount,
            currency=currency,
            payment_method=payment_method,
            customer=request.user.customer_profile,
            merchant=None,
            metadata={'purpose': purpose, 'recipient': recipient}
        )

        return Response(result)

    except Exception as e:
        logger.error(f"Remittance failed: {str(e)}")
        return Response({
            'success': False,
            'error': {
                'code': 'REMITTANCE_FAILED',
                'message': 'International remittance processing failed',
                'details': str(e)
            }
        }, status=status.HTTP_500_INTERNAL_SERVER_ERROR)


@api_view(['POST'])
@permission_classes([IsAuthenticated])
def initiate_payment_view(request):
    """
    Initiate payment for various transaction types (airtime, data, account topup, etc.)
    """
    from ..gateways.mobile_money import MobileMoneyGateway
    from ..models import PaymentMethod as PaymentMethodModel

    try:
        data = request.data
        transaction_type = data.get('type')
        amount = data.get('amount')
        payment_method_id = data.get('payment_method_id')
        currency = data.get('currency', 'GHS')

        if not all([transaction_type, amount, payment_method_id]):
            return Response(
                {'error': 'Missing required fields'},
                status=status.HTTP_400_BAD_REQUEST
            )

        # Get payment method
        try:
            payment_method = PaymentMethodModel.objects.get(
                id=payment_method_id,
                user=request.user
            )
        except PaymentMethodModel.DoesNotExist:
            return Response(
                {'error': 'Invalid payment method'},
                status=status.HTTP_400_BAD_REQUEST
            )

        # Route based on transaction type and payment method
        if transaction_type == 'p2p_send':
            # Handle peer-to-peer transfer between SikaRemit users
            from ..services.currency_service import WalletService
            from users.models import User

            # Get recipient user
            recipient_details = data.get('recipient_details', {})
            user_id = recipient_details.get('user_id')

            if not user_id:
                return Response(
                    {'error': 'Recipient user ID required for P2P transfer'},
                    status=status.HTTP_400_BAD_REQUEST
                )

            try:
                recipient_user = User.objects.get(id=user_id)
            except User.DoesNotExist:
                return Response(
                    {'error': 'Recipient user not found'},
                    status=status.HTTP_400_BAD_REQUEST
                )

            # Check if sender is trying to send to themselves
            if recipient_user.id == request.user.id:
                return Response(
                    {'error': 'Cannot send money to yourself'},
                    status=status.HTTP_400_BAD_REQUEST
                )

            # Get sender's wallet balance for the currency
            sender_wallet = WalletService.get_wallet_balance(request.user, currency)
            if not sender_wallet or sender_wallet.available_balance < amount:
                return Response(
                    {'error': 'Insufficient balance for transfer'},
                    status=status.HTTP_400_BAD_REQUEST
                )

            # Transfer balance between users
            from django.db import transaction as db_transaction

            with db_transaction.atomic():
                # Deduct from sender
                success = sender_wallet.deduct_balance(amount, 'available')
                if not success:
                    return Response(
                        {'error': 'Failed to deduct from sender balance'},
                        status=status.HTTP_500_INTERNAL_SERVER_ERROR
                    )

                # Add to recipient
                recipient_wallet = WalletService.get_or_create_wallet_balance(recipient_user, currency)
                recipient_wallet.add_balance(amount, 'available')

                # Create transaction records for both users
                from ..models.transaction import Transaction
                from django.utils import timezone

                # Create sender transaction
                sender_transaction = Transaction.objects.create(
                    customer=request.user.customer_profile,
                    amount=-amount,  # Negative for outgoing
                    status='completed',
                    currency=currency,
                    description=data.get('description', 'P2P Transfer Sent'),
                    created_at=timezone.now(),
                    completed_at=timezone.now(),
                    metadata={
                        'transaction_type': 'p2p_send',
                        'recipient_user_id': recipient_user.id,
                        'recipient_email': recipient_user.email,
                        'recipient_name': recipient_details.get('recipient_name', recipient_user.get_full_name())
                    }
                )

                # Create recipient transaction
                recipient_transaction = Transaction.objects.create(
                    customer=recipient_user.customer_profile,
                    amount=amount,  # Positive for incoming
                    status='completed',
                    currency=currency,
                    description=data.get('description', 'P2P Transfer Received'),
                    created_at=timezone.now(),
                    completed_at=timezone.now(),
                    metadata={
                        'transaction_type': 'p2p_receive',
                        'sender_user_id': request.user.id,
                        'sender_email': request.user.email,
                        'sender_name': request.user.get_full_name()
                    }
                )

                # Send notifications
                from ..services.notification_service import NotificationService
                try:
                    # Notify sender
                    NotificationService.send_notification(
                        user=request.user,
                        notification_type='transfer_completed',
                        title='Transfer Sent',
                        message=f'You successfully sent {amount} {currency} to {recipient_user.get_full_name()}',
                        metadata={
                            'transaction_id': sender_transaction.id,
                            'amount': amount,
                            'currency': currency,
                            'recipient': recipient_user.get_full_name()
                        }
                    )

                    # Notify recipient
                    NotificationService.send_notification(
                        user=recipient_user,
                        notification_type='transfer_received',
                        title='Transfer Received',
                        message=f'You received {amount} {currency} from {request.user.get_full_name()}',
                        metadata={
                            'transaction_id': recipient_transaction.id,
                            'amount': amount,
                            'currency': currency,
                            'sender': request.user.get_full_name()
                        }
                    )
                except Exception as e:
                    logger.warning(f"Failed to send notifications: {str(e)}")

            return Response({
                'success': True,
                'transaction_id': sender_transaction.id,
                'status': 'completed',
                'message': f'Successfully transferred {amount} {currency} to {recipient_user.get_full_name()}'
            })

        elif payment_method.method_type in PaymentMethod.MOBILE_MONEY_TYPES:
            gateway = MobileMoneyGateway()
        else:
            # For other payment types, use appropriate gateways
            if payment_method.method_type == 'card':
                from ..gateways.stripe import StripeGateway
                gateway = StripeGateway()
            elif payment_method.method_type == 'bank_transfer':
                from ..gateways.bank_transfer import BankTransferGateway
                gateway = BankTransferGateway()
            elif payment_method.method_type == PaymentMethod.SIKAREMIT_BALANCE:
                from ..gateways.sikaremit_balance import SikaRemitBalanceGateway
                gateway = SikaRemitBalanceGateway()
            else:
                # Unsupported payment method type
                return Response({
                    'success': False,
                    'error': {
                        'code': 'UNSUPPORTED_PAYMENT_METHOD',
                        'message': f'Payment method type {payment_method.method_type} is not supported',
                        'details': f'Supported types: mtn_momo, telecel, airtel_tigo, g_money, card, bank_transfer, sikaremit_balance'
                    }
                }, status=status.HTTP_400_BAD_REQUEST)

        # Process payment with appropriate metadata
        metadata = {
            'transaction_type': transaction_type,
            'user_id': request.user.id
        }

        # Add type-specific data
        if transaction_type in ['airtime', 'data']:
            metadata.update({
                'telecom_provider': data.get('telecom_details', {}).get('provider'),
                'phone_number': data.get('telecom_details', {}).get('phoneNumber')
            })
        elif transaction_type == 'account_topup':
            metadata.update({'topup_type': 'account_balance'})

        result = gateway.process_payment(
            amount=amount,
            currency=currency,
            payment_method=payment_method,
            customer=request.user.customer_profile,
            merchant=None,
            metadata=metadata
        )

        return Response(result)

    except Exception as e:
        logger.error(f"Payment initiation failed: {str(e)}")
        return Response(
            {'error': str(e)},
            status=status.HTTP_500_INTERNAL_SERVER_ERROR
        )


@api_view(['POST'])
@permission_classes([IsAuthenticated])
def process_checkout_view(request):
    """
    Process checkout for merchant payments
    """
    from ..gateways.mobile_money import MobileMoneyGateway
    from ..models import PaymentMethod as PaymentMethodModel
    from users.models import Merchant

    try:
        data = request.data
        merchant_id = data.get('merchant_id')
        amount = data.get('amount')
        currency = data.get('currency', 'GHS')
        payment_method_id = data.get('payment_method_id')
        description = data.get('description', '')

        if not all([merchant_id, amount, payment_method_id]):
            return Response(
                {'error': 'Missing required fields'},
                status=status.HTTP_400_BAD_REQUEST
            )

        # Get merchant
        try:
            merchant = Merchant.objects.get(id=merchant_id)
        except Merchant.DoesNotExist:
            return Response(
                {'error': 'Invalid merchant'},
                status=status.HTTP_400_BAD_REQUEST
            )

        # Get payment method
        try:
            payment_method = PaymentMethodModel.objects.get(
                id=payment_method_id,
                user=request.user
            )
        except PaymentMethodModel.DoesNotExist:
            return Response(
                {'error': 'Invalid payment method'},
                status=status.HTTP_400_BAD_REQUEST
            )

        # Route to appropriate gateway
        if payment_method.method_type in PaymentMethod.MOBILE_MONEY_TYPES:
            gateway = MobileMoneyGateway()
        else:
            # For other payment types, use appropriate gateways
            if payment_method.method_type == 'card':
                from ..gateways.stripe import StripeGateway
                gateway = StripeGateway()
            elif payment_method.method_type == 'bank_transfer':
                from ..gateways.bank_transfer import BankTransferGateway
                gateway = BankTransferGateway()
            elif payment_method.method_type == PaymentMethod.SIKAREMIT_BALANCE:
                from ..gateways.sikaremit_balance import SikaRemitBalanceGateway
                gateway = SikaRemitBalanceGateway()
            else:
                # Unsupported payment method type
                return Response({
                    'success': False,
                    'error': {
                        'code': 'UNSUPPORTED_PAYMENT_METHOD',
                        'message': f'Payment method type {payment_method.method_type} is not supported',
                        'details': f'Supported types: mtn_momo, telecel, airtel_tigo, g_money, card, bank_transfer, sikaremit_balance'
                    }
                }, status=status.HTTP_400_BAD_REQUEST)

        result = gateway.process_payment(
            amount=amount,
            currency=currency,
            payment_method=payment_method,
            customer=request.user.customer_profile,
            merchant=merchant,
            metadata={'description': description, 'merchant_id': merchant_id}
        )

        return Response(result)

    except Exception as e:
        logger.error(f"Checkout processing failed: {str(e)}")
        return Response(
            {'error': str(e)},
            status=status.HTTP_500_INTERNAL_SERVER_ERROR
        )


@api_view(['POST'])
@permission_classes([IsAuthenticated])
def send_outbound_remittance_view(request):
    """
    Handle outbound international remittances
    """
    from ..gateways.mobile_money import MobileMoneyGateway
    from ..models import PaymentMethod as PaymentMethodModel

    try:
        data = request.data
        recipient = data.get('recipient')
        amount = data.get('amount')
        currency = data.get('currency', 'USD')
        payment_method_id = data.get('payment_method_id')
        purpose = data.get('purpose', '')
        delivery_method = data.get('delivery_method')

        # Validate required fields with detailed error messages
        missing_fields = []
        if not recipient:
            missing_fields.append('recipient')
        if not amount:
            missing_fields.append('amount')
        if not payment_method_id:
            missing_fields.append('payment_method_id')
        if not delivery_method:
            missing_fields.append('delivery_method')

        if missing_fields:
            return Response({
                'success': False,
                'error': {
                    'code': 'MISSING_REQUIRED_FIELDS',
                    'message': 'Required fields are missing',
                    'details': f'Missing fields: {", ".join(missing_fields)}',
                    'missing_fields': missing_fields
                }
            }, status=status.HTTP_400_BAD_REQUEST)

        # Validate amount
        try:
            amount = float(amount)
            if amount <= 0:
                return Response({
                    'success': False,
                    'error': {
                        'code': 'INVALID_AMOUNT',
                        'message': 'Amount must be greater than zero',
                        'details': f'Provided amount: {amount}'
                    }
                }, status=status.HTTP_400_BAD_REQUEST)
        except (ValueError, TypeError):
            return Response({
                'success': False,
                'error': {
                    'code': 'INVALID_AMOUNT_FORMAT',
                    'message': 'Amount must be a valid number',
                    'details': f'Provided value: {data.get("amount")}'
                }
            }, status=status.HTTP_400_BAD_REQUEST)

        # Validate delivery method
        valid_delivery_methods = ['bank_transfer', 'mobile_money', 'cash_pickup', 'digital_wallet']
        if delivery_method not in valid_delivery_methods:
            return Response({
                'success': False,
                'error': {
                    'code': 'INVALID_DELIVERY_METHOD',
                    'message': 'Invalid delivery method',
                    'details': f'Provided method: {delivery_method}, valid methods: {", ".join(valid_delivery_methods)}'
                }
            }, status=status.HTTP_400_BAD_REQUEST)

        # Get payment method
        try:
            payment_method = PaymentMethodModel.objects.get(
                id=payment_method_id,
                user=request.user
            )
        except PaymentMethodModel.DoesNotExist:
            return Response({
                'success': False,
                'error': {
                    'code': 'INVALID_PAYMENT_METHOD',
                    'message': 'Payment method not found or does not belong to user',
                    'details': f'Payment method ID: {payment_method_id}'
                }
            }, status=status.HTTP_400_BAD_REQUEST)

        # Check if payment method is active
        if not payment_method.is_active:
            return Response({
                'success': False,
                'error': {
                    'code': 'INACTIVE_PAYMENT_METHOD',
                    'message': 'Payment method is not active',
                    'details': f'Payment method ID: {payment_method_id}'
                }
            }, status=status.HTTP_400_BAD_REQUEST)

        # Use mobile money gateway for transfers
        gateway = MobileMoneyGateway()

        metadata = {
            'purpose': purpose,
            'recipient': recipient,
            'delivery_method': delivery_method,
            'recipient_country': data.get('recipient_country'),
            'recipient_name': data.get('recipient_name')
        }

        # Add delivery-specific data
        if delivery_method == 'bank_transfer':
            required_bank_fields = ['delivery_account_number', 'delivery_bank_name']
            missing_bank_fields = [field for field in required_bank_fields if not data.get(field)]
            if missing_bank_fields:
                return Response({
                    'success': False,
                    'error': {
                        'code': 'MISSING_BANK_DETAILS',
                        'message': 'Bank transfer requires account number and bank name',
                        'details': f'Missing fields: {", ".join(missing_bank_fields)}',
                        'missing_fields': missing_bank_fields
                    }
                }, status=status.HTTP_400_BAD_REQUEST)

            metadata.update({
                'bank_name': data.get('delivery_bank_name'),
                'account_number': data.get('delivery_account_number'),
                'routing_number': data.get('delivery_routing_number'),
                'swift_code': data.get('delivery_swift_code')
            })
        elif delivery_method == 'mobile_money':
            required_mobile_fields = ['delivery_phone']  # Remove mobile_provider requirement for international transfers
            missing_mobile_fields = [field for field in required_mobile_fields if not data.get(field)]
            if missing_mobile_fields:
                return Response({
                    'success': False,
                    'error': {
                        'code': 'MISSING_MOBILE_DETAILS',
                        'message': 'Mobile money delivery requires phone number',
                        'details': f'Missing fields: {", ".join(missing_mobile_fields)}',
                        'missing_fields': missing_mobile_fields
                    }
                }, status=status.HTTP_400_BAD_REQUEST)

            metadata.update({
                'mobile_provider': data.get('delivery_mobile_provider'),  # Optional for international transfers
                'phone_number': data.get('delivery_phone')
            })

        result = gateway.process_payment(
            amount=amount,
            currency=currency,
            payment_method=payment_method,
            customer=request.user.customer_profile,
            merchant=None,
            metadata=metadata
        )

        return Response(result)

    except Exception as e:
        logger.error(f"Outbound remittance failed: {str(e)}")
        return Response({
            'success': False,
            'error': {
                'code': 'OUTBOUND_REMITTANCE_FAILED',
                'message': 'Outbound international remittance processing failed',
                'details': str(e)
            }
        }, status=status.HTTP_500_INTERNAL_SERVER_ERROR)


@api_view(['POST'])
@permission_classes([IsAuthenticated])
def send_global_remittance_view(request):
    """
    Handle global international remittances with full sender/recipient details
    """
    from ..gateways.mobile_money import MobileMoneyGateway
    from ..models import PaymentMethod as PaymentMethodModel

    try:
        data = request.data

        # Define required fields for global remittances
        required_fields = [
            'sender_name', 'sender_email', 'sender_country',
            'recipient', 'recipient_name', 'recipient_country',
            'amount', 'currency', 'payment_method_id', 'purpose',
            'delivery_method'
        ]

        missing_fields = [field for field in required_fields if not data.get(field)]
        if missing_fields:
            return Response({
                'success': False,
                'error': {
                    'code': 'MISSING_REQUIRED_FIELDS',
                    'message': 'Required fields are missing',
                    'details': f'Missing fields: {", ".join(missing_fields)}',
                    'missing_fields': missing_fields
                }
            }, status=status.HTTP_400_BAD_REQUEST)

        # Validate amount
        try:
            amount = float(data['amount'])
            if amount <= 0:
                return Response({
                    'success': False,
                    'error': {
                        'code': 'INVALID_AMOUNT',
                        'message': 'Amount must be greater than zero',
                        'details': f'Provided amount: {amount}'
                    }
                }, status=status.HTTP_400_BAD_REQUEST)
        except (ValueError, TypeError):
            return Response({
                'success': False,
                'error': {
                    'code': 'INVALID_AMOUNT_FORMAT',
                    'message': 'Amount must be a valid number',
                    'details': f'Provided value: {data.get("amount")}'
                }
            }, status=status.HTTP_400_BAD_REQUEST)

        # Validate email formats
        import re
        email_pattern = r'^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$'
        if not re.match(email_pattern, data.get('sender_email', '')):
            return Response({
                'success': False,
                'error': {
                    'code': 'INVALID_SENDER_EMAIL',
                    'message': 'Invalid sender email format',
                    'details': f'Provided email: {data.get("sender_email")}'
                }
            }, status=status.HTTP_400_BAD_REQUEST)

        # Validate delivery method
        valid_delivery_methods = ['bank_transfer', 'mobile_money', 'cash_pickup', 'digital_wallet']
        delivery_method = data['delivery_method']
        if delivery_method not in valid_delivery_methods:
            return Response({
                'success': False,
                'error': {
                    'code': 'INVALID_DELIVERY_METHOD',
                    'message': 'Invalid delivery method',
                    'details': f'Provided method: {delivery_method}, valid methods: {", ".join(valid_delivery_methods)}'
                }
            }, status=status.HTTP_400_BAD_REQUEST)

        # Get payment method
        try:
            payment_method = PaymentMethodModel.objects.get(
                id=data['payment_method_id'],
                user=request.user
            )
        except PaymentMethodModel.DoesNotExist:
            return Response({
                'success': False,
                'error': {
                    'code': 'INVALID_PAYMENT_METHOD',
                    'message': 'Payment method not found or does not belong to user',
                    'details': f'Payment method ID: {data["payment_method_id"]}'
                }
            }, status=status.HTTP_400_BAD_REQUEST)

        # Check if payment method is active
        if not payment_method.is_active:
            return Response({
                'success': False,
                'error': {
                    'code': 'INACTIVE_PAYMENT_METHOD',
                    'message': 'Payment method is not active',
                    'details': f'Payment method ID: {data["payment_method_id"]}'
                }
            }, status=status.HTTP_400_BAD_REQUEST)

        # Validate delivery method specific fields
        delivery_data_mapping = {
            'bank_transfer': ['delivery_bank_name', 'delivery_account_number'],
            'mobile_money': ['delivery_phone'],  # Remove mobile_provider requirement for international transfers
            'cash_pickup': ['delivery_address', 'delivery_city'],
            'digital_wallet': ['delivery_wallet_id']
        }

        if delivery_method in delivery_data_mapping:
            required_delivery_fields = delivery_data_mapping[delivery_method]
            missing_delivery_fields = [field for field in required_delivery_fields if not data.get(field)]
            if missing_delivery_fields:
                error_codes = {
                    'bank_transfer': 'MISSING_BANK_DETAILS',
                    'mobile_money': 'MISSING_MOBILE_DETAILS',
                    'cash_pickup': 'MISSING_ADDRESS_DETAILS',
                    'digital_wallet': 'MISSING_WALLET_DETAILS'
                }
                error_messages = {
                    'bank_transfer': 'Bank transfer requires account number and bank name',
                    'mobile_money': 'Mobile money delivery requires phone number',
                    'cash_pickup': 'Cash pickup requires address and city',
                    'digital_wallet': 'Digital wallet delivery requires wallet ID'
                }

                return Response({
                    'success': False,
                    'error': {
                        'code': error_codes[delivery_method],
                        'message': error_messages[delivery_method],
                        'details': f'Missing fields: {", ".join(missing_delivery_fields)}',
                        'missing_fields': missing_delivery_fields
                    }
                }, status=status.HTTP_400_BAD_REQUEST)

        # Handle currency conversion for international transfers
        recipient_currency = data.get('recipient_currency', 'USD')  # Default to USD if not provided
        original_amount = amount

        # Use mobile money gateway for global transfers
        gateway = MobileMoneyGateway()

        metadata = {
            'purpose': data.get('purpose'),
            'recipient': data.get('recipient'),
            'delivery_method': delivery_method,
            'sender_name': data.get('sender_name'),
            'sender_email': data.get('sender_email'),
            'sender_country': data.get('sender_country'),
            'recipient_name': data.get('recipient_name'),
            'recipient_country': data.get('recipient_country'),
            'recipient_currency': recipient_currency,
            'original_amount': original_amount,
        }

        # Add delivery-specific data
        if delivery_method == 'bank_transfer':
            metadata.update({
                'bank_name': data.get('delivery_bank_name'),
                'account_number': data.get('delivery_account_number'),
                'routing_number': data.get('delivery_routing_number'),
                'swift_code': data.get('delivery_swift_code'),
                'bank_branch': data.get('delivery_bank_branch')
            })
        elif delivery_method == 'mobile_money':
            metadata.update({
                'mobile_provider': data.get('delivery_mobile_provider'),  # Optional for international transfers
                'phone_number': data.get('delivery_phone')
            })
        elif delivery_method == 'cash_pickup':
            metadata.update({
                'pickup_location': data.get('delivery_address'),
                'city': data.get('delivery_city'),
                'postal_code': data.get('delivery_postal_code')
            })
        elif delivery_method == 'digital_wallet':
            metadata.update({
                'wallet_id': data.get('delivery_wallet_id'),
                'wallet_provider': data.get('delivery_wallet_provider')
            })

        result = gateway.process_payment(
            amount=amount,
            currency=data.get('currency', 'GHS'),
            payment_method=payment_method,
            customer=request.user.customer_profile,
            merchant=None,
            metadata=metadata
        )

        return Response(result)

    except Exception as e:
        logger.error(f"Global remittance failed: {str(e)}")
        return Response({
            'success': False,
            'error': {
                'code': 'GLOBAL_REMITTANCE_FAILED',
                'message': 'Global international remittance processing failed',
                'details': str(e)
            }
        }, status=status.HTTP_500_INTERNAL_SERVER_ERROR)
