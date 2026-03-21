/**
 * Enhanced Push Notification Service
 *
 * Handles personalized push notifications for order updates, inventory alerts, and other merchant notifications
 * Features: personalization, user preferences, analytics, smart timing, and A/B testing
 */

import * as Notifications from 'expo-notifications';
import { Platform } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { WebSocketNotificationMessage } from './WebSocketService';

export interface PushNotificationData {
  id: string;
  title: string;
  body: string;
  data?: any;
  sound?: 'default' | null;
  priority?: 'default' | 'normal' | 'high';
  channelId?: string;
  // Enhanced personalization fields
  personalized?: boolean;
  userId?: string;
  segment?: string;
  abTestVariant?: string;
  scheduledTime?: Date;
  expiryTime?: Date;
}

export interface UserNotificationPreferences {
  orders: boolean;
  inventory: boolean;
  general: boolean;
  marketing: boolean;
  // Personalized preferences
  quietHoursStart?: string; // "22:00"
  quietHoursEnd?: string; // "08:00"
  preferredLanguage?: string;
  notificationFrequency?: 'low' | 'medium' | 'high';
  categories: {
    promotions: boolean;
    security: boolean;
    updates: boolean;
    reminders: boolean;
  };
}

export interface NotificationAnalytics {
  notificationId: string;
  userId: string;
  type: string;
  sentAt: Date;
  openedAt?: Date;
  actionTaken?: string;
  deviceInfo: {
    platform: string;
    appVersion: string;
  };
}

class EnhancedPushNotificationService {
  private static instance: EnhancedPushNotificationService;
  private isInitialized = false;
  private notificationSettingsKey = 'notification_settings';
  private analyticsKey = 'notification_analytics';
  private userPreferences: UserNotificationPreferences | null = null;

  private constructor() {}

  static getInstance(): EnhancedPushNotificationService {
    if (!EnhancedPushNotificationService.instance) {
      EnhancedPushNotificationService.instance = new EnhancedPushNotificationService();
    }
    return EnhancedPushNotificationService.instance;
  }

  /**
   * Load user notification preferences
   */
  async loadUserPreferences(): Promise<UserNotificationPreferences> {
    if (this.userPreferences) return this.userPreferences;

    try {
      const stored = await AsyncStorage.getItem(`${this.notificationSettingsKey}_preferences`);
      this.userPreferences = stored ? JSON.parse(stored) : this.getDefaultPreferences();
      return this.userPreferences;
    } catch (error) {
      console.error('Failed to load user preferences:', error);
      this.userPreferences = this.getDefaultPreferences();
      return this.userPreferences;
    }
  }

  /**
   * Get default notification preferences
   */
  private getDefaultPreferences(): UserNotificationPreferences {
    return {
      orders: true,
      inventory: true,
      general: true,
      marketing: false,
      quietHoursStart: '22:00',
      quietHoursEnd: '08:00',
      preferredLanguage: 'en',
      notificationFrequency: 'medium',
      categories: {
        promotions: false,
        security: true,
        updates: true,
        reminders: true,
      },
    };
  }

  /**
   * Update user notification preferences
   */
  async updateUserPreferences(preferences: Partial<UserNotificationPreferences>): Promise<void> {
    try {
      const currentPrefs = await this.loadUserPreferences();
      this.userPreferences = { ...currentPrefs, ...preferences };
      await AsyncStorage.setItem(
        `${this.notificationSettingsKey}_preferences`,
        JSON.stringify(this.userPreferences)
      );
    } catch (error) {
      console.error('Failed to update user preferences:', error);
    }
  }

  /**
   * Check if current time is within quiet hours
   */
  private isQuietHours(): boolean {
    if (!this.userPreferences?.quietHoursStart || !this.userPreferences?.quietHoursEnd) {
      return false;
    }

    const now = new Date();
    const currentTime = now.getHours() * 100 + now.getMinutes();

    const [startHour, startMinute] = this.userPreferences.quietHoursStart.split(':').map(Number);
    const [endHour, endMinute] = this.userPreferences.quietHoursEnd.split(':').map(Number);

    const startTime = startHour * 100 + startMinute;
    const endTime = endHour * 100 + endMinute;

    if (startTime <= endTime) {
      // Same day range (e.g., 08:00 to 22:00)
      return currentTime >= startTime && currentTime <= endTime;
    } else {
      // Overnight range (e.g., 22:00 to 08:00)
      return currentTime >= startTime || currentTime <= endTime;
    }
  }

