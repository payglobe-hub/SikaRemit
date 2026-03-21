export const QUICK_ACTIONS = [
  {
    id: 'create-invoice',
    title: 'Create Invoice',
    description: 'Generate a new invoice',
    icon: 'FileText',
    href: '/merchant/invoices',
  },
  {
    id: 'add-product',
    title: 'Add Product',
    description: 'Add a new product to your store',
    icon: 'Package',
    href: '/merchant/products',
  },
  {
    id: 'view-transactions',
    title: 'View Transactions',
    description: 'Check recent transactions',
    icon: 'CreditCard',
    href: '/merchant/transactions',
  },
  {
    id: 'request-payout',
    title: 'Request Payout',
    description: 'Withdraw your earnings',
    icon: 'DollarSign',
    href: '/merchant/payouts',
  },
];

export const NAVIGATION_ITEMS = [
  {
    title: 'Dashboard',
    href: '/merchant/dashboard',
    icon: 'LayoutDashboard',
  },
  {
    title: 'Transactions',
    href: '/merchant/transactions',
    icon: 'CreditCard',
  },
  {
    title: 'Customers',
    href: '/merchant/customers',
    icon: 'Users',
  },
  {
    title: 'Invoices',
    href: '/merchant/invoices',
    icon: 'FileText',
  },
  {
    title: 'Products',
    href: '/merchant/products',
    icon: 'Package',
  },
  {
    title: 'Stores',
    href: '/merchant/stores',
    icon: 'Store',
  },
  {
    title: 'POS',
    href: '/merchant/pos',
    icon: 'DollarSign',
  },
  {
    title: 'Payouts',
    href: '/merchant/payouts',
    icon: 'Wallet',
  },
  {
    title: 'Reports',
    href: '/merchant/reports',
    icon: 'BarChart3',
  },
  {
    title: 'Analytics',
    href: '/merchant/analytics',
    icon: 'PieChart',
  },
  {
    title: 'Notifications',
    href: '/merchant/notifications',
    icon: 'Bell',
  },
  {
    title: 'Disputes',
    href: '/merchant/disputes',
    icon: 'AlertTriangle',
  },
  {
    title: 'Settings',
    href: '/merchant/settings',
    icon: 'Settings',
  },
];

export const MERCHANT_NAVIGATION = NAVIGATION_ITEMS;

export const BUSINESS_TYPES = [
  { value: 'sole_proprietorship', label: 'Sole Proprietorship' },
  { value: 'partnership', label: 'Partnership' },
  { value: 'llc', label: 'Limited Liability Company (LLC)' },
  { value: 'corporation', label: 'Corporation' },
  { value: 'nonprofit', label: 'Non-Profit Organization' },
  { value: 'other', label: 'Other' },
];

export const INVOICE_STATUSES = [
  { value: 'draft', label: 'Draft', color: 'gray' },
  { value: 'sent', label: 'Sent', color: 'blue' },
  { value: 'paid', label: 'Paid', color: 'green' },
  { value: 'overdue', label: 'Overdue', color: 'red' },
  { value: 'cancelled', label: 'Cancelled', color: 'gray' },
];
