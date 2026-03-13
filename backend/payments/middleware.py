"""
Payment processing middleware for comprehensive error handling and logging
"""

import logging
import time
import uuid
from django.utils.deprecation import MiddlewareMixin
from django.http import JsonResponse
from django.conf import settings
from rest_framework import status
from .exceptions import *

logger = logging.getLogger('payments')


class PaymentErrorHandlingMiddleware(MiddlewareMixin):
    """
    Middleware for handling payment-related errors with proper logging and user feedback
    """
    
    def process_exception(self, request, exception):
        """
        Handle payment exceptions and return appropriate JSON responses
        """
        # Only handle payment-related exceptions
        if not isinstance(exception, PaymentException):
            return None
        
        # Generate unique error ID for tracking
        error_id = str(uuid.uuid4())
        
        # Log the error with context
        self._log_error(request, exception, error_id)
        
        # Return appropriate error response
        return self._create_error_response(exception, error_id)
    
    def _log_error(self, request, exception, error_id):
        """Log error with comprehensive context"""
        user_info = {}
        if hasattr(request, 'user') and request.user.is_authenticated:
            user_info = {
                'user_id': request.user.id,
                'email': request.user.email,
                'user_type': 'merchant' if hasattr(request.user, 'merchant_profile') else 'customer'
            }
        
        error_context = {
            'error_id': error_id,
            'exception_type': exception.__class__.__name__,
            'error_code': getattr(exception, 'default_code', 'unknown'),
            'message': str(exception),
            'status_code': getattr(exception, 'status_code', 500),
            'path': request.path,
            'method': request.method,
            'user': user_info,
            'timestamp': time.time(),
            'request_data': getattr(request, 'data', {}),
            'headers': dict(request.headers),
            'ip_address': self._get_client_ip(request)
        }
        
        # Log based on severity
        if getattr(exception, 'status_code', 500) >= 500:
            logger.error(f"Payment Server Error [{error_id}]: {exception}", extra=error_context)
        else:
            logger.warning(f"Payment Client Error [{error_id}]: {exception}", extra=error_context)
    
    def _create_error_response(self, exception, error_id):
        """Create standardized error response"""
        response_data = {
            'error': True,
            'error_id': error_id,
            'error_code': getattr(exception, 'default_code', 'payment_error'),
            'message': getattr(exception, 'default_detail', 'Payment processing error'),
            'status_code': getattr(exception, 'status_code', status.HTTP_400_BAD_REQUEST),
            'timestamp': time.time()
        }
        
        # Add additional context for specific error types
        if isinstance(exception, KYCRequiredException):
            response_data['next_action'] = 'complete_kyc'
            response_data['kyc_url'] = f"{settings.FRONTEND_URL}/kyc"
        
        elif isinstance(exception, InsufficientFundsException):
            response_data['suggestion'] = 'Add funds to your account or try a smaller amount'
        
        elif isinstance(exception, RateLimitExceededException):
            response_data['retry_after'] = 60  # seconds
            response_data['suggestion'] = 'Please wait before trying again'
        
        elif isinstance(exception, PaymentGatewayException):
            response_data['is_temporary'] = True
            response_data['suggestion'] = 'Try again in a few minutes'
        
        elif isinstance(exception, FraudDetectionException):
            response_data['requires_review'] = True
            response_data['contact_support'] = True
        
        return JsonResponse(response_data, status=getattr(exception, 'status_code', status.HTTP_400_BAD_REQUEST))
    
    def _get_client_ip(self, request):
        """Get client IP address from request"""
        x_forwarded_for = request.META.get('HTTP_X_FORWARDED_FOR')
        if x_forwarded_for:
            ip = x_forwarded_for.split(',')[0]
        else:
            ip = request.META.get('REMOTE_ADDR')
        return ip


class PaymentRequestLoggingMiddleware(MiddlewareMixin):
    """
    Middleware for logging all payment-related requests for audit and debugging
    """
    
    def process_request(self, request):
        """Log incoming payment requests"""
        if not self._is_payment_endpoint(request.path):
            return None
        
        request_id = str(uuid.uuid4())
        request.payment_request_id = request_id
        
        # Log request start
        logger.info(f"Payment Request Started [{request_id}]: {request.method} {request.path}", extra={
            'request_id': request_id,
            'method': request.method,
            'path': request.path,
            'user_id': getattr(request.user, 'id', None) if hasattr(request, 'user') else None,
            'ip_address': self._get_client_ip(request),
            'timestamp': time.time()
        })
        
        return None
    
    def process_response(self, request, response):
        """Log payment request completion"""
        if not hasattr(request, 'payment_request_id'):
            return None
        
        # Log request completion
        logger.info(f"Payment Request Completed [{request.payment_request_id}]: {response.status_code}", extra={
            'request_id': request.payment_request_id,
            'status_code': response.status_code,
            'duration': time.time() - getattr(request, 'start_time', time.time()),
            'success': response.status_code < 400
        })
        
        return response
    
    def _is_payment_endpoint(self, path):
        """Check if the request is for a payment endpoint"""
        payment_endpoints = [
            '/api/v1/payments/',
            '/api/payments/',
            '/payments/',
        ]
        return any(path.startswith(endpoint) for endpoint in payment_endpoints)
    
    def _get_client_ip(self, request):
        """Get client IP address from request"""
        x_forwarded_for = request.META.get('HTTP_X_FORWARDED_FOR')
        if x_forwarded_for:
            ip = x_forwarded_for.split(',')[0]
        else:
            ip = request.META.get('REMOTE_ADDR')
        return ip


class PaymentSecurityMiddleware(MiddlewareMixin):
    """
    Middleware for security checks on payment requests
    """
    
    def process_request(self, request):
        """Perform security checks on payment requests"""
        if not self._is_payment_endpoint(request.path):
            return None
        
        # Check for suspicious patterns
        if self._is_suspicious_request(request):
            logger.warning(f"Suspicious payment request detected: {request.method} {request.path}", extra={
                'ip_address': self._get_client_ip(request),
                'user_agent': request.META.get('HTTP_USER_AGENT', ''),
                'headers': dict(request.headers),
                'timestamp': time.time()
            })
            
            return JsonResponse({
                'error': True,
                'error_code': 'security_check_failed',
                'message': 'Request blocked for security reasons',
                'status_code': status.HTTP_403_FORBIDDEN
            }, status=status.HTTP_403_FORBIDDEN)
        
        return None
    
    def _is_payment_endpoint(self, path):
        """Check if the request is for a payment endpoint"""
        payment_endpoints = [
            '/api/v1/payments/',
            '/api/payments/',
            '/payments/',
        ]
        return any(path.startswith(endpoint) for endpoint in payment_endpoints)
    
    def _is_suspicious_request(self, request):
        """Check for suspicious request patterns"""
        suspicious_patterns = [
            # Check for suspicious user agents
            lambda r: 'bot' in r.META.get('HTTP_USER_AGENT', '').lower(),
            # Check for rapid successive requests (would need rate limiting implementation)
            # Check for unusual request sizes
            lambda r: len(str(getattr(r, 'body', ''))) > 1000000,  # 1MB
        ]
        
        return any(pattern(request) for pattern in suspicious_patterns)
    
    def _get_client_ip(self, request):
        """Get client IP address from request"""
        x_forwarded_for = request.META.get('HTTP_X_FORWARDED_FOR')
        if x_forwarded_for:
            ip = x_forwarded_for.split(',')[0]
        else:
            ip = request.META.get('REMOTE_ADDR')
        return ip
