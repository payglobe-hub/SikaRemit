from django.contrib import admin
from django.core.exceptions import PermissionDenied
from .models import Store, Product, MerchantOnboarding
import logging

logger = logging.getLogger(__name__)

@admin.register(Store)
class StoreAdmin(admin.ModelAdmin):
    list_display = ('name', 'merchant', 'is_active', 'created_at')
    list_filter = ('is_active', 'created_at')
    search_fields = ('name', 'merchant__business_name')

@admin.register(Product)
class ProductAdmin(admin.ModelAdmin):
    list_display = ('name', 'store', 'price', 'stock_status', 'is_available', 'last_updated')
    list_filter = ('is_available', 'store', 'created_at')
    search_fields = ('name', 'sku', 'store__name')
    list_editable = ('price', 'is_available')
    readonly_fields = ('created_at', 'updated_at')
    actions = ['make_available', 'make_unavailable', 'restock_items']
    date_hierarchy = 'created_at'
    
    fieldsets = (
        (None, {'fields': ('store', 'name', 'description')}),
        ('Pricing', {'fields': ('price',)}),
        ('Inventory', {'fields': ('sku', 'stock_quantity', 'low_stock_threshold')}),
        ('Status', {'fields': ('is_available',)}),
    )
    
    def get_queryset(self, request):
        try:
            qs = super().get_queryset(request)
            return qs.iterator()  # Disable server-side cursors
        except Exception as e:
            logger.error(f"ProductAdmin queryset error: {str(e)}")
            self.message_user(request, "Error loading products. Please try again.", level='error')
            return Product.objects.none()
    
    def stock_status(self, obj):
        return "Low Stock" if obj.is_low_stock else "In Stock"
    stock_status.short_description = 'Stock Status'
    
    def last_updated(self, obj):
        return obj.updated_at.strftime('%Y-%m-%d %H:%M')
    last_updated.short_description = 'Last Updated'
    
    @admin.action(description='Mark selected products as available')
    def make_available(self, request, queryset):
        updated = queryset.update(is_available=True)
        self.message_user(request, f"{updated} products marked as available")
    
    @admin.action(description='Mark selected products as unavailable')
    def make_unavailable(self, request, queryset):
        updated = queryset.update(is_available=False)
        self.message_user(request, f"{updated} products marked as unavailable")
    
    @admin.action(description='Restock selected items (+10)')
    def restock_items(self, request, queryset):
        for product in queryset:
            product.stock_quantity += 10
            product.save()
        self.message_user(request, f"{queryset.count()} products restocked")
    
    def save_model(self, request, obj, form, change):
        try:
            if obj.stock_quantity < 0:
                raise ValueError("Stock quantity cannot be negative")
            super().save_model(request, obj, form, change)
            logger.info(f"Product {obj.id} updated by {request.user}")
        except Exception as e:
            logger.error(f"Product save error: {e}")
            self.message_user(request, f"Error: {str(e)}", level='error')

@admin.register(MerchantOnboarding)
class MerchantOnboardingAdmin(admin.ModelAdmin):
    list_display = ('merchant', 'status', 'current_step', 'is_verified', 'created_at')
    list_filter = ('status', 'is_verified', 'created_at')
    search_fields = ('merchant__business_name',)
