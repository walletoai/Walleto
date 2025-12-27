/**
 * Exchange-specific CSV Parsers
 *
 * Each exchange exports trade history in a different format.
 * This module provides parsers to convert each format to our internal Trade format.
 */

export interface ParsedTrade {
  date: string;
  symbol: string;
  side: 'LONG' | 'SHORT';
  entry: number;
  exit: number;
  size: number;
  leverage: number;
  fees: number;
  pnl_usd: number;
  pnl_pct: number;
  exchange: string;
}

export interface ExchangeInfo {
  id: string;
  name: string;
  description: string;
  instructions: string[];
  sampleColumns: string[];
  parser: (rows: any[]) => ParsedTrade[];
}

/**
 * Binance Futures CSV Parser
 *
 * Binance exports trade history with these columns:
 * - Time, Symbol, Side, Price, Quantity, Quote Quantity, Commission, Commission Asset, Realized Profit
 *
 * For Position History export:
 * - Symbol, Size, Entry Price, Mark Price, Liq. Price, Margin Ratio, PNL, ROE, Duration
 */
function parseBinanceFutures(rows: any[]): ParsedTrade[] {
  return rows.map((row): ParsedTrade => {
    // Detect if it's position history or trade history format
    const isPositionHistory = 'Entry Price' in row || 'entry_price' in row || 'entryPrice' in row;

    if (isPositionHistory) {
      // Position History format
      const symbol = (row.Symbol || row.symbol || '').replace('USDT', '').replace('BUSD', '');
      const size = parseFloat(row.Size || row.size || row.Qty || row.qty || 0);
      const entry = parseFloat(row['Entry Price'] || row.entry_price || row.entryPrice || 0);
      const exit = parseFloat(row['Mark Price'] || row.mark_price || row.markPrice || row['Exit Price'] || 0);
      const pnl = parseFloat(row.PNL || row.pnl || row['Realized PNL'] || row.realizedPnl || 0);
      const roe = parseFloat(row.ROE || row.roe || 0);

      return {
        date: row.Time || row.time || row['Close Time'] || new Date().toISOString(),
        symbol: symbol.toUpperCase(),
        side: size >= 0 ? 'LONG' as const : 'SHORT' as const,
        entry,
        exit: exit || entry, // If no exit, use entry
        size: Math.abs(size),
        leverage: 1, // Not provided in position history
        fees: 0, // Not provided in position history
        pnl_usd: pnl,
        pnl_pct: roe * 100, // ROE is usually decimal (0.05 = 5%)
        exchange: 'binance',
      };
    } else {
      // Trade History format (individual fills)
      const symbol = (row.Symbol || row.symbol || '').replace('USDT', '').replace('BUSD', '');
      const side = (row.Side || row.side || '').toUpperCase();
      const positionSide = (row['Position Side'] || row.positionSide || '').toUpperCase();

      // Determine if LONG or SHORT based on side and position side
      let tradeSide: 'LONG' | 'SHORT' = 'LONG';
      if (positionSide === 'SHORT' || (positionSide === 'BOTH' && side === 'SELL')) {
        tradeSide = 'SHORT';
      } else if (positionSide === 'LONG' || (positionSide === 'BOTH' && side === 'BUY')) {
        tradeSide = 'LONG';
      }

      const price = parseFloat(row.Price || row.price || 0);
      const qty = parseFloat(row.Quantity || row.quantity || row.Qty || row.qty || 0);
      const quoteQty = parseFloat(row['Quote Quantity'] || row.quoteQty || 0);
      const commission = parseFloat(row.Commission || row.commission || row.Fee || row.fee || 0);
      const realizedPnl = parseFloat(row['Realized Profit'] || row.realizedProfit || row.realizedPnl || 0);

      return {
        date: row.Time || row.time || new Date().toISOString(),
        symbol: symbol.toUpperCase(),
        side: tradeSide,
        entry: price,
        exit: price, // Individual trades don't have exit - will need to be aggregated
        size: qty,
        leverage: 1,
        fees: Math.abs(commission),
        pnl_usd: realizedPnl,
        pnl_pct: quoteQty > 0 ? (realizedPnl / quoteQty) * 100 : 0,
        exchange: 'binance',
      };
    }
  }).filter(trade => trade.symbol && trade.entry > 0);
}

