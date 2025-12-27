/**
 * ReplayChart Component
 * Historical trade replay with animated playback using lightweight-charts
 */

import React, { useEffect, useRef, useState, useMemo } from 'react';
import { createChart, CandlestickSeries } from 'lightweight-charts';
import type { IChartApi, ISeriesApi, CandlestickData, Time, SeriesType } from 'lightweight-charts';
import type { Trade } from '../../hooks/useTradeStats';
import type { Candle, Interval } from '../../lib/binanceApi';
import { getHistoricalCandles, formatSymbolForExchange } from '../../lib/binanceApi';

interface ReplayChartProps {
  trade: Trade;
  onPriceUpdate?: (price: number, candle: Candle) => void;
}

type PlaybackSpeed = 0.5 | 1 | 2 | 5 | 10;

export const ReplayChart: React.FC<ReplayChartProps> = ({ trade, onPriceUpdate }) => {
  const chartContainerRef = useRef<HTMLDivElement>(null);
  const chartRef = useRef<IChartApi | null>(null);
  const candleSeriesRef = useRef<ISeriesApi<SeriesType> | null>(null);

  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [allCandles, setAllCandles] = useState<Candle[]>([]);
  const [displayedCandles, setDisplayedCandles] = useState<Candle[]>([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [isPlaying, setIsPlaying] = useState(false);
  const [playbackSpeed, setPlaybackSpeed] = useState<PlaybackSpeed>(1);
  const [interval, setIntervalState] = useState<Interval>('5m');
  const [dataSource, setDataSource] = useState<'real' | 'generated'>('generated');

  // Editable TP/SL
  const [stopLoss, setStopLoss] = useState<number | undefined>(trade.stopLoss);
  const [takeProfit, setTakeProfit] = useState<number | undefined>(trade.takeProfit);
  const [showTPSLEditor, setShowTPSLEditor] = useState(false);
  const [tempSL, setTempSL] = useState<string>('');
  const [tempTP, setTempTP] = useState<string>('');

  const playIntervalRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Calculate live PnL based on current candle
  const currentCandle = displayedCandles[displayedCandles.length - 1];
  const currentPrice = currentCandle?.close || trade.entryPrice;

  // Calculate margin (position value / leverage)
  const marginUsed = useMemo(() => {
    const positionValue = trade.entryPrice * trade.size;
    return positionValue / (trade.leverage || 1);
  }, [trade.entryPrice, trade.size, trade.leverage]);

  const livePnL = useMemo(() => {
    if (!currentCandle) return 0;
    const priceDiff = trade.side === 'LONG'
      ? currentPrice - trade.entryPrice
      : trade.entryPrice - currentPrice;
    return priceDiff * trade.size;
  }, [currentCandle, currentPrice, trade.entryPrice, trade.side, trade.size]);

  // PnL% is based on margin, not full position value
  const livePnLPercent = useMemo(() => {
    if (!currentCandle || marginUsed <= 0) return 0;
    return (livePnL / marginUsed) * 100;
  }, [livePnL, marginUsed, currentCandle]);

  // Check if SL/TP hit
  const slHit = useMemo(() => {
    if (!stopLoss || !currentCandle) return false;
    return trade.side === 'LONG' ? currentPrice <= stopLoss : currentPrice >= stopLoss;
  }, [stopLoss, currentPrice, trade.side, currentCandle]);

  const tpHit = useMemo(() => {
    if (!takeProfit || !currentCandle) return false;
    return trade.side === 'LONG' ? currentPrice >= takeProfit : currentPrice <= takeProfit;
  }, [takeProfit, currentPrice, trade.side, currentCandle]);

  // Format symbol for display (use the shared function for API calls)
  const formatSymbol = (sym: string): string => {
    return formatSymbolForExchange(sym, 'binance');
  };

  // Fetch historical candles when trade changes
  useEffect(() => {
    const fetchCandles = async () => {
      setIsLoading(true);
      setError(null);
      setIsPlaying(false);

      try {
        const symbol = formatSymbol(trade.symbol);

        // Get interval duration in ms
        const intervalMs: Record<Interval, number> = {
          '1m': 60 * 1000,
          '5m': 5 * 60 * 1000,
          '15m': 15 * 60 * 1000,
          '1h': 60 * 60 * 1000,
          '4h': 4 * 60 * 60 * 1000,
          '1d': 24 * 60 * 60 * 1000,
        };

        // Calculate time range - start 30 candles before entry, end 30 candles after exit
        const candleDuration = intervalMs[interval];
        const startTime = trade.entryTime - (30 * candleDuration);
        const endTime = trade.exitTime + (30 * candleDuration);

        console.log(`[ReplayChart] Fetching candles for ${symbol} from ${new Date(startTime)} to ${new Date(endTime)}`);

        const candles = await getHistoricalCandles(symbol, startTime, endTime, interval);

        if (candles.length === 0) {
          // No real data available - show error instead of fake data
          console.error(`[ReplayChart] No candles found for ${symbol}. Trade may be too old or symbol not available.`);
          setError(`No historical data available for ${symbol}. The trade may be older than 6 months or the symbol is not available on Binance.`);
          setIsLoading(false);
          return;
        }

        // Always use real candles - don't replace with fake data
        console.log(`[ReplayChart] ✓ Using ${candles.length} REAL candles from Binance`);

        // Log price info for debugging
        const avgCandlePrice = candles.reduce((sum, c) => sum + c.close, 0) / candles.length;
        console.log(`[ReplayChart] Avg candle price: $${avgCandlePrice.toFixed(2)}, Trade entry: $${trade.entryPrice.toFixed(2)}`);

        setDataSource('real');
        setAllCandles(candles);

        // Find the candle closest to entry time to start display
        const entryIndex = candles.findIndex(c => c.time >= trade.entryTime);
        const startIndex = Math.max(0, entryIndex - 10); // Show 10 candles before entry

        setCurrentIndex(startIndex);
        setDisplayedCandles(candles.slice(0, startIndex + 1));
        setIsLoading(false);
      } catch (err) {
        console.error('[ReplayChart] Error fetching candles:', err);
        setError('Failed to load historical data');
        setIsLoading(false);
      }
    };

    fetchCandles();
  }, [trade.id, trade.symbol, trade.entryTime, trade.exitTime, trade.entryPrice, trade.exitPrice, interval]);

  // Initialize chart
  useEffect(() => {
    if (!chartContainerRef.current || isLoading) return;

    // Clean up previous chart
    if (chartRef.current) {
      chartRef.current.remove();
      chartRef.current = null;
    }

    const chart = createChart(chartContainerRef.current, {
      layout: {
        background: { color: '#1a1a1a' },
        textColor: '#C2B280',
      },
      grid: {
        vertLines: { color: 'rgba(212, 165, 69, 0.1)' },
        horzLines: { color: 'rgba(212, 165, 69, 0.1)' },
      },
      crosshair: {
        mode: 1,
        vertLine: { color: 'rgba(245, 199, 109, 0.5)', width: 1, style: 2 },
        horzLine: { color: 'rgba(245, 199, 109, 0.5)', width: 1, style: 2 },
      },
      rightPriceScale: {
        borderColor: 'rgba(212, 165, 69, 0.2)',
      },
      timeScale: {
        borderColor: 'rgba(212, 165, 69, 0.2)',
        timeVisible: true,
        secondsVisible: false,
      },
      handleScale: {
        axisPressedMouseMove: true,
      },
      handleScroll: {
        mouseWheel: true,
        pressedMouseMove: true,
      },
    });

    const candleSeries = chart.addSeries(CandlestickSeries, {
      upColor: '#10b981',
      downColor: '#ef4444',
      borderUpColor: '#10b981',
      borderDownColor: '#ef4444',
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
    handleResize();

    return () => {
      window.removeEventListener('resize', handleResize);
      if (chartRef.current) {
        chartRef.current.remove();
        chartRef.current = null;
      }
    };
  }, [isLoading]);

  // Track price lines to avoid duplicates
  const priceLinesRef = useRef<any[]>([]);

  // Zoom controls
  const handleZoomIn = () => {
    if (chartRef.current) {
      const timeScale = chartRef.current.timeScale();
      const visibleRange = timeScale.getVisibleLogicalRange();
      if (visibleRange) {
        const center = (visibleRange.from + visibleRange.to) / 2;
        const halfRange = (visibleRange.to - visibleRange.from) / 4; // Zoom in by 50%
        timeScale.setVisibleLogicalRange({
          from: center - halfRange,
          to: center + halfRange,
        });
      }
    }
  };

  const handleZoomOut = () => {
    if (chartRef.current) {
      const timeScale = chartRef.current.timeScale();
      const visibleRange = timeScale.getVisibleLogicalRange();
      if (visibleRange) {
        const center = (visibleRange.from + visibleRange.to) / 2;
        const halfRange = (visibleRange.to - visibleRange.from); // Zoom out by 100%
        timeScale.setVisibleLogicalRange({
          from: center - halfRange,
          to: center + halfRange,
        });
      }
    }
  };

  const handleResetZoom = () => {
    if (chartRef.current) {
      chartRef.current.timeScale().fitContent();
    }
  };

  // Update chart data when displayedCandles changes
  useEffect(() => {
    if (!candleSeriesRef.current || displayedCandles.length === 0) return;

    const chartData: CandlestickData[] = displayedCandles.map(c => ({
      time: (c.time / 1000) as Time,
      open: c.open,
      high: c.high,
      low: c.low,
      close: c.close,
    }));

    candleSeriesRef.current.setData(chartData);

    // Set a zoomed out view - show more candles
    if (chartRef.current) {
      const timeScale = chartRef.current.timeScale();
      // Set visible range to show all candles with some padding (zoomed out view)
      // Use setVisibleLogicalRange for more control
      const numCandles = chartData.length;
      if (numCandles > 10) {
        // Show 1.5x the current candles (zoomed out)
        timeScale.setVisibleLogicalRange({
          from: -5, // Start a bit before first candle
          to: numCandles + Math.max(10, numCandles * 0.3), // End with padding for future candles
        });
      } else {
        timeScale.fitContent();
      }
    }

    // Notify parent of current price
    if (onPriceUpdate && displayedCandles.length > 0) {
      const latest = displayedCandles[displayedCandles.length - 1];
      onPriceUpdate(latest.close, latest);
    }
  }, [displayedCandles, onPriceUpdate]);

  // Add price lines only once when chart is ready and trade changes
  useEffect(() => {
    if (!candleSeriesRef.current || !chartRef.current || isLoading) return;

    // Remove existing price lines
    priceLinesRef.current.forEach(line => {
      try {
        candleSeriesRef.current?.removePriceLine(line);
      } catch (e) {
        // Line might already be removed
      }
    });
    priceLinesRef.current = [];

    // Entry line
    const entryLine = candleSeriesRef.current.createPriceLine({
      price: trade.entryPrice,
      color: '#F5C76D',
      lineWidth: 2,
      lineStyle: 2,
      axisLabelVisible: true,
      title: 'Entry',
    });
    priceLinesRef.current.push(entryLine);

    // Exit line
    const exitColor = trade.side === 'LONG'
      ? (trade.exitPrice > trade.entryPrice ? '#10b981' : '#ef4444')
      : (trade.exitPrice < trade.entryPrice ? '#10b981' : '#ef4444');
    const exitLine = candleSeriesRef.current.createPriceLine({
      price: trade.exitPrice,
      color: exitColor,
      lineWidth: 2,
      lineStyle: 2,
      axisLabelVisible: true,
      title: 'Exit',
    });
    priceLinesRef.current.push(exitLine);

    // Stop loss line (using editable value)
    if (stopLoss) {
      const slLine = candleSeriesRef.current.createPriceLine({
        price: stopLoss,
        color: '#ef4444',
        lineWidth: 2,
        lineStyle: 0,
        axisLabelVisible: true,
        title: 'SL',
      });
      priceLinesRef.current.push(slLine);
    }

    // Take profit line (using editable value)
    if (takeProfit) {
      const tpLine = candleSeriesRef.current.createPriceLine({
        price: takeProfit,
        color: '#10b981',
        lineWidth: 2,
        lineStyle: 0,
        axisLabelVisible: true,
        title: 'TP',
      });
      priceLinesRef.current.push(tpLine);
    }
  }, [trade.id, trade.entryPrice, trade.exitPrice, trade.side, isLoading, stopLoss, takeProfit]);

  // Playback logic
  useEffect(() => {
    if (isPlaying && currentIndex < allCandles.length - 1) {
      const baseDelay = 500; // Base delay in ms
      const delay = baseDelay / playbackSpeed;

      playIntervalRef.current = setTimeout(() => {
        setCurrentIndex(prev => {
          const next = prev + 1;
          setDisplayedCandles(allCandles.slice(0, next + 1));
          return next;
        });
      }, delay);
    } else if (currentIndex >= allCandles.length - 1) {
      setIsPlaying(false);
    }

    return () => {
      if (playIntervalRef.current) {
        clearTimeout(playIntervalRef.current);
      }
    };
  }, [isPlaying, currentIndex, allCandles, playbackSpeed]);

  // Control handlers
  const handlePlay = () => setIsPlaying(true);
  const handlePause = () => setIsPlaying(false);

  const handleReset = () => {
    setIsPlaying(false);
    const entryIndex = allCandles.findIndex(c => c.time >= trade.entryTime);
    const startIndex = Math.max(0, entryIndex - 20);
    setCurrentIndex(startIndex);
    setDisplayedCandles(allCandles.slice(0, startIndex + 1));
  };

  const handleSkipToEnd = () => {
    setIsPlaying(false);
    setCurrentIndex(allCandles.length - 1);
    setDisplayedCandles(allCandles);
  };

  const handleSliderChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const idx = parseInt(e.target.value);
    setCurrentIndex(idx);
    setDisplayedCandles(allCandles.slice(0, idx + 1));
  };

  // Calculate progress info
  const progress = allCandles.length > 0 ? ((currentIndex + 1) / allCandles.length) * 100 : 0;
  const hasPassedEntry = currentCandle && currentCandle.time >= trade.entryTime;
  const hasPassedExit = currentCandle && currentCandle.time >= trade.exitTime;

  // TP/SL Editor handlers
  const openTPSLEditor = () => {
    setTempSL(stopLoss?.toString() || '');
    setTempTP(takeProfit?.toString() || '');
    setShowTPSLEditor(true);
  };

  const saveTPSL = () => {
    const newSL = tempSL ? parseFloat(tempSL) : undefined;
    const newTP = tempTP ? parseFloat(tempTP) : undefined;
    setStopLoss(newSL);
    setTakeProfit(newTP);
    setShowTPSLEditor(false);
  };

  if (isLoading) {
    return (
      <div style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        height: '100%',
        backgroundColor: '#1a1a1a',
        color: '#C2B280',
      }}>
        <div style={{ textAlign: 'center' }}>
          <div style={{ fontSize: '24px', marginBottom: '12px' }}>Loading historical data...</div>
          <div style={{ fontSize: '14px', color: '#8B7355' }}>
            Fetching candles for {formatSymbol(trade.symbol)}
          </div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        height: '100%',
        backgroundColor: '#1a1a1a',
        color: '#ef4444',
      }}>
        <div style={{ textAlign: 'center' }}>
          <div style={{ fontSize: '24px', marginBottom: '12px' }}>{error}</div>
          <button
            onClick={() => window.location.reload()}
            style={{
              padding: '8px 16px',
              backgroundColor: 'rgba(212, 165, 69, 0.2)',
              border: '1px solid rgba(212, 165, 69, 0.4)',
              borderRadius: '6px',
              color: '#F5C76D',
              cursor: 'pointer',
            }}
          >
            Retry
          </button>
        </div>
      </div>
    );
  }

  return (
    <div style={{
      display: 'flex',
      flexDirection: 'column',
      height: '100%',
      backgroundColor: '#1a1a1a',
    }}>
      {/* TP/SL Editor Modal */}
      {showTPSLEditor && (
        <div style={{
          position: 'absolute',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          backgroundColor: 'rgba(0, 0, 0, 0.7)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          zIndex: 100,
        }}>
          <div style={{
            backgroundColor: '#1d1a16',
            border: '1px solid rgba(212, 165, 69, 0.3)',
            borderRadius: '12px',
            padding: '24px',
            width: '320px',
            boxSizing: 'border-box',
          }}>
            <h3 style={{ margin: '0 0 24px 0', color: '#F5C76D', fontSize: '16px', fontWeight: '600' }}>
              Set Stop Loss & Take Profit
            </h3>

            <div style={{ marginBottom: '20px' }}>
              <label style={{ display: 'block', color: '#C2B280', fontSize: '12px', marginBottom: '8px', fontWeight: '500' }}>
                Stop Loss Price
              </label>
              <input
                type="number"
                step="0.01"
                value={tempSL}
                onChange={(e) => setTempSL(e.target.value)}
                placeholder={`e.g. ${(trade.entryPrice * 0.98).toFixed(2)}`}
                style={{
                  width: '100%',
                  padding: '12px 14px',
                  backgroundColor: 'rgba(37, 30, 23, 0.9)',
                  border: '1px solid rgba(239, 68, 68, 0.4)',
                  borderRadius: '8px',
                  color: '#ef4444',
                  fontSize: '15px',
                  fontWeight: '600',
                  boxSizing: 'border-box',
                  outline: 'none',
                }}
              />
              <div style={{ fontSize: '11px', color: '#8B7355', marginTop: '4px' }}>
                Entry: ${trade.entryPrice.toFixed(2)}
              </div>
            </div>

            <div style={{ marginBottom: '24px' }}>
              <label style={{ display: 'block', color: '#C2B280', fontSize: '12px', marginBottom: '8px', fontWeight: '500' }}>
                Take Profit Price
              </label>
              <input
                type="number"
                step="0.01"
                value={tempTP}
                onChange={(e) => setTempTP(e.target.value)}
                placeholder={`e.g. ${(trade.entryPrice * 1.02).toFixed(2)}`}
                style={{
                  width: '100%',
                  padding: '12px 14px',
                  backgroundColor: 'rgba(37, 30, 23, 0.9)',
                  border: '1px solid rgba(16, 185, 129, 0.4)',
                  borderRadius: '8px',
                  color: '#10b981',
                  fontSize: '15px',
                  fontWeight: '600',
                  boxSizing: 'border-box',
                  outline: 'none',
                }}
              />
              <div style={{ fontSize: '11px', color: '#8B7355', marginTop: '4px' }}>
                Entry: ${trade.entryPrice.toFixed(2)}
              </div>
            </div>

            <div style={{ display: 'flex', gap: '12px' }}>
              <button
                onClick={() => setShowTPSLEditor(false)}
                style={{
                  flex: 1,
                  padding: '12px',
                  backgroundColor: 'transparent',
                  border: '1px solid rgba(212, 165, 69, 0.3)',
                  borderRadius: '8px',
                  color: '#C2B280',
                  cursor: 'pointer',
                  fontSize: '14px',
                  fontWeight: '500',
                }}
              >
                Cancel
              </button>
              <button
                onClick={saveTPSL}
                style={{
                  flex: 1,
                  padding: '12px',
                  backgroundColor: 'rgba(212, 165, 69, 0.2)',
                  border: '1px solid rgba(212, 165, 69, 0.4)',
                  borderRadius: '8px',
                  color: '#F5C76D',
                  fontWeight: '600',
                  cursor: 'pointer',
                  fontSize: '14px',
                }}
              >
                Save
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Trade Info Header */}
      <div style={{
        padding: '10px 16px',
        backgroundColor: 'rgba(37, 30, 23, 0.8)',
        borderBottom: '1px solid rgba(212, 165, 69, 0.15)',
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        flexWrap: 'wrap',
        gap: '8px',
      }}>
        {/* Left: Symbol, Side, Status, Data Source */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <span style={{ fontSize: '15px', fontWeight: '700', color: '#F5C76D' }}>
            {formatSymbol(trade.symbol)}
          </span>
          <span style={{
            padding: '3px 6px',
            backgroundColor: trade.side === 'LONG' ? 'rgba(16, 185, 129, 0.2)' : 'rgba(239, 68, 68, 0.2)',
            border: `1px solid ${trade.side === 'LONG' ? 'rgba(16, 185, 129, 0.4)' : 'rgba(239, 68, 68, 0.4)'}`,
            color: trade.side === 'LONG' ? '#10b981' : '#ef4444',
            borderRadius: '4px',
            fontSize: '10px',
            fontWeight: '700',
          }}>
            {trade.side}
          </span>
          <span style={{
            padding: '3px 6px',
            backgroundColor: dataSource === 'real' ? 'rgba(16, 185, 129, 0.15)' : 'rgba(245, 199, 109, 0.15)',
            border: `1px solid ${dataSource === 'real' ? 'rgba(16, 185, 129, 0.3)' : 'rgba(245, 199, 109, 0.3)'}`,
            color: dataSource === 'real' ? '#10b981' : '#F5C76D',
            borderRadius: '4px',
            fontSize: '9px',
            fontWeight: '600',
          }}
          title={dataSource === 'real' ? 'Using real historical data from Binance' : 'Using simulated candles (real data unavailable)'}
          >
            {dataSource === 'real' ? '● LIVE DATA' : '○ SIMULATED'}
          </span>

          {slHit && (
            <span style={{
              padding: '3px 6px',
              backgroundColor: 'rgba(239, 68, 68, 0.2)',
              border: '1px solid rgba(239, 68, 68, 0.4)',
              color: '#ef4444',
              borderRadius: '4px',
              fontSize: '10px',
              fontWeight: '700',
            }}>
              SL HIT
            </span>
          )}

          {tpHit && (
            <span style={{
              padding: '3px 6px',
              backgroundColor: 'rgba(16, 185, 129, 0.2)',
              border: '1px solid rgba(16, 185, 129, 0.4)',
              color: '#10b981',
              borderRadius: '4px',
              fontSize: '10px',
              fontWeight: '700',
            }}>
              TP HIT
            </span>
          )}
        </div>

        {/* Center: Live PnL */}
        {hasPassedEntry && currentCandle && (
          <div style={{
            padding: '6px 14px',
            backgroundColor: livePnL >= 0 ? 'rgba(16, 185, 129, 0.15)' : 'rgba(239, 68, 68, 0.15)',
            border: `2px solid ${livePnL >= 0 ? 'rgba(16, 185, 129, 0.4)' : 'rgba(239, 68, 68, 0.4)'}`,
            borderRadius: '8px',
            display: 'flex',
            alignItems: 'center',
            gap: '12px',
          }}>
            <span style={{ fontSize: '11px', color: '#8B7355' }}>Live P&L:</span>
            <span style={{
              fontSize: '16px',
              fontWeight: '700',
              color: livePnL >= 0 ? '#10b981' : '#ef4444',
              fontFamily: 'monospace',
            }}>
              {livePnL >= 0 ? '+' : ''}${livePnL.toFixed(2)}
            </span>
            <span style={{
              fontSize: '12px',
              fontWeight: '600',
              color: livePnL >= 0 ? '#10b981' : '#ef4444',
            }}>
              ({livePnLPercent >= 0 ? '+' : ''}{livePnLPercent.toFixed(2)}%)
            </span>
          </div>
        )}

        {/* Right: Prices + TP/SL Button */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
          <div style={{ display: 'flex', gap: '12px', fontSize: '11px', color: '#C2B280' }}>
            <span>Entry: <span style={{ color: '#F5C76D', fontWeight: '600' }}>${trade.entryPrice.toFixed(2)}</span></span>
            <span>Current: <span style={{ color: '#F5C76D', fontWeight: '600' }}>${currentPrice.toFixed(2)}</span></span>
          </div>

          <button
            onClick={openTPSLEditor}
            style={{
              padding: '5px 10px',
              backgroundColor: 'rgba(212, 165, 69, 0.1)',
              border: '1px solid rgba(212, 165, 69, 0.3)',
              borderRadius: '6px',
              color: '#F5C76D',
              fontSize: '11px',
              fontWeight: '600',
              cursor: 'pointer',
            }}
          >
            {stopLoss || takeProfit ? 'Edit TP/SL' : '+ TP/SL'}
          </button>
        </div>
      </div>

      {/* TP/SL Info Bar */}
      {(stopLoss || takeProfit) && (
        <div style={{
          padding: '6px 16px',
          backgroundColor: 'rgba(15, 10, 7, 0.5)',
          borderBottom: '1px solid rgba(212, 165, 69, 0.1)',
          display: 'flex',
          gap: '20px',
          fontSize: '11px',
        }}>
          {stopLoss && (
            <span style={{ color: '#ef4444' }}>
              SL: ${stopLoss.toFixed(2)}
              <span style={{ color: '#8B7355', marginLeft: '6px' }}>
                ({trade.side === 'LONG'
                  ? `-${(((trade.entryPrice - stopLoss) / trade.entryPrice) * 100).toFixed(1)}%`
                  : `-${(((stopLoss - trade.entryPrice) / trade.entryPrice) * 100).toFixed(1)}%`
                })
              </span>
            </span>
          )}
          {takeProfit && (
            <span style={{ color: '#10b981' }}>
              TP: ${takeProfit.toFixed(2)}
              <span style={{ color: '#8B7355', marginLeft: '6px' }}>
                ({trade.side === 'LONG'
                  ? `+${(((takeProfit - trade.entryPrice) / trade.entryPrice) * 100).toFixed(1)}%`
                  : `+${(((trade.entryPrice - takeProfit) / trade.entryPrice) * 100).toFixed(1)}%`
                })
              </span>
            </span>
          )}
        </div>
      )}

      {/* Chart */}
      <div
        ref={chartContainerRef}
        style={{
          flex: 1,
          minHeight: 0,
        }}
      />

      {/* Playback Controls */}
      <div style={{
        padding: '12px 16px',
        backgroundColor: 'rgba(37, 30, 23, 0.8)',
        borderTop: '1px solid rgba(212, 165, 69, 0.15)',
        display: 'flex',
        flexDirection: 'column',
        gap: '12px',
      }}>
        {/* Progress Slider */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
          <span style={{ fontSize: '11px', color: '#8B7355', minWidth: '80px' }}>
            {currentCandle ? new Date(currentCandle.time).toLocaleString('en-US', {
              month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit'
            }) : '--'}
          </span>
          <input
            type="range"
            min={0}
            max={allCandles.length - 1}
            value={currentIndex}
            onChange={handleSliderChange}
            style={{
              flex: 1,
              height: '6px',
              accentColor: '#F5C76D',
              cursor: 'pointer',
            }}
          />
          <span style={{ fontSize: '11px', color: '#8B7355', minWidth: '50px', textAlign: 'right' }}>
            {progress.toFixed(0)}%
          </span>
        </div>

        {/* Control Buttons */}
        <div style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          flexWrap: 'wrap',
          gap: '12px',
        }}>
          <div style={{ display: 'flex', gap: '8px' }}>
            {/* Reset */}
            <button
              onClick={handleReset}
              style={{
                padding: '8px 12px',
                backgroundColor: 'rgba(212, 165, 69, 0.1)',
                border: '1px solid rgba(212, 165, 69, 0.2)',
                borderRadius: '6px',
                color: '#C2B280',
                cursor: 'pointer',
                fontSize: '14px',
              }}
              title="Reset to start"
            >
              ⏮
            </button>

            {/* Play/Pause */}
            <button
              onClick={isPlaying ? handlePause : handlePlay}
              disabled={currentIndex >= allCandles.length - 1}
              style={{
                padding: '8px 20px',
                backgroundColor: isPlaying ? 'rgba(239, 68, 68, 0.2)' : 'rgba(16, 185, 129, 0.2)',
                border: `1px solid ${isPlaying ? 'rgba(239, 68, 68, 0.4)' : 'rgba(16, 185, 129, 0.4)'}`,
                borderRadius: '6px',
                color: isPlaying ? '#ef4444' : '#10b981',
                cursor: currentIndex >= allCandles.length - 1 ? 'not-allowed' : 'pointer',
                fontSize: '14px',
                fontWeight: '600',
                opacity: currentIndex >= allCandles.length - 1 ? 0.5 : 1,
              }}
            >
              {isPlaying ? '⏸ Pause' : '▶ Play'}
            </button>

            {/* Skip to End */}
            <button
              onClick={handleSkipToEnd}
              style={{
                padding: '8px 12px',
                backgroundColor: 'rgba(212, 165, 69, 0.1)',
                border: '1px solid rgba(212, 165, 69, 0.2)',
                borderRadius: '6px',
                color: '#C2B280',
                cursor: 'pointer',
                fontSize: '14px',
              }}
              title="Skip to end"
            >
              ⏭
            </button>
          </div>

          {/* Speed Controls */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <span style={{ fontSize: '11px', color: '#8B7355' }}>Speed:</span>
            {([0.5, 1, 2, 5, 10] as PlaybackSpeed[]).map(speed => (
              <button
                key={speed}
                onClick={() => setPlaybackSpeed(speed)}
                style={{
                  padding: '4px 8px',
                  backgroundColor: playbackSpeed === speed ? 'rgba(212, 165, 69, 0.2)' : 'transparent',
                  border: `1px solid ${playbackSpeed === speed ? 'rgba(212, 165, 69, 0.4)' : 'rgba(212, 165, 69, 0.15)'}`,
                  borderRadius: '4px',
                  color: playbackSpeed === speed ? '#F5C76D' : '#8B7355',
                  cursor: 'pointer',
                  fontSize: '11px',
                  fontWeight: '600',
                }}
              >
                {speed}x
              </button>
            ))}
          </div>

          {/* Interval Selector */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <span style={{ fontSize: '11px', color: '#8B7355' }}>Interval:</span>
            <select
              value={interval}
              onChange={(e) => setIntervalState(e.target.value as Interval)}
              style={{
                padding: '4px 8px',
                backgroundColor: 'rgba(37, 30, 23, 0.8)',
                border: '1px solid rgba(212, 165, 69, 0.2)',
                borderRadius: '4px',
                color: '#F5C76D',
                fontSize: '11px',
                cursor: 'pointer',
              }}
            >
              <option value="1m">1m</option>
              <option value="5m">5m</option>
              <option value="15m">15m</option>
              <option value="1h">1h</option>
              <option value="4h">4h</option>
            </select>
          </div>

          {/* Zoom Controls */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
            <span style={{ fontSize: '11px', color: '#8B7355' }}>Zoom:</span>
            <button
              onClick={handleZoomOut}
              style={{
                padding: '4px 10px',
                backgroundColor: 'rgba(212, 165, 69, 0.1)',
                border: '1px solid rgba(212, 165, 69, 0.2)',
                borderRadius: '4px',
                color: '#C2B280',
                cursor: 'pointer',
                fontSize: '12px',
                fontWeight: '600',
              }}
              title="Zoom out"
            >
              −
            </button>
            <button
              onClick={handleResetZoom}
              style={{
                padding: '4px 8px',
                backgroundColor: 'rgba(212, 165, 69, 0.1)',
                border: '1px solid rgba(212, 165, 69, 0.2)',
                borderRadius: '4px',
                color: '#C2B280',
                cursor: 'pointer',
                fontSize: '10px',
              }}
              title="Reset zoom"
            >
              Fit
            </button>
            <button
              onClick={handleZoomIn}
              style={{
                padding: '4px 10px',
                backgroundColor: 'rgba(212, 165, 69, 0.1)',
                border: '1px solid rgba(212, 165, 69, 0.2)',
                borderRadius: '4px',
                color: '#C2B280',
                cursor: 'pointer',
                fontSize: '12px',
                fontWeight: '600',
              }}
              title="Zoom in"
            >
              +
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
