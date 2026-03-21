/**
 * Push Notification Service
 * 
 * Handles Firebase Cloud Messaging (FCM) integration for push notifications.
 * Manages notification permissions, token registration, and notification handling.
 */

import * as Notifications from 'expo-notifications';
import * as Device from 'expo-device';
import { Platform } from 'react-native';
import { api } from './api';
import { ENDPOINTS } from '../constants/api';

// Notification types
export type NotificationType = 
  | 'transaction'
  | 'promotion'
  | 'security'
  | 'kyc'
  | 'system'
  | 'reminder';

export interface PushNotification {
  id: string;
  type: NotificationType;
  title: string;
  body: string;
  data?: Record<string, any>;
  read: boolean;
  createdAt: string;
}

export interface NotificationPreferences {
  transactions: boolean;
  promotions: boolean;
  security: boolean;
  reminders: boolean;
}

// Configure notification behavior
Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowAlert: true,
    shouldPlaySound: true,
    shouldSetBadge: true,
  }),
});

// Notification Service
const notificationService = {
  /**
   * Request notification permissions
   */
  requestPermissions: async (): Promise<boolean> => {
    if (!Device.isDevice) {
      
      return false;
    }

    const { status: existingStatus } = await Notifications.getPermissionsAsync();
    let finalStatus = existingStatus;

    if (existingStatus !== 'granted') {
      const { status } = await Notifications.requestPermissionsAsync();
      finalStatus = status;
    }

    if (finalStatus !== 'granted') {
      
      return false;
    }

    // Configure Android channel
    if (Platform.OS === 'android') {
      await Notifications.setNotificationChannelAsync('default', {
        name: 'Default',
        importance: Notifications.AndroidImportance.MAX,
        vibrationPattern: [0, 250, 250, 250],
        lightColor: '#6366F1',
      });

      await Notifications.setNotificationChannelAsync('transactions', {
        name: 'Transactions',
        description: 'Notifications about your transactions',
        importance: Notifications.AndroidImportance.HIGH,
        vibrationPattern: [0, 250, 250, 250],
        lightColor: '#10B981',
      });

      await Notifications.setNotificationChannelAsync('security', {
        name: 'Security',
        description: 'Security alerts and warnings',
        importance: Notifications.AndroidImportance.MAX,
        vibrationPattern: [0, 500, 250, 500],
        lightColor: '#EF4444',
      });

      await Notifications.setNotificationChannelAsync('promotions', {
        name: 'Promotions',
        description: 'Special offers and promotions',
        importance: Notifications.AndroidImportance.DEFAULT,
      });
    }

    return true;
  },

  /**
   * Get the Expo push token
   */
  getExpoPushToken: async (): Promise<string | null> => {
    try {
      const hasPermission = await notificationService.requestPermissions();
      if (!hasPermission) {
        return null;
      }

      const token = await Notifications.getExpoPushTokenAsync({
        projectId: process.env.EXPO_PROJECT_ID || 'your-expo-project-id', // Replace with actual project ID
      });

      return token.data;
    } catch (error) {
      console.error('Failed to get Expo push token:', error);
      return null;
    }
  },

  /**
   * Get the device push token (FCM for Android, APNs for iOS)
   */
  getDevicePushToken: async (): Promise<string | null> => {
    try {
      const hasPermission = await notificationService.requestPermissions();
      if (!hasPermission) {
        return null;
      }

      const token = await Notifications.getDevicePushTokenAsync();
      return token.data as string;
    } catch (error) {
      console.error('Failed to get device push token:', error);
      return null;
    }
  },

  /**
   * Register push token with backend
   */
  registerToken: async (token: string): Promise<boolean> => {
    try {
      await api.post(ENDPOINTS.NOTIFICATIONS.REGISTER_DEVICE, {
        token,
        platform: Platform.OS,
        device_type: Device.modelName || 'unknown',
      });
      return true;
    } catch (error) {
      console.error('Failed to register push token:', error);
      return false;
    }
  },

  /**
   * Unregister push token from backend
   */
  unregisterToken: async (token: string): Promise<boolean> => {
    try {
      await api.post(ENDPOINTS.NOTIFICATIONS.UNREGISTER_DEVICE, { token });
      return true;
    } catch (error) {
      console.error('Failed to unregister push token:', error);
      return false;
    }
  },

  /**
   * Initialize push notifications
   */
  initialize: async (): Promise<string | null> => {
    const token = await notificationService.getExpoPushToken();
    
    if (token) {
      await notificationService.registerToken(token);
    }

    return token;
  },

  /**
   * Add listener for received notifications (when app is in foreground)
   */
  addNotificationReceivedListener: (
    callback: (notification: Notifications.Notification) => void
  ): Notifications.Subscription => {
    return Notifications.addNotificationReceivedListener(callback);
  },

  /**
   * Add listener for notification responses (when user taps notification)
   */
  addNotificationResponseListener: (
    callback: (response: Notifications.NotificationResponse) => void
  ): Notifications.Subscription => {
    return Notifications.addNotificationResponseReceivedListener(callback);
  },

  /**
   * Remove notification listener
   */
  removeListener: (subscription: Notifications.Subscription): void => {
    Notifications.removeNotificationSubscription(subscription);
  },

  /**
   * Get all notifications from backend
   */
  getNotifications: async (limit: number = 20): Promise<PushNotification[]> => {
    try {
      const response = await api.get(ENDPOINTS.NOTIFICATIONS.LIST, {
        params: { limit },
      });
      return response.data.results || response.data;
    } catch (error) {
      console.error('Failed to fetch notifications:', error);
      return [];
    }
  },

  /**
   * Get unread notification count
   */
  getUnreadCount: async (): Promise<number> => {
    try {
      const response = await api.get(ENDPOINTS.NOTIFICATIONS.UNREAD_COUNT);
      return response.data.count || 0;
    } catch (error) {
      console.error('Failed to get unread count:', error);
      return 0;
    }
  },

  /**
   * Mark notification as read
   */
  markAsRead: async (notificationId: string): Promise<boolean> => {
    try {
      await api.post(ENDPOINTS.NOTIFICATIONS.MARK_READ.replace('{id}', notificationId));
      return true;
    } catch (error) {
      console.error('Failed to mark notification as read:', error);
      return false;
    }
  },

  /**
   * Mark all notifications as read
   */
  markAllAsRead: async (): Promise<boolean> => {
    try {
      await api.post(ENDPOINTS.NOTIFICATIONS.MARK_ALL_READ);
      return true;
    } catch (error) {
      console.error('Failed to mark all notifications as read:', error);
      return false;
    }
  },

  /**
   * Get notification preferences
   */
  getPreferences: async (): Promise<NotificationPreferences> => {
    try {
      const response = await api.get(ENDPOINTS.NOTIFICATIONS.PREFERENCES);
      return response.data;
    } catch (error) {
      console.error('Failed to get notification preferences:', error);
      return {
        transactions: true,
        promotions: true,
        security: true,
        reminders: true,
      };
    }
  },

  /**
   * Update notification preferences
   */
  updatePreferences: async (preferences: Partial<NotificationPreferences>): Promise<boolean> => {
    try {
      await api.patch(ENDPOINTS.NOTIFICATIONS.PREFERENCES, preferences);
      return true;
    } catch (error) {
      console.error('Failed to update notification preferences:', error);
      return false;
    }
  },

  /**
   * Schedule a local notification
   */
  scheduleLocalNotification: async (
    title: string,
    body: string,
    data?: Record<string, any>,
    trigger?: Notifications.NotificationTriggerInput
  ): Promise<string> => {
    const id = await Notifications.scheduleNotificationAsync({
      content: {
        title,
        body,
        data,
        sound: true,
      },
      trigger: trigger || null, // null = immediate
    });
    return id;
  },

  /**
   * Cancel a scheduled notification
   */
  cancelScheduledNotification: async (notificationId: string): Promise<void> => {
    await Notifications.cancelScheduledNotificationAsync(notificationId);
  },

  /**
   * Cancel all scheduled notifications
   */
  cancelAllScheduledNotifications: async (): Promise<void> => {
    await Notifications.cancelAllScheduledNotificationsAsync();
  },

  /**
   * Get badge count
   */
  getBadgeCount: async (): Promise<number> => {
    return await Notifications.getBadgeCountAsync();
  },

  /**
   * Set badge count
   */
  setBadgeCount: async (count: number): Promise<void> => {
    await Notifications.setBadgeCountAsync(count);
  },

  /**
   * Clear badge count
   */
  clearBadge: async (): Promise<void> => {
    await Notifications.setBadgeCountAsync(0);
  },

  /**
   * Dismiss all notifications from notification center
   */
  dismissAllNotifications: async (): Promise<void> => {
    await Notifications.dismissAllNotificationsAsync();
  },

  /**
   * Handle notification navigation based on type
   */
  getNavigationRoute: (notification: PushNotification): { screen: string; params?: any } | null => {
    const { type, data } = notification;

    switch (type) {
      case 'transaction':
        return {
          screen: 'TransactionDetail',
          params: { transactionId: data?.transaction_id },
        };
      case 'kyc':
        return { screen: 'KYCVerification' };
      case 'security':
        return { screen: 'Security' };
      case 'promotion':
        return {
          screen: 'PromotionDetail',
          params: { promotionId: data?.promotion_id },
        };
      default:
        return null;
    }
  },
};

export default notificationService;

