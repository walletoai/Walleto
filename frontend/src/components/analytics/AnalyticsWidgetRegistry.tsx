import React from 'react';
import { PerformanceSummaryWidget } from './widgets/PerformanceSummaryWidget';
import { EquityCurveWidget } from './widgets/EquityCurveWidget';
import { DrawdownWidget } from './widgets/DrawdownWidget';
import { DailyPnLWidget } from './widgets/DailyPnLWidget';
import { SymbolBreakdownWidget } from './widgets/SymbolBreakdownWidget';
import { SetupBreakdownWidget } from './widgets/SetupBreakdownWidget';
import { LongShortPerformanceWidget } from './widgets/LongShortPerformanceWidget';
import { WinRateTimelineWidget } from './widgets/WinRateTimelineWidget';
import { AssetPnlBreakdownWidget } from './widgets/AssetPnlBreakdownWidget';
import { TradeOutcomeDistributionWidget } from './widgets/TradeOutcomeDistributionWidget';
import { TimeOfDayProfitabilityWidget } from './widgets/TimeOfDayProfitabilityWidget';
import { DayOfWeekProfitabilityWidget } from './widgets/DayOfWeekProfitabilityWidget';
import { TradeFrequencyVsPnlWidget } from './widgets/TradeFrequencyVsPnlWidget';
import { MonthlyHeatstickWidget } from './widgets/MonthlyHeatstickWidget';
import { HoldingTimeVsProfitWidget } from './widgets/HoldingTimeVsProfitWidget';
import { RiskRewardScatterWidget } from './widgets/RiskRewardScatterWidget';
import { ConsecutiveWinsLossesWidget } from './widgets/ConsecutiveWinsLossesWidget';
import { LeverageImpactWidget } from './widgets/LeverageImpactWidget';
import { TradeQualityIndexWidget } from './widgets/TradeQualityIndexWidget';
import { PositionSizeAccuracyWidget } from './widgets/PositionSizeAccuracyWidget';
import { TpVsSlHitRatioWidget } from './widgets/TpVsSlHitRatioWidget';
import { ConfluenceScoreWidget } from './widgets/ConfluenceScoreWidget';
import { RegimeDetectionWidget } from './widgets/RegimeDetectionWidget';
import { RiskMetricsSummaryWidget } from './widgets/RiskMetricsSummaryWidget';
import { ExposureHeatmapWidget } from './widgets/ExposureHeatmapWidget';
import { SlippageAnalysisWidget } from './widgets/SlippageAnalysisWidget';
import { EntryEfficiencyWidget } from './widgets/EntryEfficiencyWidget';
import { LiquidityVsEntryWidget } from './widgets/LiquidityVsEntryWidget';
import { ReactionTimeWidget } from './widgets/ReactionTimeWidget';
import { VolatilityVsPerformanceWidget } from './widgets/VolatilityVsPerformanceWidget';
import { CorrelationMatrixWidget } from './widgets/CorrelationMatrixWidget';
import { MultiLayerCandleMapWidget } from './widgets/MultiLayerCandleMapWidget';
import { FundingRateBiasWidget } from './widgets/FundingRateBiasWidget';
import { DistanceFromAthWidget } from './widgets/DistanceFromAthWidget';
import { RsiOutcomeWidget } from './widgets/RsiOutcomeWidget';
import { StopLossDistanceWidget } from './widgets/StopLossDistanceWidget';