/**
 * Bybit CSV Parser
 *
 * Bybit exports with these columns (Unified Trading Account - Derivatives):
 * - Contracts, Side, Qty, Order Price, Avg. Fill Price, Closed P&L, Order Type, Create Time, Update Time
 *
 * For Closed P&L export:
 * - Symbol, Order ID, Side, Entry Price, Exit Price, Qty, Closed PnL, Trade Time
 */
function parseBybit(rows: any[]): ParsedTrade[] {
  return rows.map((row): ParsedTrade => {
    // Try to detect format
    const symbol = (
      row.Contracts || row.contracts ||
      row.Symbol || row.symbol ||
      row.Coin || row.coin || ''
    ).replace('USDT', '').replace('USD', '');

    const side = (
      row.Side || row.side ||
      row['Closing Direction'] || row.closingDirection || ''
    ).toUpperCase();

    // Map Buy/Sell to Long/Short
    let tradeSide: 'LONG' | 'SHORT' = 'LONG';
    if (side === 'SELL' || side === 'SHORT' || side.includes('SHORT')) {
      tradeSide = 'SHORT';
    }

    const entry = parseFloat(
      row['Entry Price'] || row.entryPrice || row.entry_price ||
      row['Order Price'] || row.orderPrice || 0
    );
    const exit = parseFloat(
      row['Exit Price'] || row.exitPrice || row.exit_price ||
      row['Avg. Fill Price'] || row.avgFillPrice || entry
    );
    const qty = parseFloat(row.Qty || row.qty || row.Quantity || row.quantity || 0);
    const pnl = parseFloat(
      row['Closed P&L'] || row.closedPnl || row['Closed PnL'] ||
      row.PnL || row.pnl || 0
    );
    const fees = parseFloat(row.Fee || row.fee || row.Commission || row.commission || 0);

    const time = row['Trade Time'] || row.tradeTime || row['Create Time'] ||
                 row.createTime || row['Update Time'] || row.updateTime ||
                 new Date().toISOString();

    return {
      date: time,
      symbol: symbol.toUpperCase(),
      side: tradeSide,
      entry,
      exit: exit || entry,
      size: Math.abs(qty),
      leverage: 1, // Not provided in CSV export
      fees: Math.abs(fees),
      pnl_usd: pnl,
      pnl_pct: entry > 0 && qty > 0 ? (pnl / (entry * qty)) * 100 : 0,
      exchange: 'bybit',
    };
  }).filter(trade => trade.symbol && trade.entry > 0);
}

/**
 * Blofin CSV Parser
 *
 * Blofin exports with these columns:
 * - Instrument, Side, Size, Price, Fee, Realized PnL, Time
 */
function parseBlofin(rows: any[]): ParsedTrade[] {
  return rows.map((row): ParsedTrade => {
    const symbol = (
      row.Instrument || row.instrument ||
      row.instId || row.Symbol || row.symbol || ''
    ).replace('-USDT', '').replace('USDT', '').replace('-', '');

    const side = (row.Side || row.side || '').toUpperCase();
    // Blofin CSV exports the CLOSING action, not the position direction
    // SELL to close = was a LONG position
    // BUY to close = was a SHORT position
    // So we need to SWAP: SELL→LONG, BUY→SHORT
    const tradeSide: 'LONG' | 'SHORT' = side === 'BUY' ? 'SHORT' : 'LONG';

    const price = parseFloat(row.Price || row.price || 0);
    const size = parseFloat(row.Size || row.size || row.Qty || row.qty || 0);
    const fee = parseFloat(row.Fee || row.fee || 0);
    const pnl = parseFloat(row['Realized PnL'] || row.realizedPnl || row.PnL || row.pnl || 0);
    const time = row.Time || row.time || row.ts || new Date().toISOString();

    return {
      date: time,
      symbol: symbol.toUpperCase(),
      side: tradeSide,
      entry: price,
      exit: price,
      size: Math.abs(size),
      leverage: 1,
      fees: Math.abs(fee),
      pnl_usd: pnl,
      pnl_pct: price > 0 && size > 0 ? (pnl / (price * size)) * 100 : 0,
      exchange: 'blofin',
    };
  }).filter(trade => trade.symbol && trade.entry > 0);
}

/**
 * Hyperliquid CSV Parser
 *
 * Hyperliquid exports with these columns:
 * - Time, Coin, Side, Sz, Px, Closed PnL, Fee
 */
