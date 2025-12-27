import React, { useMemo, useState, useEffect } from 'react';
import { createPortal } from 'react-dom';

interface Props {
  data: any;
  widgetId?: string;
}

interface CorrelationData {
  assets: string[];
  correlationMatrix: number[][];
  significantPairs: Array<{
    asset1: string;
    asset2: string;
    correlation: number;
    tradePairs: number;
  }>;
}

export const CorrelationMatrixWidget: React.FC<Props> = ({ data, widgetId }) => {
  const { filteredTrades } = data;
  const [timeRange, setTimeRange] = useState<'ALL' | 'YEAR' | 'MONTH' | 'WEEK'>('ALL');
  const [controlElement, setControlElement] = useState<HTMLElement | null>(null);

  useEffect(() => {
    if (!widgetId) return;
    const element = document.getElementById(`${widgetId}-controls`);
    setControlElement(element);
  }, [widgetId]);

  const correlationData = useMemo((): CorrelationData => {
    if (!filteredTrades || filteredTrades.length === 0) {
      return {
        assets: [],
        correlationMatrix: [],
        significantPairs: [],
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

    // Get unique assets
    const assetSet = new Set<string>();
    trades.forEach((trade: any) => {
      if (trade.symbol) {
        assetSet.add(trade.symbol);
      }
    });

    const assets = Array.from(assetSet).sort();
    if (assets.length === 0) {
      return {
        assets: [],
        correlationMatrix: [],
        significantPairs: [],
      };
    }

    // Group trades by asset
    const assetTrades = new Map<string, any[]>();
    assets.forEach((asset) => {
      assetTrades.set(asset, trades.filter((t: any) => t.symbol === asset));
    });

    // Calculate returns for each asset
    const assetReturns = new Map<string, number[]>();
    assets.forEach((asset) => {
      const assetTradeList = assetTrades.get(asset) || [];
      const returns = assetTradeList.map((trade: any) => {
        const pnl = parseFloat(trade.pnl_usd) || 0;
        const entryPrice = parseFloat(trade.entry_price || trade.entry) || 0;
        const qty = parseFloat(trade.quantity || trade.size) || 0;
        const positionValue = entryPrice * qty;
        return positionValue > 0 ? (pnl / positionValue) * 100 : 0;
      });
      assetReturns.set(asset, returns);
    });

    // Calculate correlation matrix
    const correlationMatrix: number[][] = assets.map((asset1, i) => {
      return assets.map((asset2, j) => {
        if (i === j) return 1;

        const returns1 = assetReturns.get(asset1) || [];
        const returns2 = assetReturns.get(asset2) || [];

        // Find common length
        const minLength = Math.min(returns1.length, returns2.length);
        if (minLength < 2) return 0;

        // Calculate means
        const mean1 = returns1.slice(0, minLength).reduce((a, b) => a + b, 0) / minLength;
        const mean2 = returns2.slice(0, minLength).reduce((a, b) => a + b, 0) / minLength;

        // Calculate covariance and standard deviations
        let covariance = 0;
        let var1 = 0;
        let var2 = 0;

        for (let k = 0; k < minLength; k++) {
          const diff1 = returns1[k] - mean1;
          const diff2 = returns2[k] - mean2;
          covariance += diff1 * diff2;
          var1 += diff1 * diff1;
          var2 += diff2 * diff2;
        }

        if (var1 === 0 || var2 === 0) return 0;

        const correlation = covariance / Math.sqrt(var1 * var2);
        return Math.max(-1, Math.min(1, correlation)); // Clamp to [-1, 1]
      });
    });

    // Find significant pairs
    const significantPairs: typeof correlationData.significantPairs = [];
    for (let i = 0; i < assets.length; i++) {
      for (let j = i + 1; j < assets.length; j++) {
        const correlation = correlationMatrix[i][j];
        if (Math.abs(correlation) > 0.3) {
          const tradePairs = Math.min(
            (assetTrades.get(assets[i]) || []).length,
            (assetTrades.get(assets[j]) || []).length
          );
          significantPairs.push({
            asset1: assets[i],
            asset2: assets[j],
            correlation,
            tradePairs,
          });
        }
      }
    }

    // Sort by absolute correlation
    significantPairs.sort((a, b) => Math.abs(b.correlation) - Math.abs(a.correlation));

    return {
      assets,
      correlationMatrix,
      significantPairs: significantPairs.slice(0, 10), // Top 10 pairs
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

  if (!filteredTrades || filteredTrades.length === 0 || correlationData.assets.length === 0) {
    return <div className="text-center py-8 text-gray-500">No data in this range yet.</div>;
  }

  // Color helper
  const getHeatmapColor = (correlation: number) => {
    if (correlation === 1) return '#1a1a1a'; // Diagonal
    if (correlation > 0.7) return '#10b981'; // Strong positive (green)
    if (correlation > 0.4) return '#84cc16'; // Moderate positive (lime)
    if (correlation > 0) return '#fbbf24'; // Weak positive (amber)
    if (correlation > -0.4) return '#f59e0b'; // Weak negative (orange)
    if (correlation > -0.7) return '#f97316'; // Moderate negative (orange-red)
    return '#ef4444'; // Strong negative (red)
  };

  const getTextColor = (correlation: number) => {
    return Math.abs(correlation) > 0.5 ? '#fff' : '#666';
  };

  const maxAssets = Math.min(correlationData.assets.length, 8); // Limit to 8 for display
  const cellSize = 60;

  return (
    <>
      {controlsPortal}
      <div style={{ height: '100%', display: 'flex', flexDirection: 'column', gap: '16px', padding: '12px' }}>
        {/* Heatmap */}
        <div
          style={{
            backgroundColor: '#1a1a1a',
            border: '1px solid rgba(245, 199, 109, 0.15)',
            borderRadius: '8px',
            padding: '12px',
            flex: 1,
            minHeight: '350px',
            overflowX: 'auto',
          }}
        >
          <div style={{ fontSize: '11px', fontWeight: 'bold', color: '#F5C76D', marginBottom: '12px' }}>
            Asset Correlation Heatmap
          </div>
          <div
            style={{
              display: 'inline-block',
              borderCollapse: 'collapse',
            }}
          >
            {/* Header row */}
            <div style={{ display: 'flex', marginBottom: '2px' }}>
              <div style={{ width: `${cellSize}px`, height: `${cellSize}px` }} />
              {correlationData.assets.slice(0, maxAssets).map((asset, idx) => (
                <div
                  key={`header-${idx}`}
                  style={{
                    width: `${cellSize}px`,
                    height: `${cellSize}px`,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    fontSize: '9px',
                    fontWeight: 'bold',
                    color: '#F5C76D',
                    writingMode: 'vertical-rl',
                    textOrientation: 'mixed',
                    overflow: 'hidden',
                  }}
                >
                  {asset}
                </div>
              ))}
            </div>

            {/* Matrix rows */}
            {correlationData.assets.slice(0, maxAssets).map((asset1, i) => (
              <div key={`row-${i}`} style={{ display: 'flex', marginBottom: '2px' }}>
                {/* Row label */}
                <div
                  style={{
                    width: `${cellSize}px`,
                    height: `${cellSize}px`,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    fontSize: '9px',
                    fontWeight: 'bold',
                    color: '#F5C76D',
                    overflow: 'hidden',
                    textOverflow: 'ellipsis',
                  }}
                >
                  {asset1}
                </div>

                {/* Correlation cells */}
                {correlationData.assets.slice(0, maxAssets).map((asset2, j) => {
                  const correlation = correlationData.correlationMatrix[
                    correlationData.assets.indexOf(asset1)
                  ][correlationData.assets.indexOf(asset2)];

                  return (
                    <div
                      key={`cell-${i}-${j}`}
                      style={{
                        width: `${cellSize}px`,
                        height: `${cellSize}px`,
                        backgroundColor: getHeatmapColor(correlation),
                        border: '1px solid rgba(255, 255, 255, 0.1)',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        fontSize: '10px',
                        fontWeight: 'bold',
                        color: getTextColor(correlation),
                        cursor: 'pointer',
                        transition: 'all 0.2s ease',
                      }}
                      title={`${asset1} vs ${asset2}: ${correlation.toFixed(3)}`}
                    >
                      {correlation.toFixed(2)}
                    </div>
                  );
                })}
              </div>
            ))}
          </div>

          <div style={{ fontSize: '9px', color: '#666', marginTop: '12px', display: 'flex', gap: '12px', flexWrap: 'wrap' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
              <div style={{ width: '12px', height: '12px', backgroundColor: '#10b981', borderRadius: '2px' }} />
              <span>Strong Positive (+0.7 to +1.0)</span>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
              <div style={{ width: '12px', height: '12px', backgroundColor: '#84cc16', borderRadius: '2px' }} />
              <span>Moderate Positive (+0.4 to +0.7)</span>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
              <div style={{ width: '12px', height: '12px', backgroundColor: '#f59e0b', borderRadius: '2px' }} />
              <span>Weak Correlation (-0.4 to +0.4)</span>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
              <div style={{ width: '12px', height: '12px', backgroundColor: '#ef4444', borderRadius: '2px' }} />
              <span>Strong Negative (-1.0 to -0.7)</span>
            </div>
          </div>
        </div>

        {/* Significant Pairs */}
        {correlationData.significantPairs.length > 0 && (
          <div
            style={{
              backgroundColor: '#1a1a1a',
              border: '1px solid rgba(245, 199, 109, 0.15)',
              borderRadius: '8px',
              padding: '12px',
            }}
          >
            <div style={{ fontSize: '11px', fontWeight: 'bold', color: '#F5C76D', marginBottom: '12px' }}>
              Most Correlated Pairs
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
              {correlationData.significantPairs.map((pair, idx) => {
                const isPositive = pair.correlation > 0;
                const color = Math.abs(pair.correlation) > 0.7 ? (isPositive ? '#10b981' : '#ef4444') : '#f59e0b';

                return (
                  <div key={idx} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flex: 1 }}>
                      <div
                        style={{
                          width: '32px',
                          height: '32px',
                          backgroundColor: color,
                          borderRadius: '6px',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          fontSize: '11px',
                          fontWeight: 'bold',
                          color: '#fff',
                        }}
                      >
                        {pair.correlation.toFixed(2)}
                      </div>
                      <div>
                        <div style={{ fontSize: '11px', fontWeight: 'bold', color: '#F5C76D' }}>
                          {pair.asset1} ↔ {pair.asset2}
                        </div>
                        <div style={{ fontSize: '9px', color: '#666' }}>
                          {pair.tradePairs} trade pairs
                        </div>
                      </div>
                    </div>
                    <div
                      style={{
                        fontSize: '10px',
                        fontWeight: 'bold',
                        color: isPositive ? '#10b981' : '#ef4444',
                      }}
                    >
                      {isPositive ? 'Move together' : 'Move opposite'}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* Stats */}
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
              Total Assets
            </div>
            <div style={{
              fontSize: '20px',
              fontWeight: 'bold',
              color: '#F5C76D',
            }}>
              {correlationData.assets.length}
            </div>
            <div style={{ fontSize: '9px', color: '#666' }}>
              Traded in period
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
              Significant Pairs
            </div>
            <div style={{
              fontSize: '20px',
              fontWeight: 'bold',
              color: '#F5C76D',
            }}>
              {correlationData.significantPairs.length}
            </div>
            <div style={{ fontSize: '9px', color: '#666' }}>
              |r| &gt; 0.3
            </div>
          </div>
        </div>
      </div>
    </>
  );
};
