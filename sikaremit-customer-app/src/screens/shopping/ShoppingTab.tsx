/**
 * Shopping Tab for Customer App
 * 
 * Add shopping functionality to existing banking customer app
 */

import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  RefreshControl,
  Image,
  FlatList,
  TextInput,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../../context/ThemeContext';
import { useAuthStore } from '../../store/authStore';
import { cartService } from '../../services/cartService';
import { Card, Button } from '../../components/ui';
import { ecommerceService } from '../../services/ecommerceService';
import { Product } from '../../services/ecommerceService';

interface Store {
  id: string;
  name: string;
}

const ShoppingTab: React.FC = () => {
  const insets = useSafeAreaInsets();
  const navigation = useNavigation<any>();
  const { colors } = useTheme();
  const { user } = useAuthStore();
  
  const [products, setProducts] = useState<Product[]>([]);
  const [featuredProducts, setFeaturedProducts] = useState<Product[]>([]);
  const [categories, setCategories] = useState<string[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [cartCount, setCartCount] = useState(0);

  useEffect(() => {
    fetchShoppingData();
  }, []);

  const fetchShoppingData = async () => {
    try {
      setLoading(true);
      setError(null);

      // Fetch data in parallel for better performance
      const [featuredData, productsData, categoriesData] = await Promise.all([
        ecommerceService.getFeaturedProducts(),
        ecommerceService.getProducts({ page: 1, page_size: 20 }),
        ecommerceService.getProductCategories()
      ]);

      setFeaturedProducts(featuredData);
      setProducts(productsData.products || []);
      setCategories(categoriesData);

    } catch (error: any) {
      console.error('Error fetching shopping data:', error);
      setError(error.message || 'Failed to load shopping data. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const onRefresh = async () => {
    setRefreshing(true);
    await fetchShoppingData();
    setRefreshing(false);
  };

  const searchProducts = async (query: string) => {
    if (!query.trim()) {
      fetchShoppingData();
      return;
    }

    try {
      setLoading(true);
      setError(null);
      const result = await ecommerceService.searchProducts(query, {
        page: 1,
        page_size: 20
      });
      setProducts(result.products || []);
    } catch (error: any) {
      console.error('Error searching products:', error);
      setError(error.message || 'Failed to search products. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const filterByCategory = async (category: string) => {
    try {
      setLoading(true);
      setError(null);
      const result = await ecommerceService.getProducts({
        page: 1,
        page_size: 20,
        category: category === 'all' ? undefined : category
      });
      setProducts(result.products || []);
    } catch (error: any) {
      console.error('Error filtering by category:', error);
      setError(error.message || 'Failed to filter products. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    const timeoutId = setTimeout(() => {
      searchProducts(searchQuery);
    }, 500);

    return () => clearTimeout(timeoutId);
  }, [searchQuery]);

  useEffect(() => {
    filterByCategory(selectedCategory);
  }, [selectedCategory]);

  const renderProductCard = ({ item }: { item: Product }) => (
    <TouchableOpacity
      style={[styles.productCard, { backgroundColor: colors.surface }]}
      onPress={() => navigation.navigate('ProductDetail', { productId: item.id })}
    >
      <Image
        source={item.images.length > 0 ? { uri: item.images[0].image_url } : require('../assets/images/placeholder-product.png')}
        style={styles.productImage}
      />
      <View style={styles.productInfo}>
        <Text style={[styles.productName, { color: colors.text }]} numberOfLines={2}>
          {item.name}
        </Text>
        <Text style={[styles.productPrice, { color: colors.primary }]}>
          ${item.price}
        </Text>
        <Text style={[styles.storeName, { color: colors.textSecondary }]}>
          {item.store.name}
        </Text>
        {item.is_featured && (
          <View style={[styles.featuredBadge, { backgroundColor: colors.primary }]}>
            <Text style={styles.featuredText}>Featured</Text>
          </View>
        )}
      </View>
    </TouchableOpacity>
  );

  const renderFeaturedProduct = ({ item }: { item: Product }) => (
    <TouchableOpacity
      style={[styles.featuredCard, { backgroundColor: colors.surface }]}
      onPress={() => navigation.navigate('ProductDetail', { productId: item.id })}
    >
      <Image
        source={item.images.length > 0 ? { uri: item.images[0].image_url } : require('../assets/images/placeholder-product.png')}
        style={styles.featuredImage}
      />
      <View style={styles.featuredInfo}>
        <Text style={[styles.featuredName, { color: colors.text }]} numberOfLines={1}>
          {item.name}
        </Text>
        <Text style={[styles.featuredPrice, { color: colors.primary }]}>
          ${item.price}
        </Text>
      </View>
    </TouchableOpacity>
  );

  return (
    <View style={[styles.container, { paddingTop: insets.top, backgroundColor: colors.background }]}>
      {/* Header */}
      <View style={styles.header}>
        <Text style={[styles.headerTitle, { color: colors.text }]}>Shopping</Text>
        <TouchableOpacity
          style={[styles.cartButton, { backgroundColor: colors.primary }]}
          onPress={() => navigation.navigate('ShoppingCart')}
        >
          <Ionicons name="cart" size={20} color="white" />
        </TouchableOpacity>
      </View>

      {/* Search Bar */}
      <View style={styles.searchSection}>
        <TextInput
          placeholder="Search products..."
          value={searchQuery}
          onChangeText={setSearchQuery}
          style={[styles.searchInput, { backgroundColor: colors.surface, color: colors.text }]}
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
        {categories.map((category) => (
          <TouchableOpacity
            key={category}
            style={[
              styles.categoryChip,
              selectedCategory === category && { backgroundColor: colors.primary }
            ]}
            onPress={() => setSelectedCategory(category)}
          >
            <Text style={[
              styles.categoryText,
              selectedCategory === category && { color: 'white' }
            ]}>
              {category}
            </Text>
          </TouchableOpacity>
        ))}
      </ScrollView>

      <ScrollView
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
        }
        showsVerticalScrollIndicator={false}
        style={styles.content}
      >
        {/* Featured Products */}
        {featuredProducts.length > 0 && (
          <View style={styles.section}>
            <Text style={[styles.sectionTitle, { color: colors.text }]}>Featured Products</Text>
            <FlatList
              horizontal
              data={featuredProducts}
              renderItem={renderFeaturedProduct}
              keyExtractor={(item) => item.id}
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={styles.featuredList}
            />
          </View>
        )}

        {/* All Products */}
        <View style={styles.section}>
          <Text style={[styles.sectionTitle, { color: colors.text }]}>All Products</Text>
          <FlatList
            data={products}
            renderItem={renderProductCard}
            keyExtractor={(item) => item.id}
            numColumns={2}
            columnWrapperStyle={styles.productRow}
            showsVerticalScrollIndicator={false}
            ListEmptyComponent={
              <View style={styles.emptyState}>
                <Ionicons name="bag-outline" size={48} color={colors.textSecondary} />
                <Text style={[styles.emptyText, { color: colors.textSecondary }]}>
                  No products found
                </Text>
              </View>
            }
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
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingBottom: 16,
  },
  headerTitle: {
    fontSize: 24,
    fontWeight: 'bold',
  },
  cartButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
  },
  searchSection: {
    paddingHorizontal: 20,
    marginBottom: 16,
  },
  searchInput: {
    marginBottom: 0,
  },
  categoriesContainer: {
    marginBottom: 16,
  },
  categoriesContent: {
    paddingHorizontal: 20,
    gap: 8,
  },
  categoryChip: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    backgroundColor: '#f0f0f0',
  },
  categoryText: {
    fontSize: 14,
    color: '#666',
  },
  content: {
    flex: 1,
    paddingHorizontal: 20,
  },
  section: {
    marginBottom: 24,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: 12,
  },
  featuredList: {
    gap: 12,
  },
  featuredCard: {
    width: 150,
    borderRadius: 12,
    overflow: 'hidden',
    marginRight: 12,
  },
  featuredImage: {
    width: 150,
    height: 100,
    backgroundColor: '#f0f0f0',
  },
  featuredInfo: {
    padding: 8,
  },
  featuredName: {
    fontSize: 14,
    fontWeight: '600',
    marginBottom: 4,
  },
  featuredPrice: {
    fontSize: 16,
    fontWeight: 'bold',
  },
  productRow: {
    justifyContent: 'space-between',
  },
  productCard: {
    width: '48%',
    borderRadius: 12,
    overflow: 'hidden',
    marginBottom: 12,
  },
  productImage: {
    width: '100%',
    height: 120,
    backgroundColor: '#f0f0f0',
  },
  productInfo: {
    padding: 12,
  },
  productName: {
    fontSize: 14,
    fontWeight: '600',
    marginBottom: 4,
  },
  productPrice: {
    fontSize: 16,
    fontWeight: 'bold',
    marginBottom: 4,
  },
  storeName: {
    fontSize: 12,
    marginBottom: 8,
  },
  featuredBadge: {
    position: 'absolute',
    top: 8,
    right: 8,
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 8,
  },
  featuredText: {
    fontSize: 10,
    fontWeight: '600',
    color: 'white',
  },
  emptyState: {
    alignItems: 'center',
    paddingVertical: 40,
  },
  emptyText: {
    marginTop: 12,
    fontSize: 16,
  },
});

export default ShoppingTab;
