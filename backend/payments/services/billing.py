from django.db import transaction
from .base import BasePaymentService
from ..models import Transaction, Merchant, Payment
from ..services import PaymentProcessor
import logging
from datetime import datetime

logger = logging.getLogger(__name__)

class BillingService(BasePaymentService):
    """
    Handles bill payments including:
    - Utility bills
    - Invoice payments
    - Scheduled payments
    """
    
    def __init__(self):
        self.payment_processor = PaymentProcessor()
    
    @transaction.atomic
    def process_bill_payment(self, customer, biller, amount, currency, payment_method, bill_reference=None, bill_due_date=None, bill_type=None, transaction=None):
        """
        Process a bill payment with bill-specific fields
        """
        from .fee_calculator import DynamicFeeCalculator
        from decimal import Decimal
        
        if not biller.is_biller:
            raise ValueError("Merchant must be registered as a biller")
        
        # Calculate bill payment fee using dynamic fee calculator
        fee_result = DynamicFeeCalculator.calculate_fee(
            fee_type='bill_payment',
            amount=Decimal(str(amount)),
            currency=currency,
            user=customer.user if hasattr(customer, 'user') else None,
            log_calculation=True,
            transaction_id=f"BILLPAY-{customer.id}-{bill_reference or 'NA'}"
        )
        
        fee_amount = Decimal(str(fee_result.get('total_fee', 0))) if fee_result.get('success') else Decimal('0')
            
        payment = Payment.objects.create(
            customer=customer,
            merchant=biller,
            amount=amount,
            currency=currency,
            payment_method=payment_method,
            payment_type=Payment.BILL,
            bill_reference=bill_reference,
            bill_due_date=bill_due_date,
            bill_type=bill_type,
            transaction=transaction
        )
        
        # Store fee info in payment metadata if available
        if hasattr(payment, 'metadata') and payment.metadata is None:
            payment.metadata = {}
        if hasattr(payment, 'metadata'):
            payment.metadata['fee_amount'] = float(fee_amount)
            payment.metadata['fee_config_id'] = fee_result.get('fee_config_id')
        
        try:
            result = self.payment_processor.process(payment)
            payment.status = Payment.COMPLETED if result.success else Payment.FAILED
            payment.save()
            return payment
        except Exception as e:
            payment.status = Payment.FAILED
            payment.save()
            raise
    
    def generate_invoice(self, biller, customer, items, due_date):
        """Generate an invoice for payment"""
        # Implementation would vary based on requirements
        pass
