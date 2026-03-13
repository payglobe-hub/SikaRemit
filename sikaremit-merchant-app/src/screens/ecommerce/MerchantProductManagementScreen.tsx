// Merchant Product Management Screen - Real product operations
import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Alert,
  RefreshControl,
  ActivityIndicator,
  FlatList,
  TextInput,
  Image,
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../../context/ThemeContext';
import { Card, Button } from '../../components/ui';
import { merchantDashboardService, MerchantProduct } from '../../services/merchantDashboardService';
import { BorderRadius, FontSize, Spacing } from '../../constants/theme';

const MerchantProductManagementScreen: React.FC = () => {
  const navigation = useNavigation<any>();
  const { colors } = useTheme();

  const [products, setProducts] = useState<MerchantProduct[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [categories, setCategories] = useState<string[]>([]);

  useEffect(() => {
    fetchProducts();
  }, [selectedCategory]);

  useEffect(() => {
    const timeoutId = setTimeout(() => {
      if (searchQuery.trim()) {
        searchProducts(searchQuery);
      } else {
        fetchProducts();
      }
    }, 500);

    return () => clearTimeout(timeoutId);
  }, [searchQuery]);

  const fetchProducts = async () => {
    try {
      setLoading(true);
      const params: any = { page_size: 50 };
      if (selectedCategory !== 'all') {
        params.category = selectedCategory;
      }

      const response = await merchantDashboardService.getProducts(params);
      setProducts(response.results);

      // Extract unique categories
      const uniqueCategories = [...new Set(
        response.results
          .map(product => product.category)
          .filter((category): category is string => category !== undefined && category !== null && category !== '')
      )];
      setCategories(uniqueCategories);
    } catch (error: any) {
      console.error('Error fetching products:', error);
      Alert.alert('Error', 'Failed to load products. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const searchProducts = async (query: string) => {
    try {
      setLoading(true);
      const response = await merchantDashboardService.getProducts({
        search: query,
        page_size: 50
      });
      setProducts(response.results);
    } catch (error: any) {
      console.error('Error searching products:', error);
      Alert.alert('Error', 'Failed to search products. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const onRefresh = async () => {
    setRefreshing(true);
    await fetchProducts();
    setRefreshing(false);
  };

  const handleCreateProduct = () => {
    navigation.navigate('MerchantProductForm', { mode: 'create' });
  };

  const handleEditProduct = (product: MerchantProduct) => {
    navigation.navigate('MerchantProductForm', { mode: 'edit', product });
  };

  const handleDeleteProduct = (product: MerchantProduct) => {
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
              await merchantDashboardService.deleteProduct(product.id);
              setProducts(prev => prev.filter(p => p.id !== product.id));
              Alert.alert('Success', 'Product deleted successfully');
            } catch (error: any) {
              console.error('Error deleting product:', error);
              Alert.alert('Error', 'Failed to delete product. Please try again.');
            }
          }
        }
      ]
    );
  };

  const handleToggleFeatured = async (product: MerchantProduct) => {
    try {
      await merchantDashboardService.toggleFeatured(product.id);
      setProducts(prev => prev.map(p =>
        p.id === product.id ? { ...p, is_featured: !p.is_featured } : p
      ));
    } catch (error: any) {
      console.error('Error toggling featured status:', error);
      Alert.alert('Error', 'Failed to update product. Please try again.');
    }
  };

  const handleUpdateStock = (product: MerchantProduct) => {
    Alert.alert(
      'Update Stock',
      `Current stock: ${product.stock_quantity}`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Add Stock',
          onPress: () => navigation.navigate('MerchantStockUpdate', { product, mode: 'add' })
        },
        {
          text: 'Reduce Stock',
          onPress: () => navigation.navigate('MerchantStockUpdate', { product, mode: 'reduce' })
        }
      ]
    );
  };

  const renderProductCard = ({ item }: { item: MerchantProduct }) => (
    <Card style={styles.productCard}>
      <View style={styles.productHeader}>
        <View style={styles.productImageContainer}>
          {item.primary_image_url ? (
            <Image source={{ uri: item.primary_image_url }} style={styles.productImage} />
          ) : (
            <View style={[styles.placeholderImage, { backgroundColor: colors.surface }]}>
              <Ionicons name="image-outline" size={24} color={colors.textSecondary} />
            </View>
          )}
        </View>
        <View style={styles.productInfo}>
          <Text style={[styles.productName, { color: colors.text }]} numberOfLines={2}>
            {item.name}
          </Text>
          <Text style={[styles.productPrice, { color: colors.primary }]}>
            ${item.price.toFixed(2)}
          </Text>
          <Text style={[styles.storeName, { color: colors.textSecondary }]}>
            {item.store_name}
          </Text>
        </View>
        <View style={styles.productBadges}>
          {item.is_featured && (
            <View style={[styles.featuredBadge, { backgroundColor: colors.warning }]}>
              <Ionicons name="star" size={12} color="white" />
            </View>
          )}
          {item.is_low_stock && (
            <View style={[styles.lowStockBadge, { backgroundColor: colors.error }]}>
              <Text style={styles.lowStockText}>Low</Text>
            </View>
          )}
        </View>
      </View>

      <View style={styles.productStats}>
        <View style={styles.statItem}>
          <Ionicons name="cube-outline" size={14} color={colors.textSecondary} />
          <Text style={[styles.statText, { color: colors.textSecondary }]}>
            {item.stock_quantity} in stock
          </Text>
        </View>
        <View style={styles.statItem}>
          <Ionicons name="eye-outline" size={14} color={colors.textSecondary} />
          <Text style={[styles.statText, { color: colors.textSecondary }]}>
            {item.view_count} views
          </Text>
        </View>
        <View style={styles.statItem}>
          <Ionicons name="cart-outline" size={14} color={colors.textSecondary} />
          <Text style={[styles.statText, { color: colors.textSecondary }]}>
            {item.purchase_count} sold
          </Text>
        </View>
      </View>

      <View style={styles.productActions}>
        <TouchableOpacity
          style={[styles.actionButton, styles.viewButton, { borderColor: colors.primary }]}
          onPress={() => navigation.navigate('MerchantProductDetail', { product: item })}
        >
          <Ionicons name="eye-outline" size={16} color={colors.primary} />
          <Text style={[styles.actionText, { color: colors.primary }]}>View</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.actionButton, styles.editButton, { borderColor: colors.accent }]}
          onPress={() => handleEditProduct(item)}
        >
          <Ionicons name="pencil-outline" size={16} color={colors.accent} />
          <Text style={[styles.actionText, { color: colors.accent }]}>Edit</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.actionButton, styles.stockButton, { borderColor: colors.info }]}
          onPress={() => handleUpdateStock(item)}
        >
          <Ionicons name="cube-outline" size={16} color={colors.info} />
          <Text style={[styles.actionText, { color: colors.info }]}>Stock</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.actionButton, styles.featuredButton, {
            borderColor: item.is_featured ? colors.warning : colors.textSecondary
          }]}
          onPress={() => handleToggleFeatured(item)}
        >
          <Ionicons
            name={item.is_featured ? "star" : "star-outline"}
            size={16}
            color={item.is_featured ? colors.warning : colors.textSecondary}
          />
          <Text style={[styles.actionText, {
            color: item.is_featured ? colors.warning : colors.textSecondary
          }]}>
            {item.is_featured ? 'Featured' : 'Feature'}
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.actionButton, styles.deleteButton, { borderColor: colors.error }]}
          onPress={() => handleDeleteProduct(item)}
        >
          <Ionicons name="trash-outline" size={16} color={colors.error} />
          <Text style={[styles.actionText, { color: colors.error }]}>Delete</Text>
        </TouchableOpacity>
      </View>
    </Card>
  );

  const renderCategoryChip = (category: string) => (
    <TouchableOpacity
      key={category}
      style={[
        styles.categoryChip,
        selectedCategory === category && { backgroundColor: colors.primary }
      ]}
      onPress={() => setSelectedCategory(selectedCategory === category ? 'all' : category)}
    >
      <Text style={[
        styles.categoryText,
        selectedCategory === category && { color: 'white' }
      ]}>
        {category}
      </Text>
    </TouchableOpacity>
  );

  if (loading) {
    return (
      <View style={[styles.container, { backgroundColor: colors.background }]}>
        <View style={[styles.header, { borderBottomColor: colors.border }]}>
          <Text style={[styles.headerTitle, { color: colors.text }]}>Product Management</Text>
        </View>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={colors.primary} />
          <Text style={[styles.loadingText, { color: colors.textSecondary }]}>
            Loading products...
          </Text>
        </View>
      </View>
    );
  }

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <View style={[styles.header, { borderBottomColor: colors.border }]}>
        <TouchableOpacity
          style={styles.backButton}
          onPress={() => navigation.goBack()}
        >
          <Ionicons name="arrow-back" size={24} color={colors.text} />
        </TouchableOpacity>
        <Text style={[styles.headerTitle, { color: colors.text }]}>Product Management</Text>
        <TouchableOpacity
          style={[styles.addButton, { backgroundColor: colors.primary }]}
          onPress={handleCreateProduct}
        >
          <Ionicons name="add" size={20} color="white" />
        </TouchableOpacity>
      </View>

      {/* Search Bar */}
      <View style={[styles.searchSection, { backgroundColor: colors.surface }]}>
        <TextInput
          placeholder="Search products..."
          value={searchQuery}
          onChangeText={setSearchQuery}
          style={[styles.searchInput, { backgroundColor: colors.background, color: colors.text }]}
          placeholderTextColor={colors.textSecondary}
        />
      </View>

      {/* Categories */}
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        style={styles.categoriesContainer}
        contentContainerStyle={styles.categoriesContent}
      >
        <TouchableOpacity
          style={[
            styles.categoryChip,
            selectedCategory === 'all' && { backgroundColor: colors.primary }
          ]}
          onPress={() => setSelectedCategory('all')}
        >
          <Text style={[
            styles.categoryText,
            selectedCategory === 'all' && { color: 'white' }
          ]}>
            All
          </Text>
        </TouchableOpacity>
        {categories.map(renderCategoryChip)}
      </ScrollView>

      <FlatList
        data={products}
        renderItem={renderProductCard}
        keyExtractor={(item) => item.id}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
        }
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.productsList}
        ListEmptyComponent={
          <View style={styles.emptyState}>
            <Ionicons name="cube-outline" size={64} color={colors.textSecondary} />
            <Text style={[styles.emptyTitle, { color: colors.text }]}>No Products Found</Text>
            <Text style={[styles.emptyText, { color: colors.textSecondary }]}>
              {searchQuery ? 'Try adjusting your search criteria' : 'Create your first product to get started'}
            </Text>
            {!searchQuery && (
              <Button
                title="Create Product"
                onPress={handleCreateProduct}
                style={styles.createButton}
              />
            )}
          </View>
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
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: Spacing.lg,
    paddingVertical: Spacing.md,
    borderBottomWidth: 1,
  },
  backButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerTitle: {
    fontSize: FontSize.xl,
    fontWeight: 'bold',
    flex: 1,
    textAlign: 'center',
  },
  addButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
  },
  searchSection: {
    paddingHorizontal: Spacing.lg,
    paddingVertical: Spacing.md,
  },
  searchInput: {
    borderRadius: BorderRadius.md,
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.sm,
    fontSize: FontSize.md,
  },
  categoriesContainer: {
    marginBottom: Spacing.sm,
  },
  categoriesContent: {
    paddingHorizontal: Spacing.lg,
    gap: Spacing.sm,
  },
  categoryChip: {
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.sm,
    borderRadius: BorderRadius.lg,
    backgroundColor: '#f0f0f0',
  },
  categoryText: {
    fontSize: FontSize.sm,
    color: '#666',
  },
  productsList: {
    padding: Spacing.lg,
    paddingBottom: Spacing.xxxl,
  },
  productCard: {
    marginBottom: Spacing.md,
    padding: Spacing.lg,
  },
  productHeader: {
    flexDirection: 'row',
    marginBottom: Spacing.md,
  },
  productImageContainer: {
    width: 60,
    height: 60,
    borderRadius: BorderRadius.md,
    marginRight: Spacing.md,
    overflow: 'hidden',
  },
  productImage: {
    width: '100%',
    height: '100%',
  },
  placeholderImage: {
    width: '100%',
    height: '100%',
    alignItems: 'center',
    justifyContent: 'center',
  },
  productInfo: {
    flex: 1,
  },
  productName: {
    fontSize: FontSize.md,
    fontWeight: '600',
    marginBottom: 2,
  },
  productPrice: {
    fontSize: FontSize.lg,
    fontWeight: 'bold',
    marginBottom: 2,
  },
  storeName: {
    fontSize: FontSize.sm,
  },
  productBadges: {
    flexDirection: 'row',
    gap: Spacing.xs,
  },
  featuredBadge: {
    paddingHorizontal: Spacing.xs,
    paddingVertical: 2,
    borderRadius: BorderRadius.sm,
  },
  lowStockBadge: {
    paddingHorizontal: Spacing.xs,
    paddingVertical: 2,
    borderRadius: BorderRadius.sm,
  },
  lowStockText: {
    fontSize: FontSize.xs,
    fontWeight: '600',
    color: 'white',
  },
  productStats: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: Spacing.md,
  },
  statItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.xs,
  },
  statText: {
    fontSize: FontSize.sm,
  },
  productActions: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: Spacing.sm,
  },
  actionButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: Spacing.xs,
    paddingVertical: Spacing.sm,
    paddingHorizontal: Spacing.md,
    borderWidth: 1,
    borderRadius: BorderRadius.md,
    minWidth: 70,
  },
  viewButton: {
    flex: 1,
  },
  editButton: {
    flex: 1,
  },
  stockButton: {
    flex: 1,
  },
  featuredButton: {
    flex: 1,
  },
  deleteButton: {
    flex: 1,
  },
  actionText: {
    fontSize: FontSize.sm,
    fontWeight: '600',
  },
  loadingContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  loadingText: {
    marginTop: Spacing.md,
    fontSize: FontSize.md,
  },
  emptyState: {
    alignItems: 'center',
    paddingVertical: Spacing.xxxl,
  },
  emptyTitle: {
    fontSize: FontSize.xl,
    fontWeight: 'bold',
    marginTop: Spacing.lg,
    marginBottom: Spacing.sm,
  },
  emptyText: {
    fontSize: FontSize.md,
    textAlign: 'center',
    marginBottom: Spacing.xl,
    paddingHorizontal: Spacing.xl,
  },
  createButton: {
    minWidth: 120,
  },
});

export default MerchantProductManagementScreen;
