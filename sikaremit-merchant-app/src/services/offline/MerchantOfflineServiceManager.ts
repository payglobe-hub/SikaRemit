import { MerchantDatabaseManager } from './DatabaseManager';
import { MerchantOfflineStorageService } from './MerchantOfflineStorageService';
import { MerchantActionQueueService } from './MerchantActionQueueService';
import offlineService from '../offlineService';

export interface MerchantServiceStatus {
  database: boolean;
  storage: boolean;
  queue: boolean;
  connectivity: boolean;
  overall: boolean;
}

export interface MerchantStats {
  pendingTransactions: number;
  pendingActions: number;
  completedTransactions: number;
  activeQRCodes: number;
  cachedItems: number;
  storageSize: number;
}

export class MerchantOfflineServiceManager {
  private static instance: MerchantOfflineServiceManager;
  private dbManager: MerchantDatabaseManager;
  private storageService: MerchantOfflineStorageService;
  private queueService: MerchantActionQueueService;
  private isInitialized = false;
  private initializationPromise: Promise<void> | null = null;

  private constructor() {
    this.dbManager = MerchantDatabaseManager.getInstance();
    this.storageService = MerchantOfflineStorageService.getInstance();
    this.queueService = MerchantActionQueueService.getInstance();
  }

  static getInstance(): MerchantOfflineServiceManager {
    if (!MerchantOfflineServiceManager.instance) {
      MerchantOfflineServiceManager.instance = new MerchantOfflineServiceManager();
    }
    return MerchantOfflineServiceManager.instance;
  }

  /**
   * Initialize all merchant offline services
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
      

      // Initialize basic offline service first
      await offlineService.initialize();
      

      // Initialize database
      await this.dbManager.initialize();
      

      // Initialize storage service
      await this.storageService.initialize();
      

      // Initialize queue service
      await this.queueService.initialize();
      

      // Setup connectivity event handlers
      this.setupConnectivityHandlers();

      // Start queue processing if connected
      if (offlineService.isOnline()) {
        this.queueService.startProcessing();
        
      }

      this.isInitialized = true;
      

    } catch (error) {
      console.error('âŒ Failed to initialize merchant offline services:', error);
      this.initializationPromise = null;
      throw error;
    }
  }

  /**
   * Setup connectivity event handlers
   */
  private setupConnectivityHandlers(): void {
    offlineService.subscribeToNetworkChanges((isOnline: boolean) => {
      
      
      if (isOnline) {
        // Start queue processing when connection is restored
        this.queueService.startProcessing();
        
        // Trigger sync operations
        this.triggerSyncOperations();
      } else {
        // Queue processing will automatically stop when no connection
        
      }
    });
  }

  /**
   * Trigger sync operations when connection is restored
   */
  private async triggerSyncOperations(): Promise<void> {
    try {
      // Clear expired cache and QR codes
      await Promise.all([
        this.dbManager.clearExpiredCache(),
        this.dbManager.clearExpiredQRCodes(),
      ]);
      
      // Process any pending actions (queue service handles this automatically)
      
      
    } catch (error) {
      console.error('Failed to trigger merchant sync operations:', error);
    }
  }

  /**
   * Get service status
   */
  async getServiceStatus(): Promise<MerchantServiceStatus> {
    const database = await this.checkServiceHealth('database', async () => {
      await this.dbManager.getStats();
      return true;
    });

    const storage = await this.checkServiceHealth('storage', async () => {
      return this.storageService.isHealthy();
    });

    const queue = await this.checkServiceHealth('queue', async () => {
      await this.queueService.getPendingActionsCount();
      return true;
    });

    const connectivity = await this.checkServiceHealth('connectivity', async () => {
      return offlineService.isOnline();
    });

    const overall = database && storage && queue && connectivity;

    return {
      database,
      storage,
      queue,
      connectivity,
      overall,
    };
  }

  /**
   * Check individual service health
   */
  private async checkServiceHealth(
    serviceName: string,
    healthCheck: () => Promise<boolean>
  ): Promise<boolean> {
    try {
      return await healthCheck();
    } catch (error) {
      console.error(`Health check failed for merchant ${serviceName}:`, error);
      return false;
    }
  }

  /**
   * Get comprehensive merchant statistics
   */
  async getMerchantStats(): Promise<MerchantStats> {
    try {
      const [pendingActions, storageStats] = await Promise.all([
        this.queueService.getPendingActionsCount(),
        this.storageService.getStorageStats(),
      ]);

      return {
        pendingTransactions: storageStats.transactions || 0,
        pendingActions,
        completedTransactions: 0, // Would need additional query
        activeQRCodes: storageStats.qr_codes || 0,
        cachedItems: storageStats.cached_data || 0,
        storageSize: 0, // Would need storage size calculation
      };
    } catch (error) {
      console.error('Failed to get merchant stats:', error);
      throw error;
    }
  }

  /**
   * Process a payment with validation
   */
  async processPayment(paymentData: {
    amount: number;
    currency: string;
    customer_name: string;
    customer_account: string;
    payment_method: string;
    notes?: string;
    merchant_id: string;
  }): Promise<{ success: boolean; actionId?: string; errors?: string[] }> {
    try {
      // Basic validation
      const errors = this.validatePaymentData(paymentData);
      
      if (errors.length > 0) {
        return {
          success: false,
          errors,
        };
      }

      // Queue the payment
      const actionId = await this.queueService.queuePayment(paymentData);
      
      return {
        success: true,
        actionId,
      };
    } catch (error: any) {
      console.error('Failed to process merchant payment:', error);
      return {
        success: false,
        errors: [error.message || 'Unknown error'],
      };
    }
  }