// Widget Types
export type WidgetType =
    | 'PERFORMANCE_SUMMARY'
    | 'EQUITY_CURVE'
    | 'DRAWDOWN'
    | 'DAILY_PNL'
    | 'SYMBOL_BREAKDOWN'
    | 'SETUP_BREAKDOWN'
    | 'WIN_RATE_TIMELINE'
    | 'ASSET_PNL_BREAKDOWN'
    | 'TRADE_OUTCOME_DISTRIBUTION'
    | 'TIME_OF_DAY_PROFITABILITY'
    | 'DAY_OF_WEEK_PROFITABILITY'
    | 'TRADE_FREQUENCY_VS_PNL'
    | 'LONG_SHORT_PERFORMANCE'
    | 'RISK_REWARD_SCATTER' // Phase 2
    | 'CONSECUTIVE_WINS_LOSSES' // Phase 2
    | 'MONTHLY_HEATSTICK' // Phase 2
    | 'HOLDING_TIME_VS_PROFIT' // Phase 2
    | 'VOLATILITY_VS_PERFORMANCE' // Phase 2
    | 'SLIPPAGE_ANALYSIS' // Phase 2
    | 'ENTRY_EFFICIENCY' // Phase 2
    | 'EXPOSURE_HEATMAP' // Phase 2
    | 'LEVERAGE_IMPACT' // Phase 2
    | 'FUNDING_RATE_BIAS' // Phase 2
    | 'DISTANCE_FROM_ATH' // Phase 2
    | 'MULTI_LAYER_CANDLE_MAP' // Phase 2
    | 'TRADE_PATH_REPLAY' // Phase 2
    | 'TRADE_QUALITY_INDEX' // Phase 2
    | 'BENCHMARK_COMPARISON' // Phase 2
    | 'FACTOR_CONTRIBUTION' // Phase 2
    | 'REGIME_DETECTION' // Phase 2
    | 'RISK_METRICS_SUMMARY' // Phase 2
    | 'CORRELATION_MATRIX' // Phase 2
    | 'SHARPE_SORTINO_TIMELINE' // Phase 2
    | 'POSITION_SIZE_ACCURACY' // Phase 2
    | 'CONFLUENCE_SCORE_OUTCOME' // Phase 2
    | 'LIQUIDITY_VS_ENTRY' // Phase 2
    | 'TP_VS_SL_HIT_RATIO' // Phase 2
    | 'OVERBOUGHT_OVERSOLD_OUTCOME' // Phase 2
    | 'STOP_LOSS_DISTANCE' // Phase 2
    | 'REACTION_TIME_HISTOGRAM'; // Phase 2

export interface WidgetDefinition {
    id: WidgetType;
    title: string;
    description: string;
    component: React.FC<any>;
    defaultSize: 'small' | 'medium' | 'large' | 'full';
    category: 'Performance' | 'Risk' | 'Behavior' | 'Execution' | 'Quant' | 'Overview' | 'Time Analysis' | 'Advanced';
    image?: string;
    docsId?: string; // Links to documentation section
}

// Placeholder component for missing widgets
const PlaceholderWidget = ({ title }: { title: string }) => (
    <div className="h-full flex items-center justify-center text-gray-500 bg-black/20 border border-white/5 rounded-lg p-4">
        <div className="text-center">
            <div className="text-lg font-serif text-leather-accent mb-2">{title}</div>
            <div className="text-xs uppercase tracking-wider">Coming Soon</div>
        </div>
    </div>
);

