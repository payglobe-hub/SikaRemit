"""
Prometheus Metrics for SikaRemit
Custom metrics for monitoring application performance and business metrics
"""

from django.conf import settings
from django_prometheus.exports import ExportToDjangoView
from prometheus_client import Counter, Histogram, Gauge, generate_latest, CONTENT_TYPE_LATEST
import time
import logging

logger = logging.getLogger(__name__)

# Business Metrics
ACTIVE_USERS = Gauge('sikaremit_active_users_total', 'Total number of active users')
TRANSACTIONS_TOTAL = Counter('sikaremit_transactions_total', 'Total number of transactions', ['method', 'status'])
USER_REGISTRATIONS = Counter('sikaremit_user_registrations_total', 'Total number of user registrations', ['user_type'])
TRANSACTION_SUCCESS_RATE = Gauge('sikaremit_transaction_success_rate', 'Transaction success rate')

# Performance Metrics
REQUEST_DURATION = Histogram('sikaremit_request_duration_seconds', 'HTTP request duration', ['method', 'endpoint'])
API_RESPONSE_TIME = Histogram('sikaremit_api_response_time', 'API response time', ['endpoint'])
DATABASE_QUERY_TIME = Histogram('sikaremit_database_query_time', 'Database query time', ['query_type'])

# Error Metrics
ERRORS_TOTAL = Counter('sikaremit_errors_total', 'Total number of errors', ['error_type', 'endpoint'])
LOGIN_FAILURES = Counter('sikaremit_login_failures_total', 'Total number of login failures', ['reason'])
PAYMENT_FAILURES = Counter('sikaremit_payment_failures_total', 'Total number of payment failures', ['provider', 'reason'])

# Mobile Money Metrics
MTN_MOMO_TRANSACTIONS = Counter('sikaremit_mtn_momo_transactions_total', 'MTN MoMo transactions', ['status'])
TELECEL_TRANSACTIONS = Counter('sikaremit_telecel_transactions_total', 'Telecel transactions', ['status'])
AIRTELTIGO_TRANSACTIONS = Counter('sikaremit_airteltigo_transactions_total', 'AirtelTigo transactions', ['status'])
GMONEY_TRANSACTIONS = Counter('sikaremit_gmoney_transactions_total', 'G-Money transactions', ['status'])

# System Metrics
SYSTEM_HEALTH_SCORE = Gauge('sikaremit_system_health_score', 'Overall system health score')
CACHE_HIT_RATE = Gauge('sikaremit_cache_hit_rate', 'Cache hit rate')
QUEUE_SIZE = Gauge('sikaremit_queue_size', 'Background queue size')

class PrometheusMiddleware:
    """Django middleware for Prometheus metrics collection"""
    
    def __init__(self, get_response):
        self.get_response = get_response
        
    def __call__(self, request):
        start_time = time.time()
        
        response = self.get_response(request)
        
        # Record request duration
        duration = time.time() - start_time
        REQUEST_DURATION.labels(
            method=request.method,
            endpoint=request.resolved_match.url_name if hasattr(request, 'resolved_match') else 'unknown'
        ).observe(duration)
        
        # Record API response time for API endpoints
        if request.path.startswith('/api/'):
            API_RESPONSE_TIME.labels(
                endpoint=request.resolved_match.url_name if hasattr(request, 'resolved_match') else 'unknown'
            ).observe(duration)
        
        # Record errors
        if response.status_code >= 400:
            ERRORS_TOTAL.labels(
                error_type='http_error',
                endpoint=request.resolved_match.url_name if hasattr(request, 'resolved_match') else 'unknown'
            ).inc()
        
        return response

def record_transaction(method: str, status: str, amount: float = 0):
    """Record transaction metrics"""
    TRANSACTIONS_TOTAL.labels(method=method, status=status).inc()
    
    # Update success rate (simplified calculation)
    # In production, this should be calculated from actual success/failure ratio
    if status == 'success':
        current_rate = TRANSACTION_SUCCESS_RATE._value._value or 0
        new_rate = (current_rate * 0.9) + (100 * 0.1)  # Exponential moving average
        TRANSACTION_SUCCESS_RATE.set(new_rate)

def record_user_registration(user_type: str):
    """Record user registration metrics"""
    USER_REGISTRATIONS.labels(user_type=user_type).inc()

def record_login_failure(reason: str):
    """Record login failure metrics"""
    LOGIN_FAILURES.labels(reason=reason).inc()

def record_payment_failure(provider: str, reason: str):
    """Record payment failure metrics"""
    PAYMENT_FAILURES.labels(provider=provider, reason=reason).inc()

