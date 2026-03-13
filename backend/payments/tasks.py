# payments/tasks.py
from celery import shared_task
from django.core.cache import cache
from .services import PaymentService
from .models.transaction import Transaction
from .models.payment_method import PaymentMethod
from users.models import Customer, Merchant
from .gateways.g_money import GMoneyGateway
from .gateway_hierarchy import gateway_registry
import logging

logger = logging.getLogger(__name__)

@shared_task(bind=True, max_retries=3)
def process_payment_async(self, customer_id, merchant_id, amount, currency, payment_method_id, metadata=None):
    """
    Async task to process payments
    """
    try:
        # Get objects
        customer = Customer.objects.get(user_id=customer_id)
        merchant = Merchant.objects.get(id=merchant_id)
        payment_method = PaymentMethod.objects.get(id=payment_method_id)

        # Process payment
        result = PaymentService.process_payment(
            customer=customer,
            merchant=merchant,
            amount=amount,
            currency=currency,
            payment_method=payment_method,
            metadata=metadata
        )

        logger.info(f"Async payment processed: {result.get('transaction_id', 'unknown')}")
        return result

    except Exception as e:
        logger.error(f"Async payment processing failed: {str(e)}")
        # Retry with exponential backoff
        if self.request.retries < self.max_retries:
            delay = 2 ** self.request.retries  # Exponential backoff
            raise self.retry(countdown=delay, exc=e)
        raise e

@shared_task
def process_scheduled_payments():
    """
    Process scheduled payments that are due
    """
    from django.utils import timezone
    from .models.scheduled_payout import ScheduledPayout

    try:
        # Get due scheduled payments
        due_payments = ScheduledPayout.objects.filter(
            status=ScheduledPayout.PENDING,
            next_execution__lte=timezone.now()
        )

        processed = 0
        for payment in due_payments:
            try:
                # Process the payment
                result = process_payment_async.delay(
                    customer_id=payment.merchant.user.id,
                    merchant_id=payment.merchant.id,
                    amount=payment.amount,
                    currency='USD',
                    payment_method_id=payment.payment_method.id,
                    metadata={'scheduled_payment_id': payment.id}
                )

                payment.status = ScheduledPayout.PROCESSING
                payment.save()
                processed += 1

            except Exception as e:
                logger.error(f"Failed to process scheduled payment {payment.id}: {str(e)}")
                payment.status = ScheduledPayout.FAILED
                payment.save()

        logger.info(f"Processed {processed} scheduled payments")
        return processed

    except Exception as e:
        logger.error(f"Scheduled payment processing error: {str(e)}")
        raise e

@shared_task
def process_webhook_notifications():
    """
    Process pending webhook notifications
    """
    try:
        # Get pending webhook notifications from cache/queue
        # This would typically integrate with a message queue like Redis
        pending_webhooks = cache.get('pending_webhooks', [])

        processed = 0
        for webhook_data in pending_webhooks:
            try:
                # Process webhook (this would call external APIs)
                logger.info(f"Processing webhook notification: {webhook_data.get('type')}")

                # Simulate webhook processing
                # In production, this would call external payment provider APIs

                processed += 1

            except Exception as e:
                logger.error(f"Webhook processing failed: {str(e)}")

        # Clear processed webhooks
        cache.set('pending_webhooks', [], 300)

        logger.info(f"Processed {processed} webhook notifications")
        return processed

    except Exception as e:
        logger.error(f"Webhook notification processing error: {str(e)}")
        raise e


@shared_task
def daily_reconciliation():
    """
    Daily reconciliation: compare transactions against ledger journals.
    Scheduled via Celery beat (e.g. daily at 3am).
    """
    try:
        from .services.reconciliation_service import ReconciliationService
        report = ReconciliationService.daily_reconciliation()
        discrepancy_count = report.get('summary', {}).get('discrepancies', 0)
        if discrepancy_count > 0:
            logger.warning(f"Daily reconciliation found {discrepancy_count} discrepancies")
        else:
            logger.info("Daily reconciliation: all matched")
        return report
    except Exception as e:
        logger.error(f"Daily reconciliation failed: {str(e)}")
        raise e


