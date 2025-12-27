// src/components/MonthlyCalendar.tsx
import React, { useMemo } from "react";
import type { CalendarEvent } from "../../api/calendar";

type Props = {
  trades: any[];
  events: CalendarEvent[];
  year: number;
  month: number; // 0-based
  onPrevMonth: () => void;
  onNextMonth: () => void;
  onDayClick: (dayKey: string) => void;
};

const monthNames = [
  "January",
  "February",
  "March",
  "April",
  "May",
  "June",
  "July",
  "August",
  "September",
  "October",
  "November",
  "December",
];

function getDayKey(d: Date) {
  return d.toISOString().slice(0, 10);
}

export default function MonthlyCalendar({
  trades,
  events,
  year,
  month,
  onPrevMonth,
  onNextMonth,
  onDayClick,
}: Props) {
  const useMemoResult = useMemo(() => {
    const firstOfMonth = new Date(year, month, 1);
    const firstDayOfWeek = firstOfMonth.getDay(); // 0 = Sunday
    const daysInMonth = new Date(year, month + 1, 0).getDate();

    // Map of dayKey -> stats
    const statsMap: Record<
      string,
      { pnl: number; trades: number; wins: number }
    > = {};

    for (const t of trades || []) {
      const tradeDate = t.entry_time || t.date;
      if (!tradeDate) continue;
      const d = new Date(tradeDate);
      if (isNaN(d.getTime())) continue;
      if (d.getFullYear() !== year || d.getMonth() !== month) continue;

      const key = getDayKey(d);
      const pnlUsd = t.pnl_usd || 0;

      if (!statsMap[key]) {
        statsMap[key] = { pnl: 0, trades: 0, wins: 0 };
      }
      statsMap[key].pnl += pnlUsd;
      statsMap[key].trades += 1;
      if (pnlUsd > 0) statsMap[key].wins += 1;
    }

    const totalCells = Math.ceil((firstDayOfWeek + daysInMonth) / 7) * 7;
    const cells: Array<{ date: Date | null; label: string }> = [];

    for (let i = 0; i < totalCells; i++) {
      const dayNum = i - firstDayOfWeek + 1;
      if (dayNum < 1 || dayNum > daysInMonth) {
        cells.push({ date: null, label: "" });
      } else {
        const date = new Date(year, month, dayNum);
        cells.push({ date, label: String(dayNum) });
      }
    }

    return { cells, dayStats: statsMap, totalWeeks: Math.ceil(totalCells / 7) };
  }, [trades, year, month]);

  const { cells, dayStats, totalWeeks } = useMemoResult;

  const headerStyle: React.CSSProperties = {
    display: "flex",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 10,
    flexShrink: 0,
    paddingBottom: 8,
    borderBottom: "1px solid rgba(212, 175, 55, 0.1)"
  };

  const navButtonStyle: React.CSSProperties = {
    background: "rgba(212, 175, 55, 0.1)",
    border: "1px solid rgba(212, 175, 55, 0.2)",
    borderRadius: 6,
    padding: "5px 9px",
    color: "#D4AF37",
    fontSize: 11,
    cursor: "pointer",
    fontWeight: "600",
    transition: "all 200ms",
    minWidth: "30px",
  };

  const dayHeaderStyle: React.CSSProperties = {
    display: "grid",
    gridTemplateColumns: "repeat(7, 1fr)",
    gap: 6,
    fontSize: 9,
    textAlign: "center",
    color: "#888",
    paddingBottom: 6,
    marginBottom: 6,
    flexShrink: 0,
    fontWeight: "600",
    letterSpacing: "0.05em",
    textTransform: "uppercase",
  };

  const gridStyle: React.CSSProperties = {
    display: "grid",
    gridTemplateColumns: "repeat(7, 1fr)",
    gridTemplateRows: `repeat(${totalWeeks}, 1fr)`,
    gap: 6,
    fontSize: 11,
    flex: 1,
    minHeight: 0,
    height: "100%",
  };

  return (
    <div className="flex-1 flex flex-col h-full min-h-0" style={{ height: '100%', flexGrow: 1, display: 'flex', flexDirection: 'column' }}>
      {/* Header */}
      <div style={headerStyle}>
        <button
          style={navButtonStyle}
          onClick={onPrevMonth}
          onMouseEnter={(e) => {
            const el = e.currentTarget as HTMLButtonElement;
            el.style.background = "rgba(212, 175, 55, 0.15)";
            el.style.borderColor = "rgba(212, 175, 55, 0.4)";
          }}
          onMouseLeave={(e) => {
            const el = e.currentTarget as HTMLButtonElement;
            el.style.background = "rgba(212, 175, 55, 0.1)";
            el.style.borderColor = "rgba(212, 175, 55, 0.2)";
          }}
        >
          ←
        </button>
        <div style={{ textAlign: "center" }}>
          <div style={{ fontSize: 18, fontWeight: 700, color: "#D4AF37", letterSpacing: "0.05em" }}>
            {monthNames[month]} {year}
          </div>
          <div style={{ fontSize: 10, color: "#666", marginTop: "4px", letterSpacing: "0.05em", textTransform: "uppercase" }}>
            Performance Overview
          </div>
        </div>
        <button
          style={navButtonStyle}
          onClick={onNextMonth}
          onMouseEnter={(e) => {
            const el = e.currentTarget as HTMLButtonElement;
            el.style.background = "rgba(212, 175, 55, 0.15)";
            el.style.borderColor = "rgba(212, 175, 55, 0.4)";
          }}
          onMouseLeave={(e) => {
            const el = e.currentTarget as HTMLButtonElement;
            el.style.background = "rgba(212, 175, 55, 0.1)";
            el.style.borderColor = "rgba(212, 175, 55, 0.2)";
          }}
        >
          →
        </button>
      </div>

      {/* Day headers */}
      <div style={dayHeaderStyle}>
        {["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"].map((d) => (
          <div key={d} style={{ opacity: 0.7 }}>
            {d}
          </div>
        ))}
      </div>

      {/* Calendar cells */}
      <div style={gridStyle}>
        {cells.map((cell, idx) => {
          if (!cell.date) {
            return (
              <div
                key={idx}
                style={{
                  height: "100%",
                  borderRadius: 10,
                  background: "transparent",
                }}
              />
            );
          }

          const key = getDayKey(cell.date);
          const stats = dayStats[key];
          const dayEvents = events.filter(e => e.date === key);

          let bg = "rgba(255, 255, 255, 0.02)";
          let border = "rgba(212, 175, 55, 0.08)";
          let accentColor = "#666";
          let title = `No trades`;
          let hasActivity = false;

          if (stats && stats.trades > 0) {
            hasActivity = true;
            const pnl = stats.pnl;
            const intensity = Math.min(Math.abs(pnl) / 500, 1);
            if (pnl > 0) {
              bg = `rgba(52, 211, 153, ${0.1 + 0.2 * intensity})`;
              border = `rgba(52, 211, 153, ${0.2 + 0.3 * intensity})`;
              accentColor = "#34d399";
            } else if (pnl < 0) {
              bg = `rgba(248, 113, 113, ${0.1 + 0.2 * intensity})`;
              border = `rgba(248, 113, 113, ${0.2 + 0.3 * intensity})`;
              accentColor = "#f87171";
            }
            const winRate =
              stats.trades > 0 ? (stats.wins / stats.trades) * 100 : 0;
            title = [
              cell.date.toDateString(),
              `PnL: $${stats.pnl.toFixed(2)}`,
              `Trades: ${stats.trades}`,
              `Win rate: ${winRate.toFixed(1)}%`,
            ].join("\n");
          }

          return (
            <div
              key={idx}
              title={title}
              onClick={() => {
                onDayClick(key);
              }}
              style={{
                height: "100%",
                borderRadius: 7,
                background: bg,
                border: `1px solid ${border}`,
                padding: "4px",
                display: "flex",
                flexDirection: "column",
                justifyContent: "space-between",
                cursor: "pointer",
                overflow: "hidden",
                transition: "all 200ms",
                position: "relative",
                minHeight: 0,
                fontSize: "8px"
              }}
              onMouseEnter={(e) => {
                const el = e.currentTarget as HTMLDivElement;
                el.style.borderColor = hasActivity ? accentColor : "rgba(212, 175, 55, 0.2)";
                el.style.background = hasActivity
                  ? bg.replace(/0\.\d+/, (m) => String(parseFloat(m) + 0.1))
                  : "rgba(255, 255, 255, 0.05)";
                el.style.boxShadow = hasActivity ? `0 0 12px ${accentColor}20` : "none";
              }}
              onMouseLeave={(e) => {
                const el = e.currentTarget as HTMLDivElement;
                el.style.borderColor = border;
                el.style.background = bg;
                el.style.boxShadow = "none";
              }}
            >
              {/* Day number and PnL */}
              <div
                style={{
                  display: "flex",
                  justifyContent: "space-between",
                  alignItems: "center",
                  marginBottom: 1,
                  fontSize: 8,
                  lineHeight: 1,
                }}
              >
                <span style={{ fontWeight: "600", color: "#ccc", fontSize: "8px" }}>{cell.label}</span>
                {stats && stats.trades > 0 && (
                  <span
                    style={{
                      fontWeight: 700,
                      color: accentColor,
                      fontSize: "6px",
                      background: `${accentColor}15`,
                      padding: "0px 2px",
                      borderRadius: "2px",
                      lineHeight: 1,
                    }}
                  >
                    {Math.abs(stats.pnl) > 1000 ? `${(stats.pnl/1000).toFixed(1)}k` : Math.round(stats.pnl)}
                  </span>
                )}
              </div>

              {/* Events */}
              <div style={{ flex: 1, overflowY: "auto", minHeight: 0, marginBottom: "0px" }}>
                {dayEvents.slice(0, 1).map(e => (
                  <div
                    key={e.id || e.title}
                    style={{
                      fontSize: "5px",
                      background: e.is_system ? "rgba(255, 255, 255, 0.08)" : "rgba(212, 175, 55, 0.1)",
                      padding: "0px 2px",
                      borderRadius: "2px",
                      marginBottom: "0px",
                      whiteSpace: "nowrap",
                      overflow: "hidden",
                      textOverflow: "ellipsis",
                      color: e.is_system ? "#888" : "#D4AF37",
                      lineHeight: 1,
                    }}
                    title={e.description || e.title}
                  >
                    {e.title}
                  </div>
                ))}
              </div>

              {/* Trade count */}
              {stats && stats.trades > 0 && (
                <div
                  style={{
                    fontSize: "6px",
                    color: accentColor,
                    fontWeight: "600",
                    opacity: 0.8,
                    marginTop: "0px",
                    lineHeight: 1,
                  }}
                >
                  {stats.trades}t
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
