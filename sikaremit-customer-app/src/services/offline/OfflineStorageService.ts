import { DatabaseManager, DatabaseSchema } from './DatabaseManager';
import AsyncStorage from '@react-native-async-storage/async-storage';

export interface OfflineTransaction {
  id: string;
  amount: number;
  currency: string;
  recipient: string;
  recipient_account: string;
  payment_method: string;
  status: 'pending' | 'completed' | 'failed';
  created_at: string;
  processed_at?: string;
  reference: string;
  notes?: string;
  category?: string;
  merchant_id?: string;
  qr_reference?: string;
}

export interface QueuedAction {
  id: string;
  action_type: 'payment' | 'transfer' | 'bill_payment' | 'qr_payment';
  action_data: any;
  status: 'pending' | 'processing' | 'completed' | 'failed';
  retry_count: number;
  max_retries: number;
  created_at: string;
  next_retry_at?: string;
  error_message?: string;
}

export interface SyncStatus {
  id: string;
  table_name: string;
  record_id: string;
  last_synced_at: string;
  sync_status: 'synced' | 'pending' | 'conflict' | 'error';
  conflict_data?: any;
}

export interface CacheEntry<T = any> {
  key: string;
  data: T;
  expires_at: string;
  created_at: string;
}

export class OfflineStorageService {
  private static instance: OfflineStorageService;
  private dbManager: DatabaseManager;
  private isInitialized = false;

  private constructor() {
    this.dbManager = DatabaseManager.getInstance();
  }

  static getInstance(): OfflineStorageService {
    if (!OfflineStorageService.instance) {
      OfflineStorageService.instance = new OfflineStorageService();
    }
    return OfflineStorageService.instance;
  }

  /**
   * Initialize the offline storage service
   */
  async initialize(): Promise<void> {
    if (this.isInitialized) {
      return;
    }

    try {
      await this.dbManager.initialize();
      this.isInitialized = true;
      
    } catch (error) {
      console.error('Failed to initialize OfflineStorageService:', error);
      throw error;
    }
  }

  // ==================== TRANSACTIONS ====================

  /**
   * Save a transaction to offline storage
   */
  async saveTransaction(transaction: Omit<OfflineTransaction, 'created_at'>): Promise<string> {
    if (!this.isInitialized) {
      throw new Error('OfflineStorageService not initialized');
    }

    const transactionWithTimestamp = {
      ...transaction,
      created_at: new Date().toISOString(),
    };

    await this.dbManager.insert('transactions', transactionWithTimestamp);
    
    return transactionWithTimestamp.id;
  }

  /**
   * Get all pending transactions
   */
  async getPendingTransactions(): Promise<OfflineTransaction[]> {
    if (!this.isInitialized) {
      throw new Error('OfflineStorageService not initialized');
    }

    return this.dbManager.query<OfflineTransaction>(
      'transactions',
      ['*'],
      "status = 'pending'",
      [],
      'created_at ASC'
    );
  }

  /**
   * Get all transactions
   */
  async getAllTransactions(limit?: number): Promise<OfflineTransaction[]> {
    if (!this.isInitialized) {
      throw new Error('OfflineStorageService not initialized');
    }

    return this.dbManager.query<OfflineTransaction>(
      'transactions',
      ['*'],
      undefined,
      [],
      'created_at DESC',
      limit
    );
  }

  /**
   * Update transaction status
   */
  async updateTransactionStatus(
    reference: string,
    status: 'pending' | 'completed' | 'failed',
    processedAt?: string
  ): Promise<void> {
    if (!this.isInitialized) {
      throw new Error('OfflineStorageService not initialized');
    }

    const updateData: Partial<DatabaseSchema['transactions']> = {
      status,
      ...(processedAt && { processed_at: processedAt }),
    };

    await this.dbManager.update(
      'transactions',
      updateData,
      'reference = ?',
      [reference]
    );
  }

  /**
   * Get transaction by reference
   */
  async getTransactionByReference(reference: string): Promise<OfflineTransaction | null> {
    if (!this.isInitialized) {
      throw new Error('OfflineStorageService not initialized');
    }

    const transactions = await this.dbManager.query<OfflineTransaction>(
      'transactions',
      ['*'],
      'reference = ?',
      [reference]
    );

    return transactions.length > 0 ? transactions[0] : null;
  }

  // ==================== QUEUED ACTIONS ====================

