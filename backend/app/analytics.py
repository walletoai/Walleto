# app/analytics.py
from __future__ import annotations

from collections import defaultdict
from datetime import datetime
from typing import List

from .schemas import (
    BacktestTrade,
    EquityPoint,
    MonthlyReturn,
    BacktestAnalytics,
)


def _sorted_trades(trades: List[BacktestTrade]) -> List[BacktestTrade]:
    """
    Make sure trades are sorted in time order by exit_timestamp.
    """
    return sorted(trades, key=lambda t: t.exit_timestamp)


def compute_equity_curve(trades: List[BacktestTrade]) -> List[EquityPoint]:
    """
    Build a compounded equity curve starting from 1.0.
    Each point is recorded at the trade's exit_timestamp.
    """
    trades_sorted = _sorted_trades(trades)
    equity = 1.0
    curve: List[EquityPoint] = []

    for t in trades_sorted:
        equity *= 1.0 + t.return_pct
        curve.append(
            EquityPoint(
                timestamp=t.exit_timestamp,
                equity=equity,
            )
        )

    return curve


def compute_drawdown(equity_curve: List[EquityPoint]) -> float:
    """
    Compute max drawdown (peak-to-trough) from an equity curve.
    Returns a negative percentage (e.g. -0.25 for -25%) or 0.0 if no drawdown.
    """
    if not equity_curve:
        return 0.0

    peak = equity_curve[0].equity
    max_dd = 0.0

    for point in equity_curve:
        if point.equity > peak:
            peak = point.equity
        drawdown = (point.equity - peak) / peak
        if drawdown < max_dd:
            max_dd = drawdown

    return max_dd


def compute_win_loss_stats(trades: List[BacktestTrade]) -> dict:
    """
    Average win, average loss, best and worst trade.
    All values are in raw decimal returns (0.05 = +5%).
    """
    if not trades:
        return {
            "avg_win_pct": 0.0,
            "avg_loss_pct": 0.0,
            "best_trade_pct": 0.0,
            "worst_trade_pct": 0.0,
        }

    wins = [t.return_pct for t in trades if t.return_pct > 0]
    losses = [t.return_pct for t in trades if t.return_pct < 0]

    avg_win = sum(wins) / len(wins) if wins else 0.0
    avg_loss = sum(losses) / len(losses) if losses else 0.0

    best_trade = max((t.return_pct for t in trades), default=0.0)
    worst_trade = min((t.return_pct for t in trades), default=0.0)

    return {
        "avg_win_pct": avg_win,
        "avg_loss_pct": avg_loss,
        "best_trade_pct": best_trade,
        "worst_trade_pct": worst_trade,
    }


def compute_streaks(trades: List[BacktestTrade]) -> dict:
    """
    Longest win and loss streaks in a row.
    """
    trades_sorted = _sorted_trades(trades)

    longest_win = 0
    longest_loss = 0
    current_win = 0
    current_loss = 0

    for t in trades_sorted:
        if t.return_pct > 0:
            current_win += 1
            current_loss = 0
        elif t.return_pct < 0:
            current_loss += 1
            current_win = 0
        else:
            # flat trade resets both
            current_win = 0
            current_loss = 0

        longest_win = max(longest_win, current_win)
        longest_loss = max(longest_loss, current_loss)

    return {
        "longest_win_streak": longest_win,
        "longest_loss_streak": longest_loss,
    }


def compute_monthly_returns(trades: List[BacktestTrade]) -> List[MonthlyReturn]:
    """
    Group trades by year-month (based on exit_timestamp) and compute
    compounded monthly returns: product(1 + r_i) - 1 for each month.
    """
    if not trades:
        return []

    trades_sorted = _sorted_trades(trades)
    buckets: dict[tuple[int, int], list[BacktestTrade]] = defaultdict(list)

    for t in trades_sorted:
        dt = datetime.utcfromtimestamp(t.exit_timestamp / 1000.0)
        key = (dt.year, dt.month)
        buckets[key].append(t)

    monthly: List[MonthlyReturn] = []

    for (year, month), bucket_trades in sorted(buckets.items()):
        equity = 1.0
        for t in bucket_trades:
            equity *= 1.0 + t.return_pct
        monthly_return = equity - 1.0
        monthly.append(
            MonthlyReturn(
                year=year,
                month=month,
                return_pct=monthly_return,
            )
        )

    return monthly


def build_backtest_analytics(trades: List[BacktestTrade]) -> BacktestAnalytics:
    """
    Convenience helper: compute everything and return a BacktestAnalytics object.
    """
    equity_curve = compute_equity_curve(trades)
    max_dd = compute_drawdown(equity_curve)
    wl_stats = compute_win_loss_stats(trades)
    streaks = compute_streaks(trades)
    monthly = compute_monthly_returns(trades)

    return BacktestAnalytics(
        equity_curve=equity_curve,
        max_drawdown_pct=max_dd,
        avg_win_pct=wl_stats["avg_win_pct"],
        avg_loss_pct=wl_stats["avg_loss_pct"],
        best_trade_pct=wl_stats["best_trade_pct"],
        worst_trade_pct=wl_stats["worst_trade_pct"],
        longest_win_streak=streaks["longest_win_streak"],
        longest_loss_streak=streaks["longest_loss_streak"],
        monthly_returns=monthly,
    )
