
// src/pages/DashboardPage.tsx
import React, { useState, useEffect, useMemo } from "react";
import CsvUploadModal from "../components/CsvUploadModal";
import ExchangeSelector from "../components/trades/ExchangeSelector";
import { computeRiskMetrics } from "../utils/riskEngine";
import { supabase } from "../lib/supabase";
import SetupManager from "../components/trades/SetupManager";
import MonthlyCalendar from "../components/dashboard/MonthlyCalendar";
import WeeklyHeatmap from "../components/dashboard/WeeklyHeatmap";
import calculatePnL from "../utils/calcPnl";
import { getEvents, createEvent, type CalendarEvent } from "../api/calendar";
import AddEventModal from "../components/modals/AddEventModal";
import { WalletoLogo } from "../components/common/WalletoLogo";
import { Spotlight, GoldDust } from "../components/common/Effects";
import { DashboardGrid } from '../components/dashboard/DashboardGrid';
import YtdPanel from '../components/dashboard/YtdPanel';
import DayDetailModal from '../components/modals/DayDetailModal';
import AddTradeModal from "../components/modals/AddTradeModal";
import { useResponsive } from "../hooks/useResponsive";
import { useModals } from "../components/modals/CustomModals";

const TOP_SYMBOLS = [
  "BTC", "ETH", "SOL", "XRP", "BNB", "DOGE", "ADA", "AVAX", "LINK", "DOT",
  "TRX", "MATIC", "ARB", "APT", "FTM", "NEAR", "INJ", "AAVE", "ATOM", "ETC",
  "FIL", "EGLD", "RUNE", "LTC", "PYTH", "TIA", "SUI", "WIF", "PEPE", "COMP", "GMX",
];

type Setup = {
  id: string;
  name: string;
};

interface DashboardPageProps {
  user: any;
  trades: any[];
  setTrades: (trades: any[]) => void;
  setups: any[];
  setSetups: (setups: any[]) => void;
  saveTrade: (t: any) => Promise<void> | void;
  saveManyTrades: (rows: any[]) => Promise<void> | void;
  createSetup: (name: string) => void | Promise<void>;
  deleteSetup: (id: string) => void | Promise<void>;
}

// ... existing code ...

