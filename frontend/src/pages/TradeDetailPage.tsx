/**
 * TradeDetailPage
 * Full-screen view for replaying a single historical trade
 * Shows chart full-width with statistics panel below
 */

import React, { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import type { Trade } from '../hooks/useTradeStats';
import { useTradeStats } from '../hooks/useTradeStats';
import { TradingViewChart } from '../components/charts/TradingViewChart';
import { StatsPanel } from '../components/dashboard/StatsPanel';
import { generateDemoTrades } from '../utils/generateDemoTrades';

export default function TradeDetailPage() {
  const navigate = useNavigate();
  const { tradeId } = useParams<{ tradeId: string }>();
  const [trade, setTrade] = useState<Trade | null>(null);

  // Load trade from demo data
  useEffect(() => {
    const demoTrades = generateDemoTrades(50);

    // Try to find trade by ID (for real trades) or use index (for demo)
    const foundTrade = demoTrades.find((t) => t.id === tradeId);

    if (foundTrade) {
      const convertedTrade: Trade = {
        id: foundTrade.id,
        symbol: foundTrade.symbol,
        side: foundTrade.side,
        entryPrice: foundTrade.entry,
        exitPrice: foundTrade.exit,
        entryTime: new Date(foundTrade.date).getTime(),
        exitTime: new Date(foundTrade.date).getTime() + (foundTrade.duration || 3600000),
        size: foundTrade.size || 1,
        leverage: foundTrade.leverage,
        fees: foundTrade.fees || 0,
        stopLoss: foundTrade.stopLoss,
        takeProfit: foundTrade.takeProfit,
        liquidationPrice: foundTrade.liquidationPrice,
        notes: foundTrade.notes,
        setup: foundTrade.setup_name,
      };
      setTrade(convertedTrade);
    }
  }, [tradeId]);

  // Create a candle from the trade data
  const currentCandle = trade ? {
    time: trade.exitTime,
    open: trade.entryPrice,
    high: Math.max(trade.entryPrice, trade.exitPrice),
    low: Math.min(trade.entryPrice, trade.exitPrice),
    close: trade.exitPrice,
    volume: 0,
  } : null;

  const stats = useTradeStats(trade, currentCandle);

  return (
    <div
      style={{
        display: 'flex',
        flexDirection: 'column',
        height: 'calc(100vh - 60px)',
        backgroundColor: '#0f0a07',
        padding: '16px',
        gap: '16px',
        overflow: 'hidden',
      }}
    >
      {/* Header with back button */}
      <div
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          paddingBottom: '12px',
          borderBottom: '1px solid rgba(212, 165, 69, 0.1)',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
          <button
            onClick={() => navigate('/replay')}
            style={{
              padding: '8px 16px',
              backgroundColor: 'rgba(212, 165, 69, 0.1)',
              border: '1px solid rgba(212, 165, 69, 0.2)',
              color: '#C2B280',
              borderRadius: '8px',
              cursor: 'pointer',
              fontSize: '12px',
              fontWeight: '600',
              transition: 'all 200ms ease',
            }}
            onMouseEnter={(e) => {
              (e.currentTarget as HTMLButtonElement).style.backgroundColor = 'rgba(212, 165, 69, 0.15)';
            }}
            onMouseLeave={(e) => {
              (e.currentTarget as HTMLButtonElement).style.backgroundColor = 'rgba(212, 165, 69, 0.1)';
            }}
          >
            ← Back to Trades
          </button>
          {trade && (
            <h1
              style={{
                fontSize: '24px',
                fontWeight: '700',
                color: '#F5C76D',
                margin: 0,
              }}
            >
              {trade.symbol} • {trade.side}
            </h1>
          )}
        </div>
      </div>

      {/* Main content - Chart full width */}
      <div
        style={{
          flex: 1,
          display: 'flex',
          flexDirection: 'column',
          gap: '16px',
          overflow: 'hidden',
          minHeight: 0,
        }}
      >
        {/* Chart - takes most of the space */}
        <div
          style={{
            flex: 1.5,
            overflow: 'hidden',
            minHeight: 0,
            borderRadius: '12px',
          }}
        >
          {trade && (
            <TradingViewChart
              symbol={trade.symbol}
              trade={trade}
            />
          )}
        </div>

        {/* Statistics panel below chart */}
        <div
          style={{
            flex: 1,
            overflow: 'auto',
            borderRadius: '12px',
          }}
        >
          <StatsPanel
            trade={trade}
            stats={stats}
            isLiveMode={false}
          />
        </div>
      </div>
    </div>
  );
}
