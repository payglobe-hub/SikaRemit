from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework import status, permissions
from django.db.models import Sum, Count, Q, F, Window
from django.db.models.functions import TruncDate, TruncMonth, TruncWeek
from django.utils import timezone
from datetime import datetime, timedelta
from decimal import Decimal
from users.models import Customer
from payments.models.transaction import Transaction
from payments.models import Payment
import calendar

class CustomerStatementAPIView(APIView):
    """Generate customer account statements"""
    permission_classes = [permissions.IsAuthenticated]

    def post(self, request):
        """Generate new customer statement"""
        # Handle both Django and DRF requests
        user = getattr(request, 'user', None)
        if not user and hasattr(request, '_request'):
            user = getattr(request._request, 'user', None)
        
        if not user:
            return Response({'error': 'Authentication required'}, status=status.HTTP_401_UNAUTHORIZED)

        customer = getattr(user, 'customer_profile', None)
        if not customer:
            return Response({'error': 'Customer profile not found'}, status=status.HTTP_404_NOT_FOUND)

        start_date = request.data.get('start_date')
        end_date = request.data.get('end_date')
        format_type = request.data.get('format', 'pdf')
        include_charts = request.data.get('include_charts', True)

        # Generate statement data
        statement_data = self._generate_statement_data(customer, start_date, end_date)
        
        # Create statement record
        statement = {
            'id': 2,
            'period_name': self._get_period_name(start_date, end_date),
            'start_date': start_date,
            'end_date': end_date,
            'format': format_type,
            'status': 'generating',
            'transaction_count': len(statement_data['transactions']),
            'opening_balance': str(statement_data['opening_balance']),
            'closing_balance': str(statement_data['closing_balance']),
            'created_at': timezone.now().isoformat()
        }

        return Response(statement, status=status.HTTP_201_CREATED)

    def get(self, request, pk=None):
        """Handle both list and download operations"""
        if pk:
            # Handle download for specific statement
            return self._download_statement(request, pk)
        else:
            # Handle list of statements
            return self._list_statements(request)

    def _list_statements(self, request):
        """Get customer statements list"""
        # Handle both Django and DRF requests
        user = getattr(request, 'user', None)
        if not user and hasattr(request, '_request'):
            user = getattr(request._request, 'user', None)
        
        if not user:
            return Response({'error': 'Authentication required'}, status=status.HTTP_401_UNAUTHORIZED)

        customer = getattr(user, 'customer_profile', None)
        if not customer:
            return Response({'error': 'Customer profile not found'}, status=status.HTTP_404_NOT_FOUND)

        # Get statements from database (empty for now - will be populated when users generate statements)
        statements = []

        return Response(statements)

    def _download_statement(self, request, pk):
        """Download a specific statement"""
        # Handle both Django and DRF requests
        user = getattr(request, 'user', None)
        if not user and hasattr(request, '_request'):
            user = getattr(request._request, 'user', None)
        
        if not user:
            return Response({'error': 'Authentication required'}, status=status.HTTP_401_UNAUTHORIZED)

        customer = getattr(user, 'customer_profile', None)
        if not customer:
            return Response({'error': 'Customer profile not found'}, status=status.HTTP_404_NOT_FOUND)

        try:
            from django.http import HttpResponse
            from payments.services.receipt_service import ReceiptService

            pdf_bytes = ReceiptService.generate_statement_pdf(
                customer=customer, statement_id=pk
            )
            if not pdf_bytes:
                return Response(
                    {'error': 'Statement not found or could not be generated'},
                    status=status.HTTP_404_NOT_FOUND
                )

            response = HttpResponse(pdf_bytes, content_type='application/pdf')
            response['Content-Disposition'] = f'attachment; filename="statement_{pk}.pdf"'
            response['Content-Length'] = len(pdf_bytes)
            return response
            
        except Exception as e:
            return Response(
                {'error': f'Failed to download statement: {str(e)}'},
                status=status.HTTP_500_INTERNAL_SERVER_ERROR
            )

    def _generate_statement_data(self, customer, start_date, end_date):
        """Generate comprehensive statement data"""
        queryset = Transaction.objects.filter(
            customer=customer,
            created_at__gte=start_date,
            created_at__lte=end_date
        ).order_by('-created_at')

        transactions = []
        for tx in queryset:
            transactions.append({
                'date': tx.created_at.strftime('%Y-%m-%d'),
                'description': tx.description or 'Transaction',
                'category': self._categorize_transaction(tx),
                'amount': float(tx.amount),
                'type': 'sent' if tx.amount < 0 else 'received',
                'status': tx.status,
                'payment_method': self._get_payment_method(tx)
            })

        # Calculate balances
        opening_balance = self._calculate_balance(customer, start_date)
        closing_balance = self._calculate_balance(customer, end_date)
        
        # Generate spending categories
        spending_by_category = self._calculate_spending_by_category(queryset)
        
        # Generate balance history
        balance_history = self._generate_balance_history(customer, start_date, end_date)

        return {
            'opening_balance': opening_balance,
            'closing_balance': closing_balance,
            'net_change': closing_balance - opening_balance,
            'transactions': transactions,
            'spending_by_category': spending_by_category,
            'balance_history': balance_history
        }

    def _get_period_name(self, start_date, end_date):
        """Generate period name for statement"""
        start = datetime.strptime(start_date, '%Y-%m-%d')
        end = datetime.strptime(end_date, '%Y-%m-%d')
        
        if start.month == end.month and start.year == end.year:
            return calendar.month_name[start.month] + f' {start.year}'
        else:
            return f"{start.strftime('%b %d')} - {end.strftime('%b %d, %Y')}"

    def _categorize_transaction(self, transaction):
        """Categorize transaction based on description/amount"""
        desc = (transaction.description or '').lower()
        amount = abs(float(transaction.amount))
        
        # Simple categorization logic
        if any(keyword in desc for keyword in ['electricity', 'water', 'utility']):
            return 'Utilities'
        elif any(keyword in desc for keyword in ['airtime', 'data', 'internet']):
            return 'Telecommunications'
        elif any(keyword in desc for keyword in ['food', 'restaurant', 'grocery']):
            return 'Food & Dining'
        elif any(keyword in desc for keyword in ['transport', 'fuel', 'uber', 'taxi']):
            return 'Transport'
        elif any(keyword in desc for keyword in ['shop', 'mall', 'store']):
            return 'Shopping'
        elif any(keyword in desc for keyword in ['hospital', 'medical', 'pharmacy']):
            return 'Healthcare'
        elif any(keyword in desc for keyword in ['school', 'fees', 'education']):
            return 'Education'
        elif any(keyword in desc for keyword in ['insurance']):
            return 'Insurance'
        else:
            return 'Other'

    def _get_payment_method(self, transaction):
        """Get payment method for transaction"""
        if hasattr(transaction, 'payment_method'):
            return transaction.payment_method.get_method_type_display()
        return 'Unknown'

    def _calculate_balance(self, customer, date):
        """Calculate account balance at specific date"""
        transactions = Transaction.objects.filter(
            customer=customer,
            created_at__lte=date
        )
        balance = transactions.aggregate(
            total=Sum('amount')
        )['total'] or Decimal('0')
        
        return float(balance)

    def _calculate_spending_by_category(self, queryset):
        """Calculate spending by category"""
        spending = {}
        total_spending = 0
        
        for tx in queryset:
            if tx.amount < 0:  # Money out
                category = self._categorize_transaction(tx)
                amount = abs(float(tx.amount))
                spending[category] = spending.get(category, 0) + amount
                total_spending += amount
        
        # Convert to list with percentages
        result = []
        for category, amount in spending.items():
            percentage = (amount / total_spending * 100) if total_spending > 0 else 0
            result.append({
                'category': category,
                'amount': round(amount, 2),
                'percentage': round(percentage, 1),
                'transaction_count': len([tx for tx in queryset if self._categorize_transaction(tx) == category])
            })
        
        return sorted(result, key=lambda x: x['amount'], reverse=True)

    def _generate_balance_history(self, customer, start_date, end_date):
        """Generate daily balance history"""
        start = datetime.strptime(start_date, '%Y-%m-%d')
        end = datetime.strptime(end_date, '%Y-%m-%d')
        
        history = []
        current_date = start
        
        while current_date <= end:
            balance = self._calculate_balance(customer, current_date.strftime('%Y-%m-%d'))
            previous_balance = self._calculate_balance(customer, (current_date - timedelta(days=1)).strftime('%Y-%m-%d'))
            
            history.append({
                'date': current_date.strftime('%Y-%m-%d'),
                'balance': round(balance, 2),
                'change': round(balance - previous_balance, 2),
                'change_percentage': round(((balance - previous_balance) / previous_balance * 100) if previous_balance != 0 else 0, 2)
            })
            
            current_date += timedelta(days=1)
        
        return history

