# app/schemas.py
from datetime import datetime
from typing import Any, List, Literal, Optional
from pydantic import BaseModel, Field


class Candle(BaseModel):
    timestamp: int  # ms since epoch
    open: float
    high: float
    low: float
    close: float
    volume: float


class FundingPoint(BaseModel):
    timestamp: int  # ms since epoch
    rate: float


class IndicatorPoint(BaseModel):
    """
    Generic timeseries point for a single indicator.
    """
    timestamp: int
    value: float | None


class FundingSummary(BaseModel):
    symbol: str
    start_timestamp: int  # ms since epoch (UTC) for the first included funding point
    end_timestamp: int  # ms since epoch (UTC) for the last included funding point
    avg_rate: float  # simple average funding rate over the window
    max_rate: float  # maximum funding rate in the window
    min_rate: float  # minimum funding rate in the window
    pos_count: int  # number of funding prints > 0
    neg_count: int  # number of funding prints < 0
    mean_abs_rate: float  # mean of absolute funding rate (average “intensity”)
    cumulative_rate: float  # sum of funding rates over the window


class CandleWithIndicators(Candle):
    # All optional because leading values will be None
    rsi_14: Optional[float] = None
    ema_20: Optional[float] = None
    ema_50: Optional[float] = None
    atr_14: Optional[float] = None
    vwap: Optional[float] = None


class MergedResponse(BaseModel):
    symbol: str
    timeframe: str
    candles: List[CandleWithIndicators]
    funding: List[FundingPoint]


class BacktestRequest(BaseModel):
    """
    Request body for a very simple funding-based strategy.

    - symbol: e.g. "BTCUSDT"
    - timeframe: e.g. "1h"
    - start/end: YYYY-MM-DD (UTC date range)
    - side: "long" or "short"
    - funding_threshold: trigger level for funding rate
        * long: enter when funding_rate <= funding_threshold
        * short: enter when funding_rate >= funding_threshold
    - take_profit_pct / stop_loss_pct: expressed as decimals (0.03 = 3%)
    - max_bars: maximum number of candles to hold the trade
    """

    symbol: str
    timeframe: str
    start: str  # "YYYY-MM-DD"
    end: str  # "YYYY-MM-DD"
    side: Literal["long", "short"]
    funding_threshold: float
    take_profit_pct: float
    stop_loss_pct: float
    max_bars: int = Field(..., ge=1, le=500)


class BacktestTrade(BaseModel):
    entry_timestamp: int
    exit_timestamp: int
    side: Literal["long", "short"]
    entry_price: float
    exit_price: float
    return_pct: float


class BacktestSummary(BaseModel):
    total_trades: int
    wins: int
    losses: int
    win_rate: float
    avg_return_pct: float
    total_return_pct: float


class EquityPoint(BaseModel):
    timestamp: int
    equity: float


class MonthlyReturn(BaseModel):
    year: int
    month: int
    return_pct: float


class BacktestAnalytics(BaseModel):
    equity_curve: List[EquityPoint]
    max_drawdown_pct: float
    avg_win_pct: float
    avg_loss_pct: float
    best_trade_pct: float
    worst_trade_pct: float
    longest_win_streak: int
    longest_loss_streak: int
    monthly_returns: List[MonthlyReturn]


class BacktestResult(BaseModel):
    summary: BacktestSummary
    trades: List[BacktestTrade]
    analytics: BacktestAnalytics


class FundingBacktestRequest(BacktestRequest):
    """Alias for funding-specific backtest requests."""
    pass


class FundingBacktestResponse(BaseModel):
    summary: BacktestSummary
    trades: List[BacktestTrade]
    analytics: BacktestAnalytics


class AsyncFundingBacktestResponse(BaseModel):
    job_id: int
    status: Literal["pending", "running", "completed", "failed"]


class FundingBacktestJobResult(BaseModel):
    job_id: int
    status: Literal["pending", "running", "completed", "failed"]
    summary: Optional[BacktestSummary] = None
    trades: Optional[list[BacktestTrade]] = None
    error: Optional[str] = None
