from rest_framework.response import Response

class APIResponse(Response):
    def __init__(self, data=None, status=None, **kwargs):
        formatted_data = {
            'success': status // 100 == 2 if status else True,
            'data': data,
            **kwargs
        }
        super().__init__(formatted_data, status=status)
