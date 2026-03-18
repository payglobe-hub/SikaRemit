"""
Mobile Money Payment Gateways for Ghana
Implements MTN MoMo, Telecel Cash, and AirtelTigo Money integrations
with full webhook support for Bank of Ghana compliance.
"""

from .base import PaymentGateway, CircuitBreakerMixin
from django.conf import settings
from django.http import JsonResponse
import requests
import logging
import time
import hmac
import hashlib
import json
import uuid
from typing import Dict, Any, Optional

logger = logging.getLogger(__name__)

class MobileMoneyGateway(PaymentGateway, CircuitBreakerMixin):
    """Base class for mobile money gateways with circuit breaking and webhook support"""
    PROVIDER_NAME = "generic"
    signature_header = 'X-Signature'
    
    def __init__(self):
        self.api_url = None
        self.auth_token = None
        self.webhook_secret = None
    
    def _make_request(self, endpoint: str, payload: Dict, method: str = 'POST') -> Dict:
        """Make HTTP request to mobile money API"""
        headers = {
            'Authorization': f'Bearer {self.auth_token}',
            'Content-Type': 'application/json',
            'X-Request-Id': str(uuid.uuid4())
        }
        
        try:
            if method == 'POST':
                response = requests.post(
                    f"{self.api_url}{endpoint}",
                    json=payload,
                    headers=headers,
                    timeout=30
                )
            else:
                response = requests.get(
                    f"{self.api_url}{endpoint}",
                    params=payload,
                    headers=headers,
                    timeout=30
                )
            
            response.raise_for_status()
            return {
                'success': True,
                'data': response.json(),
                'status_code': response.status_code
            }
        except requests.exceptions.Timeout:
            logger.error(f"{self.PROVIDER_NAME} API timeout")
            return {'success': False, 'error': 'Request timeout'}
        except requests.exceptions.RequestException as e:
            logger.error(f"{self.PROVIDER_NAME} API error: {str(e)}")
            return {'success': False, 'error': str(e)}

    def _make_request_with_retry(self, endpoint: str, payload: Dict, method: str = 'POST') -> Dict:
        """Make request with circuit breaker retry logic"""
        max_retries = 3
        backoff_factor = 1
        
        for attempt in range(max_retries):
            result = self._make_request(endpoint, payload, method)
            if result.get('success'):
                return result
            
            if attempt < max_retries - 1:
                time.sleep(backoff_factor * (2 ** attempt))
        
        return result

    def get_webhook_secret(self) -> str:
        """Get webhook verification secret"""
        return self.webhook_secret or ''
    
    def verify_webhook_signature(self, request, signature: str) -> bool:
        """Verify webhook signature using HMAC-SHA256"""
        secret = self.get_webhook_secret()
        if not secret or not signature:
            return False
        
        expected_sig = hmac.new(
            secret.encode(),
            request.body,
            hashlib.sha256
        ).hexdigest()
        
        return hmac.compare_digest(signature.lower(), expected_sig.lower())

    def parse_webhook(self, request) -> Dict:
        """Parse webhook payload into standardized format"""
        try:
            payload = json.loads(request.body)
            return {
                'event_type': payload.get('event', payload.get('type', 'unknown')),
                'transaction_id': payload.get('transactionId', payload.get('reference')),
                'status': payload.get('status', 'unknown'),
                'amount': payload.get('amount'),
                'currency': payload.get('currency', 'GHS'),
                'phone_number': payload.get('payer', {}).get('partyId', payload.get('msisdn')),
                'timestamp': payload.get('timestamp', payload.get('created_at')),
                'raw_payload': payload
            }
        except json.JSONDecodeError as e:
            logger.error(f"Failed to parse webhook payload: {str(e)}")
            raise ValueError("Invalid webhook payload")

    def process_webhook(self, event: Dict) -> JsonResponse:
        """Process webhook event and update transaction status"""
        from payments.models import Payment
        
        try:
            event_type = event.get('event_type', '').lower()
            transaction_id = event.get('transaction_id')
            status = event.get('status', '').lower()
            
            if not transaction_id:
                return JsonResponse({'error': 'Missing transaction ID'}, status=400)
            
            # Find and update the payment
            try:
                payment = Payment.objects.get(
                    transaction_id=transaction_id,
                    payment_method__method_type__in=['mtn_momo', 'telecel', 'airtel_tigo']
                )
            except Payment.DoesNotExist:
                logger.warning(f"Payment not found for transaction: {transaction_id}")
                return JsonResponse({'status': 'ignored', 'reason': 'Payment not found'})
            
            # Map provider status to internal status
            status_mapping = {
                'successful': 'completed',
                'success': 'completed',
                'completed': 'completed',
                'failed': 'failed',
                'failure': 'failed',
                'cancelled': 'cancelled',
                'pending': 'pending',
                'processing': 'processing'
            }
            
            new_status = status_mapping.get(status, 'pending')
            
            # Update payment status
            payment.status = new_status
            payment.metadata = payment.metadata or {}
            payment.metadata['webhook_event'] = event
            payment.metadata['webhook_received_at'] = time.time()
            payment.save()
            
            # Send notification
            self._send_payment_notification(payment, event_type)
            
            logger.info(f"Webhook processed: {transaction_id} -> {new_status}")
            return JsonResponse({'status': 'success', 'payment_status': new_status})
            
        except Exception as e:
            logger.error(f"Webhook processing error: {str(e)}")
            return JsonResponse({'error': str(e)}, status=500)

    def _send_payment_notification(self, payment, event_type: str):
        """Send notification for payment status change"""
        try:
            from notifications.models import Notification
            
            if payment.status == 'completed':
                message = f"Your payment of {payment.currency} {payment.amount} was successful."
            elif payment.status == 'failed':
                message = f"Your payment of {payment.currency} {payment.amount} failed. Please try again."
            else:
                return
            
            Notification.objects.create(
                user=payment.customer.user,
                notification_type='payment',
                title='Payment Update',
                message=message,
                metadata={'payment_id': str(payment.id), 'event': event_type}
            )
        except Exception as e:
            logger.error(f"Failed to send notification: {str(e)}")

    def check_transaction_status(self, transaction_id: str) -> Dict:
        """Check status of a transaction with the provider"""
        raise NotImplementedError("Subclasses must implement check_transaction_status")

