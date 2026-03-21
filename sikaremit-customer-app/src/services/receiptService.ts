/**
 * Receipt Service
 * 
 * Handles generation and sharing of transaction receipts.
 * Generates PDF receipts that can be shared or saved.
 */

import * as Print from 'expo-print';
import * as Sharing from 'expo-sharing';
import * as FileSystem from 'expo-file-system';
import { Transaction } from '../types';
import exchangeRateService from './exchangeRateService';

export interface ReceiptData {
  transactionId: string;
  type: 'send' | 'receive' | 'deposit' | 'withdrawal' | 'bill_payment' | 'airtime' | 'remittance';
  status: 'success' | 'pending' | 'failed';
  amount: number;
  currency: string;
  fee?: number;
  totalAmount?: number;
  senderName?: string;
  senderPhone?: string;
  recipientName?: string;
  recipientPhone?: string;
  recipientCountry?: string;
  exchangeRate?: number;
  receivedAmount?: number;
  receivedCurrency?: string;
  description?: string;
  reference?: string;
  paymentMethod?: string;
  billProvider?: string;
  billAccountNumber?: string;
  createdAt: string;
  completedAt?: string;
}

// Generate HTML for receipt
const generateReceiptHTML = (data: ReceiptData): string => {
  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-GB', {
      day: '2-digit',
      month: 'short',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  const getTypeLabel = (type: string) => {
    const labels: Record<string, string> = {
      send: 'Money Transfer',
      receive: 'Money Received',
      deposit: 'Wallet Deposit',
      withdrawal: 'Wallet Withdrawal',
      bill_payment: 'Bill Payment',
      airtime: 'Airtime Purchase',
      remittance: 'International Transfer',
    };
    return labels[type] || 'Transaction';
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'success': return '#10B981';
      case 'pending': return '#F59E0B';
      case 'failed': return '#EF4444';
      default: return '#6B7280';
    }
  };

  return `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="utf-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
      <title>Transaction Receipt</title>
      <style>
        * {
          margin: 0;
          padding: 0;
          box-sizing: border-box;
        }
        body {
          font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif;
          background: #f5f5f5;
          padding: 20px;
          color: #1a1a1a;
        }
        .receipt {
          max-width: 400px;
          margin: 0 auto;
          background: white;
          border-radius: 16px;
          overflow: hidden;
          box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);
        }
        .header {
          background: linear-gradient(135deg, #6366F1, #8B5CF6);
          color: white;
          padding: 24px;
          text-align: center;
        }
        .logo {
          font-size: 24px;
          font-weight: bold;
          margin-bottom: 8px;
        }
        .logo-icon {
          font-size: 32px;
          margin-bottom: 4px;
        }
        .receipt-type {
          font-size: 14px;
          opacity: 0.9;
        }
        .status-badge {
          display: inline-block;
          padding: 6px 16px;
          border-radius: 20px;
          font-size: 12px;
          font-weight: 600;
          text-transform: uppercase;
          margin-top: 12px;
          background: ${getStatusColor(data.status)}20;
          color: ${getStatusColor(data.status)};
        }
        .amount-section {
          padding: 24px;
          text-align: center;
          border-bottom: 1px dashed #e5e5e5;
        }
        .amount-label {
          font-size: 14px;
          color: #6b7280;
          margin-bottom: 4px;
        }
        .amount {
          font-size: 36px;
          font-weight: bold;
          color: #1a1a1a;
        }
        .amount-secondary {
          font-size: 16px;
          color: #6b7280;
          margin-top: 8px;
        }
        .details {
          padding: 20px 24px;
        }
        .detail-row {
          display: flex;
          justify-content: space-between;
          padding: 12px 0;
          border-bottom: 1px solid #f3f4f6;
        }
        .detail-row:last-child {
          border-bottom: none;
        }
        .detail-label {
          font-size: 14px;
          color: #6b7280;
        }
        .detail-value {
          font-size: 14px;
          font-weight: 500;
          color: #1a1a1a;
          text-align: right;
          max-width: 60%;
          word-break: break-word;
        }
        .footer {
          background: #f9fafb;
          padding: 20px 24px;
          text-align: center;
        }
        .footer-text {
          font-size: 12px;
          color: #6b7280;
          line-height: 1.5;
        }
        .transaction-id {
          font-family: monospace;
          font-size: 11px;
          color: #9ca3af;
          margin-top: 12px;
          word-break: break-all;
        }
        .divider {
          height: 1px;
          background: #e5e5e5;
          margin: 0 24px;
        }
      </style>
    </head>
    <body>
      <div class="receipt">
        <div class="header">
          <div class="logo-icon">💸</div>
          <div class="logo">SikaRemit</div>
          <div class="receipt-type">${getTypeLabel(data.type)}</div>
          <div class="status-badge">${data.status}</div>
        </div>
        
        <div class="amount-section">
          <div class="amount-label">Amount</div>
          <div class="amount">${exchangeRateService.formatAmount(data.amount, data.currency)}</div>
          ${data.receivedAmount && data.receivedCurrency ? `
            <div class="amount-secondary">
              Recipient receives: ${exchangeRateService.formatAmount(data.receivedAmount, data.receivedCurrency)}
            </div>
          ` : ''}
        </div>
        
        <div class="details">
          ${data.senderName ? `
            <div class="detail-row">
              <span class="detail-label">From</span>
              <span class="detail-value">${data.senderName}</span>
            </div>
          ` : ''}
          
          ${data.recipientName ? `
            <div class="detail-row">
              <span class="detail-label">To</span>
              <span class="detail-value">${data.recipientName}${data.recipientCountry ? ` (${data.recipientCountry})` : ''}</span>
            </div>
          ` : ''}
          
          ${data.recipientPhone ? `
            <div class="detail-row">
              <span class="detail-label">Phone</span>
              <span class="detail-value">${data.recipientPhone}</span>
            </div>
          ` : ''}
          
          ${data.billProvider ? `
            <div class="detail-row">
              <span class="detail-label">Provider</span>
              <span class="detail-value">${data.billProvider}</span>
            </div>
          ` : ''}
          
          ${data.billAccountNumber ? `
            <div class="detail-row">
              <span class="detail-label">Account</span>
              <span class="detail-value">${data.billAccountNumber}</span>
            </div>
          ` : ''}
          
          ${data.exchangeRate ? `
            <div class="detail-row">
              <span class="detail-label">Exchange Rate</span>
              <span class="detail-value">1 ${data.currency} = ${data.exchangeRate.toFixed(4)} ${data.receivedCurrency || ''}</span>
            </div>
          ` : ''}
          
          ${data.fee ? `
            <div class="detail-row">
              <span class="detail-label">Fee</span>
              <span class="detail-value">${exchangeRateService.formatAmount(data.fee, data.currency)}</span>
            </div>
          ` : ''}
          
          ${data.totalAmount ? `
            <div class="detail-row">
              <span class="detail-label">Total Paid</span>
              <span class="detail-value">${exchangeRateService.formatAmount(data.totalAmount, data.currency)}</span>
            </div>
          ` : ''}
          
          ${data.paymentMethod ? `
            <div class="detail-row">
              <span class="detail-label">Payment Method</span>
              <span class="detail-value">${data.paymentMethod}</span>
            </div>
          ` : ''}
          
          <div class="detail-row">
            <span class="detail-label">Date</span>
            <span class="detail-value">${formatDate(data.createdAt)}</span>
          </div>
          
          ${data.reference ? `
            <div class="detail-row">
              <span class="detail-label">Reference</span>
              <span class="detail-value">${data.reference}</span>
            </div>
          ` : ''}
        </div>
        
        <div class="divider"></div>
        
        <div class="footer">
          <div class="footer-text">
            Thank you for using SikaRemit!<br>
            For support, contact support@sikaremit.com
          </div>
          <div class="transaction-id">
            Transaction ID: ${data.transactionId}
          </div>
        </div>
      </div>
    </body>
    </html>
  `;
};

