"""
Product Gallery Model

Supports multiple images per product with ordering and metadata
"""

from django.db import models
from django.conf import settings
from merchants.models import Product
import uuid

class ProductGallery(models.Model):
    """Model for storing multiple product images"""
    
    product = models.ForeignKey(
        Product,
        on_delete=models.CASCADE,
        related_name='gallery_images'
    )
    
    image = models.ImageField(
        upload_to='product_gallery/',
        blank=True,
        null=True,
        help_text='Product gallery image'
    )
    
    thumbnail = models.ImageField(
        upload_to='product_gallery_thumbnails/',
        blank=True,
        null=True,
        help_text='Gallery image thumbnail (auto-generated)'
    )
    
    # Image metadata
    alt_text = models.CharField(
        max_length=255,
        blank=True,
        help_text='Alt text for accessibility'
    )
    
    caption = models.TextField(
        blank=True,
        help_text='Image caption or description'
    )
    
    # Ordering and display
    order = models.PositiveIntegerField(
        default=0,
        help_text='Display order for this image'
    )
    
    is_primary = models.BooleanField(
        default=False,
        help_text='Whether this is the primary product image'
    )
    
    # Timestamps
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)
    
    class Meta:
        ordering = ['order', 'created_at']
        verbose_name_plural = 'Product Gallery'
        indexes = [
            models.Index(fields=['product', 'order']),
            models.Index(fields=['product', 'is_primary']),
        ]
    
    def __str__(self):
        return f"{self.product.name} - Image {self.order}"
    
    def save(self, *args, **kwargs):
        # Ensure only one primary image per product
        if self.is_primary:
            ProductGallery.objects.filter(
                product=self.product,
                is_primary=True
            ).exclude(pk=self.pk).update(is_primary=False)
        
        super().save(*args, **kwargs)
    
    @property
    def image_url(self):
        """Get full URL for the image"""
        if self.image:
            return f"{settings.MEDIA_URL}{self.image.url}"
        return None
    
    @property
    def thumbnail_url(self):
        """Get full URL for the thumbnail"""
        if self.thumbnail:
            return f"{settings.MEDIA_URL}{self.thumbnail.url}"
        return None

class ProductGalleryService:
    """Service for managing product gallery operations"""
    
    @staticmethod
    def add_gallery_image(product, image_file, alt_text="", caption="", order=0, is_primary=False):
        """Add a new image to product gallery"""
        from merchants.services.product_image_service import ProductImageService
        
        # Validate and process image
        validation_result = ProductImageService.validate_image(image_file)
        if not validation_result['is_valid']:
            raise ValueError(f"Invalid image: {', '.join(validation_result['errors'])}")
        
        processed = ProductImageService.process_image(image_file)
        
        # Create gallery image
        gallery_image = ProductGallery.objects.create(
            product=product,
            alt_text=alt_text,
            caption=caption,
            order=order,
            is_primary=is_primary
        )
        
        # Save processed images
        gallery_image.image.save(
            f"gallery_{uuid.uuid4()}.jpg",
            processed['main_image'],
            save=True
        )
        gallery_image.thumbnail.save(
            f"gallery_thumb_{uuid.uuid4()}.jpg",
            processed['thumbnail'],
            save=True
        )
        
        return gallery_image
    
    @staticmethod
    def set_primary_image(gallery_image):
        """Set an image as primary for its product"""
        ProductGallery.objects.filter(
            product=gallery_image.product,
            is_primary=True
        ).update(is_primary=False)
        
        gallery_image.is_primary = True
        gallery_image.save()
        
        return gallery_image
    
    @staticmethod
    def reorder_images(product, image_ids):
        """Reorder gallery images based on provided IDs"""
        for index, image_id in enumerate(image_ids):
            try:
                image = ProductGallery.objects.get(id=image_id, product=product)
                image.order = index
                image.save()
            except ProductGallery.DoesNotExist:
                continue
    
    @staticmethod
    def delete_image(gallery_image):
        """Delete a gallery image"""
        # If this was primary, make another image primary if available
        if gallery_image.is_primary:
            remaining_images = ProductGallery.objects.filter(
                product=gallery_image.product
            ).exclude(pk=gallery_image.pk).order_by('order')
            
            if remaining_images.exists():
                remaining_images.first().is_primary = True
                remaining_images.first().save()
        
        gallery_image.delete()
    
    @staticmethod
    def get_primary_image(product):
        """Get the primary image for a product"""
        try:
            return ProductGallery.objects.get(product=product, is_primary=True)
        except ProductGallery.DoesNotExist:
            # Return first image if no primary is set
            return ProductGallery.objects.filter(product=product).first()
    
    @staticmethod
    def get_gallery_images(product):
        """Get all gallery images for a product, ordered"""
        return ProductGallery.objects.filter(product=product).order_by('order', 'created_at')
