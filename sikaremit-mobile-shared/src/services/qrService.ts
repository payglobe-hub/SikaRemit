import api from './api';
import { ENDPOINTS } from '../constants/api';
import { QRCodeData } from '../types';

export const qrService = {
  generateQR: async (data: {
    merchant_id: string;
    merchant_name: string;
    amount?: number;
    currency: string;
    reference: string;
    expiry_minutes?: number;
    description?: string;
  }): Promise<{
    qr_data: string;
    reference: string;
    expiry: string;
  }> => {
    const response = await api.post(ENDPOINTS.QR.GENERATE, data);
    return response.data;
  },

  validateQR: async (qrData: string): Promise<{
    valid: boolean;
    merchant?: { name: string; id: string };
    amount?: number;
    currency?: string;
    reference?: string;
  }> => {
    const response = await api.post(ENDPOINTS.QR.VALIDATE, { qr_data: qrData });
    return response.data;
  },

  processQRPayment: async (qrReference: string, paymentMethodId: string): Promise<any> => {
    const response = await api.post(ENDPOINTS.QR.PROCESS, {
      qr_reference: qrReference,
      payment_method_id: paymentMethodId,
    });
    return response.data;
  },

  getQRDetails: async (reference: string): Promise<QRCodeData | null> => {
    try {
      const response = await api.get(ENDPOINTS.QR.DETAILS.replace('{reference}', reference));
      return response.data;
    } catch (error: any) {
      console.error('Failed to get QR details:', error);
      return null;
    }
  },

  validateQRFormat(qrData: string): boolean {
    try {
      // Try to parse as JSON first
      const parsed = JSON.parse(qrData);

      // Check required fields for SikaRemit QR
      return !!(
        parsed.type === 'sikaremit_payment' &&
        parsed.merchant_id &&
        parsed.amount &&
        parsed.currency &&
        parsed.reference
      );
    } catch {
      // If not JSON, check if it's a valid reference format
      return /^QR_[A-Z0-9]{8,}$/.test(qrData);
    }
  },

  createQRData(data: {
    amount: number;
    currency: string;
    merchant_name: string;
    merchant_id: string;
    expiry_minutes?: number;
    description?: string;
  }): string {
    const qrPayload = {
      version: '2.0',
      type: 'sikaremit_payment',
      merchant_id: data.merchant_id,
      merchant_name: data.merchant_name,
      amount: data.amount,
      currency: data.currency,
      reference: `QR_${Date.now()}_${Math.random().toString(36).substr(2, 8).toUpperCase()}`,
      timestamp: new Date().toISOString(),
      expiry: new Date(
        Date.now() + (data.expiry_minutes || 15) * 60 * 1000
      ).toISOString(),
      description: data.description || '',
    };

    return JSON.stringify(qrPayload);
  },

  isQRExpired(qrData: string): boolean {
    try {
      const parsed = JSON.parse(qrData);

      if (!parsed.expiry) {
        return false; // No expiry set
      }

      return new Date(parsed.expiry) < new Date();
    } catch {
      return false; // Can't parse, assume not expired
    }
  },

  getQRTimeRemaining(qrData: string): number {
    try {
      const parsed = JSON.parse(qrData);

      if (!parsed.expiry) {
        return Infinity; // No expiry
      }

      const expiryTime = new Date(parsed.expiry).getTime();
      const currentTime = new Date().getTime();

      return Math.max(0, expiryTime - currentTime);
    } catch {
      return Infinity; // Can't parse, assume no expiry
    }
  },

  formatQRExpiry(qrData: string): string {
    const timeRemaining = this.getQRTimeRemaining(qrData);

    if (timeRemaining === Infinity) {
      return 'No expiry';
    }

    if (timeRemaining === 0) {
      return 'Expired';
    }

    const minutes = Math.floor(timeRemaining / (1000 * 60));
    const seconds = Math.floor((timeRemaining % (1000 * 60)) / 1000);

    if (minutes > 0) {
      return `${minutes}m ${seconds}s remaining`;
    } else {
      return `${seconds}s remaining`;
    }
  },
};
