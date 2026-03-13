from django.core.management.base import BaseCommand, CommandError
from users.models import User, Merchant
from shared.constants import USER_TYPE_MERCHANT

class Command(BaseCommand):
    help = 'Create a test merchant user account'

    def handle(self, *args, **options):
        email = 'merchant@test.com'
        password = 'TestPass123!'

        try:
            # Clean up any existing account
            User.objects.filter(email=email).delete()

            # Create merchant user directly
            user = User.objects.create_user(
                username=email,
                email=email,
                password=password,
                first_name='John',
                last_name='Merchant',
                user_type=USER_TYPE_MERCHANT  # Merchant
            )

            # Update merchant profile (should already exist from signals)
            if hasattr(user, 'merchant_profile'):
                merchant = user.merchant_profile
                merchant.business_name = 'Test Business LLC'
                merchant.tax_id = 'TEST123'
                merchant.is_approved = True
                merchant.save()
            else:
                # Create merchant profile if signals didn't work
                merchant = Merchant.objects.create(
                    user=user,
                    business_name='Test Business LLC',
                    tax_id='TEST123',
                    is_approved=True
                )

            self.stdout.write(
                self.style.SUCCESS(
                    f'Successfully created test merchant account:\n'
                    f'Email: {email}\n'
                    f'Password: {password}\n'
                    f'User ID: {user.id}\n'
                    f'Merchant ID: {merchant.id}'
                )
            )

        except Exception as e:
            raise CommandError(f'Error creating merchant: {e}')
