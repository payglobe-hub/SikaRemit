from django.urls import path, include
from rest_framework.routers import DefaultRouter
from ..views import (
    PaymentMethodViewSet, TransactionViewSet, AdminTransactionViewSet, process_payment, 
    verify_mobile_payment, USSDCallbackView, USSDTransactionViewSet, PaymentViewSet, 
    ScheduledPayoutViewSet, CrossBorderRemittanceViewSet, VerificationViewSet, P2PPaymentView, 
    validate_qr_payment, process_qr_payment, generate_qr_code, send_remittance_view, 
    initiate_payment_view, process_checkout_view, send_outbound_remittance_view, 
    send_global_remittance_view, DomesticTransferViewSet
)
from ..views.currency_views import currencies_list, CurrencyViewSet, historical_rates, set_exchange_rates
from ..views.country_views import countries_list, country_detail, CountryViewSet
from ..views.telecom_views import telecom_providers, telecom_packages, purchase_airtime, purchase_data_bundle
from ..views.wallet_views import (
    exchange_rates, convert_currency, WalletViewSet, deposit_mobile_money, 
    deposit_bank_transfer, deposit_card, withdraw_mobile_money, withdraw_bank_transfer, 
    get_withdrawal_limits, get_supported_banks, transfer_to_sikaremit_wallet, lookup_sikaremit_user
)
from ..views.exchange_rate_views import ExchangeRateViewSet
from ..views.bills_views import BillViewSet
from ..views.merchant_dashboard import merchant_dashboard_stats, merchant_recent_transactions, merchant_analytics
from ..views.analytics_views import AnalyticsViewSet
from ..views.dispute_views import DisputeViewSet
from ..views.customer_dispute_views import CustomerDisputeViewSet
from ..views.merchant_dispute_views import MerchantDisputeViewSet
from ..views.subscriptions_views import SubscriptionViewSet
from ..views.rate_limiting_views import RateLimitingViewSet, RateLimitMonitoringViewSet
from ..views.payment_methods_api import get_available_payment_methods
from ..views.fees import FeeConfigurationViewSet
from ..views.pos_views import POSDeviceViewSet, POSTransactionViewSet, register_pos_device, process_pos_transaction, generate_pos_receipt, get_pos_dashboard_data
from .. import webhooks, reporting

from rest_framework.decorators import api_view, permission_classes
from rest_framework import permissions
from rest_framework.response import Response

@api_view(['GET', 'PATCH'])
@permission_classes([permissions.IsAuthenticated])
def currency_preferences(request):
    from users.models import Customer

    cache_key = f"user_currency_prefs:{request.user.id}"
    default_prefs = {
        "display_currency": {"code": "USD"},
        "show_symbol": True,
        "show_code": False,
        "decimal_places": 2,
        "auto_update_rates": True,
    }

    if request.method == 'GET':
        cached_prefs = cache.get(cache_key)
        if cached_prefs:
            return Response(cached_prefs)

        # Load from Customer profile
        try:
            customer = Customer.objects.get(user=request.user)
            stored = (customer.address or {}).get('_currency_preferences')
            if stored:
                cache.set(cache_key, stored, timeout=None)
                return Response(stored)
        except Customer.DoesNotExist:
            pass

        cache.set(cache_key, default_prefs, timeout=None)
        return Response(default_prefs)

    elif request.method == 'PATCH':
        # Merge incoming data with existing prefs
        cached_prefs = cache.get(cache_key) or default_prefs
        updated_prefs = {**cached_prefs, **request.data}

        # Persist to cache
        cache.set(cache_key, updated_prefs, timeout=None)

        # Persist to Customer profile
        try:
            customer = Customer.objects.get(user=request.user)
            addr = customer.address or {}
            addr['_currency_preferences'] = updated_prefs
            customer.address = addr
            customer.save(update_fields=['address'])
        except Customer.DoesNotExist:
            pass

        return Response(updated_prefs)

