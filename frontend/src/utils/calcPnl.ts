/**
 * @typedef {"LONG" | "SHORT"} TradeSide
 */

/**
 * @typedef Trade
 * @property {string} symbol
 * @property {TradeSide} side
 * @property {number} entry
 * @property {number} exit
 * @property {number} size
 * @property {number=} leverage
 * @property {number=} fees
 * @property {string=} date
 * @property {string=} id
 * @property {number=} realizedPnlUsd
 * @property {number=} realizedPnlPct
 */

export function calculatePnL(t: any) {
  const entry = Number(t.entry);
  const exit = Number(t.exit);
  const size = Number(t.size);
  const lev = Number(t.leverage ?? 1);
  const fees = Number(t.fees ?? 0);

  if (!entry || !exit || !size) {
    return { pnlUsd: 0, pnlPercent: 0 };
  }

  const direction = t.side === "SHORT" ? -1 : 1;
  const pctMove = ((exit - entry) / entry) * direction;

  const pnlUsd = size * pctMove * lev - fees;
  const pnlPercent = pctMove * 100 * lev;

  return { pnlUsd, pnlPercent };
}

export default calculatePnL;
