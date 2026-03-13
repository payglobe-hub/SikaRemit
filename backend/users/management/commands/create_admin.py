from django.core.management.base import BaseCommand
from django.contrib.auth import get_user_model
from shared.constants import USER_TYPE_SUPER_ADMIN


class Command(BaseCommand):
    help = 'Create an admin user for SikaRemit'

    def add_arguments(self, parser):
        parser.add_argument('--email', type=str, required=True, help='Admin email address')
        parser.add_argument('--password', type=str, required=True, help='Admin password')
        parser.add_argument('--first_name', type=str, required=True, help='Admin first name')
        parser.add_argument('--last_name', type=str, required=True, help='Admin last name')

    def handle(self, *args, **options):
        User = get_user_model()
        
        email = options['email']
        password = options['password']
        first_name = options['first_name']
        last_name = options['last_name']
        
        if User.objects.filter(email=email).exists():
            self.stdout.write(self.style.WARNING(f'User with email {email} already exists'))
            user = User.objects.get(email=email)
            user.set_password(password)
            user.user_type = USER_TYPE_SUPER_ADMIN
            user.is_staff = True
            user.is_superuser = True
            user.is_verified = True
            user.save()
            self.stdout.write(self.style.SUCCESS(f'Updated existing user to admin: {email}'))
        else:
            user = User.objects.create_user(
                email=email,
                password=password,
                first_name=first_name,
                last_name=last_name,
                user_type=USER_TYPE_ADMIN,
                is_staff=True,
                is_superuser=True,
                is_verified=True,
            )
            self.stdout.write(self.style.SUCCESS(f'Successfully created admin user: {email}'))
        
        self.stdout.write(self.style.SUCCESS(f'\n=== Admin Credentials ==='))
        self.stdout.write(self.style.SUCCESS(f'Email: {email}'))
        self.stdout.write(self.style.SUCCESS(f'Password: {password}'))
        self.stdout.write(self.style.WARNING(f'\nPlease change this password after first login!'))
