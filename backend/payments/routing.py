from django.urls import re_path
from . import consumers

websocket_urlpatterns = [
    # Exchange rates WebSocket
    re_path(r'ws/exchange-rates/$', consumers.ExchangeRateConsumer.as_asgi()),

    # Currency notifications WebSocket (requires authentication)
    re_path(r'ws/currency-notifications/$', consumers.CurrencyNotificationConsumer.as_asgi()),
    
    re_path(r"ws/notifications/$", consumers.NotificationConsumer.as_asgi()),
]
