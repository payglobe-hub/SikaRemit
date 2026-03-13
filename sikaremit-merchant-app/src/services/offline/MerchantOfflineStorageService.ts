import { MerchantDatabaseManager } from './DatabaseManager';

export interface MerchantTransaction {
  id: string;
  amount: number;
  currency: string;
  customer_name: string;
  customer_account: string;
  payment_method: string;
  type: 'payment' | 'qr_payment' | 'bill_payment';
  status: 'pending' | 'completed' | 'failed' | 'refunded';
  created_at: string;
  processed_at?: string;
  reference: string;
  notes?: string;
  merchant_id: string;
  qr_reference?: string;
  fee_amount?: number;
  net_amount?: number;
}

export interface MerchantQueuedAction {
  id: string;
  action_type: 'receive_payment' | 'generate_qr' | 'process_refund' | 'sync_data';
  action_data: any;
  status: 'pending' | 'processing' | 'completed' | 'failed';
  retry_count: number;
  max_retries: number;
  created_at: string;
  next_retry_at?: string;
  error_message?: string;
}

export interface MerchantSyncStatus {
  id: string;
  table_name: string;
  record_id: string;
  last_synced_at: string;
  sync_status: 'synced' | 'pending' | 'conflict' | 'error';
  conflict_data?: any;
}

export interface MerchantQRCode {
  id: string;
  qr_reference: string;
  amount?: number;
  currency: string;
  merchant_name: string;
  merchant_id: string;
  status: 'active' | 'expired' | 'used';
  created_at: string;
  expires_at: string;
  used_at?: string;
  customer_name?: string;
  customer_account?: string;
}

export interface MerchantCacheEntry {
  key: string;
  data: any;
  expires_at: string;
  created_at: string;
}

export interface MerchantPreferences {
  auto_print_receipts: boolean;
  offline_mode_enabled: boolean;
  qr_expiry_minutes: number;
  daily_transaction_limit: number;
  currency: string;
  business_name: string;
  business_address: string;
  contact_phone: string;
  contact_email: string;
}

export class MerchantOfflineStorageService {
  private static instance: MerchantOfflineStorageService;
  private dbManager: MerchantDatabaseManager;
  private isInitialized = false;
  private initializationPromise: Promise<void> | null = null;

  private constructor() {
    this.dbManager = MerchantDatabaseManager.getInstance();
  }

  static getInstance(): MerchantOfflineStorageService {
    if (!MerchantOfflineStorageService.instance) {
      MerchantOfflineStorageService.instance = new MerchantOfflineStorageService();
    }
    return MerchantOfflineStorageService.instance;
  }

  /**
   * Initialize the storage service
   */
  async initialize(): Promise<void> {
    if (this.isInitialized) {
      return;
    }

    if (this.initializationPromise) {
      return this.initializationPromise;
    }

    this.initializationPromise = this._initialize();
    return this.initializationPromise;
  }

  private async _initialize(): Promise<void> {
    try {
      
      
      // Initialize database
      await this.dbManager.initialize();
      
      // Set default preferences
      await this.setDefaultPreferences();
      
      // Clear expired cache and QR codes
      await this.cleanupExpiredData();
      
      this.isInitialized = true;
      
      
    } catch (error) {
      console.error('Failed to initialize merchant offline storage service:', error);
      this.initializationPromise = null;
      throw error;
    }
  }

  /**
   * Set default merchant preferences
   */
  private async setDefaultPreferences(): Promise<void> {
    const defaults: Partial<MerchantPreferences> = {
      auto_print_receipts: true,
      offline_mode_enabled: true,
      qr_expiry_minutes: 15,
      daily_transaction_limit: 1000,
      currency: 'GHS',
      business_name: '',
      business_address: '',
      contact_phone: '',
      contact_email: '',
    };

    for (const [key, value] of Object.entries(defaults)) {
      const existing = await this.getPreference(key);
      if (existing === null) {
        await this.setPreference(key, value);
      }
    }
  }

  /**
   * Clean up expired data
   */
  private async cleanupExpiredData(): Promise<void> {
    try {
      await Promise.all([
        this.dbManager.clearExpiredCache(),
        this.dbManager.clearExpiredQRCodes(),
      ]);
    } catch (error) {
      console.error('Failed to cleanup expired data:', error);
    }
  }

