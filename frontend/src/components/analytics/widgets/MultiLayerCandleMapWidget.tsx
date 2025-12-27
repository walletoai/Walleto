import React, { useMemo, useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, ComposedChart, Bar } from 'recharts';

interface Props {
    data: any;
    widgetId?: string;
}

export const MultiLayerCandleMapWidget: React.FC<Props> = ({ data, widgetId }) => {
    const { dailySeries, filteredTrades } = data;
    const [timeRange, setTimeRange] = useState<'ALL' | 'YEAR' | 'MONTH' | 'WEEK'>('ALL');
    const [controlElement, setControlElement] = useState<HTMLElement | null>(null);

    useEffect(() => {
        if (!widgetId) return;
        const element = document.getElementById(`${widgetId}-controls`);
        setControlElement(element);
    }, [widgetId]);

    const chartData = useMemo(() => {
        if (!dailySeries || dailySeries.length === 0) return [];

        // Apply time range filter
        let filteredData = [...dailySeries];
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
            filteredData = filteredData.filter((day: any) => {
                const dayDate = new Date(day.rawDate || day.date);
                return dayDate >= startDate;
            });
        }

        // Calculate moving averages on the filtered series
        return filteredData.map((day: any, idx: number) => {
            let sma20: number | undefined = undefined;
            let sma50: number | undefined = undefined;

            if (idx >= 19) {
                const slice = filteredData.slice(idx - 19, idx + 1);
                sma20 = slice.reduce((sum: number, d: any) => sum + d.pnl, 0) / 20;
            }

            if (idx >= 49) {
                const slice = filteredData.slice(idx - 49, idx + 1);
                sma50 = slice.reduce((sum: number, d: any) => sum + d.pnl, 0) / 50;
            }

            return {
                ...day,
                sma20,
                sma50,
            };
        });
    }, [dailySeries, timeRange]);

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

    if (!dailySeries || dailySeries.length === 0 || !filteredTrades || filteredTrades.length === 0) {
        return (
            <div className="w-full h-full flex items-center justify-center text-gray-400">
                <div className="text-sm">No data available</div>
            </div>
        );
    }

    return (
        <>
            {controlsPortal}
            <div style={{ width: '100%', height: '100%', maxHeight: '100%' }}>
            <ResponsiveContainer width="100%" height={400}>
                <ComposedChart data={chartData} margin={{ top: 5, right: 30, left: 0, bottom: 5 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#5D4037" opacity={0.1} />
                <XAxis
                    dataKey="date"
                    stroke="#888"
                    fontSize={10}
                    minTickGap={30}
                    tickLine={false}
                    axisLine={false}
                    interval={Math.max(0, Math.floor(chartData.length / 15))}
                />
                <YAxis
                    stroke="#888"
                    fontSize={10}
                    tickFormatter={(val) => `$${val.toFixed(0)}`}
                    width={50}
                    tickLine={false}
                    axisLine={false}
                />
                <Tooltip
                    contentStyle={{
                        backgroundColor: 'rgba(20, 20, 20, 0.95)',
                        borderColor: '#333',
                        color: '#eee',
                        borderRadius: '4px',
                        fontSize: '12px',
                        padding: '8px'
                    }}
                    formatter={(value: any) => {
                        if (typeof value === 'number') {
                            return [`$${value.toFixed(2)}`, ''];
                        }
                        return value;
                    }}
                    labelFormatter={(label) => label}
                />

                {/* Daily PnL bars */}
                <Bar
                    dataKey="pnl"
                    fill="rgba(212, 165, 69, 0.3)"
                    radius={[2, 2, 0, 0]}
                    isAnimationActive={false}
                    name="Daily PnL"
                />

                {/* Close Price / PnL Line */}
                <Line
                    type="monotone"
                    dataKey="pnl"
                    stroke="#D4AF37"
                    strokeWidth={2}
                    dot={false}
                    activeDot={{ r: 4, fill: '#D4AF37', stroke: '#111', strokeWidth: 1 }}
                    isAnimationActive={false}
                    name="Daily PnL"
                />

                {/* SMA 50 */}
                <Line
                    type="monotone"
                    dataKey="sma50"
                    stroke="#8b5cf6"
                    strokeWidth={1.5}
                    dot={false}
                    isAnimationActive={false}
                    connectNulls
                    strokeDasharray="5 5"
                    name="SMA 50"
                />

                {/* SMA 20 */}
                <Line
                    type="monotone"
                    dataKey="sma20"
                    stroke="#f59e0b"
                    strokeWidth={1.5}
                    dot={false}
                    isAnimationActive={false}
                    connectNulls
                    name="SMA 20"
                />
                </ComposedChart>
            </ResponsiveContainer>

            {/* Visual Explanation */}
            <div style={{ marginTop: '16px', padding: '12px', backgroundColor: '#1a1a1a', borderRadius: '8px', border: '1px solid #27272a' }}>
                <div style={{ fontSize: '12px', color: '#D4AF37', fontWeight: 'bold', marginBottom: '8px' }}>
                    📊 Multi-Layer Price Chart Explained
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '12px', marginBottom: '12px' }}>
                    {/* Golden Bars */}
                    <div style={{ padding: '8px', backgroundColor: '#0a0a0a', borderRadius: '4px', borderLeft: '3px solid #D4AF37' }}>
                        <div style={{ fontSize: '11px', fontWeight: 'bold', color: '#D4AF37', marginBottom: '2px' }}>
                            Golden Bars
                        </div>
                        <div style={{ fontSize: '10px', color: '#999' }}>
                            Your daily profit/loss. Height shows how much you made or lost each day.
                        </div>
                    </div>

                    {/* Golden Line */}
                    <div style={{ padding: '8px', backgroundColor: '#0a0a0a', borderRadius: '4px', borderLeft: '3px solid #D4AF37' }}>
                        <div style={{ fontSize: '11px', fontWeight: 'bold', color: '#D4AF37', marginBottom: '2px' }}>
                            Golden Line
                        </div>
                        <div style={{ fontSize: '10px', color: '#999' }}>
                            Traces your daily PnL trend. Shows your actual trading performance over time.
                        </div>
                    </div>

                    {/* Purple Dashed Line */}
                    <div style={{ padding: '8px', backgroundColor: '#0a0a0a', borderRadius: '4px', borderLeft: '3px solid #8b5cf6' }}>
                        <div style={{ fontSize: '11px', fontWeight: 'bold', color: '#8b5cf6', marginBottom: '2px' }}>
                            SMA 50 (Purple Dashed)
                        </div>
                        <div style={{ fontSize: '10px', color: '#999' }}>
                            50-day moving average. Shows your long-term profitability trend.
                        </div>
                    </div>

                    {/* Yellow Line */}
                    <div style={{ padding: '8px', backgroundColor: '#0a0a0a', borderRadius: '4px', borderLeft: '3px solid #f59e0b' }}>
                        <div style={{ fontSize: '11px', fontWeight: 'bold', color: '#f59e0b', marginBottom: '2px' }}>
                            SMA 20 (Yellow Solid)
                        </div>
                        <div style={{ fontSize: '10px', color: '#999' }}>
                            20-day moving average. Responds faster to recent performance changes.
                        </div>
                    </div>
                </div>

                <div style={{ padding: '8px', backgroundColor: '#0a0a0a', borderRadius: '4px', borderLeft: '3px solid #06b6d4' }}>
                    <div style={{ fontSize: '10px', color: '#999', lineHeight: '1.4' }}>
                        <strong style={{ color: '#a0a0a0' }}>💡 How to Use:</strong> Use the moving averages to spot trends in your profitability. When the golden line crosses above the moving averages, you're doing better than average. When it dips below, you're underperforming. Watch for consistency!
                    </div>
                </div>
            </div>
        </div>
        </>
    );
};