// Receipt Service
const receiptService = {
  /**
   * Generate a PDF receipt from receipt data
   */
  generatePDF: async (data: ReceiptData): Promise<string> => {
    const html = generateReceiptHTML(data);
    
    const { uri } = await Print.printToFileAsync({
      html,
      base64: false,
    });
    
    // Rename file to have a meaningful name
    const newUri = `${FileSystem.documentDirectory}SikaRemit_Receipt_${data.transactionId.slice(0, 8)}.pdf`;
    await FileSystem.moveAsync({
      from: uri,
      to: newUri,
    });
    
    return newUri;
  },

  /**
   * Generate and share a PDF receipt
   */
  shareReceipt: async (data: ReceiptData): Promise<boolean> => {
    try {
      const pdfUri = await receiptService.generatePDF(data);
      
      const isAvailable = await Sharing.isAvailableAsync();
      if (!isAvailable) {
        throw new Error('Sharing is not available on this device');
      }
      
      await Sharing.shareAsync(pdfUri, {
        mimeType: 'application/pdf',
        dialogTitle: 'Share Receipt',
        UTI: 'com.adobe.pdf',
      });
      
      return true;
    } catch (error) {
      console.error('Failed to share receipt:', error);
      return false;
    }
  },

  /**
   * Print a receipt directly
   */
  printReceipt: async (data: ReceiptData): Promise<boolean> => {
    try {
      const html = generateReceiptHTML(data);
      await Print.printAsync({ html });
      return true;
    } catch (error) {
      console.error('Failed to print receipt:', error);
      return false;
    }
  },

  /**
   * Convert a Transaction object to ReceiptData
   */
  transactionToReceiptData: (transaction: Transaction): ReceiptData => {
    return {
      transactionId: transaction.id,
      type: transaction.type as ReceiptData['type'],
      status: transaction.status as ReceiptData['status'],
      amount: transaction.amount,
      currency: transaction.currency,
      fee: transaction.fee,
      totalAmount: transaction.amount + (transaction.fee || 0),
      recipientName: transaction.recipient?.name,
      recipientPhone: transaction.recipient?.phone,
      description: transaction.description,
      reference: transaction.reference,
      createdAt: transaction.created_at,
      completedAt: transaction.completed_at,
    };
  },

  /**
   * Generate receipt data for a remittance
   */
  createRemittanceReceiptData: (params: {
    transactionId: string;
    status: 'success' | 'pending' | 'failed';
    sendAmount: number;
    sendCurrency: string;
    receiveAmount: number;
    receiveCurrency: string;
    fee: number;
    exchangeRate: number;
    senderName: string;
    recipientName: string;
    recipientPhone: string;
    recipientCountry: string;
    paymentMethod: string;
    createdAt: string;
  }): ReceiptData => {
    return {
      transactionId: params.transactionId,
      type: 'remittance',
      status: params.status,
      amount: params.sendAmount,
      currency: params.sendCurrency,
      fee: params.fee,
      totalAmount: params.sendAmount + params.fee,
      senderName: params.senderName,
      recipientName: params.recipientName,
      recipientPhone: params.recipientPhone,
      recipientCountry: params.recipientCountry,
      exchangeRate: params.exchangeRate,
      receivedAmount: params.receiveAmount,
      receivedCurrency: params.receiveCurrency,
      paymentMethod: params.paymentMethod,
      createdAt: params.createdAt,
    };
  },

  /**
   * Generate receipt data for a bill payment
   */
  createBillPaymentReceiptData: (params: {
    transactionId: string;
    status: 'success' | 'pending' | 'failed';
    amount: number;
    currency: string;
    fee?: number;
    billProvider: string;
    billAccountNumber: string;
    paymentMethod: string;
    token?: string; // For prepaid electricity
    createdAt: string;
  }): ReceiptData => {
    return {
      transactionId: params.transactionId,
      type: 'bill_payment',
      status: params.status,
      amount: params.amount,
      currency: params.currency,
      fee: params.fee,
      totalAmount: params.amount + (params.fee || 0),
      billProvider: params.billProvider,
      billAccountNumber: params.billAccountNumber,
      paymentMethod: params.paymentMethod,
      reference: params.token,
      createdAt: params.createdAt,
    };
  },

  /**
   * Generate receipt data for airtime purchase
   */
  createAirtimeReceiptData: (params: {
    transactionId: string;
    status: 'success' | 'pending' | 'failed';
    amount: number;
    currency: string;
    recipientPhone: string;
    network: string;
    paymentMethod: string;
    createdAt: string;
  }): ReceiptData => {
    return {
      transactionId: params.transactionId,
      type: 'airtime',
      status: params.status,
      amount: params.amount,
      currency: params.currency,
      recipientPhone: params.recipientPhone,
      billProvider: params.network,
      paymentMethod: params.paymentMethod,
      createdAt: params.createdAt,
    };
  },
};

export default receiptService;
