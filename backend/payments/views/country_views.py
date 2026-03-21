from rest_framework import viewsets, status
from rest_framework.decorators import api_view, permission_classes
from rest_framework.permissions import IsAuthenticated, AllowAny
from rest_framework.response import Response
from django.db.utils import OperationalError
from ..models import Country
from ..serializers.country_serializers import CountrySerializer

class CountryViewSet(viewsets.ReadOnlyModelViewSet):
    """
    ViewSet for Country management - Read-only for public access
    """
    queryset = Country.objects.filter(is_active=True).select_related('currency')
    serializer_class = CountrySerializer
    permission_classes = [AllowAny]  # Countries list should be public

@api_view(['GET'])
@permission_classes([AllowAny])
def countries_list(request):
    """
    Get list of active countries with their currency information
    """
    try:
        countries = Country.objects.filter(is_active=True).select_related('currency')
        serializer = CountrySerializer(countries, many=True)
        return Response({
            'count': countries.count(),
            'results': serializer.data
        })
    except OperationalError:
        return Response({'count': 0, 'results': []})
    except Exception as e:
        return Response(
            {'error': 'Failed to fetch countries'},
            status=status.HTTP_500_INTERNAL_SERVER_ERROR
        )

@api_view(['GET'])
@permission_classes([AllowAny])
def country_detail(request, code):
    """
    Get detailed information about a specific country by code
    """
    try:
        country = Country.objects.select_related('currency').get(
            code__iexact=code, is_active=True
        )
        serializer = CountrySerializer(country)
        return Response(serializer.data)
    except Country.DoesNotExist:
        return Response(
            {'error': 'Country not found'},
            status=status.HTTP_404_NOT_FOUND
        )
    except Exception as e:
        return Response(
            {'error': 'Failed to fetch country'},
            status=status.HTTP_500_INTERNAL_SERVER_ERROR
        )
