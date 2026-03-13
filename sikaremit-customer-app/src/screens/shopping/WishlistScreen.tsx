/**
 * Wishlist Screen
 * 
 * Enhanced wishlist management with recommendations and social features
 */

import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  Alert,
  ActivityIndicator,
  RefreshControl,
  Image,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../../context/ThemeContext';
import { Card, Button } from '../../components/ui';
import { cartService, WishlistItem } from '../../services/cartService';

interface RecommendedProduct {
  id: string;
  name: string;
  price: number;
  image?: string;
  thumbnail?: string;
  store: {
    name: string;
    id: string;
  };
  category: string;
  rating?: number;
  review_count?: number;
  recommendation_reason: string;
}

const WishlistScreen: React.FC = () => {
  const insets = useSafeAreaInsets();
  const navigation = useNavigation<any>();
  const { colors } = useTheme();
  
  const [wishlistItems, setWishlistItems] = useState<WishlistItem[]>([]);
  const [recommendedProducts, setRecommendedProducts] = useState<RecommendedProduct[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [selectedTab, setSelectedTab] = useState<'wishlist' | 'recommended'>('wishlist');

  useEffect(() => {
    loadWishlistData();
  }, []);

  const loadWishlistData = async () => {
    try {
      setLoading(true);
      const [wishlistResponse, recommendationsResponse] = await Promise.all([
        cartService.getWishlist(),
        cartService.getRecommendedProducts()
      ]);
      
      setWishlistItems(wishlistResponse.items || []);
      setRecommendedProducts(recommendationsResponse.recommended_products || []);
    } catch (error) {
      console.error('Error loading wishlist data:', error);
      Alert.alert('Error', 'Failed to load wishlist data');
    } finally {
      setLoading(false);
    }
  };

  const onRefresh = async () => {
    setRefreshing(true);
    await loadWishlistData();
    setRefreshing(false);
  };

  const removeFromWishlist = async (itemId: string) => {
    try {
      await cartService.removeFromWishlist(itemId);
      setWishlistItems(prev => prev.filter(item => item.id !== itemId));
      Alert.alert('Success', 'Item removed from wishlist');
    } catch (error) {
      console.error('Error removing from wishlist:', error);
      Alert.alert('Error', 'Failed to remove item from wishlist');
    }
  };

  const addToCart = async (productId: string) => {
    try {
      await cartService.addToCart(productId, 1);
      Alert.alert('Success', 'Item added to cart');
    } catch (error) {
      console.error('Error adding to cart:', error);
      Alert.alert('Error', 'Failed to add item to cart');
    }
  };

  const moveToCart = async (item: WishlistItem) => {
    try {
      await cartService.addToCart(item.product.id, 1);
      await cartService.removeFromWishlist(item.id);
      setWishlistItems(prev => prev.filter(wishlistItem => wishlistItem.id !== item.id));
      Alert.alert('Success', 'Item moved to cart');
    } catch (error) {
      console.error('Error moving to cart:', error);
      Alert.alert('Error', 'Failed to move item to cart');
    }
  };

  const renderWishlistItem = ({ item }: { item: WishlistItem }) => (
    <Card style={styles.itemCard}>
      <View style={styles.itemContent}>
        <Image
          source={item.product.image ? { uri: item.product.image } : require('../../assets/placeholder-product.png')}
          style={styles.productImage}
          resizeMode="cover"
        />
        <View style={styles.itemInfo}>
          <Text style={[styles.productName, { color: colors.text }]} numberOfLines={2}>
            {item.product.name}
          </Text>
          <Text style={[styles.storeName, { color: colors.textSecondary }]}>
            {item.store_name}
          </Text>
          <View style={styles.priceRow}>
            <Text style={[styles.price, { color: colors.primary }]}>
              ${item.product.price.toFixed(2)}
            </Text>
            {item.is_featured && (
              <Text style={[styles.originalPrice, { color: colors.textSecondary }]}>
                ${(item.product.price * 1.2).toFixed(2)}
              </Text>
            )}
          </View>
        </View>
      </View>
      <View style={styles.itemActions}>
        <TouchableOpacity
          style={[styles.actionButton, { backgroundColor: colors.primary }]}
          onPress={() => addToCart(item.product.id)}
        >
          <Ionicons name="cart" size={16} color="white" />
          <Text style={styles.actionButtonText}>Add to Cart</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.actionButton, { backgroundColor: colors.surface }]}
          onPress={() => moveToCart(item)}
        >
          <Ionicons name="arrow-forward" size={16} color={colors.text} />
          <Text style={[styles.actionButtonText, { color: colors.text }]}>Move to Cart</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.removeButton, { backgroundColor: colors.error + '20' }]}
          onPress={() => removeFromWishlist(item.id)}
        >
          <Ionicons name="trash" size={16} color={colors.error} />
        </TouchableOpacity>
      </View>
    </Card>
  );

  const renderRecommendedItem = ({ item }: { item: RecommendedProduct }) => (
    <Card style={styles.itemCard}>
      <View style={styles.itemContent}>
        <Image
          source={item.image ? { uri: item.image } : require('../../assets/placeholder-product.png')}
          style={styles.productImage}
          resizeMode="cover"
        />
        <View style={styles.itemInfo}>
          <Text style={[styles.productName, { color: colors.text }]} numberOfLines={2}>
            {item.name}
          </Text>
          <Text style={[styles.storeName, { color: colors.textSecondary }]}>
            {item.store.name}
          </Text>
          <Text style={[styles.recommendationReason, { color: colors.primary }]}>
            {item.recommendation_reason}
          </Text>
          <Text style={[styles.price, { color: colors.primary }]}>
            ${item.price.toFixed(2)}
          </Text>
          {item.rating && (
            <View style={styles.ratingRow}>
              <Ionicons name="star" size={12} color="#FFD700" />
              <Text style={[styles.rating, { color: colors.text }]}>
                {item.rating.toFixed(1)} ({item.review_count})
              </Text>
            </View>
          )}
        </View>
      </View>
      <View style={styles.itemActions}>
        <TouchableOpacity
          style={[styles.actionButton, { backgroundColor: colors.primary }]}
          onPress={() => addToCart(item.id)}
        >
          <Ionicons name="cart" size={16} color="white" />
          <Text style={styles.actionButtonText}>Add to Cart</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.actionButton, { backgroundColor: colors.surface }]}
          onPress={() => cartService.addToWishlist(item.id)}
        >
          <Ionicons name="heart" size={16} color={colors.text} />
          <Text style={[styles.actionButtonText, { color: colors.text }]}>Save</Text>
        </TouchableOpacity>
      </View>
    </Card>
  );

  const renderEmptyState = () => (
    <View style={styles.emptyContainer}>
      <Ionicons name="heart-outline" size={80} color={colors.textSecondary} />
      <Text style={[styles.emptyTitle, { color: colors.text }]}>
        {selectedTab === 'wishlist' ? 'Your wishlist is empty' : 'No recommendations yet'}
      </Text>
      <Text style={[styles.emptySubtitle, { color: colors.textSecondary }]}>
        {selectedTab === 'wishlist' 
          ? 'Save items you love to buy later'
          : 'Browse products to get personalized recommendations'
        }
      </Text>
      <Button
        title={selectedTab === 'wishlist' ? 'Browse Products' : 'Start Shopping'}
        onPress={() => navigation.navigate('Shopping')}
        style={styles.browseButton}
      />
    </View>
  );

  if (loading) {
    return (
      <View style={[styles.container, { paddingTop: insets.top, backgroundColor: colors.background }]}>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={colors.primary} />
          <Text style={[styles.loadingText, { color: colors.text }]}>Loading wishlist...</Text>
        </View>
      </View>
    );
  }

  return (
    <View style={[styles.container, { paddingTop: insets.top, backgroundColor: colors.background }]}>
      <View style={styles.header}>
        <Text style={[styles.title, { color: colors.text }]}>My Wishlist</Text>
        <View style={styles.tabContainer}>
          <TouchableOpacity
            style={[
              styles.tab,
              selectedTab === 'wishlist' && { backgroundColor: colors.primary }
            ]}
            onPress={() => setSelectedTab('wishlist')}
          >
            <Text style={[
              styles.tabText,
              selectedTab === 'wishlist' && { color: 'white' }
            ]}>
              Wishlist ({wishlistItems.length})
            </Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[
              styles.tab,
              selectedTab === 'recommended' && { backgroundColor: colors.primary }
            ]}
            onPress={() => setSelectedTab('recommended')}
          >
            <Text style={[
              styles.tabText,
              selectedTab === 'recommended' && { color: 'white' }
            ]}>
              Recommended ({recommendedProducts.length})
            </Text>
          </TouchableOpacity>
        </View>
      </View>

      <FlatList
        data={selectedTab === 'wishlist' ? wishlistItems : recommendedProducts as any}
        renderItem={({ item }) => selectedTab === 'wishlist' ? renderWishlistItem({ item }) : renderRecommendedItem({ item })}
        keyExtractor={(item) => item.id}
        contentContainerStyle={styles.listContainer}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
        }
        ListEmptyComponent={renderEmptyState}
        showsVerticalScrollIndicator={false}
      />
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    marginTop: 16,
    fontSize: 16,
  },
  header: {
    paddingHorizontal: 20,
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#e0e0e0',
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    marginBottom: 16,
  },
  tabContainer: {
    flexDirection: 'row',
    backgroundColor: '#f5f5f5',
    borderRadius: 8,
    padding: 4,
  },
  tab: {
    flex: 1,
    paddingVertical: 8,
    paddingHorizontal: 16,
    borderRadius: 6,
    alignItems: 'center',
  },
  tabText: {
    fontSize: 14,
    fontWeight: '600',
  },
  listContainer: {
    paddingHorizontal: 20,
    paddingVertical: 16,
  },
  itemCard: {
    marginBottom: 16,
    padding: 16,
  },
  itemContent: {
    flexDirection: 'row',
    marginBottom: 16,
  },
  productImage: {
    width: 80,
    height: 80,
    borderRadius: 8,
    marginRight: 16,
  },
  itemInfo: {
    flex: 1,
  },
  productName: {
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 4,
  },
  storeName: {
    fontSize: 14,
    marginBottom: 8,
  },
  priceRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 4,
  },
  price: {
    fontSize: 18,
    fontWeight: 'bold',
    marginRight: 8,
  },
  originalPrice: {
    fontSize: 14,
    color: '#666',
  },
  ratingRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  rating: {
    fontSize: 12,
    marginLeft: 4,
  },
  recommendationReason: {
    fontSize: 12,
    fontStyle: 'italic',
    marginBottom: 8,
  },
  itemActions: {
    flexDirection: 'row',
    gap: 8,
  },
  actionButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: 6,
  },
  actionButtonText: {
    fontSize: 12,
    fontWeight: '600',
    marginLeft: 4,
  },
  removeButton: {
    width: 40,
    height: 36,
    borderRadius: 6,
    alignItems: 'center',
    justifyContent: 'center',
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 40,
  },
  emptyTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    marginTop: 20,
    marginBottom: 8,
  },
  emptySubtitle: {
    fontSize: 16,
    textAlign: 'center',
    marginBottom: 24,
    color: '#666',
  },
  browseButton: {
    paddingHorizontal: 32,
  },
});

export default WishlistScreen;
