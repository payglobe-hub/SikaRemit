import React, { createContext, useContext, useEffect, useState, ReactNode } from 'react';
import { MerchantOfflineServiceManager, MerchantServiceStatus, MerchantStats } from '../services/offline/MerchantOfflineServiceManager';
import offlineService from '../services/offlineService';

interface MerchantOfflineContextType {
  isReady: boolean;
  serviceStatus: MerchantServiceStatus | null;
  merchantStats: MerchantStats | null;
  isLoading: boolean;
  error: string | null;
  isConnected: boolean;
  pendingActionsCount: number;
  refreshStatus: () => Promise<void>;
  refreshStats: () => Promise<void>;
  processPayment: (paymentData: any) => Promise<{ success: boolean; actionId?: string; errors?: string[] }>;
  generateQRCode: (qrData: any) => Promise<{ success: boolean; actionId?: string; errors?: string[] }>;
  processRefund: (refundData: any) => Promise<{ success: boolean; actionId?: string; errors?: string[] }>;
  getServices: () => ReturnType<MerchantOfflineServiceManager['getServices']>;
}

const MerchantOfflineContext = createContext<MerchantOfflineContextType | undefined>(undefined);

interface MerchantOfflineProviderProps {
  children: ReactNode;
}

export const MerchantOfflineProvider: React.FC<MerchantOfflineProviderProps> = ({ children }) => {
  const [isReady, setIsReady] = useState(false);
  const [serviceStatus, setServiceStatus] = useState<MerchantServiceStatus | null>(null);
  const [merchantStats, setMerchantStats] = useState<MerchantStats | null>(null);
  const [pendingActionsCount, setPendingActionsCount] = useState(0);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isConnected, setIsConnected] = useState(true);

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
          setIsConnected(offlineService.isOnline());
          
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

  // Setup connectivity monitoring
  useEffect(() => {
    if (!isReady) return;

    const unsubscribe = offlineService.subscribeToNetworkChanges((isOnline: boolean) => {
      setIsConnected(isOnline);
    });

    return () => {
      unsubscribe();
    };
  }, [isReady]);

  // Update status when connectivity changes
  useEffect(() => {
    if (isReady) {
      refreshStatus();
      refreshStats();
    }
  }, [isConnected, isReady]);

  // Periodic stats update
  useEffect(() => {
    if (!isReady) return;

    const interval = setInterval(() => {
      refreshStats();
    }, 10000); // Update every 10 seconds

    return () => clearInterval(interval);
  }, [isReady]);

  // Refresh service status
  const refreshStatus = async () => {
    if (!isReady) return;

    try {
      const status = await offlineManager.getServiceStatus();
      setServiceStatus(status);
    } catch (err: any) {
      console.error('Failed to refresh merchant service status:', err);
      setError(err.message || 'Failed to get merchant service status');
    }
  };

  // Refresh merchant statistics
  const refreshStats = async () => {
    if (!isReady) return;

    try {
      const stats = await offlineManager.getMerchantStats();
      setMerchantStats(stats);
      setPendingActionsCount(stats.pendingActions);
    } catch (err: any) {
      console.error('Failed to refresh merchant stats:', err);
      setError(err.message || 'Failed to get merchant stats');
    }
  };

  // Process payment
  const processPayment = async (paymentData: any) => {
    if (!isReady) {
      return { success: false, errors: ['Merchant offline services not ready'] };
    }

    try {
      const result = await offlineManager.processPayment(paymentData);
      if (result.success) {
        // Refresh stats after successful processing
        await refreshStats();
      }
      return result;
    } catch (err: any) {
      console.error('Failed to process merchant payment:', err);
      return { success: false, errors: [err.message || 'Failed to process merchant payment'] };
    }
  };

  // Generate QR code
  const generateQRCode = async (qrData: any) => {
    if (!isReady) {
      return { success: false, errors: ['Merchant offline services not ready'] };
    }

    try {
      const result = await offlineManager.generateQRCode(qrData);
      if (result.success) {
        // Refresh stats after successful generation
        await refreshStats();
      }
      return result;
    } catch (err: any) {
      console.error('Failed to generate merchant QR code:', err);
      return { success: false, errors: [err.message || 'Failed to generate merchant QR code'] };
    }
  };

  // Process refund
  const processRefund = async (refundData: any) => {
    if (!isReady) {
      return { success: false, errors: ['Merchant offline services not ready'] };
    }

    try {
      const result = await offlineManager.processRefund(refundData);
      if (result.success) {
        // Refresh stats after successful refund
        await refreshStats();
      }
      return result;
    } catch (err: any) {
      console.error('Failed to process merchant refund:', err);
      return { success: false, errors: [err.message || 'Failed to process merchant refund'] };
    }
  };

  // Get service instances
  const getServices = () => {
    return offlineManager.getServices();
  };

  const value: MerchantOfflineContextType = {
    isReady,
    serviceStatus,
    merchantStats,
    isLoading,
    error,
    isConnected,
    pendingActionsCount,
    refreshStatus,
    refreshStats,
    processPayment,
    generateQRCode,
    processRefund,
    getServices,
  };

  return (
    <MerchantOfflineContext.Provider value={value}>
      {children}
    </MerchantOfflineContext.Provider>
  );
};

export const useMerchantOffline = (): MerchantOfflineContextType => {
  const context = useContext(MerchantOfflineContext);
  if (context === undefined) {
    throw new Error('useMerchantOffline must be used within a MerchantOfflineProvider');
  }
  return context;
};

export default MerchantOfflineContext;

