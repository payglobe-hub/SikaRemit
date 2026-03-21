from django.core.management.base import BaseCommand
from django.utils import timezone
from payments.models.referrals import ReferralCampaign, ReferralCode
from django.contrib.auth import get_user_model

User = get_user_model()

class Command(BaseCommand):
    help = 'Set up default referral campaigns and create referral codes for existing users'

    def handle(self, *args, **options):
        # Create default referral campaign
        campaign, created = ReferralCampaign.objects.get_or_create(
            name='SikaRemit Referral Program',
            defaults={
                'campaign_type': 'signup',
                'referrer_reward_amount': 10.00,  # $10 for referrer
                'referee_reward_amount': 5.00,   # $5 for referee
                'is_active': True,
                'max_rewards_per_user': 50,
                'min_transaction_amount': 1.00,
                'require_kyc': True,
                'require_transaction': True,
                'transaction_threshold': 50.00,  # Must make $50+ transaction
                'start_date': timezone.now(),
            }
        )

        if created:
            self.stdout.write(
                self.style.SUCCESS(f'Created referral campaign: {campaign.name}')
            )
        else:
            self.stdout.write(
                self.style.WARNING(f'Referral campaign already exists: {campaign.name}')
            )

        # Create referral codes for existing users
        users_without_codes = User.objects.filter(referral_code__isnull=True)
        codes_created = 0

        for user in users_without_codes:
            ReferralCode.objects.get_or_create(
                user=user,
                defaults={'code': None}
            )
            codes_created += 1

        if codes_created > 0:
            self.stdout.write(
                self.style.SUCCESS(f'Created referral codes for {codes_created} users')
            )
        else:
            self.stdout.write(
                self.style.SUCCESS('All users already have referral codes')
            )

        self.stdout.write(
            self.style.SUCCESS('Referral system setup completed successfully!')
        )
