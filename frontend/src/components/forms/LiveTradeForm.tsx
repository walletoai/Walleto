/**
 * LiveTradeForm Component
 * Form for entering live trade details
 */

import React, { useState, memo } from 'react';
import { useModals } from '../modals/CustomModals';

interface LiveTradeFormProps {
  onSubmit: (trade: {
    symbol: string;
    side: 'LONG' | 'SHORT';
    entryPrice: number;
    size: number;
    entryTime?: number;
    leverage?: number;
    stopLoss?: number;
    takeProfit?: number;
    fees?: number;
  }) => void;
  isLoading?: boolean;
}

const LiveTradeFormComponent: React.FC<LiveTradeFormProps> = ({ onSubmit, isLoading = false }) => {
  const { alert } = useModals();
  const [symbol, setSymbol] = useState('BTCUSDT');
  const [side, setSide] = useState<'LONG' | 'SHORT'>('LONG');
  const [entryPrice, setEntryPrice] = useState('');
  const [size, setSize] = useState('');
  const [entryTime, setEntryTime] = useState(new Date().toISOString().slice(0, 16)); // Default to now
  const [leverage, setLeverage] = useState('1');
  const [stopLoss, setStopLoss] = useState('');
  const [takeProfit, setTakeProfit] = useState('');
  const [fees, setFees] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!entryPrice || !size) {
      await alert({ message: 'Please fill in required fields: Entry Price and Size', type: 'warning' });
      return;
    }

    onSubmit({
      symbol,
      side,
      entryPrice: parseFloat(entryPrice),
      size: parseFloat(size),
      entryTime: new Date(entryTime).getTime(),
      leverage: leverage ? parseFloat(leverage) : 1,
      stopLoss: stopLoss ? parseFloat(stopLoss) : undefined,
      takeProfit: takeProfit ? parseFloat(takeProfit) : undefined,
      fees: fees ? parseFloat(fees) : undefined,
    });

    // Reset form
    setEntryPrice('');
    setSize('');
    setStopLoss('');
    setTakeProfit('');
    setFees('');
  };

  const inputStyle = {
    width: '100%',
    padding: '8px 12px',
    backgroundColor: 'rgba(37, 30, 23, 0.6)',
    color: '#C2B280',
    border: '1px solid rgba(212, 165, 69, 0.2)',
    borderRadius: '6px',
    fontSize: '12px',
    fontFamily: 'monospace',
    transition: 'all 200ms ease',
  };

  const labelStyle = {
    fontSize: '10px',
    color: '#8B7355',
    fontWeight: '600',
    textTransform: 'uppercase' as const,
    marginBottom: '4px',
    display: 'block',
  };

  return (
    <div
      style={{
        backgroundColor: 'rgba(37, 30, 23, 0.6)',
        border: '1px solid rgba(212, 165, 69, 0.15)',
        borderRadius: '12px',
        padding: '16px',
        display: 'flex',
        flexDirection: 'column',
        gap: '12px',
      }}
    >
      <div style={{ fontSize: '12px', color: '#F5C76D', fontWeight: '600' }}>🔴 Live Trade Entry</div>

      <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
        {/* Symbol and Side Row */}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
          <div>
            <label style={labelStyle}>Symbol</label>
            <input
              type="text"
              value={symbol}
              onChange={(e) => setSymbol(e.target.value.toUpperCase())}
              placeholder="BTCUSDT"
              style={inputStyle as any}
              disabled={isLoading}
            />
          </div>
          <div>
            <label style={labelStyle}>Side</label>
            <div style={{ display: 'flex', gap: '6px' }}>
              <button
                type="button"
                onClick={() => setSide('LONG')}
                disabled={isLoading}
                style={{
                  flex: 1,
                  padding: '8px',
                  backgroundColor: side === 'LONG' ? 'rgba(16, 185, 129, 0.2)' : 'rgba(37, 30, 23, 0.6)',
                  color: side === 'LONG' ? '#10b981' : '#8B7355',
                  border: `1px solid ${side === 'LONG' ? 'rgba(16, 185, 129, 0.4)' : 'rgba(212, 165, 69, 0.2)'}`,
                  borderRadius: '6px',
                  cursor: isLoading ? 'not-allowed' : 'pointer',
                  fontSize: '12px',
                  fontWeight: '600',
                  transition: 'all 200ms ease',
                }}
                onMouseEnter={(e) => {
                  if (side !== 'LONG' && !isLoading) {
                    (e.currentTarget as HTMLButtonElement).style.backgroundColor = 'rgba(37, 30, 23, 0.7)';
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
                  padding: '8px',
                  backgroundColor: side === 'SHORT' ? 'rgba(239, 68, 68, 0.2)' : 'rgba(37, 30, 23, 0.6)',
                  color: side === 'SHORT' ? '#ef4444' : '#8B7355',
                  border: `1px solid ${side === 'SHORT' ? 'rgba(239, 68, 68, 0.4)' : 'rgba(212, 165, 69, 0.2)'}`,
                  borderRadius: '6px',
                  cursor: isLoading ? 'not-allowed' : 'pointer',
                  fontSize: '12px',
                  fontWeight: '600',
                  transition: 'all 200ms ease',
                }}
                onMouseEnter={(e) => {
                  if (side !== 'SHORT' && !isLoading) {
                    (e.currentTarget as HTMLButtonElement).style.backgroundColor = 'rgba(37, 30, 23, 0.7)';
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

        {/* Entry Price and Size Row */}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
          <div>
            <label style={labelStyle}>Entry Price *</label>
            <input
              type="number"
              value={entryPrice}
              onChange={(e) => setEntryPrice(e.target.value)}
              placeholder="45000"
              step="0.01"
              style={inputStyle as any}
              disabled={isLoading}
              required
            />
          </div>
          <div>
            <label style={labelStyle}>Size *</label>
            <input
              type="number"
              value={size}
              onChange={(e) => setSize(e.target.value)}
              placeholder="0.5"
              step="0.001"
              style={inputStyle as any}
              disabled={isLoading}
              required
            />
          </div>
        </div>

        {/* Entry Time Row */}
        <div>
          <label style={labelStyle}>Entry Time</label>
          <input
            type="datetime-local"
            value={entryTime}
            onChange={(e) => setEntryTime(e.target.value)}
            style={inputStyle as any}
            disabled={isLoading}
          />
        </div>

        {/* Leverage Row */}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
          <div>
            <label style={labelStyle}>Leverage</label>
            <div style={{ display: 'flex', gap: '6px' }}>
              {['1', '2', '5', '10'].map((lev) => (
                <button
                  key={lev}
                  type="button"
                  onClick={() => setLeverage(lev)}
                  disabled={isLoading}
                  style={{
                    flex: 1,
                    padding: '6px',
                    backgroundColor:
                      leverage === lev ? 'rgba(245, 199, 109, 0.2)' : 'rgba(37, 30, 23, 0.6)',
                    color: leverage === lev ? '#F5C76D' : '#8B7355',
                    border: `1px solid ${leverage === lev ? 'rgba(245, 199, 109, 0.3)' : 'rgba(212, 165, 69, 0.2)'}`,
                    borderRadius: '4px',
                    cursor: isLoading ? 'not-allowed' : 'pointer',
                    fontSize: '11px',
                    fontWeight: '600',
                    transition: 'all 150ms ease',
                  }}
                >
                  {lev}x
                </button>
              ))}
            </div>
          </div>
          <div></div>
        </div>

        {/* SL/TP Row */}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
          <div>
            <label style={labelStyle}>Stop Loss (Optional)</label>
            <input
              type="number"
              value={stopLoss}
              onChange={(e) => setStopLoss(e.target.value)}
              placeholder="44000"
              step="0.01"
              style={inputStyle as any}
              disabled={isLoading}
            />
          </div>
          <div>
            <label style={labelStyle}>Take Profit (Optional)</label>
            <input
              type="number"
              value={takeProfit}
              onChange={(e) => setTakeProfit(e.target.value)}
              placeholder="46000"
              step="0.01"
              style={inputStyle as any}
              disabled={isLoading}
            />
          </div>
        </div>

        {/* Fees Row */}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
          <div>
            <label style={labelStyle}>Fees (Optional)</label>
            <input
              type="number"
              value={fees}
              onChange={(e) => setFees(e.target.value)}
              placeholder="0"
              step="0.01"
              style={inputStyle as any}
              disabled={isLoading}
            />
          </div>
          <div></div>
        </div>

        {/* Submit Button */}
        <button
          type="submit"
          disabled={isLoading}
          style={{
            padding: '10px 16px',
            backgroundColor: isLoading ? 'rgba(245, 199, 109, 0.1)' : 'rgba(245, 199, 109, 0.2)',
            border: `1px solid ${isLoading ? 'rgba(245, 199, 109, 0.2)' : 'rgba(245, 199, 109, 0.4)'}`,
            color: '#F5C76D',
            borderRadius: '8px',
            cursor: isLoading ? 'not-allowed' : 'pointer',
            fontSize: '12px',
            fontWeight: '600',
            transition: 'all 200ms ease',
            opacity: isLoading ? 0.6 : 1,
          }}
          onMouseEnter={(e) => {
            if (!isLoading) {
              (e.currentTarget as HTMLButtonElement).style.backgroundColor = 'rgba(245, 199, 109, 0.3)';
              (e.currentTarget as HTMLButtonElement).style.boxShadow = '0 0 12px rgba(245, 199, 109, 0.2)';
            }
          }}
          onMouseLeave={(e) => {
            (e.currentTarget as HTMLButtonElement).style.backgroundColor = 'rgba(245, 199, 109, 0.2)';
            (e.currentTarget as HTMLButtonElement).style.boxShadow = 'none';
          }}
        >
          {isLoading ? '⏳ Starting...' : '▶ Start Live Trade'}
        </button>
      </form>
    </div>
  );
};

export const LiveTradeForm = memo(LiveTradeFormComponent);
