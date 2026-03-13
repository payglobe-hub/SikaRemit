/**
 * Shopping Cart API Service
 * 
 * Complete cart management for customer shopping experience
 */

import AsyncStorage from '@react-native-async-storage/async-storage';
import { api } from './api';

export interface CartItem {
  id: string;
  product: {
    id: string;
    name: string;
    price: number;
    image?: string;
    thumbnail?: string;
  };
  store_name: string;
  quantity: number;
  subtotal: number;
  is_available: boolean;
  stock_quantity: number;
  added_at: string;
}

export interface Cart {
  id: string;
  items: CartItem[];
  total_items: number;
  subtotal: number;
  total_with_tax: number;
  is_empty: boolean;
  created_at: string;
  updated_at: string;
}

export interface CartSummary {
  total_items: number;
  subtotal: number;
  tax: number;
  total_with_tax: number;
  is_empty: boolean;
  items_count: number;
}

export interface WishlistItem {
  id: string;
  product: {
    id: string;
    name: string;
    price: number;
    image?: string;
    thumbnail?: string;
  };
  store_name: string;
  is_available: boolean;
  is_featured: boolean;
  category: string;
  stock_quantity: number;
  added_at: string;
}

export interface Wishlist {
  id: string;
  items: WishlistItem[];
  item_count: number;
  created_at: string;
  updated_at: string;
}

class CartService {
  private CART_CACHE_KEY = 'cart_cache';
  private WISHLIST_CACHE_KEY = 'wishlist_cache';

  // Cart Management
  async getCart(): Promise<Cart> {
    try {
      const response = await api.get('/api/v1/ecommerce/cart/');
      const cart = response.data;
      
      // Cache cart data
      await AsyncStorage.setItem(this.CART_CACHE_KEY, JSON.stringify(cart));
      
      return cart;
    } catch (error) {
      // Try to get cached cart if API fails
      const cachedCart = await AsyncStorage.getItem(this.CART_CACHE_KEY);
      if (cachedCart) {
        return JSON.parse(cachedCart);
      }
      throw error;
    }
  }

  async addToCart(productId: string, quantity: number = 1): Promise<CartItem> {
    try {
      const response = await api.post('/api/v1/ecommerce/cart/add_item/', {
        product_id: productId,
        quantity
      });
      
      // Clear cart cache to force refresh
      await AsyncStorage.removeItem(this.CART_CACHE_KEY);
      
      return response.data;
    } catch (error) {
      throw this.handleError(error);
    }
  }

  async updateCartItem(itemId: string, quantity: number): Promise<CartItem | null> {
    try {
      const response = await api.put('/api/v1/ecommerce/cart/update_item/', {
        item_id: itemId,
        quantity
      });
      
      // Clear cart cache to force refresh
      await AsyncStorage.removeItem(this.CART_CACHE_KEY);
      
      return response.data;
    } catch (error) {
      throw this.handleError(error);
    }
  }

  async removeFromCart(itemId: string): Promise<void> {
    try {
      await api.delete('/api/v1/ecommerce/cart/remove_item/', {
        data: { item_id: itemId }
      });
      
      // Clear cart cache to force refresh
      await AsyncStorage.removeItem(this.CART_CACHE_KEY);
    } catch (error) {
      throw this.handleError(error);
    }
  }

  async clearCart(): Promise<Cart> {
    try {
      const response = await api.delete('/api/v1/ecommerce/cart/clear/');
      
      // Clear cart cache
      await AsyncStorage.removeItem(this.CART_CACHE_KEY);
      
      return response.data;
    } catch (error) {
      throw this.handleError(error);
    }
  }

  async getCartSummary(): Promise<CartSummary> {
    try {
      const response = await api.get('/api/v1/ecommerce/cart/summary/');
      return response.data;
    } catch (error) {
      throw this.handleError(error);
    }
  }

  async getCartCount(): Promise<{ count: number; is_empty: boolean }> {
    try {
      const response = await api.get('/api/v1/ecommerce/cart/count/');
      return response.data;
    } catch (error) {
      throw this.handleError(error);
    }
  }

  async bulkAddToCart(items: Array<{ product_id: string; quantity: number }>): Promise<{
    results: Array<{ product_id: string; quantity: number; status: string }>;
    errors: Array<{ product_id: string; error: string }>;
    added_count: number;
    error_count: number;
  }> {
    try {
      const response = await api.post('/api/v1/ecommerce/cart/bulk-add/', {
        items
      });
      
      // Clear cart cache to force refresh
      await AsyncStorage.removeItem(this.CART_CACHE_KEY);
      
      return response.data;
    } catch (error) {
      throw this.handleError(error);
    }
  }

