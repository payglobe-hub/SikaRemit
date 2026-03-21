from django.http import JsonResponse
from django.views.decorators.http import require_GET
from django.views.decorators.csrf import csrf_exempt
from django.contrib.auth.decorators import login_required
from ..gateway_hierarchy import gateway_registry
import json
import logging

logger = logging.getLogger(__name__)

@require_GET
@login_required
def get_available_payment_methods(request):
    """
    API endpoint to get available payment methods organized by category
    Returns hierarchical payment methods for the frontend
    """
    try:
        # Get all available methods organized by category
        available_methods = gateway_registry.get_all_available_methods()

        # Get user's wallet balance if available
        wallet_balance = 0
        wallet_currency = 'GHS'

        try:
            from .models import WalletBalance
            # Get the user's primary wallet balance (USD or default)
            user_wallet = WalletBalance.objects.filter(
                user=request.user,
                currency__code='USD'
            ).first()
            
            if user_wallet:
                wallet_balance = float(user_wallet.available_balance)
                wallet_currency = user_wallet.currency.code
            else:
                # Try to get any wallet balance
                user_wallet = WalletBalance.objects.filter(user=request.user).first()
                if user_wallet:
                    wallet_balance = float(user_wallet.available_balance)
                    wallet_currency = user_wallet.currency.code
        except Exception as e:
            logger.warning(f"Could not get wallet balance for user {request.user}: {e}")
            pass

        # Add SikaRemit balance as first option if user has balance
        if wallet_balance > 0:
            sikaRemit_balance_data = {
                'type': 'sikaRemit_balance',
                'display_name': f'SikaRemit Balance ({wallet_balance:.2f} {wallet_currency})',
                'icon': '💰',
                'description': f'Pay instantly with your SikaRemit account balance ({wallet_balance:.2f} {wallet_currency} available)',
                'available_gateways': ['sikaRemit_balance'],
                'primary_gateway': 'sikaRemit_balance',
                'processing_time': 'Instant',
                'fees': 'Free',
                'limits': {
                    'min': 0.01,
                    'max': wallet_balance
                }
            }

            # Add to sikaRemit_balance category or create it
            if 'sikaRemit_balance' not in available_methods:
                available_methods['sikaRemit_balance'] = [sikaRemit_balance_data]
            else:
                available_methods['sikaRemit_balance'].insert(0, sikaRemit_balance_data)

        return JsonResponse({
            'success': True,
            'data': available_methods
        })

    except Exception as e:
        return JsonResponse({
            'success': False,
            'error': str(e)
        }, status=500)