  /**
   * Generate QR code
   */
  async generateQRCode(qrData: {
    amount?: number;
    currency: string;
    merchant_name: string;
    merchant_id: string;
    expiry_minutes?: number;
  }): Promise<{ success: boolean; actionId?: string; errors?: string[] }> {
    try {
      // Basic validation
      const errors = this.validateQRData(qrData);
      
      if (errors.length > 0) {
        return {
          success: false,
          errors,
        };
      }

      // Queue QR generation
      const actionId = await this.queueService.queueQRGeneration(qrData);
      
      return {
        success: true,
        actionId,
      };
    } catch (error: any) {
      console.error('Failed to generate merchant QR code:', error);
      return {
        success: false,
        errors: [error.message || 'Unknown error'],
      };
    }
  }

  /**
   * Process a refund
   */
  async processRefund(refundData: {
    transaction_id: string;
    refund_amount: number;
    reason: string;
    merchant_id: string;
  }): Promise<{ success: boolean; actionId?: string; errors?: string[] }> {
    try {
      // Basic validation
      const errors = this.validateRefundData(refundData);
      
      if (errors.length > 0) {
        return {
          success: false,
          errors,
        };
      }

      // Queue the refund
      const actionId = await this.queueService.queueRefund(refundData);
      
      return {
        success: true,
        actionId,
      };
    } catch (error: any) {
      console.error('Failed to process merchant refund:', error);
      return {
        success: false,
        errors: [error.message || 'Unknown error'],
      };
    }
  }

  /**
   * Validate payment data
   */
  private validatePaymentData(paymentData: any): string[] {
    const errors: string[] = [];

    if (!paymentData.amount || paymentData.amount <= 0) {
      errors.push('Amount must be greater than 0');
    }

    if (paymentData.amount > 10000) {
      errors.push('Maximum amount is GHS 10,000');
    }

    if (!paymentData.customer_name || paymentData.customer_name.trim().length < 2) {
      errors.push('Customer name is required');
    }

    if (!paymentData.customer_account || paymentData.customer_account.trim().length < 8) {
      errors.push('Customer account must be at least 8 digits');
    }

    if (!paymentData.payment_method) {
      errors.push('Payment method is required');
    }

    if (!paymentData.merchant_id) {
      errors.push('Merchant ID is required');
    }

    return errors;
  }

  /**
   * Validate QR data
   */
  private validateQRData(qrData: any): string[] {
    const errors: string[] = [];

    if (!qrData.currency) {
      errors.push('Currency is required');
    }

    if (!qrData.merchant_name || qrData.merchant_name.trim().length < 2) {
      errors.push('Merchant name is required');
    }

    if (!qrData.merchant_id) {
      errors.push('Merchant ID is required');
    }

    if (qrData.amount && (qrData.amount <= 0 || qrData.amount > 10000)) {
      errors.push('Amount must be between 0 and GHS 10,000');
    }

    return errors;
  }

  /**
   * Validate refund data
   */
  private validateRefundData(refundData: any): string[] {
    const errors: string[] = [];

    if (!refundData.transaction_id) {
      errors.push('Transaction ID is required');
    }

    if (!refundData.refund_amount || refundData.refund_amount <= 0) {
      errors.push('Refund amount must be greater than 0');
    }

    if (!refundData.reason || refundData.reason.trim().length < 5) {
      errors.push('Refund reason must be at least 5 characters');
    }

    if (!refundData.merchant_id) {
      errors.push('Merchant ID is required');
    }

    return errors;
  }

  /**
   * Perform cleanup operations
   */
  async cleanup(): Promise<void> {
    try {
      

      // Stop queue processing
      this.queueService.stopProcessing();

      // Clear expired cache and QR codes
      await Promise.all([
        this.dbManager.clearExpiredCache(),
        this.dbManager.clearExpiredQRCodes(),
      ]);

      // Clear completed actions
      await this.queueService.clearCompletedActions();

      
    } catch (error) {
      console.error('âŒ Merchant cleanup failed:', error);
      throw error;
    }
  }

  /**
   * Reset all merchant data (for testing/debugging)
   */
  async reset(): Promise<void> {
    try {
      

      // Stop all services
      this.queueService.stopProcessing();
      offlineService.cleanup();

      // Reset storage
      await this.storageService.reset();

      // Reset database
      await this.dbManager.reset();

      
    } catch (error) {
      console.error('âŒ Merchant reset failed:', error);
      throw error;
    }
  }

  /**
   * Shutdown all services
   */
  async shutdown(): Promise<void> {
    try {
      

      // Perform final cleanup
      await this.cleanup();

      // Close database
      await this.dbManager.close();

      // Cleanup queue service
      this.queueService.cleanup();

      // Cleanup basic offline service
      offlineService.cleanup();

      this.isInitialized = false;
      this.initializationPromise = null;

      
    } catch (error) {
      console.error('âŒ Merchant shutdown failed:', error);
      throw error;
    }
  }

  /**
   * Check if services are initialized
   */
  isReady(): boolean {
    return this.isInitialized;
  }

  /**
   * Get connectivity status
   */
  getConnectivityStatus() {
    return offlineService.getNetworkStatus();
  }

  /**
   * Check if currently connected
   */
  isConnected(): boolean {
    return offlineService.isOnline();
  }

  /**
   * Get service instances (for advanced usage)
   */
  getServices() {
    return {
      database: this.dbManager,
      storage: this.storageService,
      queue: this.queueService,
      basicOffline: offlineService,
    };
  }
}

export default MerchantOfflineServiceManager;

