// Customer Navigation Configuration
import {
  LayoutDashboard,
  CreditCard,
  Send,
  ArrowDownToLine,
  Smartphone,
  Receipt,
  History,
  FileText,
  User,
  Settings,
  Bell
} from 'lucide-react'

export const CUSTOMER_NAVIGATION = [
  {
    title: 'Dashboard',
    href: '/customer/dashboard',
    icon: LayoutDashboard,
    description: 'Overview & analytics'
  },
  {
    title: 'Payments',
    href: '/customer/payments',
    icon: CreditCard,
    description: 'All payment services',
    children: [
      {
        title: 'Top-up',
        href: '/customer/payments/top-up',
        icon: CreditCard,
        description: 'Add funds to account'
      },
      {
        title: 'Withdraw',
        href: '/customer/payments/withdraw',
        icon: ArrowDownToLine,
        description: 'Withdraw to mobile/bank'
      },
      {
        title: 'Transfer',
        href: '/customer/payments/domestic',
        icon: Send,
        description: 'Send money locally'
      },
      {
        title: 'Airtime',
        href: '/customer/payments/airtime',
        icon: Smartphone,
        description: 'Buy mobile airtime'
      },
      {
        title: 'Bills',
        href: '/customer/payments/bills',
        icon: Receipt,
        description: 'Pay utilities & bills'
      }
    ]
  },
  {
    title: 'Transactions',
    href: '/customer/transactions',
    icon: History,
    description: 'Payment history'
  },
  {
    title: 'Statements',
    href: '/customer/statements',
    icon: FileText,
    description: 'Account statements'
  },
  {
    title: 'Profile',
    href: '/customer/profile',
    icon: User,
    description: 'Personal information'
  },
  {
    title: 'Notifications',
    href: '/customer/notifications',
    icon: Bell,
    description: 'Messages & alerts'
  },
  {
    title: 'Settings',
    href: '/customer/settings',
    icon: Settings,
    description: 'Account preferences'
  }
]