  /**
   * Queue an action for later processing
   */
  async queueAction(action: Omit<QueuedAction, 'id' | 'created_at' | 'retry_count'>): Promise<string> {
    if (!this.isInitialized) {
      throw new Error('OfflineStorageService not initialized');
    }

    const queuedAction: QueuedAction = {
      ...action,
      id: this.generateId(),
      created_at: new Date().toISOString(),
      retry_count: 0,
    };

    await this.dbManager.insert('queued_actions', {
      ...queuedAction,
      action_data: JSON.stringify(queuedAction.action_data),
    });

    
    return queuedAction.id;
  }

  /**
   * Get pending queued actions
   */
  async getPendingActions(): Promise<QueuedAction[]> {
    if (!this.isInitialized) {
      throw new Error('OfflineStorageService not initialized');
    }

    const actions = await this.dbManager.query<any>(
      'queued_actions',
      ['*'],
      "status = 'pending' AND (next_retry_at IS NULL OR next_retry_at <= datetime('now'))",
      [],
      'created_at ASC'
    );

    // Parse action_data JSON
    return actions.map(action => ({
      ...action,
      action_data: JSON.parse(action.action_data),
    }));
  }

  /**
   * Update queued action status
   */
  async updateActionStatus(
    id: string,
    status: 'pending' | 'processing' | 'completed' | 'failed',
    errorMessage?: string,
    nextRetryAt?: string
  ): Promise<void> {
    if (!this.isInitialized) {
      throw new Error('OfflineStorageService not initialized');
    }

    const updateData: Partial<DatabaseSchema['queued_actions']> = {
      status,
      ...(errorMessage && { error_message: errorMessage }),
      ...(nextRetryAt && { next_retry_at: nextRetryAt }),
    };

    if (status === 'processing') {
      // Increment retry count when processing
      const currentAction = await this.getActionById(id);
      if (currentAction) {
        updateData.retry_count = currentAction.retry_count + 1;
      }
    }

    await this.dbManager.update('queued_actions', updateData, 'id = ?', [id]);
  }

  /**
   * Get action by ID
   */
  async getActionById(id: string): Promise<QueuedAction | null> {
    if (!this.isInitialized) {
      throw new Error('OfflineStorageService not initialized');
    }

    const actions = await this.dbManager.query<any>(
      'queued_actions',
      ['*'],
      'id = ?',
      [id]
    );

    if (actions.length === 0) {
      return null;
    }

    const action = actions[0];
    return {
      ...action,
      action_data: JSON.parse(action.action_data),
    };
  }

  /**
   * Delete completed actions
   */
  async deleteCompletedActions(): Promise<number> {
    if (!this.isInitialized) {
      throw new Error('OfflineStorageService not initialized');
    }

    return this.dbManager.delete(
      'queued_actions',
      "status = 'completed'"
    );
  }

  // ==================== SYNC STATUS ====================

  /**
   * Set sync status for a record
   */
  async setSyncStatus(
    tableName: string,
    recordId: string,
    status: 'synced' | 'pending' | 'conflict' | 'error',
    conflictData?: any
  ): Promise<void> {
    if (!this.isInitialized) {
      throw new Error('OfflineStorageService not initialized');
    }

    const syncStatus: Omit<SyncStatus, 'id'> = {
      id: `${tableName}_${recordId}`,
      table_name: tableName,
      record_id: recordId,
      last_synced_at: new Date().toISOString(),
      sync_status: status,
      ...(conflictData && { conflict_data: JSON.stringify(conflictData) }),
    };

    // Use REPLACE to handle conflicts
    await this.dbManager.insert('sync_status', syncStatus);
  }

  /**
   * Get records pending sync
   */
  async getPendingSyncRecords(tableName?: string): Promise<SyncStatus[]> {
    if (!this.isInitialized) {
      throw new Error('OfflineStorageService not initialized');
    }

    const whereClause = tableName 
      ? "sync_status = 'pending' AND table_name = ?"
      : "sync_status = 'pending'";
    const whereArgs = tableName ? [tableName] : [];

    const records = await this.dbManager.query<any>(
      'sync_status',
      ['*'],
      whereClause,
      whereArgs,
      'last_synced_at ASC'
    );

    // Parse conflict_data JSON if present
    return records.map(record => ({
      ...record,
      ...(record.conflict_data && { conflict_data: JSON.parse(record.conflict_data) }),
    }));
  }

  // ==================== CACHE MANAGEMENT ====================

