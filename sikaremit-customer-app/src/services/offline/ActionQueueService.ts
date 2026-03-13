import { OfflineStorageService, QueuedAction } from './OfflineStorageService';
import { ConnectivityManager } from '../connectivity/ConnectivityManager';
import { api } from '../api';

export interface PaymentActionData {
  amount: number;
  currency: string;
  recipient: string;
  recipient_account: string;
  payment_method: string;
  notes?: string;
  category?: string;
  merchant_id?: string;
  qr_reference?: string;
}

export interface TransferActionData {
  amount: number;
  currency: string;
  recipient_account: string;
  recipient_name: string;
  notes?: string;
}

export interface BillPaymentActionData {
  bill_type: string;
  bill_reference: string;
  amount: number;
  currency: string;
  payment_method: string;
}

export interface QRPaymentActionData {
  qr_reference: string;
  amount?: number;
  payment_method: string;
}

export type ActionData = PaymentActionData | TransferActionData | BillPaymentActionData | QRPaymentActionData;

export interface QueueProcessor {
  processAction(action: QueuedAction): Promise<boolean>;
}

export interface QueueListener {
  onActionQueued: (action: QueuedAction) => void;
  onActionProcessing: (action: QueuedAction) => void;
  onActionCompleted: (action: QueuedAction) => void;
  onActionFailed: (action: QueuedAction, error: string) => void;
  onQueueEmpty: () => void;
}

export { QueuedAction };

export class ActionQueueService {
  private static instance: ActionQueueService;
  private storageService: OfflineStorageService;
  private connectivityManager: ConnectivityManager;
  private listeners: QueueListener[] = [];
  private processors: Map<string, QueueProcessor> = new Map();
  private isProcessing = false;
  private processingInterval?: NodeJS.Timeout;
  private retryDelays: Map<number, number> = new Map([
    [1, 5000],    // 5 seconds
    [2, 15000],   // 15 seconds
    [3, 60000],   // 1 minute
    [4, 300000],  // 5 minutes
    [5, 900000],  // 15 minutes
  ]);

  private constructor() {
    this.storageService = OfflineStorageService.getInstance();
    this.connectivityManager = ConnectivityManager.getInstance();
    this.setupDefaultProcessors();
  }

  static getInstance(): ActionQueueService {
    if (!ActionQueueService.instance) {
      ActionQueueService.instance = new ActionQueueService();
    }
    return ActionQueueService.instance;
  }

  /**
   * Initialize the action queue service
   */
  async initialize(): Promise<void> {
    await this.storageService.initialize();
    
  }

  /**
   * Setup default processors for different action types
   */
  private setupDefaultProcessors(): void {
    // Payment processor
    this.processors.set('payment', {
      processAction: async (action: QueuedAction) => {
        const paymentData = action.action_data as PaymentActionData;
        
        try {
          const response = await api.post('/api/v1/payments/send', {
            amount: paymentData.amount,
            currency: paymentData.currency,
            recipient_account: paymentData.recipient_account,
            payment_method_id: paymentData.payment_method,
            notes: paymentData.notes,
          });

          if (response.status === 200 || response.status === 201) {
            // Update transaction status to completed
            await this.storageService.updateTransactionStatus(
              response.data.reference,
              'completed',
              new Date().toISOString()
            );
            return true;
          }
          return false;
        } catch (error: any) {
          console.error('Payment processing failed:', error);
          throw new Error(error.response?.data?.message || 'Payment processing failed');
        }
      },
    });

    // Transfer processor
    this.processors.set('transfer', {
      processAction: async (action: QueuedAction) => {
        const transferData = action.action_data as TransferActionData;
        
        try {
          const response = await api.post('/api/v1/transfers/send', {
            amount: transferData.amount,
            currency: transferData.currency,
            recipient_account: transferData.recipient_account,
            notes: transferData.notes,
          });

          if (response.status === 200 || response.status === 201) {
            // Update transaction status to completed
            await this.storageService.updateTransactionStatus(
              response.data.reference,
              'completed',
              new Date().toISOString()
            );
            return true;
          }
          return false;
        } catch (error: any) {
          console.error('Transfer processing failed:', error);
          throw new Error(error.response?.data?.message || 'Transfer processing failed');
        }
      },
    });

    // Bill payment processor
    this.processors.set('bill_payment', {
      processAction: async (action: QueuedAction) => {
        const billData = action.action_data as BillPaymentActionData;
        
        try {
          const response = await api.post('/api/v1/bills/pay', {
            bill_type: billData.bill_type,
            bill_reference: billData.bill_reference,
            amount: billData.amount,
            currency: billData.currency,
            payment_method_id: billData.payment_method,
          });

          if (response.status === 200 || response.status === 201) {
            // Update transaction status to completed
            await this.storageService.updateTransactionStatus(
              response.data.reference,
              'completed',
              new Date().toISOString()
            );
            return true;
          }
          return false;
        } catch (error: any) {
          console.error('Bill payment processing failed:', error);
          throw new Error(error.response?.data?.message || 'Bill payment processing failed');
        }
      },
    });

    // QR payment processor
    this.processors.set('qr_payment', {
      processAction: async (action: QueuedAction) => {
        const qrData = action.action_data as QRPaymentActionData;
        
        try {
          const response = await api.post('/api/v1/payments/qr/process', {
            qr_reference: qrData.qr_reference,
            payment_method_id: qrData.payment_method,
            ...(qrData.amount && { amount: qrData.amount }),
          });

          if (response.status === 200 || response.status === 201) {
            // Update transaction status to completed
            await this.storageService.updateTransactionStatus(
              response.data.reference,
              'completed',
              new Date().toISOString()
            );
            return true;
          }
          return false;
        } catch (error: any) {
          console.error('QR payment processing failed:', error);
          throw new Error(error.response?.data?.message || 'QR payment processing failed');
        }
      },
    });
  }

