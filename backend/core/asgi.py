"""
ASGI config for core project.

It exposes the ASGI callable as a module-level variable named ``application``.

For more information on this file, see
https://docs.djangoproject.com/en/4.2/howto/deployment/asgi/
"""

import os
from urllib.parse import parse_qs

# Set Django settings module BEFORE any Django imports
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'core.settings')

# Initialize Django before importing any Django components
import django
django.setup()

# Now import Django components after Django is fully initialized
from django.core.asgi import get_asgi_application
from channels.routing import ProtocolTypeRouter, URLRouter
from channels.auth import AuthMiddlewareStack
from channels.security.websocket import AllowedHostsOriginValidator
from channels.middleware import BaseMiddleware
from django.contrib.auth.models import AnonymousUser
from rest_framework_simplejwt.tokens import AccessToken
from django.contrib.auth import get_user_model

# Import websocket routing after Django is initialized
try:
    from notifications.routing import websocket_urlpatterns
except ImportError:
    # Fallback if notifications app is not available
    websocket_urlpatterns = []

User = get_user_model()

class JWTAuthMiddleware(BaseMiddleware):
    """Custom middleware to authenticate WebSocket connections using JWT tokens from query parameters"""

    def __init__(self, inner):
        super().__init__(inner)

    async def __call__(self, scope, receive, send):
        # Extract token from query parameters
        query_string = scope.get('query_string', b'').decode()
        query_params = parse_qs(query_string)
        token = query_params.get('token', [None])[0]

        if token:
            try:
                # Validate the token
                access_token = AccessToken(token)
                user_id = access_token.payload.get('user_id')

                if user_id:
                    try:
                        user = await User.objects.aget(id=user_id)
                        scope['user'] = user
                        
                    except User.DoesNotExist:
                        
                        scope['user'] = AnonymousUser()
                else:
                    
                    scope['user'] = AnonymousUser()
            except Exception as e:
                
                # Token is invalid
                scope['user'] = AnonymousUser()
        else:
            
            scope['user'] = AnonymousUser()

        return await super().__call__(scope, receive, send)

# Apply JWT middleware for WebSocket authentication
application = ProtocolTypeRouter({
    "http": get_asgi_application(),
    "websocket": AllowedHostsOriginValidator(
        JWTAuthMiddleware(
            URLRouter(
                websocket_urlpatterns
            )
        )
    ),
})
