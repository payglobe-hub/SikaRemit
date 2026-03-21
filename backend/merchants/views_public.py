"""
Customer Product API Views

Public-facing endpoints for customers to browse and view products
"""

from rest_framework import generics, filters, status
from rest_framework.decorators import api_view, permission_classes
from rest_framework.permissions import AllowAny, IsAuthenticated
from rest_framework.response import Response
from django_filters.rest_framework import DjangoFilterBackend
from django.db.models import Q, Avg, Count
from merchants.models import Product, Store, MerchantApplication
from merchants.serializers import ProductSerializer, StoreSerializer, MerchantApplicationSerializer
from .filters import ProductFilter
from .pagination import StandardResultsSetPagination

class PublicProductListView(generics.ListAPIView):
    """
    Public API for customers to browse products
    """
    permission_classes = [AllowAny]
    serializer_class = ProductSerializer
    pagination_class = StandardResultsSetPagination
    filter_backends = [DjangoFilterBackend, filters.SearchFilter, filters.OrderingFilter]
    filterset_class = ProductFilter
    search_fields = ['name', 'description', 'store__name']
    ordering_fields = ['price', 'created_at', 'name', 'stock_quantity']
    ordering = ['-created_at']

    def get_queryset(self):
        """Return only available products from active stores"""
        queryset = Product.objects.filter(
            is_available=True,
            stock_quantity__gt=0,
            store__is_active=True
        ).select_related('store')
        
        # Filter by category if provided
        category = self.request.query_params.get('category')
        if category:
            queryset = queryset.filter(category__iexact=category)
        
        # Filter by price range
        min_price = self.request.query_params.get('min_price')
        max_price = self.request.query_params.get('max_price')
        if min_price:
            queryset = queryset.filter(price__gte=min_price)
        if max_price:
            queryset = queryset.filter(price__lte=max_price)
        
        return queryset

class PublicProductDetailView(generics.RetrieveAPIView):
    """
    Public API for customers to view product details
    """
    permission_classes = [AllowAny]
    serializer_class = ProductSerializer
    lookup_field = 'slug'

    def get_queryset(self):
        return Product.objects.filter(
            is_available=True,
            stock_quantity__gt=0,
            store__is_active=True
        ).select_related('store')

class PublicStoreListView(generics.ListAPIView):
    """
    Public API for customers to browse stores
    """
    permission_classes = [AllowAny]
    serializer_class = StoreSerializer
    pagination_class = StandardResultsSetPagination
    filter_backends = [filters.SearchFilter, filters.OrderingFilter]
    search_fields = ['name', 'description', 'business_name']
    ordering_fields = ['name', 'created_at', 'rating']
    ordering = ['-rating', 'name']

    def get_queryset(self):
        return Store.objects.filter(
            is_active=True
        ).annotate(
            product_count=Count('products', filter=Q(products__is_available=True))
        ).filter(product_count__gt=0)

class PublicStoreDetailView(generics.RetrieveAPIView):
    """
    Public API for customers to view store details
    """
    permission_classes = [AllowAny]
    serializer_class = StoreSerializer

    def get_queryset(self):
        return Store.objects.filter(
            is_active=True
        ).annotate(
            product_count=Count('products', filter=Q(products__is_available=True))
        )

class StoreProductListView(generics.ListAPIView):
    """
    Public API for products from a specific store
    """
    permission_classes = [AllowAny]
    serializer_class = ProductSerializer
    pagination_class = StandardResultsSetPagination
    filter_backends = [DjangoFilterBackend, filters.SearchFilter, filters.OrderingFilter]
    filterset_class = ProductFilter
    search_fields = ['name', 'description']
    ordering_fields = ['price', 'created_at', 'name', 'stock_quantity']
    ordering = ['-created_at']

    def get_queryset(self):
        store_id = self.kwargs['store_id']
        return Product.objects.filter(
            store_id=store_id,
            is_available=True,
            stock_quantity__gt=0,
            store__is_active=True
        ).select_related('store')

@api_view(['GET'])
@permission_classes([AllowAny])
def product_categories(request):
    """
    Get available product categories
    """
    categories = Product.objects.filter(
        is_available=True,
        store__is_active=True,
        category__isnull=False
    ).values_list('category', flat=True).distinct()
    
    return Response({
        'categories': sorted(list(categories))
    })

