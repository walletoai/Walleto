import pandas as pd
from sqlalchemy import text

from app.db import get_db
from app.indicators import compute_indicators


def load_candles(symbol: str, timeframe: str) -> pd.DataFrame:
    db = next(get_db())
    query = text(
        """
        SELECT open_time, open, high, low, close, volume
        FROM candles
        WHERE symbol = :symbol
          AND timeframe = :tf
        ORDER BY open_time ASC
    """
    )
    rows = db.execute(query, {"symbol": symbol, "tf": timeframe}).fetchall()
    df = pd.DataFrame(
        rows, columns=["open_time", "open", "high", "low", "close", "volume"]
    )
    df["open_time"] = pd.to_datetime(df["open_time"], utc=True)
    return df


def load_funding(symbol: str) -> pd.DataFrame:
    db = next(get_db())
    query = text(
        """
        SELECT funding_time, funding_rate
        FROM funding_rates
        WHERE symbol = :symbol
        ORDER BY funding_time ASC
    """
    )
    rows = db.execute(query, {"symbol": symbol}).fetchall()
    df = pd.DataFrame(rows, columns=["funding_time", "funding_rate"])
    df["funding_time"] = pd.to_datetime(df["funding_time"], utc=True)
    return df


def merge_funding(candles: pd.DataFrame, funding: pd.DataFrame) -> pd.DataFrame:
    funding = funding.rename(columns={"funding_time": "open_time"})
    return candles.merge(funding, on="open_time", how="left").fillna(
        {"funding_rate": 0}
    )


def load_ohlcv_with_indicators(symbol: str, timeframe: str) -> pd.DataFrame:
    candles = load_candles(symbol, timeframe)
    funding = load_funding(symbol)
    df = merge_funding(candles, funding)
    df = compute_indicators(df)
    return df
