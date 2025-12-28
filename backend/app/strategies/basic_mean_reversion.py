from __future__ import annotations

from typing import Any, Dict, List

from app.indicators import compute_rsi


def run_strategy(candles: List[Dict[str, Any]]) -> Dict[str, Any]:
    """Run a basic mean reversion strategy using RSI(14)."""
    if not candles:
        return {
            "trades": [],
            "pnl_curve": [],
            "summary": {
                "total_return": 0.0,
                "winrate": 0.0,
                "max_drawdown": 0.0,
                "trade_count": 0,
            },
        }

    closes = [float(candle["close"]) for candle in candles]
    rsis = compute_rsi(closes, period=14)

    trades: List[Dict[str, Any]] = []
    pnl_curve: List[float] = []
    running_pnl = 0.0
    peak = 0.0
    max_drawdown = 0.0

    position: Dict[str, Any] | None = None

    for idx, candle in enumerate(candles):
        rsi_value = rsis[idx]
        close_price = float(candle["close"])
        timestamp = candle.get("timestamp")

        if position and rsi_value is not None and rsi_value > 70:
            pnl = close_price - position["entry_price"]
            running_pnl += pnl
            trades.append(
                {
                    "entry_time": position["entry_time"],
                    "entry_price": position["entry_price"],
                    "exit_time": timestamp,
                    "exit_price": close_price,
                    "pnl": pnl,
                }
            )
            position = None

        if position is None and rsi_value is not None and rsi_value < 30:
            position = {
                "entry_time": timestamp,
                "entry_price": close_price,
            }

        pnl_curve.append(running_pnl)
        if running_pnl > peak:
            peak = running_pnl
        drawdown = peak - running_pnl
        if drawdown > max_drawdown:
            max_drawdown = drawdown

    if position:\n        # Mark-to-market exit on last candle
        close_price = float(candles[-1]["close"])
        timestamp = candles[-1].get("timestamp")
        pnl = close_price - position["entry_price"]
        running_pnl += pnl
        trades.append(
            {
                "entry_time": position["entry_time"],
                "entry_price": position["entry_price"],
                "exit_time": timestamp,
                "exit_price": close_price,
                "pnl": pnl,
            }
        )
        pnl_curve[-1] = running_pnl
        if running_pnl > peak:
            peak = running_pnl
        drawdown = peak - running_pnl
        if drawdown > max_drawdown:
            max_drawdown = drawdown

    trade_count = len(trades)
    wins = sum(1 for trade in trades if trade["pnl"] > 0)
    winrate = wins / trade_count if trade_count else 0.0

    summary = {
        "total_return": running_pnl,
        "winrate": winrate,
        "max_drawdown": max_drawdown,
        "trade_count": trade_count,
    }

    return {
        "trades": trades,
        "pnl_curve": pnl_curve,
        "summary": summary,
    }
