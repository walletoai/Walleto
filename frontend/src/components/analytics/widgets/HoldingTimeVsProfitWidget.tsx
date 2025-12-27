import React, { useMemo } from 'react';
import {
  ResponsiveContainer,
  BarChart,
  Bar,
  CartesianGrid,
  XAxis,
  YAxis,
  Tooltip,
  Cell,
  Legend,
} from "recharts";

interface Props {
  data: any;
}

interface HoldingTimeBucket {
  range: string;
  profitable: number;
  losing: number;
  totalPnl: number;
  avgPnl: number;
  count: number;
}

export const HoldingTimeVsProfitWidget: React.FC<Props> = ({ data }) => {
  const { filteredTrades } = data;

  const chartData = useMemo(() => {
    if (!filteredTrades || filteredTrades.length === 0) return [];

    // Create holding time buckets
    const buckets: Record<string, HoldingTimeBucket> = {
      '0-1h': { range: '0-1h', profitable: 0, losing: 0, totalPnl: 0, avgPnl: 0, count: 0 },
      '1-4h': { range: '1-4h', profitable: 0, losing: 0, totalPnl: 0, avgPnl: 0, count: 0 },
      '4-8h': { range: '4-8h', profitable: 0, losing: 0, totalPnl: 0, avgPnl: 0, count: 0 },
      '8-24h': { range: '8-24h', profitable: 0, losing: 0, totalPnl: 0, avgPnl: 0, count: 0 },
      '24h+': { range: '24h+', profitable: 0, losing: 0, totalPnl: 0, avgPnl: 0, count: 0 },
    };

    filteredTrades.forEach((trade: any) => {
      const pnl = trade.pnl_usd || 0;

      // Calculate holding time from entry_time and exit_time
      let holdingHours = 0;
      const entryTime = trade.entry_time || trade.date;
      const exitTime = trade.exit_time;

      if (entryTime && exitTime) {
        const entryDate = new Date(entryTime);
        const exitDate = new Date(exitTime);
        if (!isNaN(entryDate.getTime()) && !isNaN(exitDate.getTime())) {
          holdingHours = (exitDate.getTime() - entryDate.getTime()) / (1000 * 60 * 60);
        }
      }

      // If no valid holding time, estimate based on trade characteristics
      if (holdingHours <= 0) {
        // Default to a reasonable estimate - most perp trades are short-term
        holdingHours = 2;
      }

      let bucket: HoldingTimeBucket | null = null;
      if (holdingHours < 1) bucket = buckets['0-1h'];
      else if (holdingHours < 4) bucket = buckets['1-4h'];
      else if (holdingHours < 8) bucket = buckets['4-8h'];
      else if (holdingHours < 24) bucket = buckets['8-24h'];
      else bucket = buckets['24h+'];

      if (bucket) {
        if (pnl >= 0) bucket.profitable += 1;
        else bucket.losing += 1;
        bucket.totalPnl += pnl;
        bucket.count += 1;
      }
    });

    // Calculate average PnL per bucket
    Object.values(buckets).forEach(bucket => {
      bucket.avgPnl = bucket.count > 0 ? bucket.totalPnl / bucket.count : 0;
    });

    return Object.values(buckets);
  }, [filteredTrades]);

  if (chartData.length === 0) {
    return <div className="text-center py-8 text-gray-500">No data in this range yet.</div>;
  }

  // Calculate statistics
  const totalTrades = chartData.reduce((sum, b) => sum + b.count, 0);
  const totalProfitable = chartData.reduce((sum, b) => sum + b.profitable, 0);
  const totalPnl = chartData.reduce((sum, b) => sum + b.totalPnl, 0);
  const winRate = (totalProfitable / totalTrades) * 100;

  // Find best holding time bucket
  const bestBucket = chartData.reduce((best, current) =>
    current.avgPnl > best.avgPnl ? current : best
  );

  const renderTooltip = (props: any) => {
    const { payload } = props;
    if (payload && payload.length > 0) {
      const data = payload[0].payload;
      const bucketWinRate = data.count > 0 ? ((data.profitable / data.count) * 100).toFixed(1) : '0';
      return (
        <div style={{
          backgroundColor: '#161616',
          border: '1px solid #27272a',
          borderRadius: '8px',
          padding: '12px',
          color: '#fff'
        }}>
          <div style={{ fontWeight: 'bold', marginBottom: '8px', color: '#D4AF37' }}>
            {data.range} Holding
          </div>
          <div style={{ fontSize: '12px', marginBottom: '4px', color: '#a0a0a0' }}>
            Trades: {data.count}
          </div>
          <div style={{ fontSize: '12px', marginBottom: '4px', color: '#f5c76d' }}>
            Win Rate: {bucketWinRate}%
          </div>
          <div style={{ fontSize: '12px', marginBottom: '4px', color: data.avgPnl >= 0 ? '#10b981' : '#ef4444' }}>
            Total PnL: ${data.totalPnl.toFixed(2)}
          </div>
          <div style={{ fontSize: '12px', color: data.avgPnl >= 0 ? '#10b981' : '#ef4444' }}>
            Avg/Trade: ${data.avgPnl.toFixed(2)}
          </div>
        </div>
      );
    }
    return null;
  };

  return (
    <div style={{ height: '100%', display: 'flex', flexDirection: 'column' }}>
      {/* Stats Row */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '10px', marginBottom: '16px' }}>
        <div style={{
          backgroundColor: '#1a1a1a',
          border: '1px solid #27272a',
          borderRadius: '8px',
          padding: '12px',
          textAlign: 'center'
        }}>
          <div style={{ fontSize: '10px', color: '#999', marginBottom: '4px', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
            Total PnL
          </div>
          <div style={{ fontSize: '16px', fontWeight: 'bold', color: totalPnl >= 0 ? '#10b981' : '#ef4444', marginBottom: '2px' }}>
            ${totalPnl.toFixed(0)}
          </div>
          <div style={{ fontSize: '10px', color: '#666' }}>
            All trades
          </div>
        </div>

        <div style={{
          backgroundColor: '#1a1a1a',
          border: '1px solid #27272a',
          borderRadius: '8px',
          padding: '12px',
          textAlign: 'center'
        }}>
          <div style={{ fontSize: '10px', color: '#999', marginBottom: '4px', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
            Overall Win Rate
          </div>
          <div style={{ fontSize: '16px', fontWeight: 'bold', color: winRate >= 50 ? '#10b981' : '#ef4444', marginBottom: '2px' }}>
            {winRate.toFixed(1)}%
          </div>
          <div style={{ fontSize: '10px', color: '#666' }}>
            {totalProfitable}/{totalTrades} wins
          </div>
        </div>

        <div style={{
          backgroundColor: '#1a1a1a',
          border: '1px solid #27272a',
          borderRadius: '8px',
          padding: '12px',
          textAlign: 'center'
        }}>
          <div style={{ fontSize: '10px', color: '#999', marginBottom: '4px', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
            Best Time Period
          </div>
          <div style={{ fontSize: '16px', fontWeight: 'bold', color: '#10b981', marginBottom: '2px' }}>
            {bestBucket.range}
          </div>
          <div style={{ fontSize: '10px', color: '#666' }}>
            ${bestBucket.avgPnl.toFixed(2)}/trade
          </div>
        </div>

        <div style={{
          backgroundColor: '#1a1a1a',
          border: '1px solid #27272a',
          borderRadius: '8px',
          padding: '12px',
          textAlign: 'center'
        }}>
          <div style={{ fontSize: '10px', color: '#999', marginBottom: '4px', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
            Avg PnL/Trade
          </div>
          <div style={{ fontSize: '16px', fontWeight: 'bold', color: (totalPnl / totalTrades) >= 0 ? '#10b981' : '#ef4444', marginBottom: '2px' }}>
            ${(totalPnl / totalTrades).toFixed(2)}
          </div>
          <div style={{ fontSize: '10px', color: '#666' }}>
            Overall average
          </div>
        </div>
      </div>

      {/* Chart */}
      <div style={{ height: 320, width: '100%' }}>
        <ResponsiveContainer width="100%" height={320}>
          <BarChart
            data={chartData}
            margin={{ top: 20, right: 20, left: 60, bottom: 60 }}
          >
            <CartesianGrid stroke="#27272a" strokeDasharray="3 3" />
            <XAxis
              dataKey="range"
              stroke="#71717a"
              tick={{ fontSize: 11 }}
              label={{ value: 'Holding Time Period', position: 'insideBottomCenter', offset: -10, fill: '#71717a' }}
            />
            <YAxis
              stroke="#71717a"
              tick={{ fontSize: 11 }}
              label={{ value: 'Avg PnL per Trade ($)', angle: -90, position: 'insideLeft', offset: -10 }}
            />
            <Tooltip content={renderTooltip} />
            <Legend wrapperStyle={{ paddingTop: '12px' }} />

            {/* Stacked bars for profit/loss comparison */}
            <Bar
              dataKey="profitable"
              name="Winning Trades"
              stackId="stack"
              fill="#10b981"
              radius={[4, 4, 0, 0]}
              isAnimationActive={false}
            />
            <Bar
              dataKey="losing"
              name="Losing Trades"
              stackId="stack"
              fill="#ef4444"
              radius={[0, 0, 4, 4]}
              isAnimationActive={false}
            />
          </BarChart>
        </ResponsiveContainer>
      </div>

      {/* Insight Text */}
      <div style={{ marginTop: '12px', padding: '10px', backgroundColor: '#1a1a1a', borderRadius: '8px', border: '1px solid #27272a', fontSize: '12px', color: '#999' }}>
        <span style={{ color: '#D4AF37' }}>💡 Insight:</span> Best profitability during <span style={{ color: '#10b981' }}>{bestBucket.range}</span> holdings with ${bestBucket.avgPnl.toFixed(2)}/trade
      </div>
    </div>
  );
};
