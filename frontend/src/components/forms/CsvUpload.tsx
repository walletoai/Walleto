/**
 * CSV Upload Component with Data Requirements Documentation
 *
 * This component accepts CSV files with trade data and normalizes them for use across
 * the platform. All features in the application (charts, analytics, journaling) depend
 * on having the correct data fields populated.
 *
 * ===== REQUIRED CSV COLUMNS (for complete functionality) =====
 *
 * COLUMN NAME | TYPE    | REQUIRED | FORMAT/EXAMPLES             | NOTES
 * =========== | ======= | ======== | ========================== | ==================================================
 * date        | String  | YES      | ISO 8601 or common formats | Used for analytics, charts, calendar views
 *             |         |          | 2024-11-29, 11/29/2024     | If missing, defaults to import time (data loss)
 * symbol      | String  | YES      | BTC, ETH, XRP, SOL         | Uppercase preferred. Null values break analytics
 * side        | String  | YES      | LONG or SHORT              | Determines PnL direction. LONG if missing
 * entry       | Number  | YES      | 43250.50, 2.34             | Entry price of the trade
 *             |         |          |                            | 0 values cause chart errors and analytics issues
 * exit        | Number  | YES      | 43500.25, 2.45             | Exit/close price of the trade
 *             |         |          |                            | 0 values break PnL calculations and charts
 * size        | Number  | YES      | 0.5, 2.34, 1000            | Position size (in base asset units)
 *             |         |          |                            | 0 values cause division errors in analytics
 * leverage    | Number  | NO       | 1.0 (spot), 5.0, 10.0      | Leverage multiplier. Defaults to 1.0 if missing
 *             |         |          |                            | Important for risk calculations and journaling
 * fees        | Number  | NO       | 5.50, 0.25, 12.00          | Trading fees in USD. Defaults to 0 if missing
 * pnl_usd     | Number  | YES      | 100.50, -250.00            | Profit/Loss in USD (positive or negative)
 *             |         |          |                            | This is shown on charts and used in analytics
 *             |         |          |                            | Alternative names: "pnl"
 * pnl_pct     | Number  | NO*      | 1.5, -2.3, 0.5             | Profit/Loss as percentage (1.5 = 1.5%)
 *             |         |          |                            | Alternative names: "roi"
 *             |         |          |                            | *Calculated if missing but varies from exchange
 *
 * ===== WHAT EACH COLUMN IS USED FOR =====
 *
 * CHARTS & ANALYTICS PAGE:
 *   - date: X-axis of profit/loss chart, trade timeline
 *   - entry, exit, size: Used to calculate equity curve
 *   - pnl_usd: Plotted on Y-axis (profit/loss over time)
 *   - pnl_pct: Used for win rate and return calculations
 *   - side: Determines chart color (green for wins, red for losses)
 *
 * MONTHLY CALENDAR:
 *   - date: Groups trades by month/day
 *   - pnl_usd: Shows daily P&L totals in calendar cells
 *   - symbol: Displayed in calendar event details
 *
 * HEATMAP (Weekly & Daily):
 *   - date: Maps trades to day of week and time
 *   - pnl_usd: Heatmap color intensity (red/green scale)
 *   - symbol: Used for filtering trades
 *
 * TRADE JOURNALING:
 *   - All fields: Complete trade review and learning
 *   - leverage: Risk assessment and margin usage tracking
 *   - fees: Cost analysis and profitability review
 *
 * WIN/LOSS STATISTICS:
 *   - side: WIN = exit > entry (LONG) or entry > exit (SHORT)
 *   - pnl_usd: Calculate average win/loss size
 *   - pnl_pct: Win rate percentages
 *
 * ===== EXAMPLE CSV FORMAT =====
 *
 * date,symbol,side,entry,exit,size,leverage,fees,pnl_usd,pnl_pct
 * 2024-11-29,BTC,LONG,43250.50,43500.25,0.5,1.0,5.50,124.88,0.576
 * 2024-11-29,ETH,SHORT,2300.00,2250.00,2.0,1.0,3.00,99.00,2.174
 * 2024-11-28,XRP,LONG,2.34,2.40,1000,1.0,8.00,52.00,2.564
 * 2024-11-28,SOL,LONG,195.50,190.00,10,2.5,15.00,-65.00,-3.314
 *
 * ===== WHAT HAPPENS IF DATA IS MISSING =====
 *
 * MISSING        | IMPACT
 * ============== | =====================================================================
 * date           | Trades show current import time (TODAY'S DATE) - breaks historical view
 * symbol         | Null values in analytics and journaling, filtering breaks
 * side           | Assumes LONG - wrong direction for SHORT trades, PnL reversed
 * entry          | 0 values break entry/exit price display and charts crash
 * exit           | 0 values break exit price, PnL calculations wrong, charts error
 * size           | 0 values cause division errors, ROI calculations fail
 * pnl_usd        | 0 values hide trades from P&L charts, analytics show no profit/loss
 * pnl_pct        | Calculated from entry/exit (may differ from actual exchange calc)
 * leverage       | Defaults to 1.0 - risk calculations wrong, margin usage not tracked
 * fees           | Assumed 0 - profitability overstated, net return incorrect
 *
 * ===== GETTING CSV DATA FROM YOUR EXCHANGE =====
 *
 * Blofin (Native API - Recommended):
 *   - Use "Connect Exchange" feature in app to auto-sync
 *   - All fields automatically populated with correct values
 *
 * Blofin (Manual Export):
 *   1. Account > Trade History
 *   2. Select date range
 *   3. Export as CSV (includes all required fields)
 *
 * Other Exchanges (Binance, Kraken, etc.):
 *   1. Go to Order History or Trade History section
 *   2. Export as CSV
 *   3. Rename columns to match format above (entry, exit, size, etc.)
 *
 * Manual Entry:
 *   1. Create CSV with exact column names (case-sensitive)
 *   2. Ensure date format is recognized (2024-11-29 or 11/29/2024)
 *   3. Calculate pnl_usd and pnl_pct yourself
 *
 * ===== CSV VALIDATION =====
 *
 * Before uploading, verify:
 *   ✓ All date values are populated (not blank)
 *   ✓ All entry/exit/size values are non-zero numbers
 *   ✓ Side is either "LONG" or "SHORT"
 *   ✓ pnl_usd is positive for winning trades, negative for losses
 *   ✓ No blank rows (except final row)
 *
 * Common Issues:
 *   ✗ Dates formatted as "Nov 29" instead of "2024-11-29" may not parse
 *   ✗ Commas in numbers (1,000.50) must be removed before CSV export
 *   ✗ Column headers must match exactly (case-sensitive, no spaces)
 */