class MTNMoMoGateway(MobileMoneyGateway):
    """
    MTN Mobile Money payment gateway implementation
    Supports Collection API for receiving payments
    
    Required environment variables:
    - MTN_MOMO_API_KEY: Your MTN MoMo API User ID
    - MTN_MOMO_API_SECRET: Your MTN MoMo API Key
    - MTN_MOMO_API_URL: API URL (production: https://proxy.momoapi.mtn.com)
    - MTN_MOMO_SUBSCRIPTION_KEY: Your Ocp-Apim-Subscription-Key
    - MTN_MOMO_WEBHOOK_SECRET: Secret for webhook signature verification
    """
    PROVIDER_NAME = "mtn_momo"
    signature_header = 'X-Callback-Signature'
    
    def __init__(self):
        super().__init__()
        self.api_key = getattr(settings, 'MTN_MOMO_API_KEY', None)
        self.api_secret = getattr(settings, 'MTN_MOMO_API_SECRET', None)
        self.base_url = getattr(settings, 'MTN_MOMO_API_URL', None)
        self.webhook_secret = getattr(settings, 'MTN_MOMO_WEBHOOK_SECRET', None)
        self.subscription_key = getattr(settings, 'MTN_MOMO_SUBSCRIPTION_KEY', None)
        self._access_token = None
        self._token_expiry = 0
        
        # Validate required credentials
        if not all([self.api_key, self.api_secret, self.base_url, self.subscription_key]):
            logger.warning("MTN MoMo gateway not fully configured. Set MTN_MOMO_* environment variables.")
    
    def is_configured(self) -> bool:
        """Check if gateway is properly configured for production use"""
        return all([self.api_key, self.api_secret, self.base_url, self.subscription_key])
    
    def get_webhook_secret(self) -> str:
        """Get MTN MoMo webhook secret"""
        return self.webhook_secret or self.api_secret or ''
    
    def parse_webhook(self, request) -> Dict:
        """Parse MTN MoMo webhook payload"""
        try:
            payload = json.loads(request.body)
            return {
                'event_type': 'payment_callback',
                'transaction_id': payload.get('externalId') or payload.get('financialTransactionId'),
                'status': payload.get('status', 'unknown'),
                'amount': payload.get('amount'),
                'currency': payload.get('currency', 'GHS'),
                'phone_number': payload.get('payer', {}).get('partyId'),
                'payer_message': payload.get('payerMessage'),
                'payee_note': payload.get('payeeNote'),
                'reason': payload.get('reason'),
                'timestamp': time.time(),
                'raw_payload': payload
            }
        except json.JSONDecodeError as e:
            logger.error(f"Failed to parse MTN webhook: {str(e)}")
            raise ValueError("Invalid MTN webhook payload")

    def process_webhook(self, event: Dict) -> JsonResponse:
        """Process MTN MoMo webhook callback"""
        from payments.models import Payment
        from django.db.models import Q
        
        try:
            transaction_id = event.get('transaction_id')
            status = event.get('status', '').upper()
            
            if not transaction_id:
                return JsonResponse({'error': 'Missing transaction ID'}, status=400)
            
            # Find payment by external ID or transaction ID
            try:
                payment = Payment.objects.filter(
                    payment_method__method_type='mtn_momo'
                ).filter(
                    Q(transaction_id=transaction_id) |
                    Q(metadata__external_id=transaction_id)
                ).first()
                
                if not payment:
                    raise Payment.DoesNotExist()
            except Payment.DoesNotExist:
                logger.warning(f"MTN payment not found: {transaction_id}")
                return JsonResponse({'status': 'ignored'})
            
            # Map MTN status to internal status
            mtn_status_map = {
                'SUCCESSFUL': 'completed',
                'PENDING': 'pending',
                'FAILED': 'failed',
                'REJECTED': 'failed',
                'TIMEOUT': 'failed',
                'ONGOING': 'processing'
            }
            
            new_status = mtn_status_map.get(status, 'pending')
            payment.status = new_status
            payment.metadata = payment.metadata or {}
            payment.metadata['mtn_callback'] = event
            payment.metadata['mtn_status'] = status
            payment.metadata['mtn_reason'] = event.get('reason')
            payment.save()
            
            self._send_payment_notification(payment, 'mtn_callback')
            
            logger.info(f"MTN webhook processed: {transaction_id} -> {new_status}")
            return JsonResponse({'status': 'success'})
            
        except Exception as e:
            logger.error(f"MTN webhook error: {str(e)}")
            return JsonResponse({'error': str(e)}, status=500)
    
    def process_payment(self, amount, currency, payment_method, customer, merchant, metadata=None):
        """Process MTN MoMo collection request"""
        if not self.is_configured():
            return {
                'success': False,
                'error': 'MTN MoMo gateway not configured. Contact support.',
                'raw_response': None
            }
        
        try:
            external_id = f"SIKA_{int(time.time())}_{uuid.uuid4().hex[:8]}"
            phone_number = payment_method.details.get('phone_number', '')
            
            # Ensure phone number is in correct format (233XXXXXXXXX)
            if phone_number.startswith('0'):
                phone_number = '233' + phone_number[1:]
            elif not phone_number.startswith('233'):
                phone_number = '233' + phone_number
            
            payload = {
                "amount": str(amount),
                "currency": currency or "GHS",
                "externalId": external_id,
                "payer": {
                    "partyIdType": "MSISDN",
                    "partyId": phone_number
                },
                "payerMessage": f"Payment to {merchant.business_name if merchant else 'SikaRemit'}",
                "payeeNote": metadata.get('description', 'SikaRemit Payment') if metadata else 'SikaRemit Payment'
            }
            
            headers = {
                "Authorization": f"Bearer {self._get_auth_token()}",
                "X-Reference-Id": external_id,
                "X-Target-Environment": "sandbox" if "sandbox" in self.base_url else "production",
                "Ocp-Apim-Subscription-Key": self.subscription_key,
                "Content-Type": "application/json"
            }
            
            response = requests.post(
                f"{self.base_url}/collection/v1_0/requesttopay",
                json=payload,
                headers=headers,
                timeout=30
            )
            
            if response.status_code in [200, 202]:
                return {
                    'success': True,
                    'transaction_id': external_id,
                    'status': 'pending',
                    'message': 'Payment request sent. Awaiting customer confirmation.',
                    'raw_response': {'external_id': external_id}
                }
            else:
                error_msg = response.json().get('message', 'Payment request failed') if response.text else 'Payment request failed'
                logger.error(f"MTN MoMo payment failed: {response.status_code} - {error_msg}")
                return {
                    'success': False,
                    'error': error_msg,
                    'raw_response': response.json() if response.text else None
                }
                
        except Exception as e:
            logger.error(f"MTN MoMo payment error: {str(e)}")
            return {
                'success': False,
                'error': str(e),
                'raw_response': None
            }
    
    def refund_payment(self, transaction_id, amount=None):
        """Process MTN MoMo refund (disbursement)"""
        try:
            from payments.models import Payment
            
            # Get original payment details
            payment = Payment.objects.filter(transaction_id=transaction_id).first()
            if not payment:
                return {'success': False, 'error': 'Original payment not found'}
            
            refund_id = f"REFUND_{int(time.time())}_{uuid.uuid4().hex[:8]}"
            refund_amount = amount or payment.amount
            phone_number = payment.payment_method.details.get('phone_number', '')
            
            if phone_number.startswith('0'):
                phone_number = '233' + phone_number[1:]
            
            payload = {
                "amount": str(refund_amount),
                "currency": payment.currency or "GHS",
                "externalId": refund_id,
                "payee": {
                    "partyIdType": "MSISDN",
                    "partyId": phone_number
                },
                "payerMessage": f"Refund for transaction {transaction_id}",
                "payeeNote": "SikaRemit Refund"
            }
            
            headers = {
                "Authorization": f"Bearer {self._get_auth_token()}",
                "X-Reference-Id": refund_id,
                "X-Target-Environment": "sandbox" if "sandbox" in self.base_url else "production",
                "Ocp-Apim-Subscription-Key": self.subscription_key,
                "Content-Type": "application/json"
            }
            
            response = requests.post(
                f"{self.base_url}/disbursement/v1_0/transfer",
                json=payload,
                headers=headers,
                timeout=30
            )
            
            if response.status_code in [200, 202]:
                return {
                    'success': True,
                    'transaction_id': refund_id,
                    'status': 'pending',
                    'raw_response': {'refund_id': refund_id}
                }
            else:
                return {
                    'success': False,
                    'error': response.json().get('message', 'Refund failed') if response.text else 'Refund failed',
                    'raw_response': response.json() if response.text else None
                }
                
        except Exception as e:
            logger.error(f"MTN MoMo refund error: {str(e)}")
            return {'success': False, 'error': str(e)}
    
    def check_transaction_status(self, transaction_id: str) -> Dict:
        """Check status of MTN MoMo transaction"""
        try:
            headers = {
                "Authorization": f"Bearer {self._get_auth_token()}",
                "X-Target-Environment": "sandbox" if "sandbox" in self.base_url else "production",
                "Ocp-Apim-Subscription-Key": self.subscription_key
            }
            
            response = requests.get(
                f"{self.base_url}/collection/v1_0/requesttopay/{transaction_id}",
                headers=headers,
                timeout=30
            )
            
            if response.status_code == 200:
                data = response.json()
                return {
                    'success': True,
                    'status': data.get('status'),
                    'amount': data.get('amount'),
                    'currency': data.get('currency'),
                    'raw_response': data
                }
            else:
                return {
                    'success': False,
                    'error': 'Failed to get transaction status'
                }
        except Exception as e:
            return {'success': False, 'error': str(e)}
    
    def _get_auth_token(self) -> str:
        """Get OAuth token for MTN API with caching"""
        current_time = time.time()
        
        if self._access_token and current_time < self._token_expiry:
            return self._access_token
        
        try:
            response = requests.post(
                f"{self.base_url}/collection/token/",
                auth=(self.api_key, self.api_secret),
                headers={
                    "Ocp-Apim-Subscription-Key": self.subscription_key
                },
                timeout=30
            )
            
            if response.status_code == 200:
                data = response.json()
                self._access_token = data.get('access_token')
                expires_in = int(data.get('expires_in', 3600))
                self._token_expiry = current_time + expires_in - 60  # Refresh 1 min early
                return self._access_token
            else:
                logger.error(f"MTN token request failed: {response.status_code}")
                raise ValueError("Failed to get MTN access token")
        except Exception as e:
            logger.error(f"MTN auth error: {str(e)}")
            raise

