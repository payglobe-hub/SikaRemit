"""
Pagination for Customer APIs
"""

from rest_framework.pagination import PageNumberPagination
from rest_framework.response import Response

class StandardResultsSetPagination(PageNumberPagination):
    """
    Standard pagination for customer-facing APIs
    """
    page_size = 20
    page_size_query_param = 'page_size'
    max_page_size = 100

    def get_paginated_response(self, data):
        return Response({
            'count': self.page.paginator.count,
            'next': self.get_next_link(),
            'previous': self.get_previous_link(),
            'num_pages': self.page.paginator.num_pages,
            'current_page': self.page.number,
            'results': data
        })

class SmallResultsSetPagination(PageNumberPagination):
    """
    Smaller pagination for featured/trending sections
    """
    page_size = 12
    page_size_query_param = 'page_size'
    max_page_size = 50