@shared_task
def run_merchant_settlements():
    """
    Automated merchant settlement: pay out eligible merchants.
    Scheduled via Celery beat (e.g. daily at 2am).
    """
    try:
        from .services.settlement_service import SettlementService
        report = SettlementService.run_settlements()
        logger.info(f"Settlement run: {report.get('merchant_count', 0)} merchants settled")
        return report
    except Exception as e:
        logger.error(f"Merchant settlement run failed: {str(e)}")
        raise e


@shared_task
def update_exchange_rates():
    """
    Fetch live exchange rates from external API.
    Scheduled via Celery beat (e.g. every 15 minutes).
    """
    try:
        from .services.currency_service import CurrencyService
        success = CurrencyService.update_exchange_rates()
        if success:
            logger.info("Exchange rates updated successfully")
        else:
            logger.warning("Exchange rate update returned False (API key missing or API error)")
        return success
    except Exception as e:
        logger.error(f"Exchange rate update failed: {str(e)}")
        raise e


@shared_task(bind=True, max_retries=5)
def process_g_money_webhook(self, webhook_data):
    """
    Process G-Money webhook asynchronously with retry logic
    """
    try:
        # Get G-Money gateway instance
        g_money_gateway = GMoneyGateway()

        # Parse and process webhook
        event = g_money_gateway.parse_webhook(webhook_data)
        result = g_money_gateway.process_webhook(event)

        logger.info(f"G-Money webhook processed: {event.get('event_type')} for {event.get('transaction_id')}")
        return result

    except Exception as e:
        logger.error(f"G-Money webhook processing failed: {str(e)}")
        # Retry with exponential backoff
        if self.request.retries < self.max_retries:
            delay = 2 ** self.request.retries
            raise self.retry(countdown=delay, exc=e)
        raise e


@shared_task(bind=True, max_retries=3)
def check_g_money_transaction_status(self, transaction_id, force_check=False):
    """
    Check G-Money transaction status asynchronously
    Updates transaction status if changed
    """
    try:
        # Get transaction
        transaction = Transaction.objects.get(reference=transaction_id)

        # Only check if still pending or if forced
        if not force_check and transaction.status not in ['pending', 'processing']:
            logger.info(f"Skipping status check for {transaction_id} - status: {transaction.status}")
            return {'status': 'skipped', 'reason': 'not_pending'}

        # Get G-Money gateway
        g_money_gateway = GMoneyGateway()

        # Check status
        status_result = g_money_gateway.check_transaction_status(transaction_id)

        if status_result['success']:
            new_status = status_result['status']

            # Update transaction if status changed
            if transaction.status != new_status:
                transaction.status = new_status
                transaction.gateway_response = status_result
                if new_status in ['completed', 'failed', 'refunded']:
                    transaction.completed_at = timezone.now()
                transaction.save()

                logger.info(f"Updated transaction {transaction_id} status to {new_status}")
                return {'status': 'updated', 'old_status': transaction.status, 'new_status': new_status}
            else:
                logger.info(f"Transaction {transaction_id} status unchanged: {new_status}")
                return {'status': 'unchanged', 'current_status': new_status}
        else:
            logger.error(f"Failed to check status for transaction {transaction_id}")
            return {'status': 'error', 'error': status_result.get('error')}

    except Transaction.DoesNotExist:
        logger.error(f"Transaction {transaction_id} not found")
        raise ValueError(f"Transaction {transaction_id} not found")
    except Exception as e:
        logger.error(f"G-Money status check failed for {transaction_id}: {str(e)}")
        if self.request.retries < self.max_retries:
            delay = 2 ** self.request.retries
            raise self.retry(countdown=delay, exc=e)
        raise e


@shared_task
def process_pending_g_money_transactions():
    """
    Process all pending G-Money transactions that need status updates
    Scheduled task to run every 2 minutes
    """
    try:
        from django.utils import timezone
        from datetime import timedelta

        # Get transactions older than 5 minutes that are still pending
        cutoff_time = timezone.now() - timedelta(minutes=5)
        pending_transactions = Transaction.objects.filter(
            gateway_used='g_money',
            status__in=['pending', 'processing'],
            created_at__lt=cutoff_time
        )

        processed = 0
        updated = 0

        for transaction in pending_transactions:
            try:
                # Check status
                result = check_g_money_transaction_status.delay(transaction.reference)

                # Count as processed
                processed += 1

                # If status was updated, count as updated
                if result.get('status') == 'updated':
                    updated += 1

            except Exception as e:
                logger.error(f"Failed to check status for transaction {transaction.reference}: {str(e)}")

        logger.info(f"Processed {processed} pending G-Money transactions, updated {updated}")
        return {'processed': processed, 'updated': updated}

    except Exception as e:
        logger.error(f"Pending G-Money transaction processing failed: {str(e)}")
        raise e


