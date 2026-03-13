/**
 * Shopping Cart Screen
 * 
 * Complete cart management for customer shopping experience
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
import { useTheme } from '../../context/ThemeContext';
import { Card, Button, Input } from '../../components/ui';
import { cartService, Cart, CartItem } from '../../services/cartService';

const ShoppingCartScreen: React.FC = () => {
  const insets = useSafeAreaInsets();
  const navigation = useNavigation<any>();
  const { colors } = useTheme();
  
  const [cart, setCart] = useState<Cart | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [updatingItems, setUpdatingItems] = useState<Set<string>>(new Set());

  useEffect(() => {
    loadCart();
  }, []);

  const loadCart = async () => {
    try {
      setLoading(true);
      const cartData = await cartService.getCart();
      setCart(cartData);
    } catch (error) {
      console.error('Error loading cart:', error);
      Alert.alert('Error', 'Failed to load cart. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const onRefresh = async () => {
    setRefreshing(true);
    await loadCart();
    setRefreshing(false);
  };

  const updateQuantity = async (itemId: string, newQuantity: number) => {
    if (updatingItems.has(itemId)) return;

    try {
      setUpdatingItems(prev => new Set(prev).add(itemId));
      
      if (newQuantity === 0) {
        // Remove item
        await cartService.removeFromCart(itemId);
      } else {
        // Update quantity
        await cartService.updateCartItem(itemId, newQuantity);
      }
      
      // Reload cart to get updated data
      await loadCart();
    } catch (error) {
      console.error('Error updating cart:', error);
      Alert.alert('Error', 'Failed to update cart. Please try again.');
    } finally {
      setUpdatingItems(prev => {
        const newSet = new Set(prev);
        newSet.delete(itemId);
        return newSet;
      });
    }
  };

  const removeFromCart = async (itemId: string, productName: string) => {
    Alert.alert(
      'Remove Item',
      `Are you sure you want to remove ${productName} from your cart?`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Remove',
          style: 'destructive',
          onPress: () => updateQuantity(itemId, 0),
        },
      ]
    );
  };

  const clearCart = () => {
    if (!cart || cart.items.length === 0) return;

    Alert.alert(
      'Clear Cart',
      'Are you sure you want to remove all items from your cart?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Clear',
          style: 'destructive',
          onPress: async () => {
            try {
              await cartService.clearCart();
              await loadCart();
            } catch (error) {
              console.error('Error clearing cart:', error);
              Alert.alert('Error', 'Failed to clear cart. Please try again.');
            }
          },
        },
      ]
    );
  };

  const proceedToCheckout = () => {
    if (!cart || cart.items.length === 0) return;
    navigation.navigate('Checkout');
  };

  const renderCartItem = (item: CartItem) => {
    const isUpdating = updatingItems.has(item.id);
    
    return (
      <Card key={item.id} style={styles.cartItem}>
        <View style={styles.itemHeader}>
          <View style={styles.itemInfo}>
            <Text style={[styles.itemName, { color: colors.text }]}>
              {item.product.name}
            </Text>
            <Text style={[styles.storeName, { color: colors.textSecondary }]}>
              {item.store_name}
            </Text>
            <Text style={[styles.itemPrice, { color: colors.primary }]}>
              ${item.product.price.toFixed(2)}
            </Text>
          </View>
          
          <TouchableOpacity
            style={[styles.removeButton, { backgroundColor: colors.error + '20' }]}
            onPress={() => removeFromCart(item.id, item.product.name)}
            disabled={isUpdating}
          >
            <Ionicons name="trash-outline" size={20} color={colors.error} />
          </TouchableOpacity>
        </View>

        <View style={styles.itemFooter}>
          <View style={styles.quantityControls}>
            <TouchableOpacity
              style={[styles.quantityButton, { backgroundColor: colors.background }]}
              onPress={() => updateQuantity(item.id, item.quantity - 1)}
              disabled={isUpdating || item.quantity <= 1}
            >
              <Ionicons name="remove" size={16} color={colors.text} />
            </TouchableOpacity>
            
            <View style={[styles.quantityDisplay, { backgroundColor: colors.background }]}>
              {isUpdating ? (
                <ActivityIndicator size="small" color={colors.primary} />
              ) : (
                <Text style={[styles.quantityText, { color: colors.text }]}>
                  {item.quantity}
                </Text>
              )}
            </View>
            
            <TouchableOpacity
              style={[styles.quantityButton, { backgroundColor: colors.background }]}
              onPress={() => updateQuantity(item.id, item.quantity + 1)}
              disabled={isUpdating || item.quantity >= item.stock_quantity}
            >
              <Ionicons name="add" size={16} color={colors.text} />
            </TouchableOpacity>
          </View>

          <View style={styles.itemTotals}>
            <Text style={[styles.subtotal, { color: colors.text }]}>
              Subtotal: ${item.subtotal.toFixed(2)}
            </Text>
            {!item.is_available && (
              <View style={[styles.unavailableBadge, { backgroundColor: colors.error }]}>
                <Text style={[styles.unavailableText, { color: 'white' }]}>
                  Unavailable
                </Text>
              </View>
            )}
          </View>
        </View>
      </Card>
    );
  };

  const renderEmptyCart = () => (
    <View style={styles.emptyContainer}>
      <Ionicons name="cart-outline" size={80} color={colors.textSecondary} />
      <Text style={[styles.emptyTitle, { color: colors.text }]}>
        Your cart is empty
      </Text>
      <Text style={[styles.emptySubtitle, { color: colors.textSecondary }]}>
        Add some products to get started!
      </Text>
      <Button
        title="Browse Products"
        onPress={() => navigation.navigate('Shopping')}
        style={styles.browseButton}
      />
    </View>
  );

  const renderCartSummary = () => {
    if (!cart) return null;

    return (
      <Card style={styles.summaryCard}>
        <View style={styles.summaryRow}>
          <Text style={[styles.summaryLabel, { color: colors.text }]}>
            Subtotal ({cart.total_items} items)
          </Text>
          <Text style={[styles.summaryValue, { color: colors.text }]}>
            ${cart.subtotal.toFixed(2)}
          </Text>
        </View>
        
        <View style={styles.summaryRow}>
          <Text style={[styles.summaryLabel, { color: colors.text }]}>
            Tax (5%)
          </Text>
          <Text style={[styles.summaryValue, { color: colors.text }]}>
            ${(cart.total_with_tax - cart.subtotal).toFixed(2)}
          </Text>
        </View>
        
        <View style={[styles.summaryRow, styles.totalRow]}>
          <Text style={[styles.totalLabel, { color: colors.text }]}>
            Total
          </Text>
          <Text style={[styles.totalValue, { color: colors.primary }]}>
            ${cart.total_with_tax.toFixed(2)}
          </Text>
        </View>

        <Button
          title="Proceed to Checkout"
          onPress={proceedToCheckout}
          style={styles.checkoutButton}
          disabled={cart.items.length === 0}
        />
      </Card>
    );
  };

  if (loading) {
    return (
      <View style={[styles.container, { paddingTop: insets.top, backgroundColor: colors.background }]}>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={colors.primary} />
          <Text style={[styles.loadingText, { color: colors.text }]}>
            Loading cart...
          </Text>
        </View>
      </View>
    );
  }

  return (
    <View style={[styles.container, { paddingTop: insets.top, backgroundColor: colors.background }]}>
      {/* Header */}
      <View style={styles.header}>
        <Text style={[styles.headerTitle, { color: colors.text }]}>
          Shopping Cart
        </Text>
        {cart && !cart.is_empty && (
          <TouchableOpacity onPress={clearCart}>
            <Text style={[styles.clearButton, { color: colors.error }]}>
              Clear All
            </Text>
          </TouchableOpacity>
        )}
      </View>

      {/* Content */}
      {cart && cart.is_empty ? (
        renderEmptyCart()
      ) : (
        <ScrollView
          refreshControl={
            <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
          }
          style={styles.content}
          showsVerticalScrollIndicator={false}
        >
          <View style={styles.itemsContainer}>
            {cart?.items.map(renderCartItem)}
          </View>
          
          {renderCartSummary()}
        </ScrollView>
      )}
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
  clearButton: {
    fontSize: 16,
    fontWeight: '600',
  },
  content: {
    flex: 1,
    paddingHorizontal: 20,
  },
  itemsContainer: {
    gap: 12,
    paddingBottom: 20,
  },
  cartItem: {
    padding: 16,
  },
  itemHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 12,
  },
  itemInfo: {
    flex: 1,
    marginRight: 12,
  },
  itemName: {
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 4,
  },
  storeName: {
    fontSize: 14,
    marginBottom: 4,
  },
  itemPrice: {
    fontSize: 16,
    fontWeight: 'bold',
  },
  removeButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
  },
  itemFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  quantityControls: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  quantityButton: {
    width: 32,
    height: 32,
    borderRadius: 16,
    justifyContent: 'center',
    alignItems: 'center',
  },
  quantityDisplay: {
    width: 40,
    height: 32,
    borderRadius: 8,
    justifyContent: 'center',
    alignItems: 'center',
  },
  quantityText: {
    fontSize: 14,
    fontWeight: '600',
  },
  itemTotals: {
    alignItems: 'flex-end',
  },
  subtotal: {
    fontSize: 14,
    marginBottom: 4,
  },
  unavailableBadge: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
    alignSelf: 'flex-end',
  },
  unavailableText: {
    fontSize: 12,
    fontWeight: '600',
  },
  summaryCard: {
    padding: 20,
    marginTop: 12,
    marginBottom: 20,
  },
  summaryRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  totalRow: {
    borderTopWidth: 1,
    borderTopColor: '#e0e0e0',
    paddingTop: 12,
    marginTop: 8,
  },
  summaryLabel: {
    fontSize: 16,
  },
  summaryValue: {
    fontSize: 16,
    fontWeight: '600',
  },
  totalLabel: {
    fontSize: 18,
    fontWeight: 'bold',
  },
  totalValue: {
    fontSize: 18,
    fontWeight: 'bold',
  },
  checkoutButton: {
    marginTop: 16,
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
  },
  browseButton: {
    paddingHorizontal: 32,
  },
});

export default ShoppingCartScreen;
