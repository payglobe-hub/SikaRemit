/**
 * Product List Screen
 *
 * Displays merchant's products with search, filtering, and management options
 */

import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  RefreshControl,
  Alert,
  TextInput,
  ActivityIndicator,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useNavigation, useFocusEffect } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '@/context/ThemeContext';
import { Card, Button } from '@/components/ui';
import { ProductService } from '@/services/ecommerce/ProductService';
import { Product, ProductStatus } from '@sikaremit/mobile-shared';

const ProductListScreen: React.FC = () => {
  const insets = useSafeAreaInsets();
  const navigation = useNavigation<any>();
  const { colors } = useTheme();

  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [retryCount, setRetryCount] = useState(0);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedProducts, setSelectedProducts] = useState<Set<string>>(new Set());
  const [selectionMode, setSelectionMode] = useState(false);
  const [selectedCategory, setSelectedCategory] = useState<string>('');
  const [statusFilter, setStatusFilter] = useState<ProductStatus | 'all'>('all');
  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);

  // Load products
  const loadProducts = useCallback(async (pageNum = 1, refresh = false, isRetry = false) => {
    try {
      if (isRetry) {
        setRetryCount(prev => prev + 1);
      }

      setError(null);
      if (refresh) {
        setRefreshing(true);
      } else if (pageNum === 1) {
        setLoading(true);
      } else {
        setLoadingMore(true);
      }

      const request = {
        page: pageNum,
        page_size: 20,
        search: searchQuery || undefined,
        ...(selectedCategory && { category_id: selectedCategory }),
      };

      const response = await ProductService.getProducts(request);

      if (pageNum === 1) {
        setProducts(response.products);
      } else {
        setProducts(prev => [...prev, ...response.products]);
      }

      setHasMore(response.page < response.total_pages);
      setPage(pageNum);
      setRetryCount(0); // Reset retry count on success

    } catch (error: any) {
      console.error('Error loading products:', error);

      let errorMessage = 'Failed to load products. Please try again.';

      // Handle specific error types
      if (error.code === 'NETWORK_ERROR' || !navigator.onLine) {
        errorMessage = 'Network connection error. Please check your internet connection.';
      } else if (error.response?.status === 401) {
        errorMessage = 'Authentication error. Please log in again.';
      } else if (error.response?.status === 403) {
        errorMessage = 'You do not have permission to view products.';
      } else if (error.response?.status >= 500) {
        errorMessage = 'Server error. Please try again later.';
      }

      setError(errorMessage);

      // Show retry option for recoverable errors
      if (retryCount < 3) {
        Alert.alert(
          'Error Loading Products',
          errorMessage,
          [
            { text: 'Retry', onPress: () => loadProducts(pageNum, refresh, true) },
            { text: 'Cancel', style: 'cancel' }
          ]
        );
      } else {
        Alert.alert('Error Loading Products', `${errorMessage}\n\nMaximum retry attempts reached.`);
      }

    } finally {
      setLoading(false);
      setRefreshing(false);
      setLoadingMore(false);
    }
  }, [searchQuery, selectedCategory]);

  // Initial load
  useEffect(() => {
    loadProducts(1);
  }, [loadProducts]);

  // Refresh when screen focuses
  useFocusEffect(
    useCallback(() => {
      loadProducts(1, true);
    }, [loadProducts])
  );

  // Handle search
  const handleSearch = useCallback(() => {
    loadProducts(1);
  }, [loadProducts]);

  // Handle refresh
  const handleRefresh = useCallback(() => {
    loadProducts(1, true);
  }, [loadProducts]);

  // Toggle selection mode
  const toggleSelectionMode = useCallback(() => {
    setSelectionMode(prev => !prev);
    if (selectionMode) {
      setSelectedProducts(new Set());
    }
  }, [selectionMode]);

  // Load more products
  const handleLoadMore = useCallback(() => {
    if (hasMore && !loadingMore) {
      loadProducts(page + 1);
    }
  }, [hasMore, loadingMore, page, loadProducts]);

  // Duplicate product
  const handleDuplicateProduct = useCallback(async (product: Product) => {
    try {
      const duplicatedProduct = await ProductService.duplicateProduct(product.id);
      setProducts(prev => [duplicatedProduct, ...prev]);
      Alert.alert('Success', 'Product duplicated successfully');
    } catch (error: any) {
      Alert.alert('Error', 'Failed to duplicate product');
    }
  }, []);

  // Bulk operations
  const handleBulkActivate = useCallback(async () => {
    if (selectedProducts.size === 0) return;

    try {
      const updates = Array.from(selectedProducts).map(id => ({
        id,
        status: ProductStatus.ACTIVE
      }));
      await ProductService.bulkUpdateProducts(updates);
      
      // Update local state
      setProducts(prev => prev.map(product => 
        selectedProducts.has(product.id) 
          ? { ...product, status: ProductStatus.ACTIVE }
          : product
      ));
      
      setSelectedProducts(new Set());
      setSelectionMode(false);
      Alert.alert('Success', `${selectedProducts.size} products activated`);
    } catch (error: any) {
      Alert.alert('Error', 'Failed to activate products');
    }
  }, [selectedProducts]);

  const handleBulkDeactivate = useCallback(async () => {
    if (selectedProducts.size === 0) return;

    try {
      const updates = Array.from(selectedProducts).map(id => ({
        id,
        status: ProductStatus.INACTIVE
      }));
      await ProductService.bulkUpdateProducts(updates);
      
      // Update local state
      setProducts(prev => prev.map(product => 
        selectedProducts.has(product.id) 
          ? { ...product, status: ProductStatus.INACTIVE }
          : product
      ));
      
      setSelectedProducts(new Set());
      setSelectionMode(false);
      Alert.alert('Success', `${selectedProducts.size} products deactivated`);
    } catch (error: any) {
      Alert.alert('Error', 'Failed to deactivate products');
    }
  }, [selectedProducts]);

  // Toggle product selection
  const toggleProductSelection = useCallback((productId: string) => {
    setSelectedProducts(prev => {
      const newSet = new Set(prev);
      if (newSet.has(productId)) {
        newSet.delete(productId);
      } else {
        newSet.add(productId);
      }
      return newSet;
    });
  }, []);

  // Delete product
  const handleDeleteProduct = useCallback(async (product: Product) => {
    Alert.alert(
      'Delete Product',
      `Are you sure you want to delete "${product.name}"? This action cannot be undone.`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            try {
              await ProductService.deleteProduct(product.id);
              setProducts(prev => prev.filter(p => p.id !== product.id));
            } catch (error: any) {
              Alert.alert('Error', 'Failed to delete product. Please try again.');
            }
          }
        }
      ]
    );
  }, []);

  // Get status color
  const getStatusColor = (status: ProductStatus) => {
    switch (status) {
      case ProductStatus.ACTIVE:
        return '#28a745';
      case ProductStatus.INACTIVE:
        return '#6c757d';
      case ProductStatus.OUT_OF_STOCK:
        return '#dc3545';
      default:
        return '#6c757d';
    }
  };

  // Render product item
  const renderProductItem = ({ item }: { item: Product }) => (
    <Card style={styles.productCard}>
      <TouchableOpacity
        style={styles.productContent}
        onPress={() => selectionMode ? toggleProductSelection(item.id) : navigation.navigate('ProductDetails', { productId: item.id })}
        onLongPress={selectionMode ? undefined : toggleSelectionMode}
      >
        {selectionMode && (
          <View style={styles.checkboxContainer}>
            <TouchableOpacity
              style={[styles.checkbox, selectedProducts.has(item.id) && styles.checkboxSelected]}
              onPress={() => toggleProductSelection(item.id)}
            >
              {selectedProducts.has(item.id) && (
                <Ionicons name="checkmark" size={16} color="white" />
              )}
            </TouchableOpacity>
          </View>
        )}

        {item.images.length > 0 && (
          <View style={styles.productImageContainer}>
            <Text style={styles.imagePlaceholder}>📷</Text>
          </View>
        )}

        <View style={styles.productInfo}>
          <Text style={[styles.productName, { color: colors.text }]} numberOfLines={2}>
            {item.name}
          </Text>
          <Text style={[styles.productPrice, { color: colors.primary }]}>
            ₵{item.price.toFixed(2)}
          </Text>
          <Text style={[styles.productStock, { color: colors.textSecondary }]}>
            Stock: {item.inventory.quantity}
          </Text>
        </View>

        <View style={styles.productStatus}>
          <View style={[styles.statusBadge, { backgroundColor: getStatusColor(item.status) }]}>
            <Text style={styles.statusText}>
              {item.status.replace('_', ' ').toUpperCase()}
            </Text>
          </View>
        </View>
      </TouchableOpacity>

      {!selectionMode && (
        <View style={styles.productActions}>
          <TouchableOpacity
            style={[styles.actionButton, { backgroundColor: colors.primary }]}
            onPress={() => navigation.navigate('ProductForm', { productId: item.id })}
          >
            <Ionicons name="pencil" size={16} color="white" />
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.actionButton, { backgroundColor: '#17a2b8' }]}
            onPress={() => handleDuplicateProduct(item)}
          >
            <Ionicons name="copy" size={16} color="white" />
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.actionButton, { backgroundColor: colors.error }]}
            onPress={() => handleDeleteProduct(item)}
          >
            <Ionicons name="trash" size={16} color="white" />
          </TouchableOpacity>
        </View>
      )}
    </Card>
  );

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
          
          <View style={styles.headerCenter}>
            <Text style={[styles.headerTitle, { color: colors.text }]}>
              {selectionMode ? `${selectedProducts.size} Selected` : 'Products'}
            </Text>
          </View>

          {selectionMode ? (
            <View style={styles.bulkActions}>
              <TouchableOpacity
                style={[styles.bulkActionButton, { backgroundColor: colors.error }]}
                onPress={handleBulkDeactivate}
                disabled={selectedProducts.size === 0}
              >
                <Ionicons name="eye-off" size={16} color="white" />
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.bulkActionButton, { backgroundColor: colors.success || '#28a745' }]}
                onPress={handleBulkActivate}
                disabled={selectedProducts.size === 0}
              >
                <Ionicons name="eye" size={16} color="white" />
              </TouchableOpacity>
            </View>
          ) : (
            <TouchableOpacity onPress={toggleSelectionMode}>
              <Text style={[styles.selectButton, { color: colors.primary }]}>Select</Text>
            </TouchableOpacity>
          )}
        </View>
      </View>

      {/* Search */}
      <View style={[styles.searchContainer, { backgroundColor: colors.surface }]}>
        <Ionicons name="search" size={20} color={colors.textSecondary} />
        <TextInput
          style={[styles.searchInput, { color: colors.text }]}
          placeholder="Search products..."
          placeholderTextColor={colors.textSecondary}
          value={searchQuery}
          onChangeText={setSearchQuery}
          onSubmitEditing={handleSearch}
          returnKeyType="search"
        />
        {searchQuery ? (
          <TouchableOpacity onPress={() => {
            setSearchQuery('');
            loadProducts(1);
          }}>
            <Ionicons name="close" size={20} color={colors.textSecondary} />
          </TouchableOpacity>
        ) : null}
      </View>

      {/* Product List */}
      <FlatList
        data={products}
        renderItem={renderProductItem}
        keyExtractor={(item) => item.id}
        contentContainerStyle={styles.listContainer}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={handleRefresh} />
        }
        onEndReached={handleLoadMore}
        onEndReachedThreshold={0.1}
        ListEmptyComponent={
          <View style={styles.emptyContainer}>
            <Ionicons name="cube-outline" size={64} color={colors.textSecondary} />
            <Text style={[styles.emptyText, { color: colors.textSecondary }]}>
              No products found
            </Text>
            <Text style={[styles.emptySubtext, { color: colors.textSecondary }]}>
              Add your first product to get started
            </Text>
          </View>
        }
        ListFooterComponent={
          loadingMore ? (
            <View style={styles.loadingMore}>
              <ActivityIndicator size="small" color={colors.primary} />
            </View>
          ) : null
        }
      />
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
  headerCenter: {
    flex: 1,
    alignItems: 'center',
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '600',
  },
  selectButton: {
    fontSize: 16,
    fontWeight: '500',
  },
  bulkActions: {
    flexDirection: 'row',
    gap: 8,
  },
  bulkActionButton: {
    width: 32,
    height: 32,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
  },
  searchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    margin: 16,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 8,
    backgroundColor: '#f8f9fa',
  },
  searchInput: {
    flex: 1,
    marginLeft: 8,
    fontSize: 16,
  },
  listContainer: {
    padding: 16,
    paddingBottom: 32,
  },
  productCard: {
    marginBottom: 12,
    padding: 16,
    backgroundColor: 'white',
    borderRadius: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  productContent: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  checkboxContainer: {
    marginRight: 12,
  },
  checkbox: {
    width: 24,
    height: 24,
    borderRadius: 4,
    borderWidth: 2,
    borderColor: '#007bff',
    alignItems: 'center',
    justifyContent: 'center',
  },
  checkboxSelected: {
    backgroundColor: '#007bff',
  },
  productImageContainer: {
    width: 60,
    height: 60,
    borderRadius: 8,
    backgroundColor: '#f8f9fa',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  imagePlaceholder: {
    fontSize: 24,
  },
  productInfo: {
    flex: 1,
  },
  productName: {
    fontSize: 16,
    fontWeight: '500',
    marginBottom: 4,
  },
  productPrice: {
    fontSize: 14,
    fontWeight: '600',
    color: '#007bff',
    marginBottom: 2,
  },
  productStock: {
    fontSize: 12,
  },
  productStatus: {
    alignItems: 'flex-end',
  },
  statusBadge: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
  },
  statusText: {
    color: 'white',
    fontSize: 10,
    fontWeight: '600',
  },
  productActions: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    marginTop: 12,
    gap: 8,
  },
  actionButton: {
    width: 32,
    height: 32,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
  },
  emptyContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 64,
  },
  emptyText: {
    fontSize: 18,
    fontWeight: '500',
    marginTop: 16,
    marginBottom: 8,
  },
  emptySubtext: {
    fontSize: 14,
    textAlign: 'center',
  },
  loadingMore: {
    paddingVertical: 16,
    alignItems: 'center',
  },
});

export default ProductListScreen;