  /**
   * Should send notification based on user preferences and timing
   */
  private async shouldSendNotification(data: PushNotificationData): Promise<boolean> {
    const preferences = await this.loadUserPreferences();

    // Check category preferences
    switch (data.channelId) {
      case 'orders':
        if (!preferences.orders) return false;
        break;
      case 'inventory':
        if (!preferences.inventory) return false;
        break;
      case 'general':
        if (!preferences.general) return false;
        break;
      case 'marketing':
        if (!preferences.marketing) return false;
        break;
    }

    // Check quiet hours (unless it's a high-priority notification)
    if (data.priority !== 'high' && this.isQuietHours()) {
      return false;
    }

    // Check frequency limits
    if (preferences.notificationFrequency === 'low') {
      // Implement rate limiting logic here
      // For now, allow all notifications
    }

    return true;
  }

  /**
   * Personalize notification content based on user data and preferences
   */
  private async personalizeNotification(data: PushNotificationData): Promise<PushNotificationData> {
    const preferences = await this.loadUserPreferences();

    // Add personalization flag
    data.personalized = true;

    // Localize content if needed
    if (preferences.preferredLanguage && preferences.preferredLanguage !== 'en') {
      // Implement localization logic here
      // For now, keep English
    }

    // Add A/B testing variant
    if (Math.random() > 0.5) {
      data.abTestVariant = 'A';
      // Slightly different wording for A/B testing
      data.title = data.title.replace('New', 'Fresh');
    } else {
      data.abTestVariant = 'B';
    }

    return data;
  }

  /**
   * Configure Android notification channels
   */
  private async configureAndroidChannels(): Promise<void> {
    await Notifications.setNotificationChannelAsync('orders', {
      name: 'Orders',
      importance: Notifications.AndroidImportance.HIGH,
      description: 'Order updates and notifications',
      sound: 'default',
      lightColor: '#FF6B35',
      lockscreenVisibility: Notifications.AndroidNotificationVisibility.PUBLIC,
      bypassDnd: true,
      showBadge: true,
      vibrationPattern: [0, 250, 250, 250],
    });

    await Notifications.setNotificationChannelAsync('inventory', {
      name: 'Inventory',
      importance: Notifications.AndroidImportance.HIGH,
      description: 'Inventory alerts and stock notifications',
      sound: 'default',
      lightColor: '#DC3545',
      lockscreenVisibility: Notifications.AndroidNotificationVisibility.PUBLIC,
      bypassDnd: true,
      showBadge: true,
      vibrationPattern: [0, 500, 200, 500],
    });

    await Notifications.setNotificationChannelAsync('general', {
      name: 'General',
      importance: Notifications.AndroidImportance.DEFAULT,
      description: 'General merchant notifications',
      sound: 'default',
      lightColor: '#007BFF',
      lockscreenVisibility: Notifications.AndroidNotificationVisibility.PUBLIC,
      bypassDnd: false,
      showBadge: true,
      vibrationPattern: [0, 250],
    });
  }

  /**
   * Set up notification categories for interactive notifications
   */
  private async setupNotificationCategories(): Promise<void> {
    await Notifications.setNotificationCategoryAsync('order_update', [
      {
        identifier: 'view_order',
        buttonTitle: 'View Order',
        options: {
          opensAppToForeground: true,
        },
      },
      {
        identifier: 'dismiss',
        buttonTitle: 'Dismiss',
        options: {
          opensAppToForeground: false,
        },
      },
    ]);

    await Notifications.setNotificationCategoryAsync('low_stock', [
      {
        identifier: 'manage_inventory',
        buttonTitle: 'Manage Inventory',
        options: {
          opensAppToForeground: true,
        },
      },
      {
        identifier: 'dismiss',
        buttonTitle: 'Dismiss',
        options: {
          opensAppToForeground: false,
        },
      },
    ]);
  }

