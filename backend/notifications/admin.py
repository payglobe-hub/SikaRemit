from django.contrib import admin
from .models import Notification, NotificationPreferences

@admin.register(Notification)
class NotificationAdmin(admin.ModelAdmin):
    list_display = ('user', 'title', 'category', 'is_read', 'created_at')
    list_filter = ('category', 'is_read', 'level')
    search_fields = ('user__email', 'title', 'message')
    readonly_fields = ('created_at', 'read_at', 'delivery_metrics')
    
@admin.register(NotificationPreferences)
class NotificationPreferencesAdmin(admin.ModelAdmin):
    list_display = ('user', 'email_enabled', 'sms_enabled', 'push_enabled', 'web_enabled')
    search_fields = ('user__email',)
