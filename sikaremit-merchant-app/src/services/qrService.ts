import { qrService as sharedQrService } from '@sikaremit/mobile-shared';
import axios from 'axios';
import { API_BASE_URL } from '../constants/api';
import { getAuthHeaders } from '../services/authService';

export interface QRValidationResult {
  valid: boolean;
  payment_details?: {
    amount: number;
    currency: string;
    merchant_name: string;
    reference: string;
    merchant_id?: string;
    expiry?: string;
  };
  error?: string;
}

export interface QRPaymentResult {
  success: boolean;
  amount?: number;
  currency?: string;
  merchant?: string;
  reference?: string;
  transaction_id?: string;
  error?: string;
}

export interface QRGenerationData {
  amount: number;
  currency: string;
  merchant_name: string;
  merchant_id: string;
  expiry_minutes?: number;
  description?: string;
}

export interface QRCodeData {
  version: string;
  type: string;
  merchant_id: string;
  merchant_name: string;
  amount?: number;
  currency: string;
  reference: string;
  timestamp: string;
  expiry: string;
  description?: string;
  signature: string;
}

// Extend the shared QR service with merchant-specific functionality
class MerchantQRService {
  /**
   * Validate QR code for payment (using shared service)
   */
  async validateQR(qrData: string): Promise<QRValidationResult> {
    return await sharedQrService.validateQR(qrData);
  }

  /**
   * Process QR payment (using shared service)
   */
  async processQRPayment(paymentData: {
    qr_reference: string;
    payment_method_id?: string;
  }): Promise<QRPaymentResult> {
    try {
      const response = await sharedQrService.processQRPayment(paymentData.qr_reference, paymentData.payment_method_id || '');

      return {
        success: true,
        ...response,
      };
    } catch (error: any) {
      console.error('QR payment processing failed:', error);
      return {
        success: false,
        error: error.response?.data?.error || 'QR payment processing failed',
      };
    }
  }

  /**
   * Generate QR code for merchant
   */
  async generateQRCode(data: QRGenerationData): Promise<QRCodeData> {
    try {
      const response = await axios.post(`${API_BASE_URL}/api/v1/payments/qr/generate/`, data, {
        headers: await getAuthHeaders(),
      });

      return response.data;
    } catch (error: any) {
      console.error('QR generation failed:', error);
      throw new Error(error.response?.data?.error || 'QR generation failed');
    }
  }

  /**
   * Get QR code details by reference (using shared service)
   */
  async getQRDetails(reference: string): Promise<QRCodeData | null> {
    return await sharedQrService.getQRDetails(reference);
  }

  /**
   * Validate QR code locally (using shared service)
   */
  validateQRFormat(qrData: string): boolean {
    return sharedQrService.validateQRFormat(qrData);
  }

  /**
   * Create QR data payload (using shared service)
   */
  createQRData(data: QRGenerationData): string {
    return sharedQrService.createQRData(data);
  }

  /**
   * Check if QR code is expired (using shared service)
   */
  isQRExpired(qrData: string): boolean {
    return sharedQrService.isQRExpired(qrData);
  }

  /**
   * Get QR code expiry time remaining (using shared service)
   */
  getQRTimeRemaining(qrData: string): number {
    return sharedQrService.getQRTimeRemaining(qrData);
  }

  /**
   * Format QR expiry time for display (using shared service)
   */
  formatQRExpiry(qrData: string): string {
    return sharedQrService.formatQRExpiry(qrData);
  }
}

export const qrService = new MerchantQRService();