  /**
   * Show a local notification with personalization and analytics
   */
  async showNotification(data: PushNotificationData): Promise<string> {
    if (!this.isInitialized) {
      await this.initialize();
    }

    // Check if notification should be sent based on user preferences
    const shouldSend = await this.shouldSendNotification(data);
    if (!shouldSend) {
      
      return '';
    }

    // Personalize notification content
    const personalizedData = await this.personalizeNotification(data);

    const notificationId = await Notifications.scheduleNotificationAsync({
      content: {
        title: personalizedData.title,
        body: personalizedData.body,
        data: {
          ...personalizedData.data,
          personalized: personalizedData.personalized,
          abTestVariant: personalizedData.abTestVariant,
        },
        sound: personalizedData.sound || 'default',
        priority: personalizedData.priority === 'high' ? Notifications.AndroidNotificationPriority.HIGH :
                 personalizedData.priority === 'normal' ? Notifications.AndroidNotificationPriority.DEFAULT :
                 Notifications.AndroidNotificationPriority.DEFAULT,
        categoryIdentifier: personalizedData.channelId || 'general',
      },
      trigger: null, // Show immediately
    });

    // Track analytics
    await this.trackNotificationAnalytics({
      notificationId,
      userId: personalizedData.userId || 'anonymous',
      type: personalizedData.channelId || 'general',
      sentAt: new Date(),
      deviceInfo: {
        platform: Platform.OS,
        appVersion: '1.0.0', // Should be dynamic
      },
    });

    return notificationId;
  }

  /**
   * Show order update notification
   */
  async showOrderUpdateNotification(orderId: string, orderNumber: string, status: string): Promise<void> {
    const statusText = status.replace('_', ' ').toLowerCase();
    await this.showNotification({
      id: `order_${orderId}`,
      title: `Order ${orderNumber}`,
      body: `Order status updated to ${statusText}`,
      data: { orderId, type: 'order_update' },
      priority: 'high',
      channelId: 'order_update',
    });
  }

  /**
   * Show low stock alert notification
   */
  async showLowStockAlert(productName: string, currentStock: number, threshold: number): Promise<void> {
    await this.showNotification({
      id: `low_stock_${Date.now()}`,
      title: 'Low Stock Alert',
      body: `${productName} is running low (${currentStock} remaining, threshold: ${threshold})`,
      data: { type: 'low_stock_alert' },
      priority: 'high',
      channelId: 'low_stock',
    });
  }

  /**
   * Show out of stock alert notification
   */
  async showOutOfStockAlert(productName: string): Promise<void> {
    await this.showNotification({
      id: `out_of_stock_${Date.now()}`,
      title: 'Out of Stock Alert',
      body: `${productName} is now out of stock`,
      data: { type: 'out_of_stock_alert' },
      priority: 'high',
      channelId: 'inventory',
    });
  }

  /**
   * Show new order notification
   */
  async showNewOrderNotification(orderNumber: string, customerName: string, amount: number): Promise<void> {
    await this.showNotification({
      id: `new_order_${Date.now()}`,
      title: 'New Order Received',
      body: `Order ${orderNumber} from ${customerName} - â‚µ${amount.toFixed(2)}`,
      data: { orderNumber, type: 'new_order' },
      priority: 'high',
      channelId: 'order_update',
    });
  }

