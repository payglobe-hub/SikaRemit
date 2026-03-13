import { useState, useEffect, useCallback } from 'react';
import { OfflineServiceManager, OfflineServiceStatus, OfflineStats } from '../services/offline/OfflineServiceManager';
import { useConnectivity } from '../services/connectivity/ConnectivityContext';

interface UseOfflineServicesReturn {
  isReady: boolean;
  serviceStatus: OfflineServiceStatus | null;
  offlineStats: OfflineStats | null;
  isLoading: boolean;
  error: string | null;
  refreshStatus: () => Promise<void>;
  refreshStats: () => Promise<void>;
  queuePayment: (paymentData: any) => Promise<{ success: boolean; actionId?: string; errors?: string[] }>;
  queueTransfer: (transferData: any) => Promise<{ success: boolean; actionId?: string; errors?: string[] }>;
  queueQRPayment: (qrData: any) => Promise<{ success: boolean; actionId?: string; errors?: string[] }>;
  queueBillPayment: (billData: any) => Promise<{ success: boolean; actionId?: string; errors?: string[] }>;
}

export const useOfflineServices = (): UseOfflineServicesReturn => {
  const { isConnected } = useConnectivity();
  const [isReady, setIsReady] = useState(false);
  const [serviceStatus, setServiceStatus] = useState<OfflineServiceStatus | null>(null);
  const [offlineStats, setOfflineStats] = useState<OfflineStats | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const offlineManager = OfflineServiceManager.getInstance();

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
          setError(err.message || 'Failed to initialize offline services');
          console.error('Failed to initialize offline services:', err);
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
  }, [isConnected, isReady]);

  // Refresh service status
  const refreshStatus = useCallback(async () => {
    if (!isReady) return;

    try {
      const status = await offlineManager.getServiceStatus();
      setServiceStatus(status);
    } catch (err: any) {
      console.error('Failed to refresh service status:', err);
      setError(err.message || 'Failed to get service status');
    }
  }, [isReady, offlineManager]);

  // Refresh offline statistics
  const refreshStats = useCallback(async () => {
    if (!isReady) return;

    try {
      const stats = await offlineManager.getOfflineStats();
      setOfflineStats(stats);
    } catch (err: any) {
      console.error('Failed to refresh offline stats:', err);
      setError(err.message || 'Failed to get offline stats');
    }
  }, [isReady, offlineManager]);

  // Queue payment
  const queuePayment = useCallback(async (paymentData: any) => {
    if (!isReady) {
      return { success: false, errors: ['Offline services not ready'] };
    }

    try {
      return await offlineManager.queuePayment(paymentData);
    } catch (err: any) {
      console.error('Failed to queue payment:', err);
      return { success: false, errors: [err.message || 'Failed to queue payment'] };
    }
  }, [isReady, offlineManager]);

  // Queue transfer
  const queueTransfer = useCallback(async (transferData: any) => {
    if (!isReady) {
      return { success: false, errors: ['Offline services not ready'] };
    }

    try {
      return await offlineManager.queueTransfer(transferData);
    } catch (err: any) {
      console.error('Failed to queue transfer:', err);
      return { success: false, errors: [err.message || 'Failed to queue transfer'] };
    }
  }, [isReady, offlineManager]);

  // Queue QR payment
  const queueQRPayment = useCallback(async (qrData: any) => {
    if (!isReady) {
      return { success: false, errors: ['Offline services not ready'] };
    }

    try {
      return await offlineManager.queueQRPayment(qrData);
    } catch (err: any) {
      console.error('Failed to queue QR payment:', err);
      return { success: false, errors: [err.message || 'Failed to queue QR payment'] };
    }
  }, [isReady, offlineManager]);

  // Queue bill payment
  const queueBillPayment = useCallback(async (billData: any) => {
    if (!isReady) {
      return { success: false, errors: ['Offline services not ready'] };
    }

    try {
      return await offlineManager.queueBillPayment(billData);
    } catch (err: any) {
      console.error('Failed to queue bill payment:', err);
      return { success: false, errors: [err.message || 'Failed to queue bill payment'] };
    }
  }, [isReady, offlineManager]);

  return {
    isReady,
    serviceStatus,
    offlineStats,
    isLoading,
    error,
    refreshStatus,
    refreshStats,
    queuePayment,
    queueTransfer,
    queueQRPayment,
    queueBillPayment,
  };
};

export default useOfflineServices;

