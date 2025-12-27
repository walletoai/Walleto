export type IndicatorName =
    | "funding_rate"
    | "rsi_14"
    | "ema_50"
    | "ema_200"
    | "atr"
    | "price_change_1h"
    | "price_change_4h"
    | "long_short_ratio"
    | "cvd_basic"
    | "rsi_14_4h"
    | "rsi_14_1d"
    | "ema_50_4h"
    | "ema_200_1d";

export type ConditionOp =
    | "<"
    | "<="
    | ">"
    | ">="
    | "=="
    | "crosses_above"
    | "crosses_below";

export type ExitType = "stop_loss_pct" | "take_profit_pct" | "time_bars";

export interface IndicatorRule {
    indicator: IndicatorName;
    condition: ConditionOp;
    value: number;
}

export interface ExitRule {
    type: ExitType;
    value: number;
}

export interface TimeFilter {
    start_hour_utc: number;
    end_hour_utc: number;
}

export interface StrategyConfig {
    entry_rules: IndicatorRule[];
    exit_rules: ExitRule[];
    time_filter?: TimeFilter;
    allow_short: boolean;
}

export interface BacktestRunRequest {
    symbol: string;
    timeframe: string;
    start: string;
    end: string;
    strategy: StrategyConfig;
    position_size: number;
    slippage_pct: number;
}
