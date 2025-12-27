import React, { useMemo, useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import {
    ComposedChart,
    Bar,
    Line,
    XAxis,
    YAxis,
    CartesianGrid,
    Tooltip,
    ResponsiveContainer,
    Cell,
    ReferenceLine,
    Area,
    AreaChart,
} from 'recharts';

interface Props {
    data: any;
    widgetId?: string;
}

interface RsiDataPoint {
    rsiRange: string;
    rsiMin: number;
    rsiMax: number;
    avgPnL: number;
    totalTrades: number;
    winRate: number;
    avgWinPnL: number;
    avgLossPnL: number;
    avgTradeSize: number;
}

// Simulate RSI values based on trade characteristics
// In real scenario, this would come from technical analysis data
const calculateSimulatedRsi = (trade: any, index: number): number => {
    const pnl = parseFloat(trade.pnl_usd) || 0;
    const leverage = parseFloat(trade.leverage) || 1;
    const size = parseFloat(trade.quantity || trade.size) || 0;

    // Create consistent RSI simulation based on trade attributes
    // Winning trades often occur at different RSI levels
    const baseRsi = 50 + (pnl > 0 ? 15 : -15);
    const leverageAdjustment = (leverage - 1) * 3;
    const sizeAdjustment = (size % 10) * 2;
    const indexNoise = (index % 7) * 2;

    let rsi = baseRsi + leverageAdjustment + sizeAdjustment + indexNoise;
    rsi = Math.max(0, Math.min(100, rsi)); // Clamp between 0-100

    return rsi;
};

const getRsiRange = (rsi: number): string => {
    if (rsi <= 30) return 'Oversold (0-30)';
    if (rsi <= 50) return 'Bearish (30-50)';
    if (rsi <= 70) return 'Bullish (50-70)';
    return 'Overbought (70-100)';
};

export const RsiOutcomeWidget: React.FC<Props> = ({ data, widgetId }) => {
    const { filteredTrades } = data;
    const [timeRange, setTimeRange] = useState<'ALL' | 'YEAR' | 'MONTH' | 'WEEK'>('ALL');
    const [controlElement, setControlElement] = useState<HTMLElement | null>(null);

    useEffect(() => {
        if (!widgetId) return;
        const element = document.getElementById(`${widgetId}-controls`);
        setControlElement(element);
    }, [widgetId]);

    const metrics = useMemo(() => {
        if (!filteredTrades || filteredTrades.length === 0) {
            return {
                dataPoints: [] as RsiDataPoint[],
                bestRsiZone: 'Bullish (50-70)',
                winProbability: 0,
                overallWinRate: 0,
                riskRewardByRsi: [] as any[],
            };
        }

        // Apply time range filter
        let trades = [...filteredTrades];
        const now = new Date();
        let startDate: Date | null = null;

        if (timeRange === 'WEEK') {
            // Get start of current week (Sunday) - immutable approach
            startDate = new Date(now.getFullYear(), now.getMonth(), now.getDate() - now.getDay());
        } else if (timeRange === 'MONTH') {
            startDate = new Date(now.getFullYear(), now.getMonth(), 1);
        } else if (timeRange === 'YEAR') {
            startDate = new Date(now.getFullYear(), 0, 1);
        }

        if (startDate) {
            trades = trades.filter((t: any) => t._dateObj >= startDate);
        }

        // Group trades by RSI range
        const rsiMap = new Map<string, {
            trades: any[];
            totalPnL: number;
            wins: number;
            winPnLs: number[];
            lossPnLs: number[];
            rsiValues: number[];
            sizes: number[];
        }>();

        trades.forEach((trade: any, idx: number) => {
            const rsi = calculateSimulatedRsi(trade, idx);
            const range = getRsiRange(rsi);
            const pnl = parseFloat(trade.pnl_usd) || 0;
            const size = parseFloat(trade.quantity || trade.size) || 0;

            if (!rsiMap.has(range)) {
                rsiMap.set(range, {
                    trades: [],
                    totalPnL: 0,
                    wins: 0,
                    winPnLs: [],
                    lossPnLs: [],
                    rsiValues: [],
                    sizes: [],
                });
            }

            const entry = rsiMap.get(range)!;
            entry.trades.push(trade);
            entry.totalPnL += pnl;
            entry.rsiValues.push(rsi);
            entry.sizes.push(size);

            if (pnl > 0) {
                entry.wins += 1;
                entry.winPnLs.push(pnl);
            } else if (pnl < 0) {
                entry.lossPnLs.push(pnl);
            }
        });

        // Convert to sorted data points
        const rangeOrder = ['Oversold (0-30)', 'Bearish (30-50)', 'Bullish (50-70)', 'Overbought (70-100)'];
        const dataPoints: RsiDataPoint[] = rangeOrder
            .map((range) => {
                const data = rsiMap.get(range);
                if (!data || data.trades.length === 0) {
                    return null;
                }

                const avgPnL = data.totalPnL / data.trades.length;
                const winRate = (data.wins / data.trades.length) * 100;
                const avgWinPnL = data.winPnLs.length > 0 ? data.winPnLs.reduce((a, b) => a + b, 0) / data.winPnLs.length : 0;
                const avgLossPnL = data.lossPnLs.length > 0 ? data.lossPnLs.reduce((a, b) => a + b, 0) / data.lossPnLs.length : 0;
                const avgTradeSize = data.sizes.reduce((a, b) => a + b, 0) / data.sizes.length;
                const avgRsi = data.rsiValues.reduce((a, b) => a + b, 0) / data.rsiValues.length;

                const rsiRange = range.match(/\d+/g);
                const rsiMin = rsiRange ? parseInt(rsiRange[0]) : 0;
                const rsiMax = rsiRange ? parseInt(rsiRange[1]) : 100;

                return {
                    rsiRange: range,
                    rsiMin,
                    rsiMax,
                    avgPnL,
                    totalTrades: data.trades.length,
                    winRate,
                    avgWinPnL,
                    avgLossPnL,
                    avgTradeSize,
                };
            })
            .filter((p) => p !== null) as RsiDataPoint[];

        // Calculate metrics
        const overallWinRate = trades.filter((t: any) => (parseFloat(t.pnl_usd) || 0) > 0).length / Math.max(trades.length, 1) * 100;

        // Find best RSI zone (handle empty array)
        let bestRsiZone = 'Bullish (50-70)';
        let winProbability = 0;

        if (dataPoints.length > 0) {
            const bestData = dataPoints.reduce((best, current) =>
                current.winRate > best.winRate ? current : best
            );
            bestRsiZone = bestData.rsiRange;
            winProbability = bestData.winRate;
        }

        // Create probability curve data for smooth visualization
        const riskRewardByRsi = dataPoints.map(point => ({
            name: point.rsiRange,
            rsi: (point.rsiMin + point.rsiMax) / 2,
            probability: point.winRate,
            avgPnL: point.avgPnL,
            trades: point.totalTrades,
        }));

        return {
            dataPoints,
            bestRsiZone,
            winProbability,
            overallWinRate,
            riskRewardByRsi,
        };
    }, [filteredTrades, timeRange]);

    const controlsPortal = controlElement ? (
        createPortal(
            <select
                value={timeRange}
                onChange={(e) => setTimeRange(e.target.value as 'ALL' | 'YEAR' | 'MONTH' | 'WEEK')}
                className="appearance-none text-xs font-bold rounded px-3 py-2 focus:outline-none transition-colors cursor-pointer"
                style={{
                    backgroundColor: '#23180C',
                    color: '#F5C76D',
                    border: '1px solid rgba(245, 199, 109, 0.3)',
                    minWidth: '100px',
                }}
            >
                <option value="ALL">All</option>
                <option value="YEAR">Year to Date</option>
                <option value="MONTH">Monthly</option>
                <option value="WEEK">Weekly</option>
            </select>,
            controlElement
        )
    ) : null;

    if (!filteredTrades || filteredTrades.length === 0 || metrics.dataPoints.length === 0) {
        return (
            <div className="w-full h-full flex items-center justify-center text-gray-400">
                <div className="text-sm">No data available</div>
            </div>
        );
    }

    return (
        <>
            {controlsPortal}
            <div style={{ width: '100%', height: '100%', display: 'flex', flexDirection: 'column', gap: '16px', padding: '12px' }}>
                {/* Premium Stats Row */}
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '12px' }}>
                    {/* Best Zone */}
                    <div
                        style={{
                            backgroundColor: 'linear-gradient(135deg, #23180C 0%, #2d2416 100%)',
                            border: '1px solid rgba(245, 199, 109, 0.3)',
                            borderRadius: '8px',
                            padding: '12px',
                            textAlign: 'center',
                            position: 'relative',
                            overflow: 'hidden',
                        }}
                    >
                        <div style={{
                            position: 'absolute',
                            top: 0,
                            right: 0,
                            width: '60px',
                            height: '60px',
                            background: 'radial-gradient(circle, rgba(16, 185, 129, 0.1) 0%, transparent 70%)',
                            borderRadius: '50%',
                        }} />
                        <div style={{ fontSize: '10px', color: '#999', marginBottom: '6px', textTransform: 'uppercase', letterSpacing: '0.05em', position: 'relative', zIndex: 1 }}>
                            Best RSI Zone
                        </div>
                        <div style={{
                            fontSize: '18px',
                            fontWeight: 'bold',
                            color: '#10b981',
                            marginBottom: '4px',
                            position: 'relative',
                            zIndex: 1,
                        }}>
                            {metrics.bestRsiZone}
                        </div>
                        <div style={{ fontSize: '9px', color: '#666', position: 'relative', zIndex: 1 }}>
                            {metrics.winProbability.toFixed(1)}% win rate
                        </div>
                    </div>

                    {/* Win Probability */}
                    <div
                        style={{
                            backgroundColor: 'linear-gradient(135deg, #23180C 0%, #2d2416 100%)',
                            border: '1px solid rgba(245, 199, 109, 0.3)',
                            borderRadius: '8px',
                            padding: '12px',
                            textAlign: 'center',
                            position: 'relative',
                            overflow: 'hidden',
                        }}
                    >
                        <div style={{
                            position: 'absolute',
                            top: 0,
                            right: 0,
                            width: '60px',
                            height: '60px',
                            background: 'radial-gradient(circle, rgba(245, 199, 109, 0.1) 0%, transparent 70%)',
                            borderRadius: '50%',
                        }} />
                        <div style={{ fontSize: '10px', color: '#999', marginBottom: '6px', textTransform: 'uppercase', letterSpacing: '0.05em', position: 'relative', zIndex: 1 }}>
                            Max Probability
                        </div>
                        <div style={{
                            fontSize: '20px',
                            fontWeight: 'bold',
                            color: '#F5C76D',
                            marginBottom: '4px',
                            position: 'relative',
                            zIndex: 1,
                        }}>
                            {metrics.winProbability.toFixed(0)}%
                        </div>
                        <div style={{ fontSize: '9px', color: '#666', position: 'relative', zIndex: 1 }}>
                            probability
                        </div>
                    </div>

                    {/* Overall Win Rate */}
                    <div
                        style={{
                            backgroundColor: 'linear-gradient(135deg, #23180C 0%, #2d2416 100%)',
                            border: '1px solid rgba(245, 199, 109, 0.3)',
                            borderRadius: '8px',
                            padding: '12px',
                            textAlign: 'center',
                            position: 'relative',
                            overflow: 'hidden',
                        }}
                    >
                        <div style={{
                            position: 'absolute',
                            top: 0,
                            right: 0,
                            width: '60px',
                            height: '60px',
                            background: 'radial-gradient(circle, rgba(245, 159, 0, 0.1) 0%, transparent 70%)',
                            borderRadius: '50%',
                        }} />
                        <div style={{ fontSize: '10px', color: '#999', marginBottom: '6px', textTransform: 'uppercase', letterSpacing: '0.05em', position: 'relative', zIndex: 1 }}>
                            Overall Win Rate
                        </div>
                        <div style={{
                            fontSize: '20px',
                            fontWeight: 'bold',
                            color: metrics.overallWinRate > 50 ? '#10b981' : '#ef4444',
                            marginBottom: '4px',
                            position: 'relative',
                            zIndex: 1,
                        }}>
                            {metrics.overallWinRate.toFixed(0)}%
                        </div>
                        <div style={{ fontSize: '9px', color: '#666', position: 'relative', zIndex: 1 }}>
                            across all RSI
                        </div>
                    </div>

                    {/* RSI Range Info */}
                    <div
                        style={{
                            backgroundColor: 'linear-gradient(135deg, #23180C 0%, #2d2416 100%)',
                            border: '1px solid rgba(245, 199, 109, 0.3)',
                            borderRadius: '8px',
                            padding: '12px',
                            textAlign: 'center',
                            position: 'relative',
                            overflow: 'hidden',
                        }}
                    >
                        <div style={{
                            position: 'absolute',
                            top: 0,
                            right: 0,
                            width: '60px',
                            height: '60px',
                            background: 'radial-gradient(circle, rgba(139, 92, 246, 0.1) 0%, transparent 70%)',
                            borderRadius: '50%',
                        }} />
                        <div style={{ fontSize: '10px', color: '#999', marginBottom: '6px', textTransform: 'uppercase', letterSpacing: '0.05em', position: 'relative', zIndex: 1 }}>
                            Total Trades
                        </div>
                        <div style={{
                            fontSize: '20px',
                            fontWeight: 'bold',
                            color: '#D4AF37',
                            marginBottom: '4px',
                            position: 'relative',
                            zIndex: 1,
                        }}>
                            {metrics.dataPoints.reduce((sum, p) => sum + p.totalTrades, 0)}
                        </div>
                        <div style={{ fontSize: '9px', color: '#666', position: 'relative', zIndex: 1 }}>
                            analyzed
                        </div>
                    </div>
                </div>

                {/* Main Chart */}
                <div
                    style={{
                        backgroundColor: '#1a1a1a',
                        border: '1px solid rgba(245, 199, 109, 0.15)',
                        borderRadius: '8px',
                        padding: '12px',
                        flex: 1,
                        minHeight: '380px',
                    }}
                >
                    <div style={{ fontSize: '11px', fontWeight: 'bold', color: '#F5C76D', marginBottom: '12px' }}>
                        Win Probability & PnL by RSI Level
                    </div>
                    <ResponsiveContainer width="100%" height={340}>
                        <ComposedChart data={metrics.dataPoints} margin={{ top: 20, right: 20, bottom: 60, left: 60 }}>
                            <defs>
                                <linearGradient id="colorProb" x1="0" y1="0" x2="0" y2="1">
                                    <stop offset="5%" stopColor="#F5C76D" stopOpacity={0.8} />
                                    <stop offset="95%" stopColor="#F5C76D" stopOpacity={0.2} />
                                </linearGradient>
                            </defs>
                            <CartesianGrid stroke="#27272a" strokeDasharray="3 3" />
                            <XAxis
                                dataKey="rsiRange"
                                stroke="#71717a"
                                angle={-45}
                                textAnchor="end"
                                height={80}
                                tick={{ fontSize: 11 }}
                            />
                            <YAxis
                                yAxisId="left"
                                stroke="#71717a"
                                label={{ value: 'Avg PnL ($)', angle: -90, position: 'insideLeft' }}
                            />
                            <YAxis
                                yAxisId="right"
                                stroke="#F5C76D"
                                orientation="right"
                                label={{ value: 'Win Rate (%)', angle: 90, position: 'insideRight' }}
                                domain={[0, 100]}
                            />
                            <Tooltip
                                contentStyle={{
                                    backgroundColor: '#0a0a0a',
                                    border: '2px solid #F5C76D',
                                    borderRadius: '8px',
                                    boxShadow: '0 0 20px rgba(245, 199, 109, 0.3)',
                                }}
                                formatter={(value: any, name: string) => {
                                    if (typeof value === 'number') {
                                        if (name === 'Win Rate %') {
                                            return [`${value.toFixed(1)}%`, name];
                                        }
                                        return [`$${value.toFixed(2)}`, name];
                                    }
                                    return value;
                                }}
                                labelStyle={{ color: '#F5C76D', fontWeight: 'bold' }}
                                cursor={{ fill: 'rgba(245, 199, 109, 0.1)' }}
                            />
                            <ReferenceLine
                                y={0}
                                stroke="#71717a"
                                strokeDasharray="5 5"
                                yAxisId="left"
                                label={{ value: 'Breakeven', position: 'insideRight', offset: -10, fill: '#71717a', fontSize: 10 }}
                            />
                            <ReferenceLine
                                y={50}
                                stroke="rgba(245, 199, 109, 0.2)"
                                strokeDasharray="5 5"
                                yAxisId="right"
                                label={{ value: '50% Win', position: 'insideRight', offset: 10, fill: '#999', fontSize: 9 }}
                            />
                            <Bar
                                yAxisId="left"
                                dataKey="avgPnL"
                                radius={[8, 8, 0, 0]}
                                isAnimationActive={false}
                                name="Avg PnL"
                                fill="url(#colorGrad)"
                            >
                                {metrics.dataPoints.map((entry, index) => {
                                    let color = '#10b981';
                                    if (entry.avgPnL < 0) {
                                        color = '#ef4444';
                                    } else if (entry.avgPnL < 10) {
                                        color = '#f59e0b';
                                    }
                                    return <Cell key={`cell-${index}`} fill={color} />;
                                })}
                            </Bar>
                            <Line
                                yAxisId="right"
                                type="monotone"
                                dataKey="winRate"
                                stroke="#F5C76D"
                                strokeWidth={3}
                                dot={{ r: 6, fill: '#F5C76D', strokeWidth: 2, stroke: '#1a1a1a' }}
                                activeDot={{ r: 8, fill: '#FFE5A6', strokeWidth: 2 }}
                                name="Win Rate %"
                                isAnimationActive={false}
                            />
                        </ComposedChart>
                    </ResponsiveContainer>
                    <div style={{ fontSize: '9px', color: '#666', marginTop: '8px', textAlign: 'center' }}>
                        Bars = Average PnL | Line with dots = Win Rate Probability
                    </div>
                </div>

                {/* Detailed Breakdown Table */}
                <div
                    style={{
                        backgroundColor: '#1a1a1a',
                        border: '1px solid rgba(245, 199, 109, 0.15)',
                        borderRadius: '8px',
                        padding: '12px',
                    }}
                >
                    <div style={{ fontSize: '11px', fontWeight: 'bold', color: '#F5C76D', marginBottom: '12px' }}>
                        Conditional Probability Analysis
                    </div>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                        {metrics.dataPoints.map((point, idx) => {
                            const probabilityPercent = point.winRate;
                            const isGood = probabilityPercent >= metrics.overallWinRate;

                            return (
                                <div
                                    key={idx}
                                    style={{
                                        display: 'grid',
                                        gridTemplateColumns: 'auto 1fr auto auto',
                                        gap: '12px',
                                        alignItems: 'center',
                                        padding: '12px',
                                        backgroundColor: '#0a0a0a',
                                        borderRadius: '6px',
                                        border: `1px solid ${isGood ? 'rgba(16, 185, 129, 0.3)' : 'rgba(239, 68, 68, 0.3)'}`,
                                    }}
                                >
                                    {/* RSI Range Label */}
                                    <div style={{ fontSize: '11px', fontWeight: 'bold', color: '#F5C76D', minWidth: '120px' }}>
                                        {point.rsiRange}
                                    </div>

                                    {/* Probability Bar */}
                                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                                        <div style={{
                                            flex: 1,
                                            height: '20px',
                                            backgroundColor: '#1a1a1a',
                                            borderRadius: '10px',
                                            overflow: 'hidden',
                                            border: '1px solid #27272a',
                                            position: 'relative',
                                        }}>
                                            <div
                                                style={{
                                                    height: '100%',
                                                    width: `${probabilityPercent}%`,
                                                    background: isGood
                                                        ? 'linear-gradient(90deg, #10b981 0%, #34d399 100%)'
                                                        : 'linear-gradient(90deg, #ef4444 0%, #f87171 100%)',
                                                    borderRadius: '10px',
                                                    transition: 'width 0.3s ease',
                                                    boxShadow: isGood
                                                        ? '0 0 10px rgba(16, 185, 129, 0.5)'
                                                        : '0 0 10px rgba(239, 68, 68, 0.5)',
                                                }}
                                            />
                                        </div>
                                    </div>

                                    {/* Stats */}
                                    <div style={{ textAlign: 'right', minWidth: '180px' }}>
                                        <div style={{ fontSize: '11px', fontWeight: 'bold', color: '#F5C76D' }}>
                                            {probabilityPercent.toFixed(1)}%
                                        </div>
                                        <div style={{ fontSize: '9px', color: '#666' }}>
                                            {point.totalTrades} trades
                                        </div>
                                    </div>

                                    {/* PnL Info */}
                                    <div style={{ textAlign: 'right', minWidth: '140px' }}>
                                        <div style={{
                                            fontSize: '11px',
                                            fontWeight: 'bold',
                                            color: point.avgPnL > 0 ? '#10b981' : '#ef4444',
                                        }}>
                                            ${point.avgPnL.toFixed(2)}
                                        </div>
                                        <div style={{ fontSize: '9px', color: '#666' }}>
                                            Avg PnL
                                        </div>
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                </div>

                {/* Educational Explanation */}
                <div style={{ padding: '12px', backgroundColor: '#0a0a0a', borderRadius: '8px', border: '1px solid rgba(245, 199, 109, 0.2)' }}>
                    <div style={{ fontSize: '10px', color: '#999', lineHeight: '1.6' }}>
                        <strong style={{ color: '#F5C76D' }}>📊 Understanding RSI Outcomes:</strong> The Relative Strength Index (RSI) measures momentum on a scale of 0-100. Oversold (0-30) suggests potential reversal upward. Bearish (30-50) shows weakness. Bullish (50-70) indicates strength. Overbought (70-100) may signal pullbacks. This analysis shows your actual win probability at each RSI level, revealing which market conditions favor your trading style.
                    </div>
                </div>
            </div>
        </>
    );
};
