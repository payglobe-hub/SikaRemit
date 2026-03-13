/**
 * Offline Service
 * 
 * Handles offline support for the app:
 * - Network connectivity monitoring
 * - Transaction queue for offline operations
 * - Automatic retry when back online
 * - Local data caching
 */

import NetInfo, { NetInfoState, NetInfoSubscription } from '@react-native-community/netinfo';
import AsyncStorage from '@react-native-async-storage/async-storage';

// Storage keys
const OFFLINE_QUEUE_KEY = 'offline_transaction_queue';
const OFFLINE_CACHE_KEY = 'offline_data_cache';

// Transaction types that can be queued
export type QueueableTransactionType = 
  | 'send_money'
  | 'airtime'
  | 'data_bundle'
  | 'bill_payment'
  | 'remittance';

export interface QueuedTransaction {
  id: string;
  type: QueueableTransactionType;
  data: Record<string, any>;
  createdAt: string;
  retryCount: number;
  maxRetries: number;
  status: 'pending' | 'processing' | 'failed' | 'completed';
  errorMessage?: string;
}

export interface CachedData {
  key: string;
  data: any;
  cachedAt: string;
  expiresAt: string;
}

export interface NetworkStatus {
  isConnected: boolean;
  isInternetReachable: boolean | null;
  type: string;
}