class CustomerStatementPreviewAPIView(APIView):
    """Generate customer statement preview"""
    permission_classes = [permissions.IsAuthenticated]

    def post(self, request):
        """Generate statement preview"""
        customer = getattr(request.user, 'customer_profile', None)
        if not customer:
            return Response({'error': 'Customer profile not found'}, status=status.HTTP_404_NOT_FOUND)

        start_date = request.data.get('start_date')
        end_date = request.data.get('end_date')

        statement_view = CustomerStatementAPIView()
        statement_data = statement_view._generate_statement_data(customer, start_date, end_date)

        preview = {
            'period_name': statement_view._get_period_name(start_date, end_date),
            'start_date': start_date,
            'end_date': end_date,
            'opening_balance': statement_data['opening_balance'],
            'closing_balance': statement_data['closing_balance'],
            'net_change': statement_data['net_change'],
            'transaction_count': len(statement_data['transactions']),
            'recent_transactions': statement_data['transactions'][:10],
            'spending_categories': [
                {
                    'name': cat['category'],
                    'amount': cat['amount'],
                    'percentage': cat['percentage']
                }
                for cat in statement_data['spending_by_category']
            ]
        }

        return Response(preview)

class CustomerStatsAPIView(APIView):
    """Get customer statistics and analytics"""
    permission_classes = [permissions.IsAuthenticated]

    def get(self, request):
        """Get customer statistics"""
        customer = getattr(request.user, 'customer_profile', None)
        if not customer:
            return Response({'error': 'Customer profile not found'}, status=status.HTTP_404_NOT_FOUND)

        # Current month stats
        now = timezone.now()
        month_start = now.replace(day=1, hour=0, minute=0, second=0, microsecond=0)
        
        month_transactions = Transaction.objects.filter(
            customer=customer,
            created_at__gte=month_start
        )

        # Calculate stats
        total_transactions = month_transactions.count()
        completed_transactions = month_transactions.filter(status='completed').count()
        failed_transactions = month_transactions.filter(status='failed').count()
        
        success_rate = (completed_transactions / total_transactions * 100) if total_transactions > 0 else 0

        # Payment method breakdown
        payment_methods = {}
        for tx in month_transactions:
            method = CustomerStatementAPIView()._get_payment_method(tx)
            payment_methods[method] = payment_methods.get(method, 0) + 1

        stats = {
            'transactions_this_month': total_transactions,
            'completed_transactions': completed_transactions,
            'failed_transactions': failed_transactions,
            'success_rate': round(success_rate, 2),
            'total_transactions': Transaction.objects.filter(customer=customer).count(),
            'payment_methods': payment_methods
        }

        return Response(stats)

