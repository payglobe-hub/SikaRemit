from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework import permissions, status
from rest_framework import viewsets
from django.contrib.auth import get_user_model, login
from accounts.models import UserActivity, Payout, Recipient
from .serializers import UserActivitySerializer, UserSerializer, AdminUserSerializer
from accounts.serializers import RecipientSerializer
from rest_framework.decorators import action
from django.contrib import admin
from shared.constants import USER_TYPE_MERCHANT
from accounts.permissions import IsAdminUser
from django.http import HttpResponse
import csv
import json
from openpyxl import Workbook
from django.db.models import Q
from accounts.serializers import AccountsUserSerializer
from accounts.services import log_audit_action

User = get_user_model()

class UserActivityAPIView(APIView):
    permission_classes = [permissions.IsAuthenticated]
    
    def get(self, request, user_id=None):
        user = request.user if not user_id else User.objects.get(pk=user_id)
        activities = UserActivity.objects.filter(user=user).order_by('-created_at')[:100]
        serializer = UserActivitySerializer(activities, many=True)
        return Response(serializer.data)

class UserBulkAPIView(APIView):
    permission_classes = [permissions.IsAuthenticated, IsAdminUser]
    
    @action(detail=False, methods=['post'])
    def bulk_update_status(self, request):
        user_ids = request.data.get('user_ids', [])
        is_active = request.data.get('is_active')
        
        if not user_ids or is_active is None:
            return Response(
                {'error': 'user_ids and is_active are required'},
                status=status.HTTP_400_BAD_REQUEST
            )
            
        updated = User.objects.filter(id__in=user_ids).update(is_active=is_active)
        
        # Log bulk action
        for user_id in user_ids:
            admin.site.log_action(
                'USER_DEACTIVATE' if not is_active else 'USER_ACTIVATE',
                request.user,
                affected_user=User.objects.get(id=user_id),
                metadata={'bulk_action': True}
            )
            
        return Response({'updated': updated})

class VerificationBulkAPIView(APIView):
    permission_classes = [permissions.IsAuthenticated, IsAdminUser]
    
    @action(detail=False, methods=['post'])
    def bulk_approve(self, request):
        verification_ids = request.data.get('verification_ids', [])
        
        if not verification_ids:
            return Response(
                {'error': 'verification_ids are required'},
                status=status.HTTP_400_BAD_REQUEST
            )
            
        for vid in verification_ids:
            approve_verification(vid)
            log_audit_action(
                'VERIFICATION_APPROVE',
                request.user,
                metadata={'bulk_action': True, 'verification_id': vid}
            )
            
        return Response({'approved': len(verification_ids)})
    
    @action(detail=False, methods=['post'])
    def bulk_reject(self, request):
        verification_ids = request.data.get('verification_ids', [])
        reason = request.data.get('reason', 'Bulk rejection')
        
        if not verification_ids:
            return Response(
                {'error': 'verification_ids are required'},
                status=status.HTTP_400_BAD_REQUEST
            )
            
        for vid in verification_ids:
            reject_verification(vid, reason)
            log_audit_action(
                'VERIFICATION_REJECT',
                request.user,
                metadata={'bulk_action': True, 'verification_id': vid, 'reason': reason}
            )
            
        return Response({'rejected': len(verification_ids)})

class ExportAPIView(APIView):
    permission_classes = [permissions.IsAuthenticated, IsAdminUser]
    
    @action(detail=False, methods=['get'])
    def export_users(self, request):
        format = request.query_params.get('format', 'csv').lower()
        status_filter = request.query_params.get('status')
        role_filter = request.query_params.get('role')
        
        users = User.objects.all()
        
        if status_filter:
            users = users.filter(is_active=status_filter.lower() == 'active')
        if role_filter:
            # Map role names to user_type values
            role_map = {'admin': 1, 'merchant': 2, 'customer': 3}
            user_type_val = role_map.get(role_filter.lower())
            if user_type_val:
                users = users.filter(user_type=user_type_val)
        
        if format == 'json':
            response = HttpResponse(content_type='application/json')
            response['Content-Disposition'] = 'attachment; filename="users.json"'
            response.write(json.dumps(list(users.values('id', 'email', 'first_name', 'last_name', 'user_type', 'is_active')), indent=2))
            return response
        elif format == 'excel':
            response = HttpResponse(content_type='application/vnd.openxmlformats-officedocument.spreadsheetml.sheet')
            response['Content-Disposition'] = 'attachment; filename="users.xlsx"'
            workbook = Workbook()
            worksheet = workbook.active
            worksheet.append(['ID', 'Email', 'First Name', 'Last Name', 'User Type', 'Is Active'])
            for user in users:
                worksheet.append([user.id, user.email, user.first_name, user.last_name, user.user_type, user.is_active])
            workbook.save(response)
            return response
        else:  # CSV
            response = HttpResponse(content_type='text/csv')
            response['Content-Disposition'] = 'attachment; filename="users.csv"'
            writer = csv.writer(response)
            writer.writerow(['ID', 'Email', 'First Name', 'Last Name', 'User Type', 'Is Active'])
            for user in users:
                writer.writerow([user.id, user.email, user.first_name, user.last_name, user.user_type, user.is_active])
            return response
    
    @action(detail=False, methods=['get'])
    def export_verifications(self, request):
        response = HttpResponse(content_type='text/csv')
        response['Content-Disposition'] = 'attachment; filename="verifications.csv"'
        
        writer = csv.writer(response)
        writer.writerow(['ID', 'User Email', 'Document Type', 'Status', 'Submitted At'])
        
        for verif in Verification.objects.all():
            writer.writerow([
                verif.id,
                verif.user.email,
                verif.document_type,
                verif.status,
                verif.submitted_at
            ])
        
        log_audit_action(
            'EXPORT_VERIFICATIONS',
            request.user,
            metadata={'format': 'CSV'}
        )
        
        return response

