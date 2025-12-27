import React, { useMemo, useState, useEffect } from 'react';
import { createPortal } from 'react-dom';

interface Props {
  data: any;
  widgetId?: string;
}

interface QualityMetrics {
  score: number;
  ratings: {
    winRate: number;
    profitFactor: number;
    riskReward: number;
    consistency: number;
  };
  grade: string;
  color: string;
}

export const TradeQualityIndexWidget: React.FC<Props> = ({ data, widgetId }) => {
  const { filteredTrades, summary, extras } = data;
  const [timeRange, setTimeRange] = useState<'ALL' | 'YEAR' | 'MONTH' | 'WEEK'>('ALL');
  const [controlElement, setControlElement] = useState<HTMLElement | null>(null);

  useEffect(() => {
    if (!widgetId) return;
    const element = document.getElementById(`${widgetId}-controls`);
    setControlElement(element);
  }, [widgetId]);

  const metrics = useMemo((): QualityMetrics => {
    if (!filteredTrades || filteredTrades.length === 0) {
      return {
        score: 0,
        ratings: {
          winRate: 0,
          profitFactor: 0,
          riskReward: 0,
          consistency: 0,
        },
        grade: 'N/A',
        color: '#71717a',
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

    const ratings: { [key: string]: number } = {};

    // Win Rate Quality (0-25 points)
    const winRate = summary.winRate || 0;
    ratings.winRate = Math.min((winRate / 100) * 25, 25);

    // Profit Factor Quality (0-25 points)
    const totalWins = trades.filter((t: any) => (t.pnl_usd || 0) >= 0).reduce((sum: number, t: any) => sum + (t.pnl_usd || 0), 0);
    const totalLosses = Math.abs(trades.filter((t: any) => (t.pnl_usd || 0) < 0).reduce((sum: number, t: any) => sum + (t.pnl_usd || 0), 0));
    const profitFactor = totalWins > 0 && totalLosses > 0 ? totalWins / totalLosses : totalWins > 0 ? 5 : 0;
    ratings.profitFactor = Math.min((profitFactor / 5) * 25, 25);

    // Risk/Reward Quality (0-25 points)
    const avgWin = extras?.avgWin || 0;
    const avgLoss = Math.abs(extras?.avgLoss || 0);
    const riskReward = avgLoss > 0 ? avgWin / avgLoss : avgWin > 0 ? 5 : 0;
    ratings.riskReward = Math.min((riskReward / 3) * 25, 25);

    // Consistency Quality (0-25 points)
    const maxDD = Math.abs(extras?.maxDrawdown || 0);
    const totalPnL = summary?.totalPnL || 0;
    const ddRatio = totalPnL > 0 ? (1 - Math.min(maxDD / totalPnL, 1)) : 0;
    ratings.consistency = Math.max(ddRatio * 25, 0);

    const totalScore = Object.values(ratings).reduce((a, b) => a + b, 0);

    // Determine grade and color
    let grade = 'N/A';
    let color = '#71717a';

    if (totalScore >= 90) {
      grade = 'A+';
      color = '#10b981';
    } else if (totalScore >= 80) {
      grade = 'A';
      color = '#10b981';
    } else if (totalScore >= 70) {
      grade = 'B';
      color = '#84cc16';
    } else if (totalScore >= 60) {
      grade = 'C';
      color = '#f59e0b';
    } else if (totalScore >= 50) {
      grade = 'D';
      color = '#f97316';
    } else {
      grade = 'F';
      color = '#ef4444';
    }

    return {
      score: Math.round(totalScore),
      ratings: {
        winRate: ratings.winRate,
        profitFactor: ratings.profitFactor,
        riskReward: ratings.riskReward,
        consistency: ratings.consistency,
      },
      grade,
      color,
    };
  }, [filteredTrades, summary, extras, timeRange]);

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

  // Gauge visualization
  const gaugePercentage = (metrics.score / 100) * 180; // 0-180 degrees for semicircle

  return (
    <>
      {controlsPortal}
      <div style={{ height: '100%', display: 'flex', flexDirection: 'column', gap: '16px', padding: '12px' }}>
        {/* Main Gauge */}
        <div style={{
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          gap: '12px',
          paddingTop: '8px'
        }}>
          {/* SVG Gauge */}
          <svg width={240} height={130} style={{ marginBottom: '4px' }}>
            {/* Background gauge */}
            <path
              d="M 20 120 A 100 100 0 0 1 220 120"
              fill="none"
              stroke="#2a2a2a"
              strokeWidth={12}
              strokeLinecap="round"
            />
            {/* Progress gauge */}
            <path
              d="M 20 120 A 100 100 0 0 1 220 120"
              fill="none"
              stroke={metrics.color}
              strokeWidth={12}
              strokeLinecap="round"
              strokeDasharray={`${(gaugePercentage / 180) * 314}, 314`}
              style={{
                transition: 'stroke-dasharray 0.6s ease',
                filter: `drop-shadow(0 0 8px ${metrics.color})`
              }}
            />
            {/* Score text in center */}
            <text
              x={120}
              y={95}
              textAnchor="middle"
              fontSize="48"
              fontWeight="bold"
              fill={metrics.color}
              style={{ fontFamily: 'system-ui, -apple-system, sans-serif' }}
            >
              {metrics.score}
            </text>
            <text
              x={120}
              y={115}
              textAnchor="middle"
              fontSize="14"
              fill="#999"
              style={{ fontFamily: 'system-ui, -apple-system, sans-serif' }}
            >
              Grade: {metrics.grade}
            </text>
          </svg>

          {/* Quality label */}
          <div style={{
            fontSize: '12px',
            fontWeight: 'bold',
            color: '#F5C76D',
            textTransform: 'uppercase',
            letterSpacing: '0.05em'
          }}>
            Trade Quality Index
          </div>
        </div>

        {/* Rating Breakdown Grid */}
        <div style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(2, 1fr)',
          gap: '10px'
        }}>
          {/* Win Rate */}
          <div style={{
            backgroundColor: '#1a1a1a',
            border: '1px solid rgba(245, 199, 109, 0.15)',
            borderRadius: '8px',
            padding: '12px',
            display: 'flex',
            flexDirection: 'column'
          }}>
            <div style={{ fontSize: '10px', color: '#999', marginBottom: '8px', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
              Win Rate
            </div>
            <div style={{
              fontSize: '20px',
              fontWeight: 'bold',
              color: metrics.ratings.winRate >= 20 ? '#10b981' : metrics.ratings.winRate >= 15 ? '#f59e0b' : '#ef4444',
              marginBottom: '4px'
            }}>
              {metrics.ratings.winRate.toFixed(1)}/25
            </div>
            {/* Progress bar */}
            <div style={{
              width: '100%',
              height: '4px',
              backgroundColor: '#2a2a2a',
              borderRadius: '2px',
              overflow: 'hidden'
            }}>
              <div style={{
                height: '100%',
                width: `${(metrics.ratings.winRate / 25) * 100}%`,
                backgroundColor: metrics.ratings.winRate >= 20 ? '#10b981' : metrics.ratings.winRate >= 15 ? '#f59e0b' : '#ef4444',
                borderRadius: '2px',
                transition: 'width 0.3s ease'
              }} />
            </div>
          </div>

          {/* Profit Factor */}
          <div style={{
            backgroundColor: '#1a1a1a',
            border: '1px solid rgba(245, 199, 109, 0.15)',
            borderRadius: '8px',
            padding: '12px',
            display: 'flex',
            flexDirection: 'column'
          }}>
            <div style={{ fontSize: '10px', color: '#999', marginBottom: '8px', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
              Profit Factor
            </div>
            <div style={{
              fontSize: '20px',
              fontWeight: 'bold',
              color: metrics.ratings.profitFactor >= 20 ? '#10b981' : metrics.ratings.profitFactor >= 15 ? '#f59e0b' : '#ef4444',
              marginBottom: '4px'
            }}>
              {metrics.ratings.profitFactor.toFixed(1)}/25
            </div>
            {/* Progress bar */}
            <div style={{
              width: '100%',
              height: '4px',
              backgroundColor: '#2a2a2a',
              borderRadius: '2px',
              overflow: 'hidden'
            }}>
              <div style={{
                height: '100%',
                width: `${(metrics.ratings.profitFactor / 25) * 100}%`,
                backgroundColor: metrics.ratings.profitFactor >= 20 ? '#10b981' : metrics.ratings.profitFactor >= 15 ? '#f59e0b' : '#ef4444',
                borderRadius: '2px',
                transition: 'width 0.3s ease'
              }} />
            </div>
          </div>

          {/* Risk/Reward */}
          <div style={{
            backgroundColor: '#1a1a1a',
            border: '1px solid rgba(245, 199, 109, 0.15)',
            borderRadius: '8px',
            padding: '12px',
            display: 'flex',
            flexDirection: 'column'
          }}>
            <div style={{ fontSize: '10px', color: '#999', marginBottom: '8px', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
              Risk/Reward
            </div>
            <div style={{
              fontSize: '20px',
              fontWeight: 'bold',
              color: metrics.ratings.riskReward >= 20 ? '#10b981' : metrics.ratings.riskReward >= 15 ? '#f59e0b' : '#ef4444',
              marginBottom: '4px'
            }}>
              {metrics.ratings.riskReward.toFixed(1)}/25
            </div>
            {/* Progress bar */}
            <div style={{
              width: '100%',
              height: '4px',
              backgroundColor: '#2a2a2a',
              borderRadius: '2px',
              overflow: 'hidden'
            }}>
              <div style={{
                height: '100%',
                width: `${(metrics.ratings.riskReward / 25) * 100}%`,
                backgroundColor: metrics.ratings.riskReward >= 20 ? '#10b981' : metrics.ratings.riskReward >= 15 ? '#f59e0b' : '#ef4444',
                borderRadius: '2px',
                transition: 'width 0.3s ease'
              }} />
            </div>
          </div>

          {/* Consistency */}
          <div style={{
            backgroundColor: '#1a1a1a',
            border: '1px solid rgba(245, 199, 109, 0.15)',
            borderRadius: '8px',
            padding: '12px',
            display: 'flex',
            flexDirection: 'column'
          }}>
            <div style={{ fontSize: '10px', color: '#999', marginBottom: '8px', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
              Consistency
            </div>
            <div style={{
              fontSize: '20px',
              fontWeight: 'bold',
              color: metrics.ratings.consistency >= 20 ? '#10b981' : metrics.ratings.consistency >= 15 ? '#f59e0b' : '#ef4444',
              marginBottom: '4px'
            }}>
              {metrics.ratings.consistency.toFixed(1)}/25
            </div>
            {/* Progress bar */}
            <div style={{
              width: '100%',
              height: '4px',
              backgroundColor: '#2a2a2a',
              borderRadius: '2px',
              overflow: 'hidden'
            }}>
              <div style={{
                height: '100%',
                width: `${(metrics.ratings.consistency / 25) * 100}%`,
                backgroundColor: metrics.ratings.consistency >= 20 ? '#10b981' : metrics.ratings.consistency >= 15 ? '#f59e0b' : '#ef4444',
                borderRadius: '2px',
                transition: 'width 0.3s ease'
              }} />
            </div>
          </div>
        </div>
      </div>
    </>
  );
};
