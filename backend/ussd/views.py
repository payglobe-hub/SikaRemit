from django.shortcuts import render
from rest_framework import viewsets, status
from rest_framework.decorators import action, api_view, permission_classes
from rest_framework.response import Response
from rest_framework.permissions import IsAuthenticated
from rest_framework.views import APIView
from django.db.models import Count, Avg, Q, Sum
from django.utils import timezone
from datetime import timedelta
from .models import USSDSession, USSDTransaction, USSDService
from .serializers import (
    USSDSessionSerializer,
    USSDTransactionSerializer,
    USSDStatsSerializer,
    USSDServiceSerializer,
    USSDSimulateSerializer,
    USSDMenuSerializer,
    USSDMenuCreateSerializer
)
from payments.models.ussd import USSDMenu

class USSDSessionsView(APIView):
    """USSD sessions API view"""
    permission_classes = [IsAuthenticated]

    def get(self, request):
        """Get USSD sessions with optional filtering"""
        # Only admin users
        if not request.user.is_staff:
            return Response({'error': 'Admin access required'}, status=403)

        queryset = USSDSession.objects.all()

        # Apply filters
        status_filter = request.query_params.get('status')
        phone_filter = request.query_params.get('phone_number')
        service_filter = request.query_params.get('service_code')

        if status_filter:
            queryset = queryset.filter(status=status_filter)
        if phone_filter:
            queryset = queryset.filter(phone_number__icontains=phone_filter)
        if service_filter:
            queryset = queryset.filter(service_code=service_filter)

        # Pagination (simple implementation)
        page = int(request.query_params.get('page', 1))
        limit = int(request.query_params.get('limit', 50))
        offset = (page - 1) * limit

        total = queryset.count()
        sessions = queryset[offset:offset + limit]

        serializer = USSDSessionSerializer(sessions, many=True)

        return Response({
            'results': serializer.data,
            'total': total,
            'page': page,
            'limit': limit,
            'pages': (total + limit - 1) // limit
        })

class USSDTransactionsView(APIView):
    """USSD transactions API view"""
    permission_classes = [IsAuthenticated]

    def get(self, request):
        """Get USSD transactions with optional filtering"""
        # Only admin users
        if not request.user.is_staff:
            return Response({'error': 'Admin access required'}, status=403)

        queryset = USSDTransaction.objects.select_related('session').all()

        # Apply filters
        status_filter = request.query_params.get('status')
        phone_filter = request.query_params.get('phone_number')
        service_filter = request.query_params.get('service_code')

        if status_filter:
            queryset = queryset.filter(status=status_filter)
        if phone_filter:
            queryset = queryset.filter(phone_number__icontains=phone_filter)
        if service_filter:
            queryset = queryset.filter(service_code=service_filter)

        # Pagination
        page = int(request.query_params.get('page', 1))
        limit = int(request.query_params.get('limit', 50))
        offset = (page - 1) * limit

        total = queryset.count()
        transactions = queryset[offset:offset + limit]

        serializer = USSDTransactionSerializer(transactions, many=True)

        return Response({
            'results': serializer.data,
            'total': total,
            'page': page,
            'limit': limit,
            'pages': (total + limit - 1) // limit
        })

class USSDStatsView(APIView):
    """USSD statistics API view"""
    permission_classes = [IsAuthenticated]

    def get(self, request):
        """Get USSD statistics"""
        if not request.user.is_staff:
            return Response({'error': 'Admin access required'}, status=403)

        # Calculate stats
        now = timezone.now()
        last_24h = now - timedelta(hours=24)
        last_7d = now - timedelta(days=7)
        last_30d = now - timedelta(days=30)

        # Session stats
        total_sessions = USSDSession.objects.count()
        active_sessions = USSDSession.objects.filter(status='active').count()
        completed_sessions = USSDSession.objects.filter(status='completed').count()
        timeout_sessions = USSDSession.objects.filter(status='timeout').count()

        # Transaction stats
        completed_transactions = USSDTransaction.objects.filter(status='completed').count()
        total_amount = USSDTransaction.objects.filter(
            status='completed',
            amount__isnull=False
        ).aggregate(total=Sum('amount'))['total'] or 0

        # Average duration - calculate manually since duration_seconds is a property
        completed_sessions_with_end = USSDSession.objects.filter(
            status='completed',
            ended_at__isnull=False
        )
        total_duration = 0
        count = 0
        for session in completed_sessions_with_end:
            total_duration += session.duration_seconds
            count += 1
        avg_duration = total_duration / count if count > 0 else 0

        # Service breakdown
        service_stats = USSDSession.objects.values('service_code').annotate(
            count=Count('id')
        ).order_by('-count')[:10]

        # Popular menus (from session data)
        popular_menus = []
        # This would require more complex aggregation on the menu_history JSON field
        # For now, return empty array

        # Success rate
        total_transactions = USSDTransaction.objects.count()
        success_rate = (completed_transactions / total_transactions * 100) if total_transactions > 0 else 0

        stats_data = {
            'total_sessions': total_sessions,
            'active_sessions': active_sessions,
            'completed_sessions': completed_sessions,
            'timeout_sessions': timeout_sessions,
            'completed_transactions': completed_transactions,
            'total_amount': float(total_amount),
            'success_rate': round(success_rate, 2),
            'average_duration': int(avg_duration),
            'by_service': list(service_stats),
            'popular_menus': popular_menus
        }

        serializer = USSDStatsSerializer(data=stats_data)
        if serializer.is_valid():
            return Response(serializer.validated_data)
        return Response(serializer.errors, status=400)

