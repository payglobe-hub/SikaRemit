"""
Advanced Currency API Views
Provides REST endpoints for advanced currency operations
"""
from rest_framework import viewsets, status
from rest_framework.decorators import action
from rest_framework.response import Response
from rest_framework.permissions import IsAuthenticated
from django.utils import timezone
from decimal import Decimal
from payments.services.currency_service import AdvancedCurrencyService, CurrencyService
from payments.models import Currency

class AdvancedCurrencyViewSet(viewsets.ViewSet):
    """
    Advanced currency operations API
    """
    permission_classes = [IsAuthenticated]

    @action(detail=False, methods=['get'])
    def multi_provider_rates(self, request):
        """
        Get exchange rates from multiple providers
        Query params:
        - base_currency: Base currency code (default: USD)
        - target_currencies: Comma-separated list of target currencies
        """
        try:
            base_currency = request.query_params.get('base_currency', 'USD').upper()
            target_currencies_param = request.query_params.get('target_currencies')

            target_currencies = None
            if target_currencies_param:
                target_currencies = [c.strip().upper() for c in target_currencies_param.split(',')]

            # Validate base currency
            try:
                Currency.objects.get(code=base_currency)
            except Currency.DoesNotExist:
                return Response(
                    {'error': f'Unsupported base currency: {base_currency}'},
                    status=status.HTTP_400_BAD_REQUEST
                )

            result = AdvancedCurrencyService.get_multi_provider_rates(base_currency, target_currencies)
            return Response(result)

        except Exception as e:
            return Response(
                {'error': f'Failed to fetch multi-provider rates: {str(e)}'},
                status=status.HTTP_500_INTERNAL_SERVER_ERROR
            )

    @action(detail=False, methods=['post'])
    def convert_with_arbitrage(self, request):
        """
        Convert currency with arbitrage detection
        Required fields:
        - amount: Amount to convert
        - from_currency: Source currency code
        - to_currency: Target currency code
        """
        try:
            amount = request.data.get('amount')
            from_currency = request.data.get('from_currency', '').upper()
            to_currency = request.data.get('to_currency', '').upper()

            if not amount or not from_currency or not to_currency:
                return Response(
                    {'error': 'amount, from_currency, and to_currency are required'},
                    status=status.HTTP_400_BAD_REQUEST
                )

            try:
                amount_decimal = Decimal(str(amount))
            except (ValueError, TypeError):
                return Response(
                    {'error': 'Invalid amount format'},
                    status=status.HTTP_400_BAD_REQUEST
                )

            # Validate currencies
            try:
                Currency.objects.get(code=from_currency)
                Currency.objects.get(code=to_currency)
            except Currency.DoesNotExist as e:
                return Response(
                    {'error': f'Unsupported currency code: {str(e).split()[-1]}'},
                    status=status.HTTP_400_BAD_REQUEST
                )

            result = AdvancedCurrencyService.convert_with_arbitrage_check(
                amount_decimal, from_currency, to_currency
            )

            return Response(result)

        except Exception as e:
            return Response(
                {'error': f'Currency conversion failed: {str(e)}'},
                status=status.HTTP_500_INTERNAL_SERVER_ERROR
            )

    @action(detail=False, methods=['get'])
    def arbitrage_opportunities(self, request):
        """
        Get current arbitrage opportunities across providers
        Query params:
        - base_currency: Base currency code (default: USD)
        - min_spread: Minimum spread percentage (default: 1.0)
        """
        try:
            base_currency = request.query_params.get('base_currency', 'USD').upper()
            min_spread = float(request.query_params.get('min_spread', 1.0))

            # Get multi-provider data
            multi_provider_data = AdvancedCurrencyService.get_multi_provider_rates(base_currency)

            # Filter opportunities by minimum spread
            opportunities = [
                opp for opp in multi_provider_data['arbitrage_opportunities']
                if opp['spread_percentage'] >= min_spread
            ]

            return Response({
                'base_currency': base_currency,
                'min_spread_percentage': min_spread,
                'opportunities': opportunities,
                'total_opportunities': len(opportunities),
                'timestamp': multi_provider_data['timestamp']
            })

        except Exception as e:
            return Response(
                {'error': f'Failed to fetch arbitrage opportunities: {str(e)}'},
                status=status.HTTP_500_INTERNAL_SERVER_ERROR
            )

    @action(detail=True, methods=['get'])
    def volatility(self, request, pk=None):
        """
        Get currency volatility metrics
        URL param: currency code
        Query params:
        - days: Analysis period in days (default: 30)
        """
        try:
            currency_code = pk.upper()
            days = int(request.query_params.get('days', 30))

            # Validate currency
            try:
                Currency.objects.get(code=currency_code)
            except Currency.DoesNotExist:
                return Response(
                    {'error': f'Unsupported currency: {currency_code}'},
                    status=status.HTTP_400_BAD_REQUEST
                )

            volatility_data = AdvancedCurrencyService.get_currency_volatility(currency_code, days)

            return Response({
                'currency': currency_code,
                'volatility_data': volatility_data,
                'analysis_period_days': days
            })

        except Exception as e:
            return Response(
                {'error': f'Failed to fetch volatility data: {str(e)}'},
                status=status.HTTP_500_INTERNAL_SERVER_ERROR
            )

    @action(detail=False, methods=['get'])
    def rate_comparison(self, request):
        """
        Compare exchange rates across providers
        Query params:
        - from_currency: Source currency code
        - to_currency: Target currency code
        - amount: Amount to convert (optional)
        """
        try:
            from_currency = request.query_params.get('from_currency', '').upper()
            to_currency = request.query_params.get('to_currency', '').upper()
            amount_str = request.query_params.get('amount')

            if not from_currency or not to_currency:
                return Response(
                    {'error': 'from_currency and to_currency are required'},
                    status=status.HTTP_400_BAD_REQUEST
                )

            # Validate currencies
            try:
                Currency.objects.get(code=from_currency)
                Currency.objects.get(code=to_currency)
            except Currency.DoesNotExist as e:
                return Response(
                    {'error': f'Unsupported currency code: {str(e).split()[-1]}'},
                    status=status.HTTP_400_BAD_REQUEST
                )

            # Get multi-provider data
            multi_provider_data = AdvancedCurrencyService.get_multi_provider_rates(
                from_currency, [to_currency]
            )

            # Prepare comparison
            comparison = {
                'from_currency': from_currency,
                'to_currency': to_currency,
                'providers': {},
                'recommended_rate': multi_provider_data.get('recommended_rate', {}).get(to_currency),
                'arbitrage_available': False,
                'best_rate_provider': None,
                'worst_rate_provider': None
            }

            if multi_provider_data['providers']:
                rates = []
                for provider, rates_data in multi_provider_data['providers'].items():
                    if to_currency in rates_data:
                        rate = rates_data[to_currency]
                        comparison['providers'][provider] = {
                            'rate': rate,
                            'converted_amount': float(Decimal(str(amount_str or 1)) * Decimal(str(rate))) if amount_str else None
                        }
                        rates.append((provider, rate))

                if rates:
                    rates.sort(key=lambda x: x[1], reverse=True)
                    comparison['best_rate_provider'] = rates[0][0]
                    comparison['worst_rate_provider'] = rates[-1][0]

                    # Check for arbitrage
                    if len(rates) >= 2:
                        spread = (rates[0][1] - rates[-1][1]) / rates[-1][1] * 100
                        comparison['arbitrage_available'] = spread > 1.0
                        comparison['spread_percentage'] = spread

            return Response(comparison)

        except Exception as e:
            return Response(
                {'error': f'Failed to compare rates: {str(e)}'},
                status=status.HTTP_500_INTERNAL_SERVER_ERROR
            )

    @action(detail=False, methods=['post'])
    def batch_convert(self, request):
        """
        Convert multiple currency amounts in batch
        Request body:
        [
            {
                "amount": 100.00,
                "from_currency": "USD",
                "to_currency": "EUR"
            },
            ...
        ]
        """
        try:
            conversions = request.data

            if not isinstance(conversions, list):
                return Response(
                    {'error': 'Request body must be a list of conversion requests'},
                    status=status.HTTP_400_BAD_REQUEST
                )

            if len(conversions) > 50:  # Limit batch size
                return Response(
                    {'error': 'Maximum 50 conversions per batch'},
                    status=status.HTTP_400_BAD_REQUEST
                )

            results = []

            for i, conversion in enumerate(conversions):
                try:
                    amount = conversion.get('amount')
                    from_currency = conversion.get('from_currency', '').upper()
                    to_currency = conversion.get('to_currency', '').upper()

                    if not amount or not from_currency or not to_currency:
                        results.append({
                            'index': i,
                            'error': 'amount, from_currency, and to_currency are required'
                        })
                        continue

                    # Validate currencies
                    try:
                        Currency.objects.get(code=from_currency)
                        Currency.objects.get(code=to_currency)
                    except Currency.DoesNotExist as e:
                        results.append({
                            'index': i,
                            'error': f'Unsupported currency: {str(e).split()[-1]}'
                        })
                        continue

                    # Perform conversion
                    result = AdvancedCurrencyService.convert_with_arbitrage_check(
                        Decimal(str(amount)), from_currency, to_currency
                    )

                    results.append({
                        'index': i,
                        'success': True,
                        'result': result
                    })

                except Exception as e:
                    results.append({
                        'index': i,
                        'error': str(e)
                    })

            return Response({
                'total_requests': len(conversions),
                'successful_conversions': len([r for r in results if r.get('success')]),
                'failed_conversions': len([r for r in results if not r.get('success')]),
                'results': results
            })

        except Exception as e:
            return Response(
                {'error': f'Batch conversion failed: {str(e)}'},
                status=status.HTTP_500_INTERNAL_SERVER_ERROR
            )
