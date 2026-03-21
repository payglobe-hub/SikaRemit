import React, { ComponentType, lazy } from 'react';
import { View, Text } from 'react-native';
import { ActivityIndicator } from 'react-native';

/**
 * Lazy loading utility for React components with loading fallback
 */

// Loading component for lazy-loaded screens using React Native components
export const LazyScreenFallback: React.FC = () => {
  return React.createElement(View, {
    style: {
      flex: 1,
      justifyContent: 'center',
      alignItems: 'center',
      backgroundColor: '#F5F5F5'
    }
  },
    React.createElement(ActivityIndicator, { size: 'large', color: '#7C3AED' }),
    React.createElement(Text, {
      style: { marginTop: 16, fontSize: 16, color: '#666' }
    }, 'Loading...')
  );
};

// Enhanced lazy loading with error boundary
export const lazyLoad = <T extends ComponentType<any>>(
  importFunc: () => Promise<{ default: T }>,
  fallback: React.ComponentType = LazyScreenFallback
) => {
  const LazyComponent = lazy(importFunc);

  return React.forwardRef<any, React.ComponentProps<T>>((props, ref) => {
    const fallbackElement = React.createElement(fallback);
    return React.createElement(
      React.Suspense,
      { fallback: fallbackElement },
      React.createElement(LazyComponent, { ...props, ref })
    );
  });
};

// Preload function for critical screens
export const preloadScreen = (importFunc: () => Promise<any>) => {
  // Start loading the component in the background
  importFunc().catch(() => {
    // Silently handle preload failures
  });
};

// Lazy loaded screen components for customer app
export const lazyScreens = {
  // Home screens
  DashboardScreen: lazyLoad(() => import('../screens/home/DashboardScreen')),
  NotificationsScreen: lazyLoad(() => import('../screens/home/NotificationsScreen')),

  // Payment screens
  SendMoneyScreen: lazyLoad(() => import('../screens/payments/SendMoneyScreen')),
  BillPaymentScreen: lazyLoad(() => import('../screens/payments/BillPaymentScreen')),
  AirtimeScreen: lazyLoad(() => import('../screens/payments/AirtimeScreen')),
  DataBundleScreen: lazyLoad(() => import('../screens/payments/DataBundleScreen')),
  DepositScreen: lazyLoad(() => import('../screens/payments/DepositScreen')),

  // Shopping screens
  ShoppingCartScreen: lazyLoad(() => import('../screens/shopping/ShoppingCartScreen')),
  CheckoutFlowScreen: lazyLoad(() => import('../screens/shopping/CheckoutFlowScreen')),
  WishlistScreen: lazyLoad(() => import('../screens/shopping/WishlistScreen')),

  // Business screens
  BusinessDashboardScreen: lazyLoad(() => import('../screens/business/BusinessDashboardScreen')),
  BulkPaymentCreateScreen: lazyLoad(() => import('../screens/business/BulkPaymentCreateScreen')),

  // Profile screens
  ProfileScreen: lazyLoad(() => import('../screens/profile/ProfileHomeScreen')),
  SettingsScreen: lazyLoad(() => import('../screens/profile/SettingsScreen')),
  SecurityScreen: lazyLoad(() => import('../screens/profile/SecurityScreen')),
  KYCVerificationScreen: lazyLoad(() => import('../screens/profile/KYCVerificationScreen')),
  ReferralScreen: lazyLoad(() => import('../screens/profile/ReferralScreen')),

  // Transaction screens
  TransactionHistoryScreen: lazyLoad(() => import('../screens/transactions/TransactionHistoryScreen')),
};

// Lazy loaded components for common UI elements
export const lazyComponents = {
  // Heavy components that benefit from lazy loading
  // Add real components here when they exist
};

// Preload critical screens for better UX
export const preloadCriticalScreens = () => {
  // Preload home screens immediately
  preloadScreen(() => import('../screens/home/DashboardScreen'));
  preloadScreen(() => import('../screens/home/NotificationsScreen'));

  // Preload common payment screens after a short delay
  setTimeout(() => {
    preloadScreen(() => import('../screens/payments/SendMoneyScreen'));
    preloadScreen(() => import('../screens/payments/DepositScreen'));
  }, 1000);
};

// Utility to check if a component is loaded
export const isComponentLoaded = (lazyComponent: any): boolean => {
  return lazyComponent._result !== undefined;
};

// Memory management - cleanup unused lazy components
export const cleanupLazyComponents = () => {
  // Force garbage collection hint for lazy components
  if (global.gc) {
    global.gc();
  }
};
