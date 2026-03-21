export function getCardType(cardNumber: string): string | null {
  if (!cardNumber) return null
  
  // Remove spaces and non-numeric characters
  const cleanNumber = cardNumber.replace(/\D/g, '')
  
  // Visa: starts with 4
  if (/^4/.test(cleanNumber)) return 'visa'
  
  // Mastercard: starts with 5[1-5] or 2[2-7]
  if (/^(5[1-5]|2[2-7])/.test(cleanNumber)) return 'mastercard'
  
  // American Express: starts with 34 or 37
  if (/^3[47]/.test(cleanNumber)) return 'amex'
  
  // Discover: starts with 6011, 622126-622925, 644-649, or 65
  if (/^(6011|622(1(2[6-9]|[3-9]\d)|[2-8]\d{2}|9([01]\d|2[0-5]))|64[4-9]|65)/.test(cleanNumber)) {
    return 'discover'
  }
  
  // JCB: starts with 35
  if (/^35/.test(cleanNumber)) return 'jcb'
  
  // Diners Club: starts with 30[0-5], 36, or 38
  if (/^3[068]/.test(cleanNumber)) return 'diners'
  
  return null
}

export function getMobileProvider(phoneNumber: string): string | null {
  if (!phoneNumber) return null

  // Remove spaces and non-numeric characters except +
  const cleanNumber = phoneNumber.replace(/[^+\d]/g, '')

  // Extract digits after country code (Ghanaian mobile numbers are 10 digits)
  const last10Digits = cleanNumber.replace(/^\+?233/, '').slice(-10)

  if (last10Digits.length < 3) return null

  // Get the first 3 digits after removing country code
  const prefix = last10Digits.substring(0, 3)

  // MTN prefixes (largest network in Ghana)
  // 024, 025, 053, 054, 055, 056, 057, 059
  if (['024', '025', '053', '054', '055', '056', '057', '059'].includes(prefix)) {
    return 'mtn_momo'
  }

  // Telecel (formerly Vodafone Ghana) prefixes
  // 020, 050
  if (['020', '050'].includes(prefix)) {
    return 'telecel'
  }

  // AirtelTigo prefixes
  // 026, 027, 056, 057 — Note: 056/057 are shared with MTN; MTN takes priority above
  if (['026', '027', '058'].includes(prefix)) {
    return 'airtel_tigo'
  }

  // G-Money prefixes
  // 023, 025
  if (['023', '025'].includes(prefix)) {
    return 'g_money'
  }

  return null
}

export function getPaymentMethodLogo(methodType: string): string | null {
  switch (methodType?.toLowerCase()) {
    case 'mtn':
    case 'mtn_momo':
      return '/logos/mtn-momo.png'
    case 'telecel':
      return '/logos/telecel-cash.jpg'
    case 'airtel_tigo':
    case 'airteltigo':
      return '/logos/airteltigo-money.jpg'
    case 'g_money':
    case 'gmoney':
      return '/logos/g-money.svg'
    default:
      return null
  }
}
