import React, { useMemo, useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import {
  ResponsiveContainer,
  BarChart,
  Bar,
  CartesianGrid,
  XAxis,
  YAxis,
  Tooltip,
  Legend,
  Cell,
} from "recharts";

interface Props {
  data: any;
  widgetId?: string;
}

export const LeverageImpactWidget: React.FC<Props> = ({ data, widgetId }) => {
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

    const leverageMap = new Map<number, { pnl: number, count: number, wins: number }>();

    trades.forEach((trade: any) => {
      const leverage = parseFloat(trade.leverage) || 1;
      const pnl = trade.pnl_usd || 0;
      const isWin = pnl > 0;

      if (!leverageMap.has(leverage)) {
        leverageMap.set(leverage, { pnl: 0, count: 0, wins: 0 });
      }

      const stats = leverageMap.get(leverage)!;
      stats.pnl += pnl;
      stats.count += 1;
      if (isWin) stats.wins += 1;
    });

    return Array.from(leverageMap.entries())
      .sort(([a], [b]) => a - b)
      .map(([leverage, stats]) => ({
        leverage: leverage === 1 ? 'No Leverage' : `${leverage}x`,
        leverageNum: leverage,
        pnl: parseFloat(stats.pnl.toFixed(2)),
        avgPnl: parseFloat((stats.pnl / stats.count).toFixed(2)),
        winRate: parseFloat(((stats.wins / stats.count) * 100).toFixed(1)),
        count: stats.count,
      }))
      .slice(0, 20); // Limit to 20 leverage levels
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

  // Find the best performing leverage level
  const bestLeverage = chartData.reduce((best, current) =>
    current.pnl > best.pnl ? current : best, chartData[0]);

  const maxPnL = Math.max(...chartData.map(d => d.pnl), 0);
  const minPnL = Math.min(...chartData.map(d => d.pnl), 0);
  const absMax = Math.max(Math.abs(maxPnL), Math.abs(minPnL));

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
              Best Leverage
            </div>
            <div style={{ fontSize: '20px', fontWeight: 'bold', color: '#F5C76D', marginBottom: '4px' }}>
              {bestLeverage.leverage}
            </div>
            <div style={{ fontSize: '10px', color: '#10b981' }}>
              ${bestLeverage.pnl.toFixed(0)} PnL
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
            <div style={{ fontSize: '20px', fontWeight: 'bold', color: '#10b981', marginBottom: '4px' }}>
              {(chartData.reduce((sum, d) => sum + d.winRate, 0) / chartData.length).toFixed(1)}%
            </div>
            <div style={{ fontSize: '10px', color: '#666' }}>
              Across all levels
            </div>
          </div>
        </div>

        {/* Leverage Cards */}
        <div style={{ flex: 1, overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: '10px' }}>
          {chartData.map((data, idx) => {
            const pnlColor = data.pnl > 0 ? '#10b981' : data.pnl < 0 ? '#ef4444' : '#666';
            const pnlPercent = absMax > 0 ? (Math.abs(data.pnl) / absMax) * 100 : 0;
            const winRateColor = data.winRate >= 50 ? '#10b981' : data.winRate >= 30 ? '#f59e0b' : '#ef4444';

            return (
              <div key={idx} style={{
                backgroundColor: '#1a1a1a',
                border: '1px solid rgba(245, 199, 109, 0.15)',
                borderRadius: '8px',
                padding: '12px',
                transition: 'all 0.2s'
              }}>
                {/* Leverage Label and PnL */}
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '10px' }}>
                  <div style={{ fontSize: '13px', fontWeight: 'bold', color: '#F5C76D' }}>
                    {data.leverage}
                  </div>
                  <div style={{
                    fontSize: '12px',
                    fontWeight: 'bold',
                    color: pnlColor,
                    backgroundColor: pnlColor + '15',
                    padding: '4px 8px',
                    borderRadius: '4px'
                  }}>
                    ${data.pnl.toFixed(0)}
                  </div>
                </div>

                {/* PnL Bar */}
                <div style={{ marginBottom: '8px' }}>
                  <div style={{
                    width: '100%',
                    height: '6px',
                    backgroundColor: '#2a2a2a',
                    borderRadius: '3px',
                    overflow: 'hidden',
                    position: 'relative'
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
                    Avg: ${data.avgPnl.toFixed(2)}/trade
                  </div>
                </div>

                {/* Win Rate and Trade Count */}
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <div style={{
                    fontSize: '10px',
                    fontWeight: 'bold',
                    color: winRateColor,
                    backgroundColor: winRateColor + '20',
                    padding: '3px 8px',
                    borderRadius: '3px'
                  }}>
                    {data.winRate.toFixed(1)}% Win Rate
                  </div>
                  <div style={{ fontSize: '9px', color: '#999' }}>
                    {data.count} trades
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </>
  );
};
