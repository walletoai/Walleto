import React, { useMemo } from 'react';
import {
  ResponsiveContainer,
  ComposedChart,
  Bar,
  Line,
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

interface RegimeData {
  date: string;
  regime: 'Trending' | 'Ranging' | 'Volatile';
  volatility: number;
  avgWinRate: number;
  pnl: number;
  trades: number;
}

export const RegimeDetectionWidget: React.FC<Props> = ({ data }) => {
  const { filteredTrades, dailySeries } = data;

  const chartData = useMemo(() => {
    if (!filteredTrades || filteredTrades.length === 0) return [];

    // Group trades by date and calculate daily stats
    const dailyMap = new Map<string, {
      pnl: number;
      trades: number;
      wins: number;
      returns: number[];
      prices: number[];
    }>();

    filteredTrades.forEach((t: any) => {
      const day = t._dateObj.toISOString().slice(0, 10);
      if (!dailyMap.has(day)) {
        dailyMap.set(day, { pnl: 0, trades: 0, wins: 0, returns: [], prices: [] });
      }
      const entry = dailyMap.get(day)!;
      entry.pnl += t.pnl_usd || 0;
      entry.trades += 1;
      if ((t.pnl_usd || 0) >= 0) entry.wins += 1;
      entry.returns.push((t.pnl_usd || 0) / Math.max(Math.abs(t.entry_price * t.position_size || 100), 1));
      entry.prices.push(t.close_price || t.entry_price || 100);
    });

    // Create regime data with 5-day rolling window analysis
    const sorted = Array.from(dailyMap.entries())
      .sort((a, b) => a[0].localeCompare(b[0]))
      .map(([day, stats], index, arr) => {
        // Calculate rolling metrics over past 5 days
        const startIdx = Math.max(0, index - 4);
        const window = arr.slice(startIdx, index + 1);

        // Calculate volatility (standard deviation of returns)
        const allReturns = window.flatMap(([_, s]) => s.returns);
        const meanReturn = allReturns.reduce((a, b) => a + b, 0) / allReturns.length;
        const volatility = Math.sqrt(
          allReturns.reduce((sum, r) => sum + Math.pow(r - meanReturn, 2), 0) / allReturns.length
        ) * 100; // Convert to percentage

        // Calculate win rate over window
        const totalWins = window.reduce((sum, [_, s]) => sum + s.wins, 0);
        const totalTrades = window.reduce((sum, [_, s]) => sum + s.trades, 0);
        const avgWinRate = totalTrades > 0 ? (totalWins / totalTrades) * 100 : 0;

        // Detect regime based on volatility and win rate
        let regime: 'Trending' | 'Ranging' | 'Volatile';
        if (volatility > 3) {
          regime = 'Volatile';
        } else if (avgWinRate > 55) {
          regime = 'Trending';
        } else {
          regime = 'Ranging';
        }

        return {
          date: day.slice(5), // MM-DD format
          regime,
          volatility: Number(volatility.toFixed(2)),
          avgWinRate: Number(avgWinRate.toFixed(1)),
          pnl: Number(stats.pnl.toFixed(2)),
          trades: stats.trades,
        };
      });

    return sorted;
  }, [filteredTrades]);

  if (chartData.length === 0) {
    return <div className="text-center py-8 text-gray-500">No data in this range yet.</div>;
  }

  // Calculate regime statistics
  const trendingDays = chartData.filter(d => d.regime === 'Trending').length;
  const rangingDays = chartData.filter(d => d.regime === 'Ranging').length;
  const volatileDays = chartData.filter(d => d.regime === 'Volatile').length;

  const trendingPnl = chartData
    .filter(d => d.regime === 'Trending')
    .reduce((sum, d) => sum + d.pnl, 0);
  const rangingPnl = chartData
    .filter(d => d.regime === 'Ranging')
    .reduce((sum, d) => sum + d.pnl, 0);
  const volatilePnl = chartData
    .filter(d => d.regime === 'Volatile')
    .reduce((sum, d) => sum + d.pnl, 0);

  const trendingAvg = trendingDays > 0 ? trendingPnl / trendingDays : 0;
  const rangingAvg = rangingDays > 0 ? rangingPnl / rangingDays : 0;
  const volatileAvg = volatileDays > 0 ? volatilePnl / volatileDays : 0;

  const bestRegime = [
    { regime: 'Trending', avg: trendingAvg, pnl: trendingPnl, days: trendingDays },
    { regime: 'Ranging', avg: rangingAvg, pnl: rangingPnl, days: rangingDays },
    { regime: 'Volatile', avg: volatileAvg, pnl: volatilePnl, days: volatileDays },
  ].reduce((best, current) => (current.avg > best.avg ? current : best));

  const renderTooltip = (props: any) => {
    const { payload } = props;
    if (payload && payload.length > 0) {
      const dataPoint = payload[0].payload;
      return (
        <div style={{
          backgroundColor: '#161616',
          border: '1px solid #27272a',
          borderRadius: '8px',
          padding: '12px',
          color: '#fff'
        }}>
          <div style={{ fontWeight: 'bold', marginBottom: '8px', color: '#D4AF37' }}>
            {dataPoint.date}
          </div>
          <div style={{
            fontSize: '12px',
            marginBottom: '4px',
            color: dataPoint.regime === 'Trending' ? '#3b82f6' : dataPoint.regime === 'Ranging' ? '#f59e0b' : '#ef4444'
          }}>
            Regime: {dataPoint.regime}
          </div>
          <div style={{ fontSize: '12px', marginBottom: '4px', color: '#a0a0a0' }}>
            Volatility: {dataPoint.volatility.toFixed(2)}%
          </div>
          <div style={{ fontSize: '12px', marginBottom: '4px', color: dataPoint.avgWinRate >= 50 ? '#10b981' : '#ef4444' }}>
            Win Rate: {dataPoint.avgWinRate.toFixed(1)}%
          </div>
          <div style={{ fontSize: '12px', color: dataPoint.pnl >= 0 ? '#10b981' : '#ef4444' }}>
            Daily PnL: ${dataPoint.pnl.toFixed(2)}
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
            Trending Days
          </div>
          <div style={{ fontSize: '20px', fontWeight: 'bold', color: '#3b82f6', marginBottom: '2px' }}>
            {trendingDays}
          </div>
          <div style={{ fontSize: '10px', color: '#666' }}>
            ${trendingAvg.toFixed(2)}/day
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
            Ranging Days
          </div>
          <div style={{ fontSize: '20px', fontWeight: 'bold', color: '#f59e0b', marginBottom: '2px' }}>
            {rangingDays}
          </div>
          <div style={{ fontSize: '10px', color: '#666' }}>
            ${rangingAvg.toFixed(2)}/day
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
            Volatile Days
          </div>
          <div style={{ fontSize: '20px', fontWeight: 'bold', color: '#ef4444', marginBottom: '2px' }}>
            {volatileDays}
          </div>
          <div style={{ fontSize: '10px', color: '#666' }}>
            ${volatileAvg.toFixed(2)}/day
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
            Best Regime
          </div>
          <div style={{
            fontSize: '16px',
            fontWeight: 'bold',
            color: bestRegime.regime === 'Trending' ? '#3b82f6' : bestRegime.regime === 'Ranging' ? '#f59e0b' : '#ef4444',
            marginBottom: '2px'
          }}>
            {bestRegime.regime}
          </div>
          <div style={{ fontSize: '10px', color: '#666' }}>
            ${bestRegime.avg.toFixed(2)}/day avg
          </div>
        </div>
      </div>

      {/* Chart */}
      <div style={{ height: 320, width: '100%' }}>
        <ResponsiveContainer width="100%" height={320}>
          <ComposedChart
            data={chartData}
            margin={{ top: 20, right: 20, left: 60, bottom: 60 }}
          >
            <CartesianGrid stroke="#27272a" strokeDasharray="3 3" />
            <XAxis
              dataKey="date"
              stroke="#71717a"
              tick={{ fontSize: 10 }}
              angle={-45}
              textAnchor="end"
              height={80}
              interval={Math.max(0, Math.floor(chartData.length / 10))}
            />
            <YAxis
              yAxisId="left"
              stroke="#71717a"
              tick={{ fontSize: 11 }}
              label={{ value: 'Volatility (%)', angle: -90, position: 'insideLeft', offset: -10 }}
            />
            <YAxis
              yAxisId="right"
              orientation="right"
              stroke="#71717a"
              tick={{ fontSize: 11 }}
              label={{ value: 'Win Rate (%)', angle: 90, position: 'insideRight', offset: -10 }}
            />
            <Tooltip content={renderTooltip} />
            <Legend wrapperStyle={{ paddingTop: '12px' }} />

            {/* Bar chart for volatility */}
            <Bar
              yAxisId="left"
              dataKey="volatility"
              name="Volatility"
              radius={[4, 4, 0, 0]}
              fill="rgba(239, 68, 68, 0.3)"
              isAnimationActive={false}
            >
              {chartData.map((entry, index) => (
                <Cell
                  key={`cell-${index}`}
                  fill={
                    entry.regime === 'Volatile'
                      ? 'rgba(239, 68, 68, 0.6)'
                      : entry.regime === 'Ranging'
                      ? 'rgba(245, 158, 11, 0.4)'
                      : 'rgba(59, 130, 246, 0.3)'
                  }
                />
              ))}
            </Bar>

            {/* Line for win rate */}
            <Line
              yAxisId="right"
              type="monotone"
              dataKey="avgWinRate"
              name="Win Rate"
              stroke="#10b981"
              strokeWidth={3}
              dot={false}
              isAnimationActive={false}
            />
          </ComposedChart>
        </ResponsiveContainer>
      </div>

      {/* Regime Definition Box */}
      <div style={{ marginTop: '12px', padding: '12px', backgroundColor: '#1a1a1a', borderRadius: '8px', border: '1px solid #27272a', fontSize: '11px', color: '#999' }}>
        <div style={{ marginBottom: '6px', color: '#D4AF37', fontWeight: 'bold' }}>Regime Definitions:</div>
        <div style={{ marginBottom: '4px' }}>
          <span style={{ color: '#3b82f6' }}>● Trending:</span> High win rate ({'>'}55%) with low-moderate volatility - Follow the trend
        </div>
        <div style={{ marginBottom: '4px' }}>
          <span style={{ color: '#f59e0b' }}>● Ranging:</span> Moderate win rate with low volatility - Mean reversion strategies
        </div>
        <div>
          <span style={{ color: '#ef4444' }}>● Volatile:</span> High volatility ({'>'}3%) regardless of win rate - Reduce size, increase caution
        </div>
      </div>
    </div>
  );
};
