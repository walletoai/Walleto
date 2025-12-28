from typing import List, Dict, Any
from backtest.data.loader import load_ohlcv_with_indicators


def load_master_dataset(
    symbol: str,
    start_ts_ms: int,
    end_ts_ms: int,
    timeframe: str = "1h"
) -> List[Dict[str, Any]]:
    """
    Unified OHLCV + indicators loader for the backtest engine.

    Returns a list of dicts:
    { timestamp, open, high, low, close, volume, indicator1, indicator2, ... }
    """

    df = load_ohlcv_with_indicators(symbol, timeframe)

    # Filter by timestamp range
    df = df[(df["open_time"].astype("int64") // 1_000_000) >= start_ts_ms]
    df = df[(df["open_time"].astype("int64") // 1_000_000) <= end_ts_ms]

    df = df.sort_values("open_time")

    # Convert to engine row format
    rows: List[Dict[str, Any]] = []
    for _, row in df.iterrows():
        rows.append({
            "timestamp": int(row["open_time"].timestamp() * 1000),
            "open": float(row["open"]),
            "high": float(row["high"]),
            "low": float(row["low"]),
            "close": float(row["close"]),
            "volume": float(row["volume"]),
            "ema_20": row.get("ema_20"),
            "ema_50": row.get("ema_50"),
            "ema_200": row.get("ema_200"),
            "sma_20": row.get("sma_20"),
            "sma_50": row.get("sma_50"),
            "rsi_14": row.get("rsi_14"),
            "funding_rate": row.get("funding_rate", 0.0),
        })

    return rows
