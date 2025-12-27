export function filterTradesByRange(trades: any[], range: string) {
  const now = new Date();
  let cutoff: Date | null = null;

  if (range === "WEEK") {
    cutoff = new Date(now);
    cutoff.setDate(cutoff.getDate() - 7);
  } else if (range === "MONTH") {
    cutoff = new Date(now);
    cutoff.setMonth(cutoff.getMonth() - 1);
  } else if (range === "YEAR") {
    cutoff = new Date(now);
    cutoff.setFullYear(cutoff.getFullYear() - 1);
  }

  if (cutoff) {
    return trades.filter((t) => {
      const ts = t.timestamp instanceof Date ? t.timestamp : new Date(t.timestamp);
      return ts >= cutoff!;
    });
  }
  return trades;
}