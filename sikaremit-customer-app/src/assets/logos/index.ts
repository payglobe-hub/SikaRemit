// Telecom Provider Logos
export const TelecomLogos = {
  mtn: require('./telecoms/mtn.png'),
  telecel: require('./telecoms/telecel.jpg'),
  airteltigo: require('./telecoms/airteltigo.jpg'),
};

// Card Brand Logos
export const CardLogos = {
  visa: require('./cards/visa.png'),
  // Note: SVG files need react-native-svg-transformer for direct use
  // For now, we'll use PNG/JPG or handle SVGs separately
};

// Card type detection based on card number prefix
export const detectCardType = (cardNumber: string): string | null => {
  const cleanNumber = cardNumber.replace(/\s/g, '');
  
  if (/^4/.test(cleanNumber)) return 'visa';
  if (/^5[1-5]/.test(cleanNumber) || /^2[2-7]/.test(cleanNumber)) return 'mastercard';
  if (/^3[47]/.test(cleanNumber)) return 'amex';
  if (/^6(?:011|5)/.test(cleanNumber)) return 'discover';
  
  return null;
};

// Telecom detection based on phone number prefix (Ghana)
export const detectTelecom = (phoneNumber: string): string | null => {
  const cleanNumber = phoneNumber.replace(/\s/g, '').replace(/^\+233/, '0');
  
  // MTN Ghana prefixes
  if (/^0(24|54|55|59)/.test(cleanNumber)) return 'mtn';
  
  // Telecel (formerly Vodafone) Ghana prefixes
  if (/^0(20|50)/.test(cleanNumber)) return 'telecel';
  
  // AirtelTigo Ghana prefixes
  if (/^0(26|56|27|57)/.test(cleanNumber)) return 'airteltigo';
  
  return null;
};

export default {
  TelecomLogos,
  CardLogos,
  detectCardType,
  detectTelecom,
};
