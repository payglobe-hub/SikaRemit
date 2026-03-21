/**
 * Product Form Screen
 *
 * Create or edit products with validation and image upload
 */

import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Alert,
  ActivityIndicator,
  TextInput,
  Switch,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useNavigation, useRoute } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '@/context/ThemeContext';
import { Card, Button } from '@/components/ui';
import { ProductService } from '@/services/ecommerce/ProductService';
import productImageService from '@/services/productImageService';
import {
  Product,
  Category,
  CreateProductRequest,
  UpdateProductRequest,
  ProductStatus
} from '@sikaremit/mobile-shared';

interface RouteParams {
  productId?: string;
}

const ProductFormScreen: React.FC = () => {
  const insets = useSafeAreaInsets();
  const navigation = useNavigation<any>();
  const route = useRoute();
  const { colors } = useTheme();
  const { productId } = route.params as RouteParams;

  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [categories, setCategories] = useState<Category[]>([]);
  const [selectedImages, setSelectedImages] = useState<string[]>([]);

  // Form state
  const [formData, setFormData] = useState({
    name: '',
    description: '',
    short_description: '',
    sku: '',
    barcode: '',
    price: '',
    compare_price: '',
    cost_price: '',
    category_id: '',
    is_featured: false,
    initial_stock: '',
    low_stock_threshold: '',
  });

  const [errors, setErrors] = useState<Record<string, string>>({});

  // Load product data if editing
  useEffect(() => {
    const loadProduct = async () => {
      if (!productId) return;

      try {
        setLoading(true);
        const product = await ProductService.getProduct(productId);
        setFormData({
          name: product.name,
          description: product.description,
          short_description: product.short_description || '',
          sku: product.sku || '',
          barcode: product.barcode || '',
          price: product.price.toString(),
          compare_price: product.compare_price?.toString() || '',
          cost_price: product.cost_price?.toString() || '',
          category_id: product.category.id,
          is_featured: product.is_featured,
          initial_stock: product.inventory.quantity.toString(),
          low_stock_threshold: product.inventory.low_stock_threshold.toString(),
        });
        setSelectedImages(product.images.map((img: any) => img.image_url));
      } catch (error: any) {
        Alert.alert('Error', 'Failed to load product details');
        navigation.goBack();
      } finally {
        setLoading(false);
      }
    };

    loadProduct();
  }, [productId, navigation]);

  // Load categories
  useEffect(() => {
    const loadCategories = async () => {
      try {
        const cats = await ProductService.getCategories();
        setCategories(cats);
      } catch (error: any) {
        console.warn('Failed to load categories:', error);
      }
    };

    loadCategories();
  }, []);

  // Update form field
  const updateField = (field: string, value: any) => {
    setFormData(prev => ({ ...prev, [field]: value }));
    // Clear error when field is updated
    if (errors[field]) {
      setErrors(prev => ({ ...prev, [field]: '' }));
    }
  };

  // Validate form
  const validateForm = (): boolean => {
    const newErrors: Record<string, string> = {};

    if (!formData.name.trim()) {
      newErrors.name = 'Product name is required';
    }

    if (!formData.price.trim()) {
      newErrors.price = 'Price is required';
    } else if (isNaN(Number(formData.price)) || Number(formData.price) <= 0) {
      newErrors.price = 'Please enter a valid price';
    }

    if (!formData.category_id) {
      newErrors.category_id = 'Please select a category';
    }

    if (formData.compare_price && Number(formData.compare_price) <= Number(formData.price)) {
      newErrors.compare_price = 'Compare price must be higher than regular price';
    }

    if (formData.initial_stock && isNaN(Number(formData.initial_stock))) {
      newErrors.initial_stock = 'Please enter a valid stock quantity';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  // Handle image selection
  const handleAddImage = async () => {
    try {
      const result = await productImageService.pickImage();
      if (result.success && result.uri) {
        setSelectedImages(prev => [...prev, result.uri as string]);
      }
    } catch (error: any) {
      Alert.alert('Error', 'Failed to pick image');
    }
  };

  // Remove image
  const handleRemoveImage = (index: number) => {
    setSelectedImages((prev: string[]) => (
      [...prev.slice(0, index), ...prev.slice(index + 1)] as string[]
    ));
  };

  // Save product
  const handleSave = async () => {
    if (!validateForm()) {
      Alert.alert('Validation Error', 'Please fix the errors and try again');
      return;
    }

    try {
      setSaving(true);

      const productData = {
        name: formData.name.trim(),
        description: formData.description.trim(),
        short_description: formData.short_description.trim() || undefined,
        sku: formData.sku.trim() || undefined,
        barcode: formData.barcode.trim() || undefined,
        price: Number(formData.price),
        compare_price: formData.compare_price ? Number(formData.compare_price) : undefined,
        cost_price: formData.cost_price ? Number(formData.cost_price) : undefined,
        category_id: formData.category_id,
        store_id: 'merchant-store-id', // TODO: Get from user context or API
        is_featured: formData.is_featured,
        initial_stock: formData.initial_stock ? Number(formData.initial_stock) : 0,
        low_stock_threshold: formData.low_stock_threshold ? Number(formData.low_stock_threshold) : 5,
      };

      let savedProduct: Product;

      if (productId) {
        // Update existing product
        savedProduct = await ProductService.updateProduct({
          id: productId,
          ...productData,
        });
      } else {
        // Create new product
        savedProduct = await ProductService.createProduct(productData);
      }

      // Upload images if any were selected
      if (selectedImages.length > 0) {
        for (let i = 0; i < selectedImages.length; i++) {
          const imageUri = selectedImages[i];
          if (imageUri.startsWith('http')) continue; // Skip existing images

          try {
            const result = await productImageService.uploadProductImage(imageUri, savedProduct.id);
            if (!result.success) {
              console.warn('Failed to upload image:', result.error);
            }
          } catch (error) {
            console.warn('Failed to upload image:', error);
          }
        }
      }

      Alert.alert(
        'Success',
        `Product ${productId ? 'updated' : 'created'} successfully`,
        [{ text: 'OK', onPress: () => navigation.goBack() }]
      );
    } catch (error: any) {
      Alert.alert('Error', error.response?.data?.message || 'Failed to save product');
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <View style={[styles.container, { backgroundColor: colors.background }]}>
        <ActivityIndicator size="large" color={colors.primary} />
      </View>
    );
  }

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      {/* Header */}
      <View style={[styles.header, { paddingTop: insets.top }]}>
        <View style={styles.headerContent}>
          <TouchableOpacity onPress={() => navigation.goBack()}>
            <Ionicons name="arrow-back" size={24} color={colors.text} />
          </TouchableOpacity>
          <Text style={[styles.headerTitle, { color: colors.text }]}>
            {productId ? 'Edit Product' : 'Add Product'}
          </Text>
          <View style={{ width: 24 }} />
        </View>
      </View>

      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.scrollContent}
        keyboardShouldPersistTaps="handled"
      >
        {/* Images Section */}
        <Card style={styles.section}>
          <Text style={[styles.sectionTitle, { color: colors.text }]}>Product Images</Text>
          <View style={styles.imagesContainer}>
            {selectedImages.map((imageUri, index) => (
              <View key={index} style={styles.imageContainer}>
                <Text style={styles.imagePlaceholder}>📷</Text>
                <TouchableOpacity
                  style={styles.removeImageButton}
                  onPress={() => handleRemoveImage(index)}
                >
                  <Ionicons name="close" size={16} color="white" />
                </TouchableOpacity>
              </View>
            ))}
            <TouchableOpacity style={styles.addImageButton} onPress={handleAddImage}>
              <Ionicons name="add" size={32} color={colors.primary} />
              <Text style={[styles.addImageText, { color: colors.primary }]}>Add Image</Text>
            </TouchableOpacity>
          </View>
        </Card>

        {/* Basic Information */}
        <Card style={styles.section}>
          <Text style={[styles.sectionTitle, { color: colors.text }]}>Basic Information</Text>

          <View style={styles.inputGroup}>
            <Text style={[styles.label, { color: colors.text }]}>Product Name *</Text>
            <TextInput
              style={[styles.input, { color: colors.text, borderColor: errors.name ? colors.error : colors.border }]}
              placeholder="Enter product name"
              placeholderTextColor={colors.textSecondary}
              value={formData.name}
              onChangeText={(value) => updateField('name', value)}
              maxLength={255}
            />
            {errors.name && <Text style={[styles.errorText, { color: colors.error }]}>{errors.name}</Text>}
          </View>

          <View style={styles.inputGroup}>
            <Text style={[styles.label, { color: colors.text }]}>Short Description</Text>
            <TextInput
              style={[styles.input, { color: colors.text, borderColor: colors.border }]}
              placeholder="Brief product description"
              placeholderTextColor={colors.textSecondary}
              value={formData.short_description}
              onChangeText={(value) => updateField('short_description', value)}
              maxLength={500}
              multiline
              numberOfLines={2}
            />
          </View>

          <View style={styles.inputGroup}>
            <Text style={[styles.label, { color: colors.text }]}>Full Description</Text>
            <TextInput
              style={[styles.textArea, { color: colors.text, borderColor: colors.border }]}
              placeholder="Detailed product description"
              placeholderTextColor={colors.textSecondary}
              value={formData.description}
              onChangeText={(value) => updateField('description', value)}
              multiline
              numberOfLines={4}
              textAlignVertical="top"
            />
          </View>
        </Card>

        {/* Pricing */}
        <Card style={styles.section}>
          <Text style={[styles.sectionTitle, { color: colors.text }]}>Pricing</Text>

          <View style={styles.inputGroup}>
            <Text style={[styles.label, { color: colors.text }]}>Price (GHS) *</Text>
            <TextInput
              style={[styles.input, { color: colors.text, borderColor: errors.price ? colors.error : colors.border }]}
              placeholder="0.00"
              placeholderTextColor={colors.textSecondary}
              value={formData.price}
              onChangeText={(value) => updateField('price', value)}
              keyboardType="decimal-pad"
            />
            {errors.price && <Text style={[styles.errorText, { color: colors.error }]}>{errors.price}</Text>}
          </View>

          <View style={styles.inputGroup}>
            <Text style={[styles.label, { color: colors.text }]}>Compare Price (GHS)</Text>
            <TextInput
              style={[styles.input, { color: colors.text, borderColor: errors.compare_price ? colors.error : colors.border }]}
              placeholder="0.00"
              placeholderTextColor={colors.textSecondary}
              value={formData.compare_price}
              onChangeText={(value) => updateField('compare_price', value)}
              keyboardType="decimal-pad"
            />
            {errors.compare_price && <Text style={[styles.errorText, { color: colors.error }]}>{errors.compare_price}</Text>}
          </View>

          <View style={styles.inputGroup}>
            <Text style={[styles.label, { color: colors.text }]}>Cost Price (GHS)</Text>
            <TextInput
              style={[styles.input, { color: colors.text, borderColor: colors.border }]}
              placeholder="0.00"
              placeholderTextColor={colors.textSecondary}
              value={formData.cost_price}
              onChangeText={(value) => updateField('cost_price', value)}
              keyboardType="decimal-pad"
            />
          </View>
        </Card>

        {/* Category & Inventory */}
        <Card style={styles.section}>
          <Text style={[styles.sectionTitle, { color: colors.text }]}>Category & Inventory</Text>

          <View style={styles.inputGroup}>
            <Text style={[styles.label, { color: colors.text }]}>Category *</Text>
            <View style={[styles.pickerContainer, { borderColor: errors.category_id ? colors.error : colors.border }]}>
              <TextInput
                style={[styles.pickerInput, { color: colors.text }]}
                placeholder="Select category"
                placeholderTextColor={colors.textSecondary}
                value={categories.find(c => c.id === formData.category_id)?.name || ''}
                editable={false}
              />
              <TouchableOpacity style={styles.pickerButton}>
                <Ionicons name="chevron-down" size={20} color={colors.textSecondary} />
              </TouchableOpacity>
            </View>
            {errors.category_id && <Text style={[styles.errorText, { color: colors.error }]}>{errors.category_id}</Text>}
          </View>

          <View style={styles.inputGroup}>
            <Text style={[styles.label, { color: colors.text }]}>Initial Stock</Text>
            <TextInput
              style={[styles.input, { color: colors.text, borderColor: errors.initial_stock ? colors.error : colors.border }]}
              placeholder="0"
              placeholderTextColor={colors.textSecondary}
              value={formData.initial_stock}
              onChangeText={(value) => updateField('initial_stock', value)}
              keyboardType="number-pad"
            />
            {errors.initial_stock && <Text style={[styles.errorText, { color: colors.error }]}>{errors.initial_stock}</Text>}
          </View>

          <View style={styles.inputGroup}>
            <Text style={[styles.label, { color: colors.text }]}>Low Stock Alert Threshold</Text>
            <TextInput
              style={[styles.input, { color: colors.text, borderColor: colors.border }]}
              placeholder="5"
              placeholderTextColor={colors.textSecondary}
              value={formData.low_stock_threshold}
              onChangeText={(value) => updateField('low_stock_threshold', value)}
              keyboardType="number-pad"
            />
          </View>
        </Card>

        {/* Additional Details */}
        <Card style={styles.section}>
          <Text style={[styles.sectionTitle, { color: colors.text }]}>Additional Details</Text>

          <View style={styles.inputGroup}>
            <Text style={[styles.label, { color: colors.text }]}>SKU</Text>
            <TextInput
              style={[styles.input, { color: colors.text, borderColor: colors.border }]}
              placeholder="Product SKU"
              placeholderTextColor={colors.textSecondary}
              value={formData.sku}
              onChangeText={(value) => updateField('sku', value)}
              autoCapitalize="characters"
            />
          </View>

          <View style={styles.inputGroup}>
            <Text style={[styles.label, { color: colors.text }]}>Barcode</Text>
            <TextInput
              style={[styles.input, { color: colors.text, borderColor: colors.border }]}
              placeholder="Product barcode"
              placeholderTextColor={colors.textSecondary}
              value={formData.barcode}
              onChangeText={(value) => updateField('barcode', value)}
            />
          </View>

          <View style={styles.switchGroup}>
            <Text style={[styles.label, { color: colors.text }]}>Featured Product</Text>
            <Switch
              value={formData.is_featured}
              onValueChange={(value) => updateField('is_featured', value)}
              trackColor={{ false: colors.border, true: colors.primary }}
              thumbColor={formData.is_featured ? colors.primary : colors.textSecondary}
            />
          </View>
        </Card>

        {/* Save Button */}
        <View style={styles.saveContainer}>
          <Button
            title={saving ? 'Saving...' : (productId ? 'Update Product' : 'Create Product')}
            onPress={handleSave}
            loading={saving}
            disabled={saving}
            style={styles.saveButton}
          />
        </View>
      </ScrollView>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  header: {
    backgroundColor: 'white',
    borderBottomWidth: 1,
    borderBottomColor: '#e1e5e9',
  },
  headerContent: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '600',
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    paddingBottom: 32,
  },
  section: {
    margin: 16,
    marginBottom: 0,
    padding: 16,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '600',
    marginBottom: 16,
  },
  inputGroup: {
    marginBottom: 16,
  },
  label: {
    fontSize: 14,
    fontWeight: '500',
    marginBottom: 8,
  },
  input: {
    borderWidth: 1,
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: 16,
    backgroundColor: 'white',
  },
  textArea: {
    borderWidth: 1,
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: 16,
    backgroundColor: 'white',
    minHeight: 80,
  },
  pickerContainer: {
    borderWidth: 1,
    borderRadius: 8,
    backgroundColor: 'white',
    flexDirection: 'row',
    alignItems: 'center',
  },
  pickerInput: {
    flex: 1,
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: 16,
  },
  pickerButton: {
    paddingHorizontal: 12,
    paddingVertical: 10,
  },
  switchGroup: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 16,
  },
  imagesContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
  },
  imageContainer: {
    width: 80,
    height: 80,
    borderRadius: 8,
    backgroundColor: '#f8f9fa',
    alignItems: 'center',
    justifyContent: 'center',
    position: 'relative',
  },
  imagePlaceholder: {
    fontSize: 32,
  },
  removeImageButton: {
    position: 'absolute',
    top: -8,
    right: -8,
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: '#dc3545',
    alignItems: 'center',
    justifyContent: 'center',
  },
  addImageButton: {
    width: 80,
    height: 80,
    borderRadius: 8,
    borderWidth: 2,
    borderStyle: 'dashed',
    alignItems: 'center',
    justifyContent: 'center',
  },
  addImageText: {
    fontSize: 12,
    fontWeight: '500',
    marginTop: 4,
  },
  errorText: {
    fontSize: 12,
    marginTop: 4,
  },
  saveContainer: {
    padding: 16,
  },
  saveButton: {
    marginBottom: 16,
  },
});

export default ProductFormScreen;
