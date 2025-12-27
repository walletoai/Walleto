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
} from 'recharts';

interface Props {
    data: any;
    widgetId?: string;
}

interface FundingRateDataPoint {
    fundingRateCondition: string;
    avgPnL: number;
    totalTrades: number;
    winRate: number;
    avgWinPnL: number;
    avgLossPnL: number;
}

// Simulate funding rate conditions based on trade characteristics
// In real scenario, this would come from exchange data
const calculateFundingRateCondition = (trade: any): string => {
    const leverage = parseFloat(trade.leverage) || 1;
    const size = parseFloat(trade.quantity || trade.size) || 0;
    const pnl = parseFloat(trade.pnl_usd) || 0;

    // Simulate funding rates: higher leverage + longer hold = higher funding impact
    // We'll estimate based on position characteristics
    if (leverage <= 2) {
        return 'Low Funding (1-2x)';
    } else if (leverage <= 5) {
        return 'Medium Funding (3-5x)';
    } else if (leverage <= 10) {
        return 'High Funding (6-10x)';
    } else {
        return 'Extreme Funding (10x+)';
    }
};

export const FundingRateBiasWidget: React.FC<Props> = ({ data, widgetId }) => {
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
                dataPoints: [] as FundingRateDataPoint[],
                avgFundingImpact: 0,
                bestCondition: 'Low Funding (1-2x)',
                worstCondition: 'Extreme Funding (10x+)',
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

        // Group trades by funding rate condition
        const fundingMap = new Map<string, {
            trades: any[];
            totalPnL: number;
            wins: number;
            winPnLs: number[];
            lossPnLs: number[];
        }>();

        trades.forEach((trade: any) => {
            const condition = calculateFundingRateCondition(trade);
            const pnl = parseFloat(trade.pnl_usd) || 0;

            if (!fundingMap.has(condition)) {
                fundingMap.set(condition, {
                    trades: [],
                    totalPnL: 0,
                    wins: 0,
                    winPnLs: [],
                    lossPnLs: [],
                });
            }

            const entry = fundingMap.get(condition)!;
            entry.trades.push(trade);
            entry.totalPnL += pnl;

            if (pnl > 0) {
                entry.wins += 1;
                entry.winPnLs.push(pnl);
            } else if (pnl < 0) {
                entry.lossPnLs.push(pnl);
            }
        });

        // Convert to sorted data points
        const conditionOrder = ['Low Funding (1-2x)', 'Medium Funding (3-5x)', 'High Funding (6-10x)', 'Extreme Funding (10x+)'];
        const dataPoints: FundingRateDataPoint[] = conditionOrder
            .map((condition) => {
                const data = fundingMap.get(condition);
                if (!data || data.trades.length === 0) {
                    return null;
                }

                const avgPnL = data.totalPnL / data.trades.length;
                const winRate = (data.wins / data.trades.length) * 100;
                const avgWinPnL = data.winPnLs.length > 0 ? data.winPnLs.reduce((a, b) => a + b, 0) / data.winPnLs.length : 0;
                const avgLossPnL = data.lossPnLs.length > 0 ? data.lossPnLs.reduce((a, b) => a + b, 0) / data.lossPnLs.length : 0;

                return {
                    fundingRateCondition: condition,
                    avgPnL,
                    totalTrades: data.trades.length,
                    winRate,
                    avgWinPnL,
                    avgLossPnL,
                };
            })
            .filter((p) => p !== null) as FundingRateDataPoint[];

        // Calculate average funding impact
        const avgFundingImpact = dataPoints.reduce((sum, p) => sum + p.avgPnL, 0) / Math.max(dataPoints.length, 1);

        // Find best and worst conditions (handle empty array)
        let bestConditionName = 'Low Funding (1-2x)';
        let worstConditionName = 'Extreme Funding (10x+)';

        if (dataPoints.length > 0) {
            const bestCondition = dataPoints.reduce((best, current) =>
                current.avgPnL > best.avgPnL ? current : best
            );
            const worstCondition = dataPoints.reduce((worst, current) =>
                current.avgPnL < worst.avgPnL ? current : worst
            );
            bestConditionName = bestCondition.fundingRateCondition;
            worstConditionName = worstCondition.fundingRateCondition;
        }

        return {
            dataPoints,
            avgFundingImpact,
            bestCondition: bestConditionName,
            worstCondition: worstConditionName,
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

    const maxAbsPnL = Math.max(...metrics.dataPoints.map((p) => Math.abs(p.avgPnL)), 1);

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
                            Avg PnL Across Funding
                        </div>
                        <div style={{
                            fontSize: '20px',
                            fontWeight: 'bold',
                            color: metrics.avgFundingImpact > 0 ? '#10b981' : '#ef4444',
                            marginBottom: '4px',
                        }}>
                            ${metrics.avgFundingImpact.toFixed(2)}
                        </div>
                        <div style={{ fontSize: '10px', color: '#666' }}>
                            All leverage levels
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
                            Best Condition
                        </div>
                        <div style={{
                            fontSize: '14px',
                            fontWeight: 'bold',
                            color: '#D4AF37',
                            marginBottom: '4px',
                        }}>
                            {metrics.bestCondition}
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
                            Worst Condition
                        </div>
                        <div style={{
                            fontSize: '14px',
                            fontWeight: 'bold',
                            color: '#ef4444',
                            marginBottom: '4px',
                        }}>
                            {metrics.worstCondition}
                        </div>
                        <div style={{ fontSize: '10px', color: '#666' }}>
                            Least profitable
                        </div>
                    </div>
                </div>

                {/* Chart */}
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
                        PnL by Funding Rate Condition
                    </div>
                    <ResponsiveContainer width="100%" height={280}>
                        <ComposedChart data={metrics.dataPoints} margin={{ top: 20, right: 20, bottom: 60, left: 60 }}>
                            <CartesianGrid stroke="#27272a" strokeDasharray="3 3" />
                            <XAxis
                                dataKey="fundingRateCondition"
                                stroke="#71717a"
                                angle={-45}
                                textAnchor="end"
                                height={80}
                                tick={{ fontSize: 11 }}
                            />
                            <YAxis
                                stroke="#71717a"
                                label={{ value: 'Avg PnL ($)', angle: -90, position: 'insideLeft' }}
                            />
                            <YAxis
                                yAxisId="right"
                                stroke="#F5C76D"
                                label={{ value: 'Win Rate (%)', angle: 90, position: 'insideRight' }}
                                domain={[0, 100]}
                            />
                            <Tooltip
                                contentStyle={{
                                    backgroundColor: '#1a1a1a',
                                    border: '1px solid #27272a',
                                    borderRadius: '6px',
                                }}
                                formatter={(value: any) => {
                                    if (typeof value === 'number') {
                                        return [`$${value.toFixed(2)}`, ''];
                                    }
                                    return value;
                                }}
                                labelStyle={{ color: '#F5C76D' }}
                            />
                            <ReferenceLine
                                y={0}
                                stroke="#71717a"
                                strokeDasharray="5 5"
                                label={{ value: 'Breakeven', position: 'insideRight', offset: -10, fill: '#71717a', fontSize: 10 }}
                            />
                            <Bar dataKey="avgPnL" radius={[4, 4, 0, 0]} isAnimationActive={false} name="Avg PnL">
                                {metrics.dataPoints.map((entry, index) => {
                                    const color = entry.avgPnL > 0 ? '#10b981' : '#ef4444';
                                    return <Cell key={`cell-${index}`} fill={color} />;
                                })}
                            </Bar>
                            <Line
                                type="monotone"
                                dataKey="winRate"
                                stroke="#F5C76D"
                                strokeWidth={2}
                                dot={{ r: 4, fill: '#F5C76D' }}
                                yAxisId="right"
                                name="Win Rate (%)"
                                isAnimationActive={false}
                            />
                        </ComposedChart>
                    </ResponsiveContainer>
                    <div style={{ fontSize: '9px', color: '#666', marginTop: '8px', textAlign: 'center' }}>
                        Bars = Average PnL | Line = Win Rate (%)
                    </div>
                </div>

                {/* Details Table */}
                <div
                    style={{
                        backgroundColor: '#1a1a1a',
                        border: '1px solid rgba(245, 199, 109, 0.15)',
                        borderRadius: '8px',
                        padding: '12px',
                    }}
                >
                    <div style={{ fontSize: '11px', fontWeight: 'bold', color: '#F5C76D', marginBottom: '12px' }}>
                        Detailed Breakdown
                    </div>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                        {metrics.dataPoints.map((point, idx) => (
                            <div key={idx} style={{ display: 'grid', gridTemplateColumns: 'auto 1fr auto auto auto', gap: '12px', alignItems: 'center', padding: '8px', backgroundColor: '#0a0a0a', borderRadius: '4px' }}>
                                <div style={{ fontSize: '11px', fontWeight: 'bold', color: '#F5C76D', minWidth: '140px' }}>
                                    {point.fundingRateCondition}
                                </div>
                                <div style={{ fontSize: '10px', color: '#999' }}>
                                    {point.totalTrades} trades
                                </div>
                                <div style={{
                                    fontSize: '11px',
                                    fontWeight: 'bold',
                                    color: point.avgPnL > 0 ? '#10b981' : '#ef4444',
                                    minWidth: '80px',
                                    textAlign: 'right',
                                }}>
                                    ${point.avgPnL.toFixed(2)}
                                </div>
                                <div style={{ fontSize: '10px', color: '#999', minWidth: '70px', textAlign: 'right' }}>
                                    {point.winRate.toFixed(1)}%
                                </div>
                                <div style={{ fontSize: '9px', color: '#666', minWidth: '60px', textAlign: 'right' }}>
                                    W: ${point.avgWinPnL.toFixed(0)} | L: ${point.avgLossPnL.toFixed(0)}
                                </div>
                            </div>
                        ))}
                    </div>
                </div>

                {/* Explanation */}
                <div style={{ padding: '8px', backgroundColor: '#0a0a0a', borderRadius: '4px', borderLeft: '3px solid #D4AF37' }}>
                    <div style={{ fontSize: '10px', color: '#999', lineHeight: '1.4' }}>
                        <strong style={{ color: '#a0a0a0' }}>💡 About Funding Rates:</strong> Funding rates are payments between traders holding perpetual contracts. High leverage = higher funding exposure. This widget shows your performance across different leverage levels (which correlate with funding rate impact). If you're consistently losing money at high leverage, funding rates may be eating your profits.
                    </div>
                </div>
            </div>
        </>
    );
};
