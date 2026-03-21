from rest_framework.response import Response
from rest_framework import status
import logging

logger = logging.getLogger(__name__)

def api_success(data=None, message=None, status_code=status.HTTP_200_OK, request=None):
    response_data = {
        'success': True,
        'data': data or {},
        'message': message or 'Operation successful'
    }
    
    if request and hasattr(request, 'request_id'):
        response_data['request_id'] = request.request_id
    
    return Response(response_data, status=status_code)

def api_error(message=None, errors=None, status_code=status.HTTP_400_BAD_REQUEST, request=None):
    response_data = {
        'success': False,
        'message': message or 'An error occurred',
        'errors': errors or {}
    }
    
    if request and hasattr(request, 'request_id'):
        response_data['request_id'] = request.request_id
    
    if status_code >= 500:
        logger.error(json.dumps({
            'type': 'server_error',
            'request_id': getattr(request, 'request_id', None),
            'status_code': status_code,
            'message': message,
            'errors': errors
        }))
    
    return Response(response_data, status=status_code)

def paginated_response(queryset, serializer_class, request, page_size=20):
    paginator = Paginator(queryset, page_size)
    page_number = request.query_params.get('page', 1)
    page_obj = paginator.get_page(page_number)
    
    serializer = serializer_class(page_obj, many=True)
    
    return api_success({
        'results': serializer.data,
        'pagination': {
            'count': paginator.count,
            'pages': paginator.num_pages,
            'current_page': page_obj.number,
            'next': page_obj.has_next(),
            'previous': page_obj.has_prev()
        }
    }, request=request)