class TelecelCashGateway(MobileMoneyGateway):
    """
    Telecel Cash payment gateway implementation
    Supports payment collection and disbursement
    
    Required environment variables:
    - TELECEL_API_KEY: Your Telecel API Key
    - TELECEL_API_URL: API URL for Telecel
    - TELECEL_MERCHANT_ID: Your Telecel Merchant ID
    - TELECEL_WEBHOOK_SECRET: Secret for webhook signature verification
    """
    PROVIDER_NAME = "telecel"
    signature_header = 'X-Telecel-Signature'
    
    def __init__(self):
        super().__init__()
        self.api_url = getattr(settings, 'TELECEL_API_URL', None)
        self.auth_token = getattr(settings, 'TELECEL_API_KEY', None)
        self.webhook_secret = getattr(settings, 'TELECEL_WEBHOOK_SECRET', None)
        self.merchant_id = getattr(settings, 'TELECEL_MERCHANT_ID', None)
        
        if not all([self.api_url, self.auth_token, self.merchant_id]):
            logger.warning("Telecel gateway not fully configured. Set TELECEL_* environment variables.")
    
    def is_configured(self) -> bool:
        """Check if gateway is properly configured for production use"""
        return all([self.api_url, self.auth_token, self.merchant_id])
    
    def get_webhook_secret(self) -> str:
        """Get Telecel webhook secret"""
        return self.webhook_secret or ''
    
    def parse_webhook(self, request) -> Dict:
        """Parse Telecel Cash webhook payload"""
        try:
            payload = json.loads(request.body)
            return {
                'event_type': payload.get('event_type', 'payment_notification'),
                'transaction_id': payload.get('transaction_id') or payload.get('reference'),
                'status': payload.get('status', 'unknown'),
                'amount': payload.get('amount'),
                'currency': payload.get('currency', 'GHS'),
                'phone_number': payload.get('msisdn') or payload.get('phone'),
                'merchant_reference': payload.get('merchant_reference'),
                'timestamp': payload.get('timestamp'),
                'raw_payload': payload
            }
        except json.JSONDecodeError as e:
            logger.error(f"Failed to parse Telecel webhook: {str(e)}")
            raise ValueError("Invalid Telecel webhook payload")

    def process_webhook(self, event: Dict) -> JsonResponse:
        """Process Telecel Cash webhook callback"""
        from payments.models import Payment
        
        try:
            transaction_id = event.get('transaction_id')
            status = event.get('status', '').upper()
            
            if not transaction_id:
                return JsonResponse({'error': 'Missing transaction ID'}, status=400)
            
            try:
                payment = Payment.objects.get(
                    transaction_id=transaction_id,
                    payment_method__method_type='telecel'
                )
            except Payment.DoesNotExist:
                logger.warning(f"Telecel payment not found: {transaction_id}")
                return JsonResponse({'status': 'ignored'})
            
            # Map Telecel status
            telecel_status_map = {
                'SUCCESS': 'completed',
                'SUCCESSFUL': 'completed',
                'COMPLETED': 'completed',
                'PENDING': 'pending',
                'PROCESSING': 'processing',
                'FAILED': 'failed',
                'CANCELLED': 'cancelled',
                'TIMEOUT': 'failed'
            }
            
            new_status = telecel_status_map.get(status, 'pending')
            payment.status = new_status
            payment.metadata = payment.metadata or {}
            payment.metadata['telecel_callback'] = event
            payment.save()
            
            self._send_payment_notification(payment, 'telecel_callback')
            
            logger.info(f"Telecel webhook processed: {transaction_id} -> {new_status}")
            return JsonResponse({'status': 'success'})
            
        except Exception as e:
            logger.error(f"Telecel webhook error: {str(e)}")
            return JsonResponse({'error': str(e)}, status=500)
    
    def process_payment(self, amount, currency, payment_method, customer, merchant, metadata=None):
        """Process Telecel Cash payment request"""
        if not self.is_configured():
            return {
                'success': False,
                'error': 'Telecel gateway not configured. Contact support.',
                'raw_response': None
            }
        
        try:
            transaction_id = f"TEL_{int(time.time())}_{uuid.uuid4().hex[:8]}"
            phone_number = payment_method.details.get('phone_number', '')
            
            # Format phone number
            if phone_number.startswith('0'):
                phone_number = '233' + phone_number[1:]
            elif not phone_number.startswith('233'):
                phone_number = '233' + phone_number
            
            payload = {
                'transaction_id': transaction_id,
                'merchant_id': self.merchant_id,
                'amount': float(amount),
                'currency': currency or 'GHS',
                'msisdn': phone_number,
                'description': metadata.get('description', 'SikaRemit Payment') if metadata else 'SikaRemit Payment',
                'callback_url': getattr(settings, 'PAYMENT_CALLBACK_URL', '') + '/telecel/',
                'return_url': metadata.get('return_url') if metadata else None
            }
            
            result = self._make_request_with_retry('/payments/request', payload)
            
            if result.get('success'):
                data = result.get('data', {})
                return {
                    'success': True,
                    'transaction_id': transaction_id,
                    'provider_reference': data.get('reference'),
                    'status': 'pending',
                    'message': 'Payment request sent. Please confirm on your phone.',
                    'raw_response': data
                }
            else:
                return {
                    'success': False,
                    'error': result.get('error', 'Payment request failed'),
                    'raw_response': result
                }
                
        except Exception as e:
            logger.error(f"Telecel payment error: {str(e)}")
            return {'success': False, 'error': str(e)}
    
    def refund_payment(self, transaction_id, amount=None):
        """Process Telecel Cash refund"""
        try:
            from payments.models import Payment
            
            payment = Payment.objects.filter(transaction_id=transaction_id).first()
            refund_amount = amount or (payment.amount if payment else 0)
            
            refund_id = f"TEL_REFUND_{int(time.time())}_{uuid.uuid4().hex[:8]}"
            
            payload = {
                'refund_id': refund_id,
                'original_transaction_id': transaction_id,
                'amount': float(refund_amount),
                'reason': 'Customer refund request'
            }
            
            result = self._make_request_with_retry('/refunds/process', payload)
            
            if result.get('success'):
                return {
                    'success': True,
                    'transaction_id': refund_id,
                    'status': 'pending',
                    'raw_response': result.get('data')
                }
            else:
                return {
                    'success': False,
                    'error': result.get('error', 'Refund failed'),
                    'raw_response': result
                }
                
        except Exception as e:
            logger.error(f"Telecel refund error: {str(e)}")
            return {'success': False, 'error': str(e)}
    
    def check_transaction_status(self, transaction_id: str) -> Dict:
        """Check Telecel transaction status"""
        try:
            result = self._make_request_with_retry(
                f'/payments/status/{transaction_id}',
                {},
                method='GET'
            )
            
            if result.get('success'):
                data = result.get('data', {})
                return {
                    'success': True,
                    'status': data.get('status'),
                    'amount': data.get('amount'),
                    'raw_response': data
                }
            return {'success': False, 'error': result.get('error')}
        except Exception as e:
            return {'success': False, 'error': str(e)}

