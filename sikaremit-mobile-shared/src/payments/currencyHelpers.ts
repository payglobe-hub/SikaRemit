// Currency helper functions
export const formatCurrency = (amount: number, currencyCode: string = 'GHS'): string => {
  const currencySymbols: { [key: string]: string } = {
    GHS: '₵',
    USD: '$',
    EUR: '€',
    GBP: '£',
  };

  const symbol = currencySymbols[currencyCode] || currencyCode;
  return `${symbol}${amount.toLocaleString('en-GH', { minimumFractionDigits: 2 })}`;
};

export const convertCurrency = (
  amount: number,
  fromCurrency: string,
  toCurrency: string,
  exchangeRate: number
): number => {
  if (fromCurrency === toCurrency) {
    return amount;
  }

  // Simple conversion - in real app, would use proper exchange rate API
  return Math.round((amount * exchangeRate) * 100) / 100;
};

export const getSupportedCurrencies = () => {
  return [
    { code: 'GHS', name: 'Ghanaian Cedi', symbol: '₵', flag: '🇬🇭' },
    { code: 'USD', name: 'US Dollar', symbol: '$', flag: '🇺🇸' },
    { code: 'EUR', name: 'Euro', symbol: '€', flag: '🇪🇺' },
    { code: 'GBP', name: 'British Pound', symbol: '£', flag: '🇬🇧' },
  ];
};

export const validateCurrencyAmount = (
  amount: number,
  currency: string
): { isValid: boolean; error?: string } => {
  const limits: { [key: string]: { min: number; max: number } } = {
    GHS: { min: 1, max: 100000 },
    USD: { min: 1, max: 10000 },
    EUR: { min: 1, max: 9000 },
    GBP: { min: 1, max: 8000 },
  };

  const limit = limits[currency];
  if (!limit) {
    return { isValid: false, error: 'Unsupported currency' };
  }

  if (amount < limit.min) {
    return { isValid: false, error: `Minimum amount is ${formatCurrency(limit.min, currency)}` };
  }

  if (amount > limit.max) {
    return { isValid: false, error: `Maximum amount is ${formatCurrency(limit.max, currency)}` };
  }

  return { isValid: true };
};

export const roundToCurrencyPrecision = (amount: number, currency: string): number => {
  const precisions: { [key: string]: number } = {
    GHS: 2, // pesewas
    USD: 2, // cents
    EUR: 2, // cents
    GBP: 2, // pence
  };

  const precision = precisions[currency] || 2;
  return Math.round(amount * Math.pow(10, precision)) / Math.pow(10, precision);
};