// Generate unique ID for queued transactions
const generateQueueId = (): string => {
  return `queue_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;
};

// Offline Service
const offlineService = {
  // Network status
  _isOnline: true,
  _networkSubscription: null as NetInfoSubscription | null,
  _onlineCallbacks: [] as ((isOnline: boolean) => void)[],
  _processingQueue: false,

  /**
   * Initialize offline service and start monitoring network
   */
  initialize: async (): Promise<void> => {
    // Get initial network state
    const state = await NetInfo.fetch();
    offlineService._isOnline = state.isConnected ?? false;

    // Subscribe to network changes
    offlineService._networkSubscription = NetInfo.addEventListener(
      offlineService._handleNetworkChange
    );

    // Process any pending transactions if online
    if (offlineService._isOnline) {
      offlineService.processQueue();
    }
  },

  /**
   * Cleanup network subscription
   */
  cleanup: (): void => {
    if (offlineService._networkSubscription) {
      offlineService._networkSubscription();
      offlineService._networkSubscription = null;
    }
  },

  /**
   * Handle network state changes
   */
  _handleNetworkChange: (state: NetInfoState): void => {
    const wasOnline = offlineService._isOnline;
    offlineService._isOnline = state.isConnected ?? false;

    // Notify listeners
    offlineService._onlineCallbacks.forEach(callback => {
      callback(offlineService._isOnline);
    });

    // If we just came back online, process the queue
    if (!wasOnline && offlineService._isOnline) {
      
      offlineService.processQueue();
    }
  },

  /**
   * Check if device is online
   */
  isOnline: (): boolean => {
    return offlineService._isOnline;
  },

  /**
   * Get current network status
   */
  getNetworkStatus: async (): Promise<NetworkStatus> => {
    const state = await NetInfo.fetch();
    return {
      isConnected: state.isConnected ?? false,
      isInternetReachable: state.isInternetReachable,
      type: state.type,
    };
  },

  /**
   * Subscribe to online/offline changes
   */
  subscribeToNetworkChanges: (callback: (isOnline: boolean) => void): () => void => {
    offlineService._onlineCallbacks.push(callback);
    
    // Return unsubscribe function
    return () => {
      const index = offlineService._onlineCallbacks.indexOf(callback);
      if (index > -1) {
        offlineService._onlineCallbacks.splice(index, 1);
      }
    };
  },

  /**
   * Add a transaction to the offline queue
   */
  queueTransaction: async (
    type: QueueableTransactionType,
    data: Record<string, any>,
    maxRetries: number = 3
  ): Promise<QueuedTransaction> => {
    const transaction: QueuedTransaction = {
      id: generateQueueId(),
      type,
      data,
      createdAt: new Date().toISOString(),
      retryCount: 0,
      maxRetries,
      status: 'pending',
    };

    // Get existing queue
    const queue = await offlineService.getQueue();
    queue.push(transaction);

    // Save updated queue
    await AsyncStorage.setItem(OFFLINE_QUEUE_KEY, JSON.stringify(queue));

    return transaction;
  },

  /**
   * Get all queued transactions
   */
  getQueue: async (): Promise<QueuedTransaction[]> => {
    try {
      const queueJson = await AsyncStorage.getItem(OFFLINE_QUEUE_KEY);
      return queueJson ? JSON.parse(queueJson) : [];
    } catch (error) {
      console.error('Failed to get offline queue:', error);
      return [];
    }
  },

  /**
   * Get pending transactions count
   */
  getPendingCount: async (): Promise<number> => {
    const queue = await offlineService.getQueue();
    return queue.filter(t => t.status === 'pending').length;
  },

  /**
   * Update a queued transaction
   */
  updateTransaction: async (
    id: string,
    updates: Partial<QueuedTransaction>
  ): Promise<void> => {
    const queue = await offlineService.getQueue();
    const index = queue.findIndex(t => t.id === id);
    
    if (index > -1) {
      queue[index] = { ...queue[index], ...updates };
      await AsyncStorage.setItem(OFFLINE_QUEUE_KEY, JSON.stringify(queue));
    }
  },

  /**
   * Remove a transaction from the queue
   */
  removeTransaction: async (id: string): Promise<void> => {
    const queue = await offlineService.getQueue();
    const filtered = queue.filter(t => t.id !== id);
    await AsyncStorage.setItem(OFFLINE_QUEUE_KEY, JSON.stringify(filtered));
  },

  /**
   * Clear all completed/failed transactions from queue
   */
  clearCompletedTransactions: async (): Promise<void> => {
    const queue = await offlineService.getQueue();
    const pending = queue.filter(t => t.status === 'pending' || t.status === 'processing');
    await AsyncStorage.setItem(OFFLINE_QUEUE_KEY, JSON.stringify(pending));
  },

  /**
   * Clear entire queue
   */
  clearQueue: async (): Promise<void> => {
    await AsyncStorage.removeItem(OFFLINE_QUEUE_KEY);
  },

  /**
   * Process the offline queue
   */
  processQueue: async (): Promise<void> => {
    if (offlineService._processingQueue || !offlineService._isOnline) {
      return;
    }

    offlineService._processingQueue = true;

    try {
      const queue = await offlineService.getQueue();
      const pendingTransactions = queue.filter(t => t.status === 'pending');

      for (const transaction of pendingTransactions) {
        await offlineService.processTransaction(transaction);
      }
    } catch (error) {
      console.error('Error processing offline queue:', error);
    } finally {
      offlineService._processingQueue = false;
    }
  },

  /**
   * Process a single transaction
   */
  processTransaction: async (transaction: QueuedTransaction): Promise<boolean> => {
    if (!offlineService._isOnline) {
      return false;
    }

    await offlineService.updateTransaction(transaction.id, { status: 'processing' });

    try {
      // Import the appropriate service based on transaction type
      // This is done dynamically to avoid circular dependencies
      let result: any;

      switch (transaction.type) {
        case 'send_money': {
          const { paymentService } = await import('./paymentService');
          result = await paymentService.sendMoney(transaction.data as any);
          break;
        }
        case 'airtime': {
          const mobileMoneyService = (await import('./mobileMoneyService')).default;
          result = await mobileMoneyService.buyAirtime(transaction.data as any);
          break;
        }
        case 'data_bundle': {
          const mobileMoneyService = (await import('./mobileMoneyService')).default;
          result = await mobileMoneyService.buyDataBundle(transaction.data as any);
          break;
        }
        case 'bill_payment': {
          const billPaymentService = (await import('./billPaymentService')).default;
          result = await billPaymentService.payBill(transaction.data as any);
          break;
        }
        case 'remittance': {
          const { paymentService } = await import('./paymentService');
          result = await paymentService.sendRemittance(transaction.data as any);
          break;
        }
        default:
          throw new Error(`Unknown transaction type: ${transaction.type}`);
      }

      // Mark as completed
      await offlineService.updateTransaction(transaction.id, {
        status: 'completed',
      });

      return true;
    } catch (error: any) {
      const newRetryCount = transaction.retryCount + 1;
      
      if (newRetryCount >= transaction.maxRetries) {
        // Max retries reached, mark as failed
        await offlineService.updateTransaction(transaction.id, {
          status: 'failed',
          retryCount: newRetryCount,
          errorMessage: error.message || 'Transaction failed after max retries',
        });
      } else {
        // Increment retry count and keep as pending
        await offlineService.updateTransaction(transaction.id, {
          status: 'pending',
          retryCount: newRetryCount,
          errorMessage: error.message,
        });
      }

      return false;
    }
  },

  /**
   * Retry a failed transaction
   */
  retryTransaction: async (id: string): Promise<boolean> => {
    const queue = await offlineService.getQueue();
    const transaction = queue.find(t => t.id === id);

    if (!transaction) {
      return false;
    }

    // Reset status and retry count
    await offlineService.updateTransaction(id, {
      status: 'pending',
      retryCount: 0,
      errorMessage: undefined,
    });

    // Get updated transaction
    const updatedQueue = await offlineService.getQueue();
    const updatedTransaction = updatedQueue.find(t => t.id === id);

    if (updatedTransaction) {
      return offlineService.processTransaction(updatedTransaction);
    }

    return false;
  },

  // ============ Data Caching ============

  /**
   * Cache data for offline use
   */
  cacheData: async (
    key: string,
    data: any,
    ttlMinutes: number = 60
  ): Promise<void> => {
    try {
      const cache = await offlineService.getAllCachedData();
      const now = new Date();
      const expiresAt = new Date(now.getTime() + ttlMinutes * 60 * 1000);

      cache[key] = {
        key,
        data,
        cachedAt: now.toISOString(),
        expiresAt: expiresAt.toISOString(),
      };

      await AsyncStorage.setItem(OFFLINE_CACHE_KEY, JSON.stringify(cache));
    } catch (error) {
      console.error('Failed to cache data:', error);
    }
  },

  /**
   * Get cached data
   */
  getCachedData: async <T>(key: string): Promise<T | null> => {
    try {
      const cache = await offlineService.getAllCachedData();
      const cached = cache[key];

      if (!cached) {
        return null;
      }

      // Check if expired
      if (new Date(cached.expiresAt) < new Date()) {
        // Remove expired data
        delete cache[key];
        await AsyncStorage.setItem(OFFLINE_CACHE_KEY, JSON.stringify(cache));
        return null;
      }

      return cached.data as T;
    } catch (error) {
      console.error('Failed to get cached data:', error);
      return null;
    }
  },

  /**
   * Get all cached data
   */
  getAllCachedData: async (): Promise<Record<string, CachedData>> => {
    try {
      const cacheJson = await AsyncStorage.getItem(OFFLINE_CACHE_KEY);
      return cacheJson ? JSON.parse(cacheJson) : {};
    } catch (error) {
      console.error('Failed to get all cached data:', error);
      return {};
    }
  },

  /**
   * Remove cached data
   */
  removeCachedData: async (key: string): Promise<void> => {
    try {
      const cache = await offlineService.getAllCachedData();
      delete cache[key];
      await AsyncStorage.setItem(OFFLINE_CACHE_KEY, JSON.stringify(cache));
    } catch (error) {
      console.error('Failed to remove cached data:', error);
    }
  },

  /**
   * Clear all cached data
   */
  clearCache: async (): Promise<void> => {
    await AsyncStorage.removeItem(OFFLINE_CACHE_KEY);
  },

  /**
   * Clear expired cache entries
   */
  clearExpiredCache: async (): Promise<void> => {
    try {
      const cache = await offlineService.getAllCachedData();
      const now = new Date();
      let hasChanges = false;

      for (const key of Object.keys(cache)) {
        if (new Date(cache[key].expiresAt) < now) {
          delete cache[key];
          hasChanges = true;
        }
      }

      if (hasChanges) {
        await AsyncStorage.setItem(OFFLINE_CACHE_KEY, JSON.stringify(cache));
      }
    } catch (error) {
      console.error('Failed to clear expired cache:', error);
    }
  },
};

export default offlineService;

