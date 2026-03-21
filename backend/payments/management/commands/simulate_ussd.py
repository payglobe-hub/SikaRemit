from django.core.management.base import BaseCommand
from django.urls import reverse
from django.test import Client
import json

class Command(BaseCommand):
    help = 'Simulate USSD payment flow for testing'

    def handle(self, *args, **options):
        client = Client()
        session_id = "test-session-123"
        phone_number = "233123456789"
        
        # Initial request (no user input)
        response = client.post(
            reverse('ussd_callback'),
            data={
                'sessionId': session_id,
                'phoneNumber': phone_number,
                'serviceCode': '*123#',
                'text': ''
            },
            content_type='application/json'
        )
        data = json.loads(response.content)

        # User enters amount
        response = client.post(
            reverse('ussd_callback'),
            data={
                'sessionId': session_id,
                'phoneNumber': phone_number,
                'serviceCode': '*123#',
                'text': '100'
            },
            content_type='application/json'
        )
        data = json.loads(response.content)

        # User confirms (1 for yes)
        response = client.post(
            reverse('ussd_callback'),
            data={
                'sessionId': session_id,
                'phoneNumber': phone_number,
                'serviceCode': '*123#',
                'text': '1'
            },
            content_type='application/json'
        )
        data = json.loads(response.content)
        
