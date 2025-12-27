/**
 * Multi-Exchange Candle API Integration
 * Supports Binance (Spot + Futures), Bybit, and other exchanges
 * Handles REST API calls for historical OHLCV data
 */

export interface Candle {
  time: number;
  open: number;
  high: number;
  low: number;
  close: number;
  volume: number;
}

export type Interval = '1m' | '5m' | '15m' | '1h' | '4h' | '1d';

// API Endpoints
const BINANCE_SPOT_API = 'https://api.binance.com/api/v3';
const BINANCE_FUTURES_API = 'https://fapi.binance.com/fapi/v1';
const BYBIT_API = 'https://api.bybit.com/v5';
const BINANCE_STREAM_API = 'wss://stream.binance.com:9443/ws';

/**
 * Convert interval string to Bybit format
 */
function intervalToBybit(interval: Interval): string {
  const map: Record<Interval, string> = {
    '1m': '1',
    '5m': '5',
    '15m': '15',
    '1h': '60',
    '4h': '240',
    '1d': 'D',
  };
  return map[interval];
}

/**
 * Format symbol for different exchanges
 */
export function formatSymbolForExchange(sym: string, exchange: 'binance' | 'bybit'): string {
  if (!sym) return 'BTCUSDT';

  // Clean up common suffixes from different exchanges
  let clean = sym
    .replace(/\.P$/i, '')      // Bybit perpetual suffix
    .replace(/\.USD$/i, '')    // Some formats
    .replace(/-PERP$/i, '')    // Hyperliquid
    .replace(/PERP$/i, '')     // Hyperliquid without dash
    .replace(/-/g, '')         // Remove dashes (BTC-USDT -> BTCUSDT)
    .toUpperCase();

  // Ensure USDT suffix for Binance/Bybit
  if (!clean.endsWith('USDT') && !clean.endsWith('BUSD') && !clean.endsWith('USDC')) {
    clean = `${clean}USDT`;
  }

  return clean;
}

/**
 * Fetch candles from Binance Futures API (for perpetuals)
 */
async function fetchBinanceFuturesCandles(
  symbol: string,
  startTime: number,
  endTime: number,
  interval: Interval
): Promise<Candle[]> {
  const params = new URLSearchParams({
    symbol,
    interval,
    startTime: startTime.toString(),
    endTime: endTime.toString(),
    limit: '1000',
  });

  console.log(`[Binance Futures] Fetching ${symbol} ${interval} from ${new Date(startTime).toISOString()}`);

  const response = await fetch(`${BINANCE_FUTURES_API}/klines?${params}`, {
    headers: { 'Accept': 'application/json' }
  });

  if (!response.ok) {
    const errorText = await response.text();
    console.error(`[Binance Futures] API error: ${response.status} - ${errorText}`);
    throw new Error(`Binance Futures API error: ${response.status}`);
  }

  const data = await response.json();

  if (!Array.isArray(data) || data.length === 0) {
    console.warn(`[Binance Futures] No candles for ${symbol}`);
    return [];
  }

  console.log(`[Binance Futures] ✓ Got ${data.length} candles`);
  return data.map((candle: any[]) => ({
    time: candle[0],
    open: parseFloat(candle[1]),
    high: parseFloat(candle[2]),
    low: parseFloat(candle[3]),
    close: parseFloat(candle[4]),
    volume: parseFloat(candle[7]),
  }));
}

/**
 * Fetch candles from Binance Spot API
 */
