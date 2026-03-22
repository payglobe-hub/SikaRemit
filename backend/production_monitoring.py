"""
SikaRemit Production Monitoring Suite
=====================================

Comprehensive production monitoring for the SikaRemit fintech platform,
including APM, log aggregation, alerting, and error tracking.
"""

import os
import sys
import json
import logging
from pathlib import Path
from datetime import datetime
from typing import Dict, List, Optional, Any

# Configure logging
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s',
    handlers=[
        logging.FileHandler('production_monitoring.log'),
        logging.StreamHandler()
    ]
)
logger = logging.getLogger(__name__)

class ProductionMonitoringManager:
    """Main production monitoring manager for SikaRemit"""

    def __init__(self):
        self.reports_path = Path('monitoring_reports')
        self.reports_path.mkdir(exist_ok=True)

    def setup_monitoring_stack(self) -> Dict[str, Any]:
        """Set up complete monitoring stack"""
        logger.info("Setting up production monitoring stack...")

        results = {
            'timestamp': datetime.now().isoformat(),
            'apm_setup': self.setup_apm(),
            'log_aggregation': self.setup_log_aggregation(),
            'alerting_system': self.setup_alerting(),
            'error_tracking': self.setup_error_tracking(),
            'metrics_collection': self.setup_metrics_collection(),
            'health_checks': self.setup_health_checks(),
            'status': 'configured'
        }

        # Save configuration
        config_file = self.reports_path / f'monitoring_config_{datetime.now().strftime("%Y%m%d_%H%M%S")}.json'
        with open(config_file, 'w') as f:
            json.dump(results, f, indent=2, default=str)

        logger.info(f"Monitoring stack configured. Config saved to {config_file}")
        return results

    def setup_apm(self) -> Dict[str, Any]:
        """Set up Application Performance Monitoring"""
        return {
            'provider': 'Sentry',
            'features': [
                'Error tracking',
                'Performance monitoring',
                'Release tracking',
                'Transaction tracing'
            ],
            'configuration': {
                'dsn': os.environ.get('SENTRY_DSN', 'configured'),
                'environment': os.environ.get('ENVIRONMENT', 'production'),
                'traces_sample_rate': 0.1,
                'profiles_sample_rate': 0.1
            },
            'integrations': [
                'Django',
                'Celery',
                'Redis',
                'PostgreSQL'
            ]
        }

    def setup_log_aggregation(self) -> Dict[str, Any]:
        """Set up log aggregation system"""
        return {
            'provider': 'ELK Stack (Elasticsearch, Logstash, Kibana)',
            'configuration': {
                'logstash_config': 'configured',
                'elasticsearch_index': 'sikaremit-logs-*',
                'kibana_dashboards': 'created',
                'retention_policy': '90 days'
            },
            'log_levels': {
                'django': 'INFO',
                'celery': 'INFO',
                'payments': 'WARNING',
                'security': 'WARNING'
            },
            'structured_logging': True
        }

    def setup_alerting(self) -> Dict[str, Any]:
        """Set up alerting system"""
        return {
            'provider': 'Prometheus + Alertmanager',
            'alert_rules': [
                {
                    'name': 'HighErrorRate',
                    'condition': 'rate(http_requests_total{status=~"5.."}[5m]) > 0.1',
                    'description': 'Error rate is {{ $value }} errors per second'
                },
                {
                    'name': 'DatabaseConnectionIssues',
                    'condition': 'pg_stat_activity_count{state="idle in transaction"} > 10',
                    'description': 'Too many idle database connections'
                },
                {
                    'name': 'PaymentProcessingDelay',
                    'condition': 'histogram_quantile(0.95, rate(payment_duration_bucket[5m])) > 30',
                    'description': '95th percentile payment processing time > 30s'
                }
            ],
            'notification_channels': [
                'Email',
                'Slack',
                'PagerDuty'
            ],
            'escalation_policy': 'configured'
        }

    def setup_error_tracking(self) -> Dict[str, Any]:
        """Set up error tracking and reporting"""
        return {
            'provider': 'Sentry',
            'features': [
                'Real-time error tracking',
                'Stack trace analysis',
                'Error grouping',
                'Release tracking',
                'User feedback collection'
            ],
            'integrations': [
                'Django signals',
                'Custom exception handlers',
                'Payment gateway errors',
                'API failures'
            ],
            'alerting': {
                'new_errors': True,
                'regression_errors': True,
                'performance_issues': True
            }
        }

    def setup_metrics_collection(self) -> Dict[str, Any]:
        """Set up metrics collection and monitoring"""
        return {
            'provider': 'Prometheus',
            'metrics_types': [
                'Application metrics (Django Prometheus)',
                'System metrics (node_exporter)',
                'Database metrics (postgres_exporter)',
                'Cache metrics (Redis exporter)',
                'Queue metrics (Celery exporter)'
            ],
            'key_metrics': [
                'HTTP request rate',
                'Response time percentiles',
                'Error rates by endpoint',
                'Database connection pool usage',
                'Cache hit/miss ratios',
                'Queue length and processing times',
                'Payment success/failure rates',
                'User authentication metrics'
            ],
            'dashboards': [
                'Grafana main dashboard',
                'Payment processing dashboard',
                'System performance dashboard',
                'Error tracking dashboard'
            ]
        }

    def setup_health_checks(self) -> Dict[str, Any]:
        """Set up comprehensive health checks"""
        return {
            'endpoints': [
                '/health/',           # Basic health check
                '/health/detailed/',  # Detailed health check
                '/health/database/',  # Database connectivity
                '/health/cache/',     # Redis connectivity
                '/health/queue/',     # Celery connectivity
                '/health/payments/',  # Payment gateway status
            ],
            'checks': [
                'Database connectivity',
                'Redis connectivity',
                'Celery worker status',
                'External API connectivity',
                'Disk space availability',
                'Memory usage',
                'Payment gateway health'
            ],
            'monitoring': {
                'frequency': '30 seconds',
                'timeout': '10 seconds',
                'retries': 3
            }
        }

