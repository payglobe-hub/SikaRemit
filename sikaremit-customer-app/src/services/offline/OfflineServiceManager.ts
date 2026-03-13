import { DatabaseManager } from './DatabaseManager';
import { OfflineStorageService } from './OfflineStorageService';
import { ActionQueueService } from './ActionQueueService';
import { OfflinePaymentValidator } from './OfflinePaymentValidator';
import { ConnectivityManager } from '../connectivity/ConnectivityManager';

export interface OfflineServiceStatus {
  database: boolean;
  storage: boolean;
  queue: boolean;
  validator: boolean;
  connectivity: boolean;
  overall: boolean;
}

export interface OfflineStats {
  pendingTransactions: number;
  pendingActions: number;
  completedActions: number;
  failedActions: number;
  cachedItems: number;
  storageSize: number;
}

export class OfflineServiceManager {
  private static instance: OfflineServiceManager;
  private dbManager: DatabaseManager;
  private storageService: OfflineStorageService;
  private queueService: ActionQueueService;
  private validator: OfflinePaymentValidator;
  private connectivityManager: ConnectivityManager;
  private isInitialized = false;
  private initializationPromise: Promise<void> | null = null;

  private constructor() {
    this.dbManager = DatabaseManager.getInstance();
    this.storageService = OfflineStorageService.getInstance();
    this.queueService = ActionQueueService.getInstance();
    this.validator = OfflinePaymentValidator.getInstance();
    this.connectivityManager = ConnectivityManager.getInstance();
  }

  static getInstance(): OfflineServiceManager {
    if (!OfflineServiceManager.instance) {
      OfflineServiceManager.instance = new OfflineServiceManager();
    }
    return OfflineServiceManager.instance;
  }

  /**
   * Initialize all offline services
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
      

      // Initialize connectivity monitoring first
      await this.connectivityManager.startMonitoring();
      

      // Initialize database
      await this.dbManager.initialize();
      

      // Initialize storage service
      await this.storageService.initialize();
      

      // Initialize queue service
      await this.queueService.initialize();
      

      // Initialize validator
      await this.validator.initialize();
      

      // Setup connectivity event handlers
      this.setupConnectivityHandlers();

      // Start queue processing if connected
      if (this.connectivityManager.isConnected()) {
        this.queueService.startProcessing();
        
      }

      this.isInitialized = true;
      

    } catch (error) {
      console.error('âŒ Failed to initialize offline services:', error);
      this.initializationPromise = null;
      throw error;
    }
  }

  /**
   * Setup connectivity event handlers
   */
  private setupConnectivityHandlers(): void {
    this.connectivityManager.addListener({
      onConnectivityChanged: (status) => {
        
      },
      onConnectionLost: () => {
        
        // Queue processing will automatically stop when no connection
      },
      onConnectionRestored: () => {
        
        // Start queue processing when connection is restored
        this.queueService.startProcessing();
        
        // Trigger sync operations
        this.triggerSyncOperations();
      },
    });
  }

  /**
   * Trigger sync operations when connection is restored
   */
  private async triggerSyncOperations(): Promise<void> {
    try {
      // Clear expired cache
      await this.storageService.clearExpiredCache();
      
      // Process any pending actions (queue service handles this automatically)
      
      
    } catch (error) {
      console.error('Failed to trigger sync operations:', error);
    }
  }

  /**
   * Get service status
   */
  async getServiceStatus(): Promise<OfflineServiceStatus> {
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

    const validator = await this.checkServiceHealth('validator', async () => {
      this.validator.getValidationRules();
      return true;
    });

    const connectivity = await this.checkServiceHealth('connectivity', async () => {
      this.connectivityManager.getCurrentStatus();
      return true;
    });

    const overall = database && storage && queue && validator && connectivity;

    return {
      database,
      storage,
      queue,
      validator,
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
      console.error(`Health check failed for ${serviceName}:`, error);
      return false;
    }
  }

  /**
   * Get comprehensive offline statistics
   */
  async getOfflineStats(): Promise<OfflineStats> {
    try {
      const [pendingActions, storageStats] = await Promise.all([
        this.queueService.getPendingActionsCount(),
        this.storageService.getStorageStats(),
      ]);

      return {
        pendingTransactions: storageStats.transactions || 0,
        pendingActions,
        completedActions: 0, // Would need additional query
        failedActions: 0, // Would need additional query
        cachedItems: storageStats.cached_data || 0,
        storageSize: 0, // Would need storage size calculation
      };
    } catch (error) {
      console.error('Failed to get offline stats:', error);
      throw error;
    }
  }

