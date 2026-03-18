import logging
from decimal import Decimal
from django.utils import timezone
from django.db.models import Q
from typing import Optional, Dict, Any
from ..models import FeeConfiguration, FeeCalculationLog

logger = logging.getLogger(__name__)

class DynamicFeeCalculator:
    """
    Dynamic fee calculation engine for SikaRemit
    Supports merchant-specific fees, corridor-based pricing, and complex fee structures
    """

    @staticmethod
    def calculate_fee(
        fee_type: str,
        amount: Decimal,
        merchant=None,
        corridor_from: str = None,
        corridor_to: str = None,
        currency: str = 'USD',
        transaction_id: str = None,
        user=None,
        log_calculation: bool = True
    ) -> Dict[str, Any]:
        """
        Calculate fee for a transaction using the most specific applicable fee configuration

        Priority order for fee selection:
        1. Merchant + corridor specific
        2. Merchant + corridor general (null corridor)
        3. Platform + corridor specific
        4. Platform + corridor general (null corridor)
        5. Platform default for fee type

        Args:
            fee_type: Type of fee (remittance, payment, etc.)
            amount: Transaction amount
            merchant: Merchant instance (optional)
            corridor_from: Source country ISO code (optional)
            corridor_to: Destination country ISO code (optional)
            currency: Currency code (default USD)
            transaction_id: Optional transaction ID for logging
            user: User instance for logging
            log_calculation: Whether to log the calculation

        Returns:
            Dict with fee calculation result
        """

        try:
            # Find applicable fee configurations
            fee_config = DynamicFeeCalculator._find_applicable_fee_config(
                fee_type, merchant, corridor_from, corridor_to, currency
            )

            if not fee_config:
                # Fallback to legacy hardcoded fees for backward compatibility
                logger.warning(f"No fee configuration found for {fee_type}, using legacy calculation")
                return DynamicFeeCalculator._legacy_fee_calculation(fee_type, amount, corridor_from, corridor_to)

            # Calculate the fee
            result = fee_config.calculate_fee(amount, currency)

            if not result.success:
                logger.error(f"Fee calculation failed: {result.error}")
                return {
                    'success': False,
                    'error': result.error,
                    'total_fee': 0,
                    'fee_config_id': fee_config.id,
                }

            # Log the calculation if requested
            if log_calculation and transaction_id:
                DynamicFeeCalculator._log_calculation(
                    fee_type, transaction_id, amount, fee_config, result, merchant, user, corridor_from, corridor_to, currency
                )

            return {
                'success': True,
                'total_fee': result.fee_amount,
                'fee_config_id': fee_config.id,
                'fee_config_name': fee_config.name,
                'calculation_method': fee_config.calculation_method,
                'breakdown': result.breakdown,
                'merchant_specific': fee_config.merchant is not None,
            }

        except Exception as e:
            logger.error(f"Fee calculation error for {fee_type}: {str(e)}")
            return {
                'success': False,
                'error': f"Calculation error: {str(e)}",
                'total_fee': 0,
            }

    @staticmethod
    def _find_applicable_fee_config(fee_type, merchant, corridor_from, corridor_to, currency):
        """
        Find the most specific applicable fee configuration
        Uses a priority system to select the best match
        """

        current_time = timezone.now()

        # Build query conditions - don't filter by currency to allow GHS configs to apply to all transactions
        base_conditions = Q(
            fee_type=fee_type,
            is_active=True,
            effective_from__lte=current_time,
        ) & (Q(effective_to__isnull=True) | Q(effective_to__gte=current_time))

        # Priority 1: Merchant + specific corridor
        if merchant and corridor_from and corridor_to:
            config = FeeConfiguration.objects.filter(
                base_conditions &
                Q(merchant=merchant) &
                Q(corridor_from=corridor_from) &
                Q(corridor_to=corridor_to)
            ).first()
            if config:
                return config

        # Priority 2: Merchant + general corridor (either direction null)
        if merchant:
            config = FeeConfiguration.objects.filter(
                base_conditions &
                Q(merchant=merchant) &
                (Q(corridor_from__isnull=True) | Q(corridor_to__isnull=True) |
                 (Q(corridor_from=corridor_from) & Q(corridor_to__isnull=True)) |
                 (Q(corridor_from__isnull=True) & Q(corridor_to=corridor_to)))
            ).first()
            if config:
                return config

        # Priority 3: Platform + specific corridor
        if corridor_from and corridor_to:
            config = FeeConfiguration.objects.filter(
                base_conditions &
                Q(merchant__isnull=True) &
                Q(corridor_from=corridor_from) &
                Q(corridor_to=corridor_to)
            ).first()
            if config:
                return config

        # Priority 4: Platform + general corridor
        config = FeeConfiguration.objects.filter(
            base_conditions &
            Q(merchant__isnull=True) &
            (Q(corridor_from__isnull=True) | Q(corridor_to__isnull=True) |
             (Q(corridor_from=corridor_from) & Q(corridor_to__isnull=True)) |
             (Q(corridor_from__isnull=True) & Q(corridor_to=corridor_to)))
        ).first()
        if config:
            return config

        # Priority 5: Platform default for fee type
        return FeeConfiguration.objects.filter(
            base_conditions &
            Q(merchant__isnull=True) &
            Q(corridor_from__isnull=True) &
            Q(corridor_to__isnull=True) &
            Q(is_platform_default=True)
        ).first()

    @staticmethod
    def _legacy_fee_calculation(fee_type, amount, corridor_from, corridor_to):
        """
        Fallback to legacy hardcoded fee calculation for backward compatibility
        """
        from django.conf import settings

        if fee_type == 'remittance':
            base_fee = getattr(settings, 'REMITTANCE_FEE_BASE', Decimal('5.00'))
            percentage_fee = getattr(settings, 'REMITTANCE_FEE_PERCENTAGE', Decimal('0.025'))
            fee_amount = base_fee + (amount * percentage_fee)

            return {
                'success': True,
                'total_fee': fee_amount,
                'fee_config_id': None,
                'fee_config_name': 'Legacy Remittance Fee',
                'calculation_method': 'percentage',
                'breakdown': {
                    'calculation_method': 'percentage',
                    'fixed_fee': base_fee,
                    'percentage_fee': percentage_fee,
                    'percentage_amount': amount * percentage_fee,
                },
                'merchant_specific': False,
            }

        # Default fallback
        return {
            'success': True,
            'fee_amount': Decimal('0'),
            'fee_config_id': None,
            'fee_config_name': 'No Fee',
            'calculation_method': 'fixed',
            'breakdown': {},
            'merchant_specific': False,
        }

    @staticmethod
    def _log_calculation(fee_type, transaction_id, amount, fee_config, result, merchant, user, corridor_from, corridor_to, currency):
        """
        Log the fee calculation for audit purposes
        """
        try:
            FeeCalculationLog.objects.create(
                transaction_type=fee_type,
                transaction_id=str(transaction_id),
                amount=amount,
                fee_configuration=fee_config,
                calculated_fee=result.fee_amount,
                breakdown=result.breakdown,
                merchant=merchant,
                user=user,
                corridor_from=corridor_from,
                corridor_to=corridor_to,
                currency=currency,
            )
        except Exception as e:
            logger.error(f"Failed to log fee calculation: {str(e)}")

    @staticmethod
    def get_fee_preview(fee_type, amount, merchant=None, corridor_from=None, corridor_to=None, currency='USD'):
        """
        Get fee preview without logging (for UI display)
        """
        return DynamicFeeCalculator.calculate_fee(
            fee_type, amount, merchant, corridor_from, corridor_to, currency,
            log_calculation=False
        )

    @staticmethod
    def validate_fee_config(fee_config: FeeConfiguration) -> Dict[str, Any]:
        """
        Validate a fee configuration for logical consistency
        """
        errors = []
        warnings = []

        # Check percentage limits
        if fee_config.percentage_fee > Decimal('1'):
            errors.append("Percentage fee cannot exceed 100%")

        # Check min/max fee logic
        if fee_config.min_fee and fee_config.max_fee and fee_config.min_fee > fee_config.max_fee:
            errors.append("Minimum fee cannot be greater than maximum fee")

        # Check amount limits
        if fee_config.min_transaction_amount and fee_config.max_transaction_amount:
            if fee_config.min_transaction_amount > fee_config.max_transaction_amount:
                errors.append("Minimum transaction amount cannot be greater than maximum")

        # Check effective dates
        if fee_config.effective_from and fee_config.effective_to:
            if fee_config.effective_from > fee_config.effective_to:
                errors.append("Effective from date cannot be after effective to date")

        # Warnings for unusual configurations
        if fee_config.percentage_fee > Decimal('0.1'):  # 10%
            warnings.append("Percentage fee is unusually high (>10%)")

        if fee_config.fixed_fee > Decimal('100'):
            warnings.append("Fixed fee is unusually high (>$100)")

        return {
            'valid': len(errors) == 0,
            'errors': errors,
            'warnings': warnings,
        }

    @staticmethod
    def get_merchant_fee_summary(merchant):
        """
        Get summary of all fee configurations for a merchant
        """
        configs = FeeConfiguration.objects.filter(
            Q(merchant=merchant) | Q(merchant__isnull=True, is_platform_default=True),
            is_active=True
        ).select_related('merchant')

        summary = {}
        for config in configs:
            if config.fee_type not in summary:
                summary[config.fee_type] = []

            summary[config.fee_type].append({
                'id': config.id,
                'name': config.name,
                'merchant_specific': config.merchant is not None,
                'corridor': f"{config.corridor_from or 'ALL'} → {config.corridor_to or 'ALL'}",
                'calculation_method': config.calculation_method,
                'fixed_fee': config.fixed_fee,
                'percentage_fee': config.percentage_fee,
                'effective_from': config.effective_from,
                'effective_to': config.effective_to,
            })

        return summary

    @staticmethod
    def bulk_calculate_fees(transactions: list) -> list:
        """
        Calculate fees for multiple transactions efficiently
        """
        results = []
        for transaction in transactions:
            result = DynamicFeeCalculator.calculate_fee(**transaction)
            results.append(result)
        return results
