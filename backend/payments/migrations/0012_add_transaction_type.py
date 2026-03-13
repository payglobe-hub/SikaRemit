"""
Add transaction_type field to Transaction model
"""

from django.db import migrations, models
import django.db.models.deletion


class Migration(migrations.Migration):

    dependencies = [
        ('payments', '0011_merge_20260211_0242'),
    ]

    operations = [
        # Add transaction_type field with default value
        migrations.AddField(
            model_name='transaction',
            name='transaction_type',
            field=models.CharField(
                max_length=20,
                choices=[
                    ('payment', 'Payment'),
                    ('transfer', 'Transfer'),
                    ('remittance', 'Remittance'),
                    ('bill_payment', 'Bill Payment'),
                    ('airtime', 'Airtime Purchase'),
                    ('data_bundle', 'Data Bundle Purchase'),
                    ('wallet_topup', 'Wallet Top-up'),
                    ('merchant_payment', 'Merchant Payment'),
                    ('refund', 'Refund'),
                    ('fee', 'Fee Payment'),
                ],
                default='payment',
            ),
        ),
    ]
