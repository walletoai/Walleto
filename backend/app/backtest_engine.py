from __future__ import annotations

from dataclasses import dataclass
from datetime import datetime, timezone
from typing import List, Literal, Optional

from sqlalchemy.orm import Session

from .models import Candle, FundingRate
from .db import SessionLocal

Side = Literal["long", "short"]


@dataclass
class BacktestTradeData:
    entry_time: datetime
    exit_time: datetime
    side: Side
    entry_price: float
    exit_price: float
    return_pct: float


@dataclass
class BacktestSummaryData:
    total_trades: int
    wins: int
    losses: int
    win_rate: float
    avg_return_pct: float
    total_return_pct: float


@dataclass
class BacktestResultData:
    summary: BacktestSummaryData
    trades: List[BacktestTradeData]


def _compute_return_pct(side: Side, entry: float, exit: float) -> float:
    if side == "long":
        return (exit - entry) / entry
    else:
        return (entry - exit) / entry


def run_funding_threshold_strategy(
    db: Session,
    *,
    symbol: str,
    timeframe: str,
    start: datetime,
    end: datetime,
    side: Side,
    funding_threshold: float,
    take_profit_pct: float,
    stop_loss_pct: float,
    max_bars: int,
) -> BacktestResultData:
    """
    Very simple strategy:

    - Use candles for given symbol/timeframe between start/end.
    - For each candle, look up the latest funding_rate <= candle.open_time.
    - Entry rule:
        * side == "long": enter when funding_rate <= funding_threshold
        * side == "short": enter when funding_rate >= funding_threshold
    - Once in a position:
        * track per-candle return based on candle.close.
        * exit on TP or SL or when max_bars have passed.
    """

    candles: List[Candle] = (
        db.query(Candle)
        .filter(
            Candle.symbol == symbol.upper(),
            Candle.timeframe == timeframe,
            Candle.open_time >= start,
            Candle.open_time < end,
        )
        .order_by(Candle.open_time.asc())
        .all()
    )

    if not candles:
        return BacktestResultData(
            summary=BacktestSummaryData(
                total_trades=0,
                wins=0,
                losses=0,
                win_rate=0.0,
                avg_return_pct=0.0,
                total_return_pct=0.0,
            ),
            trades=[],
        )

    fundings: List[FundingRate] = (
        db.query(FundingRate)
        .filter(
            FundingRate.symbol == symbol.upper(),
            FundingRate.funding_time >= start,
            FundingRate.funding_time <= end,
        )
        .order_by(FundingRate.funding_time.asc())
        .all()
    )

    # Pointer into funding array so we can walk forward once.
    funding_idx = 0
    current_funding: Optional[FundingRate] = None

    def advance_funding_until(time: datetime) -> Optional[FundingRate]:
        nonlocal funding_idx, current_funding
        while (
            funding_idx < len(fundings)
            and fundings[funding_idx].funding_time <= time
        ):
            current_funding = fundings[funding_idx]
            funding_idx += 1
        return current_funding

    trades: List[BacktestTradeData] = []

    in_position = False
    entry_price = 0.0
    entry_time: Optional[datetime] = None
    bars_held = 0

    for candle in candles:
        # Update funding pointer
        current_funding = advance_funding_until(candle.open_time)

        # If not in a trade, check entry condition
        if not in_position:
            if current_funding is None:
                continue

            rate = float(current_funding.funding_rate)
            enter = False
            if side == "long" and rate <= funding_threshold:
                enter = True
            elif side == "short" and rate >= funding_threshold:
                enter = True

            if enter:
                in_position = True
                entry_price = float(candle.open)
                entry_time = candle.open_time
                bars_held = 0
            continue

        # If we ARE in a trade, see if we should exit on this candle's close
        bars_held += 1
        current_price = float(candle.close)
        ret = _compute_return_pct(side, entry_price, current_price)

        exit_reason = None
        if ret >= take_profit_pct:
            exit_reason = "tp"
        elif ret <= stop_loss_pct:
            exit_reason = "sl"
        elif bars_held >= max_bars:
            exit_reason = "time"

        if exit_reason is not None and entry_time is not None:
            trades.append(
                BacktestTradeData(
                    entry_time=entry_time,
                    exit_time=candle.open_time,
                    side=side,
                    entry_price=entry_price,
                    exit_price=current_price,
                    return_pct=ret,
                )
            )
            in_position = False
            entry_time = None
            entry_price = 0.0
            bars_held = 0

    # If still in position at the very end, close at last candle
    if in_position and entry_time is not None and candles:
        last = candles[-1]
        current_price = float(last.close)
        ret = _compute_return_pct(side, entry_price, current_price)
        trades.append(
            BacktestTradeData(
                entry_time=entry_time,
                exit_time=last.open_time,
                side=side,
                entry_price=entry_price,
                exit_price=current_price,
                return_pct=ret,
            )
        )

    total_trades = len(trades)
    if total_trades == 0:
        summary = BacktestSummaryData(
            total_trades=0,
            wins=0,
            losses=0,
            win_rate=0.0,
            avg_return_pct=0.0,
            total_return_pct=0.0,
        )
        return BacktestResultData(summary=summary, trades=[])

    wins = sum(1 for t in trades if t.return_pct > 0)
    losses = total_trades - wins
    win_rate = wins / total_trades if total_trades > 0 else 0.0
    avg_return_pct = sum(t.return_pct for t in trades) / total_trades

    total_return_factor = 1.0
    for t in trades:
        total_return_factor *= (1.0 + t.return_pct)
    total_return_pct = total_return_factor - 1.0

    summary = BacktestSummaryData(
        total_trades=total_trades,
        wins=wins,
        losses=losses,
        win_rate=win_rate,
        avg_return_pct=avg_return_pct,
        total_return_pct=total_return_pct,
    )

    return BacktestResultData(summary=summary, trades=trades)


def run_funding_threshold_backtest(
    *,
    symbol: str,
    timeframe: str,
    start: str,
    end: str,
    side: Side,
    funding_threshold: float,
    tp_pct: float,
    sl_pct: float,
    max_bars: int,
) -> dict:
    """Helper that runs the strategy and returns plain dict output."""

    db = SessionLocal()
    try:
        start_dt = datetime.fromisoformat(start).replace(tzinfo=timezone.utc)
        end_dt = datetime.fromisoformat(end).replace(tzinfo=timezone.utc)

        result = run_funding_threshold_strategy(
            db,
            symbol=symbol,
            timeframe=timeframe,
            start=start_dt,
            end=end_dt,
            side=side,
            funding_threshold=funding_threshold,
            take_profit_pct=tp_pct,
            stop_loss_pct=sl_pct,
            max_bars=max_bars,
        )

        return {
            "summary": {
                "total_trades": result.summary.total_trades,
                "wins": result.summary.wins,
                "losses": result.summary.losses,
                "win_rate": result.summary.win_rate,
                "avg_return_pct": result.summary.avg_return_pct,
                "total_return_pct": result.summary.total_return_pct,
            },
            "trades": [
                {
                    "entry_timestamp": int(t.entry_time.timestamp() * 1000),
                    "exit_timestamp": int(t.exit_time.timestamp() * 1000),
                    "side": t.side,
                    "entry_price": t.entry_price,
                    "exit_price": t.exit_price,
                    "return_pct": t.return_pct,
                }
                for t in result.trades
            ],
        }
    finally:
        db.close()
