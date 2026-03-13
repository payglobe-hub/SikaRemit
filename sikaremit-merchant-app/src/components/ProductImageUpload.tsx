/**
 * Product Image Upload Component for Mobile App
 * 
 * Provides UI for selecting, previewing, and uploading product images
 */

import React, { useState, useRef } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  Alert,
  ActivityIndicator,
  Image,
  Modal,
  ScrollView,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import ProductImageService from '../services/productImageService';
import { MediaTypeOptions } from 'expo-image-picker';

interface ProductImageUploadProps {
  productId?: string;
  currentImage?: string;
  onImageUploaded?: (imageUrl: string, thumbnailUrl: string) => void;
  onImageRemoved?: () => void;
  disabled?: boolean;
}

export const ProductImageUpload: React.FC<ProductImageUploadProps> = ({
  productId,
  currentImage,
  onImageUploaded,
  onImageRemoved,
  disabled = false,
}) => {
  const [selectedImage, setSelectedImage] = useState<string | null>(currentImage || null);
  const [isUploading, setIsUploading] = useState(false);
  const [showPickerModal, setShowPickerModal] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);

  const handlePickFromGallery = async () => {
    setShowPickerModal(false);
    
    const result = await ProductImageService.pickImage({
      mediaTypes: MediaTypeOptions.Images,
      allowsEditing: true,
      aspect: [1, 1],
      quality: 0.8,
    });

    if (result.success && result.uri) {
      // Validate image
      const validation = ProductImageService.validateImage(result.uri);
      if (!validation.isValid) {
        Alert.alert('Invalid Image', validation.error);
        return;
      }

      setSelectedImage(result.uri);
      uploadImage(result.uri);
    } else if (result.error) {
      Alert.alert('Error', result.error);
    }
  };

  const handleTakePhoto = async () => {
    setShowPickerModal(false);
    
    const result = await ProductImageService.takePhoto({
      allowsEditing: true,
      aspect: [1, 1],
      quality: 0.8,
    });

    if (result.success && result.uri) {
      // Validate image
      const validation = ProductImageService.validateImage(result.uri);
      if (!validation.isValid) {
        Alert.alert('Invalid Image', validation.error);
        return;
      }

      setSelectedImage(result.uri);
      uploadImage(result.uri);
    } else if (result.error) {
      Alert.alert('Error', result.error);
    }
  };

  const uploadImage = async (imageUri: string) => {
    setIsUploading(true);
    setUploadProgress(0);

    try {
      const result = await ProductImageService.uploadProductImage(imageUri, productId);
      
      if (result.success) {
        setSelectedImage(imageUri);
        onImageUploaded?.(result.image_url || '', result.thumbnail_url || '');
        Alert.alert('Success', 'Product image uploaded successfully!');
      } else {
        Alert.alert('Upload Failed', result.error || 'Failed to upload image');
        // Reset to current image if upload failed
        setSelectedImage(currentImage || null);
      }
    } catch (error) {
      Alert.alert('Error', 'An unexpected error occurred');
      setSelectedImage(currentImage || null);
    } finally {
      setIsUploading(false);
      setUploadProgress(0);
    }
  };

  const handleRemoveImage = () => {
    Alert.alert(
      'Remove Image',
      'Are you sure you want to remove this product image?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Remove',
          style: 'destructive',
          onPress: () => {
            setSelectedImage(null);
            onImageRemoved?.();
          },
        },
      ]
    );
  };

  const renderImagePreview = () => {
    if (!selectedImage) {
      return (
        <View style={styles.placeholderContainer}>
          <Ionicons name="image-outline" size={48} color="#9CA3AF" />
          <Text style={styles.placeholderText}>No image selected</Text>
          <Text style={styles.placeholderSubtext}>
            Add a product image to showcase your item
          </Text>
        </View>
      );
    }

    return (
      <View style={styles.imagePreviewContainer}>
        <Image source={{ uri: selectedImage }} style={styles.imagePreview} />
        {isUploading && (
          <View style={styles.uploadingOverlay}>
            <ActivityIndicator size="large" color="#FFFFFF" />
            <Text style={styles.uploadingText}>Uploading...</Text>
          </View>
        )}
      </View>
    );
  };

  return (
    <View style={styles.container}>
      <Text style={styles.label}>Product Image</Text>
      
      {renderImagePreview()}
      
      <View style={styles.buttonContainer}>
        {!selectedImage ? (
          <TouchableOpacity
            style={[styles.button, styles.primaryButton]}
            onPress={() => setShowPickerModal(true)}
            disabled={disabled || isUploading}
          >
            <Ionicons name="cloud-upload-outline" size={20} color="#FFFFFF" />
            <Text style={styles.buttonText}>Add Image</Text>
          </TouchableOpacity>
        ) : (
          <View style={styles.buttonRow}>
            <TouchableOpacity
              style={[styles.button, styles.secondaryButton]}
              onPress={() => setShowPickerModal(true)}
              disabled={disabled || isUploading}
            >
              <Ionicons name="cloud-upload-outline" size={20} color="#6B7280" />
              <Text style={styles.secondaryButtonText}>Change</Text>
            </TouchableOpacity>
            
            <TouchableOpacity
              style={[styles.button, styles.dangerButton]}
              onPress={handleRemoveImage}
              disabled={disabled || isUploading}
            >
              <Ionicons name="close-outline" size={20} color="#FFFFFF" />
              <Text style={styles.buttonText}>Remove</Text>
            </TouchableOpacity>
          </View>
        )}
      </View>

      {/* Image Picker Modal */}
      <Modal
        visible={showPickerModal}
        transparent={true}
        animationType="slide"
        onRequestClose={() => setShowPickerModal(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Select Image</Text>
              <TouchableOpacity onPress={() => setShowPickerModal(false)}>
                <Ionicons name="close-outline" size={24} color="#6B7280" />
              </TouchableOpacity>
            </View>
            
            <ScrollView style={styles.modalBody}>
              <TouchableOpacity
                style={styles.pickerOption}
                onPress={handlePickFromGallery}
              >
                <Ionicons name="image-outline" size={24} color="#6B7280" />
                <Text style={styles.pickerOptionText}>Choose from Gallery</Text>
              </TouchableOpacity>
              
              <TouchableOpacity
                style={styles.pickerOption}
                onPress={handleTakePhoto}
              >
                <Ionicons name="camera-outline" size={24} color="#6B7280" />
                <Text style={styles.pickerOptionText}>Take Photo</Text>
              </TouchableOpacity>
            </ScrollView>
          </View>
        </View>
      </Modal>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    marginBottom: 20,
  },
  label: {
    fontSize: 16,
    fontWeight: '600',
    color: '#111827',
    marginBottom: 12,
  },
  placeholderContainer: {
    borderWidth: 2,
    borderColor: '#E5E7EB',
    borderStyle: 'dashed',
    borderRadius: 12,
    padding: 32,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#F9FAFB',
  },
  placeholderText: {
    fontSize: 16,
    fontWeight: '500',
    color: '#6B7280',
    marginTop: 12,
  },
  placeholderSubtext: {
    fontSize: 14,
    color: '#9CA3AF',
    marginTop: 4,
    textAlign: 'center',
  },
  imagePreviewContainer: {
    position: 'relative',
    borderRadius: 12,
    overflow: 'hidden',
    marginBottom: 16,
  },
  imagePreview: {
    width: '100%',
    height: 200,
    borderRadius: 12,
  },
  uploadingOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(0, 0, 0, 0.7)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  uploadingText: {
    color: '#FFFFFF',
    marginTop: 8,
    fontSize: 14,
  },
  buttonContainer: {
    flexDirection: 'row',
  },
  buttonRow: {
    flexDirection: 'row',
    gap: 12,
  },
  button: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 12,
    borderRadius: 8,
    gap: 8,
    flex: 1,
  },
  primaryButton: {
    backgroundColor: '#3B82F6',
  },
  secondaryButton: {
    backgroundColor: '#F3F4F6',
    borderWidth: 1,
    borderColor: '#D1D5DB',
  },
  dangerButton: {
    backgroundColor: '#EF4444',
  },
  buttonText: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '500',
  },
  secondaryButtonText: {
    color: '#6B7280',
    fontSize: 14,
    fontWeight: '500',
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalContent: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    margin: 20,
    width: '90%',
    maxWidth: 300,
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 20,
    borderBottomWidth: 1,
    borderBottomColor: '#E5E7EB',
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#111827',
  },
  modalBody: {
    padding: 20,
  },
  pickerOption: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    borderRadius: 8,
    marginBottom: 12,
    backgroundColor: '#F9FAFB',
  },
  pickerOptionText: {
    fontSize: 16,
    color: '#111827',
    marginLeft: 12,
  },
});

export default ProductImageUpload;
