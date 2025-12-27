/**
 * Chart Markers Utility
 * Handles drawing trade positions, stop loss, and take profit on TradingView charts
 */

import type { Trade } from '../hooks/useTradeStats';

export interface ChartMarkerData {
  entryTime: number;
  entryPrice: number;
  stopLoss?: number;
  takeProfit?: number;
  side: 'LONG' | 'SHORT';
}

/**
 * Create HTML/SVG overlay for trade markers on the chart
 * This creates custom markers since TradingView widget has limitations
 */
export function createTradeMarkers(trade: Trade): ChartMarkerData {
  return {
    entryTime: trade.entryTime,
    entryPrice: trade.entryPrice,
    stopLoss: trade.stopLoss,
    takeProfit: trade.takeProfit,
    side: trade.side,
  };
}

/**
 * Inject CSS for trade markers
 */
export function injectMarkerStyles() {
  // Check if styles already injected
  if (document.getElementById('trade-markers-styles')) {
    return;
  }

  const style = document.createElement('style');
  style.id = 'trade-markers-styles';
  style.textContent = `
    .trade-marker-overlay {
      position: absolute;
      top: 0;
      left: 0;
      width: 100%;
      height: 100%;
      pointer-events: none;
      z-index: 100;
    }

    .trade-marker-svg {
      width: 100%;
      height: 100%;
    }

    .trade-entry-marker {
      fill: none;
      stroke: #F5C76D;
      stroke-width: 2;
    }

    .trade-entry-label {
      fill: #F5C76D;
      font-size: 12px;
      font-weight: 600;
      font-family: monospace;
    }

    .trade-stop-loss-line {
      stroke: #ef4444;
      stroke-width: 1.5;
      stroke-dasharray: 4,4;
    }

    .trade-stop-loss-label {
      fill: #ef4444;
      font-size: 11px;
      font-weight: 600;
      font-family: monospace;
    }

    .trade-take-profit-line {
      stroke: #10b981;
      stroke-width: 1.5;
      stroke-dasharray: 4,4;
    }

    .trade-take-profit-label {
      fill: #10b981;
      font-size: 11px;
      font-weight: 600;
      font-family: monospace;
    }

    .trade-long-marker {
      stroke: #10b981;
      fill: rgba(16, 185, 129, 0.1);
    }

    .trade-short-marker {
      stroke: #ef4444;
      fill: rgba(239, 68, 68, 0.1);
    }
  `;
  document.head.appendChild(style);
}

/**
 * Create SVG markers to overlay on chart
 * Since TradingView widget doesn't support direct shape insertion,
 * we create markers as a visual indicator
 */
export function createSVGMarkers(
  containerWidth: number,
  containerHeight: number,
  markerData: ChartMarkerData
): SVGSVGElement {
  const svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
  svg.setAttribute('class', 'trade-marker-svg');
  svg.setAttribute('viewBox', `0 0 ${containerWidth} ${containerHeight}`);
  svg.setAttribute('preserveAspectRatio', 'none');

  // Note: Exact positioning would require knowing the chart's scale
  // For now, we'll create a visual indicator near the entry time
  const markerX = containerWidth * 0.15; // 15% from left as placeholder

  // Entry marker line (vertical)
  const entryLine = document.createElementNS('http://www.w3.org/2000/svg', 'line');
  entryLine.setAttribute('x1', markerX.toString());
  entryLine.setAttribute('y1', '0');
  entryLine.setAttribute('x2', markerX.toString());
  entryLine.setAttribute('y2', containerHeight.toString());
  entryLine.setAttribute('class', `trade-entry-marker trade-${markerData.side === 'LONG' ? 'long' : 'short'}-marker`);
  svg.appendChild(entryLine);

  // Entry marker circle
  const entryCircle = document.createElementNS('http://www.w3.org/2000/svg', 'circle');
  entryCircle.setAttribute('cx', markerX.toString());
  entryCircle.setAttribute('cy', (containerHeight * 0.5).toString());
  entryCircle.setAttribute('r', '6');
  entryCircle.setAttribute('class', `trade-entry-marker trade-${markerData.side === 'LONG' ? 'long' : 'short'}-marker`);
  svg.appendChild(entryCircle);

  // Entry label
  const entryLabel = document.createElementNS('http://www.w3.org/2000/svg', 'text');
  entryLabel.setAttribute('x', (markerX + 12).toString());
  entryLabel.setAttribute('y', (containerHeight * 0.5 + 4).toString());
  entryLabel.setAttribute('class', 'trade-entry-label');
  entryLabel.textContent = `Entry: $${markerData.entryPrice.toFixed(2)}`;
  svg.appendChild(entryLabel);

  // Stop Loss line (horizontal dashed)
  if (markerData.stopLoss) {
    const slY = containerHeight * 0.6; // Placeholder Y position
    const slLine = document.createElementNS('http://www.w3.org/2000/svg', 'line');
    slLine.setAttribute('x1', '0');
    slLine.setAttribute('y1', slY.toString());
    slLine.setAttribute('x2', containerWidth.toString());
    slLine.setAttribute('y2', slY.toString());
    slLine.setAttribute('class', 'trade-stop-loss-line');
    svg.appendChild(slLine);

    // Stop Loss label
    const slLabel = document.createElementNS('http://www.w3.org/2000/svg', 'text');
    slLabel.setAttribute('x', '8');
    slLabel.setAttribute('y', (slY - 4).toString());
    slLabel.setAttribute('class', 'trade-stop-loss-label');
    slLabel.textContent = `SL: $${markerData.stopLoss.toFixed(2)}`;
    svg.appendChild(slLabel);
  }

  // Take Profit line (horizontal dashed)
  if (markerData.takeProfit) {
    const tpY = containerHeight * 0.35; // Placeholder Y position
    const tpLine = document.createElementNS('http://www.w3.org/2000/svg', 'line');
    tpLine.setAttribute('x1', '0');
    tpLine.setAttribute('y1', tpY.toString());
    tpLine.setAttribute('x2', containerWidth.toString());
    tpLine.setAttribute('y2', tpY.toString());
    tpLine.setAttribute('class', 'trade-take-profit-line');
    svg.appendChild(tpLine);

    // Take Profit label
    const tpLabel = document.createElementNS('http://www.w3.org/2000/svg', 'text');
    tpLabel.setAttribute('x', '8');
    tpLabel.setAttribute('y', (tpY - 4).toString());
    tpLabel.setAttribute('class', 'trade-take-profit-label');
    tpLabel.textContent = `TP: $${markerData.takeProfit.toFixed(2)}`;
    svg.appendChild(tpLabel);
  }

  return svg;
}
