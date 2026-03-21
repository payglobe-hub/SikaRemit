/**
 * Inventory Details Screen
 *
 * Shows detailed inventory information for specific categories
 */

import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  Alert,
  ActivityIndicator,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useNavigation, useRoute } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '@/context/ThemeContext';
import { Card, Button } from '@/components/ui';
import { ProductService } from '@/services/ecommerce/ProductService';
import { Product } from '@sikaremit/mobile-shared';

interface RouteParams {
  type: 'low_stock' | 'out_of_stock' | 'all';
}

const InventoryDetailsScreen: React.FC = () => {
  const insets = useSafeAreaInsets();
  const navigation = useNavigation<any>();
  const route = useRoute();
  const { colors } = useTheme();
  const { type } = route.params as RouteParams;

  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);

  // Load products based on type
  const loadProducts = useCallback(async () => {
    try {
      setLoading(true);
      let data: Product[] = [];

      switch (type) {
        case 'low_stock':
          data = await ProductService.getLowStockProducts();
          break;
        case 'out_of_stock':
          data = await ProductService.getOutOfStockProducts();
          break;
        case 'all':
          // For 'all', we'd need a different API endpoint or combine results
          const [lowStock, outOfStock] = await Promise.all([
            ProductService.getLowStockProducts(),
            ProductService.getOutOfStockProducts(),
          ]);
          data = [...lowStock, ...outOfStock];
          break;
        default:
          data = [];
      }

      setProducts(data);
    } catch (error: any) {
      Alert.alert('Error', 'Failed to load inventory details');
    } finally {
      setLoading(false);
    }
  }, [type]);

  useEffect(() => {
    loadProducts();
  }, [loadProducts]);

  // Handle stock update
  const handleUpdateStock = useCallback(async (productId: string, newQuantity: number) => {
    try {
      await ProductService.updateStock(productId, newQuantity);
      // Update local state
      setProducts(prev =>
        prev.map(product =>
          product.id === productId
            ? { ...product, inventory: { ...product.inventory, quantity: newQuantity } }
            : product
        )
      );
    } catch (error: any) {
      Alert.alert('Error', 'Failed to update stock');
    }
  }, []);

  // Get screen title
  const getScreenTitle = () => {
    switch (type) {
      case 'low_stock':
        return 'Low Stock Items';
      case 'out_of_stock':
        return 'Out of Stock Items';
      case 'all':
        return 'All Inventory';
      default:
        return 'Inventory Details';
    }
  };

  // Get status color for product
  const getStatusColor = (quantity: number, threshold: number) => {
    if (quantity === 0) return colors.error;
    if (quantity <= threshold) return '#ff6b35';
    return '#28a745';
  };

  // Get status text
  const getStatusText = (quantity: number, threshold: number) => {
    if (quantity === 0) return 'Out of Stock';
    if (quantity <= threshold) return 'Low Stock';
    return 'In Stock';
  };

  // Render product item
  const renderProductItem = ({ item }: { item: Product }) => (
    <Card style={styles.productCard}>
      <View style={styles.productContent}>
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
          <View style={styles.stockDetails}>
            <Text style={[
              styles.stockStatus,
              { color: getStatusColor(item.inventory.quantity, item.inventory.low_stock_threshold) }
            ]}>
              {getStatusText(item.inventory.quantity, item.inventory.low_stock_threshold)}
            </Text>
            <Text style={[styles.stockQuantity, { color: colors.textSecondary }]}>
              Current: {item.inventory.quantity} | Threshold: {item.inventory.low_stock_threshold}
            </Text>
          </View>
        </View>

        <View style={styles.productActions}>
          <TouchableOpacity
            style={[styles.actionButton, { backgroundColor: colors.primary }]}
            onPress={() => navigation.navigate('ProductForm', { productId: item.id })}
          >
            <Ionicons name="pencil" size={16} color="white" />
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.actionButton, { backgroundColor: '#17a2b8' }]}
            onPress={() => {
              Alert.prompt(
                'Update Stock Quantity',
                `Current stock: ${item.inventory.quantity}`,
                [
                  { text: 'Cancel', style: 'cancel' },
                  {
                    text: 'Update',
                    onPress: (quantity) => {
                      const qty = parseInt(quantity || '0');
                      if (!isNaN(qty) && qty >= 0) {
                        handleUpdateStock(item.id, qty);
                      } else {
                        Alert.alert('Invalid Quantity', 'Please enter a valid number');
                      }
                    }
                  }
                ],
                'plain-text',
                item.inventory.quantity.toString()
              );
            }}
          >
            <Ionicons name="add-circle" size={16} color="white" />
          </TouchableOpacity>
        </View>
      </View>
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
          <Text style={[styles.headerTitle, { color: colors.text }]}>
            {getScreenTitle()}
          </Text>
          <View style={{ width: 24 }} />
        </View>
      </View>

      {/* Summary */}
      <View style={[styles.summary, { backgroundColor: colors.surface }]}>
        <Text style={[styles.summaryText, { color: colors.text }]}>
          {products.length} {type === 'all' ? 'total' : type.replace('_', ' ')} items
        </Text>
        {type === 'all' && (
          <Text style={[styles.summarySubtext, { color: colors.textSecondary }]}>
            Including low stock and out of stock items
          </Text>
        )}
      </View>

      {/* Product List */}
      <FlatList
        data={products}
        renderItem={renderProductItem}
        keyExtractor={(item) => item.id}
        contentContainerStyle={styles.listContainer}
        ListEmptyComponent={
          <View style={styles.emptyContainer}>
            <Ionicons name="cube-outline" size={64} color={colors.textSecondary} />
            <Text style={[styles.emptyText, { color: colors.textSecondary }]}>
              {type === 'low_stock' && 'No low stock items found'}
              {type === 'out_of_stock' && 'No out of stock items found'}
              {type === 'all' && 'No inventory items found'}
            </Text>
            <Text style={[styles.emptySubtext, { color: colors.textSecondary }]}>
              All your products are well-stocked!
            </Text>
          </View>
        }
      />

      {/* Bulk Actions */}
      {products.length > 0 && (
        <View style={[styles.bulkActions, { backgroundColor: colors.surface }]}>
          <TouchableOpacity
            style={[styles.bulkButton, { backgroundColor: colors.primary }]}
            onPress={() => {
              // TODO: Implement bulk stock update
              Alert.alert('Coming Soon', 'Bulk stock update functionality');
            }}
          >
            <Ionicons name="add-circle" size={20} color="white" />
            <Text style={styles.bulkButtonText}>Bulk Update Stock</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.bulkButton, { backgroundColor: '#28a745' }]}
            onPress={() => {
              // TODO: Implement export functionality
              Alert.alert('Coming Soon', 'Export inventory report');
            }}
          >
            <Ionicons name="download" size={20} color="white" />
            <Text style={styles.bulkButtonText}>Export Report</Text>
          </TouchableOpacity>
        </View>
      )}
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
  summary: {
    padding: 16,
    alignItems: 'center',
  },
  summaryText: {
    fontSize: 16,
    fontWeight: '600',
  },
  summarySubtext: {
    fontSize: 14,
    marginTop: 4,
  },
  listContainer: {
    padding: 16,
    paddingBottom: 80,
  },
  productCard: {
    marginBottom: 12,
  },
  productContent: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
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
    marginBottom: 4,
  },
  stockDetails: {
    marginTop: 4,
  },
  stockStatus: {
    fontSize: 12,
    fontWeight: '600',
    marginBottom: 2,
  },
  stockQuantity: {
    fontSize: 12,
  },
  productActions: {
    flexDirection: 'row',
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
  bulkActions: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    flexDirection: 'row',
    padding: 16,
    gap: 12,
    borderTopWidth: 1,
    borderTopColor: '#e1e5e9',
  },
  bulkButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 8,
    gap: 8,
  },
  bulkButtonText: {
    color: 'white',
    fontSize: 14,
    fontWeight: '600',
  },
});

export default InventoryDetailsScreen;
