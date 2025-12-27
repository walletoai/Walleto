import React, { useMemo, useState, useEffect } from 'react';
import { createPortal } from 'react-dom';

interface Props {
  data: any;
  widgetId?: string;
}

interface LiquidityEntry {
  symbol: string;
  entry: number;
  size: number;
  leverage: number;
  fees: number;
  pnl: number;
  liquidityScore: number;
  positionValue: number;
  spreadImpact: number;
  volatility: number;
}

interface LiquidityMetrics {
  avgLiquidityScore: number;
  avgSpreadImpact: number;
  bestLiquidityAsset: { symbol: string; score: number } | null;
  worstLiquidityAsset: { symbol: string; score: number } | null;
  dataPoints: LiquidityEntry[];
  liquidityTiers: {
    excellent: number;
    good: number;
    fair: number;
    poor: number;
  };
  assetLiquidity: Array<{
    symbol: string;
    avgScore: number;
    count: number;
    avgSpreadImpact: number;
  }>;
}

export const LiquidityVsEntryWidget: React.FC<Props> = ({ data, widgetId }) => {
  const { filteredTrades } = data;
  const [timeRange, setTimeRange] = useState<'ALL' | 'YEAR' | 'MONTH' | 'WEEK'>('ALL');
  const [controlElement, setControlElement] = useState<HTMLElement | null>(null);

  useEffect(() => {
    if (!widgetId) return;
    const element = document.getElementById(`${widgetId}-controls`);
    setControlElement(element);
  }, [widgetId]);

  const metrics = useMemo((): LiquidityMetrics => {
    if (!filteredTrades || filteredTrades.length === 0) {
      return {
        avgLiquidityScore: 0,
        avgSpreadImpact: 0,
        bestLiquidityAsset: null,
        worstLiquidityAsset: null,
        dataPoints: [],
        liquidityTiers: {
          excellent: 0,
          good: 0,
          fair: 0,
          poor: 0,
        },
        assetLiquidity: [],
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

    // Calculate liquidity scores for each trade
    const dataPoints: LiquidityEntry[] = trades
      .map((trade: any) => {
        const entry = parseFloat(trade.entry_price || trade.entry) || 0;
        const size = parseFloat(trade.quantity || trade.size) || 0;
        const leverage = parseFloat(trade.leverage) || 1;
        const fees = parseFloat(trade.fees) || 0;
        const pnl = parseFloat(trade.pnl_usd) || 0;

        const positionValue = entry * size;

        // Spread impact: fees as % of position value (lower is better liquidity)
        const spreadImpact = positionValue > 0 ? (fees / positionValue) * 100 : 0;

        // Volatility: estimated from size and leverage (high size on high leverage = harder to fill)
        const volatility = size * leverage / 1000;

        // Liquidity score (0-100)
        // Better liquidity = lower spread impact, reasonable position size
        // Score based on: low fees (70%), reasonable size (20%), pnl outcome (10%)
        const feeScore = Math.max(100 - (spreadImpact * 50), 0); // Lower fees = higher score
        const sizeScore = size < 5000 ? 100 : size < 10000 ? 80 : 60; // Reasonable sizes score better
        const pnlBonus = pnl > 0 ? 10 : 0; // Profitable trades suggest good entry liquidity

        const liquidityScore = Math.min(feeScore * 0.7 + sizeScore * 0.2 + pnlBonus, 100);

        return {
          symbol: trade.symbol || 'Unknown',
          entry,
          size,
          leverage,
          fees,
          pnl,
          liquidityScore,
          positionValue,
          spreadImpact,
          volatility,
        };
      })
      .filter((p) => p.entry > 0);

    // Calculate tiers
    let excellent = 0;
    let good = 0;
    let fair = 0;
    let poor = 0;

    dataPoints.forEach((p) => {
      if (p.liquidityScore >= 80) excellent++;
      else if (p.liquidityScore >= 60) good++;
      else if (p.liquidityScore >= 40) fair++;
      else poor++;
    });

    // Asset-level liquidity analysis
    const assetMap = new Map<
      string,
      { scores: number[]; spreadImpacts: number[]; count: number }
    >();

    dataPoints.forEach((p) => {
      if (!assetMap.has(p.symbol)) {
        assetMap.set(p.symbol, { scores: [], spreadImpacts: [], count: 0 });
      }
      const asset = assetMap.get(p.symbol)!;
      asset.scores.push(p.liquidityScore);
      asset.spreadImpacts.push(p.spreadImpact);
      asset.count += 1;
    });

    const assetLiquidity = Array.from(assetMap.entries())
      .map(([symbol, data]) => ({
        symbol,
        avgScore: data.scores.reduce((a, b) => a + b, 0) / data.scores.length,
        count: data.count,
        avgSpreadImpact: data.spreadImpacts.reduce((a, b) => a + b, 0) / data.spreadImpacts.length,
      }))
      .sort((a, b) => b.avgScore - a.avgScore);

    const avgLiquidityScore = dataPoints.reduce((sum, p) => sum + p.liquidityScore, 0) / Math.max(dataPoints.length, 1);
    const avgSpreadImpact = dataPoints.reduce((sum, p) => sum + p.spreadImpact, 0) / Math.max(dataPoints.length, 1);

    const bestLiquidityAsset = assetLiquidity.length > 0 ? { symbol: assetLiquidity[0].symbol, score: assetLiquidity[0].avgScore } : null;
    const worstLiquidityAsset = assetLiquidity.length > 0 ? { symbol: assetLiquidity[assetLiquidity.length - 1].symbol, score: assetLiquidity[assetLiquidity.length - 1].avgScore } : null;

    return {
      avgLiquidityScore,
      avgSpreadImpact,
      bestLiquidityAsset,
      worstLiquidityAsset,
      dataPoints,
      liquidityTiers: {
        excellent,
        good,
        fair,
        poor,
      },
      assetLiquidity,
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
              Avg Liquidity Score
            </div>
            <div style={{
              fontSize: '20px',
              fontWeight: 'bold',
              color: metrics.avgLiquidityScore > 70 ? '#10b981' : metrics.avgLiquidityScore > 50 ? '#f59e0b' : '#ef4444',
              marginBottom: '4px',
            }}>
              {metrics.avgLiquidityScore.toFixed(1)}
            </div>
            <div style={{ fontSize: '10px', color: '#666' }}>
              Out of 100
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
              Avg Spread Impact
            </div>
            <div style={{
              fontSize: '20px',
              fontWeight: 'bold',
              color: metrics.avgSpreadImpact < 0.05 ? '#10b981' : metrics.avgSpreadImpact < 0.1 ? '#f59e0b' : '#ef4444',
              marginBottom: '4px',
            }}>
              {metrics.avgSpreadImpact.toFixed(4)}%
            </div>
            <div style={{ fontSize: '10px', color: '#666' }}>
              Fees / Position value
            </div>
          </div>
        </div>

        {/* Liquidity Tiers */}
        <div
          style={{
            backgroundColor: '#1a1a1a',
            border: '1px solid rgba(245, 199, 109, 0.15)',
            borderRadius: '8px',
            padding: '12px',
          }}
        >
          <div style={{ fontSize: '11px', fontWeight: 'bold', color: '#F5C76D', marginBottom: '12px' }}>
            Liquidity Quality Distribution
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '10px' }}>
            <div style={{
              backgroundColor: '#2a2a2a',
              borderRadius: '6px',
              padding: '10px',
              textAlign: 'center',
              border: '1px solid #10b981',
            }}>
              <div style={{ fontSize: '10px', color: '#999', marginBottom: '4px' }}>Excellent</div>
              <div style={{ fontSize: '18px', fontWeight: 'bold', color: '#10b981' }}>
                {metrics.liquidityTiers.excellent}
              </div>
              <div style={{ fontSize: '9px', color: '#666' }}>
                {((metrics.liquidityTiers.excellent / metrics.dataPoints.length) * 100).toFixed(1)}%
              </div>
            </div>

            <div style={{
              backgroundColor: '#2a2a2a',
              borderRadius: '6px',
              padding: '10px',
              textAlign: 'center',
              border: '1px solid #84cc16',
            }}>
              <div style={{ fontSize: '10px', color: '#999', marginBottom: '4px' }}>Good</div>
              <div style={{ fontSize: '18px', fontWeight: 'bold', color: '#84cc16' }}>
                {metrics.liquidityTiers.good}
              </div>
              <div style={{ fontSize: '9px', color: '#666' }}>
                {((metrics.liquidityTiers.good / metrics.dataPoints.length) * 100).toFixed(1)}%
              </div>
            </div>

            <div style={{
              backgroundColor: '#2a2a2a',
              borderRadius: '6px',
              padding: '10px',
              textAlign: 'center',
              border: '1px solid #f59e0b',
            }}>
              <div style={{ fontSize: '10px', color: '#999', marginBottom: '4px' }}>Fair</div>
              <div style={{ fontSize: '18px', fontWeight: 'bold', color: '#f59e0b' }}>
                {metrics.liquidityTiers.fair}
              </div>
              <div style={{ fontSize: '9px', color: '#666' }}>
                {((metrics.liquidityTiers.fair / metrics.dataPoints.length) * 100).toFixed(1)}%
              </div>
            </div>

            <div style={{
              backgroundColor: '#2a2a2a',
              borderRadius: '6px',
              padding: '10px',
              textAlign: 'center',
              border: '1px solid #ef4444',
            }}>
              <div style={{ fontSize: '10px', color: '#999', marginBottom: '4px' }}>Poor</div>
              <div style={{ fontSize: '18px', fontWeight: 'bold', color: '#ef4444' }}>
                {metrics.liquidityTiers.poor}
              </div>
              <div style={{ fontSize: '9px', color: '#666' }}>
                {((metrics.liquidityTiers.poor / metrics.dataPoints.length) * 100).toFixed(1)}%
              </div>
            </div>
          </div>
        </div>

        {/* Asset Liquidity Heatmap */}
        <div
          style={{
            backgroundColor: '#1a1a1a',
            border: '1px solid rgba(245, 199, 109, 0.15)',
            borderRadius: '8px',
            padding: '12px',
          }}
        >
          <div style={{ fontSize: '11px', fontWeight: 'bold', color: '#F5C76D', marginBottom: '12px' }}>
            Asset Liquidity Rankings
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', maxHeight: '200px', overflowY: 'auto' }}>
            {metrics.assetLiquidity.map((asset, idx) => {
              const scoreColor = asset.avgScore > 70 ? '#10b981' : asset.avgScore > 50 ? '#f59e0b' : '#ef4444';
              const scorePercent = (asset.avgScore / 100) * 100;

              return (
                <div key={idx}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '4px' }}>
                    <div style={{ fontSize: '11px', fontWeight: 'bold', color: '#F5C76D' }}>
                      {asset.symbol}
                    </div>
                    <div style={{ fontSize: '10px', color: '#999' }}>
                      {asset.count} trades
                    </div>
                  </div>
                  <div
                    style={{
                      width: '100%',
                      height: '20px',
                      backgroundColor: '#2a2a2a',
                      borderRadius: '4px',
                      overflow: 'hidden',
                      position: 'relative',
                    }}
                  >
                    <div
                      style={{
                        height: '100%',
                        width: `${scorePercent}%`,
                        backgroundColor: scoreColor,
                        borderRadius: '4px',
                        transition: 'width 0.3s ease',
                        display: 'flex',
                        alignItems: 'center',
                        paddingLeft: '6px',
                      }}
                    >
                      {scorePercent > 30 && (
                        <span style={{ fontSize: '10px', color: '#fff', fontWeight: 'bold' }}>
                          {asset.avgScore.toFixed(0)}
                        </span>
                      )}
                    </div>
                    {scorePercent <= 30 && (
                      <div style={{ position: 'absolute', right: '6px', top: '50%', transform: 'translateY(-50%)', fontSize: '10px', color: '#999', fontWeight: 'bold' }}>
                        {asset.avgScore.toFixed(0)}
                      </div>
                    )}
                  </div>
                  <div style={{ fontSize: '9px', color: '#666', marginTop: '2px' }}>
                    Avg spread: {asset.avgSpreadImpact.toFixed(4)}%
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Best/Worst Assets */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '12px' }}>
          {metrics.bestLiquidityAsset && (
            <div
              style={{
                backgroundColor: '#1a1a1a',
                border: '1px solid rgba(16, 185, 129, 0.3)',
                borderRadius: '8px',
                padding: '12px',
              }}
            >
              <div style={{ fontSize: '10px', color: '#999', marginBottom: '6px', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                Best Liquidity
              </div>
              <div style={{ fontSize: '14px', fontWeight: 'bold', color: '#10b981', marginBottom: '4px' }}>
                {metrics.bestLiquidityAsset.symbol}
              </div>
              <div style={{ fontSize: '12px', color: '#F5C76D' }}>
                Score: {metrics.bestLiquidityAsset.score.toFixed(1)}/100
              </div>
            </div>
          )}

          {metrics.worstLiquidityAsset && (
            <div
              style={{
                backgroundColor: '#1a1a1a',
                border: '1px solid rgba(239, 68, 68, 0.3)',
                borderRadius: '8px',
                padding: '12px',
              }}
            >
              <div style={{ fontSize: '10px', color: '#999', marginBottom: '6px', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                Worst Liquidity
              </div>
              <div style={{ fontSize: '14px', fontWeight: 'bold', color: '#ef4444', marginBottom: '4px' }}>
                {metrics.worstLiquidityAsset.symbol}
              </div>
              <div style={{ fontSize: '12px', color: '#F5C76D' }}>
                Score: {metrics.worstLiquidityAsset.score.toFixed(1)}/100
              </div>
            </div>
          )}
        </div>
      </div>
    </>
  );
};
