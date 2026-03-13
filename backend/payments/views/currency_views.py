from rest_framework import viewsets, status, permissions
from rest_framework.decorators import api_view, permission_classes
from rest_framework.permissions import IsAuthenticated, AllowAny
from accounts.permissions import IsAdminUser
from rest_framework.response import Response
from decimal import Decimal
from ..models import Currency, ExchangeRate
from ..serializers.currency_serializers import CurrencySerializer
from ..services.currency_service import CurrencyService
from channels.layers import get_channel_layer
from asgiref.sync import async_to_sync


class CurrencyViewSet(viewsets.ReadOnlyModelViewSet):
    """
    ViewSet for Currency management
    """
    queryset = Currency.objects.filter(is_active=True)
    serializer_class = CurrencySerializer
    permission_classes = [AllowAny]  # Currencies list should be public


@api_view(['GET'])
@permission_classes([AllowAny])
def currencies_list(request):
    """
    Get list of active currencies
    """
    try:
        currencies = Currency.objects.filter(is_active=True).order_by('code')
        serializer = CurrencySerializer(currencies, many=True)
        return Response(serializer.data)
    except Exception as e:
        return Response(
            {'error': f'Failed to fetch currencies: {str(e)}'},
            status=status.HTTP_500_INTERNAL_SERVER_ERROR
        )


@api_view(['GET'])
@permission_classes([AllowAny])
def historical_rates(request):
    """
    Get historical exchange rates for charting
    """
    try:
        from_currency = request.GET.get('from_currency')
        to_currency = request.GET.get('to_currency')
        days = int(request.GET.get('days', 30))

        if not from_currency or not to_currency:
            return Response(
                {'error': 'from_currency and to_currency are required'},
                status=status.HTTP_400_BAD_REQUEST
            )

        if days > 365 or days < 1:
            return Response(
                {'error': 'days must be between 1 and 365'},
                status=status.HTTP_400_BAD_REQUEST
            )

        historical_data = CurrencyService.get_historical_rates(from_currency, to_currency, days)
        
        return Response({
            'from_currency': from_currency,
            'to_currency': to_currency,
            'days': days,
            'data': historical_data
        })

    except Exception as e:
        return Response(
            {'error': f'Failed to fetch historical rates: {str(e)}'},
            status=status.HTTP_500_INTERNAL_SERVER_ERROR
        )


@api_view(['POST'])
@permission_classes([IsAuthenticated, IsAdminUser])
def set_exchange_rates(request):
    """
    Admin endpoint to manually set exchange rates
    Expected data: {'rates': {'EUR': 0.85, 'GBP': 0.73, ...}}
    """
    try:
        rates_data = request.data.get('rates', {})
        if not rates_data:
            return Response(
                {'error': 'rates data is required'},
                status=status.HTTP_400_BAD_REQUEST
            )

        # Get base currency
        try:
            base_currency = Currency.objects.get(is_base_currency=True)
        except Currency.DoesNotExist:
            return Response(
                {'error': 'No base currency configured'},
                status=status.HTTP_500_INTERNAL_SERVER_ERROR
            )

        updated_rates = {}
        created_count = 0

        for to_code, rate_value in rates_data.items():
            try:
                to_currency = Currency.objects.get(code=to_code, is_active=True)
                rate_decimal = Decimal(str(rate_value))

                # Mark previous rates as not latest
                ExchangeRate.objects.filter(
                    from_currency=base_currency,
                    to_currency=to_currency,
                    is_latest=True
                ).update(is_latest=False)

                # Create new rate
                ExchangeRate.objects.create(
                    from_currency=base_currency,
                    to_currency=to_currency,
                    rate=rate_decimal,
                    source='manual',
                    metadata={'set_by': request.user.email if request.user.is_authenticated else 'admin'}
                )

                updated_rates[to_code] = float(rate_decimal)
                created_count += 1

            except Currency.DoesNotExist:
                continue
            except (ValueError, TypeError):
                continue

        if created_count > 0:
            # Broadcast to WebSocket
            _broadcast_rate_update(updated_rates, 'manual')

        return Response({
            'message': f'Successfully updated {created_count} exchange rates',
            'updated_rates': updated_rates
        })

    except Exception as e:
        return Response(
            {'error': f'Failed to update rates: {str(e)}'},
            status=status.HTTP_500_INTERNAL_SERVER_ERROR
        )


def _broadcast_rate_update(rates: dict, source: str):
    """
    Broadcast rate update to WebSocket clients
    """
    try:
        channel_layer = get_channel_layer()
        async_to_sync(channel_layer.group_send)(
            'rates_exchange_rates',
            {
                'type': 'rates_update',
                'rates_data': {
                    'rates': rates,
                    'timestamp': timezone.now().isoformat(),
                    'source': source
                }
            }
        )
    except Exception as e:
        # Log error but don't fail the request
        pass
