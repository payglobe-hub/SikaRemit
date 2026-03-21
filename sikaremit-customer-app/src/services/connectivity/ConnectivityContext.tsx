import React, { createContext, useContext, useEffect, useState, ReactNode } from 'react';
import { NetInfoState } from '@react-native-community/netinfo';
import { ConnectivityManager, ConnectivityStatus, ConnectivityListener } from '../connectivity/ConnectivityManager';

interface ConnectivityContextType {
  status: ConnectivityStatus;
  isConnected: boolean;
  isGoodConnection: boolean;
  connectionDisplayText: string;
  shouldPerformExpensiveOperations: boolean;
  retryDelay: (baseDelay: number) => number;
}

const ConnectivityContext = createContext<ConnectivityContextType | undefined>(undefined);

interface ConnectivityProviderProps {
  children: ReactNode;
}

export const ConnectivityProvider: React.FC<ConnectivityProviderProps> = ({ children }) => {
  const [status, setStatus] = useState<ConnectivityStatus>({
    isConnected: true,
    isInternetReachable: true,
    type: 'none' as NetInfoState['type'],
    connectionType: 'unknown',
    strength: 'moderate',
    lastChanged: new Date(),
    isExpensive: false,
  });

  const connectivityManager = ConnectivityManager.getInstance();

  useEffect(() => {
    // Start monitoring connectivity
    connectivityManager.startMonitoring();

    // Create listener for connectivity changes
    const listener: ConnectivityListener = {
      onConnectivityChanged: (newStatus) => {
        setStatus(newStatus);
      },
      onConnectionLost: () => {
        
      },
      onConnectionRestored: () => {
        
      },
    };

    connectivityManager.addListener(listener);

    // Set initial status
    setStatus(connectivityManager.getCurrentStatus());

    // Cleanup on unmount
    return () => {
      connectivityManager.removeListener(listener);
    };
  }, []);

  const isConnected = status.isConnected && status.isInternetReachable;
  const isGoodConnection = connectivityManager.isGoodConnection();
  const connectionDisplayText = connectivityManager.getConnectionDisplayText();

  const shouldPerformExpensiveOperations = connectivityManager.shouldPerformExpensiveOperations();
  const retryDelay = (baseDelay: number) => connectivityManager.getRetryDelay(baseDelay);

  const value: ConnectivityContextType = {
    status,
    isConnected,
    isGoodConnection,
    connectionDisplayText,
    shouldPerformExpensiveOperations,
    retryDelay,
  };

  return (
    <ConnectivityContext.Provider value={value}>
      {children}
    </ConnectivityContext.Provider>
  );
};

export const useConnectivity = (): ConnectivityContextType => {
  const context = useContext(ConnectivityContext);
  if (context === undefined) {
    throw new Error('useConnectivity must be used within a ConnectivityProvider');
  }
  return context;
};

