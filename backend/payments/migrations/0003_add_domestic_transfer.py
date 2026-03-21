# Generated manually for DomesticTransfer model

from django.db import migrations, models
import django.db.models.deletion


class Migration(migrations.Migration):

    dependencies = [
        ('accounts', '0003_recipient'),
        ('payments', '0002_initial'),
        ('users', '0001_initial'),
    ]

    operations = [
        migrations.CreateModel(
            name='DomesticTransfer',
            fields=[
                ('id', models.AutoField(auto_created=True, primary_key=True, serialize=False, verbose_name='ID')),
                ('amount', models.DecimalField(decimal_places=2, max_digits=12)),
                ('currency', models.CharField(default='GHS', max_length=3)),
                ('status', models.CharField(choices=[('pending', 'Pending'), ('processing', 'Processing'), ('completed', 'Completed'), ('failed', 'Failed'), ('cancelled', 'Cancelled')], default='pending', max_length=20)),
                ('reference_number', models.CharField(max_length=50, unique=True)),
                ('description', models.TextField(blank=True)),
                ('fee', models.DecimalField(decimal_places=2, default=0, max_digits=8)),
                ('processed_at', models.DateTimeField(blank=True, null=True)),
                ('created_at', models.DateTimeField(auto_now_add=True)),
                ('updated_at', models.DateTimeField(auto_now=True)),
                ('payment_method', models.ForeignKey(on_delete=django.db.models.deletion.PROTECT, to='payments.paymentmethod')),
                ('recipient', models.ForeignKey(on_delete=django.db.models.deletion.PROTECT, related_name='received_domestic_transfers', to='accounts.recipient')),
                ('sender', models.ForeignKey(on_delete=django.db.models.deletion.PROTECT, related_name='sent_domestic_transfers', to='users.customer')),
            ],
            options={
                'verbose_name': 'Domestic Transfer',
                'verbose_name_plural': 'Domestic Transfers',
                'ordering': ['-created_at'],
            },
        ),
    ]
