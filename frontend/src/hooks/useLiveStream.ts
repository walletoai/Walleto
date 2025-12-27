/**
 * useLiveStream Hook
 * Manages WebSocket connection for live trade data streaming
 */

import { useState, useCallback, useEffect, useRef } from 'react';
import type { Candle, Interval } from '../lib/binanceApi';
import { connectBinanceStream } from '../lib/binanceApi';

export interface LiveStreamState {
  isConnected: boolean;
  lastCandle: Candle | null;
  candles: Candle[];
  error: string | null;
}

export function useLiveStream(symbols: string[], interval: Interval) {
  const [state, setState] = useState<LiveStreamState>({
    isConnected: false,
    lastCandle: null,
    candles: [],
    error: null,
  });

  const disconnectRef = useRef<(() => void) | null>(null);

  const connect = useCallback(() => {
    if (disconnectRef.current) {
      // Already connected
      return;
    }

    setState((prev) => ({
      ...prev,
      isConnected: true,
      error: null,
    }));

    try {
      disconnectRef.current = connectBinanceStream(symbols, interval, (symbol, candle) => {
        setState((prev) => {
          // Add new candle or update existing one
          const existingIndex = prev.candles.findIndex((c) => c.time === candle.time);

          let updatedCandles = [...prev.candles];
          if (existingIndex !== -1) {
            updatedCandles[existingIndex] = candle;
          } else {
            updatedCandles.push(candle);
          }

          // Keep only the last 200 candles in memory
          if (updatedCandles.length > 200) {
            updatedCandles = updatedCandles.slice(-200);
          }

          return {
            ...prev,
            lastCandle: candle,
            candles: updatedCandles,
            isConnected: true,
          };
        });
      });
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to connect to stream';
      setState((prev) => ({
        ...prev,
        isConnected: false,
        error: errorMessage,
      }));
    }
  }, [symbols, interval]);

  const disconnect = useCallback(() => {
    if (disconnectRef.current) {
      disconnectRef.current();
      disconnectRef.current = null;
    }
    setState((prev) => ({
      ...prev,
      isConnected: false,
    }));
  }, []);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (disconnectRef.current) {
        disconnectRef.current();
        disconnectRef.current = null;
      }
    };
  }, []);

  return {
    ...state,
    connect,
    disconnect,
  };
}
