/**
 * StatsPanel Component
 * Real-time statistics display for trade replay
 */

import React, { memo } from 'react';
import type { TradeStats, Trade } from '../../hooks/useTradeStats';
import { formatPrice, formatPnL, formatPercent, formatDuration } from '../../hooks/useTradeStats';

interface StatsPanelProps {
  trade: Trade | null;
  stats: TradeStats | null;
  isLiveMode: boolean;
}

const StatBox: React.FC<{ label: string; value: string; color?: string }> = ({
  label,
  value,
  color = '#C2B280',
}) => (
  <div
    style={{
      display: 'flex',
      flexDirection: 'column',
      gap: '4px',
    }}
  >
    <span
      style={{
        fontSize: '10px',
        color: '#8B7355',
        fontWeight: '600',
        textTransform: 'uppercase',
        letterSpacing: '0.5px',
      }}
    >
      {label}
    </span>
    <span
      style={{
        fontSize: '14px',
        fontWeight: '700',
        color: color,
        fontFamily: 'monospace',
      }}
    >
      {value}
    </span>
  </div>
);

const StatsPanelComponent: React.FC<StatsPanelProps> = ({ trade, stats, isLiveMode }) => {
  if (!trade || !stats) {
    return (
      <div
        style={{
          padding: '16px',
          backgroundColor: 'rgba(37, 30, 23, 0.6)',
          border: '1px solid rgba(212, 165, 69, 0.15)',
          borderRadius: '12px',
          color: '#666',
          textAlign: 'center',
          fontSize: '12px',
        }}
      >
        Select a trade to view statistics
      </div>
    );
  }

  // Safe access with defaults
  const unrealizedPnL = stats.unrealizedPnL ?? 0;
  const finalPnL = stats.finalPnL ?? 0;
  const pnlColor = unrealizedPnL >= 0 ? '#10b981' : '#ef4444';
  const finalPnLColor = (stats.isWinningTrade ?? finalPnL > 0) ? '#10b981' : '#ef4444';

  return (
    <div
      style={{
        display: 'flex',
        flexDirection: 'column',
        gap: '16px',
        padding: '16px',
        backgroundColor: 'rgba(37, 30, 23, 0.6)',
        border: '1px solid rgba(212, 165, 69, 0.15)',
        borderRadius: '12px',
      }}
    >
      {/* Header */}
      <div
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          borderBottom: '1px solid rgba(212, 165, 69, 0.1)',
          paddingBottom: '12px',
        }}
      >
        <span
          style={{
            fontSize: '11px',
            color: '#8B7355',
            fontWeight: '600',
            letterSpacing: '0.5px',
            textTransform: 'uppercase',
          }}
        >
          Trade Statistics
        </span>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          {/* Status Badge */}
          <span
            style={{
              fontSize: '11px',
              color: '#C2B280',
              backgroundColor: `${stats.tradeStatus === 'completed' ? 'rgba(16, 185, 129, 0.15)' : 'rgba(245, 199, 109, 0.15)'}`,
              border: `1px solid ${stats.tradeStatus === 'completed' ? 'rgba(16, 185, 129, 0.3)' : 'rgba(245, 199, 109, 0.3)'}`,
              padding: '4px 8px',
              borderRadius: '4px',
              fontWeight: '600',
              textTransform: 'capitalize',
            }}
          >
            {stats.tradeStatus === 'completed'
              ? stats.isWinningTrade
                ? '✓ WIN'
                : '✗ LOSS'
              : stats.tradeStatus === 'in-progress'
                ? 'IN PROGRESS'
                : 'PENDING'}
          </span>

          {/* PnL Result Badge */}
          {stats.tradeStatus === 'completed' && (
            <span
              style={{
                fontSize: '12px',
                fontWeight: '700',
                color: stats.isWinningTrade ? '#10b981' : '#ef4444',
                backgroundColor: stats.isWinningTrade
                  ? 'rgba(16, 185, 129, 0.1)'
                  : 'rgba(239, 68, 68, 0.1)',
                border: `1px solid ${
                  stats.isWinningTrade
                    ? 'rgba(16, 185, 129, 0.3)'
                    : 'rgba(239, 68, 68, 0.3)'
                }`,
                padding: '4px 10px',
                borderRadius: '4px',
                fontFamily: 'monospace',
              }}
            >
              {formatPnL(stats.finalPnL)} ({formatPercent(stats.finalPnLPercent, 1)})
            </span>
          )}
        </div>
      </div>

      {/* Trade Info Row */}
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(4, 1fr)',
          gap: '16px',
          paddingBottom: '12px',
          borderBottom: '1px solid rgba(212, 165, 69, 0.1)',
        }}
      >
        <StatBox label="Symbol" value={trade.symbol} />
        <StatBox label="Side" value={trade.side} color={trade.side === 'LONG' ? '#10b981' : '#ef4444'} />
        <StatBox label="Setup" value={trade.setup || 'N/A'} />
        <StatBox label="Status" value={stats.tradeStatus} />
      </div>

      {/* Price Metrics Row */}
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(5, 1fr)',
          gap: '16px',
          paddingBottom: '12px',
          borderBottom: '1px solid rgba(212, 165, 69, 0.1)',
        }}
      >
        <StatBox label="Entry" value={formatPrice(trade.entryPrice, 2)} />
        <StatBox label="Exit" value={formatPrice(trade.exitPrice, 2)} />
        <StatBox label="Current" value={formatPrice(stats.currentPrice, 2)} color="#F5C76D" />
        <StatBox label="Distance" value={formatPrice(stats.distanceFromEntry, 2)} color={pnlColor} />
        <StatBox label="% Change" value={formatPercent(stats.distanceFromEntryPercent, 2)} color={pnlColor} />
      </div>

      {/* Current PnL Indicator (Prominent) */}
      <div
        style={{
          backgroundColor: pnlColor === '#10b981' ? 'rgba(16, 185, 129, 0.08)' : 'rgba(239, 68, 68, 0.08)',
          border: `2px solid ${pnlColor}`,
          borderRadius: '8px',
          padding: '12px 16px',
          marginBottom: '12px',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
        }}
      >
        <div>
          <div
            style={{
              fontSize: '10px',
              color: '#8B7355',
              fontWeight: '600',
              textTransform: 'uppercase',
              marginBottom: '4px',
            }}
          >
            {stats.tradeStatus === 'completed' ? 'Final Result' : 'Current PnL'}
          </div>
          <div
            style={{
              fontSize: '14px',
              fontWeight: '700',
              color: pnlColor,
              fontFamily: 'monospace',
            }}
          >
            {stats.tradeStatus === 'completed'
              ? formatPnL(stats.finalPnL)
              : formatPnL(stats.unrealizedPnL)}
          </div>
        </div>
        <div
          style={{
            fontSize: '16px',
            fontWeight: '700',
            color: pnlColor,
            fontFamily: 'monospace',
          }}
        >
          {stats.tradeStatus === 'completed'
            ? formatPercent(stats.finalPnLPercent, 2)
            : formatPercent(stats.unrealizedPnLPercent, 2)}
        </div>
      </div>

      {/* PnL Metrics Row */}
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(4, 1fr)',
          gap: '16px',
          paddingBottom: '12px',
          borderBottom: '1px solid rgba(212, 165, 69, 0.1)',
        }}
      >
        <StatBox label="Unrealized PnL" value={formatPnL(stats.unrealizedPnL)} color={pnlColor} />
        <StatBox
          label="Unrealized %"
          value={formatPercent(stats.unrealizedPnLPercent, 2)}
          color={pnlColor}
        />
        <StatBox label="Final PnL" value={formatPnL(stats.finalPnL)} color={finalPnLColor} />
        <StatBox
          label="Final %"
          value={formatPercent(stats.finalPnLPercent, 2)}
          color={finalPnLColor}
        />
      </div>

      {/* Position Info Row */}
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(4, 1fr)',
          gap: '16px',
          paddingBottom: '12px',
          borderBottom: '1px solid rgba(212, 165, 69, 0.1)',
        }}
      >
        <StatBox label="Size" value={trade.size.toString()} />
        <StatBox label="Leverage" value={trade.leverage ? `${trade.leverage}x` : 'N/A'} />
        <StatBox label="Fees" value={formatPrice(trade.fees || 0, 2)} />
        <StatBox label="Duration" value={formatDuration(stats.tradeDuration)} />
      </div>

      {/* Risk Metrics (if leveraged) */}
      {trade.leverage && trade.liquidationPrice && (
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(3, 1fr)',
            gap: '16px',
            paddingBottom: '12px',
            borderBottom: '1px solid rgba(212, 165, 69, 0.1)',
            backgroundColor: 'rgba(239, 68, 68, 0.05)',
            padding: '12px',
            borderRadius: '8px',
            border: '1px solid rgba(239, 68, 68, 0.15)',
          }}
        >
          <StatBox label="Liquidation Price" value={formatPrice(trade.liquidationPrice, 2)} color="#ef4444" />
          <StatBox
            label="Distance to Liq"
            value={formatPrice(stats.distanceToLiquidation || 0, 2)}
            color={
              stats.distanceToLiquidation && stats.distanceToLiquidation > 0
                ? '#10b981'
                : '#ef4444'
            }
          />
          <StatBox
            label="% to Liquidation"
            value={formatPercent(stats.distanceToLiquidationPercent || 0, 2)}
            color={
              stats.distanceToLiquidationPercent && stats.distanceToLiquidationPercent > 0
                ? '#10b981'
                : '#ef4444'
            }
          />
        </div>
      )}

      {/* Stop Loss / Take Profit */}
      {(trade.stopLoss || trade.takeProfit) && (
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: trade.stopLoss && trade.takeProfit ? 'repeat(2, 1fr)' : '1fr',
            gap: '16px',
          }}
        >
          {trade.stopLoss && (
            <div
              style={{
                padding: '12px',
                backgroundColor: 'rgba(239, 68, 68, 0.05)',
                border: '1px solid rgba(239, 68, 68, 0.15)',
                borderRadius: '8px',
              }}
            >
              <StatBox label="Stop Loss" value={formatPrice(trade.stopLoss, 2)} color="#ef4444" />
              {stats.maxLoss && (
                <StatBox label="Max Loss" value={formatPrice(stats.maxLoss, 2)} color="#ef4444" />
              )}
            </div>
          )}
          {trade.takeProfit && (
            <div
              style={{
                padding: '12px',
                backgroundColor: 'rgba(16, 185, 129, 0.05)',
                border: '1px solid rgba(16, 185, 129, 0.15)',
                borderRadius: '8px',
              }}
            >
              <StatBox label="Take Profit" value={formatPrice(trade.takeProfit, 2)} color="#10b981" />
              {stats.maxProfit && (
                <StatBox label="Max Profit" value={formatPrice(stats.maxProfit, 2)} color="#10b981" />
              )}
            </div>
          )}
        </div>
      )}

      {/* Notes Section */}
      {trade.notes && (
        <div
          style={{
            paddingTop: '12px',
            borderTop: '1px solid rgba(212, 165, 69, 0.1)',
          }}
        >
          <div
            style={{
              fontSize: '10px',
              color: '#8B7355',
              fontWeight: '600',
              textTransform: 'uppercase',
              letterSpacing: '0.5px',
              marginBottom: '8px',
            }}
          >
            Notes
          </div>
          <div
            style={{
              fontSize: '12px',
              color: '#C2B280',
              backgroundColor: 'rgba(0, 0, 0, 0.2)',
              padding: '8px',
              borderRadius: '6px',
              border: '1px solid rgba(212, 165, 69, 0.1)',
              maxHeight: '100px',
              overflow: 'auto',
            }}
          >
            {trade.notes}
          </div>
        </div>
      )}
    </div>
  );
};

export const StatsPanel = memo(StatsPanelComponent);