  // ============ Transaction Management ============

  /**
   * Save a transaction
   */
  async saveTransaction(transaction: Omit<MerchantTransaction, 'id' | 'created_at'>): Promise<string> {
    if (!this.isInitialized) {
      throw new Error('MerchantOfflineStorageService not initialized');
    }

    const transactionWithId: MerchantTransaction = {
      ...transaction,
      id: this.generateId(),
      created_at: new Date().toISOString(),
    };

    await this.dbManager.insert('transactions', transactionWithId);
    
    return transactionWithId.id;
  }

  /**
   * Get transaction by ID
   */
  async getTransaction(id: string): Promise<MerchantTransaction | null> {
    if (!this.isInitialized) {
      throw new Error('MerchantOfflineStorageService not initialized');
    }

    return this.dbManager.getById<MerchantTransaction>('transactions', id);
  }

  /**
   * Get all transactions for a merchant
   */
  async getTransactions(merchantId: string, limit: number = 100): Promise<MerchantTransaction[]> {
    if (!this.isInitialized) {
      throw new Error('MerchantOfflineStorageService not initialized');
    }

    return this.dbManager.query<MerchantTransaction>(
      'transactions',
      ['*'],
      'merchant_id = ?',
      [merchantId],
      'created_at DESC',
      limit
    );
  }

  /**
   * Get transactions by status
   */
  async getTransactionsByStatus(
    merchantId: string,
    status: MerchantTransaction['status'],
    limit: number = 50
  ): Promise<MerchantTransaction[]> {
    if (!this.isInitialized) {
      throw new Error('MerchantOfflineStorageService not initialized');
    }

    return this.dbManager.query<MerchantTransaction>(
      'transactions',
      ['*'],
      'merchant_id = ? AND status = ?',
      [merchantId, status],
      'created_at DESC',
      limit
    );
  }

  /**
   * Update transaction status
   */
  async updateTransactionStatus(
    id: string,
    status: MerchantTransaction['status'],
    processedAt?: string
  ): Promise<void> {
    if (!this.isInitialized) {
      throw new Error('MerchantOfflineStorageService not initialized');
    }

    const updates: Partial<MerchantTransaction> = {
      status,
      ...(processedAt && { processed_at: processedAt }),
    };

    await this.dbManager.update('transactions', updates, 'id = ?', [id]);
  }

  /**
   * Get daily transaction summary
   */
  async getDailyTransactionSummary(merchantId: string, date: string): Promise<{
    totalAmount: number;
    totalTransactions: number;
    completedTransactions: number;
    pendingTransactions: number;
    failedTransactions: number;
  }> {
    if (!this.isInitialized) {
      throw new Error('MerchantOfflineStorageService not initialized');
    }

    const startOfDay = new Date(date);
    startOfDay.setHours(0, 0, 0, 0);
    const endOfDay = new Date(date);
    endOfDay.setHours(23, 59, 59, 999);

    const transactions = await this.dbManager.query<MerchantTransaction>(
      'transactions',
      ['amount', 'status'],
      'merchant_id = ? AND created_at >= ? AND created_at <= ?',
      [merchantId, startOfDay.toISOString(), endOfDay.toISOString()]
    );

    const summary = {
      totalAmount: 0,
      totalTransactions: transactions.length,
      completedTransactions: 0,
      pendingTransactions: 0,
      failedTransactions: 0,
    };

    for (const transaction of transactions) {
      summary.totalAmount += transaction.amount;
      
      switch (transaction.status) {
        case 'completed':
          summary.completedTransactions++;
          break;
        case 'pending':
          summary.pendingTransactions++;
          break;
        case 'failed':
          summary.failedTransactions++;
          break;
      }
    }

    return summary;
  }

  // ============ Action Queue Management ============

