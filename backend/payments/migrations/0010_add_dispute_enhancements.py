# Generated migration for dispute system enhancements

from django.db import migrations, models
import django.db.models.deletion


class Migration(migrations.Migration):

    dependencies = [
        ('users', '0001_initial'),
        ('payments', '0009_paymentlog'),
    ]

    operations = [
        # Add new fields to Dispute model
        migrations.AddField(
            model_name='dispute',
            name='dispute_type',
            field=models.CharField(
                choices=[
                    ('customer_merchant', 'Customer vs Merchant'),
                    ('merchant_admin', 'Merchant vs Admin'),
                    ('customer_admin', 'Customer vs Admin')
                ], 
                default='customer_merchant', 
                max_length=20
            ),
        ),
        
        migrations.AddField(
            model_name='dispute',
            name='merchant_response',
            field=models.TextField(
                blank=True, 
                help_text="Merchant's response to dispute", 
                null=True
            ),
        ),
        
        migrations.AddField(
            model_name='dispute',
            name='merchant_responded_at',
            field=models.DateTimeField(blank=True, null=True),
        ),
        
        migrations.AddField(
            model_name='dispute',
            name='merchant_resolution',
            field=models.TextField(
                blank=True, 
                help_text="Merchant's resolution details", 
                null=True
            ),
        ),
        
        migrations.AddField(
            model_name='dispute',
            name='merchant_resolved_at',
            field=models.DateTimeField(blank=True, null=True),
        ),
        
        migrations.AddField(
            model_name='dispute',
            name='escalated_to_admin',
            field=models.BooleanField(default=False),
        ),
        
        migrations.AddField(
            model_name='dispute',
            name='escalated_at',
            field=models.DateTimeField(blank=True, null=True),
        ),
        
        migrations.AddField(
            model_name='dispute',
            name='escalation_reason',
            field=models.TextField(
                blank=True, 
                help_text="Reason for escalation to admin"
            ),
        ),
        
        migrations.AddField(
            model_name='dispute',
            name='customer_satisfied',
            field=models.BooleanField(blank=True, null=True),
        ),
        
        migrations.AddField(
            model_name='dispute',
            name='customer_feedback',
            field=models.TextField(
                blank=True, 
                help_text="Customer feedback on resolution"
            ),
        ),
        
        # Update status choices to include new statuses
        migrations.AlterField(
            model_name='dispute',
            name='status',
            field=models.CharField(
                choices=[
                    ('open', 'Open'),
                    ('under_review', 'Under Review'),
                    ('merchant_response', 'Awaiting Merchant Response'),
                    ('pending_escalation', 'Pending Escalation'),
                    ('resolved', 'Resolved'),
                    ('closed', 'Closed')
                ], 
                default='open', 
                max_length=20
            ),
        ),
    ]
