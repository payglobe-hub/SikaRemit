import exchangeRateService, {
  SUPPORTED_CURRENCIES,
  REMITTANCE_CORRIDORS,
} from '../../services/exchangeRateService';

// Mock the API module
jest.mock('../../services/api', () => ({
  __esModule: true,
  default: {
    get: jest.fn(),
    post: jest.fn(),
  },
}));

describe('exchangeRateService', () => {
  describe('getCurrencies', () => {
    it('should return all active currencies', () => {
      const currencies = exchangeRateService.getCurrencies();
      expect(currencies.length).toBeGreaterThan(0);
      expect(currencies.every(c => c.isActive)).toBe(true);
    });

    it('should include GHS as a currency', () => {
      const currencies = exchangeRateService.getCurrencies();
      const ghs = currencies.find(c => c.code === 'GHS');
      expect(ghs).toBeDefined();
      expect(ghs?.name).toBe('Ghana Cedi');
      expect(ghs?.symbol).toBe('₵');
    });
  });

  describe('getCurrency', () => {
    it('should return currency by code', () => {
      const usd = exchangeRateService.getCurrency('USD');
      expect(usd?.code).toBe('USD');
      expect(usd?.name).toBe('US Dollar');
      expect(usd?.symbol).toBe('$');
    });

    it('should return undefined for invalid code', () => {
      const invalid = exchangeRateService.getCurrency('INVALID');
      expect(invalid).toBeUndefined();
    });
  });

  describe('getCurrencyFlag', () => {
    it('should return correct flag emoji', () => {
      expect(exchangeRateService.getCurrencyFlag('GHS')).toBe('🇬🇭');
      expect(exchangeRateService.getCurrencyFlag('USD')).toBe('🇺🇸');
      expect(exchangeRateService.getCurrencyFlag('GBP')).toBe('🇬🇧');
    });

    it('should return default emoji for unknown currency', () => {
      expect(exchangeRateService.getCurrencyFlag('UNKNOWN')).toBe('💰');
    });
  });

  describe('getCurrencySymbol', () => {
    it('should return correct currency symbol', () => {
      expect(exchangeRateService.getCurrencySymbol('GHS')).toBe('₵');
      expect(exchangeRateService.getCurrencySymbol('USD')).toBe('$');
      expect(exchangeRateService.getCurrencySymbol('EUR')).toBe('€');
      expect(exchangeRateService.getCurrencySymbol('GBP')).toBe('£');
    });

    it('should return code for unknown currency', () => {
      expect(exchangeRateService.getCurrencySymbol('UNKNOWN')).toBe('UNKNOWN');
    });
  });

  describe('getRemittanceFee', () => {
    it('should return fee structure for valid corridor', () => {
      const fee = exchangeRateService.getRemittanceFee('GHS', 'USD');
      expect(fee).toBeDefined();
      expect(fee?.flatFee).toBeGreaterThanOrEqual(0);
      expect(fee?.percentageFee).toBeGreaterThanOrEqual(0);
    });

    it('should return null for invalid corridor', () => {
      const fee = exchangeRateService.getRemittanceFee('INVALID', 'INVALID');
      expect(fee).toBeNull();
    });
  });

  describe('calculateRemittanceFee', () => {
    it('should calculate fee correctly', () => {
      const fee = exchangeRateService.calculateRemittanceFee(100, 'GHS', 'USD');
      expect(fee).toBeGreaterThan(0);
    });

    it('should respect minimum fee', () => {
      const corridor = REMITTANCE_CORRIDORS['GHS_USD'];
      const fee = exchangeRateService.calculateRemittanceFee(1, 'GHS', 'USD');
      expect(fee).toBeGreaterThanOrEqual(corridor.minimumFee);
    });

    it('should respect maximum fee', () => {
      const corridor = REMITTANCE_CORRIDORS['GHS_USD'];
      const fee = exchangeRateService.calculateRemittanceFee(100000, 'GHS', 'USD');
      expect(fee).toBeLessThanOrEqual(corridor.maximumFee);
    });

    it('should return 0 for invalid corridor', () => {
      const fee = exchangeRateService.calculateRemittanceFee(100, 'INVALID', 'INVALID');
      expect(fee).toBe(0);
    });
  });

  describe('formatAmount', () => {
    it('should format amount with currency symbol', () => {
      const formatted = exchangeRateService.formatAmount(1234.56, 'GHS');
      expect(formatted).toContain('₵');
      expect(formatted).toContain('1,234.56');
    });

    it('should handle different decimal places', () => {
      const xof = exchangeRateService.formatAmount(1000, 'XOF');
      expect(xof).toContain('1,000');
    });
  });

  describe('convert', () => {
    it('should return same amount for same currency', async () => {
      const result = await exchangeRateService.convert(100, 'GHS', 'GHS');
      expect(result).toBe(100);
    });
  });

  describe('getPopularCorridors', () => {
    it('should return popular corridors', () => {
      const corridors = exchangeRateService.getPopularCorridors();
      expect(corridors.length).toBeGreaterThan(0);
      expect(corridors[0]).toHaveProperty('source');
      expect(corridors[0]).toHaveProperty('target');
      expect(corridors[0]).toHaveProperty('label');
    });

    it('should include Ghana to USA corridor', () => {
      const corridors = exchangeRateService.getPopularCorridors();
      const ghsToUsd = corridors.find(c => c.source === 'GHS' && c.target === 'USD');
      expect(ghsToUsd).toBeDefined();
    });
  });

  describe('clearCache', () => {
    it('should clear the rate cache without error', () => {
      expect(() => exchangeRateService.clearCache()).not.toThrow();
    });
  });

  describe('SUPPORTED_CURRENCIES', () => {
    it('should have required properties for each currency', () => {
      SUPPORTED_CURRENCIES.forEach(currency => {
        expect(currency).toHaveProperty('code');
        expect(currency).toHaveProperty('name');
        expect(currency).toHaveProperty('symbol');
        expect(currency).toHaveProperty('flag');
        expect(currency).toHaveProperty('country');
        expect(currency).toHaveProperty('decimalPlaces');
        expect(currency).toHaveProperty('isActive');
      });
    });
  });
});
