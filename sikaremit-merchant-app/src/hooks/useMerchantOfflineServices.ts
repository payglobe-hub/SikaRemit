import { useState, useEffect, useCallback } from 'react';
import { MerchantOfflineServiceManager, MerchantServiceStatus, MerchantStats } from '../services/offline/MerchantOfflineServiceManager';

interface UseMerchantOfflineServicesReturn {
  isReady: boolean;
  serviceStatus: MerchantServiceStatus | null;
  merchantStats: MerchantStats | null;
  isLoading: boolean;
  error: string | null;
  refreshStatus: () => Promise<void>;
  refreshStats: () => Promise<void>;
  processPayment: (paymentData: any) => Promise<{ success: boolean; actionId?: string; errors?: string[] }>;
  generateQRCode: (qrData: any) => Promise<{ success: boolean; actionId?: string; errors?: string[] }>;
  processRefund: (refundData: any) => Promise<{ success: boolean; actionId?: string; errors?: string[] }>;
}

export const useMerchantOfflineServices = (): UseMerchantOfflineServicesReturn => {
  const [isReady, setIsReady] = useState(false);
  const [serviceStatus, setServiceStatus] = useState<MerchantServiceStatus | null>(null);
  const [merchantStats, setMerchantStats] = useState<MerchantStats | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const offlineManager = MerchantOfflineServiceManager.getInstance();

  // Initialize services
  useEffect(() => {
    let mounted = true;

    const initializeServices = async () => {
      try {
        setIsLoading(true);
        setError(null);

        await offlineManager.initialize();
        
        if (mounted) {
          setIsReady(true);
          
        }
      } catch (err: any) {
        if (mounted) {
          setError(err.message || 'Failed to initialize merchant offline services');
          console.error('Failed to initialize merchant offline services:', err);
        }
      } finally {
        if (mounted) {
          setIsLoading(false);
        }
      }
    };

    initializeServices();

    return () => {
      mounted = false;
    };
  }, []);

  // Update status when connectivity changes
  useEffect(() => {
    if (isReady) {
      refreshStatus();
    }
  }, [isReady]);

  // Refresh service status
  const refreshStatus = useCallback(async () => {
    if (!isReady) return;

    try {
      const status = await offlineManager.getServiceStatus();
      setServiceStatus(status);
    } catch (err: any) {
      console.error('Failed to refresh merchant service status:', err);
      setError(err.message || 'Failed to get merchant service status');
    }
  }, [isReady, offlineManager]);

  // Refresh merchant statistics
  const refreshStats = useCallback(async () => {
    if (!isReady) return;

    try {
      const stats = await offlineManager.getMerchantStats();
      setMerchantStats(stats);
    } catch (err: any) {
      console.error('Failed to refresh merchant stats:', err);
      setError(err.message || 'Failed to get merchant stats');
    }
  }, [isReady, offlineManager]);

  // Process payment
  const processPayment = useCallback(async (paymentData: any) => {
    if (!isReady) {
      return { success: false, errors: ['Merchant offline services not ready'] };
    }

    try {
      return await offlineManager.processPayment(paymentData);
    } catch (err: any) {
      console.error('Failed to process merchant payment:', err);
      return { success: false, errors: [err.message || 'Failed to process merchant payment'] };
    }
  }, [isReady, offlineManager]);

  // Generate QR code
  const generateQRCode = useCallback(async (qrData: any) => {
    if (!isReady) {
      return { success: false, errors: ['Merchant offline services not ready'] };
    }

    try {
      return await offlineManager.generateQRCode(qrData);
    } catch (err: any) {
      console.error('Failed to generate merchant QR code:', err);
      return { success: false, errors: [err.message || 'Failed to generate merchant QR code'] };
    }
  }, [isReady, offlineManager]);

  // Process refund
  const processRefund = useCallback(async (refundData: any) => {
    if (!isReady) {
      return { success: false, errors: ['Merchant offline services not ready'] };
    }

    try {
      return await offlineManager.processRefund(refundData);
    } catch (err: any) {
      console.error('Failed to process merchant refund:', err);
      return { success: false, errors: [err.message || 'Failed to process merchant refund'] };
    }
  }, [isReady, offlineManager]);

  return {
    isReady,
    serviceStatus,
    merchantStats,
    isLoading,
    error,
    refreshStatus,
    refreshStats,
    processPayment,
    generateQRCode,
    processRefund,
  };
};

export default useMerchantOfflineServices;

