// Temporary local copy of ecommerceService for ShoppingTab
// TODO: Remove this once the shared module is properly built and linked
import { api } from './api';

// Product interfaces (matching shared types)
export interface Product {
  id: string;
  name: string;
  price: number;
  images: Array<{
    id: string;
    image_url: string;
    thumbnail_url?: string;
    alt_text?: string;
    sort_order: number;
    is_primary: boolean;
  }>;
  store: {
    id: string;
    name: string;
  };
  is_featured: boolean;
}

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
}

// Create singleton instance
export const ecommerceService = new EcommerceService();

// Export types
export type { EcommerceService };
