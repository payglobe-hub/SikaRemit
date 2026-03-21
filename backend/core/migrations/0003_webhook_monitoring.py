# Generated migration for webhook monitoring system

from django.db import migrations, models
import django.db.models.deletion
import django.utils.timezone


class Migration(migrations.Migration):

    dependencies = [
        ('users', '0004_enhanced_admin_hierarchy'),
        ('core', '0002_initial'),
    ]

    operations = [
        migrations.CreateModel(
            name='WebhookEvent',
            fields=[
                ('id', models.BigAutoField(auto_created=True, primary_key=True, serialize=False, verbose_name='ID')),
                ('event_id', models.CharField(db_index=True, max_length=100, unique=True)),
                ('event_type', models.CharField(choices=[('incoming', 'Incoming Webhook'), ('outgoing', 'Outgoing Webhook'), ('verification_failed', 'Verification Failed'), ('processing_error', 'Processing Error'), ('retry_attempt', 'Retry Attempt')], db_index=True, max_length=20)),
                ('direction', models.CharField(choices=[('in', 'Inbound'), ('out', 'Outbound')], max_length=10)),
                ('provider', models.CharField(db_index=True, max_length=50)),
                ('status', models.CharField(choices=[('pending', 'Pending'), ('processed', 'Processed'), ('failed', 'Failed'), ('retrying', 'Retrying')], default='pending', max_length=20)),
                ('url', models.URLField(max_length=500)),
                ('method', models.CharField(max_length=10)),
                ('headers', models.JSONField(default=dict)),
                ('payload', models.JSONField(default=dict)),
                ('payload_size', models.PositiveIntegerField(help_text='Size of payload in bytes')),
                ('response_status', models.PositiveIntegerField(blank=True, null=True)),
                ('response_body', models.TextField(blank=True)),
                ('response_time_ms', models.PositiveIntegerField(blank=True, null=True)),
                ('signature_verified', models.BooleanField(default=False)),
                ('signature_details', models.JSONField(blank=True, default=dict)),
                ('ip_address', models.GenericIPAddressField()),
                ('user_agent', models.TextField(blank=True)),
                ('processing_attempts', models.PositiveIntegerField(default=0)),
                ('last_attempt_at', models.DateTimeField(blank=True, null=True)),
                ('error_message', models.TextField(blank=True)),
                ('created_at', models.DateTimeField(auto_now_add=True, db_index=True)),
                ('updated_at', models.DateTimeField(auto_now=True)),
                ('processed_at', models.DateTimeField(blank=True, null=True)),
                ('risk_score', models.FloatField(default=0.0, help_text='Risk score 0.0-1.0')),
                ('risk_factors', models.JSONField(blank=True, default=list)),
                ('requires_review', models.BooleanField(default=False)),
                ('review_notes', models.TextField(blank=True)),
                ('reviewed_at', models.DateTimeField(blank=True, null=True)),
                ('reviewed_by', models.ForeignKey(blank=True, null=True, on_delete=django.db.models.deletion.SET_NULL, related_name='reviewed_webhook_events', to='users.user')),
            ],
            options={
                'verbose_name': 'Webhook Event',
                'verbose_name_plural': 'Webhook Events',
                'ordering': ['-created_at'],
                'indexes': [
                    models.Index(fields=['provider', '-created_at'], name='core_webhook_provider_idx'),
                    models.Index(fields=['status', '-created_at'], name='core_webhook_status_idx'),
                    models.Index(fields=['direction', '-created_at'], name='core_webhook_direction_idx'),
                    models.Index(fields=['requires_review', '-created_at'], name='core_webhook_review_idx'),
                    models.Index(fields=['risk_score', '-created_at'], name='core_webhook_risk_idx'),
                ],
            },
        ),
    ]
