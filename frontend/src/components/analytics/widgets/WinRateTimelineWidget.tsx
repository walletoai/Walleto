import React, { useMemo, useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import {
    ResponsiveContainer,
    LineChart,
    Line,
    CartesianGrid,
    XAxis,
    YAxis,
    Tooltip,
    Legend,
    ReferenceLine,
} from "recharts";

interface Props {
    data: any;
    widgetId?: string;
}

export const WinRateTimelineWidget: React.FC<Props> = ({ data, widgetId }) => {
    const { filteredTrades } = data;
    const [rollingWindow, setRollingWindow] = useState(20);
    const [timeRange, setTimeRange] = useState("ALL");
    const [controlElement, setControlElement] = useState<HTMLElement | null>(null);

    useEffect(() => {
        if (!widgetId) return;
        const element = document.getElementById(`${widgetId}-controls`);
        setControlElement(element);
    }, [widgetId]);

    const chartData = useMemo(() => {
        if (!filteredTrades || filteredTrades.length === 0) return [];

        // Sort by date
        let sorted = [...filteredTrades].sort((a, b) => a._dateObj.getTime() - b._dateObj.getTime());

        // Apply time range filter
        const now = new Date();
        let startDate: Date | null = null;

        if (timeRange === "YEAR") {
            startDate = new Date(now.getFullYear(), 0, 1);
        } else if (timeRange === "MONTH") {
            startDate = new Date(now.getFullYear(), now.getMonth(), 1);
        }

        if (startDate) {
            sorted = sorted.filter((t) => t._dateObj >= startDate);
        }

        const series: any[] = [];

        // Calculate rolling window win rate for each trade
        for (let i = 0; i < sorted.length; i++) {
            const currentTrade = sorted[i];

            // For rolling window, look at last N trades
            const windowStart = Math.max(0, i - rollingWindow + 1);
            const windowTrades = sorted.slice(windowStart, i + 1);

            let windowWins = 0;
            for (const t of windowTrades) {
                if ((t.pnl_usd || 0) > 0) windowWins++;
            }
            const windowWinRate = (windowWins / windowTrades.length) * 100;

            // Also calculate cumulative from start
            let cumulativeWins = 0;
            for (let j = 0; j <= i; j++) {
                if ((sorted[j].pnl_usd || 0) > 0) cumulativeWins++;
            }
            const cumulativeWinRate = ((cumulativeWins / (i + 1)) * 100);

            // Only add data points periodically to avoid too many points
            if (i % Math.max(1, Math.floor(sorted.length / 50)) === 0 || i === sorted.length - 1) {
                series.push({
                    date: currentTrade._dateObj.toLocaleDateString(undefined, { month: 'short', day: 'numeric' }),
                    rollingWinRate: Number(windowWinRate.toFixed(2)),
                    cumulativeWinRate: Number(cumulativeWinRate.toFixed(2)),
                    tradeIndex: i + 1,
                });
            }
        }

        return series;
    }, [filteredTrades, rollingWindow, timeRange]);

    if (chartData.length === 0) {
        return <div className="text-center py-8 text-gray-500">No data in this range yet.</div>;
    }

    const finalData = chartData[chartData.length - 1];
    const cumulativeWinRate = finalData.cumulativeWinRate;
    const rollingWinRate = finalData.rollingWinRate;

    // Calculate additional metrics
    const allRollingRates = chartData.map(d => d.rollingWinRate);
    const peakWinRate = Math.max(...allRollingRates);
    const lowestWinRate = Math.min(...allRollingRates);
    const avgWinRate = (allRollingRates.reduce((a, b) => a + b, 0) / allRollingRates.length);
    const stability = (allRollingRates.reduce((sum, rate) => sum + Math.pow(rate - avgWinRate, 2), 0) / allRollingRates.length) ** 0.5;

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
                <select
                    value={rollingWindow}
                    onChange={(e) => setRollingWindow(Number(e.target.value))}
                    className="appearance-none text-xs font-bold rounded px-3 py-2 focus:outline-none transition-colors cursor-pointer"
                    style={{
                        backgroundColor: '#23180C',
                        color: '#F5C76D',
                        border: '1px solid rgba(245, 199, 109, 0.3)',
                        minWidth: '100px'
                    }}
                >
                    <option value={10}>Last 10</option>
                    <option value={20}>Last 20</option>
                    <option value={50}>Last 50</option>
                    <option value={100}>Last 100</option>
                </select>
            </div>,
            controlElement
        )
    ) : null;

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
                    <div style={{ fontWeight: 'bold', marginBottom: '8px', color: '#D4AF37' }}>{data.date}</div>
                    <div style={{ fontSize: '12px', marginBottom: '4px', color: '#10b981' }}>
                        Rolling ({rollingWindow} trades): {data.rollingWinRate.toFixed(1)}%
                    </div>
                    <div style={{ fontSize: '12px', color: '#6366f1' }}>
                        Cumulative: {data.cumulativeWinRate.toFixed(1)}%
                    </div>
                </div>
            );
        }
        return null;
    };

    return (
        <div style={{ height: '100%', display: 'flex', flexDirection: 'column', justifyContent: 'space-between' }}>
            {controlsPortal}

            {/* Chart */}
            <div style={{ height: 250, minHeight: 250, width: '100%', marginBottom: '24px' }}>
                <ResponsiveContainer width="100%" height="100%">
                    <LineChart data={chartData} margin={{ top: 5, right: 10, left: 0, bottom: 5 }}>
                        <CartesianGrid stroke="#27272a" strokeDasharray="3 3" />
                        <XAxis dataKey="date" stroke="#71717a" tick={{ fontSize: 11 }} />
                        <YAxis stroke="#71717a" tick={{ fontSize: 11 }} domain={[0, 100]} />
                        <Tooltip content={renderTooltip} />
                        <ReferenceLine y={50} stroke="#ef4444" strokeDasharray="5 5" label={{ value: 'Break-even (50%)', position: 'insideLeft', offset: 10, fill: '#ef4444', fontSize: 10 }} />
                        <ReferenceLine y={60} stroke="#10b981" strokeDasharray="5 5" label={{ value: 'Target (60%)', position: 'insideLeft', offset: -10, fill: '#10b981', fontSize: 10 }} />
                        <Legend wrapperStyle={{ paddingTop: '8px' }} />
                        <Line
                            type="monotone"
                            dataKey="rollingWinRate"
                            stroke="#3b82f6"
                            strokeWidth={3}
                            dot={false}
                            name={`Rolling (${rollingWindow} trades)`}
                            isAnimationActive={true}
                        />
                    </LineChart>
                </ResponsiveContainer>
            </div>

            {/* Stats Cards */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '12px' }}>
                <div style={{
                    backgroundColor: '#1a1a1a',
                    border: '1px solid #27272a',
                    borderRadius: '8px',
                    padding: '14px',
                    textAlign: 'center'
                }}>
                    <div style={{ fontSize: '11px', color: '#999', marginBottom: '6px', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                        Current
                    </div>
                    <div style={{ fontSize: '20px', fontWeight: 'bold', color: rollingWinRate >= 60 ? '#10b981' : rollingWinRate >= 50 ? '#D4AF37' : '#ef4444', marginBottom: '4px' }}>
                        {rollingWinRate.toFixed(1)}%
                    </div>
                    <div style={{ fontSize: '9px', color: '#666' }}>Last {rollingWindow} trades</div>
                </div>

                <div style={{
                    backgroundColor: '#1a1a1a',
                    border: '1px solid #27272a',
                    borderRadius: '8px',
                    padding: '14px',
                    textAlign: 'center'
                }}>
                    <div style={{ fontSize: '11px', color: '#999', marginBottom: '6px', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                        Peak
                    </div>
                    <div style={{ fontSize: '20px', fontWeight: 'bold', color: '#10b981', marginBottom: '4px' }}>
                        {peakWinRate.toFixed(1)}%
                    </div>
                    <div style={{ fontSize: '9px', color: '#666' }}>Best period</div>
                </div>

                <div style={{
                    backgroundColor: '#1a1a1a',
                    border: '1px solid #27272a',
                    borderRadius: '8px',
                    padding: '14px',
                    textAlign: 'center'
                }}>
                    <div style={{ fontSize: '11px', color: '#999', marginBottom: '6px', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                        Lowest
                    </div>
                    <div style={{ fontSize: '20px', fontWeight: 'bold', color: '#ef4444', marginBottom: '4px' }}>
                        {lowestWinRate.toFixed(1)}%
                    </div>
                    <div style={{ fontSize: '9px', color: '#666' }}>Worst period</div>
                </div>

                <div style={{
                    backgroundColor: '#1a1a1a',
                    border: '1px solid #27272a',
                    borderRadius: '8px',
                    padding: '14px',
                    textAlign: 'center'
                }}>
                    <div style={{ fontSize: '11px', color: '#999', marginBottom: '6px', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                        Stability
                    </div>
                    <div style={{ fontSize: '20px', fontWeight: 'bold', color: '#f59e0b', marginBottom: '4px' }}>
                        {stability.toFixed(1)}%
                    </div>
                    <div style={{ fontSize: '9px', color: '#666' }}>Std deviation</div>
                </div>
            </div>
        </div>
    );
};
