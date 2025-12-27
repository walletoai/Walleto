import React, { useMemo, useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import {
    ResponsiveContainer,
    BarChart,
    Bar,
    CartesianGrid,
    XAxis,
    YAxis,
    Tooltip,
    Cell,
} from "recharts";

interface Props {
    data: any;
    widgetId?: string;
}

interface DayStats {
    day: string;
    dayFull: string;
    pnl: number;
    trades: number;
    wins: number;
    winRate: number;
}

export const DayOfWeekProfitabilityWidget: React.FC<Props> = ({ data, widgetId }) => {
    const { filteredTrades } = data;
    const [timeRange, setTimeRange] = useState("ALL");
    const [controlElement, setControlElement] = useState<HTMLElement | null>(null);

    useEffect(() => {
        if (!widgetId) return;
        const element = document.getElementById(`${widgetId}-controls`);
        setControlElement(element);
    }, [widgetId]);

    const chartData = useMemo(() => {
        if (!filteredTrades || filteredTrades.length === 0) return [];

        // Apply time range filter
        let trades = [...filteredTrades];
        const now = new Date();
        let startDate: Date | null = null;

        if (timeRange === "YEAR") {
            startDate = new Date(now.getFullYear(), 0, 1);
        } else if (timeRange === "MONTH") {
            startDate = new Date(now.getFullYear(), now.getMonth(), 1);
        }

        if (startDate) {
            trades = trades.filter((t) => t._dateObj >= startDate);
        }

        const days = [
            { day: 'Sun', dayFull: 'Sunday' },
            { day: 'Mon', dayFull: 'Monday' },
            { day: 'Tue', dayFull: 'Tuesday' },
            { day: 'Wed', dayFull: 'Wednesday' },
            { day: 'Thu', dayFull: 'Thursday' },
            { day: 'Fri', dayFull: 'Friday' },
            { day: 'Sat', dayFull: 'Saturday' }
        ];

        const dayStats: DayStats[] = days.map(d => ({
            day: d.day,
            dayFull: d.dayFull,
            pnl: 0,
            trades: 0,
            wins: 0,
            winRate: 0
        }));

        trades.forEach((t: any) => {
            const dayIndex = t._dateObj.getDay();
            const pnlUsd = t.pnl_usd || 0;
            dayStats[dayIndex].pnl += pnlUsd;
            dayStats[dayIndex].trades += 1;
            if (pnlUsd > 0) dayStats[dayIndex].wins += 1;
        });

        // Calculate win rates
        dayStats.forEach((d) => {
            d.winRate = d.trades > 0 ? (d.wins / d.trades) * 100 : 0;
        });

        return dayStats;
    }, [filteredTrades, timeRange]);

    if (chartData.length === 0) {
        return <div className="text-center py-8 text-gray-500">No data in this range yet.</div>;
    }

    // Calculate metrics
    const bestDay = chartData.reduce((best, current) =>
        current.pnl > best.pnl ? current : best
    );
    const worstDay = chartData.reduce((worst, current) =>
        current.pnl < worst.pnl ? current : worst
    );
    const bestWinRate = Math.max(...chartData.map(d => d.winRate));
    const avgPnl = chartData.reduce((sum, d) => sum + d.pnl, 0) / chartData.filter(d => d.trades > 0).length;

    const renderTooltip = (props: any) => {
        const { payload } = props;
        if (payload && payload.length > 0) {
            const data = payload[0].payload;
            return (
                <div style={{
                    backgroundColor: '#161616',
                    border: '1px solid #27272a',
                    borderRadius: '8px',
                    padding: '12px',
                    color: '#fff'
                }}>
                    <div style={{ fontWeight: 'bold', marginBottom: '8px', color: '#D4AF37' }}>
                        {data.dayFull}
                    </div>
                    <div style={{ fontSize: '12px', marginBottom: '4px', color: data.pnl >= 0 ? '#10b981' : '#ef4444' }}>
                        PnL: ${data.pnl.toFixed(2)}
                    </div>
                    <div style={{ fontSize: '12px', marginBottom: '4px', color: '#a0a0a0' }}>
                        Trades: {data.trades}
                    </div>
                    <div style={{ fontSize: '12px', marginBottom: '4px', color: data.winRate >= 50 ? '#10b981' : '#ef4444' }}>
                        Win Rate: {data.winRate.toFixed(1)}%
                    </div>
                    <div style={{ fontSize: '12px', color: '#f5c76d' }}>
                        Avg: ${(data.pnl / data.trades).toFixed(2)}/trade
                    </div>
                </div>
            );
        }
        return null;
    };

    const controlsPortal = controlElement ? (
        createPortal(
            <div style={{ display: 'flex', gap: '8px' }}>
                <select
                    value={timeRange}
                    onChange={(e) => setTimeRange(e.target.value)}
                    className="appearance-none text-xs font-bold rounded px-3 py-2 focus:outline-none transition-colors cursor-pointer"
                    style={{
                        backgroundColor: '#23180C',
                        color: '#F5C76D',
                        border: '1px solid rgba(245, 199, 109, 0.3)',
                        minWidth: '100px'
                    }}
                >
                    <option value="ALL">All</option>
                    <option value="YEAR">Year to Date</option>
                    <option value="MONTH">Monthly</option>
                </select>
            </div>,
            controlElement
        )
    ) : null;

    return (
        <div style={{ height: '100%', display: 'flex', flexDirection: 'column' }}>
            {controlsPortal}
            {/* Stats Row */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '10px', marginBottom: '16px' }}>
                <div style={{
                    backgroundColor: '#1a1a1a',
                    border: '1px solid #27272a',
                    borderRadius: '8px',
                    padding: '12px',
                    textAlign: 'center'
                }}>
                    <div style={{ fontSize: '10px', color: '#999', marginBottom: '4px', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                        Best Day
                    </div>
                    <div style={{ fontSize: '16px', fontWeight: 'bold', color: '#10b981', marginBottom: '2px' }}>
                        {bestDay.day}
                    </div>
                    <div style={{ fontSize: '10px', color: '#666' }}>
                        ${bestDay.pnl.toFixed(0)}
                    </div>
                </div>

                <div style={{
                    backgroundColor: '#1a1a1a',
                    border: '1px solid #27272a',
                    borderRadius: '8px',
                    padding: '12px',
                    textAlign: 'center'
                }}>
                    <div style={{ fontSize: '10px', color: '#999', marginBottom: '4px', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                        Worst Day
                    </div>
                    <div style={{ fontSize: '16px', fontWeight: 'bold', color: '#ef4444', marginBottom: '2px' }}>
                        {worstDay.day}
                    </div>
                    <div style={{ fontSize: '10px', color: '#666' }}>
                        ${worstDay.pnl.toFixed(0)}
                    </div>
                </div>

                <div style={{
                    backgroundColor: '#1a1a1a',
                    border: '1px solid #27272a',
                    borderRadius: '8px',
                    padding: '12px',
                    textAlign: 'center'
                }}>
                    <div style={{ fontSize: '10px', color: '#999', marginBottom: '4px', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                        Best Win Rate
                    </div>
                    <div style={{ fontSize: '16px', fontWeight: 'bold', color: '#10b981', marginBottom: '2px' }}>
                        {bestWinRate.toFixed(1)}%
                    </div>
                    <div style={{ fontSize: '10px', color: '#666' }}>
                        Peak day
                    </div>
                </div>

                <div style={{
                    backgroundColor: '#1a1a1a',
                    border: '1px solid #27272a',
                    borderRadius: '8px',
                    padding: '12px',
                    textAlign: 'center'
                }}>
                    <div style={{ fontSize: '10px', color: '#999', marginBottom: '4px', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                        Avg PnL/Day
                    </div>
                    <div style={{ fontSize: '16px', fontWeight: 'bold', color: avgPnl >= 0 ? '#10b981' : '#ef4444', marginBottom: '2px' }}>
                        ${avgPnl.toFixed(2)}
                    </div>
                    <div style={{ fontSize: '10px', color: '#666' }}>
                        Average per day
                    </div>
                </div>
            </div>

            {/* Chart */}
            <div style={{ height: 320, width: '100%' }}>
                <ResponsiveContainer width="100%" height={320}>
                    <BarChart data={chartData} margin={{ top: 20, right: 20, left: 60, bottom: 20 }}>
                        <CartesianGrid stroke="#27272a" strokeDasharray="3 3" />
                        <XAxis
                            dataKey="day"
                            stroke="#71717a"
                            tick={{ fontSize: 12 }}
                        />
                        <YAxis stroke="#71717a" tick={{ fontSize: 11 }} label={{ value: 'PnL ($)', angle: -90, position: 'insideLeft', offset: -10 }} />
                        <Tooltip content={renderTooltip} />
                        <Bar dataKey="pnl" radius={[4, 4, 0, 0]}>
                            {chartData.map((entry, index) => (
                                <Cell
                                    key={`cell-${index}`}
                                    fill={entry.pnl >= 0 ? '#10b981' : '#ef4444'}
                                />
                            ))}
                        </Bar>
                    </BarChart>
                </ResponsiveContainer>
            </div>
        </div>
    );
};
