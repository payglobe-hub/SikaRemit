/**
 * Analytics Service for Merchant App
 *
 * Integrates with backend analytics endpoints for comprehensive business intelligence
 */

import axios from 'axios';
import { API_BASE_URL } from '../../constants/api';
import { getAuthHeaders } from '../../services/authService';
import {
  SalesAnalytics,
  InventoryAnalytics,
} from '@sikaremit/mobile-shared';

export interface AnalyticsFilters {
  date_from?: string;
  date_to?: string;
  store_id?: string;
  category_id?: string;
  product_id?: string;
}

export interface SalesReport {
  total_orders: number;
  total_revenue: number;
  total_customers: number;
  average_order_value: number;
  top_products: Array<{
    product_id: string;
    product_name: string;
    quantity_sold: number;
    revenue: number;
    percentage: number;
  }>;
  revenue_by_category: Array<{
    category_id: string;
    category_name: string;
    revenue: number;
    order_count: number;
    percentage: number;
  }>;
  sales_trend: Array<{
    date: string;
    orders: number;
    revenue: number;
  }>;
  customer_insights: {
    new_customers: number;
    returning_customers: number;
    average_customer_value: number;
    customer_retention_rate: number;
  };
}

export interface InventoryReport {
  total_products: number;
  in_stock_products: number;
  low_stock_products: number;
  out_of_stock_products: number;
  total_value: number;
  inventory_turnover: number;
  stock_alerts: Array<{
    product_id: string;
    product_name: string;
    current_stock: number;
    threshold: number;
    alert_type: 'low_stock' | 'out_of_stock' | 'overstock';
    days_since_last_sale: number;
  }>;
  inventory_trend: Array<{
    date: string;
    total_value: number;
    stock_levels: number;
  }>;
  supplier_performance: Array<{
    supplier_name: string;
    products_count: number;
    average_lead_time: number;
    on_time_delivery_rate: number;
  }>;
}

export interface CustomerAnalytics {
  total_customers: number;
  active_customers: number;
  new_customers_this_month: number;
  customer_lifetime_value: number;
  customer_acquisition_cost: number;
  repeat_purchase_rate: number;
  customer_segments: Array<{
    segment: string;
    customer_count: number;
    average_order_value: number;
    total_revenue: number;
  }>;
  top_customers: Array<{
    customer_id: string;
    customer_name: string;
    total_orders: number;
    total_spent: number;
    last_order_date: string;
    average_order_value: number;
  }>;
}

class AnalyticsService {
  /**
   * Get sales analytics report
   */
  static async getSalesReport(filters: AnalyticsFilters = {}): Promise<SalesReport> {
    const params = new URLSearchParams();

    if (filters.date_from) params.append('date_from', filters.date_from);
    if (filters.date_to) params.append('date_to', filters.date_to);
    if (filters.store_id) params.append('store_id', filters.store_id);
    if (filters.category_id) params.append('category_id', filters.category_id);

    const response = await axios.get(`${API_BASE_URL}/api/v1/merchants/analytics/sales/?${params.toString()}`, {
      headers: await getAuthHeaders(),
    });
    return response.data;
  }

  /**
   * Get inventory analytics report
   */
  static async getInventoryReport(filters: AnalyticsFilters = {}): Promise<InventoryReport> {
    const params = new URLSearchParams();

    if (filters.date_from) params.append('date_from', filters.date_from);
    if (filters.date_to) params.append('date_to', filters.date_to);
    if (filters.store_id) params.append('store_id', filters.store_id);

    const response = await axios.get(`${API_BASE_URL}/api/v1/merchants/analytics/inventory/?${params.toString()}`, {
      headers: await getAuthHeaders(),
    });
    return response.data;
  }

  /**
   * Get customer analytics report
   */
  static async getCustomerAnalytics(filters: AnalyticsFilters = {}): Promise<CustomerAnalytics> {
    const params = new URLSearchParams();

    if (filters.date_from) params.append('date_from', filters.date_from);
    if (filters.date_to) params.append('date_to', filters.date_to);
    if (filters.store_id) params.append('store_id', filters.store_id);

    const response = await axios.get(`${API_BASE_URL}/api/v1/merchants/analytics/customers/?${params.toString()}`, {
      headers: await getAuthHeaders(),
    });
    return response.data;
  }

  /**
   * Get dashboard summary metrics
   */
  static async getDashboardMetrics(storeId?: string): Promise<{
    today_sales: number;
    today_orders: number;
    week_sales: number;
    week_orders: number;
    month_sales: number;
    month_orders: number;
    pending_orders: number;
    low_stock_alerts: number;
    growth_percentage: number;
    top_product: {
      name: string;
      sales: number;
    } | null;
  }> {
    const params = storeId ? `?store_id=${storeId}` : '';
    const response = await axios.get(`${API_BASE_URL}/api/v1/merchants/analytics/dashboard/${params}`, {
      headers: await getAuthHeaders(),
    });
    return response.data;
  }

