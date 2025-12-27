import React, { useMemo, useState, useEffect } from 'react';
import { createPortal } from 'react-dom';

interface Props {
  data: any;
  widgetId?: string;
}

export const PositionSizeAccuracyWidget: React.FC<Props> = ({ data, widgetId }) => {
  const { filteredTrades } = data;
  const [timeRange, setTimeRange] = useState<'ALL' | 'YEAR' | 'MONTH' | 'WEEK'>('ALL');
  const [controlElement, setControlElement] = useState<HTMLElement | null>(null);

  useEffect(() => {
    if (!widgetId) return;
    const element = document.getElementById(`${widgetId}-controls`);
    setControlElement(element);
  }, [widgetId]);

  const chartData = useMemo(() => {
    if (!filteredTrades || filteredTrades.length === 0) return [];

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

    // Calculate position sizes in USD (margin/collateral)
    const tradesWithSize = trades.map((t: any) => {
      const entryPrice = parseFloat(t.entry_price || t.entry) || 0;
      const qty = parseFloat(t.quantity || t.position_size || t.size) || 0;
      const leverage = parseFloat(t.leverage) || 1;
      const size = (entryPrice * qty) / leverage;
      return { trade: t, size };
    }).filter(t => t.size > 0);

    if (tradesWithSize.length === 0) return [];

    // Sort by size to calculate percentiles
    const sortedSizes = tradesWithSize.map(t => t.size).sort((a, b) => a - b);

    // Format USD value for display
    const formatUSD = (val: number) => {
      if (val >= 1000) return `$${(val / 1000).toFixed(1)}K`;
      return `$${val.toFixed(0)}`;
    };

    // Create smart bins based on percentiles (20th, 40th, 60th, 80th percentiles)
    const getPercentile = (arr: number[], p: number) => {
      const index = Math.floor((p / 100) * arr.length);
      return arr[Math.min(index, arr.length - 1)];
    };

    const p20 = getPercentile(sortedSizes, 20);
    const p40 = getPercentile(sortedSizes, 40);
    const p60 = getPercentile(sortedSizes, 60);
    const p80 = getPercentile(sortedSizes, 80);
    const minSize = sortedSizes[0];
    const maxSize = sortedSizes[sortedSizes.length - 1];

    // Create 5 bins based on percentiles
    const binBoundaries = [
      { min: minSize, max: p20, label: `${formatUSD(minSize)} - ${formatUSD(p20)}` },
      { min: p20, max: p40, label: `${formatUSD(p20)} - ${formatUSD(p40)}` },
      { min: p40, max: p60, label: `${formatUSD(p40)} - ${formatUSD(p60)}` },
      { min: p60, max: p80, label: `${formatUSD(p60)} - ${formatUSD(p80)}` },
      { min: p80, max: maxSize + 1, label: `${formatUSD(p80)} - ${formatUSD(maxSize)}` },
    ];

    // Merge bins that have the same range (when percentiles are equal)
    const uniqueBins: { min: number; max: number; label: string; count: number; totalPnl: number; wins: number }[] = [];
    binBoundaries.forEach(b => {
      const existing = uniqueBins.find(ub => ub.min === b.min && ub.max === b.max);
      if (!existing) {
        uniqueBins.push({ ...b, count: 0, totalPnl: 0, wins: 0 });
      }
    });

    // Assign trades to bins
    tradesWithSize.forEach(({ trade, size }) => {
      const bin = uniqueBins.find(b => size >= b.min && size < b.max);
      if (bin) {
        const pnl = trade.pnl_usd || 0;
        bin.count++;
        bin.totalPnl += pnl;
        if (pnl > 0) bin.wins++;
      } else if (size >= uniqueBins[uniqueBins.length - 1].min) {
        // Handle max value edge case
        const lastBin = uniqueBins[uniqueBins.length - 1];
        const pnl = trade.pnl_usd || 0;
        lastBin.count++;
        lastBin.totalPnl += pnl;
        if (pnl > 0) lastBin.wins++;
      }
    });

    return uniqueBins
      .filter(b => b.count > 0)
      .map(b => ({
        ...b,
        avgPnl: parseFloat((b.totalPnl / b.count).toFixed(2)),
        winRate: parseFloat(((b.wins / b.count) * 100).toFixed(1)),
      }));
  }, [filteredTrades, timeRange]);

  if (chartData.length === 0) {
    return <div className="text-center py-8 text-gray-500">No data in this range yet.</div>;
  }

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
          minWidth: '100px'
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

  // Calculate stats
  const avgWinRate = chartData.reduce((sum, d) => sum + d.winRate, 0) / chartData.length;
  const totalPnL = chartData.reduce((sum, d) => sum + (d.avgPnl * d.count), 0);
  const maxAvgPnL = Math.max(...chartData.map(d => Math.abs(d.avgPnl)), 0);

  return (
    <>
      {controlsPortal}
      <div style={{ height: '100%', display: 'flex', flexDirection: 'column', gap: '16px', padding: '12px' }}>
        {/* Summary Cards */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '12px' }}>
          <div style={{
            backgroundColor: '#1a1a1a',
            border: '1px solid rgba(245, 199, 109, 0.2)',
            borderRadius: '8px',
            padding: '12px',
            textAlign: 'center'
          }}>
            <div style={{ fontSize: '11px', color: '#999', marginBottom: '6px', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
              Total PnL
            </div>
            <div style={{
              fontSize: '18px',
              fontWeight: 'bold',
              color: totalPnL >= 0 ? '#10b981' : '#ef4444',
              marginBottom: '4px'
            }}>
              ${totalPnL.toFixed(0)}
            </div>
            <div style={{ fontSize: '10px', color: '#666' }}>
              Across all sizes
            </div>
          </div>

          <div style={{
            backgroundColor: '#1a1a1a',
            border: '1px solid rgba(245, 199, 109, 0.2)',
            borderRadius: '8px',
            padding: '12px',
            textAlign: 'center'
          }}>
            <div style={{ fontSize: '11px', color: '#999', marginBottom: '6px', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
              Avg Win Rate
            </div>
            <div style={{ fontSize: '18px', fontWeight: 'bold', color: '#F5C76D', marginBottom: '4px' }}>
              {avgWinRate.toFixed(1)}%
            </div>
            <div style={{ fontSize: '10px', color: '#666' }}>
              Position accuracy
            </div>
          </div>
        </div>

        {/* Position Size Range Cards */}
        <div style={{ flex: 1, overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: '10px' }}>
          {chartData.map((data, idx) => {
            const pnlColor = data.avgPnl > 0 ? '#10b981' : data.avgPnl < 0 ? '#ef4444' : '#666';
            const pnlPercent = maxAvgPnL > 0 ? (Math.abs(data.avgPnl) / maxAvgPnL) * 100 : 0;
            const winRateColor = data.winRate >= 55 ? '#10b981' : data.winRate >= 40 ? '#f59e0b' : '#ef4444';

            return (
              <div key={idx} style={{
                backgroundColor: '#1a1a1a',
                border: '1px solid rgba(245, 199, 109, 0.15)',
                borderRadius: '8px',
                padding: '12px',
                transition: 'all 0.2s'
              }}>
                {/* Position Size Label */}
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '10px' }}>
                  <div style={{ fontSize: '12px', fontWeight: 'bold', color: '#F5C76D' }}>
                    {data.label}
                  </div>
                  <div style={{
                    fontSize: '11px',
                    fontWeight: 'bold',
                    color: pnlColor,
                    backgroundColor: pnlColor + '15',
                    padding: '4px 8px',
                    borderRadius: '4px'
                  }}>
                    ${data.avgPnl.toFixed(2)}
                  </div>
                </div>

                {/* PnL Performance Bar */}
                <div style={{ marginBottom: '8px' }}>
                  <div style={{
                    width: '100%',
                    height: '6px',
                    backgroundColor: '#2a2a2a',
                    borderRadius: '3px',
                    overflow: 'hidden'
                  }}>
                    <div style={{
                      height: '100%',
                      width: `${pnlPercent}%`,
                      backgroundColor: pnlColor,
                      borderRadius: '3px',
                      transition: 'all 0.3s'
                    }} />
                  </div>
                  <div style={{ fontSize: '9px', color: '#666', marginTop: '3px', textAlign: 'right' }}>
                    {data.count} trades
                  </div>
                </div>

                {/* Win Rate Badge */}
                <div style={{
                  fontSize: '10px',
                  fontWeight: 'bold',
                  color: winRateColor,
                  backgroundColor: winRateColor + '20',
                  padding: '4px 8px',
                  borderRadius: '4px',
                  textAlign: 'center'
                }}>
                  {data.winRate.toFixed(1)}% Win Rate
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </>
  );
};
