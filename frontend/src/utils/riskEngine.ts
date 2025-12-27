// src/utils/riskEngine.ts

/**
 * Very small helper to normalize numbers.
 */
function n(v: unknown): number {
    const num = Number(v);
    return Number.isFinite(num) ? num : 0;
  }
  
  /**
   * Approximate base maintenance margin rate (MMR) by exchange + leverage.
   *
   * These are simplified, "tier 1" style values meant for small–medium positions.
   * For now:
   *  - Binance: 0.4% up to 25x, 1% above
   *  - Bybit:   0.5% up to 25x, 1% above
   */
  function getBaseMMR(exchange: string, leverage: number): number {
    const lev = Math.max(1, Math.floor(leverage));
    const ex = (exchange || "BINANCE").toUpperCase();
  
    if (ex === "BYBIT") {
      return lev <= 25 ? 0.005 : 0.01;
    }
  
    // Default: treat as Binance
    return lev <= 25 ? 0.004 : 0.01;
  }
  
  /**
   * Generic isolated–margin USDT perp liquidation formula (approx).
   *
   * For a LONG:
   *   Liq = entry * (1 - 1/leverage) / (1 - mmr)
   *
   * For a SHORT:
   *   Liq = entry * (1 + 1/leverage) / (1 + mmr)
   */
  function deriveLiqPrice(
    side: "LONG" | "SHORT",
    entryPrice: number,
    leverage: number,
    exchange: string,
    mmrOverride?: number
  ): { liqPrice: number | null; mmr: number } {
    const entry = n(entryPrice);
    const lev = n(leverage);
  
    if (!entry || !lev) {
      return { liqPrice: null, mmr: 0 };
    }
  
    const mmr =
      typeof mmrOverride === "number"
        ? Math.max(0, mmrOverride)
        : getBaseMMR(exchange, lev);
  
    let liq: number;
  
    if (side === "LONG") {
      liq = (entry * (1 - 1 / lev)) / (1 - mmr);
    } else {
      liq = (entry * (1 + 1 / lev)) / (1 + mmr);
    }
  
    if (!Number.isFinite(liq) || liq <= 0) {
      return { liqPrice: null, mmr };
    }
  
    return { liqPrice: liq, mmr };
  }
  
  /**
   * Main helper you’ll call from Dashboard / Trades / Analytics.
   *
   * Args:
   *  - side: "LONG" | "SHORT"
   *  - entry: entry price
   *  - size: notional size in USD
   *  - leverage: leverage used (e.g. 5, 10, 20)
   *  - exchange: "BINANCE" | "BYBIT" (anything else defaults to Binance logic)
   *  - fees (optional): total fees in USD (not used in liq formula, but handy)
   *  - mmrOverride (optional): manually override maintenance margin rate if you want
   */
  export function computeRiskMetrics(args: {
    side: "LONG" | "SHORT";
    entry: number;
    size: number;
    leverage: number;
    exchange?: string;
    fees?: number;
    mmrOverride?: number;
  }) {
    const side = args.side === "SHORT" ? "SHORT" : "LONG";
    const entry = n(args.entry);
    const size = n(args.size);
    const lev = Math.max(1, n(args.leverage));
    const exchange = (args.exchange || "BINANCE").toUpperCase();
    const fees = n(args.fees);
    const mmrOverride = args.mmrOverride;
  
    // Notional value of the position (USDT)
    const notional = size;
  
    // Initial margin for isolated:
    const initialMargin = notional / lev;
  
    // Maintenance margin (approx)
    const usedMMR = typeof mmrOverride === "number"
      ? Math.max(0, mmrOverride)
      : getBaseMMR(exchange, lev);
  
    const maintenanceMargin = notional * usedMMR;
  
    // Liquidation price
    const { liqPrice } = deriveLiqPrice(side, entry, lev, exchange, usedMMR);
  
    // Distance from entry to liq, in % (absolute)
    let distanceToLiqPct: number | null = null;
    if (liqPrice && entry) {
      const diff = Math.abs(liqPrice - entry);
      distanceToLiqPct = (diff / entry) * 100;
    }
  
    return {
      exchange,
      side,
      entry,
      size,
      leverage: lev,
      initialMargin,
      maintenanceMargin,
      liqPrice,
      distanceToLiqPct,
      fees,
      mmr: usedMMR,
    };
  }
  