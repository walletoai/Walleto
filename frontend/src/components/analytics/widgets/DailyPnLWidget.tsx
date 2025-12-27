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

export const DailyPnLWidget: React.FC<Props> = ({ data, widgetId }) => {
    const { dailySeries } = data;
    const [timeRange, setTimeRange] = useState("ALL");
    const [controlElement, setControlElement] = useState<HTMLElement | null>(null);

    useEffect(() => {
        if (!widgetId) return;
        const element = document.getElementById(`${widgetId}-controls`);
        setControlElement(element);
    }, [widgetId]);

    const filteredData = useMemo(() => {
        if (!dailySeries || dailySeries.length === 0) return [];

        if (timeRange === "ALL") {
            return dailySeries;
        }

        const now = new Date();
        let startDate: Date;

        if (timeRange === "WEEK") {
            // Get start of current week (Sunday)
            startDate = new Date(now.getFullYear(), now.getMonth(), now.getDate() - now.getDay());
        } else if (timeRange === "MONTH") {
            startDate = new Date(now.getFullYear(), now.getMonth(), 1);
        } else if (timeRange === "YEAR") {
            startDate = new Date(now.getFullYear(), 0, 1);
        } else {
            return dailySeries;
        }

        return dailySeries.filter((entry: any) => {
            const entryDate = new Date(entry.rawDate);
            return entryDate >= startDate;
        });
    }, [dailySeries, timeRange]);

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

    if (dailySeries.length === 0) {
        return <div className="text-center py-8 text-gray-500">No data in this range yet.</div>;
    }

    return (
        <>
            {controlsPortal}
            <div style={{ height: 300, width: '100%' }}>
                <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={filteredData}>
                    <CartesianGrid stroke="#27272a" strokeDasharray="3 3" />
                    <XAxis dataKey="date" stroke="#71717a" tick={{ fontSize: 11 }} />
                    <YAxis stroke="#71717a" tick={{ fontSize: 11 }} />
                    <Tooltip
                        contentStyle={{ backgroundColor: '#161616', borderColor: '#27272a', borderRadius: '8px' }}
                        itemStyle={{ color: '#fff' }}
                        formatter={(value: any) => `$${value.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`}
                        labelFormatter={(label) => `Date: ${label}`}
                    />
                    <Bar dataKey="pnl" fill="#D4AF37">
                        {filteredData.map((entry: any, index: number) => (
                            <Cell key={`cell-${index}`} fill={entry.pnl >= 0 ? '#10b981' : '#ef4444'} />
                        ))}
                    </Bar>
                    </BarChart>
                </ResponsiveContainer>
            </div>
        </>
    );
};
