// Merchant Navigation Configuration
import {
  LayoutDashboard,
  BarChart3,
  Users,
  Receipt,
  CreditCard,
  FileText,
  Package,
  Building2,
  Settings,
  Bell,
  BarChart,
  TrendingUp,
  Store,
  Wallet
} from 'lucide-react'

export const MERCHANT_NAVIGATION = [
  {
    title: 'Dashboard',
    href: '/merchant/dashboard',
    icon: LayoutDashboard,
    description: 'Business overview'
  },
  {
    title: 'Analytics',
    href: '/merchant/analytics',
    icon: BarChart3,
    description: 'Performance metrics'
  },
  {
    title: 'Customers',
    href: '/merchant/customers',
    icon: Users,
    description: 'Customer management'
  },
  {
    title: 'Transactions',
    href: '/merchant/transactions',
    icon: CreditCard,
    description: 'Payment history'
  },
  {
    title: 'Invoices',
    href: '/merchant/invoices',
    icon: Receipt,
    description: 'Invoice management'
  },
  {
    title: 'Payouts',
    href: '/merchant/payouts',
    icon: Wallet,
    description: 'Payout processing'
  },
  {
    title: 'Products',
    href: '/merchant/products',
    icon: Package,
    description: 'Product catalog'
  },
  {
    title: 'Stores',
    href: '/merchant/stores',
    icon: Building2,
    description: 'Store management'
  },
  {
    title: 'Reports',
    href: '/merchant/reports',
    icon: FileText,
    description: 'Business reports'
  },
  {
    title: 'POS',
    href: '/merchant/pos',
    icon: Store,
    description: 'Point of sale'
  },
  {
    title: 'Notifications',
    href: '/merchant/notifications',
    icon: Bell,
    description: 'Alerts & messages'
  },
  {
    title: 'Settings',
    href: '/merchant/settings',
    icon: Settings,
    description: 'Business settings'
  }
]
