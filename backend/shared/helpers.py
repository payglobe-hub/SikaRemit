from datetime import datetime
import json
from django.http import HttpResponse
from django.core.serializers.json import DjangoJSONEncoder
import hashlib
import re

class JSONResponse(HttpResponse):
    """JSON response helper"""
    def __init__(self, data, status=200):
        super().__init__(
            json.dumps(data, cls=DjangoJSONEncoder),
            content_type='application/json',
            status=status
        )

def parse_date(date_str, format='%Y-%m-%d'):
    """Parse date string to datetime"""
    try:
        return datetime.strptime(date_str, format)
    except (ValueError, TypeError):
        return None

def validate_email(email):
    """Validate email format"""
    pattern = r'^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$'
    return re.match(pattern, email) is not None

def generate_hash(value):
    """Generate SHA256 hash of a value"""
    return hashlib.sha256(value.encode()).hexdigest()

def paginate_queryset(queryset, page, page_size):
    """Simple pagination helper"""
    start = (page - 1) * page_size
    end = start + page_size
    return queryset[start:end]