class CustomerTransactionsAPIView(APIView):
    """Get customer transactions with filtering"""
    permission_classes = [permissions.IsAuthenticated]

    def get(self, request):
        """Get customer transactions"""
        customer = getattr(request.user, 'customer_profile', None)
        if not customer:
            return Response({'error': 'Customer profile not found'}, status=status.HTTP_404_NOT_FOUND)

        from payments.models.transaction import Transaction

        transactions = Transaction.objects.filter(
            customer=customer
        ).order_by('-created_at')[:50]

        results = [
            {
                'id': t.id,
                'date': t.created_at.strftime('%Y-%m-%d %H:%M:%S'),
                'description': t.description or '',
                'category': t.transaction_type or 'Transfer',
                'amount': float(t.amount),
                'currency': t.currency or 'GHS',
                'status': t.status,
                'payment_method': t.payment_method or '',
            }
            for t in transactions
        ]

        return Response({
            'results': results,
            'count': len(results),
            'next': None,
            'previous': None
        })

class CustomerSpendingByCategoryAPIView(APIView):
    """Get customer spending breakdown by category"""
    permission_classes = [permissions.IsAuthenticated]

    def get(self, request):
        """Get spending by category"""
        customer = getattr(request.user, 'customer_profile', None)
        if not customer:
            return Response({'error': 'Customer profile not found'}, status=status.HTTP_404_NOT_FOUND)

        start_date = request.query_params.get('start_date')
        end_date = request.query_params.get('end_date')

        queryset = Transaction.objects.filter(customer=customer, amount__lt=0)  # Money out only

        if start_date:
            queryset = queryset.filter(created_at__gte=start_date)
        if end_date:
            queryset = queryset.filter(created_at__lte=end_date)

        statement_view = CustomerStatementAPIView()
        spending_data = statement_view._calculate_spending_by_category(queryset)

        return Response(spending_data)

