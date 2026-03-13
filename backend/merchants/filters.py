"""
Product Filters for Customer API
"""

from django_filters import rest_framework as filters
from merchants.models import Product


class ProductFilter(filters.FilterSet):
    """
    Advanced filtering for products
    """
    min_price = filters.NumberFilter(field_name="price", lookup_expr='gte')
    max_price = filters.NumberFilter(field_name="price", lookup_expr='lte')
    category = filters.CharFilter(field_name="category", lookup_expr='iexact')
    store_name = filters.CharFilter(field_name="store__name", lookup_expr='icontains')
    in_stock = filters.BooleanFilter(method='filter_in_stock')
    has_image = filters.BooleanFilter(method='filter_has_image')
    
    class Meta:
        model = Product
        fields = ['category', 'store_name', 'min_price', 'max_price']
    
    def filter_in_stock(self, queryset, name, value):
        if value:
            return queryset.filter(stock_quantity__gt=0)
        return queryset
    
    def filter_has_image(self, queryset, name, value):
        if value:
            return queryset.filter(image__isnull=False)
        return queryset
