/**
 * LiveTradeEntryPage
 * Full-screen immersive interface for entering and starting a live trade
 */

import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import type { Trade } from '../hooks/useTradeStats';
import type { Interval } from '../lib/binanceApi';
import { connectBinanceStream } from '../lib/binanceApi';

export default function LiveTradeEntryPage() {
  const navigate = useNavigate();
  const [symbol, setSymbol] = useState('BTCUSDT');
  const [side, setSide] = useState<'LONG' | 'SHORT'>('LONG');
  const [entryPrice, setEntryPrice] = useState('');
  const [size, setSize] = useState('');
  // Initialize with current time in EST
  const getESTDateTime = () => {
    const now = new Date();
    const estTime = new Date(now.toLocaleString('en-US', { timeZone: 'America/New_York' }));
    const year = estTime.getFullYear();
    const month = String(estTime.getMonth() + 1).padStart(2, '0');
    const day = String(estTime.getDate()).padStart(2, '0');
    const hours = String(estTime.getHours()).padStart(2, '0');
    const minutes = String(estTime.getMinutes()).padStart(2, '0');
    return `${year}-${month}-${day}T${hours}:${minutes}`;
  };

  const [entryTime, setEntryTime] = useState(getESTDateTime());
  const [leverage, setLeverage] = useState('1');
  const [stopLoss, setStopLoss] = useState('');
  const [takeProfit, setTakeProfit] = useState('');
  const [fees, setFees] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Reusable input styling
  const getInputStyle = () => ({
    width: '100%',
    boxSizing: 'border-box' as const,
    padding: '14px 18px',
    backgroundColor: 'rgba(37, 30, 23, 0.7)',
    color: '#F5C76D',
    border: '1.5px solid rgba(212, 165, 69, 0.4)',
    borderRadius: '12px',
    fontSize: '15px',
    fontFamily: 'monospace',
    fontWeight: '500',
    outline: 'none',
    transition: 'all 200ms ease',
  } as const);

  const handleInputFocus = (e: React.FocusEvent<HTMLInputElement>) => {
    e.currentTarget.style.backgroundColor = 'rgba(37, 30, 23, 0.9)';
    e.currentTarget.style.borderColor = 'rgba(245, 199, 109, 0.6)';
    e.currentTarget.style.boxShadow = '0 0 12px rgba(245, 199, 109, 0.15)';
  };

  const handleInputBlur = (e: React.FocusEvent<HTMLInputElement>) => {
    e.currentTarget.style.backgroundColor = 'rgba(37, 30, 23, 0.7)';
    e.currentTarget.style.borderColor = 'rgba(212, 165, 69, 0.4)';
    e.currentTarget.style.boxShadow = 'none';
  };

  const formatSymbolForBinance = (sym: string): string => {
    if (!sym) return 'BTCUSDT';
    let cleanSymbol = sym
      .replace(/\.P$/, '')
      .replace(/\.USD$/, '')
      .toUpperCase();
    if (!cleanSymbol.endsWith('USDT') && !cleanSymbol.endsWith('BUSD') && !cleanSymbol.endsWith('USDC')) {
      cleanSymbol = `${cleanSymbol}USDT`;
    }
    return cleanSymbol;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!entryPrice || !size) {
      setError('Please fill in Entry Price and Size');
      return;
    }

    setIsLoading(true);
    setError(null);

    try {
      const binanceSymbol = formatSymbolForBinance(symbol);
      const tradeEntryTime = new Date(entryTime).getTime();

      const newLiveTrade: Trade = {
        id: `live_${Date.now()}`,
        symbol: binanceSymbol,
        side,
        entryPrice: parseFloat(entryPrice),
        exitPrice: parseFloat(entryPrice),
        entryTime: tradeEntryTime,
        exitTime: Date.now(),
        size: parseFloat(size),
        leverage: parseFloat(leverage) || 1,
        fees: fees ? parseFloat(fees) : 0,
        stopLoss: stopLoss ? parseFloat(stopLoss) : undefined,
        takeProfit: takeProfit ? parseFloat(takeProfit) : undefined,
      };

      // Start WebSocket connection with 1h interval
      const disconnect = connectBinanceStream(
        [binanceSymbol],
        '1h',
        (symbol, candle) => {
          // Will be handled in LiveTradeDetailPage
        }
      );

      // Store disconnect function for cleanup
      (window as any).__liveStreamDisconnect = disconnect;

      // Navigate to detail page
      navigate('/replay/live', { state: { trade: newLiveTrade, interval: '1h' } });
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to start live trade');
      setIsLoading(false);
    }
  };

  return (
    <div
      style={{
        display: 'flex',
        flexDirection: 'column',
        height: '100vh',
        backgroundColor: '#0f0a07',
        overflow: 'hidden',
      }}
    >
      {/* Animated background elements */}
      <div
        style={{
          position: 'absolute',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          overflow: 'hidden',
          zIndex: 0,
          pointerEvents: 'none',
        }}
      >
        {/* Gradient orb top-right */}
        <div
          style={{
            position: 'absolute',
            top: '-20%',
            right: '-10%',
            width: '600px',
            height: '600px',
            borderRadius: '50%',
            background: 'radial-gradient(circle, rgba(245, 199, 109, 0.15) 0%, transparent 70%)',
            filter: 'blur(40px)',
          }}
        />
        {/* Gradient orb bottom-left */}
        <div
          style={{
            position: 'absolute',
            bottom: '-10%',
            left: '-5%',
            width: '500px',
            height: '500px',
            borderRadius: '50%',
            background: 'radial-gradient(circle, rgba(16, 185, 129, 0.1) 0%, transparent 70%)',
            filter: 'blur(40px)',
          }}
        />
      </div>

      {/* Content */}
      <div
        style={{
          position: 'relative',
          zIndex: 1,
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          height: '100%',
          padding: '40px',
          gap: '40px',
        }}
      >
        {/* Header */}
        <div
          style={{
            textAlign: 'center',
            maxWidth: '600px',
          }}
        >
          <div
            style={{
              fontSize: '48px',
              fontWeight: '800',
              background: 'linear-gradient(135deg, #F5C76D 0%, #10b981 100%)',
              WebkitBackgroundClip: 'text',
              WebkitTextFillColor: 'transparent',
              marginBottom: '12px',
            }}
          >
            🔴 Live Trade
          </div>
          <div
            style={{
              fontSize: '16px',
              color: '#C2B280',
              fontWeight: '300',
              letterSpacing: '0.5px',
            }}
          >
            Enter your trade details and start monitoring in real-time
          </div>
        </div>

        {/* Form Container */}
        <form
          onSubmit={handleSubmit}
          style={{
            width: '100%',
            maxWidth: '700px',
            display: 'flex',
            flexDirection: 'column',
            gap: '24px',
            backgroundColor: 'rgba(37, 30, 23, 0.4)',
            border: '1px solid rgba(212, 165, 69, 0.2)',
            borderRadius: '20px',
            padding: '36px',
            backdropFilter: 'blur(10px)',
          }}
        >
          {error && (
            <div
              style={{
                padding: '16px',
                backgroundColor: 'rgba(239, 68, 68, 0.1)',
                border: '1px solid rgba(239, 68, 68, 0.3)',
                borderRadius: '12px',
                color: '#ef4444',
                fontSize: '14px',
              }}
            >
              ⚠ {error}
            </div>
          )}

          {/* Symbol and Side */}
          <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr', gap: '18px' }}>
            <div>
              <label style={{ display: 'block', fontSize: '11px', color: '#8B7355', fontWeight: '700', marginBottom: '8px', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                Symbol
              </label>
              <input
                type="text"
                value={symbol}
                onChange={(e) => setSymbol(e.target.value.toUpperCase())}
                placeholder="BTCUSDT"
                style={{ ...getInputStyle(), padding: '12px 14px', fontSize: '14px' }}
                onFocus={handleInputFocus}
                onBlur={handleInputBlur}
                disabled={isLoading}
              />
            </div>
            <div>
              <label style={{ display: 'block', fontSize: '11px', color: '#8B7355', fontWeight: '700', marginBottom: '8px', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                Side
              </label>
              <div style={{ display: 'flex', gap: '6px' }}>
                <button
                  type="button"
                  onClick={() => setSide('LONG')}
                  disabled={isLoading}
                  style={{
                    flex: 1,
                    padding: '12px',
                    backgroundColor: side === 'LONG' ? 'rgba(16, 185, 129, 0.2)' : 'rgba(37, 30, 23, 0.6)',
                    color: side === 'LONG' ? '#10b981' : '#8B7355',
                    border: `2px solid ${side === 'LONG' ? 'rgba(16, 185, 129, 0.5)' : 'rgba(212, 165, 69, 0.2)'}`,
                    borderRadius: '10px',
                    cursor: isLoading ? 'not-allowed' : 'pointer',
                    fontSize: '14px',
                    fontWeight: '600',
                    transition: 'all 200ms ease',
                  }}
                  onMouseEnter={(e) => {
                    if (side !== 'LONG' && !isLoading) {
                      (e.currentTarget as HTMLButtonElement).style.backgroundColor = 'rgba(16, 185, 129, 0.1)';
                    }
                  }}
                  onMouseLeave={(e) => {
                    if (side !== 'LONG') {
                      (e.currentTarget as HTMLButtonElement).style.backgroundColor = 'rgba(37, 30, 23, 0.6)';
                    }
                  }}
                >
                  📈 LONG
                </button>
                <button
                  type="button"
                  onClick={() => setSide('SHORT')}
                  disabled={isLoading}
                  style={{
                    flex: 1,
                    padding: '12px',
                    backgroundColor: side === 'SHORT' ? 'rgba(239, 68, 68, 0.2)' : 'rgba(37, 30, 23, 0.6)',
                    color: side === 'SHORT' ? '#ef4444' : '#8B7355',
                    border: `2px solid ${side === 'SHORT' ? 'rgba(239, 68, 68, 0.5)' : 'rgba(212, 165, 69, 0.2)'}`,
                    borderRadius: '10px',
                    cursor: isLoading ? 'not-allowed' : 'pointer',
                    fontSize: '14px',
                    fontWeight: '600',
                    transition: 'all 200ms ease',
                  }}
                  onMouseEnter={(e) => {
                    if (side !== 'SHORT' && !isLoading) {
                      (e.currentTarget as HTMLButtonElement).style.backgroundColor = 'rgba(239, 68, 68, 0.1)';
                    }
                  }}
                  onMouseLeave={(e) => {
                    if (side !== 'SHORT') {
                      (e.currentTarget as HTMLButtonElement).style.backgroundColor = 'rgba(37, 30, 23, 0.6)';
                    }
                  }}
                >
                  📉 SHORT
                </button>
              </div>
            </div>
          </div>

          {/* Entry Price and Size */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '18px', minWidth: 0 }}>
            <div>
              <label style={{ display: 'block', fontSize: '11px', color: '#8B7355', fontWeight: '700', marginBottom: '8px', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                Entry Price *
              </label>
              <input
                type="number"
                value={entryPrice}
                onChange={(e) => setEntryPrice(e.target.value)}
                placeholder="90000"
                step="0.01"
                style={{ ...getInputStyle(), padding: '12px 14px', fontSize: '14px' }}
                onFocus={handleInputFocus}
                onBlur={handleInputBlur}
                disabled={isLoading}
                required
              />
            </div>
            <div>
              <label style={{ display: 'block', fontSize: '11px', color: '#8B7355', fontWeight: '700', marginBottom: '8px', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                Size *
              </label>
              <input
                type="number"
                value={size}
                onChange={(e) => setSize(e.target.value)}
                placeholder="0.5"
                step="0.001"
                style={{ ...getInputStyle(), padding: '12px 14px', fontSize: '14px' }}
                onFocus={handleInputFocus}
                onBlur={handleInputBlur}
                disabled={isLoading}
                required
              />
            </div>
          </div>

          {/* Entry Time and Leverage */}
          <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr', gap: '18px' }}>
            <div>
              <label style={{ display: 'block', fontSize: '11px', color: '#8B7355', fontWeight: '700', marginBottom: '8px', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                Entry Time (EST)
              </label>
              <input
                type="datetime-local"
                value={entryTime}
                onChange={(e) => setEntryTime(e.target.value)}
                style={{ ...getInputStyle(), padding: '12px 14px', fontSize: '14px' }}
                onFocus={handleInputFocus}
                onBlur={handleInputBlur}
                disabled={isLoading}
              />
            </div>

            <div>
              <label style={{ display: 'block', fontSize: '11px', color: '#8B7355', fontWeight: '700', marginBottom: '8px', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                Leverage
              </label>
              <input
                type="number"
                value={leverage}
                onChange={(e) => {
                  const val = e.target.value;
                  // Only allow whole numbers
                  if (val === '' || /^\d+$/.test(val)) {
                    setLeverage(val === '' ? '1' : val);
                  }
                }}
                placeholder="1"
                min="1"
                step="1"
                style={{ ...getInputStyle(), padding: '12px 14px', fontSize: '14px' }}
                onFocus={handleInputFocus}
                onBlur={handleInputBlur}
                disabled={isLoading}
              />
            </div>
          </div>

          {/* SL/TP/Fees */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '14px' }}>
            <div>
              <label style={{ display: 'block', fontSize: '11px', color: '#8B7355', fontWeight: '700', marginBottom: '8px', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                Stop Loss
              </label>
              <input
                type="number"
                value={stopLoss}
                onChange={(e) => setStopLoss(e.target.value)}
                placeholder="Optional"
                step="0.01"
                style={{ ...getInputStyle(), padding: '12px 14px', fontSize: '14px' }}
                onFocus={handleInputFocus}
                onBlur={handleInputBlur}
                disabled={isLoading}
              />
            </div>
            <div>
              <label style={{ display: 'block', fontSize: '11px', color: '#8B7355', fontWeight: '700', marginBottom: '8px', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                Take Profit
              </label>
              <input
                type="number"
                value={takeProfit}
                onChange={(e) => setTakeProfit(e.target.value)}
                placeholder="Optional"
                step="0.01"
                style={{ ...getInputStyle(), padding: '12px 14px', fontSize: '14px' }}
                onFocus={handleInputFocus}
                onBlur={handleInputBlur}
                disabled={isLoading}
              />
            </div>
            <div>
              <label style={{ display: 'block', fontSize: '11px', color: '#8B7355', fontWeight: '700', marginBottom: '8px', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                Fees
              </label>
              <input
                type="number"
                value={fees}
                onChange={(e) => setFees(e.target.value)}
                placeholder="Optional"
                step="0.01"
                style={{ ...getInputStyle(), padding: '12px 14px', fontSize: '14px' }}
                onFocus={handleInputFocus}
                onBlur={handleInputBlur}
                disabled={isLoading}
              />
            </div>
          </div>

          {/* Submit Button */}
          <button
            type="submit"
            disabled={isLoading}
            style={{
              padding: '16px',
              backgroundColor: isLoading ? 'rgba(245, 199, 109, 0.1)' : 'rgba(245, 199, 109, 0.2)',
              border: `2px solid ${isLoading ? 'rgba(245, 199, 109, 0.2)' : 'rgba(245, 199, 109, 0.5)'}`,
              color: '#F5C76D',
              borderRadius: '12px',
              cursor: isLoading ? 'not-allowed' : 'pointer',
              fontSize: '16px',
              fontWeight: '700',
              transition: 'all 200ms ease',
              opacity: isLoading ? 0.6 : 1,
              letterSpacing: '0.5px',
              textTransform: 'uppercase',
            }}
            onMouseEnter={(e) => {
              if (!isLoading) {
                (e.currentTarget as HTMLButtonElement).style.backgroundColor = 'rgba(245, 199, 109, 0.3)';
                (e.currentTarget as HTMLButtonElement).style.boxShadow = '0 0 20px rgba(245, 199, 109, 0.3)';
              }
            }}
            onMouseLeave={(e) => {
              (e.currentTarget as HTMLButtonElement).style.backgroundColor = 'rgba(245, 199, 109, 0.2)';
              (e.currentTarget as HTMLButtonElement).style.boxShadow = 'none';
            }}
          >
            {isLoading ? '⏳ Starting Live Trade...' : '▶ START LIVE TRADE'}
          </button>

          {/* Back Button */}
          <button
            type="button"
            onClick={() => navigate('/replay')}
            disabled={isLoading}
            style={{
              padding: '12px',
              backgroundColor: 'transparent',
              border: '1px solid rgba(212, 165, 69, 0.3)',
              color: '#C2B280',
              borderRadius: '10px',
              cursor: isLoading ? 'not-allowed' : 'pointer',
              fontSize: '14px',
              fontWeight: '600',
              transition: 'all 200ms ease',
              opacity: isLoading ? 0.5 : 1,
            }}
          >
            ← Back to Replay
          </button>
        </form>
      </div>
    </div>
  );
}
