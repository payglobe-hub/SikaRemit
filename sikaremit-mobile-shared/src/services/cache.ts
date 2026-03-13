// AsyncStorage import - optional for environments that don't have it
let AsyncStorage: any;
try {
  AsyncStorage = require('@react-native-async-storage/async-storage').default;
} catch (error) {
  // AsyncStorage not available, cache will work in memory only
  AsyncStorage = null;
}

interface CacheEntry<T = any> {
  data: T;
  timestamp: number;
  ttl: number; // Time to live in milliseconds
}

interface CacheConfig {
  defaultTTL: number; // Default TTL in milliseconds
  maxEntries: number; // Maximum number of cache entries
}

class CacheService {
  private cacheKey = '@cache';
  private config: CacheConfig = {
    defaultTTL: 5 * 60 * 1000, // 5 minutes default
    maxEntries: 100,
  };

  constructor(config?: Partial<CacheConfig>) {
    if (config) {
      this.config = { ...this.config, ...config };
    }
  }

  /**
   * Generate a cache key from request parameters
   */
  private generateKey(endpoint: string, params?: Record<string, any>): string {
    const paramsStr = params ? JSON.stringify(params) : '';
    return `${endpoint}:${paramsStr}`;
  }

  /**
   * Check if cached data is still valid
   */
  private isValid(entry: CacheEntry): boolean {
    return Date.now() - entry.timestamp < entry.ttl;
  }

  /**
   * Load cache from AsyncStorage
   */
  private async loadCache(): Promise<Record<string, CacheEntry>> {
    try {
      const stored = await AsyncStorage.getItem(this.cacheKey);
      return stored ? JSON.parse(stored) : {};
    } catch (error) {
      console.warn('Failed to load cache:', error);
      return {};
    }
  }

  /**
   * Save cache to AsyncStorage
   */
  private async saveCache(cache: Record<string, CacheEntry>): Promise<void> {
    try {
      // Clean expired entries and enforce max entries limit
      const now = Date.now();
      const validEntries = Object.keys(cache)
        .map(key => [key, cache[key]] as [string, CacheEntry])
        .filter(([_key, entry]: [string, CacheEntry]) => now - entry.timestamp < entry.ttl)
        .sort(([_a, a]: [string, CacheEntry], [_b, b]: [string, CacheEntry]) => b.timestamp - a.timestamp) // Sort by most recent
        .slice(0, this.config.maxEntries); // Keep only max entries

      const cleanedCache: Record<string, CacheEntry> = {};
      validEntries.forEach(([key, entry]: [string, CacheEntry]) => {
        cleanedCache[key] = entry;
      });

      await AsyncStorage.setItem(this.cacheKey, JSON.stringify(cleanedCache));
    } catch (error) {
      console.warn('Failed to save cache:', error);
    }
  }

  /**
   * Get cached data
   */
  async get<T>(endpoint: string, params?: Record<string, any>): Promise<T | null> {
    const key = this.generateKey(endpoint, params);
    const cache = await this.loadCache();

    const entry = cache[key];
    if (entry && this.isValid(entry)) {
      return entry.data;
    }

    // Remove invalid entry
    if (entry) {
      delete cache[key];
      await this.saveCache(cache);
    }

    return null;
  }

  /**
   * Set cached data
   */
  async set<T>(
    endpoint: string,
    data: T,
    params?: Record<string, any>,
    ttl?: number
  ): Promise<void> {
    const key = this.generateKey(endpoint, params);
    const cache = await this.loadCache();

    cache[key] = {
      data,
      timestamp: Date.now(),
      ttl: ttl || this.config.defaultTTL,
    };

    await this.saveCache(cache);
  }

  /**
   * Remove specific cache entry
   */
  async remove(endpoint: string, params?: Record<string, any>): Promise<void> {
    const key = this.generateKey(endpoint, params);
    const cache = await this.loadCache();

    if (cache[key]) {
      delete cache[key];
      await this.saveCache(cache);
    }
  }

  /**
   * Clear all cache
   */
  async clear(): Promise<void> {
    try {
      await AsyncStorage.removeItem(this.cacheKey);
    } catch (error) {
      console.warn('Failed to clear cache:', error);
    }
  }

  /**
   * Clear expired entries
   */
  async cleanup(): Promise<void> {
    const cache = await this.loadCache();
    await this.saveCache(cache); // saveCache handles cleanup
  }

  /**
   * Get cache stats
   */
  async getStats(): Promise<{
    totalEntries: number;
    validEntries: number;
    size: number;
  }> {
    const cache = await this.loadCache();
    const now = Date.now();

    const validEntries = Object.keys(cache)
      .map(key => cache[key])
      .filter((entry: CacheEntry) => now - entry.timestamp < entry.ttl)
      .length;

    const cacheString = JSON.stringify(cache);
    const size = new Blob([cacheString]).size; // Approximate size in bytes

    return {
      totalEntries: Object.keys(cache).length,
      validEntries,
      size,
    };
  }
}

// Create singleton instance
export const cacheService = new CacheService();

// Cache TTL configurations for different data types
export const CACHE_TTL = {
  // Frequently changing data
  BALANCE: 30 * 1000, // 30 seconds
  TRANSACTIONS: 2 * 60 * 1000, // 2 minutes
  EXCHANGE_RATES: 5 * 60 * 1000, // 5 minutes

  // Moderately changing data
  WALLETS: 5 * 60 * 1000, // 5 minutes
  PAYMENT_METHODS: 10 * 60 * 1000, // 10 minutes
  CURRENCIES: 30 * 60 * 1000, // 30 minutes

  // Rarely changing data
  USER_PROFILE: 60 * 60 * 1000, // 1 hour
  STATIC_DATA: 24 * 60 * 60 * 1000, // 24 hours
} as const;

// Enhanced API service with caching
export class CachedApiService {
  private cache: CacheService;

  constructor(cacheService: CacheService) {
    this.cache = cacheService;
  }

  /**
   * Make a cached API request
   */
  async request<T>(
    endpoint: string,
    requestFn: () => Promise<T>,
    options: {
      params?: Record<string, any>;
      ttl?: number;
      forceRefresh?: boolean;
      useCache?: boolean;
    } = {}
  ): Promise<T> {
    const { params, ttl, forceRefresh = false, useCache = true } = options;

    // Try to get from cache first (if not forcing refresh)
    if (!forceRefresh && useCache) {
      const cachedData = await this.cache.get<T>(endpoint, params);
      if (cachedData !== null) {
        return cachedData;
      }
    }

    // Make the actual request
    const data = await requestFn();

    // Cache the response
    if (useCache) {
      await this.cache.set(endpoint, data, params, ttl);
    }

    return data;
  }

  /**
   * Invalidate cache for specific endpoint
   */
  async invalidate(endpoint: string, params?: Record<string, any>): Promise<void> {
    await this.cache.remove(endpoint, params);
  }

  /**
   * Clear all cache
   */
  async clearCache(): Promise<void> {
    await this.cache.clear();
  }

  /**
   * Get cache statistics
   */
  async getCacheStats() {
    return await this.cache.getStats();
  }
}

// Create cached API service instance
export const cachedApiService = new CachedApiService(cacheService);

export default cacheService;
