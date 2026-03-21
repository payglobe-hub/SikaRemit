from django.urls import path, include
from rest_framework.routers import DefaultRouter
from .views import KYCDocumentViewSet, KYCStatusViewSet, BiometricViewSet

router = DefaultRouter()
router.register(r'documents', KYCDocumentViewSet, basename='kyc-documents')
router.register(r'status', KYCStatusViewSet, basename='kyc-status')
router.register(r'biometrics', BiometricViewSet, basename='biometrics')

urlpatterns = [
    path('', include(router.urls)),
]