router = DefaultRouter()
router.register(r'methods', PaymentMethodViewSet, basename='payment-methods')
router.register(r'transactions', TransactionViewSet, basename='transactions')
router.register(r'admin/transactions', AdminTransactionViewSet, basename='admin-transactions')
router.register(r'ussd-transactions', USSDTransactionViewSet, basename='ussd-transactions')
router.register(r'payments', PaymentViewSet, basename='payments')
router.register(r'scheduled-payouts', ScheduledPayoutViewSet, basename='scheduled-payouts')
router.register(r'currencies', CurrencyViewSet, basename='currencies')
router.register(r'countries', CountryViewSet, basename='countries')
router.register(r'wallet', WalletViewSet, basename='wallet')
router.register(r'exchange-rates-admin', ExchangeRateViewSet, basename='exchange-rates-admin')
router.register(r'rate-limiting', RateLimitingViewSet, basename='rate-limiting')
router.register(r'rate-monitoring', RateLimitMonitoringViewSet, basename='rate-monitoring')
router.register(r'fees', FeeConfigurationViewSet, basename='fees')
router.register(r'bills', BillViewSet, basename='bills')
router.register(r'subscriptions', SubscriptionViewSet, basename='subscriptions')
router.register(r'domestic-transfers', DomesticTransferViewSet, basename='domestic-transfers')
router.register(r'analytics', AnalyticsViewSet, basename='analytics')
router.register(r'admin/disputes', DisputeViewSet, basename='admin-disputes')
router.register(r'customer/disputes', CustomerDisputeViewSet, basename='customer-disputes')
router.register(r'merchant/disputes', MerchantDisputeViewSet, basename='merchant-disputes')