class UserSearchAPIView(APIView):
    permission_classes = [permissions.IsAuthenticated, IsAdminUser]
    
    def get(self, request):
        query = request.query_params.get('q', '')
        role = request.query_params.get('role')
        is_active = request.query_params.get('is_active')
        
        users = User.objects.all()
        
        if query:
            users = users.filter(
                Q(email__icontains=query) |
                Q(first_name__icontains=query) |
                Q(last_name__icontains=query)
            )
            
        if role:
            # Map role names to user_type values
            role_map = {'admin': 1, 'merchant': 2, 'customer': 3}
            user_type_val = role_map.get(role.lower())
            if user_type_val:
                users = users.filter(user_type=user_type_val)
            
        if is_active:
            users = users.filter(is_active=is_active.lower() == 'true')
            
        serializer = UserSerializer(users, many=True)
        return Response(serializer.data)

class ImpersonateAPIView(APIView):
    permission_classes = [permissions.IsAuthenticated, IsAdminUser]
    
    def post(self, request, user_id):
        try:
            user = User.objects.get(pk=user_id)
            if user.is_superuser:
                return Response({'error': 'Cannot impersonate superusers'}, status=status.HTTP_403_FORBIDDEN)
                
            login(request, user)
            log_audit_action(
                action='IMPERSONATE',
                admin=request.user,
                user=user,
                metadata={'ip': request.META.get('REMOTE_ADDR')}
            )
            return Response({'success': True})
        except User.DoesNotExist:
            return Response({'error': 'User not found'}, status=status.HTTP_404_NOT_FOUND)

class StopImpersonationAPIView(APIView):
    permission_classes = [permissions.IsAuthenticated]
    
    def post(self, request):
        if not hasattr(request, 'original_user'):
            return Response({'error': 'Not impersonating'}, status=status.HTTP_400_BAD_REQUEST)
            
        login(request, request.original_user)
        log_audit_action(
            action='STOP_IMPERSONATE',
            admin=request.original_user,
            user=request.user,
            metadata={'ip': request.META.get('REMOTE_ADDR')}
        )
        return Response({'success': True})

class MerchantMetricsAPIView(APIView):
    """
    API endpoint for merchant analytics and metrics
    """
    permission_classes = [permissions.IsAuthenticated]  # Allow authenticated merchants
    
    def get(self, request):
        from django.db.models import Count, Sum
        from datetime import datetime, timedelta
        
        # Default to last 30 days
        days = int(request.query_params.get('days', 30))
        date_from = datetime.now() - timedelta(days=days)
        
        metrics = {
            'total_merchants': User.objects.filter(user_type=USER_TYPE_MERCHANT).count(),
            'active_merchants': User.objects.filter(
                user_type=USER_TYPE_MERCHANT, 
                last_login__gte=date_from
            ).count(),
            'new_merchants': User.objects.filter(
                user_type=USER_TYPE_MERCHANT,
                date_joined__gte=date_from
            ).count(),
            'pending_payouts': Payout.objects.filter(status='pending').count(),
            'completed_payouts': Payout.objects.filter(
                status='completed',
                processed_at__gte=date_from
            ).count()
        }
        
        return Response(metrics)

class MerchantVerificationAPIView(APIView):
    """
    API endpoint for merchant verification
    """
    permission_classes = [permissions.IsAuthenticated, IsAdminUser]
    
    def post(self, request, merchant_id):
        try:
            merchant = User.objects.get(pk=merchant_id, user_type=USER_TYPE_MERCHANT)
            merchant.is_verified = True
            merchant.save()
            
            # Log verification action
            log_audit_action(
                'MERCHANT_VERIFIED',
                request.user,
                user=merchant,
                metadata={'ip': request.META.get('REMOTE_ADDR')}
            )
            
            return Response({'status': 'verified'})
        except User.DoesNotExist:
            return Response(
                {'error': 'Merchant not found'},
                status=status.HTTP_404_NOT_FOUND
            )

