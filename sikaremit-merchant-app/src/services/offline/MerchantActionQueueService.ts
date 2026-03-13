import { MerchantOfflineStorageService, MerchantQueuedAction } from './MerchantOfflineStorageService';
import { MerchantDatabaseManager } from './DatabaseManager';
import api from '../api';

export interface MerchantPaymentActionData {
  amount: number;
  currency: string;
  customer_name: string;
  customer_account: string;
  payment_method: string;
  notes?: string;
  merchant_id: string;
}

export interface MerchantQRGenerationData {
  amount?: number;
  currency: string;
  merchant_name: string;
  merchant_id: string;
  expiry_minutes?: number;
}

export interface MerchantRefundActionData {
  transaction_id: string;
  refund_amount: number;
  reason: string;
  merchant_id: string;
}

export interface MerchantSyncActionData {
  table_name: string;
  record_id: string;
  sync_data: any;
}

export interface MerchantQueueProcessor {
  process: (action: MerchantQueuedAction) => Promise<boolean>;
}

export interface MerchantQueueListener {
  onActionQueued: (action: MerchantQueuedAction) => void;
  onActionProcessing: (action: MerchantQueuedAction) => void;
  onActionCompleted: (action: MerchantQueuedAction) => void;
  onActionFailed: (action: MerchantQueuedAction, error: string) => void;
  onQueueEmpty: () => void;
}

export class MerchantActionQueueService {
  private static instance: MerchantActionQueueService;
  private storageService: MerchantOfflineStorageService;
  private dbManager: MerchantDatabaseManager;
  private listeners: MerchantQueueListener[] = [];
  private processors: Map<string, MerchantQueueProcessor> = new Map();
  private isProcessing = false;
  private processingInterval?: any;
  private retryDelays: Map<number, number> = new Map([
    [1, 5000],    // 5 seconds
    [2, 15000],   // 15 seconds
    [3, 60000],   // 1 minute
    [4, 300000],  // 5 minutes
    [5, 900000],  // 15 minutes
  ]);

  private constructor() {
    this.storageService = MerchantOfflineStorageService.getInstance();
    this.dbManager = MerchantDatabaseManager.getInstance();
    this.setupDefaultProcessors();
  }

  static getInstance(): MerchantActionQueueService {
    if (!MerchantActionQueueService.instance) {
      MerchantActionQueueService.instance = new MerchantActionQueueService();
    }
    return MerchantActionQueueService.instance;
  }

  /**
   * Initialize the queue service
   */
  async initialize(): Promise<void> {
    try {
      
      
      // Initialize storage service
      await this.storageService.initialize();
      
      // Start processing if online
      if (await this.isOnline()) {
        this.startProcessing();
      }
      
      
    } catch (error) {
      console.error('Failed to initialize merchant action queue service:', error);
      throw error;
    }
  }

  /**
   * Setup default processors
   */
  private setupDefaultProcessors(): void {
    // Payment processor
    this.processors.set('receive_payment', {
      process: async (action: MerchantQueuedAction) => {
        const paymentData = action.action_data as MerchantPaymentActionData;
        
        try {
          // Process payment through API
          const response = await api.post('/api/v1/merchants/payments/process', paymentData);
          
          if (response.data.success) {
            // Update transaction status to completed
            await this.storageService.updateTransactionStatus(
              paymentData.merchant_id,
              'completed',
              new Date().toISOString()
            );
            
            
            return true;
          } else {
            throw new Error(response.data.message || 'Payment processing failed');
          }
        } catch (error: any) {
          console.error('Payment processing failed:', error);
          throw error;
        }
      },
    });

    // QR generation processor
    this.processors.set('generate_qr', {
      process: async (action: MerchantQueuedAction) => {
        const qrData = action.action_data as MerchantQRGenerationData;
        
        try {
          // Generate QR through API
          const response = await api.post('/api/v1/payments/qr/generate', qrData);
          
          if (response.data.success) {
            // Save QR code to local storage
            await this.storageService.saveQRCode({
              qr_reference: response.data.qr_reference,
              amount: qrData.amount,
              currency: qrData.currency,
              merchant_name: qrData.merchant_name,
              merchant_id: qrData.merchant_id,
              status: 'active',
              expires_at: response.data.expires_at,
            });
            
            
            return true;
          } else {
            throw new Error(response.data.message || 'QR generation failed');
          }
        } catch (error: any) {
          console.error('QR generation failed:', error);
          throw error;
        }
      },
    });

    // Refund processor
    this.processors.set('process_refund', {
      process: async (action: MerchantQueuedAction) => {
        const refundData = action.action_data as MerchantRefundActionData;
        
        try {
          // Process refund through API
          const response = await api.post('/api/v1/merchants/refunds/process', refundData);
          
          if (response.data.success) {
            // Update transaction status to refunded
            await this.storageService.updateTransactionStatus(
              refundData.transaction_id,
              'refunded',
              new Date().toISOString()
            );
            
            
            return true;
          } else {
            throw new Error(response.data.message || 'Refund processing failed');
          }
        } catch (error: any) {
          console.error('Refund processing failed:', error);
          throw error;
        }
      },
    });

    // Data sync processor
    this.processors.set('sync_data', {
      process: async (action: MerchantQueuedAction) => {
        const syncData = action.action_data as MerchantSyncActionData;
        
        try {
          // Sync data through API
          const response = await api.post(`/api/v1/merchants/sync/${syncData.table_name}`, syncData.sync_data);
          
          if (response.data.success) {
            // Update sync status
            await this.dbManager.insert('sync_status', {
              id: this.generateId(),
              table_name: syncData.table_name,
              record_id: syncData.record_id,
              last_synced_at: new Date().toISOString(),
              sync_status: 'synced',
            });
            
            
            return true;
          } else {
            throw new Error(response.data.message || 'Data sync failed');
          }
        } catch (error: any) {
          console.error('Data sync failed:', error);
          throw error;
        }
      },
    });
  }