  /**
   * Queue a payment with validation
   */
  async queuePayment(paymentData: {
    amount: number;
    currency: string;
    recipient: string;
    recipient_account: string;
    payment_method: string;
    notes?: string;
    category?: string;
  }): Promise<{ success: boolean; actionId?: string; errors?: string[] }> {
    try {
      // Validate payment first
      const validation = await this.validator.validatePayment(paymentData);
      
      if (!validation.isValid) {
        return {
          success: false,
          errors: validation.errors,
        };
      }

      // Queue the payment
      const actionId = await this.queueService.queuePayment(paymentData);
      
      return {
        success: true,
        actionId,
      };
    } catch (error: any) {
      console.error('Failed to queue payment:', error);
      return {
        success: false,
        errors: [error.message || 'Unknown error'],
      };
    }
  }

  /**
   * Queue a transfer with validation
   */
  async queueTransfer(transferData: {
    amount: number;
    currency: string;
    recipient_account: string;
    recipient_name: string;
    notes?: string;
  }): Promise<{ success: boolean; actionId?: string; errors?: string[] }> {
    try {
      // Validate transfer first
      const validation = await this.validator.validateTransfer(transferData);
      
      if (!validation.isValid) {
        return {
          success: false,
          errors: validation.errors,
        };
      }

      // Queue the transfer
      const actionId = await this.queueService.queueTransfer(transferData);
      
      return {
        success: true,
        actionId,
      };
    } catch (error: any) {
      console.error('Failed to queue transfer:', error);
      return {
        success: false,
        errors: [error.message || 'Unknown error'],
      };
    }
  }

  /**
   * Queue a QR payment with validation
   */
  async queueQRPayment(qrData: {
    qr_reference: string;
    amount?: number;
    payment_method: string;
  }): Promise<{ success: boolean; actionId?: string; errors?: string[] }> {
    try {
      // Validate QR payment first
      const validation = await this.validator.validateQRPayment(qrData);
      
      if (!validation.isValid) {
        return {
          success: false,
          errors: validation.errors,
        };
      }

      // Queue the QR payment
      const actionId = await this.queueService.queueQRPayment(qrData);
      
      return {
        success: true,
        actionId,
      };
    } catch (error: any) {
      console.error('Failed to queue QR payment:', error);
      return {
        success: false,
        errors: [error.message || 'Unknown error'],
      };
    }
  }

  /**
   * Queue a bill payment with validation
   */
  async queueBillPayment(billData: {
    bill_type: string;
    bill_reference: string;
    amount: number;
    currency: string;
    payment_method: string;
  }): Promise<{ success: boolean; actionId?: string; errors?: string[] }> {
    try {
      // Validate bill payment first
      const validation = await this.validator.validateBillPayment(billData);
      
      if (!validation.isValid) {
        return {
          success: false,
          errors: validation.errors,
        };
      }

      // Queue the bill payment
      const actionId = await this.queueService.queueBillPayment(billData);
      
      return {
        success: true,
        actionId,
      };
    } catch (error: any) {
      console.error('Failed to queue bill payment:', error);
      return {
        success: false,
        errors: [error.message || 'Unknown error'],
      };
    }
  }

  /**
   * Perform cleanup operations
   */
  async cleanup(): Promise<void> {
    try {
      

      // Stop queue processing
      this.queueService.stopProcessing();

      // Clear expired cache
      await this.storageService.clearExpiredCache();

      // Clear completed actions
      await this.queueService.clearCompletedActions();

      
    } catch (error) {
      console.error('âŒ Cleanup failed:', error);
      throw error;
    }
  }

  /**
   * Reset all offline data (for testing/debugging)
   */
  async reset(): Promise<void> {
    try {
      

      // Stop all services
      this.queueService.stopProcessing();
      this.connectivityManager.stopMonitoring();

      // Reset storage
      await this.storageService.reset();

      // Reset database
      await this.dbManager.reset();

      
    } catch (error) {
      console.error('âŒ Reset failed:', error);
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

      // Stop connectivity monitoring
      this.connectivityManager.stopMonitoring();

      // Cleanup queue service
      this.queueService.cleanup();

      this.isInitialized = false;
      this.initializationPromise = null;

      
    } catch (error) {
      console.error('âŒ Shutdown failed:', error);
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
    return this.connectivityManager.getCurrentStatus();
  }

  /**
   * Check if currently connected
   */
  isConnected(): boolean {
    return this.connectivityManager.isConnected();
  }

  /**
   * Check if connection is good quality
   */
  isGoodConnection(): boolean {
    return this.connectivityManager.isGoodConnection();
  }

  /**
   * Get service instances (for advanced usage)
   */
  getServices() {
    return {
      database: this.dbManager,
      storage: this.storageService,
      queue: this.queueService,
      validator: this.validator,
      connectivity: this.connectivityManager,
    };
  }
}

export default OfflineServiceManager;

