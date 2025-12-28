from __future__ import annotations

import importlib
from datetime import datetime, timezone
from typing import Any, Dict, List, Optional

from sqlalchemy.orm import Session

from app.models import Candle as DBCandle


def _parse_dt(value: Optional[str]) -> Optional[datetime]:
    if value is None:
        return None
    return datetime.fromisoformat(value).replace(tzinfo=timezone.utc)


def run_backtest(
    symbol: str,
    timeframe: str,
    start: Optional[str],
    end: Optional[str],
    strategy_name: str,
    db: Session,
) -> Dict[str, Any]:
    """Run a backtest by loading a strategy dynamically."""
    query = (
        db.query(DBCandle)
        .filter(
            DBCandle.symbol == symbol.upper(),
            DBCandle.timeframe == timeframe,
        )
        .order_by(DBCandle.open_time.asc())
    )

    start_dt = _parse_dt(start)
    if start_dt:
        query = query.filter(DBCandle.open_time >= start_dt)

    end_dt = _parse_dt(end)
    if end_dt:
        query = query.filter(DBCandle.open_time < end_dt)

    rows = query.all()
    candles: List[Dict[str, Any]] = [
        {
            "timestamp": int(row.open_time.timestamp() * 1000),
            "open": float(row.open),
            "high": float(row.high),
            "low": float(row.low),
            "close": float(row.close),
            "volume": float(row.volume),
        }
        for row in rows
    ]

    module = importlib.import_module(f"app.strategies.{strategy_name}")
    strategy = getattr(module, "run_strategy")

    results = strategy(candles)

    return results