  /**
   * Add queue listener
   */
  addListener(listener: MerchantQueueListener): void {
    this.listeners.push(listener);
  }

  /**
   * Remove queue listener
   */
  removeListener(listener: MerchantQueueListener): void {
    const index = this.listeners.indexOf(listener);
    if (index > -1) {
      this.listeners.splice(index, 1);
    }
  }

  /**
   * Notify listeners
   */
  private notifyListeners(event: keyof MerchantQueueListener, ...args: any[]): void {
    this.listeners.forEach(listener => {
      const method = listener[event];
      if (typeof method === 'function') {
        try {
          // Use Function.prototype.apply to avoid TypeScript context issues
          Function.prototype.apply.call(method, listener, args);
        } catch (error) {
          console.error(`Error in merchant queue listener ${event}:`, error);
        }
      }
    });
  }

  /**
   * Queue a payment
   */
  async queuePayment(paymentData: MerchantPaymentActionData): Promise<string> {
    // First save the transaction to offline storage
    await this.storageService.saveTransaction({
      ...paymentData,
      type: 'payment',
      status: 'pending',
      reference: this.generateReference(),
    });

    // Then queue the action
    const actionId = await this.storageService.queueAction({
      action_type: 'receive_payment',
      action_data: paymentData,
      status: 'pending',
      max_retries: 3,
    });

    this.notifyListeners('onActionQueued', {
      id: actionId,
      action_type: 'receive_payment',
      action_data: paymentData,
      status: 'pending',
      retry_count: 0,
      max_retries: 3,
      created_at: new Date().toISOString(),
    });

    
    return actionId;
  }

  /**
   * Queue QR generation
   */
  async queueQRGeneration(qrData: MerchantQRGenerationData): Promise<string> {
    const actionId = await this.storageService.queueAction({
      action_type: 'generate_qr',
      action_data: qrData,
      status: 'pending',
      max_retries: 3,
    });

    this.notifyListeners('onActionQueued', {
      id: actionId,
      action_type: 'generate_qr',
      action_data: qrData,
      status: 'pending',
      retry_count: 0,
      max_retries: 3,
      created_at: new Date().toISOString(),
    });

    
    return actionId;
  }

  /**
   * Queue a refund
   */
  async queueRefund(refundData: MerchantRefundActionData): Promise<string> {
    const actionId = await this.storageService.queueAction({
      action_type: 'process_refund',
      action_data: refundData,
      status: 'pending',
      max_retries: 3,
    });

    this.notifyListeners('onActionQueued', {
      id: actionId,
      action_type: 'process_refund',
      action_data: refundData,
      status: 'pending',
      retry_count: 0,
      max_retries: 3,
      created_at: new Date().toISOString(),
    });

    
    return actionId;
  }

  /**
   * Queue data sync
   */
  async queueDataSync(syncData: MerchantSyncActionData): Promise<string> {
    const actionId = await this.storageService.queueAction({
      action_type: 'sync_data',
      action_data: syncData,
      status: 'pending',
      max_retries: 5,
    });

    this.notifyListeners('onActionQueued', {
      id: actionId,
      action_type: 'sync_data',
      action_data: syncData,
      status: 'pending',
      retry_count: 0,
      max_retries: 5,
      created_at: new Date().toISOString(),
    });

    
    return actionId;
  }

  /**
   * Start processing the queue
   */
  startProcessing(): void {
    if (this.isProcessing) {
      return;
    }

    this.isProcessing = true;
    

    // Process immediately
    this.processQueue();

    // Set up periodic processing
    this.processingInterval = setInterval(() => {
      this.processQueue();
    }, 30000); // Process every 30 seconds
  }

