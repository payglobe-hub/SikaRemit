from django.db import transaction
from django.utils import timezone
from merchants.models import BulkPayment, BulkPaymentItem, ApprovalWorkflow
from payments.services import PaymentService

class BulkPaymentService:
    """
    Service for handling bulk payment operations
    """

    @staticmethod
    def create_bulk_payment(business_account, created_by, payment_data, items_data):
        """
        Create a bulk payment with payment items
        """
        with transaction.atomic():
            # Create bulk payment
            bulk_payment = BulkPayment.objects.create(
                business_account=business_account,
                created_by=created_by,
                **payment_data
            )

            # Create payment items
            for item_data in items_data:
                BulkPaymentItem.objects.create(
                    bulk_payment=bulk_payment,
                    **item_data
                )

            return bulk_payment

    @staticmethod
    def process_bulk_payment(bulk_payment):
        """
        Process all items in a bulk payment
        """
        payment_items = bulk_payment.payment_items.all()

        for item in payment_items:
            try:
                from django.db import transaction as db_transaction

                # Process individual payment
                result = PaymentService.process_payment({
                    'amount': item.amount,
                    'currency': bulk_payment.currency,
                    'recipient_account': item.recipient_account,
                    'recipient_phone': item.recipient_phone,
                    'recipient_email': item.recipient_email,
                    'payment_method': item.payment_method,
                    'description': item.description,
                    'business_account': bulk_payment.business_account,
                })

                if result['success']:
                    try:
                        with db_transaction.atomic():
                            item.status = 'completed'
                            item.transaction_id = result.get('transaction_id', '')
                            item.processed_at = timezone.now()
                            item.save()
                    except Exception as db_err:
                        logger.critical(
                            f"DB save failed after bulk payment item {item.id} charge, "
                            f"gateway_tx={result.get('transaction_id')}, "
                            f"amount={item.amount}: {db_err}"
                        )
                        item.status = 'failed'
                        item.failure_reason = f'Charged but DB save failed. Manual reconciliation needed. Ref: {result.get("transaction_id")}'
                        item.save()
                else:
                    item.status = 'failed'
                    item.failure_reason = result.get('error', 'Payment failed')
                    item.save()

            except Exception as e:
                item.status = 'failed'
                item.failure_reason = str(e)
                item.save()

        # Update bulk payment status
        failed_items = payment_items.filter(status='failed').count()
        if failed_items == 0:
            bulk_payment.status = 'completed'
        elif failed_items == payment_items.count():
            bulk_payment.status = 'failed'
        else:
            bulk_payment.status = 'completed'  # Partial success

        bulk_payment.completed_at = timezone.now()
        bulk_payment.save()

    @staticmethod
    def validate_bulk_payment_data(items_data):
        """
        Validate bulk payment items data
        """
        errors = []
        total_amount = 0

        for i, item in enumerate(items_data):
            if not item.get('recipient_name'):
                errors.append(f"Item {i+1}: Recipient name is required")

            if not item.get('amount') or item['amount'] <= 0:
                errors.append(f"Item {i+1}: Valid amount is required")

            if not (item.get('recipient_phone') or item.get('recipient_email') or item.get('recipient_account')):
                errors.append(f"Item {i+1}: At least one recipient contact method is required")

            total_amount += item.get('amount', 0)

        return {
            'is_valid': len(errors) == 0,
            'errors': errors,
            'total_amount': total_amount
        }

class ApprovalWorkflowService:
    """
    Service for handling approval workflow operations
    """

    @staticmethod
    def trigger_approval(bulk_payment):
        """
        Trigger approval workflow for a bulk payment
        """
        workflow = bulk_payment.approval_workflow
        if not workflow:
            # Auto-approve if no workflow
            bulk_payment.status = 'approved'
            bulk_payment.approved_at = timezone.now()
            bulk_payment.save()
            return

        # Check if auto-approval is possible
        if ApprovalWorkflowService.can_auto_approve(bulk_payment, workflow):
            bulk_payment.status = 'approved'
            bulk_payment.approved_at = timezone.now()
            bulk_payment.save()

    @staticmethod
    def can_auto_approve(bulk_payment, workflow):
        """
        Check if bulk payment can be auto-approved
        """
        # Check amount limits
        if bulk_payment.total_amount < workflow.min_amount:
            return True  # Below minimum, auto-approve

        # For now, require manual approval for all workflows
        # In future, could implement more complex logic
        return False

    @staticmethod
    def check_approval_requirements(bulk_payment):
        """
        Check if bulk payment has met all approval requirements
        """
        workflow = bulk_payment.approval_workflow
        if not workflow:
            return True

        approved_count = bulk_payment.approved_by.count()
        required_count = workflow.required_approvers

        # Check if required number of approvers have approved
        if approved_count >= required_count:
            # Check if required roles have approved
            approved_users = bulk_payment.approved_by.all()
            required_roles = workflow.required_roles.all()

            for role in required_roles:
                # Check if at least one user with this role has approved
                if not approved_users.filter(
                    business_memberships__role=role,
                    business_memberships__business_account=bulk_payment.business_account,
                    business_memberships__status='active'
                ).exists():
                    return False

            return True

        return False

    @staticmethod
    def get_pending_approvals(user):
        """
        Get bulk payments pending user's approval
        """
        # Get user's business accounts and roles
        business_users = user.business_memberships.filter(status='active')
        business_accounts = [bu.business_account for bu in business_users]

        pending_payments = BulkPayment.objects.filter(
            business_account__in=business_accounts,
            status='pending_approval'
        )

        # Filter based on user's approval permissions
        user_approvable_payments = []
        for payment in pending_payments:
            for business_user in business_users:
                if (business_user.business_account == payment.business_account and
                    business_user.role.can_approve_payments):
                    user_approvable_payments.append(payment)
                    break

        return user_approvable_payments

class BusinessAnalyticsService:
    """
    Service for generating business analytics
    """

    @staticmethod
    def update_business_analytics(business_account):
        """
        Update analytics for a business account
        """
        from django.db.models import Sum, Count, Avg
        from django.utils import timezone

        # Get date range (last 30 days)
        thirty_days_ago = timezone.now() - timezone.timedelta(days=30)

        # Calculate metrics
        payments = business_account.bulk_payments.filter(
            created_at__gte=thirty_days_ago
        )

        analytics_data = {
            'total_payments': payments.count(),
            'total_volume': payments.aggregate(Sum('total_amount'))['total_amount__sum'] or 0,
            'average_transaction': payments.aggregate(Avg('total_amount'))['total_amount__avg'] or 0,
            'monthly_volume': payments.filter(
                created_at__gte=timezone.now() - timezone.timedelta(days=30)
            ).aggregate(Sum('total_amount'))['total_amount__sum'] or 0,
            'monthly_transactions': payments.filter(
                created_at__gte=timezone.now() - timezone.timedelta(days=30)
            ).count(),
            'active_users': business_account.business_users.filter(
                status='active',
                joined_at__gte=thirty_days_ago
            ).count(),
            'total_users': business_account.business_users.filter(status='active').count(),
            'failed_payments': payments.filter(status='failed').count(),
            'high_value_transactions': payments.filter(total_amount__gte=10000).count(),
        }

        # Update or create analytics record
        analytics, created = business_account.analytics.get_or_create(
            defaults=analytics_data
        )

        if not created:
            for key, value in analytics_data.items():
                setattr(analytics, key, value)
            analytics.save()

        return analytics
