from django.core.management.base import BaseCommand, CommandError
from users.models import User, Customer
from shared.constants import USER_TYPE_CUSTOMER

class Command(BaseCommand):
    help = 'Create a customer user account with custom credentials'

    def add_arguments(self, parser):
        parser.add_argument('--email', type=str, help='Customer email address')
        parser.add_argument('--password', type=str, help='Customer password')
        parser.add_argument('--first-name', type=str, default='Customer', help='Customer first name')
        parser.add_argument('--last-name', type=str, default='User', help='Customer last name')

    def handle(self, *args, **options):
        # Get credentials from options or use defaults
        base_email = options.get('email', '')
        password = options.get('password', 'CustomerPass123!')
        first_name = options.get('first_name', 'Customer')
        last_name = options.get('last_name', 'User')
        
        # Generate email if not provided
        if not base_email:
            user_count = User.objects.count()
            email = f'customer{user_count + 1}@test.com'
        else:
            email = base_email

        try:
            # Check if user already exists
            existing_user = User.objects.filter(email=email).first()
            if existing_user:
                self.stdout.write(
                    self.style.WARNING(f'User with email {email} already exists')
                )
                user = existing_user
                # Update to customer type if not already
                if user.user_type != USER_TYPE_CUSTOMER:
                    user.user_type = USER_TYPE_CUSTOMER
                    user.save()
                    self.stdout.write(
                        self.style.SUCCESS(f'Updated existing user to customer type')
                    )
            else:
                # Create new user
                user = User.objects.create_user(
                    username=email,
                    email=email,
                    password=password,
                    first_name=first_name,
                    last_name=last_name,
                    user_type=USER_TYPE_CUSTOMER,
                    is_verified=True,
                    is_active=True,
                )
                self.stdout.write(
                    self.style.SUCCESS(f'Created new user: {email}')
                )

            # Create or get customer profile
            if hasattr(user, 'customer_profile'):
                customer = user.customer_profile
                self.stdout.write(
                    self.style.SUCCESS(f'Customer profile already exists')
                )
            else:
                customer = Customer.objects.create(user=user)
                self.stdout.write(
                    self.style.SUCCESS(f'Created customer profile')
                )

            # Display credentials
            self.stdout.write(
                self.style.SUCCESS(
                    f'\n=== Customer User Created ===\n'
                    f'Email: {email}\n'
                    f'Password: {password}\n'
                    f'Name: {first_name} {last_name}\n'
                    f'User Type: Customer (Type {USER_TYPE_CUSTOMER})\n'
                    f'User ID: {user.id}\n'
                    f'Customer ID: {customer.id}\n'
                    f'Is Active: {user.is_active}\n'
                    f'Is Verified: {user.is_verified}\n'
                    f'============================'
                )
            )

        except Exception as e:
            raise CommandError(f'Error creating customer: {e}')
