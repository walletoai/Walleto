import React, { useMemo, useState, useEffect } from 'react';
import { createPortal } from 'react-dom';

interface Props {
  data: any;
  widgetId?: string;
}

export const MonthlyHeatstickWidget: React.FC<Props> = ({ data, widgetId }) => {
  const { filteredTrades } = data;
  const [selectedYear, setSelectedYear] = useState<string | null>(null);
  const [controlElement, setControlElement] = useState<HTMLElement | null>(null);

  useEffect(() => {
    if (!widgetId) return;
    const element = document.getElementById(`${widgetId}-controls`);
    setControlElement(element);
  }, [widgetId]);

  const monthlyData = useMemo(() => {
    if (!filteredTrades || filteredTrades.length === 0) return [];

    // Group trades by month
    const monthlyMap = new Map<string, { trades: any[], pnl: number }>();

    filteredTrades.forEach((trade: any) => {
      // Use _dateObj (already parsed) or parse entry_time/date
      const date = trade._dateObj || new Date(trade.entry_time || trade.date);
      if (isNaN(date.getTime())) return; // Skip invalid dates
      const monthKey = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;

      if (!monthlyMap.has(monthKey)) {
        monthlyMap.set(monthKey, { trades: [], pnl: 0 });
      }

      const monthData = monthlyMap.get(monthKey)!;
      monthData.trades.push(trade);
      monthData.pnl += trade.pnl_usd || 0;
    });

    // Sort by month and convert to array
    const sorted = Array.from(monthlyMap.entries())
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([month, data]) => ({
        month,
        pnl: parseFloat(data.pnl.toFixed(2)),
        trades: data.trades.length,
        positive: data.pnl >= 0
      }));

    return sorted;
  }, [filteredTrades]);

  if (monthlyData.length === 0) {
    return <div className="text-center py-8 text-gray-500">No data in this range yet.</div>;
  }

  // Group by year for better visualization
  const yearGroups = monthlyData.reduce((acc, item) => {
    const year = item.month.split('-')[0];
    if (!acc[year]) acc[year] = [];
    acc[year].push(item);
    return acc;
  }, {} as Record<string, typeof monthlyData>);

  const allYears = Object.keys(yearGroups).sort();

  const controlsPortal = controlElement ? (
    createPortal(
      <select
        value={selectedYear || 'ALL'}
        onChange={(e) => setSelectedYear(e.target.value === 'ALL' ? null : e.target.value)}
        className="appearance-none text-xs font-bold rounded px-3 py-2 focus:outline-none transition-colors cursor-pointer"
        style={{
          backgroundColor: '#23180C',
          color: '#F5C76D',
          border: '1px solid rgba(245, 199, 109, 0.3)',
          minWidth: '120px'
        }}
      >
        <option value="ALL">All Years</option>
        {allYears.map(year => (
          <option key={year} value={year}>{year}</option>
        ))}
      </select>,
      controlElement
    )
  ) : null;

  const displayedYears = selectedYear ? [selectedYear] : allYears;

  const getIntensity = (pnl: number, allPnls: number[]) => {
    const max = Math.max(...allPnls.map(Math.abs));
    if (max === 0) return 50;
    const normalized = Math.abs(pnl) / max;
    return Math.min(normalized * 100, 100);
  };

  const allPnls = monthlyData.map(m => m.pnl);
  const monthNames = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

  return (
    <>
      {controlsPortal}
      <div style={{ height: '100%', minHeight: 450, padding: '24px' }}>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '48px' }}>
          {displayedYears.map(year => {
            const months = yearGroups[year] || [];
            return (
              <div key={year}>
                <div style={{ fontSize: '24px', fontWeight: 'bold', color: '#D4A545', marginBottom: '24px' }}>{year}</div>
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: '20px' }}>
                  {months.map((item) => {
                    const monthNum = parseInt(item.month.split('-')[1]);
                    const intensity = getIntensity(item.pnl, allPnls);

                    return (
                      <div
                        key={item.month}
                        style={{
                          borderRadius: '12px',
                          border: `3px solid ${item.positive
                            ? `rgba(16, 185, 129, ${0.5 + (intensity / 100) * 0.5})`
                            : `rgba(239, 68, 68, ${0.5 + (intensity / 100) * 0.5})`}`,
                          backgroundColor: item.positive
                            ? `rgba(16, 185, 129, ${0.12 + (intensity / 100) * 0.25})`
                            : `rgba(239, 68, 68, ${0.12 + (intensity / 100) * 0.25})`,
                          padding: '16px 24px',
                          minWidth: '140px',
                          textAlign: 'center',
                          transition: 'all 0.2s ease',
                          cursor: 'pointer'
                        }}
                        onMouseEnter={(e) => {
                          e.currentTarget.style.transform = 'scale(1.08)';
                          e.currentTarget.style.boxShadow = '0 8px 16px rgba(0,0,0,0.3)';
                        }}
                        onMouseLeave={(e) => {
                          e.currentTarget.style.transform = 'scale(1)';
                          e.currentTarget.style.boxShadow = 'none';
                        }}
                        title={`${item.month}: $${item.pnl.toFixed(2)} (${item.trades} trades)`}
                      >
                        <div style={{ fontSize: '12px', fontWeight: '600', color: '#D4A545', marginBottom: '8px', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                          {monthNames[monthNum - 1]}
                        </div>
                        <div style={{ fontSize: '18px', fontWeight: 'bold', marginBottom: '8px', color: item.positive ? '#10b981' : '#ef4444' }}>
                          ${Math.abs(item.pnl).toLocaleString('en-US', { maximumFractionDigits: 0 })}
                        </div>
                        <div style={{ fontSize: '11px', color: '#999', fontWeight: '600' }}>
                          {item.trades} trades
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </>
  );
};
