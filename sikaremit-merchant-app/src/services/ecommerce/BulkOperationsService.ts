/**
 * Bulk Operations Service
 *
 * Handles bulk import/export operations for products and orders
 */

import axios from 'axios';
import { API_BASE_URL } from '../../constants/api';
import { getAuthHeaders } from '../authService';
import * as FileSystem from 'expo-file-system';
import * as Sharing from 'expo-sharing';

export interface ImportResult {
  success: boolean;
  imported_count: number;
  failed_count: number;
  errors: Array<{
    row: number;
    field: string;
    error: string;
  }>;
  warnings: Array<{
    row: number;
    field: string;
    warning: string;
  }>;
}

export interface ExportOptions {
  format: 'csv' | 'excel' | 'json';
  include_images: boolean;
  date_from?: string;
  date_to?: string;
  status?: string;
  category_id?: string;
}

export interface BulkProductImportData {
  name: string;
  description?: string;
  short_description?: string;
  sku?: string;
  barcode?: string;
  price: number;
  compare_price?: number;
  cost_price?: number;
  category_name: string;
  stock_quantity: number;
  low_stock_threshold: number;
  is_featured?: boolean;
  is_available?: boolean;
  tags?: string;
  weight?: number;
}

export interface BulkOrderExportData {
  order_number: string;
  customer_name: string;
  customer_email: string;
  customer_phone?: string;
  order_date: string;
  status: string;
  payment_status: string;
  payment_method: string;
  subtotal: number;
  shipping_cost: number;
  tax_amount: number;
  discount_amount: number;
  total_amount: number;
  currency: string;
  shipping_address: string;
  billing_address?: string;
  items_count: number;
  items: Array<{
    product_name: string;
    sku?: string;
    quantity: number;
    unit_price: number;
    total_price: number;
  }>;
}

class BulkOperationsService {
  /**
   * Export products to file
   */
  static async exportProducts(options: ExportOptions = { format: 'csv', include_images: false }): Promise<void> {
    try {
      const params = new URLSearchParams();
      params.append('format', options.format);
      params.append('include_images', options.include_images.toString());

      if (options.date_from) params.append('date_from', options.date_from);
      if (options.date_to) params.append('date_to', options.date_to);
      if (options.status) params.append('status', options.status);
      if (options.category_id) params.append('category_id', options.category_id);

      const response = await axios.get(`${API_BASE_URL}/api/v1/merchants/products/export/?${params.toString()}`, {
        headers: await getAuthHeaders(),
        responseType: 'blob'
      });

      // Create temporary file
      const fileName = `products_export_${new Date().toISOString().split('T')[0]}.${options.format}`;
      const fileUri = FileSystem.documentDirectory + fileName;

      // Write blob to file
      const base64Data = await blobToBase64(response.data);
      await FileSystem.writeAsStringAsync(fileUri, base64Data, {
        encoding: FileSystem.EncodingType.Base64
      });

      // Share the file
      if (await Sharing.isAvailableAsync()) {
        await Sharing.shareAsync(fileUri, {
          mimeType: getMimeType(options.format),
          dialogTitle: 'Export Products'
        });
      }
    } catch (error: any) {
      console.error('Failed to export products:', error);
      throw new Error('Failed to export products');
    }
  }

  /**
   * Import products from file
   */
  static async importProducts(): Promise<ImportResult> {
    try {
      // Note: expo-document-picker removed as it's not available
      // In production, implement file picker using react-native-document-picker or similar
      throw new Error('File import not implemented - requires document picker library');

      // Original code that would work with document picker:
      // const result = await DocumentPicker.getDocumentAsync({
      //   type: ['text/csv', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'],
      //   copyToCacheDirectory: true,
      // });
      //
      // if (result.type === 'cancel') {
      //   throw new Error('Import cancelled');
      // }
      //
      // const fileContent = await FileSystem.readAsStringAsync(result.uri, {
      //   encoding: FileSystem.EncodingType.UTF8
      // });
      //
      // const products = parseCSVToProducts(fileContent);
      //
      // const formData = new FormData();
      // formData.append('file', {
      //   uri: result.uri,
      //   name: result.name,
      //   type: result.mimeType || 'text/csv'
      // } as any);
      //
      // const response = await axios.post(`${API_BASE_URL}/api/v1/merchants/products/bulk-import/`, formData, {
      //   headers: await getAuthHeaders(),
      // });
      //
      // return response.data;
    } catch (error: any) {
      console.error('Failed to import products:', error);
      throw new Error('Failed to import products');
    }
  }

