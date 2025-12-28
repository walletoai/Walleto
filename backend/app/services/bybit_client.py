"""
Bybit API client for fetching perpetual futures closed PnL records
Uses V5 API with HMAC SHA256 authentication
"""

import hashlib
import hmac
import time
from datetime import datetime, timedelta
from typing import Any, Dict, List, Optional
from urllib.parse import urlencode

import httpx


class BybitClient:
    """Bybit V5 API client for fetching closed PnL history"""

    def __init__(self, api_key: str, api_secret: str) -> None:
        self.api_key = api_key
        self.api_secret = api_secret
        self.base_url = "https://api.bybit.com"
        self.timeout = 30.0
        self.recv_window = "5000"

    def _sign(self, timestamp: str, params: Dict[str, Any]) -> str:
        """Generate HMAC SHA256 signature for Bybit API"""
        # Bybit V5 signature: timestamp + api_key + recv_window + query_string
        query_string = urlencode(sorted(params.items()))
        sign_str = f"{timestamp}{self.api_key}{self.recv_window}{query_string}"

        signature = hmac.new(
            self.api_secret.encode('utf-8'),
            sign_str.encode('utf-8'),
            hashlib.sha256
        ).hexdigest()
        return signature

    def _request(
        self,
        method: str,
        path: str,
        params: Optional[Dict[str, Any]] = None,
    ) -> Any:
        """Make HTTP request to Bybit API"""
        params = params or {}
        timestamp = str(int(time.time() * 1000))

        signature = self._sign(timestamp, params)

        headers = {
            "X-BAPI-API-KEY": self.api_key,
            "X-BAPI-SIGN": signature,
            "X-BAPI-TIMESTAMP": timestamp,
            "X-BAPI-RECV-WINDOW": self.recv_window,
            "Content-Type": "application/json",
        }

        url = f"{self.base_url}{path}"

        with httpx.Client(timeout=self.timeout) as client:
            if method.upper() == "GET":
                response = client.get(url, params=params, headers=headers)
            else:
                response = client.request(method.upper(), url, params=params, headers=headers)

            data = response.json()

            if data.get("retCode") != 0:
                raise RuntimeError(
                    f"Bybit API error: {data.get('retCode')} - {data.get('retMsg', 'Unknown error')}"
                )

            return data.get("result", {})

    def get_position_info(self, category: str = "linear") -> List[Dict[str, Any]]:
        """Get current position information"""
        result = self._request("GET", "/v5/position/list", {"category": category})
        return result.get("list", [])

    def fetch_closed_pnl(
        self,
        symbol: Optional[str] = None,
        start_time: Optional[int] = None,
        end_time: Optional[int] = None,
        limit: int = 100,
        sleep_seconds: float = 0.2,
    ) -> List[Dict[str, Any]]:
        """
        Fetch all closed PnL records from Bybit.

        Bybit API constraints:
        - Max 100 records per request
        - Max 7 days per query window
        - 2 years of history available

        Args:
            symbol: Specific symbol to fetch (None = all symbols)
            start_time: Start timestamp in milliseconds
            end_time: End timestamp in milliseconds
            limit: Number of records per request (max 100)
            sleep_seconds: Delay between requests

        Returns:
            List of all closed PnL records
        """
        all_records: List[Dict[str, Any]] = []

        # Default to last 2 years if no time range specified
        if not end_time:
            end_time = int(time.time() * 1000)
        if not start_time:
            # 2 years ago (Bybit max history)
            start_time = end_time - (730 * 24 * 60 * 60 * 1000)

        # Query in 7-day windows (Bybit limitation)
        seven_days_ms = 7 * 24 * 60 * 60 * 1000
        current_end = end_time

        print(f"Fetching Bybit closed PnL from {datetime.utcfromtimestamp(start_time/1000)} to {datetime.utcfromtimestamp(end_time/1000)}")

        while current_end > start_time:
            current_start = max(current_end - seven_days_ms, start_time)

            params = {
                "category": "linear",
                "startTime": current_start,
                "endTime": current_end,
                "limit": limit,
            }

            if symbol:
                params["symbol"] = symbol

            cursor = None
            window_records = []

            # Paginate within the 7-day window
            while True:
                if cursor:
                    params["cursor"] = cursor

                try:
                    result = self._request("GET", "/v5/position/closed-pnl", params)
                    records = result.get("list", [])
                    window_records.extend(records)

                    # Check for more pages
                    cursor = result.get("nextPageCursor")
                    if not cursor or len(records) < limit:
                        break

                    time.sleep(sleep_seconds)

                except Exception as e:
                    print(f"Error fetching Bybit closed PnL: {e}")
                    break

            all_records.extend(window_records)

            if window_records:
                print(f"  Window {datetime.utcfromtimestamp(current_start/1000).date()} to {datetime.utcfromtimestamp(current_end/1000).date()}: {len(window_records)} records")

            current_end = current_start
            time.sleep(sleep_seconds)

        print(f"Total Bybit closed PnL records fetched: {len(all_records)}")
        return all_records


