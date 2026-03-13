"""
Product Image Processing Service

Handles image processing, optimization, and thumbnail generation
for product images uploaded by merchants.
"""

import os
from io import BytesIO
from django.core.files.uploadedfile import UploadedFile
from PIL import Image, ImageOps
from django.conf import settings
import logging

logger = logging.getLogger(__name__)


class ProductImageService:
    """Service for processing product images"""
    
    # Image configuration
    MAX_FILE_SIZE = 5 * 1024 * 1024  # 5MB
    ALLOWED_EXTENSIONS = ['.jpg', '.jpeg', '.png', '.webp']
    MAX_IMAGE_WIDTH = 1200
    MAX_IMAGE_HEIGHT = 1200
    THUMBNAIL_SIZE = (300, 300)
    
    @classmethod
    def validate_image(cls, image_file: UploadedFile) -> dict:
        """
        Validate uploaded image file
        
        Args:
            image_file: Uploaded image file
            
        Returns:
            dict: Validation result with is_valid flag and errors
        """
        errors = []
        
        # Check file size
        if image_file.size > cls.MAX_FILE_SIZE:
            errors.append(f"File size must be less than {cls.MAX_FILE_SIZE // (1024*1024)}MB")
        
        # Check file extension
        file_extension = os.path.splitext(image_file.name)[1].lower()
        if file_extension not in cls.ALLOWED_EXTENSIONS:
            errors.append(f"File type must be one of: {', '.join(cls.ALLOWED_EXTENSIONS)}")
        
        # Try to open image to verify it's valid
        try:
            with Image.open(image_file) as img:
                img.verify()
        except Exception as e:
            errors.append("Invalid image file")
            logger.error(f"Image validation error: {e}")
        
        return {
            'is_valid': len(errors) == 0,
            'errors': errors
        }
    
    @classmethod
    def process_image(cls, image_file: UploadedFile) -> dict:
        """
        Process uploaded image: resize, optimize, and generate thumbnail
        
        Args:
            image_file: Uploaded image file
            
        Returns:
            dict: Processed image data
        """
        try:
            # Open image
            with Image.open(image_file) as img:
                # Convert to RGB if necessary (for PNG with transparency)
                if img.mode in ('RGBA', 'LA', 'P'):
                    background = Image.new('RGB', img.size, (255, 255, 255))
                    if img.mode == 'P':
                        img = img.convert('RGBA')
                    background.paste(img, mask=img.split()[-1] if img.mode == 'RGBA' else None)
                    img = background
                
                # Auto-orient image based on EXIF data
                img = ImageOps.exif_transpose(img)
                
                # Resize main image if too large
                if img.width > cls.MAX_IMAGE_WIDTH or img.height > cls.MAX_IMAGE_HEIGHT:
                    img.thumbnail((cls.MAX_IMAGE_WIDTH, cls.MAX_IMAGE_HEIGHT), Image.Resampling.LANCZOS)
                
                # Generate thumbnail
                thumbnail = img.copy()
                thumbnail.thumbnail(cls.THUMBNAIL_SIZE, Image.Resampling.LANCZOS)
                
                # Save processed images to BytesIO
                main_image_bytes = BytesIO()
                thumbnail_bytes = BytesIO()
                
                # Save as JPEG with optimization
                img.save(main_image_bytes, format='JPEG', quality=85, optimize=True)
                thumbnail.save(thumbnail_bytes, format='JPEG', quality=75, optimize=True)
                
                # Reset file pointers
                main_image_bytes.seek(0)
                thumbnail_bytes.seek(0)
                
                return {
                    'main_image': main_image_bytes,
                    'thumbnail': thumbnail_bytes,
                    'width': img.width,
                    'height': img.height,
                    'file_size': main_image_bytes.tell()
                }
                
        except Exception as e:
            logger.error(f"Image processing error: {e}")
            raise ValueError(f"Failed to process image: {str(e)}")
    
    @classmethod
    def get_image_info(cls, image_file: UploadedFile) -> dict:
        """
        Get image information without processing
        
        Args:
            image_file: Uploaded image file
            
        Returns:
            dict: Image information
        """
        try:
            with Image.open(image_file) as img:
                return {
                    'width': img.width,
                    'height': img.height,
                    'format': img.format,
                    'mode': img.mode,
                    'size': image_file.size
                }
        except Exception as e:
            logger.error(f"Error getting image info: {e}")
            return {}
