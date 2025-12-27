/**
 * Data Caching Layer
 * Handles caching of historical candles to avoid repeated API calls
 */

import type { Candle, Interval } from './binanceApi';

interface CacheEntry {
  candles: Candle[];
  timestamp: number;
  expiresAt: number;
}

const CACHE_EXPIRY_MS = 7 * 24 * 60 * 60 * 1000; // 7 days
const MEMORY_CACHE_MAX_SIZE = 50; // Max number of cache entries in memory

class DataCache {
  private memoryCache = new Map<string, CacheEntry>();
  private localStorage: Storage | null = null;

  constructor() {
    // Check if localStorage is available
    try {
      this.localStorage = typeof window !== 'undefined' ? window.localStorage : null;
    } catch (e) {
      this.localStorage = null;
    }
  }

  /**
   * Generate cache key from symbol, interval, and date range
   */
  private getCacheKey(symbol: string, interval: Interval, startDate: number, endDate: number): string {
    return `candles_${symbol}_${interval}_${Math.floor(startDate / 1000)}_${Math.floor(endDate / 1000)}`;
  }

  /**
   * Get candles from cache (memory or localStorage)
   */
  getCachedCandles(
    symbol: string,
    interval: Interval,
    startDate: number,
    endDate: number
  ): Candle[] | null {
    const key = this.getCacheKey(symbol, interval, startDate, endDate);
    const now = Date.now();

    // Check memory cache first
    const memoryCacheEntry = this.memoryCache.get(key);
    if (memoryCacheEntry && memoryCacheEntry.expiresAt > now) {
      return memoryCacheEntry.candles;
    }

    // Remove expired memory cache entry
    if (memoryCacheEntry) {
      this.memoryCache.delete(key);
    }

    // Check localStorage
    if (this.localStorage) {
      try {
        const stored = this.localStorage.getItem(key);
        if (stored) {
          const entry: CacheEntry = JSON.parse(stored);
          if (entry.expiresAt > now) {
            // Restore to memory cache
            this.memoryCache.set(key, entry);
            return entry.candles;
          } else {
            // Remove expired localStorage entry
            this.localStorage.removeItem(key);
          }
        }
      } catch (error) {
        console.error('Error reading from localStorage:', error);
      }
    }

    return null;
  }

  /**
   * Store candles in cache (both memory and localStorage)
   */
  setCachedCandles(
    symbol: string,
    interval: Interval,
    startDate: number,
    endDate: number,
    candles: Candle[]
  ): void {
    const key = this.getCacheKey(symbol, interval, startDate, endDate);
    const entry: CacheEntry = {
      candles,
      timestamp: Date.now(),
      expiresAt: Date.now() + CACHE_EXPIRY_MS,
    };

    // Store in memory cache
    this.memoryCache.set(key, entry);

    // Enforce memory cache size limit
    if (this.memoryCache.size > MEMORY_CACHE_MAX_SIZE) {
      const oldestKey = Array.from(this.memoryCache.entries()).sort(
        (a, b) => a[1].timestamp - b[1].timestamp
      )[0][0];
      this.memoryCache.delete(oldestKey);
    }

    // Store in localStorage if available
    if (this.localStorage) {
      try {
        this.localStorage.setItem(key, JSON.stringify(entry));
      } catch (error) {
        console.error('Error writing to localStorage:', error);
        // Silently fail - memory cache is still available
      }
    }
  }

  /**
   * Clear all cached data
   */
  clearCache(): void {
    this.memoryCache.clear();
    if (this.localStorage) {
      try {
        // Remove all candle cache entries from localStorage
        const keys = Object.keys(this.localStorage);
        keys.forEach((key) => {
          if (key.startsWith('candles_')) {
            this.localStorage?.removeItem(key);
          }
        });
      } catch (error) {
        console.error('Error clearing localStorage:', error);
      }
    }
  }

  /**
   * Get cache statistics
   */
  getCacheStats(): {
    memoryCacheSize: number;
    localStorageSize: number;
  } {
    let localStorageSize = 0;
    if (this.localStorage) {
      const keys = Object.keys(this.localStorage);
      localStorageSize = keys.filter((key) => key.startsWith('candles_')).length;
    }

    return {
      memoryCacheSize: this.memoryCache.size,
      localStorageSize,
    };
  }
}

// Export singleton instance
export const dataCache = new DataCache();
