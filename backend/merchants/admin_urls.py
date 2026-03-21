from django.urls import path
from . import admin_views

urlpatterns = [
    path('invitations/', admin_views.MerchantInvitationViewSet.as_view({
        'get': 'list',
        'post': 'create'
    })),
    path('invitations/<int:pk>/', admin_views.MerchantInvitationViewSet.as_view({
        'get': 'retrieve'
    })),
    path('invitations/<int:pk>/resend/', admin_views.MerchantInvitationViewSet.as_view({
        'post': 'resend'
    })),
    path('invitations/<int:pk>/cancel/', admin_views.MerchantInvitationViewSet.as_view({
        'post': 'cancel'
    })),
    path('applications/', admin_views.MerchantApplicationViewSet.as_view({
        'get': 'list'
    })),
    path('applications/<int:pk>/', admin_views.MerchantApplicationViewSet.as_view({
        'get': 'retrieve'
    })),
    path('applications/<int:pk>/approve/', admin_views.MerchantApplicationViewSet.as_view({
        'post': 'approve'
    })),
    path('applications/<int:pk>/reject/', admin_views.MerchantApplicationViewSet.as_view({
        'post': 'reject'
    })),
    path('stats/', admin_views.MerchantInvitationStatsView.as_view({'get': 'list'})),
]
