/**
 * ChartArea Component
 * Chart container with lightweight-charts integration
 */

import React, { useEffect, useRef, useMemo, memo } from 'react';
import { createChart, ColorType } from 'lightweight-charts';
import type { IChartApi, ISeriesApi } from 'lightweight-charts';
import type { Candle } from '../../lib/binanceApi';
import type { Trade } from '../../hooks/useTradeStats';

interface ChartAreaProps {
  candles: Candle[];
  trade: Trade | null;
  currentCandleIndex: number;
  isLoading: boolean;
  error: string | null;
}

interface ChartMarker {
  time: number;
  position: 'inBar' | 'aboveBar' | 'belowBar';
  color: string;
  shape: 'circle' | 'square' | 'arrowUp' | 'arrowDown';
  text: string;
}

interface PriceLine {
  price: number;
  color: string;
  label: string;
  lineStyle: number; // 0 = solid, 1 = dashed
}

const ChartAreaComponent: React.FC<ChartAreaProps> = ({
  candles,
  trade,
  currentCandleIndex,
  isLoading,
  error,
}) => {
  const chartContainerRef = useRef<HTMLDivElement>(null);
  const chartRef = useRef<IChartApi | null>(null);
  const candleSeriesRef = useRef<ISeriesApi<'Candlestick'> | null>(null);

  // Initialize chart
  useEffect(() => {
    if (!chartContainerRef.current) return;

    const timer = setTimeout(() => {
      if (!chartContainerRef.current) return;

      try {
        const width = chartContainerRef.current.clientWidth || 800;
        const height = chartContainerRef.current.clientHeight || 500;

        const chart = createChart(chartContainerRef.current, {
          layout: {
            background: { type: ColorType.Solid, color: '#1D1A16' },
            textColor: '#C2B280',
          },
          grid: {
            vertLines: { color: 'rgba(212, 165, 69, 0.1)' },
            horzLines: { color: 'rgba(212, 165, 69, 0.1)' },
          },
          width,
          height,
          timeScale: {
            timeVisible: true,
            secondsVisible: false,
          },
        });

        const candleSeries = (chart as any).addCandlestickSeries({
          upColor: '#10b981',
          downColor: '#ef4444',
          borderVisible: false,
          wickUpColor: '#10b981',
          wickDownColor: '#ef4444',
        });

        chartRef.current = chart;
        candleSeriesRef.current = candleSeries;

        // Handle resize
        const handleResize = () => {
          if (chartContainerRef.current && chartRef.current) {
            chartRef.current.applyOptions({
              width: chartContainerRef.current.clientWidth,
              height: chartContainerRef.current.clientHeight,
            });
          }
        };

        window.addEventListener('resize', handleResize);

        return () => {
          window.removeEventListener('resize', handleResize);
          if (chartRef.current) {
            chartRef.current.remove();
          }
        };
      } catch (err) {
        console.error('Failed to initialize chart:', err);
      }
    }, 100);

    return () => clearTimeout(timer);
  }, []);

  // Update candles
  useEffect(() => {
    if (!candleSeriesRef.current) {
      console.warn('[ChartArea] candleSeriesRef not initialized');
      return;
    }

    if (candles.length === 0) {
      console.warn('[ChartArea] No candles to display');
      (candleSeriesRef.current as any).setData([]);
      return;
    }

    console.log(`[ChartArea] Rendering ${candles.length} candles`);
    const chartData = candles.map((candle) => ({
      time: Math.floor(candle.time / 1000) as any,
      open: candle.open,
      high: candle.high,
      low: candle.low,
      close: candle.close,
    }));

    try {
      (candleSeriesRef.current as any).setData(chartData);
      console.log('[ChartArea] Candles rendered successfully');

      // Auto-scroll to current candle
      if (chartRef.current && currentCandleIndex >= 0) {
        const currentCandle = candles[currentCandleIndex];
        if (currentCandle) {
          chartRef.current.timeScale().scrollToPosition(currentCandleIndex, false);
        }
      }
    } catch (err) {
      console.error('[ChartArea] Error rendering candles:', err);
    }
  }, [candles, currentCandleIndex]);

  // Add trade markers and price lines
  useEffect(() => {
    if (!candleSeriesRef.current || !trade || candles.length === 0 || !chartRef.current) return;

    const chart = chartRef.current;
    const markers: ChartMarker[] = [];

    try {
      // Remove existing price lines
      const priceLines = (chart as any).priceScale('right').priceLines();
      priceLines.forEach((line: any) => {
        try {
          (candleSeriesRef.current as any).removePriceLine(line);
        } catch (e) {
          // Ignore errors when removing non-existent lines
        }
      });
    } catch (err) {
      // Ignore price scale errors
    }

    // Find entry candle and add entry price line
    const entryCandle = candles.find((c) => c.time >= trade.entryTime);
    if (entryCandle) {
      markers.push({
        time: Math.floor(entryCandle.time / 1000) as any,
        position: 'belowBar',
        color: '#F5C76D',
        shape: 'arrowUp',
        text: 'ENTRY',
      });

      // Add entry price line
      try {
        (candleSeriesRef.current as any).createPriceLine({
          price: trade.entryPrice,
          color: '#F5C76D',
          lineWidth: 2,
          lineStyle: 0, // solid
          axisLabelVisible: true,
          title: `Entry: $${trade.entryPrice.toFixed(2)}`,
        });
      } catch (err) {
        console.error('Error adding entry price line:', err);
      }
    }

    // Find exit candle and add exit price line
    const exitCandle = candles.find((c) => c.time >= trade.exitTime);
    if (exitCandle) {
      const isWin = trade.exitPrice > trade.entryPrice;
      markers.push({
        time: Math.floor(exitCandle.time / 1000) as any,
        position: 'aboveBar',
        color: isWin ? '#10b981' : '#ef4444',
        shape: 'arrowDown',
        text: isWin ? 'EXIT ✓' : 'EXIT ✗',
      });

      // Add exit price line
      try {
        (candleSeriesRef.current as any).createPriceLine({
          price: trade.exitPrice,
          color: isWin ? '#10b981' : '#ef4444',
          lineWidth: 2,
          lineStyle: 0, // solid
          axisLabelVisible: true,
          title: `Exit: $${trade.exitPrice.toFixed(2)}`,
        });
      } catch (err) {
        console.error('Error adding exit price line:', err);
      }
    }

    // Add Stop Loss line if present
    if (trade.stopLoss) {
      try {
        (candleSeriesRef.current as any).createPriceLine({
          price: trade.stopLoss,
          color: '#ef4444',
          lineWidth: 1,
          lineStyle: 1, // dashed
          axisLabelVisible: true,
          title: `SL: $${trade.stopLoss.toFixed(2)}`,
        });
      } catch (err) {
        console.error('Error adding stop loss line:', err);
      }
    }

    // Add Take Profit line if present
    if (trade.takeProfit) {
      try {
        (candleSeriesRef.current as any).createPriceLine({
          price: trade.takeProfit,
          color: '#10b981',
          lineWidth: 1,
          lineStyle: 1, // dashed
          axisLabelVisible: true,
          title: `TP: $${trade.takeProfit.toFixed(2)}`,
        });
      } catch (err) {
        console.error('Error adding take profit line:', err);
      }
    }

    // Add Liquidation price line if present (for leveraged trades)
    if (trade.leverage && trade.liquidationPrice) {
      try {
        (candleSeriesRef.current as any).createPriceLine({
          price: trade.liquidationPrice,
          color: '#991b1b',
          lineWidth: 1,
          lineStyle: 1, // dashed
          axisLabelVisible: true,
          title: `Liquidation: $${trade.liquidationPrice.toFixed(2)}`,
        });
      } catch (err) {
        console.error('Error adding liquidation price line:', err);
      }
    }

    // Set markers
    try {
      (candleSeriesRef.current as any).setMarkers(markers);
    } catch (err) {
      console.error('Error setting markers:', err);
    }
  }, [candles, trade]);

  return (
    <div
      style={{
        display: 'flex',
        flexDirection: 'column',
        height: '100%',
        backgroundColor: 'rgba(37, 30, 23, 0.3)',
        border: '1px solid rgba(212, 165, 69, 0.15)',
        borderRadius: '12px',
        overflow: 'hidden',
      }}
    >
      {/* Header */}
      <div
        style={{
          padding: '12px 16px',
          borderBottom: '1px solid rgba(212, 165, 69, 0.15)',
          backgroundColor: 'rgba(29, 26, 22, 0.5)',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          zIndex: 10,
        }}
      >
        <div>
          {trade ? (
            <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
              <span
                style={{
                  fontSize: '14px',
                  fontWeight: '700',
                  color: '#F5C76D',
                }}
              >
                {trade.symbol}
              </span>
              <span
                style={{
                  fontSize: '11px',
                  fontWeight: '600',
                  padding: '4px 8px',
                  backgroundColor: trade.side === 'LONG' ? 'rgba(16, 185, 129, 0.2)' : 'rgba(239, 68, 68, 0.2)',
                  border: `1px solid ${trade.side === 'LONG' ? 'rgba(16, 185, 129, 0.4)' : 'rgba(239, 68, 68, 0.4)'}`,
                  color: trade.side === 'LONG' ? '#10b981' : '#ef4444',
                  borderRadius: '4px',
                }}
              >
                {trade.side}
              </span>
            </div>
          ) : (
            <span
              style={{
                fontSize: '12px',
                color: '#666',
              }}
            >
              Select a trade to view chart
            </span>
          )}
        </div>

        {isLoading && (
          <div
            style={{
              fontSize: '11px',
              color: '#F5C76D',
              display: 'flex',
              alignItems: 'center',
              gap: '6px',
            }}
          >
            <span
              style={{
                display: 'inline-block',
                width: '8px',
                height: '8px',
                borderRadius: '50%',
                backgroundColor: '#F5C76D',
                animation: 'pulse 1.5s ease-in-out infinite',
              }}
            />
            Loading data...
          </div>
        )}

        {error && (
          <div
            style={{
              fontSize: '11px',
              color: '#ef4444',
            }}
          >
            ⚠ {error}
          </div>
        )}
      </div>

      {/* Chart Container */}
      <div
        ref={chartContainerRef}
        style={{
          flex: 1,
          minHeight: 0,
          backgroundColor: '#1D1A16',
        }}
      />

      <style>{`
        @keyframes pulse {
          0%, 100% { opacity: 1; }
          50% { opacity: 0.5; }
        }
      `}</style>
    </div>
  );
};

export const ChartArea = memo(ChartAreaComponent);
