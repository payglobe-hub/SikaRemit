from django.urls import re_path
from . import consumers

websocket_urlpatterns = [
    # Existing notification consumer
    re_path(r'ws/notifications/$', consumers.NotificationConsumer.as_asgi()),

    # New real-time consumers
    re_path(r'ws/balance/$', consumers.BalanceConsumer.as_asgi()),
    re_path(r'ws/transactions/$', consumers.TransactionConsumer.as_asgi()),
    re_path(r'ws/payment-status/$', consumers.PaymentStatusConsumer.as_asgi()),
    re_path(r'ws/dashboard/$', consumers.DashboardConsumer.as_asgi()),
]
