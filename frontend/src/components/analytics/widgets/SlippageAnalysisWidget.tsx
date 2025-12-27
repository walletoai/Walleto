import React, { useMemo, useState, useEffect } from 'react';
import { createPortal } from 'react-dom';

interface Props {
  data: any;
  widgetId?: string;
}

interface SlippageMetrics {
  totalFees: number;
  avgFeesPerTrade: number;
  avgEntrySlippage: number;
  avgExitSlippage: number;
  worstSlippageTrade: {
    symbol: string;
    fees: number;
    slippagePercent: number;
  };
  slippageBins: Array<{
    range: string;
    min: number;
    max: number;
    count: number;
    percentage: number;
  }>;
  totalPnLLostToSlippage: number;
  slippageImpactPercent: number;
}

export const SlippageAnalysisWidget: React.FC<Props> = ({ data, widgetId }) => {
  const { filteredTrades } = data;
  const [timeRange, setTimeRange] = useState<'ALL' | 'YEAR' | 'MONTH' | 'WEEK'>('ALL');
  const [controlElement, setControlElement] = useState<HTMLElement | null>(null);

  useEffect(() => {
    if (!widgetId) return;
    const element = document.getElementById(`${widgetId}-controls`);
    setControlElement(element);
  }, [widgetId]);

  const metrics = useMemo((): SlippageMetrics => {
    if (!filteredTrades || filteredTrades.length === 0) {
      return {
        totalFees: 0,
        avgFeesPerTrade: 0,
        avgEntrySlippage: 0,
        avgExitSlippage: 0,
        worstSlippageTrade: {
          symbol: 'N/A',
          fees: 0,
          slippagePercent: 0,
        },
        slippageBins: [],
        totalPnLLostToSlippage: 0,
        slippageImpactPercent: 0,
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

    // Calculate slippage metrics
    let totalFees = 0;
    let worstSlippageTrade = { symbol: '', fees: 0, slippagePercent: 0 };
    const slippagePercentages: number[] = [];

    trades.forEach((trade: any) => {
      const fees = parseFloat(trade.fees) || 0;
      const entry = parseFloat(trade.entry_price || trade.entry) || 0;
      const exit = parseFloat(trade.exit_price || trade.exit) || 0;
      const size = parseFloat(trade.quantity || trade.size) || 0;

      totalFees += fees;

      // Calculate slippage as percentage of entry price
      const entryValue = entry * size;
      const slippagePercent = entryValue > 0 ? (fees / entryValue) * 100 : 0;
      slippagePercentages.push(slippagePercent);

      // Track worst slippage
      if (fees > worstSlippageTrade.fees) {
        worstSlippageTrade = {
          symbol: trade.symbol || 'Unknown',
          fees: fees,
          slippagePercent: slippagePercent,
        };
      }
    });

    const avgFeesPerTrade = totalFees / Math.max(trades.length, 1);
    const avgEntrySlippage = avgFeesPerTrade * 0.5; // Estimate 50% for entry
    const avgExitSlippage = avgFeesPerTrade * 0.5; // Estimate 50% for exit

    // Create slippage bins
    const minSlippage = Math.min(...slippagePercentages, 0);
    const maxSlippage = Math.max(...slippagePercentages, 1);
    const range = maxSlippage - minSlippage || 1;
    const binCount = 6;

    const bins = Array(binCount)
      .fill(0)
      .map((_, i) => ({
        min: minSlippage + (i * range) / binCount,
        max: minSlippage + ((i + 1) * range) / binCount,
        count: 0,
        percentage: 0,
      }));

    slippagePercentages.forEach((slippage) => {
      const binIndex = Math.min(
        Math.floor((slippage - minSlippage) / (range / binCount)),
        binCount - 1
      );
      if (binIndex >= 0) {
        bins[binIndex].count++;
      }
    });

    const slippageBins = bins
      .filter((b) => b.count > 0)
      .map((b) => ({
        ...b,
        range: `${b.min.toFixed(3)}-${b.max.toFixed(3)}%`,
        percentage: (b.count / trades.length) * 100,
      }));

    // Calculate total PnL lost to slippage
    const totalPnL = trades.reduce((sum: number, t: any) => sum + (parseFloat(t.pnl_usd) || 0), 0);
    const totalPnLLostToSlippage = totalFees;
    const slippageImpactPercent = totalPnL !== 0 ? (totalFees / Math.abs(totalPnL)) * 100 : 0;

    return {
      totalFees,
      avgFeesPerTrade,
      avgEntrySlippage,
      avgExitSlippage,
      worstSlippageTrade,
      slippageBins,
      totalPnLLostToSlippage,
      slippageImpactPercent,
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

  const maxBinCount = Math.max(...metrics.slippageBins.map((b) => b.count), 1);

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
              Total Fees Paid
            </div>
            <div style={{
              fontSize: '20px',
              fontWeight: 'bold',
              color: '#ef4444',
              marginBottom: '4px',
            }}>
              ${metrics.totalFees.toFixed(0)}
            </div>
            <div style={{ fontSize: '10px', color: '#666' }}>
              All slippage costs
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
              Avg Fees Per Trade
            </div>
            <div style={{
              fontSize: '20px',
              fontWeight: 'bold',
              color: '#F5C76D',
              marginBottom: '4px',
            }}>
              ${metrics.avgFeesPerTrade.toFixed(2)}
            </div>
            <div style={{ fontSize: '10px', color: '#666' }}>
              Entry + Exit slippage
            </div>
          </div>
        </div>

        {/* Entry/Exit Breakdown */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '12px' }}>
          <div
            style={{
              backgroundColor: '#1a1a1a',
              border: '1px solid rgba(245, 199, 109, 0.15)',
              borderRadius: '8px',
              padding: '12px',
            }}
          >
            <div style={{ fontSize: '10px', color: '#999', marginBottom: '8px', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
              Entry Slippage (Est.)
            </div>
            <div style={{ fontSize: '18px', fontWeight: 'bold', color: '#f97316', marginBottom: '4px' }}>
              ${metrics.avgEntrySlippage.toFixed(2)}
            </div>
            <div style={{ fontSize: '9px', color: '#666' }}>
              ~50% of total fees
            </div>
          </div>

          <div
            style={{
              backgroundColor: '#1a1a1a',
              border: '1px solid rgba(245, 199, 109, 0.15)',
              borderRadius: '8px',
              padding: '12px',
            }}
          >
            <div style={{ fontSize: '10px', color: '#999', marginBottom: '8px', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
              Exit Slippage (Est.)
            </div>
            <div style={{ fontSize: '18px', fontWeight: 'bold', color: '#f97316', marginBottom: '4px' }}>
              ${metrics.avgExitSlippage.toFixed(2)}
            </div>
            <div style={{ fontSize: '9px', color: '#666' }}>
              ~50% of total fees
            </div>
          </div>
        </div>

        {/* Slippage Distribution Histogram */}
        <div
          style={{
            backgroundColor: '#1a1a1a',
            border: '1px solid rgba(245, 199, 109, 0.15)',
            borderRadius: '8px',
            padding: '12px',
          }}
        >
          <div style={{ fontSize: '11px', fontWeight: 'bold', color: '#F5C76D', marginBottom: '12px' }}>
            Slippage Distribution (as % of Position Value)
          </div>

          {/* Histogram bars */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
            {metrics.slippageBins.map((bin, idx) => {
              const barHeight = (bin.count / maxBinCount) * 100;

              return (
                <div key={idx}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '4px' }}>
                    <div style={{ fontSize: '10px', color: '#999' }}>
                      {bin.range}
                    </div>
                    <div style={{ fontSize: '10px', fontWeight: 'bold', color: '#F5C76D' }}>
                      {bin.count} trades ({bin.percentage.toFixed(1)}%)
                    </div>
                  </div>
                  <div
                    style={{
                      width: '100%',
                      height: '24px',
                      backgroundColor: '#2a2a2a',
                      borderRadius: '4px',
                      overflow: 'hidden',
                      position: 'relative',
                    }}
                  >
                    <div
                      style={{
                        height: '100%',
                        width: `${barHeight}%`,
                        backgroundColor: '#ef4444',
                        borderRadius: '4px',
                        transition: 'width 0.3s ease',
                        display: 'flex',
                        alignItems: 'center',
                        paddingLeft: '6px',
                      }}
                    >
                      {barHeight > 30 && (
                        <span style={{ fontSize: '11px', color: '#fff', fontWeight: 'bold' }}>
                          {bin.count}
                        </span>
                      )}
                    </div>
                    {barHeight <= 30 && barHeight > 0 && (
                      <div style={{ position: 'absolute', right: '6px', top: '50%', transform: 'translateY(-50%)', fontSize: '11px', color: '#999', fontWeight: 'bold' }}>
                        {bin.count}
                      </div>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Worst Slippage Trade */}
        <div
          style={{
            backgroundColor: '#1a1a1a',
            border: '1px solid rgba(239, 68, 68, 0.3)',
            borderRadius: '8px',
            padding: '12px',
          }}
        >
          <div style={{ fontSize: '10px', color: '#999', marginBottom: '8px', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
            Worst Slippage Trade
          </div>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <div>
              <div style={{ fontSize: '14px', fontWeight: 'bold', color: '#F5C76D', marginBottom: '4px' }}>
                {metrics.worstSlippageTrade.symbol}
              </div>
              <div style={{ fontSize: '12px', color: '#ef4444' }}>
                ${metrics.worstSlippageTrade.fees.toFixed(2)} in fees
              </div>
            </div>
            <div style={{ textAlign: 'right' }}>
              <div style={{ fontSize: '18px', fontWeight: 'bold', color: '#ef4444' }}>
                {metrics.worstSlippageTrade.slippagePercent.toFixed(3)}%
              </div>
              <div style={{ fontSize: '9px', color: '#666' }}>
                of position value
              </div>
            </div>
          </div>
        </div>

        {/* PnL Impact */}
        <div
          style={{
            backgroundColor: '#1a1a1a',
            border: `1px solid ${metrics.slippageImpactPercent > 20 ? '#ef4444' : metrics.slippageImpactPercent > 10 ? '#f59e0b' : '#10b981'}33`,
            borderRadius: '8px',
            padding: '12px',
          }}
        >
          <div style={{ fontSize: '10px', color: '#999', marginBottom: '6px', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
            Slippage Impact on PnL
          </div>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <div style={{ fontSize: '16px', fontWeight: 'bold', color: '#F5C76D' }}>
              {metrics.slippageImpactPercent.toFixed(1)}%
            </div>
            <div style={{ fontSize: '10px', color: '#666' }}>
              {metrics.slippageImpactPercent > 20 ? '⚠️ High impact' : metrics.slippageImpactPercent > 10 ? '⚠️ Moderate' : '✓ Well managed'}
            </div>
          </div>
        </div>
      </div>
    </>
  );
};
