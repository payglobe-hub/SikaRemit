// Merchant Dashboard Service - Real API integration for store/product/order management
import axios from 'axios';
import { API_BASE_URL } from '../constants/api';
import { getAuthHeaders } from './authService';

interface PendingRevenue {
  store: {
    id: string;
    name: string;
    merchant_name: string;
  };
  total_amount: number;
  order_count: number;
  item_count: number;
  orders: Array<{
    id: string;
    order_number: string;
    date: string;
  }>;
}

interface RevenueSummary {
  period_days: number;
  summary: {
    gross_revenue: string;
    platform_fees: string;
    net_revenue: string;
    settled_amount: string;
    pending_amount: string;
  };
  statistics: {
    total_orders: number;
    total_items_sold: number;
  };
}
export interface MerchantStore {
  id: string;
  name: string;
  description: string;
  store_type: string;
  phone?: string;
  email?: string;
  website?: string;
  is_active: boolean;
  accepts_online_orders: boolean;
  delivery_available: boolean;
  pickup_available: boolean;
  product_count: number;
  total_orders: number;
  average_rating: number;
  created_at: string;
  updated_at: string;
}

export interface MerchantProduct {
  id: string;
  store: string;
  store_name: string;
  name: string;
  description: string;
  price: number;
  compare_at_price?: number;
  sku?: string;
  barcode?: string;
  stock_quantity: number;
  low_stock_threshold: number;
  track_inventory: boolean;
  status: string;
  is_available: boolean;
  is_featured: boolean;
  category?: string;
  tags: string[];
  primary_image_url?: string;
  additional_images: string[];
  weight?: number;
  dimensions?: { width: number; height: number; depth: number };
  requires_shipping: boolean;
  seo_title?: string;
  seo_description?: string;
  meta_tags: Record<string, any>;
  view_count: number;
  purchase_count: number;
  average_rating: number;
  images_count: number;
  variants_count: number;
  is_low_stock: boolean;
  is_in_stock: boolean;
  discount_percentage: number;
  created_at: string;
  updated_at: string;
}

export interface MerchantOrder {
  id: string;
  order_number: string;
  user: string;
  customer_name: string;
  customer_email: string;
  shipping_address: string;
  shipping_city: string;
  shipping_state: string;
  shipping_postal_code: string;
  shipping_country: string;
  shipping_phone: string;
  subtotal: number;
  shipping_cost: number;
  tax: number;
  total: number;
  status: string;
  status_display: string;
  payment_status: string;
  payment_status_display: string;
  items_count: number;
  merchant_items_total: number;
  created_at: string;
  updated_at: string;
  shipped_at?: string;
  delivered_at?: string;
}

export interface MerchantOrderItem {
  id: string;
  product: string;
  product_name: string;
  product_sku?: string;
  product_image_url?: string;
  quantity: number;
  price: number;
  subtotal: number;
}

export interface MerchantDashboardStats {
  merchant_info: {
    business_name: string;
    store_count: number;
    joined_date: string;
  };
  product_stats: {
    total_products: number;
    active_products: number;
    low_stock_alerts: number;
  };
  order_stats: {
    total_orders: number;
    pending_orders: number;
    completed_orders: number;
  };
  revenue_stats: {
    total_revenue: string;
    monthly_revenue: string;
  };
  recent_activity: {
    recent_orders: Array<{
      id: string;
      order_number: string;
      status: string;
      total: number;
      date: string;
    }>;
  };
}

export interface CreateProductRequest {
  store_id: string;
  name: string;
  description: string;
  price: number;
  compare_at_price?: number;
  sku?: string;
  barcode?: string;
  stock_quantity: number;
  low_stock_threshold?: number;
  track_inventory?: boolean;
  category?: string;
  tags?: string[];
  weight?: number;
  dimensions?: { width: number; height: number; depth: number };
  requires_shipping?: boolean;
  seo_title?: string;
  seo_description?: string;
  meta_tags?: Record<string, any>;
}

export interface UpdateProductRequest {
  name?: string;
  description?: string;
  price?: number;
  compare_at_price?: number;
  sku?: string;
  barcode?: string;
  stock_quantity?: number;
  low_stock_threshold?: number;
  track_inventory?: boolean;
  status?: string;
  is_available?: boolean;
  is_featured?: boolean;
  category?: string;
  tags?: string[];
  weight?: number;
  dimensions?: { width: number; height: number; depth: number };
  requires_shipping?: boolean;
  seo_title?: string;
  seo_description?: string;
  meta_tags?: Record<string, any>;
}

export interface CreateStoreRequest {
  name: string;
  description?: string;
  store_type: string;
  phone?: string;
  email?: string;
  website?: string;
  address_line_1?: string;
  address_line_2?: string;
  city?: string;
  state?: string;
  postal_code?: string;
  country?: string;
  business_hours?: Record<string, any>;
  accepts_online_orders?: boolean;
  delivery_available?: boolean;
  pickup_available?: boolean;
  logo?: File;
  banner_image?: File;
}

