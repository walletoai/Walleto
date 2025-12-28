from typing import List, Literal, Optional

from pydantic import BaseModel


ConditionOp = Literal["<", "<=", ">", ">=", "==", "crosses_above", "crosses_below"]

IndicatorName = Literal[
    "funding_rate",
    "rsi_14",
    "ema_50",
    "ema_200",
    "atr",
    "price_change_1h",
    "price_change_4h",
    "long_short_ratio",
    "cvd_basic",
    "rsi_14_4h",
    "rsi_14_1d",
    "ema_50_4h",
    "ema_200_1d",
]

ExitType = Literal[
    "stop_loss_pct",
    "take_profit_pct",
    "time_bars",
]


class IndicatorRule(BaseModel):
    indicator: IndicatorName
    condition: ConditionOp
    value: float


class ExitRule(BaseModel):
    type: ExitType
    value: float  # for pct rules: e.g. -0.02, 0.03; for time_bars: integer bars as float


class TimeFilter(BaseModel):
    start_hour_utc: int = 0  # 0-23
    end_hour_utc: int = 23  # 0-23


class StrategyConfig(BaseModel):
    entry_rules: List[IndicatorRule]
    exit_rules: List[ExitRule]
    time_filter: Optional[TimeFilter] = None
    allow_short: bool = False  # if true, can flip between long/short later


class BacktestRunRequest(BaseModel):
    symbol: str  # e.g. "BTC/USDT"
    timeframe: str = "1h"  # e.g. "1h", "4h", "1d"
    start: str  # ISO date "YYYY-MM-DD"
    end: str  # ISO date "YYYY-MM-DD"
    strategy: StrategyConfig
    position_size: float = 1.0  # nominal size
    slippage_pct: float = 0.0005  # 0.05% default


class PortfolioBacktestRequest(BaseModel):
    symbols: List[str]
    start: str
    end: str
    strategy: StrategyConfig
    position_size: float = 1.0
    slippage_pct: float = 0.0005


class WalkForwardRequest(BaseModel):
    symbol: str
    start: str
    end: str
    window_days: int
    step_days: int
    strategy: StrategyConfig
    position_size: float = 1.0
    slippage_pct: float = 0.0005
