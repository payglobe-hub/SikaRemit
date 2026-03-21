from django.db.models.signals import post_save, pre_save
from django.dispatch import receiver
from payments.models.transaction import Transaction
from users.models import Customer
from .services import NotificationService
from .realtime import RealtimeService
from decimal import Decimal
from django.conf import settings
import logging

logger = logging.getLogger(__name__)

# Low balance threshold (in base currency)
LOW_BALANCE_THRESHOLD = getattr(settings, 'LOW_BALANCE_THRESHOLD', Decimal('10.00'))

@receiver(post_save, sender=Transaction)
def create_transaction_notification(sender, instance, created, **kwargs):
    if created:
        # Determine transaction type and merchant info
        is_wallet_transaction = instance.merchant is None
        merchant_name = "Wallet" if is_wallet_transaction else instance.merchant.business_name
        
        # Check transaction type from metadata
        metadata = instance.metadata or {}
        transaction_type = metadata.get('transaction_type', 'payment')
        
        if instance.status == 'completed':
            # Determine transaction type (credit/debit) based on metadata
            if transaction_type == 'wallet_topup':
                transaction_direction = 'credit'
                title = "SikaRemit - Wallet Top-up"
                message = f"Your SikaRemit wallet has been topped up with {instance.amount} {instance.currency}"
            elif transaction_type == 'p2p_receive':
                transaction_direction = 'credit'
                sender_email = instance.metadata.get('sender_email', 'Unknown')
                title = "SikaRemit - Money Received"
                message = f"You received {instance.amount} {instance.currency} from {sender_email} via SikaRemit"
            elif transaction_type == 'p2p_send':
                transaction_direction = 'debit'
                recipient_email = instance.metadata.get('recipient_email', 'Unknown')
                title = "SikaRemit - Money Sent"
                message = f"You sent {instance.amount} {instance.currency} to {recipient_email} via SikaRemit"
            elif transaction_type == 'bill_payment':
                transaction_direction = 'debit'
                bill_type = instance.metadata.get('bill_type', 'Bill')
                title = f"SikaRemit - {bill_type.title()} Bill Paid"
                message = f"Your {bill_type} bill payment of {instance.amount} {instance.currency} via SikaRemit was successful"
            elif transaction_type == 'airtime_purchase':
                transaction_direction = 'debit'
                recipient_phone = instance.metadata.get('recipient_phone', 'Unknown')
                provider = instance.metadata.get('provider', 'Unknown')
                title = "SikaRemit - Airtime Purchase"
                message = f"Airtime purchase of {instance.amount} {instance.currency} for {recipient_phone} ({provider}) via SikaRemit was successful"
            else:
                # Default to debit for unknown transaction types
                transaction_direction = 'debit'
                title = f"SikaRemit - Payment to {merchant_name}"
                message = f"Your payment of {instance.amount} {instance.currency} to {merchant_name} via SikaRemit was successful"
            
            NotificationService.create_notification(
                user=instance.customer.user,
                title=title,
                message=message,
                level='payment',
                notification_type=transaction_type if transaction_type != 'payment' else 'payment_received',
                metadata={
                    'transaction_id': instance.id,
                    'amount': str(instance.amount),
                    'merchant': merchant_name,
                    'transaction_type': transaction_direction,
                    **instance.metadata  # Include all metadata
                }
            )

            # Send real-time transaction update
            RealtimeService.send_transaction_update(
                instance.customer.user.id,
                {
                    'id': instance.id,
                    'amount': str(instance.amount),
                    'currency': instance.currency,
                    'status': instance.status,
                    'created_at': instance.created_at.isoformat(),
                    'merchant': merchant_name,
                    'type': transaction_direction,
                    'transaction_type': transaction_type
                }
            )

            # Notify merchant when they receive a payment (if merchant exists)
            if instance.merchant and instance.merchant.user:
                NotificationService.create_notification(
                    user=instance.merchant.user,
                    title="Payment Received",
                    message=f"You received a payment of {instance.amount} {instance.currency} from {instance.customer.user.email}",
                    level='payment',
                    notification_type='merchant_payment_received',
                    metadata={
                        'transaction_id': instance.id,
                        'amount': str(instance.amount),
                        'currency': instance.currency,
                        'customer_email': instance.customer.user.email
                    }
                )

        elif instance.status == 'failed':
            # Handle failed transactions
            if transaction_type == 'p2p_send':
                title = "SikaRemit - Money Transfer Failed"
                message = f"Your SikaRemit money transfer of {instance.amount} {instance.currency} failed"
            elif transaction_type == 'bill_payment':
                bill_type = instance.metadata.get('bill_type', 'Bill')
                title = f"SikaRemit - {bill_type.title()} Bill Payment Failed"
                message = f"Your {bill_type} bill payment of {instance.amount} {instance.currency} via SikaRemit failed"
            elif transaction_type == 'airtime_purchase':
                title = "SikaRemit - Airtime Purchase Failed"
                message = f"Your SikaRemit airtime purchase of {instance.amount} {instance.currency} failed"
            else:
                title = "SikaRemit - Payment Failed"
                message = f"Your SikaRemit payment of {instance.amount} {instance.currency} failed"
            
            NotificationService.create_notification(
                user=instance.customer.user,
                title=title,
                message=message,
                level='error',
                notification_type='payment_failed',
                metadata={
                    'transaction_id': instance.id,
                    'amount': str(instance.amount),
                    'merchant': merchant_name,
                    **instance.metadata
                }
            )

            # Send real-time transaction update for failed payment
            RealtimeService.send_transaction_update(
                instance.customer.user.id,
                {
                    'id': instance.id,
                    'amount': str(instance.amount),
                    'currency': instance.currency,
                    'status': instance.status,
                    'created_at': instance.created_at.isoformat(),
                    'merchant': merchant_name,
                    'type': 'failed',
                    'transaction_type': transaction_type
                }
            )

