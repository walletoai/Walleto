// src/components/WeeklyHeatmap.tsx
import React, { useMemo } from "react";

type Props = {
  trades: any[];
  year: number;
};

const dayLabels = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

export default function WeeklyHeatmap({ trades, year }: Props) {
  const { grid, maxWeekIndex } = useMemo(() => {
    const msPerDay = 24 * 60 * 60 * 1000;
    const msPerWeek = msPerDay * 7;
    const startOfYear = new Date(year, 0, 1).getTime();

    type Cell = {
      pnl: number;
      trades: number;
    };

    const map = new Map<string, Cell>();
    let maxWeekIndex = 0;

    for (const t of trades || []) {
      const tradeDate = t.entry_time || t.date;
      if (!tradeDate) continue;
      const d = new Date(tradeDate);
      if (isNaN(d.getTime())) continue;
      if (d.getFullYear() !== year) continue;

      const dayOfWeek = d.getDay(); // 0..6
      const weekIndex = Math.floor(
        (d.getTime() - startOfYear) / msPerWeek
      );
      if (weekIndex > maxWeekIndex) maxWeekIndex = weekIndex;

      const key = `${weekIndex}-${dayOfWeek}`;
      const pnl = t.pnl_usd || 0;

      const prev = map.get(key) || { pnl: 0, trades: 0 };
      prev.pnl += pnl;
      prev.trades += 1;
      map.set(key, prev);
    }

    // Force full year (52 or 53 weeks)
    const endOfYear = new Date(year, 11, 31).getTime();
    const totalWeeks = Math.floor((endOfYear - startOfYear) / msPerWeek);
    const weeksInYear = totalWeeks + 1;

    const grid: Cell[][] = [];

    for (let day = 0; day < 7; day++) {
      const row: Cell[] = [];
      for (let w = 0; w < weeksInYear; w++) {
        const key = `${w}-${day}`;
        row.push(map.get(key) || { pnl: 0, trades: 0 });
      }
      grid.push(row);
    }

    return { grid, maxWeekIndex: weeksInYear - 1 };
  }, [trades, year]);

  if (!trades || trades.length === 0) {
    return (
      <div style={{ fontSize: 12, color: '#666', display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100%', width: '100%' }}>
        No trades recorded this year
      </div>
    );
  }

  const gap = 2;
  const weeksInYear = Math.min(maxWeekIndex + 1, 52); // Show full 52-week year

  return (
    <div style={{ display: "flex", flexDirection: "column", height: "100%", width: "100%", justifyContent: "space-between" }}>
      {/* Header */}
      <div style={{
        display: "flex",
        justifyContent: "space-between",
        alignItems: "center",
        marginBottom: "12px",
        paddingBottom: "10px",
        borderBottom: "1px solid rgba(212, 175, 55, 0.1)"
      }}>
        <div style={{
          color: '#888',
          fontSize: '10px',
          fontWeight: '600',
          letterSpacing: '0.5px',
          textTransform: 'uppercase'
        }}>
          Win/Loss Heatmap
        </div>
        <div style={{
          fontSize: '9px',
          color: '#666',
          fontWeight: '500'
        }}>
          52 Weeks
        </div>
      </div>

      {/* Heatmap Grid */}
      <div
        style={{
          display: "grid",
          gridTemplateColumns: `24px repeat(${weeksInYear}, 1fr)`,
          gap: `${gap}px`,
          alignItems: "center",
          justifyItems: "stretch",
          flex: 1,
          width: "100%",
          minHeight: 0
        }}
      >
        {/* Day rows */}
        {grid.map((row, dayIdx) => (
          <React.Fragment key={`row-${dayIdx}`}>
            {/* Day label */}
            <div
              style={{
                fontSize: "9px",
                color: '#888',
                fontWeight: '600',
                textAlign: "right",
                minWidth: "28px",
                paddingRight: "4px"
              }}
            >
              {dayLabels[dayIdx]}
            </div>

            {/* Cells for this day */}
            {row.slice(0, weeksInYear).map((cell, w) => {
              let bg = "rgba(255, 255, 255, 0.02)";
              let boxShadow = "inset 0 0 2px rgba(212, 175, 55, 0.1)";
              let border = "rgba(212, 175, 55, 0.12)";
              let title = "No trades";

              if (cell.trades > 0) {
                const pnl = cell.pnl;
                const intensity = Math.min(Math.abs(pnl) / 1000, 1);
                if (pnl > 0) {
                  bg = `rgba(52, 211, 153, ${0.25 + 0.55 * intensity})`;
                  border = `rgba(52, 211, 153, ${0.4 + 0.4 * intensity})`;
                  boxShadow = `inset 0 0 3px rgba(52, 211, 153, 0.3), 0 0 8px rgba(52, 211, 153, ${0.2 + 0.2 * intensity})`;
                } else if (pnl < 0) {
                  bg = `rgba(248, 113, 113, ${0.25 + 0.55 * intensity})`;
                  border = `rgba(248, 113, 113, ${0.4 + 0.4 * intensity})`;
                  boxShadow = `inset 0 0 3px rgba(248, 113, 113, 0.3), 0 0 8px rgba(248, 113, 113, ${0.2 + 0.2 * intensity})`;
                }
                title = `${dayLabels[dayIdx]} W${w + 1}\nPnL: $${pnl.toFixed(0)}\nTrades: ${cell.trades}`;
              }

              return (
                <div
                  key={`${dayIdx}-${w}`}
                  title={title}
                  style={{
                    width: '100%',
                    aspectRatio: '1',
                    maxHeight: '12px',
                    borderRadius: 3,
                    background: bg,
                    border: `1px solid ${border}`,
                    boxShadow: boxShadow,
                    cursor: 'pointer',
                    transition: 'all 120ms cubic-bezier(0.4, 0, 0.2, 1)'
                  }}
                  onMouseEnter={(e) => {
                    const el = e.currentTarget as HTMLDivElement;
                    el.style.transform = 'scale(1.4) translateY(-2px)';
                    el.style.boxShadow = cell.trades > 0
                      ? el.style.boxShadow
                      : "0 0 12px rgba(212, 175, 55, 0.3), inset 0 0 2px rgba(212, 175, 55, 0.2)";
                    el.style.zIndex = '10';
                  }}
                  onMouseLeave={(e) => {
                    const el = e.currentTarget as HTMLDivElement;
                    el.style.transform = 'scale(1) translateY(0)';
                    el.style.zIndex = '0';
                  }}
                />
              );
            })}
          </React.Fragment>
        ))}
      </div>

      {/* Legend */}
      <div style={{
        display: "flex",
        justifyContent: "center",
        gap: "16px",
        marginTop: "10px",
        paddingTop: "10px",
        borderTop: "1px solid rgba(212, 175, 55, 0.1)",
        fontSize: "8px",
        color: "#666"
      }}>
        <div style={{ display: "flex", alignItems: "center", gap: "4px" }}>
          <div style={{
            width: "8px",
            height: "8px",
            borderRadius: "2px",
            background: "rgba(52, 211, 153, 0.6)",
            border: "0.5px solid rgba(52, 211, 153, 0.8)"
          }} />
          <span>Win</span>
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: "4px" }}>
          <div style={{
            width: "8px",
            height: "8px",
            borderRadius: "2px",
            background: "rgba(248, 113, 113, 0.6)",
            border: "0.5px solid rgba(248, 113, 113, 0.8)"
          }} />
          <span>Loss</span>
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: "4px" }}>
          <div style={{
            width: "8px",
            height: "8px",
            borderRadius: "2px",
            background: "rgba(255, 255, 255, 0.08)",
            border: "0.5px solid rgba(212, 175, 55, 0.12)"
          }} />
          <span>None</span>
        </div>
      </div>
    </div>
  );
}