class USSDSimulateView(APIView):
    """USSD simulation API view - Uses database menus for production-ready simulation"""
    permission_classes = [IsAuthenticated]

    # Session storage for simulation (in production, use Redis/database)
    _simulation_sessions = {}

    def post(self, request):
        """Simulate USSD interaction using database menus"""
        if not request.user.is_staff:
            return Response({'error': 'Admin access required'}, status=403)

        serializer = USSDSimulateSerializer(data=request.data)
        if not serializer.is_valid():
            return Response(serializer.errors, status=400)

        phone_number = serializer.validated_data['phone_number']
        service_code = serializer.validated_data['service_code']
        user_input = serializer.validated_data.get('input', '')

        # Get or create simulation session
        session_key = f"{phone_number}_{service_code}"
        session = self._get_or_create_session(session_key)

        # Process the input and get response
        response_text, session_ended = self._process_simulation(session, user_input)

        # Update or clear session
        if session_ended:
            self._clear_session(session_key)
        else:
            self._simulation_sessions[session_key] = session

        return Response({
            'phone_number': phone_number,
            'service_code': service_code,
            'input': user_input,
            'response': response_text,
            'session_active': not session_ended,
            'current_menu': session.get('current_menu', 'main')
        })

    def _get_or_create_session(self, session_key):
        """Get existing session or create new one"""
        if session_key in self._simulation_sessions:
            return self._simulation_sessions[session_key]
        return {
            'current_menu': 'main',
            'menu_history': [],
            'data': {}
        }

    def _clear_session(self, session_key):
        """Clear simulation session"""
        if session_key in self._simulation_sessions:
            del self._simulation_sessions[session_key]

    def _process_simulation(self, session, user_input):
        """Process simulation using database menus"""
        current_menu_type = session['current_menu']
        session_ended = False

        # Get menu from database
        menu = USSDMenu.objects.filter(
            menu_type=current_menu_type,
            is_active=True,
            is_default=True
        ).first()

        # Fallback: try to get any active menu of this type
        if not menu:
            menu = USSDMenu.objects.filter(
                menu_type=current_menu_type,
                is_active=True
            ).first()

        # If no menu found in database, return error
        if not menu:
            return f"Menu '{current_menu_type}' not configured. Please add menus in Menu Config.", True

        # If no input, show current menu
        if not user_input:
            return self._render_menu(menu), False

        # Process user input
        selected_option = None
        for option in menu.options:
            if str(option.get('input')) == str(user_input):
                selected_option = option
                break

        if not selected_option:
            # Invalid input - show menu again with error
            return f"Invalid option '{user_input}'. Please try again.\n\n{self._render_menu(menu)}", False

        # Handle the action
        action = selected_option.get('action', '')

        # Special actions
        if action == 'exit' or user_input == '0':
            session_ended = True
            return "Thank you for using SikaRemit. Goodbye!", True

        if action == 'back':
            # Go back to previous menu
            if session['menu_history']:
                session['current_menu'] = session['menu_history'].pop()
            else:
                session['current_menu'] = 'main'
            return self._process_simulation(session, '')[0], False

        # Navigate to next menu based on action
        if action:
            # Save current menu to history
            session['menu_history'].append(current_menu_type)
            session['current_menu'] = action

            # Try to load the next menu
            next_menu = USSDMenu.objects.filter(
                menu_type=action,
                is_active=True
            ).first()

            if next_menu:
                return self._render_menu(next_menu), False
            else:
                # Action menu not found - show placeholder response
                return f"[{selected_option.get('text')}]\n\nThis feature is being processed...\n\n0. Back to Main Menu", False

        # Default: show selected option text
        return f"You selected: {selected_option.get('text')}\n\n0. Back", False

    def _render_menu(self, menu):
        """Render menu content with options"""
        lines = [menu.content]
        
        if menu.options:
            lines.append("")  # Empty line before options
            for option in menu.options:
                lines.append(f"{option.get('input')}. {option.get('text')}")

        return "\n".join(lines)

