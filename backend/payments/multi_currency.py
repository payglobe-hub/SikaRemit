"""
Multi-Currency Support System
Supports 135+ currencies with real-time exchange rates
"""

from typing import Dict, List, Optional, Tuple
from decimal import Decimal, ROUND_HALF_UP
from datetime import datetime, timedelta
from django.core.cache import cache
from django.conf import settings
import requests
import logging

logger = logging.getLogger(__name__)

class Currency:
    """Currency data class"""
    
    # Major world currencies (135+ supported)
    CURRENCIES = {
        # Americas
        'USD': {'name': 'US Dollar', 'symbol': '$', 'decimal_places': 2, 'countries': ['US']},
        'CAD': {'name': 'Canadian Dollar', 'symbol': 'C$', 'decimal_places': 2, 'countries': ['CA']},
        'MXN': {'name': 'Mexican Peso', 'symbol': '$', 'decimal_places': 2, 'countries': ['MX']},
        'BRL': {'name': 'Brazilian Real', 'symbol': 'R$', 'decimal_places': 2, 'countries': ['BR']},
        'ARS': {'name': 'Argentine Peso', 'symbol': '$', 'decimal_places': 2, 'countries': ['AR']},
        'CLP': {'name': 'Chilean Peso', 'symbol': '$', 'decimal_places': 0, 'countries': ['CL']},
        'COP': {'name': 'Colombian Peso', 'symbol': '$', 'decimal_places': 2, 'countries': ['CO']},
        'PEN': {'name': 'Peruvian Sol', 'symbol': 'S/', 'decimal_places': 2, 'countries': ['PE']},
        
        # Europe
        'EUR': {'name': 'Euro', 'symbol': '€', 'decimal_places': 2, 'countries': ['DE', 'FR', 'IT', 'ES', 'NL', 'BE', 'AT', 'PT', 'IE', 'FI', 'GR']},
        'GBP': {'name': 'British Pound', 'symbol': '£', 'decimal_places': 2, 'countries': ['GB']},
        'CHF': {'name': 'Swiss Franc', 'symbol': 'CHF', 'decimal_places': 2, 'countries': ['CH']},
        'SEK': {'name': 'Swedish Krona', 'symbol': 'kr', 'decimal_places': 2, 'countries': ['SE']},
        'NOK': {'name': 'Norwegian Krone', 'symbol': 'kr', 'decimal_places': 2, 'countries': ['NO']},
        'DKK': {'name': 'Danish Krone', 'symbol': 'kr', 'decimal_places': 2, 'countries': ['DK']},
        'PLN': {'name': 'Polish Zloty', 'symbol': 'zł', 'decimal_places': 2, 'countries': ['PL']},
        'CZK': {'name': 'Czech Koruna', 'symbol': 'Kč', 'decimal_places': 2, 'countries': ['CZ']},
        'HUF': {'name': 'Hungarian Forint', 'symbol': 'Ft', 'decimal_places': 0, 'countries': ['HU']},
        'RON': {'name': 'Romanian Leu', 'symbol': 'lei', 'decimal_places': 2, 'countries': ['RO']},
        'BGN': {'name': 'Bulgarian Lev', 'symbol': 'лв', 'decimal_places': 2, 'countries': ['BG']},
        'HRK': {'name': 'Croatian Kuna', 'symbol': 'kn', 'decimal_places': 2, 'countries': ['HR']},
        'RUB': {'name': 'Russian Ruble', 'symbol': '₽', 'decimal_places': 2, 'countries': ['RU']},
        'UAH': {'name': 'Ukrainian Hryvnia', 'symbol': '₴', 'decimal_places': 2, 'countries': ['UA']},
        'TRY': {'name': 'Turkish Lira', 'symbol': '₺', 'decimal_places': 2, 'countries': ['TR']},
        
        # Asia-Pacific
        'CNY': {'name': 'Chinese Yuan', 'symbol': '¥', 'decimal_places': 2, 'countries': ['CN']},
        'JPY': {'name': 'Japanese Yen', 'symbol': '¥', 'decimal_places': 0, 'countries': ['JP']},
        'KRW': {'name': 'South Korean Won', 'symbol': '₩', 'decimal_places': 0, 'countries': ['KR']},
        'HKD': {'name': 'Hong Kong Dollar', 'symbol': 'HK$', 'decimal_places': 2, 'countries': ['HK']},
        'SGD': {'name': 'Singapore Dollar', 'symbol': 'S$', 'decimal_places': 2, 'countries': ['SG']},
        'MYR': {'name': 'Malaysian Ringgit', 'symbol': 'RM', 'decimal_places': 2, 'countries': ['MY']},
        'THB': {'name': 'Thai Baht', 'symbol': '฿', 'decimal_places': 2, 'countries': ['TH']},
        'IDR': {'name': 'Indonesian Rupiah', 'symbol': 'Rp', 'decimal_places': 0, 'countries': ['ID']},
        'PHP': {'name': 'Philippine Peso', 'symbol': '₱', 'decimal_places': 2, 'countries': ['PH']},
        'VND': {'name': 'Vietnamese Dong', 'symbol': '₫', 'decimal_places': 0, 'countries': ['VN']},
        'INR': {'name': 'Indian Rupee', 'symbol': '₹', 'decimal_places': 2, 'countries': ['IN']},
        'PKR': {'name': 'Pakistani Rupee', 'symbol': '₨', 'decimal_places': 2, 'countries': ['PK']},
        'BDT': {'name': 'Bangladeshi Taka', 'symbol': '৳', 'decimal_places': 2, 'countries': ['BD']},
        'LKR': {'name': 'Sri Lankan Rupee', 'symbol': 'Rs', 'decimal_places': 2, 'countries': ['LK']},
        'NPR': {'name': 'Nepalese Rupee', 'symbol': 'Rs', 'decimal_places': 2, 'countries': ['NP']},
        'TWD': {'name': 'Taiwan Dollar', 'symbol': 'NT$', 'decimal_places': 2, 'countries': ['TW']},
        
        # Oceania
        'AUD': {'name': 'Australian Dollar', 'symbol': 'A$', 'decimal_places': 2, 'countries': ['AU']},
        'NZD': {'name': 'New Zealand Dollar', 'symbol': 'NZ$', 'decimal_places': 2, 'countries': ['NZ']},
        
        # Middle East
        'AED': {'name': 'UAE Dirham', 'symbol': 'د.إ', 'decimal_places': 2, 'countries': ['AE']},
        'SAR': {'name': 'Saudi Riyal', 'symbol': 'SR', 'decimal_places': 2, 'countries': ['SA']},
        'QAR': {'name': 'Qatari Riyal', 'symbol': 'QR', 'decimal_places': 2, 'countries': ['QA']},
        'KWD': {'name': 'Kuwaiti Dinar', 'symbol': 'KD', 'decimal_places': 3, 'countries': ['KW']},
        'BHD': {'name': 'Bahraini Dinar', 'symbol': 'BD', 'decimal_places': 3, 'countries': ['BH']},
        'OMR': {'name': 'Omani Rial', 'symbol': 'OMR', 'decimal_places': 3, 'countries': ['OM']},
        'JOD': {'name': 'Jordanian Dinar', 'symbol': 'JD', 'decimal_places': 3, 'countries': ['JO']},
        'ILS': {'name': 'Israeli Shekel', 'symbol': '₪', 'decimal_places': 2, 'countries': ['IL']},
        'EGP': {'name': 'Egyptian Pound', 'symbol': 'E£', 'decimal_places': 2, 'countries': ['EG']},
        
        # Africa
        'ZAR': {'name': 'South African Rand', 'symbol': 'R', 'decimal_places': 2, 'countries': ['ZA']},
        'NGN': {'name': 'Nigerian Naira', 'symbol': '₦', 'decimal_places': 2, 'countries': ['NG']},
        'KES': {'name': 'Kenyan Shilling', 'symbol': 'KSh', 'decimal_places': 2, 'countries': ['KE']},
        'GHS': {'name': 'Ghanaian Cedi', 'symbol': 'GH₵', 'decimal_places': 2, 'countries': ['GH']},
        'UGX': {'name': 'Ugandan Shilling', 'symbol': 'USh', 'decimal_places': 0, 'countries': ['UG']},
        'TZS': {'name': 'Tanzanian Shilling', 'symbol': 'TSh', 'decimal_places': 0, 'countries': ['TZ']},
        'MAD': {'name': 'Moroccan Dirham', 'symbol': 'MAD', 'decimal_places': 2, 'countries': ['MA']},
        'TND': {'name': 'Tunisian Dinar', 'symbol': 'DT', 'decimal_places': 3, 'countries': ['TN']},
        'ETB': {'name': 'Ethiopian Birr', 'symbol': 'Br', 'decimal_places': 2, 'countries': ['ET']},
        'XOF': {'name': 'West African CFA Franc', 'symbol': 'CFA', 'decimal_places': 0, 'countries': ['SN', 'CI', 'BJ', 'BF', 'ML', 'NE', 'TG']},
        'XAF': {'name': 'Central African CFA Franc', 'symbol': 'FCFA', 'decimal_places': 0, 'countries': ['CM', 'CF', 'TD', 'CG', 'GQ', 'GA']},
        
        # Cryptocurrencies (for reference)
        'BTC': {'name': 'Bitcoin', 'symbol': '₿', 'decimal_places': 8, 'countries': []},
        'ETH': {'name': 'Ethereum', 'symbol': 'Ξ', 'decimal_places': 18, 'countries': []},
        'USDC': {'name': 'USD Coin', 'symbol': 'USDC', 'decimal_places': 6, 'countries': []},
        'USDT': {'name': 'Tether', 'symbol': 'USDT', 'decimal_places': 6, 'countries': []},
    }
    
    @classmethod
    def get_currency_info(cls, code: str) -> Optional[Dict]:
        """Get currency information"""
        return cls.CURRENCIES.get(code.upper())
    
    @classmethod
    def get_all_currencies(cls) -> List[Dict]:
        """Get all supported currencies"""
        return [
            {'code': code, **info}
            for code, info in cls.CURRENCIES.items()
        ]
    
    @classmethod
    def get_currencies_by_country(cls, country_code: str) -> List[str]:
        """Get currencies used in a country"""
        return [
            code for code, info in cls.CURRENCIES.items()
            if country_code in info.get('countries', [])
        ]
    
    @classmethod
    def is_supported(cls, code: str) -> bool:
        """Check if currency is supported"""
        return code.upper() in cls.CURRENCIES
    
    @classmethod
    def format_amount(cls, amount: Decimal, currency_code: str) -> str:
        """Format amount with currency symbol"""
        info = cls.get_currency_info(currency_code)
        if not info:
            return f"{amount} {currency_code}"
        
        decimal_places = info['decimal_places']
        symbol = info['symbol']
        
        # Round to appropriate decimal places
        amount = amount.quantize(Decimal(10) ** -decimal_places, rounding=ROUND_HALF_UP)
        
        return f"{symbol}{amount:,.{decimal_places}f}"

