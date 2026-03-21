from django.contrib import admin
from .models import AuditLog

@admin.register(AuditLog)
class AuditLogAdmin(admin.ModelAdmin):
    list_display = ('action', 'user', 'admin', 'created_at')
    list_filter = ('action', 'created_at')
    search_fields = ('user__email', 'admin__email')
    readonly_fields = ('created_at',)
    date_hierarchy = 'created_at'
