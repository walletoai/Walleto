/**
 * TradingView Advanced Chart Integration
 * Embeds the full TradingView charting interface with trade position markers
 */

import React, { useEffect, useRef } from 'react';
import type { Trade } from '../../hooks/useTradeStats';

interface TradingViewChartProps {
  symbol: string;
  trade?: Trade | null;
  onReady?: () => void;
  onPriceUpdate?: (price: number) => void;
}

export const TradingViewChart: React.FC<TradingViewChartProps> = ({
  symbol,
  trade,
  onReady,
  onPriceUpdate
}) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const chartContainerRef = useRef<HTMLDivElement>(null);
  const scriptRef = useRef<HTMLScriptElement | null>(null);
  const [tradingViewReady, setTradingViewReady] = React.useState(false);

  // Format symbol for TradingView
  const formatSymbol = (sym: string) => {
    if (!sym) return 'BINANCE:BTCUSDT';

    // Already has exchange prefix
    if (sym.includes(':')) {
      return sym;
    }

    // Remove common suffixes (.P for perpetuals, .USD, etc.)
    let cleanSymbol = sym
      .replace(/\.P$/, '') // Remove .P suffix
      .replace(/\.USD$/, '') // Remove .USD suffix
      .toUpperCase();

    // Ensure it's a valid format
    if (!cleanSymbol.match(/^[A-Z0-9]+$/)) {
      cleanSymbol = 'BTCUSDT';
    }

    return `BINANCE:${cleanSymbol}`;
  };


  // Load TradingView library on mount
  useEffect(() => {
    // Load TradingView script library only once
    if ((window as any).TradingView) {
      console.log('[TradingViewChart] TradingView already loaded');
      setTradingViewReady(true);
      return;
    }

    console.log('[TradingViewChart] Loading TradingView library');
    const script = document.createElement('script');
    script.src = 'https://s3.tradingview.com/tv.js';
    script.async = true;
    script.onload = () => {
      console.log('[TradingViewChart] TradingView library loaded successfully');
      setTradingViewReady(true);
    };
    script.onerror = () => {
      console.error('[TradingViewChart] Failed to load TradingView library');
    };
    document.head.appendChild(script);
  }, []);

  // Create widget when symbol changes
  useEffect(() => {
    if (!containerRef.current || !tradingViewReady || !(window as any).TradingView) {
      console.log('[TradingViewChart] Waiting for TradingView to be ready', {
        hasContainer: !!containerRef.current,
        tradingViewReady,
        hasTradingView: !!(window as any).TradingView
      });
      return;
    }

    const formattedSymbol = formatSymbol(symbol);
    console.log(`[TradingViewChart] Creating/updating widget for: ${formattedSymbol}`);

    try {
      // Clear previous widget
      if (containerRef.current) {
        containerRef.current.innerHTML = '';
      }

      // Wait a tick to ensure container is properly sized
      setTimeout(() => {
        if (!containerRef.current) return;

        console.log('[TradingViewChart] Container dimensions:', {
          width: containerRef.current.offsetWidth,
          height: containerRef.current.offsetHeight
        });

        // @ts-ignore
        const widget = new window.TradingView.widget({
          autosize: true,
          symbol: formattedSymbol,
          timezone: 'Etc/UTC',
          theme: 'dark',
          style: '1', // Candlestick only
          locale: 'en',
          toolbar_bg: '#1a1a1a',
          enable_publishing: false,
          withdateranges: false,
          hide_side_toolbar: false,
          hide_top_toolbar: false,
          allow_symbol_change: false,
          details: false,
          hotlist: false,
          calendar: false,
          news: false,
          show_popup_button_in_header: false,
          save_image: false,
          studies: [], // No indicators
          container_id: 'tradingview-chart',
          // Only candlesticks, minimal UI
          chart_types: ['candlestick'],
          disabled_features: [
            'header_chart_type',
            'header_compare',
            'show_interval_dialog_on_key_press',
            'header_settings',
            'header_fullscreen_button',
            'header_undo_redo',
            'header_screenshot',
            'left_toolbar',
            'control_bar',
            'zoom_and_move_toolbar',
            'show_hide_button_in_header',
            'symbol_search_hot_key',
            'volume_force_overlay'
          ]
        });

        onReady?.();
      }, 0);
    } catch (error) {
      console.error('[TradingViewChart] Error creating widget:', error);
    }
  }, [symbol, tradingViewReady]); // Update widget when symbol or library changes

  // Render price level lines overlay for trade positions
  useEffect(() => {
    if (!chartContainerRef.current || !trade) return;

    // Remove existing overlay if it exists
    const existingOverlay = chartContainerRef.current.querySelector('[data-price-levels-overlay]');
    if (existingOverlay) {
      existingOverlay.remove();
    }

    // Create overlay container for price levels
    const overlay = document.createElement('div');
    overlay.setAttribute('data-price-levels-overlay', 'true');
    overlay.style.cssText = `
      position: absolute;
      top: 0;
      left: 0;
      width: 100%;
      height: 100%;
      pointer-events: none;
      z-index: 5;
    `;

    // Calculate price range visible on chart (approximate)
    const minPrice = Math.min(trade.entryPrice, trade.stopLoss || trade.entryPrice, trade.takeProfit || trade.entryPrice);
    const maxPrice = Math.max(trade.entryPrice, trade.stopLoss || trade.entryPrice, trade.takeProfit || trade.entryPrice);
    const priceRange = maxPrice - minPrice || trade.entryPrice * 0.1;

    // Create price level line
    const createPriceLevelLine = (price: number, label: string, color: string, labelColor: string) => {
      const line = document.createElement('div');
      const percentPosition = ((price - minPrice) / priceRange) * 100;

      line.style.cssText = `
        position: absolute;
        top: ${100 - percentPosition}%;
        left: 0;
        width: 100%;
        height: 2px;
        background: linear-gradient(to right, ${color} 0%, transparent 100%);
        pointer-events: none;
      `;

      // Add label
      const labelEl = document.createElement('div');
      labelEl.style.cssText = `
        position: absolute;
        top: calc(${100 - percentPosition}% - 10px);
        right: 8px;
        padding: 2px 8px;
        background: rgba(26, 26, 26, 0.8);
        border: 1px solid ${color};
        color: ${labelColor};
        font-size: 11px;
        font-weight: 600;
        font-family: monospace;
        border-radius: 4px;
        white-space: nowrap;
        pointer-events: none;
        z-index: 10;
      `;
      labelEl.textContent = `${label} $${price.toFixed(2)}`;

      line.appendChild(labelEl);
      overlay.appendChild(line);
    };

    // Add entry price line (gold)
    createPriceLevelLine(trade.entryPrice, 'ENTRY', 'rgba(245, 199, 109, 0.6)', '#F5C76D');

    // Add stop loss line (red) if present
    if (trade.stopLoss) {
      createPriceLevelLine(trade.stopLoss, 'SL', 'rgba(239, 68, 68, 0.6)', '#ef4444');
    }

    // Add take profit line (green) if present
    if (trade.takeProfit) {
      createPriceLevelLine(trade.takeProfit, 'TP', 'rgba(16, 185, 129, 0.6)', '#10b981');
    }

    chartContainerRef.current.appendChild(overlay);

    return () => {
      if (overlay && overlay.parentNode) {
        overlay.remove();
      }
    };
  }, [trade]);

  // Handle price updates
  useEffect(() => {
    const handlePriceUpdate = (event: CustomEvent) => {
      const { candle } = event.detail;
      if (onPriceUpdate && candle) {
        onPriceUpdate(candle.close);
      }
    };

    window.addEventListener('binanceStreamUpdate', handlePriceUpdate as EventListener);

    return () => {
      console.log('[TradingViewChart] Cleanup: removing event listener');
      window.removeEventListener('binanceStreamUpdate', handlePriceUpdate as EventListener);
    };
  }, [onPriceUpdate]);

  return (
    <div
      style={{
        display: 'flex',
        flexDirection: 'column',
        height: '100%',
        minHeight: 0,
        backgroundColor: '#1a1a1a',
        borderRadius: '12px',
        overflow: 'hidden',
        border: '1px solid rgba(212, 165, 69, 0.15)',
      }}
    >
      {/* Trade Info Overlay */}
      {trade && (
        <>
          <div
            style={{
              padding: '12px 16px',
              backgroundColor: 'rgba(37, 30, 23, 0.8)',
              borderBottom: '1px solid rgba(212, 165, 69, 0.15)',
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              zIndex: 10,
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
              <span style={{ fontSize: '14px', fontWeight: '700', color: '#F5C76D' }}>
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
            <div style={{ display: 'flex', gap: '16px', fontSize: '12px', color: '#C2B280' }}>
              <div>
                Entry: <span style={{ color: '#F5C76D', fontWeight: '600' }}>${trade.entryPrice.toFixed(2)}</span>
              </div>
              {trade.stopLoss && (
                <div>
                  SL: <span style={{ color: '#ef4444', fontWeight: '600' }}>${trade.stopLoss.toFixed(2)}</span>
                </div>
              )}
              {trade.takeProfit && (
                <div>
                  TP: <span style={{ color: '#10b981', fontWeight: '600' }}>${trade.takeProfit.toFixed(2)}</span>
                </div>
              )}
              <div>
                Current: <span style={{ color: '#F5C76D', fontWeight: '600' }}>${trade.exitPrice.toFixed(2)}</span>
              </div>
            </div>
          </div>

          {/* Trade Markers - Entry time and trade markers display */}
          <div
            style={{
              padding: '8px 16px',
              backgroundColor: 'rgba(37, 30, 23, 0.5)',
              borderBottom: '1px solid rgba(212, 165, 69, 0.1)',
              display: 'flex',
              alignItems: 'center',
              gap: '24px',
              fontSize: '11px',
              color: '#8B7355',
              zIndex: 10,
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <span style={{ color: '#F5C76D', fontWeight: '600' }}>📍 Entry Time</span>
              <span style={{ color: '#C2B280' }}>
                {new Date(trade.entryTime).toLocaleString('en-US', {
                  month: '2-digit',
                  day: '2-digit',
                  year: '2-digit',
                  hour: '2-digit',
                  minute: '2-digit',
                  second: '2-digit',
                })}
              </span>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                <span style={{ width: '8px', height: '8px', backgroundColor: '#F5C76D', borderRadius: '2px' }} />
                <span style={{ color: '#C2B280' }}>Entry Price</span>
              </div>
              {trade.stopLoss && (
                <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                  <span style={{ width: '8px', height: '8px', backgroundColor: '#ef4444', borderRadius: '2px' }} />
                  <span style={{ color: '#C2B280' }}>Stop Loss</span>
                </div>
              )}
              {trade.takeProfit && (
                <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                  <span style={{ width: '8px', height: '8px', backgroundColor: '#10b981', borderRadius: '2px' }} />
                  <span style={{ color: '#C2B280' }}>Take Profit</span>
                </div>
              )}
            </div>
          </div>
        </>
      )}

      {/* TradingView Chart Container */}
      <div
        style={{
          flex: 1,
          width: '100%',
          minHeight: 0,
          display: 'flex',
          flexDirection: 'column',
          backgroundColor: '#1a1a1a',
        }}
      >
        <div
          id="tradingview-chart"
          ref={(el) => {
            containerRef.current = el;
            chartContainerRef.current = el;
          }}
          style={{
            flex: 1,
            width: '100%',
            minHeight: 0,
            backgroundColor: '#1a1a1a',
            position: 'relative',
          }}
        >
          {(!tradingViewReady || !(window as any).TradingView) && (
            <div
              style={{
                position: 'absolute',
                top: '50%',
                left: '50%',
                transform: 'translate(-50%, -50%)',
                color: '#C2B280',
                fontSize: '14px',
                textAlign: 'center',
              }}
            >
              <div style={{ marginBottom: '8px' }}>📊</div>
              Loading chart...
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
