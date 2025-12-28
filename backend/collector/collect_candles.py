import asyncio
from datetime import datetime, timedelta, timezone
from typing import Optional, Tuple

from sqlalchemy import func

from app.db import get_db
from app.models import Candle
from app.binance_client import fetch_klines

SYMBOLS = ["BTCUSDT", "ETHUSDT", "SOLUSDT", "BNBUSDT", "XRPUSDT", "DOGEUSDT"]
TIMEFRAMES = ["15m", "1h", "4h"]

START_DATE = datetime(2019, 1, 1, tzinfo=timezone.utc)
BATCH_WINDOW = timedelta(days=3)
BACKFILL_WINDOW = timedelta(days=30)
RATE_LIMIT_DELAY = 0.4

TIMEFRAME_DELTAS = {
    "15m": timedelta(minutes=15),
    "1h": timedelta(hours=1),
    "4h": timedelta(hours=4),
}


def ensure_aware(dt: Optional[datetime]) -> Optional[datetime]:
    if dt is None:
        return None
    if dt.tzinfo is None:
        return dt.replace(tzinfo=timezone.utc)
    return dt.astimezone(timezone.utc)


def align_open_time(ts: datetime, timeframe: str) -> datetime:
    ts = ts.replace(second=0, microsecond=0)
    if timeframe == "15m":
        minute = (ts.minute // 15) * 15
        return ts.replace(minute=minute)
    if timeframe == "1h":
        return ts.replace(minute=0)
    if timeframe == "4h":
        hour = (ts.hour // 4) * 4
        return ts.replace(hour=hour, minute=0)
    return ts


async def fetch_range(
    db, symbol: str, timeframe: str, range_start: datetime, range_end: datetime
) -> int:
    """Fetch candles for a time range in batched windows."""
    total_inserted = 0
    batch_start = range_start

    while batch_start < range_end:
        batch_end = min(batch_start + BATCH_WINDOW, range_end)
        candles = await fetch_klines(symbol, timeframe, batch_start, batch_end)

        if not candles:
            break

        print(
            f"[{symbol} {timeframe}] batch {batch_start.isoformat()} → "
            f"{batch_end.isoformat()} ({len(candles)} candles)"
        )

        for candle in candles:
            open_time = datetime.fromtimestamp(
                candle["open_time"] / 1000, tz=timezone.utc
            )
            open_time = align_open_time(open_time, timeframe)

            db.merge(
                Candle(
                    symbol=symbol.upper(),
                    timeframe=timeframe,
                    open_time=open_time,
                    open=candle["open"],
                    high=candle["high"],
                    low=candle["low"],
                    close=candle["close"],
                    volume=candle["volume"],
                )
            )

        db.commit()
        total_inserted += len(candles)

        last_ts = datetime.fromtimestamp(
            candles[-1]["open_time"] / 1000, tz=timezone.utc
        )
        batch_start = last_ts + timedelta(milliseconds=1)

        await asyncio.sleep(RATE_LIMIT_DELAY)

    return total_inserted


def timeframe_delta(timeframe: str) -> timedelta:
    delta = TIMEFRAME_DELTAS.get(timeframe)
    if not delta:
        raise ValueError(f"Unsupported timeframe: {timeframe}")
    return delta


def fetch_existing_bounds(db, symbol: str, timeframe: str) -> Tuple[Optional[datetime], Optional[datetime]]:
    earliest, latest = (
        db.query(
            func.min(Candle.open_time),
            func.max(Candle.open_time),
        )
        .filter(Candle.symbol == symbol.upper(), Candle.timeframe == timeframe)
        .one()
    )
    return ensure_aware(earliest), ensure_aware(latest)


async def backfill_history(db, symbol: str, timeframe: str, earliest: datetime) -> None:
    if earliest <= START_DATE:
        return

    backfill_end = earliest - timedelta(milliseconds=1)

    while backfill_end > START_DATE:
        backfill_start = max(START_DATE, backfill_end - BACKFILL_WINDOW)
        inserted = await fetch_range(db, symbol, timeframe, backfill_start, backfill_end)
        if inserted == 0:
            break
        backfill_end = backfill_start - timedelta(milliseconds=1)


async def forward_sync(db, symbol: str, timeframe: str, latest: Optional[datetime]) -> None:
    start_time = (latest + timeframe_delta(timeframe)) if latest else START_DATE
    end_time = datetime.now(timezone.utc)
    if start_time >= end_time:
        return
    await fetch_range(db, symbol, timeframe, start_time, end_time)


async def sync_symbol_timeframe(db, symbol: str, timeframe: str):
    symbol = symbol.upper()
    timeframe = timeframe.lower()
    print(f"🔹 Syncing {symbol} {timeframe}")

    earliest, latest = fetch_existing_bounds(db, symbol, timeframe)

    if earliest:
        await backfill_history(db, symbol, timeframe, earliest)

    await forward_sync(db, symbol, timeframe, latest)

    print(f"✅ Completed {symbol} {timeframe}")


async def main_async():
    db = next(get_db())
    try:
        for symbol in SYMBOLS:
            for timeframe in TIMEFRAMES:
                await sync_symbol_timeframe(db, symbol, timeframe)
    finally:
        db.close()


def main():
    asyncio.run(main_async())


if __name__ == "__main__":
    main()
