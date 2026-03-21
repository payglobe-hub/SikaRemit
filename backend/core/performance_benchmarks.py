"""
Performance benchmarking utilities for SikaRemit
Measures and tracks performance of critical operations
"""
import time
import functools
import statistics
from typing import Callable, Dict, List, Any, Optional
from django.core.cache import cache
from django.db import connection
from django.test.utils import override_settings
import logging

logger = logging.getLogger(__name__)

class PerformanceBenchmark:
    """
    Performance benchmarking utility
    """
    
    def __init__(self, name: str):
        self.name = name
        self.start_time = None
        self.end_time = None
        self.duration = None
        self.measurements: List[float] = []
    
    def __enter__(self):
        """Start timing"""
        self.start_time = time.perf_counter()
        return self
    
    def __exit__(self, exc_type, exc_val, exc_tb):
        """End timing"""
        self.end_time = time.perf_counter()
        self.duration = self.end_time - self.start_time
        self.measurements.append(self.duration)
        
        logger.info(f"Benchmark '{self.name}': {self.duration:.4f}s")
    
    def get_stats(self) -> Dict[str, float]:
        """Get statistics for all measurements"""
        if not self.measurements:
            return {}
        
        return {
            'count': len(self.measurements),
            'total': sum(self.measurements),
            'mean': statistics.mean(self.measurements),
            'median': statistics.median(self.measurements),
            'min': min(self.measurements),
            'max': max(self.measurements),
            'stdev': statistics.stdev(self.measurements) if len(self.measurements) > 1 else 0
        }

def benchmark(name: Optional[str] = None, iterations: int = 1):
    """
    Decorator to benchmark function performance
    
    Usage:
        @benchmark(name='payment_processing', iterations=10)
        def process_payment(amount):
            # Function code
            pass
    """
    def decorator(func: Callable) -> Callable:
        benchmark_name = name or func.__name__
        
        @functools.wraps(func)
        def wrapper(*args, **kwargs):
            measurements = []
            result = None
            
            for i in range(iterations):
                start = time.perf_counter()
                result = func(*args, **kwargs)
                end = time.perf_counter()
                measurements.append(end - start)
            
            # Calculate statistics
            avg_time = statistics.mean(measurements)
            min_time = min(measurements)
            max_time = max(measurements)
            
            logger.info(
                f"Benchmark '{benchmark_name}': "
                f"avg={avg_time:.4f}s, min={min_time:.4f}s, max={max_time:.4f}s "
                f"({iterations} iterations)"
            )
            
            # Store in cache for monitoring
            cache_key = f"benchmark:{benchmark_name}"
            cache.set(cache_key, {
                'avg': avg_time,
                'min': min_time,
                'max': max_time,
                'iterations': iterations,
                'timestamp': time.time()
            }, timeout=3600)
            
            return result
        
        return wrapper
    return decorator

class DatabaseQueryBenchmark:
    """
    Benchmark database queries
    """
    
    @staticmethod
    def measure_queries(func: Callable) -> Dict[str, Any]:
        """
        Measure database queries executed by a function
        
        Returns:
            dict: Query statistics
        """
        from django.test.utils import CaptureQueriesContext
        
        with CaptureQueriesContext(connection) as context:
            start = time.perf_counter()
            result = func()
            end = time.perf_counter()
            
            return {
                'result': result,
                'duration': end - start,
                'query_count': len(context.captured_queries),
                'queries': context.captured_queries,
                'total_query_time': sum(float(q['time']) for q in context.captured_queries)
            }
    
    @staticmethod
    def find_slow_queries(threshold: float = 0.1) -> List[Dict]:
        """
        Find slow queries in recent executions
        
        Args:
            threshold: Time threshold in seconds
            
        Returns:
            List of slow queries
        """
        from django.test.utils import CaptureQueriesContext
        
        slow_queries = []
        
        with CaptureQueriesContext(connection) as context:
            for query in context.captured_queries:
                query_time = float(query['time'])
                if query_time > threshold:
                    slow_queries.append({
                        'sql': query['sql'],
                        'time': query_time,
                        'stack': query.get('stack', [])
                    })
        
        return slow_queries

class APIEndpointBenchmark:
    """
    Benchmark API endpoint performance
    """
    
    def __init__(self):
        self.results: Dict[str, List[float]] = {}
    
    def measure_endpoint(
        self,
        client,
        method: str,
        url: str,
        data: Optional[Dict] = None,
        iterations: int = 10
    ) -> Dict[str, Any]:
        """
        Measure API endpoint performance
        
        Args:
            client: Django test client
            method: HTTP method (GET, POST, etc.)
            url: Endpoint URL
            data: Request data
            iterations: Number of iterations
            
        Returns:
            Performance statistics
        """
        measurements = []
        status_codes = []
        
        for _ in range(iterations):
            start = time.perf_counter()
            
            if method.upper() == 'GET':
                response = client.get(url)
            elif method.upper() == 'POST':
                response = client.post(url, data=data, content_type='application/json')
            elif method.upper() == 'PUT':
                response = client.put(url, data=data, content_type='application/json')
            elif method.upper() == 'DELETE':
                response = client.delete(url)
            else:
                raise ValueError(f"Unsupported method: {method}")
            
            end = time.perf_counter()
            
            measurements.append(end - start)
            status_codes.append(response.status_code)
        
        return {
            'endpoint': url,
            'method': method,
            'iterations': iterations,
            'avg_time': statistics.mean(measurements),
            'min_time': min(measurements),
            'max_time': max(measurements),
            'median_time': statistics.median(measurements),
            'stdev': statistics.stdev(measurements) if len(measurements) > 1 else 0,
            'status_codes': status_codes,
            'success_rate': sum(1 for code in status_codes if 200 <= code < 300) / len(status_codes)
        }

