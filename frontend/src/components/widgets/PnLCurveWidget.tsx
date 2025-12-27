import React, { useState, useMemo } from 'react';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';

interface PnLCurveWidgetProps {
    data: { date: string; pnl: number }[];
}

type TimeRange = '1W' | '1M' | 'YTD' | 'ALL';

export const PnLCurveWidget: React.FC<PnLCurveWidgetProps> = ({ data }) => {
    const [timeRange, setTimeRange] = useState<TimeRange>('ALL');

    const filteredData = useMemo(() => {
        if (!data || data.length === 0) return [];

        const now = new Date();
        let startDate = new Date(0); // Default to beginning of time

        if (timeRange === '1W') {
            startDate = new Date(now.setDate(now.getDate() - 7));
        } else if (timeRange === '1M') {
            startDate = new Date(now.setMonth(now.getMonth() - 1));
        } else if (timeRange === 'YTD') {
            startDate = new Date(now.getFullYear(), 0, 1);
        }

        return data.filter(d => new Date(d.date) >= startDate);
    }, [data, timeRange]);

    const chartData = useMemo(() => {
        const sorted = [...filteredData].sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());
        let cumulative = 0;
        return sorted.map(d => {
            cumulative += Number(d.pnl);
            return { ...d, cumulative };
        });
    }, [filteredData]);

    if (!data || data.length === 0) {
        return (
            <div className="card bg-leather-800 border-leather-700 p-6 col-span-1 md:col-span-2 h-full flex flex-col items-center justify-center min-h-[300px]">
                <h3 className="text-leather-accent font-serif text-lg mb-2">Equity Curve</h3>
                <p className="text-gray-500">No trades recorded yet.</p>
            </div>
        );
    }

    return (
        <div style={{ display: 'flex', flexDirection: 'column', height: '100%', width: '100%' }}>
            <div className="flex justify-between items-center mb-3" style={{ minHeight: '24px', flexShrink: 0 }}>
                <div style={{
                    color: '#888',
                    fontSize: '11px',
                    fontWeight: '600',
                    letterSpacing: '1px',
                    textTransform: 'uppercase'
                }}>
                    Equity Curve
                </div>
                <div className="relative">
                    <select
                        value={timeRange}
                        onChange={(e) => setTimeRange(e.target.value as TimeRange)}
                        className="appearance-none text-xs font-bold rounded focus:outline-none transition-colors cursor-pointer"
                        style={{
                            backgroundColor: 'rgba(35, 24, 12, 0.8)',
                            color: '#F5C76D',
                            border: '1px solid rgba(245, 199, 109, 0.3)',
                            padding: '4px 8px',
                            fontSize: '10px'
                        }}
                    >
                        <option value="ALL">ALL</option>
                        <option value="1W">1W</option>
                        <option value="1M">1M</option>
                        <option value="YTD">YTD</option>
                    </select>
                </div>
            </div>

            {chartData.length === 0 ? (
                <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', textAlign: 'center', color: '#666', fontSize: '12px', background: 'rgba(255, 255, 255, 0.02)', borderRadius: '8px', border: '1px solid rgba(212, 175, 55, 0.1)' }}>
                    No data available
                </div>
            ) : (
                <div style={{ flex: 1, width: '100%', minHeight: 0 }}>
                    <ResponsiveContainer width="100%" height="100%">
                        <LineChart data={chartData}>
                            <CartesianGrid strokeDasharray="3 3" stroke="rgba(212, 175, 55, 0.05)" opacity={0.5} />
                            <XAxis
                                dataKey="date"
                                stroke="#666"
                                fontSize={9}
                                tickFormatter={(val) => {
                                    const d = new Date(val);
                                    return `${d.getMonth() + 1}/${d.getDate()}`;
                                }}
                                minTickGap={30}
                                tickLine={false}
                                axisLine={false}
                                height={16}
                            />
                            <YAxis
                                stroke="#666"
                                fontSize={9}
                                tickFormatter={(val) => `$${(val / 1000).toFixed(0)}k`}
                                width={35}
                                tickLine={false}
                                axisLine={false}
                            />
                            <Tooltip
                                contentStyle={{
                                    backgroundColor: 'rgba(20, 20, 20, 0.95)',
                                    borderColor: 'rgba(212, 175, 55, 0.3)',
                                    color: '#eee',
                                    borderRadius: '6px',
                                    fontSize: '11px',
                                    padding: '6px 8px'
                                }}
                                itemStyle={{ color: '#D4A545' }}
                                formatter={(value: number) => [`$${value.toFixed(0)}`, 'Equity']}
                                labelFormatter={(label) => new Date(label).toLocaleDateString()}
                            />
                            <Line
                                type="monotone"
                                dataKey="cumulative"
                                stroke="#D4A545"
                                strokeWidth={2.5}
                                dot={false}
                                activeDot={{ r: 3, fill: '#D4A545', stroke: '#111', strokeWidth: 1 }}
                            />
                        </LineChart>
                    </ResponsiveContainer>
                </div>
            )}
        </div>
    );
};
