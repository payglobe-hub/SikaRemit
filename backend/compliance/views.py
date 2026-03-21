from rest_framework import viewsets, status
from rest_framework.decorators import api_view, permission_classes
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response
from django.db.models import Count, Q
from django.utils import timezone
from datetime import timedelta
from django.http import HttpResponse
import csv
import io
from .models import RegulatorySubmission, SuspiciousActivityReport, BOGMonthlyReport
from users.models import User, KYCDocument
from core.response import APIResponse
from shared.constants import USER_TYPE_MERCHANT, USER_TYPE_CUSTOMER
from users.permissions import IsAdminUser

class RegulatorySubmissionViewSet(viewsets.ModelViewSet):
    queryset = RegulatorySubmission.objects.all()
    serializer_class = None  # Will need to create serializer
    permission_classes = [IsAdminUser]  # Only admins can access compliance
    
    def get_queryset(self):
        queryset = super().get_queryset()
        
        # Filter by user if not admin
        if not self.request.user.is_staff:
            queryset = queryset.filter(user=self.request.user)
            
        # Filter by success status if specified
        success = self.request.query_params.get('success')
        if success:
            queryset = queryset.filter(success=success.lower() == 'true')
            
        return queryset.order_by('-submitted_at')

@api_view(['GET'])
@permission_classes([IsAdminUser])  # Only admins can access compliance stats
def compliance_stats(request):
    """Get compliance statistics for dashboard"""
    try:
        # KYC Statistics
        total_kyc_reviews = KYCDocument.objects.count()
        pending_reviews = KYCDocument.objects.filter(status='pending').count()
        approved_reviews = KYCDocument.objects.filter(status='approved').count()
        rejected_reviews = KYCDocument.objects.filter(status='rejected').count()
        
        # Risk assessment
        high_risk_alerts = SuspiciousActivityReport.objects.filter(
            status='pending'
        ).count()
        
        # Compliance score calculation (mock logic)
        compliance_score = 85  # This would be calculated based on various factors
        
        # Monthly reviews count
        thirty_days_ago = timezone.now() - timedelta(days=30)
        monthly_reviews = KYCDocument.objects.filter(
            created_at__gte=thirty_days_ago
        ).count()
        
        stats = {
            'total_kyc_reviews': total_kyc_reviews,
            'pending_reviews': pending_reviews,
            'approved_reviews': approved_reviews,
            'rejected_reviews': rejected_reviews,
            'high_risk_alerts': high_risk_alerts,
            'compliance_score': compliance_score,
            'monthly_reviews': monthly_reviews,
        }
        
        return APIResponse(stats)
    
    except Exception as e:
        return APIResponse(
            {'error': f'Failed to fetch compliance stats: {str(e)}'},
            status=status.HTTP_500_INTERNAL_SERVER_ERROR
        )

@api_view(['GET'])
@permission_classes([IsAdminUser])  # Only admins can access KYC reviews
def kyc_reviews(request):
    """Get KYC reviews list"""
    try:
        # Get KYC documents with user information
        kyc_documents = KYCDocument.objects.select_related('user').all().order_by('-created_at')
        
        reviews = []
        for doc in kyc_documents:
            # Determine risk level based on user type and other factors
            risk_level = 'low'
            if doc.user.user_type == USER_TYPE_MERCHANT:  # Merchant
                risk_level = 'medium'
            elif doc.user.user_type == USER_TYPE_CUSTOMER:  # Customer
                risk_level = 'low'
            
            # Get document status
            status = doc.status
            
            review = {
                'id': str(doc.id),
                'user_email': doc.user.email,
                'user_type': doc.user.get_role_display() or 'Unknown',
                'status': status,
                'risk_level': risk_level,
                'submitted_at': doc.created_at.isoformat() if doc.created_at else None,
                'reviewed_at': doc.reviewed_at.isoformat() if doc.reviewed_at else None,
                'reviewer': doc.reviewed_by.email if doc.reviewed_by else None,
                'documents': [
                    {
                        'type': doc.document_type,
                        'status': status,
                        'url': doc.front_image.url if doc.front_image else None,
                        'back_url': doc.back_image.url if doc.back_image else None,
                        'rejection_reason': doc.rejection_reason if status == 'rejected' else None,
                        'expiry_date': doc.expiry_date.isoformat() if doc.expiry_date else None,
                        'risk_score': doc.risk_score
                    }
                ]
            }
            reviews.append(review)
        
        return APIResponse(reviews)
    
    except Exception as e:
        return APIResponse(
            {'error': f'Failed to fetch KYC reviews: {str(e)}'},
            status=status.HTTP_500_INTERNAL_SERVER_ERROR
        )

