from django.core.management.base import BaseCommand, CommandError
from users.models import User, Customer
from shared.constants import USER_TYPE_CUSTOMER


class Command(BaseCommand):
    help = 'Create a test customer user account'

    def handle(self, *args, **options):
        email = 'customer@test.com'
        password = 'TestPass123!'

        try:
            user = User.objects.filter(email=email).first()
            if user:
                user.username = email
                user.first_name = 'Jane'
                user.last_name = 'Customer'
                user.user_type = USER_TYPE_CUSTOMER
                user.is_active = True
                user.is_verified = True
                user.set_password(password)
                user.save()
            else:
                user = User.objects.create_user(
                    username=email,
                    email=email,
                    password=password,
                    first_name='Jane',
                    last_name='Customer',
                    user_type=USER_TYPE_CUSTOMER,
                    is_verified=True,
                )

            if hasattr(user, 'customer_profile'):
                customer = user.customer_profile
                customer.save()
            else:
                customer = Customer.objects.create(user=user)

            self.stdout.write(
                self.style.SUCCESS(
                    f'Successfully created test customer account:\n'
                    f'Email: {email}\n'
                    f'Password: {password}\n'
                    f'User ID: {user.id}\n'
                    f'Customer ID: {customer.id}'
                )
            )

        except Exception as e:
            raise CommandError(f'Error creating customer: {e}')