def record_mobile_money_transaction(provider: str, status: str):
    """Record mobile money transaction metrics"""
    if provider == 'mtn_momo':
        MTN_MOMO_TRANSACTIONS.labels(status=status).inc()
    elif provider == 'telecel':
        TELECEL_TRANSACTIONS.labels(status=status).inc()
    elif provider == 'airteltigo':
        AIRTELTIGO_TRANSACTIONS.labels(status=status).inc()
    elif provider == 'g_money':
        GMONEY_TRANSACTIONS.labels(status=status).inc()

def update_active_users(count: int):
    """Update active users count"""
    ACTIVE_USERS.set(count)

def update_system_health_score(score: float):
    """Update system health score (0-100)"""
    SYSTEM_HEALTH_SCORE.set(score)

def update_cache_hit_rate(rate: float):
    """Update cache hit rate (0-1)"""
    CACHE_HIT_RATE.set(rate)

def update_queue_size(size: int):
    """Update background queue size"""
    QUEUE_SIZE.set(size)

class MetricsCollector:
    """Collect and update metrics periodically"""
    
    def __init__(self):
        self.last_update = 0
        
    def collect_metrics(self):
        """Collect all application metrics"""
        try:
            # Active users count (simplified)
            from django.contrib.auth import get_user_model
            User = get_user_model()
            active_count = User.objects.filter(is_active=True).count()
            update_active_users(active_count)
            
            # System health score (simplified calculation)
            health_score = self.calculate_health_score()
            update_system_health_score(health_score)
            
            # Cache hit rate (simplified)
            cache_rate = self.calculate_cache_hit_rate()
            update_cache_hit_rate(cache_rate)
            
            # Queue size (simplified)
            queue_size = self.get_queue_size()
            update_queue_size(queue_size)
            
            logger.info("Metrics collection completed")
            
        except Exception as e:
            logger.error(f"Error collecting metrics: {e}")
    
    def calculate_health_score(self) -> float:
        """Calculate overall system health score"""
        try:
            score = 100.0
            
            # Check database connectivity
            from django.db import connection
            try:
                with connection.cursor() as cursor:
                    cursor.execute("SELECT 1")
            except:
                score -= 30
            
            # Check Redis connectivity (if configured)
            try:
                import redis
                r = redis.Redis(host='localhost', port=6379, db=0)
                r.ping()
            except:
                score -= 20
            
            # Check error rate (simplified)
            error_rate = self.get_error_rate()
            if error_rate > 0.05:  # 5% error rate threshold
                score -= 25
            
            return max(0, score)
            
        except Exception:
            return 50.0  # Default to 50% if calculation fails
    
    def calculate_cache_hit_rate(self) -> float:
        """Calculate cache hit rate"""
        try:
            # This would integrate with your cache backend
            # For now, return a simulated value
            return 0.85  # 85% hit rate
        except Exception:
            return 0.0
    
    def get_queue_size(self) -> int:
        """Get background queue size"""
        try:
            # This would integrate with your task queue (Celery, etc.)
            # For now, return a simulated value
            return 0
        except Exception:
            return 0
    
    def get_error_rate(self) -> float:
        """Calculate error rate"""
        try:
            # This would be calculated from actual error logs
            # For now, return a simulated value
            return 0.01  # 1% error rate
        except Exception:
            return 0.0

# Create metrics collector instance
metrics_collector = MetricsCollector()

# Export metrics view for Prometheus
metrics_view = ExportToDjangoView

def update_transaction_metrics():
    """Update transaction-related metrics"""
    try:
        from payments.models import Transaction
        
        # Update transaction counts by method
        transactions = Transaction.objects.all()
        method_counts = {}
        
        for transaction in transactions:
            method = transaction.payment_method or 'unknown'
            status = 'success' if transaction.status == 'completed' else 'failed'
            
            if method not in method_counts:
                method_counts[method] = {'success': 0, 'failed': 0}
            
            method_counts[method][status] += 1
        
        # Update metrics
        for method, counts in method_counts.items():
            for status, count in counts.items():
                for _ in range(count):
                    record_transaction(method, status)
        
        logger.info(f"Updated transaction metrics for {len(method_counts)} methods")
        
    except Exception as e:
        logger.error(f"Error updating transaction metrics: {e}")

def update_user_metrics():
    """Update user-related metrics"""
    try:
        from django.contrib.auth import get_user_model
        User = get_user_model()
        
        # Update active users
        active_count = User.objects.filter(is_active=True).count()
        update_active_users(active_count)
        
        logger.info(f"Updated user metrics: {active_count} active users")
        
    except Exception as e:
        logger.error(f"Error updating user metrics: {e}")

# Periodic metrics collection
def collect_all_metrics():
    """Collect all application metrics"""
    metrics_collector.collect_metrics()
    update_transaction_metrics()
    update_user_metrics()
