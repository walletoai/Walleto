/**
 * useLiveStreamStatus Hook
 * Tracks WebSocket connection status for live trading
 */

import { useState, useEffect } from 'react';

interface LiveStreamStatus {
  isConnected: boolean;
  symbol?: string;
  lastUpdate: number;
}

export function useLiveStreamStatus(): LiveStreamStatus {
  const [status, setStatus] = useState<LiveStreamStatus>({
    isConnected: false,
    lastUpdate: Date.now(),
  });

  useEffect(() => {
    // Listen for custom events from WebSocket stream
    const handleStreamUpdate = (event: CustomEvent) => {
      const { symbol } = event.detail;
      console.log(`[useLiveStreamStatus] Stream update received for ${symbol}`);
      setStatus({
        isConnected: true,
        symbol,
        lastUpdate: Date.now(),
      });
    };

    const handleStreamError = () => {
      console.log('[useLiveStreamStatus] Stream error received');
      setStatus((prev) => ({
        ...prev,
        isConnected: false,
      }));
    };

    const handleStreamClose = () => {
      console.log('[useLiveStreamStatus] Stream closed');
      setStatus({
        isConnected: false,
        lastUpdate: Date.now(),
      });
    };

    window.addEventListener('binanceStreamUpdate', handleStreamUpdate as EventListener);
    window.addEventListener('binanceStreamError', handleStreamError);
    window.addEventListener('binanceStreamClose', handleStreamClose);

    return () => {
      window.removeEventListener('binanceStreamUpdate', handleStreamUpdate as EventListener);
      window.removeEventListener('binanceStreamError', handleStreamError);
      window.removeEventListener('binanceStreamClose', handleStreamClose);
    };
  }, []);

  return status;
}
