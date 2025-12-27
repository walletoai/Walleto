/**
 * Generate realistic demo trades for testing
 * Creates trades with dates in the recent past that have Binance data available
 */

import type { Trade } from '../hooks/useTradeStats';

const DEMO_SYMBOLS = ['BTCUSDT', 'ETHUSDT', 'BNBUSDT', 'ADAUSDT', 'DOGEUSDT'];
const DEMO_SETUPS = ['Support Bounce', 'Resistance Break', 'Trend Following', 'Range Break', 'Moving Average Cross'];

export interface DemoTrade {
  id: string;
  symbol: string;
  side: 'LONG' | 'SHORT';
  entry: number;
  exit: number;
  date: string;
  duration?: number;
  size: number;
  leverage?: number;
  fees?: number;
  stopLoss?: number;
  takeProfit?: number;
  notes?: string;
  setup_name?: string;
  liquidationPrice?: number;
}

export function generateDemoTrades(count: number = 5): DemoTrade[] {
  const trades: DemoTrade[] = [];
  const now = Date.now();
  const oneDay = 24 * 60 * 60 * 1000;

  for (let i = 0; i < count; i++) {
    const daysAgo = Math.floor(Math.random() * 7) + 1; // 1-7 days ago
    const tradeDate = new Date(now - daysAgo * oneDay);

    // Ensure we're on a time when Binance would have data
    tradeDate.setHours(Math.floor(Math.random() * 24), 0, 0, 0);

    const symbol = DEMO_SYMBOLS[Math.floor(Math.random() * DEMO_SYMBOLS.length)];
    const side = Math.random() > 0.5 ? 'LONG' : 'SHORT';
    const setup = DEMO_SETUPS[Math.floor(Math.random() * DEMO_SETUPS.length)];

    // Generate realistic prices based on symbol
    const basePrices: { [key: string]: number } = {
      BTCUSDT: 90000,
      ETHUSDT: 3500,
      BNBUSDT: 600,
      ADAUSDT: 1.2,
      DOGEUSDT: 0.35,
    };

    const basePrice = basePrices[symbol] || 1000;
    const volatility = basePrice * 0.02; // 2% volatility
    const entryPrice = basePrice + (Math.random() - 0.5) * volatility;

    // 60% win rate for demo trades
    const isWinningTrade = Math.random() > 0.4;
    const priceChange = isWinningTrade
      ? (Math.random() + 0.5) * volatility * (side === 'LONG' ? 1 : -1)
      : (Math.random() - 0.5) * volatility * (side === 'LONG' ? -1 : 1);

    const exitPrice = entryPrice + priceChange;
    const leverage = Math.random() > 0.7 ? Math.floor(Math.random() * 10) + 2 : 1;
    const duration = (Math.floor(Math.random() * 23) + 1) * 60 * 60 * 1000; // 1-24 hours
    const size = Math.random() * 2 + 0.5; // 0.5-2.5 units
    const fees = Math.abs(entryPrice * size * 0.001); // 0.1% fees

    // Calculate PnL to determine SL/TP
    const pnl = (exitPrice - entryPrice) * size * (side === 'LONG' ? 1 : -1);
    const slDistance = Math.abs(entryPrice - exitPrice) * 0.5;
    const tpDistance = Math.abs(entryPrice - exitPrice) * 2;

    const stopLoss = side === 'LONG'
      ? entryPrice - slDistance
      : entryPrice + slDistance;

    const takeProfit = side === 'LONG'
      ? entryPrice + tpDistance
      : entryPrice - tpDistance;

    trades.push({
      id: `demo_${i}_${Date.now()}`,
      symbol,
      side,
      entry: Math.round(entryPrice * 10000) / 10000,
      exit: Math.round(exitPrice * 10000) / 10000,
      date: tradeDate.toISOString(),
      duration,
      size: Math.round(size * 1000) / 1000,
      leverage,
      fees: Math.round(fees * 100) / 100,
      stopLoss: Math.round(stopLoss * 10000) / 10000,
      takeProfit: Math.round(takeProfit * 10000) / 10000,
      notes: `Demo trade - ${isWinningTrade ? 'Winning' : 'Losing'} trade with ${pnl >= 0 ? '+' : ''}${Math.round(pnl * 100) / 100} PnL`,
      setup_name: setup,
    });
  }

  return trades.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
}
