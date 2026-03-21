/**
 * WebSocket Service for Real-time Updates
 *
 * Handles WebSocket connections for real-time order and inventory updates
 */

import { API_BASE_URL } from '@/constants/api';
import { getAuthHeaders } from '@/services/authService';
import { handleWebSocketNotification } from '@/services/PushNotificationService';

export interface WebSocketMessage {
  type: string;
  data: any;
}

export interface WebSocketNotificationMessage extends WebSocketMessage {
  type: 'notification';
  id: string;
  data: Record<string, any>;
}

export interface OrderUpdateMessage extends WebSocketMessage {
  type: 'order_update';
  data: {
    order_id: string;
    status: string;
    timestamp: string;
  };
}

export interface InventoryUpdateMessage extends WebSocketMessage {
  type: 'inventory_update';
  data: {
    product_id: string;
    quantity: number;
    change: number;
    reason: string;
    timestamp: string;
  };
}

export interface NotificationMessage extends WebSocketMessage {
  type: 'notification';
  data: {
    id: string;
    title: string;
    message: string;
    type: 'info' | 'warning' | 'error' | 'success';
    timestamp: string;
  };
}

type MessageHandler<T = any> = (message: T) => void;

class WebSocketService {
  private ws: WebSocket | null = null;
  private reconnectTimeout: NodeJS.Timeout | null = null;
  private reconnectAttempts = 0;
  private maxReconnectAttempts = 5;
  private reconnectDelay = 1000; // Start with 1 second
  private isConnected = false;
  private isConnecting = false;

  // Message handlers
  private messageHandlers: Map<string, MessageHandler[]> = new Map();

  /**
   * Connect to WebSocket server
   */
  async connect(): Promise<void> {
    if (this.isConnected || this.isConnecting) {
      return;
    }

    this.isConnecting = true;

    try {
      // Get authentication token
      const headers = await getAuthHeaders();
      const token = headers.Authorization?.replace('Bearer ', '');

      if (!token) {
        throw new Error('No authentication token available');
      }

      // Create WebSocket URL
      const wsUrl = `${API_BASE_URL.replace('http', 'ws')}/ws/merchant/?token=${token}`;

      this.ws = new WebSocket(wsUrl);

      this.ws.onopen = this.handleOpen.bind(this);
      this.ws.onmessage = this.handleMessage.bind(this);
      this.ws.onclose = this.handleClose.bind(this);
      this.ws.onerror = this.handleError.bind(this);

    } catch (error) {
      console.error('WebSocket connection error:', error);
      this.isConnecting = false;
      this.scheduleReconnect();
    }
  }

  /**
   * Disconnect from WebSocket server
   */
  disconnect(): void {
    if (this.ws) {
      this.ws.close(1000, 'Client disconnect');
      this.ws = null;
    }

    this.isConnected = false;
    this.isConnecting = false;

    if (this.reconnectTimeout) {
      clearTimeout(this.reconnectTimeout);
      this.reconnectTimeout = null;
    }

    this.reconnectAttempts = 0;
  }

  /**
   * Send a message to the server
   */
  send(message: WebSocketMessage): void {
    if (this.ws && this.isConnected) {
      this.ws.send(JSON.stringify(message));
    } else {
      console.warn('WebSocket is not connected. Message not sent:', message);
    }
  }

  /**
   * Subscribe to a message type
   */
  on<T extends WebSocketMessage>(type: string, handler: MessageHandler<T>): () => void {
    if (!this.messageHandlers.has(type)) {
      this.messageHandlers.set(type, []);
    }

    const handlers = this.messageHandlers.get(type)!;
    handlers.push(handler);

    // Return unsubscribe function
    return () => {
      const index = handlers.indexOf(handler);
      if (index > -1) {
        handlers.splice(index, 1);
      }
    };
  }

  /**
   * Handle WebSocket open event
   */
  private handleOpen(): void {
    
    this.isConnected = true;
    this.isConnecting = false;
    this.reconnectAttempts = 0;
    this.reconnectDelay = 1000; // Reset delay

    // Send ping to keep connection alive
    this.startPingInterval();
  }

  /**
   * Handle WebSocket message event
   */
  private handleMessage(event: MessageEvent): void {
    try {
      const message: WebSocketMessage = JSON.parse(event.data);
      this.handleMessageType(message);
    } catch (error) {
      console.error('Error parsing WebSocket message:', error);
    }
  }

  /**
   * Handle WebSocket close event
   */
  private handleClose(event: CloseEvent): void {
    
    this.isConnected = false;
    this.isConnecting = false;

    // Attempt to reconnect unless it was a clean disconnect
    if (event.code !== 1000) {
      this.scheduleReconnect();
    }
  }

  /**
   * Handle WebSocket error event
   */
  private handleError(error: Event): void {
    console.error('WebSocket error:', error);
    this.isConnecting = false;
  }

  /**
   * Handle different message types
   */
  private handleMessageType(message: WebSocketMessage): void {
    const handlers = this.messageHandlers.get(message.type);
    if (handlers) {
      handlers.forEach(handler => {
        try {
          handler(message);
        } catch (error) {
          console.error('Error in message handler:', error);
        }
      });
    }

    // Handle special message types
    switch (message.type) {
      case 'pong':
        // Handle pong response
        break;
      case 'error':
        console.error('WebSocket server error:', message.data);
        break;
      case 'notification':
        
        // Show push notification for important messages
        handleWebSocketNotification(message as WebSocketNotificationMessage);
        break;
      default:
        // Log unhandled message types for debugging
        
    }
  }

  /**
   * Schedule reconnection
   */
  private scheduleReconnect(): void {
    if (this.reconnectAttempts >= this.maxReconnectAttempts) {
      console.error('Max reconnection attempts reached. Giving up.');
      return;
    }

    this.reconnectAttempts++;
    const delay = this.reconnectDelay * Math.pow(2, this.reconnectAttempts - 1); // Exponential backoff

    `);

    this.reconnectTimeout = setTimeout(() => {
      this.connect();
    }, delay);
  }

  /**
   * Start ping interval to keep connection alive
   */
  private startPingInterval(): void {
    // Send ping every 30 seconds
    setInterval(() => {
      if (this.isConnected) {
        this.send({ type: 'ping', data: {} });
      }
    }, 30000);
  }

  /**
   * Get connection status
   */
  get isWebSocketConnected(): boolean {
    return this.isConnected;
  }
}

// Create singleton instance
const webSocketService = new WebSocketService();

// Export convenience functions
export const connectWebSocket = () => webSocketService.connect();
export const disconnectWebSocket = () => webSocketService.disconnect();
export const sendWebSocketMessage = (message: WebSocketMessage) => webSocketService.send(message);
export const onWebSocketMessage = <T extends WebSocketMessage>(type: string, handler: MessageHandler<T>) =>
  webSocketService.on(type, handler);
export const isWebSocketConnected = () => webSocketService.isWebSocketConnected;

export default webSocketService;

