// E-commerce Service for Shopping functionality
import api from './api';
import { ENDPOINTS } from '../constants/api';
import {
  Product,
  ProductListRequest,
  ProductListResponse,
  Cart,
  CartItem,
  Order as OrderType,
  CreateOrderRequest,
  ProductStatus
} from '../types/ecommerce';

export interface ProductSearchParams {
  page?: number;
  page_size?: number;
  search?: string;
  category?: string;
  store_id?: string;
  min_price?: number;
  max_price?: number;
  featured?: boolean;
}

export interface ProductResponse {
  products: Product[];
  page: number;
  total_pages: number;
  total_count: number;
}

export interface ShoppingCart {
  id: string;
  items: CartItem[];
  subtotal: number;
  tax: number;
  shipping: number;
  total: number;
  currency: string;
}

class EcommerceService {
  // Product Management
  async getFeaturedProducts(): Promise<Product[]> {
    try {
      const response = await api.get('/merchants/public/products/featured/');
      return response.data;
    } catch (error) {
      console.error('Error fetching featured products:', error);
      return [];
    }
  }

  async getProducts(params?: ProductSearchParams): Promise<ProductResponse> {
    try {
      const response = await api.get('/merchants/public/products/', {
        params: {
          page: params?.page || 1,
          page_size: params?.page_size || 20,
          search: params?.search,
          category: params?.category,
          store_id: params?.store_id,
          min_price: params?.min_price,
          max_price: params?.max_price,
          featured: params?.featured,
        }
      });
      return response.data;
    } catch (error) {
      console.error('Error fetching products:', error);
      return { products: [], page: 1, total_pages: 0, total_count: 0 };
    }
  }

  async searchProducts(query: string, params?: Omit<ProductSearchParams, 'search'>): Promise<ProductResponse> {
    return this.getProducts({ ...params, search: query });
  }

  async getProductCategories(): Promise<string[]> {
    try {
      const response = await api.get('/merchants/public/products/categories/');
      return response.data.categories || [];
    } catch (error) {
      console.error('Error fetching categories:', error);
      return [];
    }
  }

  async getProductDetails(productId: string): Promise<Product | null> {
    try {
      const response = await api.get(`/merchants/public/products/${productId}/`);
      return response.data;
    } catch (error) {
      console.error('Error fetching product details:', error);
      return null;
    }
  }

  // Cart Management
  async getCart(): Promise<ShoppingCart | null> {
    try {
      const response = await api.get('/customers/cart/');
      return response.data;
    } catch (error) {
      console.error('Error fetching cart:', error);
      return null;
    }
  }

  async addToCart(productId: string, quantity: number = 1): Promise<{ success: boolean; message: string }> {
    try {
      const response = await api.post('/customers/cart/add/', {
        product_id: productId,
        quantity
      });
      return { success: true, message: 'Product added to cart successfully' };
    } catch (error: any) {
      console.error('Error adding to cart:', error);
      return {
        success: false,
        message: error.response?.data?.message || 'Failed to add product to cart'
      };
    }
  }

  async updateCartItem(cartItemId: string, quantity: number): Promise<{ success: boolean; message: string }> {
    try {
      const response = await api.patch(`/customers/cart/items/${cartItemId}/`, {
        quantity
      });
      return { success: true, message: 'Cart updated successfully' };
    } catch (error: any) {
      console.error('Error updating cart item:', error);
      return {
        success: false,
        message: error.response?.data?.message || 'Failed to update cart item'
      };
    }
  }

  async removeFromCart(cartItemId: string): Promise<{ success: boolean; message: string }> {
    try {
      await api.delete(`/customers/cart/items/${cartItemId}/`);
      return { success: true, message: 'Item removed from cart' };
    } catch (error: any) {
      console.error('Error removing from cart:', error);
      return {
        success: false,
        message: error.response?.data?.message || 'Failed to remove item from cart'
      };
    }
  }

  async clearCart(): Promise<{ success: boolean; message: string }> {
    try {
      await api.delete('/customers/cart/');
      return { success: true, message: 'Cart cleared successfully' };
    } catch (error: any) {
      console.error('Error clearing cart:', error);
      return {
        success: false,
        message: error.response?.data?.message || 'Failed to clear cart'
      };
    }
  }

  // Order Management
  async createOrder(cartId: string, shippingAddress: any, paymentMethod: string): Promise<OrderType | null> {
    try {
      const response = await api.post('/customers/orders/', {
        cart_id: cartId,
        shipping_address: shippingAddress,
        payment_method: paymentMethod
      });
      return response.data;
    } catch (error: any) {
      console.error('Error creating order:', error);
      throw new Error(error.response?.data?.message || 'Failed to create order');
    }
  }

  async getOrders(): Promise<OrderType[]> {
    try {
      const response = await api.get('/customers/orders/');
      return response.data.results || response.data;
    } catch (error) {
      console.error('Error fetching orders:', error);
      return [];
    }
  }

  async getOrderDetails(orderId: string): Promise<OrderType | null> {
    try {
      const response = await api.get(`/customers/orders/${orderId}/`);
      return response.data;
    } catch (error) {
      console.error('Error fetching order details:', error);
      return null;
    }
  }

  async cancelOrder(orderId: string): Promise<{ success: boolean; message: string }> {
    try {
      await api.post(`/customers/orders/${orderId}/cancel/`);
      return { success: true, message: 'Order cancelled successfully' };
    } catch (error: any) {
      console.error('Error cancelling order:', error);
      return {
        success: false,
        message: error.response?.data?.message || 'Failed to cancel order'
      };
    }
  }
}

// Create singleton instance
export const ecommerceService = new EcommerceService();

// Export types
export type { EcommerceService };