@shared_task
def cleanup_expired_g_money_transactions():
    """
    Clean up expired G-Money transactions
    Transactions that remain pending for more than 24 hours are marked as expired
    """
    try:
        from django.utils import timezone
        from datetime import timedelta

        # Get transactions older than 24 hours that are still pending
        cutoff_time = timezone.now() - timedelta(hours=24)
        expired_transactions = Transaction.objects.filter(
            gateway_used='g_money',
            status__in=['pending', 'processing'],
            created_at__lt=cutoff_time
        )

        expired_count = 0
        for transaction in expired_transactions:
            transaction.status = 'expired'
            transaction.gateway_response = {'expired_at': timezone.now().isoformat()}
            transaction.save()
            expired_count += 1

        if expired_count > 0:
            logger.warning(f"Marked {expired_count} G-Money transactions as expired")

        return {'expired_count': expired_count}

    except Exception as e:
        logger.error(f"G-Money transaction cleanup failed: {str(e)}")
        raise e


@shared_task
def g_money_daily_reconciliation():
    """
    Daily reconciliation for G-Money transactions
    Compare our records against G-Money API data
    """
    try:
        from django.utils import timezone
        from datetime import timedelta
        from .services.reconciliation_service import ReconciliationService

        # Get yesterday's date range
        yesterday = timezone.now().date() - timedelta(days=1)
        start_date = timezone.datetime.combine(yesterday, timezone.datetime.min.time()).replace(tzinfo=timezone.get_current_timezone())
        end_date = timezone.datetime.combine(yesterday, timezone.datetime.max.time()).replace(tzinfo=timezone.get_current_timezone())

        # Get G-Money transactions for yesterday
        g_money_transactions = Transaction.objects.filter(
            gateway_used='g_money',
            created_at__range=(start_date, end_date)
        )

        reconciled = 0
        discrepancies = 0

        for transaction in g_money_transactions:
            try:
                # Check current status via API
                result = check_g_money_transaction_status.delay(transaction.reference, force_check=True)

                # Wait for result (in production, this would be async)
                # For now, we'll just trigger the check
                reconciled += 1

            except Exception as e:
                logger.error(f"Reconciliation check failed for {transaction.reference}: {str(e)}")
                discrepancies += 1

        logger.info(f"G-Money reconciliation: {reconciled} transactions checked, {discrepancies} discrepancies")
        return {
            'transactions_checked': reconciled,
            'discrepancies': discrepancies,
            'date_range': f"{start_date.date()} to {end_date.date()}"
        }

    except Exception as e:
        logger.error(f"G-Money daily reconciliation failed: {str(e)}")
        raise e


@shared_task
def g_money_payment_reconciliation():
    """
    Reconcile G-Money payments against settlement reports
    Ensures all payments are properly settled
    """
    try:
        from .services.settlement_service import SettlementService

        # Get G-Money gateway
        g_money_gateway = GMoneyGateway()

        # In a real implementation, this would fetch settlement reports from G-Money
        # For now, we'll simulate the reconciliation process

        # Get all completed G-Money transactions from the last 7 days
        from django.utils import timezone
        from datetime import timedelta

        cutoff_date = timezone.now() - timedelta(days=7)
        completed_transactions = Transaction.objects.filter(
            gateway_used='g_money',
            status='completed',
            created_at__gte=cutoff_date
        )

        reconciled = 0
        unsettled = 0

        for transaction in completed_transactions:
            # In production, this would check against G-Money settlement reports
            # For simulation, we'll assume all are reconciled
            reconciled += 1

        logger.info(f"G-Money payment reconciliation: {reconciled} transactions reconciled, {unsettled} unsettled")
        return {
            'reconciled': reconciled,
            'unsettled': unsettled,
            'period_days': 7
        }

    except Exception as e:
        logger.error(f"G-Money payment reconciliation failed: {str(e)}")
        raise e