  /**
   * Handle WebSocket notification messages
   */
  async handleWebSocketNotification(message: WebSocketNotificationMessage): Promise<void> {
    switch (message.data.type) {
      case 'new_order':
        await this.showNewOrderNotification(
          message.data.orderNumber,
          message.data.customerName,
          message.data.amount
        );
        break;

      case 'order_status_update':
        await this.showOrderUpdateNotification(
          message.data.orderId,
          message.data.orderNumber,
          message.data.status
        );
        break;

      case 'low_stock_alert':
        await this.showLowStockAlert(
          message.data.productName,
          message.data.currentStock,
          message.data.threshold
        );
        break;

      case 'out_of_stock_alert':
        await this.showOutOfStockAlert(message.data.productName);
        break;

      default:
        // Show generic notification
        await this.showNotification({
          id: message.id,
          title: message.data.title || 'Notification',
          body: message.data.message || message.data.body || 'You have a new notification',
          data: message.data,
          priority: message.data.type === 'error' ? 'high' : 'normal',
          channelId: 'general',
        });
    }
  }

  /**
   * Track notification analytics
   */
  private async trackNotificationAnalytics(analytics: NotificationAnalytics): Promise<void> {
    try {
      const storedAnalytics = await AsyncStorage.getItem(this.analyticsKey) || '[]';
      const analyticsArray: NotificationAnalytics[] = JSON.parse(storedAnalytics);

      // Keep only last 1000 analytics entries to prevent storage bloat
      if (analyticsArray.length >= 1000) {
        analyticsArray.splice(0, analyticsArray.length - 999);
      }

      analyticsArray.push(analytics);
      await AsyncStorage.setItem(this.analyticsKey, JSON.stringify(analyticsArray));
    } catch (error) {
      console.error('Failed to track notification analytics:', error);
    }
  }

  /**
   * Track notification opened
   */
  async trackNotificationOpened(notificationId: string, actionTaken?: string): Promise<void> {
    try {
      const storedAnalytics = await AsyncStorage.getItem(this.analyticsKey) || '[]';
      const analyticsArray: NotificationAnalytics[] = JSON.parse(storedAnalytics);

      const analytics = analyticsArray.find(a => a.notificationId === notificationId);
      if (analytics) {
        analytics.openedAt = new Date();
        if (actionTaken) {
          analytics.actionTaken = actionTaken;
        }
        await AsyncStorage.setItem(this.analyticsKey, JSON.stringify(analyticsArray));
      }
    } catch (error) {
      console.error('Failed to track notification opened:', error);
    }
  }

  /**
   * Get notification analytics
   */
  async getNotificationAnalytics(limit = 100): Promise<NotificationAnalytics[]> {
    try {
      const storedAnalytics = await AsyncStorage.getItem(this.analyticsKey) || '[]';
      const analyticsArray: NotificationAnalytics[] = JSON.parse(storedAnalytics);
      return analyticsArray.slice(-limit); // Return most recent entries
    } catch (error) {
      console.error('Failed to get notification analytics:', error);
      return [];
    }
  }

  /**
   * Get notification engagement metrics
   */
  async getEngagementMetrics(): Promise<{
    totalSent: number;
    totalOpened: number;
    openRate: number;
    avgTimeToOpen: number;
  }> {
    try {
      const analytics = await this.getNotificationAnalytics(1000);

      const totalSent = analytics.length;
      const openedAnalytics = analytics.filter(a => a.openedAt);

      const totalOpened = openedAnalytics.length;
      const openRate = totalSent > 0 ? (totalOpened / totalSent) * 100 : 0;

      // Calculate average time to open
      const timesToOpen = openedAnalytics
        .filter(a => a.sentAt && a.openedAt)
        .map(a => new Date(a.openedAt!).getTime() - new Date(a.sentAt).getTime())
        .filter(time => time > 0 && time < 24 * 60 * 60 * 1000); // Only reasonable times

      const avgTimeToOpen = timesToOpen.length > 0
        ? timesToOpen.reduce((sum, time) => sum + time, 0) / timesToOpen.length
        : 0;

      return {
        totalSent,
        totalOpened,
        openRate,
        avgTimeToOpen,
      };
    } catch (error) {
      console.error('Failed to get engagement metrics:', error);
      return {
        totalSent: 0,
        totalOpened: 0,
        openRate: 0,
        avgTimeToOpen: 0,
      };
    }
  }

