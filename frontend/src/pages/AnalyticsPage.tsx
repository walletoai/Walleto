// src/pages/AnalyticsPage.tsx
import { useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { WIDGET_REGISTRY, type WidgetType } from "../components/analytics/AnalyticsWidgetRegistry";
import { WidgetMenu } from "../components/analytics/WidgetMenu";
import { AnalyticsPageContainer } from "../components/analytics/AnalyticsPageContainer";
import { AnalyticsPageNavigation, type AnalyticsPageType } from "../components/analytics/AnalyticsPageNavigation";

type RangeKey = "ALL" | "WEEK" | "MONTH" | "YEAR";

type Props = {
  trades: any[];
  setups: any[]; // 🔥 added to support full setup list
};

export default function AnalyticsPage({ trades, setups }: Props) {
  const [range, setRange] = useState<RangeKey>("ALL");
  const [timeWindow, setTimeWindow] = useState("ALL");
  const [coinFilter, setCoinFilter] = useState("ALL");
  const [setupFilter, setSetupFilter] = useState("ALL");

  const [activeWidgets, setActiveWidgets] = useState<WidgetType[]>([
    'PERFORMANCE_SUMMARY',
    'EQUITY_CURVE',
    'SYMBOL_BREAKDOWN', // Using as Stats Panel proxy for now
    'MONTHLY_HEATSTICK',
    'ASSET_PNL_BREAKDOWN',
    'TRADE_OUTCOME_DISTRIBUTION',
    'RISK_REWARD_SCATTER', // Using as Risk Gauge proxy
    'TIME_OF_DAY_PROFITABILITY',
    'REGIME_DETECTION',
    'TRADE_FREQUENCY_VS_PNL'
  ]);
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [activePage, setActivePage] = useState<AnalyticsPageType>("performance");

  const parseDate = (t: any) => {
    // Use entry_time for Blofin trades, fall back to date
    const dateStr = t.entry_time || t.date;
    if (dateStr) {
      const d = new Date(dateStr);
      if (!isNaN(d.getTime())) return d;
    }
    return new Date();
  };

  // ============================================================
  // Main analytics calculations (UNCHANGED)
  // ============================================================
  const {
    filtered,
    summary,
    equitySeries,
    drawdownSeries,
    dailySeries,
    longShort,
    extras,
  } = useMemo(() => {
    if (!trades || trades.length === 0) {
      return {
        filtered: [],
        summary: { totalTrades: 0, totalPnl: 0, winRate: 0 },
        equitySeries: [],
        drawdownSeries: [],
        dailySeries: [],
        symbolSeries: [],
        longShort: { longPnl: 0, shortPnl: 0 },
        extras: {
          bestTrade: null,
          worstTrade: null,
          avgPnl: 0,
          avgWin: 0,
          avgLoss: 0,
          maxDrawdown: 0,
          symbolStats: [] as any[],
          setupStats: [] as any[],
        },
      };
    }

    // Attach date objects
    let result = trades.map((t: any) => ({
      ...t,
      _dateObj: parseDate(t),
    }));

    // CUSTOM TIME WINDOW
    if (timeWindow !== "ALL") {
      const days = Number(timeWindow);
      const cutoff = new Date();
      cutoff.setDate(cutoff.getDate() - days);
      result = result.filter((t) => t._dateObj >= cutoff);
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

    // BUILT-IN TIME RANGES
    const now = new Date();
    let start: Date | null = null;

    if (range === "WEEK") {
      start = new Date(now);
      start.setDate(start.getDate() - 7);
    } else if (range === "MONTH") {
      start = new Date(now);
      start.setMonth(start.getMonth() - 1);
    } else if (range === "YEAR") {
      start = new Date(now);
      start.setFullYear(start.getFullYear() - 1);
    }

    if (start) {
      result = result.filter((t) => t._dateObj >= start!);
    }

    // Sort by date
    result.sort((a, b) => a._dateObj.getTime() - b._dateObj.getTime());

    // METRICS
    let running = 0;
    let peak = 0;
    let maxDrawdown = 0;

    const equityMap = new Map<string, number>();
    const drawdownMap = new Map<string, number>();
    const dailyMap = new Map<string, number>();
    const symbolMap = new Map<string, number>();
    const symbolStatsMap = new Map<
      string,
      { pnl: number; trades: number; wins: number }
    >();
    const setupStatsMap = new Map<
      string,
      { pnl: number; trades: number; wins: number }
    >();

    let wins = 0;
    let total = 0;
    let longPnl = 0;
    let shortPnl = 0;

    let sumWin = 0;
    let sumLoss = 0;
    let countWin = 0;
    let countLoss = 0;

    let bestTrade: any = null;
    let worstTrade: any = null;

    for (const t of result) {
      const pnlUsd = t.pnl_usd || 0;
      running += pnlUsd;
      total += 1;

      if (pnlUsd > 0) {
        wins += 1;
        sumWin += pnlUsd;
        countWin += 1;
      } else if (pnlUsd < 0) {
        sumLoss += pnlUsd;
        countLoss += 1;
      }

      if (t.side === "SHORT") shortPnl += pnlUsd;
      else longPnl += pnlUsd;

      if (!bestTrade || pnlUsd > bestTrade.pnlUsd) {
        bestTrade = { ...t, pnlUsd };
      }
      if (!worstTrade || pnlUsd < worstTrade.pnlUsd) {
        worstTrade = { ...t, pnlUsd };
      }

      const dayKey = t._dateObj.toISOString().slice(0, 10);
      dailyMap.set(dayKey, (dailyMap.get(dayKey) || 0) + pnlUsd);

      symbolMap.set(t.symbol, (symbolMap.get(t.symbol) || 0) + pnlUsd);

      const prevSym = symbolStatsMap.get(t.symbol) || {
        pnl: 0,
        trades: 0,
        wins: 0,
      };
      prevSym.pnl += pnlUsd;
      prevSym.trades += 1;
      if (pnlUsd > 0) prevSym.wins += 1;
      symbolStatsMap.set(t.symbol, prevSym);

      const setupKey = t.setup_name || "No setup";
      const prevSetup = setupStatsMap.get(setupKey) || {
        pnl: 0,
        trades: 0,
        wins: 0,
      };
      prevSetup.pnl += pnlUsd;
      prevSetup.trades += 1;
      if (pnlUsd > 0) prevSetup.wins += 1;
      setupStatsMap.set(setupKey, prevSetup);

      equityMap.set(dayKey, Number(running.toFixed(2)));

      if (running > peak) peak = running;
      const dd = running - peak;
      if (dd < maxDrawdown) maxDrawdown = dd;
      drawdownMap.set(dayKey, Number(dd.toFixed(2)));
    }

    const totalPnl = running;
    const winRate = total ? (wins / total) * 100 : 0;

    const avgPnl = total ? totalPnl / total : 0;
    const avgWin = countWin ? sumWin / countWin : 0;
    const avgLoss = countLoss ? sumLoss / countLoss : 0;

    const summary = {
      totalTrades: total,
      totalPnl,
      winRate,
    };

    const dailySeries = Array.from(dailyMap.entries())
      .sort(([a], [b]) => (a < b ? -1 : 1))
      .map(([day, pnl]) => ({
        date: new Date(day).toLocaleDateString(undefined, {
          month: "short",
          day: "numeric",
        }),
        rawDate: day,
        pnl: Number(pnl.toFixed(2)),
      }));

    const symbolSeries = Array.from(symbolMap.entries())
      .sort((a, b) => b[1] - a[1])
      .slice(0, 12)
      .map(([symbol, pnl]) => ({
        symbol,
        pnl: Number(pnl.toFixed(2)),
      }));

    const symbolStats = Array.from(symbolStatsMap.entries())
      .map(([symbol, s]) => ({
        symbol,
        pnl: s.pnl,
        trades: s.trades,
        winRate: s.trades ? (s.wins / s.trades) * 100 : 0,
      }))
      .sort((a, b) => b.pnl - a.pnl);

    const setupStats = Array.from(setupStatsMap.entries())
      .map(([setup, s]) => ({
        setup,
        pnl: s.pnl,
        trades: s.trades,
        winRate: s.trades ? (s.wins / s.trades) * 100 : 0,
      }))
      .sort((a, b) => b.pnl - a.pnl);

    const equitySeries = Array.from(equityMap.entries())
      .sort(([a], [b]) => (a < b ? -1 : 1))
      .map(([day, equity]) => ({
        date: new Date(day).toLocaleDateString(undefined, {
          month: "short",
          day: "numeric",
        }),
        equity,
      }));

    const drawdownSeries = Array.from(drawdownMap.entries())
      .sort(([a], [b]) => (a < b ? -1 : 1))
      .map(([day, drawdown]) => ({
        date: new Date(day).toLocaleDateString(undefined, {
          month: "short",
          day: "numeric",
        }),
        drawdown,
      }));

    return {
      filtered: result,
      summary,
      equitySeries,
      drawdownSeries,
      dailySeries,
      symbolSeries,
      longShort: { longPnl, shortPnl },
      extras: {
        bestTrade,
        worstTrade,
        avgPnl,
        avgWin,
        avgLoss,
        maxDrawdown,
        symbolStats,
        setupStats,
      },
    };
  }, [trades, range, timeWindow, coinFilter, setupFilter]);

  const dateRangeText =
    filtered.length === 0
      ? "No trades in range"
      : `${filtered[0]._dateObj.toLocaleDateString()} → ${filtered[
        filtered.length - 1
      ]._dateObj.toLocaleDateString()}`;

  const uniqueCoins = Array.from(
    new Set((trades || []).map((t: any) => t.symbol))
  );

  const uniqueSetups = [
    "No setup",
    ...setups.map((s: any) => s.name),
  ];

  // Data object to pass to widgets
  const widgetData = {
    filteredTrades: filtered,
    summary,
    equitySeries,
    drawdownSeries,
    dailySeries,
    longShort,
    extras,
    allTrades: trades, // Pass all trades for some widgets if needed
  };

  // Helper to render a widget by ID
  const [isEditMode, setIsEditMode] = useState(false);

  const handleRemoveWidget = (id: WidgetType) => {
    setActiveWidgets(prev => prev.filter(w => w !== id));
  };

  const renderWidget = (id: WidgetType) => {
    const def = WIDGET_REGISTRY[id];
    if (!def) return null;
    const Component = def.component;

    return (
      <div className="card relative group flex flex-col h-full">
        {isEditMode && (
          <button
            onClick={() => handleRemoveWidget(id)}
            className="absolute top-2 right-2 z-50 bg-red-500 text-white w-6 h-6 rounded-full flex items-center justify-center shadow-lg hover:bg-red-600 transition-colors"
            title="Remove Widget"
          >
            ✕
          </button>
        )}
        <div className="flex items-center justify-between mb-4 flex-shrink-0">
          <div className="flex items-center gap-3">
            <h2 className="text-lg font-serif text-leather-accent">{def.title}</h2>
            {def.docsId && (
              <Link
                to={`/docs?category=widget-reference#${def.docsId}`}
                title={`Learn more about ${def.title}`}
                style={{
                  color: '#C2B280',
                  opacity: 0.6,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  width: '22px',
                  height: '22px',
                  borderRadius: '50%',
                  transition: 'all 0.2s ease'
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.opacity = '1';
                  e.currentTarget.style.color = '#F5C76D';
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.opacity = '0.6';
                  e.currentTarget.style.color = '#C2B280';
                }}
              >
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  viewBox="0 0 20 20"
                  fill="currentColor"
                  style={{ width: '20px', height: '20px' }}
                >
                  <path
                    fillRule="evenodd"
                    d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a.75.75 0 000 1.5h.253a.25.25 0 01.244.304l-.459 2.066A1.75 1.75 0 0010.747 15H11a.75.75 0 000-1.5h-.253a.25.25 0 01-.244-.304l.459-2.066A1.75 1.75 0 009.253 9H9z"
                    clipRule="evenodd"
                  />
                </svg>
              </Link>
            )}
          </div>
          <div id={`${id}-controls`}></div>
        </div>
        <div className="flex-1 min-h-0">
          <Component data={widgetData} widgetId={id} />
        </div>
      </div>
    );
  };

  return (
    <div className="w-full">
      <div style={{ maxWidth: '1400px', margin: '0 auto', padding: '16px 24px 48px 24px' }}>
        {/* Header Section */}
        <div style={{ paddingBottom: '16px' }}>
          <div className="mb-4 flex items-center justify-between">
            <h1 className="text-3xl font-serif font-bold text-gradient">Analytics</h1>
          </div>

          {/* Navigation */}
          <div style={{ marginTop: '12px' }}>
            <AnalyticsPageNavigation
              activePage={activePage}
              onPageChange={setActivePage}
            />
          </div>
        </div>

        {/* Content Section */}
        <div style={{ paddingTop: '30px', paddingBottom: '40px' }}>
          <AnalyticsPageContainer
            widgetData={widgetData}
            activeWidgets={activeWidgets}
            isEditMode={isEditMode}
            onRemoveWidget={handleRemoveWidget}
            renderWidget={renderWidget}
            activePage={activePage}
            onPageChange={setActivePage}
          />
        </div>

        <WidgetMenu
          isOpen={isMenuOpen}
          onClose={() => setIsMenuOpen(false)}
          onAddWidget={(id) => setActiveWidgets(prev => [...prev, id])}
          activeWidgets={activeWidgets}
        />
      </div>
    </div>
  );
}