  /**
   * Add a queue listener
   */
  addListener(listener: QueueListener): void {
    this.listeners.push(listener);
  }

  /**
   * Remove a queue listener
   */
  removeListener(listener: QueueListener): void {
    const index = this.listeners.indexOf(listener);
    if (index > -1) {
      this.listeners.splice(index, 1);
    }
  }

  /**
   * Queue a payment action
   */
  async queuePayment(paymentData: PaymentActionData): Promise<string> {
    // First save the transaction to offline storage
    const transactionId = await this.storageService.saveTransaction({
      ...paymentData,
      id: this.generateId(),
      status: 'pending',
      reference: this.generateReference(),
    });

    // Then queue the action
    const actionId = await this.storageService.queueAction({
      action_type: 'payment',
      action_data: paymentData,
      status: 'pending',
      max_retries: 3,
    });

    // Get the queued action and notify listeners
    const action = await this.storageService.getActionById(actionId);
    if (action) {
      this.notifyListeners('onActionQueued', action);
    }

    // Start processing if not already running
    this.startProcessing();

    return actionId;
  }

  /**
   * Queue a transfer action
   */
  async queueTransfer(transferData: TransferActionData): Promise<string> {
    // First save the transaction to offline storage
    const transactionId = await this.storageService.saveTransaction({
      ...transferData,
      id: this.generateId(),
      recipient: transferData.recipient_name,
      recipient_account: transferData.recipient_account,
      payment_method: 'transfer',
      status: 'pending',
      reference: this.generateReference(),
    });

    // Then queue the action
    const actionId = await this.storageService.queueAction({
      action_type: 'transfer',
      action_data: transferData,
      status: 'pending',
      max_retries: 3,
    });

    // Get the queued action and notify listeners
    const action = await this.storageService.getActionById(actionId);
    if (action) {
      this.notifyListeners('onActionQueued', action);
    }

    // Start processing if not already running
    this.startProcessing();

    return actionId;
  }

  /**
   * Queue a bill payment action
   */
  async queueBillPayment(billData: BillPaymentActionData): Promise<string> {
    // First save the transaction to offline storage
    const transactionId = await this.storageService.saveTransaction({
      ...billData,
      id: this.generateId(),
      recipient: billData.bill_type,
      recipient_account: billData.bill_reference,
      payment_method: billData.payment_method,
      status: 'pending',
      reference: this.generateReference(),
    });

    // Then queue the action
    const actionId = await this.storageService.queueAction({
      action_type: 'bill_payment',
      action_data: billData,
      status: 'pending',
      max_retries: 3,
    });

    // Get the queued action and notify listeners
    const action = await this.storageService.getActionById(actionId);
    if (action) {
      this.notifyListeners('onActionQueued', action);
    }

    // Start processing if not already running
    this.startProcessing();

    return actionId;
  }

  /**
   * Queue a QR payment action
   */
  async queueQRPayment(qrData: QRPaymentActionData): Promise<string> {
    // First save the transaction to offline storage
    const transactionId = await this.storageService.saveTransaction({
      ...qrData,
      id: this.generateId(),
      recipient: 'QR Payment',
      recipient_account: qrData.qr_reference,
      payment_method: qrData.payment_method,
      currency: 'GHS', // Default currency
      amount: qrData.amount || 0, // Default amount if not provided
      status: 'pending',
      reference: this.generateReference(),
      qr_reference: qrData.qr_reference,
    });

    // Then queue the action
    const actionId = await this.storageService.queueAction({
      action_type: 'qr_payment',
      action_data: qrData,
      status: 'pending',
      max_retries: 3,
    });

    // Get the queued action and notify listeners
    const action = await this.storageService.getActionById(actionId);
    if (action) {
      this.notifyListeners('onActionQueued', action);
    }

    // Start processing if not already running
    this.startProcessing();

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

    // Set up interval for continuous processing
    this.processingInterval = setInterval(() => {
      this.processQueue();
    }, 10000); // Check every 10 seconds
  }

  /**
   * Stop processing the queue
   */
  stopProcessing(): void {
    if (this.processingInterval) {
      clearInterval(this.processingInterval);
      this.processingInterval = undefined;
    }
    this.isProcessing = false;
    
  }

