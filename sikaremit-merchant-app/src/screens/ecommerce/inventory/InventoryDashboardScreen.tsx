/**
 * Inventory Dashboard Screen
 *
 * Shows inventory levels, stock alerts, and management tools
 */

import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  RefreshControl,
  Alert,
  ActivityIndicator,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '@/context/ThemeContext';
import { Card, Button } from '@/components/ui';
import { ProductService } from '@/services/ecommerce/ProductService';
import { Product } from '@sikaremit/mobile-shared';
import { connectWebSocket, onWebSocketMessage, disconnectWebSocket, WebSocketMessage } from '@/services/WebSocketService';

interface InventoryStats {
  total_products: number;
  in_stock_products: number;
  low_stock_products: number;
  out_of_stock_products: number;
  total_value: number;
}

// Helper function for rendering stat cards
const renderStatCard = (title: string, value: number | string, icon: string, color: string) => {
  const cardStyle = {
    ...styles.statCard,
    borderLeftColor: color,
  };

  return (
    <Card style={cardStyle}>
      <View style={styles.statContent}>
        <View style={[styles.statIcon, { backgroundColor: color + '20' }]}>
          <Ionicons name={icon as any} size={24} color={color} />
        </View>
        <View style={styles.statInfo}>
          <Text style={[styles.statValue, { color: '#000' }]}>{value}</Text>
          <Text style={[styles.statTitle, { color: '#666' }]}>{title}</Text>
        </View>
      </View>
    </Card>
  );
};

