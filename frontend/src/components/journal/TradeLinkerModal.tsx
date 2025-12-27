/**
 * TradeLinkerModal - Modal to link trades to a journal entry
 */

import { useState, useMemo } from 'react';
import * as journalApi from '../../api/journal';

interface TradeLinkerModalProps {
  isOpen: boolean;
  trades: any[];
  linkedTradeIds: string[];
  userId: string;
  entryId: string;
  onClose: () => void;
}

export default function TradeLinkerModal({
  isOpen,
  trades,
  linkedTradeIds,
  userId,
  entryId,
  onClose,
}: TradeLinkerModalProps) {
  const [search, setSearch] = useState('');
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set(linkedTradeIds));
  const [saving, setSaving] = useState(false);

  // Filter and sort trades
  const filteredTrades = useMemo(() => {
    let filtered = trades;

    if (search) {
      const searchLower = search.toLowerCase();
      filtered = trades.filter(
        (t) =>
          t.symbol?.toLowerCase().includes(searchLower) ||
          t.date?.includes(search)
      );
    }

    // Sort by date descending
    return [...filtered].sort(
      (a, b) => new Date(b.date).getTime() - new Date(a.date).getTime()
    );
  }, [trades, search]);

  function toggleTrade(tradeId: string) {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(tradeId)) {
        next.delete(tradeId);
      } else {
        next.add(tradeId);
      }
      return next;
    });
  }

  async function handleSave() {
    setSaving(true);
    try {
      // Get trades to add and remove
      const currentSet = new Set(linkedTradeIds);
      const toAdd = [...selectedIds].filter((id) => !currentSet.has(id));
      const toRemove = linkedTradeIds.filter((id) => !selectedIds.has(id));

      // Add new links
      if (toAdd.length > 0) {
        await journalApi.linkTrades(userId, entryId, toAdd);
      }

      // Remove old links
      for (const tradeId of toRemove) {
        await journalApi.unlinkTrade(userId, entryId, tradeId);
      }

      onClose();
    } catch (err) {
      console.error('Failed to update trade links:', err);
    } finally {
      setSaving(false);
    }
  }

  function formatPnl(pnl: number) {
    if (pnl > 0) return `+$${pnl.toFixed(2)}`;
    if (pnl < 0) return `-$${Math.abs(pnl).toFixed(2)}`;
    return '$0.00';
  }

  if (!isOpen) return null;

  return (
    <>
      {/* Backdrop */}
      <div
        onClick={onClose}
        style={{
          position: 'fixed',
          inset: 0,
          backgroundColor: 'rgba(0, 0, 0, 0.6)',
          backdropFilter: 'blur(4px)',
          zIndex: 1000,
        }}
      />

      {/* Modal */}
      <div
        style={{
          position: 'fixed',
          top: '50%',
          left: '50%',
          transform: 'translate(-50%, -50%)',
          width: '90%',
          maxWidth: '550px',
          maxHeight: '80vh',
          backgroundColor: '#251E17',
          border: '1px solid rgba(212, 165, 69, 0.2)',
          borderRadius: '16px',
          zIndex: 1001,
          overflow: 'hidden',
          boxShadow: '0 8px 32px rgba(0, 0, 0, 0.4)',
          display: 'flex',
          flexDirection: 'column',
        }}
      >
        {/* Header */}
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            padding: '16px 20px',
            borderBottom: '1px solid rgba(212, 165, 69, 0.1)',
          }}
        >
          <h2 style={{ margin: 0, fontSize: '18px', color: '#F5C76D', fontWeight: 700 }}>
            Link Trades
          </h2>
          <button
            onClick={onClose}
            style={{
              padding: '8px',
              backgroundColor: 'transparent',
              border: 'none',
              color: '#8B7355',
              fontSize: '18px',
              cursor: 'pointer',
            }}
          >
            ×
          </button>
        </div>

        {/* Search */}
        <div style={{ padding: '12px 20px', borderBottom: '1px solid rgba(212, 165, 69, 0.1)' }}>
          <input
            type="text"
            placeholder="Search by symbol or date..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            style={{
              width: '100%',
              padding: '10px 14px',
              backgroundColor: 'rgba(37, 30, 23, 0.6)',
              border: '1px solid rgba(212, 165, 69, 0.2)',
              borderRadius: '8px',
              color: '#F7E7C6',
              fontSize: '14px',
              outline: 'none',
            }}
          />
          {selectedIds.size > 0 && (
            <div style={{ marginTop: '8px', fontSize: '12px', color: '#F5C76D' }}>
              {selectedIds.size} trade{selectedIds.size > 1 ? 's' : ''} selected
            </div>
          )}
        </div>

        {/* Trade List */}
        <div style={{ flex: 1, overflow: 'auto', padding: '12px 20px' }}>
          {filteredTrades.length === 0 ? (
            <div style={{ textAlign: 'center', padding: '32px', color: '#8B7355' }}>
              <div style={{ fontSize: '32px', marginBottom: '8px' }}>📊</div>
              <div>No trades found</div>
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
              {filteredTrades.slice(0, 50).map((trade) => {
                const isSelected = selectedIds.has(trade.id);
                const pnl = trade.pnl_usd || 0;
                const isProfit = pnl > 0;

                return (
                  <button
                    key={trade.id}
                    onClick={() => toggleTrade(trade.id)}
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: '12px',
                      width: '100%',
                      padding: '12px',
                      backgroundColor: isSelected
                        ? 'rgba(245, 199, 109, 0.12)'
                        : 'rgba(37, 30, 23, 0.4)',
                      border: isSelected
                        ? '1px solid rgba(245, 199, 109, 0.3)'
                        : '1px solid rgba(212, 165, 69, 0.1)',
                      borderRadius: '10px',
                      cursor: 'pointer',
                      textAlign: 'left',
                      transition: 'all 150ms ease',
                    }}
                  >
                    {/* Checkbox */}
                    <div
                      style={{
                        width: '20px',
                        height: '20px',
                        borderRadius: '4px',
                        border: isSelected
                          ? '2px solid #F5C76D'
                          : '2px solid rgba(139, 115, 85, 0.4)',
                        backgroundColor: isSelected ? '#F5C76D' : 'transparent',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        flexShrink: 0,
                      }}
                    >
                      {isSelected && (
                        <span style={{ color: '#1D1A16', fontSize: '12px', fontWeight: 700 }}>
                          ✓
                        </span>
                      )}
                    </div>

                    {/* Trade Info */}
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                        <span style={{ color: '#F7E7C6', fontWeight: 600, fontSize: '14px' }}>
                          {trade.symbol}
                        </span>
                        <span
                          style={{
                            fontSize: '11px',
                            padding: '2px 6px',
                            borderRadius: '4px',
                            backgroundColor:
                              trade.side?.toLowerCase() === 'long'
                                ? 'rgba(34, 197, 94, 0.15)'
                                : 'rgba(239, 68, 68, 0.15)',
                            color:
                              trade.side?.toLowerCase() === 'long' ? '#22c55e' : '#ef4444',
                            textTransform: 'uppercase',
                          }}
                        >
                          {trade.side}
                        </span>
                      </div>
                      <div style={{ fontSize: '12px', color: '#8B7355', marginTop: '2px' }}>
                        {new Date(trade.date).toLocaleDateString('en-US', {
                          month: 'short',
                          day: 'numeric',
                          year: 'numeric',
                        })}
                      </div>
                    </div>

                    {/* PnL */}
                    <div
                      style={{
                        fontSize: '14px',
                        fontWeight: 600,
                        color: isProfit ? '#22c55e' : pnl < 0 ? '#ef4444' : '#8B7355',
                      }}
                    >
                      {formatPnl(pnl)}
                    </div>
                  </button>
                );
              })}
              {filteredTrades.length > 50 && (
                <div style={{ textAlign: 'center', padding: '8px', color: '#8B7355', fontSize: '12px' }}>
                  Showing first 50 trades. Use search to find specific trades.
                </div>
              )}
            </div>
          )}
        </div>

        {/* Footer */}
        <div
          style={{
            padding: '12px 20px',
            borderTop: '1px solid rgba(212, 165, 69, 0.1)',
            display: 'flex',
            gap: '12px',
            justifyContent: 'flex-end',
          }}
        >
          <button
            onClick={onClose}
            style={{
              padding: '10px 20px',
              backgroundColor: 'transparent',
              border: '1px solid rgba(139, 115, 85, 0.3)',
              borderRadius: '8px',
              color: '#8B7355',
              fontSize: '14px',
              cursor: 'pointer',
            }}
          >
            Cancel
          </button>
          <button
            onClick={handleSave}
            disabled={saving}
            style={{
              padding: '10px 20px',
              backgroundColor: 'rgba(245, 199, 109, 0.15)',
              border: '1px solid rgba(245, 199, 109, 0.3)',
              borderRadius: '8px',
              color: '#F5C76D',
              fontSize: '14px',
              fontWeight: 600,
              cursor: saving ? 'not-allowed' : 'pointer',
              opacity: saving ? 0.6 : 1,
            }}
          >
            {saving ? 'Saving...' : 'Save Links'}
          </button>
        </div>
      </div>
    </>
  );
}
