import React, { useMemo, useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import {
  ScatterChart,
  Scatter,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Cell,
  ReferenceLine,
} from 'recharts';

interface Props {
  data: any;
  widgetId?: string;
}

interface VolatilityDataPoint {
  volatility: number;
  pnl: number;
  symbol: string;
  size: number;
  leverage: number;
  label: string;
}

interface VolatilityMetrics {
  avgVolatility: number;
  avgPnL: number;
  correlation: number;
  bestVolatilityCondition: 'low' | 'medium' | 'high';
  dataPoints: VolatilityDataPoint[];
  volatilityBuckets: Array<{
    volatilityRange: string;
    avgPnL: number;
    count: number;
    winRate: number;
  }>;
}

export const VolatilityVsPerformanceWidget: React.FC<Props> = ({ data, widgetId }) => {
  const { filteredTrades } = data;
  const [tradeLimit, setTradeLimit] = useState<string>("50");
  const [controlElement, setControlElement] = useState<HTMLElement | null>(null);

  useEffect(() => {
    if (!widgetId) return;
    const element = document.getElementById(`${widgetId}-controls`);
    setControlElement(element);
  }, [widgetId]);

  const metrics = useMemo((): VolatilityMetrics => {
    if (!filteredTrades || filteredTrades.length === 0) {
      return {
        avgVolatility: 0,
        avgPnL: 0,
        correlation: 0,
        bestVolatilityCondition: 'medium',
        dataPoints: [],
        volatilityBuckets: [],
      };
    }

    // Sort by date (most recent first) and limit
    const sortedTrades = [...filteredTrades].sort((a, b) => {
      const dateA = a._dateObj || new Date(a.entry_time || a.date);
      const dateB = b._dateObj || new Date(b.entry_time || b.date);
      return dateB.getTime() - dateA.getTime();
    });

    const limit = tradeLimit === "ALL" ? sortedTrades.length : parseInt(tradeLimit);
    const trades = sortedTrades.slice(0, limit);

    // Calculate volatility for each trade
    const dataPoints: VolatilityDataPoint[] = trades
      .map((trade: any) => {
        const entry = parseFloat(trade.entry_price || trade.entry) || 0;
        const exit = parseFloat(trade.exit_price || trade.exit) || 0;
        const pnl = parseFloat(trade.pnl_usd) || 0;
        const symbol = trade.symbol || 'Unknown';
        const size = parseFloat(trade.quantity || trade.size) || 0;
        const leverage = parseFloat(trade.leverage) || 1;

        // Calculate volatility as percentage move (entry to exit)
        const move = Math.abs(exit - entry) / entry;
        const volatility = move * 100 * leverage; // Leverage amplifies volatility exposure

        return {
          volatility: Math.min(volatility, 200), // Cap at 200% for visualization
          pnl,
          symbol,
          size,
          leverage,
          label: `${symbol}: ${volatility.toFixed(2)}% vol, $${pnl.toFixed(0)} PnL`,
        };
      })
      .filter((p) => p.volatility >= 0);

    // Calculate correlation between volatility and PnL
    const meanVolatility = dataPoints.reduce((sum, p) => sum + p.volatility, 0) / Math.max(dataPoints.length, 1);
    const meanPnL = dataPoints.reduce((sum, p) => sum + p.pnl, 0) / Math.max(dataPoints.length, 1);

    let covariance = 0;
    let volatilityVariance = 0;
    let pnlVariance = 0;

    dataPoints.forEach((p) => {
      covariance += (p.volatility - meanVolatility) * (p.pnl - meanPnL);
      volatilityVariance += Math.pow(p.volatility - meanVolatility, 2);
      pnlVariance += Math.pow(p.pnl - meanPnL, 2);
    });

    const correlation =
      volatilityVariance > 0 && pnlVariance > 0
        ? covariance / Math.sqrt(volatilityVariance * pnlVariance)
        : 0;

    // Create volatility buckets
    const volatilityBuckets = [
      { min: 0, max: 5, label: 'Very Low (0-5%)' },
      { min: 5, max: 10, label: 'Low (5-10%)' },
      { min: 10, max: 20, label: 'Medium (10-20%)' },
      { min: 20, max: 50, label: 'High (20-50%)' },
      { min: 50, max: 200, label: 'Very High (50%+)' },
    ]
      .map((bucket) => {
        const bucketsData = dataPoints.filter((p) => p.volatility >= bucket.min && p.volatility < bucket.max);
        const avgPnL = bucketsData.reduce((sum, p) => sum + p.pnl, 0) / Math.max(bucketsData.length, 1);
        const winRate = (bucketsData.filter((p) => p.pnl > 0).length / Math.max(bucketsData.length, 1)) * 100;

        return {
          volatilityRange: bucket.label,
          avgPnL,
          count: bucketsData.length,
          winRate,
        };
      })
      .filter((b) => b.count > 0);

    // Determine best volatility condition (handle empty array)
    let bestVolatilityCondition: 'low' | 'medium' | 'high' = 'medium';
    if (volatilityBuckets.length > 0) {
      const bestBucket = volatilityBuckets.reduce((best, current) =>
        current.avgPnL > best.avgPnL ? current : best
      );
      bestVolatilityCondition =
        bestBucket.volatilityRange.includes('Low') || bestBucket.volatilityRange.includes('Very Low')
          ? 'low'
          : bestBucket.volatilityRange.includes('Medium')
            ? 'medium'
            : 'high';
    }

    return {
      avgVolatility: meanVolatility,
      avgPnL: meanPnL,
      correlation,
      bestVolatilityCondition,
      dataPoints,
      volatilityBuckets,
    };
  }, [filteredTrades, tradeLimit]);

  const controlsPortal = controlElement ? (
    createPortal(
      <select
        value={tradeLimit}
        onChange={(e) => setTradeLimit(e.target.value)}
        className="appearance-none text-xs font-bold rounded px-3 py-2 focus:outline-none transition-colors cursor-pointer"
        style={{
          backgroundColor: '#23180C',
          color: '#F5C76D',
          border: '1px solid rgba(245, 199, 109, 0.3)',
          minWidth: '120px',
        }}
      >
        <option value="25">Last 25</option>
        <option value="50">Last 50</option>
        <option value="100">Last 100</option>
        <option value="200">Last 200</option>
        <option value="ALL">All Trades</option>
      </select>,
      controlElement
    )
  ) : null;

  // Custom tooltip renderer
  const renderTooltip = (props: any) => {
    const { payload } = props;
    if (payload && payload.length > 0) {
      const trade = payload[0].payload;
      return (
        <div style={{
          backgroundColor: '#161616',
          border: '1px solid #27272a',
          borderRadius: '8px',
          padding: '12px',
          color: '#fff'
        }}>
          <div style={{ fontWeight: 'bold', marginBottom: '8px', color: '#D4AF37' }}>
            {trade.symbol}
          </div>
          <div style={{ fontSize: '12px', marginBottom: '4px', color: '#a0a0a0' }}>
            Volatility: {trade.volatility.toFixed(2)}%
          </div>
          <div style={{ fontSize: '12px', marginBottom: '4px', color: trade.pnl >= 0 ? '#10b981' : '#ef4444' }}>
            PnL: ${trade.pnl.toFixed(2)}
          </div>
          <div style={{ fontSize: '12px', marginBottom: '4px', color: '#f5c76d' }}>
            Leverage: {trade.leverage}x
          </div>
          <div style={{ fontSize: '12px', color: '#a0a0a0' }}>
            Size: {trade.size.toFixed(4)}
          </div>
        </div>
      );
    }
    return null;
  };

  if (!filteredTrades || filteredTrades.length === 0 || metrics.dataPoints.length === 0) {
    return <div className="text-center py-8 text-gray-500">No data in this range yet.</div>;
  }

  return (
    <>
      {controlsPortal}
      <div style={{ height: '100%', display: 'flex', flexDirection: 'column', gap: '16px', padding: '12px' }}>
        {/* Trade count indicator */}
        <div style={{ fontSize: '12px', color: '#888' }}>
          {metrics.dataPoints.length} trades shown
        </div>
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
              Avg Volatility
            </div>
            <div style={{
              fontSize: '20px',
              fontWeight: 'bold',
              color: '#F5C76D',
              marginBottom: '4px',
            }}>
              {metrics.avgVolatility.toFixed(2)}%
            </div>
            <div style={{ fontSize: '10px', color: '#666' }}>
              Average market exposure
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
              Volatility-PnL Correlation
            </div>
            <div style={{
              fontSize: '20px',
              fontWeight: 'bold',
              color: Math.abs(metrics.correlation) > 0.5 ? '#ef4444' : Math.abs(metrics.correlation) > 0.3 ? '#f59e0b' : '#10b981',
              marginBottom: '4px',
            }}>
              {metrics.correlation.toFixed(3)}
            </div>
            <div style={{ fontSize: '10px', color: '#666' }}>
              {metrics.correlation > 0.3 ? 'Struggles in high vol' : metrics.correlation < -0.3 ? 'Thrives in high vol' : 'Vol neutral'}
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
              Best Condition
            </div>
            <div style={{
              fontSize: '18px',
              fontWeight: 'bold',
              color: metrics.bestVolatilityCondition === 'low' ? '#10b981' : metrics.bestVolatilityCondition === 'medium' ? '#f59e0b' : '#ef4444',
              marginBottom: '4px',
            }}>
              {metrics.bestVolatilityCondition.charAt(0).toUpperCase() + metrics.bestVolatilityCondition.slice(1)} Vol
            </div>
            <div style={{ fontSize: '10px', color: '#666' }}>
              Most profitable
            </div>
          </div>
        </div>

        {/* Scatter Plot */}
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
            Volatility vs Trading Performance
          </div>
          <ResponsiveContainer width="100%" height={280}>
            <ScatterChart margin={{ top: 20, right: 20, bottom: 20, left: 20 }}>
              <CartesianGrid stroke="#27272a" strokeDasharray="3 3" />
              <XAxis
                type="number"
                dataKey="volatility"
                name="Volatility (%)"
                stroke="#71717a"
                label={{ value: 'Market Volatility (%)', position: 'insideBottom', offset: -10 }}
              />
              <YAxis
                type="number"
                dataKey="pnl"
                name="PnL ($)"
                stroke="#71717a"
                label={{ value: 'Trade PnL ($)', angle: -90, position: 'insideLeft' }}
              />
              <Tooltip
                cursor={{ strokeDasharray: '3 3' }}
                content={renderTooltip}
              />
              <ReferenceLine
                y={0}
                stroke="#71717a"
                strokeDasharray="5 5"
                label={{ value: 'Breakeven', position: 'insideRight', offset: -10, fill: '#71717a', fontSize: 10 }}
              />
              <Scatter name="Trades" data={metrics.dataPoints}>
                {metrics.dataPoints.map((entry, index) => {
                  const color = entry.pnl > 0 ? '#10b981' : '#ef4444';
                  const opacity = Math.min(Math.abs(entry.pnl) / 500 + 0.3, 1);
                  return <Cell key={`cell-${index}`} fill={color} fillOpacity={opacity} />;
                })}
              </Scatter>
            </ScatterChart>
          </ResponsiveContainer>
          <div style={{ fontSize: '9px', color: '#666', marginTop: '8px', textAlign: 'center' }}>
            Green = Win | Red = Loss | Size indicates magnitude
          </div>
        </div>

        {/* Volatility Bucket Analysis */}
        <div
          style={{
            backgroundColor: '#1a1a1a',
            border: '1px solid rgba(245, 199, 109, 0.15)',
            borderRadius: '8px',
            padding: '12px',
          }}
        >
          <div style={{ fontSize: '11px', fontWeight: 'bold', color: '#F5C76D', marginBottom: '12px' }}>
            Performance by Volatility Level
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
            {metrics.volatilityBuckets.map((bucket, idx) => {
              const bucketColor = bucket.avgPnL > 0 ? '#10b981' : '#ef4444';
              const barPercent = (Math.abs(bucket.avgPnL) / Math.max(...metrics.volatilityBuckets.map((b) => Math.abs(b.avgPnL)), 1)) * 100;

              return (
                <div key={idx}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '4px' }}>
                    <div style={{ fontSize: '11px', fontWeight: 'bold', color: '#F5C76D' }}>
                      {bucket.volatilityRange}
                    </div>
                    <div style={{ fontSize: '10px', color: '#999' }}>
                      {bucket.count} trades | {bucket.winRate.toFixed(1)}% win
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
                        width: `${barPercent}%`,
                        backgroundColor: bucketColor,
                        borderRadius: '4px',
                        transition: 'width 0.3s ease',
                        display: 'flex',
                        alignItems: 'center',
                        paddingLeft: '6px',
                      }}
                    >
                      {barPercent > 30 && (
                        <span style={{ fontSize: '10px', color: '#fff', fontWeight: 'bold' }}>
                          ${bucket.avgPnL.toFixed(0)}
                        </span>
                      )}
                    </div>
                    {barPercent <= 30 && (
                      <div style={{ position: 'absolute', right: '6px', top: '50%', transform: 'translateY(-50%)', fontSize: '10px', color: '#999', fontWeight: 'bold' }}>
                        ${bucket.avgPnL.toFixed(0)}
                      </div>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </>
  );
};
