import React, { useMemo, useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import {
  ResponsiveContainer,
  ScatterChart,
  Scatter,
  CartesianGrid,
  XAxis,
  YAxis,
  Tooltip,
  Cell,
  ReferenceLine,
  Legend,
} from "recharts";

interface Props {
  data: any;
  widgetId?: string;
}

export const RiskRewardScatterWidget: React.FC<Props> = ({ data, widgetId }) => {
  const { filteredTrades } = data;
  const [tradeLimit, setTradeLimit] = useState<string>("50");
  const [controlElement, setControlElement] = useState<HTMLElement | null>(null);

  useEffect(() => {
    if (!widgetId) return;
    const element = document.getElementById(`${widgetId}-controls`);
    setControlElement(element);
  }, [widgetId]);

  const chartData = useMemo(() => {
    if (!filteredTrades || filteredTrades.length === 0) return [];

    // Sort by date (most recent first) and limit
    const sortedTrades = [...filteredTrades].sort((a, b) => {
      const dateA = a._dateObj || new Date(a.entry_time || a.date);
      const dateB = b._dateObj || new Date(b.entry_time || b.date);
      return dateB.getTime() - dateA.getTime();
    });

    const limit = tradeLimit === "ALL" ? sortedTrades.length : parseInt(tradeLimit);
    const trades = sortedTrades.slice(0, limit);

    return trades.map((trade: any) => {
      const pnlUsd = trade.pnl_usd || 0;

      // Use available fields with proper fallbacks for Blofin
      const entryPrice = parseFloat(trade.entry_price || trade.entry || 0);
      const qty = parseFloat(trade.quantity || trade.position_size || trade.size || 0);
      const leverage = parseFloat(trade.leverage || 1);

      // Calculate margin/position size in USD (same as trades page)
      const positionValue = (entryPrice * qty) / leverage;

      // Calculate PnL percentage based on margin
      const pnlPercent = positionValue > 0 ? (pnlUsd / positionValue) * 100 : 0;

      // R-multiple: how many times the average loss did you win/lose
      // We'll calculate this after getting all trades
      return {
        positionSize: Number(positionValue.toFixed(2)),
        pnl: Number(pnlUsd.toFixed(2)),
        pnlPercent: Number(pnlPercent.toFixed(2)),
        symbol: trade.symbol || 'Unknown',
        profitable: pnlUsd >= 0,
        leverage: Number(leverage.toFixed(1)),
      };
    }).filter(t => t.positionSize > 0); // Only show trades with valid position size
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
          minWidth: '120px'
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

  if (chartData.length === 0) {
    return <div className="text-center py-8 text-gray-500">No data in this range yet.</div>;
  }

  // Calculate statistics
  const profitableTrades = chartData.filter(t => t.profitable).length;
  const winRate = (profitableTrades / chartData.length) * 100;
  const avgPnlPerTrade = chartData.reduce((sum, t) => sum + t.pnl, 0) / chartData.length;
  const avgPositionSize = chartData.reduce((sum, t) => sum + t.positionSize, 0) / chartData.length;
  const avgPnlPercent = chartData.reduce((sum, t) => sum + t.pnlPercent, 0) / chartData.length;
  const totalPnl = chartData.reduce((sum, t) => sum + t.pnl, 0);

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
            Position Size: ${trade.positionSize.toFixed(2)}
          </div>
          <div style={{ fontSize: '12px', marginBottom: '4px', color: trade.profitable ? '#10b981' : '#ef4444' }}>
            PnL: ${trade.pnl.toFixed(2)}
          </div>
          <div style={{ fontSize: '12px', marginBottom: '4px', color: trade.pnlPercent >= 0 ? '#10b981' : '#ef4444' }}>
            Return: {trade.pnlPercent.toFixed(2)}%
          </div>
          <div style={{ fontSize: '12px', color: '#f5c76d' }}>
            Leverage: {trade.leverage}x
          </div>
        </div>
      );
    }
    return null;
  };

  return (
    <>
      {controlsPortal}
      <div style={{ height: '100%', display: 'flex', flexDirection: 'column' }}>
        {/* Trade count indicator */}
        <div style={{ fontSize: '12px', color: '#888', marginBottom: '12px' }}>
          {chartData.length} trades shown
        </div>
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
          <div style={{ fontSize: '20px', fontWeight: 'bold', color: totalPnl >= 0 ? '#10b981' : '#ef4444', marginBottom: '2px' }}>
            ${totalPnl.toFixed(0)}
          </div>
          <div style={{ fontSize: '10px', color: '#666' }}>
            {chartData.length} trades
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
            Win Rate
          </div>
          <div style={{ fontSize: '20px', fontWeight: 'bold', color: winRate >= 50 ? '#10b981' : '#ef4444', marginBottom: '2px' }}>
            {winRate.toFixed(1)}%
          </div>
          <div style={{ fontSize: '10px', color: '#666' }}>
            {profitableTrades}/{chartData.length} profitable
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
            Avg Position Size
          </div>
          <div style={{ fontSize: '20px', fontWeight: 'bold', color: '#3b82f6', marginBottom: '2px' }}>
            ${avgPositionSize >= 1000 ? (avgPositionSize / 1000).toFixed(1) + 'K' : avgPositionSize.toFixed(0)}
          </div>
          <div style={{ fontSize: '10px', color: '#666' }}>
            Margin per trade
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
            Avg Return %
          </div>
          <div style={{ fontSize: '20px', fontWeight: 'bold', color: avgPnlPercent >= 0 ? '#10b981' : '#ef4444', marginBottom: '2px' }}>
            {avgPnlPercent.toFixed(1)}%
          </div>
          <div style={{ fontSize: '10px', color: '#666' }}>
            On margin
          </div>
        </div>
      </div>

      {/* Chart */}
      <div style={{ height: 320, width: '100%' }}>
        <ResponsiveContainer width="100%" height={320}>
          <ScatterChart margin={{ top: 20, right: 20, left: 60, bottom: 60 }}>
            <CartesianGrid stroke="#27272a" strokeDasharray="3 3" />
            <XAxis
              dataKey="positionSize"
              stroke="#71717a"
              tick={{ fontSize: 11 }}
              label={{ value: 'Position Size ($)', position: 'insideBottomRight', offset: -10 }}
            />
            <YAxis
              dataKey="pnl"
              stroke="#71717a"
              tick={{ fontSize: 11 }}
              label={{ value: 'PnL ($)', angle: -90, position: 'insideLeft', offset: -10 }}
            />
            <ReferenceLine y={0} stroke="#71717a" strokeDasharray="3 3" />
            <Tooltip content={renderTooltip} />
            <Legend wrapperStyle={{ paddingTop: '12px' }} />
            <Scatter name="Trades" data={chartData}>
              {chartData.map((entry: any, index: number) => (
                <Cell
                  key={`cell-${index}`}
                  fill={entry.profitable ? '#10b981' : '#ef4444'}
                  fillOpacity={0.7}
                />
              ))}
            </Scatter>
          </ScatterChart>
        </ResponsiveContainer>
      </div>

      {/* Insight */}
      <div style={{ marginTop: '12px', padding: '10px', backgroundColor: '#1a1a1a', borderRadius: '8px', border: '1px solid #27272a', fontSize: '12px', color: '#999' }}>
        <span style={{ color: '#D4AF37' }}>💡 Insight:</span> {
          avgPnlPercent >= 5
            ? `Strong returns: Avg ${avgPnlPercent.toFixed(1)}% return on margin with ${winRate.toFixed(0)}% win rate`
            : avgPnlPercent >= 0
            ? `Positive edge: ${avgPnlPercent.toFixed(1)}% avg return with ${winRate.toFixed(0)}% win rate`
            : `Room to improve: Avg ${avgPnlPercent.toFixed(1)}% return - consider adjusting position sizing or strategy`
        }
      </div>
      </div>
    </>
  );
};