  /**
   * Schedule personalized notification for later
   */
  async schedulePersonalizedNotification(
    data: PushNotificationData,
    scheduledTime: Date,
    userSegment?: string
  ): Promise<string> {
    // Add scheduling and segmentation data
    data.scheduledTime = scheduledTime;
    data.segment = userSegment;

    const notificationId = await Notifications.scheduleNotificationAsync({
      content: {
        title: data.title,
        body: data.body,
        data: data.data || {},
        sound: data.sound || 'default',
        categoryIdentifier: data.channelId || 'general',
      },
      trigger: { date: scheduledTime },
    });

    return notificationId;
  }

  /**
   * Send personalized marketing notification
   */
  async sendPersonalizedMarketingNotification(
    userId: string,
    userData: {
      name: string;
      recentActivity?: string;
      preferredProducts?: string[];
    }
  ): Promise<void> {
    const preferences = await this.loadUserPreferences();

    // Don't send if user has disabled marketing notifications
    if (!preferences.marketing || !preferences.categories.promotions) {
      return;
    }

    // Create personalized content based on user data
    let title = 'Special Offer Just for You!';
    let body = `Hi ${userData.name}, we have something special waiting for you.`;

    if (userData.recentActivity) {
      body = `Hi ${userData.name}, based on your recent activity, we thought you'd love this offer!`;
    }

    await this.showNotification({
      id: `marketing_${userId}_${Date.now()}`,
      title,
      body,
      data: { type: 'marketing', userId },
      priority: 'normal',
      channelId: 'marketing',
      personalized: true,
      userId,
      segment: 'active_users',
    });
  }

  /**
   * Cancel a specific notification
   */
  async cancelNotification(notificationId: string): Promise<void> {
    await Notifications.dismissNotificationAsync(notificationId);
  }

  /**
   * Cancel all notifications
   */
  async cancelAllNotifications(): Promise<void> {
    await Notifications.dismissAllNotificationsAsync();
  }

  /**
   * Get notification badge count
   */
  async getBadgeCount(): Promise<number> {
    return await Notifications.getBadgeCountAsync();
  }

  /**
   * Set notification badge count
   */
  async setBadgeCount(count: number): Promise<void> {
    await Notifications.setBadgeCountAsync(count);
  }
}

// Create singleton instance
const pushNotificationService = EnhancedPushNotificationService.getInstance();

// Export convenience functions
export const initializePushNotifications = () => pushNotificationService.initialize();
export const showPushNotification = (data: PushNotificationData) => pushNotificationService.showNotification(data);
export const showOrderUpdateNotification = (orderId: string, orderNumber: string, status: string) =>
  pushNotificationService.showOrderUpdateNotification(orderId, orderNumber, status);
export const showLowStockAlert = (productName: string, currentStock: number, threshold: number) =>
  pushNotificationService.showLowStockAlert(productName, currentStock, threshold);
export const showNewOrderNotification = (orderNumber: string, customerName: string, amount: number) =>
  pushNotificationService.showNewOrderNotification(orderNumber, customerName, amount);
export const handleWebSocketNotification = (message: WebSocketNotificationMessage) =>
  pushNotificationService.handleWebSocketNotification(message);

// Enhanced exports
export const loadUserNotificationPreferences = () => pushNotificationService.loadUserPreferences();
export const updateUserNotificationPreferences = (preferences: Partial<UserNotificationPreferences>) =>
  pushNotificationService.updateUserPreferences(preferences);
export const getNotificationAnalytics = (limit?: number) => pushNotificationService.getNotificationAnalytics(limit);
export const getNotificationEngagementMetrics = () => pushNotificationService.getEngagementMetrics();
export const trackNotificationOpened = (notificationId: string, actionTaken?: string) =>
  pushNotificationService.trackNotificationOpened(notificationId, actionTaken);
export const schedulePersonalizedNotification = (data: PushNotificationData, scheduledTime: Date, userSegment?: string) =>
  pushNotificationService.schedulePersonalizedNotification(data, scheduledTime, userSegment);
export const sendPersonalizedMarketingNotification = (userId: string, userData: any) =>
  pushNotificationService.sendPersonalizedMarketingNotification(userId, userData);

export default pushNotificationService;

