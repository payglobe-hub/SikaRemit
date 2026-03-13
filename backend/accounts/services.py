from django.contrib.auth import get_user_model
from django.contrib.auth.hashers import make_password
from rest_framework_simplejwt.tokens import RefreshToken
from rest_framework.exceptions import ValidationError
from users.models import Customer, Merchant
from shared.constants import (
    USER_TYPE_SUPER_ADMIN, USER_TYPE_BUSINESS_ADMIN, USER_TYPE_OPERATIONS_ADMIN,
    USER_TYPE_VERIFICATION_ADMIN, USER_TYPE_MERCHANT, USER_TYPE_CUSTOMER,
    ADMIN_HIERARCHY_LEVELS
)
from accounts.models import BlacklistedToken, Session
from django.utils import timezone
from django.conf import settings
from .models import AdminActivity
from payments.models.transaction import Transaction as PaymentTransaction
from payments.models.payment_log import PaymentLog
import stripe
from .tasks import send_payment_receipt
import logging
import time
import requests

logger = logging.getLogger(__name__)
from django.core.cache import cache
import json
from .mfa import MFAService

User = get_user_model()

class AuthService:
    @staticmethod
    def auto_identify_user_type(email, current_user_type=None):
        """
        Auto-identify user type based on email patterns and other attributes.
        
        SECURITY: Admin accounts can ONLY be created via Django admin or management commands.
        Public registration always defaults to Customer.
        """
        if current_user_type in ADMIN_HIERARCHY_LEVELS:
            logger.warning(f"Attempted admin registration blocked for email: {email}")
            return USER_TYPE_CUSTOMER
        
        if current_user_type in [USER_TYPE_MERCHANT, USER_TYPE_CUSTOMER]:
            return current_user_type

        return USER_TYPE_CUSTOMER

    @staticmethod
    def get_user_type_display_info(user_type):
        """
        Get display information for user types including labels, colors, and icons
        """
        type_info = {
            USER_TYPE_SUPER_ADMIN: {
                'label': 'Super Admin',
                'color': '#dc2626',
                'bgColor': '#fef2f2',
                'icon': '👑',
                'description': 'Full system access'
            },
            USER_TYPE_BUSINESS_ADMIN: {
                'label': 'Business Admin',
                'color': '#ea580c',
                'bgColor': '#fff7ed',
                'icon': '📊',
                'description': 'KYC, compliance, risk'
            },
            USER_TYPE_OPERATIONS_ADMIN: {
                'label': 'Operations Admin',
                'color': '#9333ea',
                'bgColor': '#faf5ff',
                'icon': '🛠️',
                'description': 'Customer support'
            },
            USER_TYPE_VERIFICATION_ADMIN: {
                'label': 'Verification Admin',
                'color': '#0891b2',
                'bgColor': '#ecfeff',
                'icon': '✅',
                'description': 'Document verification'
            },
            USER_TYPE_MERCHANT: {
                'label': 'Merchant',
                'color': '#2563eb',
                'bgColor': '#eff6ff',
                'icon': '🏪',
                'description': 'Business operations'
            },
            USER_TYPE_CUSTOMER: {
                'label': 'Customer',
                'color': '#16a34a',
                'bgColor': '#f0fdf4',
                'icon': '👤',
                'description': 'End user'
            }
        }
        return type_info.get(user_type, {
            'label': 'Unknown',
            'color': '#6b7280',  # gray-500
            'bgColor': '#f9fafb',  # gray-50
            'icon': '❓',
            'description': 'Unknown type'
        })

    @staticmethod
    def create_user(email, password, user_type, **extra_fields):
        """User registration with role-specific profile creation"""
        from django.db import transaction
        
        if User.objects.filter(email=email).exists():
            raise ValidationError('User with this email already exists')
            
        # Set username to email if not provided
        username = extra_fields.pop('username', None) or email
        
        # Ensure phone is always provided (default to empty string)
        phone = extra_fields.pop('phone', '')
        
        with transaction.atomic():
            user = User.objects.create_user(
                username=username,
                email=email,
                password=password,
                user_type=user_type,
                phone=phone,
                **extra_fields
            )
            
            # Create role-specific profile
            if user_type == USER_TYPE_MERCHANT:  # merchant
                Merchant.objects.create(user=user)
            elif user_type == USER_TYPE_CUSTOMER:  # customer
                # Check if Customer already exists (defensive programming)
                if not hasattr(user, 'customer_profile'):
                    Customer.objects.create(user=user)
                    
        return user

    @staticmethod
    def get_tokens_for_user(user):
        """Generate JWT tokens with custom claims"""
        try:
            refresh = RefreshToken.for_user(user)
            
            # Map user_type to role for frontend compatibility
            role_mapping = {
                USER_TYPE_SUPER_ADMIN: 'super_admin',
                USER_TYPE_BUSINESS_ADMIN: 'business_admin',
                USER_TYPE_OPERATIONS_ADMIN: 'operations_admin',
                USER_TYPE_VERIFICATION_ADMIN: 'verification_admin',
                USER_TYPE_MERCHANT: 'merchant',
                USER_TYPE_CUSTOMER: 'customer',
            }
            
            return {
                'refresh': str(refresh),
                'access': str(refresh.access_token),
                'user_id': user.id,
                'user_type': user.user_type,
                'role': role_mapping.get(user.user_type, 'customer'),
                'is_verified': user.is_verified,
                'expires_in': 900
            }
        except Exception as e:
            logger.error(f"Failed to generate tokens for user {user.email if user else 'unknown'}: {str(e)}")
            raise e

    @staticmethod
    def refresh_tokens(refresh_token):
        """Refresh JWT tokens"""
        try:
            refresh = RefreshToken(refresh_token)
            user = refresh.user
            
            role_mapping = {
                USER_TYPE_SUPER_ADMIN: 'super_admin',
                USER_TYPE_BUSINESS_ADMIN: 'business_admin',
                USER_TYPE_OPERATIONS_ADMIN: 'operations_admin',
                USER_TYPE_VERIFICATION_ADMIN: 'verification_admin',
                USER_TYPE_MERCHANT: 'merchant',
                USER_TYPE_CUSTOMER: 'customer',
            }
            
            return {
                'refresh': str(refresh),
                'access': str(refresh.access_token),
                'user_id': user.id,
                'user_type': user.user_type,
                'role': role_mapping.get(user.user_type, 'customer'),
                'is_verified': user.is_verified,
                'expires_in': 900  # 15 minutes in seconds
            }
        except Exception as e:
            raise ValidationError('Invalid refresh token')

    @staticmethod
    def verify_mobile_money_webhook(payload, signature, provider):
        """Verify mobile money webhook signature"""
        import hmac
        import hashlib
        
        if provider not in ['mtn', 'telecel', 'airtel_tigo']:
            raise ValidationError('Invalid provider')
            
        # Parse payload if it's bytes
        if isinstance(payload, bytes):
            payload = json.loads(payload.decode('utf-8'))
        
        secret = getattr(settings, 'MOBILE_MONEY_WEBHOOK_SECRET', None)
        if not secret:
            logger.error("MOBILE_MONEY_WEBHOOK_SECRET is not configured — rejecting webhook")
            raise ValidationError('Webhook verification unavailable: secret not configured')
        expected_signature = hmac.new(
            secret.encode(),
            json.dumps(payload, sort_keys=True).encode(),
            hashlib.sha256
        ).hexdigest()
        
        if not hmac.compare_digest(signature, expected_signature):
            raise ValidationError('Invalid signature')
            
        return payload

    @staticmethod
    def validate_login(email, password):
        user = User.objects.filter(email=email).first()
        
        if not user:
            raise ValidationError('Invalid credentials')
            
        if user.auth_provider != 'email':
            raise ValidationError(f'Please login using {user.auth_provider}')
            
        if not user.check_password(password):
            logger.warning(f"Failed login attempt for email: {email}")
            raise ValidationError('Invalid credentials')
            
        if user.mfa_enabled:
            raise ValidationError('mfa_required')
            
        return user

    @staticmethod
    def get_account_balance(user):
        """Get account balance for user from WalletBalance model"""
        from payments.models.currency import WalletBalance, Currency
        try:
            default_currency_code = getattr(settings, 'DEFAULT_CURRENCY', 'GHS')
            wallet = WalletBalance.objects.filter(
                user=user,
                currency__code=default_currency_code
            ).select_related('currency').first()

            if wallet:
                return {
                    'available': float(wallet.available_balance),
                    'pending': float(wallet.pending_balance),
                    'currency': wallet.currency.code,
                    'lastUpdated': wallet.last_updated.isoformat()
                }

            return {
                'available': 0.00,
                'pending': 0.00,
                'currency': default_currency_code,
                'lastUpdated': timezone.now().isoformat()
            }
        except Exception as e:
            logger.error(f'Error getting account balance for user {user.id}: {str(e)}')
            return {
                'available': 0.00,
                'pending': 0.00,
                'currency': 'GHS',
                'lastUpdated': timezone.now().isoformat()
            }
    
    @staticmethod
    def has_concurrent_sessions(user):
        """
        Check if user has concurrent active sessions.
        Returns True if user has more than one active session.
        """
        from django.contrib.sessions.models import Session
        from django.utils import timezone
        
        try:
            # Get all active sessions
            active_sessions = Session.objects.filter(
                expire_date__gte=timezone.now()
            )
            
            # Count sessions for this user
            user_sessions = 0
            for session in active_sessions:
                session_data = session.get_decoded()
                if session_data.get('_auth_user_id') == str(user.id):
                    user_sessions += 1
                    
            # Concurrent if more than 1 active session
            return user_sessions > 1
            
        except Exception as e:
            logger.error(f'Error checking concurrent sessions for user {user.id}: {str(e)}')
            return False
    
    @staticmethod
    def test_session_functionality(request):
        """
        Test session functionality for debugging purposes.
        Returns session information and diagnostics.
        """
        from django.contrib.sessions.models import Session
        from django.utils import timezone
        
        try:
            user = request.user if request.user.is_authenticated else None
            session_key = request.session.session_key
            
            # Get session info
            session_info = {
                'session_key': session_key,
                'is_authenticated': request.user.is_authenticated,
                'user_id': user.id if user else None,
                'user_email': user.email if user else None,
                'session_data': dict(request.session.items()) if session_key else {},
            }
            
            # Count active sessions
            if user:
                active_sessions = Session.objects.filter(
                    expire_date__gte=timezone.now()
                )
                user_session_count = sum(
                    1 for s in active_sessions 
                    if s.get_decoded().get('_auth_user_id') == str(user.id)
                )
                session_info['user_active_sessions'] = user_session_count
                session_info['has_concurrent_sessions'] = user_session_count > 1
            
            # Total active sessions
            total_active = Session.objects.filter(
                expire_date__gte=timezone.now()
            ).count()
            session_info['total_active_sessions'] = total_active
            
            return session_info
            
        except Exception as e:
            logger.error(f'Error testing session functionality: {str(e)}')
            return {
                'error': str(e),
                'session_test': 'failed'
            }

    @staticmethod
    def setup_mfa(user):
        """Setup Multi-Factor Authentication for user"""
        try:
            # Check if user already has MFA enabled
            if user.mfa_enabled:
                raise ValidationError('MFA is already enabled for this user')

            # Generate TOTP secret
            secret = MFAService.generate_secret(user)

            # Generate OTP URI for authenticator apps
            otp_uri = MFAService.get_otp_uri(user, secret)

            # Generate QR code
            qr_code = MFAService.generate_qr_code(otp_uri)

            return {
                'secret': secret,
                'otp_uri': otp_uri,
                'qr_code': qr_code.decode('latin-1') if qr_code else None,
                'message': 'Scan the QR code with your authenticator app to set up 2FA'
            }
        except Exception as e:
            logger.error(f'Error setting up MFA for user {user.email}: {str(e)}')
            raise ValidationError(f'Failed to setup MFA: {str(e)}')

    @staticmethod
    def blacklist_token(token, user=None):
        """Add a JWT token to the blacklist"""
        try:
            # Decode the token to get expiration time
            refresh_token = RefreshToken(token)
            expires_at = refresh_token.payload.get('exp')
            
            if expires_at:
                expires_at = timezone.datetime.fromtimestamp(expires_at, tz=timezone.utc)
            else:
                # Default to 7 days from now if no expiration found
                expires_at = timezone.now() + timezone.timedelta(days=7)
            
            # Get user from token if not provided
            if not user:
                user = refresh_token.user
            
            # Add to blacklist
            BlacklistedToken.blacklist_token(token, user, expires_at)
            
            logger.info(f'Token blacklisted for user {user.email}')
            return True
            
        except Exception as e:
            logger.error(f'Error blacklisting token: {str(e)}')
            return False
    
    @staticmethod
    def is_token_blacklisted(token):
        """Check if a JWT token is blacklisted"""
        try:
            return BlacklistedToken.is_blacklisted(token)
        except Exception as e:
            logger.error(f'Error checking if token is blacklisted: {str(e)}')
            return False
    
    @staticmethod
    def invalidate_user_sessions(user, exclude_session_key=None):
        """Invalidate all sessions for a user except optionally one session"""
        try:
            invalidated_count = Session.invalidate_user_sessions(user, exclude_session_key)
            logger.info(f'Invalidated {invalidated_count} sessions for user {user.email}')
            return invalidated_count
        except Exception as e:
            logger.error(f'Error invalidating user sessions: {str(e)}')
            return 0
    
    @staticmethod
    def create_user_session(user, refresh_token, ip_address, user_agent='', device_id=''):
        """Create a new user session with JWT token"""
        try:
            # Decode refresh token to get expiration
            refresh_obj = RefreshToken(refresh_token)
            expires_at = timezone.datetime.fromtimestamp(
                refresh_obj.payload.get('exp'), 
                tz=timezone.utc
            )
            
            # Generate session key
            import uuid
            session_key = str(uuid.uuid4())
            
            # Create session
            session = Session.create_jwt_session(
                user=user,
                session_key=session_key,
                refresh_token=refresh_token,
                expires_at=expires_at,
                ip_address=ip_address,
                user_agent=user_agent,
                device_id=device_id
            )
            
            logger.info(f'Created session for user {user.email} from {ip_address}')
            return session
            
        except Exception as e:
            logger.error(f'Error creating user session: {str(e)}')
            return None
    
    @staticmethod
    def get_user_active_sessions(user):
        """Get all active sessions for a user"""
        try:
            return Session.get_active_sessions(user)
        except Exception as e:
            logger.error(f'Error getting user active sessions: {str(e)}')
            return []

    @staticmethod
    def generate_tokens(user):
        """Alias for get_tokens_for_user for backward compatibility"""
        return AuthService.get_tokens_for_user(user)

    @staticmethod
    def initiate_password_reset(email):
        """Create a password reset token and send email"""
        import secrets
        from .models import PasswordResetToken

        user = User.objects.filter(email=email).first()
        if not user:
            # Return silently to prevent email enumeration
            logger.info(f"Password reset requested for non-existent email: {email}")
            return

        # Invalidate any existing tokens
        PasswordResetToken.objects.filter(user=user, used=False).update(used=True)

        # Create new token
        token = secrets.token_hex(16)
        expires_at = timezone.now() + timezone.timedelta(hours=1)
        PasswordResetToken.objects.create(
            user=user,
            token=token,
            expires_at=expires_at
        )

        # Send password reset email
        try:
            from django.core.mail import send_mail
            reset_url = f"{getattr(settings, 'FRONTEND_URL', 'http://localhost:3000')}/auth/reset-password?token={token}"
            send_mail(
                subject='SikaRemit - Password Reset Request',
                message=f'Click the link to reset your password: {reset_url}\n\nThis link expires in 1 hour.\n\nIf you did not request this, please ignore this email.',
                from_email=getattr(settings, 'DEFAULT_FROM_EMAIL', 'noreply@sikaremit.com'),
                recipient_list=[email],
                fail_silently=False,
            )
        except Exception as e:
            logger.error(f"Failed to send password reset email to {email}: {str(e)}")
            # Don't raise - token is still valid, user can retry

        logger.info(f"Password reset initiated for {email}")

    @staticmethod
    def complete_password_reset(token, new_password):
        """Complete password reset using token"""
        from .models import PasswordResetToken

        reset_token = PasswordResetToken.objects.filter(
            token=token,
            used=False,
            expires_at__gt=timezone.now()
        ).select_related('user').first()

        if not reset_token:
            raise ValidationError('Invalid or expired reset token')

        # Validate password strength
        is_valid, message = AuthService.validate_password_policy(new_password)
        if not is_valid:
            raise ValidationError(message)

        # Set new password
        user = reset_token.user
        user.set_password(new_password)
        user.save()

        # Mark token as used
        reset_token.used = True
        reset_token.save()

        # Invalidate all sessions for security
        AuthService.invalidate_user_sessions(user)

        logger.info(f"Password reset completed for {user.email}")

    @staticmethod
    def get_password_policy():
        """Return current password policy configuration"""
        return {
            'min_length': 8,
            'require_uppercase': True,
            'require_lowercase': True,
            'require_digit': True,
            'require_special_char': False,
            'max_length': 128,
        }

    @staticmethod
    def validate_password_policy(password):
        """Validate a password against the policy. Returns (is_valid, message)."""
        policy = AuthService.get_password_policy()

        if len(password) < policy['min_length']:
            return False, f"Password must be at least {policy['min_length']} characters"
        if len(password) > policy['max_length']:
            return False, f"Password must be at most {policy['max_length']} characters"
        if policy['require_uppercase'] and not any(c.isupper() for c in password):
            return False, 'Password must contain at least one uppercase letter'
        if policy['require_lowercase'] and not any(c.islower() for c in password):
            return False, 'Password must contain at least one lowercase letter'
        if policy['require_digit'] and not any(c.isdigit() for c in password):
            return False, 'Password must contain at least one digit'
        if policy['require_special_char']:
            import re
            if not re.search(r'[!@#$%^&*(),.?":{}|<>]', password):
                return False, 'Password must contain at least one special character'

        return True, 'Password meets policy requirements'

    @staticmethod
    def logout_user(user):
        """Logout user by invalidating all sessions and blacklisting tokens"""
        try:
            invalidated = AuthService.invalidate_user_sessions(user)
            logger.info(f"Logged out user {user.email}, invalidated {invalidated} sessions")
            return invalidated
        except Exception as e:
            logger.error(f"Error logging out user {user.email}: {str(e)}")
            return 0

    @staticmethod
    def send_email_verification(email):
        """Send email verification link to user"""
        import secrets

        user = User.objects.filter(email=email).first()
        if not user:
            logger.info(f"Email verification requested for non-existent email: {email}")
            return

        if user.is_verified:
            raise ValidationError('Email is already verified')

        # Generate verification token and store in cache
        token = secrets.token_hex(16)
        cache.set(f'email_verify_{token}', user.id, timeout=86400)  # 24 hours

        try:
            from django.core.mail import send_mail
            verify_url = f"{getattr(settings, 'FRONTEND_URL', 'http://localhost:3000')}/auth/verify-email?token={token}"
            send_mail(
                subject='SikaRemit - Verify Your Email',
                message=f'Click the link to verify your email: {verify_url}\n\nThis link expires in 24 hours.',
                from_email=getattr(settings, 'DEFAULT_FROM_EMAIL', 'noreply@sikaremit.com'),
                recipient_list=[email],
                fail_silently=False,
            )
        except Exception as e:
            logger.error(f"Failed to send verification email to {email}: {str(e)}")

        logger.info(f"Email verification sent for {email}")

    @staticmethod
    def verify_email_token(token):
        """Verify email using token"""
        user_id = cache.get(f'email_verify_{token}')
        if not user_id:
            raise ValidationError('Invalid or expired verification token')

        user = User.objects.filter(id=user_id).first()
        if not user:
            raise ValidationError('User not found')

        user.is_verified = True
        user.save()

        # Clean up token
        cache.delete(f'email_verify_{token}')

        logger.info(f"Email verified for {user.email}")

    @staticmethod
    def verify_backup_code(email, verification_code):
        """Verify backup code for account recovery, returns a recovery token"""
        import secrets

        user = User.objects.filter(email=email).first()
        if not user:
            raise ValidationError('Invalid email or backup code')

        # Use MFAService to verify and consume the backup code
        if not MFAService.verify_backup_code(user, verification_code):
            raise ValidationError('Invalid email or backup code')

        # Generate recovery token
        recovery_token = secrets.token_hex(16)
        cache.set(f'recovery_{recovery_token}', user.id, timeout=3600)  # 1 hour

        logger.info(f"Backup code verified for {user.email}")
        return recovery_token


