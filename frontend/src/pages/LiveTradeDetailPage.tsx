/**
 * LiveTradeDetailPage
 * Full-screen view for monitoring a live trade
 * Shows chart full-width with live statistics panel below
 */

import React, { useState, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import type { Trade } from '../hooks/useTradeStats';
import { useTradeStats } from '../hooks/useTradeStats';
import { TradingViewChart } from '../components/charts/TradingViewChart';
import { StatsPanel } from '../components/dashboard/StatsPanel';
import { ConnectionStatus } from '../components/common/ConnectionStatus';
import { useLiveStreamStatus } from '../hooks/useLiveStreamStatus';
import type { Interval } from '../lib/binanceApi';
import { connectBinanceStream } from '../lib/binanceApi';

interface LiveTradeState {
  trade: Trade;
  interval: Interval;
}

export default function LiveTradeDetailPage() {
  const navigate = useNavigate();
  const location = useLocation();
  const [liveTrade, setLiveTrade] = useState<Trade | null>(null);
  const [liveCandles, setLiveCandles] = useState<any[]>([]);
  const [interval, setInterval] = useState<Interval>('1h');
  const streamStatus = useLiveStreamStatus();

  // Get trade data from navigation state
  useEffect(() => {
    const state = location.state as LiveTradeState | null;
    if (state?.trade) {
      setLiveTrade(state.trade);
      if (state.interval) {
        setInterval(state.interval);
      }

      // Start WebSocket connection
      const disconnect = connectBinanceStream(
        [state.trade.symbol],
        state.interval || '1h',
        (symbol, candle) => {
          console.log(`[LiveTradeDetailPage] Received candle for ${symbol}: ${candle.close}`);
          setLiveCandles((prev) => {
            const lastCandle = prev[prev.length - 1];
            if (lastCandle && lastCandle.time === candle.time) {
              return [...prev.slice(0, -1), candle];
            } else {
              return [...prev, candle];
            }
          });

          // Update live trade with new price
          setLiveTrade((prev) =>
            prev
              ? {
                  ...prev,
                  exitPrice: candle.close,
                  exitTime: Date.now(),
                }
              : null
          );
        }
      );

      // Cleanup on unmount
      return () => {
        disconnect();
      };
    } else {
      // No trade data provided, redirect back
      navigate('/replay');
    }
  }, [location, navigate]);

  // Create candle from trade data
  const currentCandle = liveTrade ? {
    time: Date.now(),
    open: liveTrade.entryPrice,
    high: Math.max(liveTrade.entryPrice, liveTrade.exitPrice),
    low: Math.min(liveTrade.entryPrice, liveTrade.exitPrice),
    close: liveTrade.exitPrice,
    volume: 0,
  } : null;

  const stats = useTradeStats(liveTrade, currentCandle);

  const handleStop = () => {
    navigate('/replay');
  };

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
      {/* Header with live status and stop button */}
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
          {liveTrade && (
            <>
              <h1
                style={{
                  fontSize: '24px',
                  fontWeight: '700',
                  color: '#F5C76D',
                  margin: 0,
                }}
              >
                🔴 {liveTrade.symbol} • {liveTrade.side}
              </h1>
              <div style={{ fontSize: '12px', color: '#C2B280' }}>
                {liveCandles.length} candles • Live
              </div>
              <ConnectionStatus
                isConnected={streamStatus.isConnected}
                symbol={streamStatus.symbol || liveTrade.symbol}
                lastUpdate={streamStatus.lastUpdate}
              />
            </>
          )}
        </div>

        <button
          onClick={handleStop}
          style={{
            padding: '8px 16px',
            backgroundColor: 'rgba(239, 68, 68, 0.2)',
            border: '1px solid rgba(239, 68, 68, 0.4)',
            color: '#ef4444',
            borderRadius: '8px',
            cursor: 'pointer',
            fontSize: '12px',
            fontWeight: '600',
            transition: 'all 200ms ease',
          }}
          onMouseEnter={(e) => {
            (e.currentTarget as HTMLButtonElement).style.backgroundColor = 'rgba(239, 68, 68, 0.3)';
          }}
          onMouseLeave={(e) => {
            (e.currentTarget as HTMLButtonElement).style.backgroundColor = 'rgba(239, 68, 68, 0.2)';
          }}
        >
          ⏹ Stop Trade
        </button>
      </div>

      {/* Main content - Chart and stats */}
      {!liveTrade ? (
        <div
          style={{
            flex: 1,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            color: '#C2B280',
            fontSize: '16px',
          }}
        >
          Loading live trade...
        </div>
      ) : (
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
          {/* Chart - takes more space */}
          <div
            style={{
              flex: 1.5,
              overflow: 'hidden',
              minHeight: 0,
              borderRadius: '12px',
              backgroundColor: '#1a1a1a',
              border: '1px solid rgba(212, 165, 69, 0.15)',
            }}
          >
            <TradingViewChart
              symbol={liveTrade.symbol}
              trade={liveTrade}
            />
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
              trade={liveTrade}
              stats={stats}
              isLiveMode={true}
            />
          </div>
        </div>
      )}
    </div>
  );
}
