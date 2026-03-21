"""
Add Product Gallery Model Migration
"""

from django.db import migrations, models
import django.db.models.deletion


class Migration(migrations.Migration):

    dependencies = [
        ('merchants', '0005_add_product_images'),
    ]

    operations = [
        migrations.CreateModel(
            name='productgallery',
            fields=[
                ('id', models.BigAutoField(auto_created=True, primary_key=True, serialize=False, verbose_name='ID')),
                ('alt_text', models.CharField(blank=True, help_text='Alt text for accessibility', max_length=255)),
                ('caption', models.TextField(blank=True, help_text='Image caption or description')),
                ('order', models.PositiveIntegerField(default=0, help_text='Display order for this image')),
                ('is_primary', models.BooleanField(default=False, help_text='Whether this is the primary product image')),
                ('created_at', models.DateTimeField(auto_now_add=True)),
                ('updated_at', models.DateTimeField(auto_now=True)),
                ('image', models.ImageField(blank=True, help_text='Product gallery image', null=True, upload_to='product_gallery/')),
                ('thumbnail', models.ImageField(blank=True, help_text='Gallery image thumbnail (auto-generated)', null=True, upload_to='product_gallery_thumbnails/')),
                ('product', models.ForeignKey(on_delete=django.db.models.deletion.CASCADE, related_name='gallery_images', to='merchants.product')),
            ],
            options={
                'verbose_name_plural': 'Product Gallery',
                'ordering': ['order', 'created_at'],
            },
        ),
    ]
