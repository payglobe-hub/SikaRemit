import mobileMoneyService, {
  detectNetwork,
  formatPhoneNumber,
  validatePhoneNumber,
  generateMoMoReference,
  MOBILE_MONEY_PROVIDERS,
} from '../../services/mobileMoneyService';

// Mock the API module
jest.mock('../../services/api', () => ({
  __esModule: true,
  default: {
    get: jest.fn(),
    post: jest.fn(),
  },
}));

describe('mobileMoneyService', () => {
  describe('detectNetwork', () => {
    it('should detect MTN network from phone number', () => {
      expect(detectNetwork('0241234567')).toBe('mtn');
      expect(detectNetwork('0541234567')).toBe('mtn');
      expect(detectNetwork('0551234567')).toBe('mtn');
      expect(detectNetwork('0591234567')).toBe('mtn');
    });

    it('should detect Telecel network from phone number', () => {
      expect(detectNetwork('0201234567')).toBe('telecel');
      expect(detectNetwork('0501234567')).toBe('telecel');
    });

    it('should detect AirtelTigo network from phone number', () => {
      expect(detectNetwork('0261234567')).toBe('airteltigo');
      expect(detectNetwork('0271234567')).toBe('airteltigo');
      expect(detectNetwork('0561234567')).toBe('airteltigo');
      expect(detectNetwork('0571234567')).toBe('airteltigo');
    });

    it('should handle phone numbers with country code', () => {
      expect(detectNetwork('233241234567')).toBe('mtn');
      expect(detectNetwork('233201234567')).toBe('telecel');
      expect(detectNetwork('233261234567')).toBe('airteltigo');
    });

    it('should return null for invalid prefixes', () => {
      expect(detectNetwork('0301234567')).toBeNull();
      expect(detectNetwork('0001234567')).toBeNull();
    });
  });

  describe('formatPhoneNumber', () => {
    it('should format phone number to local format', () => {
      expect(formatPhoneNumber('0241234567')).toBe('0241234567');
      expect(formatPhoneNumber('241234567')).toBe('0241234567');
      expect(formatPhoneNumber('233241234567')).toBe('0241234567');
    });

    it('should format phone number with country code when requested', () => {
      expect(formatPhoneNumber('0241234567', true)).toBe('233241234567');
      expect(formatPhoneNumber('241234567', true)).toBe('233241234567');
    });

    it('should handle phone numbers with spaces and dashes', () => {
      expect(formatPhoneNumber('024-123-4567')).toBe('0241234567');
      expect(formatPhoneNumber('024 123 4567')).toBe('0241234567');
      expect(formatPhoneNumber('+233 24 123 4567')).toBe('0241234567');
    });
  });

  describe('validatePhoneNumber', () => {
    it('should validate correct phone numbers', () => {
      expect(validatePhoneNumber('0241234567').valid).toBe(true);
      expect(validatePhoneNumber('0201234567').valid).toBe(true);
      expect(validatePhoneNumber('0261234567').valid).toBe(true);
    });

    it('should reject phone numbers with wrong length', () => {
      const result = validatePhoneNumber('024123456');
      expect(result.valid).toBe(false);
      expect(result.message).toBe('Phone number must be 10 digits');
    });

    it('should reject phone numbers with invalid prefix', () => {
      const result = validatePhoneNumber('0301234567');
      expect(result.valid).toBe(false);
      expect(result.message).toBe('Invalid phone number prefix');
    });
  });

  describe('generateMoMoReference', () => {
    it('should generate unique references', () => {
      const ref1 = generateMoMoReference();
      const ref2 = generateMoMoReference();
      
      expect(ref1).not.toBe(ref2);
    });

    it('should start with SIKA_MOMO_ prefix', () => {
      const ref = generateMoMoReference();
      expect(ref.startsWith('SIKA_MOMO_')).toBe(true);
    });

    it('should contain timestamp and random string', () => {
      const ref = generateMoMoReference();
      const parts = ref.split('_');
      
      expect(parts.length).toBe(4);
      expect(parts[0]).toBe('SIKA');
      expect(parts[1]).toBe('MOMO');
      expect(parseInt(parts[2])).toBeGreaterThan(0);
    });
  });

  describe('MOBILE_MONEY_PROVIDERS', () => {
    it('should have all three Ghana providers', () => {
      expect(MOBILE_MONEY_PROVIDERS).toHaveLength(3);
      
      const providerIds = MOBILE_MONEY_PROVIDERS.map(p => p.id);
      expect(providerIds).toContain('mtn');
      expect(providerIds).toContain('telecel');
      expect(providerIds).toContain('airteltigo');
    });

    it('should have valid USSD codes', () => {
      const mtn = MOBILE_MONEY_PROVIDERS.find(p => p.id === 'mtn');
      const telecel = MOBILE_MONEY_PROVIDERS.find(p => p.id === 'telecel');
      const airteltigo = MOBILE_MONEY_PROVIDERS.find(p => p.id === 'airteltigo');

      expect(mtn?.ussdCode).toBe('*170#');
      expect(telecel?.ussdCode).toBe('*110#');
      expect(airteltigo?.ussdCode).toBe('*500#');
    });
  });

  describe('getProviders', () => {
    it('should return all providers', () => {
      const providers = mobileMoneyService.getProviders();
      expect(providers).toHaveLength(3);
    });
  });

  describe('getProvider', () => {
    it('should return provider by ID', () => {
      const mtn = mobileMoneyService.getProvider('mtn');
      expect(mtn?.name).toBe('MTN Mobile Money');
    });

    it('should return undefined for invalid ID', () => {
      const invalid = mobileMoneyService.getProvider('invalid' as any);
      expect(invalid).toBeUndefined();
    });
  });

  describe('getBalanceUssdCode', () => {
    it('should return correct USSD codes for balance check', () => {
      expect(mobileMoneyService.getBalanceUssdCode('mtn')).toBe('*170#');
      expect(mobileMoneyService.getBalanceUssdCode('telecel')).toBe('*110#');
      expect(mobileMoneyService.getBalanceUssdCode('airteltigo')).toBe('*500#');
    });
  });
});