import Papa from "papaparse";
import { useModals } from "../modals/CustomModals";

type CsvUploadProps = {
  onUpload: (rows: any[]) => void;
};

export default function CsvUpload({ onUpload }: CsvUploadProps) {
  const { alert } = useModals();

  function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;

    Papa.parse(file, {
      header: true,
      skipEmptyLines: true,
      complete: (results) => {
        const rows = (results.data as any[]).map((row) => {
          const side = (row.side || "LONG").toString().toUpperCase();
          return {
            date: row.date || new Date().toISOString(),
            symbol: (row.symbol || "").toString().toUpperCase(),
            side: side === "SHORT" ? "SHORT" : "LONG",
            entry: Number(row.entry) || 0,
            exit: Number(row.exit) || 0,
            size: Number(row.size) || 0,
            leverage: Number(row.leverage) || 1,
            fees: Number(row.fees) || 0,
            pnl_usd: Number(row.pnl) || Number(row.pnl_usd) || 0,
            pnl_pct: Number(row.pnl_pct) || Number(row.roi) || 0,
          };
        });

        onUpload(rows);
      },
      error: (err) => {
        console.error("CSV parse error:", err);
        alert({ message: "Error parsing CSV.", type: 'error' });
      },
    });

    // reset input so same file can be selected again if needed
    e.target.value = "";
  }

  return (
    <div>
      <input
        id="csv-upload"
        type="file"
        accept=".csv"
        onChange={handleFileChange}
        style={{ fontSize: 13 }}
      />
    </div>
  );
}
