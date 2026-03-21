// Payment helper functions
export const formatPaymentAmount = (amount: number, currency: string = 'GHS'): string => {
  return `${currency} ${amount.toLocaleString('en-GH', { minimumFractionDigits: 2 })}`;
};

export const calculatePaymentFee = (amount: number, feePercentage: number = 0.015): number => {
  return Math.round(amount * feePercentage * 100) / 100;
};

export const validatePaymentAmount = (amount: number): { isValid: boolean; error?: string } => {
  if (amount <= 0) {
    return { isValid: false, error: 'Amount must be greater than zero' };
  }
  if (amount > 100000) { // 100,000 GHS limit
    return { isValid: false, error: 'Amount exceeds maximum limit' };
  }
  return { isValid: true };
};

export const generateTransactionReference = (): string => {
  const timestamp = Date.now();
  const random = Math.floor(Math.random() * 1000);
  return `TXN${timestamp}${random}`;
};

export const maskCardNumber = (cardNumber: string): string => {
  if (cardNumber.length < 4) return cardNumber;
  const lastFour = cardNumber.slice(-4);
  const masked = '•'.repeat(cardNumber.length - 4);
  return masked + lastFour;
};

export const getPaymentStatusColor = (status: string): string => {
  switch (status.toLowerCase()) {
    case 'completed':
    case 'success':
      return '#10B981'; // green
    case 'pending':
    case 'processing':
      return '#F59E0B'; // yellow
    case 'failed':
    case 'error':
      return '#EF4444'; // red
    case 'cancelled':
      return '#6B7280'; // gray
    default:
      return '#6B7280'; // gray
  }
};