  /**
   * Process pending actions in the queue
   */
  private async processQueue(): Promise<void> {
    if (!this.connectivityManager.isConnected()) {
      
      return;
    }

    try {
      const pendingActions = await this.storageService.getPendingActions();

      if (pendingActions.length === 0) {
        this.notifyListeners('onQueueEmpty');
        return;
      }

      

      // Process actions sequentially to avoid overwhelming the API
      for (const action of pendingActions) {
        await this.processAction(action);
      }
    } catch (error) {
      console.error('Error processing queue:', error);
    }
  }

  /**
   * Process a single action
   */
  private async processAction(action: QueuedAction): Promise<void> {
    const processor = this.processors.get(action.action_type);
    
    if (!processor) {
      console.error(`No processor found for action type: ${action.action_type}`);
      await this.storageService.updateActionStatus(
        action.id,
        'failed',
        `No processor found for action type: ${action.action_type}`
      );
      return;
    }

    try {
      // Update status to processing
      await this.storageService.updateActionStatus(action.id, 'processing');
      this.notifyListeners('onActionProcessing', action);

      // Process the action
      const success = await processor.processAction(action);

      if (success) {
        // Update status to completed
        await this.storageService.updateActionStatus(action.id, 'completed');
        this.notifyListeners('onActionCompleted', action);
        
      } else {
        throw new Error('Action processing returned false');
      }
    } catch (error: any) {
      console.error(`Action failed: ${action.id}`, error);
      
      const errorMessage = error.message || 'Unknown error';
      const nextRetryAt = this.calculateNextRetryTime(action.retry_count + 1);

      if (action.retry_count >= action.max_retries) {
        // Max retries reached, mark as failed
        await this.storageService.updateActionStatus(
          action.id,
          'failed',
          errorMessage
        );
        this.notifyListeners('onActionFailed', action, errorMessage);
      } else {
        // Schedule for retry
        await this.storageService.updateActionStatus(
          action.id,
          'pending',
          errorMessage,
          nextRetryAt
        );
        
      }
    }
  }

  /**
   * Calculate next retry time based on retry count
   */
  private calculateNextRetryTime(retryCount: number): string {
    const baseDelay = this.retryDelays.get(retryCount) || 1800000; // Default 30 minutes
    const nextRetryTime = new Date(Date.now() + baseDelay);
    return nextRetryTime.toISOString();
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
      pending: stats.queued_actions, // This would need more specific query in real implementation
      processing: 0,
      completed: 0,
      failed: 0,
    };
  }

  /**
   * Get pending actions
   */
  async getPendingActions(): Promise<QueuedAction[]> {
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
   * Retry a specific action
   */
  async retryAction(actionId: string): Promise<void> {
    const action = await this.storageService.getActionById(actionId);
    if (!action) {
      throw new Error('Action not found');
    }

    // Reset action status to pending
    await this.storageService.updateActionStatus(
      actionId,
      'pending',
      undefined,
      new Date().toISOString()
    );

    // Start processing
    this.startProcessing();
  }

  /**
   * Cancel a pending action
   */
  async cancelAction(actionId: string): Promise<void> {
    const action = await this.storageService.getActionById(actionId);
    if (!action) {
      throw new Error('Action not found');
    }

    if (action.status !== 'pending') {
      throw new Error('Can only cancel pending actions');
    }

    // Mark as failed with cancellation message
    await this.storageService.updateActionStatus(
      actionId,
      'failed',
      'Action cancelled by user'
    );

    // Update corresponding transaction status
    if (action.action_type === 'payment' || action.action_type === 'transfer' || 
        action.action_type === 'bill_payment' || action.action_type === 'qr_payment') {
      const paymentData = action.action_data as any;
      // Find and update the transaction
      const transactions = await this.storageService.getAllTransactions();
      const transaction = transactions.find(t => 
        t.recipient_account === paymentData.recipient_account && 
        t.status === 'pending'
      );
      
      if (transaction) {
        await this.storageService.updateTransactionStatus(
          transaction.reference,
          'failed'
        );
      }
    }
  }

  /**
   * Notify all listeners of an event
   */
  private notifyListeners(event: keyof QueueListener, ...args: any[]): void {
    this.listeners.forEach(listener => {
      const method = listener[event];
      if (typeof method === 'function') {
        try {
          (method as Function).apply(listener, args);
        } catch (error) {
          console.error(`Error in queue listener ${event}:`, error);
        }
      }
    });
  }

  /**
   * Generate unique ID
   */
  private generateId(): string {
    return `${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  /**
   * Generate transaction reference
   */
  private generateReference(): string {
    return `OFFLINE_${Date.now()}_${Math.random().toString(36).substr(2, 8).toUpperCase()}`;
  }

  /**
   * Cleanup resources
   */
  cleanup(): void {
    this.stopProcessing();
    this.listeners = [];
    this.processors.clear();
    
  }
}

