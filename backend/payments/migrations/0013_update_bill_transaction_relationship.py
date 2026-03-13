"""
Update Bill model to add transaction relationship and remove deprecated fields
"""

from django.db import migrations, models
import django.db.models.deletion


class Migration(migrations.Migration):

    dependencies = [
        ('payments', '0012_add_transaction_type'),
    ]

    operations = [
        # Add transaction relationship to Bill model
        migrations.AddField(
            model_name='bill',
            name='transaction',
            field=models.ForeignKey(
                'payments.Transaction',
                on_delete=models.SET_NULL,
                null=True,
                blank=True,
                related_name='bill_payments'
            ),
        ),
        
        # Rename transaction_id to external_transaction_id for backward compatibility
        migrations.RenameField(
            model_name='bill',
            old_name='transaction_id',
            new_name='external_transaction_id',
        ),
    ]
