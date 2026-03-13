import { OfflineStorageService, OfflineTransaction } from './OfflineStorageService';
import { ConnectivityManager } from '../connectivity/ConnectivityManager';

export interface ValidationResult {
  isValid: boolean;
  errors: string[];
  warnings: string[];
  canProceedOffline: boolean;
  requiresOnlineValidation: boolean;
}

export interface PaymentValidationRules {
  minAmount: number;
  maxAmount: number;
  allowedCurrencies: string[];
  requiredRecipientInfo: string[];
  maxDailyTransactions: number;
  maxDailyAmount: number;
  suspiciousAmountThreshold: number;
}

export interface RecipientValidationResult {
  isValid: boolean;
  isValidAccount: boolean;
  accountExists: boolean;
  recipientName?: string;
  bankName?: string;
  errors: string[];
}

export class OfflinePaymentValidator {
  private static instance: OfflinePaymentValidator;
  private storageService: OfflineStorageService;
  private connectivityManager: ConnectivityManager;
  private validationRules: PaymentValidationRules;

  private constructor() {
    this.storageService = OfflineStorageService.getInstance();
    this.connectivityManager = ConnectivityManager.getInstance();
    this.validationRules = {
      minAmount: 0.01,
      maxAmount: 10000,
      allowedCurrencies: ['GHS', 'USD', 'EUR', 'GBP'],
      requiredRecipientInfo: ['recipient_account', 'recipient'],
      maxDailyTransactions: 50,
      maxDailyAmount: 20000,
      suspiciousAmountThreshold: 5000,
    };
  }

  static getInstance(): OfflinePaymentValidator {
    if (!OfflinePaymentValidator.instance) {
      OfflinePaymentValidator.instance = new OfflinePaymentValidator();
    }
    return OfflinePaymentValidator.instance;
  }

  /**
   * Initialize the validator
   */
  async initialize(): Promise<void> {
    await this.storageService.initialize();
    
  }

  /**
   * Validate a payment transaction
   */
  async validatePayment(paymentData: {
    amount: number;
    currency: string;
    recipient: string;
    recipient_account: string;
    payment_method: string;
    category?: string;
    notes?: string;
  }): Promise<ValidationResult> {
    const errors: string[] = [];
    const warnings: string[] = [];

    // Basic validation
    const basicValidation = this.validateBasicPaymentData(paymentData);
    errors.push(...basicValidation.errors);
    warnings.push(...basicValidation.warnings);

    // Amount validation
    const amountValidation = this.validateAmount(paymentData.amount, paymentData.currency);
    errors.push(...amountValidation.errors);
    warnings.push(...amountValidation.warnings);

    // Recipient validation
    const recipientValidation = await this.validateRecipient(paymentData.recipient, paymentData.recipient_account);
    errors.push(...recipientValidation.errors);

    // Daily limits validation
    const limitsValidation = await this.validateDailyLimits(paymentData.amount);
    errors.push(...limitsValidation.errors);
    warnings.push(...limitsValidation.warnings);

    // Suspicious activity detection
    const suspiciousValidation = this.detectSuspiciousActivity(paymentData);
    warnings.push(...suspiciousValidation.warnings);

    // Payment method validation
    const paymentMethodValidation = this.validatePaymentMethod(paymentData.payment_method);
    errors.push(...paymentMethodValidation.errors);

    const isValid = errors.length === 0;
    const canProceedOffline = isValid && !this.requiresOnlineValidation(paymentData);
    const requiresOnlineValidation = this.requiresOnlineValidation(paymentData);

    return {
      isValid,
      errors,
      warnings,
      canProceedOffline,
      requiresOnlineValidation,
    };
  }

