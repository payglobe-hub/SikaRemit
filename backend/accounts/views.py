"""
accounts/views.py — Re-export hub.

All view implementations have been split into focused modules for maintainability:
  - views_auth.py        : Login, register, logout, refresh, token validation, profile
  - views_password.py    : Password reset/change, email verification, backup verification
  - views_mfa_oauth.py   : MFA setup/login/backup codes, Google OAuth
  - views_admin.py       : Admin user CRUD, activity logs, security audit, sessions
  - views_customer.py    : Customer balance/payments/receipts/stats, search, loyalty
  - views_payment.py     : Checkout, subscription/remittance/bill payments, webhooks
  - views_viewsets.py    : User/Merchant/Transaction/Payment/Product/Support/Payout ViewSets

This file re-exports everything so that existing imports continue to work unchanged.
"""

# Auth views
from .views_auth import (  # noqa: F401
    validate_token, SessionMonitorMiddleware,
    UserRegisterView, UserLoginView, UserRefreshView,
    UserLogoutView, LogoutOtherSessionsView,
    TokenValidateView, ProfileView, MyTokenObtainPairView,
)

# Password & email verification views
from .views_password import (  # noqa: F401
    PasswordResetView, PasswordResetConfirmView, PasswordPolicyView,
    PasswordChangeView, EmailVerificationView, EmailVerificationConfirmView,
    BackupVerificationView,
)

# MFA & OAuth views
from .views_mfa_oauth import (  # noqa: F401
    MFASetupView, MFALoginView, MFABackupCodesView,
    google_oauth_view, GoogleAuthView, GoogleOAuthCallbackView,
)

# Admin views
from .views_admin import (  # noqa: F401
    AdminUserCreateView, AdminUserViewSet,
    AdminActivityView, SecurityAuditView,
    SessionListView, AuditReportView, SessionAnalyticsView,
)

# Customer views
from .views_customer import (  # noqa: F401
    CustomerBalanceView, CustomerPaymentsView, CustomerReceiptsView,
    CustomerStatsView, CustomerViewSet,
    LoyaltyPointsView, RedeemPointsView, BalanceView, UserSearchView,
)

# Payment views
from .views_payment import (  # noqa: F401
    CheckoutAPIView, CheckoutStatusView,
    StripeWebhookView, MobileMoneyWebhookView,
    SubscriptionPaymentView, RemittancePaymentView,
    BillPaymentView, PaymentView,
)

# Generic ViewSets
from .views_viewsets import (  # noqa: F401
    UserViewSet, MerchantViewSet,
    PasswordResetTokenViewSet, AuthLogViewSet,
    TransactionViewSet, PaymentsViewSet,
    MerchantProductViewSet, ProductInventoryView,
    PaymentLogViewSet, SupportTicketViewSet, PayoutViewSet,
)
