// Country to currency mapping for automatic recipient currency assignment
// Limited to key countries for Ghana-based remittance service
export const COUNTRY_CURRENCY_MAP: Record<string, string> = {
  // Ghana (base country)
  'GH': 'GHS',

  // Major currencies (most traded globally)
  'US': 'USD',  // United States
  'GB': 'GBP',  // United Kingdom
  'DE': 'EUR',  // Germany (Euro)
  'FR': 'EUR',  // France (Euro)
  'IT': 'EUR',  // Italy (Euro)
  'ES': 'EUR',  // Spain (Euro)
  'NL': 'EUR',  // Netherlands (Euro)

  // West Africa (major trading partners)
  'NG': 'NGN',  // Nigeria
  'CI': 'XOF',  // Côte d'Ivoire
  'SN': 'XOF',  // Senegal
  'BF': 'XOF',  // Burkina Faso
  'ML': 'XOF',  // Mali
  'BJ': 'XOF',  // Benin
  'TG': 'XOF',  // Togo
  'NE': 'XOF',  // Niger
  'GM': 'GMD',  // Gambia
  'GN': 'GNF',  // Guinea
  'SL': 'SLL',  // Sierra Leone
  'LR': 'LRD',  // Liberia
  'GW': 'XOF',  // Guinea-Bissau

  // East Africa
  'KE': 'KES',  // Kenya
  'TZ': 'TZS',  // Tanzania
  'UG': 'UGX',  // Uganda
  'RW': 'RWF',  // Rwanda
  'BI': 'BIF',  // Burundi

  // Southern Africa
  'ZA': 'ZAR',  // South Africa
  'ZM': 'ZMW',  // Zambia
  'ZW': 'USD',  // Zimbabwe (uses USD)
  'BW': 'BWP',  // Botswana
  'MZ': 'MZN',  // Mozambique
  'NA': 'NAD',  // Namibia
  'AO': 'AOA',  // Angola

  // North Africa
  'MA': 'MAD',  // Morocco
  'TN': 'TND',  // Tunisia
  'DZ': 'DZD',  // Algeria
  'EG': 'EGP',  // Egypt

  // Other important countries
  'CA': 'CAD',  // Canada
  'AU': 'AUD',  // Australia
  'IN': 'INR',  // India
  'PK': 'PKR',  // Pakistan
  'BD': 'BDT',  // Bangladesh
  'LK': 'LKR',  // Sri Lanka
  'NP': 'NPR',  // Nepal
  'PH': 'PHP',  // Philippines
  'TH': 'THB',  // Thailand
  'MY': 'MYR',  // Malaysia
  'SG': 'SGD',  // Singapore
  'ID': 'IDR',  // Indonesia

  // Caribbean (common diaspora destinations)
  'JM': 'JMD',  // Jamaica
  'TT': 'TTD',  // Trinidad and Tobago
  'BB': 'BBD',  // Barbados
  'BS': 'BSD',  // Bahamas
}

// Get currency for a country code
export function getCurrencyForCountry(countryCode: string): string {
  return COUNTRY_CURRENCY_MAP[countryCode] || 'USD' // Default to USD if country not found
}

// Check if a country uses a specific currency
export function countryUsesCurrency(countryCode: string, currency: string): boolean {
  return COUNTRY_CURRENCY_MAP[countryCode] === currency
}
