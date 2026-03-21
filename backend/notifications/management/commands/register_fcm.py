from django.core.management.base import BaseCommand
from fcm_django.models import FCMDevice
from users.models import User

class Command(BaseCommand):
    help = 'Register FCM device tokens for users'
    
    def handle(self, *args, **options):
        for user in User.objects.all():
            if not FCMDevice.objects.filter(user=user).exists():
                FCMDevice.objects.create(
                    user=user,
                    name=f"{user.email}'s device",
                    type='web',
                    active=True
                )
                self.stdout.write(f"Registered FCM device for {user.email}")