  /**
   * Queue an action
   */
  async queueAction(action: Omit<MerchantQueuedAction, 'id' | 'created_at' | 'retry_count'>): Promise<string> {
    if (!this.isInitialized) {
      throw new Error('MerchantOfflineStorageService not initialized');
    }

    const queuedAction: MerchantQueuedAction = {
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
   * Get pending actions
   */
  async getPendingActions(): Promise<MerchantQueuedAction[]> {
    if (!this.isInitialized) {
      throw new Error('MerchantOfflineStorageService not initialized');
    }

    const actions = await this.dbManager.query<MerchantQueuedAction>(
      'queued_actions',
      ['*'],
      'status = ?',
      ['pending'],
      'created_at ASC'
    );

    // Parse action_data
    return actions.map(action => ({
      ...action,
      action_data: JSON.parse(action.action_data as string),
    }));
  }

  /**
   * Update action status
   */
  async updateActionStatus(
    id: string,
    status: MerchantQueuedAction['status'],
    errorMessage?: string,
    nextRetryAt?: string
  ): Promise<void> {
    if (!this.isInitialized) {
      throw new Error('MerchantOfflineStorageService not initialized');
    }

    const updates: Partial<MerchantQueuedAction> = {
      status,
      ...(errorMessage && { error_message: errorMessage }),
      ...(nextRetryAt && { next_retry_at: nextRetryAt }),
    };

    await this.dbManager.update('queued_actions', updates, 'id = ?', [id]);
  }

  /**
   * Increment action retry count
   */
  async incrementActionRetry(id: string): Promise<void> {
    if (!this.isInitialized) {
      throw new Error('MerchantOfflineStorageService not initialized');
    }

    const action = await this.dbManager.getById<MerchantQueuedAction>('queued_actions', id);
    if (action) {
      await this.dbManager.update(
        'queued_actions',
        { retry_count: action.retry_count + 1 },
        'id = ?',
        [id]
      );
    }
  }

  /**
   * Delete completed actions
   */
  async deleteCompletedActions(): Promise<number> {
    if (!this.isInitialized) {
      throw new Error('MerchantOfflineStorageService not initialized');
    }

    return this.dbManager.delete(
      'queued_actions',
      'status IN (?, ?)',
      ['completed', 'failed']
    );
  }

  // ============ QR Code Management ============

  /**
   * Save a QR code
   */
  async saveQRCode(qrCode: Omit<MerchantQRCode, 'id' | 'created_at'>): Promise<string> {
    if (!this.isInitialized) {
      throw new Error('MerchantOfflineStorageService not initialized');
    }

    const qrCodeWithId: MerchantQRCode = {
      ...qrCode,
      id: this.generateId(),
      created_at: new Date().toISOString(),
    };

    await this.dbManager.insert('qr_codes', qrCodeWithId);
    
    return qrCodeWithId.id;
  }

  /**
   * Get QR code by reference
   */
  async getQRCodeByReference(qrReference: string): Promise<MerchantQRCode | null> {
    if (!this.isInitialized) {
      throw new Error('MerchantOfflineStorageService not initialized');
    }

    const qrCodes = await this.dbManager.query<MerchantQRCode>(
      'qr_codes',
      ['*'],
      'qr_reference = ?',
      [qrReference],
      undefined,
      1
    );

    return qrCodes.length > 0 ? qrCodes[0] : null;
  }

  /**
   * Get active QR codes for merchant
   */
  async getActiveQRCodes(merchantId: string): Promise<MerchantQRCode[]> {
    if (!this.isInitialized) {
      throw new Error('MerchantOfflineStorageService not initialized');
    }

    return this.dbManager.query<MerchantQRCode>(
      'qr_codes',
      ['*'],
      'merchant_id = ? AND status = ?',
      [merchantId, 'active'],
      'created_at DESC'
    );
  }

  /**
   * Mark QR code as used
   */
  async markQRCodeAsUsed(
    qrReference: string,
    customerName: string,
    customerAccount: string
  ): Promise<void> {
    if (!this.isInitialized) {
      throw new Error('MerchantOfflineStorageService not initialized');
    }

    await this.dbManager.update(
      'qr_codes',
      {
        status: 'used',
        used_at: new Date().toISOString(),
        customer_name: customerName,
        customer_account: customerAccount,
      },
      'qr_reference = ?',
      [qrReference]
    );
  }

  // ============ Cache Management ============

  /**
   * Cache data
   */
  async cacheData(key: string, data: any, ttlMinutes: number = 60): Promise<void> {
    if (!this.isInitialized) {
      throw new Error('MerchantOfflineStorageService not initialized');
    }

    const now = new Date();
    const expiresAt = new Date(now.getTime() + ttlMinutes * 60 * 1000);

    await this.dbManager.insert('cached_data', {
      key,
      data: JSON.stringify(data),
      expires_at: expiresAt.toISOString(),
      created_at: now.toISOString(),
    });
  }

  /**
   * Get cached data
   */
  async getCachedData<T>(key: string): Promise<T | null> {
    if (!this.isInitialized) {
      throw new Error('MerchantOfflineStorageService not initialized');
    }

    const cacheEntries = await this.dbManager.query<MerchantCacheEntry>(
      'cached_data',
      ['*'],
      'key = ? AND expires_at > ?',
      [key, new Date().toISOString()],
      undefined,
      1
    );

    if (cacheEntries.length === 0) {
      return null;
    }

    return JSON.parse(cacheEntries[0].data as string) as T;
  }

  /**
   * Remove cached data
   */
  async removeCachedData(key: string): Promise<void> {
    if (!this.isInitialized) {
      throw new Error('MerchantOfflineStorageService not initialized');
    }

    await this.dbManager.delete('cached_data', 'key = ?', [key]);
  }

  // ============ Preferences Management ============

  /**
   * Set a preference
   */
  async setPreference(key: string, value: any): Promise<void> {
    if (!this.isInitialized) {
      throw new Error('MerchantOfflineStorageService not initialized');
    }

    await this.dbManager.insert('merchant_preferences', {
      key,
      value: JSON.stringify(value),
      updated_at: new Date().toISOString(),
    });
  }

  /**
   * Get a preference
   */
  async getPreference<T>(key: string): Promise<T | null> {
    if (!this.isInitialized) {
      throw new Error('MerchantOfflineStorageService not initialized');
    }

    const preferences = await this.dbManager.query<any>(
      'merchant_preferences',
      ['value'],
      'key = ?',
      [key],
      undefined,
      1
    );

    if (preferences.length === 0) {
      return null;
    }

    return JSON.parse(preferences[0].value) as T;
  }

  /**
   * Get all preferences
   */
  async getAllPreferences(): Promise<MerchantPreferences> {
    if (!this.isInitialized) {
      throw new Error('MerchantOfflineStorageService not initialized');
    }

    const preferences = await this.dbManager.query<any>(
      'merchant_preferences',
      ['key', 'value']
    );

    const result: any = {};
    for (const pref of preferences) {
      result[pref.key] = JSON.parse(pref.value);
    }

    return result as MerchantPreferences;
  }

  // ============ Utility Methods ============

  /**
   * Generate unique ID
   */
  private generateId(): string {
    return `${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;
  }

  /**
   * Get storage statistics
   */
  async getStorageStats(): Promise<Record<string, number>> {
    if (!this.isInitialized) {
      throw new Error('MerchantOfflineStorageService not initialized');
    }

    return this.dbManager.getStats();
  }

  /**
   * Check service health
   */
  async isHealthy(): Promise<boolean> {
    try {
      if (!this.isInitialized) {
        return false;
      }

      // Try to query a simple record
      await this.dbManager.query('merchant_preferences', ['COUNT(*) as count']);
      return true;
    } catch (error) {
      console.error('Merchant storage health check failed:', error);
      return false;
    }
  }

  /**
   * Reset all data (for testing/debugging)
   */
  async reset(): Promise<void> {
    if (!this.isInitialized) {
      throw new Error('MerchantOfflineStorageService not initialized');
    }

    await this.dbManager.reset();
    await this.setDefaultPreferences();
    
  }

  /**
   * Cleanup service
   */
  async cleanup(): Promise<void> {
    try {
      await this.cleanupExpiredData();
      
    } catch (error) {
      console.error('Merchant offline storage cleanup failed:', error);
      throw error;
    }
  }

  /**
   * Close storage service
   */
  async close(): Promise<void> {
    try {
      await this.dbManager.close();
      this.isInitialized = false;
      this.initializationPromise = null;
      
    } catch (error) {
      console.error('Failed to close merchant offline storage service:', error);
      throw error;
    }
  }
}

export default MerchantOfflineStorageService;

