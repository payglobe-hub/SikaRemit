"""
payments/views/main_views.py - Re-export hub.

All view implementations have been split into focused modules for maintainability:
  - main_qr_views.py           : QR payment validation, processing, generation
  - main_method_views.py       : PaymentMethodViewSet, throttle, decorator
  - main_transaction_views.py  : TransactionViewSet, AdminTransactionViewSet, SubscriptionViewSet, PaymentViewSet, USSD, mobile
  - main_remittance_views.py   : CrossBorderRemittanceViewSet, all remittance views and functions
  - main_p2p_verify_views.py   : VerificationViewSet, P2PPaymentView, webhook, misc payment views

This file re-exports everything so that existing imports continue to work unchanged.
"""

# QR payment views
from .main_qr_views import (  # noqa: F401
    validate_qr_payment, process_qr_payment, generate_qr_code,
)

# Payment method views
from .main_method_views import (  # noqa: F401
    validate_payment_method, PaymentRateThrottle, PaymentMethodViewSet,
)

# Transaction views
from .main_transaction_views import (  # noqa: F401
    TransactionViewSet, SubscriptionViewSet, AdminTransactionViewSet,
    PaymentViewSet, VerifyMobilePaymentView,
    process_payment, verify_mobile_payment,
    USSDCallbackView, ScheduledPayoutViewSet, USSDTransactionViewSet,
)

# Remittance views
from .main_remittance_views import (  # noqa: F401
    CrossBorderRemittanceViewSet, RemittanceView,
    OutboundRemittanceView, GlobalRemittanceView,
    send_remittance_view, initiate_payment_view, process_checkout_view,
    send_outbound_remittance_view, send_global_remittance_view,
)

# Verification, P2P, and misc views
from .main_p2p_verify_views import (  # noqa: F401
    VerificationViewSet, P2PPaymentView, WebhookView,
    verify_payment_view, request_refund_view,
    request_money_view, data_plans_view, DomesticTransferViewSet,
)
