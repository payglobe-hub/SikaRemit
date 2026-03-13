/**
 * Merchant Product Service
 *
 * Handles all product-related API operations for merchant app
 */

import axios from 'axios';
import { API_BASE_URL } from '../../constants/api';
import { getAuthHeaders } from '../../services/authService';
import {
  Product,
  ProductListRequest,
  ProductListResponse,
  CreateProductRequest,
  UpdateProductRequest,
  Category
} from '@sikaremit/mobile-shared';

class ProductService {
  /**
   * Get products with filtering and pagination
   */
  static async getProducts(request: ProductListRequest = {}): Promise<ProductListResponse> {
    const params = new URLSearchParams();

    if (request.store_id) params.append('store_id', request.store_id);
    if (request.category_id) params.append('category_id', request.category_id);
    if (request.search) params.append('search', request.search);
    if (request.min_price !== undefined) params.append('min_price', request.min_price.toString());
    if (request.max_price !== undefined) params.append('max_price', request.max_price.toString());
    if (request.sort_by) params.append('sort_by', request.sort_by);
    if (request.sort_order) params.append('sort_order', request.sort_order);
    if (request.page) params.append('page', request.page.toString());
    if (request.page_size) params.append('page_size', request.page_size.toString());

    const response = await axios.get(`${API_BASE_URL}/api/v1/merchants/products/?${params.toString()}`, {
      headers: await getAuthHeaders(),
    });
    return response.data;
  }

  /**
   * Get single product details
   */
  static async getProduct(id: string): Promise<Product> {
    const response = await axios.get(`${API_BASE_URL}/api/v1/merchants/products/${id}/`, {
      headers: await getAuthHeaders(),
    });
    return response.data;
  }

  /**
   * Create new product
   */
  static async createProduct(request: CreateProductRequest): Promise<Product> {
    const response = await axios.post(`${API_BASE_URL}/api/v1/merchants/products/`, request, {
      headers: await getAuthHeaders(),
    });
    return response.data;
  }

  /**
   * Update existing product
   */
  static async updateProduct(request: UpdateProductRequest): Promise<Product> {
    const response = await axios.patch(`${API_BASE_URL}/api/v1/merchants/products/${request.id}/`, request, {
      headers: await getAuthHeaders(),
    });
    return response.data;
  }

  /**
   * Delete product
   */
  static async deleteProduct(id: string): Promise<void> {
    await axios.delete(`${API_BASE_URL}/api/v1/merchants/products/${id}/`, {
      headers: await getAuthHeaders(),
    });
  }

  /**
   * Get product categories
   */
  static async getCategories(): Promise<Category[]> {
    const response = await axios.get(`${API_BASE_URL}/api/v1/merchants/categories/`, {
      headers: await getAuthHeaders(),
    });
    return response.data;
  }

  /**
   * Bulk update products
   */
  static async bulkUpdateProducts(updates: Array<{ id: string; status?: string; price?: number }>): Promise<void> {
    await axios.post(`${API_BASE_URL}/api/v1/merchants/products/bulk-update/`, { updates }, {
      headers: await getAuthHeaders(),
    });
  }

  /**
   * Get products with low stock (below threshold)
   */
  static async getLowStockProducts(storeId?: string): Promise<Product[]> {
    const response = await axios.get(`${API_BASE_URL}/api/v1/merchants/products/low-stock/${storeId ? `?store_id=${storeId}` : ''}`, {
      headers: await getAuthHeaders(),
    });
    return response.data.products || response.data;
  }

  /**
   * Get products that are out of stock
   */
  static async getOutOfStockProducts(storeId?: string): Promise<Product[]> {
    const response = await axios.get(`${API_BASE_URL}/api/v1/merchants/products/out-of-stock/${storeId ? `?store_id=${storeId}` : ''}`, {
      headers: await getAuthHeaders(),
    });
    return response.data.products || response.data;
  }

  /**
   * Update stock quantity for a product
   */
  static async updateStock(productId: string, quantity: number): Promise<Product> {
    const response = await axios.patch(`${API_BASE_URL}/api/v1/merchants/products/${productId}/stock/`, {
      quantity,
    }, {
      headers: await getAuthHeaders(),
    });
    return response.data;
  }

  /**
   * Duplicate product
   */
  static async duplicateProduct(id: string): Promise<Product> {
    const response = await axios.post(`${API_BASE_URL}/api/v1/merchants/products/${id}/duplicate/`, {}, {
      headers: await getAuthHeaders(),
    });
    return response.data;
  }
}

export { ProductService };
