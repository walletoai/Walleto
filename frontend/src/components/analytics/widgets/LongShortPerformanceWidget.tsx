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
} from 'recharts';

interface Props {
    data: any;
    widgetId?: string;
}

export const LongShortPerformanceWidget: React.FC<Props> = ({ data, widgetId }) => {
    const { filteredTrades } = data;
    const [timeRange, setTimeRange] = useState("ALL");
    const [controlElement, setControlElement] = useState<HTMLElement | null>(null);

    useEffect(() => {
        if (!widgetId) return;
        const element = document.getElementById(`${widgetId}-controls`);
        setControlElement(element);
    }, [widgetId]);

    const timeFilteredData = useMemo(() => {
        if (!filteredTrades || filteredTrades.length === 0) {
            return { longPnl: 0, shortPnl: 0 };
        }

        const now = new Date();
        let startDate: Date | null = null;

        if (timeRange === "WEEK") {
            // Get start of current week (Sunday) - no mutation
            startDate = new Date(now.getFullYear(), now.getMonth(), now.getDate() - now.getDay());
        } else if (timeRange === "MONTH") {
            startDate = new Date(now.getFullYear(), now.getMonth(), 1);
        } else if (timeRange === "YEAR") {
            startDate = new Date(now.getFullYear(), 0, 1);
        }

        let longPnl = 0;
        let shortPnl = 0;
        let longCount = 0;
        let shortCount = 0;

        filteredTrades.forEach((t: any) => {
            if (startDate) {
                const entryDate = t._dateObj || new Date(t.entry_time || t.date);
                if (entryDate < startDate) return;
            }

            const pnlUsd = t.pnl_usd || 0;
            const side = (t.side || '').toUpperCase();

            // Handle both SHORT/SELL and LONG/BUY
            if (side === "SHORT" || side === "SELL") {
                shortPnl += pnlUsd;
                shortCount += 1;
            } else {
                longPnl += pnlUsd;
                longCount += 1;
            }
        });

        return { longPnl, shortPnl, longCount, shortCount };
    }, [filteredTrades, timeRange]);

    const chartData = useMemo(() => {
        return [
            {
                name: 'Long',
                pnl: timeFilteredData.longPnl,
            },
            {
                name: 'Short',
                pnl: timeFilteredData.shortPnl,
            },
        ];
    }, [timeFilteredData]);

    const controlsPortal = controlElement ? (
        createPortal(
            <select
                value={timeRange}
                onChange={(e) => setTimeRange(e.target.value)}
                className="appearance-none text-xs font-bold rounded px-3 py-2 focus:outline-none transition-colors cursor-pointer"
                style={{
                    backgroundColor: '#23180C',
                    color: '#F5C76D',
                    border: '1px solid rgba(245, 199, 109, 0.3)',
                    minWidth: '120px'
                }}
            >
                <option value="ALL">All</option>
                <option value="YEAR">Year to Date</option>
                <option value="MONTH">1 Month</option>
                <option value="WEEK">1 Week</option>
            </select>,
            controlElement
        )
    ) : null;

    const maxValue = Math.max(
        Math.abs(chartData[0].pnl),
        Math.abs(chartData[1].pnl)
    );

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
                    <div style={{ fontWeight: 'bold', marginBottom: '4px' }}>{data.name}</div>
                    <div style={{ fontSize: '14px', color: data.pnl >= 0 ? '#10b981' : '#ef4444' }}>
                        ${data.pnl.toFixed(2)}
                    </div>
                </div>
            );
        }
        return null;
    };

    const totalPnl = timeFilteredData.longPnl + timeFilteredData.shortPnl;
    const longPercentage = totalPnl !== 0 ? (timeFilteredData.longPnl / totalPnl) * 100 : 0;
    const shortPercentage = totalPnl !== 0 ? (timeFilteredData.shortPnl / totalPnl) * 100 : 0;

    return (
        <>
            {controlsPortal}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '24px', height: '100%' }}>
            {/* Chart */}
            <div style={{ height: 250, width: '100%' }}>
                <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={chartData}>
                        <CartesianGrid stroke="#27272a" strokeDasharray="3 3" />
                        <XAxis dataKey="name" stroke="#71717a" tick={{ fontSize: 12 }} />
                        <YAxis stroke="#71717a" tick={{ fontSize: 11 }} />
                        <Tooltip content={renderTooltip} />
                        <Bar dataKey="pnl" fill="#D4AF37" radius={[8, 8, 0, 0]}>
                            {chartData.map((entry: any, index: number) => (
                                <Cell
                                    key={`cell-${index}`}
                                    fill={entry.pnl >= 0 ? '#10b981' : '#ef4444'}
                                />
                            ))}
                        </Bar>
                    </BarChart>
                </ResponsiveContainer>
            </div>

            {/* Stats */}
            <div style={{ display: 'flex', gap: '16px' }}>
                <div style={{
                    flex: 1,
                    backgroundColor: 'rgba(16, 185, 129, 0.1)',
                    border: '1px solid rgba(16, 185, 129, 0.3)',
                    borderRadius: '12px',
                    padding: '16px',
                    textAlign: 'center'
                }}>
                    <div style={{ fontSize: '12px', color: '#a0a0a0', marginBottom: '8px', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                        Long
                    </div>
                    <div style={{ fontSize: '24px', fontWeight: 'bold', color: timeFilteredData.longPnl >= 0 ? '#10b981' : '#ef4444', marginBottom: '8px' }}>
                        ${timeFilteredData.longPnl.toFixed(2)}
                    </div>
                    <div style={{ fontSize: '12px', color: '#666', fontWeight: '500' }}>
                        {timeFilteredData.longCount} trades
                    </div>
                </div>

                <div style={{
                    flex: 1,
                    backgroundColor: 'rgba(239, 68, 68, 0.1)',
                    border: '1px solid rgba(239, 68, 68, 0.3)',
                    borderRadius: '12px',
                    padding: '16px',
                    textAlign: 'center'
                }}>
                    <div style={{ fontSize: '12px', color: '#a0a0a0', marginBottom: '8px', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                        Short
                    </div>
                    <div style={{ fontSize: '24px', fontWeight: 'bold', color: timeFilteredData.shortPnl >= 0 ? '#10b981' : '#ef4444', marginBottom: '8px' }}>
                        ${timeFilteredData.shortPnl.toFixed(2)}
                    </div>
                    <div style={{ fontSize: '12px', color: '#666', fontWeight: '500' }}>
                        {timeFilteredData.shortCount} trades
                    </div>
                </div>
            </div>
            </div>
        </>
    );
};