urlpatterns = [
    # Currency endpoints
    path('currencies/', currencies_list, name='currencies_list'),
    path('currencies/historical/', historical_rates, name='historical_rates'),
    path('currencies/set-rates/', set_exchange_rates, name='set_exchange_rates'),
    path('currency-preferences/', currency_preferences, name='currency_preferences'),
    path('countries/', countries_list, name='countries_list'),
    path('countries/<str:code>/', country_detail, name='country_detail'),
    path('exchange-rates/', exchange_rates, name='exchange_rates'),
    path('convert-currency/', convert_currency, name='convert_currency'),
    
    path('', include(router.urls)),
    
    # Merchant transactions endpoint
    path('merchant/dashboard/transactions/', merchant_recent_transactions, name='merchant-transactions'),
    
    # P2P Payment endpoint
    path('send/', P2PPaymentView.as_view(), name='p2p_payment'),
    path('request/', P2PPaymentView.as_view(), name='p2p_request'),
    
    # Verification endpoints
    path('verify/phone/', 
        VerificationViewSet.as_view({'post': 'verify_phone'}), 
        name='verify-phone'),
    path('verify/funds/', 
        VerificationViewSet.as_view({'post': 'verify_funds'}), 
        name='verify-funds'),
    path('verify/recipient/',
        VerificationViewSet.as_view({'post': 'verify_recipient'}),
        name='verify-recipient'),
    path('verify/providers/', 
        VerificationViewSet.as_view({'get': 'available_providers'}), 
        name='verification-providers'),
    path('verify/test/', 
        VerificationViewSet.as_view({'post': 'test_provider'}), 
        name='test-verification'),
    path('verify/analytics/',
        VerificationViewSet.as_view({'get': 'analytics'}),
        name='verification-analytics'),
    path('verify/provider-stats/',
        VerificationViewSet.as_view({'get': 'provider_stats'}),
        name='verification-provider-stats'),
    
    # Telecom endpoints
    path('telecom/providers/country/<str:country_code>/', telecom_providers, name='telecom_providers_country'),
    path('telecom/packages/country/<str:country_code>/', telecom_packages, name='telecom_packages_country'),
    path('telecom/airtime/', purchase_airtime, name='purchase_airtime'),
    path('telecom/data-bundle/', purchase_data_bundle, name='purchase_data_bundle'),
    
    # Wallet deposit endpoints
    path('wallet/deposit/mobile-money/', deposit_mobile_money, name='deposit_mobile_money'),
    path('wallet/deposit/bank-transfer/', deposit_bank_transfer, name='deposit_bank_transfer'),
    path('wallet/deposit/card/', deposit_card, name='deposit_card'),
    
    # Wallet withdraw endpoints
    path('wallet/withdraw/mobile-money/', withdraw_mobile_money, name='withdraw_mobile_money'),
    path('wallet/withdraw/bank-transfer/', withdraw_bank_transfer, name='withdraw_bank_transfer'),
    path('wallet/withdraw/limits/', get_withdrawal_limits, name='withdrawal_limits'),
    path('wallet/withdraw/banks/', get_supported_banks, name='supported_banks'),
    
    # SikaRemit wallet-to-wallet transfer endpoints
    path('wallet/transfer/sikaremit/', transfer_to_sikaremit_wallet, name='transfer_to_sikaremit'),
    path('wallet/lookup-user/', lookup_sikaremit_user, name='lookup_sikaremit_user'),
    
    path('process/', process_payment, name='process_payment'),
    path('webhooks/bank-transfer/', webhooks.bank_transfer_webhook, name='bank_transfer_webhook'),
    path('webhooks/mobile-money/', webhooks.mobile_money_webhook, name='mobile_money_webhook'),
    path('verify-mobile/', verify_mobile_payment, name='verify_mobile_payment'),
    path('reports/', reporting.custom_report_view, name='payment-reports'),
    path('ussd/callback/', USSDCallbackView.as_view(), name='ussd_callback'),

    # USSD endpoints
    path('ussd/', include('payments.urls.ussd')),

    # Cross-border remittance endpoints
    path('cross-border/initiate/', 
        CrossBorderRemittanceViewSet.as_view({'post': 'initiate_transfer'}), 
        name='initiate-cross-border-transfer'),

    # Payment methods API endpoint
    path('available-methods/', get_available_payment_methods, name='available-payment-methods'),
    
    # Bills endpoints
    path('bills/pending/', BillViewSet.as_view({'get': 'pending'}), name='bills-pending'),
    path('bills/<int:pk>/late-fee/', BillViewSet.as_view({'post': 'late_fee'}), name='bill-late-fee'),
    path('bills/<int:pk>/pay/', BillViewSet.as_view({'post': 'pay'}), name='bill-pay'),
    
    # QR endpoints
    path('qr/validate/', validate_qr_payment, name='qr-validate'),
    path('qr/process/', process_qr_payment, name='qr-process'),
    path('qr/generate/', generate_qr_code, name='qr-generate'),

    # Additional payment endpoints
    path('remittance/', send_remittance_view, name='remittance'),
    path('initiate/', initiate_payment_view, name='initiate'),
    path('checkout/', process_checkout_view, name='checkout'),
    path('outbound-remittance/', send_outbound_remittance_view, name='outbound-remittance'),
    path('global-remittance/', send_global_remittance_view, name='global-remittance'),
    path('analytics/methods/', PaymentMethodViewSet.as_view({'get': 'analytics'}), name='payment-method-analytics'),
    path('analytics/realtime_metrics/', AnalyticsViewSet.as_view({'get': 'realtime_metrics'}), name='analytics-realtime-metrics'),
    path('analytics/dashboard_snapshot/', AnalyticsViewSet.as_view({'get': 'dashboard_overview'}), name='analytics-dashboard-snapshot'),
    path('analytics/overview/', AnalyticsViewSet.as_view({'get': 'dashboard_overview'}), name='analytics-overview'),
    path('alerts/', AnalyticsViewSet.as_view({'get': 'risk_analytics'}), name='payment-alerts'),
    path('verify/', TransactionViewSet.as_view({'post': 'verify_payment'}), name='verify-payment'),
    path('refund/', TransactionViewSet.as_view({'post': 'request_refund'}), name='request-refund'),
    path('data-plans/', telecom_packages, name='data-plans'),
    path('transactions/recent/', TransactionViewSet.as_view({'get': 'recent'}), name='recent-transactions'),

    # POS (Point of Sale) endpoints
    path('pos/devices/', POSDeviceViewSet.as_view({'get': 'list', 'post': 'create'}), name='pos-devices-list'),
    path('pos/devices/<int:pk>/', POSDeviceViewSet.as_view({'get': 'retrieve', 'put': 'update', 'patch': 'partial_update', 'delete': 'destroy'}), name='pos-devices-detail'),
    path('pos/devices/<int:pk>/activate/', POSDeviceViewSet.as_view({'post': 'activate'}), name='pos-device-activate'),
    path('pos/devices/<int:pk>/deactivate/', POSDeviceViewSet.as_view({'post': 'deactivate'}), name='pos-device-deactivate'),
    path('pos/devices/<int:pk>/location/', POSDeviceViewSet.as_view({'post': 'update_location'}), name='pos-device-update-location'),
    path('pos/devices/stats/', POSDeviceViewSet.as_view({'get': 'stats'}), name='pos-devices-stats'),

    path('pos/transactions/', POSTransactionViewSet.as_view({'get': 'list', 'post': 'create'}), name='pos-transactions-list'),
    path('pos/transactions/<int:pk>/', POSTransactionViewSet.as_view({'get': 'retrieve'}), name='pos-transactions-detail'),
    path('pos/transactions/summary/', POSTransactionViewSet.as_view({'get': 'summary'}), name='pos-transactions-summary'),

    path('pos/register-device/', register_pos_device, name='pos-register-device'),
    path('pos/process-transaction/', process_pos_transaction, name='pos-process-transaction'),
    path('pos/generate-receipt/', generate_pos_receipt, name='pos-generate-receipt'),
    path('pos/dashboard/', get_pos_dashboard_data, name='pos-dashboard'),

    # Merchant Dashboard endpoints
    path('merchant/dashboard/stats/', merchant_dashboard_stats, name='merchant-dashboard-stats'),
    path('merchant/dashboard/transactions/', merchant_recent_transactions, name='merchant-recent-transactions'),
    path('merchant/dashboard/analytics/', merchant_analytics, name='merchant-analytics'),
]
