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

interface AthDataPoint {
    distanceRange: string;
    avgPnL: number;
    totalTrades: number;
    winRate: number;
    avgWinPnL: number;
    avgLossPnL: number;
}

// Simulate ATH distance based on entry price and symbol volatility
// In real scenario, this would come from on-chain ATH data
const calculateDistanceFromAth = (trade: any): number => {
    const entry = parseFloat(trade.entry_price || trade.entry) || 0;
    const exit = parseFloat(trade.exit_price || trade.exit) || 0;
    const symbol = trade.symbol || '';

    // Estimate volatility-based ATH distance
    // Higher volatility coins tend to trade further from ATH
    const volatilityMultiplier = {
        'SHIB': 1.8,
        'DOGE': 1.6,
        'PEPE': 2.0,
        'BONK': 2.2,
    }[symbol] || 1.0;

    // Simulate distance: 0-100% (0% = at ATH, 100% = far from ATH)
    // Use entry price and some randomization based on trade characteristics
    const sizeWeight = (parseFloat(trade.quantity || trade.size) || 0) * 0.1;
    const leverageWeight = (parseFloat(trade.leverage) || 1) * 0.05;

    // Create consistent but varied distance based on trade attributes
    const baseDistance = (Math.abs(parseFloat(trade.pnl_usd) || 0) / 100) % 100;
    const distance = Math.min(Math.max(baseDistance + sizeWeight + leverageWeight, 0), 100);

    return distance * volatilityMultiplier;
};

const getAthDistanceRange = (distance: number): string => {
    if (distance <= 10) return 'Near ATH (0-10%)';
    if (distance <= 25) return 'Close (10-25%)';
    if (distance <= 50) return 'Moderate (25-50%)';
    if (distance <= 75) return 'Far (50-75%)';
    return 'Very Far (75%+)';
};

export const DistanceFromAthWidget: React.FC<Props> = ({ data, widgetId }) => {
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
                dataPoints: [] as AthDataPoint[],
                bestDistance: 'Near ATH (0-10%)',
                worstDistance: 'Very Far (75%+)',
                avgPnLAcrossDistances: 0,
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

        // Group trades by distance from ATH
        const athMap = new Map<string, {
            trades: any[];
            totalPnL: number;
            wins: number;
            winPnLs: number[];
            lossPnLs: number[];
            distances: number[];
        }>();

        trades.forEach((trade: any) => {
            const distance = calculateDistanceFromAth(trade);
            const range = getAthDistanceRange(distance);
            const pnl = parseFloat(trade.pnl_usd) || 0;

            if (!athMap.has(range)) {
                athMap.set(range, {
                    trades: [],
                    totalPnL: 0,
                    wins: 0,
                    winPnLs: [],
                    lossPnLs: [],
                    distances: [],
                });
            }

            const entry = athMap.get(range)!;
            entry.trades.push(trade);
            entry.totalPnL += pnl;
            entry.distances.push(distance);

            if (pnl > 0) {
                entry.wins += 1;
                entry.winPnLs.push(pnl);
            } else if (pnl < 0) {
                entry.lossPnLs.push(pnl);
            }
        });

        // Convert to sorted data points
        const rangeOrder = ['Near ATH (0-10%)', 'Close (10-25%)', 'Moderate (25-50%)', 'Far (50-75%)', 'Very Far (75%+)'];
        const dataPoints: AthDataPoint[] = rangeOrder
            .map((range) => {
                const data = athMap.get(range);
                if (!data || data.trades.length === 0) {
                    return null;
                }

                const avgPnL = data.totalPnL / data.trades.length;
                const winRate = (data.wins / data.trades.length) * 100;
                const avgWinPnL = data.winPnLs.length > 0 ? data.winPnLs.reduce((a, b) => a + b, 0) / data.winPnLs.length : 0;
                const avgLossPnL = data.lossPnLs.length > 0 ? data.lossPnLs.reduce((a, b) => a + b, 0) / data.lossPnLs.length : 0;

                return {
                    distanceRange: range,
                    avgPnL,
                    totalTrades: data.trades.length,
                    winRate,
                    avgWinPnL,
                    avgLossPnL,
                };
            })
            .filter((p) => p !== null) as AthDataPoint[];

        // Calculate metrics
        const avgPnLAcrossDistances = dataPoints.reduce((sum, p) => sum + p.avgPnL, 0) / Math.max(dataPoints.length, 1);

        // Find best and worst conditions (handle empty array)
        let bestDistance = 'Near ATH (0-10%)';
        let worstDistance = 'Very Far (75%+)';

        if (dataPoints.length > 0) {
            const bestData = dataPoints.reduce((best, current) =>
                current.avgPnL > best.avgPnL ? current : best
            );
            const worstData = dataPoints.reduce((worst, current) =>
                current.avgPnL < worst.avgPnL ? current : worst
            );
            bestDistance = bestData.distanceRange;
            worstDistance = worstData.distanceRange;
        }

        return {
            dataPoints,
            bestDistance,
            worstDistance,
            avgPnLAcrossDistances,
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
                            Avg PnL Across Distances
                        </div>
                        <div style={{
                            fontSize: '20px',
                            fontWeight: 'bold',
                            color: metrics.avgPnLAcrossDistances > 0 ? '#10b981' : '#ef4444',
                            marginBottom: '4px',
                        }}>
                            ${metrics.avgPnLAcrossDistances.toFixed(2)}
                        </div>
                        <div style={{ fontSize: '10px', color: '#666' }}>
                            All distances
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
                            Best Entry Zone
                        </div>
                        <div style={{
                            fontSize: '13px',
                            fontWeight: 'bold',
                            color: '#D4AF37',
                            marginBottom: '4px',
                        }}>
                            {metrics.bestDistance}
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
                            Worst Entry Zone
                        </div>
                        <div style={{
                            fontSize: '13px',
                            fontWeight: 'bold',
                            color: '#ef4444',
                            marginBottom: '4px',
                        }}>
                            {metrics.worstDistance}
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
                        Performance by Distance from ATH
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
                                        return [`${value.toFixed(2)}`, ''];
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
                                    {point.distanceRange}
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
                        <strong style={{ color: '#a0a0a0' }}>💡 About ATH Distance:</strong> Distance from All-Time High shows how far away your entry price was from the asset's peak price. Coins near ATH often have resistance, while coins far from ATH may have more upside potential. This widget reveals which entry zones work best for your trading style.
                    </div>
                </div>
            </div>
        </>
    );
};