@receiver(post_save, sender=Transaction)
def send_payment_status_updates(sender, instance, created, **kwargs):
    """Send real-time payment status updates"""
    if instance.customer and instance.customer.user:
        RealtimeService.send_payment_status_update(
            instance.customer.user.id,
            {
                'id': instance.id,
                'status': instance.status,
                'amount': str(instance.amount),
                'currency': instance.currency,
                'created_at': instance.created_at.isoformat(),
                'updated_at': instance.updated_at.isoformat() if hasattr(instance, 'updated_at') else None,
                'merchant': instance.merchant.business_name if instance.merchant else None
            }
        )

@receiver(pre_save, sender=Customer)
def track_balance_changes(sender, instance, **kwargs):
    """Track balance changes for real-time updates"""
    if not hasattr(instance, 'available_balance') or not hasattr(instance, 'pending_balance'):
        return
    if instance.pk:  # Only for updates, not new instances
        try:
            old_instance = Customer.objects.get(pk=instance.pk)
            balance_changed = (
                old_instance.available_balance != instance.available_balance or
                old_instance.pending_balance != instance.pending_balance
            )

            if balance_changed:
                # Store old balance for comparison
                instance._old_available_balance = old_instance.available_balance
                instance._old_pending_balance = old_instance.pending_balance
        except Customer.DoesNotExist:
            pass

@receiver(post_save, sender=Customer)
def send_balance_updates(sender, instance, created, **kwargs):
    """Send real-time balance updates when customer balance changes"""
    if not hasattr(instance, 'available_balance') or not hasattr(instance, 'pending_balance'):
        return
    if not created and hasattr(instance, '_old_available_balance'):
        balance_changed = (
            instance._old_available_balance != instance.available_balance or
            instance._old_pending_balance != instance.pending_balance
        )

        if balance_changed:
            RealtimeService.send_balance_update(
                instance.user.id,
                {
                    'available': str(instance.available_balance),
                    'pending': str(instance.pending_balance),
                    'currency': getattr(instance, 'currency', None),
                    'last_updated': instance.updated_at.isoformat() if hasattr(instance, 'updated_at') else None,
                    'change': {
                        'available_change': str(instance.available_balance - instance._old_available_balance),
                        'pending_change': str(instance.pending_balance - instance._old_pending_balance)
                    }
                }
            )

            # Check for low balance and notify user
            if instance.available_balance < LOW_BALANCE_THRESHOLD:
                # Only notify if balance dropped below threshold (was above before)
                if instance._old_available_balance >= LOW_BALANCE_THRESHOLD:
                    try:
                        NotificationService.create_notification(
                            user=instance.user,
                            title="Low Balance Alert",
                            message=f"Your wallet balance is low ({instance.available_balance} {getattr(instance, 'currency', 'GHS')}). Please top up to continue making transactions.",
                            level='warning',
                            notification_type='wallet_low_balance',
                            metadata={
                                'current_balance': str(instance.available_balance),
                                'threshold': str(LOW_BALANCE_THRESHOLD),
                                'currency': getattr(instance, 'currency', 'GHS')
                            }
                        )
                    except Exception as e:
                        logger.error(f"Failed to send low balance notification: {e}")