  // Wishlist Management
  async getWishlist(): Promise<Wishlist> {
    try {
      const response = await api.get('/api/v1/ecommerce/wishlist/');
      const wishlist = response.data;
      
      // Cache wishlist data
      await AsyncStorage.setItem(this.WISHLIST_CACHE_KEY, JSON.stringify(wishlist));
      
      return wishlist;
    } catch (error) {
      // Try to get cached wishlist if API fails
      const cachedWishlist = await AsyncStorage.getItem(this.WISHLIST_CACHE_KEY);
      if (cachedWishlist) {
        return JSON.parse(cachedWishlist);
      }
      throw error;
    }
  }

  async addToWishlist(productId: string): Promise<WishlistItem> {
    try {
      const response = await api.post('/api/v1/ecommerce/wishlist/add_item/', {
        product_id: productId
      });
      
      // Clear wishlist cache to force refresh
      await AsyncStorage.removeItem(this.WISHLIST_CACHE_KEY);
      
      return response.data;
    } catch (error) {
      throw this.handleError(error);
    }
  }

  async removeFromWishlist(productId: string): Promise<void> {
    try {
      await api.delete('/api/v1/ecommerce/wishlist/remove_item/', {
        data: { product_id: productId }
      });
      
      // Clear wishlist cache to force refresh
      await AsyncStorage.removeItem(this.WISHLIST_CACHE_KEY);
    } catch (error) {
      throw this.handleError(error);
    }
  }

  async moveToCart(productId: string): Promise<void> {
    try {
      await api.post('/api/v1/ecommerce/wishlist/move_to_cart/', {
        product_id: productId
      });
      
      // Clear both caches
      await AsyncStorage.removeItem(this.CART_CACHE_KEY);
      await AsyncStorage.removeItem(this.WISHLIST_CACHE_KEY);
    } catch (error) {
      throw this.handleError(error);
    }
  }

  // Recommendations
  async getRecommendedProducts(): Promise<{
    recommended_products: any[];
    recommendation_type: string;
  }> {
    try {
      const response = await api.get('/api/v1/ecommerce/products/recommended/');
      return response.data;
    } catch (error) {
      throw this.handleError(error);
    }
  }

  // Utility Methods
  async isInCart(productId: string): Promise<boolean> {
    try {
      const cart = await this.getCart();
      return cart.items.some(item => item.product.id === productId);
    } catch (error) {
      return false;
    }
  }

  async isInWishlist(productId: string): Promise<boolean> {
    try {
      const wishlist = await this.getWishlist();
      return wishlist.items.some(item => item.product.id === productId);
    } catch (error) {
      return false;
    }
  }

  async getCartItemQuantity(productId: string): Promise<number> {
    try {
      const cart = await this.getCart();
      const item = cart.items.find(item => item.product.id === productId);
      return item ? item.quantity : 0;
    } catch (error) {
      return 0;
    }
  }

  // Cache Management
  async clearCache(): Promise<void> {
    await AsyncStorage.removeItem(this.CART_CACHE_KEY);
    await AsyncStorage.removeItem(this.WISHLIST_CACHE_KEY);
  }

  // Error Handling
  private handleError(error: any): Error {
    if (error.response) {
      // API error
      const message = error.response.data?.error || error.response.data?.detail || 'API request failed';
      return new Error(message);
    } else if (error.request) {
      // Network error
      return new Error('Network error. Please check your connection.');
    } else {
      // Other error
      return new Error(error.message || 'An unexpected error occurred.');
    }
  }

  // Validation helpers
  validateQuantity(quantity: number, stockQuantity: number): string | null {
    if (quantity <= 0) {
      return 'Quantity must be greater than 0';
    }
    if (quantity > stockQuantity) {
      return `Only ${stockQuantity} items available`;
    }
    return null;
  }

  calculateItemSubtotal(price: number, quantity: number): number {
    return price * quantity;
  }

  calculateCartTotal(items: CartItem[]): number {
    return items.reduce((total, item) => total + item.subtotal, 0);
  }

  calculateTax(subtotal: number, taxRate: number = 0.05): number {
    return subtotal * taxRate;
  }

  calculateTotalWithTax(subtotal: number, taxRate: number = 0.05): number {
    return subtotal + this.calculateTax(subtotal, taxRate);
  }
}

// Export singleton instance
export const cartService = new CartService();
export default cartService;