  /**
   * Validate basic payment data
   */
  private validateBasicPaymentData(paymentData: {
    amount: number;
    currency: string;
    recipient: string;
    recipient_account: string;
    payment_method: string;
  }): { errors: string[]; warnings: string[] } {
    const errors: string[] = [];
    const warnings: string[] = [];

    // Check required fields
    this.validationRules.requiredRecipientInfo.forEach(field => {
      if (!paymentData[field as keyof typeof paymentData]) {
        errors.push(`${field.replace('_', ' ')} is required`);
      }
    });

    // Validate recipient name
    if (paymentData.recipient && paymentData.recipient.trim().length < 2) {
      errors.push('Recipient name must be at least 2 characters');
    }

    // Validate account number
    if (paymentData.recipient_account) {
      const accountNumber = paymentData.recipient_account.replace(/\s/g, '');
      if (accountNumber.length < 8) {
        errors.push('Account number must be at least 8 digits');
      }
      if (!/^\d+$/.test(accountNumber)) {
        errors.push('Account number must contain only digits');
      }
    }

    return { errors, warnings };
  }

  /**
   * Validate amount
   */
  private validateAmount(amount: number, currency: string): { errors: string[]; warnings: string[] } {
    const errors: string[] = [];
    const warnings: string[] = [];

    // Check amount is positive
    if (amount <= 0) {
      errors.push('Amount must be greater than 0');
    }

    // Check minimum amount
    if (amount < this.validationRules.minAmount) {
      errors.push(`Minimum amount is ${this.validationRules.minAmount} ${currency}`);
    }

    // Check maximum amount
    if (amount > this.validationRules.maxAmount) {
      errors.push(`Maximum amount is ${this.validationRules.maxAmount} ${currency}`);
    }

    // Check if amount is suspiciously high
    if (amount > this.validationRules.suspiciousAmountThreshold) {
      warnings.push('Large amount detected - additional verification may be required');
    }

    // Check currency
    if (!this.validationRules.allowedCurrencies.includes(currency)) {
      errors.push(`Currency ${currency} is not supported`);
    }

    return { errors, warnings };
  }

  /**
   * Validate recipient information
   */
  private async validateRecipient(recipient: string, recipientAccount: string): Promise<RecipientValidationResult> {
    const errors: string[] = [];
    let isValid = true;

    // Basic validation
    if (!recipient || recipient.trim().length === 0) {
      errors.push('Recipient name is required');
      isValid = false;
    }

    if (!recipientAccount || recipientAccount.trim().length === 0) {
      errors.push('Recipient account is required');
      isValid = false;
    }

    // Account format validation
    if (recipientAccount) {
      const cleanAccount = recipientAccount.replace(/\s/g, '');
      
      // Ghana bank account validation (basic)
      if (cleanAccount.length < 10 || cleanAccount.length > 20) {
        errors.push('Invalid account number format');
        isValid = false;
      }

      if (!/^\d+$/.test(cleanAccount)) {
        errors.push('Account number must contain only digits');
        isValid = false;
      }
    }

    // If offline, we can't validate account existence
    let isValidAccount = false;
    let accountExists = false;
    let recipientName: string | undefined;
    let bankName: string | undefined;

    if (this.connectivityManager.isConnected()) {
      try {
        // Online validation would go here
        // For now, we'll simulate basic validation
        isValidAccount = true;
        accountExists = true;
        recipientName = recipient;
      } catch (error) {
        console.warn('Could not validate recipient account online');
      }
    } else {
      // Offline mode - we can only do basic format validation
      isValidAccount = isValid;
      accountExists = true; // Assume exists for offline processing
    }

    return {
      isValid,
      isValidAccount,
      accountExists,
      recipientName,
      bankName,
      errors,
    };
  }

