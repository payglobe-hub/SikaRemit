/**
 * Offline Queue Service
 *
 * Manages operations that need to be synced when the app comes back online
 */

import AsyncStorage from '@react-native-async-storage/async-storage';
import NetInfo, { NetInfoSubscription } from '@react-native-community/netinfo';

export interface QueuedOperation {
  id: string;
  type: 'order_update' | 'inventory_update' | 'product_create' | 'product_update' | 'notification_send';
  data: any;
  timestamp: number;
  retryCount: number;
  maxRetries: number;
  status: 'pending' | 'processing' | 'completed' | 'failed';
  error?: string;
}

class OfflineQueueService {
  private static instance: OfflineQueueService;
  private queue: QueuedOperation[] = [];
  private isOnline = true;
  private isProcessing = false;
  private queueKey = 'offline_queue';
  private listeners: Array<(queue: QueuedOperation[]) => void> = [];

  private constructor() {
    this.initialize();
  }

  static getInstance(): OfflineQueueService {
    if (!OfflineQueueService.instance) {
      OfflineQueueService.instance = new OfflineQueueService();
    }
    return OfflineQueueService.instance;
  }

  /**
   * Initialize the offline queue service
   */
  private async initialize(): Promise<NetInfoSubscription> {
    // Load existing queue from storage
    await this.loadQueue();

    // Monitor network status
    const unsubscribe = NetInfo.addEventListener(state => {
      const wasOnline = this.isOnline;
      this.isOnline = state.isConnected ?? false;

      // If we just came back online, start processing the queue
      if (!wasOnline && this.isOnline && this.queue.length > 0) {
        this.processQueue();
      }
    });

    // Start processing if we're online and have items in queue
    if (this.isOnline && this.queue.length > 0) {
      this.processQueue();
    }

    return unsubscribe;
  }

