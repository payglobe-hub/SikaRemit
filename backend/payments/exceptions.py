"""
Custom exceptions for payment processing
Provides specific error types for better error handling and user feedback
"""

from rest_framework import status
from rest_framework.exceptions import APIException


class PaymentException(APIException):
    """Base exception for all payment-related errors"""
    status_code = status.HTTP_400_BAD_REQUEST
    default_detail = "Payment processing error occurred"
    default_code = "payment_error"


class PaymentGatewayException(PaymentException):
    """Exception raised when payment gateway fails"""
    status_code = status.HTTP_503_SERVICE_UNAVAILABLE
    default_detail = "Payment gateway service is temporarily unavailable"
    default_code = "payment_gateway_error"


class InsufficientFundsException(PaymentException):
    """Exception raised when insufficient funds for transaction"""
    status_code = status.HTTP_402_PAYMENT_REQUIRED
    default_detail = "Insufficient funds for this transaction"
    default_code = "insufficient_funds"


class InvalidPaymentMethodException(PaymentException):
    """Exception raised when payment method is invalid or not supported"""
    status_code = status.HTTP_400_BAD_REQUEST
    default_detail = "Invalid or unsupported payment method"
    default_code = "invalid_payment_method"


class TransactionLimitExceededException(PaymentException):
    """Exception raised when transaction limits are exceeded"""
    status_code = status.HTTP_400_BAD_REQUEST
    default_detail = "Transaction limit exceeded"
    default_code = "transaction_limit_exceeded"


class KYCRequiredException(PaymentException):
    """Exception raised when KYC verification is required"""
    status_code = status.HTTP_403_FORBIDDEN
    default_detail = "KYC verification required to complete this transaction"
    default_code = "kyc_required"


class DuplicateTransactionException(PaymentException):
    """Exception raised when duplicate transaction is detected"""
    status_code = status.HTTP_409_CONFLICT
    default_detail = "Duplicate transaction detected"
    default_code = "duplicate_transaction"


class PaymentTimeoutException(PaymentException):
    """Exception raised when payment processing times out"""
    status_code = status.HTTP_408_REQUEST_TIMEOUT
    default_detail = "Payment processing timed out"
    default_code = "payment_timeout"


class CurrencyNotSupportedException(PaymentException):
    """Exception raised when currency is not supported"""
    status_code = status.HTTP_400_BAD_REQUEST
    default_detail = "Currency not supported"
    default_code = "currency_not_supported"


class MerchantNotVerifiedException(PaymentException):
    """Exception raised when merchant is not verified"""
    status_code = status.HTTP_403_FORBIDDEN
    default_detail = "Merchant account not verified"
    default_code = "merchant_not_verified"


class FraudDetectionException(PaymentException):
    """Exception raised when fraud is detected"""
    status_code = status.HTTP_403_FORBIDDEN
    default_detail = "Transaction flagged for potential fraud"
    default_code = "fraud_detected"


class RateLimitExceededException(PaymentException):
    """Exception raised when rate limits are exceeded"""
    status_code = status.HTTP_429_TOO_MANY_REQUESTS
    default_detail = "Rate limit exceeded. Please try again later."
    default_code = "rate_limit_exceeded"


class WebhookVerificationException(PaymentException):
    """Exception raised when webhook signature verification fails"""
    status_code = status.HTTP_401_UNAUTHORIZED
    default_detail = "Webhook signature verification failed"
    default_code = "webhook_verification_failed"


class InvalidAmountException(PaymentException):
    """Exception raised when amount is invalid"""
    status_code = status.HTTP_400_BAD_REQUEST
    default_detail = "Invalid amount specified"
    default_code = "invalid_amount"


class AccountSuspendedException(PaymentException):
    """Exception raised when user account is suspended"""
    status_code = status.HTTP_403_FORBIDDEN
    default_detail = "Account is suspended"
    default_code = "account_suspended"


class ComplianceViolationException(PaymentException):
    """Exception raised when compliance rules are violated"""
    status_code = status.HTTP_403_FORBIDDEN
    default_detail = "Transaction violates compliance rules"
    default_code = "compliance_violation"