class AdminUserSearchView(APIView):
    """
    Search and filter users for admin dashboard
    """
    permission_classes = [permissions.IsAuthenticated, IsAdminUser]

    def get(self, request):
        query = request.GET.get('q', '')
        role = request.GET.get('role', '')
        is_active = request.GET.get('is_active', '')

        users = User.objects.all()

        if query:
            users = users.filter(
                Q(email__icontains=query) |
                Q(first_name__icontains=query) |
                Q(last_name__icontains=query)
            )

        if role:
            # Map string roles to integer user_type values
            role_mapping = {'user': 3, 'merchant': 2, 'admin': 1}
            user_type_value = role_mapping.get(role.lower())
            if user_type_value:
                users = users.filter(user_type=user_type_value)

        if is_active:
            users = users.filter(is_active=is_active.lower() == 'true')

        users = users.order_by('-date_joined')[:100]

        serializer = UserSerializer(users, many=True)
        return Response(serializer.data)

class AdminUserBulkUpdateView(APIView):
    """
    Bulk update user status
    """
    permission_classes = [permissions.IsAuthenticated, IsAdminUser]

    def post(self, request):
        user_ids = request.data.get('user_ids', [])
        is_active = request.data.get('is_active', True)

        if not user_ids:
            return Response(
                {'error': 'No user IDs provided'},
                status=status.HTTP_400_BAD_REQUEST
            )

        updated_count = User.objects.filter(id__in=user_ids).update(is_active=is_active)

        # Log bulk action
        log_audit_action(
            'BULK_USER_UPDATE',
            request.user,
            metadata={
                'user_ids': user_ids,
                'is_active': is_active,
                'count': updated_count
            }
        )

        return Response({'updated': updated_count})

class AdminUserDetailView(APIView):
    """
    Individual user management
    """
    permission_classes = [permissions.IsAuthenticated, IsAdminUser]

    def get(self, request, user_id):
        try:
            user = User.objects.get(id=user_id)
            serializer = UserSerializer(user)
            return Response(serializer.data)
        except User.DoesNotExist:
            return Response(
                {'error': 'User not found'},
                status=status.HTTP_404_NOT_FOUND
            )

    def patch(self, request, user_id):
        try:
            user = User.objects.get(id=user_id)
            is_active = request.data.get('isActive')

            if is_active is not None:
                user.is_active = is_active
                user.save()

                # Log action
                log_audit_action(
                    'USER_STATUS_UPDATE',
                    request.user,
                    user=user,
                    metadata={'is_active': is_active}
                )

            serializer = UserSerializer(user)
            return Response(serializer.data)
        except User.DoesNotExist:
            return Response(
                {'error': 'User not found'},
                status=status.HTTP_404_NOT_FOUND
            )

class AdminVerificationListView(APIView):
    """
    List pending verifications
    """
    permission_classes = [permissions.IsAuthenticated, IsAdminUser]

    def get(self, request):
        from ..api.serializers import UserSerializer
        pending_users = User.objects.filter(
            is_verified=False
        ).order_by('date_joined')

        serializer = UserSerializer(pending_users, many=True)
        return Response(serializer.data)

class AdminVerificationActionView(APIView):
    """
    Approve or reject verifications
    """
    permission_classes = [permissions.IsAuthenticated, IsAdminUser]

    def post(self, request, action, verification_id):
        try:
            user = User.objects.get(id=verification_id)

            if action == 'approve':
                user.is_verified = True
                user.verification_level = 3
                action_type = 'VERIFICATION_APPROVED'
            elif action == 'reject':
                user.is_verified = False
                user.verification_level = 0
                reason = request.data.get('reason', '')
                action_type = 'VERIFICATION_REJECTED'
            else:
                return Response(
                    {'error': 'Invalid action'},
                    status=status.HTTP_400_BAD_REQUEST
                )

            user.save()

            # Log action
            log_audit_action(
                action_type,
                request.user,
                user=user,
                metadata={'reason': reason} if action == 'reject' else {}
            )

            return Response({'status': 'success'})

        except User.DoesNotExist:
            return Response(
                {'error': 'User not found'},
                status=status.HTTP_404_NOT_FOUND
            )

