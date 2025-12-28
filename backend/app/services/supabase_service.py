"""
SupabaseService: Fetches user data from Supabase PostgreSQL database.
Handles trade data retrieval for the coach to analyze user trading history.
"""

import logging
import os
import httpx
from typing import List, Dict, Optional
from datetime import datetime

logger = logging.getLogger(__name__)


class SupabaseService:
    """Service for fetching data from Supabase."""

    def __init__(self):
        self.url = os.getenv("SUPABASE_URL", "").rstrip("/")
        self.key = os.getenv("SUPABASE_KEY", "")

        if not self.url or not self.key:
            logger.warning("Supabase credentials not configured")
            self.available = False
        else:
            self.available = True

    async def get_user_trades(
        self, user_id: str, limit: int = 1000, offset: int = 0
    ) -> List[Dict]:
        """
        Fetch user's trades from Supabase.

        Args:
            user_id: User ID
            limit: Maximum number of trades to fetch
            offset: Pagination offset

        Returns:
            List of trades with all details
        """
        if not self.available:
            logger.warning("Supabase service not available")
            return []

        try:
            logger.info(f"Fetching trades for user {user_id} from Supabase URL: {self.url}")
            # Build REST API URL for trades table
            # Format: {url}/rest/v1/trades?user_id=eq.{user_id}&order=entry_time.desc&limit={limit}&offset={offset}
            query_params = (
                f"user_id=eq.{user_id}&"
                f"order=entry_time.desc&"
                f"limit={limit}&"
                f"offset={offset}"
            )

            url = f"{self.url}/rest/v1/trades?{query_params}"
            logger.info(f"Supabase API URL: {url}")

            async with httpx.AsyncClient() as client:
                response = await client.get(
                    url,
                    headers={
                        "apikey": self.key,
                        "Authorization": f"Bearer {self.key}",
                        "Content-Type": "application/json",
                    },
                    timeout=10.0,
                )

                logger.info(f"Supabase response status: {response.status_code}")
                if response.status_code != 200:
                    logger.error(
                        f"Failed to fetch trades from Supabase: {response.status_code} {response.text}"
                    )
                    return []

                trades = response.json()
                logger.info(f"Received {len(trades) if isinstance(trades, list) else 0} trades from Supabase")

                # Convert to standard format matching SQLAlchemy Trade model
                # Map Supabase column names to expected format
                formatted_trades = []
                for trade in trades:
                    formatted_trades.append({
                        "id": trade.get("id"),
                        "symbol": trade.get("symbol"),
                        "side": trade.get("side"),
                        "date": trade.get("entry_time") or trade.get("date"),
                        "entry": trade.get("entry_price") or trade.get("entry"),
                        "exit": trade.get("exit_price") or trade.get("exit"),
                        "size": trade.get("quantity") or trade.get("size"),
                        "leverage": trade.get("leverage"),
                        "pnl_usd": trade.get("pnl_usd"),
                        "pnl_pct": trade.get("pnl_percent") or trade.get("pnl_pct"),
                        "notes": trade.get("notes"),
                        "fees": trade.get("fees"),
                        "exchange": trade.get("exchange"),
                        "exit_time": trade.get("exit_time"),
                    })

                logger.info(f"Formatted {len(formatted_trades)} trades for user {user_id} from Supabase")
                return formatted_trades

        except Exception as e:
            logger.error(f"Error fetching trades from Supabase: {e}", exc_info=True)
            return []

    async def get_user_statistics(self, user_id: str) -> Dict:
        """
        Calculate user trading statistics from Supabase trades.

        Args:
            user_id: User ID

        Returns:
            Dictionary with statistics
        """
        try:
            trades = await self.get_user_trades(user_id, limit=10000)

            if not trades:
                return {
                    "total_trades": 0,
                    "message": "No trades found. Start tracking trades to enable coach analysis.",
                }

            total_trades = len(trades)
            winning_trades = sum(1 for t in trades if (t.get("pnl_usd") or 0) > 0)
            win_rate = (winning_trades / total_trades * 100) if total_trades > 0 else 0

            total_pnl = sum(t.get("pnl_usd") or 0 for t in trades)
            avg_pnl = total_pnl / total_trades if total_trades > 0 else 0

            pnl_pcts = [t.get("pnl_pct") or 0 for t in trades if t.get("pnl_pct")]
            avg_pnl_pct = sum(pnl_pcts) / len(pnl_pcts) if pnl_pcts else 0

            best_trade = max(trades, key=lambda t: t.get("pnl_usd") or 0) if trades else None
            worst_trade = min(trades, key=lambda t: t.get("pnl_usd") or 0) if trades else None

            # Trades in last 7 days
            from datetime import timedelta
            week_ago = datetime.utcnow() - timedelta(days=7)
            trades_this_week = sum(
                1 for t in trades
                if t.get("date") and datetime.fromisoformat(t.get("date").replace("Z", "+00:00")) >= week_ago
            )

            return {
                "total_trades": total_trades,
                "win_rate_pct": round(win_rate, 2),
                "total_pnl_usd": round(total_pnl, 2),
                "avg_pnl_usd": round(avg_pnl, 2),
                "avg_pnl_pct": round(avg_pnl_pct, 2),
                "best_trade": {
                    "symbol": best_trade.get("symbol"),
                    "pnl_usd": best_trade.get("pnl_usd"),
                    "date": best_trade.get("date"),
                } if best_trade else None,
                "worst_trade": {
                    "symbol": worst_trade.get("symbol"),
                    "pnl_usd": worst_trade.get("pnl_usd"),
                    "date": worst_trade.get("date"),
                } if worst_trade else None,
                "trades_this_week": trades_this_week,
            }

        except Exception as e:
            logger.error(f"Error calculating user statistics from Supabase: {e}")
            return {"error": str(e)}
