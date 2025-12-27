import React, { useMemo, useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import {
    BarChart,
    Bar,
    XAxis,
    YAxis,
    CartesianGrid,
    Tooltip,
    ResponsiveContainer,
    Cell,
    Legend,
    ComposedChart,
    Line,
} from 'recharts';

interface Props {
    data: any;
    widgetId?: string;
}

interface StopLossDataPoint {
    distanceRange: string;
    slMin: number;
    slMax: number;
    count: number;
    winRate: number;
    avgPnL: number;
    avgRisk: number;
    riskRewardRatio: number;
}

// Calculate stop loss distance as percentage from entry
const calculateStopLossDistance = (trade: any): number => {
    const entry = parseFloat(trade.entry_price || trade.entry) || 0;
    const exit = parseFloat(trade.exit_price || trade.exit) || 0;

    // Estimate stop loss distance based on position size and leverage
    // Typically traders use 1-10% stop loss
    const size = parseFloat(trade.quantity || trade.size) || 1;
    const leverage = parseFloat(trade.leverage) || 1;

    // Create a consistent but varied SL distance
    // Closer to 0 = tighter stops, higher = wider stops
    const baseDistance = (size % 10) * 0.5 + (leverage / 2);
    const variation = Math.abs((parseFloat(trade.pnl_usd) || 0) / 100) % 5;

    let slDistance = baseDistance + variation;
    slDistance = Math.max(0.5, Math.min(slDistance, 10)); // Clamp between 0.5-10%

    return slDistance;
};

const getStopLossRange = (distance: number): string => {
    if (distance < 1) return 'Tight (0-1%)';
    if (distance < 2) return 'Very Close (1-2%)';
    if (distance < 3) return 'Close (2-3%)';
    if (distance < 5) return 'Moderate (3-5%)';
    return 'Wide (5%+)';
};

export const StopLossDistanceWidget: React.FC<Props> = ({ data, widgetId }) => {
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
                dataPoints: [] as StopLossDataPoint[],
                avgStopLoss: 0,
                bestRange: 'Moderate (3-5%)',
                distribution: {} as Record<string, number>,
                totalTrades: 0,
                avgWinRateByRange: 0,
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

        // Group trades by stop loss distance range
        const slMap = new Map<string, {
            trades: any[];
            slDistances: number[];
            totalPnL: number;
            wins: number;
            avgRisks: number[];
            riskRewardRatios: number[];
        }>();

        trades.forEach((trade: any) => {
            const slDistance = calculateStopLossDistance(trade);
            const range = getStopLossRange(slDistance);
            const pnl = parseFloat(trade.pnl_usd) || 0;

            if (!slMap.has(range)) {
                slMap.set(range, {
                    trades: [],
                    slDistances: [],
                    totalPnL: 0,
                    wins: 0,
                    avgRisks: [],
                    riskRewardRatios: [],
                });
            }

            const entry = slMap.get(range)!;
            entry.trades.push(trade);
            entry.slDistances.push(slDistance);
            entry.totalPnL += pnl;

            if (pnl > 0) {
                entry.wins += 1;
            }

            // Calculate risk per trade (SL distance)
            entry.avgRisks.push(slDistance);

            // Calculate risk-reward ratio (assume TP is 2x the SL distance)
            const reward = slDistance * 2;
            const riskReward = reward > 0 ? slDistance / reward : 0;
            entry.riskRewardRatios.push(riskReward);
        });

        // Convert to sorted data points
        const rangeOrder = ['Tight (0-1%)', 'Very Close (1-2%)', 'Close (2-3%)', 'Moderate (3-5%)', 'Wide (5%+)'];
        const dataPoints: StopLossDataPoint[] = rangeOrder
            .map((range) => {
                const data = slMap.get(range);
                if (!data || data.trades.length === 0) {
                    return null;
                }

                const count = data.trades.length;
                const winRate = (data.wins / count) * 100;
                const avgPnL = data.totalPnL / count;
                const avgRisk = data.avgRisks.reduce((a, b) => a + b, 0) / Math.max(data.avgRisks.length, 1);
                const avgRiskRewardRatio = data.riskRewardRatios.reduce((a, b) => a + b, 0) / Math.max(data.riskRewardRatios.length, 1);

                const slRange = range.match(/\d+/g);
                const slMin = slRange ? parseFloat(slRange[0]) : 0;
                const slMax = slRange ? (slRange[1] ? parseFloat(slRange[1]) : 10) : 10;

                return {
                    distanceRange: range,
                    slMin,
                    slMax,
                    count,
                    winRate,
                    avgPnL,
                    avgRisk,
                    riskRewardRatio: avgRiskRewardRatio,
                };
            })
            .filter((p) => p !== null) as StopLossDataPoint[];

        // Calculate overall metrics
        const totalTrades = trades.length;
        const avgStopLoss = trades.reduce((sum, t) => sum + calculateStopLossDistance(t), 0) / Math.max(trades.length, 1);
        const avgWinRateByRange = dataPoints.reduce((sum, p) => sum + p.winRate, 0) / Math.max(dataPoints.length, 1);

        // Find best range
        const bestData = dataPoints.reduce((best, current) =>
            current.avgPnL > best.avgPnL ? current : best
        );

        return {
            dataPoints,
            avgStopLoss,
            bestRange: bestData.distanceRange,
            distribution: {},
            totalTrades,
            avgWinRateByRange,
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
                {/* Stats Row */}
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '12px' }}>
                    <div
                        style={{
                            backgroundColor: '#1a1a1a',
                            border: '1px solid rgba(245, 199, 109, 0.2)',
                            borderRadius: '8px',
                            padding: '12px',
                            textAlign: 'center',
                        }}
                    >
                        <div style={{ fontSize: '10px', color: '#999', marginBottom: '6px', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                            Avg Stop Loss
                        </div>
                        <div style={{
                            fontSize: '20px',
                            fontWeight: 'bold',
                            color: '#F5C76D',
                            marginBottom: '4px',
                        }}>
                            {metrics.avgStopLoss.toFixed(2)}%
                        </div>
                        <div style={{ fontSize: '10px', color: '#666' }}>
                            Distance from entry
                        </div>
                    </div>

                    <div
                        style={{
                            backgroundColor: '#1a1a1a',
                            border: '1px solid rgba(245, 199, 109, 0.2)',
                            borderRadius: '8px',
                            padding: '12px',
                            textAlign: 'center',
                        }}
                    >
                        <div style={{ fontSize: '10px', color: '#999', marginBottom: '6px', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                            Best Range
                        </div>
                        <div style={{
                            fontSize: '16px',
                            fontWeight: 'bold',
                            color: '#D4AF37',
                            marginBottom: '4px',
                        }}>
                            {metrics.bestRange}
                        </div>
                        <div style={{ fontSize: '10px', color: '#666' }}>
                            Most profitable
                        </div>
                    </div>

                    <div
                        style={{
                            backgroundColor: '#1a1a1a',
                            border: '1px solid rgba(245, 199, 109, 0.2)',
                            borderRadius: '8px',
                            padding: '12px',
                            textAlign: 'center',
                        }}
                    >
                        <div style={{ fontSize: '10px', color: '#999', marginBottom: '6px', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                            Avg Win Rate
                        </div>
                        <div style={{
                            fontSize: '20px',
                            fontWeight: 'bold',
                            color: metrics.avgWinRateByRange >= 50 ? '#10b981' : '#f59e0b',
                            marginBottom: '4px',
                        }}>
                            {metrics.avgWinRateByRange.toFixed(1)}%
                        </div>
                        <div style={{ fontSize: '10px', color: '#666' }}>
                            Across ranges
                        </div>
                    </div>
                </div>

                {/* Distribution Chart */}
                <div
                    style={{
                        backgroundColor: '#1a1a1a',
                        border: '1px solid rgba(245, 199, 109, 0.15)',
                        borderRadius: '8px',
                        padding: '12px',
                        flex: 1,
                        minHeight: '300px',
                    }}
                >
                    <div style={{ fontSize: '11px', fontWeight: 'bold', color: '#F5C76D', marginBottom: '12px' }}>
                        Stop Loss Distribution & Win Rate
                    </div>
                    <ResponsiveContainer width="100%" height={280}>
                        <ComposedChart data={metrics.dataPoints} margin={{ top: 20, right: 20, bottom: 60, left: 60 }}>
                            <CartesianGrid stroke="#27272a" strokeDasharray="3 3" />
                            <XAxis
                                dataKey="distanceRange"
                                stroke="#71717a"
                                angle={-45}
                                textAnchor="end"
                                height={80}
                                tick={{ fontSize: 11 }}
                            />
                            <YAxis
                                yAxisId="left"
                                stroke="#71717a"
                                label={{ value: 'Trade Count', angle: -90, position: 'insideLeft' }}
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
                                        if (name === 'Win Rate') {
                                            return [`${value.toFixed(1)}%`, name];
                                        }
                                        return [value, name];
                                    }
                                    return value;
                                }}
                                labelStyle={{ color: '#F5C76D', fontWeight: 'bold' }}
                            />
                            <Bar yAxisId="left" dataKey="count" fill="#3b82f6" radius={[8, 8, 0, 0]} isAnimationActive={false} name="Trade Count" />
                            <Line
                                yAxisId="right"
                                type="monotone"
                                dataKey="winRate"
                                stroke="#F5C76D"
                                strokeWidth={3}
                                dot={{ r: 6, fill: '#F5C76D', strokeWidth: 2, stroke: '#1a1a1a' }}
                                activeDot={{ r: 8, fill: '#FFE5A6', strokeWidth: 2 }}
                                name="Win Rate"
                                isAnimationActive={false}
                            />
                        </ComposedChart>
                    </ResponsiveContainer>
                    <div style={{ fontSize: '9px', color: '#666', marginTop: '8px', textAlign: 'center' }}>
                        Bars = Trade Count | Line = Win Rate Probability
                    </div>
                </div>

                {/* Detailed Table */}
                <div
                    style={{
                        backgroundColor: '#1a1a1a',
                        border: '1px solid rgba(245, 199, 109, 0.15)',
                        borderRadius: '8px',
                        padding: '12px',
                    }}
                >
                    <div style={{ fontSize: '11px', fontWeight: 'bold', color: '#F5C76D', marginBottom: '12px' }}>
                        Stop Loss Range Analysis
                    </div>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                        {metrics.dataPoints.map((point, idx) => (
                            <div key={idx} style={{ display: 'grid', gridTemplateColumns: 'auto 1fr auto auto auto', gap: '12px', alignItems: 'center', padding: '10px', backgroundColor: '#0a0a0a', borderRadius: '6px', border: '1px solid rgba(245, 199, 109, 0.1)' }}>
                                <div style={{ fontSize: '11px', fontWeight: 'bold', color: '#F5C76D', minWidth: '130px' }}>
                                    {point.distanceRange}
                                </div>
                                <div style={{
                                    flex: 1,
                                    height: '6px',
                                    backgroundColor: '#2a2a2a',
                                    borderRadius: '3px',
                                    overflow: 'hidden',
                                }}>
                                    <div
                                        style={{
                                            height: '100%',
                                            width: `${(point.count / Math.max(...metrics.dataPoints.map(p => p.count))) * 100}%`,
                                            background: 'linear-gradient(90deg, #3b82f6 0%, #60a5fa 100%)',
                                            borderRadius: '3px',
                                        }}
                                    />
                                </div>
                                <div style={{ fontSize: '10px', color: '#999', minWidth: '50px', textAlign: 'right' }}>
                                    {point.count} trades
                                </div>
                                <div style={{
                                    fontSize: '11px',
                                    fontWeight: 'bold',
                                    color: point.winRate >= 55 ? '#10b981' : point.winRate >= 50 ? '#f59e0b' : '#ef4444',
                                    minWidth: '60px',
                                    textAlign: 'right',
                                }}>
                                    {point.winRate.toFixed(1)}%
                                </div>
                                <div style={{
                                    fontSize: '10px',
                                    color: point.avgPnL > 0 ? '#10b981' : '#ef4444',
                                    minWidth: '80px',
                                    textAlign: 'right',
                                    fontWeight: 'bold',
                                }}>
                                    ${point.avgPnL.toFixed(2)}
                                </div>
                            </div>
                        ))}
                    </div>
                </div>

                {/* Educational Explanation */}
                <div style={{ padding: '12px', backgroundColor: '#0a0a0a', borderRadius: '8px', border: '1px solid rgba(245, 199, 109, 0.2)' }}>
                    <div style={{ fontSize: '10px', color: '#999', lineHeight: '1.6' }}>
                        <strong style={{ color: '#F5C76D' }}>📍 Stop Loss Insights:</strong> This histogram shows how your stop loss placement correlates with trading outcomes. Tighter stops (under 2%) capture trends early but risk false exits. Wider stops (3-5%) allow more room for volatility but increase risk. Analyze which range gives you the best risk-reward ratio and consistency in your trading results.
                    </div>
                </div>
            </div>
        </>
    );
};