  /**
   * Export orders to file
   */
  static async exportOrders(options: ExportOptions = { format: 'csv', include_images: false }): Promise<void> {
    try {
      const params = new URLSearchParams();
      params.append('format', options.format);

      if (options.date_from) params.append('date_from', options.date_from);
      if (options.date_to) params.append('date_to', options.date_to);
      if (options.status) params.append('status', options.status);

      const response = await axios.get(`${API_BASE_URL}/api/v1/ecommerce/orders/export/?${params.toString()}`, {
        headers: await getAuthHeaders(),
        responseType: 'blob'
      });

      // Create temporary file
      const fileName = `orders_export_${new Date().toISOString().split('T')[0]}.${options.format}`;
      const fileUri = FileSystem.documentDirectory + fileName;

      // Write blob to file
      const base64Data = await blobToBase64(response.data);
      await FileSystem.writeAsStringAsync(fileUri, base64Data, {
        encoding: FileSystem.EncodingType.Base64
      });

      // Share the file
      if (await Sharing.isAvailableAsync()) {
        await Sharing.shareAsync(fileUri, {
          mimeType: getMimeType(options.format),
          dialogTitle: 'Export Orders'
        });
      }
    } catch (error: any) {
      console.error('Failed to export orders:', error);
      throw new Error('Failed to export orders');
    }
  }

  /**
   * Bulk update product prices
   */
  static async bulkUpdatePrices(updates: Array<{
    product_id: string;
    new_price: number;
    new_compare_price?: number;
  }>): Promise<ImportResult> {
    try {
      const response = await axios.post(`${API_BASE_URL}/api/v1/merchants/products/bulk-update-prices/`, {
        updates
      }, {
        headers: await getAuthHeaders()
      });

      return response.data;
    } catch (error: any) {
      console.error('Failed to bulk update prices:', error);
      throw new Error('Failed to update product prices');
    }
  }

  /**
   * Bulk update stock levels
   */
  static async bulkUpdateStock(updates: Array<{
    product_id: string;
    quantity: number;
    operation: 'set' | 'add' | 'subtract';
  }>): Promise<ImportResult> {
    try {
      const response = await axios.post(`${API_BASE_URL}/api/v1/merchants/products/bulk-update-stock/`, {
        updates
      }, {
        headers: await getAuthHeaders()
      });

      return response.data;
    } catch (error: any) {
      console.error('Failed to bulk update stock:', error);
      throw new Error('Failed to update stock levels');
    }
  }

  /**
   * Bulk activate/deactivate products
   */
  static async bulkUpdateStatus(productIds: string[], status: 'active' | 'inactive'): Promise<ImportResult> {
    try {
      const updates = productIds.map(id => ({
        id,
        status: status === 'active' ? 'active' : 'inactive'
      }));

      const response = await axios.post(`${API_BASE_URL}/api/v1/merchants/products/bulk-update-status/`, {
        updates
      }, {
        headers: await getAuthHeaders()
      });

      return response.data;
    } catch (error: any) {
      console.error('Failed to bulk update status:', error);
      throw new Error('Failed to update product status');
    }
  }

  /**
   * Bulk delete products
   */
  static async bulkDeleteProducts(productIds: string[]): Promise<ImportResult> {
    try {
      const response = await axios.post(`${API_BASE_URL}/api/v1/merchants/products/bulk-delete/`, {
        product_ids: productIds
      }, {
        headers: await getAuthHeaders()
      });

      return response.data;
    } catch (error: any) {
      console.error('Failed to bulk delete products:', error);
      throw new Error('Failed to delete products');
    }
  }

