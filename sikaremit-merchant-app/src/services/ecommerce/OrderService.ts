/**
 * Merchant Order Service
 *
 * Handles all order-related API operations for merchant app
 */

import axios from 'axios';
import { API_BASE_URL } from '../../constants/api';
import { getAuthHeaders } from '../authService';
import {
  Order,
  OrderListRequest,
  OrderListResponse,
  UpdateOrderRequest,
  OrderStatus,
  PaymentStatus,
  FulfillmentStatus
} from '@sikaremit/mobile-shared';

class OrderService {
  /**
   * Get orders with filtering and pagination
   */
  static async getOrders(request: OrderListRequest = {}): Promise<OrderListResponse> {
    const params = new URLSearchParams();

    if (request.store_id) params.append('store_id', request.store_id);
    if (request.status) params.append('status', request.status);
    if (request.payment_status) params.append('payment_status', request.payment_status);
    if (request.fulfillment_status) params.append('fulfillment_status', request.fulfillment_status);
    if (request.customer_id) params.append('customer_id', request.customer_id);
    if (request.date_from) params.append('date_from', request.date_from);
    if (request.date_to) params.append('date_to', request.date_to);
    if (request.search) params.append('search', request.search);
    if (request.sort_by) params.append('sort_by', request.sort_by);
    if (request.sort_order) params.append('sort_order', request.sort_order);
    if (request.page) params.append('page', request.page.toString());
    if (request.page_size) params.append('page_size', request.page_size.toString());

    const response = await axios.get(`${API_BASE_URL}/api/v1/ecommerce/orders/?${params.toString()}`, {
      headers: await getAuthHeaders()
    });
    return response.data;
  }

  /**
   * Get single order details
   */
  static async getOrder(id: string): Promise<Order> {
    const response = await axios.get(`${API_BASE_URL}/api/v1/ecommerce/orders/${id}/`, {
      headers: await getAuthHeaders()
    });
    return response.data;
  }

  /**
   * Update order status
   */
  static async updateOrder(id: string, request: UpdateOrderRequest): Promise<Order> {
    const response = await axios.patch(`${API_BASE_URL}/api/v1/ecommerce/orders/${id}/`, request, {
      headers: await getAuthHeaders()
    });
    return response.data;
  }

  /**
   * Cancel order
   */
  static async cancelOrder(id: string, reason?: string): Promise<void> {
    await axios.post(`${API_BASE_URL}/api/v1/ecommerce/orders/${id}/cancel/`, { reason }, {
      headers: await getAuthHeaders()
    });
  }

  /**
   * Process refund
   */
  static async processRefund(orderId: string, amount: number, reason: string): Promise<Order> {
    const response = await axios.post(`${API_BASE_URL}/api/v1/ecommerce/orders/${orderId}/refund/`, {
      amount,
      reason
    }, {
      headers: await getAuthHeaders()
    });
    return response.data;
  }

  /**
   * Update order fulfillment
   */
  static async updateFulfillment(
    orderId: string,
    itemId: string,
    status: FulfillmentStatus,
    trackingNumber?: string,
    carrier?: string
  ): Promise<Order> {
    const response = await axios.patch(`${API_BASE_URL}/api/v1/ecommerce/orders/${orderId}/items/${itemId}/`, {
      status,
      tracking_number: trackingNumber,
      shipping_carrier: carrier
    }, {
      headers: await getAuthHeaders()
    });
    return response.data;
  }

  /**
   * Bulk update order statuses
   */
  static async bulkUpdateOrders(updates: Array<{ id: string; status: OrderStatus }>): Promise<void> {
    await axios.post(`${API_BASE_URL}/api/v1/ecommerce/orders/bulk-update/`, { updates }, {
      headers: await getAuthHeaders()
    });
  }

  /**
   * Get order statistics
   */
  static async getOrderStats(storeId?: string): Promise<{
    total_orders: number;
    pending_orders: number;
    processing_orders: number;
    shipped_orders: number;
    delivered_orders: number;
    cancelled_orders: number;
    total_revenue: number;
    average_order_value: number;
  }> {
    const params = storeId ? `?store_id=${storeId}` : '';
    const response = await axios.get(`${API_BASE_URL}/api/v1/ecommerce/orders/stats/${params}`, {
      headers: await getAuthHeaders()
    });
    return response.data;
  }

  /**
   * Export orders
   */
  static async exportOrders(request: OrderListRequest): Promise<Blob> {
    const params = new URLSearchParams();

    if (request.store_id) params.append('store_id', request.store_id);
    if (request.status) params.append('status', request.status);
    if (request.date_from) params.append('date_from', request.date_from);
    if (request.date_to) params.append('date_to', request.date_to);

    const response = await axios.get(`${API_BASE_URL}/api/v1/ecommerce/orders/export/?${params.toString()}`, {
      headers: await getAuthHeaders(),
      responseType: 'blob'
    });
    return response.data;
  }

