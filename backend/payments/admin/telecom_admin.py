from django.contrib import admin
from django.utils.html import format_html
from payments.models import TelecomProvider, TelecomPackage, BusinessRule

@admin.register(TelecomProvider)
class TelecomProviderAdmin(admin.ModelAdmin):
    list_display = ['name', 'code', 'country', 'is_active', 'packages_count', 'created_at']
    list_filter = ['is_active', 'country', 'supports_data', 'supports_airtime']
    search_fields = ['name', 'code', 'country__name']
    readonly_fields = ['id', 'created_at', 'updated_at']

    fieldsets = (
        ('Basic Information', {
            'fields': ('name', 'code', 'country')
        }),
        ('Capabilities', {
            'fields': ('supports_data', 'supports_airtime', 'is_active')
        }),
        ('External Integration', {
            'fields': ('logo_url', 'website', 'api_endpoint', 'api_key'),
            'classes': ('collapse',)
        }),
        ('Timestamps', {
            'fields': ('created_at', 'updated_at'),
            'classes': ('collapse',)
        }),
    )

    def packages_count(self, obj):
        return obj.packages.filter(is_active=True).count()
    packages_count.short_description = "Active Packages"

@admin.register(TelecomPackage)
class TelecomPackageAdmin(admin.ModelAdmin):
    list_display = [
        'name', 'provider', 'package_type', 'formatted_price',
        'data_amount', 'validity_text', 'is_active', 'is_featured'
    ]
    list_filter = [
        'package_type', 'is_active', 'is_featured',
        'provider__country', 'provider__name', 'currency'
    ]
    search_fields = ['name', 'provider__name', 'package_id']
    readonly_fields = ['id', 'formatted_price', 'validity_text', 'created_at', 'updated_at']

    fieldsets = (
        ('Basic Information', {
            'fields': ('package_id', 'name', 'description', 'provider', 'package_type')
        }),
        ('Pricing', {
            'fields': ('price', 'currency', 'formatted_price')
        }),
        ('Package Details', {
            'fields': ('data_amount', 'validity_days', 'airtime_amount', 'validity_text')
        }),
        ('Settings', {
            'fields': ('is_active', 'is_featured', 'sort_order')
        }),
        ('Provider Integration', {
            'fields': ('provider_package_id',),
            'classes': ('collapse',)
        }),
        ('Timestamps', {
            'fields': ('created_at', 'updated_at'),
            'classes': ('collapse',)
        }),
    )

    def formatted_price(self, obj):
        return format_html('<strong>{}</strong>', obj.formatted_price)
    formatted_price.short_description = "Price"

@admin.register(BusinessRule)
class BusinessRuleAdmin(admin.ModelAdmin):
    list_display = [
        'name', 'rule_type', 'scope', 'get_scope_info',
        'percentage_value', 'fixed_value', 'is_active', 'priority'
    ]
    list_filter = ['rule_type', 'scope', 'is_active', 'country', 'telecom_provider', 'currency']
    search_fields = ['name', 'description']
    readonly_fields = ['id', 'created_at', 'updated_at']

    fieldsets = (
        ('Basic Information', {
            'fields': ('name', 'description', 'rule_type', 'scope')
        }),
        ('Scope Configuration', {
            'fields': ('country', 'telecom_provider', 'currency')
        }),
        ('Rule Values', {
            'fields': ('percentage_value', 'fixed_value')
        }),
        ('Settings', {
            'fields': ('is_active', 'priority')
        }),
        ('Validity Period', {
            'fields': ('valid_from', 'valid_until'),
            'classes': ('collapse',)
        }),
        ('Timestamps', {
            'fields': ('created_at', 'updated_at'),
            'classes': ('collapse',)
        }),
    )

    def get_scope_info(self, obj):
        if obj.scope == 'country' and obj.country:
            return f"🇺🇸 {obj.country.name}"
        elif obj.scope == 'provider' and obj.telecom_provider:
            return f"📱 {obj.telecom_provider.name}"
        elif obj.scope == 'currency' and obj.currency:
            return f"💰 {obj.currency.code}"
        return "Global"
    get_scope_info.short_description = "Scope"

    def get_queryset(self, request):
        return super().get_queryset(request).select_related(
            'country', 'telecom_provider', 'currency'
        ).order_by('-priority', 'scope', 'rule_type')
