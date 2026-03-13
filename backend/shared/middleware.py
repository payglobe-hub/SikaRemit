from django.utils.deprecation import MiddlewareMixin
from uuid import uuid4

class RequestIDMiddleware(MiddlewareMixin):
    """Add a unique request ID to each request"""
    def process_request(self, request):
        request.id = str(uuid4())
