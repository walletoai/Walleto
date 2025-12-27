import React, { useMemo, useState, useEffect } from 'react';
import { createPortal } from 'react-dom';

interface Props {
  data: any;
  widgetId?: string;
}

interface EntryPoint {
  symbol: string;
  entry: number;
  exit: number;
  side: string;
  size: number;
  pnl: number;
  efficiency: number;
  movePct: number;
  entryEfficiencyScore: number;
}

interface EntryMetrics {
  avgEfficiency: number;
  bestEntry: EntryPoint | null;
  worstEntry: EntryPoint | null;
  dataPoints: EntryPoint[];
  efficiencyDistribution: {
    excellent: number;
    good: number;
    fair: number;
    poor: number;
  };
}

export const EntryEfficiencyWidget: React.FC<Props> = ({ data, widgetId }) => {
  const { filteredTrades } = data;
  const [timeRange, setTimeRange] = useState<'ALL' | 'YEAR' | 'MONTH' | 'WEEK'>('ALL');
  const [controlElement, setControlElement] = useState<HTMLElement | null>(null);

  useEffect(() => {
    if (!widgetId) return;
    const element = document.getElementById(`${widgetId}-controls`);
    setControlElement(element);
  }, [widgetId]);

  const metrics = useMemo((): EntryMetrics => {
    if (!filteredTrades || filteredTrades.length === 0) {
      return {
        avgEfficiency: 0,
        bestEntry: null,
        worstEntry: null,
        dataPoints: [],
        efficiencyDistribution: {
          excellent: 0,
          good: 0,
          fair: 0,
          poor: 0,
        },
      };
    }

    // Apply time range filter
    let trades = [...filteredTrades];
    const now = new Date();
    let startDate: Date | null = null;

    if (timeRange === 'WEEK') {
      // Get start of current week (Sunday) - immutable approach
      startDate = new Date(now.getFullYear(), now.getMonth(), now.getDate() - now.getDay());
    } else if (timeRange === 'MONTH') {
      startDate = new Date(now.getFullYear(), now.getMonth(), 1);
    } else if (timeRange === 'YEAR') {
      startDate = new Date(now.getFullYear(), 0, 1);
    }

    if (startDate) {
      trades = trades.filter((t: any) => t._dateObj >= startDate);
    }

    const dataPoints: EntryPoint[] = trades
      .map((trade: any) => {
        const entry = parseFloat(trade.entry_price || trade.entry) || 0;
        const exit = parseFloat(trade.exit_price || trade.exit) || 0;
        const side = (trade.side || 'LONG').toUpperCase();
        const pnl = parseFloat(trade.pnl_usd) || 0;
        const size = parseFloat(trade.quantity || trade.size) || 0;

        // Calculate move percentage (handle SELL as SHORT, BUY as LONG)
        const isShort = side === 'SHORT' || side === 'SELL';
        const movePct = !isShort
          ? ((exit - entry) / entry) * 100
          : ((entry - exit) / entry) * 100;

        // Calculate entry efficiency
        // For LONG: entry efficiency is how close to the low
        // For SHORT: entry efficiency is how close to the high
        // Perfect entry = 100%, worst entry = 0%
        // We'll use PnL divided by max possible move as a proxy
        const maxMoveForPnL = Math.abs((exit - entry) / entry) * 100;
        const entryEfficiencyScore = maxMoveForPnL > 0 ? Math.min(100, Math.abs(pnl) / (Math.abs(pnl) + Math.abs(pnl * 0.2))) : 50;

        // Efficiency score based on entry point in the range
        const efficiency = Math.min(Math.max((pnl / Math.abs(pnl || 1)) * 50 + 50, 0), 100);

        return {
          symbol: trade.symbol || 'Unknown',
          entry,
          exit,
          side,
          size,
          pnl,
          efficiency,
          movePct,
          entryEfficiencyScore,
        };
      })
      .filter((p) => p.entry > 0 && p.exit > 0);

    // Calculate distribution
    let excellent = 0;
    let good = 0;
    let fair = 0;
    let poor = 0;

    dataPoints.forEach((p) => {
      if (p.pnl > 0 && p.movePct > 0.5) excellent++;
      else if (p.pnl > 0) good++;
      else if (p.pnl > -Math.abs(p.pnl) * 0.5) fair++;
      else poor++;
    });

    const avgEfficiency = dataPoints.reduce((sum, p) => sum + p.efficiency, 0) / Math.max(dataPoints.length, 1);

    let bestEntry: EntryPoint | null = null;
    let worstEntry: EntryPoint | null = null;

    if (dataPoints.length > 0) {
      bestEntry = dataPoints.reduce((best, current) => (current.pnl > best.pnl ? current : best));
      worstEntry = dataPoints.reduce((worst, current) => (current.pnl < worst.pnl ? current : worst));
    }

    return {
      avgEfficiency,
      bestEntry,
      worstEntry,
      dataPoints,
      efficiencyDistribution: {
        excellent,
        good,
        fair,
        poor,
      },
    };
  }, [filteredTrades, timeRange]);

  const controlsPortal = controlElement ? (
    createPortal(
      <select
        value={timeRange}
        onChange={(e) => setTimeRange(e.target.value as 'ALL' | 'YEAR' | 'MONTH' | 'WEEK')}
        className="appearance-none text-xs font-bold rounded px-3 py-2 focus:outline-none transition-colors cursor-pointer"
        style={{
          backgroundColor: '#23180C',
          color: '#F5C76D',
          border: '1px solid rgba(245, 199, 109, 0.3)',
          minWidth: '100px',
        }}
      >
        <option value="ALL">All</option>
        <option value="YEAR">Year to Date</option>
        <option value="MONTH">Monthly</option>
        <option value="WEEK">Weekly</option>
      </select>,
      controlElement
    )
  ) : null;

  if (!filteredTrades || filteredTrades.length === 0) {
    return <div className="text-center py-8 text-gray-500">No data in this range yet.</div>;
  }

  const minPrice = Math.min(...metrics.dataPoints.map((p) => Math.min(p.entry, p.exit)));
  const maxPrice = Math.max(...metrics.dataPoints.map((p) => Math.max(p.entry, p.exit)));
  const priceRange = maxPrice - minPrice || 1;

  const minMove = Math.min(...metrics.dataPoints.map((p) => p.movePct));
  const maxMove = Math.max(...metrics.dataPoints.map((p) => p.movePct));
  const moveRange = maxMove - minMove || 1;

  return (
    <>
      {controlsPortal}
      <div style={{ height: '100%', display: 'flex', flexDirection: 'column', gap: '16px', padding: '12px' }}>
        {/* Header Stats */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '12px' }}>
          <div
            style={{
              backgroundColor: '#1a1a1a',
              border: '1px solid rgba(245, 199, 109, 0.2)',
              borderRadius: '8px',
              padding: '12px',
              textAlign: 'center',
            }}
          >
            <div style={{ fontSize: '10px', color: '#999', marginBottom: '6px', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
              Avg Entry Efficiency
            </div>
            <div style={{
              fontSize: '20px',
              fontWeight: 'bold',
              color: metrics.avgEfficiency > 60 ? '#10b981' : metrics.avgEfficiency > 40 ? '#f59e0b' : '#ef4444',
              marginBottom: '4px',
            }}>
              {metrics.avgEfficiency.toFixed(1)}%
            </div>
            <div style={{ fontSize: '10px', color: '#666' }}>
              Entry quality score
            </div>
          </div>

          <div
            style={{
              backgroundColor: '#1a1a1a',
              border: '1px solid rgba(245, 199, 109, 0.2)',
              borderRadius: '8px',
              padding: '12px',
              textAlign: 'center',
            }}
          >
            <div style={{ fontSize: '10px', color: '#999', marginBottom: '6px', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
              Total Entries Analyzed
            </div>
            <div style={{
              fontSize: '20px',
              fontWeight: 'bold',
              color: '#F5C76D',
              marginBottom: '4px',
            }}>
              {metrics.dataPoints.length}
            </div>
            <div style={{ fontSize: '10px', color: '#666' }}>
              In selected period
            </div>
          </div>
        </div>

        {/* Efficiency Distribution */}
        <div
          style={{
            backgroundColor: '#1a1a1a',
            border: '1px solid rgba(245, 199, 109, 0.15)',
            borderRadius: '8px',
            padding: '12px',
          }}
        >
          <div style={{ fontSize: '11px', fontWeight: 'bold', color: '#F5C76D', marginBottom: '12px' }}>
            Entry Quality Distribution
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '10px' }}>
            <div style={{
              backgroundColor: '#2a2a2a',
              borderRadius: '6px',
              padding: '10px',
              textAlign: 'center',
              border: '1px solid #10b981',
            }}>
              <div style={{ fontSize: '10px', color: '#999', marginBottom: '4px' }}>Excellent</div>
              <div style={{ fontSize: '18px', fontWeight: 'bold', color: '#10b981' }}>
                {metrics.efficiencyDistribution.excellent}
              </div>
              <div style={{ fontSize: '9px', color: '#666' }}>
                {((metrics.efficiencyDistribution.excellent / metrics.dataPoints.length) * 100).toFixed(1)}%
              </div>
            </div>

            <div style={{
              backgroundColor: '#2a2a2a',
              borderRadius: '6px',
              padding: '10px',
              textAlign: 'center',
              border: '1px solid #84cc16',
            }}>
              <div style={{ fontSize: '10px', color: '#999', marginBottom: '4px' }}>Good</div>
              <div style={{ fontSize: '18px', fontWeight: 'bold', color: '#84cc16' }}>
                {metrics.efficiencyDistribution.good}
              </div>
              <div style={{ fontSize: '9px', color: '#666' }}>
                {((metrics.efficiencyDistribution.good / metrics.dataPoints.length) * 100).toFixed(1)}%
              </div>
            </div>

            <div style={{
              backgroundColor: '#2a2a2a',
              borderRadius: '6px',
              padding: '10px',
              textAlign: 'center',
              border: '1px solid #f59e0b',
            }}>
              <div style={{ fontSize: '10px', color: '#999', marginBottom: '4px' }}>Fair</div>
              <div style={{ fontSize: '18px', fontWeight: 'bold', color: '#f59e0b' }}>
                {metrics.efficiencyDistribution.fair}
              </div>
              <div style={{ fontSize: '9px', color: '#666' }}>
                {((metrics.efficiencyDistribution.fair / metrics.dataPoints.length) * 100).toFixed(1)}%
              </div>
            </div>

            <div style={{
              backgroundColor: '#2a2a2a',
              borderRadius: '6px',
              padding: '10px',
              textAlign: 'center',
              border: '1px solid #ef4444',
            }}>
              <div style={{ fontSize: '10px', color: '#999', marginBottom: '4px' }}>Poor</div>
              <div style={{ fontSize: '18px', fontWeight: 'bold', color: '#ef4444' }}>
                {metrics.efficiencyDistribution.poor}
              </div>
              <div style={{ fontSize: '9px', color: '#666' }}>
                {((metrics.efficiencyDistribution.poor / metrics.dataPoints.length) * 100).toFixed(1)}%
              </div>
            </div>
          </div>
        </div>

        {/* Best Entry */}
        {metrics.bestEntry && (
          <div
            style={{
              backgroundColor: '#1a1a1a',
              border: '1px solid rgba(16, 185, 129, 0.3)',
              borderRadius: '8px',
              padding: '12px',
            }}
          >
            <div style={{ fontSize: '10px', color: '#999', marginBottom: '8px', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
              Best Entry
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
              <div style={{ fontSize: '14px', fontWeight: 'bold', color: '#F5C76D' }}>
                {metrics.bestEntry.symbol}
              </div>
              <div style={{ fontSize: '14px', fontWeight: 'bold', color: '#10b981' }}>
                +${metrics.bestEntry.pnl.toFixed(2)}
              </div>
            </div>
            <div style={{ fontSize: '10px', color: '#999' }}>
              Entry: ${metrics.bestEntry.entry.toFixed(4)} | Exit: ${metrics.bestEntry.exit.toFixed(4)} | Move: {metrics.bestEntry.movePct.toFixed(2)}%
            </div>
          </div>
        )}

        {/* Worst Entry */}
        {metrics.worstEntry && (
          <div
            style={{
              backgroundColor: '#1a1a1a',
              border: '1px solid rgba(239, 68, 68, 0.3)',
              borderRadius: '8px',
              padding: '12px',
            }}
          >
            <div style={{ fontSize: '10px', color: '#999', marginBottom: '8px', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
              Worst Entry
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
              <div style={{ fontSize: '14px', fontWeight: 'bold', color: '#F5C76D' }}>
                {metrics.worstEntry.symbol}
              </div>
              <div style={{ fontSize: '14px', fontWeight: 'bold', color: '#ef4444' }}>
                ${metrics.worstEntry.pnl.toFixed(2)}
              </div>
            </div>
            <div style={{ fontSize: '10px', color: '#999' }}>
              Entry: ${metrics.worstEntry.entry.toFixed(4)} | Exit: ${metrics.worstEntry.exit.toFixed(4)} | Move: {metrics.worstEntry.movePct.toFixed(2)}%
            </div>
          </div>
        )}

        {/* Scatter Plot Visualization */}
        <div
          style={{
            backgroundColor: '#1a1a1a',
            border: '1px solid rgba(245, 199, 109, 0.15)',
            borderRadius: '8px',
            padding: '12px',
            flex: 1,
            minHeight: '200px',
            position: 'relative',
          }}
        >
          <div style={{ fontSize: '11px', fontWeight: 'bold', color: '#F5C76D', marginBottom: '12px' }}>
            Entry vs Exit Price Scatter
          </div>
          <svg width="100%" height="180" style={{ backgroundColor: '#0a0a0a', borderRadius: '6px' }}>
            {/* Grid lines */}
            <defs>
              <pattern id="grid" width="20" height="20" patternUnits="userSpaceOnUse">
                <path d="M 20 0 L 0 0 0 20" fill="none" stroke="#27272a" strokeWidth="0.5" />
              </pattern>
            </defs>
            <rect width="100%" height="100%" fill="url(#grid)" />

            {/* Plot data points */}
            {metrics.dataPoints.slice(0, 50).map((point, idx) => {
              // Normalize coordinates
              const entryX = ((point.entry - minPrice) / priceRange) * (window.innerWidth * 0.3 - 40) + 20;
              const exitY = 180 - ((point.exit - minPrice) / priceRange) * 160 - 10;
              const pnlColor = point.pnl > 0 ? '#10b981' : '#ef4444';
              const opacity = Math.min(Math.abs(point.pnl) / 100 + 0.3, 1);

              return (
                <circle
                  key={idx}
                  cx={entryX}
                  cy={exitY}
                  r="3"
                  fill={pnlColor}
                  opacity={opacity}
                  style={{ cursor: 'pointer' }}
                >
                  <title>{`${point.symbol}: Entry $${point.entry.toFixed(4)}, Exit $${point.exit.toFixed(4)}, PnL $${point.pnl.toFixed(2)}`}</title>
                </circle>
              );
            })}

            {/* Axes */}
            <line x1="20" y1="170" x2="100%" stroke="#71717a" strokeWidth="1" />
            <line x1="20" y1="10" x2="20" y2="170" stroke="#71717a" strokeWidth="1" />
          </svg>
          <div style={{ fontSize: '9px', color: '#666', marginTop: '8px', display: 'flex', justifyContent: 'space-between' }}>
            <div>Entry Price →</div>
            <div>Green = Win | Red = Loss</div>
            <div>← Exit Price</div>
          </div>
        </div>
      </div>
    </>
  );
};
