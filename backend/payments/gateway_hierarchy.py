"""
SikaRemit Payment Gateway Hierarchy
Implements the new hierarchical payment structure:
- Major Gateways (comprehensive payment processors)
- Specialized Gateways (single-purpose implementations)
- Priority-based gateway selection for reliability
"""

from typing import Dict, List, Optional, Any, Tuple
from enum import Enum
from django.conf import settings
import logging
from dataclasses import dataclass

logger = logging.getLogger(__name__)

class GatewayType(Enum):
    """Types of payment gateways"""
    MAJOR = 'major'  # Comprehensive payment processors (Stripe, etc.)
    SPECIALIZED = 'specialized'  # Single-purpose gateways (MTN direct, etc.)

class GatewayPriority(Enum):
    """Priority levels for gateway selection"""
    PRIMARY = 1  # First choice for reliability
    SECONDARY = 2  # Backup option
    TERTIARY = 3  # Last resort
    SPECIALIZED = 4  # Specific use cases only

class PaymentMethodCategory(Enum):
    """Payment method categories for user display"""
    SIKAREMIT_BALANCE = 'sikaRemit_balance'
    CREDIT_DEBIT_CARDS = 'credit_debit_cards'
    BANK_TRANSFERS = 'bank_transfers'
    MOBILE_MONEY_GHANA = 'mobile_money_ghana'
    QR_CODE = 'qr_code'

@dataclass
class GatewayConfig:
    """Configuration for a payment gateway"""
    name: str
    type: GatewayType
    priority: GatewayPriority
    supported_methods: List[str]
    description: str
    requires_config: List[str]  # Required environment variables
    is_active: bool = False

@dataclass
class PaymentMethodMapping:
    """Mapping of payment methods to available gateways"""
    method_type: str
    category: PaymentMethodCategory
    display_name: str
    available_gateways: List[str]  # Gateway names that support this method
    icon: str
    description: str

