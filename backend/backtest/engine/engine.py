from __future__ import annotations

from datetime import datetime, timezone, timedelta
from functools import reduce
from typing import Any, Dict, List, Optional

from backtest.models.strategy_config import (
    BacktestRunRequest,
    IndicatorRule,
    StrategyConfig,
    ExitRule,
    PortfolioBacktestRequest,
    WalkForwardRequest,
)
from backtest.data.history_loader import load_master_dataset


def _evaluate_indicator_rule(
    prev_row: Optional[Dict[str, Any]],
    row: Dict[str, Any],
    rule: IndicatorRule,
) -> bool:
    value = row.get(rule.indicator)
    if value is None:
        return False

    if rule.condition in ("crosses_above", "crosses_below"):
        if prev_row is None:
            return False
        prev_value = prev_row.get(rule.indicator)
        if prev_value is None:
            return False

        if rule.condition == "crosses_above":
            return prev_value <= rule.value and value > rule.value
        else:
            return prev_value >= rule.value and value < rule.value

    if rule.condition == "<":
        return value < rule.value
    if rule.condition == "<=":
        return value <= rule.value
    if rule.condition == ">":
        return value > rule.value
    if rule.condition == ">=":
        return value >= rule.value
    if rule.condition == "==":
        return value == rule.value

    return False


def _time_filter_passes(row: Dict[str, Any], strategy: StrategyConfig) -> bool:
    if strategy.time_filter is None:
        return True

    ts_ms = row["timestamp"]
    dt = datetime.fromtimestamp(ts_ms / 1000, tz=timezone.utc)
    hour = dt.hour

    start_h = strategy.time_filter.start_hour_utc
    end_h = strategy.time_filter.end_hour_utc

    # Simple inclusive range
    return start_h <= hour <= end_h


def _all_entry_rules_pass(
    prev_row: Optional[Dict[str, Any]],
    row: Dict[str, Any],
    strategy: StrategyConfig,
) -> bool:
    if not strategy.entry_rules:
        return False
    if not _time_filter_passes(row, strategy):
        return False

    for rule in strategy.entry_rules:
        if not _evaluate_indicator_rule(prev_row, row, rule):
            return False
    return True


def _should_exit(
    entry_price: float,
    bars_held: int,
    row: Dict[str, Any],
    exit_rules: List[ExitRule],
    side: str,
) -> bool:
    """
    side: "long" or "short"
    """
    close_price = row["close"]
    pnl_pct = (close_price - entry_price) / entry_price
    if side == "short":
        pnl_pct = -pnl_pct

    for rule in exit_rules:
        if rule.type == "stop_loss_pct":
            if pnl_pct <= rule.value:  # e.g. value = -0.02
                return True
        elif rule.type == "take_profit_pct":
            if pnl_pct >= rule.value:  # e.g. value = 0.03
                return True
        elif rule.type == "time_bars":
            if bars_held >= int(rule.value):
                return True

    return False