  /**
   * Stop processing the queue
   */
  stopProcessing(): void {
    if (!this.isProcessing) {
      return;
    }

    this.isProcessing = false;
    
    if (this.processingInterval) {
      clearInterval(this.processingInterval);
      this.processingInterval = undefined;
    }

    
  }

  /**
   * Process the queue
   */
  private async processQueue(): Promise<void> {
    if (!this.isProcessing || !await this.isOnline()) {
      return;
    }

    try {
      const pendingActions = await this.storageService.getPendingActions();
      
      if (pendingActions.length === 0) {
        this.notifyListeners('onQueueEmpty');
        return;
      }

      

      for (const action of pendingActions) {
        await this.processAction(action);
      }
    } catch (error) {
      console.error('Error processing merchant queue:', error);
    }
  }

  /**
   * Process a single action
   */
  private async processAction(action: MerchantQueuedAction): Promise<void> {
    const processor = this.processors.get(action.action_type);
    
    if (!processor) {
      console.error(`No processor found for merchant action type: ${action.action_type}`);
      await this.storageService.updateActionStatus(
        action.id,
        'failed',
        'No processor found for action type'
      );
      return;
    }

    // Update status to processing
    await this.storageService.updateActionStatus(action.id, 'processing');
    this.notifyListeners('onActionProcessing', action);

    try {
      const success = await processor.process(action);
      
      if (success) {
        // Mark as completed
        await this.storageService.updateActionStatus(action.id, 'completed');
        this.notifyListeners('onActionCompleted', action);
        
      } else {
        // Mark as failed
        await this.storageService.updateActionStatus(
          action.id,
          'failed',
          'Processor returned false'
        );
        this.notifyListeners('onActionFailed', action, 'Processor returned false');
      }
    } catch (error: any) {
      const newRetryCount = action.retry_count + 1;
      
      if (newRetryCount >= action.max_retries) {
        // Max retries reached, mark as failed
        await this.storageService.updateActionStatus(
          action.id,
          'failed',
          error.message || 'Action failed after max retries'
        );
        this.notifyListeners('onActionFailed', action, error.message);
      } else {
        // Increment retry count and schedule next retry
        const nextRetryAt = new Date(Date.now() + (this.retryDelays.get(newRetryCount) || 900000));
        
        await this.storageService.updateActionStatus(
          action.id,
          'pending',
          error.message,
          nextRetryAt.toISOString()
        );
        
        await this.storageService.incrementActionRetry(action.id);
      }
      
      console.error(`Merchant action ${action.id} failed:`, error);
    }
  }

  /**
   * Retry a specific action
   */
  async retryAction(actionId: string): Promise<void> {
    const action = await this.dbManager.getById<MerchantQueuedAction>('queued_actions', actionId);
    
    if (!action) {
      throw new Error('Action not found');
    }

    // Reset retry count and status
    await this.storageService.updateActionStatus(actionId, 'pending');
    await this.dbManager.update('queued_actions', { retry_count: 0 }, 'id = ?', [actionId]);
    
    
  }

  /**
   * Cancel an action
   */
  async cancelAction(actionId: string): Promise<void> {
    await this.storageService.updateActionStatus(
      actionId,
      'failed',
      'Action cancelled by user'
    );
    
    
  }

  /**
   * Get queue statistics
   */
  async getQueueStats(): Promise<{
    pending: number;
    processing: number;
    completed: number;
    failed: number;
  }> {
    const stats = await this.storageService.getStorageStats();
    
    return {
      pending: stats.queued_actions || 0, // This would need more specific query in real implementation
      processing: 0,
      completed: 0,
      failed: 0,
    };
  }

  /**
   * Get pending actions
   */
  async getPendingActions(): Promise<MerchantQueuedAction[]> {
    return this.storageService.getPendingActions();
  }

  /**
   * Get pending actions count
   */
  async getPendingActionsCount(): Promise<number> {
    const pendingActions = await this.getPendingActions();
    return pendingActions.length;
  }

  /**
   * Clear completed actions
   */
  async clearCompletedActions(): Promise<number> {
    return this.storageService.deleteCompletedActions();
  }

  /**
   * Check if online
   */
  private async isOnline(): Promise<boolean> {
    try {
      // Simple connectivity check
      const response = await api.get('/api/v1/health', { timeout: 5000 });
      return response.status === 200;
    } catch {
      return false;
    }
  }

  /**
   * Generate unique reference
   */
  private generateReference(): string {
    return `MERCH_${Date.now()}_${Math.random().toString(36).substring(2, 9).toUpperCase()}`;
  }

  /**
   * Generate unique ID
   */
  private generateId(): string {
    return `${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;
  }

  /**
   * Cleanup service
   */
  cleanup(): void {
    this.stopProcessing();
    this.listeners = [];
    this.processors.clear();
    
  }
}

export { MerchantQueuedAction };

export default MerchantActionQueueService;

