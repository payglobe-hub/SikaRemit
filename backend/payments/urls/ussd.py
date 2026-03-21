"""
USSD URL patterns for SikaRemit
"""

from django.urls import path
from ..views.ussd import ussd_callback, ussd_webhook

app_name = 'ussd'

urlpatterns = [
    # USSD callback endpoint for mobile networks
    path('callback/', ussd_callback, name='ussd_callback'),

    # USSD webhook for external notifications
    path('webhook/', ussd_webhook, name='ussd_webhook'),
]
