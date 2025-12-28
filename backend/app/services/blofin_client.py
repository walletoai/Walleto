"""
Native Blofin API client for fetching perpetual futures trades
Uses direct API calls instead of CCXT for better data accuracy
"""

import base64
import hashlib
import hmac
import json
import os
import time
import uuid
from datetime import datetime
from typing import Any, Dict, List, Optional
from urllib.parse import urlencode

import httpx


class BlofinClient:
    """Blofin API client for fetching futures trade history"""

    def __init__(self, api_key: str, api_secret: str, passphrase: str) -> None:
        self.api_key = api_key
        self.api_secret = api_secret
        self.passphrase = passphrase
        self.base_url = os.environ.get("BLOFIN_BASE_URL", "https://openapi.blofin.com")
        self.timeout = 20.0

    def _sign(
        self,
        method: str,
        path_with_query: str,
        timestamp: str,
        nonce: str,
        body: str,
    ) -> str:
        """Generate BloFin signature"""
        prehash = f"{path_with_query}{method}{timestamp}{nonce}{body}"
        hex_signature = hmac.new(
            self.api_secret.encode(),
            prehash.encode(),
            hashlib.sha256,
        ).hexdigest().encode()
        return base64.b64encode(hex_signature).decode()

    def _request(
        self,
        method: str,
        path: str,
        params: Optional[Dict[str, Any]] = None,
        body: Optional[Dict[str, Any]] = None,
    ) -> Dict[str, Any]:
        """Make HTTP request to Blofin API"""
        method = method.upper()
        query = urlencode(params or {})
        path_with_query = f"{path}?{query}" if query else path
        url = f"{self.base_url}{path_with_query}"

        timestamp = str(int(time.time() * 1000))
        nonce = str(uuid.uuid4())
        body_str = json.dumps(body) if body else ""

        signature = self._sign(method, path_with_query, timestamp, nonce, body_str)

        headers = {
            "ACCESS-KEY": self.api_key,
            "ACCESS-SIGN": signature,
            "ACCESS-TIMESTAMP": timestamp,
            "ACCESS-NONCE": nonce,
            "ACCESS-PASSPHRASE": self.passphrase,
            "Content-Type": "application/json",
        }

        with httpx.Client(timeout=self.timeout) as client:
            response = client.request(
                method,
                url,
                headers=headers,
                json=body if body else None,
            )
            response.raise_for_status()
            payload = response.json()

        if payload.get("code") not in (0, "0"):
            raise RuntimeError(
                f"BloFin API error code={payload.get('code')} msg={payload.get('msg')}"
            )
        return payload

    def fetch_positions(self, inst_id: Optional[str] = None) -> List[Dict[str, Any]]:
        """Fetch current account positions with leverage information"""
        params: Dict[str, Any] = {}
        if inst_id:
            params["instId"] = inst_id

        data = self._request("GET", "/api/v1/account/positions", params=params)
        positions = data.get("data") or []
        return positions

    def fetch_contract_sizes(self, symbols: Optional[List[str]] = None) -> Dict[str, float]:
        """
        Fetch contract sizes for symbols from Blofin API.
        Returns a dict mapping instId -> contractValue (e.g., {"SOL-USDT": 1.0})
        """
        try:
            # Fetch all perpetual instruments
            data = self._request("GET", "/api/v1/market/instruments", params={"instType": "PERPETUAL"})
            instruments = data.get("data", [])
            contract_map = {}

            for inst in instruments:
                inst_id = inst.get("instId", "")
                contract_val = float(inst.get("contractValue", 0.01))
                if inst_id:
                    contract_map[inst_id] = contract_val

            print(f"📏 Fetched contract sizes for {len(contract_map)} instruments")
            if symbols:
                # Show contract sizes for specific symbols if provided
                for sym in symbols[:5]:
                    if sym in contract_map:
                        print(f"   {sym}: {contract_map[sym]}")

            # Cache in the static function
            get_contract_size._cache = contract_map

            return contract_map
        except Exception as e:
            print(f"⚠️ Failed to fetch contract sizes: {e}")
            return {}

    def fetch_leverage_map(self) -> Dict[str, float]:
        """
        Fetch current leverage settings using batch-leverage-info endpoint.
        Returns a dict mapping instId -> leverage (e.g., {"BTC-USDT": 50.0})

        This fetches the user's CURRENT leverage settings for all instruments.
        Since Blofin doesn't provide historical leverage, we assume users have
        been using consistent leverage settings.
        """
        try:
            # Try batch leverage endpoint first (gets ALL instruments)
            data = self._request("GET", "/api/v1/account/batch-leverage-info", params={"mgnMode": "cross"})
            leverage_data = data.get("data") or []
            leverage_map = {}

            for item in leverage_data:
                inst_id = item.get("instId", "")
                lever = item.get("lever", "1")
                if inst_id and lever:
                    leverage_map[inst_id] = float(lever)

            print(f"📊 Fetched leverage settings for {len(leverage_map)} instruments from batch-leverage-info")
            if leverage_map:
                print(f"   Sample: {list(leverage_map.items())[:5]}")

            return leverage_map
        except Exception as e:
            print(f"⚠️ batch-leverage-info failed, trying positions endpoint: {e}")
            # Fallback to positions endpoint (only returns instruments with open positions)
            try:
                positions = self.fetch_positions()
                leverage_map = {}

                for pos in positions:
                    inst_id = pos.get("instId", "")
                    lever = pos.get("lever", "1")
                    if inst_id and lever:
                        leverage_map[inst_id] = float(lever)

                print(f"📊 Fetched leverage settings for {len(leverage_map)} open positions")
                return leverage_map
            except Exception as e2:
                print(f"⚠️ Failed to fetch leverage settings: {e2}")
                return {}

    def fetch_trade_history(
        self,
        inst_id: Optional[str] = None,
        begin: Optional[int] = None,
        end: Optional[int] = None,
        page_limit: int = 100,
        sleep_seconds: float = 0.2,
        max_pages: int = 10000,  # Safety limit: 10k pages = 1M fills max
    ) -> List[Dict[str, Any]]:
        """
        Pull paginated fills history until exhaustion.

        Supports fetching complete trade history with pagination.
        For users with 3+ years of data, this may take several minutes.

        Args:
            inst_id: Specific instrument to fetch (None = all instruments)
            begin: Start timestamp in milliseconds
            end: End timestamp in milliseconds
            page_limit: Number of fills per page (max 100)
            sleep_seconds: Delay between requests to avoid rate limits
            max_pages: Maximum number of pages to fetch (safety limit)

        Returns:
            List of all fills from Blofin API
        """
        trades: List[Dict[str, Any]] = []
        after: Optional[str] = None
        page_count = 0

        while page_count < max_pages:
            params: Dict[str, Any] = {"limit": page_limit}
            if inst_id:
                params["instId"] = inst_id
            if begin is not None:
                params["begin"] = str(begin)
            if end is not None:
                params["end"] = str(end)
            if after:
                params["after"] = after

            data = self._request("GET", "/api/v1/trade/fills-history", params=params)
            page = data.get("data") or []
            if not page:
                break

            trades.extend(page)
            page_count += 1

            # Progress logging every 10 pages (1000 fills)
            if page_count % 10 == 0:
                print(f"📥 Fetched {len(trades)} fills so far ({page_count} pages)...")

            # Stop if we got a partial page (end of data)
            if len(page) < page_limit:
                break

            # Get next page cursor
            after = page[-1]["tradeId"]
            time.sleep(sleep_seconds)

        if page_count >= max_pages:
            print(f"⚠️ Reached maximum page limit ({max_pages} pages = {len(trades)} fills). Some data may be missing.")
            print(f"⚠️ Consider contacting support if you have more than {max_pages * page_limit} historical fills.")

        return trades


