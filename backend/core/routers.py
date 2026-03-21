class TenantRouter:
    """
    Routes database queries based on tenant ID in request
    """
    def db_for_read(self, model, **hints):
        return self._route_request(model)

    def db_for_write(self, model, **hints):
        return self._route_request(model)

    def _route_request(self, model):
        from django.http import HttpRequest
        
        request = hints.get('request')
        if request and isinstance(request, HttpRequest):
            tenant_id = request.headers.get('X-Tenant-ID')
            if tenant_id:
                return f'tenant_{tenant_id}'
        return 'default'
