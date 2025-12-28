"""
Hyperliquid API client for fetching perpetual futures trade history
NO API KEYS REQUIRED - only wallet address needed (onchain data)
"""

from datetime import datetime
from typing import Any, Dict, List, Optional
import httpx


class HyperliquidClient:
    """Hyperliquid API client for fetching user fills (trades)"""

    def __init__(self, wallet_address: str) -> None:
        """
        Initialize Hyperliquid client.

        Args:
            wallet_address: User's Ethereum wallet address (0x...)
        """
        self.wallet_address = wallet_address.lower()
        self.base_url = "https://api.hyperliquid.xyz"
        self.timeout = 30.0

    def _request(self, request_type: str, extra_params: Optional[Dict[str, Any]] = None) -> Any:
        """Make HTTP request to Hyperliquid Info API"""
        payload = {
            "type": request_type,
            "user": self.wallet_address
        }

        if extra_params:
            payload.update(extra_params)

        with httpx.Client(timeout=self.timeout) as client:
            response = client.post(
                f"{self.base_url}/info",
                json=payload,
                headers={"Content-Type": "application/json"}
            )
            response.raise_for_status()
            return response.json()

    def fetch_user_fills(self) -> List[Dict[str, Any]]:
        """
        Fetch all user fills (trades) from Hyperliquid.

        Returns up to 2000 most recent fills.
        No pagination available - this is the API limit.

        Returns:
            List of fill records with coin, px, sz, side, time, closedPnl, fee, etc.
        """
        print(f"Fetching Hyperliquid fills for wallet: {self.wallet_address[:10]}...{self.wallet_address[-6:]}")

        try:
            fills = self._request("userFills")
            print(f"Fetched {len(fills)} fills from Hyperliquid")
            return fills
        except Exception as e:
            print(f"Error fetching Hyperliquid fills: {e}")
            raise

    def get_clearinghouse_state(self) -> Dict[str, Any]:
        """
        Get user's clearinghouse state (positions, margin, etc.)

        This endpoint includes current leverage for open positions.
        """
        try:
            state = self._request("clearinghouseState")
            return state
        except Exception as e:
            print(f"Error fetching clearinghouse state: {e}")
            return {}

    def validate_wallet(self) -> bool:
        """
        Validate that the wallet has trading history on Hyperliquid.

        Returns:
            True if wallet has fills or positions, False otherwise
        """
        try:
            fills = self.fetch_user_fills()
            return len(fills) > 0
        except Exception:
            return False


def calculate_hyperliquid_trade_fields(fill: Dict[str, Any], default_leverage: float = 10.0) -> Optional[Dict[str, Any]]:
    """
    Calculate all required fields from Hyperliquid fill record.

    Hyperliquid fills include:
    - coin: Symbol (e.g., "BTC", "ETH")
    - px: Price
    - sz: Size (in coin units)
    - side: "A" (Ask/Sell) or "B" (Bid/Buy)
    - time: Timestamp in milliseconds
    - closedPnl: Realized PnL for this fill
    - fee: Trading fee
    - dir: Direction ("Open Long", "Close Long", "Open Short", "Close Short")
    - hash: Transaction hash
    - oid: Order ID
    - tid: Trade ID

    NOTE: Hyperliquid does NOT include leverage in fill data.
    Use default leverage or fetch from clearinghouseState for current positions.

    Returns trade in standard format for Supabase.
    """
    # Extract timestamp
    time_ms = int(fill.get("time", 0))
    if time_ms > 0:
        trade_date = datetime.utcfromtimestamp(time_ms / 1000).isoformat() + "Z"
    else:
        trade_date = datetime.utcnow().isoformat() + "Z"

    # Symbol format: BTC -> BTC-USDC (Hyperliquid uses USDC as settlement)
    coin = str(fill.get("coin", "")).upper()
    symbol = f"{coin}-USDC"

    # Direction/Side mapping
    # Hyperliquid uses "A" (Ask/Sell) and "B" (Bid/Buy)
    # Also has "dir" field: "Open Long", "Close Long", "Open Short", "Close Short"
    side_raw = fill.get("side", "B")
    direction = fill.get("dir", "")

    # Determine if it's a long or short based on direction
    if "Long" in direction:
        side = "BUY"
    elif "Short" in direction:
        side = "SELL"
    else:
        # Fallback to side field
        side = "SELL" if side_raw == "A" else "BUY"

    # Extract trade data
    price = float(fill.get("px", 0))
    size = float(fill.get("sz", 0))
    pnl_usd = float(fill.get("closedPnl", 0))
    fee = float(fill.get("fee", 0))

    # Skip invalid fills
    if price == 0 or size == 0:
        return None

    # For Hyperliquid, each fill could be an open or close
    # closedPnl is only non-zero for closing trades
    is_closing = "Close" in direction or pnl_usd != 0

    # Hyperliquid doesn't provide leverage in fills
    # Use default (user can update via leverage settings)
    leverage = default_leverage

    # Calculate position value
    position_value = price * size

    # Calculate PnL percentage (only meaningful for closing trades)
    if pnl_usd != 0 and position_value > 0 and leverage > 0:
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
        "date": trade_date,
        "exit_date": trade_date,  # Single fill - same time
        "symbol": symbol,
        "side": side,
        "entry": round_value(price, 8),
        "exit": round_value(price, 8),
        "size": round_value(size, 8),
        "leverage": round_value(leverage, 2),
        "fees": round_value(fee, 8),
        "pnl_usd": round_value(pnl_usd, 2),
        "pnl_pct": round_value(pnl_pct, 4),
        "is_closing": is_closing,
        "direction": direction,
        "tx_hash": fill.get("hash", ""),
        "trade_id": str(fill.get("tid", "")),
    }