class USSDSimulateResetView(APIView):
    """Reset USSD simulation session"""
    permission_classes = [IsAuthenticated]

    def post(self, request):
        """Reset simulation session for a phone number"""
        if not request.user.is_staff:
            return Response({'error': 'Admin access required'}, status=403)

        phone_number = request.data.get('phone_number', '')
        service_code = request.data.get('service_code', '*123#')

        session_key = f"{phone_number}_{service_code}"

        # Clear the session from USSDSimulateView's storage
        if session_key in USSDSimulateView._simulation_sessions:
            del USSDSimulateView._simulation_sessions[session_key]

        return Response({
            'success': True,
            'message': 'Simulation session reset successfully'
        })

# Legacy ViewSet for backward compatibility (keeping for now)
class USSDAdminViewSet(viewsets.ViewSet):
    """Admin USSD management endpoints"""
    permission_classes = [IsAuthenticated]

    @action(detail=False, methods=['get'])
    def sessions(self, request):
        """Get USSD sessions with optional filtering"""
        view = USSDSessionsView()
        return view.get(request)

    @action(detail=False, methods=['get'])
    def transactions(self, request):
        """Get USSD transactions with optional filtering"""
        view = USSDTransactionsView()
        return view.get(request)

    @action(detail=False, methods=['get'])
    def stats(self, request):
        """Get USSD statistics"""
        view = USSDStatsView()
        return view.get(request)

    @action(detail=False, methods=['post'])
    def simulate(self, request):
        """Simulate USSD interaction"""
        view = USSDSimulateView()
        return view.post(request)

class USSDMenuListView(APIView):
    """USSD Menu list and create API view"""
    permission_classes = [IsAuthenticated]

    def get(self, request):
        """Get all USSD menus with optional filtering"""
        if not request.user.is_staff:
            return Response({'error': 'Admin access required'}, status=403)

        queryset = USSDMenu.objects.all()

        # Apply filters
        menu_type = request.query_params.get('menu_type')
        language = request.query_params.get('language')
        is_active = request.query_params.get('is_active')

        if menu_type:
            queryset = queryset.filter(menu_type=menu_type)
        if language:
            queryset = queryset.filter(language=language)
        if is_active is not None:
            queryset = queryset.filter(is_active=is_active.lower() == 'true')

        # Pagination
        page = int(request.query_params.get('page', 1))
        limit = int(request.query_params.get('limit', 50))
        offset = (page - 1) * limit

        total = queryset.count()
        menus = queryset.order_by('menu_type', 'language', 'menu_id')[offset:offset + limit]

        serializer = USSDMenuSerializer(menus, many=True)

        return Response({
            'results': serializer.data,
            'total': total,
            'page': page,
            'limit': limit,
            'pages': (total + limit - 1) // limit
        })

    def post(self, request):
        """Create a new USSD menu"""
        if not request.user.is_staff:
            return Response({'error': 'Admin access required'}, status=403)

        serializer = USSDMenuCreateSerializer(data=request.data)
        if serializer.is_valid():
            menu = serializer.save()
            return Response(USSDMenuSerializer(menu).data, status=status.HTTP_201_CREATED)
        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)

class USSDMenuDetailView(APIView):
    """USSD Menu detail, update, delete API view"""
    permission_classes = [IsAuthenticated]

    def get_object(self, pk):
        """Get menu by ID"""
        try:
            return USSDMenu.objects.get(pk=pk)
        except USSDMenu.DoesNotExist:
            return None

    def get(self, request, pk):
        """Get a single USSD menu"""
        if not request.user.is_staff:
            return Response({'error': 'Admin access required'}, status=403)

        menu = self.get_object(pk)
        if not menu:
            return Response({'error': 'Menu not found'}, status=status.HTTP_404_NOT_FOUND)

        serializer = USSDMenuSerializer(menu)
        return Response(serializer.data)

    def put(self, request, pk):
        """Update a USSD menu"""
        if not request.user.is_staff:
            return Response({'error': 'Admin access required'}, status=403)

        menu = self.get_object(pk)
        if not menu:
            return Response({'error': 'Menu not found'}, status=status.HTTP_404_NOT_FOUND)

        serializer = USSDMenuCreateSerializer(menu, data=request.data, partial=True)
        if serializer.is_valid():
            menu = serializer.save()
            return Response(USSDMenuSerializer(menu).data)
        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)

    def patch(self, request, pk):
        """Partial update a USSD menu"""
        return self.put(request, pk)

    def delete(self, request, pk):
        """Delete a USSD menu"""
        if not request.user.is_staff:
            return Response({'error': 'Admin access required'}, status=403)

        menu = self.get_object(pk)
        if not menu:
            return Response({'error': 'Menu not found'}, status=status.HTTP_404_NOT_FOUND)

        menu.delete()
        return Response(status=status.HTTP_204_NO_CONTENT)

class USSDMenuTypesView(APIView):
    """Get available USSD menu types"""
    permission_classes = [IsAuthenticated]

    def get(self, request):
        """Get list of available menu types"""
        if not request.user.is_staff:
            return Response({'error': 'Admin access required'}, status=403)

        menu_types = [
            {'value': choice[0], 'label': choice[1]}
            for choice in USSDMenu.MENU_TYPES
        ]
        return Response(menu_types)