class AirtelTigoMoneyGateway(MobileMoneyGateway):
    """
    AirtelTigo Money payment gateway implementation
    Supports payment collection and disbursement
    
    Required environment variables:
    - AIRTEL_API_KEY: Your AirtelTigo API Key
    - AIRTEL_API_URL: API URL for AirtelTigo
    - AIRTEL_CLIENT_ID: Your AirtelTigo Client ID
    - AIRTEL_CLIENT_SECRET: Your AirtelTigo Client Secret
    - AIRTEL_WEBHOOK_SECRET: Secret for webhook signature verification
    """
    PROVIDER_NAME = "airtel_tigo"
    signature_header = 'X-AirtelTigo-Signature'
    
    def __init__(self):
        super().__init__()
        self.api_url = getattr(settings, 'AIRTEL_API_URL', None)
        self.auth_token = getattr(settings, 'AIRTEL_API_KEY', None)
        self.webhook_secret = getattr(settings, 'AIRTEL_WEBHOOK_SECRET', None)
        self.client_id = getattr(settings, 'AIRTEL_CLIENT_ID', None)
        self.client_secret = getattr(settings, 'AIRTEL_CLIENT_SECRET', None)
        self._access_token = None
        self._token_expiry = 0
        
        if not all([self.api_url, self.client_id, self.client_secret]):
            logger.warning("AirtelTigo gateway not fully configured. Set AIRTEL_* environment variables.")
    
    def is_configured(self) -> bool:
        """Check if gateway is properly configured for production use"""
        return all([self.api_url, self.client_id, self.client_secret])
    
    def get_webhook_secret(self) -> str:
        """Get AirtelTigo webhook secret"""
        return self.webhook_secret or ''
    
    def parse_webhook(self, request) -> Dict:
        """Parse AirtelTigo Money webhook payload"""
        try:
            payload = json.loads(request.body)
            transaction = payload.get('transaction', {})
            return {
                'event_type': payload.get('event', 'payment_callback'),
                'transaction_id': transaction.get('id') or payload.get('reference'),
                'status': transaction.get('status', payload.get('status', 'unknown')),
                'amount': transaction.get('amount'),
                'currency': transaction.get('currency', 'GHS'),
                'phone_number': transaction.get('msisdn') or payload.get('subscriber', {}).get('msisdn'),
                'airtel_reference': transaction.get('airtel_money_id'),
                'timestamp': payload.get('timestamp'),
                'raw_payload': payload
            }
        except json.JSONDecodeError as e:
            logger.error(f"Failed to parse AirtelTigo webhook: {str(e)}")
            raise ValueError("Invalid AirtelTigo webhook payload")

    def process_webhook(self, event: Dict) -> JsonResponse:
        """Process AirtelTigo Money webhook callback"""
        from payments.models import Payment
        
        try:
            transaction_id = event.get('transaction_id')
            status = event.get('status', '').upper()
            
            if not transaction_id:
                return JsonResponse({'error': 'Missing transaction ID'}, status=400)
            
            try:
                payment = Payment.objects.get(
                    transaction_id=transaction_id,
                    payment_method__method_type='airtel_tigo'
                )
            except Payment.DoesNotExist:
                logger.warning(f"AirtelTigo payment not found: {transaction_id}")
                return JsonResponse({'status': 'ignored'})
            
            # Map AirtelTigo status
            airtel_status_map = {
                'TS': 'completed',  # Transaction Successful
                'TF': 'failed',     # Transaction Failed
                'TP': 'pending',    # Transaction Pending
                'TIP': 'processing', # Transaction In Progress
                'SUCCESS': 'completed',
                'FAILED': 'failed',
                'PENDING': 'pending'
            }
            
            new_status = airtel_status_map.get(status, 'pending')
            payment.status = new_status
            payment.metadata = payment.metadata or {}
            payment.metadata['airtel_callback'] = event
            payment.metadata['airtel_reference'] = event.get('airtel_reference')
            payment.save()
            
            self._send_payment_notification(payment, 'airtel_callback')
            
            logger.info(f"AirtelTigo webhook processed: {transaction_id} -> {new_status}")
            return JsonResponse({'status': 'success'})
            
        except Exception as e:
            logger.error(f"AirtelTigo webhook error: {str(e)}")
            return JsonResponse({'error': str(e)}, status=500)
    
    def process_payment(self, amount, currency, payment_method, customer, merchant, metadata=None):
        """Process AirtelTigo Money payment request"""
        if not self.is_configured():
            return {
                'success': False,
                'error': 'AirtelTigo gateway not configured. Contact support.',
                'raw_response': None
            }
        
        try:
            transaction_id = f"AT_{int(time.time())}_{uuid.uuid4().hex[:8]}"
            phone_number = payment_method.details.get('phone_number', '')
            
            # Format phone number
            if phone_number.startswith('0'):
                phone_number = '233' + phone_number[1:]
            elif not phone_number.startswith('233'):
                phone_number = '233' + phone_number
            
            payload = {
                'reference': transaction_id,
                'subscriber': {
                    'country': 'GH',
                    'currency': currency or 'GHS',
                    'msisdn': phone_number
                },
                'transaction': {
                    'amount': float(amount),
                    'country': 'GH',
                    'currency': currency or 'GHS',
                    'id': transaction_id
                }
            }
            
            headers = {
                'Authorization': f'Bearer {self._get_auth_token()}',
                'Content-Type': 'application/json',
                'X-Country': 'GH',
                'X-Currency': currency or 'GHS'
            }
            
            response = requests.post(
                f"{self.api_url}/merchant/v1/payments/",
                json=payload,
                headers=headers,
                timeout=30
            )
            
            if response.status_code in [200, 201, 202]:
                data = response.json()
                return {
                    'success': True,
                    'transaction_id': transaction_id,
                    'provider_reference': data.get('data', {}).get('transaction', {}).get('id'),
                    'status': 'pending',
                    'message': 'Payment request sent. Please confirm on your phone.',
                    'raw_response': data
                }
            else:
                error_data = response.json() if response.text else {}
                return {
                    'success': False,
                    'error': error_data.get('message', 'Payment request failed'),
                    'raw_response': error_data
                }
                
        except Exception as e:
            logger.error(f"AirtelTigo payment error: {str(e)}")
            return {'success': False, 'error': str(e)}
    
    def refund_payment(self, transaction_id, amount=None):
        """Process AirtelTigo Money refund"""
        try:
            from payments.models import Payment
            
            payment = Payment.objects.filter(transaction_id=transaction_id).first()
            if not payment:
                return {'success': False, 'error': 'Original payment not found'}
            
            refund_id = f"AT_REFUND_{int(time.time())}_{uuid.uuid4().hex[:8]}"
            refund_amount = amount or payment.amount
            phone_number = payment.payment_method.details.get('phone_number', '')
            
            if phone_number.startswith('0'):
                phone_number = '233' + phone_number[1:]
            
            payload = {
                'reference': refund_id,
                'subscriber': {
                    'country': 'GH',
                    'currency': payment.currency or 'GHS',
                    'msisdn': phone_number
                },
                'transaction': {
                    'amount': float(refund_amount),
                    'country': 'GH',
                    'currency': payment.currency or 'GHS',
                    'id': refund_id
                }
            }
            
            headers = {
                'Authorization': f'Bearer {self._get_auth_token()}',
                'Content-Type': 'application/json',
                'X-Country': 'GH',
                'X-Currency': payment.currency or 'GHS'
            }
            
            response = requests.post(
                f"{self.api_url}/standard/v1/disbursements/",
                json=payload,
                headers=headers,
                timeout=30
            )
            
            if response.status_code in [200, 201, 202]:
                return {
                    'success': True,
                    'transaction_id': refund_id,
                    'status': 'pending',
                    'raw_response': response.json()
                }
            else:
                return {
                    'success': False,
                    'error': response.json().get('message', 'Refund failed') if response.text else 'Refund failed',
                    'raw_response': response.json() if response.text else None
                }
                
        except Exception as e:
            logger.error(f"AirtelTigo refund error: {str(e)}")
            return {'success': False, 'error': str(e)}
    
    def check_transaction_status(self, transaction_id: str) -> Dict:
        """Check AirtelTigo transaction status"""
        try:
            headers = {
                'Authorization': f'Bearer {self._get_auth_token()}',
                'X-Country': 'GH',
                'X-Currency': 'GHS'
            }
            
            response = requests.get(
                f"{self.api_url}/standard/v1/payments/{transaction_id}",
                headers=headers,
                timeout=30
            )
            
            if response.status_code == 200:
                data = response.json()
                return {
                    'success': True,
                    'status': data.get('data', {}).get('transaction', {}).get('status'),
                    'amount': data.get('data', {}).get('transaction', {}).get('amount'),
                    'raw_response': data
                }
            return {'success': False, 'error': 'Failed to get transaction status'}
        except Exception as e:
            return {'success': False, 'error': str(e)}
    
    def _get_auth_token(self) -> str:
        """Get OAuth token for AirtelTigo API with caching"""
        current_time = time.time()
        
        if self._access_token and current_time < self._token_expiry:
            return self._access_token
        
        # If no client credentials, use API key directly
        if not self.client_id or not self.client_secret:
            return self.auth_token or ''
        
        try:
            response = requests.post(
                f"{self.api_url}/auth/oauth2/token",
                data={
                    'client_id': self.client_id,
                    'client_secret': self.client_secret,
                    'grant_type': 'client_credentials'
                },
                headers={'Content-Type': 'application/x-www-form-urlencoded'},
                timeout=30
            )
            
            if response.status_code == 200:
                data = response.json()
                self._access_token = data.get('access_token')
                expires_in = int(data.get('expires_in', 3600))
                self._token_expiry = current_time + expires_in - 60
                return self._access_token
            else:
                logger.error(f"AirtelTigo token request failed: {response.status_code}")
                return self.auth_token or ''
        except Exception as e:
            logger.error(f"AirtelTigo auth error: {str(e)}")
            return self.auth_token or ''

