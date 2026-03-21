export function formatCurrency(amount: number, currency: string = 'USD'): string {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: currency,
  }).format(amount)
}

export function parseCurrency(value: string): number {
  // Remove currency symbols and commas, then parse
  const cleaned = value.replace(/[^0-9.-]/g, '')
  return parseFloat(cleaned) || 0
}

export function getCurrencySymbol(currency: string): string {
  const symbols: Record<string, string> = {
    USD: '$',
    EUR: '€',
    GBP: '£',
    GHS: '₵',
    NGN: '₦',
    KES: 'KSh',
    ZAR: 'R',
  }
  return symbols[currency] || currency
}