export default function DashboardPage({
  user,
  trades,
  setTrades,
  setups,
  setSetups,
  saveTrade,
  saveManyTrades,
  createSetup,
  deleteSetup,
}: DashboardPageProps) {
  const { isMobile, isTablet } = useResponsive();
  const { confirm } = useModals();
  const [exchange, setExchange] = useState("BINANCE");

  const [form, setForm] = useState({
    date: "",
    symbol: "",
    side: "LONG",
    entry: "",
    exit: "",
    size: "",
    leverage: "1",
    fees: "0",
    setupId: "",
    stopLoss: "",
    takeProfit: "",
  });

  // Calendar / analytics state
  const today = new Date();
  const [calendarYear, setCalendarYear] = useState(today.getFullYear());
  const [calendarMonth, setCalendarMonth] = useState(today.getMonth());

  const [calendarCoinFilter, setCalendarCoinFilter] = useState("ALL");
  const [calendarSetupFilter, setCalendarSetupFilter] = useState("ALL");
  const [calendarSideFilter, setCalendarSideFilter] = useState("ALL");

  const [selectedDayKey, setSelectedDayKey] = useState<string | null>(null);

  // Calendar Events
  const [events, setEvents] = useState<CalendarEvent[]>([]);
  const [showSystemEvents, setShowSystemEvents] = useState(true);

  useEffect(() => {
    if (user) {
      loadEvents();
    }
  }, [user]);

  async function loadEvents() {
    try {
      const data = await getEvents();
      setEvents(data);
    } catch (err) {
      console.error("Failed to load events", err);
    }
  }





  const [isAddTradeModalOpen, setIsAddTradeModalOpen] = useState(false);
  const [isEventModalOpen, setIsEventModalOpen] = useState(false);
  const [isSetupModalOpen, setIsSetupModalOpen] = useState(false);
  const [isCsvModalOpen, setIsCsvModalOpen] = useState(false);
  const [newSetupName, setNewSetupName] = useState("");

  async function handleSaveEvent(title: string, event_date: string) {
    await createEvent({ title, event_date });
    loadEvents();
  }

  async function handleCreateSetup() {
    if (!newSetupName.trim()) return;
    await createSetup(newSetupName);
    setNewSetupName("");
    setIsSetupModalOpen(false);
  }

  async function handleDeleteSetup(setupId: string) {
    const confirmed = await confirm({
      title: "Delete Setup",
      message: "Are you sure you want to delete this setup? Trades using this setup will become unlinked.",
      type: 'danger',
      confirmText: 'Delete',
    });
    if (confirmed) {
      await deleteSetup(setupId);
    }
  }

  // ----------------------------
  // LIVE RISK CALCULATION
  // ----------------------------
  const liveRisk = computeRiskMetrics({
    side: form.side as "LONG" | "SHORT",
    entry: Number(form.entry),
    size: Number(form.size),
    leverage: Number(form.leverage),
    fees: Number(form.fees),
    exchange,
  });

  // ----------------------------
  // SUBMIT TRADE
  // ----------------------------
  async function submitTrade() {
    if (!form.symbol || !form.entry || !form.exit || !form.size) return;

    await saveTrade({
      date: form.date || new Date().toISOString(),
      symbol: form.symbol,
      side: form.side,
      entry: Number(form.entry),
      exit: Number(form.exit),
      size: Number(form.size),
      leverage: Number(form.leverage),
      fees: Number(form.fees),
      setup_id: form.setupId || null,
      stop_loss: form.stopLoss ? Number(form.stopLoss) : null,
      take_profit: form.takeProfit ? Number(form.takeProfit) : null,
    });

    setForm({
      date: "",
      symbol: "",
      side: "LONG",
      entry: "",
      exit: "",
      size: "",
      leverage: "1",
      fees: "0",
      setupId: "",
      stopLoss: "",
      takeProfit: "",
    });
  }



  // ------------------------------------
  // CALENDAR FILTERED TRADES
  // ------------------------------------
  const calendarFilteredTrades = useMemo(() => {
    let result = trades || [];

    if (calendarCoinFilter !== "ALL") {
      result = result.filter((t: any) => t.symbol === calendarCoinFilter);
    }

    if (calendarSetupFilter !== "ALL") {
      result = result.filter(
        (t: any) => (t.setup_name || "No setup") === calendarSetupFilter
      );
    }

    if (calendarSideFilter !== "ALL") {
      result = result.filter((t: any) => t.side === calendarSideFilter);
    }

    return result;
  }, [trades, calendarCoinFilter, calendarSetupFilter, calendarSideFilter]);

  const uniqueCoins = useMemo(
    () =>
      Array.from(new Set((trades || []).map((t: any) => t.symbol))).filter(
        Boolean
      ),
    [trades]
  );

  // 🔥 Use Supabase setups (same as Analytics / Trades)
  const uniqueSetups = useMemo(
    () =>
      Array.from(
        new Set(
          ["No setup", ...setups.map((s: Setup) => s.name ?? "No setup")]
        )
      ),
    [setups]
  );

  // Day trades for the modal
  const dayTrades = useMemo(() => {
    if (!selectedDayKey) return [];
    return calendarFilteredTrades.filter((t: any) => {
      const tradeDate = t.entry_time || t.date;
      if (!tradeDate) return false;
      const d = new Date(tradeDate);
      if (isNaN(d.getTime())) return false;
      const key = d.toISOString().slice(0, 10);
      return key === selectedDayKey;
    });
  }, [selectedDayKey, calendarFilteredTrades]);

  function goPrevMonth() {
    setCalendarMonth((prev) => {
      if (prev === 0) {
        setCalendarYear((y) => y - 1);
        return 11;
      }
      return prev - 1;
    });
  }

  function goNextMonth() {
    setCalendarMonth((prev) => {
      if (prev === 11) {
        setCalendarYear((y) => y + 1);
        return 0;
      }
      return prev + 1;
    });
  }

  // Remove redundant loadData since trades are passed as props
  // useEffect(() => {
  //   loadData();
  // }, [user]);

  // ----------------------------
  // WIDGET DATA PREP
  // ----------------------------

  // Weekly Stats Calculation
  const weeklyStats = useMemo(() => {
    const now = new Date();
    const day = now.getDay(); // 0 is Sunday
    const diff = now.getDate() - day + (day === 0 ? -6 : 1); // adjust when day is sunday
    const monday = new Date(now.getFullYear(), now.getMonth(), diff, 0, 0, 0, 0);

    const weeklyTrades = trades.filter(t => {
      const tradeDate = t.entry_time || t.date;
      if (!tradeDate) return false;
      const d = new Date(tradeDate);
      return d >= monday;
    });
    const totalTrades = weeklyTrades.length;
    const totalPnl = weeklyTrades.reduce((acc, t) => acc + (t.pnl_usd || 0), 0);
    const winningTrades = weeklyTrades.filter(t => (t.pnl_usd || 0) > 0);
    const losingTrades = weeklyTrades.filter(t => (t.pnl_usd || 0) <= 0);

    const wins = winningTrades.length;
    const losses = losingTrades.length;

    const winRate = totalTrades ? (wins / totalTrades) * 100 : 0;
    const avgReturn = totalTrades ? totalPnl / totalTrades : 0;

    const totalWinPnl = winningTrades.reduce((acc, t) => acc + (t.pnl_usd || 0), 0);
    const totalLossPnl = losingTrades.reduce((acc, t) => acc + (t.pnl_usd || 0), 0);

    const avgWin = wins ? totalWinPnl / wins : 0;
    const avgLoss = losses ? Math.abs(totalLossPnl / losses) : 0;

    // Expectancy = (Win Rate x Avg Win) - (Loss Rate x Avg Loss)
    const lossRate = 100 - winRate;
    const expectancy = ((winRate / 100) * avgWin) - ((lossRate / 100) * avgLoss);

    // Profit Factor = Gross Profit / Gross Loss
    const profitFactor = Math.abs(totalLossPnl) > 0 ? totalWinPnl / Math.abs(totalLossPnl) : totalWinPnl > 0 ? Infinity : 0;

    // Sharpe Ratio (Simplified: Avg Return / Std Dev)
    // Calculate Standard Deviation of Returns
    const returns = weeklyTrades.map(t => t.pnl_usd || 0);
    const variance = returns.reduce((acc, val) => acc + Math.pow(val - avgReturn, 2), 0) / (totalTrades || 1);
    const stdDev = Math.sqrt(variance);
    const sharpe = stdDev ? avgReturn / stdDev : 0;

    return { totalTrades, totalPnl, winRate, avgReturn, avgWin, avgLoss, expectancy, sharpe, profitFactor };
  }, [trades]);

  // All Time Stats Calculation (Fallback)
  const allTimeStats = useMemo(() => {
    const totalTrades = trades.length;
    const totalPnl = trades.reduce((acc, t) => acc + (t.pnl_usd || 0), 0);
    const winningTrades = trades.filter(t => (t.pnl_usd || 0) > 0);
    const losingTrades = trades.filter(t => (t.pnl_usd || 0) <= 0);

    const wins = winningTrades.length;
    const losses = losingTrades.length;

    const winRate = totalTrades ? (wins / totalTrades) * 100 : 0;
    const avgReturn = totalTrades ? totalPnl / totalTrades : 0;

    const totalWinPnl = winningTrades.reduce((acc, t) => acc + (t.pnl_usd || 0), 0);
    const totalLossPnl = losingTrades.reduce((acc, t) => acc + (t.pnl_usd || 0), 0);

    const avgWin = wins ? totalWinPnl / wins : 0;
    const avgLoss = losses ? Math.abs(totalLossPnl / losses) : 0;

    // Expectancy
    const lossRate = 100 - winRate;
    const expectancy = ((winRate / 100) * avgWin) - ((lossRate / 100) * avgLoss);

    // Profit Factor
    const profitFactor = Math.abs(totalLossPnl) > 0 ? totalWinPnl / Math.abs(totalLossPnl) : totalWinPnl > 0 ? Infinity : 0;

    // Sharpe Ratio
    const returns = trades.map(t => t.pnl_usd || 0);
    const variance = returns.reduce((acc, val) => acc + Math.pow(val - avgReturn, 2), 0) / (totalTrades || 1);
    const stdDev = Math.sqrt(variance);
    const sharpe = stdDev ? avgReturn / stdDev : 0;

    return { totalTrades, totalPnl, winRate, avgReturn, avgWin, avgLoss, expectancy, sharpe, profitFactor };
  }, [trades]);

  // Determine which stats to show
  const displayStats = weeklyStats.totalTrades > 0 ? weeklyStats : allTimeStats;
  const pnlData = useMemo(() => {
    const dailyMap = new Map<string, number>();

    trades.forEach(t => {
      const tradeDate = t.entry_time || t.date;
      if (!tradeDate || isNaN(new Date(tradeDate).getTime())) return;
      const dateKey = new Date(tradeDate).toISOString().split('T')[0];
      const pnl = Number(t.pnl_usd) || 0;
      dailyMap.set(dateKey, (dailyMap.get(dateKey) || 0) + pnl);
    });

    return Array.from(dailyMap.entries())
      .map(([date, pnl]) => ({ date, pnl }))
      .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());
  }, [trades]);



  return (
    <div className="min-h-screen text-white font-sans overflow-x-hidden relative selection:bg-leather-accent/30 selection:text-white">
      <div className="w-full relative z-10" style={{
        maxWidth: '1400px',
        margin: '0 auto',
        padding: isMobile ? '12px 16px 32px 16px' : isTablet ? '16px 20px 40px 20px' : '16px 24px 48px 24px'
      }}>
        <div className="mb-8">
          <div style={{
            display: 'flex',
            flexDirection: isMobile ? 'column' : 'row',
            justifyContent: 'space-between',
            alignItems: isMobile ? 'flex-start' : 'center',
            marginBottom: isMobile ? '16px' : '24px',
            gap: isMobile ? '16px' : '0'
          }}>
            <div className="flex items-center gap-4">
              <div className="bg-leather-800 rounded-xl border border-leather-700 shadow-lg" style={{
                padding: isMobile ? '8px' : '12px'
              }}>
                <WalletoLogo className={`filter drop-shadow-lg ${isMobile ? 'w-8 h-8' : 'w-10 h-10'}`} />
              </div>
              <h1 className="text-gradient font-serif font-bold tracking-tight m-0" style={{
                fontSize: isMobile ? '1.75rem' : '2.25rem'
              }}>
                Dashboard
              </h1>
            </div>
            <div style={{
              display: 'flex',
              gap: isMobile ? '8px' : '24px',
              width: isMobile ? '100%' : 'auto',
              flexWrap: isMobile ? 'wrap' : 'nowrap'
            }}>
              <button
                className="btn bg-leather-accent text-leather-900 hover:bg-leather-accent/90 font-bold rounded shadow-md transition-all"
                onClick={() => setIsSetupModalOpen(true)}
                style={{
                  padding: isMobile ? '10px 12px' : '8px 16px',
                  fontSize: isMobile ? '12px' : '14px',
                  flex: isMobile ? '1' : 'none'
                }}
              >
                {isMobile ? 'Setups' : 'Setup Manager'}
              </button>
              <button
                className="btn bg-leather-accent text-leather-900 hover:bg-leather-accent/90 font-bold rounded shadow-md transition-all"
                onClick={() => setIsCsvModalOpen(true)}
                style={{
                  padding: isMobile ? '10px 12px' : '8px 16px',
                  fontSize: isMobile ? '12px' : '14px',
                  flex: isMobile ? '1' : 'none'
                }}
              >
                {isMobile ? 'Import' : 'Import CSV'}
              </button>
            </div>
          </div>

          <DashboardGrid
            trades={trades}
            stats={allTimeStats}
            pnlData={pnlData}
            year={calendarYear}
            onDayClick={setSelectedDayKey}
            onAddTradeClick={() => setIsAddTradeModalOpen(true)}
          />

          {/* Day Detail Modal */}
          <DayDetailModal
            dayKey={selectedDayKey}
            trades={dayTrades}
            onClose={() => setSelectedDayKey(null)}
          />

          <AddTradeModal
            isOpen={isAddTradeModalOpen}
            onClose={() => setIsAddTradeModalOpen(false)}
            onSave={saveTrade}
            setups={setups}
            exchange={exchange}
          />

          {/* CSV Upload Modal */}
          <CsvUploadModal
            isOpen={isCsvModalOpen}
            onClose={() => setIsCsvModalOpen(false)}
            onUpload={saveManyTrades}
          />

          {/* Setup Manager Modal */}
          {isSetupModalOpen && (
            <div style={{
              position: 'fixed',
              inset: 0,
              backgroundColor: 'rgba(0, 0, 0, 0.8)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              zIndex: 1000,
              backdropFilter: 'blur(4px)',
              padding: '20px',
            }}>
              <div style={{
                backgroundColor: '#251E17',
                borderRadius: '16px',
                border: '1px solid rgba(212, 165, 69, 0.15)',
                padding: '32px',
                maxWidth: '500px',
                width: '100%',
                maxHeight: '90vh',
                overflowY: 'auto',
                boxShadow: '0 20px 60px rgba(0, 0, 0, 0.8)',
              }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px' }}>
                  <h2 style={{ fontSize: '24px', fontWeight: '700', color: '#F5C76D', margin: 0 }}>
                    Setup Manager
                  </h2>
                  <button
                    onClick={() => setIsSetupModalOpen(false)}
                    style={{
                      padding: '8px 16px',
                      backgroundColor: 'rgba(37, 30, 23, 0.6)',
                      color: '#C2B280',
                      border: '1px solid rgba(212, 165, 69, 0.15)',
                      borderRadius: '8px',
                      fontSize: '13px',
                      fontWeight: '600',
                      cursor: 'pointer',
                    }}
                  >
                    Close
                  </button>
                </div>
                <p style={{ fontSize: '13px', color: '#8B7355', marginBottom: '24px', marginTop: 0 }}>
                  Create and manage your trading setups to categorize your trades.
                </p>

                {/* Add New Setup */}
                <div style={{
                  backgroundColor: 'rgba(37, 30, 23, 0.4)',
                  border: '1px solid rgba(212, 165, 69, 0.15)',
                  borderRadius: '12px',
                  padding: '20px',
                  marginBottom: '24px',
                }}>
                  <h3 style={{ fontSize: '16px', fontWeight: '600', color: '#F5C76D', marginBottom: '16px', marginTop: 0 }}>
                    Add New Setup
                  </h3>
                  <div style={{ marginBottom: '12px' }}>
                    <label style={{ fontSize: '11px', color: '#8B7355', fontWeight: '600', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                      Setup Name
                    </label>
                  </div>
                  <div style={{ display: 'flex', gap: '12px' }}>
                    <input
                      type="text"
                      value={newSetupName}
                      onChange={(e) => setNewSetupName(e.target.value)}
                      placeholder="e.g., Scalping, Swing Trade..."
                      style={{
                        flex: 1,
                        padding: '12px',
                        backgroundColor: 'rgba(37, 30, 23, 0.6)',
                        border: '1px solid rgba(212, 165, 69, 0.2)',
                        borderRadius: '8px',
                        color: '#C2B280',
                        fontSize: '13px',
                        fontWeight: '500',
                        outline: 'none',
                      }}
                      onKeyPress={(e) => {
                        if (e.key === 'Enter') {
                          handleCreateSetup();
                        }
                      }}
                    />
                    <button
                      onClick={handleCreateSetup}
                      style={{
                        padding: '12px 20px',
                        backgroundColor: '#F5C76D',
                        border: 'none',
                        color: '#1D1A16',
                        borderRadius: '8px',
                        cursor: 'pointer',
                        fontWeight: '700',
                        fontSize: '14px',
                        transition: 'all 200ms',
                      }}
                    >
                      Add Setup
                    </button>
                  </div>
                </div>

                {/* Existing Setups */}
                <div>
                  <h3 style={{ fontSize: '16px', fontWeight: '600', color: '#F5C76D', marginBottom: '16px', marginTop: 0 }}>
                    Current Setups
                  </h3>
                  {setups.length === 0 ? (
                    <div style={{ textAlign: 'center', padding: '40px', color: '#8B7355' }}>
                      No setups yet. Create one to get started!
                    </div>
                  ) : (
                    <div style={{ display: 'grid', gap: '12px' }}>
                      {setups.map((setup) => (
                        <div
                          key={setup.id}
                          style={{
                            backgroundColor: 'rgba(37, 30, 23, 0.3)',
                            border: '1px solid rgba(212, 165, 69, 0.12)',
                            borderRadius: '12px',
                            padding: '16px',
                            display: 'flex',
                            justifyContent: 'space-between',
                            alignItems: 'center',
                          }}
                        >
                          <div style={{ fontSize: '14px', fontWeight: '600', color: '#F5C76D' }}>
                            {setup.name}
                          </div>
                          <button
                            onClick={() => handleDeleteSetup(setup.id)}
                            style={{
                              padding: '8px 16px',
                              backgroundColor: 'rgba(239, 68, 68, 0.1)',
                              color: '#ef4444',
                              border: '1px solid rgba(239, 68, 68, 0.2)',
                              borderRadius: '6px',
                              fontSize: '12px',
                              fontWeight: '600',
                              cursor: 'pointer',
                            }}
                          >
                            Delete
                          </button>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            </div>
          )}

        </div>
      </div>
    </div>
  );
}