class GMoneyGateway(MobileMoneyGateway):
    """
    G-Money payment gateway implementation (Ghana Commercial Bank)
    Supports payment collection and disbursement with full Bank of Ghana compliance
    
    Required environment variables:
    - G_MONEY_API_KEY: Your G-Money API Key
    - G_MONEY_API_SECRET: Your G-Money API Secret
    - G_MONEY_API_URL: API URL for G-Money (production: https://api.gmoney.com.gh)
    - G_MONEY_MERCHANT_ID: Your G-Money Merchant ID
    - G_MONEY_WEBHOOK_SECRET: Secret for webhook signature verification
    """
    PROVIDER_NAME = "g_money"
    signature_header = 'X-G-Money-Signature'
    
    def __init__(self):
        super().__init__()
        self.api_url = getattr(settings, 'G_MONEY_API_URL', None)
        self.auth_token = getattr(settings, 'G_MONEY_API_KEY', None)
        self.api_secret = getattr(settings, 'G_MONEY_API_SECRET', None)
        self.webhook_secret = getattr(settings, 'G_MONEY_WEBHOOK_SECRET', None)
        self.merchant_id = getattr(settings, 'G_MONEY_MERCHANT_ID', None)
        self._access_token = None
        self._token_expiry = 0
        
        if not all([self.api_url, self.auth_token, self.api_secret, self.merchant_id]):
            logger.warning("G-Money gateway not fully configured. Set G_MONEY_* environment variables.")
    
    def is_configured(self) -> bool:
        """Check if gateway is properly configured for production use"""
        return all([self.api_url, self.auth_token, self.api_secret, self.merchant_id])
    
    def get_webhook_secret(self) -> str:
        """Get G-Money webhook secret"""
        return self.webhook_secret or self.api_secret or ''
    
    def parse_webhook(self, request) -> Dict:
        """Parse G-Money webhook payload"""
        try:
            payload = json.loads(request.body)
            transaction = payload.get('transaction', {})
            return {
                'event_type': payload.get('event', 'payment_callback'),
                'transaction_id': transaction.get('transactionId') or payload.get('reference'),
                'status': transaction.get('status', payload.get('status', 'unknown')),
                'amount': transaction.get('amount'),
                'currency': transaction.get('currency', 'GHS'),
                'phone_number': transaction.get('customer', {}).get('phoneNumber') or payload.get('customerPhone'),
                'g_money_reference': transaction.get('gMoneyReference'),
                'bank_reference': transaction.get('bankReference'),
                'timestamp': payload.get('timestamp'),
                'raw_payload': payload
            }
        except json.JSONDecodeError as e:
            logger.error(f"Failed to parse G-Money webhook: {str(e)}")
            raise ValueError("Invalid G-Money webhook payload")

    def process_webhook(self, event: Dict) -> JsonResponse:
        """Process G-Money webhook callback"""
        from payments.models import Payment
        
        try:
            transaction_id = event.get('transaction_id')
            status = event.get('status', '').upper()
            
            if not transaction_id:
                return JsonResponse({'error': 'Missing transaction ID'}, status=400)
            
            try:
                payment = Payment.objects.get(
                    transaction_id=transaction_id,
                    payment_method__method_type='g_money'
                )
            except Payment.DoesNotExist:
                logger.warning(f"G-Money payment not found: {transaction_id}")
                return JsonResponse({'status': 'ignored'})
            
            # Map G-Money status to internal status
            g_money_status_map = {
                'SUCCESS': 'completed',
                'SUCCESSFUL': 'completed',
                'COMPLETED': 'completed',
                'PENDING': 'pending',
                'PROCESSING': 'processing',
                'FAILED': 'failed',
                'CANCELLED': 'cancelled',
                'REJECTED': 'failed',
                'TIMEOUT': 'failed',
                'INSUFFICIENT_FUNDS': 'failed',
                'INVALID_ACCOUNT': 'failed'
            }
            
            new_status = g_money_status_map.get(status, 'pending')
            payment.status = new_status
            payment.metadata = payment.metadata or {}
            payment.metadata['g_money_callback'] = event
            payment.metadata['g_money_reference'] = event.get('g_money_reference')
            payment.metadata['bank_reference'] = event.get('bank_reference')
            payment.save()
            
            self._send_payment_notification(payment, 'g_money_callback')
            
            logger.info(f"G-Money webhook processed: {transaction_id} -> {new_status}")
            return JsonResponse({'status': 'success'})
            
        except Exception as e:
            logger.error(f"G-Money webhook error: {str(e)}")
            return JsonResponse({'error': str(e)}, status=500)
    
    def process_payment(self, amount, currency, payment_method, customer, merchant, metadata=None):
        """Process G-Money payment request"""
        if not self.is_configured():
            return {
                'success': False,
                'error': 'G-Money gateway not configured. Contact support.',
                'raw_response': None
            }
        
        try:
            transaction_id = f"GM_{int(time.time())}_{uuid.uuid4().hex[:8]}"
            phone_number = payment_method.details.get('phone_number', '')
            
            # Format phone number for Ghana
            if phone_number.startswith('0'):
                phone_number = '233' + phone_number[1:]
            elif not phone_number.startswith('233'):
                phone_number = '233' + phone_number
            
            payload = {
                'merchantId': self.merchant_id,
                'transactionId': transaction_id,
                'amount': float(amount),
                'currency': currency or 'GHS',
                'customer': {
                    'phoneNumber': phone_number,
                    'email': customer.user.email if customer and customer.user else None,
                    'name': f"{customer.user.first_name} {customer.user.last_name}" if customer and customer.user else 'Customer'
                },
                'description': metadata.get('description', f'Payment to {merchant.business_name if merchant else "SikaRemit"}'),
                'callbackUrl': getattr(settings, 'PAYMENT_CALLBACK_URL', '') + '/g_money/',
                'returnUrl': metadata.get('return_url') if metadata else None
            }
            
            headers = {
                'Authorization': f'Bearer {self._get_auth_token()}',
                'Content-Type': 'application/json',
                'X-Merchant-Id': self.merchant_id
            }
            
            response = requests.post(
                f"{self.api_url}/api/v1/payments/initiate",
                json=payload,
                headers=headers,
                timeout=30
            )
            
            if response.status_code in [200, 201, 202]:
                data = response.json()
                return {
                    'success': True,
                    'transaction_id': transaction_id,
                    'provider_reference': data.get('reference'),
                    'g_money_reference': data.get('gMoneyReference'),
                    'status': 'pending',
                    'message': 'Payment request sent. Please confirm on your phone.',
                    'raw_response': data
                }
            else:
                error_data = response.json() if response.text else {}
                error_msg = error_data.get('message', error_data.get('error', 'Payment request failed'))
                logger.error(f"G-Money payment failed: {response.status_code} - {error_msg}")
                return {
                    'success': False,
                    'error': error_msg,
                    'raw_response': error_data
                }
                
        except Exception as e:
            logger.error(f"G-Money payment error: {str(e)}")
            return {'success': False, 'error': str(e)}
    
    def refund_payment(self, transaction_id, amount=None):
        """Process G-Money refund"""
        try:
            from payments.models import Payment
            
            payment = Payment.objects.filter(transaction_id=transaction_id).first()
            if not payment:
                return {'success': False, 'error': 'Original payment not found'}
            
            refund_id = f"GM_REFUND_{int(time.time())}_{uuid.uuid4().hex[:8]}"
            refund_amount = amount or payment.amount
            phone_number = payment.payment_method.details.get('phone_number', '')
            
            if phone_number.startswith('0'):
                phone_number = '233' + phone_number[1:]
            
            payload = {
                'merchantId': self.merchant_id,
                'transactionId': refund_id,
                'originalTransactionId': transaction_id,
                'amount': float(refund_amount),
                'currency': payment.currency or 'GHS',
                'customer': {
                    'phoneNumber': phone_number,
                    'email': payment.customer.user.email if payment.customer and payment.customer.user else None
                },
                'description': f'Refund for transaction {transaction_id}',
                'reason': 'Customer refund request'
            }
            
            headers = {
                'Authorization': f'Bearer {self._get_auth_token()}',
                'Content-Type': 'application/json',
                'X-Merchant-Id': self.merchant_id
            }
            
            response = requests.post(
                f"{self.api_url}/api/v1/refunds/initiate",
                json=payload,
                headers=headers,
                timeout=30
            )
            
            if response.status_code in [200, 201, 202]:
                data = response.json()
                return {
                    'success': True,
                    'transaction_id': refund_id,
                    'status': 'pending',
                    'g_money_reference': data.get('gMoneyReference'),
                    'raw_response': data
                }
            else:
                error_data = response.json() if response.text else {}
                return {
                    'success': False,
                    'error': error_data.get('message', 'Refund failed') if response.text else 'Refund failed',
                    'raw_response': error_data
                }
                
        except Exception as e:
            logger.error(f"G-Money refund error: {str(e)}")
            return {'success': False, 'error': str(e)}
    
    def check_transaction_status(self, transaction_id: str) -> Dict:
        """Check G-Money transaction status"""
        try:
            headers = {
                'Authorization': f'Bearer {self._get_auth_token()}',
                'X-Merchant-Id': self.merchant_id
            }
            
            response = requests.get(
                f"{self.api_url}/api/v1/payments/status/{transaction_id}",
                headers=headers,
                timeout=30
            )
            
            if response.status_code == 200:
                data = response.json()
                return {
                    'success': True,
                    'status': data.get('status'),
                    'amount': data.get('amount'),
                    'currency': data.get('currency'),
                    'g_money_reference': data.get('gMoneyReference'),
                    'raw_response': data
                }
            return {'success': False, 'error': 'Failed to get transaction status'}
        except Exception as e:
            return {'success': False, 'error': str(e)}
    
    def _get_auth_token(self) -> str:
        """Get OAuth token for G-Money API with caching"""
        current_time = time.time()
        
        if self._access_token and current_time < self._token_expiry:
            return self._access_token
        
        try:
            # G-Money uses client credentials grant
            response = requests.post(
                f"{self.api_url}/oauth2/token",
                data={
                    'client_id': self.auth_token,
                    'client_secret': self.api_secret,
                    'grant_type': 'client_credentials'
                },
                headers={'Content-Type': 'application/x-www-form-urlencoded'},
                timeout=30
            )
            
            if response.status_code == 200:
                data = response.json()
                self._access_token = data.get('access_token')
                expires_in = int(data.get('expires_in', 3600))
                self._token_expiry = current_time + expires_in - 60  # Refresh 1 min early
                return self._access_token
            else:
                logger.error(f"G-Money token request failed: {response.status_code}")
                raise ValueError("Failed to get G-Money access token")
        except Exception as e:
            logger.error(f"G-Money auth error: {str(e)}")
            raise
