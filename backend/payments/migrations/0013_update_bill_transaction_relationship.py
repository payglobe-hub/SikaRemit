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
        # Rename existing transaction_id CharField first to avoid column conflict
        migrations.RenameField(
            model_name='bill',
            old_name='transaction_id',
            new_name='external_transaction_id',
        ),

        # Now add transaction ForeignKey (creates transaction_id column)
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
    ]