class MerchantDashboardService {
  // Store Management
  async getStores(): Promise<MerchantStore[]> {
    try {
      const response = await axios.get(`${API_BASE_URL}/merchants/dashboard/stores/`, {
        headers: await getAuthHeaders(),
      });
      return response.data;
    } catch (error) {
      console.error('Error fetching stores:', error);
      throw error;
    }
  }

  async getStore(storeId: string): Promise<MerchantStore> {
    try {
      const response = await axios.get(`${API_BASE_URL}/merchants/dashboard/stores/${storeId}/`, {
        headers: await getAuthHeaders(),
      });
      return response.data;
    } catch (error) {
      console.error('Error fetching store:', error);
      throw error;
    }
  }

  async createStore(storeData: CreateStoreRequest): Promise<MerchantStore> {
    try {
      const formData = new FormData();

      // Add basic fields
      Object.keys(storeData).forEach(key => {
        const value = storeData[key as keyof CreateStoreRequest];
        if (value !== undefined && value !== null) {
          if (typeof value === 'object' && !(value instanceof File)) {
            formData.append(key, JSON.stringify(value));
          } else {
            formData.append(key, value as any);
          }
        }
      });

      const response = await axios.post(`${API_BASE_URL}/merchants/dashboard/stores/`, formData, {
        headers: {
          ...await getAuthHeaders(),
          'Content-Type': 'multipart/form-data',
        },
      });
      return response.data;
    } catch (error) {
      console.error('Error creating store:', error);
      throw error;
    }
  }

  async updateStore(storeId: string, storeData: Partial<CreateStoreRequest>): Promise<MerchantStore> {
    try {
      const formData = new FormData();

      // Add basic fields
      Object.keys(storeData).forEach(key => {
        const value = storeData[key as keyof CreateStoreRequest];
        if (value !== undefined && value !== null) {
          if (typeof value === 'object' && !(value instanceof File)) {
            formData.append(key, JSON.stringify(value));
          } else {
            formData.append(key, value as any);
          }
        }
      });

      const response = await axios.patch(`${API_BASE_URL}/merchants/dashboard/stores/${storeId}/`, formData, {
        headers: {
          ...await getAuthHeaders(),
          'Content-Type': 'multipart/form-data',
        },
      });
      return response.data;
    } catch (error) {
      console.error('Error updating store:', error);
      throw error;
    }
  }

  async deleteStore(storeId: string): Promise<void> {
    try {
      await axios.delete(`${API_BASE_URL}/merchants/dashboard/stores/${storeId}/`, {
        headers: await getAuthHeaders(),
      });
    } catch (error) {
      console.error('Error deleting store:', error);
      throw error;
    }
  }

  // Product Management
  async getProducts(params?: {
    page?: number;
    page_size?: number;
    search?: string;
    category?: string;
    status?: string;
    is_featured?: boolean;
    store?: string;
  }): Promise<{ results: MerchantProduct[]; count: number; next?: string; previous?: string }> {
    try {
      const response = await axios.get(`${API_BASE_URL}/merchants/dashboard/products/`, {
        params,
        headers: await getAuthHeaders(),
      });
      return response.data;
    } catch (error) {
      console.error('Error fetching products:', error);
      throw error;
    }
  }

  async getProduct(productId: string): Promise<MerchantProduct> {
    try {
      const response = await axios.get(`${API_BASE_URL}/merchants/dashboard/products/${productId}/`, {
        headers: await getAuthHeaders(),
      });
      return response.data;
    } catch (error) {
      console.error('Error fetching product:', error);
      throw error;
    }
  }

  async createProduct(productData: CreateProductRequest): Promise<MerchantProduct> {
    try {
      const response = await axios.post(`${API_BASE_URL}/merchants/dashboard/products/`, productData, {
        headers: await getAuthHeaders(),
      });
      return response.data;
    } catch (error) {
      console.error('Error creating product:', error);
      throw error;
    }
  }

  async updateProduct(productId: string, productData: UpdateProductRequest): Promise<MerchantProduct> {
    try {
      const response = await axios.patch(`${API_BASE_URL}/merchants/dashboard/products/${productId}/`, productData, {
        headers: await getAuthHeaders(),
      });
      return response.data;
    } catch (error) {
      console.error('Error updating product:', error);
      throw error;
    }
  }

  async deleteProduct(productId: string): Promise<void> {
    try {
      await axios.delete(`${API_BASE_URL}/merchants/dashboard/products/${productId}/`, {
        headers: await getAuthHeaders(),
      });
    } catch (error) {
      console.error('Error deleting product:', error);
      throw error;
    }
  }

  async updateStock(productId: string, quantityChange: number): Promise<MerchantProduct> {
    try {
      const response = await axios.post(`${API_BASE_URL}/merchants/dashboard/products/${productId}/update_stock/`, {
        quantity_change: quantityChange
      }, {
        headers: await getAuthHeaders(),
      });
      return response.data;
    } catch (error) {
      console.error('Error updating stock:', error);
      throw error;
    }
  }

