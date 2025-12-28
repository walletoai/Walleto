"""
Binance Futures API client for fetching perpetual futures trades
Uses direct API calls with HMAC SHA256 authentication
"""

import hashlib
import hmac
import time
from datetime import datetime, timedelta
from typing import Any, Dict, List, Optional
from urllib.parse import urlencode

import httpx


class BinanceClient:
    """Binance Futures API client for fetching trade history"""

    def __init__(self, api_key: str, api_secret: str) -> None:
        self.api_key = api_key
        self.api_secret = api_secret
        self.base_url = "https://fapi.binance.com"
        self.timeout = 30.0

    def _sign(self, params: Dict[str, Any]) -> str:
        """Generate HMAC SHA256 signature for Binance API"""
        query_string = urlencode(params)
        signature = hmac.new(
            self.api_secret.encode('utf-8'),
            query_string.encode('utf-8'),
            hashlib.sha256
        ).hexdigest()
        return signature

    def _request(
        self,
        method: str,
        path: str,
        params: Optional[Dict[str, Any]] = None,
        signed: bool = True,
    ) -> Any:
        """Make HTTP request to Binance API"""
        params = params or {}

        if signed:
            # Add timestamp for signed requests
            params['timestamp'] = int(time.time() * 1000)
            params['signature'] = self._sign(params)

        url = f"{self.base_url}{path}"
        headers = {
            "X-MBX-APIKEY": self.api_key,
            "Content-Type": "application/json",
        }

        with httpx.Client(timeout=self.timeout) as client:
            if method.upper() == "GET":
                response = client.get(url, params=params, headers=headers)
            else:
                response = client.request(method.upper(), url, params=params, headers=headers)

            if response.status_code != 200:
                error_data = response.json() if response.content else {}
                raise RuntimeError(
                    f"Binance API error: {response.status_code} - {error_data.get('msg', 'Unknown error')}"
                )

            return response.json()

    def get_exchange_info(self) -> Dict[str, Any]:
        """Get exchange trading rules and symbol information"""
        return self._request("GET", "/fapi/v1/exchangeInfo", signed=False)

    def get_position_risk(self) -> List[Dict[str, Any]]:
        """
        Get current position information including leverage.
        This is the ONLY way to get leverage settings in Binance.
        Historical trades do NOT include leverage.
        """
        return self._request("GET", "/fapi/v2/positionRisk")

    def get_account_info(self) -> Dict[str, Any]:
        """Get current account information"""
        return self._request("GET", "/fapi/v2/account")

    def fetch_leverage_map(self) -> Dict[str, float]:
        """
        Fetch current leverage settings for all symbols.

        NOTE: Binance does NOT provide historical leverage data.
        This returns the user's CURRENT leverage settings only.
        """
        try:
            positions = self.get_position_risk()
            leverage_map = {}

            for pos in positions:
                symbol = pos.get("symbol", "")
                leverage = pos.get("leverage", "1")
                if symbol and leverage:
                    leverage_map[symbol] = float(leverage)

            print(f"📊 Fetched leverage settings for {len(leverage_map)} Binance symbols")
            if leverage_map:
                sample = list(leverage_map.items())[:5]
                print(f"   Sample: {sample}")

            return leverage_map
        except Exception as e:
            print(f"⚠️ Failed to fetch Binance leverage settings: {e}")
            return {}

    def fetch_trade_history(
        self,
        symbol: Optional[str] = None,
        start_time: Optional[int] = None,
        end_time: Optional[int] = None,
        limit: int = 1000,
        sleep_seconds: float = 0.2,
    ) -> List[Dict[str, Any]]:
        """
        Fetch all trade history from Binance Futures.

        Binance API constraints:
        - Max 1000 trades per request
        - Max 7 days per request window
        - Max 6 months of history total

        Args:
            symbol: Specific symbol to fetch (None = requires symbol for Binance)
            start_time: Start timestamp in milliseconds
            end_time: End timestamp in milliseconds
            limit: Number of trades per request (max 1000)
            sleep_seconds: Delay between requests

        Returns:
            List of all trades from Binance API
        """
        all_trades: List[Dict[str, Any]] = []

        # Binance requires symbol for userTrades endpoint
        # We need to get all traded symbols first
        if not symbol:
            symbols = self._get_traded_symbols()
        else:
            symbols = [symbol]

        print(f"📊 Fetching trades for {len(symbols)} Binance symbols...")

        for sym in symbols:
            symbol_trades = self._fetch_symbol_trades(
                sym, start_time, end_time, limit, sleep_seconds
            )
            all_trades.extend(symbol_trades)
            print(f"   {sym}: {len(symbol_trades)} trades")

        # Sort by time
        all_trades.sort(key=lambda x: x.get("time", 0), reverse=True)

        return all_trades

    def _get_traded_symbols(self) -> List[str]:
        """Get list of symbols the user has traded"""
        try:
            # Get account info which includes positions
            account = self.get_account_info()
            positions = account.get("positions", [])

            # Also try position risk for any symbols with open positions
            position_risk = self.get_position_risk()

            traded_symbols = set()

            # Add symbols with any position amount
            for pos in positions:
                if float(pos.get("positionAmt", 0)) != 0 or float(pos.get("unrealizedProfit", 0)) != 0:
                    traded_symbols.add(pos.get("symbol", ""))

            for pos in position_risk:
                if float(pos.get("positionAmt", 0)) != 0:
                    traded_symbols.add(pos.get("symbol", ""))

            # If no positions found, try getting income history to find traded symbols
            if not traded_symbols:
                traded_symbols = self._get_symbols_from_income()

            # Filter out empty strings
            traded_symbols = {s for s in traded_symbols if s}

            # If still no symbols, try common futures pairs
            if not traded_symbols:
                print("⚠️ No traded symbols found, trying common pairs...")
                traded_symbols = {"BTCUSDT", "ETHUSDT", "SOLUSDT", "BNBUSDT"}

            return list(traded_symbols)
        except Exception as e:
            print(f"⚠️ Error getting traded symbols: {e}")
            return ["BTCUSDT", "ETHUSDT"]  # Fallback to common pairs

    def _get_symbols_from_income(self) -> set:
        """Get symbols from income history (realized PnL)"""
        try:
            # Get last 6 months of income
            end_time = int(time.time() * 1000)
            start_time = end_time - (180 * 24 * 60 * 60 * 1000)  # 6 months ago

            symbols = set()

            # Query in 7-day chunks (Binance limitation)
            current_start = start_time
            while current_start < end_time:
                current_end = min(current_start + (7 * 24 * 60 * 60 * 1000), end_time)

                params = {
                    "incomeType": "REALIZED_PNL",
                    "startTime": current_start,
                    "endTime": current_end,
                    "limit": 1000,
                }

                try:
                    income = self._request("GET", "/fapi/v1/income", params)
                    for item in income:
                        symbol = item.get("symbol", "")
                        if symbol:
                            symbols.add(symbol)
                except Exception:
                    pass

                current_start = current_end
                time.sleep(0.1)

            print(f"📊 Found {len(symbols)} symbols from income history")
            return symbols
        except Exception as e:
            print(f"⚠️ Error getting income symbols: {e}")
            return set()

    def _fetch_symbol_trades(
        self,
        symbol: str,
        start_time: Optional[int],
        end_time: Optional[int],
        limit: int,
        sleep_seconds: float,
    ) -> List[Dict[str, Any]]:
        """Fetch all trades for a specific symbol with pagination"""
        trades: List[Dict[str, Any]] = []

        # Default to last 6 months if no time range specified
        if not end_time:
            end_time = int(time.time() * 1000)
        if not start_time:
            # 6 months ago (Binance max history)
            start_time = end_time - (180 * 24 * 60 * 60 * 1000)

        # Binance requires querying in 7-day windows
        seven_days_ms = 7 * 24 * 60 * 60 * 1000
        current_start = start_time

        while current_start < end_time:
            current_end = min(current_start + seven_days_ms, end_time)

            params = {
                "symbol": symbol,
                "startTime": current_start,
                "endTime": current_end,
                "limit": limit,
            }

            try:
                page_trades = self._request("GET", "/fapi/v1/userTrades", params)
                trades.extend(page_trades)

                # If we got max trades, there might be more - paginate within window
                while len(page_trades) == limit:
                    last_id = page_trades[-1].get("id")
                    if not last_id:
                        break

                    params["fromId"] = last_id + 1
                    time.sleep(sleep_seconds)

                    page_trades = self._request("GET", "/fapi/v1/userTrades", params)
                    trades.extend(page_trades)

            except Exception as e:
                print(f"⚠️ Error fetching {symbol} trades ({current_start}-{current_end}): {e}")

            current_start = current_end
            time.sleep(sleep_seconds)

        return trades


