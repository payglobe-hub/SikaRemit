from django.conf import settings
import requests
import logging
from datetime import datetime

logger = logging.getLogger(__name__)

class AccountingSystem:
    """
    Handles integration with external accounting systems
    Supports QuickBooks, Xero, Sage, and custom accounting APIs
    """
    
    def __init__(self):
        self.config = settings.ACCOUNTING_CONFIG
        
    def sync_payment(self, payment):
        """Sync a single payment to accounting system"""
        try:
            if self.config.get('system') == 'disabled':
                # Skip syncing for tests or when disabled
                return True
            elif self.config['system'] == 'quickbooks':
                return self._sync_to_quickbooks(payment)
            elif self.config['system'] == 'xero':
                return self._sync_to_xero(payment)
            elif self.config['system'] == 'sage':
                return self._sync_to_sage(payment)
            elif self.config['system'] == 'custom':
                return self._sync_to_custom(payment)
        except Exception as e:
            logger.error(f"Accounting sync failed: {str(e)}")
            return False
    
    def _sync_to_quickbooks(self, payment):
        """Sync payment to QuickBooks"""
        payload = {
            "Payment": {
                "TotalAmt": float(payment.amount),
                "CustomerRef": {"value": payment.customer.accounting_id},
                "PaymentMethodRef": {"value": payment.payment_method},
                "TxnDate": payment.created_at.strftime('%Y-%m-%d'),
                "PrivateNote": payment.description or ""
            }
        }
        
        response = requests.post(
            f"{self.config['quickbooks_url']}/payments",
            headers={"Authorization": f"Bearer {self.config['token']}"},
            json=payload
        )
        
        if response.status_code == 200:
            payment.accounting_sync_status = 'synced'
            payment.accounting_ref = response.json().get('Id')
            payment.save()
            return True
        return False
    
    def _sync_to_xero(self, payment):
        """Sync payment to Xero"""
        payload = {
            "Payments": [{
                "Invoice": {"InvoiceNumber": f"INV-{payment.id}"},
                "Account": {"Code": self.config['xero_account_code']},
                "Date": payment.created_at.strftime('%Y-%m-%d'),
                "Amount": float(payment.amount),
                "Reference": payment.transaction_id or f"PYMT-{payment.id}"
            }]
        }
        
        response = requests.post(
            f"{self.config['xero_url']}/payments",
            headers={
                "Authorization": f"Bearer {self.config['token']}",
                "xero-tenant-id": self.config['tenant_id']
            },
            json=payload
        )
        
        if response.status_code == 200:
            payment.accounting_sync_status = 'synced'
            payment.accounting_ref = response.json().get('Payments')[0].get('PaymentID')
            payment.save()
            return True
        return False
    
    def _sync_to_sage(self, payment):
        """Sync payment to Sage accounting"""
        payload = {
            "transaction": {
                "reference": f"PYMT-{payment.id}",
                "date": payment.created_at.strftime('%Y-%m-%d'),
                "contact": {"id": payment.customer.accounting_id},
                "lines": [{
                    "description": payment.description or "Payment",
                    "quantity": 1,
                    "unit_price": float(payment.amount),
                    "ledger_account": {"id": self.config['sage_ledger_account']}
                }]
            }
        }
        
        response = requests.post(
            f"{self.config['sage_url']}/transactions",
            headers={"Authorization": f"Bearer {self.config['token']}"},
            json=payload
        )
        
        if response.status_code == 201:
            payment.accounting_sync_status = 'synced'
            payment.accounting_ref = response.json().get('id')
            payment.save()
            return True
        return False
    
    def _sync_to_custom(self, payment):
        """Sync to custom accounting API"""
        response = requests.post(
            self.config['api_url'],
            headers={"Authorization": self.config['api_key']},
            json={
                "payment_id": payment.id,
                "amount": float(payment.amount),
                "currency": payment.currency,
                "date": payment.created_at.isoformat(),
                "customer": payment.customer.user.email,
                "metadata": payment.metadata
            }
        )
        
        if response.status_code == 200:
            payment.accounting_sync_status = 'synced'
            payment.save()
            return True
        return False

    def batch_sync(self, payments):
        """Sync multiple payments in batch"""
        results = []
        for payment in payments:
            results.append(self.sync_payment(payment))
        return results

# Admin action for manual sync
def sync_to_accounting(modeladmin, request, queryset):
    accounting = AccountingSystem()
    results = accounting.batch_sync(queryset)
    success_count = sum(results)
    modeladmin.message_user(
        request,
        f"Successfully synced {success_count} of {len(results)} payments to accounting system"
    )