class PaymentService:
    @staticmethod
    def process_subscription_payment(user, plan, payment_token):
        stripe.api_key = settings.STRIPE_SECRET_KEY
        
        # Create customer if not exists
        if not user.stripe_customer_id:
            customer = stripe.Customer.create(
                email=user.email,
                source=payment_token
            )
            user.stripe_customer_id = customer.id
            user.save()
        
        # Create subscription charge
        amount = 2900 if plan == 'standard' else 9900  # in cents
        charge = stripe.Charge.create(
            amount=amount,
            currency='usd',
            customer=user.stripe_customer_id,
            description=f'{plan} subscription'
        )
        
        # Log payment
        PaymentLog.objects.create(
            user=user,
            amount=amount/100,
            plan=plan,
            stripe_charge_id=charge.id
        )
        
        # Set subscription expiry (1 month from now)
        user.subscription_expires = timezone.now() + timezone.timedelta(days=30)
        user.save()
        
        # Log admin activity for merchant upgrades
        if user.user_type == USER_TYPE_MERCHANT:  # merchant
            AdminActivity.objects.create(
                admin=user,
                action_type='SUBSCRIPTION_UPGRADE',
                details=f'Upgraded to {plan} plan'
            )
        
        # Send receipt email async
        send_payment_receipt.delay(user.id, charge.id)
        
        return charge

    @staticmethod
    def process_remittance(payment):
        """Process remittance payment through the cross-border remittance service"""
        payment.status = 'processing'
        payment.save()

        try:
            from payments.services.payment_processing_service import PaymentProcessingService
            processing_service = PaymentProcessingService()

            # Determine the payment method from payment metadata
            payment_method_type = (payment.metadata or {}).get('payment_method', 'mobile_money')
            provider = (payment.metadata or {}).get('provider', 'mtn_momo')

            result = processing_service._process_mobile_payment(
                phone_number=(payment.metadata or {}).get('phone_number', ''),
                amount=float(payment.amount),
                provider=provider,
                currency=payment.currency or 'GHS',
                metadata={'type': 'remittance', 'payment_id': str(payment.id)}
            )

            if result.get('success'):
                payment.status = 'pending'  # Awaiting provider webhook confirmation
                payment.metadata = payment.metadata or {}
                payment.metadata['gateway_transaction_id'] = result.get('transaction_id')
            else:
                payment.status = 'failed'
                payment.metadata = payment.metadata or {}
                payment.metadata['failure_reason'] = result.get('error', 'Remittance processing failed')
            payment.save()

        except Exception as e:
            logger.error(f"Remittance processing failed for payment {payment.id}: {str(e)}")
            payment.status = 'failed'
            payment.metadata = payment.metadata or {}
            payment.metadata['failure_reason'] = str(e)
            payment.save()

        # Send notification
        send_payment_receipt.delay(
            payment.user.id,
            f"REMITTANCE_{payment.id}"
        )

        return payment

    @staticmethod
    def process_bill_payment(payment):
        """Process bill payment through the payment processing service"""
        payment.status = 'processing'
        payment.save()

        # Validate bill due date
        if hasattr(payment, 'bill_due_date') and payment.bill_due_date and payment.bill_due_date < timezone.now().date():
            payment.status = 'failed'
            payment.metadata = payment.metadata or {}
            payment.metadata['failure_reason'] = 'Bill payment is overdue'
            payment.save()
            raise Exception('Bill payment is overdue')

        try:
            from payments.services.payment_processing_service import PaymentProcessingService
            processing_service = PaymentProcessingService()

            provider = (payment.metadata or {}).get('provider', 'mtn_momo')
            phone_number = (payment.metadata or {}).get('phone_number', '')

            result = processing_service._process_mobile_payment(
                phone_number=phone_number,
                amount=float(payment.amount),
                provider=provider,
                currency=payment.currency or 'GHS',
                metadata={'type': 'bill_payment', 'payment_id': str(payment.id)}
            )

            if result.get('success'):
                payment.status = 'pending'  # Awaiting provider webhook confirmation
                payment.metadata = payment.metadata or {}
                payment.metadata['gateway_transaction_id'] = result.get('transaction_id')
            else:
                payment.status = 'failed'
                payment.metadata = payment.metadata or {}
                payment.metadata['failure_reason'] = result.get('error', 'Bill payment failed')
            payment.save()

        except Exception as e:
            logger.error(f"Bill payment processing failed for payment {payment.id}: {str(e)}")
            payment.status = 'failed'
            payment.metadata = payment.metadata or {}
            payment.metadata['failure_reason'] = str(e)
            payment.save()

        # Send notification
        send_payment_receipt.delay(
            payment.user.id,
            f"BILL_{payment.id}"
        )

        return payment

    @staticmethod
    def process_checkout(user, data):
        """Process checkout payment"""
        payment = PaymentLog.objects.create(
            user=user,
            amount=data['amount'],
            payment_type='checkout',
            status='pending'
        )
        
        # Process based on payment method
        if data['payment_method'] == 'CARD':
            return PaymentService._process_card_payment(payment, data)
        elif data['payment_method'] == 'BANK_TRANSFER':
            return PaymentService._process_bank_transfer(payment, data)
        elif data['payment_method'] == 'MOBILE_MONEY':
            return PaymentService._process_mobile_money(payment, data)
        elif data['payment_method'] == 'GOOGLE_PAY':
            return PaymentService._process_google_pay(payment, data)
        elif data['payment_method'] == 'APPLE_PAY':
            return PaymentService._process_apple_pay(payment, data)
        elif data['payment_method'] == 'QR_CODE':
            return PaymentService._process_qr_payment(payment, data)
        else:
            raise ValidationError(f'Unsupported payment method: {data["payment_method"]}')
    
    @staticmethod
    def _validate_mobile_money(number, provider):
        """Strict validation for mobile money numbers"""
        import re
        patterns = {
            'mtn': r'^(0|256)[7-9][0-9]{8}$',
            'airtel': r'^(0|256)[7][0-9]{8}$', 
            'vodafone': r'^(0|256)[5][0-9]{8}$'
        }
        
        if provider.lower() not in patterns:
            raise ValueError(f'Unsupported provider: {provider}')
            
        if not re.match(patterns[provider.lower()], number):
            raise ValueError(f'Invalid {provider} number format')
        
        return True

    @staticmethod
    def convert_currency(amount, from_currency, to_currency):
        """Convert between currencies using exchange rates"""
        if from_currency == to_currency:
            return amount
            
        # Get latest rates (cache for 1 hour)
        rates = cache.get_or_set(
            'currency_rates', 
            lambda: requests.get(settings.EXCHANGE_RATE_API).json(),
            60 * 60
        )
        
        if from_currency not in rates or to_currency not in rates:
            raise ValueError('Unsupported currency')
            
        return amount * rates[to_currency] / rates[from_currency]

    @staticmethod
    def _process_card_payment(payment, data):
        """Process card payment via Stripe"""
        stripe.api_key = settings.STRIPE_SECRET_KEY
        
        try:
            charge = stripe.Charge.create(
                amount=int(data['amount'] * 100),
                currency='usd',
                source=data['payment_token'],
                description=f'Checkout payment #{payment.id}'
            )
            
            payment.stripe_charge_id = charge.id
            payment.status = 'completed'
            payment.save()
            
            # Generate receipt
            payment.redirect_url = f'{settings.FRONTEND_URL}/checkout/success?id={payment.id}'
            payment.save()
            
            return payment
            
        except stripe.error.StripeError as e:
            payment.status = 'failed'
            payment.save()
            raise Exception(f'Card payment failed: {str(e)}')

    @staticmethod
    def _process_mobile_money(payment, data):
        """Process mobile money payment"""
        from .mobile_money import MobileMoneyClient
        
        # Validate number first
        PaymentService._validate_mobile_money(
            data['mobile_money_number'],
            data['mobile_money_provider']
        )
        
        payment.status = 'processing'
        payment.mobile_money_provider = data['mobile_money_provider']
        payment.mobile_money_number = data['mobile_money_number']
        payment.save()
        
        try:
            # Initialize mobile money client
            mm_client = MobileMoneyClient(data['mobile_money_provider'])
            
            # Initiate payment
            response = mm_client.initiate_payment(
                amount=data['amount'],
                phone_number=data['mobile_money_number'],
                reference=f'PAY_{payment.id}'
            )
            
            # Save provider reference
            payment.provider_reference = response.get('transactionId') or response.get('id')
            payment.status = 'pending'
            payment.save()
            
            # Save webhook URL for provider to call
            payment.webhook_url = f"{settings.BASE_URL}/accounts/webhooks/mobile-money/"
            payment.save()
            
            return payment
            
        except Exception as e:
            payment.status = 'failed'
            payment.save()
            raise Exception(f'Mobile money payment failed: {str(e)}')

    @staticmethod
    def _process_bank_transfer(payment, data):
        """Process bank transfer with currency conversion"""
        try:
            # Convert amount if needed
            if data.get('currency') != payment.currency:
                payment.amount = PaymentService.convert_currency(
                    payment.amount,
                    payment.currency,
                    data['currency']
                )
                payment.currency = data['currency']
                payment.save()
            
            from .banking import BankAPIClient
            
            max_retries = 3
            retry_delay = 30  # seconds
            
            for attempt in range(max_retries):
                try:
                    bank_client = BankAPIClient(
                        api_key=settings.BANK_API_KEY,
                        account_number=data['account_number'],
                        routing_number=data['routing_number']
                    )
                    
                    response = bank_client.initiate_transfer(
                        amount=payment.amount,
                        reference=f'PAY_{payment.id}'
                    )
                    
                    payment.provider_reference = response['transaction_id']
                    payment.status = 'pending'
                    payment.save()
                    
                    # Schedule status check
                    check_transfer_status.delay(
                        payment_id=payment.id,
                        provider_ref=response['transaction_id']
                    )
                    
                    return payment
                    
                except Exception as e:
                    if attempt == max_retries - 1:
                        payment.status = 'failed'
                        payment.error = str(e)
                        payment.save()
                        raise
                    
                    time.sleep(retry_delay)

        except Exception as e:
            payment.status = 'failed'
            payment.save()
            raise Exception(f'Bank transfer payment failed: {str(e)}')


    @staticmethod
    def _process_google_pay(payment, data):
        """Process Google Pay via Stripe"""
        stripe.api_key = settings.STRIPE_SECRET_KEY
        
        try:
            # Create PaymentIntent with Google Pay payment method
            intent = stripe.PaymentIntent.create(
                amount=int(data['amount'] * 100),
                currency=data['currency'],
                payment_method_types=['card', 'google_pay'],
                payment_method=data['payment_token'],
                confirmation_method='manual',
                confirm=True
            )
            
            try:
                from django.db import transaction as db_transaction
                with db_transaction.atomic():
                    payment.stripe_payment_intent_id = intent.id
                    payment.status = 'completed'
                    payment.redirect_url = f'{settings.FRONTEND_URL}/checkout/success?id={payment.id}'
                    payment.save()
            except Exception as db_err:
                logger.error(f"DB save failed after Google Pay charge, issuing refund: {db_err}")
                try:
                    stripe.Refund.create(payment_intent=intent.id)
                except Exception as refund_err:
                    logger.critical(
                        f"REFUND ALSO FAILED for Google Pay intent {intent.id}, "
                        f"amount={data['amount']}: {refund_err}"
                    )
                payment.status = 'failed'
                payment.save()
                raise Exception('Google Pay charged but recording failed. Refund initiated.')
            
            return payment
            
        except stripe.error.StripeError as e:
            payment.status = 'failed'
            payment.save()
            raise Exception(f'Google Pay payment failed: {str(e)}')
    
    @staticmethod
    def _process_apple_pay(payment, data):
        """Process Apple Pay via Stripe"""
        stripe.api_key = settings.STRIPE_SECRET_KEY
        
        try:
            # Create PaymentIntent with Apple Pay payment method
            intent = stripe.PaymentIntent.create(
                amount=int(data['amount'] * 100),
                currency=data['currency'],
                payment_method_types=['card', 'apple_pay'],
                payment_method=data['payment_token'],
                confirmation_method='manual',
                confirm=True
            )
            
            try:
                from django.db import transaction as db_transaction
                with db_transaction.atomic():
                    payment.stripe_payment_intent_id = intent.id
                    payment.status = 'completed'
                    payment.redirect_url = f'{settings.FRONTEND_URL}/checkout/success?id={payment.id}'
                    payment.save()
            except Exception as db_err:
                logger.error(f"DB save failed after Apple Pay charge, issuing refund: {db_err}")
                try:
                    stripe.Refund.create(payment_intent=intent.id)
                except Exception as refund_err:
                    logger.critical(
                        f"REFUND ALSO FAILED for Apple Pay intent {intent.id}, "
                        f"amount={data['amount']}: {refund_err}"
                    )
                payment.status = 'failed'
                payment.save()
                raise Exception('Apple Pay charged but recording failed. Refund initiated.')
            
            return payment
            
        except stripe.error.StripeError as e:
            payment.status = 'failed'
            payment.save()
            raise Exception(f'Apple Pay payment failed: {str(e)}')
    
    @staticmethod
    def _process_qr_payment(payment, data):
        """Process QR payment using internal QR gateway"""
        try:
            from payments.gateways.qr import QRPaymentGateway
            
            qr_gateway = QRPaymentGateway()
            result = qr_gateway.process_payment(
                amount=payment.amount,
                currency=payment.currency,
                payment_method=payment.payment_method,
                customer=payment.customer,
                merchant=payment.merchant,
                metadata={'qr_code': data.get('qr_code')}
            )
            
            if not result.get('success'):
                payment.status = 'failed'
                payment.error_message = result.get('error')
                payment.save()
                return payment

            try:
                from django.db import transaction as db_transaction
                with db_transaction.atomic():
                    payment.status = 'completed'
                    payment.transaction_id = result.get('transaction_id')
                    payment.save()
            except Exception as db_err:
                logger.error(f"DB save failed after QR charge, issuing refund: {db_err}")
                try:
                    qr_gateway.refund_payment(
                        transaction_id=result.get('transaction_id'),
                        amount=float(payment.amount),
                        reason='DB save failed after QR charge'
                    )
                except Exception as refund_err:
                    logger.critical(
                        f"REFUND ALSO FAILED for QR payment {payment.id}, "
                        f"gateway_tx={result.get('transaction_id')}, "
                        f"amount={payment.amount}: {refund_err}"
                    )
                raise Exception('Payment charged but recording failed. Refund initiated.')

            return payment
            
        except Exception as e:
            payment.status = 'failed'
            payment.save()
            raise Exception(f'QR payment failed: {str(e)}')


def log_audit_action(action, admin, user=None, metadata=None):
    """
    Log admin actions for audit purposes
    """
    from .models import UserActivity
    
    UserActivity.objects.create(
        user=user,
        event_type=action,
        metadata=metadata or {},
        ip_address=admin.META.get('REMOTE_ADDR') if hasattr(admin, 'META') else None
    )