def calculate_bybit_trade_fields(record: Dict[str, Any]) -> Optional[Dict[str, Any]]:
    """
    Calculate all required fields from Bybit closed PnL record.

    Bybit provides complete trade data including:
    - avgEntryPrice, avgExitPrice
    - qty (quantity)
    - closedPnl (realized PnL)
    - leverage (INCLUDED in response!)
    - createdTime, updatedTime

    Returns trade in standard format for Supabase.
    """
    # Extract timestamps
    created_time = int(record.get("createdTime", 0))
    updated_time = int(record.get("updatedTime", 0))

    # Convert timestamps to ISO format
    if created_time > 0:
        entry_date = datetime.utcfromtimestamp(created_time / 1000).isoformat() + "Z"
    else:
        entry_date = datetime.utcnow().isoformat() + "Z"

    if updated_time > 0:
        exit_date = datetime.utcfromtimestamp(updated_time / 1000).isoformat() + "Z"
    else:
        exit_date = entry_date

    # Symbol format: BTCUSDT -> BTC-USDT
    symbol_raw = record.get("symbol", "")
    if symbol_raw.endswith("USDT"):
        symbol = symbol_raw[:-4] + "-USDT"
    elif symbol_raw.endswith("USDC"):
        symbol = symbol_raw[:-4] + "-USDC"
    else:
        symbol = symbol_raw

    # Extract trade data
    side = record.get("side", "Buy").upper()
    # Bybit uses "Buy" and "Sell" - normalize to our format
    if side == "BUY":
        side = "BUY"
    elif side == "SELL":
        side = "SELL"

    entry_price = float(record.get("avgEntryPrice", 0))
    exit_price = float(record.get("avgExitPrice", 0))
    size = float(record.get("qty", 0))
    pnl_usd = float(record.get("closedPnl", 0))

    # Bybit INCLUDES leverage in closed PnL response!
    leverage = float(record.get("leverage", 1))

    # Calculate fees from cumEntryValue and cumExitValue if available
    cum_entry = float(record.get("cumEntryValue", 0))
    cum_exit = float(record.get("cumExitValue", 0))
    # Approximate fees (Bybit doesn't provide exact fees in closed PnL)
    # Typical taker fee is 0.06% = 0.0006
    fees = (cum_entry + cum_exit) * 0.0006

    # Skip invalid records
    if entry_price == 0 or size == 0:
        return None

    # Calculate PnL percentage
    position_value = entry_price * size
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
        "date": entry_date,
        "exit_date": exit_date,
        "symbol": symbol,
        "side": side,
        "entry": round_value(entry_price, 8),
        "exit": round_value(exit_price, 8),
        "size": round_value(size, 8),
        "leverage": round_value(leverage, 2),
        "fees": round_value(fees, 8),
        "pnl_usd": round_value(pnl_usd, 2),
        "pnl_pct": round_value(pnl_pct, 4),
    }