  /**
   * Send order update notification to customer
   */
  static async notifyCustomer(orderId: string, message: string): Promise<void> {
    await axios.post(`${API_BASE_URL}/api/v1/ecommerce/orders/${orderId}/notify/`, { message }, {
      headers: await getAuthHeaders()
    });
  }

  /**
   * Get order fulfillment timeline
   */
  static async getOrderTimeline(orderId: string): Promise<Array<{
    timestamp: string;
    status: string;
    description: string;
    user?: string;
  }>> {
    const response = await axios.get(`${API_BASE_URL}/api/v1/ecommerce/orders/${orderId}/timeline/`, {
      headers: await getAuthHeaders()
    });
    return response.data;
  }

  /**
   * Generate shipping label
   */
  static async generateShippingLabel(orderId: string, itemId: string, carrier: string): Promise<{
    label_url: string;
    tracking_number: string;
    carrier: string;
  }> {
    const response = await axios.post(`${API_BASE_URL}/api/v1/ecommerce/orders/${orderId}/items/${itemId}/shipping-label/`, {
      carrier
    }, {
      headers: await getAuthHeaders()
    });
    return response.data;
  }

  /**
   * Update delivery status
   */
  static async updateDeliveryStatus(orderId: string, itemId: string, status: string, notes?: string): Promise<Order> {
    const response = await axios.patch(`${API_BASE_URL}/api/v1/ecommerce/orders/${orderId}/items/${itemId}/delivery/`, {
      status,
      notes
    }, {
      headers: await getAuthHeaders()
    });
    return response.data;
  }

  /**
   * Get available shipping carriers
   */
  static async getShippingCarriers(): Promise<Array<{
    id: string;
    name: string;
    code: string;
    services: string[];
    estimated_delivery_days: number;
    cost_per_kg: number;
  }>> {
    const response = await axios.get(`${API_BASE_URL}/api/v1/ecommerce/shipping/carriers/`, {
      headers: await getAuthHeaders()
    });
    return response.data;
  }

  /**
   * Calculate shipping cost
   */
  static async calculateShippingCost(
    weight: number,
    carrier: string,
    fromAddress: string,
    toAddress: string
  ): Promise<{
    cost: number;
    estimated_days: number;
    currency: string;
  }> {
    const response = await axios.post(`${API_BASE_URL}/api/v1/ecommerce/shipping/calculate/`, {
      weight,
      carrier,
      from_address: fromAddress,
      to_address: toAddress
    }, {
      headers: await getAuthHeaders()
    });
    return response.data;
  }

  /**
   * Process return request
   */
  static async processReturnRequest(
    orderId: string,
    itemId: string,
    reason: string,
    description: string,
    images?: string[]
  ): Promise<{
    return_id: string;
    status: string;
    estimated_refund_date?: string;
  }> {
    const response = await axios.post(`${API_BASE_URL}/api/v1/ecommerce/orders/${orderId}/items/${itemId}/return/`, {
      reason,
      description,
      images
    }, {
      headers: await getAuthHeaders()
    });
    return response.data;
  }

  /**
   * Approve/reject return request
   */
  static async updateReturnRequest(
    orderId: string,
    itemId: string,
    returnId: string,
    action: 'approve' | 'reject',
    notes?: string
  ): Promise<{
    return_id: string;
    status: string;
    refund_amount?: number;
  }> {
    const response = await axios.patch(`${API_BASE_URL}/api/v1/ecommerce/orders/${orderId}/items/${itemId}/return/${returnId}/`, {
      action,
      notes
    }, {
      headers: await getAuthHeaders()
    });
    return response.data;
  }

  /**
   * Get delivery tracking information
   */
  static async getDeliveryTracking(trackingNumber: string, carrier: string): Promise<{
    tracking_number: string;
    carrier: string;
    status: string;
    events: Array<{
      timestamp: string;
      location: string;
      description: string;
      status: string;
    }>;
    estimated_delivery?: string;
  }> {
    const response = await axios.get(`${API_BASE_URL}/api/v1/ecommerce/delivery/track/`, {
      params: { tracking_number: trackingNumber, carrier },
      headers: await getAuthHeaders()
    });
    return response.data;
  }

  /**
   * Bulk update order statuses
   */
  static async bulkFulfillOrders(updates: Array<{
    order_id: string;
    item_id: string;
    tracking_number?: string;
    carrier?: string;
  }>): Promise<void> {
    await axios.post(`${API_BASE_URL}/api/v1/ecommerce/orders/bulk-fulfill/`, {
      updates
    }, {
      headers: await getAuthHeaders()
    });
  }
}

export { OrderService };
