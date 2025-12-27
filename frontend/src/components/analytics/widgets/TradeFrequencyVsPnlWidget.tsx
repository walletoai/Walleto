import React, { useMemo } from 'react';
import {
    ResponsiveContainer,
    ComposedChart,
    Bar,
    Line,
    CartesianGrid,
    XAxis,
    YAxis,
    Tooltip,
    Cell,
    Legend,
} from "recharts";

interface Props {
    data: any;
}

export const TradeFrequencyVsPnlWidget: React.FC<Props> = ({ data }) => {
    const { filteredTrades } = data;

    const chartData = useMemo(() => {
        if (!filteredTrades || filteredTrades.length === 0) return [];

        const dailyMap = new Map<string, { pnl: number; trades: number }>();

        filteredTrades.forEach((t: any) => {
            const day = t._dateObj.toISOString().slice(0, 10);
            if (!dailyMap.has(day)) {
                dailyMap.set(day, { pnl: 0, trades: 0 });
            }
            const entry = dailyMap.get(day)!;
            entry.pnl += t.pnl_usd || 0;
            entry.trades += 1;
        });

        // Sort by date and create chart data
        const sorted = Array.from(dailyMap.entries())
            .sort((a, b) => a[0].localeCompare(b[0]))
            .map(([day, stats]) => ({
                date: day.slice(5), // MM-DD format
                trades: stats.trades,
                pnl: Number(stats.pnl.toFixed(2)),
                isProfitable: stats.pnl >= 0,
            }));

        // Calculate 7-day moving average for PnL trend
        return sorted.map((current, index) => {
            const start = Math.max(0, index - 6);
            const window = sorted.slice(start, index + 1);
            const avgPnl = window.reduce((sum, d) => sum + d.pnl, 0) / window.length;
            return {
                ...current,
                trendPnl: Number(avgPnl.toFixed(2))
            };
        });
    }, [filteredTrades]);

    if (chartData.length === 0) {
        return <div className="text-center py-8 text-gray-500">No data in this range yet.</div>;
    }

    // Calculate statistics
    const totalPnl = chartData.reduce((sum, d) => sum + d.pnl, 0);
    const profitableDays = chartData.filter(d => d.isProfitable).length;
    const winRate = (profitableDays / chartData.length) * 100;
    const avgTrades = chartData.reduce((sum, d) => sum + d.trades, 0) / chartData.length;
    const avgPnl = totalPnl / chartData.length;
    const maxTrades = Math.max(...chartData.map(d => d.trades));

    const renderTooltip = (props: any) => {
        const { payload } = props;
        if (payload && payload.length > 0) {
            const data = payload[0].payload;
            const pnlPerTrade = (data.pnl / data.trades).toFixed(2);
            return (
                <div style={{
                    backgroundColor: '#161616',
                    border: '1px solid #27272a',
                    borderRadius: '8px',
                    padding: '12px',
                    color: '#fff'
                }}>
                    <div style={{ fontWeight: 'bold', marginBottom: '8px', color: '#D4AF37' }}>
                        {data.date}
                    </div>
                    <div style={{ fontSize: '12px', marginBottom: '4px', color: '#a0a0a0' }}>
                        Trades: {data.trades}
                    </div>
                    <div style={{ fontSize: '12px', marginBottom: '4px', color: data.pnl >= 0 ? '#10b981' : '#ef4444' }}>
                        Daily PnL: ${data.pnl.toFixed(2)}
                    </div>
                    <div style={{ fontSize: '12px', color: '#f5c76d' }}>
                        Per Trade: ${pnlPerTrade}
                    </div>
                </div>
            );
        }
        return null;
    };

    return (
        <div style={{ height: '100%', display: 'flex', flexDirection: 'column' }}>
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
                        Total PnL
                    </div>
                    <div style={{ fontSize: '16px', fontWeight: 'bold', color: totalPnl >= 0 ? '#10b981' : '#ef4444', marginBottom: '2px' }}>
                        ${totalPnl.toFixed(0)}
                    </div>
                    <div style={{ fontSize: '10px', color: '#666' }}>
                        All days
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
                        Day Win Rate
                    </div>
                    <div style={{ fontSize: '16px', fontWeight: 'bold', color: winRate >= 50 ? '#10b981' : '#ef4444', marginBottom: '2px' }}>
                        {winRate.toFixed(1)}%
                    </div>
                    <div style={{ fontSize: '10px', color: '#666' }}>
                        {profitableDays}/{chartData.length} days profitable
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
                        Avg Trades
                    </div>
                    <div style={{ fontSize: '16px', fontWeight: 'bold', color: '#D4AF37', marginBottom: '2px' }}>
                        {avgTrades.toFixed(1)}
                    </div>
                    <div style={{ fontSize: '10px', color: '#666' }}>
                        Per day
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
                        Avg Daily PnL
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
                    <ComposedChart
                        data={chartData}
                        margin={{ top: 20, right: 20, left: 60, bottom: 60 }}
                    >
                        <CartesianGrid stroke="#27272a" strokeDasharray="3 3" />
                        <XAxis
                            dataKey="date"
                            stroke="#71717a"
                            tick={{ fontSize: 10 }}
                            angle={-45}
                            textAnchor="end"
                            height={80}
                            interval={Math.max(0, Math.floor(chartData.length / 10))}
                        />
                        <YAxis
                            yAxisId="left"
                            stroke="#71717a"
                            tick={{ fontSize: 11 }}
                            label={{ value: 'Trades', angle: -90, position: 'insideLeft', offset: -10 }}
                        />
                        <YAxis
                            yAxisId="right"
                            orientation="right"
                            stroke="#71717a"
                            tick={{ fontSize: 11 }}
                            label={{ value: 'PnL ($)', angle: 90, position: 'insideRight', offset: -10 }}
                        />
                        <Tooltip content={renderTooltip} />
                        <Legend wrapperStyle={{ paddingTop: '12px' }} />

                        {/* Bar chart for trade frequency */}
                        <Bar
                            yAxisId="left"
                            dataKey="trades"
                            name="Trades"
                            radius={[4, 4, 0, 0]}
                            fill="rgba(212, 175, 55, 0.3)"
                            isAnimationActive={false}
                        >
                            {chartData.map((entry, index) => (
                                <Cell
                                    key={`cell-${index}`}
                                    fill={entry.isProfitable ? 'rgba(16, 185, 129, 0.4)' : 'rgba(239, 68, 68, 0.4)'}
                                />
                            ))}
                        </Bar>

                        {/* Line for PnL trend */}
                        <Line
                            yAxisId="right"
                            type="monotone"
                            dataKey="trendPnl"
                            name="PnL Trend (7d MA)"
                            stroke="#3b82f6"
                            strokeWidth={3}
                            dot={false}
                            isAnimationActive={false}
                        />
                    </ComposedChart>
                </ResponsiveContainer>
            </div>
        </div>
    );
};