def aggregate_hyperliquid_fills(fills: List[Dict[str, Any]], default_leverage: float = 10.0) -> List[Dict[str, Any]]:
    """
    Aggregate Hyperliquid fills into complete trades (open + close pairs).

    Hyperliquid returns individual fills. We need to match:
    - Open Long + Close Long = Complete long trade
    - Open Short + Close Short = Complete short trade

    Args:
        fills: List of raw fill records from Hyperliquid API
        default_leverage: Default leverage to use (Hyperliquid doesn't provide this)

    Returns:
        List of aggregated trades ready for Supabase
    """
    # Group fills by coin and direction
    positions: Dict[str, Dict[str, Any]] = {}
    completed_trades: List[Dict[str, Any]] = []

    # Sort fills by time (oldest first)
    sorted_fills = sorted(fills, key=lambda x: int(x.get("time", 0)))

    for fill in sorted_fills:
        calculated = calculate_hyperliquid_trade_fields(fill, default_leverage)
        if not calculated:
            continue

        coin = str(fill.get("coin", "")).upper()
        direction = fill.get("dir", "")

        # Handle opens
        if "Open" in direction:
            key = f"{coin}_{calculated['side']}"

            if key not in positions:
                positions[key] = {
                    "coin": coin,
                    "side": calculated["side"],
                    "entries": [],
                    "total_size": 0,
                    "total_cost": 0,
                    "entry_time": calculated["date"],
                    "fees": 0,
                }

            pos = positions[key]
            pos["entries"].append(calculated)
            pos["total_size"] += calculated["size"]
            pos["total_cost"] += calculated["entry"] * calculated["size"]
            pos["fees"] += calculated["fees"]

        # Handle closes
        elif "Close" in direction:
            # Find matching open position
            key = f"{coin}_{calculated['side']}"

            if key in positions and positions[key]["total_size"] > 0:
                pos = positions[key]

                # Calculate average entry price
                avg_entry = pos["total_cost"] / pos["total_size"] if pos["total_size"] > 0 else 0

                # Create completed trade
                trade = {
                    "symbol": calculated["symbol"],
                    "side": calculated["side"],
                    "entry_price": round(avg_entry, 8),
                    "exit_price": calculated["exit"],
                    "quantity": round(min(calculated["size"], pos["total_size"]), 8),
                    "leverage": default_leverage,
                    "fees": round(pos["fees"] + calculated["fees"], 8),
                    "pnl_usd": calculated["pnl_usd"],
                    "entry_time": pos["entry_time"],
                    "exit_time": calculated["date"],
                    "exchange": "hyperliquid",
                }

                # Calculate PnL percentage
                if trade["entry_price"] > 0 and trade["quantity"] > 0 and default_leverage > 0:
                    position_value = trade["entry_price"] * trade["quantity"]
                    margin_used = position_value / default_leverage
                    trade["pnl_percent"] = round((trade["pnl_usd"] / margin_used) * 100, 4) if margin_used > 0 else 0
                else:
                    trade["pnl_percent"] = 0

                completed_trades.append(trade)

                # Update position
                pos["total_size"] -= calculated["size"]
                if pos["total_size"] <= 0:
                    del positions[key]
                else:
                    pos["total_cost"] = avg_entry * pos["total_size"]
                    pos["fees"] = 0  # Reset fees for remaining position

            else:
                # Close without matching open - treat as standalone trade
                trade = {
                    "symbol": calculated["symbol"],
                    "side": calculated["side"],
                    "entry_price": calculated["entry"],
                    "exit_price": calculated["exit"],
                    "quantity": round(calculated["size"], 8),
                    "leverage": default_leverage,
                    "fees": round(calculated["fees"], 8),
                    "pnl_usd": calculated["pnl_usd"],
                    "entry_time": calculated["date"],
                    "exit_time": calculated["date"],
                    "exchange": "hyperliquid",
                    "pnl_percent": calculated["pnl_pct"],
                }
                completed_trades.append(trade)

    print(f"Aggregated {len(fills)} fills into {len(completed_trades)} completed trades")
    return completed_trades
