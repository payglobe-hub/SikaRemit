import {
  AlertTriangle,
  BarChart3,
  Bell,
  Building2,
  CreditCard,
  Crown,
  DollarSign,
  FileText,
  LayoutDashboard,
  MessageSquare,
  ScrollText,
  Settings,
  Shield,
  Users,
  Webhook,
} from 'lucide-react'

export const ADMIN_NAVIGATION_ITEMS = [
  {
    title: 'Dashboard',
    href: '/admin/overview',
    icon: 'LayoutDashboard',
  },
  {
    title: 'Admin Management',
    href: '/admin/admins',
    icon: 'Crown',
  },
  {
    title: 'Users',
    href: '/admin/users',
    icon: 'Users',
  },
  {
    title: 'Customers',
    href: '/admin/customers',
    icon: 'Building2',
  },
  {
    title: 'Merchants',
    href: '/admin/merchants',
    icon: 'Store',
  },
  {
    title: 'Transactions',
    href: '/admin/transactions',
    icon: 'CreditCard',
  },
  {
    title: 'KYC & Verification',
    href: '/admin/verification',
    icon: 'Shield',
  },
  {
    title: 'Disputes',
    href: '/admin/disputes',
    icon: 'AlertTriangle',
  },
  {
    title: 'Analytics',
    href: '/admin/analytics',
    icon: 'BarChart3',
  },
  {
    title: 'Reports',
    href: '/admin/reports',
    icon: 'FileText',
  },
  {
    title: 'Fees & Settings',
    href: '/admin/fees',
    icon: 'DollarSign',
  },
  {
    title: 'System Settings',
    href: '/admin/settings',
    icon: 'Settings',
  },
]

export const ADMIN_NAVIGATION = ADMIN_NAVIGATION_ITEMS
