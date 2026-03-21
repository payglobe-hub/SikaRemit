from django.db import connections
from django.db.utils import OperationalError
from prometheus_client import Counter, Gauge

DB_CONNECTION_CHECKS = Counter(
    'db_connection_checks_total',
    'Total database connection health checks'
)
DB_CONNECTION_ERRORS = Counter(
    'db_connection_errors_total',
    'Total database connection errors'
)
DB_CONNECTION_GAUGE = Gauge(
    'db_active_connections',
    'Current active database connections'
)

def check_connections():
    """Verify and maintain healthy database connections."""
    DB_CONNECTION_CHECKS.inc()
    for conn in connections.all():
        try:
            conn.ensure_connection()
            DB_CONNECTION_GAUGE.inc()
        except OperationalError:
            DB_CONNECTION_ERRORS.inc()
            conn.close()
