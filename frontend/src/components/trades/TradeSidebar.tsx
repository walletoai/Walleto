/**
 * TradeSidebar Component
 * Trade selection and filtering sidebar
 */

import React, { useState, useMemo, memo } from 'react';
import { useNavigate } from 'react-router-dom';
import type { Trade } from '../../hooks/useTradeStats';

interface TradeSidebarProps {
  trades: Trade[];
  selectedTrade: Trade | null;
  onSelectTrade: (trade: Trade) => void;
  isLiveMode: boolean;
}

type TimeFilter = 'all' | '7d' | '30d';
type WinLossFilter = 'all' | 'wins' | 'losses';
type SortBy = 'date' | 'pnl' | 'return';

const TradeSidebarComponent: React.FC<TradeSidebarProps> = ({
  trades,
  selectedTrade,
  onSelectTrade,
  isLiveMode,
}) => {
  const navigate = useNavigate();
  const [searchSymbol, setSearchSymbol] = useState('');
  const [timeFilter, setTimeFilter] = useState<TimeFilter>('all');
  const [winLossFilter, setWinLossFilter] = useState<WinLossFilter>('all');
  const [sortBy, setSortBy] = useState<SortBy>('date');

  // Filter and sort trades
  const filteredTrades = useMemo(() => {
    let result = [...trades];
    const now = Date.now();

    // Time filter
    if (timeFilter === '7d') {
      const sevenDaysAgo = now - 7 * 24 * 60 * 60 * 1000;
      result = result.filter((t) => t.entryTime >= sevenDaysAgo);
    } else if (timeFilter === '30d') {
      const thirtyDaysAgo = now - 30 * 24 * 60 * 60 * 1000;
      result = result.filter((t) => t.entryTime >= thirtyDaysAgo);
    }

    // Symbol filter
    if (searchSymbol.trim()) {
      result = result.filter((t) => t.symbol.toUpperCase().includes(searchSymbol.toUpperCase()));
    }

    // Win/Loss filter - with null safety
    const calcPnl = (t: Trade) => {
      const entry = t.entryPrice || 0;
      const exit = t.exitPrice || entry;
      const size = t.size || 1;
      return (exit - entry) * size * (t.side === 'LONG' ? 1 : -1) - (t.fees || 0);
    };
    if (winLossFilter === 'wins') {
      result = result.filter((t) => calcPnl(t) > 0);
    } else if (winLossFilter === 'losses') {
      result = result.filter((t) => calcPnl(t) <= 0);
    }

    // Sort
    if (sortBy === 'date') {
      result.sort((a, b) => (b.entryTime || 0) - (a.entryTime || 0));
    } else if (sortBy === 'pnl') {
      result.sort((a, b) => calcPnl(b) - calcPnl(a));
    } else if (sortBy === 'return') {
      const returnPercent = (t: Trade) => {
        const entry = t.entryPrice || 1;
        const size = t.size || 1;
        return ((calcPnl(t) / (entry * size)) * 100);
      };
      result.sort((a, b) => returnPercent(b) - returnPercent(a));
    }

    return result;
  }, [trades, searchSymbol, timeFilter, winLossFilter, sortBy]);

  return (
    <div
      style={{
        display: 'flex',
        flexDirection: 'column',
        height: '100%',
        width: '100%',
        backgroundColor: 'rgba(29, 26, 22, 0.8)',
        border: 'none',
        borderRadius: '0',
        overflow: 'hidden',
      }}
    >
      {/* Header */}
      <div
        style={{
          padding: '16px 20px',
          borderBottom: '1px solid rgba(212, 165, 69, 0.1)',
          backgroundColor: 'transparent',
        }}
      >
        <div
          style={{
            fontSize: '13px',
            color: '#F5C76D',
            fontWeight: '700',
            letterSpacing: '0.3px',
            marginBottom: '6px',
          }}
        >
          {isLiveMode ? '🔴 Live Trades' : '📊 Trade History'}
        </div>
        <div
          style={{
            fontSize: '11px',
            color: '#8B7355',
            fontWeight: '500',
          }}
        >
          {filteredTrades.length} trades
        </div>
      </div>

      {/* Filters */}
      <div
        style={{
          padding: '14px 20px',
          borderBottom: '1px solid rgba(212, 165, 69, 0.1)',
          display: 'flex',
          flexDirection: 'column',
          gap: '10px',
          backgroundColor: 'rgba(37, 30, 23, 0.2)',
        }}
      >
        {/* Symbol Search */}
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            backgroundColor: 'rgba(37, 30, 23, 0.8)',
            border: '1px solid rgba(212, 165, 69, 0.25)',
            borderRadius: '8px',
            paddingLeft: '10px',
            transition: 'all 150ms ease',
          }}
          onMouseEnter={(e) => {
            (e.currentTarget as HTMLDivElement).style.backgroundColor = 'rgba(37, 30, 23, 0.95)';
            (e.currentTarget as HTMLDivElement).style.borderColor = 'rgba(212, 165, 69, 0.35)';
          }}
          onMouseLeave={(e) => {
            (e.currentTarget as HTMLDivElement).style.backgroundColor = 'rgba(37, 30, 23, 0.8)';
            (e.currentTarget as HTMLDivElement).style.borderColor = 'rgba(212, 165, 69, 0.25)';
          }}
        >
          <svg
            xmlns="http://www.w3.org/2000/svg"
            style={{ width: '15px', height: '15px', color: '#C2B280', marginRight: '4px', flexShrink: 0 }}
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"
            />
          </svg>
          <input
            type="text"
            placeholder="Search symbol..."
            value={searchSymbol}
            onChange={(e) => setSearchSymbol(e.target.value)}
            style={{
              flex: 1,
              backgroundColor: 'transparent',
              border: 'none',
              padding: '8px 8px',
              color: '#F5C76D',
              fontSize: '12px',
              outline: 'none',
              fontWeight: '500',
            }}
          />
        </div>

        {/* Filter Row 1: Time + Win/Loss */}
        <div style={{ display: 'flex', gap: '8px' }}>
          <select
            value={timeFilter}
            onChange={(e) => setTimeFilter(e.target.value as TimeFilter)}
            style={{
              flex: 1,
              padding: '8px 10px',
              backgroundColor: 'rgba(37, 30, 23, 0.8)',
              color: '#F5C76D',
              border: '1px solid rgba(212, 165, 69, 0.25)',
              borderRadius: '8px',
              fontSize: '11px',
              fontWeight: '500',
              cursor: 'pointer',
              transition: 'all 150ms ease',
            }}
            onMouseEnter={(e) => {
              (e.currentTarget as HTMLSelectElement).style.backgroundColor = 'rgba(37, 30, 23, 0.95)';
              (e.currentTarget as HTMLSelectElement).style.borderColor = 'rgba(212, 165, 69, 0.35)';
            }}
            onMouseLeave={(e) => {
              (e.currentTarget as HTMLSelectElement).style.backgroundColor = 'rgba(37, 30, 23, 0.8)';
              (e.currentTarget as HTMLSelectElement).style.borderColor = 'rgba(212, 165, 69, 0.25)';
            }}
          >
            <option value="all">All Time</option>
            <option value="7d">Last 7 Days</option>
            <option value="30d">Last 30 Days</option>
          </select>

          <select
            value={winLossFilter}
            onChange={(e) => setWinLossFilter(e.target.value as WinLossFilter)}
            style={{
              flex: 1,
              padding: '8px 10px',
              backgroundColor: 'rgba(37, 30, 23, 0.8)',
              color: '#F5C76D',
              border: '1px solid rgba(212, 165, 69, 0.25)',
              borderRadius: '8px',
              fontSize: '11px',
              fontWeight: '500',
              cursor: 'pointer',
              transition: 'all 150ms ease',
            }}
            onMouseEnter={(e) => {
              (e.currentTarget as HTMLSelectElement).style.backgroundColor = 'rgba(37, 30, 23, 0.95)';
              (e.currentTarget as HTMLSelectElement).style.borderColor = 'rgba(212, 165, 69, 0.35)';
            }}
            onMouseLeave={(e) => {
              (e.currentTarget as HTMLSelectElement).style.backgroundColor = 'rgba(37, 30, 23, 0.8)';
              (e.currentTarget as HTMLSelectElement).style.borderColor = 'rgba(212, 165, 69, 0.25)';
            }}
          >
            <option value="all">All Results</option>
            <option value="wins">Wins Only</option>
            <option value="losses">Losses Only</option>
          </select>
        </div>

        {/* Sort */}
        <select
          value={sortBy}
          onChange={(e) => setSortBy(e.target.value as SortBy)}
          style={{
            width: '100%',
            padding: '8px 10px',
            backgroundColor: 'rgba(37, 30, 23, 0.8)',
            color: '#F5C76D',
            border: '1px solid rgba(212, 165, 69, 0.25)',
            borderRadius: '8px',
            fontSize: '11px',
            fontWeight: '500',
            cursor: 'pointer',
            transition: 'all 150ms ease',
          }}
          onMouseEnter={(e) => {
            (e.currentTarget as HTMLSelectElement).style.backgroundColor = 'rgba(37, 30, 23, 0.95)';
            (e.currentTarget as HTMLSelectElement).style.borderColor = 'rgba(212, 165, 69, 0.35)';
          }}
          onMouseLeave={(e) => {
            (e.currentTarget as HTMLSelectElement).style.backgroundColor = 'rgba(37, 30, 23, 0.8)';
            (e.currentTarget as HTMLSelectElement).style.borderColor = 'rgba(212, 165, 69, 0.25)';
          }}
        >
          <option value="date">Sort by Date</option>
          <option value="pnl">Sort by PnL</option>
          <option value="return">Sort by Return %</option>
        </select>
      </div>

      {/* Trade List */}
      <div
        style={{
          flex: 1,
          overflowY: 'auto',
          padding: '14px 12px',
          display: 'flex',
          flexDirection: 'column',
          gap: '12px',
          backgroundColor: 'rgba(15, 10, 7, 0.3)',
        }}
      >
        {filteredTrades.length === 0 ? (
          <div
            style={{
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              justifyContent: 'center',
              height: '200px',
              color: '#666',
              fontSize: '12px',
            }}
          >
            <div style={{ fontSize: '24px', marginBottom: '8px' }}>📭</div>
            <div>No trades found</div>
          </div>
        ) : (
          filteredTrades.map((trade) => {
            const entryPrice = trade.entryPrice || 0;
            const exitPrice = trade.exitPrice || entryPrice;
            const size = trade.size || 1;
            const pnl = (exitPrice - entryPrice) * size * (trade.side === 'LONG' ? 1 : -1) - (trade.fees || 0);
            const isSelected = selectedTrade?.id === trade.id;

            return (
              <div
                key={trade.id}
                onClick={() => onSelectTrade(trade)}
                style={{
                  padding: '14px 12px',
                  backgroundColor: isSelected
                    ? 'rgba(212, 165, 69, 0.2)'
                    : 'rgba(37, 30, 23, 0.4)',
                  border: isSelected
                    ? '1px solid rgba(212, 165, 69, 0.5)'
                    : '1px solid rgba(212, 165, 69, 0.15)',
                  borderRadius: '10px',
                  cursor: 'pointer',
                  transition: 'all 150ms ease',
                  position: 'relative',
                  overflow: 'hidden',
                  flexShrink: 0,
                }}
                onMouseEnter={(e) => {
                  if (!isSelected) {
                    (e.currentTarget as HTMLDivElement).style.backgroundColor =
                      'rgba(37, 30, 23, 0.6)';
                    (e.currentTarget as HTMLDivElement).style.borderColor =
                      'rgba(212, 165, 69, 0.25)';
                  }
                }}
                onMouseLeave={(e) => {
                  if (!isSelected) {
                    (e.currentTarget as HTMLDivElement).style.backgroundColor =
                      'rgba(37, 30, 23, 0.4)';
                    (e.currentTarget as HTMLDivElement).style.borderColor =
                      'rgba(212, 165, 69, 0.15)';
                  }
                }}
              >
                {isSelected && (
                  <div
                    style={{
                      position: 'absolute',
                      left: 0,
                      top: 0,
                      bottom: 0,
                      width: '3px',
                      backgroundColor: '#F5C76D',
                    }}
                  />
                )}

                {/* Trade Header */}
                <div
                  style={{
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                    marginBottom: '6px',
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                    <span
                      style={{
                        width: '6px',
                        height: '6px',
                        borderRadius: '50%',
                        backgroundColor: trade.side === 'LONG' ? '#10b981' : '#ef4444',
                      }}
                    />
                    <span
                      style={{
                        fontWeight: '700',
                        fontSize: '12px',
                        color: '#F5C76D',
                      }}
                    >
                      {trade.symbol}
                    </span>
                  </div>
                  <span
                    style={{
                      fontWeight: '700',
                      fontSize: '11px',
                      color: pnl >= 0 ? '#10b981' : '#ef4444',
                      backgroundColor: pnl >= 0 ? 'rgba(16, 185, 129, 0.15)' : 'rgba(239, 68, 68, 0.15)',
                      padding: '4px 8px',
                      borderRadius: '6px',
                      border: pnl >= 0 ? '1px solid rgba(16, 185, 129, 0.3)' : '1px solid rgba(239, 68, 68, 0.3)',
                    }}
                  >
                    {pnl >= 0 ? '+' : ''} ${pnl.toFixed(2)}
                  </span>
                </div>

                {/* Trade Details */}
                <div
                  style={{
                    fontSize: '10px',
                    color: '#8B7355',
                    display: 'flex',
                    justifyContent: 'space-between',
                    gap: '6px',
                  }}
                >
                  <span>
                    {trade.side === 'LONG' ? '📈' : '📉'} {new Date(trade.entryTime || Date.now()).toLocaleDateString(undefined, {
                      month: 'short',
                      day: 'numeric',
                    })}
                  </span>
                  <span>Entry: ${entryPrice.toFixed(2)}</span>
                </div>
              </div>
            );
          })
        )}
      </div>

      <style>{`
        div::-webkit-scrollbar {
          width: 6px;
        }
        div::-webkit-scrollbar-track {
          background: rgba(212, 165, 69, 0.05);
          border-radius: 3px;
        }
        div::-webkit-scrollbar-thumb {
          background: rgba(212, 165, 69, 0.2);
          border-radius: 3px;
        }
        div::-webkit-scrollbar-thumb:hover {
          background: rgba(212, 165, 69, 0.3);
        }
      `}</style>
    </div>
  );
};

export const TradeSidebar = memo(TradeSidebarComponent);
