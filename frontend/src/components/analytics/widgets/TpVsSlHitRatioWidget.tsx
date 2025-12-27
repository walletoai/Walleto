import React, { useMemo, useState, useEffect } from 'react';
import { createPortal } from 'react-dom';

interface Props {
  data: any;
  widgetId?: string;
}

interface TPSLMetrics {
  tpHits: number;
  slHits: number;
  breakeven: number;
  totalTpProfit: number;
  totalSlLoss: number;
  avgTpProfit: number;
  avgSlLoss: number;
  tpPercentage: number;
  slPercentage: number;
  breakevenPercentage: number;
}

export const TpVsSlHitRatioWidget: React.FC<Props> = ({ data, widgetId }) => {
  const { filteredTrades } = data;
  const [timeRange, setTimeRange] = useState<'ALL' | 'YEAR' | 'MONTH' | 'WEEK'>('ALL');
  const [controlElement, setControlElement] = useState<HTMLElement | null>(null);

  useEffect(() => {
    if (!widgetId) return;
    const element = document.getElementById(`${widgetId}-controls`);
    setControlElement(element);
  }, [widgetId]);

  const metrics = useMemo((): TPSLMetrics => {
    if (!filteredTrades || filteredTrades.length === 0) {
      return {
        tpHits: 0,
        slHits: 0,
        breakeven: 0,
        totalTpProfit: 0,
        totalSlLoss: 0,
        avgTpProfit: 0,
        avgSlLoss: 0,
        tpPercentage: 0,
        slPercentage: 0,
        breakevenPercentage: 0,
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

    let tpHits = 0;
    let slHits = 0;
    let breakeven = 0;
    let totalTpProfit = 0;
    let totalSlLoss = 0;

    trades.forEach((trade: any) => {
      const pnl = trade.pnl_usd || 0;

      if (pnl > 0) {
        tpHits++;
        totalTpProfit += pnl;
      } else if (pnl < 0) {
        slHits++;
        totalSlLoss += Math.abs(pnl);
      } else {
        breakeven++;
      }
    });

    const total = trades.length;

    return {
      tpHits,
      slHits,
      breakeven,
      totalTpProfit,
      totalSlLoss,
      avgTpProfit: tpHits > 0 ? totalTpProfit / tpHits : 0,
      avgSlLoss: slHits > 0 ? totalSlLoss / slHits : 0,
      tpPercentage: (tpHits / total) * 100,
      slPercentage: (slHits / total) * 100,
      breakevenPercentage: (breakeven / total) * 100,
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

  if (!filteredTrades || filteredTrades.length === 0) {
    return <div className="text-center py-8 text-gray-500">No data in this range yet.</div>;
  }

  // Circular progress component
  const CircularProgress = ({ percentage, color, label, value, avgValue }: { percentage: number; color: string; label: string; value: number; avgValue: number }) => {
    const radius = 45;
    const circumference = 2 * Math.PI * radius;
    const offset = circumference - (percentage / 100) * circumference;

    return (
      <div style={{
        flex: 1,
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        gap: '12px'
      }}>
        <div style={{ position: 'relative', width: 120, height: 120 }}>
          <svg width={120} height={120} style={{ transform: 'rotate(-90deg)' }}>
            {/* Background circle */}
            <circle
              cx={60}
              cy={60}
              r={radius}
              fill="none"
              stroke="#2a2a2a"
              strokeWidth={8}
            />
            {/* Progress circle */}
            <circle
              cx={60}
              cy={60}
              r={radius}
              fill="none"
              stroke={color}
              strokeWidth={8}
              strokeDasharray={circumference}
              strokeDashoffset={offset}
              strokeLinecap="round"
              style={{
                transition: 'stroke-dashoffset 0.5s ease'
              }}
            />
          </svg>
          {/* Center text */}
          <div style={{
            position: 'absolute',
            top: '50%',
            left: '50%',
            transform: 'translate(-50%, -50%)',
            textAlign: 'center'
          }}>
            <div style={{
              fontSize: '24px',
              fontWeight: 'bold',
              color: color
            }}>
              {percentage.toFixed(1)}%
            </div>
            <div style={{
              fontSize: '10px',
              color: '#999',
              marginTop: '2px'
            }}>
              {value} trades
            </div>
          </div>
        </div>

        {/* Label and stats */}
        <div style={{ textAlign: 'center', width: '100%' }}>
          <div style={{
            fontSize: '12px',
            fontWeight: 'bold',
            color: '#F5C76D',
            marginBottom: '4px'
          }}>
            {label}
          </div>
          <div style={{
            fontSize: '11px',
            color: '#999'
          }}>
            Avg: ${avgValue.toFixed(2)}
          </div>
        </div>
      </div>
    );
  };

  return (
    <>
      {controlsPortal}
      <div style={{ height: '100%', display: 'flex', flexDirection: 'column', gap: '16px', padding: '12px' }}>
        {/* Header Stats */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '12px' }}>
          <div style={{
            backgroundColor: '#1a1a1a',
            border: '1px solid rgba(245, 199, 109, 0.2)',
            borderRadius: '8px',
            padding: '12px',
            textAlign: 'center'
          }}>
            <div style={{ fontSize: '10px', color: '#999', marginBottom: '6px', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
              TP / SL Ratio
            </div>
            <div style={{
              fontSize: '20px',
              fontWeight: 'bold',
              color: metrics.slHits > 0 ? (metrics.tpHits / metrics.slHits > 1 ? '#10b981' : '#f59e0b') : '#10b981',
              marginBottom: '4px'
            }}>
              {metrics.slHits > 0 ? (metrics.tpHits / metrics.slHits).toFixed(2) : '∞'}x
            </div>
            <div style={{ fontSize: '10px', color: '#666' }}>
              Win to loss ratio
            </div>
          </div>

          <div style={{
            backgroundColor: '#1a1a1a',
            border: '1px solid rgba(245, 199, 109, 0.2)',
            borderRadius: '8px',
            padding: '12px',
            textAlign: 'center'
          }}>
            <div style={{ fontSize: '10px', color: '#999', marginBottom: '6px', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
              Total Trades Analyzed
            </div>
            <div style={{
              fontSize: '20px',
              fontWeight: 'bold',
              color: '#F5C76D',
              marginBottom: '4px'
            }}>
              {metrics.tpHits + metrics.slHits + metrics.breakeven}
            </div>
            <div style={{ fontSize: '10px', color: '#666' }}>
              In selected period
            </div>
          </div>
        </div>

        {/* Circular Progress Indicators */}
        <div style={{
          display: 'flex',
          gap: '16px',
          justifyContent: 'space-around',
          alignItems: 'flex-start'
        }}>
          <CircularProgress
            percentage={metrics.tpPercentage}
            color="#10b981"
            label="Take Profit"
            value={metrics.tpHits}
            avgValue={metrics.avgTpProfit}
          />
          <CircularProgress
            percentage={metrics.slPercentage}
            color="#ef4444"
            label="Stop Loss"
            value={metrics.slHits}
            avgValue={metrics.avgSlLoss}
          />
          <CircularProgress
            percentage={metrics.breakevenPercentage}
            color="#71717a"
            label="Breakeven"
            value={metrics.breakeven}
            avgValue={0}
          />
        </div>

        {/* Value Analysis */}
        <div style={{
          backgroundColor: '#1a1a1a',
          border: '1px solid rgba(245, 199, 109, 0.15)',
          borderRadius: '8px',
          padding: '12px',
          marginTop: '8px'
        }}>
          <div style={{ fontSize: '11px', fontWeight: 'bold', color: '#F5C76D', marginBottom: '10px' }}>
            Value Analysis
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '10px' }}>
            <div>
              <div style={{ fontSize: '10px', color: '#999', marginBottom: '4px' }}>
                Total TP Profit
              </div>
              <div style={{ fontSize: '16px', fontWeight: 'bold', color: '#10b981' }}>
                ${metrics.totalTpProfit.toFixed(0)}
              </div>
            </div>
            <div>
              <div style={{ fontSize: '10px', color: '#999', marginBottom: '4px' }}>
                Total SL Loss
              </div>
              <div style={{ fontSize: '16px', fontWeight: 'bold', color: '#ef4444' }}>
                -${metrics.totalSlLoss.toFixed(0)}
              </div>
            </div>
            <div>
              <div style={{ fontSize: '10px', color: '#999', marginBottom: '4px' }}>
                Avg Win Size
              </div>
              <div style={{ fontSize: '14px', fontWeight: 'bold', color: '#10b981' }}>
                ${metrics.avgTpProfit.toFixed(2)}
              </div>
            </div>
            <div>
              <div style={{ fontSize: '10px', color: '#999', marginBottom: '4px' }}>
                Avg Loss Size
              </div>
              <div style={{ fontSize: '14px', fontWeight: 'bold', color: '#ef4444' }}>
                ${metrics.avgSlLoss.toFixed(2)}
              </div>
            </div>
          </div>
        </div>
      </div>
    </>
  );
};
