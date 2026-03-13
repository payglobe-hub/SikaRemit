from django.urls import path, include
from rest_framework.routers import DefaultRouter
import importlib.util
import os

# Load views module directly
_views_spec = importlib.util.spec_from_file_location(
    "views",
    os.path.join(os.path.dirname(__file__), "views.py")
)
views = importlib.util.module_from_spec(_views_spec)
_views_spec.loader.exec_module(views)

# Load kyc_views module directly  
_kyc_spec = importlib.util.spec_from_file_location(
    "kyc_views",
    os.path.join(os.path.dirname(__file__), "views", "kyc_views.py")
)
kyc_views = importlib.util.module_from_spec(_kyc_spec)
_kyc_spec.loader.exec_module(kyc_views)

KYCVerificationView = kyc_views.KYCVerificationView
check_transaction_eligibility = kyc_views.check_transaction_eligibility
get_kyc_documents = kyc_views.get_kyc_documents
resubmit_kyc = kyc_views.resubmit_kyc
AdminKYCInboxView = views.AdminKYCInboxView
AdminKYCInboxStatsView = views.AdminKYCInboxStatsView

router = DefaultRouter()
router.register(r'merchants', views.MerchantViewSet, basename='merchants')
router.register(r'customers', views.CustomerViewSet, basename='customers')
router.register(r'kyc-documents', views.KYCDocumentViewSet, basename='kyc-documents')
router.register(r'kyc', views.KYCViewSet, basename='kyc')
router.register(r'merchant-customers', views.MerchantCustomerViewSet, basename='merchant-customers')
router.register(r'merchant-kyc-submissions', views.MerchantKYCSubmissionViewSet, basename='merchant-kyc-submissions')
# NOTE: Register the empty prefix last, otherwise its detail route (/<pk>/)
# will greedily match and shadow other prefixed routes like /merchant-kyc-submissions/.
router.register(r'', views.UserViewSet, basename='users')

urlpatterns = [
    path('me/', views.UserViewSet.as_view({'get': 'me'}), name='user-me'),
    path('verify-email/<uuid:token>/', views.verify_email, name='verify-email'),
    path('customers/<int:pk>/verify-biometrics/', views.CustomerViewSet.as_view({'post': 'verify_biometrics'}), name='verify-biometrics'),
    path('customers/<int:pk>/check-liveness/', views.CustomerViewSet.as_view({'post': 'check_liveness'}), name='check-liveness'),
    path('customers/me/', views.CustomerViewSet.as_view({'get': 'me'}), name='customer-me'),

    # Test endpoint
    path('merchant-customers/test-stats/', views.test_merchant_customers_stats, name='test-merchant-customers-stats'),

    # Unified admin KYC inbox (merchant-customer + direct customer)
    path('admin-kyc-inbox/', AdminKYCInboxView.as_view(), name='admin-kyc-inbox'),
    path('admin-kyc-inbox/stats/', AdminKYCInboxStatsView.as_view(), name='admin-kyc-inbox-stats'),

    # KYC Verification URLs for lazy verification flow
    path('kyc/verification/', KYCVerificationView.as_view(), name='kyc-verification'),
    path('kyc/eligibility/', check_transaction_eligibility, name='kyc-eligibility'),
    path('kyc/documents/', get_kyc_documents, name='kyc-documents'),
    path('kyc/resubmit/', resubmit_kyc, name='kyc-resubmit'),

    # Admin hierarchy URLs
    path('', include('users.urls_admin')),
] + router.urls