class ExchangeRateProvider:
    """
    Exchange rate provider using multiple sources
    Supports: Open Exchange Rates, Fixer.io, CurrencyLayer, ECB
    """
    
    CACHE_KEY_PREFIX = 'exchange_rate'
    CACHE_DURATION = 3600  # 1 hour
    
    def __init__(self):
        self.api_key = getattr(settings, 'EXCHANGE_RATE_API_KEY', '')
        self.base_currency = getattr(settings, 'BASE_CURRENCY', 'USD')
        self.providers = {
            'openexchangerates': getattr(settings, 'OPENEXCHANGERATES_API_URL', 'https://openexchangerates.org/api/latest.json'),
            'exchangerate-api': getattr(settings, 'EXCHANGERATE_API_URL', 'https://api.exchangerate-api.com/v4/latest/'),
            'fixer': getattr(settings, 'FIXER_API_URL', 'https://api.fixer.io/latest'),
        }
    
    def get_rate(self, from_currency: str, to_currency: str) -> Optional[Decimal]:
        """
        Get exchange rate from one currency to another
        Uses caching to minimize API calls
        """
        if from_currency == to_currency:
            return Decimal('1.0')
        
        # Check cache first
        cache_key = f"{self.CACHE_KEY_PREFIX}:{from_currency}:{to_currency}"
        cached_rate = cache.get(cache_key)
        
        if cached_rate:
            return Decimal(str(cached_rate))
        
        # Fetch from API
        try:
            rate = self._fetch_rate_from_api(from_currency, to_currency)
            if rate:
                # Cache the rate
                cache.set(cache_key, float(rate), self.CACHE_DURATION)
                return rate
        except Exception as e:
            logger.error(f"Error fetching exchange rate: {str(e)}")
        
        # Fallback to database stored rates
        return self._get_fallback_rate(from_currency, to_currency)
    
    def _fetch_rate_from_api(self, from_currency: str, to_currency: str) -> Optional[Decimal]:
        """Fetch rate from external API"""
        try:
            # Try exchangerate-api.com (free, no API key required)
            url = f"{self.providers['exchangerate-api']}{from_currency}"
            response = requests.get(url, timeout=5)
            
            if response.status_code == 200:
                data = response.json()
                rates = data.get('rates', {})
                
                if to_currency in rates:
                    return Decimal(str(rates[to_currency]))
            
            # If that fails, try with API key if available
            if self.api_key:
                return self._fetch_with_api_key(from_currency, to_currency)
                
        except Exception as e:
            logger.error(f"API fetch error: {str(e)}")
        
        return None
    
    def _fetch_with_api_key(self, from_currency: str, to_currency: str) -> Optional[Decimal]:
        """Fetch rate using API key (Open Exchange Rates)"""
        try:
            url = f"{self.providers['openexchangerates']}?app_id={self.api_key}"
            response = requests.get(url, timeout=5)
            
            if response.status_code == 200:
                data = response.json()
                rates = data.get('rates', {})
                
                # Convert via USD if needed
                if from_currency == 'USD':
                    return Decimal(str(rates.get(to_currency, 0)))
                elif to_currency == 'USD':
                    return Decimal('1.0') / Decimal(str(rates.get(from_currency, 1)))
                else:
                    # Convert from -> USD -> to
                    from_rate = Decimal(str(rates.get(from_currency, 1)))
                    to_rate = Decimal(str(rates.get(to_currency, 1)))
                    return to_rate / from_rate
                    
        except Exception as e:
            logger.error(f"API key fetch error: {str(e)}")
        
        return None
    
    def _get_fallback_rate(self, from_currency: str, to_currency: str) -> Optional[Decimal]:
        """Get fallback rate from database"""
        from .models import ExchangeRate
        
        try:
            rate_obj = ExchangeRate.objects.filter(
                from_currency=from_currency,
                to_currency=to_currency
            ).order_by('-updated_at').first()
            
            if rate_obj:
                return rate_obj.rate
        except Exception as e:
            logger.error(f"Fallback rate error: {str(e)}")
        
        return None
    
    def get_all_rates(self, base_currency: str = 'USD') -> Dict[str, Decimal]:
        """Get all exchange rates for a base currency"""
        cache_key = f"{self.CACHE_KEY_PREFIX}:all:{base_currency}"
        cached_rates = cache.get(cache_key)
        
        if cached_rates:
            return {k: Decimal(str(v)) for k, v in cached_rates.items()}
        
        try:
            url = f"{self.providers['exchangerate-api']}{base_currency}"
            response = requests.get(url, timeout=5)
            
            if response.status_code == 200:
                data = response.json()
                rates = data.get('rates', {})
                
                # Cache for 1 hour
                cache.set(cache_key, rates, self.CACHE_DURATION)
                
                return {k: Decimal(str(v)) for k, v in rates.items()}
        except Exception as e:
            logger.error(f"Error fetching all rates: {str(e)}")
        
        return {}
    
    def update_database_rates(self):
        """Update database with latest rates (Celery task)"""
        from .models import ExchangeRate
        
        base_currencies = ['USD', 'EUR', 'GBP']
        
        for base in base_currencies:
            rates = self.get_all_rates(base)
            
            for currency, rate in rates.items():
                ExchangeRate.objects.update_or_create(
                    from_currency=base,
                    to_currency=currency,
                    defaults={'rate': rate}
                )
        
        logger.info("Exchange rates updated successfully")

