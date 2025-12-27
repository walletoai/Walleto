/**
 * WalletoReplayPage - Professional Trade Replay
 * Clean, modern interface for reviewing and analyzing historical trades
 */

import React, { useState, useMemo } from 'react';
import { supabase } from '../lib/supabase';
import type { Trade } from '../hooks/useTradeStats';
import { useTradeStats } from '../hooks/useTradeStats';
import { ReplayChart } from '../components/charts/ReplayChart';
import { useResponsive } from '../hooks/useResponsive';

interface WalletoReplayPageProps {
  trades: any[];
  updateTradeLocally: (id: string, patch: any) => void;
}

export default function WalletoReplayPage({ trades, updateTradeLocally }: WalletoReplayPageProps) {
  const { isMobile, isTablet } = useResponsive();

  // Use actual trades only - no demo/fake data
  const tradesToUse = trades || [];

  // Convert raw trades to Trade interface - handle both Blofin and manual trade formats
  const convertedTrades: Trade[] = useMemo(() => {
    return tradesToUse
      .map((t): Trade | null => {
        const entryPrice = parseFloat(t.entry_price ?? t.entry) || 0;
        const exitPrice = parseFloat(t.exit_price ?? t.exit) || 0;
        const entryTime = t.entry_time ? new Date(t.entry_time).getTime() : new Date(t.date).getTime();
        const size = parseFloat(t.quantity ?? t.position_size ?? t.size) || 1;

        if (!entryPrice || !t.symbol) return null;

        const trade: Trade = {
          id: t.id,
          symbol: t.symbol,
          side: t.side?.toUpperCase() === 'SHORT' ? 'SHORT' : 'LONG',
          entryPrice,
          exitPrice: exitPrice || entryPrice,
          entryTime,
          exitTime: t.exit_time ? new Date(t.exit_time).getTime() : entryTime + (t.duration || 3600000),
          size,
          leverage: parseFloat(t.leverage) || 1,
          fees: parseFloat(t.fees) || 0,
          stopLoss: parseFloat(t.stopLoss || t.stop_loss) || undefined,
          takeProfit: parseFloat(t.takeProfit || t.take_profit) || undefined,
          liquidationPrice: parseFloat(t.liquidationPrice || t.liquidation_price) || undefined,
          notes: t.notes,
          setup: t.setup_name || t.setup,
          pnlUsd: parseFloat(t.pnl_usd) || 0,
        };
        return trade;
      })
      .filter((t): t is Trade => t !== null)
      .sort((a, b) => (b.entryTime || 0) - (a.entryTime || 0));
  }, [tradesToUse]);

  const [selectedTrade, setSelectedTrade] = useState<Trade | null>(() => convertedTrades[0] || null);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterSide, setFilterSide] = useState<'all' | 'LONG' | 'SHORT'>('all');
  const [showSidebar, setShowSidebar] = useState(!isMobile);

  // Calculate stats for selected trade
  const currentCandle = selectedTrade ? {
    time: Date.now(),
    open: selectedTrade.entryPrice,
    high: Math.max(selectedTrade.entryPrice, selectedTrade.exitPrice),
    low: Math.min(selectedTrade.entryPrice, selectedTrade.exitPrice),
    close: selectedTrade.exitPrice,
    volume: 0,
  } : null;

  const stats = useTradeStats(selectedTrade, currentCandle);

  // Filter trades
  const filteredTrades = useMemo(() => {
    return convertedTrades.filter(t => {
      if (searchTerm && !t.symbol.toLowerCase().includes(searchTerm.toLowerCase())) return false;
      if (filterSide !== 'all' && t.side !== filterSide) return false;
      return true;
    });
  }, [convertedTrades, searchTerm, filterSide]);

  // Calculate PnL for a trade - use stored value if available, otherwise calculate
  const calcPnl = (t: Trade) => {
    // Prefer the stored pnl_usd value from the database
    if (t.pnlUsd !== undefined && t.pnlUsd !== 0) {
      return t.pnlUsd;
    }
    // Fallback calculation
    const pnl = (t.exitPrice - t.entryPrice) * t.size * (t.side === 'LONG' ? 1 : -1) - (t.fees || 0);
    return pnl;
  };

  // Calculate PnL percentage based on margin (position / leverage)
  const calcPnlPercent = (t: Trade, pnlUsd: number) => {
    const positionValue = t.entryPrice * t.size;
    const marginUsed = positionValue / (t.leverage || 1);
    return marginUsed > 0 ? (pnlUsd / marginUsed) * 100 : 0;
  };

  // Save notes
  const saveTradeNotes = async (notes: string) => {
    if (!selectedTrade?.id) return;
    try {
      const { error } = await supabase
        .from('trades')
        .update({ notes })
        .eq('id', selectedTrade.id);
      if (error) throw error;
      updateTradeLocally(selectedTrade.id, { notes });
      setSelectedTrade({ ...selectedTrade, notes });
    } catch (err) {
      console.error('Failed to save notes:', err);
    }
  };

  return (
    <div style={{
      display: 'flex',
      height: 'calc(100vh - 60px)',
      backgroundColor: '#0f0a07',
      overflow: 'hidden',
    }}>
      {/* Sidebar - Trade List */}
      <div style={{
        width: showSidebar ? (isMobile ? '100%' : '320px') : '0',
        minWidth: showSidebar ? (isMobile ? '100%' : '320px') : '0',
        backgroundColor: 'rgba(29, 26, 22, 0.95)',
        borderRight: '1px solid rgba(212, 165, 69, 0.1)',
        display: 'flex',
        flexDirection: 'column',
        transition: 'all 0.3s ease',
        overflow: 'hidden',
        position: isMobile ? 'absolute' : 'relative',
        zIndex: isMobile ? 100 : 1,
        height: '100%',
      }}>
        {/* Sidebar Header */}
        <div style={{
          padding: '20px',
          borderBottom: '1px solid rgba(212, 165, 69, 0.1)',
        }}>
          <div style={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            marginBottom: '16px',
          }}>
            <h2 style={{
              margin: 0,
              fontSize: '18px',
              fontWeight: '700',
              color: '#F5C76D',
            }}>
              Trade History
            </h2>
            {isMobile && (
              <button
                onClick={() => setShowSidebar(false)}
                style={{
                  background: 'none',
                  border: 'none',
                  color: '#C2B280',
                  fontSize: '20px',
                  cursor: 'pointer',
                }}
              >
                ×
              </button>
            )}
          </div>

          {/* Search */}
          <input
            type="text"
            placeholder="Search symbol..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            style={{
              width: '100%',
              padding: '10px 14px',
              backgroundColor: 'rgba(37, 30, 23, 0.8)',
              border: '1px solid rgba(212, 165, 69, 0.2)',
              borderRadius: '8px',
              color: '#F5C76D',
              fontSize: '13px',
              outline: 'none',
              marginBottom: '12px',
              boxSizing: 'border-box',
            }}
          />

          {/* Filter Buttons */}
          <div style={{ display: 'flex', gap: '8px' }}>
            {(['all', 'LONG', 'SHORT'] as const).map(filter => (
              <button
                key={filter}
                onClick={() => setFilterSide(filter)}
                style={{
                  flex: 1,
                  padding: '8px',
                  backgroundColor: filterSide === filter ? 'rgba(212, 165, 69, 0.2)' : 'transparent',
                  border: `1px solid ${filterSide === filter ? 'rgba(212, 165, 69, 0.4)' : 'rgba(212, 165, 69, 0.15)'}`,
                  borderRadius: '6px',
                  color: filterSide === filter ? '#F5C76D' : '#8B7355',
                  fontSize: '11px',
                  fontWeight: '600',
                  cursor: 'pointer',
                  transition: 'all 0.2s ease',
                }}
              >
                {filter === 'all' ? 'All' : filter}
              </button>
            ))}
          </div>
        </div>

        {/* Trade Count */}
        <div style={{
          padding: '12px 20px',
          backgroundColor: 'rgba(37, 30, 23, 0.3)',
          borderBottom: '1px solid rgba(212, 165, 69, 0.1)',
          fontSize: '12px',
          color: '#8B7355',
        }}>
          {filteredTrades.length} trades found
        </div>

        {/* Trade List */}
        <div style={{
          flex: 1,
          overflowY: 'auto',
          padding: '12px',
        }}>
          {filteredTrades.length === 0 ? (
            <div style={{
              textAlign: 'center',
              padding: '40px 20px',
              color: '#666',
            }}>
              <div style={{ fontSize: '32px', marginBottom: '12px' }}>📭</div>
              <div style={{ fontSize: '14px' }}>No trades found</div>
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
              {filteredTrades.map(trade => {
                const pnl = calcPnl(trade);
                const isSelected = selectedTrade?.id === trade.id;
                const pnlPercent = calcPnlPercent(trade, pnl);

                return (
                  <div
                    key={trade.id}
                    onClick={() => {
                      setSelectedTrade(trade);
                      if (isMobile) setShowSidebar(false);
                    }}
                    style={{
                      padding: '14px 16px',
                      backgroundColor: isSelected ? 'rgba(212, 165, 69, 0.15)' : 'rgba(37, 30, 23, 0.4)',
                      border: `1px solid ${isSelected ? 'rgba(212, 165, 69, 0.4)' : 'rgba(212, 165, 69, 0.1)'}`,
                      borderRadius: '10px',
                      cursor: 'pointer',
                      transition: 'all 0.15s ease',
                    }}
                  >
                    {/* Row 1: Symbol + PnL */}
                    <div style={{
                      display: 'flex',
                      justifyContent: 'space-between',
                      alignItems: 'center',
                      marginBottom: '8px',
                    }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                        <span style={{
                          width: '8px',
                          height: '8px',
                          borderRadius: '50%',
                          backgroundColor: trade.side === 'LONG' ? '#10b981' : '#ef4444',
                        }} />
                        <span style={{
                          fontSize: '14px',
                          fontWeight: '700',
                          color: '#F5C76D',
                        }}>
                          {trade.symbol}
                        </span>
                      </div>
                      <span style={{
                        fontSize: '13px',
                        fontWeight: '700',
                        color: pnl >= 0 ? '#10b981' : '#ef4444',
                      }}>
                        {pnl >= 0 ? '+' : ''}{pnl.toFixed(2)}
                      </span>
                    </div>

                    {/* Row 2: Details */}
                    <div style={{
                      display: 'flex',
                      justifyContent: 'space-between',
                      fontSize: '11px',
                      color: '#8B7355',
                    }}>
                      <span>
                        {new Date(trade.entryTime || Date.now()).toLocaleDateString('en-US', {
                          month: 'short',
                          day: 'numeric',
                        })}
                      </span>
                      <span style={{ color: '#C2B280' }}>
                        ${trade.entryPrice.toFixed(2)} → ${trade.exitPrice.toFixed(2)}
                      </span>
                      <span style={{
                        color: pnl >= 0 ? '#10b981' : '#ef4444',
                        fontWeight: '600',
                      }}>
                        {pnlPercent >= 0 ? '+' : ''}{pnlPercent.toFixed(1)}%
                      </span>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>

      {/* Main Content */}
      <div style={{
        flex: 1,
        display: 'flex',
        flexDirection: 'column',
        overflow: 'hidden',
        minWidth: 0,
      }}>
        {/* Mobile Toggle Button */}
        {(isMobile || isTablet) && (
          <div style={{
            padding: '8px 16px',
            backgroundColor: 'rgba(29, 26, 22, 0.6)',
            borderBottom: '1px solid rgba(212, 165, 69, 0.1)',
          }}>
            <button
              onClick={() => setShowSidebar(true)}
              style={{
                padding: '8px 12px',
                backgroundColor: 'rgba(212, 165, 69, 0.1)',
                border: '1px solid rgba(212, 165, 69, 0.2)',
                borderRadius: '6px',
                color: '#F5C76D',
                fontSize: '12px',
                fontWeight: '600',
                cursor: 'pointer',
              }}
            >
              ☰ Trades
            </button>
          </div>
        )}

        {/* Chart Area */}
        <div style={{
          flex: 1,
          padding: isMobile ? '8px' : '12px',
          display: 'flex',
          flexDirection: 'column',
          minHeight: 0,
          gap: '12px',
        }}>
          {selectedTrade ? (
            <>
              {/* Chart with Replay Controls */}
              <div style={{
                flex: 1,
                minHeight: '400px',
                borderRadius: '10px',
                overflow: 'hidden',
                border: '1px solid rgba(212, 165, 69, 0.15)',
              }}>
                <ReplayChart
                  trade={selectedTrade}
                />
              </div>

              {/* Stats Cards Row */}
              {stats && (
                <div style={{
                  display: 'grid',
                  gridTemplateColumns: isMobile ? 'repeat(2, 1fr)' : 'repeat(5, 1fr)',
                  gap: '12px',
                }}>
                  <StatCard
                    label="Entry Price"
                    value={`$${selectedTrade.entryPrice.toFixed(2)}`}
                    color="#F5C76D"
                  />
                  <StatCard
                    label="Exit Price"
                    value={`$${selectedTrade.exitPrice.toFixed(2)}`}
                    color="#F5C76D"
                  />
                  <StatCard
                    label="Margin"
                    value={`$${((selectedTrade.entryPrice * selectedTrade.size) / (selectedTrade.leverage || 1)).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`}
                    subtext={`${selectedTrade.leverage || 1}x leverage`}
                  />
                  <StatCard
                    label="Duration"
                    value={formatDuration(stats.tradeDuration)}
                  />
                  <StatCard
                    label="Final P&L"
                    value={`${calcPnl(selectedTrade) >= 0 ? '+' : ''}$${calcPnl(selectedTrade).toFixed(2)}`}
                    subtext={`${calcPnlPercent(selectedTrade, calcPnl(selectedTrade)) >= 0 ? '+' : ''}${calcPnlPercent(selectedTrade, calcPnl(selectedTrade)).toFixed(2)}%`}
                    color={calcPnl(selectedTrade) >= 0 ? '#10b981' : '#ef4444'}
                  />
                </div>
              )}

              {/* Notes Section */}
              {selectedTrade.notes && (
                <div style={{
                  padding: '16px',
                  backgroundColor: 'rgba(37, 30, 23, 0.6)',
                  borderRadius: '10px',
                  border: '1px solid rgba(212, 165, 69, 0.1)',
                }}>
                  <div style={{
                    fontSize: '11px',
                    fontWeight: '600',
                    color: '#8B7355',
                    textTransform: 'uppercase',
                    marginBottom: '8px',
                  }}>
                    Trade Notes
                  </div>
                  <div style={{
                    fontSize: '13px',
                    color: '#C2B280',
                    lineHeight: 1.5,
                  }}>
                    {selectedTrade.notes}
                  </div>
                </div>
              )}
            </>
          ) : (
            /* Empty State */
            <div style={{
              flex: 1,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              flexDirection: 'column',
              color: '#666',
            }}>
              {convertedTrades.length === 0 ? (
                <>
                  <div style={{ fontSize: '48px', marginBottom: '16px' }}>📭</div>
                  <div style={{ fontSize: '18px', color: '#F5C76D', marginBottom: '8px', fontWeight: '600' }}>
                    No Trades Yet
                  </div>
                  <div style={{ fontSize: '13px', color: '#8B7355', textAlign: 'center', maxWidth: '300px', lineHeight: 1.5 }}>
                    Connect your exchange in Settings or upload a CSV to import your trade history and replay them here.
                  </div>
                </>
              ) : (
                <>
                  <div style={{ fontSize: '48px', marginBottom: '16px' }}>📊</div>
                  <div style={{ fontSize: '16px', color: '#C2B280', marginBottom: '8px' }}>
                    Select a trade to replay
                  </div>
                  <div style={{ fontSize: '13px', color: '#8B7355' }}>
                    Choose a trade from the sidebar to view its chart and statistics
                  </div>
                </>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

// Stat Card Component
function StatCard({ label, value, subtext, color = '#C2B280' }: {
  label: string;
  value: string;
  subtext?: string;
  color?: string;
}) {
  return (
    <div style={{
      padding: '14px 16px',
      backgroundColor: 'rgba(37, 30, 23, 0.6)',
      borderRadius: '10px',
      border: '1px solid rgba(212, 165, 69, 0.1)',
    }}>
      <div style={{
        fontSize: '10px',
        fontWeight: '600',
        color: '#8B7355',
        textTransform: 'uppercase',
        marginBottom: '6px',
      }}>
        {label}
      </div>
      <div style={{
        fontSize: '16px',
        fontWeight: '700',
        color: color,
        fontFamily: 'monospace',
      }}>
        {value}
      </div>
      {subtext && (
        <div style={{
          fontSize: '11px',
          color: '#8B7355',
          marginTop: '2px',
        }}>
          {subtext}
        </div>
      )}
    </div>
  );
}

// Duration formatter
function formatDuration(ms: number): string {
  const seconds = Math.floor(ms / 1000);
  const minutes = Math.floor(seconds / 60);
  const hours = Math.floor(minutes / 60);
  const days = Math.floor(hours / 24);

  if (days > 0) return `${days}d ${hours % 24}h`;
  if (hours > 0) return `${hours}h ${minutes % 60}m`;
  if (minutes > 0) return `${minutes}m`;
  return `${seconds}s`;
}
