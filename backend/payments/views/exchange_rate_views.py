from rest_framework import viewsets, status
from rest_framework.decorators import action
from rest_framework.response import Response
from rest_framework.permissions import AllowAny
from users.permissions import IsAdminUser
from django.utils import timezone
from django.db import models
from decimal import Decimal
from ..models.currency import ExchangeRate, Currency
from ..serializers.exchange_rate_serializers import ExchangeRateSerializer


class ExchangeRateViewSet(viewsets.ModelViewSet):
    """
    Admin viewset for managing exchange rates
    """
    queryset = ExchangeRate.objects.all().order_by('-timestamp')
    serializer_class = ExchangeRateSerializer
    permission_classes = [IsAdminUser]

    def get_permissions(self):
        """Allow unauthenticated access to list and current_rates actions"""
        if self.action in ['list', 'current_rates', 'current_rates_frontend', 'convert_amount']:
            return [AllowAny()]
        return super().get_permissions()

    def create(self, request, *args, **kwargs):
        """Create a new exchange rate"""
        from_code = request.data.get('from_currency')
        to_code = request.data.get('to_currency')
        rate_value = request.data.get('rate')
        valid_from = request.data.get('valid_from')
        valid_to = request.data.get('valid_to')
        source = request.data.get('source', 'admin')

        try:
            from_currency = Currency.objects.get(code=from_code)
            to_currency = Currency.objects.get(code=to_code)
        except Currency.DoesNotExist as e:
            return Response({'error': f'Currency not found: {str(e)}'}, status=status.HTTP_400_BAD_REQUEST)

        # Create new rate
        rate = ExchangeRate.objects.create(
            from_currency=from_currency,
            to_currency=to_currency,
            rate=Decimal(str(rate_value)),
            source=source,
            valid_from=valid_from or timezone.now(),
            valid_to=valid_to,
            is_latest=True
        )

        serializer = self.get_serializer(rate)
        return Response(serializer.data, status=status.HTTP_201_CREATED)

    def update(self, request, *args, **kwargs):
        """Update an existing exchange rate"""
        instance = self.get_object()
        rate_value = request.data.get('rate')
        valid_from = request.data.get('valid_from')
        valid_to = request.data.get('valid_to')
        source = request.data.get('source')

        if rate_value:
            instance.rate = Decimal(str(rate_value))
        if valid_from:
            instance.valid_from = valid_from
        if valid_to is not None:
            instance.valid_to = valid_to
        if source:
            instance.source = source
            
        instance.save()

        serializer = self.get_serializer(instance)
        return Response(serializer.data)

    @action(detail=False, methods=['get'])
    def current_rates(self, request):
        """Get all currently active exchange rates"""
        rates = ExchangeRate.objects.filter(is_latest=True).select_related('from_currency', 'to_currency')
        serializer = self.get_serializer(rates, many=True)
        return Response(serializer.data)

    @action(detail=False, methods=['post'])
    def bulk_update(self, request):
        """Bulk update multiple exchange rates"""
        rates_data = request.data.get('rates', [])
        updated_rates = []

        for rate_data in rates_data:
            try:
                from_currency = Currency.objects.get(code=rate_data['from_currency'])
                to_currency = Currency.objects.get(code=rate_data['to_currency'])

                # Create new rate
                rate = ExchangeRate.objects.create(
                    from_currency=from_currency,
                    to_currency=to_currency,
                    rate=Decimal(str(rate_data['rate'])),
                    source='admin_bulk',
                    is_latest=True,
                    valid_from=timezone.now()
                )
                updated_rates.append(rate)
            except Currency.DoesNotExist:
                continue

        return Response({
            'message': f'Successfully updated {len(updated_rates)} exchange rates',
            'updated_rates': ExchangeRateSerializer(updated_rates, many=True).data
        })

    @action(detail=True, methods=['post'])
    def activate(self, request, pk=None):
        """Mark a specific exchange rate as the latest one"""
        rate = self.get_object()
        
        # Mark all other rates for this pair as not latest
        ExchangeRate.objects.filter(
            from_currency=rate.from_currency,
            to_currency=rate.to_currency,
            is_latest=True
        ).exclude(pk=rate.pk).update(is_latest=False)
        
        # Mark this rate as latest
        rate.is_latest = True
        rate.save()

        return Response({'message': 'Exchange rate activated'})

    @action(detail=False, methods=['get'])
    def current_rates_frontend(self, request):
        """Get current exchange rates for frontend conversion preview"""
        rates = ExchangeRate.objects.filter(is_latest=True).select_related('from_currency', 'to_currency')

        # Convert to simple dict for frontend
        rate_dict = {}
        for rate in rates:
            key = f"{rate.from_currency.code}_{rate.to_currency.code}"
            rate_dict[key] = float(rate.rate)

        return Response({
            'rates': rate_dict,
            'timestamp': timezone.now().isoformat(),
            'source': 'database'
        })

    @action(detail=False, methods=['get'])
    def convert_amount(self, request):
        """Convert amount using current database rates"""
        from_code = request.query_params.get('from')
        to_code = request.query_params.get('to')
        amount = request.query_params.get('amount')

        if not all([from_code, to_code, amount]):
            return Response({'error': 'Missing required parameters'}, status=status.HTTP_400_BAD_REQUEST)

        try:
            amount = float(amount)
            
            # Get currencies
            from_currency = Currency.objects.get(code=from_code)
            to_currency = Currency.objects.get(code=to_code)
            
            # Get latest rate
            current_rate = ExchangeRate.get_latest_rate(from_currency, to_currency)

            if current_rate:
                converted_amount = amount * float(current_rate.rate)
                return Response({
                    'amount': amount,
                    'convertedAmount': converted_amount,
                    'rate': float(current_rate.rate),
                    'from_currency': from_code,
                    'to_currency': to_code,
                    'timestamp': timezone.now().isoformat()
                })
            else:
                return Response({'error': f'No exchange rate found for {from_code} to {to_code}'}, status=status.HTTP_404_NOT_FOUND)

        except Currency.DoesNotExist:
            return Response({'error': 'Invalid currency code'}, status=status.HTTP_400_BAD_REQUEST)
        except ValueError:
            return Response({'error': 'Invalid amount'}, status=status.HTTP_400_BAD_REQUEST)
