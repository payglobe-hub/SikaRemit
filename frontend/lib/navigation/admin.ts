// Admin Navigation Configuration
import {
  LayoutDashboard,
  Users,
  FileText,
  Shield,
  BarChart3,
  CreditCard,
  AlertTriangle,
  TrendingUp,
  Building2,
  Activity,
  Target,
  Zap,
  PieChart,
  DollarSign,
  Package,
  Wallet,
  Bell,
  MessageSquare,
  Crown,
  Webhook,
  Settings,
  Store,
  UserCheck,
  Globe,
  Lock,
  Key
} from 'lucide-react'

export const ADMIN_NAVIGATION = [
  {
    title: 'Overview',
    href: '/admin/overview',
    icon: LayoutDashboard,
    description: 'Dashboard overview',
    roles: ['super_admin', 'business_admin', 'operations_admin', 'verification_admin']
  },
  {
    title: 'Analytics',
    href: '/admin/analytics',
    icon: BarChart3,
    description: 'System analytics',
    roles: ['super_admin', 'business_admin', 'operations_admin']
  },
  {
    title: 'Users',
    href: '/admin/users',
    icon: Users,
    description: 'User management',
    roles: ['super_admin'],
    children: [
      {
        title: 'All Users',
        href: '/admin/users',
        icon: Users,
        description: 'Manage all users'
      },
      {
        title: 'Customers',
        href: '/admin/customers',
        icon: UserCheck,
        description: 'Customer accounts'
      },
      {
        title: 'Merchants',
        href: '/admin/merchants',
        icon: Store,
        description: 'Merchant accounts'
      },
      {
        title: 'Admins',
        href: '/admin/admins',
        icon: Crown,
        description: 'Admin accounts'
      }
    ]
  },
  {
    title: 'Transactions',
    href: '/admin/transactions',
    icon: CreditCard,
    description: 'Payment transactions',
    roles: ['super_admin', 'business_admin', 'operations_admin']
  },
  {
    title: 'Verification',
    href: '/admin/verification',
    icon: Shield,
    description: 'KYC & verification',
    roles: ['super_admin', 'business_admin', 'verification_admin']
  },
  {
    title: 'Compliance',
    href: '/admin/compliance',
    icon: Lock,
    description: 'Regulatory compliance',
    roles: ['super_admin', 'business_admin']
  },
  {
    title: 'Disputes',
    href: '/admin/disputes',
    icon: AlertTriangle,
    description: 'Dispute resolution',
    roles: ['super_admin', 'business_admin']
  },
  {
    title: 'Reports',
    href: '/admin/reports',
    icon: FileText,
    description: 'Business reports',
    roles: ['super_admin', 'business_admin', 'operations_admin']
  },
  {
    title: 'Fees',
    href: '/admin/fees',
    icon: DollarSign,
    description: 'Fee management',
    roles: ['super_admin', 'operations_admin']
  },
  {
    title: 'Exchange Rates',
    href: '/admin/exchange-rates',
    icon: TrendingUp,
    description: 'Currency rates',
    roles: ['super_admin', 'operations_admin']
  },
  {
    title: 'Webhooks',
    href: '/admin/webhooks',
    icon: Webhook,
    description: 'Webhook management',
    roles: ['super_admin']
  },
  {
    title: 'Notifications',
    href: '/admin/notifications',
    icon: Bell,
    description: 'System notifications',
    roles: ['super_admin', 'business_admin', 'operations_admin', 'verification_admin']
  },
  {
    title: 'Settings',
    href: '/admin/settings',
    icon: Settings,
    description: 'System settings',
    roles: ['super_admin']
  }
]