function parseHyperliquid(rows: any[]): ParsedTrade[] {
  return rows.map((row): ParsedTrade => {
    const symbol = (
      row.Coin || row.coin ||
      row.Asset || row.asset ||
      row.Symbol || row.symbol || ''
    ).toUpperCase();

    const side = (row.Side || row.side || '').toUpperCase();
    let tradeSide: 'LONG' | 'SHORT' = 'LONG';
    if (side === 'SELL' || side === 'SHORT' || side === 'S') {
      tradeSide = 'SHORT';
    }

    // Hyperliquid uses Sz for size and Px for price
    const price = parseFloat(row.Px || row.px || row.Price || row.price || 0);
    const size = parseFloat(row.Sz || row.sz || row.Size || row.size || 0);
    const pnl = parseFloat(row['Closed PnL'] || row.closedPnl || row.PnL || row.pnl || 0);
    const fee = parseFloat(row.Fee || row.fee || 0);
    const time = row.Time || row.time || row.Timestamp || row.timestamp || new Date().toISOString();

    return {
      date: time,
      symbol: symbol.replace('-USD', '').replace('USD', ''),
      side: tradeSide,
      entry: price,
      exit: price,
      size: Math.abs(size),
      leverage: 1,
      fees: Math.abs(fee),
      pnl_usd: pnl,
      pnl_pct: price > 0 && size > 0 ? (pnl / (price * size)) * 100 : 0,
      exchange: 'hyperliquid',
    };
  }).filter(trade => trade.symbol && trade.entry > 0);
}

/**
 * Generic/Custom CSV Parser
 * Uses our standard format or attempts to map common column names
 */
function parseGeneric(rows: any[]): ParsedTrade[] {
  return rows.map((row): ParsedTrade => {
    // Try various common column name patterns
    const symbol = (
      row.symbol || row.Symbol || row.SYMBOL ||
      row.pair || row.Pair || row.PAIR ||
      row.coin || row.Coin || row.COIN ||
      row.asset || row.Asset || row.ASSET ||
      row.instrument || row.Instrument || ''
    ).toString().replace(/[-\/]?(USDT|USD|BUSD|PERP)/gi, '').toUpperCase();

    const side = (
      row.side || row.Side || row.SIDE ||
      row.direction || row.Direction || 'LONG'
    ).toString().toUpperCase();

    let tradeSide: 'LONG' | 'SHORT' = 'LONG';
    if (side === 'SHORT' || side === 'SELL' || side === 'S') {
      tradeSide = 'SHORT';
    }

    const entry = parseFloat(
      row.entry || row.Entry || row.ENTRY ||
      row.entry_price || row.entryPrice || row['Entry Price'] ||
      row.open || row.Open || row.price || row.Price || 0
    );

    const exit = parseFloat(
      row.exit || row.Exit || row.EXIT ||
      row.exit_price || row.exitPrice || row['Exit Price'] ||
      row.close || row.Close || entry
    );

    const size = parseFloat(
      row.size || row.Size || row.SIZE ||
      row.qty || row.Qty || row.QTY ||
      row.quantity || row.Quantity || row.amount || row.Amount || 0
    );

    const leverage = parseFloat(
      row.leverage || row.Leverage || row.LEVERAGE ||
      row.lev || row.Lev || 1
    );

    const fees = parseFloat(
      row.fees || row.Fees || row.FEES ||
      row.fee || row.Fee || row.FEE ||
      row.commission || row.Commission || 0
    );

    const pnl_usd = parseFloat(
      row.pnl_usd || row.pnl || row.PnL || row.PNL ||
      row.profit || row.Profit || row.PROFIT ||
      row['Realized PnL'] || row.realizedPnl || 0
    );

    const pnl_pct = parseFloat(
      row.pnl_pct || row.roi || row.ROI ||
      row.roe || row.ROE ||
      row.return || row.Return || 0
    );

    const date =
      row.date || row.Date || row.DATE ||
      row.time || row.Time || row.TIME ||
      row.timestamp || row.Timestamp ||
      row.created_at || row.createdAt ||
      row.close_time || row.closeTime ||
      new Date().toISOString();

    return {
      date,
      symbol,
      side: tradeSide,
      entry,
      exit: exit || entry,
      size: Math.abs(size),
      leverage: leverage || 1,
      fees: Math.abs(fees),
      pnl_usd,
      pnl_pct: pnl_pct || (entry > 0 && size > 0 ? (pnl_usd / (entry * size)) * 100 : 0),
      exchange: 'csv_import',
    };
  }).filter(trade => trade.symbol && (trade.entry > 0 || trade.pnl_usd !== 0));
}

/**
 * Exchange configurations with instructions
 */
