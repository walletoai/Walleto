/**
 * useBinanceData Hook
 * Handles fetching historical candle data from multiple exchanges
 * Uses real API data from Binance/Bybit
 */

import { useState, useCallback, useEffect } from 'react';
import type { Candle, Interval } from '../lib/binanceApi';
import { getHistoricalCandles } from '../lib/binanceApi';
import { dataCache } from '../lib/dataCache';

export interface UseBinanceDataState {
  candles: Candle[];
  loading: boolean;
  error: string | null;
}

export function useBinanceData(
  symbol: string,
  startTime: number,
  endTime: number,
  interval: Interval
) {
  const [state, setState] = useState<UseBinanceDataState>({
    candles: [],
    loading: false,
    error: null,
  });

  const fetchCandles = useCallback(async () => {
    // If no valid time range, don't fetch
    if (startTime === 0 || endTime === 0 || startTime >= endTime) {
      console.log(`[useBinanceData] Invalid time range: ${startTime} to ${endTime}, skipping fetch`);
      setState({
        candles: [],
        loading: false,
        error: null,
      });
      return;
    }

    console.log(`[useBinanceData] Starting fetch for ${symbol}`);

    // Check cache first
    const cached = dataCache.getCachedCandles(symbol, interval, startTime, endTime);
    if (cached) {
      console.log(`[useBinanceData] Using cached data: ${cached.length} candles`);
      setState({
        candles: cached,
        loading: false,
        error: null,
      });
      return;
    }

    console.log(`[useBinanceData] Cache miss, fetching from API`);
    setState((prev) => ({
      ...prev,
      loading: true,
      error: null,
    }));

    try {
      console.log(`[useBinanceData] Fetching real candle data for ${symbol}`);
      // Fetch real candle data from exchanges
      const candles = await getHistoricalCandles(symbol, startTime, endTime, interval);
      console.log(`[useBinanceData] Fetched ${candles.length} candles`);

      if (candles.length === 0) {
        console.warn(`[useBinanceData] No candles available for ${symbol}`);
        setState({
          candles: [],
          loading: false,
          error: 'No historical data available for this symbol',
        });
        return;
      }

      // Sort candles by time in ascending order
      candles.sort((a, b) => a.time - b.time);

      // Cache the results
      dataCache.setCachedCandles(symbol, interval, startTime, endTime, candles);

      console.log(`[useBinanceData] Successfully fetched and cached ${candles.length} candles`);
      setState({
        candles,
        loading: false,
        error: null,
      });
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to fetch candles';
      console.error(`[useBinanceData] Error fetching candles:`, errorMessage);
      setState({
        candles: [],
        loading: false,
        error: errorMessage,
      });
    }
  }, [symbol, startTime, endTime, interval]);

  useEffect(() => {
    fetchCandles();
  }, [fetchCandles]);

  return state;
}

/**
 * Hook to fetch candles for a specific trade
 * Automatically determines the time range based on entry and exit times
 */
export function useTradeCandleData(
  symbol: string,
  entryTime: number,
  exitTime: number,
  interval: Interval,
  bufferMinutes: number = 60
) {
  // Add buffer before entry and after exit for context
  const bufferMs = bufferMinutes * 60 * 1000;
  const startTime = Math.max(0, entryTime - bufferMs);
  const endTime = Math.max(startTime + 3600000, exitTime + bufferMs); // Ensure at least 1 hour of data

  console.log(`[useTradeCandleData] Fetching ${symbol}: ${new Date(startTime).toISOString()} to ${new Date(endTime).toISOString()}`);

  return useBinanceData(symbol, startTime, endTime, interval);
}
