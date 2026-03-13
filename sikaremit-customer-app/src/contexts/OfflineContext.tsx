import React, { createContext, useContext, useEffect, useState, ReactNode } from 'react';
import { OfflineServiceManager, OfflineServiceStatus, OfflineStats } from '../services/offline/OfflineServiceManager';
import { useConnectivity } from '../services/connectivity/ConnectivityContext';

interface OfflineContextType {
  isReady: boolean;
  serviceStatus: OfflineServiceStatus | null;
  offlineStats: OfflineStats | null;
  isLoading: boolean;
  error: string | null;
  pendingActionsCount: number;
  refreshStatus: () => Promise<void>;
  refreshStats: () => Promise<void>;
  queuePayment: (paymentData: any) => Promise<{ success: boolean; actionId?: string; errors?: string[] }>;
  queueTransfer: (transferData: any) => Promise<{ success: boolean; actionId?: string; errors?: string[] }>;
  queueQRPayment: (qrData: any) => Promise<{ success: boolean; actionId?: string; errors?: string[] }>;
  queueBillPayment: (billData: any) => Promise<{ success: boolean; actionId?: string; errors?: string[] }>;
  getServices: () => ReturnType<OfflineServiceManager['getServices']>;
}

const OfflineContext = createContext<OfflineContextType | undefined>(undefined);

interface OfflineProviderProps {
  children: ReactNode;
}

export const OfflineProvider: React.FC<OfflineProviderProps> = ({ children }) => {
  const { isConnected } = useConnectivity();
  const [isReady, setIsReady] = useState(false);
  const [serviceStatus, setServiceStatus] = useState<OfflineServiceStatus | null>(null);
  const [offlineStats, setOfflineStats] = useState<OfflineStats | null>(null);
  const [pendingActionsCount, setPendingActionsCount] = useState(0);
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
      console.error('Failed to refresh service status:', err);
      setError(err.message || 'Failed to get service status');
    }
  };

  // Refresh offline statistics
  const refreshStats = async () => {
    if (!isReady) return;

    try {
      const stats = await offlineManager.getOfflineStats();
      setOfflineStats(stats);
      setPendingActionsCount(stats.pendingActions);
    } catch (err: any) {
      console.error('Failed to refresh offline stats:', err);
      setError(err.message || 'Failed to get offline stats');
    }
  };

  // Queue payment
  const queuePayment = async (paymentData: any) => {
    if (!isReady) {
      return { success: false, errors: ['Offline services not ready'] };
    }

    try {
      const result = await offlineManager.queuePayment(paymentData);
      if (result.success) {
        // Refresh stats after successful queue
        await refreshStats();
      }
      return result;
    } catch (err: any) {
      console.error('Failed to queue payment:', err);
      return { success: false, errors: [err.message || 'Failed to queue payment'] };
    }
  };

  // Queue transfer
  const queueTransfer = async (transferData: any) => {
    if (!isReady) {
      return { success: false, errors: ['Offline services not ready'] };
    }

    try {
      const result = await offlineManager.queueTransfer(transferData);
      if (result.success) {
        // Refresh stats after successful queue
        await refreshStats();
      }
      return result;
    } catch (err: any) {
      console.error('Failed to queue transfer:', err);
      return { success: false, errors: [err.message || 'Failed to queue transfer'] };
    }
  };

  // Queue QR payment
  const queueQRPayment = async (qrData: any) => {
    if (!isReady) {
      return { success: false, errors: ['Offline services not ready'] };
    }

    try {
      const result = await offlineManager.queueQRPayment(qrData);
      if (result.success) {
        // Refresh stats after successful queue
        await refreshStats();
      }
      return result;
    } catch (err: any) {
      console.error('Failed to queue QR payment:', err);
      return { success: false, errors: [err.message || 'Failed to queue QR payment'] };
    }
  };

  // Queue bill payment
  const queueBillPayment = async (billData: any) => {
    if (!isReady) {
      return { success: false, errors: ['Offline services not ready'] };
    }

    try {
      const result = await offlineManager.queueBillPayment(billData);
      if (result.success) {
        // Refresh stats after successful queue
        await refreshStats();
      }
      return result;
    } catch (err: any) {
      console.error('Failed to queue bill payment:', err);
      return { success: false, errors: [err.message || 'Failed to queue bill payment'] };
    }
  };

  // Get service instances
  const getServices = () => {
    return offlineManager.getServices();
  };

  const value: OfflineContextType = {
    isReady,
    serviceStatus,
    offlineStats,
    isLoading,
    error,
    pendingActionsCount,
    refreshStatus,
    refreshStats,
    queuePayment,
    queueTransfer,
    queueQRPayment,
    queueBillPayment,
    getServices,
  };

  return (
    <OfflineContext.Provider value={value}>
      {children}
    </OfflineContext.Provider>
  );
};

export const useOffline = (): OfflineContextType => {
  const context = useContext(OfflineContext);
  if (context === undefined) {
    throw new Error('useOffline must be used within an OfflineProvider');
  }
  return context;
};

export default OfflineContext;