// Registry
export const WIDGET_REGISTRY: Record<WidgetType, WidgetDefinition> = {
    PERFORMANCE_SUMMARY: {
        id: 'PERFORMANCE_SUMMARY',
        title: 'Performance Summary',
        description: 'Key metrics including Total PnL, Win Rate, and Profit Factor.',
        component: PerformanceSummaryWidget,
        defaultSize: 'large',
        category: 'Overview',
        image: 'https://placehold.co/600x400/1E1915/D4AF37?text=Performance+Summary',
        docsId: 'performance-summary'
    },
    EQUITY_CURVE: {
        id: 'EQUITY_CURVE',
        title: 'Equity Curve',
        description: 'Visual representation of your account balance growth over time.',
        component: EquityCurveWidget,
        defaultSize: 'large',
        category: 'Performance',
        image: 'https://placehold.co/600x400/1E1915/D4AF37?text=Equity+Curve',
        docsId: 'equity-curve'
    },
    DRAWDOWN: {
        id: 'DRAWDOWN',
        title: 'Drawdown',
        description: 'Drawdown percentage from peak equity.',
        component: DrawdownWidget,
        defaultSize: 'medium',
        category: 'Risk',
        image: 'https://placehold.co/600x400/1E1915/D4AF37?text=Drawdown',
        docsId: 'drawdown-widget'
    },
    DAILY_PNL: {
        id: 'DAILY_PNL',
        title: 'Daily PnL',
        description: 'Bar chart of profit/loss per day.',
        component: DailyPnLWidget,
        defaultSize: 'medium',
        category: 'Performance',
        image: 'https://placehold.co/600x400/1E1915/D4AF37?text=Daily+PnL',
        docsId: 'daily-pnl'
    },
    SYMBOL_BREAKDOWN: {
        id: 'SYMBOL_BREAKDOWN',
        title: 'Symbol Breakdown',
        description: 'Distribution of trades and PnL by asset symbol.',
        component: SymbolBreakdownWidget,
        defaultSize: 'medium',
        category: 'Performance',
        image: 'https://placehold.co/600x400/1E1915/D4AF37?text=Symbol+Breakdown',
        docsId: 'symbol-breakdown'
    },
    SETUP_BREAKDOWN: {
        id: 'SETUP_BREAKDOWN',
        title: 'Setup Breakdown',
        description: 'Performance metrics per trading setup.',
        component: SetupBreakdownWidget,
        defaultSize: 'medium',
        category: 'Performance',
        image: 'https://placehold.co/600x400/1E1915/D4AF37?text=Setup+Breakdown',
        docsId: 'setup-breakdown'
    },
    WIN_RATE_TIMELINE: {
        id: 'WIN_RATE_TIMELINE',
        title: 'Win Rate Timeline',
        description: 'Rolling win rate over time.',
        component: WinRateTimelineWidget,
        defaultSize: 'medium',
        category: 'Performance',
        image: 'https://placehold.co/600x400/1E1915/D4AF37?text=Win+Rate+Timeline',
        docsId: 'win-rate-timeline'
    },
    ASSET_PNL_BREAKDOWN: {
        id: 'ASSET_PNL_BREAKDOWN',
        title: 'Asset PnL',
        description: 'Detailed PnL performance for each traded asset.',
        component: AssetPnlBreakdownWidget,
        defaultSize: 'medium',
        category: 'Performance',
        image: 'https://placehold.co/600x400/1E1915/D4AF37?text=Asset+PnL',
        docsId: 'asset-pnl-breakdown'
    },
    TRADE_OUTCOME_DISTRIBUTION: {
        id: 'TRADE_OUTCOME_DISTRIBUTION',
        title: 'Trade Outcomes',
        description: 'Distribution of winning and losing trades.',
        component: TradeOutcomeDistributionWidget,
        defaultSize: 'medium',
        category: 'Risk',
        image: 'https://placehold.co/600x400/1E1915/D4AF37?text=Trade+Outcomes',
        docsId: 'trade-outcome'
    },
    TIME_OF_DAY_PROFITABILITY: {
        id: 'TIME_OF_DAY_PROFITABILITY',
        title: 'Time of Day',
        description: 'Analysis of profitability by time of day.',
        component: TimeOfDayProfitabilityWidget,
        defaultSize: 'large',
        category: 'Time Analysis',
        image: 'https://placehold.co/600x400/1E1915/D4AF37?text=Time+of+Day',
        docsId: 'time-of-day'
    },
    DAY_OF_WEEK_PROFITABILITY: {
        id: 'DAY_OF_WEEK_PROFITABILITY',
        title: 'Day of Week Profitability',
        description: 'PnL performance by day of week.',
        component: DayOfWeekProfitabilityWidget,
        defaultSize: 'medium',
        category: 'Behavior',
        image: 'https://placehold.co/600x400/1E1915/D4AF37?text=Day+of+Week+Profitability',
        docsId: 'day-of-week'
    },
    TRADE_FREQUENCY_VS_PNL: {
        id: 'TRADE_FREQUENCY_VS_PNL',
        title: 'Freq vs PnL',
        description: 'Correlation between trade frequency and profitability.',
        component: TradeFrequencyVsPnlWidget,
        defaultSize: 'medium',
        category: 'Behavior',
        docsId: 'trade-frequency'
    },
    LONG_SHORT_PERFORMANCE: {
        id: 'LONG_SHORT_PERFORMANCE',
        title: 'Long vs Short',
        description: 'Comparison of Long vs Short performance.',
        component: LongShortPerformanceWidget,
        defaultSize: 'small',
        category: 'Performance',
        docsId: 'long-short-performance'
    },
    // Risk & Pattern widgets
    RISK_REWARD_SCATTER: { id: 'RISK_REWARD_SCATTER', title: 'Risk vs Reward', description: 'Scatter plot of risk vs reward.', component: RiskRewardScatterWidget, defaultSize: 'medium', category: 'Risk', docsId: 'risk-reward-scatter' },
    CONSECUTIVE_WINS_LOSSES: { id: 'CONSECUTIVE_WINS_LOSSES', title: 'Streaks', description: 'Consecutive wins and losses.', component: ConsecutiveWinsLossesWidget, defaultSize: 'medium', category: 'Behavior', docsId: 'consecutive-wins-losses' },
    MONTHLY_HEATSTICK: { id: 'MONTHLY_HEATSTICK', title: 'Monthly Heatstick', description: 'Monthly performance visualization.', component: MonthlyHeatstickWidget, defaultSize: 'medium', category: 'Performance', docsId: 'monthly-heatstick' },
    HOLDING_TIME_VS_PROFIT: { id: 'HOLDING_TIME_VS_PROFIT', title: 'Holding Time vs Profit', description: 'Does patience pay off?', component: HoldingTimeVsProfitWidget, defaultSize: 'medium', category: 'Behavior', docsId: 'holding-time' },
    // Market Conditions widgets
    VOLATILITY_VS_PERFORMANCE: { id: 'VOLATILITY_VS_PERFORMANCE', title: 'Volatility vs Performance', description: 'Scatter plot showing correlation between market volatility and trading performance.', component: VolatilityVsPerformanceWidget, defaultSize: 'medium', category: 'Quant', docsId: 'volatility-performance' },
    // Execution widgets
    SLIPPAGE_ANALYSIS: { id: 'SLIPPAGE_ANALYSIS', title: 'Slippage Analysis', description: 'Histogram of slippage distribution on entries and exits.', component: SlippageAnalysisWidget, defaultSize: 'medium', category: 'Execution', docsId: 'slippage-analysis' },
    ENTRY_EFFICIENCY: { id: 'ENTRY_EFFICIENCY', title: 'Entry Efficiency', description: 'Scatter plot showing entry price vs market price at signal time.', component: EntryEfficiencyWidget, defaultSize: 'medium', category: 'Execution', docsId: 'entry-efficiency' },
    // Risk Management widgets
    EXPOSURE_HEATMAP: { id: 'EXPOSURE_HEATMAP', title: 'Exposure Heatmap', description: 'By time and asset showing maximum exposure levels', component: ExposureHeatmapWidget, defaultSize: 'large', category: 'Risk', docsId: 'exposure-heatmap' },
    LEVERAGE_IMPACT: { id: 'LEVERAGE_IMPACT', title: 'Leverage Impact', description: 'PnL by leverage level.', component: LeverageImpactWidget, defaultSize: 'medium', category: 'Risk', docsId: 'leverage-impact' },
    // Market Conditions widgets
    FUNDING_RATE_BIAS: { id: 'FUNDING_RATE_BIAS', title: 'Funding Rate Bias', description: 'Line + bars showing funding rate impact on trading outcomes.', component: FundingRateBiasWidget, defaultSize: 'medium', category: 'Quant', docsId: 'funding-rate-bias' },
    DISTANCE_FROM_ATH: { id: 'DISTANCE_FROM_ATH', title: 'Distance from ATH', description: 'Percentage chart showing performance relative to all-time highs.', component: DistanceFromAthWidget, defaultSize: 'medium', category: 'Quant', docsId: 'distance-from-ath' },
    MULTI_LAYER_CANDLE_MAP: { id: 'MULTI_LAYER_CANDLE_MAP', title: 'Multi-layer Candle Map', description: 'Advanced candle chart with multiple indicator layers (MA, RSI, Bollinger Bands, MACD).', component: MultiLayerCandleMapWidget, defaultSize: 'full', category: 'Quant', docsId: 'multi-layer-candle' },
    TRADE_PATH_REPLAY: { id: 'TRADE_PATH_REPLAY', title: 'Trade Path Replay', description: 'Animation of trade execution.', component: PlaceholderWidget, defaultSize: 'large', category: 'Execution' },
    TRADE_QUALITY_INDEX: { id: 'TRADE_QUALITY_INDEX', title: 'Trade Quality Index', description: 'Aggregate score of trade quality.', component: TradeQualityIndexWidget, defaultSize: 'small', category: 'Execution', docsId: 'trade-quality-index' },
    BENCHMARK_COMPARISON: { id: 'BENCHMARK_COMPARISON', title: 'Benchmark Comparison', description: 'Compare vs BTC/SPX.', component: PlaceholderWidget, defaultSize: 'medium', category: 'Performance' },
    FACTOR_CONTRIBUTION: { id: 'FACTOR_CONTRIBUTION', title: 'Factor Contribution', description: 'Radar chart of market factors.', component: PlaceholderWidget, defaultSize: 'medium', category: 'Quant' },
    REGIME_DETECTION: { id: 'REGIME_DETECTION', title: 'Regime Detection', description: 'Market regime identification and performance by regime (trending, ranging, volatile)', component: RegimeDetectionWidget, defaultSize: 'large', category: 'Quant', docsId: 'regime-detection' },
    RISK_METRICS_SUMMARY: { id: 'RISK_METRICS_SUMMARY', title: 'Risk Metrics Summary', description: 'Max Drawdown | Avg Risk/Trade | Avg Position Size | Leverage Used - Use warning colors for high-risk metrics', component: RiskMetricsSummaryWidget, defaultSize: 'large', category: 'Risk', docsId: 'risk-metrics-summary' },
    CORRELATION_MATRIX: { id: 'CORRELATION_MATRIX', title: 'Correlation Matrix', description: 'Heatmap showing asset correlations and co-movement patterns.', component: CorrelationMatrixWidget, defaultSize: 'large', category: 'Quant', docsId: 'correlation-matrix' },
    SHARPE_SORTINO_TIMELINE: { id: 'SHARPE_SORTINO_TIMELINE', title: 'Sharpe & Sortino', description: 'Risk-adjusted returns over time.', component: PlaceholderWidget, defaultSize: 'medium', category: 'Quant' },
    POSITION_SIZE_ACCURACY: { id: 'POSITION_SIZE_ACCURACY', title: 'Position Size Accuracy', description: 'Impact of sizing on PnL.', component: PositionSizeAccuracyWidget, defaultSize: 'medium', category: 'Risk', docsId: 'position-size-accuracy' },
    CONFLUENCE_SCORE_OUTCOME: { id: 'CONFLUENCE_SCORE_OUTCOME', title: 'Confluence Score', description: 'PnL vs Confluence Score.', component: ConfluenceScoreWidget, defaultSize: 'medium', category: 'Quant', docsId: 'confluence-score' },
    LIQUIDITY_VS_ENTRY: { id: 'LIQUIDITY_VS_ENTRY', title: 'Liquidity vs Entry', description: 'Scatter/heatmap showing trade entries vs available liquidity.', component: LiquidityVsEntryWidget, defaultSize: 'medium', category: 'Execution', docsId: 'liquidity-vs-entry' },
    TP_VS_SL_HIT_RATIO: { id: 'TP_VS_SL_HIT_RATIO', title: 'TP vs SL Hit Ratio', description: 'Take Profit vs Stop Loss hits.', component: TpVsSlHitRatioWidget, defaultSize: 'small', category: 'Execution', docsId: 'tp-sl-ratio' },
    OVERBOUGHT_OVERSOLD_OUTCOME: { id: 'OVERBOUGHT_OVERSOLD_OUTCOME', title: 'RSI Outcome', description: 'Conditional probability chart showing performance at different RSI levels.', component: RsiOutcomeWidget, defaultSize: 'full', category: 'Quant', docsId: 'rsi-outcome' },
    STOP_LOSS_DISTANCE: { id: 'STOP_LOSS_DISTANCE', title: 'Stop Loss Distance', description: 'Histogram showing SL placement distribution and impact on outcomes.', component: StopLossDistanceWidget, defaultSize: 'medium', category: 'Risk', docsId: 'stop-loss-distance' },
    REACTION_TIME_HISTOGRAM: { id: 'REACTION_TIME_HISTOGRAM', title: 'Reaction Time', description: 'Distribution chart of time between signal and execution.', component: ReactionTimeWidget, defaultSize: 'medium', category: 'Behavior', docsId: 'reaction-time' },
};