@api_view(['GET'])
@permission_classes([IsAdminUser])  # Only admins can export compliance reports
def export_compliance_report(request):
    """Export compliance report in various formats"""
    try:
        export_format = request.query_params.get('format', 'csv')
        
        # Get compliance data
        total_kyc_reviews = KYCDocument.objects.count()
        pending_reviews = KYCDocument.objects.filter(status='pending').count()
        approved_reviews = KYCDocument.objects.filter(status='approved').count()
        rejected_reviews = KYCDocument.objects.filter(status='rejected').count()
        high_risk_alerts = SuspiciousActivityReport.objects.filter(status='pending').count()
        compliance_score = 85  # This would be calculated based on various factors
        thirty_days_ago = timezone.now() - timedelta(days=30)
        monthly_reviews = KYCDocument.objects.filter(created_at__gte=thirty_days_ago).count()
        
        # Get KYC documents with user information
        kyc_documents = KYCDocument.objects.select_related('user').all().order_by('-created_at')
        
        if export_format == 'csv':
            # Create CSV response
            response = HttpResponse(content_type='text/csv')
            response['Content-Disposition'] = f'attachment; filename="compliance-report-{timezone.now().date()}.csv"'
            
            writer = csv.writer(response)
            
            # Write header and statistics
            writer.writerow(['Compliance Report'])
            writer.writerow([f'Generated: {timezone.now().strftime("%Y-%m-%d %H:%M:%S")}'])
            writer.writerow([])
            writer.writerow(['Statistics'])
            writer.writerow(['Total KYC Reviews', total_kyc_reviews])
            writer.writerow(['Pending Reviews', pending_reviews])
            writer.writerow(['Approved Reviews', approved_reviews])
            writer.writerow(['Rejected Reviews', rejected_reviews])
            writer.writerow(['High Risk Alerts', high_risk_alerts])
            writer.writerow(['Compliance Score', f'{compliance_score}%'])
            writer.writerow(['Monthly Reviews', monthly_reviews])
            writer.writerow([])
            writer.writerow(['KYC Reviews'])
            writer.writerow(['ID', 'Email', 'User Type', 'Status', 'Risk Level', 'Submitted At', 'Reviewed At', 'Reviewer', 'Document Type'])
            
            # Write KYC reviews
            for doc in kyc_documents:
                risk_level = 'medium' if doc.user.user_type == USER_TYPE_MERCHANT else 'low'
                writer.writerow([
                    doc.id,
                    doc.user.email,
                    doc.user.get_role_display() or 'Unknown',
                    doc.status,
                    risk_level,
                    doc.created_at.strftime('%Y-%m-%d %H:%M:%S') if doc.created_at else '',
                    doc.reviewed_at.strftime('%Y-%m-%d %H:%M:%S') if doc.reviewed_at else '',
                    doc.reviewed_by.email if doc.reviewed_by else '',
                    doc.document_type
                ])
            
            return response
        
        elif export_format == 'excel':
            # For now, return CSV as Excel fallback
            # In production, you'd use a library like openpyxl
            response = HttpResponse(content_type='application/vnd.openxmlformats-officedocument.spreadsheetml.sheet')
            response['Content-Disposition'] = f'attachment; filename="compliance-report-{timezone.now().date()}.xlsx"'
            
            # Create CSV content that Excel can open
            writer = csv.writer(response)
            writer.writerow(['Compliance Report - Excel Format'])
            writer.writerow([f'Generated: {timezone.now().strftime("%Y-%m-%d %H:%M:%S")}'])
            writer.writerow([])
            writer.writerow(['Statistics'])
            writer.writerow(['Total KYC Reviews', total_kyc_reviews])
            writer.writerow(['Pending Reviews', pending_reviews])
            writer.writerow(['Approved Reviews', approved_reviews])
            writer.writerow(['Rejected Reviews', rejected_reviews])
            writer.writerow(['High Risk Alerts', high_risk_alerts])
            writer.writerow(['Compliance Score', f'{compliance_score}%'])
            writer.writerow(['Monthly Reviews', monthly_reviews])
            
            return response
        
        elif export_format == 'pdf':
            # For now, return a simple text response as PDF fallback
            # In production, you'd use a library like ReportLab
            response = HttpResponse(content_type='text/plain')
            response['Content-Disposition'] = f'attachment; filename="compliance-report-{timezone.now().date()}.txt"'
            
            content = f"""
Compliance Report
Generated: {timezone.now().strftime('%Y-%m-%d %H:%M:%S')}

STATISTICS
-----------
Total KYC Reviews: {total_kyc_reviews}
Pending Reviews: {pending_reviews}
Approved Reviews: {approved_reviews}
Rejected Reviews: {rejected_reviews}
High Risk Alerts: {high_risk_alerts}
Compliance Score: {compliance_score}%
Monthly Reviews: {monthly_reviews}

KYC REVIEWS
-----------
"""
            
            for doc in kyc_documents[:50]:  # Limit to first 50 for text format
                risk_level = 'medium' if doc.user.user_type == USER_TYPE_MERCHANT else 'low'
                content += f"""
ID: {doc.id}
Email: {doc.user.email}
User Type: {doc.user.get_role_display() or 'Unknown'}
Status: {doc.status}
Risk Level: {risk_level}
Submitted At: {doc.created_at.strftime('%Y-%m-%d %H:%M:%S') if doc.created_at else 'N/A'}
Reviewed At: {doc.reviewed_at.strftime('%Y-%m-%d %H:%M:%S') if doc.reviewed_at else 'N/A'}
Reviewer: {doc.reviewed_by.email if doc.reviewed_by else 'N/A'}
Document Type: {doc.document_type}
---
"""
            
            response.write(content)
            return response
        
        else:
            return APIResponse(
                {'error': f'Unsupported export format: {export_format}'},
                status=status.HTTP_400_BAD_REQUEST
            )
    
    except Exception as e:
        return APIResponse(
            {'error': f'Failed to export compliance report: {str(e)}'},
            status=status.HTTP_500_INTERNAL_SERVER_ERROR
        )
