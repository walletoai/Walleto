import React, { useMemo } from 'react';
import {
    ResponsiveContainer,
    BarChart,
    Bar,
    CartesianGrid,
    XAxis,
    YAxis,
    Tooltip,
    Cell,
    ReferenceLine,
} from "recharts";

interface Props {
    data: any;
    widgetId?: string;
}

interface TimeSlot {
    label: string;
    winRate: number;
    trades: number;
    wins: number;
    pnl: number;
}

export const TimeOfDayProfitabilityWidget: React.FC<Props> = ({ data, widgetId }) => {
    const { filteredTrades } = data;

    const chartData = useMemo(() => {
        if (!filteredTrades || filteredTrades.length === 0) return [];

        // Define 4-hour time slots
        const timeSlots: TimeSlot[] = [
            { label: '00:00-03:59', winRate: 0, trades: 0, wins: 0, pnl: 0 },
            { label: '04:00-07:59', winRate: 0, trades: 0, wins: 0, pnl: 0 },
            { label: '08:00-11:59', winRate: 0, trades: 0, wins: 0, pnl: 0 },
            { label: '12:00-15:59', winRate: 0, trades: 0, wins: 0, pnl: 0 },
            { label: '16:00-19:59', winRate: 0, trades: 0, wins: 0, pnl: 0 },
            { label: '20:00-23:59', winRate: 0, trades: 0, wins: 0, pnl: 0 },
        ];

        filteredTrades.forEach((t: any) => {
            const hour = t._dateObj.getHours();
            const pnlUsd = t.pnl_usd || 0;

            // Determine which slot this hour belongs to
            const slotIndex = Math.floor(hour / 4);
            const slot = timeSlots[slotIndex];

            slot.trades += 1;
            slot.pnl += pnlUsd;
            if (pnlUsd > 0) slot.wins += 1;
        });

        // Calculate win rates
        timeSlots.forEach((slot) => {
            slot.winRate = slot.trades > 0 ? (slot.wins / slot.trades) * 100 : 0;
        });

        return timeSlots;
    }, [filteredTrades]);

    if (chartData.length === 0) {
        return <div className="text-center py-8 text-gray-500">No data in this range yet.</div>;
    }

    // Calculate metrics
    const bestSlot = chartData.reduce((best, current) =>
        current.winRate > best.winRate ? current : best
    );
    const worstSlot = chartData.reduce((worst, current) =>
        current.winRate < worst.winRate ? current : worst
    );
    const avgWinRate = chartData.reduce((sum, slot) => sum + slot.winRate, 0) / chartData.length;
    const totalTrades = chartData.reduce((sum, slot) => sum + slot.trades, 0);

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
                        {data.label}
                    </div>
                    <div style={{ fontSize: '12px', marginBottom: '4px', color: data.winRate >= 50 ? '#10b981' : '#ef4444' }}>
                        Win Rate: {data.winRate.toFixed(1)}%
                    </div>
                    <div style={{ fontSize: '12px', marginBottom: '4px', color: '#a0a0a0' }}>
                        Wins/Trades: {data.wins}/{data.trades}
                    </div>
                    <div style={{ fontSize: '12px', color: data.pnl >= 0 ? '#10b981' : '#ef4444' }}>
                        PnL: ${data.pnl.toFixed(2)}
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
                        Best Period
                    </div>
                    <div style={{ fontSize: '16px', fontWeight: 'bold', color: '#10b981', marginBottom: '2px' }}>
                        {bestSlot.winRate.toFixed(1)}%
                    </div>
                    <div style={{ fontSize: '10px', color: '#666' }}>
                        {bestSlot.label}
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
                        Worst Period
                    </div>
                    <div style={{ fontSize: '16px', fontWeight: 'bold', color: '#ef4444', marginBottom: '2px' }}>
                        {worstSlot.winRate.toFixed(1)}%
                    </div>
                    <div style={{ fontSize: '10px', color: '#666' }}>
                        {worstSlot.label}
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
                        Avg Win Rate
                    </div>
                    <div style={{ fontSize: '16px', fontWeight: 'bold', color: avgWinRate >= 50 ? '#10b981' : '#ef4444', marginBottom: '2px' }}>
                        {avgWinRate.toFixed(1)}%
                    </div>
                    <div style={{ fontSize: '10px', color: '#666' }}>
                        All time slots
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
                        Total Trades
                    </div>
                    <div style={{ fontSize: '16px', fontWeight: 'bold', color: '#D4AF37', marginBottom: '2px' }}>
                        {totalTrades}
                    </div>
                    <div style={{ fontSize: '10px', color: '#666' }}>
                        Across all slots
                    </div>
                </div>
            </div>

            {/* Chart */}
            <div style={{ height: 320, width: '100%' }}>
                <ResponsiveContainer width="100%" height={320}>
                    <BarChart data={chartData} margin={{ top: 20, right: 20, left: 60, bottom: 80 }}>
                        <CartesianGrid stroke="#27272a" strokeDasharray="3 3" />
                        <XAxis
                            dataKey="label"
                            stroke="#71717a"
                            tick={{ fontSize: 11 }}
                            angle={-45}
                            textAnchor="end"
                            height={80}
                        />
                        <YAxis stroke="#71717a" tick={{ fontSize: 11 }} domain={[0, 100]} label={{ value: 'Win Rate (%)', angle: -90, position: 'insideLeft', offset: -10 }} />
                        <Tooltip content={renderTooltip} />
                        <Bar dataKey="winRate" radius={[4, 4, 0, 0]}>
                            {chartData.map((entry, index) => (
                                <Cell
                                    key={`cell-${index}`}
                                    fill={entry.winRate >= 60 ? '#10b981' : entry.winRate >= 50 ? '#D4AF37' : '#ef4444'}
                                />
                            ))}
                        </Bar>
                    </BarChart>
                </ResponsiveContainer>
            </div>
        </div>
    );
};