class CustomerBalanceHistoryAPIView(APIView):
    """Get customer balance history"""
    permission_classes = [permissions.IsAuthenticated]

    def get(self, request):
        """Get balance history"""
        customer = getattr(request.user, 'customer_profile', None)
        if not customer:
            return Response({'error': 'Customer profile not found'}, status=status.HTTP_404_NOT_FOUND)

        start_date = request.query_params.get('start_date')
        end_date = request.query_params.get('end_date')
        granularity = request.query_params.get('granularity', 'daily')

        if not start_date or not end_date:
            # Default to last 30 days
            end_date = timezone.now().strftime('%Y-%m-%d')
            start_date = (timezone.now() - timedelta(days=30)).strftime('%Y-%m-%d')

        statement_view = CustomerStatementAPIView()
        history = statement_view._generate_balance_history(customer, start_date, end_date)

        # Apply granularity
        if granularity == 'weekly':
            history = self._aggregate_by_week(history)
        elif granularity == 'monthly':
            history = self._aggregate_by_month(history)

        return Response(history)

    def _aggregate_by_week(self, daily_history):
        """Aggregate daily history to weekly"""
        weekly_data = {}
        
        for day in daily_history:
            date = datetime.strptime(day['date'], '%Y-%m-%d')
            week_key = date.isocalendar()[0], date.isocalendar()[1]  # year, week number
            
            if week_key not in weekly_data:
                weekly_data[week_key] = {
                    'date': day['date'],
                    'balance': day['balance'],
                    'change': day['change'],
                    'change_percentage': day['change_percentage']
                }
            else:
                # Update to last day of week
                weekly_data[week_key].update({
                    'date': day['date'],
                    'balance': day['balance'],
                    'change': day['balance'] - weekly_data[week_key]['balance']
                })
        
        return list(weekly_data.values())

    def _aggregate_by_month(self, daily_history):
        """Aggregate daily history to monthly"""
        monthly_data = {}
        
        for day in daily_history:
            date = datetime.strptime(day['date'], '%Y-%m-%d')
            month_key = date.year, date.month
            
            if month_key not in monthly_data:
                monthly_data[month_key] = {
                    'date': day['date'],
                    'balance': day['balance'],
                    'change': day['change'],
                    'change_percentage': day['change_percentage']
                }
            else:
                # Update to last day of month
                monthly_data[month_key].update({
                    'date': day['date'],
                    'balance': day['balance'],
                    'change': day['balance'] - monthly_data[month_key]['balance']
                })
        
        return list(monthly_data.values())

class CustomerBalanceAPIView(APIView):
    """Get customer account balance"""
    permission_classes = [permissions.IsAuthenticated]

    def get(self, request):
        """Get current account balance"""
        customer = getattr(request.user, 'customer_profile', None)
        if not customer:
            return Response({'error': 'Customer profile not found'}, status=status.HTTP_404_NOT_FOUND)

        # Calculate current balance
        balance = Transaction.objects.filter(customer=customer).aggregate(
            total=Sum('amount')
        )['total'] or Decimal('0')

        # Calculate pending transactions
        pending_amount = Transaction.objects.filter(
            customer=customer,
            status='pending'
        ).aggregate(total=Sum('amount'))['total'] or Decimal('0')

        balance_data = {
            'available': float(balance),
            'pending': float(pending_amount),
            'currency': 'GHS',
            'last_updated': timezone.now().isoformat()
        }

        return Response(balance_data)
