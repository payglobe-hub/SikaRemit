from django.contrib import admin
from .models import RegulatorySubmission

@admin.register(RegulatorySubmission)
class RegulatorySubmissionAdmin(admin.ModelAdmin):
    list_display = ('user', 'submitted_at', 'success')
    list_filter = ('success', 'submitted_at')
    search_fields = ('user__email',)
    readonly_fields = ('submitted_at', 'response')