def aggregate_binance_trades(
    trades: List[Dict[str, Any]],
    leverage_map: Optional[Dict[str, float]] = None
) -> List[Dict[str, Any]]:
    """
    Aggregate Binance trades into positions.

    Binance userTrades returns individual fills. We need to group them
    into complete positions (entry + exit).

    A position consists of:
    - Entry trades (realizedPnl = 0 for the entry leg)
    - Exit trades (realizedPnl != 0 when closing)
    """
    from collections import defaultdict

    leverage_map = leverage_map or {}

    # Group trades by symbol
    by_symbol = defaultdict(list)
    for trade in trades:
        symbol = trade.get("symbol", "")
        if symbol:
            by_symbol[symbol].append(trade)

    positions = []

    for symbol, symbol_trades in by_symbol.items():
        # Sort by time (newest first)
        symbol_trades.sort(key=lambda x: x.get("time", 0), reverse=True)

        i = 0
        while i < len(symbol_trades):
            position_trades = []

            # Collect consecutive trades that form a position
            # Exit trades have realizedPnl != 0
            # Entry trades have realizedPnl = 0

            # First collect exit trades
            while i < len(symbol_trades) and float(symbol_trades[i].get("realizedPnl", 0)) != 0:
                position_trades.append(symbol_trades[i])
                i += 1

            # Then collect entry trades
            while i < len(symbol_trades) and float(symbol_trades[i].get("realizedPnl", 0)) == 0:
                position_trades.append(symbol_trades[i])
                i += 1

            # Check if we have a complete position
            has_entry = any(float(t.get("realizedPnl", 0)) == 0 for t in position_trades)
            has_exit = any(float(t.get("realizedPnl", 0)) != 0 for t in position_trades)

            if has_entry and has_exit and position_trades:
                positions.append(position_trades)

    # Aggregate each position
    aggregated = []

    for position_trades in positions:
        if not position_trades:
            continue

        # Separate entry and exit trades
        entry_trades = [t for t in position_trades if float(t.get("realizedPnl", 0)) == 0]
        exit_trades = [t for t in position_trades if float(t.get("realizedPnl", 0)) != 0]

        # Calculate totals from entry trades
        total_entry_qty = sum(float(t.get("qty", 0)) for t in entry_trades)

        if total_entry_qty > 0:
            entry_weighted = sum(
                float(t.get("price", 0)) * float(t.get("qty", 0))
                for t in entry_trades
            )
            avg_entry_price = entry_weighted / total_entry_qty
        else:
            avg_entry_price = float(entry_trades[0].get("price", 0)) if entry_trades else 0

        # Calculate exit price from exit trades
        total_exit_qty = sum(float(t.get("qty", 0)) for t in exit_trades)

        if total_exit_qty > 0:
            exit_weighted = sum(
                float(t.get("price", 0)) * float(t.get("qty", 0))
                for t in exit_trades
            )
            avg_exit_price = exit_weighted / total_exit_qty
        else:
            avg_exit_price = float(exit_trades[0].get("price", 0)) if exit_trades else 0

        # Sum PnL and fees
        total_pnl = sum(float(t.get("realizedPnl", 0)) for t in position_trades)
        total_fees = sum(float(t.get("commission", 0)) for t in position_trades)

        # Get metadata from first entry trade
        first_trade = entry_trades[0] if entry_trades else position_trades[0]
        symbol = first_trade.get("symbol", "")

        # Determine side (BUY = long, SELL = short)
        # Entry side is the opposite of position direction
        entry_side = first_trade.get("side", "BUY")
        # If entry was BUY, it's a LONG position
        side = "BUY" if entry_side == "BUY" else "SELL"

        # Get timestamps
        entry_ts = entry_trades[-1].get("time", 0) if entry_trades else position_trades[-1].get("time", 0)
        exit_ts = exit_trades[0].get("time", 0) if exit_trades else position_trades[0].get("time", 0)

        # Get leverage from map or default to 1
        leverage = leverage_map.get(symbol, 1.0)

        aggregated.append({
            "tradeId": str(first_trade.get("id", "")),
            "orderId": str(first_trade.get("orderId", "")),
            "symbol": symbol,
            "side": side,
            "positionSide": first_trade.get("positionSide", "BOTH"),
            "entryPrice": avg_entry_price,
            "exitPrice": avg_exit_price,
            "qty": total_entry_qty,
            "realizedPnl": total_pnl,
            "commission": total_fees,
            "leverage": leverage,
            "entryTime": entry_ts,
            "exitTime": exit_ts,
        })

    return aggregated


