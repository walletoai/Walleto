# app/binance_client.py
import httpx
from datetime import datetime, timezone
from typing import List

BINANCE_FUTURES_URL = "https://fapi.binance.com"


def timeframe_to_binance_interval(tf: str) -> str:
    # our local tf already matches Binance
    return tf


async def fetch_klines(symbol, interval, start_time, end_time=None, limit=1000):
    url = "https://api.binance.com/api/v3/klines"
    start_ms = int(start_time.timestamp() * 1000)
    params = {
        "symbol": symbol,
        "interval": interval,
        "startTime": start_ms,
        "limit": limit,
    }
    if end_time is not None:
        params["endTime"] = int(end_time.timestamp() * 1000)

    async with httpx.AsyncClient(timeout=20) as client:
        response = await client.get(url, params=params)
        response.raise_for_status()
        rows = response.json()

    candles = []
    for r in rows:
        candles.append({
            "symbol": symbol,
            "timeframe": interval,
            "open_time": r[0],
            "open": float(r[1]),
            "high": float(r[2]),
            "low": float(r[3]),
            "close": float(r[4]),
            "volume": float(r[5])
        })

    return candles


async def fetch_funding_rates(symbol, start_time):
    url = "https://fapi.binance.com/fapi/v1/fundingRate"
    start_ms = int(start_time.timestamp() * 1000)
    params = {"symbol": symbol, "startTime": start_ms, "limit": 1000}

    async with httpx.AsyncClient(timeout=20) as client:
        response = await client.get(url, params=params)
        if response.status_code == 400:
            return []
        response.raise_for_status()
        rows = response.json()

    rates = []
    for r in rows:
        rates.append({
            "symbol": symbol,
            "funding_time": r["fundingTime"],
            "rate": float(r["fundingRate"])
        })

    return rates
