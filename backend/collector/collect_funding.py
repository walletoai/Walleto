import asyncio
from datetime import datetime, timedelta, timezone
from app.db import get_db
from app.models import FundingRate
from app.binance_client import fetch_funding_rates

SYMBOLS = ["BTCUSDT", "ETHUSDT", "SOLUSDT", "BNBUSDT", "XRPUSDT", "DOGEUSDT"]
START_DATE = datetime(2019, 1, 1, tzinfo=timezone.utc)


def make_aware(dt):
    if dt.tzinfo is None:
        return dt.replace(tzinfo=timezone.utc)
    return dt


async def sync_symbol(db, symbol):
    print(f"🔹 Syncing funding for {symbol}…")

    latest = (
        db.query(FundingRate)
        .filter(FundingRate.symbol == symbol)
        .order_by(FundingRate.funding_time.desc())
        .first()
    )

    if latest:
        last_time = make_aware(latest.funding_time)
        start_time = last_time + timedelta(hours=1)
    else:
        start_time = START_DATE

    end_time = datetime.now(timezone.utc)

    while start_time < end_time:
        rates = await fetch_funding_rates(symbol, start_time)
        if not rates:
            break

        for r in rates:
            funding_time = datetime.fromtimestamp(
                r["funding_time"] / 1000, tz=timezone.utc
            )
            db.merge(
                FundingRate(
                    symbol=symbol,
                    funding_time=funding_time,
                    funding_rate=r["rate"],
                )
            )

        db.commit()

        last_ts = datetime.fromtimestamp(rates[-1]["funding_time"] / 1000, timezone.utc)
        start_time = last_ts + timedelta(milliseconds=1)

    print(f"✅ Completed funding sync for {symbol}")


async def main_async():
    db = next(get_db())
    for symbol in SYMBOLS:
        await sync_symbol(db, symbol)


def main():
    asyncio.run(main_async())


if __name__ == "__main__":
    main()