@api_view(['GET'])
@permission_classes([AllowAny])
def featured_products(request):
    """
    Get featured products for homepage
    """
    products = Product.objects.filter(
        is_available=True,
        stock_quantity__gt=0,
        store__is_active=True,
        is_featured=True
    ).select_related('store')[:12]
    
    serializer = ProductSerializer(products, many=True, context={'request': request})
    return Response(serializer.data)

@api_view(['GET'])
@permission_classes([AllowAny])
def trending_products(request):
    """
    Get trending products (based on recent views/orders)
    """
    # For now, return recent products - can be enhanced with actual analytics
    products = Product.objects.filter(
        is_available=True,
        stock_quantity__gt=0,
        store__is_active=True
    ).select_related('store').order_by('-created_at')[:20]
    
    serializer = ProductSerializer(products, many=True, context={'request': request})
    return Response(serializer.data)

@api_view(['GET'])
@permission_classes([AllowAny])
def search_products(request):
    """
    Advanced product search
    """
    query = request.GET.get('q', '')
    category = request.GET.get('category', '')
    min_price = request.GET.get('min_price', '')
    max_price = request.GET.get('max_price', '')
    store_id = request.GET.get('store_id', '')
    
    products = Product.objects.filter(
        is_available=True,
        stock_quantity__gt=0,
        store__is_active=True
    ).select_related('store')
    
    # Apply filters
    if query:
        products = products.filter(
            Q(name__icontains=query) |
            Q(description__icontains=query) |
            Q(store__name__icontains=query)
        )
    
    if category:
        products = products.filter(category__iexact=category)
    
    if min_price:
        products = products.filter(price__gte=min_price)
    
    if max_price:
        products = products.filter(price__lte=max_price)
    
    if store_id:
        products = products.filter(store_id=store_id)
    
    # Order by relevance (simple implementation)
    if query:
        products = products.annotate(
            relevance=Count('id', filter=Q(name__icontains=query)) * 3 +
                      Count('id', filter=Q(description__icontains=query)) +
                      Count('id', filter=Q(store__name__icontains=query)) * 2
        ).order_by('-relevance', '-created_at')
    else:
        products = products.order_by('-created_at')
    
    serializer = ProductSerializer(products[:50], many=True, context={'request': request})
    return Response(serializer.data)


@api_view(['POST'])
@permission_classes([AllowAny])
def submit_merchant_application(request):
    """
    Public API for submitting merchant applications
    Allows unauthenticated users to apply to become merchants
    """
    try:
        serializer = MerchantApplicationSerializer(data=request.data)
        if serializer.is_valid():
            application = serializer.save()
            
            # Send notification to admins about new application
            from notifications.services import NotificationService
            from shared.constants import USER_TYPE_SUPER_ADMIN, USER_TYPE_BUSINESS_ADMIN
            from django.contrib.auth import get_user_model
            
            User = get_user_model()
            admin_users = User.objects.filter(user_type__in=[USER_TYPE_SUPER_ADMIN, USER_TYPE_BUSINESS_ADMIN])
            
            for admin in admin_users:
                NotificationService.create_notification(
                    user=admin,
                    title="New Merchant Application",
                    message=f"A new merchant application has been submitted by {application.contact_first_name} {application.contact_last_name} for {application.business_name}.",
                    level='info',
                    notification_type='merchant_application_submitted',
                    metadata={
                        'application_id': str(application.id),
                        'business_name': application.business_name,
                        'contact_email': application.contact_email
                    }
                )
            
            return Response({
                'success': True,
                'message': 'Application submitted successfully! We will review it within 2-3 business days.',
                'application_id': application.id
            }, status=status.HTTP_201_CREATED)
        
        return Response({
            'success': False,
            'errors': serializer.errors,
            'message': 'Please correct the errors below.'
        }, status=status.HTTP_400_BAD_REQUEST)
        
    except Exception as e:
        return Response({
            'success': False,
            'message': 'An error occurred while submitting your application. Please try again.',
            'error': str(e)
        }, status=status.HTTP_500_INTERNAL_SERVER_ERROR)