export const EXCHANGE_CONFIGS: ExchangeInfo[] = [
  {
    id: 'binance',
    name: 'Binance Futures',
    description: 'USDT-M and COIN-M Futures',
    instructions: [
      'Go to Binance Futures → Orders → Position History',
      'Click "Export" in the top right corner',
      'Select your date range (max 3 months at a time)',
      'Download the CSV file',
      'Note: For complete history, you may need multiple exports'
    ],
    sampleColumns: ['Symbol', 'Size', 'Entry Price', 'Mark Price', 'PNL', 'ROE', 'Time'],
    parser: parseBinanceFutures,
  },
  {
    id: 'bybit',
    name: 'Bybit',
    description: 'Unified Trading Account - Derivatives',
    instructions: [
      'Go to Orders → Derivatives → Closed P&L',
      'Click "Export" button',
      'Select date range and click "Export Now"',
      'Wait for file to generate, then click "Download"',
      'Note: Max 10,000 trades per export'
    ],
    sampleColumns: ['Contracts', 'Side', 'Qty', 'Entry Price', 'Exit Price', 'Closed P&L', 'Trade Time'],
    parser: parseBybit,
  },
  {
    id: 'blofin',
    name: 'Blofin',
    description: 'Spot and Futures trading history',
    instructions: [
      'Go to Account → Trade History',
      'Select "Futures" for perpetual trades',
      'Choose your date range (max 180 days)',
      'Click "Export" to download CSV',
      'For older data, contact support@blofin.com'
    ],
    sampleColumns: ['Instrument', 'Side', 'Size', 'Price', 'Fee', 'Realized PnL', 'Time'],
    parser: parseBlofin,
  },
  {
    id: 'hyperliquid',
    name: 'Hyperliquid',
    description: 'Perpetual futures trades',
    instructions: [
      'Connect your wallet to Hyperliquid',
      'Click "Trade History" tab at the bottom',
      'Click "Export to CSV"',
      'Note: Max 10,000 trades per export'
    ],
    sampleColumns: ['Time', 'Coin', 'Side', 'Sz', 'Px', 'Closed PnL', 'Fee'],
    parser: parseHyperliquid,
  },
  {
    id: 'generic',
    name: 'Other / Custom CSV',
    description: 'Use our standard format or common column names',
    instructions: [
      'Prepare a CSV with these columns:',
      '  date, symbol, side, entry, exit, size, pnl_usd',
      'Optional columns: leverage, fees, pnl_pct',
      'Side should be "LONG" or "SHORT"',
      'Date can be ISO format (2024-01-15) or common formats'
    ],
    sampleColumns: ['date', 'symbol', 'side', 'entry', 'exit', 'size', 'leverage', 'fees', 'pnl_usd', 'pnl_pct'],
    parser: parseGeneric,
  },
];

/**
 * Auto-detect exchange from CSV columns
 */
export function detectExchange(columns: string[]): string {
  const columnSet = new Set(columns.map(c => c.toLowerCase()));

  // Hyperliquid uses unique 'Sz' and 'Px' columns
  if (columnSet.has('sz') || columnSet.has('px') || columnSet.has('coin')) {
    return 'hyperliquid';
  }

  // Bybit uses 'Contracts' and 'Closed P&L'
  if (columnSet.has('contracts') || columnSet.has('closed p&l') || columnSet.has('closing direction')) {
    return 'bybit';
  }

  // Binance uses 'Position Side' or 'Realized Profit'
  if (columnSet.has('position side') || columnSet.has('positionside') || columnSet.has('realized profit')) {
    return 'binance';
  }

  // Blofin uses 'Instrument' or 'instId'
  if (columnSet.has('instrument') || columnSet.has('instid')) {
    return 'blofin';
  }

  return 'generic';
}

/**
 * Parse CSV data with the appropriate exchange parser
 */
export function parseCSV(rows: any[], exchangeId?: string): ParsedTrade[] {
  if (!rows.length) return [];

  // Auto-detect if no exchange specified
  const detectedExchange = exchangeId || detectExchange(Object.keys(rows[0]));
  const config = EXCHANGE_CONFIGS.find(e => e.id === detectedExchange) || EXCHANGE_CONFIGS.find(e => e.id === 'generic')!;

  return config.parser(rows);
}

/**
 * Get exchange config by ID
 */
export function getExchangeConfig(exchangeId: string): ExchangeInfo | undefined {
  return EXCHANGE_CONFIGS.find(e => e.id === exchangeId);
}