class AdminExportView(APIView):
    """
    Export users data
    """
    permission_classes = [permissions.IsAuthenticated, IsAdminUser]

    def get(self, request):
        format_type = request.GET.get('format', 'csv')
        status_filter = request.GET.get('status')
        role_filter = request.GET.get('role')

        users = User.objects.all()

        if status_filter:
            users = users.filter(is_active=status_filter == 'active')

        if role_filter:
            users = users.filter(user_type=role_filter)

        if format_type == 'csv':
            # Simple CSV export
            import csv
            from django.http import HttpResponse

            response = HttpResponse(content_type='text/csv')
            response['Content-Disposition'] = 'attachment; filename="users.csv"'

            writer = csv.writer(response)
            writer.writerow(['ID', 'Email', 'First Name', 'Last Name', 'Role', 'Active', 'Verified', 'Joined'])

            for user in users:
                writer.writerow([
                    user.id,
                    user.email,
                    user.first_name,
                    user.last_name,
                    user.user_type,
                    user.is_active,
                    user.is_verified,
                    user.date_joined
                ])

            return response

        # Default JSON response
        serializer = UserActivitySerializer(users, many=True)
        return Response(serializer.data)

class AdminUserViewSet(viewsets.ModelViewSet):
    """
    ViewSet for admin user management operations.
    Allows admins to create, read, update, delete, and search users.
    """
    serializer_class = AdminUserSerializer
    permission_classes = [permissions.IsAuthenticated, IsAdminUser]
    queryset = User.objects.all().order_by('-date_joined')
    
    def get_queryset(self):
        queryset = User.objects.all().order_by('-date_joined')
        search = self.request.query_params.get('search', None)
        if search:
            queryset = queryset.filter(
                Q(email__icontains=search) | 
                Q(first_name__icontains=search) | 
                Q(last_name__icontains=search)
            )
        return queryset
    
    def create(self, request, *args, **kwargs):

        # Handle password separately in serializer
        serializer = self.get_serializer(data=request.data)

        try:
            serializer.is_valid(raise_exception=True)
            
        except Exception as e:

            raise
        
        try:
            user = serializer.save()
            
        except Exception as e:
            
            raise
        
        # Log admin action
        log_audit_action(
            'USER_CREATE',
            request.user,
            user=user,  # The admin performing the action
            metadata={
                'affected_user_id': user.id,
                'affected_user_email': user.email,
                'user_type': user.user_type
            }
        )
        
        headers = self.get_success_headers(serializer.data)
        return Response(serializer.data, status=status.HTTP_201_CREATED, headers=headers)
    
    def partial_update(self, request, *args, **kwargs):
        instance = self.get_object()
        serializer = self.get_serializer(instance, data=request.data, partial=True)
        serializer.is_valid(raise_exception=True)
        user = serializer.save()
        
        # Log admin action
        action_type = 'USER_UPDATE'
        if 'is_active' in request.data:
            action_type = 'USER_ACTIVATE' if user.is_active else 'USER_DEACTIVATE'
        
        try:
            log_audit_action(
                action_type,
                request.user,
                user=request.user,  # The admin performing the action
                metadata={
                    'affected_user_id': user.id,
                    'affected_user_email': user.email,
                    'changes': list(request.data.keys()),
                    'new_status': user.is_active if 'is_active' in request.data else None
                }
            )
        except Exception as e:
            # Log the error but don't fail the update
            import traceback
            traceback.print_exc()
        
        return Response(serializer.data)
    
    def destroy(self, request, *args, **kwargs):
        instance = self.get_object()
        
        # Log admin action
        try:
            log_audit_action(
                'USER_DELETE',
                request.user,
                user=request.user,  # The admin performing the action
                metadata={
                    'affected_user_id': instance.id,
                    'affected_user_email': instance.email,
                    'user_type': instance.user_type
                }
            )
        except Exception as e:
            # Log the error but don't fail the deletion
            import traceback
            traceback.print_exc()
        
        try:
            self.perform_destroy(instance)
            return Response(status=status.HTTP_204_NO_CONTENT)
        except Exception as e:
            # Detailed error logging
            import traceback
            error_msg = str(e)
            print(f"Error deleting recipient: {error_msg}")
            
            traceback.print_exc()
            
            # Check for specific database errors
            if 'feeconfiguration' in error_msg.lower():
                return Response(
                    {'error': 'Cannot delete user due to existing fee configurations. Please contact system administrator.'},
                    status=status.HTTP_400_BAD_REQUEST
                )
            elif 'foreign key' in error_msg.lower() or 'constraint' in error_msg.lower():
                return Response(
                    {'error': 'Cannot delete user due to existing relationships. Please contact system administrator.'},
                    status=status.HTTP_400_BAD_REQUEST
                )
            else:
                # Re-raise other errors for debugging
                raise

class RecipientViewSet(viewsets.ReadOnlyModelViewSet):
    serializer_class = RecipientSerializer
    permission_classes = [permissions.IsAuthenticated]

    def get_queryset(self):
        return Recipient.objects.filter(user=self.request.user)
