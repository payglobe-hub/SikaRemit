// Merchant Navigation Constants - PERFECTLY MATCHING ADMIN STRUCTURE
// Ensures 100% visual and functional consistency between admin and merchant apps

export const MERCHANT_NAVIGATION_ITEMS = [
  {
    title: 'Dashboard',
    href: 'MerchantDashboard',
    icon: 'dashboard',
    description: 'Business overview and quick stats',
    category: 'core'
  },
  {
    title: 'Analytics',
    href: 'Analytics',
    icon: 'analytics',
    description: 'Business insights and performance',
    category: 'business'
  },
  {
    title: 'Transactions',
    href: 'Receipts',
    icon: 'receipts',
    description: 'Payment history and records',
    category: 'business'
  },
  {
    title: 'Devices',
    href: 'Devices',
    icon: 'devices',
    description: 'Payment terminals and equipment',
    category: 'business'
  },
  {
    title: 'Point of Sale',
    href: 'POSHome',
    icon: 'pos',
    description: 'POS system and payments',
    category: 'business'
  },
  {
    title: 'Settings',
    href: 'Settings',
    icon: 'settings',
    description: 'Account and business settings',
    category: 'system'
  }
]

// Export for consistency with admin structure
export const MERCHANT_NAVIGATION = MERCHANT_NAVIGATION_ITEMS

// Merchant screen types for TypeScript
export type MerchantScreenType = 
  | 'MerchantDashboard'
  | 'Analytics' 
  | 'Devices'
  | 'Receipts'
  | 'POSHome'
  | 'Settings'

// Color scheme matching admin exactly
export const MERCHANT_COLOR_SCHEME = {
  // Core merchant functions - BLUE (like admin Dashboard)
  dashboard: { 
    iconColor: '#0ea5e9', 
    bgColor: '#e0f2fe',
    activeBg: '#dbeafe',
    activeText: '#1d4ed8'
  },
  
  // Business operations - EMERALD (like admin Customers/Merchants)
  business: { 
    iconColor: '#22c55e', 
    bgColor: '#dcfce7',
    activeBg: '#d1fae5',
    activeText: '#059669'
  },
  
  // System & configuration - GRAY (like admin Settings)
  system: { 
    iconColor: '#6b7280', 
    bgColor: '#f3f4f6',
    activeBg: '#e5e7eb',
    activeText: '#4b5563'
  }
}

// Helper function to get colors for navigation items
export const getMerchantNavigationColor = (category: string) => {
  switch (category) {
    case 'core':
      return MERCHANT_COLOR_SCHEME.dashboard
    case 'business':
      return MERCHANT_COLOR_SCHEME.business
    case 'system':
      return MERCHANT_COLOR_SCHEME.system
    default:
      return MERCHANT_COLOR_SCHEME.system
  }
}

// Navigation items with colors pre-applied (matching admin pattern)
export const MERCHANT_NAVIGATION_WITH_COLORS = MERCHANT_NAVIGATION_ITEMS.map(item => ({
  ...item,
  colors: getMerchantNavigationColor(item.category)
}))

// Search items for global search (matching admin structure)
export const MERCHANT_SEARCH_ITEMS = [
  { name: 'Dashboard', href: 'MerchantDashboard', icon: 'dashboard' },
  { name: 'Analytics', href: 'Analytics', icon: 'analytics' },
  { name: 'Transactions', href: 'Receipts', icon: 'receipts' },
  { name: 'Devices', href: 'Devices', icon: 'devices' },
  { name: 'Point of Sale', href: 'POSHome', icon: 'pos' },
  { name: 'Settings', href: 'Settings', icon: 'settings' },
]

// Breadcrumb configuration (matching admin)
export const MERCHANT_BREADCRUMB_CONFIG = {
  home: { name: 'Dashboard', href: 'MerchantDashboard', icon: 'dashboard' },
  separator: 'chevron-right',
  maxItems: 4,
  showIcons: true
}

// User menu items (matching admin structure)
export const MERCHANT_USER_MENU_ITEMS = [
  {
    title: 'Settings',
    href: 'Settings',
    icon: 'settings',
    description: 'Account and business settings'
  },
  {
    title: 'Profile',
    href: 'Profile',
    icon: 'profile',
    description: 'Personal profile information'
  }
]

// Theme options (matching admin)
export const MERCHANT_THEME_OPTIONS = [
  { value: 'light', label: 'Light', icon: 'sun' },
  { value: 'dark', label: 'Dark', icon: 'moon' },
  { value: 'system', label: 'System', icon: 'monitor' }
]
