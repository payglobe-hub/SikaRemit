import requests
from django.conf import settings
from requests.auth import HTTPBasicAuth

class MobileMoneyClient:
    def __init__(self, provider):
        self.provider = provider
        self.config = settings.MOBILE_MONEY_PROVIDERS.get(provider, {})
        
    def initiate_payment(self, amount, phone_number, reference):
        """Initiate mobile money payment"""
        if self.provider == 'MTN':
            return self._mtn_payment(amount, phone_number, reference)
        elif self.provider == 'AIRTEL':
            return self._airtel_payment(amount, phone_number, reference)
        elif self.provider == 'VODAFONE':
            return self._vodafone_payment(amount, phone_number, reference)
        
        raise ValueError(f'Unsupported provider: {self.provider}')
    
    def _mtn_payment(self, amount, phone_number, reference):
        """MTN Mobile Money implementation"""
        url = f"{self.config['BASE_URL']}/payments"
        headers = {
            'Authorization': f"Bearer {self.config['API_KEY']}",
            'Content-Type': 'application/json'
        }
        payload = {
            'amount': amount,
            'currency': 'USD',
            'externalId': reference,
            'payer': {
                'partyIdType': 'MSISDN',
                'partyId': phone_number
            },
            'payerMessage': 'Payment for goods/services',
            'payeeNote': 'Thank you for your payment'
        }
        
        response = requests.post(url, json=payload, headers=headers)
        response.raise_for_status()
        return response.json()
    
    def _airtel_payment(self, amount, phone_number, reference):
        """Airtel Money implementation"""
        url = f"{self.config['BASE_URL']}/v1/payments"
        auth = HTTPBasicAuth(self.config['CLIENT_ID'], self.config['API_KEY'])
        payload = {
            'transaction': {
                'amount': amount,
                'country': 'US',
                'currency': 'USD',
                'id': reference
            },
            'subscriber': {
                'msisdn': phone_number
            }
        }
        
        response = requests.post(url, json=payload, auth=auth)
        response.raise_for_status()
        return response.json()

    def _vodafone_payment(self, amount, phone_number, reference):
        """Vodafone Cash implementation"""
        url = f"{self.config['BASE_URL']}/transactions"
        headers = {
            'Authorization': f"Token {self.config['API_KEY']}",
            'Merchant-ID': self.config['MERCHANT_ID']
        }
        payload = {
            'amount': amount,
            'recipient': phone_number,
            'reference': reference,
            'callback_url': settings.BASE_URL + '/accounts/webhooks/mobile-money/'
        }
        
        response = requests.post(url, json=payload, headers=headers)
        response.raise_for_status()
        return response.json()
