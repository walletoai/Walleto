import React, { useMemo, useState, useEffect } from 'react';
import { createPortal } from 'react-dom';

interface Props {
  data: any;
  widgetId?: string;
}

interface RiskMetrics {
  maxDrawdown: number;
  avgRiskPerTrade: number;
  avgPositionSize: number;
  averageLeverage: number;
  totalCapitalRisked: number;
  riskRewardRatio: number;
  profitFactor: number;
}

export const RiskMetricsSummaryWidget: React.FC<Props> = ({ data, widgetId }) => {
  const { filteredTrades, dailySeries } = data;
  const [timeRange, setTimeRange] = useState<'ALL' | 'YEAR' | 'MONTH' | 'WEEK'>('ALL');
  const [controlElement, setControlElement] = useState<HTMLElement | null>(null);

  useEffect(() => {
    if (!widgetId) return;
    const element = document.getElementById(`${widgetId}-controls`);
    setControlElement(element);
  }, [widgetId]);

  const metrics = useMemo((): RiskMetrics => {
    if (!filteredTrades || filteredTrades.length === 0) {
      return {
        maxDrawdown: 0,
        avgRiskPerTrade: 0,
        avgPositionSize: 0,
        averageLeverage: 1,
        totalCapitalRisked: 0,
        riskRewardRatio: 0,
        profitFactor: 0,
      };
    }

    // Filter trades by time range
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

    // Calculate max drawdown from trades or cumulative PnL
    let maxDrawdown = 0;
    let cumulativePnl = 0;
    let peakPnl = 0;

    trades.forEach((trade: any) => {
      cumulativePnl += trade.pnl_usd || 0;
      if (cumulativePnl > peakPnl) {
        peakPnl = cumulativePnl;
      }
      const currentDrawdown = ((peakPnl - cumulativePnl) / Math.max(Math.abs(peakPnl), 1)) * 100;
      if (currentDrawdown > maxDrawdown) {
        maxDrawdown = currentDrawdown;
      }
    });

    // Calculate risk per trade (actual loss as % of position value for losing trades)
    let totalRiskPercentage = 0;
    let riskTradeCount = 0;

    trades.forEach((trade: any) => {
      const pnl = trade.pnl_usd || 0;
      const entryPrice = trade.entry_price || trade.entry || 0;
      const positionSize = trade.quantity || trade.position_size || trade.size || 0;
      const positionValue = entryPrice * positionSize;

      // For losing trades, calculate the risk as percentage of position
      if (pnl < 0 && positionValue > 0) {
        const riskPercentage = (Math.abs(pnl) / positionValue) * 100;
        totalRiskPercentage += riskPercentage;
        riskTradeCount += 1;
      }
    });

    const avgRiskPerTrade = riskTradeCount > 0 ? totalRiskPercentage / riskTradeCount : 0;

    // Calculate average position size (margin/collateral in USD)
    let totalMargin = 0;
    trades.forEach((trade: any) => {
      const entryPrice = trade.entry_price || trade.entry || 0;
      const qty = trade.quantity || trade.position_size || trade.size || 0;
      const leverage = trade.leverage || 1;
      // Size = (entry_price * quantity) / leverage (margin used)
      totalMargin += (entryPrice * qty) / leverage;
    });
    const avgPositionSize = totalMargin / Math.max(trades.length, 1);

    // Calculate average leverage
    let totalLeverage = 0;
    let leverageCount = 0;
    trades.forEach((trade: any) => {
      if (trade.leverage) {
        totalLeverage += trade.leverage;
        leverageCount += 1;
      }
    });
    const averageLeverage = leverageCount > 0 ? totalLeverage / leverageCount : 1;

    // Calculate total capital at risk
    let totalCapitalRisked = 0;
    trades.forEach((trade: any) => {
      const entryPrice = trade.entry_price || trade.entry || 0;
      const positionSize = trade.quantity || trade.position_size || trade.size || 0;
      totalCapitalRisked += entryPrice * positionSize;
    });

    // Calculate risk-reward ratio (avg win / avg loss)
    let totalWins = 0;
    let totalLosses = 0;
    let winCount = 0;
    let lossCount = 0;

    trades.forEach((trade: any) => {
      const pnl = trade.pnl_usd || 0;
      if (pnl > 0) {
        totalWins += pnl;
        winCount += 1;
      } else if (pnl < 0) {
        totalLosses += Math.abs(pnl);
        lossCount += 1;
      }
    });

    const avgWin = winCount > 0 ? totalWins / winCount : 0;
    const avgLoss = lossCount > 0 ? totalLosses / lossCount : 0;
    const riskRewardRatio = avgLoss > 0 ? avgWin / avgLoss : 0;

    // Calculate profit factor (gross profit / gross loss)
    const profitFactor = totalLosses > 0 ? totalWins / totalLosses : totalWins > 0 ? Infinity : 0;

    return {
      maxDrawdown,
      avgRiskPerTrade,
      avgPositionSize,
      averageLeverage,
      totalCapitalRisked,
      riskRewardRatio,
      profitFactor,
    };
  }, [filteredTrades, timeRange]);

  // Determine risk level and colors
  const getDrawdownColor = (value: number) => {
    if (value < 10) return '#10b981'; // Green - Low risk
    if (value < 20) return '#f59e0b'; // Amber - Medium risk
    return '#ef4444'; // Red - High risk
  };

  const getRiskColor = (value: number) => {
    if (value < 2) return '#10b981'; // Green - Low risk
    if (value < 5) return '#f59e0b'; // Amber - Medium risk
    return '#ef4444'; // Red - High risk
  };

  const getLeverageColor = (value: number) => {
    if (value <= 1) return '#10b981'; // Green - No leverage
    if (value <= 3) return '#f59e0b'; // Amber - Moderate leverage
    return '#ef4444'; // Red - High leverage
  };

  const getRiskRewardColor = (value: number) => {
    if (value >= 1.5) return '#10b981'; // Green - Good ratio
    if (value >= 1) return '#f59e0b'; // Amber - Acceptable ratio
    return '#ef4444'; // Red - Poor ratio
  };

  if (!filteredTrades || filteredTrades.length === 0) {
    return <div className="text-center py-8 text-gray-500">No data in this range yet.</div>;
  }

  const controlsPortal = controlElement ? (
    createPortal(
      <div style={{ display: 'flex', gap: '8px' }}>
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
        </select>
      </div>,
      controlElement
    )
  ) : null;

  return (
    <>
      {controlsPortal}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '12px', height: '100%' }}>
      {/* Max Drawdown */}
      <div style={{
        backgroundColor: '#1a1a1a',
        border: `2px solid ${getDrawdownColor(metrics.maxDrawdown)}`,
        borderRadius: '8px',
        padding: '16px',
        textAlign: 'center'
      }}>
        <div style={{ fontSize: '10px', color: '#999', marginBottom: '8px', textTransform: 'uppercase', letterSpacing: '0.05em', fontWeight: 'bold' }}>
          Max Drawdown
        </div>
        <div style={{ fontSize: '24px', fontWeight: 'bold', color: getDrawdownColor(metrics.maxDrawdown), marginBottom: '4px' }}>
          {metrics.maxDrawdown.toFixed(1)}%
        </div>
        <div style={{ fontSize: '11px', color: '#666', marginBottom: '8px' }}>
          Peak to trough decline
        </div>
        <div style={{
          fontSize: '10px',
          padding: '6px',
          backgroundColor: getDrawdownColor(metrics.maxDrawdown) + '20',
          borderRadius: '4px',
          color: getDrawdownColor(metrics.maxDrawdown)
        }}>
          {metrics.maxDrawdown < 10 ? '✓ Low Risk' : metrics.maxDrawdown < 20 ? '⚠ Medium Risk' : '✕ High Risk'}
        </div>
      </div>

      {/* Avg Risk Per Trade */}
      <div style={{
        backgroundColor: '#1a1a1a',
        border: `2px solid ${getRiskColor(metrics.avgRiskPerTrade)}`,
        borderRadius: '8px',
        padding: '16px',
        textAlign: 'center'
      }}>
        <div style={{ fontSize: '10px', color: '#999', marginBottom: '8px', textTransform: 'uppercase', letterSpacing: '0.05em', fontWeight: 'bold' }}>
          Avg Risk/Trade
        </div>
        <div style={{ fontSize: '24px', fontWeight: 'bold', color: getRiskColor(metrics.avgRiskPerTrade), marginBottom: '4px' }}>
          {metrics.avgRiskPerTrade.toFixed(2)}%
        </div>
        <div style={{ fontSize: '11px', color: '#666', marginBottom: '8px' }}>
          Stop loss distance
        </div>
        <div style={{
          fontSize: '10px',
          padding: '6px',
          backgroundColor: getRiskColor(metrics.avgRiskPerTrade) + '20',
          borderRadius: '4px',
          color: getRiskColor(metrics.avgRiskPerTrade)
        }}>
          {metrics.avgRiskPerTrade < 2 ? '✓ Low Risk' : metrics.avgRiskPerTrade < 5 ? '⚠ Medium Risk' : '✕ High Risk'}
        </div>
      </div>

      {/* Avg Position Size */}
      <div style={{
        backgroundColor: '#1a1a1a',
        border: '2px solid #3b82f6',
        borderRadius: '8px',
        padding: '16px',
        textAlign: 'center'
      }}>
        <div style={{ fontSize: '10px', color: '#999', marginBottom: '8px', textTransform: 'uppercase', letterSpacing: '0.05em', fontWeight: 'bold' }}>
          Avg Position Value
        </div>
        <div style={{ fontSize: '24px', fontWeight: 'bold', color: '#3b82f6', marginBottom: '4px' }}>
          ${metrics.avgPositionSize >= 1000 ? (metrics.avgPositionSize / 1000).toFixed(1) + 'K' : metrics.avgPositionSize.toFixed(0)}
        </div>
        <div style={{ fontSize: '11px', color: '#666', marginBottom: '8px' }}>
          USD per trade
        </div>
        <div style={{
          fontSize: '10px',
          padding: '6px',
          backgroundColor: '#3b82f620',
          borderRadius: '4px',
          color: '#3b82f6'
        }}>
          📊 Sizing Consistency
        </div>
      </div>

      {/* Average Leverage */}
      <div style={{
        backgroundColor: '#1a1a1a',
        border: `2px solid ${getLeverageColor(metrics.averageLeverage)}`,
        borderRadius: '8px',
        padding: '16px',
        textAlign: 'center'
      }}>
        <div style={{ fontSize: '10px', color: '#999', marginBottom: '8px', textTransform: 'uppercase', letterSpacing: '0.05em', fontWeight: 'bold' }}>
          Avg Leverage
        </div>
        <div style={{ fontSize: '24px', fontWeight: 'bold', color: getLeverageColor(metrics.averageLeverage), marginBottom: '4px' }}>
          {metrics.averageLeverage.toFixed(1)}x
        </div>
        <div style={{ fontSize: '11px', color: '#666', marginBottom: '8px' }}>
          Capital multiplier
        </div>
        <div style={{
          fontSize: '10px',
          padding: '6px',
          backgroundColor: getLeverageColor(metrics.averageLeverage) + '20',
          borderRadius: '4px',
          color: getLeverageColor(metrics.averageLeverage)
        }}>
          {metrics.averageLeverage <= 1 ? '✓ No Leverage' : metrics.averageLeverage <= 3 ? '⚠ Moderate' : '✕ High Leverage'}
        </div>
      </div>

      {/* Risk-Reward Ratio */}
      <div style={{
        backgroundColor: '#1a1a1a',
        border: `2px solid ${getRiskRewardColor(metrics.riskRewardRatio)}`,
        borderRadius: '8px',
        padding: '16px',
        textAlign: 'center'
      }}>
        <div style={{ fontSize: '10px', color: '#999', marginBottom: '8px', textTransform: 'uppercase', letterSpacing: '0.05em', fontWeight: 'bold' }}>
          Risk:Reward Ratio
        </div>
        <div style={{ fontSize: '24px', fontWeight: 'bold', color: getRiskRewardColor(metrics.riskRewardRatio), marginBottom: '4px' }}>
          1:{metrics.riskRewardRatio.toFixed(2)}
        </div>
        <div style={{ fontSize: '11px', color: '#666', marginBottom: '8px' }}>
          Avg win vs avg loss
        </div>
        <div style={{
          fontSize: '10px',
          padding: '6px',
          backgroundColor: getRiskRewardColor(metrics.riskRewardRatio) + '20',
          borderRadius: '4px',
          color: getRiskRewardColor(metrics.riskRewardRatio)
        }}>
          {metrics.riskRewardRatio >= 1.5 ? '✓ Excellent' : metrics.riskRewardRatio >= 1 ? '⚠ Good' : '✕ Poor'}
        </div>
      </div>

      {/* Profit Factor */}
      <div style={{
        backgroundColor: '#1a1a1a',
        border: `2px solid ${metrics.profitFactor > 1.5 ? '#10b981' : metrics.profitFactor > 1 ? '#f59e0b' : '#ef4444'}`,
        borderRadius: '8px',
        padding: '16px',
        textAlign: 'center'
      }}>
        <div style={{ fontSize: '10px', color: '#999', marginBottom: '8px', textTransform: 'uppercase', letterSpacing: '0.05em', fontWeight: 'bold' }}>
          Profit Factor
        </div>
        <div style={{
          fontSize: '24px',
          fontWeight: 'bold',
          color: metrics.profitFactor > 1.5 ? '#10b981' : metrics.profitFactor > 1 ? '#f59e0b' : '#ef4444',
          marginBottom: '4px'
        }}>
          {isFinite(metrics.profitFactor) ? metrics.profitFactor.toFixed(2) : '∞'}
        </div>
        <div style={{ fontSize: '11px', color: '#666', marginBottom: '8px' }}>
          Gross profit / loss
        </div>
        <div style={{
          fontSize: '10px',
          padding: '6px',
          backgroundColor: (metrics.profitFactor > 1.5 ? '#10b981' : metrics.profitFactor > 1 ? '#f59e0b' : '#ef4444') + '20',
          borderRadius: '4px',
          color: metrics.profitFactor > 1.5 ? '#10b981' : metrics.profitFactor > 1 ? '#f59e0b' : '#ef4444'
        }}>
          {metrics.profitFactor > 1.5 ? '✓ Strong' : metrics.profitFactor > 1 ? '⚠ Breakeven' : '✕ Unprofitable'}
        </div>
      </div>
      </div>
    </>
  );
};