  /**
   * Bulk update order statuses
   */
  static async bulkUpdateOrderStatuses(updates: Array<{
    order_id: string;
    status: string;
  }>): Promise<ImportResult> {
    try {
      const response = await axios.post(`${API_BASE_URL}/api/v1/ecommerce/orders/bulk-update-status/`, {
        updates
      }, {
        headers: await getAuthHeaders()
      });

      return response.data;
    } catch (error: any) {
      console.error('Failed to bulk update order statuses:', error);
      throw new Error('Failed to update order statuses');
    }
  }

  /**
   * Get import/export history
   */
  static async getOperationHistory(type: 'import' | 'export', operation: 'products' | 'orders'): Promise<Array<{
    id: string;
    timestamp: string;
    status: 'success' | 'partial' | 'failed';
    records_processed: number;
    records_failed: number;
    file_name?: string;
    error_message?: string;
  }>> {
    const response = await axios.get(`${API_BASE_URL}/api/v1/merchants/bulk-operations/history/?type=${type}&operation=${operation}`, {
      headers: await getAuthHeaders()
    });
    return response.data;
  }

  /**
   * Validate import data before processing
   */
  static async validateImportData(
    data: BulkProductImportData[],
    type: 'products' | 'orders'
  ): Promise<{
    valid: boolean;
    errors: Array<{
      row: number;
      field: string;
      error: string;
    }>;
    warnings: Array<{
      row: number;
      field: string;
      warning: string;
    }>;
  }> {
    const response = await axios.post(`${API_BASE_URL}/api/v1/merchants/bulk-operations/validate/`, {
      type,
      data
    }, {
      headers: await getAuthHeaders()
    });

    return response.data;
  }

  /**
   * Download template file
   */
  static async downloadTemplate(type: 'products' | 'orders', format: 'csv' | 'excel' = 'csv'): Promise<void> {
    try {
      const response = await axios.get(`${API_BASE_URL}/api/v1/merchants/bulk-operations/template/?type=${type}&format=${format}`, {
        headers: await getAuthHeaders(),
        responseType: 'blob'
      });

      const fileName = `${type}_import_template.${format}`;
      const fileUri = FileSystem.documentDirectory + fileName;

      const base64Data = await blobToBase64(response.data);
      await FileSystem.writeAsStringAsync(fileUri, base64Data, {
        encoding: FileSystem.EncodingType.Base64
      });

      if (await Sharing.isAvailableAsync()) {
        await Sharing.shareAsync(fileUri, {
          mimeType: getMimeType(format),
          dialogTitle: `Download ${type} Template`
        });
      }
    } catch (error: any) {
      console.error('Failed to download template:', error);
      throw new Error('Failed to download template');
    }
  }
}

// Helper functions
function blobToBase64(blob: Blob): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
      const base64 = (reader.result as string).split(',')[1];
      resolve(base64);
    };
    reader.onerror = reject;
    reader.readAsDataURL(blob);
  });
}

function getMimeType(format: string): string {
  switch (format) {
    case 'csv':
      return 'text/csv';
    case 'excel':
    case 'xlsx':
      return 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet';
    case 'json':
      return 'application/json';
    case 'pdf':
      return 'application/pdf';
    default:
      return 'application/octet-stream';
  }
}

function parseCSVToProducts(csvContent: string): BulkProductImportData[] {
  // Simplified CSV parsing - in production, use a proper CSV parser
  const lines = csvContent.split('\n');
  const headers = lines[0].split(',').map(h => h.trim().toLowerCase());

  const products: BulkProductImportData[] = [];

  for (let i = 1; i < lines.length; i++) {
    if (!lines[i].trim()) continue;

    const values = lines[i].split(',');
    const product: any = {};

    headers.forEach((header, index) => {
      const value = values[index]?.trim();
      if (value) {
        // Convert string values to appropriate types
        if (['price', 'compare_price', 'cost_price', 'stock_quantity', 'low_stock_threshold', 'weight'].includes(header)) {
          product[header] = parseFloat(value) || 0;
        } else if (['is_featured', 'is_available'].includes(header)) {
          product[header] = value.toLowerCase() === 'true' || value === '1';
        } else {
          product[header] = value;
        }
      }
    });

    if (product.name && product.price && product.category_name) {
      products.push(product as BulkProductImportData);
    }
  }

  return products;
}

export { BulkOperationsService };