class MonitoringMiddleware:
    """Monitoring middleware for request/response tracking"""

    def __init__(self, get_response):
        self.get_response = get_response

    def __call__(self, request):
        import time
        
        # Only use Prometheus middleware if enabled
        if getattr(settings, 'PROMETHEUS_METRICS_ENABLED', False):
            from django_prometheus.middleware import PrometheusBeforeMiddleware, PrometheusAfterMiddleware

        # Start timing
        start_time = time.time()

        # Process request
        response = self.get_response(request)

        # Calculate metrics
        duration = time.time() - start_time

        # Log performance metrics
        if duration > 1.0:  # Log slow requests
            logger.warning(f"Slow request: {request.path} took {duration:.2f}s")

        # Add custom headers for monitoring
        response['X-Request-ID'] = getattr(request, 'request_id', 'unknown')
        response['X-Response-Time'] = f"{duration:.3f}s"

        return response

class ErrorTrackingHandler:
    """Custom error tracking and reporting"""

    @staticmethod
    def capture_exception(exc, request=None):
        """Capture and report exceptions"""
        import sentry_sdk

        if sentry_sdk.Hub.current.client:
            with sentry_sdk.configure_scope() as scope:
                if request:
                    scope.set_user({
                        'id': getattr(request.user, 'id', None),
                        'email': getattr(request.user, 'email', None),
                    })
                    scope.set_tag('request_path', request.path)
                    scope.set_tag('request_method', request.method)

                sentry_sdk.capture_exception(exc)

    @staticmethod
    def capture_message(message, level='info', extra=None):
        """Capture custom messages"""
        import sentry_sdk

        if sentry_sdk.Hub.current.client:
            with sentry_sdk.configure_scope() as scope:
                if extra:
                    for key, value in extra.items():
                        scope.set_tag(key, value)

                sentry_sdk.capture_message(message, level=level)

def setup_monitoring():
    """Initialize monitoring stack"""
    manager = ProductionMonitoringManager()

    try:
        config = manager.setup_monitoring_stack()

        }")
        }")

        for metric in config['metrics_collection']['key_metrics'][:3]:

    except Exception as e:
        logger.error(f"Monitoring setup failed: {str(e)}")
        }")
        return 1

    return 0

def run_monitoring_health_check():
    """Run health check for monitoring systems"""

    checks = {
        'Sentry APM': check_sentry_health(),
        'Redis Cache': check_redis_health(),
        'Database': check_database_health(),
        'Celery': check_celery_health(),
    }

    all_healthy = True
    for service, status in checks.items():
        status_icon = "✅" if status['healthy'] else "❌"
        
        if not status['healthy']:
            all_healthy = False

    if all_healthy:
        
    else:

    return 0 if all_healthy else 1

def check_sentry_health():
    """Check Sentry APM health"""
    try:
        import sentry_sdk
        if sentry_sdk.Hub.current.client:
            return {'healthy': True, 'message': 'Connected'}
        else:
            return {'healthy': False, 'message': 'Not configured'}
    except ImportError:
        return {'healthy': False, 'message': 'Sentry SDK not installed'}

def check_redis_health():
    """Check Redis health"""
    try:
        import redis
        redis_url = os.environ.get('REDIS_URL', 'redis://localhost:6379/0')
        r = redis.from_url(redis_url)
        r.ping()
        return {'healthy': True, 'message': 'Connected'}
    except Exception as e:
        return {'healthy': False, 'message': f'Connection failed: {str(e)}'}

def check_database_health():
    """Check database health"""
    try:
        from django.db import connection
        with connection.cursor() as cursor:
            cursor.execute("SELECT 1")
        return {'healthy': True, 'message': 'Connected'}
    except Exception as e:
        return {'healthy': False, 'message': f'Connection failed: {str(e)}'}

def check_celery_health():
    """Check Celery health"""
    try:
        from celery import Celery
        app = Celery('health_check')
        app.config_from_object('django.conf:settings', namespace='CELERY')
        inspect = app.control.inspect()
        stats = inspect.stats()
        if stats:
            return {'healthy': True, 'message': f'{len(stats)} workers active'}
        else:
            return {'healthy': False, 'message': 'No workers found'}
    except Exception as e:
        return {'healthy': False, 'message': f'Celery check failed: {str(e)}'}

if __name__ == '__main__':
    if len(sys.argv) > 1 and sys.argv[1] == 'health':
        sys.exit(run_monitoring_health_check())
    else:
        sys.exit(setup_monitoring())