  async toggleFeatured(productId: string): Promise<MerchantProduct> {
    try {
      const response = await axios.post(`${API_BASE_URL}/merchants/dashboard/products/${productId}/toggle_featured/`, {}, {
        headers: await getAuthHeaders(),
      });
      return response.data;
    } catch (error) {
      console.error('Error toggling featured status:', error);
      throw error;
    }
  }

  async getLowStockProducts(): Promise<MerchantProduct[]> {
    try {
      const response = await axios.get(`${API_BASE_URL}/merchants/dashboard/products/low_stock/`, {
        headers: await getAuthHeaders(),
      });
      return response.data;
    } catch (error) {
      console.error('Error fetching low stock products:', error);
      throw error;
    }
  }

  // Order Management
  async getOrders(params?: {
    page?: number;
    page_size?: number;
    status?: string;
  }): Promise<{ results: MerchantOrder[]; count: number; next?: string; previous?: string }> {
    try {
      const response = await axios.get(`${API_BASE_URL}/merchants/dashboard/orders/`, {
        params,
        headers: await getAuthHeaders(),
      });
      return response.data;
    } catch (error) {
      console.error('Error fetching orders:', error);
      throw error;
    }
  }

  async getOrder(orderId: string): Promise<{
    order: MerchantOrder;
    merchant_items: MerchantOrderItem[];
    fulfillment_summary: {
      total_merchant_items: number;
      total_merchant_value: number;
      requires_shipping: boolean;
    };
  }> {
    try {
      const response = await axios.get(`${API_BASE_URL}/merchants/dashboard/orders/${orderId}/`, {
        headers: await getAuthHeaders(),
      });
      return response.data;
    } catch (error) {
      console.error('Error fetching order:', error);
      throw error;
    }
  }

  async updateOrderStatus(orderId: string, status: string, additionalData?: {
    tracking_number?: string;
    carrier?: string;
    shipping_notes?: string;
  }): Promise<MerchantOrder> {
    try {
      const data = { status, ...additionalData };
      const response = await axios.post(`${API_BASE_URL}/merchants/dashboard/orders/${orderId}/update_status/`, data, {
        headers: await getAuthHeaders(),
      });
      return response.data.order;
    } catch (error) {
      console.error('Error updating order status:', error);
      throw error;
    }
  }

  async addFulfillmentNote(orderId: string, note: string): Promise<MerchantOrder> {
    try {
      const response = await axios.post(`${API_BASE_URL}/merchants/dashboard/orders/${orderId}/add_fulfillment_note/`, { note }, {
        headers: await getAuthHeaders(),
      });
      return response.data.order;
    } catch (error) {
      console.error('Error adding fulfillment note:', error);
      throw error;
    }
  }

  async getPendingOrders(): Promise<MerchantOrder[]> {
    try {
      const response = await axios.get(`${API_BASE_URL}/merchants/dashboard/orders/pending/`, {
        headers: await getAuthHeaders(),
      });
      return response.data;
    } catch (error) {
      console.error('Error fetching pending orders:', error);
      throw error;
    }
  }

  async getRecentOrders(): Promise<MerchantOrder[]> {
    try {
      const response = await axios.get(`${API_BASE_URL}/merchants/dashboard/orders/recent/`, {
        headers: await getAuthHeaders(),
      });
      return response.data;
    } catch (error) {
      console.error('Error fetching recent orders:', error);
      throw error;
    }
  }

  // Payout Management
  async getPendingRevenue(): Promise<PendingRevenue[]> {
    try {
      const response = await axios.get(`${API_BASE_URL}/merchants/payout/pending-revenue/`, {
        headers: await getAuthHeaders(),
      });
      return response.data;
    } catch (error) {
      console.error('Error fetching pending revenue:', error);
      throw error;
    }
  }

  async requestPayout(): Promise<any> {
    try {
      const response = await axios.post(`${API_BASE_URL}/merchants/payout/payouts/`, {}, {
        headers: await getAuthHeaders(),
      });
      return response.data;
    } catch (error) {
      console.error('Error requesting payout:', error);
      throw error;
    }
  }

  async getRevenueSummary(params?: { period?: string }): Promise<RevenueSummary> {
    try {
      const response = await axios.get(`${API_BASE_URL}/merchants/payout/revenue-summary/`, {
        params,
        headers: await getAuthHeaders(),
      });
      return response.data;
    } catch (error) {
      console.error('Error fetching revenue summary:', error);
      throw error;
    }
  }

  // Dashboard Statistics
  async getDashboardStats(): Promise<MerchantDashboardStats> {
    try {
      const response = await axios.get(`${API_BASE_URL}/merchants/dashboard/dashboard/stats/`, {
        headers: await getAuthHeaders(),
      });
      return response.data;
    } catch (error) {
      console.error('Error fetching dashboard stats:', error);
      throw error;
    }
  }
}

// Create singleton instance
export const merchantDashboardService = new MerchantDashboardService();

export default merchantDashboardService;
