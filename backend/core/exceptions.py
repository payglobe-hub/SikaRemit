from rest_framework.views import exception_handler
from rest_framework.response import Response
from rest_framework import status
import logging

logger = logging.getLogger(__name__)

def custom_exception_handler(exc, context):
    response = exception_handler(exc, context)
    
    if response is not None:
        response.data['status_code'] = response.status_code
        response.data['success'] = False
        
        if isinstance(response.data, list):
            response.data = {'errors': response.data}
        elif 'detail' in response.data:
            response.data['message'] = response.data.pop('detail')
    else:
        logger.error(f"Unhandled exception: {str(exc)}")
        response = Response(
            {
                'success': False,
                'message': 'Internal server error',
                'status_code': status.HTTP_500_INTERNAL_SERVER_ERROR
            },
            status=status.HTTP_500_INTERNAL_SERVER_ERROR
        )
    
    return response
