from django.core.cache import cache
from datetime import timedelta
import random
import logging

logger = logging.getLogger(__name__)

def generate_mobile_verification(phone: str) -> dict:
    """
    Generates and stores verification code
    Returns: {
        code: str,
        expires_in: int (seconds)
    }
    """
    code = str(random.randint(100000, 999999))
    expires = int(timedelta(minutes=15).total_seconds())
    
    cache.set(
        key=f'mobile_verify:{phone}',
        value=code,
        timeout=expires
    )
    
    logger.info(f"Generated mobile verification code for {phone}")
    return {
        'code': code,
        'expires_in': expires
    }

def verify_mobile_payment(phone: str, code: str) -> bool:
    """
    Verifies mobile payment code
    Returns bool indicating success
    """
    cached_code = cache.get(f'mobile_verify:{phone}')
    
    if not cached_code:
        logger.warning(f"No verification code found for {phone}")
        return False
        
    if cached_code != code:
        logger.warning(f"Invalid verification code for {phone}")
        return False
        
    cache.delete(f'mobile_verify:{phone}')
    logger.info(f"Successfully verified payment for {phone}")
    return True
