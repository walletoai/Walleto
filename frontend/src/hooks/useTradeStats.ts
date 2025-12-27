/**
 * useTradeStats Hook
 * Calculates and memoizes trade statistics during replay
 */

import { useMemo } from 'react';
import type { Candle } from '../lib/binanceApi';

export interface Trade {
  id?: string;
  symbol: string;
  side: 'LONG' | 'SHORT';
  entryPrice: number;
  exitPrice: number;
  entryTime: number;
  exitTime: number;
  size: number;
  leverage?: number;
  fees?: number;
  stopLoss?: number;
  takeProfit?: number;
  liquidationPrice?: number;
  notes?: string;
  setup?: string;
  pnlUsd?: number;
}

export interface TradeStats {
  // Price metrics
  currentPrice: number;
  distanceFromEntry: number;
  distanceFromEntryPercent: number;
  unrealizedPnL: number;
  unrealizedPnLPercent: number;
  finalPnL: number;
  finalPnLPercent: number;

  // Risk metrics
  distanceToLiquidation?: number;
  distanceToLiquidationPercent?: number;
  maxProfit?: number;
  maxLoss?: number;

  // Entry/exit info
  hasReachedEntry: boolean;
  hasReachedExit: boolean;
  tradeDuration: number;

  // Status
  isWinningTrade: boolean;
  tradeStatus: 'pending' | 'in-progress' | 'completed';
}

export function useTradeStats(trade: Trade | null, currentCandle: Candle | null): TradeStats | null {
  return useMemo(() => {
    if (!trade || !currentCandle) {
      return null;
    }

    // Use the high/low for current price, fallback to close
    const currentPrice = currentCandle.close || currentCandle.open || 0;
    const isLong = trade.side === 'LONG';

    // Distance calculations
    const distanceFromEntry = isLong
      ? currentPrice - trade.entryPrice
      : trade.entryPrice - currentPrice;
    const distanceFromEntryPercent = (distanceFromEntry / trade.entryPrice) * 100;

    // Calculate margin (position value / leverage)
    const positionValue = trade.entryPrice * trade.size;
    const marginUsed = positionValue / (trade.leverage || 1);

    // Unrealized PnL calculation (based on position size)
    const unrealizedPnL = distanceFromEntry * trade.size * (isLong ? 1 : -1);
    // PnL% is based on margin, not full position value
    const unrealizedPnLPercent = marginUsed > 0 ? (unrealizedPnL / marginUsed) * 100 : 0;

    // Final PnL calculation - prefer stored pnl_usd if available
    let finalPnL: number;
    if (trade.pnlUsd !== undefined && trade.pnlUsd !== 0) {
      finalPnL = trade.pnlUsd;
    } else {
      const distanceAtExit = isLong
        ? trade.exitPrice - trade.entryPrice
        : trade.entryPrice - trade.exitPrice;
      finalPnL = distanceAtExit * trade.size - (trade.fees || 0);
    }
    // PnL% is based on margin, not full position value
    const finalPnLPercent = marginUsed > 0 ? (finalPnL / marginUsed) * 100 : 0;

    // Check if trade milestones have been reached
    const hasReachedEntry =
      (isLong && currentPrice >= trade.entryPrice) || (!isLong && currentPrice <= trade.entryPrice);
    const hasReachedExit =
      (isLong && currentPrice >= trade.exitPrice) || (!isLong && currentPrice <= trade.exitPrice);

    // Trade duration
    const tradeDuration = trade.exitTime - trade.entryTime;

    // Liquidation metrics (for leveraged trades)
    let distanceToLiquidation: number | undefined;
    let distanceToLiquidationPercent: number | undefined;

    if (trade.leverage && trade.liquidationPrice && currentPrice > 0) {
      if (isLong) {
        // For long, liquidation is below entry
        distanceToLiquidation = currentPrice - trade.liquidationPrice;
        distanceToLiquidationPercent = ((distanceToLiquidation / currentPrice) * 100);
      } else {
        // For short, liquidation is above entry
        distanceToLiquidation = trade.liquidationPrice - currentPrice;
        distanceToLiquidationPercent = ((distanceToLiquidation / currentPrice) * 100);
      }
    }

    // Max profit / loss during trade
    let maxProfit: number | undefined;
    let maxLoss: number | undefined;

    if (trade.takeProfit && trade.takeProfit > 0) {
      const tpDistance = isLong
        ? trade.takeProfit - trade.entryPrice
        : trade.entryPrice - trade.takeProfit;
      maxProfit = Math.abs(tpDistance) * trade.size;
    }

    if (trade.stopLoss && trade.stopLoss > 0) {
      const slDistance = isLong
        ? trade.entryPrice - trade.stopLoss
        : trade.stopLoss - trade.entryPrice;
      maxLoss = -Math.abs(slDistance) * trade.size;
    }

    // Determine trade status
    let tradeStatus: 'pending' | 'in-progress' | 'completed' = 'pending';
    if (currentCandle.time >= trade.exitTime) {
      tradeStatus = 'completed';
    } else if (hasReachedEntry) {
      tradeStatus = 'in-progress';
    }

    return {
      currentPrice,
      distanceFromEntry,
      distanceFromEntryPercent,
      unrealizedPnL,
      unrealizedPnLPercent,
      finalPnL,
      finalPnLPercent,
      distanceToLiquidation,
      distanceToLiquidationPercent,
      maxProfit,
      maxLoss,
      hasReachedEntry,
      hasReachedExit,
      tradeDuration,
      isWinningTrade: finalPnL > 0,
      tradeStatus,
    };
  }, [trade, currentCandle]);
}

/**
 * Format price with appropriate decimal places
 */
export function formatPrice(price: number, decimals: number = 2): string {
  return price.toLocaleString(undefined, {
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals,
  });
}

/**
 * Format PnL value with currency
 */
export function formatPnL(pnl: number): string {
  const sign = pnl >= 0 ? '+' : '';
  return `${sign}$${pnl.toLocaleString(undefined, {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })}`;
}

/**
 * Format percentage with appropriate decimals
 */
export function formatPercent(percent: number, decimals: number = 2): string {
  const sign = percent >= 0 ? '+' : '';
  return `${sign}${percent.toFixed(decimals)}%`;
}

/**
 * Format duration in readable format (e.g., "2h 30m")
 */
export function formatDuration(durationMs: number): string {
  const seconds = Math.floor(durationMs / 1000);
  const minutes = Math.floor(seconds / 60);
  const hours = Math.floor(minutes / 60);
  const days = Math.floor(hours / 24);

  if (days > 0) {
    return `${days}d ${hours % 24}h`;
  } else if (hours > 0) {
    return `${hours}h ${minutes % 60}m`;
  } else if (minutes > 0) {
    return `${minutes}m ${seconds % 60}s`;
  } else {
    return `${seconds}s`;
  }
}

/**
 * Format timestamp to readable date and time
 */
export function formatTimestamp(timestamp: number): string {
  const date = new Date(timestamp);
  return date.toLocaleString(undefined, {
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}