  /**
   * Add an operation to the queue
   */
  async enqueue(operation: Omit<QueuedOperation, 'id' | 'timestamp' | 'retryCount' | 'status'>): Promise<string> {
    const queuedOperation: QueuedOperation = {
      id: `op_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      timestamp: Date.now(),
      retryCount: 0,
      status: 'pending',
      ...operation
    };

    this.queue.push(queuedOperation);
    await this.saveQueue();

    // Notify listeners
    this.notifyListeners();

    // If online, try to process immediately
    if (this.isOnline && !this.isProcessing) {
      this.processQueue();
    }

    return queuedOperation.id;
  }

  /**
   * Remove an operation from the queue
   */
  async dequeue(operationId: string): Promise<void> {
    this.queue = this.queue.filter(op => op.id !== operationId);
    await this.saveQueue();
    this.notifyListeners();
  }

  /**
   * Get all queued operations
   */
  getQueue(): QueuedOperation[] {
    return [...this.queue];
  }

  /**
   * Clear completed operations
   */
  async clearCompleted(): Promise<void> {
    this.queue = this.queue.filter(op => op.status !== 'completed');
    await this.saveQueue();
    this.notifyListeners();
  }

  /**
   * Clear failed operations
   */
  async clearFailed(): Promise<void> {
    this.queue = this.queue.filter(op => op.status !== 'failed');
    await this.saveQueue();
    this.notifyListeners();
  }

  /**
   * Subscribe to queue changes
   */
  onQueueChange(listener: (queue: QueuedOperation[]) => void): () => void {
    this.listeners.push(listener);

    // Return unsubscribe function
    return () => {
      const index = this.listeners.indexOf(listener);
      if (index > -1) {
        this.listeners.splice(index, 1);
      }
    };
  }

  /**
   * Get queue statistics
   */
  getQueueStats() {
    const stats = {
      total: this.queue.length,
      pending: this.queue.filter(op => op.status === 'pending').length,
      processing: this.queue.filter(op => op.status === 'processing').length,
      completed: this.queue.filter(op => op.status === 'completed').length,
      failed: this.queue.filter(op => op.status === 'failed').length,
    };

    return stats;
  }

  /**
   * Check if we're currently online
   */
  get isCurrentlyOnline(): boolean {
    return this.isOnline;
  }

  /**
   * Process the queue
   */
  private async processQueue(): Promise<void> {
    if (this.isProcessing || !this.isOnline) {
      return;
    }

    this.isProcessing = true;

    try {
      // Get pending operations
      const pendingOps = this.queue.filter(op => op.status === 'pending');

      for (const operation of pendingOps) {
        try {
          operation.status = 'processing';
          await this.saveQueue();
          this.notifyListeners();

          // Process the operation based on its type
          await this.processOperation(operation);

          operation.status = 'completed';
          operation.retryCount = 0;

        } catch (error: any) {
          operation.retryCount++;
          operation.error = error.message || 'Unknown error';

          if (operation.retryCount >= operation.maxRetries) {
            operation.status = 'failed';
            console.error(`Operation ${operation.id} failed permanently:`, error);
          } else {
            operation.status = 'pending'; // Will retry
            console.warn(`Operation ${operation.id} failed, will retry (${operation.retryCount}/${operation.maxRetries}):`, error);
          }
        }

        await this.saveQueue();
        this.notifyListeners();
      }
    } finally {
      this.isProcessing = false;
    }
  }

  /**
   * Process a single operation
   */
  private async processOperation(operation: QueuedOperation): Promise<void> {
    // Import services dynamically to avoid circular dependencies
    const { OrderService } = await import('@/services/ecommerce/OrderService');
    const { ProductService } = await import('@/services/ecommerce/ProductService');

    switch (operation.type) {
      case 'order_update':
        await OrderService.updateOrder(operation.data.orderId, operation.data.updateData);
        break;

      case 'inventory_update':
        await ProductService.updateStock(operation.data.productId, operation.data.quantity);
        break;

      case 'product_create':
        await ProductService.createProduct(operation.data.productData);
        break;

      case 'product_update':
        await ProductService.updateProduct(operation.data.updateData);
        break;

      case 'notification_send':
        await OrderService.notifyCustomer(operation.data.orderId, operation.data.message);
        break;

      default:
        throw new Error(`Unknown operation type: ${operation.type}`);
    }
  }

  /**
   * Save queue to AsyncStorage
   */
  private async saveQueue(): Promise<void> {
    try {
      await AsyncStorage.setItem(this.queueKey, JSON.stringify(this.queue));
    } catch (error) {
      console.error('Failed to save offline queue:', error);
    }
  }

  /**
   * Load queue from AsyncStorage
   */
  private async loadQueue(): Promise<void> {
    try {
      const stored = await AsyncStorage.getItem(this.queueKey);
      if (stored) {
        this.queue = JSON.parse(stored);
      }
    } catch (error) {
      console.error('Failed to load offline queue:', error);
      this.queue = [];
    }
  }

  /**
   * Notify listeners of queue changes
   */
  private notifyListeners(): void {
    this.listeners.forEach(listener => {
      try {
        listener(this.getQueue());
      } catch (error) {
        console.error('Error in queue listener:', error);
      }
    });
  }
}

// Create singleton instance
const offlineQueueService = OfflineQueueService.getInstance();

// Export convenience functions
export const enqueueOperation = (operation: Omit<QueuedOperation, 'id' | 'timestamp' | 'retryCount' | 'status'>) =>
  offlineQueueService.enqueue(operation);

export const dequeueOperation = (operationId: string) =>
  offlineQueueService.dequeue(operationId);

export const getOfflineQueue = () =>
  offlineQueueService.getQueue();

export const getQueueStats = () =>
  offlineQueueService.getQueueStats();

export const onQueueChange = (listener: (queue: QueuedOperation[]) => void) =>
  offlineQueueService.onQueueChange(listener);

export const clearCompletedOperations = () =>
  offlineQueueService.clearCompleted();

export const clearFailedOperations = () =>
  offlineQueueService.clearFailed();

export const isOnline = () =>
  offlineQueueService.isCurrentlyOnline;

export default offlineQueueService;
