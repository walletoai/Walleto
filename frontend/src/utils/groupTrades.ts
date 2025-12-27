import { getDayKey, getWeekKey, getMonthKey, getYearKey } from "./dateKeys";

interface Trade {
  timestamp: string | number | Date;
  realizedPnlUsd: number;
  [key: string]: any;
}

interface GroupedTrade {
  label: string;
  trades: Trade[];
  totalPnl: number;
  wins: number;
  losses: number;
}

export function groupTrades(trades: Trade[], timeframe: "daily" | "weekly" | "monthly" | "yearly") {
  const map: Record<string, GroupedTrade> = {};
  const keyFn =
    timeframe === "daily" ? getDayKey :
      timeframe === "weekly" ? getWeekKey :
        timeframe === "monthly" ? getMonthKey :
          getYearKey;

  for (const t of trades) {
    const ts = t.timestamp instanceof Date ? t.timestamp.getTime() : new Date(t.timestamp).getTime();
    const key = keyFn(ts);
    if (!map[key]) map[key] = { label: key, trades: [], totalPnl: 0, wins: 0, losses: 0 };
    map[key].trades.push(t);
    map[key].totalPnl += t.realizedPnlUsd;
    if (t.realizedPnlUsd > 0) map[key].wins++;
    if (t.realizedPnlUsd < 0) map[key].losses++;
  }

  return Object.values(map).sort((a, b) => a.label.localeCompare(b.label));
}
