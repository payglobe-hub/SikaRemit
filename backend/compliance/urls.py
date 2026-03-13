from django.urls import path
from rest_framework.routers import DefaultRouter
from .views import RegulatorySubmissionViewSet, compliance_stats, kyc_reviews, export_compliance_report

router = DefaultRouter()
router.register(r'regulatory-submissions', RegulatorySubmissionViewSet, basename='regulatory-submissions')

urlpatterns = [
    # Compliance stats endpoint
    path('stats/', compliance_stats, name='compliance-stats'),
    
    # KYC reviews endpoint
    path('kyc-reviews/', kyc_reviews, name='kyc-reviews'),
    
    # Export compliance report endpoint
    path('export/', export_compliance_report, name='compliance-export'),
    
    # Add any existing paths here
] + router.urls
