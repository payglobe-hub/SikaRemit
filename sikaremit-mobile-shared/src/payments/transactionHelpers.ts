// Transaction helper functions
export const generateTransactionId = (): string => {
  const timestamp = Date.now();
  const random = Math.floor(Math.random() * 1000000);
  return `TXN${timestamp}${random}`;
};

export const formatTransactionStatus = (status: string): string => {
  const statusMap: { [key: string]: string } = {
    'pending': 'Pending',
    'processing': 'Processing',
    'completed': 'Completed',
    'failed': 'Failed',
    'cancelled': 'Cancelled',
    'refunded': 'Refunded',
  };

  return statusMap[status.toLowerCase()] || status;
};

export const getTransactionStatusColor = (status: string): string => {
  switch (status.toLowerCase()) {
    case 'completed':
      return '#10B981'; // green
    case 'pending':
    case 'processing':
      return '#F59E0B'; // yellow
    case 'failed':
    case 'cancelled':
      return '#EF4444'; // red
    case 'refunded':
      return '#6B7280'; // gray
    default:
      return '#6B7280'; // gray
  }
};

export const calculateTransactionFee = (
  amount: number,
  transactionType: string
): number => {
  const feeRates: { [key: string]: number } = {
    'transfer': 0.005, // 0.5%
    'payment': 0.015,  // 1.5%
    'withdrawal': 0.01, // 1.0%
    'deposit': 0.0,    // 0%
  };

  const rate = feeRates[transactionType] || 0.01;
  return Math.round(amount * rate * 100) / 100;
};

export const validateTransactionAmount = (
  amount: number,
  transactionType: string
): { isValid: boolean; error?: string } => {
  const limits: { [key: string]: { min: number; max: number } } = {
    'transfer': { min: 1, max: 50000 },
    'payment': { min: 1, max: 10000 },
    'withdrawal': { min: 10, max: 5000 },
    'deposit': { min: 1, max: 100000 },
  };

  const limit = limits[transactionType];
  if (!limit) {
    return { isValid: false, error: 'Invalid transaction type' };
  }

  if (amount < limit.min) {
    return { isValid: false, error: `Minimum amount is ${limit.min}` };
  }

  if (amount > limit.max) {
    return { isValid: false, error: `Maximum amount is ${limit.max}` };
  }

  return { isValid: true };
};

export const formatTransactionTime = (date: Date | string): string => {
  const d = typeof date === 'string' ? new Date(date) : date;
  const now = new Date();
  const diffMs = now.getTime() - d.getTime();
  const diffMins = Math.floor(diffMs / (1000 * 60));
  const diffHours = Math.floor(diffMs / (1000 * 60 * 60));
  const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));

  if (diffMins < 1) return 'Just now';
  if (diffMins < 60) return `${diffMins}m ago`;
  if (diffHours < 24) return `${diffHours}h ago`;
  if (diffDays < 7) return `${diffDays}d ago`;

  return d.toLocaleDateString();
};
