"""
E-commerce URLs

Main URL configuration for e-commerce module
"""

from django.urls import path, include
from . import urls_cart, views, views_wallet

urlpatterns = [
    # Cart and Wishlist URLs
    path('', include(urls_cart)),
    
    # Order URLs
    path('orders/', include([
        path('', views.OrderViewSet.as_view({'get': 'list', 'post': 'create'}), name='order-list'),
        path('<uuid:pk>/', views.OrderViewSet.as_view({'get': 'retrieve'}), name='order-detail'),
        path('<uuid:pk>/cancel/', views.OrderViewSet.as_view({'post': 'cancel'}), name='order-cancel'),
        path('create/', views.create_order, name='create-order'),
    ])),
    
    # Payment URLs
    path('payments/', include([
        path('methods/', views.payment_methods, name='payment-methods'),
        path('orders/<uuid:order_id>/process/', views.process_payment, name='process-payment'),
        path('calculate-shipping/', views.calculate_shipping, name='calculate-shipping'),
    ])),
    
    # Wallet Payment URLs
    path('wallet/', include([
        path('balance/', views_wallet.wallet_balance, name='wallet-balance'),
        path('validate/', views_wallet.validate_wallet_payment, name='validate-wallet-payment'),
        path('process/', views_wallet.process_wallet_payment, name='process-wallet-payment'),
        path('transactions/', views_wallet.wallet_transaction_history, name='wallet-transactions'),
    ])),
    
    # Address URLs
    path('addresses/', views.ShippingAddressViewSet.as_view({
        'get': 'list',
        'post': 'create'
    }), name='address-list'),
    path('addresses/<uuid:pk>/', views.ShippingAddressViewSet.as_view({
        'get': 'retrieve',
        'put': 'update',
        'patch': 'partial_update',
        'delete': 'destroy'
    }), name='address-detail'),
    path('addresses/<uuid:pk>/set-default/', views.ShippingAddressViewSet.as_view({
        'post': 'set_default'
    }), name='address-set-default'),
]
