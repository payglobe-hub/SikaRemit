from django.contrib import admin
from .models import USSDSession, USSDTransaction, USSDService

@admin.register(USSDSession)
class USSDSessionAdmin(admin.ModelAdmin):
    """Admin interface for USSD sessions"""
    list_display = ['phone_number', 'session_id', 'service_code', 'status', 'current_menu', 'started_at', 'last_activity']
    list_filter = ['status', 'service_code', 'started_at', 'last_activity']
    search_fields = ['phone_number', 'session_id', 'service_code']
    readonly_fields = ['id', 'started_at', 'created_at', 'last_activity']
    ordering = ['-last_activity']

    fieldsets = (
        ('Session Info', {
            'fields': ('phone_number', 'session_id', 'service_code', 'status', 'current_menu')
        }),
        ('Timing', {
            'fields': ('started_at', 'ended_at', 'last_activity')
        }),
        ('Data', {
            'fields': ('menu_history', 'data', 'steps'),
            'classes': ('collapse',)
        }),
    )

    def has_add_permission(self, request):
        return False  # Sessions are created automatically

    def has_delete_permission(self, request, obj=None):
        return False  # Don't allow manual deletion

@admin.register(USSDTransaction)
class USSDTransactionAdmin(admin.ModelAdmin):
    """Admin interface for USSD transactions"""
    list_display = ['phone_number', 'amount', 'currency', 'status', 'service_code', 'created_at']
    list_filter = ['status', 'service_code', 'currency', 'created_at']
    search_fields = ['phone_number', 'session__session_id', 'service_code']
    readonly_fields = ['id', 'created_at', 'updated_at']
    ordering = ['-created_at']

    fieldsets = (
        ('Transaction Info', {
            'fields': ('session', 'phone_number', 'amount', 'currency', 'status')
        }),
        ('Service', {
            'fields': ('service_code', 'current_menu')
        }),
        ('Data', {
            'fields': ('text', 'menu_data'),
            'classes': ('collapse',)
        }),
        ('Links', {
            'fields': ('payment',),
            'classes': ('collapse',)
        }),
        ('Timing', {
            'fields': ('created_at', 'updated_at')
        }),
    )

    def has_add_permission(self, request):
        return False  # Transactions are created automatically

@admin.register(USSDService)
class USSDServiceAdmin(admin.ModelAdmin):
    """Admin interface for USSD services"""
    list_display = ['code', 'name', 'service_type', 'is_active', 'created_at']
    list_filter = ['service_type', 'is_active', 'created_at']
    search_fields = ['code', 'name', 'description']
    ordering = ['code']

    fieldsets = (
        ('Service Info', {
            'fields': ('code', 'name', 'service_type', 'description', 'is_active')
        }),
        ('Configuration', {
            'fields': ('menu_config',),
            'classes': ('collapse',)
        }),
        ('Timing', {
            'fields': ('created_at', 'updated_at'),
            'classes': ('collapse',)
        }),
    )