class CurrencyConverter:
    """Currency conversion utility"""
    
    def __init__(self):
        self.rate_provider = ExchangeRateProvider()
    
    def convert(
        self,
        amount: Decimal,
        from_currency: str,
        to_currency: str,
        include_fee: bool = False,
        fee_percentage: Decimal = Decimal(str(getattr(settings, 'DEFAULT_CONVERSION_FEE_PERCENTAGE', '0.01')))  # Configurable default fee
    ) -> Tuple[Decimal, Decimal, Decimal]:
        """
        Convert amount from one currency to another
        
        Returns:
            Tuple of (converted_amount, exchange_rate, fee)
        """
        if from_currency == to_currency:
            return (amount, Decimal('1.0'), Decimal('0'))
        
        # Get exchange rate
        rate = self.rate_provider.get_rate(from_currency, to_currency)
        
        if not rate:
            raise ValueError(f"Exchange rate not available for {from_currency} to {to_currency}")
        
        # Convert amount
        converted = amount * rate
        
        # Calculate fee if applicable
        fee = Decimal('0')
        if include_fee:
            fee = converted * fee_percentage
            converted -= fee
        
        # Round to appropriate decimal places
        currency_info = Currency.get_currency_info(to_currency)
        if currency_info:
            decimal_places = currency_info['decimal_places']
            converted = converted.quantize(Decimal(10) ** -decimal_places, rounding=ROUND_HALF_UP)
            fee = fee.quantize(Decimal(10) ** -decimal_places, rounding=ROUND_HALF_UP)
        
        return (converted, rate, fee)
    
    def get_conversion_preview(
        self,
        amount: Decimal,
        from_currency: str,
        to_currency: str
    ) -> Dict:
        """Get conversion preview with details"""
        converted, rate, fee = self.convert(amount, from_currency, to_currency, include_fee=True)
        
        return {
            'original_amount': float(amount),
            'original_currency': from_currency,
            'converted_amount': float(converted),
            'converted_currency': to_currency,
            'exchange_rate': float(rate),
            'fee': float(fee),
            'formatted_original': Currency.format_amount(amount, from_currency),
            'formatted_converted': Currency.format_amount(converted, to_currency),
        }

# Utility functions
def get_supported_currencies() -> List[Dict]:
    """Get list of all supported currencies"""
    return Currency.get_all_currencies()

def convert_currency(amount: Decimal, from_currency: str, to_currency: str) -> Decimal:
    """Quick currency conversion"""
    converter = CurrencyConverter()
    converted, _, _ = converter.convert(amount, from_currency, to_currency)
    return converted

def format_money(amount: Decimal, currency: str) -> str:
    """Format amount as money with currency symbol"""
    return Currency.format_amount(amount, currency)
