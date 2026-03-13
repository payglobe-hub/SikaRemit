/**
 * Product Image Service for Mobile App
 * 
 * Handles product image upload, processing, and management
 * for the merchant mobile application
 */

import * as ImagePicker from 'expo-image-picker';
import * as FileSystem from 'expo-file-system';
import { MediaTypeOptions } from 'expo-image-picker';
import { API_BASE_URL } from '../constants/api';
import { getAuthHeaders } from './authService';

export interface ProductImage {
  id: string;
  image_url?: string;
  thumbnail_url?: string;
}

export interface ImageUploadResult {
  success: boolean;
  image_url?: string;
  thumbnail_url?: string;
  error?: string;
}

class ProductImageService {
  /**
   * Pick an image from device gallery or camera
   */
  static async pickImage(options?: {
    mediaTypes?: MediaTypeOptions;
    allowsEditing?: boolean;
    aspect?: [number, number];
    quality?: number;
  }): Promise<{ success: boolean; uri?: string; error?: string }> {
    try {
      // Request permissions first
      const permissionResult = await ImagePicker.requestMediaLibraryPermissionsAsync();
      
      if (permissionResult.status !== 'granted') {
        return {
          success: false,
          error: 'Permission to access media library was denied'
        };
      }

      // Configure image picker options
      const pickerOptions = {
        mediaTypes: options?.mediaTypes || ImagePicker.MediaTypeOptions.Images,
        allowsEditing: options?.allowsEditing || true,
        aspect: options?.aspect || [1, 1],
        quality: options?.quality || 0.8,
        base64: false,
      };

      const result = await ImagePicker.launchImageLibraryAsync(pickerOptions);

      if (result.canceled || !result.assets || result.assets.length === 0) {
        return {
          success: false,
          error: 'No image selected'
        };
      }

      const asset = result.assets[0];
      
      return {
        success: true,
        uri: asset.uri
      };

    } catch (error) {
      console.error('Error picking image:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to pick image'
      };
    }
  }

  /**
   * Take a new photo using camera
   */
  static async takePhoto(options?: {
    allowsEditing?: boolean;
    aspect?: [number, number];
    quality?: number;
  }): Promise<{ success: boolean; uri?: string; error?: string }> {
    try {
      // Request camera permissions
      const permissionResult = await ImagePicker.requestCameraPermissionsAsync();
      
      if (permissionResult.status !== 'granted') {
        return {
          success: false,
          error: 'Permission to access camera was denied'
        };
      }

      // Configure camera options
      const pickerOptions = {
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        allowsEditing: options?.allowsEditing || true,
        aspect: options?.aspect || [1, 1],
        quality: options?.quality || 0.8,
        base64: false,
      };

      const result = await ImagePicker.launchCameraAsync(pickerOptions);

      if (result.canceled || !result.assets || result.assets.length === 0) {
        return {
          success: false,
          error: 'No photo taken'
        };
      }

      const asset = result.assets[0];
      
      return {
        success: true,
        uri: asset.uri
      };

    } catch (error) {
      console.error('Error taking photo:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to take photo'
      };
    }
  }

  /**
   * Upload product image to server
   */
  static async uploadProductImage(
    imageUri: string,
    productId?: string
  ): Promise<ImageUploadResult> {
    try {
      // Create FormData for multipart upload
      const formData = new FormData();
      
      // Get file info
      const fileInfo = await FileSystem.getInfoAsync(imageUri);
      
      // Read file as base64 or blob
      if (fileInfo.exists) {
        // For React Native, we need to create a file object
        const response = await fetch(imageUri);
        const blob = await response.blob();
        
        // Append to FormData
        formData.append('image', blob, 'product_image.jpg');
        
        if (productId) {
          formData.append('product_id', productId);
        }
      } else {
        return {
          success: false,
          error: 'Image file not found'
        };
      }

      // Upload to server
      const uploadUrl = productId 
        ? `${API_BASE_URL}/api/v1/merchants/products/${productId}/upload_image/`
        : `${API_BASE_URL}/api/v1/merchants/products/upload_image/`;

      const authHeaders = await getAuthHeaders();
      const uploadResponse = await fetch(uploadUrl, {
        method: 'POST',
        headers: {
          ...authHeaders,
          'Content-Type': 'multipart/form-data',
        },
        body: formData,
      });

      if (!uploadResponse.ok) {
        const errorData = await uploadResponse.json();
        return {
          success: false,
          error: errorData.message || errorData.error || 'Upload failed'
        };
      }

      const result = await uploadResponse.json();
      
      return {
        success: true,
        image_url: result.image_url,
        thumbnail_url: result.thumbnail_url
      };

    } catch (error) {
      console.error('Error uploading image:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Upload failed'
      };
    }
  }

  /**
   * Delete product image
   */
  static async deleteProductImage(productId: string): Promise<{ success: boolean; error?: string }> {
    try {
      const authHeaders = await getAuthHeaders();
      const response = await fetch(
        `${API_BASE_URL}/api/v1/merchants/products/${productId}/delete_image/`,
        {
          method: 'DELETE',
          headers: authHeaders,
        }
      );

      if (!response.ok) {
        const errorData = await response.json();
        return {
          success: false,
          error: errorData.message || errorData.error || 'Delete failed'
        };
      }

      return { success: true };

    } catch (error) {
      console.error('Error deleting image:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Delete failed'
      };
    }
  }

  /**
   * Get image info (size, dimensions, etc.)
   */
  static async getImageInfo(imageUri: string): Promise<{
    success: boolean;
    size?: number;
    width?: number;
    height?: number;
    error?: string;
  }> {
    try {
      const fileInfo = await FileSystem.getInfoAsync(imageUri);
      
      if (!fileInfo.exists) {
        return {
          success: false,
          error: 'Image file not found'
        };
      }

      // For dimensions, we'd need to use a library like expo-image-manipulator
      // For now, return basic file info
      return {
        success: true,
        size: fileInfo.size || 0,
      };

    } catch (error) {
      console.error('Error getting image info:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to get image info'
      };
    }
  }

  /**
   * Validate image before upload
   */
  static validateImage(imageUri: string): {
    isValid: boolean;
    error?: string;
  } {
    // Basic validation - in a real app, you'd check file size, type, etc.
    const allowedTypes = ['jpg', 'jpeg', 'png', 'webp'];
    
    // Extract file extension from URI
    const uriParts = imageUri.split('.');
    const extension = uriParts[uriParts.length - 1]?.toLowerCase();
    
    if (!extension || !allowedTypes.includes(extension)) {
      return {
        isValid: false,
        error: 'Invalid file type. Only JPG, PNG, and WebP are allowed.'
      };
    }
    
    return { isValid: true };
  }
}

export default ProductImageService;