  /**
   * Get real-time metrics (for live dashboard updates)
   */
  static async getRealtimeMetrics(): Promise<{
    active_orders: number;
    pending_fulfillments: number;
    recent_sales: Array<{
      order_id: string;
      amount: number;
      timestamp: string;
      customer_name: string;
    }>;
    stock_alerts: number;
    last_updated: string;
  }> {
    const response = await axios.get(`${API_BASE_URL}/api/v1/merchants/analytics/realtime/`, {
      headers: await getAuthHeaders(),
    });
    return response.data;
  }

  /**
   * Export analytics report
   */
  static async exportAnalyticsReport(
    type: 'sales' | 'inventory' | 'customers',
    format: 'pdf' | 'excel' | 'csv',
    filters: AnalyticsFilters = {}
  ): Promise<Blob> {
    const params = new URLSearchParams();
    params.append('format', format);

    if (filters.date_from) params.append('date_from', filters.date_from);
    if (filters.date_to) params.append('date_to', filters.date_to);
    if (filters.store_id) params.append('store_id', filters.store_id);
    if (filters.category_id) params.append('category_id', filters.category_id);

    const response = await axios.get(`${API_BASE_URL}/api/v1/merchants/analytics/${type}/export/?${params.toString()}`, {
      headers: await getAuthHeaders(),
      responseType: 'blob'
    });
    return response.data;
  }

  /**
   * Get performance insights and recommendations
   */
  static async getPerformanceInsights(): Promise<{
    insights: Array<{
      type: 'success' | 'warning' | 'info';
      title: string;
      description: string;
      action_required: boolean;
      suggested_action?: string;
    }>;
    recommendations: Array<{
      category: string;
      title: string;
      description: string;
      potential_impact: string;
      priority: 'high' | 'medium' | 'low';
    }>;
  }> {
    const response = await axios.get(`${API_BASE_URL}/api/v1/merchants/analytics/insights/`, {
      headers: await getAuthHeaders(),
    });
    return response.data;
  }

  /**
   * Get comparative analytics (vs previous periods)
   */
  static async getComparativeAnalytics(
    period: 'week' | 'month' | 'quarter',
    compareWith: 'previous' | 'same_period_last_year'
  ): Promise<{
    sales_comparison: {
      current: number;
      previous: number;
      change_percentage: number;
      trend: 'up' | 'down' | 'stable';
    };
    orders_comparison: {
      current: number;
      previous: number;
      change_percentage: number;
      trend: 'up' | 'down' | 'stable';
    };
    customer_comparison: {
      current: number;
      previous: number;
      change_percentage: number;
      trend: 'up' | 'down' | 'stable';
    };
    top_performers: Array<{
      type: 'product' | 'category' | 'customer';
      name: string;
      current_value: number;
      previous_value: number;
      growth: number;
    }>;
  }> {
    const params = new URLSearchParams();
    params.append('period', period);
    params.append('compare_with', compareWith);

    const response = await axios.get(`${API_BASE_URL}/api/v1/merchants/analytics/comparative/?${params.toString()}`, {
      headers: await getAuthHeaders(),
    });
    return response.data;
  }

  /**
   * Set up automated reports
   */
  static async setupAutomatedReport(config: {
    report_type: 'sales' | 'inventory' | 'customers' | 'dashboard';
    frequency: 'daily' | 'weekly' | 'monthly';
    recipients: string[];
    format: 'pdf' | 'excel' | 'csv';
    filters?: AnalyticsFilters;
  }): Promise<{ report_id: string; next_run: string }> {
    const response = await axios.post(`${API_BASE_URL}/api/v1/merchants/analytics/automated-reports/`, config, {
      headers: await getAuthHeaders(),
    });
    return response.data;
  }

  /**
   * Get automated reports list
   */
  static async getAutomatedReports(): Promise<Array<{
    id: string;
    report_type: string;
    frequency: string;
    next_run: string;
    last_run?: string;
    is_active: boolean;
    recipients: string[];
  }>> {
    const response = await axios.get(`${API_BASE_URL}/api/v1/merchants/analytics/automated-reports/`, {
      headers: await getAuthHeaders(),
    });
    return response.data;
  }

  /**
   * Update automated report settings
   */
  static async updateAutomatedReport(
    reportId: string,
    updates: Partial<{
      frequency: 'daily' | 'weekly' | 'monthly';
      recipients: string[];
      format: 'pdf' | 'excel' | 'csv';
      filters: AnalyticsFilters;
      is_active: boolean;
    }>
  ): Promise<void> {
    await axios.patch(`${API_BASE_URL}/api/v1/merchants/analytics/automated-reports/${reportId}/`, updates, {
      headers: await getAuthHeaders(),
    });
  }

  /**
   * Delete automated report
   */
  static async deleteAutomatedReport(reportId: string): Promise<void> {
    await axios.delete(`${API_BASE_URL}/api/v1/merchants/analytics/automated-reports/${reportId}/`, {
      headers: await getAuthHeaders(),
    });
  }
}

export { AnalyticsService };
