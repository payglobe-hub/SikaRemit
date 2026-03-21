from django.contrib import admin
from .models import DashboardStats

@admin.register(DashboardStats)
class DashboardStatsAdmin(admin.ModelAdmin):
    list_display = ('user', 'total_transactions', 'total_volume', 'last_updated')
    search_fields = ('user__email',)
    readonly_fields = ('last_updated',)
