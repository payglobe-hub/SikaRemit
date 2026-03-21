export interface NotificationItem {
  id: string
  type: NotificationType
  title: string
  message: string
  timestamp: string
  read: boolean
  actionUrl?: string
  metadata?: Record<string, any>
}

export enum NotificationType {
  // Transaction Notifications
  MONEY_SENT = 'money_sent',
  MONEY_RECEIVED = 'money_received',
  BILL_PAID = 'bill_paid',
  AIRTIME_PURCHASED = 'airtime_purchased',

  // Balance Notifications
  BALANCE_LOW = 'balance_low',
  BALANCE_UPDATED = 'balance_updated',

  // Security Notifications
  LOGIN_ALERT = 'login_alert',
  PAYMENT_METHOD_ADDED = 'payment_method_added',

  // System Notifications
  SYSTEM_MAINTENANCE = 'system_maintenance',
  NEW_FEATURE = 'new_feature',

  // Error Notifications
  TRANSACTION_FAILED = 'transaction_failed',
  PAYMENT_DECLINED = 'payment_declined'
}

export interface NotificationPreferences {
  emailNotifications: boolean
  smsNotifications: boolean
  pushNotifications: boolean
  transactionAlerts: boolean
  securityAlerts: boolean
  marketingEmails: boolean
  lowBalanceAlert: boolean
  balanceThreshold: number // Minimum balance for alerts
}