async function fetchBinanceSpotCandles(
  symbol: string,
  startTime: number,
  endTime: number,
  interval: Interval
): Promise<Candle[]> {
  const params = new URLSearchParams({
    symbol,
    interval,
    startTime: startTime.toString(),
    endTime: endTime.toString(),
    limit: '1000',
  });

  console.log(`[Binance Spot] Fetching ${symbol} ${interval} from ${new Date(startTime).toISOString()}`);

  const response = await fetch(`${BINANCE_SPOT_API}/klines?${params}`, {
    headers: { 'Accept': 'application/json' }
  });

  if (!response.ok) {
    const errorText = await response.text();
    console.error(`[Binance Spot] API error: ${response.status} - ${errorText}`);
    throw new Error(`Binance Spot API error: ${response.status}`);
  }

  const data = await response.json();

  if (!Array.isArray(data) || data.length === 0) {
    console.warn(`[Binance Spot] No candles for ${symbol}`);
    return [];
  }

  console.log(`[Binance Spot] ✓ Got ${data.length} candles`);
  return data.map((candle: any[]) => ({
    time: candle[0],
    open: parseFloat(candle[1]),
    high: parseFloat(candle[2]),
    low: parseFloat(candle[3]),
    close: parseFloat(candle[4]),
    volume: parseFloat(candle[7]),
  }));
}

/**
 * Fetch candles from Bybit API
 */
async function fetchBybitCandles(
  symbol: string,
  startTime: number,
  endTime: number,
  interval: Interval
): Promise<Candle[]> {
  const bybitInterval = intervalToBybit(interval);

  // Bybit uses seconds, not milliseconds
  const startSec = Math.floor(startTime / 1000);
  const endSec = Math.floor(endTime / 1000);

  const params = new URLSearchParams({
    category: 'linear',
    symbol,
    interval: bybitInterval,
    start: (startSec * 1000).toString(),
    end: (endSec * 1000).toString(),
    limit: '1000',
  });

  console.log(`[Bybit] Fetching ${symbol} ${bybitInterval} from ${new Date(startTime).toISOString()}`);

  const response = await fetch(`${BYBIT_API}/market/kline?${params}`, {
    headers: { 'Accept': 'application/json' }
  });

  if (!response.ok) {
    const errorText = await response.text();
    console.error(`[Bybit] API error: ${response.status} - ${errorText}`);
    throw new Error(`Bybit API error: ${response.status}`);
  }

  const data = await response.json();

  if (data.retCode !== 0) {
    console.error(`[Bybit] API returned error: ${data.retMsg}`);
    throw new Error(`Bybit API error: ${data.retMsg}`);
  }

  const list = data.result?.list || [];
  if (list.length === 0) {
    console.warn(`[Bybit] No candles for ${symbol}`);
    return [];
  }

  console.log(`[Bybit] ✓ Got ${list.length} candles`);

  // Bybit returns [startTime, open, high, low, close, volume, turnover]
  // Data is returned in descending order, so reverse it
  return list.reverse().map((candle: string[]) => ({
    time: parseInt(candle[0]),
    open: parseFloat(candle[1]),
    high: parseFloat(candle[2]),
    low: parseFloat(candle[3]),
    close: parseFloat(candle[4]),
    volume: parseFloat(candle[5]),
  }));
}

/**
 * Main function to fetch historical candles
 * Tries multiple sources in order: Binance Futures -> Binance Spot -> Bybit
 */
export async function getHistoricalCandles(
  symbol: string,
  startTime: number,
  endTime: number,
  interval: Interval
): Promise<Candle[]> {
  const binanceSymbol = formatSymbolForExchange(symbol, 'binance');
  const bybitSymbol = formatSymbolForExchange(symbol, 'bybit');

  console.log(`[getHistoricalCandles] Trying to fetch data for ${symbol} (formatted: ${binanceSymbol})`);
  console.log(`[getHistoricalCandles] Time range: ${new Date(startTime).toISOString()} to ${new Date(endTime).toISOString()}`);

  // Try Binance Futures first (most perpetual trades)
  try {
    const candles = await fetchBinanceFuturesCandles(binanceSymbol, startTime, endTime, interval);
    if (candles.length > 0) {
      console.log(`[getHistoricalCandles] ✓ SUCCESS via Binance Futures: ${candles.length} candles`);
      return candles;
    }
  } catch (err) {
    console.log(`[getHistoricalCandles] Binance Futures failed: ${err}`);
  }

  // Try Binance Spot
  try {
    const candles = await fetchBinanceSpotCandles(binanceSymbol, startTime, endTime, interval);
    if (candles.length > 0) {
      console.log(`[getHistoricalCandles] ✓ SUCCESS via Binance Spot: ${candles.length} candles`);
      return candles;
    }
  } catch (err) {
    console.log(`[getHistoricalCandles] Binance Spot failed: ${err}`);
  }

  // Try Bybit
  try {
    const candles = await fetchBybitCandles(bybitSymbol, startTime, endTime, interval);
    if (candles.length > 0) {
      console.log(`[getHistoricalCandles] ✓ SUCCESS via Bybit: ${candles.length} candles`);
      return candles;
    }
  } catch (err) {
    console.log(`[getHistoricalCandles] Bybit failed: ${err}`);
  }

  console.error(`[getHistoricalCandles] ✗ ALL SOURCES FAILED for ${symbol}`);
  return [];
}