def aggregate_fills_by_order(
    fills: List[Dict[str, Any]],
    leverage_map: Optional[Dict[str, float]] = None
) -> List[Dict[str, Any]]:
    """
    Aggregate Blofin fills by position (not just orderId).

    A position consists of:
    - One or more entry fills (fillPnl = 0)
    - One or more exit fills (fillPnl != 0)

    We group all consecutive fills for the same symbol into one position/trade.

    Blofin API returns individual "fills" (executions), not complete "trades".
    Multiple fills can belong to the same order (partial fills).
    This function groups them into single logical trades.

    For each order group:
    - Sum all fillSize values → total quantity
    - Calculate weighted average fillPrice → entry price
    - Sum all fillPnl values → total PnL
    - Sum all fees → total fees
    - Use earliest timestamp → entry time
    - Use latest timestamp (if order is closed) → exit time
    - Apply leverage from leverage_map if available

    Args:
        fills: List of fill dictionaries from Blofin API
        leverage_map: Dict mapping instId to leverage (e.g., {"BTC-USDT": 50.0})
    """
    from collections import defaultdict

    leverage_map = leverage_map or {}

    # Group fills by symbol first
    by_symbol = defaultdict(list)
    for fill in fills:
        symbol = fill.get("instId", "")
        if symbol:
            by_symbol[symbol].append(fill)

    # For each symbol, group fills into complete positions
    positions = []

    for symbol, symbol_fills in by_symbol.items():
        # Sort by timestamp (newest first - Blofin returns in reverse chronological order)
        symbol_fills.sort(key=lambda x: int(x.get("ts", 0)), reverse=True)

        i = 0
        while i < len(symbol_fills):
            position_fills = []

            # Step 1: Collect all consecutive EXIT fills (pnl != 0)
            while i < len(symbol_fills) and float(symbol_fills[i].get("fillPnl", 0)) != 0:
                position_fills.append(symbol_fills[i])
                i += 1

            # Step 2: Collect all consecutive ENTRY fills (pnl == 0)
            while i < len(symbol_fills) and float(symbol_fills[i].get("fillPnl", 0)) == 0:
                position_fills.append(symbol_fills[i])
                i += 1

            # Only add if we have a complete position (both entry and exit)
            has_entry = any(float(f.get("fillPnl", 0)) == 0 for f in position_fills)
            has_exit = any(float(f.get("fillPnl", 0)) != 0 for f in position_fills)

            if has_entry and has_exit and position_fills:
                # Debug: show position grouping for first few positions
                if len(positions) < 5:
                    entry_count = sum(1 for f in position_fills if float(f.get("fillPnl", 0)) == 0)
                    exit_count = sum(1 for f in position_fills if float(f.get("fillPnl", 0)) != 0)
                    print(f"📍 Position {len(positions)+1} for {symbol}: {exit_count} exit fills + {entry_count} entry fills")
                positions.append(position_fills)
            elif position_fills:
                # Incomplete position - skip
                pass

    # Now aggregate each position
    aggregated_fills = []
    for position_fills in positions:
        if not position_fills:
            continue

        # Separate entry fills (pnl=0) from exit fills (pnl>0)
        entry_fills = [f for f in position_fills if float(f.get("fillPnl", 0)) == 0]
        exit_fills = [f for f in position_fills if float(f.get("fillPnl", 0)) != 0]

        # Position size comes from ENTRY fills only (not doubled)
        total_entry_size = sum(float(f.get("fillSize", 0)) for f in entry_fills)

        # Calculate weighted average ENTRY price from entry fills
        if total_entry_size > 0:
            entry_weighted_sum = sum(
                float(f.get("fillPrice", 0)) * float(f.get("fillSize", 0))
                for f in entry_fills
            )
            avg_entry_price = entry_weighted_sum / total_entry_size
        else:
            avg_entry_price = float(entry_fills[0].get("fillPrice", 0)) if entry_fills else 0

        # Calculate weighted average EXIT price from exit fills
        total_exit_size = sum(float(f.get("fillSize", 0)) for f in exit_fills)
        if total_exit_size > 0:
            exit_weighted_sum = sum(
                float(f.get("fillPrice", 0)) * float(f.get("fillSize", 0))
                for f in exit_fills
            )
            avg_exit_price = exit_weighted_sum / total_exit_size
        else:
            avg_exit_price = float(exit_fills[0].get("fillPrice", 0)) if exit_fills else 0

        # Sum PnL and fees from ALL fills
        total_pnl = sum(float(f.get("fillPnl", 0)) for f in position_fills)
        total_fees = sum(float(f.get("fee", 0)) for f in position_fills)

        # Get metadata
        first_fill = entry_fills[0] if entry_fills else position_fills[0]

        # Use earliest timestamp from entry fills
        entry_ts = entry_fills[0].get("ts", "0") if entry_fills else position_fills[0].get("ts", "0")

        # Use latest timestamp from exit fills
        exit_ts = exit_fills[-1].get("ts", "0") if exit_fills else position_fills[-1].get("ts", "0")

        # Create aggregated fill
        # Get leverage from leverage_map if available, otherwise default to API values
        inst_id = first_fill.get("instId", "")
        if inst_id in leverage_map:
            lever_value = str(leverage_map[inst_id])
            print(f"✅ Using leverage {lever_value}x for {inst_id} from account positions")
        else:
            lever_value = first_fill.get("lever", "0")
            margin_value = first_fill.get("margin", "0")
            if len(aggregated_fills) < 3:
                print(f"⚠️ No leverage found for {inst_id} in positions, defaulting to {lever_value}x")

        # Use first fill's orderId or tradeId as identifier
        position_id = first_fill.get("orderId", first_fill.get("tradeId", f"{inst_id}_{entry_ts}"))

        aggregated_fill = {
            "tradeId": position_id,  # Use position identifier
            "orderId": position_id,
            "instId": inst_id,
            "side": first_fill.get("side", ""),
            "positionSide": first_fill.get("positionSide", ""),
            "fillPrice": str(avg_entry_price),
            "fillSize": str(total_entry_size),  # Use entry size (not doubled)
            "fillPnl": str(total_pnl),
            "exitPrice": str(avg_exit_price),  # Store exit price separately
            "fee": str(total_fees),
            "lever": lever_value,
            "margin": first_fill.get("margin", "0"),
            "ts": entry_ts,  # Entry timestamp (earliest, from pnl=0 fills)
            "exit_ts": exit_ts,  # Exit timestamp (latest, from pnl>0 fills)
            "brokerId": first_fill.get("brokerId", ""),
        }

        aggregated_fills.append(aggregated_fill)

    return aggregated_fills


