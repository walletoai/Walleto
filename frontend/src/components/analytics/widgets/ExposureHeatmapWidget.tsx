import React, { useMemo, useState, useEffect } from 'react';
import { createPortal } from 'react-dom';

interface Props {
  data: any;
  widgetId?: string;
}

interface TimeExposure {
  dayOfWeek: string;
  hour: string;
  exposure: number;
  trades: number;
}

interface AssetExposure {
  asset: string;
  maxExposure: number;
  avgExposure: number;
  trades: number;
}

export const ExposureHeatmapWidget: React.FC<Props> = ({ data, widgetId }) => {
  const { filteredTrades } = data;
  const [viewType, setViewType] = useState<'time' | 'asset'>('time');
  const [timeRange, setTimeRange] = useState<'ALL' | 'YEAR' | 'MONTH' | 'WEEK'>('ALL');
  const [controlElement, setControlElement] = useState<HTMLElement | null>(null);

  useEffect(() => {
    if (!widgetId) return;
    const element = document.getElementById(`${widgetId}-controls`);
    setControlElement(element);
  }, [widgetId]);

  const { timeExposure, assetExposure, maxExposureValue } = useMemo(() => {
    if (!filteredTrades || filteredTrades.length === 0) {
      return {
        timeExposure: [],
        assetExposure: [],
        maxExposureValue: 0,
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

    // Time-based exposure (by day of week and hour)
    const dayNames = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
    const timeMap = new Map<string, { exposure: number; trades: number }>();

    // Asset-based exposure
    const assetMap = new Map<string, { totalExposure: number; maxExposure: number; trades: number }>();

    let maxExposure = 0;

    trades.forEach((trade: any) => {
      const entry = parseFloat(trade.entry_price || trade.entry || 0);
      const size = parseFloat(trade.quantity || trade.size || 0);
      const leverage = parseFloat(trade.leverage || 1);

      // Calculate exposure as entry price * size * leverage
      const exposure = entry * size * leverage;
      maxExposure = Math.max(maxExposure, exposure);

      // Time-based exposure
      if (trade._dateObj) {
        const day = dayNames[trade._dateObj.getDay()];
        const hour = String(trade._dateObj.getHours()).padStart(2, '0') + ':00';
        const key = `${day}-${hour}`;

        const existing = timeMap.get(key) || { exposure: 0, trades: 0 };
        existing.exposure += exposure;
        existing.trades += 1;
        timeMap.set(key, existing);
      }

      // Asset-based exposure
      const symbol = trade.symbol || 'Unknown';
      const existing = assetMap.get(symbol) || { totalExposure: 0, maxExposure: 0, trades: 0 };
      existing.totalExposure += exposure;
      existing.maxExposure = Math.max(existing.maxExposure, exposure);
      existing.trades += 1;
      assetMap.set(symbol, existing);
    });

    // Convert time map to array and sort
    const timeExposureArray: TimeExposure[] = Array.from(timeMap.entries())
      .map(([key, value]) => {
        const [dayOfWeek, hour] = key.split('-');
        return {
          dayOfWeek,
          hour,
          exposure: value.exposure / value.trades, // Average exposure per trade
          trades: value.trades,
        };
      })
      .sort((a, b) => {
        const dayOrder = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
        const dayDiff = dayOrder.indexOf(a.dayOfWeek) - dayOrder.indexOf(b.dayOfWeek);
        return dayDiff !== 0 ? dayDiff : a.hour.localeCompare(b.hour);
      });

    // Convert asset map to array and sort by max exposure
    const assetExposureArray: AssetExposure[] = Array.from(assetMap.entries())
      .map(([asset, value]) => ({
        asset,
        maxExposure: value.maxExposure,
        avgExposure: value.totalExposure / value.trades,
        trades: value.trades,
      }))
      .sort((a, b) => b.maxExposure - a.maxExposure);

    return {
      timeExposure: timeExposureArray,
      assetExposure: assetExposureArray,
      maxExposureValue: maxExposure,
    };
  }, [filteredTrades, timeRange]);

  if (!filteredTrades || filteredTrades.length === 0) {
    return <div className="text-center py-8 text-gray-500">No data in this range yet.</div>;
  }

  // Get unique days and hours for time heatmap grid
  const uniqueDays = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
  const uniqueHours = Array.from(
    new Set(timeExposure.map(t => t.hour))
  ).sort();

  // Helper function to get exposure for a cell
  const getTimeExposure = (day: string, hour: string): TimeExposure | undefined => {
    return timeExposure.find(t => t.dayOfWeek === day && t.hour === hour);
  };

  // Helper function to get color based on exposure
  const getExposureColor = (exposure: number, max: number): string => {
    if (max === 0) return '#2a2a2a';
    const ratio = exposure / max;

    if (ratio >= 0.8) return '#ef4444'; // Dark red
    if (ratio >= 0.6) return '#f97316'; // Orange
    if (ratio >= 0.4) return '#eab308'; // Yellow
    if (ratio >= 0.2) return '#84cc16'; // Light green
    return '#22c55e'; // Green
  };

  const controlsPortal = controlElement ? (
    createPortal(
      <div style={{ display: 'flex', gap: '8px' }}>
        <div style={{ display: 'flex', gap: '4px' }}>
          <button
            onClick={() => setViewType('time')}
            style={{
              padding: '6px 12px',
              backgroundColor: viewType === 'time' ? '#F5C76D' : '#23180C',
              color: viewType === 'time' ? '#000' : '#999',
              border: 'none',
              borderRadius: '4px',
              cursor: 'pointer',
              fontWeight: 'bold',
              fontSize: '11px',
              transition: 'all 0.2s',
            }}
          >
            Time
          </button>
          <button
            onClick={() => setViewType('asset')}
            style={{
              padding: '6px 12px',
              backgroundColor: viewType === 'asset' ? '#F5C76D' : '#23180C',
              color: viewType === 'asset' ? '#000' : '#999',
              border: 'none',
              borderRadius: '4px',
              cursor: 'pointer',
              fontWeight: 'bold',
              fontSize: '11px',
              transition: 'all 0.2s',
            }}
          >
            Asset
          </button>
        </div>
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
      <div style={{ height: '100%', display: 'flex', flexDirection: 'column' }}>

      {viewType === 'time' && (
        <>
          {/* Time-based heatmap */}
          <div style={{ flex: 1, overflow: 'auto' }}>
            <div style={{ minWidth: '100%' }}>
              {/* Header row with hours */}
              <div style={{ display: 'grid', gridTemplateColumns: '80px repeat(auto-fit, minmax(40px, 1fr))', gap: '1px', marginBottom: '8px' }}>
                <div style={{ padding: '8px', fontSize: '11px', fontWeight: 'bold', color: '#999' }}>
                  Day
                </div>
                {uniqueHours.map(hour => (
                  <div
                    key={hour}
                    style={{
                      padding: '6px',
                      fontSize: '10px',
                      color: '#999',
                      textAlign: 'center',
                      borderBottom: '1px solid #27272a',
                    }}
                  >
                    {hour.split(':')[0]}h
                  </div>
                ))}
              </div>

              {/* Heatmap grid */}
              {uniqueDays.map(day => (
                <div
                  key={day}
                  style={{
                    display: 'grid',
                    gridTemplateColumns: '80px repeat(auto-fit, minmax(40px, 1fr))',
                    gap: '1px',
                    marginBottom: '8px',
                  }}
                >
                  <div
                    style={{
                      padding: '8px',
                      fontSize: '12px',
                      fontWeight: 'bold',
                      color: '#D4AF37',
                      backgroundColor: '#1a1a1a',
                      borderRadius: '4px',
                    }}
                  >
                    {day}
                  </div>

                  {uniqueHours.map(hour => {
                    const cell = getTimeExposure(day, hour);
                    return (
                      <div
                        key={`${day}-${hour}`}
                        style={{
                          padding: '12px 6px',
                          backgroundColor: cell
                            ? getExposureColor(cell.exposure, maxExposureValue)
                            : '#2a2a2a',
                          borderRadius: '4px',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          cursor: cell ? 'pointer' : 'default',
                          position: 'relative',
                          minHeight: '40px',
                        }}
                        title={
                          cell
                            ? `${cell.trades} trades\nAvg exposure: $${(cell.exposure / 1000000).toFixed(2)}M`
                            : 'No trades'
                        }
                      >
                        {cell && (
                          <div
                            style={{
                              fontSize: '9px',
                              color: cell.exposure > maxExposureValue * 0.5 ? '#000' : '#999',
                              fontWeight: 'bold',
                            }}
                          >
                            {cell.trades}
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              ))}
            </div>
          </div>

          {/* Legend */}
          <div style={{ marginTop: '16px', padding: '12px', backgroundColor: '#1a1a1a', borderRadius: '8px', border: '1px solid #27272a', fontSize: '11px' }}>
            <div style={{ color: '#D4AF37', fontWeight: 'bold', marginBottom: '8px' }}>Exposure Level:</div>
            <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap', color: '#999' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                <div style={{ width: '12px', height: '12px', backgroundColor: '#22c55e', borderRadius: '2px' }} />
                <span>Low</span>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                <div style={{ width: '12px', height: '12px', backgroundColor: '#84cc16', borderRadius: '2px' }} />
                <span>20-40%</span>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                <div style={{ width: '12px', height: '12px', backgroundColor: '#eab308', borderRadius: '2px' }} />
                <span>40-60%</span>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                <div style={{ width: '12px', height: '12px', backgroundColor: '#f97316', borderRadius: '2px' }} />
                <span>60-80%</span>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                <div style={{ width: '12px', height: '12px', backgroundColor: '#ef4444', borderRadius: '2px' }} />
                <span>High (80%+)</span>
              </div>
            </div>
          </div>
        </>
      )}

      {viewType === 'asset' && (
        <>
          {/* Asset-based exposure bars */}
          <div style={{ flex: 1, overflow: 'auto', display: 'flex', flexDirection: 'column', gap: '12px' }}>
            {assetExposure.map(asset => (
              <div
                key={asset.asset}
                style={{
                  backgroundColor: '#1a1a1a',
                  border: '1px solid #27272a',
                  borderRadius: '8px',
                  padding: '12px',
                }}
              >
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
                  <div style={{ fontSize: '13px', fontWeight: 'bold', color: '#D4AF37' }}>
                    {asset.asset}
                  </div>
                  <div style={{ fontSize: '11px', color: '#999' }}>
                    {asset.trades} trades
                  </div>
                </div>

                <div style={{ marginBottom: '6px' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '10px', color: '#999', marginBottom: '4px' }}>
                    <span>Max Exposure</span>
                    <span>${(asset.maxExposure / 1000000).toFixed(2)}M</span>
                  </div>
                  <div
                    style={{
                      width: '100%',
                      height: '8px',
                      backgroundColor: '#2a2a2a',
                      borderRadius: '4px',
                      overflow: 'hidden',
                    }}
                  >
                    <div
                      style={{
                        height: '100%',
                        width: `${(asset.maxExposure / maxExposureValue) * 100}%`,
                        backgroundColor: '#ef4444',
                        borderRadius: '4px',
                      }}
                    />
                  </div>
                </div>

                <div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '10px', color: '#999', marginBottom: '4px' }}>
                    <span>Avg Exposure</span>
                    <span>${(asset.avgExposure / 1000000).toFixed(2)}M</span>
                  </div>
                  <div
                    style={{
                      width: '100%',
                      height: '8px',
                      backgroundColor: '#2a2a2a',
                      borderRadius: '4px',
                      overflow: 'hidden',
                    }}
                  >
                    <div
                      style={{
                        height: '100%',
                        width: `${(asset.avgExposure / maxExposureValue) * 100}%`,
                        backgroundColor: '#3b82f6',
                        borderRadius: '4px',
                      }}
                    />
                  </div>
                </div>
              </div>
            ))}
          </div>
        </>
      )}
      </div>
    </>
  );
};