class PaymentProcessingBenchmark:
    """
    Specialized benchmarks for payment processing
    """
    
    @staticmethod
    def benchmark_payment_creation(iterations: int = 100) -> Dict[str, float]:
        """
        Benchmark payment creation performance
        """
        from payments.models import Payment
        from users.models import Customer, User, Merchant
        from decimal import Decimal
        
        # Setup test data
        user = User.objects.create_user(
            username='bench_user',
            email='bench@test.com',
            password='test123',
            user_type=3
        )
        customer = Customer.objects.create(user=user)
        
        merchant_user = User.objects.create_user(
            username='bench_merchant',
            email='merchant@test.com',
            password='test123',
            user_type=2
        )
        merchant = Merchant.objects.create(
            user=merchant_user,
            business_name='Test Merchant',
            tax_id='TEST123'
        )
        
        measurements = []
        
        for i in range(iterations):
            start = time.perf_counter()
            
            Payment.objects.create(
                customer=customer,
                merchant=merchant,
                amount=Decimal('100.00'),
                currency='USD',
                payment_method='card',
                status='pending'
            )
            
            end = time.perf_counter()
            measurements.append(end - start)
        
        # Cleanup
        Payment.objects.filter(customer=customer).delete()
        customer.delete()
        merchant.delete()
        user.delete()
        merchant_user.delete()
        
        return {
            'operation': 'payment_creation',
            'iterations': iterations,
            'avg_time': statistics.mean(measurements),
            'min_time': min(measurements),
            'max_time': max(measurements),
            'total_time': sum(measurements)
        }
    
    @staticmethod
    def benchmark_payment_query(iterations: int = 100) -> Dict[str, float]:
        """
        Benchmark payment query performance
        """
        from payments.models import Payment
        
        measurements = []
        
        for _ in range(iterations):
            start = time.perf_counter()
            
            # Simulate common query
            list(Payment.objects.filter(status='completed')[:10])
            
            end = time.perf_counter()
            measurements.append(end - start)
        
        return {
            'operation': 'payment_query',
            'iterations': iterations,
            'avg_time': statistics.mean(measurements),
            'min_time': min(measurements),
            'max_time': max(measurements)
        }

class CacheBenchmark:
    """
    Benchmark cache operations
    """
    
    @staticmethod
    def benchmark_cache_operations(iterations: int = 1000) -> Dict[str, Dict[str, float]]:
        """
        Benchmark cache set, get, and delete operations
        """
        results = {}
        
        # Benchmark SET
        set_measurements = []
        for i in range(iterations):
            start = time.perf_counter()
            cache.set(f'bench_key_{i}', f'value_{i}', timeout=60)
            end = time.perf_counter()
            set_measurements.append(end - start)
        
        results['set'] = {
            'avg': statistics.mean(set_measurements),
            'min': min(set_measurements),
            'max': max(set_measurements)
        }
        
        # Benchmark GET
        get_measurements = []
        for i in range(iterations):
            start = time.perf_counter()
            cache.get(f'bench_key_{i}')
            end = time.perf_counter()
            get_measurements.append(end - start)
        
        results['get'] = {
            'avg': statistics.mean(get_measurements),
            'min': min(get_measurements),
            'max': max(get_measurements)
        }
        
        # Benchmark DELETE
        delete_measurements = []
        for i in range(iterations):
            start = time.perf_counter()
            cache.delete(f'bench_key_{i}')
            end = time.perf_counter()
            delete_measurements.append(end - start)
        
        results['delete'] = {
            'avg': statistics.mean(delete_measurements),
            'min': min(delete_measurements),
            'max': max(delete_measurements)
        }
        
        return results

class BenchmarkReport:
    """
    Generate benchmark reports
    """
    
    @staticmethod
    def generate_report() -> Dict[str, Any]:
        """
        Generate comprehensive benchmark report
        """
        report = {
            'timestamp': time.time(),
            'benchmarks': {}
        }
        
        # Payment benchmarks
        logger.info("Running payment creation benchmark...")
        report['benchmarks']['payment_creation'] = \
            PaymentProcessingBenchmark.benchmark_payment_creation(iterations=50)
        
        logger.info("Running payment query benchmark...")
        report['benchmarks']['payment_query'] = \
            PaymentProcessingBenchmark.benchmark_payment_query(iterations=50)
        
        # Cache benchmarks
        logger.info("Running cache benchmarks...")
        report['benchmarks']['cache'] = \
            CacheBenchmark.benchmark_cache_operations(iterations=500)
        
        return report
    
    @staticmethod
    def print_report(report: Dict[str, Any]):
        """
        Print formatted benchmark report
        """

        for name, results in report['benchmarks'].items():
            .replace('_', ' ')}")

            if isinstance(results, dict):
                for key, value in results.items():
                    if isinstance(value, dict):
                        
                        for k, v in value.items():
                            if isinstance(v, float):
                                
                            else:
                                
                    elif isinstance(value, float):
                        
                    else:

# Management command to run benchmarks
def run_all_benchmarks():
    """
    Run all performance benchmarks
    """
    logger.info("Starting comprehensive performance benchmarks...")
    
    report = BenchmarkReport.generate_report()
    BenchmarkReport.print_report(report)
    
    # Store report in cache
    cache.set('latest_benchmark_report', report, timeout=86400)  # 24 hours
    
    logger.info("Benchmarks completed successfully")
    
    return report