  /**
   * Validate daily limits
   */
  private async validateDailyLimits(amount: number): Promise<{ errors: string[]; warnings: string[] }> {
    const errors: string[] = [];
    const warnings: string[] = [];

    try {
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      
      const transactions = await this.storageService.getAllTransactions();
      
      // Filter today's transactions (completed and pending)
      const todayTransactions = transactions.filter(tx => {
        const txDate = new Date(tx.created_at);
        return txDate >= today && (tx.status === 'completed' || tx.status === 'pending');
      });

      const todayTotal = todayTransactions.reduce((sum, tx) => sum + tx.amount, 0);
      const todayCount = todayTransactions.length;

      // Check transaction count limit
      if (todayCount >= this.validationRules.maxDailyTransactions) {
        errors.push(`Daily transaction limit (${this.validationRules.maxDailyTransactions}) reached`);
      } else if (todayCount >= this.validationRules.maxDailyTransactions * 0.8) {
        warnings.push(`Approaching daily transaction limit (${todayCount}/${this.validationRules.maxDailyTransactions})`);
      }

      // Check amount limit
      if (todayTotal + amount > this.validationRules.maxDailyAmount) {
        errors.push(`Daily amount limit (${this.validationRules.maxDailyAmount}) would be exceeded`);
      } else if (todayTotal + amount > this.validationRules.maxDailyAmount * 0.8) {
        warnings.push(`Approaching daily amount limit (${(todayTotal + amount).toFixed(2)}/${this.validationRules.maxDailyAmount})`);
      }

    } catch (error) {
      console.error('Error validating daily limits:', error);
      warnings.push('Could not validate daily limits');
    }

    return { errors, warnings };
  }

  /**
   * Detect suspicious activity
   */
  private detectSuspiciousActivity(paymentData: {
    amount: number;
    recipient: string;
    recipient_account: string;
  }): { warnings: string[] } {
    const warnings: string[] = [];

    // Large amount
    if (paymentData.amount > this.validationRules.suspiciousAmountThreshold) {
      warnings.push('Large transaction detected - additional verification may be required');
    }

    // Round numbers (potential structuring)
    if (paymentData.amount % 1000 === 0 && paymentData.amount >= 1000) {
      warnings.push('Round amount detected - please verify transaction details');
    }

    // Multiple transactions to same recipient recently
    // This would require checking recent transactions
    // For now, we'll just add a warning for large amounts

    return { warnings };
  }

  /**
   * Validate payment method
   */
  private validatePaymentMethod(paymentMethod: string): { errors: string[] } {
    const errors: string[] = [];

    if (!paymentMethod || paymentMethod.trim().length === 0) {
      errors.push('Payment method is required');
      return { errors };
    }

    // Check if payment method is supported
    const supportedMethods = [
      'mtn_ghana', 'telecel_ghana', 'airteltigo_ghana', 'g_money',
      'bank_transfer', 'debit_card', 'credit_card'
    ];

    if (!supportedMethods.includes(paymentMethod)) {
      errors.push(`Payment method ${paymentMethod} is not supported`);
    }

    return { errors };
  }

  /**
   * Check if payment requires online validation
   */
  private requiresOnlineValidation(paymentData: {
    amount: number;
    currency: string;
    payment_method: string;
  }): boolean {
    // Large amounts always require online validation
    if (paymentData.amount > this.validationRules.suspiciousAmountThreshold) {
      return true;
    }

    // Certain payment methods require online validation
    const onlineOnlyMethods = ['debit_card', 'credit_card', 'bank_transfer'];
    if (onlineOnlyMethods.includes(paymentData.payment_method)) {
      return true;
    }

    // Foreign currencies require online validation
    if (paymentData.currency !== 'GHS') {
      return true;
    }

    return false;
  }

  /**
   * Validate QR payment data
   */
  async validateQRPayment(qrData: {
    qr_reference: string;
    amount?: number;
    payment_method: string;
  }): Promise<ValidationResult> {
    const errors: string[] = [];
    const warnings: string[] = [];

    // Validate QR reference
    if (!qrData.qr_reference || qrData.qr_reference.trim().length === 0) {
      errors.push('QR reference is required');
    }

    // Validate payment method
    const paymentMethodValidation = this.validatePaymentMethod(qrData.payment_method);
    errors.push(...paymentMethodValidation.errors);

    // Validate amount if provided
    if (qrData.amount !== undefined) {
      const amountValidation = this.validateAmount(qrData.amount, 'GHS');
      errors.push(...amountValidation.errors);
      warnings.push(...amountValidation.warnings);
    }

    // QR payments typically require online validation
    const requiresOnlineValidation = true;

    return {
      isValid: errors.length === 0,
      errors,
      warnings,
      canProceedOffline: false, // QR payments always need online
      requiresOnlineValidation,
    };
  }

