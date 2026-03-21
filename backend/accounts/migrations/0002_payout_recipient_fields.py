# Generated migration for adding recipient fields to Payout model

from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ('accounts', '0001_initial'),
    ]

    operations = [
        migrations.AddField(
            model_name='payout',
            name='recipient_name',
            field=models.CharField(
                blank=True, 
                max_length=100, 
                null=True, 
                help_text='Full name of the payout recipient'
            ),
        ),
        migrations.AddField(
            model_name='payout',
            name='recipient_email',
            field=models.EmailField(
                blank=True, 
                max_length=254, 
                null=True, 
                help_text='Email address for notifications and verification'
            ),
        ),
        migrations.AddIndex(
            model_name='payout',
            index=models.Index(fields=['recipient_email'], name='accounts_payout_recipient_email_idx'),
        ),
    ]