def calculate_binance_trade_fields(trade: Dict[str, Any]) -> Optional[Dict[str, Any]]:
    """
    Calculate all required fields from Binance aggregated trade data.

    Returns trade in standard format for Supabase.
    """
    # Extract data
    entry_ts = trade.get("entryTime", 0)
    exit_ts = trade.get("exitTime", 0)

    # Convert timestamps
    if entry_ts > 0:
        date = datetime.utcfromtimestamp(entry_ts / 1000).isoformat() + "Z"
    else:
        date = datetime.utcnow().isoformat() + "Z"

    if exit_ts > 0:
        exit_date = datetime.utcfromtimestamp(exit_ts / 1000).isoformat() + "Z"
    else:
        exit_date = None

    # Binance uses USDT pairs, convert to standard format
    # BTCUSDT -> BTC-USDT
    symbol_raw = trade.get("symbol", "")
    if symbol_raw.endswith("USDT"):
        symbol = symbol_raw[:-4] + "-USDT"
    elif symbol_raw.endswith("BUSD"):
        symbol = symbol_raw[:-4] + "-BUSD"
    else:
        symbol = symbol_raw

    side = trade.get("side", "BUY").upper()
    entry = float(trade.get("entryPrice", 0))
    exit_price = float(trade.get("exitPrice", 0))
    size = float(trade.get("qty", 0))
    leverage = float(trade.get("leverage", 1))
    fees = abs(float(trade.get("commission", 0)))  # Fees are negative
    pnl_usd = float(trade.get("realizedPnl", 0))

    # Skip invalid trades
    if entry == 0 or size == 0:
        return None

    # Calculate PnL percentage
    position_value = entry * size
    if position_value > 0 and leverage > 0:
        margin_used = position_value / leverage
        pnl_pct = (pnl_usd / margin_used) * 100
    else:
        pnl_pct = 0.0

    # Round values
    def round_value(val: float, decimals: int = 8) -> float:
        if val is None or not isinstance(val, (int, float)):
            return 0.0
        if not (-1e15 < val < 1e15):
            return 0.0
        return round(val, decimals)

    return {
        "date": date,
        "exit_date": exit_date,
        "symbol": symbol,
        "side": side,
        "entry": round_value(entry, 8),
        "exit": round_value(exit_price, 8),
        "size": round_value(size, 8),
        "leverage": round_value(leverage, 2),
        "fees": round_value(fees, 8),
        "pnl_usd": round_value(pnl_usd, 2),
        "pnl_pct": round_value(pnl_pct, 4),
    }
