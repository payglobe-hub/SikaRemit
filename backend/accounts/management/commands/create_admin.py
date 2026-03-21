from django.core.management.base import BaseCommand, CommandError
from django.contrib.auth import get_user_model
from django.core.exceptions import ValidationError

CustomUser = get_user_model()

class Command(BaseCommand):
    help = 'Create an admin user account'

    def add_arguments(self, parser):
        parser.add_argument('email', type=str, help='Email address for the admin user')
        parser.add_argument('first_name', type=str, help='First name of the admin user')
        parser.add_argument('last_name', type=str, help='Last name of the admin user')
        parser.add_argument('--password', type=str, help='Password for the admin user (optional, will prompt if not provided)')
        parser.add_argument('--superuser', action='store_true', help='Create a superuser instead of regular admin')

    def handle(self, *args, **options):
        email = options['email']
        first_name = options['first_name']
        last_name = options['last_name']
        password = options.get('password')
        is_superuser = options['superuser']

        # Check if user already exists
        if CustomUser.objects.filter(email=email).exists():
            raise CommandError(f'User with email {email} already exists.')

        # Prompt for password if not provided
        if not password:
            import getpass
            password = getpass.getpass('Enter password for admin user: ')
            if not password:
                raise CommandError('Password is required.')

        try:
            # Create admin user
            user = CustomUser.objects.create_user(
                email=email,
                password=password,
                first_name=first_name,
                last_name=last_name,
                user_type=1,  # Admin
                is_staff=True,
                is_superuser=is_superuser,
                is_active=True,
                is_verified=True
            )

            user_type = "superuser" if is_superuser else "admin"
            self.stdout.write(
                self.style.SUCCESS(
                    f'Successfully created {user_type} user: {email}\n'
                    f'User ID: {user.id}'
                )
            )

        except ValidationError as e:
            raise CommandError(f'Validation error: {e}')
        except Exception as e:
            raise CommandError(f'Error creating admin user: {e}')