  /**
   * Validate transfer data
   */
  async validateTransfer(transferData: {
    amount: number;
    currency: string;
    recipient_account: string;
    recipient_name: string;
    notes?: string;
  }): Promise<ValidationResult> {
    const errors: string[] = [];
    const warnings: string[] = [];

    // Basic validation
    if (!transferData.recipient_name || transferData.recipient_name.trim().length < 2) {
      errors.push('Recipient name is required');
    }

    if (!transferData.recipient_account || transferData.recipient_account.trim().length < 8) {
      errors.push('Valid recipient account is required');
    }

    // Amount validation
    const amountValidation = this.validateAmount(transferData.amount, transferData.currency);
    errors.push(...amountValidation.errors);
    warnings.push(...amountValidation.warnings);

    // Daily limits
    const limitsValidation = await this.validateDailyLimits(transferData.amount);
    errors.push(...limitsValidation.errors);
    warnings.push(...limitsValidation.warnings);

    // Transfers typically require online validation
    const requiresOnlineValidation = true;

    return {
      isValid: errors.length === 0,
      errors,
      warnings,
      canProceedOffline: false, // Transfers always need online
      requiresOnlineValidation,
    };
  }

  /**
   * Validate bill payment data
   */
  async validateBillPayment(billData: {
    bill_type: string;
    bill_reference: string;
    amount: number;
    currency: string;
    payment_method: string;
  }): Promise<ValidationResult> {
    const errors: string[] = [];
    const warnings: string[] = [];

    // Validate bill type
    const supportedBillTypes = ['electricity', 'water', 'internet', 'tv', 'insurance', 'loan'];
    if (!supportedBillTypes.includes(billData.bill_type)) {
      errors.push(`Bill type ${billData.bill_type} is not supported`);
    }

    // Validate bill reference
    if (!billData.bill_reference || billData.bill_reference.trim().length < 5) {
      errors.push('Valid bill reference is required');
    }

    // Amount validation
    const amountValidation = this.validateAmount(billData.amount, billData.currency);
    errors.push(...amountValidation.errors);
    warnings.push(...amountValidation.warnings);

    // Payment method validation
    const paymentMethodValidation = this.validatePaymentMethod(billData.payment_method);
    errors.push(...paymentMethodValidation.errors);

    // Bill payments typically require online validation
    const requiresOnlineValidation = true;

    return {
      isValid: errors.length === 0,
      errors,
      warnings,
      canProceedOffline: false, // Bill payments always need online
      requiresOnlineValidation,
    };
  }

  /**
   * Get validation rules
   */
  getValidationRules(): PaymentValidationRules {
    return { ...this.validationRules };
  }

  /**
   * Update validation rules
   */
  updateValidationRules(newRules: Partial<PaymentValidationRules>): void {
    this.validationRules = { ...this.validationRules, ...newRules };
    
  }

  /**
   * Check if user can make offline payments
   */
  canMakeOfflinePayments(): boolean {
    // Check if user has verified identity
    // Check if user has sufficient offline balance
    // Check if user is in good standing
    
    // For now, we'll return true if connectivity is available
    // In a real implementation, this would check user status
    return true;
  }

  /**
   * Get offline payment limits
   */
  getOfflinePaymentLimits(): {
    maxAmount: number;
    maxDailyTransactions: number;
    maxDailyAmount: number;
  } {
    return {
      maxAmount: Math.min(this.validationRules.maxAmount, 1000), // Lower limit for offline
      maxDailyTransactions: Math.min(this.validationRules.maxDailyTransactions, 10),
      maxDailyAmount: Math.min(this.validationRules.maxDailyAmount, 2000),
    };
  }
}