def get_contract_size(symbol: str, client: Optional['BlofinClient'] = None) -> float:
    """
    Get Blofin contract size for a given symbol by fetching from API.
    Contract sizes vary significantly by symbol:
    - BTC-USDT: 0.001
    - ETH-USDT: 0.01
    - BNB-USDT: 0.01
    - SOL-USDT: 1
    - DOGE-USDT: 1000

    Reference: https://docs.blofin.com/index.html#get-instruments
    """
    # Cache contract sizes in memory
    if not hasattr(get_contract_size, '_cache'):
        get_contract_size._cache = {}

    symbol_upper = symbol.upper()

    # Return from cache if available
    if symbol_upper in get_contract_size._cache:
        return get_contract_size._cache[symbol_upper]

    # Fetch from API if client provided
    if client:
        try:
            data = client._request("GET", "/api/v1/market/instruments", params={"instId": symbol_upper})
            instruments = data.get("data", [])
            if instruments:
                contract_value = float(instruments[0].get("contractValue", 0.01))
                get_contract_size._cache[symbol_upper] = contract_value
                print(f"✅ Fetched contract size for {symbol_upper}: {contract_value}")
                return contract_value
        except Exception as e:
            print(f"⚠️ Failed to fetch contract size for {symbol_upper}: {e}")

    # Fallback to defaults
    if symbol_upper.startswith('BTC'):
        return 0.001
    elif symbol_upper.startswith('ETH'):
        return 0.01
    else:
        # Conservative default
        return 0.01