class GatewayHierarchyRegistry:
    """
    Registry implementing the new hierarchical payment gateway structure
    """

    # Gateway configurations
    GATEWAYS = {
        # Major Gateways - Comprehensive payment processors
        'stripe': GatewayConfig(
            name='stripe',
            type=GatewayType.MAJOR,
            priority=GatewayPriority.PRIMARY,
            supported_methods=['card', 'digital_wallet', 'international'],
            description='Global payment processor with extensive international support',
            requires_config=['STRIPE_SECRET_KEY', 'STRIPE_PUBLISHABLE_KEY']
        ),

        # Specialized Gateways - Single-purpose implementations
        'mtn_momo': GatewayConfig(
            name='mtn_momo',
            type=GatewayType.SPECIALIZED,
            priority=GatewayPriority.SECONDARY,
            supported_methods=['mtn_momo'],
            description='Direct MTN Mobile Money integration',
            requires_config=['MTN_MOMO_API_KEY', 'MTN_MOMO_API_URL']
        ),

        'telecel': GatewayConfig(
            name='telecel',
            type=GatewayType.SPECIALIZED,
            priority=GatewayPriority.SECONDARY,
            supported_methods=['telecel'],
            description='Direct Telecel Cash integration',
            requires_config=['TELECEL_API_KEY', 'TELECEL_API_URL']
        ),

        'airtel_tigo': GatewayConfig(
            name='airtel_tigo',
            type=GatewayType.SPECIALIZED,
            priority=GatewayPriority.SECONDARY,
            supported_methods=['airtel_tigo'],
            description='Direct AirtelTigo Money integration',
            requires_config=['AIRTEL_API_KEY', 'AIRTEL_API_URL']
        ),

        'bank_transfer': GatewayConfig(
            name='bank_transfer',
            type=GatewayType.SPECIALIZED,
            priority=GatewayPriority.SECONDARY,
            supported_methods=['bank_transfer'],
            description='Direct bank transfer processing',
            requires_config=['BANK_TRANSFER_API_KEY']
        ),

        'sikaRemit_balance': GatewayConfig(
            name='sikaRemit_balance',
            type=GatewayType.MAJOR,
            priority=GatewayPriority.PRIMARY,
            supported_methods=['sikaRemit_balance'],
            description='Internal SikaRemit account balance for instant payments',
            requires_config=[]  # No external config needed
        ),

        'qr_payment': GatewayConfig(
            name='qr_payment',
            type=GatewayType.SPECIALIZED,
            priority=GatewayPriority.SECONDARY,
            supported_methods=['qr_code'],
            description='QR code scanning for instant merchant payments',
            requires_config=[]  # Uses existing QR scanner
        ),

        'g_money': GatewayConfig(
            name='g_money',
            type=GatewayType.MAJOR,
            priority=GatewayPriority.PRIMARY,
            supported_methods=['mtn_momo', 'telecel', 'airtel_tigo', 'mobile_money'],
            description='GCB Bank G-Money - Complete Ghana mobile money ecosystem with 1.2% fees',
            requires_config=['G_MONEY_API_KEY', 'G_MONEY_API_SECRET', 'G_MONEY_API_URL', 'G_MONEY_WEBHOOK_SECRET']
        ),
    }

    # Payment method mappings
    PAYMENT_METHODS = {
        'card': PaymentMethodMapping(
            method_type='card',
            category=PaymentMethodCategory.CREDIT_DEBIT_CARDS,
            display_name='Credit/Debit Cards',
            available_gateways=['stripe'],
            icon='💳',
            description='Visa, Mastercard, and other international cards'
        ),

        'bank_transfer': PaymentMethodMapping(
            method_type='bank_transfer',
            category=PaymentMethodCategory.BANK_TRANSFERS,
            display_name='Bank Transfer',
            available_gateways=['bank_transfer'],
            icon='🏦',
            description='Direct bank account transfers'
        ),

        'mtn_momo': PaymentMethodMapping(
            method_type='mtn_momo',
            category=PaymentMethodCategory.MOBILE_MONEY_GHANA,
            display_name='MTN Mobile Money',
            available_gateways=['mtn_momo'],
            icon='📱',
            description='MTN Mobile Money payments'
        ),

        'airtel_tigo': PaymentMethodMapping(
            method_type='airtel_tigo',
            category=PaymentMethodCategory.MOBILE_MONEY_GHANA,
            display_name='AirtelTigo Money',
            available_gateways=['airtel_tigo'],
            icon='📱',
            description='AirtelTigo Money payments'
        ),

        'telecel': PaymentMethodMapping(
            method_type='telecel',
            category=PaymentMethodCategory.MOBILE_MONEY_GHANA,
            display_name='Telecel Cash',
            available_gateways=['telecel', 'g_money'],
            icon='📱',
            description='Telecel Cash payments via G-Money ecosystem'
        ),

        'qr_code': PaymentMethodMapping(
            method_type='qr_code',
            category=PaymentMethodCategory.QR_CODE,
            display_name='QR Code Payment',
            available_gateways=['qr_payment'],
            icon='📱',
            description='Scan QR codes to pay merchants'
        ),
    }

    def __init__(self):
        self._active_gateways = {}
        self._initialize_gateways()

    def _initialize_gateways(self):
        """Initialize and validate available gateways"""
        for gateway_name, config in self.GATEWAYS.items():
            if self._check_gateway_config(config):
                config.is_active = True
                self._active_gateways[gateway_name] = config
                logger.info(f"Gateway '{gateway_name}' activated")
            else:
                logger.info(f"Gateway '{gateway_name}' disabled - missing configuration")

    def _check_gateway_config(self, config: GatewayConfig) -> bool:
        """Check if gateway has all required configuration"""
        for env_var in config.requires_config:
            # Check for both missing attribute and empty string value
            value = getattr(settings, env_var, None)
            if value is None or value == '':
                return False
        return True

    def get_gateway_for_method(self, method_type: str, preferred_gateway: str = None) -> Optional[str]:
        """
        Get the best available gateway for a payment method
        Uses priority-based selection with fallback
        """
        if method_type not in self.PAYMENT_METHODS:
            return None

        method_config = self.PAYMENT_METHODS[method_type]
        available_gateways = [g for g in method_config.available_gateways if g in self._active_gateways]

        if not available_gateways:
            return None

        # If preferred gateway is specified and available, use it
        if preferred_gateway and preferred_gateway in available_gateways:
            return preferred_gateway

        # Otherwise, select by priority
        return self._select_by_priority(available_gateways)

    def _select_by_priority(self, gateway_names: List[str]) -> str:
        """Select gateway with highest priority (lowest priority number)"""
        gateway_priorities = {}
        for name in gateway_names:
            if name in self._active_gateways:
                priority = self._active_gateways[name].priority.value
                gateway_priorities[name] = priority

        # Return gateway with lowest priority number (highest priority)
        return min(gateway_priorities, key=gateway_priorities.get)

    def get_available_methods_for_category(self, category: PaymentMethodCategory) -> List[Dict[str, Any]]:
        """Get available payment methods for a category"""
        methods = []
        for method_type, method_config in self.PAYMENT_METHODS.items():
            if method_config.category == category:
                available_gateways = [g for g in method_config.available_gateways if g in self._active_gateways]
                if available_gateways:
                    methods.append({
                        'type': method_type,
                        'display_name': method_config.display_name,
                        'icon': method_config.icon,
                        'description': method_config.description,
                        'available_gateways': available_gateways,
                        'primary_gateway': self.get_gateway_for_method(method_type)
                    })

        return methods

    def get_all_available_methods(self) -> Dict[str, List[Dict[str, Any]]]:
        """Get all available payment methods organized by category"""
        result = {}
        for category in PaymentMethodCategory:
            methods = self.get_available_methods_for_category(category)
            if methods:
                result[category.value] = methods

        return result

    def get_gateway_info(self, gateway_name: str) -> Optional[Dict[str, Any]]:
        """Get information about a specific gateway"""
        if gateway_name not in self._active_gateways:
            return None

        config = self._active_gateways[gateway_name]
        return {
            'name': config.name,
            'type': config.type.value,
            'priority': config.priority.value,
            'supported_methods': config.supported_methods,
            'description': config.description,
            'is_active': config.is_active
        }

# Global registry instance
gateway_registry = GatewayHierarchyRegistry()