def run_backtest(req: BacktestRunRequest) -> Dict[str, Any]:
    """
    Universal backtest runner.
    Returns { summary, trades } compatible with your existing frontend.
    """

    # Convert dates to timestamps
    start_dt = datetime.fromisoformat(req.start).replace(
        tzinfo=timezone.utc
    )
    end_dt = datetime.fromisoformat(req.end).replace(
        tzinfo=timezone.utc
    )
    start_ts_ms = int(start_dt.timestamp() * 1000)
    end_ts_ms = int(end_dt.timestamp() * 1000)

    data = load_master_dataset(
        symbol=req.symbol,
        start_ts_ms=start_ts_ms,
        end_ts_ms=end_ts_ms,
        timeframe=req.timeframe,
    )

    trades: List[Dict[str, Any]] = []

    position_side: Optional[str] = None  # "long" or None (you can extend later for short)
    entry_price: Optional[float] = None
    entry_ts: Optional[int] = None
    bars_held = 0

    prev_row: Optional[Dict[str, Any]] = None

    for row in data:
        if position_side is None:
            # Check entry
            if _all_entry_rules_pass(prev_row, row, req.strategy):
                position_side = "long"  # v1: only long; extend later
                entry_price = float(row["close"])
                entry_ts = int(row["timestamp"])
                bars_held = 0
        else:
            bars_held += 1
            if _should_exit(
                entry_price=entry_price,
                bars_held=bars_held,
                row=row,
                exit_rules=req.strategy.exit_rules,
                side=position_side,
            ):
                exit_price = float(row["close"])
                exit_ts = int(row["timestamp"])

                raw_return = (exit_price - entry_price) / entry_price
                if position_side == "short":
                    raw_return = -raw_return

                # apply slippage
                net_return = raw_return - req.slippage_pct

                trades.append(
                    {
                        "entry_timestamp": entry_ts,
                        "exit_timestamp": exit_ts,
                        "side": position_side,
                        "entry_price": entry_price,
                        "exit_price": exit_price,
                        "return_pct": net_return,
                    }
                )

                position_side = None
                entry_price = None
                entry_ts = None
                bars_held = 0

        prev_row = row

    # If still in position at the end, close on last candle
    if position_side is not None and entry_price is not None and entry_ts is not None:
        last_row = data[-1]
        exit_price = float(last_row["close"])
        exit_ts = int(last_row["timestamp"])
        raw_return = (exit_price - entry_price) / entry_price
        if position_side == "short":
            raw_return = -raw_return
        net_return = raw_return - req.slippage_pct
        trades.append(
            {
                "entry_timestamp": entry_ts,
                "exit_timestamp": exit_ts,
                "side": position_side,
                "entry_price": entry_price,
                "exit_price": exit_price,
                "return_pct": net_return,
            }
        )

    # Build summary compatible with your current API
    total_trades = len(trades)
    wins = sum(1 for t in trades if t["return_pct"] > 0)
    losses = sum(1 for t in trades if t["return_pct"] < 0)
    avg_return = (
        sum(t["return_pct"] for t in trades) / total_trades
        if total_trades > 0
        else 0.0
    )
    total_return = (
        (
            1.0
            if total_trades == 0
            else float(
                reduce(
                    lambda acc, t: acc * (1 + t["return_pct"]),
                    trades,
                    1.0,
                )
            )
        )
        - 1.0
    )

    summary = {
        "total_trades": total_trades,
        "wins": wins,
        "losses": losses,
        "win_rate": wins / total_trades if total_trades > 0 else 0.0,
        "avg_return_pct": avg_return,
        "total_return_pct": total_return,
    }

    return {"summary": summary, "trades": trades}


def run_portfolio_backtest(req: PortfolioBacktestRequest) -> Dict[str, Any]:
    per_symbol: Dict[str, Dict[str, Any]] = {}
    all_trades: List[Dict[str, Any]] = []

    for sym in req.symbols:
        single_req = BacktestRunRequest(
            symbol=sym,
            start=req.start,
            end=req.end,
            strategy=req.strategy,
            position_size=req.position_size,
            slippage_pct=req.slippage_pct,
        )
        result = run_backtest(single_req)
        per_symbol[sym] = result
        all_trades.extend([{**trade, "symbol": sym} for trade in result["trades"]])

    total_trades = len(all_trades)
    wins = sum(1 for trade in all_trades if trade["return_pct"] > 0)
    losses = sum(1 for trade in all_trades if trade["return_pct"] < 0)
    avg_return = (
        sum(trade["return_pct"] for trade in all_trades) / total_trades
        if total_trades > 0
        else 0.0
    )

    equity_mult = reduce(
        lambda acc, trade: acc * (1 + trade["return_pct"]),
        all_trades,
        1.0,
    )
    total_return = equity_mult - 1.0

    summary = {
        "total_trades": total_trades,
        "wins": wins,
        "losses": losses,
        "win_rate": wins / total_trades if total_trades > 0 else 0.0,
        "avg_return_pct": avg_return,
        "total_return_pct": total_return,
    }

    return {
        "summary": summary,
        "trades": all_trades,
        "per_symbol": per_symbol,
    }


def run_walk_forward(req: WalkForwardRequest) -> Dict[str, Any]:
    start_dt = datetime.fromisoformat(req.start).replace(tzinfo=timezone.utc)
    end_dt = datetime.fromisoformat(req.end).replace(tzinfo=timezone.utc)

    window = timedelta(days=req.window_days)
    step = timedelta(days=req.step_days)

    windows: List[Dict[str, Any]] = []
    cur_start = start_dt

    while cur_start < end_dt:
        cur_end = min(cur_start + window, end_dt)
        if cur_end <= cur_start:
            break

        sub_req = BacktestRunRequest(
            symbol=req.symbol,
            start=cur_start.date().isoformat(),
            end=cur_end.date().isoformat(),
            strategy=req.strategy,
            position_size=req.position_size,
            slippage_pct=req.slippage_pct,
        )
        result = run_backtest(sub_req)
        windows.append(
            {
                "start": cur_start.date().isoformat(),
                "end": cur_end.date().isoformat(),
                "summary": result["summary"],
            }
        )

        cur_start = cur_start + step

    return {"windows": windows}