def calculate_trade_fields(fill: Dict[str, Any]) -> Dict[str, Any]:
    """
    Calculate all required fields from Blofin fill data.

    Required fields:
    1. date - ISO format timestamp
    2. symbol - Trading pair
    3. side - BUY or SELL
    4. entry - Entry price
    5. exit - Exit price
    6. size - Position size
    7. leverage - Leverage amount
    8. fees - Trading fees
    9. pnl_usd - Profit/loss in USD
    10. pnl_pct - Profit/loss percentage

    Returns None if trade is invalid (both entry and exit prices are 0)
    """

    # Extract raw data
    ts_ms = int(fill.get("ts", 0))
    exit_ts_ms = int(fill.get("exit_ts", 0))

    # Convert timestamps to UTC (universal standard)
    # Frontend will automatically display in each user's local timezone
    if ts_ms > 0:
        date = datetime.utcfromtimestamp(ts_ms / 1000).isoformat() + "Z"
    else:
        date = datetime.utcnow().isoformat() + "Z"

    # Convert exit timestamp to UTC
    if exit_ts_ms > 0:
        exit_date = datetime.utcfromtimestamp(exit_ts_ms / 1000).isoformat() + "Z"
    else:
        exit_date = None

    symbol = fill.get("instId", "")
    blofin_side = fill.get("side", "").upper()
    pnl_usd = float(fill.get("fillPnl", 0))

    # The aggregated fill contains the ENTRY side (from entry fills where pnl=0)
    # BUY entry = LONG position
    # SELL entry = SHORT position
    # We map to LONG/SHORT for consistency with our trade format
    if blofin_side == "BUY":
        side = "LONG"
    elif blofin_side == "SELL":
        side = "SHORT"
    else:
        side = blofin_side

    entry = float(fill.get("fillPrice", 0))
    size_contracts = float(fill.get("fillSize", 0))
    fees = float(fill.get("fee", 0))

    # Convert Blofin contract size to actual coin quantity
    # Blofin uses fixed contract sizes per symbol:
    # BTC-USDT: 1 contract = 0.001 BTC
    # ETH-USDT: 1 contract = 0.01 ETH
    # Most other alts: 1 contract = 0.01 coin
    contract_size = get_contract_size(symbol)
    size = size_contracts * contract_size

    # Skip trades with exactly 0 entry price (invalid/rejected orders only)
    # Allow negative prices through to catch errors rather than silently filtering
    if entry == 0:
        return None

    # Get leverage from API if available
    api_leverage = float(fill.get("lever", 0)) if fill.get("lever") else 0

    # Use exit price from aggregation if available, otherwise calculate from PnL
    if fill.get("exitPrice"):
        exit_price = float(fill.get("exitPrice", 0))
    elif pnl_usd != 0 and size != 0 and entry != 0:
        # For LONG: exit = entry + (pnl / size)
        # For SHORT: exit = entry - (pnl / size)
        if side == "LONG":
            exit_price = entry + (pnl_usd / size)
        elif side == "SHORT":
            exit_price = entry - (pnl_usd / size)
        else:
            exit_price = entry
    else:
        exit_price = entry

    # Calculate leverage from API or fallback methods
    margin = float(fill.get("margin", 0)) if fill.get("margin") else 0

    if api_leverage > 0:
        leverage = api_leverage
    elif margin > 0 and entry > 0 and size > 0:
        # Calculate from margin: leverage = position_value / margin
        position_value = entry * size
        leverage = position_value / margin
    else:
        # Default to 1x if no leverage info available
        leverage = 1.0

    # Calculate PnL percentage: (PnL USD / (Position Value / Leverage)) * 100
    # Position Value = entry_price × coin_quantity
    # Margin Used = Position Value / Leverage
    # PnL% = (PnL USD / Margin Used) × 100
    position_value = entry * size
    if position_value > 0 and leverage > 0:
        margin_used = position_value / leverage
        pnl_pct = (pnl_usd / margin_used) * 100
    else:
        pnl_pct = 0.0

    # Round all numeric values to prevent precision overflow
    def round_value(val: float, decimals: int = 8) -> float:
        """Round a float value to specified decimals"""
        if val is None or not isinstance(val, (int, float)):
            return 0.0
        if not (-1e15 < val < 1e15):  # Check for overflow range
            return 0.0
        rounded = round(val, decimals)
        # Ensure it's not infinity or NaN
        if not (-1e15 < rounded < 1e15):
            return 0.0
        return rounded

    return {
        "date": date,
        "exit_date": exit_date,  # Exit timestamp (when trade closed)
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
