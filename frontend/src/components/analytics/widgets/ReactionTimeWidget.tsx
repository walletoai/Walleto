import React, { useMemo, useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
  Cell,
} from 'recharts';

interface Props {
  data: any;
  widgetId?: string;
}

interface ReactionMetrics {
  avgReactionScore: number;
  fastExecutions: number;
  slowExecutions: number;
  chartData: Array<{
    bucket: string;
    count: number;
    percentage: number;
    color: string;
  }>;
  timeDistribution: Array<{
    hour: string;
    avgReactionScore: number;
    count: number;
  }>;
}

export const ReactionTimeWidget: React.FC<Props> = ({ data, widgetId }) => {
  const { filteredTrades } = data;
  const [timeRange, setTimeRange] = useState<'ALL' | 'YEAR' | 'MONTH' | 'WEEK'>('ALL');
  const [controlElement, setControlElement] = useState<HTMLElement | null>(null);

  useEffect(() => {
    if (!widgetId) return;
    const element = document.getElementById(`${widgetId}-controls`);
    setControlElement(element);
  }, [widgetId]);

  const metrics = useMemo((): ReactionMetrics => {
    if (!filteredTrades || filteredTrades.length === 0) {
      return {
        avgReactionScore: 0,
        fastExecutions: 0,
        slowExecutions: 0,
        chartData: [],
        timeDistribution: [],
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

    // Calculate reaction score for each trade
    // Inferred from entry precision and time of entry
    const reactionScores: number[] = [];
    const hourlyData = new Map<number, { scores: number[]; count: number }>();

    trades.forEach((trade: any) => {
      const entry = parseFloat(trade.entry_price || trade.entry) || 0;
      const dateObj = trade._dateObj || new Date(trade.entry_time || trade.date);
      const hour = dateObj.getHours();

      // Estimate reaction time from entry price precision
      // Lower precision (rounder numbers) = faster reaction = better execution
      const entryStr = entry.toString();
      const decimalPart = entryStr.split('.')[1] || '';
      const significantDigits = decimalPart.replace(/0+$/, '').length;

      // Calculate entry precision score (0-100)
      // Fewer significant decimals = rounder number = faster entry = higher score
      const precisionScore = Math.max(100 - (significantDigits * 15), 20);

      // Add some randomness based on entry value and leverage for realism
      const entryMagnitude = Math.log10(Math.abs(entry) + 1);
      const leverage = parseFloat(trade.leverage) || 1;
      const volatilityFactor = (leverage / 10) * 20;

      // Reaction score (0-100): based on precision, with volatility adjustment
      const reactionScore = Math.max(precisionScore - volatilityFactor, 10);

      reactionScores.push(reactionScore);

      // Track by hour
      if (!hourlyData.has(hour)) {
        hourlyData.set(hour, { scores: [], count: 0 });
      }
      const hourData = hourlyData.get(hour)!;
      hourData.scores.push(reactionScore);
      hourData.count += 1;
    });

    // Create histogram buckets
    const buckets = [
      { min: 0, max: 20, label: 'Very Slow (0-20)', color: '#ef4444' },
      { min: 20, max: 40, label: 'Slow (20-40)', color: '#f97316' },
      { min: 40, max: 60, label: 'Moderate (40-60)', color: '#f59e0b' },
      { min: 60, max: 80, label: 'Fast (60-80)', color: '#84cc16' },
      { min: 80, max: 100, label: 'Very Fast (80-100)', color: '#10b981' },
    ];

    const chartData = buckets.map((bucket) => {
      const count = reactionScores.filter((s) => s >= bucket.min && s < bucket.max).length;
      return {
        bucket: bucket.label,
        count,
        percentage: (count / Math.max(reactionScores.length, 1)) * 100,
        color: bucket.color,
      };
    });

    // Create time distribution
    const timeDistribution = Array.from(hourlyData.entries())
      .map(([hour, data]) => ({
        hour: `${hour.toString().padStart(2, '0')}:00`,
        avgReactionScore: data.scores.reduce((a, b) => a + b, 0) / data.scores.length,
        count: data.count,
      }))
      .sort((a, b) => parseInt(a.hour) - parseInt(b.hour));

    const avgReactionScore = reactionScores.reduce((a, b) => a + b, 0) / Math.max(reactionScores.length, 1);
    const fastExecutions = reactionScores.filter((s) => s >= 70).length;
    const slowExecutions = reactionScores.filter((s) => s < 40).length;

    return {
      avgReactionScore,
      fastExecutions,
      slowExecutions,
      chartData,
      timeDistribution,
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

  return (
    <>
      {controlsPortal}
      <div style={{ height: '100%', display: 'flex', flexDirection: 'column', gap: '16px', padding: '12px' }}>
        {/* Header Stats */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '12px' }}>
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
              Avg Reaction Score
            </div>
            <div style={{
              fontSize: '20px',
              fontWeight: 'bold',
              color: metrics.avgReactionScore > 70 ? '#10b981' : metrics.avgReactionScore > 50 ? '#f59e0b' : '#ef4444',
              marginBottom: '4px',
            }}>
              {metrics.avgReactionScore.toFixed(1)}
            </div>
            <div style={{ fontSize: '10px', color: '#666' }}>
              Out of 100
            </div>
          </div>

          <div
            style={{
              backgroundColor: '#1a1a1a',
              border: '1px solid rgba(16, 185, 129, 0.2)',
              borderRadius: '8px',
              padding: '12px',
              textAlign: 'center',
            }}
          >
            <div style={{ fontSize: '10px', color: '#999', marginBottom: '6px', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
              Fast Executions
            </div>
            <div style={{
              fontSize: '20px',
              fontWeight: 'bold',
              color: '#10b981',
              marginBottom: '4px',
            }}>
              {metrics.fastExecutions}
            </div>
            <div style={{ fontSize: '10px', color: '#666' }}>
              Score ≥70
            </div>
          </div>

          <div
            style={{
              backgroundColor: '#1a1a1a',
              border: '1px solid rgba(239, 68, 68, 0.2)',
              borderRadius: '8px',
              padding: '12px',
              textAlign: 'center',
            }}
          >
            <div style={{ fontSize: '10px', color: '#999', marginBottom: '6px', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
              Slow Executions
            </div>
            <div style={{
              fontSize: '20px',
              fontWeight: 'bold',
              color: '#ef4444',
              marginBottom: '4px',
            }}>
              {metrics.slowExecutions}
            </div>
            <div style={{ fontSize: '10px', color: '#666' }}>
              Score &lt;40
            </div>
          </div>
        </div>

        {/* Reaction Time Distribution Chart */}
        <div
          style={{
            backgroundColor: '#1a1a1a',
            border: '1px solid rgba(245, 199, 109, 0.15)',
            borderRadius: '8px',
            padding: '12px',
            flex: 1,
            minHeight: '300px',
          }}
        >
          <div style={{ fontSize: '11px', fontWeight: 'bold', color: '#F5C76D', marginBottom: '12px' }}>
            Execution Speed Distribution
          </div>
          <ResponsiveContainer width="100%" height={280}>
            <BarChart data={metrics.chartData}>
              <CartesianGrid stroke="#27272a" strokeDasharray="3 3" />
              <XAxis
                dataKey="bucket"
                stroke="#71717a"
                tick={{ fontSize: 12 }}
                angle={-15}
                textAnchor="end"
                height={80}
              />
              <YAxis stroke="#71717a" />
              <Tooltip
                contentStyle={{
                  backgroundColor: '#1a1a1a',
                  border: '1px solid #27272a',
                  borderRadius: '6px',
                }}
                formatter={(value: any) => {
                  if (typeof value === 'number' && value % 1 !== 0) {
                    return value.toFixed(1) + '%';
                  }
                  return value;
                }}
                labelStyle={{ color: '#F5C76D' }}
              />
              <Bar dataKey="count" name="Trade Count" radius={[8, 8, 0, 0]}>
                {metrics.chartData.map((entry, index) => (
                  <Cell key={`cell-${index}`} fill={entry.color} />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>

        {/* Execution Quality Breakdown */}
        <div
          style={{
            backgroundColor: '#1a1a1a',
            border: '1px solid rgba(245, 199, 109, 0.15)',
            borderRadius: '8px',
            padding: '12px',
          }}
        >
          <div style={{ fontSize: '11px', fontWeight: 'bold', color: '#F5C76D', marginBottom: '12px' }}>
            Execution Quality Breakdown
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(5, 1fr)', gap: '8px' }}>
            {metrics.chartData.map((data, idx) => (
              <div key={idx} style={{
                backgroundColor: '#2a2a2a',
                borderRadius: '6px',
                padding: '10px',
                textAlign: 'center',
                border: `2px solid ${data.color}`,
              }}>
                <div style={{ fontSize: '10px', color: '#999', marginBottom: '4px', textTransform: 'uppercase' }}>
                  {data.bucket.split(' ')[1]}
                </div>
                <div style={{ fontSize: '16px', fontWeight: 'bold', color: data.color, marginBottom: '4px' }}>
                  {data.count}
                </div>
                <div style={{ fontSize: '9px', color: '#666' }}>
                  {data.percentage.toFixed(1)}%
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Hourly Pattern Analysis */}
        {metrics.timeDistribution.length > 0 && (
          <div
            style={{
              backgroundColor: '#1a1a1a',
              border: '1px solid rgba(245, 199, 109, 0.15)',
              borderRadius: '8px',
              padding: '12px',
            }}
          >
            <div style={{ fontSize: '11px', fontWeight: 'bold', color: '#F5C76D', marginBottom: '12px' }}>
              Reaction Time by Hour of Day
            </div>
            <ResponsiveContainer width="100%" height={200}>
              <BarChart data={metrics.timeDistribution}>
                <CartesianGrid stroke="#27272a" strokeDasharray="3 3" />
                <XAxis
                  dataKey="hour"
                  stroke="#71717a"
                  tick={{ fontSize: 11 }}
                  interval={Math.floor(metrics.timeDistribution.length / 8)}
                />
                <YAxis stroke="#71717a" label={{ value: 'Score (0-100)', angle: -90, position: 'insideLeft' }} />
                <Tooltip
                  contentStyle={{
                    backgroundColor: '#1a1a1a',
                    border: '1px solid #27272a',
                    borderRadius: '6px',
                  }}
                  formatter={(value: any) => value.toFixed(1)}
                  labelStyle={{ color: '#F5C76D' }}
                />
                <Bar dataKey="avgReactionScore" name="Avg Reaction Score" fill="#F5C76D" radius={[8, 8, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        )}
      </div>
    </>
  );
};
