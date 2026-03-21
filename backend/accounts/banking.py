import requests
from django.conf import settings
from requests.auth import HTTPBasicAuth
import logging

logger = logging.getLogger(__name__)

class BankAPIClient:
    """
    Bank API client for processing bank transfer payments.
    Supports ACH transfers and wire transfers.
    """
    
    def __init__(self, api_key=None, account_number=None, routing_number=None):
        self.api_key = api_key or settings.BANK_API_KEY
        self.account_number = account_number
        self.routing_number = routing_number
        self.base_url = getattr(settings, 'BANK_API_BASE_URL', 'https://api.bank-provider.com')
        
    def initiate_transfer(self, amount, reference, currency='USD'):
        """
        Initiate a bank transfer payment.
        
        Args:
            amount: Transfer amount
            reference: Unique payment reference
            currency: Currency code (default: USD)
            
        Returns:
            dict: Response containing transaction_id and status
        """
        url = f"{self.base_url}/v1/transfers"
        headers = {
            'Authorization': f"Bearer {self.api_key}",
            'Content-Type': 'application/json'
        }
        
        payload = {
            'amount': float(amount),
            'currency': currency,
            'reference': reference,
            'destination': {
                'account_number': self.account_number,
                'routing_number': self.routing_number,
                'account_type': 'checking'
            },
            'description': f'Payment reference: {reference}'
        }
        
        try:
            response = requests.post(url, json=payload, headers=headers, timeout=30)
            response.raise_for_status()
            data = response.json()
            
            logger.info(f"Bank transfer initiated: {reference} - {data.get('transaction_id')}")
            return {
                'transaction_id': data.get('transaction_id') or data.get('id'),
                'status': data.get('status', 'pending'),
                'reference': reference
            }
        except requests.exceptions.RequestException as e:
            logger.error(f"Bank transfer failed for {reference}: {str(e)}")
            raise Exception(f"Bank transfer initiation failed: {str(e)}")
    
    def check_transfer_status(self, transaction_id):
        """
        Check the status of a bank transfer.
        
        Args:
            transaction_id: Transaction ID from initiate_transfer
            
        Returns:
            dict: Current status and details
        """
        url = f"{self.base_url}/v1/transfers/{transaction_id}"
        headers = {
            'Authorization': f"Bearer {self.api_key}",
            'Content-Type': 'application/json'
        }
        
        try:
            response = requests.get(url, headers=headers, timeout=30)
            response.raise_for_status()
            data = response.json()
            
            return {
                'transaction_id': transaction_id,
                'status': data.get('status', 'unknown'),
                'completed_at': data.get('completed_at'),
                'failure_reason': data.get('failure_reason')
            }
        except requests.exceptions.RequestException as e:
            logger.error(f"Failed to check transfer status for {transaction_id}: {str(e)}")
            raise Exception(f"Status check failed: {str(e)}")
    
    def cancel_transfer(self, transaction_id):
        """
        Cancel a pending bank transfer.
        
        Args:
            transaction_id: Transaction ID to cancel
            
        Returns:
            dict: Cancellation result
        """
        url = f"{self.base_url}/v1/transfers/{transaction_id}/cancel"
        headers = {
            'Authorization': f"Bearer {self.api_key}",
            'Content-Type': 'application/json'
        }
        
        try:
            response = requests.post(url, headers=headers, timeout=30)
            response.raise_for_status()
            data = response.json()
            
            logger.info(f"Bank transfer cancelled: {transaction_id}")
            return {
                'transaction_id': transaction_id,
                'status': 'cancelled',
                'cancelled_at': data.get('cancelled_at')
            }
        except requests.exceptions.RequestException as e:
            logger.error(f"Failed to cancel transfer {transaction_id}: {str(e)}")
            raise Exception(f"Transfer cancellation failed: {str(e)}")
