// src/pages/TradesPage.tsx
import { useMemo, useState, useEffect } from "react";
import { computeRiskMetrics } from "../utils/riskEngine";
import { supabase } from "../lib/supabase";
import LeverageSettings from "../components/trades/LeverageSettings";
import { useResponsive } from "../hooks/useResponsive";
import { useModals } from "../components/modals/CustomModals";

type Props = {
  trades: any[];
  setups: any[];
  updateTradeLocally: (id: string, patch: any) => void;
};

export default function TradesPage({ trades, setups, updateTradeLocally }: Props) {
  const { isMobile, isTablet } = useResponsive();
  const { confirm, alert } = useModals();

  const [sortKey, setSortKey] = useState("DATE");
  const [coinFilter, setCoinFilter] = useState("ALL");
  const [setupFilter, setSetupFilter] = useState("ALL");

  // Date range filter state
  const [dateRangeStart, setDateRangeStart] = useState<string>("");
  const [dateRangeEnd, setDateRangeEnd] = useState<string>("");
  const [showDatePicker, setShowDatePicker] = useState(false);

  // Notes modal
  const [activeTrade, setActiveTrade] = useState<any | null>(null);
  const [noteText, setNoteText] = useState("");

  // Edit modal
  const [editTrade, setEditTrade] = useState<any | null>(null);
  const [editForm, setEditForm] = useState<any>({});

  // User ID for leverage settings
  const [userId, setUserId] = useState<string | null>(null);

  // Leverage settings modal
  const [showLeverageSettings, setShowLeverageSettings] = useState(false);

  // Mass delete modal
  const [showMassDelete, setShowMassDelete] = useState(false);
  const [massDeletePlatform, setMassDeletePlatform] = useState<string>("ALL");

  // Get user ID from Supabase
  useEffect(() => {
    async function fetchUserId() {
      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        setUserId(user.id);
      }
    }
    fetchUserId();
  }, []);

  // Get unique symbols from trades
  const uniqueSymbols = useMemo(() => {
    if (!trades || trades.length === 0) return [];
    const symbols = new Set(trades.filter(t => !t.deleted).map(t => t.symbol));
    return Array.from(symbols);
  }, [trades]);

  const getTradeDate = (t: any) => {
    // Use entry_time (when trade was opened) instead of date (when uploaded)
    if (t.entry_time) {
      const d = new Date(t.entry_time);
      if (!isNaN(d.getTime())) return d;
    }
    // Fallback to date field if entry_time doesn't exist
    if (t.date) {
      const d = new Date(t.date);
      if (!isNaN(d.getTime())) return d;
    }
    return new Date();
  };

  // Helper to set date range by days
  const setDateRangeByDays = (days: number) => {
    const end = new Date();
    const start = new Date();
    start.setDate(start.getDate() - days);
    setDateRangeStart(start.toISOString().split('T')[0]);
    setDateRangeEnd(end.toISOString().split('T')[0]);
    setShowDatePicker(false);
  };

  // Clear date range
  const clearDateRange = () => {
    setDateRangeStart("");
    setDateRangeEnd("");
    setShowDatePicker(false);
  };

  // Get display text for date range button
  const getDateRangeDisplayText = () => {
    if (!dateRangeStart && !dateRangeEnd) return "All Time";
    if (dateRangeStart && dateRangeEnd) {
      const start = new Date(dateRangeStart);
      const end = new Date(dateRangeEnd);
      return `${start.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })} - ${end.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}`;
    }
    if (dateRangeStart) return `From ${new Date(dateRangeStart).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}`;
    if (dateRangeEnd) return `Until ${new Date(dateRangeEnd).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}`;
    return "All Time";
  };

  // ==========================================
  // FILTERING + SORTING
  // ==========================================
  const filteredTrades = useMemo(() => {
    if (!trades) return [];

    let result = [...trades].filter(t => !t.deleted);

    // DATE RANGE FILTER
    if (dateRangeStart || dateRangeEnd) {
      const startDate = dateRangeStart ? new Date(dateRangeStart) : null;
      const endDate = dateRangeEnd ? new Date(dateRangeEnd + 'T23:59:59') : null; // End of day

      result = result.filter((t) => {
        const tradeDate = getTradeDate(t);
        if (startDate && tradeDate < startDate) return false;
        if (endDate && tradeDate > endDate) return false;
        return true;
      });
    }

    // COIN FILTER
    if (coinFilter !== "ALL") {
      result = result.filter((t) => t.symbol === coinFilter);
    }

    // SETUP FILTER
    if (setupFilter !== "ALL") {
      result = result.filter(
        (t) => (t.setup_name || "No setup") === setupFilter
      );
    }

    // SORTING
    result.sort((a, b) => {
      if (sortKey === "SYMBOL") return a.symbol.localeCompare(b.symbol);
      if (sortKey === "SIDE") return a.side.localeCompare(b.side);
      if (sortKey === "SETUP")
        return (a.setup_name || "").localeCompare(b.setup_name || "");

      if (sortKey === "PNL") return (b.pnl_usd || 0) - (a.pnl_usd || 0);
      if (sortKey === "PNLPCT") {
        // Calculate pnlPercent from price move, with safety checks
        const aEntry = a.entry_price ?? a.entry ?? 0;
        const aExit = a.exit_price ?? a.exit ?? 0;
        const bEntry = b.entry_price ?? b.entry ?? 0;
        const bExit = b.exit_price ?? b.exit ?? 0;

        const aPercent = aEntry !== 0 ? ((aExit - aEntry) / aEntry) * (a.side === "SHORT" || a.side === "SELL" ? -1 : 1) * 100 * (a.leverage ?? 1) : 0;
        const bPercent = bEntry !== 0 ? ((bExit - bEntry) / bEntry) * (b.side === "SHORT" || b.side === "SELL" ? -1 : 1) * 100 * (b.leverage ?? 1) : 0;
        return bPercent - aPercent;
      }

      // DEFAULT: date descending (latest first)
      return getTradeDate(b).getTime() - getTradeDate(a).getTime();
    });

    return result;
  }, [trades, sortKey, dateRangeStart, dateRangeEnd, coinFilter, setupFilter]);

  // ==========================================
  // SAVE NOTES
  // ==========================================
  async function saveNote() {
    if (!activeTrade) return;

    const { error } = await supabase
      .from("trades")
      .update({ notes: noteText })
      .eq("id", activeTrade.id);

    if (error) {
      console.error("saveNote error:", error);
      return;
    }

    updateTradeLocally(activeTrade.id, { notes: noteText });

    setActiveTrade(null);
    setNoteText("");
  }

  // ==========================================
  // SAVE EDITED TRADE
  // ==========================================
  async function saveEditedTrade() {
    if (!editTrade) return;

    const { error } = await supabase
      .from("trades")
      .update({
        entry_time: editForm.date,
        symbol: editForm.symbol,
        side: editForm.side,
        entry_price: Number(editForm.entry),
        exit_price: Number(editForm.exit),
        quantity: Number(editForm.size),
        leverage: Number(editForm.leverage),
        fees: Number(editForm.fees),
        exchange: editForm.exchange || null,
        notes: editForm.notes || null,
      })
      .eq("id", editTrade.id);

    if (error) {
      console.error("saveEditedTrade error:", error);
      await alert({ message: "Failed to save changes: " + error.message, type: 'error' });
      return;
    }

    // Update local state with saved changes
    updateTradeLocally(editTrade.id, {
      entry_time: editForm.date,
      entry_price: Number(editForm.entry),
      exit_price: Number(editForm.exit),
      quantity: Number(editForm.size),
      leverage: Number(editForm.leverage),
      fees: Number(editForm.fees),
      symbol: editForm.symbol,
      side: editForm.side,
      exchange: editForm.exchange,
      notes: editForm.notes,
    });

    setEditTrade(null);
  }

  // ==========================================
  // DELETE TRADE
  // ==========================================
  async function deleteTrade(id: string) {
    const confirmed = await confirm({
      title: "Delete Trade",
      message: "Are you sure you want to delete this trade?",
      type: 'danger',
      confirmText: 'Delete',
    });
    if (!confirmed) return;
    console.log("Deleting trade:", id);

    const { error } = await supabase.from("trades").delete().eq("id", id);

    if (error) {
      console.error("deleteTrade error:", error);
      await alert({ message: "Failed to delete trade: " + error.message, type: 'error' });
      return;
    }

    console.log("Trade deleted from DB, updating local state...");
    updateTradeLocally(id, { deleted: true });
  }

  const uniqueCoins = Array.from(new Set(trades.map((t: any) => t.symbol)));

  // Get unique platforms/exchanges
  const uniquePlatforms = useMemo(() => {
    if (!trades || trades.length === 0) return [];
    const platforms = new Set(trades.filter(t => !t.deleted && t.exchange).map(t => t.exchange));
    return Array.from(platforms).sort();
  }, [trades]);

  // Get count of trades per platform
  const getTradeCountByPlatform = (platform: string) => {
    if (platform === "ALL") {
      return trades.filter(t => !t.deleted).length;
    }
    return trades.filter(t => !t.deleted && t.exchange === platform).length;
  };

  // Mass delete function
  async function massDeleteTrades() {
    const platform = massDeletePlatform;
    const count = getTradeCountByPlatform(platform);

    if (count === 0) {
      await alert({ message: "No trades to delete", type: 'warning' });
      return;
    }

    const confirmMsg = platform === "ALL"
      ? `Are you sure you want to delete ALL ${count} trades? This cannot be undone!`
      : `Are you sure you want to delete all ${count} trades from ${platform}? This cannot be undone!`;

    const confirmText = platform === "ALL" ? "DELETE ALL" : "DELETE";

    const confirmed = await confirm({
      title: "Mass Delete Trades",
      message: confirmMsg,
      type: 'danger',
      confirmText: 'Delete',
      requireTextConfirmation: confirmText,
    });

    if (!confirmed) return;

    // Get IDs to delete
    const tradesToDelete = platform === "ALL"
      ? trades.filter(t => !t.deleted)
      : trades.filter(t => !t.deleted && t.exchange === platform);

    const ids = tradesToDelete.map(t => t.id);

    const { error } = await supabase.from("trades").delete().in("id", ids);

    if (error) {
      console.error("Mass delete error:", error);
      await alert({ message: "Failed to delete trades: " + error.message, type: 'error' });
      return;
    }

    // Update local state
    ids.forEach(id => updateTradeLocally(id, { deleted: true }));
    setShowMassDelete(false);
    setMassDeletePlatform("ALL");
    await alert({ message: `Successfully deleted ${ids.length} trades`, type: 'success' });
  }

  // 🔥 Use Supabase setups list for the Setup filter dropdown (like Analytics)
  const uniqueSetups = Array.from(
    new Set(
      ["No setup", ...setups.map((s: any) => s.name ?? "No setup")]
    )
  );

  // ==========================================
  // BULK SELECTION
  // ==========================================
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [lastSelectedId, setLastSelectedId] = useState<string | null>(null);

  function handleSelectAll(e: React.ChangeEvent<HTMLInputElement>) {
    if (e.target.checked) {
      setSelectedIds(new Set(filteredTrades.map((t) => t.id)));
    } else {
      setSelectedIds(new Set());
    }
  }

  function handleSelect(id: string, e: React.MouseEvent | React.ChangeEvent) {
    // Handle Shift+Click
    if ((e as React.MouseEvent).shiftKey && lastSelectedId) {
      const startIdx = filteredTrades.findIndex(t => t.id === lastSelectedId);
      const endIdx = filteredTrades.findIndex(t => t.id === id);

      if (startIdx !== -1 && endIdx !== -1) {
        const min = Math.min(startIdx, endIdx);
        const max = Math.max(startIdx, endIdx);
        const range = filteredTrades.slice(min, max + 1).map(t => t.id);

        setSelectedIds(prev => {
          const next = new Set(prev);
          range.forEach(rid => next.add(rid));
          return next;
        });
        return;
      }
    }

    // Normal toggle
    setLastSelectedId(id);
    setSelectedIds(prev => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  async function deleteSelected() {
    if (selectedIds.size === 0) return;

    const confirmed = await confirm({
      title: "Delete Selected Trades",
      message: `Delete ${selectedIds.size} selected trades?`,
      type: 'danger',
      confirmText: 'Delete',
    });
    if (!confirmed) return;

    const ids = Array.from(selectedIds);
    const { error } = await supabase.from("trades").delete().in("id", ids);

    if (error) {
      console.error("Bulk delete error:", error);
      await alert({ message: "Failed to delete trades", type: 'error' });
      return;
    }

    // Update local state
    ids.forEach(id => updateTradeLocally(id, { deleted: true }));
    setSelectedIds(new Set());
    setLastSelectedId(null);
  }

  // Stats calculations
  const stats = useMemo(() => {
    if (filteredTrades.length === 0) return { totalTrades: 0, wins: 0, winRate: 0, totalPnL: 0, avgPnL: 0 };

    const wins = filteredTrades.filter(t => (t.pnl_usd || 0) > 0).length;
    const totalPnL = filteredTrades.reduce((acc, t) => acc + (t.pnl_usd || 0), 0);

    return {
      totalTrades: filteredTrades.length,
      wins,
      winRate: (wins / filteredTrades.length) * 100,
      totalPnL,
      avgPnL: totalPnL / filteredTrades.length
    };
  }, [filteredTrades]);

  return (
    <div className="min-h-screen" style={{ backgroundColor: '#1D1A16' }}>
      <div style={{
        maxWidth: '1400px',
        margin: '0 auto',
        padding: isMobile ? '24px 16px' : isTablet ? '32px 20px' : '48px 24px'
      }}>

        {/* HEADER SECTION */}
        <div className="mb-10">
          <div style={{
            display: 'flex',
            flexDirection: isMobile ? 'column' : 'row',
            justifyContent: 'space-between',
            alignItems: isMobile ? 'flex-start' : 'flex-start',
            marginBottom: isMobile ? '16px' : '32px',
            gap: isMobile ? '16px' : '0'
          }}>
            <div>
              <h1 style={{
                fontSize: isMobile ? '28px' : '36px',
                fontWeight: '700',
                color: '#F5C76D',
                marginBottom: '8px',
                letterSpacing: '0.5px'
              }}>
                Trade History
              </h1>
              <p style={{
                fontSize: isMobile ? '11px' : '13px',
                color: '#8B7355',
                fontWeight: '500',
                letterSpacing: '0.5px',
                textTransform: 'uppercase'
              }}>
                Review and manage your trading activity
              </p>
            </div>
            <div style={{
              display: 'flex',
              gap: isMobile ? '8px' : '12px',
              alignItems: 'center',
              flexWrap: isMobile ? 'wrap' : 'nowrap',
              width: isMobile ? '100%' : 'auto'
            }}>
              <button
                onClick={() => setShowLeverageSettings(true)}
                style={{
                  padding: '8px 18px',
                  backgroundColor: '#F5C76D',
                  color: '#1D1A16',
                  border: 'none',
                  borderRadius: '8px',
                  fontSize: '13px',
                  fontWeight: '700',
                  cursor: 'pointer',
                  transition: 'all 200ms',
                  letterSpacing: '0.3px'
                }}
                onMouseEnter={(e) => {
                  (e.target as HTMLButtonElement).style.transform = 'translateY(-2px)';
                  (e.target as HTMLButtonElement).style.boxShadow = '0 4px 12px rgba(245, 199, 109, 0.4)';
                }}
                onMouseLeave={(e) => {
                  (e.target as HTMLButtonElement).style.transform = 'translateY(0)';
                  (e.target as HTMLButtonElement).style.boxShadow = 'none';
                }}
              >
                ⚙️ Set Leverage
              </button>
              <button
                onClick={() => setShowMassDelete(true)}
                style={{
                  padding: '8px 18px',
                  backgroundColor: 'rgba(239, 68, 68, 0.15)',
                  color: '#ef4444',
                  border: '1px solid rgba(239, 68, 68, 0.3)',
                  borderRadius: '8px',
                  fontSize: '13px',
                  fontWeight: '700',
                  cursor: 'pointer',
                  transition: 'all 200ms',
                  letterSpacing: '0.3px'
                }}
                onMouseEnter={(e) => {
                  (e.target as HTMLButtonElement).style.backgroundColor = 'rgba(239, 68, 68, 0.25)';
                  (e.target as HTMLButtonElement).style.borderColor = 'rgba(239, 68, 68, 0.5)';
                }}
                onMouseLeave={(e) => {
                  (e.target as HTMLButtonElement).style.backgroundColor = 'rgba(239, 68, 68, 0.15)';
                  (e.target as HTMLButtonElement).style.borderColor = 'rgba(239, 68, 68, 0.3)';
                }}
              >
                🗑️ Mass Delete
              </button>
              {selectedIds.size > 0 && (
                <button
                  onClick={deleteSelected}
                  style={{
                    padding: '10px 20px',
                    backgroundColor: 'rgba(239, 68, 68, 0.15)',
                    color: '#ef4444',
                    border: '1px solid rgba(239, 68, 68, 0.3)',
                    borderRadius: '8px',
                    fontSize: '14px',
                    fontWeight: '600',
                    cursor: 'pointer',
                    transition: 'all 200ms',
                  }}
                  onMouseEnter={(e) => {
                    (e.target as HTMLButtonElement).style.backgroundColor = 'rgba(239, 68, 68, 0.25)';
                    (e.target as HTMLButtonElement).style.borderColor = 'rgba(239, 68, 68, 0.5)';
                  }}
                  onMouseLeave={(e) => {
                    (e.target as HTMLButtonElement).style.backgroundColor = 'rgba(239, 68, 68, 0.15)';
                    (e.target as HTMLButtonElement).style.borderColor = 'rgba(239, 68, 68, 0.3)';
                  }}
                >
                  Delete Selected ({selectedIds.size})
                </button>
              )}
            </div>
          </div>

          {/* STATS BAR */}
          <div style={{
            display: 'grid',
            gridTemplateColumns: isMobile ? 'repeat(2, 1fr)' : 'repeat(4, 1fr)',
            gap: isMobile ? '10px' : '16px',
            marginBottom: isMobile ? '16px' : '24px'
          }}>
            {[
              { label: 'Total Trades', value: stats.totalTrades, color: '#F5C76D' },
              { label: 'Win Rate', value: `${stats.winRate.toFixed(1)}%`, color: stats.winRate >= 50 ? '#10b981' : '#ef4444' },
              { label: 'Total PnL', value: `$${stats.totalPnL.toFixed(2)}`, color: stats.totalPnL >= 0 ? '#10b981' : '#ef4444' },
              { label: 'Avg PnL', value: `$${stats.avgPnL.toFixed(2)}`, color: stats.avgPnL >= 0 ? '#10b981' : '#ef4444' }
            ].map((stat, idx) => (
              <div key={idx} style={{
                backgroundColor: 'rgba(37, 30, 23, 0.4)',
                border: '1px solid rgba(212, 165, 69, 0.15)',
                borderRadius: '12px',
                padding: '16px',
                transition: 'all 200ms'
              }}
              onMouseEnter={(e) => {
                const el = e.currentTarget as HTMLDivElement;
                el.style.backgroundColor = 'rgba(37, 30, 23, 0.6)';
                el.style.borderColor = 'rgba(212, 165, 69, 0.25)';
              }}
              onMouseLeave={(e) => {
                const el = e.currentTarget as HTMLDivElement;
                el.style.backgroundColor = 'rgba(37, 30, 23, 0.4)';
                el.style.borderColor = 'rgba(212, 165, 69, 0.15)';
              }}
              >
                <div style={{
                  fontSize: '11px',
                  color: '#8B7355',
                  fontWeight: '600',
                  letterSpacing: '0.5px',
                  textTransform: 'uppercase',
                  marginBottom: '8px'
                }}>
                  {stat.label}
                </div>
                <div style={{
                  fontSize: '24px',
                  fontWeight: '700',
                  color: stat.color,
                  fontFamily: 'monospace'
                }}>
                  {stat.value}
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* LEVERAGE SETTINGS SECTION */}
        {/* {userId && uniqueSymbols.length > 0 && (
          <LeverageSettings userId={userId} symbols={uniqueSymbols} />
        )} */}

        {/* FILTERS SECTION */}
        <div style={{
          backgroundColor: 'rgba(37, 30, 23, 0.5)',
          border: '1px solid rgba(212, 165, 69, 0.15)',
          borderRadius: '12px',
          padding: '20px',
          marginBottom: '24px',
          backdropFilter: 'blur(10px)'
        }}>
          <div style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
            gap: '16px',
            alignItems: 'flex-end'
          }}>
            {/* Time Range - Calendar Picker */}
            <div style={{ position: 'relative' }}>
              <label style={{
                fontSize: '11px',
                color: '#8B7355',
                fontWeight: '600',
                letterSpacing: '0.5px',
                textTransform: 'uppercase',
                marginBottom: '8px',
                display: 'block'
              }}>
                Time Range
              </label>
              <button
                onClick={() => setShowDatePicker(!showDatePicker)}
                style={{
                  width: '100%',
                  padding: '10px 12px',
                  backgroundColor: 'rgba(37, 30, 23, 0.6)',
                  border: '1px solid rgba(212, 165, 69, 0.2)',
                  borderRadius: '8px',
                  color: '#C2B280',
                  fontSize: '13px',
                  fontWeight: '500',
                  cursor: 'pointer',
                  transition: 'all 200ms',
                  textAlign: 'left',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between'
                }}
                onMouseEnter={(e) => {
                  (e.target as HTMLButtonElement).style.borderColor = 'rgba(212, 165, 69, 0.4)';
                  (e.target as HTMLButtonElement).style.backgroundColor = 'rgba(37, 30, 23, 0.8)';
                }}
                onMouseLeave={(e) => {
                  (e.target as HTMLButtonElement).style.borderColor = 'rgba(212, 165, 69, 0.2)';
                  (e.target as HTMLButtonElement).style.backgroundColor = 'rgba(37, 30, 23, 0.6)';
                }}
              >
                <span style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <span>📅</span>
                  {getDateRangeDisplayText()}
                </span>
                <span style={{ opacity: 0.6 }}>▼</span>
              </button>

              {/* Date Picker Popup */}
              {showDatePicker && (
                <div style={{
                  position: 'absolute',
                  top: '100%',
                  left: 0,
                  marginTop: '8px',
                  backgroundColor: '#251E17',
                  border: '1px solid rgba(212, 165, 69, 0.3)',
                  borderRadius: '12px',
                  padding: '16px',
                  zIndex: 100,
                  minWidth: '280px',
                  boxShadow: '0 10px 40px rgba(0, 0, 0, 0.5)'
                }}>
                  {/* Quick Select Buttons */}
                  <div style={{ marginBottom: '16px' }}>
                    <div style={{
                      fontSize: '10px',
                      color: '#8B7355',
                      fontWeight: '600',
                      letterSpacing: '0.5px',
                      textTransform: 'uppercase',
                      marginBottom: '8px'
                    }}>
                      Quick Select
                    </div>
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '6px' }}>
                      {[
                        { label: '7D', days: 7 },
                        { label: '30D', days: 30 },
                        { label: '90D', days: 90 },
                        { label: '180D', days: 180 }
                      ].map((option) => (
                        <button
                          key={option.days}
                          onClick={() => setDateRangeByDays(option.days)}
                          style={{
                            padding: '8px 10px',
                            backgroundColor: 'rgba(245, 199, 109, 0.1)',
                            border: '1px solid rgba(245, 199, 109, 0.2)',
                            borderRadius: '6px',
                            color: '#F5C76D',
                            fontSize: '12px',
                            fontWeight: '600',
                            cursor: 'pointer',
                            transition: 'all 200ms'
                          }}
                          onMouseEnter={(e) => {
                            (e.target as HTMLButtonElement).style.backgroundColor = 'rgba(245, 199, 109, 0.2)';
                            (e.target as HTMLButtonElement).style.borderColor = 'rgba(245, 199, 109, 0.4)';
                          }}
                          onMouseLeave={(e) => {
                            (e.target as HTMLButtonElement).style.backgroundColor = 'rgba(245, 199, 109, 0.1)';
                            (e.target as HTMLButtonElement).style.borderColor = 'rgba(245, 199, 109, 0.2)';
                          }}
                        >
                          {option.label}
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* Custom Date Range */}
                  <div style={{ marginBottom: '16px' }}>
                    <div style={{
                      fontSize: '10px',
                      color: '#8B7355',
                      fontWeight: '600',
                      letterSpacing: '0.5px',
                      textTransform: 'uppercase',
                      marginBottom: '8px'
                    }}>
                      Custom Range
                    </div>
                    <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
                      <input
                        type="date"
                        value={dateRangeStart}
                        onChange={(e) => setDateRangeStart(e.target.value)}
                        style={{
                          flex: 1,
                          padding: '8px 10px',
                          backgroundColor: 'rgba(37, 30, 23, 0.8)',
                          border: '1px solid rgba(212, 165, 69, 0.2)',
                          borderRadius: '6px',
                          color: '#C2B280',
                          fontSize: '12px',
                          cursor: 'pointer'
                        }}
                      />
                      <span style={{ color: '#8B7355', fontSize: '12px' }}>to</span>
                      <input
                        type="date"
                        value={dateRangeEnd}
                        onChange={(e) => setDateRangeEnd(e.target.value)}
                        style={{
                          flex: 1,
                          padding: '8px 10px',
                          backgroundColor: 'rgba(37, 30, 23, 0.8)',
                          border: '1px solid rgba(212, 165, 69, 0.2)',
                          borderRadius: '6px',
                          color: '#C2B280',
                          fontSize: '12px',
                          cursor: 'pointer'
                        }}
                      />
                    </div>
                  </div>

                  {/* Action Buttons */}
                  <div style={{ display: 'flex', gap: '8px' }}>
                    <button
                      onClick={clearDateRange}
                      style={{
                        flex: 1,
                        padding: '8px 12px',
                        backgroundColor: 'rgba(239, 68, 68, 0.1)',
                        border: '1px solid rgba(239, 68, 68, 0.2)',
                        borderRadius: '6px',
                        color: '#ef4444',
                        fontSize: '12px',
                        fontWeight: '600',
                        cursor: 'pointer',
                        transition: 'all 200ms'
                      }}
                      onMouseEnter={(e) => {
                        (e.target as HTMLButtonElement).style.backgroundColor = 'rgba(239, 68, 68, 0.2)';
                      }}
                      onMouseLeave={(e) => {
                        (e.target as HTMLButtonElement).style.backgroundColor = 'rgba(239, 68, 68, 0.1)';
                      }}
                    >
                      Clear
                    </button>
                    <button
                      onClick={() => setShowDatePicker(false)}
                      style={{
                        flex: 1,
                        padding: '8px 12px',
                        backgroundColor: '#F5C76D',
                        border: 'none',
                        borderRadius: '6px',
                        color: '#1D1A16',
                        fontSize: '12px',
                        fontWeight: '700',
                        cursor: 'pointer',
                        transition: 'all 200ms'
                      }}
                      onMouseEnter={(e) => {
                        (e.target as HTMLButtonElement).style.opacity = '0.9';
                      }}
                      onMouseLeave={(e) => {
                        (e.target as HTMLButtonElement).style.opacity = '1';
                      }}
                    >
                      Apply
                    </button>
                  </div>
                </div>
              )}
            </div>

            {/* Coin Filter */}
            <div>
              <label style={{
                fontSize: '11px',
                color: '#8B7355',
                fontWeight: '600',
                letterSpacing: '0.5px',
                textTransform: 'uppercase',
                marginBottom: '8px',
                display: 'block'
              }}>
                Coin
              </label>
              <select
                value={coinFilter}
                onChange={(e) => setCoinFilter(e.target.value)}
                style={{
                  width: '100%',
                  padding: '10px 12px',
                  backgroundColor: 'rgba(37, 30, 23, 0.6)',
                  border: '1px solid rgba(212, 165, 69, 0.2)',
                  borderRadius: '8px',
                  color: '#C2B280',
                  fontSize: '13px',
                  fontWeight: '500',
                  cursor: 'pointer',
                  transition: 'all 200ms'
                }}
                onFocus={(e) => {
                  (e.target as HTMLSelectElement).style.borderColor = 'rgba(212, 165, 69, 0.4)';
                  (e.target as HTMLSelectElement).style.backgroundColor = 'rgba(37, 30, 23, 0.8)';
                }}
                onBlur={(e) => {
                  (e.target as HTMLSelectElement).style.borderColor = 'rgba(212, 165, 69, 0.2)';
                  (e.target as HTMLSelectElement).style.backgroundColor = 'rgba(37, 30, 23, 0.6)';
                }}
              >
                <option value="ALL">All Coins</option>
                {uniqueCoins.map((sym) => (
                  <option key={sym} value={sym}>
                    {sym}
                  </option>
                ))}
              </select>
            </div>

            {/* Setup Filter */}
            <div>
              <label style={{
                fontSize: '11px',
                color: '#8B7355',
                fontWeight: '600',
                letterSpacing: '0.5px',
                textTransform: 'uppercase',
                marginBottom: '8px',
                display: 'block'
              }}>
                Setup
              </label>
              <select
                value={setupFilter}
                onChange={(e) => setSetupFilter(e.target.value)}
                style={{
                  width: '100%',
                  padding: '10px 12px',
                  backgroundColor: 'rgba(37, 30, 23, 0.6)',
                  border: '1px solid rgba(212, 165, 69, 0.2)',
                  borderRadius: '8px',
                  color: '#C2B280',
                  fontSize: '13px',
                  fontWeight: '500',
                  cursor: 'pointer',
                  transition: 'all 200ms'
                }}
                onFocus={(e) => {
                  (e.target as HTMLSelectElement).style.borderColor = 'rgba(212, 165, 69, 0.4)';
                  (e.target as HTMLSelectElement).style.backgroundColor = 'rgba(37, 30, 23, 0.8)';
                }}
                onBlur={(e) => {
                  (e.target as HTMLSelectElement).style.borderColor = 'rgba(212, 165, 69, 0.2)';
                  (e.target as HTMLSelectElement).style.backgroundColor = 'rgba(37, 30, 23, 0.6)';
                }}
              >
                <option value="ALL">All Setups</option>
                {uniqueSetups.map((name) => (
                  <option key={name}>{name}</option>
                ))}
              </select>
            </div>

            {/* Sort */}
            <div>
              <label style={{
                fontSize: '11px',
                color: '#8B7355',
                fontWeight: '600',
                letterSpacing: '0.5px',
                textTransform: 'uppercase',
                marginBottom: '8px',
                display: 'block'
              }}>
                Sort By
              </label>
              <select
                value={sortKey}
                onChange={(e) => setSortKey(e.target.value)}
                style={{
                  width: '100%',
                  padding: '10px 12px',
                  backgroundColor: 'rgba(37, 30, 23, 0.6)',
                  border: '1px solid rgba(212, 165, 69, 0.2)',
                  borderRadius: '8px',
                  color: '#C2B280',
                  fontSize: '13px',
                  fontWeight: '500',
                  cursor: 'pointer',
                  transition: 'all 200ms'
                }}
                onFocus={(e) => {
                  (e.target as HTMLSelectElement).style.borderColor = 'rgba(212, 165, 69, 0.4)';
                  (e.target as HTMLSelectElement).style.backgroundColor = 'rgba(37, 30, 23, 0.8)';
                }}
                onBlur={(e) => {
                  (e.target as HTMLSelectElement).style.borderColor = 'rgba(212, 165, 69, 0.2)';
                  (e.target as HTMLSelectElement).style.backgroundColor = 'rgba(37, 30, 23, 0.6)';
                }}
              >
                <option value="DATE">Date (Latest)</option>
                <option value="SYMBOL">Symbol</option>
                <option value="SIDE">Side</option>
                <option value="SETUP">Setup</option>
                <option value="PNL">PnL $ (Highest)</option>
                <option value="PNLPCT">PnL % (Highest)</option>
              </select>
            </div>
          </div>
        </div>

        {/* TRADES LIST */}
        {filteredTrades.length === 0 ? (
          <div style={{
            textAlign: 'center',
            padding: isMobile ? '40px 16px' : '60px 20px',
            color: '#8B7355'
          }}>
            <div style={{
              fontSize: isMobile ? '16px' : '18px',
              marginBottom: '8px',
              fontWeight: '500'
            }}>
              No trades found
            </div>
            <div style={{
              fontSize: isMobile ? '12px' : '13px',
              color: '#6B5344'
            }}>
              Try adjusting your filters or add a new trade
            </div>
          </div>
        ) : (
          <div
            className={isMobile ? 'table-scroll-wrapper' : ''}
            style={{
              display: 'grid',
              gap: isMobile ? '8px' : '12px',
              minWidth: isMobile ? '800px' : 'auto'
            }}
          >
            {filteredTrades.map((t: any) => {
              const pnlUsd = t.pnl_usd || 0;

              // Calculate PnL percentage dynamically based on current leverage
              const positionValue = (t.entry_price ?? t.entry ?? 0) * (t.quantity ?? t.size ?? 0);
              const marginUsed = positionValue / (t.leverage ?? 1);
              const pnlPercent = marginUsed > 0 ? (pnlUsd / marginUsed) * 100 : 0;
              const pnl = { pnlUsd, pnlPercent };

              const entry = t.entry_price ?? t.entry ?? 0;
              const risk = computeRiskMetrics({
                side: t.side,
                entry: entry,
                size: t.quantity ?? t.size ?? 0,
                leverage: t.leverage,
                fees: t.fees,
                exchange: t.exchange || "BINANCE",
              });

              const isSelected = selectedIds.has(t.id);
              const isWin = pnl.pnlUsd > 0;

              return (
                <div
                  key={t.id}
                  onClick={(e) => {
                    if ((e.target as HTMLElement).tagName !== 'BUTTON' && (e.target as HTMLElement).tagName !== 'INPUT') {
                      handleSelect(t.id, e);
                    }
                  }}
                  style={{
                    backgroundColor: isSelected ? 'rgba(212, 165, 69, 0.1)' : 'rgba(37, 30, 23, 0.3)',
                    border: isSelected ? '1px solid rgba(212, 165, 69, 0.3)' : '1px solid rgba(212, 165, 69, 0.12)',
                    borderRadius: '12px',
                    padding: '16px',
                    transition: 'all 200ms',
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '16px',
                  }}
                  onMouseEnter={(e) => {
                    (e.currentTarget as HTMLDivElement).style.backgroundColor = 'rgba(37, 30, 23, 0.5)';
                    (e.currentTarget as HTMLDivElement).style.borderColor = 'rgba(212, 165, 69, 0.2)';
                  }}
                  onMouseLeave={(e) => {
                    (e.currentTarget as HTMLDivElement).style.backgroundColor = isSelected ? 'rgba(212, 165, 69, 0.1)' : 'rgba(37, 30, 23, 0.3)';
                    (e.currentTarget as HTMLDivElement).style.borderColor = isSelected ? 'rgba(212, 165, 69, 0.3)' : 'rgba(212, 165, 69, 0.12)';
                  }}
                >
                  {/* Checkbox */}
                  <input
                    type="checkbox"
                    checked={isSelected}
                    onChange={(e) => handleSelect(t.id, e)}
                    onClick={(e) => e.stopPropagation()}
                    style={{
                      width: '18px',
                      height: '18px',
                      cursor: 'pointer',
                      accentColor: '#D4AF37',
                      flexShrink: 0
                    }}
                  />

                  {/* Main Trade Info */}
                  <div style={{
                    flex: 1,
                    display: 'flex',
                    gap: '24px',
                    alignItems: 'center',
                    minWidth: 0
                  }}>
                    {/* Date & Symbol */}
                    <div style={{
                      minWidth: '140px'
                    }}>
                      <div style={{
                        fontSize: '13px',
                        fontWeight: '600',
                        color: '#C2B280',
                        marginBottom: '4px'
                      }}>
                        {getTradeDate(t).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
                      </div>
                      <div style={{
                        fontSize: '16px',
                        fontWeight: '700',
                        color: '#F5C76D'
                      }}>
                        {t.symbol}
                      </div>
                    </div>

                    {/* Side & Setup */}
                    <div style={{
                      minWidth: '120px'
                    }}>
                      <div style={{
                        fontSize: '11px',
                        color: '#8B7355',
                        fontWeight: '600',
                        letterSpacing: '0.5px',
                        textTransform: 'uppercase',
                        marginBottom: '4px'
                      }}>
                        {t.side === 'LONG' || t.side === 'BUY' ? 'BUY' : 'SELL'}
                      </div>
                      <div style={{
                        fontSize: '13px',
                        fontWeight: '600',
                        color: t.side === 'LONG' || t.side === 'BUY' ? '#10b981' : '#ef4444'
                      }}>
                        {t.side === 'LONG' || t.side === 'BUY' ? 'LONG' : 'SHORT'}
                      </div>
                      {t.setup_name && (
                        <div style={{
                          fontSize: '10px',
                          color: '#8B7355',
                          marginTop: '4px'
                        }}>
                          {t.setup_name}
                        </div>
                      )}
                    </div>

                    {/* Entry / Exit */}
                    <div style={{
                      minWidth: '140px'
                    }}>
                      <div style={{
                        fontSize: '10px',
                        color: '#8B7355',
                        fontWeight: '600',
                        letterSpacing: '0.5px',
                        textTransform: 'uppercase',
                        marginBottom: '4px'
                      }}>
                        Entry / Exit
                      </div>
                      <div style={{
                        fontSize: '13px',
                        fontFamily: 'monospace',
                        color: '#C2B280'
                      }}>
                        {(t.entry_price ?? t.entry ?? 0).toFixed(2)} / {(t.exit_price ?? t.exit ?? 0).toFixed(2)}
                      </div>
                    </div>

                    {/* Size & Leverage */}
                    <div style={{
                      minWidth: '120px'
                    }}>
                      <div style={{
                        fontSize: '10px',
                        color: '#8B7355',
                        fontWeight: '600',
                        letterSpacing: '0.5px',
                        textTransform: 'uppercase',
                        marginBottom: '4px'
                      }}>
                        Size / Lev
                      </div>
                      <div style={{
                        fontSize: '13px',
                        fontFamily: 'monospace',
                        color: '#C2B280'
                      }}>
                        ${(((t.entry_price ?? t.entry ?? 0) * (t.quantity ?? t.size ?? 0)) / (t.leverage ?? 1)).toFixed(2)} / {t.leverage ?? 1}x
                      </div>
                    </div>

                    {/* PnL */}
                    <div style={{
                      minWidth: '160px',
                      textAlign: 'right'
                    }}>
                      <div style={{
                        fontSize: '11px',
                        color: '#8B7355',
                        fontWeight: '600',
                        letterSpacing: '0.5px',
                        textTransform: 'uppercase',
                        marginBottom: '4px'
                      }}>
                        Profit/Loss
                      </div>
                      <div style={{
                        fontSize: '14px',
                        fontWeight: '700',
                        fontFamily: 'monospace',
                        color: isWin ? '#10b981' : '#ef4444',
                        marginBottom: '4px'
                      }}>
                        {isWin ? '+' : ''}{pnl.pnlUsd.toFixed(2)}
                      </div>
                      <div style={{
                        fontSize: '12px',
                        fontWeight: '600',
                        fontFamily: 'monospace',
                        color: isWin ? '#10b981' : '#ef4444',
                        opacity: 0.8
                      }}>
                        {pnl.pnlPercent.toFixed(2)}%
                      </div>
                      {t.exchange && (
                        <div style={{
                          fontSize: '10px',
                          fontWeight: '500',
                          color: '#8B7355',
                          marginTop: '4px',
                          textTransform: 'capitalize'
                        }}>
                          {t.exchange}
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Action Buttons */}
                  <div style={{
                    display: 'flex',
                    gap: '8px',
                    flexShrink: 0,
                    opacity: 1
                  }}>
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        setActiveTrade(t);
                        setNoteText(t.notes || "");
                      }}
                      style={{
                        padding: '8px 14px',
                        backgroundColor: 'rgba(212, 165, 69, 0.12)',
                        color: '#F5C76D',
                        border: '1px solid rgba(212, 165, 69, 0.2)',
                        borderRadius: '6px',
                        fontSize: '12px',
                        fontWeight: '600',
                        cursor: 'pointer',
                        transition: 'all 200ms',
                        whiteSpace: 'nowrap'
                      }}
                      onMouseEnter={(e) => {
                        (e.target as HTMLButtonElement).style.backgroundColor = 'rgba(212, 165, 69, 0.2)';
                        (e.target as HTMLButtonElement).style.borderColor = 'rgba(212, 165, 69, 0.4)';
                      }}
                      onMouseLeave={(e) => {
                        (e.target as HTMLButtonElement).style.backgroundColor = 'rgba(212, 165, 69, 0.12)';
                        (e.target as HTMLButtonElement).style.borderColor = 'rgba(212, 165, 69, 0.2)';
                      }}
                    >
                      Notes
                    </button>
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        setEditTrade(t);
                        // Format date as YYYY-MM-DD for display
                        const dateValue = t.entry_time || t.date;
                        const formattedDate = dateValue ? new Date(dateValue).toISOString().split('T')[0] : '';
                        setEditForm({
                          date: formattedDate,
                          symbol: t.symbol,
                          side: t.side,
                          entry: t.entry_price ?? t.entry,
                          exit: t.exit_price ?? t.exit,
                          size: t.quantity ?? t.size,
                          leverage: t.leverage,
                          fees: t.fees,
                          exchange: t.exchange || "other",
                          setup_id: t.setup_id || "",
                          notes: t.notes || "",
                        });
                      }}
                      style={{
                        padding: '8px 14px',
                        backgroundColor: 'rgba(59, 130, 246, 0.1)',
                        color: '#3b82f6',
                        border: '1px solid rgba(59, 130, 246, 0.2)',
                        borderRadius: '6px',
                        fontSize: '12px',
                        fontWeight: '600',
                        cursor: 'pointer',
                        transition: 'all 200ms',
                        whiteSpace: 'nowrap'
                      }}
                      onMouseEnter={(e) => {
                        (e.target as HTMLButtonElement).style.backgroundColor = 'rgba(59, 130, 246, 0.2)';
                        (e.target as HTMLButtonElement).style.borderColor = 'rgba(59, 130, 246, 0.4)';
                      }}
                      onMouseLeave={(e) => {
                        (e.target as HTMLButtonElement).style.backgroundColor = 'rgba(59, 130, 246, 0.1)';
                        (e.target as HTMLButtonElement).style.borderColor = 'rgba(59, 130, 246, 0.2)';
                      }}
                    >
                      Edit
                    </button>
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        deleteTrade(t.id);
                      }}
                      style={{
                        padding: '8px 14px',
                        backgroundColor: 'rgba(239, 68, 68, 0.1)',
                        color: '#ef4444',
                        border: '1px solid rgba(239, 68, 68, 0.2)',
                        borderRadius: '6px',
                        fontSize: '12px',
                        fontWeight: '600',
                        cursor: 'pointer',
                        transition: 'all 200ms',
                        whiteSpace: 'nowrap'
                      }}
                      onMouseEnter={(e) => {
                        (e.target as HTMLButtonElement).style.backgroundColor = 'rgba(239, 68, 68, 0.2)';
                        (e.target as HTMLButtonElement).style.borderColor = 'rgba(239, 68, 68, 0.4)';
                      }}
                      onMouseLeave={(e) => {
                        (e.target as HTMLButtonElement).style.backgroundColor = 'rgba(239, 68, 68, 0.1)';
                        (e.target as HTMLButtonElement).style.borderColor = 'rgba(239, 68, 68, 0.2)';
                      }}
                    >
                      Delete
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* ===================================================================== */}
      {/* NOTES MODAL */}
      {/* ===================================================================== */}
      {activeTrade && (
        <div style={{
          position: 'fixed',
          inset: 0,
          backgroundColor: 'rgba(0, 0, 0, 0.8)',
          display: 'flex',
          justifyContent: 'center',
          alignItems: 'center',
          zIndex: 1000,
          backdropFilter: 'blur(4px)',
          padding: '16px'
        }}>
          <div style={{
            backgroundColor: '#251E17',
            border: '1px solid rgba(212, 165, 69, 0.15)',
            borderRadius: '16px',
            padding: '32px',
            width: '100%',
            maxWidth: '500px',
            boxShadow: '0 20px 60px rgba(0, 0, 0, 0.8)'
          }}>
            <div style={{
              fontSize: '20px',
              fontWeight: '700',
              color: '#F5C76D',
              marginBottom: '16px'
            }}>
              Trade Notes
            </div>
            <div style={{
              fontSize: '13px',
              color: '#8B7355',
              marginBottom: '20px',
              fontWeight: '500'
            }}>
              {activeTrade.symbol} <span style={{
                color: activeTrade.side === 'LONG' || activeTrade.side === 'BUY' ? '#10b981' : '#ef4444',
                fontWeight: '600'
              }}>
                {activeTrade.side === 'LONG' || activeTrade.side === 'BUY' ? 'LONG' : 'SHORT'}
              </span>
            </div>
            <textarea
              value={noteText}
              onChange={(e) => setNoteText(e.target.value)}
              style={{
                width: '100%',
                height: '160px',
                backgroundColor: 'rgba(37, 30, 23, 0.6)',
                border: '1px solid rgba(212, 165, 69, 0.15)',
                borderRadius: '8px',
                padding: '12px',
                color: '#C2B280',
                fontSize: '13px',
                fontFamily: 'monospace',
                resize: 'none',
                marginBottom: '24px',
                transition: 'all 200ms'
              }}
              onFocus={(e) => {
                (e.target as HTMLTextAreaElement).style.borderColor = 'rgba(212, 165, 69, 0.4)';
                (e.target as HTMLTextAreaElement).style.backgroundColor = 'rgba(37, 30, 23, 0.8)';
              }}
              onBlur={(e) => {
                (e.target as HTMLTextAreaElement).style.borderColor = 'rgba(212, 165, 69, 0.15)';
                (e.target as HTMLTextAreaElement).style.backgroundColor = 'rgba(37, 30, 23, 0.6)';
              }}
              placeholder="Enter your notes here..."
            />
            <div style={{
              display: 'flex',
              gap: '12px'
            }}>
              <button
                onClick={saveNote}
                style={{
                  flex: 1,
                  padding: '12px 16px',
                  backgroundColor: '#F5C76D',
                  color: '#1D1A16',
                  border: 'none',
                  borderRadius: '8px',
                  fontSize: '13px',
                  fontWeight: '700',
                  cursor: 'pointer',
                  transition: 'all 200ms'
                }}
                onMouseEnter={(e) => {
                  (e.target as HTMLButtonElement).style.opacity = '0.9';
                  (e.target as HTMLButtonElement).style.transform = 'translateY(-2px)';
                }}
                onMouseLeave={(e) => {
                  (e.target as HTMLButtonElement).style.opacity = '1';
                  (e.target as HTMLButtonElement).style.transform = 'translateY(0)';
                }}
              >
                Save Notes
              </button>
              <button
                onClick={() => setActiveTrade(null)}
                style={{
                  flex: 1,
                  padding: '12px 16px',
                  backgroundColor: 'rgba(37, 30, 23, 0.6)',
                  color: '#C2B280',
                  border: '1px solid rgba(212, 165, 69, 0.15)',
                  borderRadius: '8px',
                  fontSize: '13px',
                  fontWeight: '600',
                  cursor: 'pointer',
                  transition: 'all 200ms'
                }}
                onMouseEnter={(e) => {
                  (e.target as HTMLButtonElement).style.backgroundColor = 'rgba(37, 30, 23, 0.8)';
                }}
                onMouseLeave={(e) => {
                  (e.target as HTMLButtonElement).style.backgroundColor = 'rgba(37, 30, 23, 0.6)';
                }}
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ===================================================================== */}
      {/* EDIT TRADE MODAL */}
      {/* ===================================================================== */}
      {editTrade && (
        <div style={{
          position: 'fixed',
          inset: 0,
          backgroundColor: 'rgba(0, 0, 0, 0.8)',
          display: 'flex',
          justifyContent: 'center',
          alignItems: 'center',
          zIndex: 1000,
          backdropFilter: 'blur(4px)',
          padding: '20px'
        }}>
          <div style={{
            backgroundColor: '#251E17',
            border: '1px solid rgba(212, 165, 69, 0.15)',
            borderRadius: '16px',
            padding: '26px 32px 28px',
            width: '100%',
            maxWidth: '900px',
            boxShadow: '0 20px 60px rgba(0, 0, 0, 0.8)'
          }}>
            <div style={{
              fontSize: '20px',
              fontWeight: '700',
              color: '#F5C76D',
              marginBottom: '20px'
            }}>
              Edit Trade
            </div>

            <div style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(3, 1fr)',
              gap: '18px 28px',
              marginBottom: '18px'
            }}>
              {[
                { label: 'Date', key: 'date', type: 'text', placeholder: 'YYYY-MM-DD' },
                { label: 'Symbol', key: 'symbol', type: 'text' },
                { label: 'Side', key: 'side', type: 'select', options: ['LONG', 'SHORT'] },
                { label: 'Entry', key: 'entry', type: 'number' },
                { label: 'Exit', key: 'exit', type: 'number' },
                { label: 'Size (USD)', key: 'size', type: 'number' },
                { label: 'Leverage', key: 'leverage', type: 'number' },
                { label: 'Fees', key: 'fees', type: 'number' },
                { label: 'Exchange', key: 'exchange', type: 'select', options: ['binance', 'blofin', 'bybit', 'hyperliquid', 'okx', 'other'] },
              ].map((field) => (
                <div key={field.key}>
                  <label style={{
                    fontSize: '11px',
                    color: '#8B7355',
                    fontWeight: '600',
                    letterSpacing: '0.5px',
                    textTransform: 'uppercase',
                    marginBottom: '8px',
                    display: 'block'
                  }}>
                    {field.label}
                  </label>
                  {field.type === 'select' ? (
                    <select
                      value={editForm[field.key]}
                      onChange={(e) =>
                        setEditForm((f: any) => ({ ...f, [field.key]: e.target.value }))
                      }
                      style={{
                        width: '100%',
                        padding: '12px 14px',
                        backgroundColor: 'rgba(37, 30, 23, 0.6)',
                        border: '1px solid rgba(212, 165, 69, 0.15)',
                        borderRadius: '8px',
                        color: '#C2B280',
                        fontSize: '13px',
                        fontWeight: '500',
                        cursor: 'pointer',
                        transition: 'all 200ms'
                      }}
                      onFocus={(e) => {
                        (e.target as HTMLSelectElement).style.borderColor = 'rgba(212, 165, 69, 0.4)';
                        (e.target as HTMLSelectElement).style.backgroundColor = 'rgba(37, 30, 23, 0.8)';
                      }}
                      onBlur={(e) => {
                        (e.target as HTMLSelectElement).style.borderColor = 'rgba(212, 165, 69, 0.15)';
                        (e.target as HTMLSelectElement).style.backgroundColor = 'rgba(37, 30, 23, 0.6)';
                      }}
                    >
                      {(field.options || []).map((opt) => (
                        <option key={opt} value={opt}>
                          {opt}
                        </option>
                      ))}
                    </select>
                  ) : (
                    <input
                      type={field.type}
                      value={editForm[field.key]}
                      onChange={(e) =>
                        setEditForm((f: any) => ({ ...f, [field.key]: e.target.value }))
                      }
                      placeholder={field.placeholder || ''}
                      style={{
                        width: '100%',
                        padding: '12px 14px',
                        backgroundColor: 'rgba(37, 30, 23, 0.6)',
                        border: '1px solid rgba(212, 165, 69, 0.15)',
                        borderRadius: '8px',
                        color: '#C2B280',
                        fontSize: '13px',
                        fontWeight: '500',
                        transition: 'all 200ms'
                      }}
                      onFocus={(e) => {
                        (e.target as HTMLInputElement).style.borderColor = 'rgba(212, 165, 69, 0.4)';
                        (e.target as HTMLInputElement).style.backgroundColor = 'rgba(37, 30, 23, 0.8)';
                      }}
                      onBlur={(e) => {
                        (e.target as HTMLInputElement).style.borderColor = 'rgba(212, 165, 69, 0.15)';
                        (e.target as HTMLInputElement).style.backgroundColor = 'rgba(37, 30, 23, 0.6)';
                      }}
                    />
                  )}
                </div>
              ))}
            </div>

            <div style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(2, 1fr)',
              gap: '18px 28px',
              marginBottom: '18px'
            }}>
              <div>
                <label style={{
                  fontSize: '11px',
                  color: '#8B7355',
                  fontWeight: '600',
                  letterSpacing: '0.5px',
                  textTransform: 'uppercase',
                  marginBottom: '8px',
                  display: 'block'
                }}>
                  Setup
                </label>
                <select
                  value={editForm.setup_id}
                  onChange={(e) =>
                    setEditForm((f: any) => ({ ...f, setup_id: e.target.value }))
                  }
                  style={{
                    width: '100%',
                    padding: '12px 14px',
                    backgroundColor: 'rgba(37, 30, 23, 0.6)',
                    border: '1px solid rgba(212, 165, 69, 0.15)',
                    borderRadius: '8px',
                    color: '#C2B280',
                    fontSize: '13px',
                    fontWeight: '500',
                    cursor: 'pointer',
                    transition: 'all 200ms'
                  }}
                  onFocus={(e) => {
                    (e.target as HTMLSelectElement).style.borderColor = 'rgba(212, 165, 69, 0.4)';
                    (e.target as HTMLSelectElement).style.backgroundColor = 'rgba(37, 30, 23, 0.8)';
                  }}
                  onBlur={(e) => {
                    (e.target as HTMLSelectElement).style.borderColor = 'rgba(212, 165, 69, 0.15)';
                    (e.target as HTMLSelectElement).style.backgroundColor = 'rgba(37, 30, 23, 0.6)';
                  }}
                >
                  <option value="">No Setup</option>
                  {setups.map((s) => (
                    <option key={s.id} value={s.id}>
                      {s.name}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label style={{
                  fontSize: '11px',
                  color: '#8B7355',
                  fontWeight: '600',
                  letterSpacing: '0.5px',
                  textTransform: 'uppercase',
                  marginBottom: '8px',
                  display: 'block'
                }}>
                  Notes
                </label>
                <textarea
                  value={editForm.notes}
                  onChange={(e) =>
                    setEditForm((f: any) => ({ ...f, notes: e.target.value }))
                  }
                  style={{
                    width: '100%',
                    padding: '12px 14px',
                    backgroundColor: 'rgba(37, 30, 23, 0.6)',
                    border: '1px solid rgba(212, 165, 69, 0.15)',
                    borderRadius: '8px',
                    color: '#C2B280',
                    fontSize: '13px',
                    fontWeight: '500',
                    height: '90px',
                    resize: 'none',
                    fontFamily: 'inherit',
                    transition: 'all 200ms'
                  }}
                  onFocus={(e) => {
                    (e.target as HTMLTextAreaElement).style.borderColor = 'rgba(212, 165, 69, 0.4)';
                    (e.target as HTMLTextAreaElement).style.backgroundColor = 'rgba(37, 30, 23, 0.8)';
                  }}
                  onBlur={(e) => {
                    (e.target as HTMLTextAreaElement).style.borderColor = 'rgba(212, 165, 69, 0.15)';
                    (e.target as HTMLTextAreaElement).style.backgroundColor = 'rgba(37, 30, 23, 0.6)';
                  }}
                />
              </div>
            </div>

            <div style={{
              display: 'flex',
              gap: '16px'
            }}>
              <button
                onClick={saveEditedTrade}
                style={{
                  flex: 1,
                  padding: '12px 16px',
                  backgroundColor: '#F5C76D',
                  color: '#1D1A16',
                  border: 'none',
                  borderRadius: '8px',
                  fontSize: '13px',
                  fontWeight: '700',
                  cursor: 'pointer',
                  transition: 'all 200ms'
                }}
                onMouseEnter={(e) => {
                  (e.target as HTMLButtonElement).style.opacity = '0.9';
                  (e.target as HTMLButtonElement).style.transform = 'translateY(-2px)';
                }}
                onMouseLeave={(e) => {
                  (e.target as HTMLButtonElement).style.opacity = '1';
                  (e.target as HTMLButtonElement).style.transform = 'translateY(0)';
                }}
              >
                Save Changes
              </button>
              <button
                onClick={() => setEditTrade(null)}
                style={{
                  flex: 1,
                  padding: '12px 16px',
                  backgroundColor: 'rgba(37, 30, 23, 0.6)',
                  color: '#C2B280',
                  border: '1px solid rgba(212, 165, 69, 0.15)',
                  borderRadius: '8px',
                  fontSize: '13px',
                  fontWeight: '600',
                  cursor: 'pointer',
                  transition: 'all 200ms'
                }}
                onMouseEnter={(e) => {
                  (e.target as HTMLButtonElement).style.backgroundColor = 'rgba(37, 30, 23, 0.8)';
                }}
                onMouseLeave={(e) => {
                  (e.target as HTMLButtonElement).style.backgroundColor = 'rgba(37, 30, 23, 0.6)';
                }}
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ===================================================================== */}
      {/* LEVERAGE SETTINGS MODAL */}
      {/* ===================================================================== */}
      {showLeverageSettings && userId && (
        <LeverageSettings
          userId={userId}
          symbols={uniqueCoins}
          onClose={() => setShowLeverageSettings(false)}
        />
      )}

      {/* ===================================================================== */}
      {/* MASS DELETE MODAL */}
      {/* ===================================================================== */}
      {showMassDelete && (
        <div style={{
          position: 'fixed',
          inset: 0,
          backgroundColor: 'rgba(0, 0, 0, 0.8)',
          display: 'flex',
          justifyContent: 'center',
          alignItems: 'center',
          zIndex: 1000,
          backdropFilter: 'blur(4px)',
          padding: '16px'
        }}>
          <div style={{
            backgroundColor: '#251E17',
            border: '1px solid rgba(239, 68, 68, 0.3)',
            borderRadius: '16px',
            padding: '32px',
            width: '100%',
            maxWidth: '450px',
            boxShadow: '0 20px 60px rgba(0, 0, 0, 0.8)'
          }}>
            <div style={{
              fontSize: '20px',
              fontWeight: '700',
              color: '#ef4444',
              marginBottom: '8px',
              display: 'flex',
              alignItems: 'center',
              gap: '10px'
            }}>
              <span>⚠️</span> Mass Delete Trades
            </div>
            <div style={{
              fontSize: '13px',
              color: '#8B7355',
              marginBottom: '24px',
              lineHeight: '1.5'
            }}>
              This action is <strong style={{ color: '#ef4444' }}>permanent</strong> and cannot be undone.
              Select which trades you want to delete.
            </div>

            {/* Platform Selection */}
            <div style={{ marginBottom: '24px' }}>
              <label style={{
                fontSize: '11px',
                color: '#8B7355',
                fontWeight: '600',
                letterSpacing: '0.5px',
                textTransform: 'uppercase',
                marginBottom: '10px',
                display: 'block'
              }}>
                Select Trades to Delete
              </label>

              {/* All Trades Option */}
              <div
                onClick={() => setMassDeletePlatform("ALL")}
                style={{
                  padding: '14px 16px',
                  backgroundColor: massDeletePlatform === "ALL" ? 'rgba(239, 68, 68, 0.15)' : 'rgba(37, 30, 23, 0.6)',
                  border: massDeletePlatform === "ALL" ? '2px solid rgba(239, 68, 68, 0.5)' : '1px solid rgba(212, 165, 69, 0.15)',
                  borderRadius: '8px',
                  marginBottom: '8px',
                  cursor: 'pointer',
                  transition: 'all 200ms',
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center'
                }}
              >
                <div>
                  <div style={{ fontSize: '14px', fontWeight: '600', color: massDeletePlatform === "ALL" ? '#ef4444' : '#C2B280' }}>
                    🗑️ All Trades
                  </div>
                  <div style={{ fontSize: '11px', color: '#8B7355', marginTop: '2px' }}>
                    Delete everything - all platforms
                  </div>
                </div>
                <div style={{
                  fontSize: '16px',
                  fontWeight: '700',
                  color: massDeletePlatform === "ALL" ? '#ef4444' : '#F5C76D',
                  fontFamily: 'monospace'
                }}>
                  {getTradeCountByPlatform("ALL")} trades
                </div>
              </div>

              {/* Platform Options */}
              {uniquePlatforms.length > 0 && (
                <div style={{
                  fontSize: '10px',
                  color: '#8B7355',
                  fontWeight: '600',
                  letterSpacing: '0.5px',
                  textTransform: 'uppercase',
                  margin: '16px 0 10px 0'
                }}>
                  Or delete by platform
                </div>
              )}

              <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                {uniquePlatforms.map((platform) => (
                  <div
                    key={platform}
                    onClick={() => setMassDeletePlatform(platform)}
                    style={{
                      padding: '12px 16px',
                      backgroundColor: massDeletePlatform === platform ? 'rgba(239, 68, 68, 0.15)' : 'rgba(37, 30, 23, 0.6)',
                      border: massDeletePlatform === platform ? '2px solid rgba(239, 68, 68, 0.5)' : '1px solid rgba(212, 165, 69, 0.15)',
                      borderRadius: '8px',
                      cursor: 'pointer',
                      transition: 'all 200ms',
                      display: 'flex',
                      justifyContent: 'space-between',
                      alignItems: 'center'
                    }}
                  >
                    <div style={{
                      fontSize: '13px',
                      fontWeight: '600',
                      color: massDeletePlatform === platform ? '#ef4444' : '#C2B280',
                      textTransform: 'capitalize'
                    }}>
                      {platform}
                    </div>
                    <div style={{
                      fontSize: '13px',
                      fontWeight: '600',
                      color: massDeletePlatform === platform ? '#ef4444' : '#F5C76D',
                      fontFamily: 'monospace'
                    }}>
                      {getTradeCountByPlatform(platform)} trades
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Warning Box */}
            <div style={{
              padding: '12px 16px',
              backgroundColor: 'rgba(239, 68, 68, 0.1)',
              border: '1px solid rgba(239, 68, 68, 0.2)',
              borderRadius: '8px',
              marginBottom: '24px'
            }}>
              <div style={{ fontSize: '12px', color: '#ef4444', lineHeight: '1.5' }}>
                <strong>Warning:</strong> You will be asked to type a confirmation before deletion.
                This helps prevent accidental data loss.
              </div>
            </div>

            {/* Action Buttons */}
            <div style={{ display: 'flex', gap: '12px' }}>
              <button
                onClick={() => { setShowMassDelete(false); setMassDeletePlatform("ALL"); }}
                style={{
                  flex: 1,
                  padding: '12px 16px',
                  backgroundColor: 'rgba(37, 30, 23, 0.6)',
                  color: '#C2B280',
                  border: '1px solid rgba(212, 165, 69, 0.15)',
                  borderRadius: '8px',
                  fontSize: '13px',
                  fontWeight: '600',
                  cursor: 'pointer',
                  transition: 'all 200ms'
                }}
                onMouseEnter={(e) => {
                  (e.target as HTMLButtonElement).style.backgroundColor = 'rgba(37, 30, 23, 0.8)';
                }}
                onMouseLeave={(e) => {
                  (e.target as HTMLButtonElement).style.backgroundColor = 'rgba(37, 30, 23, 0.6)';
                }}
              >
                Cancel
              </button>
              <button
                onClick={massDeleteTrades}
                style={{
                  flex: 1,
                  padding: '12px 16px',
                  backgroundColor: '#ef4444',
                  color: '#fff',
                  border: 'none',
                  borderRadius: '8px',
                  fontSize: '13px',
                  fontWeight: '700',
                  cursor: 'pointer',
                  transition: 'all 200ms'
                }}
                onMouseEnter={(e) => {
                  (e.target as HTMLButtonElement).style.backgroundColor = '#dc2626';
                }}
                onMouseLeave={(e) => {
                  (e.target as HTMLButtonElement).style.backgroundColor = '#ef4444';
                }}
              >
                Delete {getTradeCountByPlatform(massDeletePlatform)} Trades
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
