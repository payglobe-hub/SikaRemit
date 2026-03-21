from django.urls import path, include
from rest_framework_simplejwt.views import TokenRefreshView
from django.views.decorators.csrf import csrf_exempt
from rest_framework.routers import DefaultRouter
from .views import (
    UserLoginView, UserRegisterView, UserLogoutView, PasswordResetView,
    PasswordResetConfirmView, EmailVerificationView, EmailVerificationConfirmView,
    PasswordChangeView, ProfileView, CustomerViewSet, CustomerStatsView,
    AdminUserCreateView, AdminUserViewSet, SupportTicketViewSet, PayoutViewSet, UserSearchView
)
from .views_admin import (
    AdminGeneralSettingsView, AdminSecuritySettingsView, AdminAPISettingsView,
    AdminNotificationSettingsView, AdminMaintenanceSettingsView
)
from .views_auth import LogoutOtherSessionsView, ActiveSessionsView
from .views_mfa_oauth import (
    MFASetupView, MFAVerifyView, MFALoginView, MFABackupCodesView, 
    GoogleAuthView, GoogleOAuthCallbackView,
)
from .api.views import RecipientViewSet
from .api.views_customer import CreateCustomerAPIView
from .api.customer_reports import (
    CustomerStatementAPIView,
    CustomerStatementPreviewAPIView,
    CustomerStatsAPIView,
    CustomerTransactionsAPIView,
    CustomerSpendingByCategoryAPIView,
    CustomerBalanceHistoryAPIView,
    CustomerBalanceAPIView
)
from .api.advanced_admin_reports import (
    SystemMetricsAPIView,
    ComplianceReportAPIView,
    MerchantPerformanceAPIView,
    CustomerAnalyticsAPIView,
    FinancialSummaryAPIView,
    ScheduleReportAPIView,
    GetScheduledReportsAPIView,
    CancelScheduledReportAPIView
)

# Create router for support tickets
support_router = DefaultRouter()
support_router.register(r'support-tickets', SupportTicketViewSet, basename='support-tickets')

# Create router for payouts
payout_router = DefaultRouter()
payout_router.register(r'payouts', PayoutViewSet, basename='payouts')

# Advanced admin reports URLs
advanced_admin_reports_urls = [
    path('system-metrics/', SystemMetricsAPIView.as_view(), name='admin-system-metrics'),
    path('compliance/', ComplianceReportAPIView.as_view(), name='admin-compliance-report'),
    path('merchant-performance/', MerchantPerformanceAPIView.as_view(), name='admin-merchant-performance'),
    path('customer-analytics/', CustomerAnalyticsAPIView.as_view(), name='admin-customer-analytics'),
    path('financial-summary/', FinancialSummaryAPIView.as_view(), name='admin-financial-summary'),
    path('schedule/', ScheduleReportAPIView.as_view(), name='admin-schedule-report'),
    path('scheduled/', GetScheduledReportsAPIView.as_view(), name='admin-get-scheduled-reports'),
    path('scheduled/<int:pk>/cancel/', CancelScheduledReportAPIView.as_view(), name='admin-cancel-scheduled-report'),
]

urlpatterns = [
    path('login/', csrf_exempt(UserLoginView.as_view()), name='login'),
    path('register/', UserRegisterView.as_view(), name='register'),
    path('logout/', UserLogoutView.as_view(), name='logout'),
    path('logout/other-sessions/', LogoutOtherSessionsView.as_view(), name='logout_other_sessions'),
    path('sessions/active/', ActiveSessionsView.as_view(), name='active_sessions'),
    path('refresh/', TokenRefreshView.as_view(), name='refresh'),
    path('password/reset/', PasswordResetView.as_view(), name='password_reset'),
    path('password/reset/confirm/', PasswordResetConfirmView.as_view(), name='password_reset_confirm'),
    path('password/change/', PasswordChangeView.as_view(), name='password_change'),
    path('verify-email/', EmailVerificationConfirmView.as_view(), name='verify_email_confirm'),
    path('resend-verification/', EmailVerificationView.as_view(), name='resend_verification'),
    path('profile/', ProfileView.as_view(), name='profile'),
    path('2fa/setup/', MFASetupView.as_view(), name='mfa_setup'),
    path('2fa/verify/', MFAVerifyView.as_view(), name='mfa_verify'),
    path('mfa/verify/', MFALoginView.as_view(), name='mfa_login'),
    path('mfa/backup-codes/', MFABackupCodesView.as_view(), name='mfa_backup_codes'),
    path('google/', GoogleAuthView.as_view(), name='google_auth'),
    path('google/callback/', GoogleOAuthCallbackView.as_view(), name='google_callback'),
    path('customers/balance/', CustomerViewSet.as_view({'get': 'balance'}), name='customer_balance'),
    path('customers/payments/', CustomerViewSet.as_view({'get': 'payments'}), name='customer_payments'),
    path('customers/receipts/', CustomerViewSet.as_view({'get': 'receipts'}), name='customer_receipts'),
    path('customers/stats/', CustomerStatsView.as_view(), name='customer_stats'),
    path('customers/profile/', ProfileView.as_view(), name='customer_profile'),
    path('customers/', include(support_router.urls)),
    path('customers/recipients/', RecipientViewSet.as_view({'get': 'list'}), name='customer_recipients'),
    path('customers/statements/', CustomerStatementAPIView.as_view(), name='customer-statements'),
    path('customers/statements/generate/', CustomerStatementAPIView.as_view(), name='customer-statement-generate'),
    path('customers/statements/preview/', CustomerStatementPreviewAPIView.as_view(), name='customer-statement-preview'),
    path('customers/statements/<int:pk>/download/', CustomerStatementAPIView.as_view(), name='customer-statement-download'),
    path('customers/transactions/', CustomerTransactionsAPIView.as_view(), name='customer-transactions'),
    path('customers/spending-by-category/', CustomerSpendingByCategoryAPIView.as_view(), name='customer-spending-by-category'),
    path('customers/balance-history/', CustomerBalanceHistoryAPIView.as_view(), name='customer-balance-history'),
    path('customers/balance/', CustomerBalanceAPIView.as_view(), name='customer-balance'),
    path('users/search/', UserSearchView.as_view(), name='user_search'),
    path('merchant/', include(payout_router.urls)),
    path('admin/users/', AdminUserViewSet.as_view({
        'get': 'list',
        'post': 'create'
    }), name='admin_users'),
    path('admin/users/<int:pk>/', AdminUserViewSet.as_view({
        'get': 'retrieve',
        'patch': 'partial_update',
        'delete': 'destroy'
    }), name='admin_users_detail'),
    path('admin/create-customer/', CreateCustomerAPIView.as_view(), name='create_customer'),
    # Admin Settings API
    path('admin/settings/general/', AdminGeneralSettingsView.as_view(), name='admin_settings_general'),
    path('admin/settings/security/', AdminSecuritySettingsView.as_view(), name='admin_settings_security'),
    path('admin/settings/api/', AdminAPISettingsView.as_view(), name='admin_settings_api'),
    path('admin/settings/notifications/', AdminNotificationSettingsView.as_view(), name='admin_settings_notifications'),
    path('admin/settings/maintenance/', AdminMaintenanceSettingsView.as_view(), name='admin_settings_maintenance'),
    # Advanced Admin Reporting API  
    path('admin/reports/', include(advanced_admin_reports_urls)),
]