/**
 * Connect to Binance WebSocket for real-time kline data
 */
export function connectBinanceStream(
  symbols: string[],
  interval: Interval,
  onCandle: (symbol: string, candle: Candle) => void
): () => void {
  const formattedSymbols = symbols.map(s => formatSymbolForExchange(s, 'binance').toLowerCase());
  const streams = formattedSymbols
    .map((sym) => `${sym}@kline_${interval}`)
    .join('/');

  const wsUrl = `${BINANCE_STREAM_API}/${streams}`;
  console.log(`[connectBinanceStream] Connecting to: ${wsUrl}`);

  const ws = new WebSocket(wsUrl);

  ws.onopen = () => {
    console.log(`[connectBinanceStream] WebSocket connected`);
  };

  ws.onmessage = (event) => {
    try {
      const message = JSON.parse(event.data);
      const { s: symbol, k: kline } = message;

      const candle: Candle = {
        time: kline.t,
        open: parseFloat(kline.o),
        high: parseFloat(kline.h),
        low: parseFloat(kline.l),
        close: parseFloat(kline.c),
        volume: parseFloat(kline.v),
      };

      window.dispatchEvent(
        new CustomEvent('binanceStreamUpdate', {
          detail: { symbol, candle },
        })
      );

      onCandle(symbol, candle);
    } catch (error) {
      console.error('[connectBinanceStream] Error processing message:', error);
      window.dispatchEvent(new Event('binanceStreamError'));
    }
  };

  ws.onerror = (error) => {
    console.error('[connectBinanceStream] WebSocket error:', error);
  };

  ws.onclose = () => {
    console.log('[connectBinanceStream] WebSocket disconnected');
  };

  return () => {
    console.log('[connectBinanceStream] Disconnecting');
    if (ws.readyState === WebSocket.OPEN) {
      ws.close();
    }
  };
}

/**
 * Fetch multiple batches of candles to cover a date range
 */
export async function getHistoricalCandlesBatch(
  symbol: string,
  startTime: number,
  endTime: number,
  interval: Interval
): Promise<Candle[]> {
  const allCandles: Candle[] = [];
  let currentStart = startTime;

  console.log(`[getHistoricalCandlesBatch] Batch fetch for ${symbol}`);

  const intervalMs: Record<Interval, number> = {
    '1m': 60 * 1000,
    '5m': 5 * 60 * 1000,
    '15m': 15 * 60 * 1000,
    '1h': 60 * 60 * 1000,
    '4h': 4 * 60 * 60 * 1000,
    '1d': 24 * 60 * 60 * 1000,
  };

  const batchDuration = 1000 * intervalMs[interval];

  while (currentStart < endTime) {
    const batchEnd = Math.min(currentStart + batchDuration, endTime);

    try {
      const candles = await getHistoricalCandles(symbol, currentStart, batchEnd, interval);
      allCandles.push(...candles);

      if (candles.length < 1000) break;

      currentStart = batchEnd;
      await new Promise((resolve) => setTimeout(resolve, 100));
    } catch (error) {
      console.error(`[getHistoricalCandlesBatch] Error:`, error);
      break;
    }
  }

  console.log(`[getHistoricalCandlesBatch] Total: ${allCandles.length} candles`);
  return allCandles;
}