const InventoryDashboardScreen: React.FC = (): JSX.Element => {
  const insets = useSafeAreaInsets();
  const navigation = useNavigation<any>();
  const { colors } = useTheme();

  const [stats, setStats] = useState<InventoryStats>({
    total_products: 0,
    in_stock_products: 0,
    low_stock_products: 0,
    out_of_stock_products: 0,
    total_value: 0,
  });
  const [lowStockProducts, setLowStockProducts] = useState<Product[]>([]);
  const [outOfStockProducts, setOutOfStockProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  // Load inventory data
  const loadInventoryData = useCallback(async (refresh = false) => {
    try {
      if (refresh) {
        setRefreshing(true);
      } else {
        setLoading(true);
      }

      // Load low stock and out of stock products
      const [lowStock, outOfStock] = await Promise.all([
        ProductService.getLowStockProducts(),
        ProductService.getOutOfStockProducts(),
      ]);

      setLowStockProducts(lowStock);
      setOutOfStockProducts(outOfStock);

      // Calculate stats
      const totalProducts = lowStock.length + outOfStock.length;
      const inStockProducts = totalProducts - outOfStock.length;

      // Calculate total value (simplified - would need more detailed API)
      const totalValue = [...lowStock, ...outOfStock].reduce(
        (sum, product) => sum + (product.price * product.inventory.quantity),
        0
      );

      setStats({
        total_products: totalProducts,
        in_stock_products: inStockProducts,
        low_stock_products: lowStock.length,
        out_of_stock_products: outOfStock.length,
        total_value: totalValue,
      });
    } catch (error: any) {
      Alert.alert('Error', 'Failed to load inventory data');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  // Connect to WebSocket for real-time updates
  useEffect(() => {
    connectWebSocket();

    // Subscribe to inventory updates
    const unsubscribeInventoryUpdate = onWebSocketMessage('inventory_update', (message: WebSocketMessage) => {
      
      // Refresh inventory data when updates are received
      loadInventoryData(true);
    });

    // Subscribe to notifications (for low stock alerts, etc.)
    const unsubscribeNotification = onWebSocketMessage('notification', (message: WebSocketMessage) => {
      
      // Handle notification display
    });

    return () => {
      unsubscribeInventoryUpdate();
      unsubscribeNotification();
      disconnectWebSocket();
    };
  }, [loadInventoryData]);

  useEffect(() => {
    loadInventoryData();
  }, [loadInventoryData]);

  // Handle refresh
  const handleRefresh = useCallback(() => {
    loadInventoryData(true);
  }, [loadInventoryData]);

  // Handle stock update
  const handleUpdateStock = useCallback(async (productId: string, newQuantity: number) => {
    try {
      await ProductService.updateStock(productId, newQuantity);
      loadInventoryData(true); // Refresh data
    } catch (error: any) {
      Alert.alert('Error', 'Failed to update stock');
    }
  }, [loadInventoryData]);

  // Navigate to product details
  const navigateToProduct = useCallback((productId: string) => {
    navigation.navigate('ProductDetails', { productId });
  }, [navigation]);

  // Render product item
  const renderProductItem = (product: Product, type: 'low_stock' | 'out_of_stock') => (
    <Card style={styles.productCard}>
      <TouchableOpacity
        style={styles.productContent}
        onPress={() => navigateToProduct(product.id)}
      >
        {product.images.length > 0 && (
          <View style={styles.productImageContainer}>
            <Text style={styles.imagePlaceholder}>ðŸ“·</Text>
          </View>
        )}

        <View style={styles.productInfo}>
          <Text style={[styles.productName, { color: colors.text }]} numberOfLines={2}>
            {product.name}
          </Text>
          <Text style={[styles.productPrice, { color: colors.primary }]}>
            â‚µ{product.price.toFixed(2)}
          </Text>
          <View style={styles.stockInfo}>
            <Text style={[
              styles.stockText,
              { color: type === 'out_of_stock' ? colors.error : '#ff6b35' }
            ]}>
              {type === 'out_of_stock' ? 'Out of Stock' : `Low Stock: ${product.inventory.quantity}`}
            </Text>
            <Text style={[styles.thresholdText, { color: colors.textSecondary }]}>
              Threshold: {product.inventory.low_stock_threshold}
            </Text>
          </View>
        </View>

        <TouchableOpacity
          style={[styles.updateButton, { backgroundColor: colors.primary }]}
          onPress={() => {
            // Show quick update dialog
            Alert.prompt(
              'Update Stock',
              `Current stock: ${product.inventory.quantity}`,
              [
                { text: 'Cancel', style: 'cancel' },
                {
                  text: 'Update',
                  onPress: (quantity?: string) => {
                    const qty = parseInt(quantity || '0');
                    if (!isNaN(qty) && qty >= 0) {
                      handleUpdateStock(product.id, qty);
                    }
                  }
                }
              ],
              'plain-text',
              product.inventory.quantity.toString()
            );
          }}
        >
          <Ionicons name="add" size={16} color="white" />
        </TouchableOpacity>
      </TouchableOpacity>
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
          <Text style={[styles.headerTitle, { color: colors.text }]}>Inventory</Text>
          <TouchableOpacity onPress={() => navigation.navigate('ProductForm')}>
            <Ionicons name="add" size={24} color={colors.primary} />
          </TouchableOpacity>
        </View>
      </View>

      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.scrollContent}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={handleRefresh} />
        }
      >
        {/* Stats Overview */}
        <View style={styles.statsContainer}>
          {renderStatCard('Total Products', stats.total_products, 'cube-outline', colors.primary)}
          {renderStatCard('In Stock', stats.in_stock_products, 'checkmark-circle', '#28a745')}
          {renderStatCard('Low Stock', stats.low_stock_products, 'warning', '#ff6b35')}
          {renderStatCard('Out of Stock', stats.out_of_stock_products, 'close-circle', colors.error)}
          {renderStatCard('Total Value', `â‚µ${stats.total_value.toFixed(2)}`, 'cash', '#17a2b8')}
        </View>

        {/* Low Stock Alert */}
        {lowStockProducts.length > 0 && (
          <View style={styles.section}>
            <View style={styles.sectionHeader}>
              <Ionicons name="warning" size={20} color="#ff6b35" />
              <Text style={[styles.sectionTitle, { color: colors.text }]}>Low Stock Alert</Text>
              <View style={[styles.badge, { backgroundColor: '#ff6b35' }]}>
                <Text style={styles.badgeText}>{lowStockProducts.length}</Text>
              </View>
            </View>

            {lowStockProducts.slice(0, 5).map(product => (
              <View key={product.id}>
                {renderProductItem(product, 'low_stock')}
              </View>
            ))}

            {lowStockProducts.length > 5 && (
              <Button
                title={`View All ${lowStockProducts.length} Low Stock Items`}
                onPress={() => navigation.navigate('InventoryDetails', { type: 'low_stock' })}
                variant="outline"
                style={styles.viewAllButton}
              />
            )}
          </View>
        )}

        {/* Out of Stock Alert */}
        {outOfStockProducts.length > 0 && (
          <View style={styles.section}>
            <View style={styles.sectionHeader}>
              <Ionicons name="close-circle" size={20} color={colors.error} />
              <Text style={[styles.sectionTitle, { color: colors.text }]}>Out of Stock</Text>
              <View style={[styles.badge, { backgroundColor: colors.error }]}>
                <Text style={styles.badgeText}>{outOfStockProducts.length}</Text>
              </View>
            </View>

            {outOfStockProducts.slice(0, 5).map(product => (
              <View key={product.id}>
                {renderProductItem(product, 'out_of_stock')}
              </View>
            ))}

            {outOfStockProducts.length > 5 && (
              <Button
                title={`View All ${outOfStockProducts.length} Out of Stock Items`}
                onPress={() => navigation.navigate('InventoryDetails', { type: 'out_of_stock' })}
                variant="outline"
                style={styles.viewAllButton}
              />
            )}
          </View>
        )}

        {/* Quick Actions */}
        <View style={styles.section}>
          <Text style={[styles.sectionTitle, { color: colors.text }]}>Quick Actions</Text>
          <View style={styles.actionsGrid}>
            <TouchableOpacity
              style={[styles.actionCard, { backgroundColor: colors.surface }]}
              onPress={() => navigation.navigate('ProductList')}
            >
              <Ionicons name="list" size={24} color={colors.primary} />
              <Text style={[styles.actionText, { color: colors.text }]}>All Products</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[styles.actionCard, { backgroundColor: colors.surface }]}
              onPress={() => navigation.navigate('InventoryDetails', { type: 'all' })}
            >
              <Ionicons name="analytics" size={24} color={colors.primary} />
              <Text style={[styles.actionText, { color: colors.text }]}>Full Report</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[styles.actionCard, { backgroundColor: colors.surface }]}
              onPress={() => {
                // TODO: Implement barcode scanning
                Alert.alert('Coming Soon', 'Barcode scanning for inventory updates');
              }}
            >
              <Ionicons name="barcode" size={24} color={colors.primary} />
              <Text style={[styles.actionText, { color: colors.text }]}>Scan Barcode</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[styles.actionCard, { backgroundColor: colors.surface }]}
              onPress={() => {
                // TODO: Implement bulk import
                Alert.alert('Coming Soon', 'Bulk inventory import');
              }}
            >
              <Ionicons name="cloud-upload" size={24} color={colors.primary} />
              <Text style={[styles.actionText, { color: colors.text }]}>Bulk Import</Text>
            </TouchableOpacity>
          </View>
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
  statsContainer: {
    padding: 16,
  },
  statCard: {
    marginBottom: 12,
    borderLeftWidth: 4,
  },
  statContent: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
  },
  statIcon: {
    width: 48,
    height: 48,
    borderRadius: 24,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 16,
  },
  statInfo: {
    flex: 1,
  },
  statValue: {
    fontSize: 24,
    fontWeight: '700',
    marginBottom: 4,
  },
  statTitle: {
    fontSize: 14,
    fontWeight: '500',
  },
  section: {
    margin: 16,
    marginBottom: 0,
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '600',
    marginLeft: 8,
    flex: 1,
  },
  badge: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
  },
  badgeText: {
    color: 'white',
    fontSize: 12,
    fontWeight: '600',
  },
  productCard: {
    marginBottom: 8,
  },
  productContent: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 12,
  },
  productImageContainer: {
    width: 50,
    height: 50,
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
    marginBottom: 4,
  },
  stockInfo: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  stockText: {
    fontSize: 12,
    fontWeight: '500',
  },
  thresholdText: {
    fontSize: 12,
  },
  updateButton: {
    width: 32,
    height: 32,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
    marginLeft: 8,
  },
  viewAllButton: {
    marginTop: 16,
  },
  actionsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
  },
  actionCard: {
    flex: 1,
    minWidth: '45%',
    alignItems: 'center',
    padding: 20,
    borderRadius: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  actionText: {
    fontSize: 14,
    fontWeight: '500',
    marginTop: 8,
    textAlign: 'center',
  },
});

export default InventoryDashboardScreen;