  /**
   * Cache data with expiration
   */
  async setCache<T>(key: string, data: T, ttlMinutes: number = 60): Promise<void> {
    if (!this.isInitialized) {
      throw new Error('OfflineStorageService not initialized');
    }

    const expiresAt = new Date(Date.now() + ttlMinutes * 60 * 1000).toISOString();

    await this.dbManager.insert('cached_data', {
      key,
      data: JSON.stringify(data),
      expires_at: expiresAt,
      created_at: new Date().toISOString(),
    });

    `);
  }

  /**
   * Get cached data
   */
  async getCache<T>(key: string): Promise<T | null> {
    if (!this.isInitialized) {
      throw new Error('OfflineStorageService not initialized');
    }

    const records = await this.dbManager.query<any>(
      'cached_data',
      ['*'],
      'key = ? AND expires_at > datetime("now")',
      [key]
    );

    if (records.length === 0) {
      return null;
    }

    const record = records[0];
    return JSON.parse(record.data) as T;
  }

  /**
   * Clear expired cache entries
   */
  async clearExpiredCache(): Promise<number> {
    if (!this.isInitialized) {
      throw new Error('OfflineStorageService not initialized');
    }

    return this.dbManager.clearExpiredCache();
  }

  /**
   * Clear specific cache entry
   */
  async clearCache(key: string): Promise<void> {
    if (!this.isInitialized) {
      throw new Error('OfflineStorageService not initialized');
    }

    await this.dbManager.delete('cached_data', 'key = ?', [key]);
  }

  // ==================== USER PREFERENCES ====================

  /**
   * Set user preference
   */
  async setUserPreference(key: string, value: string): Promise<void> {
    if (!this.isInitialized) {
      throw new Error('OfflineStorageService not initialized');
    }

    await this.dbManager.insert('user_preferences', {
      key,
      value,
      updated_at: new Date().toISOString(),
    });
  }

  /**
   * Get user preference
   */
  async getUserPreference(key: string): Promise<string | null> {
    if (!this.isInitialized) {
      throw new Error('OfflineStorageService not initialized');
    }

    const records = await this.dbManager.query<any>(
      'user_preferences',
      ['value'],
      'key = ?',
      [key]
    );

    return records.length > 0 ? records[0].value : null;
  }

  // ==================== ASYNC STORAGE FALLBACK ====================

  /**
   * Save data to AsyncStorage as fallback
   */
  async saveToAsyncStorage(key: string, data: any): Promise<void> {
    try {
      await AsyncStorage.setItem(key, JSON.stringify(data));
    } catch (error) {
      console.error('Failed to save to AsyncStorage:', error);
      throw error;
    }
  }

  /**
   * Get data from AsyncStorage
   */
  async getFromAsyncStorage<T>(key: string): Promise<T | null> {
    try {
      const data = await AsyncStorage.getItem(key);
      return data ? JSON.parse(data) as T : null;
    } catch (error) {
      console.error('Failed to get from AsyncStorage:', error);
      return null;
    }
  }

  // ==================== UTILITY METHODS ====================

  /**
   * Generate unique ID
   */
  private generateId(): string {
    return `${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  /**
   * Get storage statistics
   */
  async getStorageStats(): Promise<Record<string, number>> {
    if (!this.isInitialized) {
      throw new Error('OfflineStorageService not initialized');
    }

    return this.dbManager.getStats();
  }

  /**
   * Check if storage is healthy
   */
  async isHealthy(): Promise<boolean> {
    try {
      const stats = await this.getStorageStats();
      return stats !== null && Object.keys(stats).length > 0;
    } catch (error) {
      console.error('Storage health check failed:', error);
      return false;
    }
  }

  /**
   * Cleanup old data
   */
  async cleanup(): Promise<void> {
    if (!this.isInitialized) {
      throw new Error('OfflineStorageService not initialized');
    }

    try {
      // Clear expired cache
      await this.clearExpiredCache();

      // Delete completed actions older than 7 days
      const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString();
      await this.dbManager.delete(
        'queued_actions',
        "status = 'completed' AND created_at < ?",
        [sevenDaysAgo]
      );

      // Delete failed actions older than 30 days
      const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString();
      await this.dbManager.delete(
        'queued_actions',
        "status = 'failed' AND created_at < ?",
        [thirtyDaysAgo]
      );

      
    } catch (error) {
      console.error('Storage cleanup failed:', error);
      throw error;
    }
  }

  /**
   * Reset all data (for testing/debugging)
   */
  async reset(): Promise<void> {
    if (!this.isInitialized) {
      throw new Error('OfflineStorageService not initialized');
    }

    await this.dbManager.reset();
    
  }

  /**
   * Close storage service
   */
  async close(): Promise<void> {
    await this.dbManager.close();
    this.isInitialized = false;
    
  }
}

