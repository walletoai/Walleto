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
} from "recharts";

interface Props {
    data: any;
}

export const AssetPnlBreakdownWidget: React.FC<Props> = ({ data }) => {
    const { symbolSeries } = data;

    if (!symbolSeries || symbolSeries.length === 0) {
        return <div className="text-center py-8 text-gray-500">No data in this range yet.</div>;
    }

    // Take top 10 winners and bottom 10 losers if list is huge, but symbolSeries is already sliced to 12 in AnalyticsPage
    // Let's use it directly.

    return (
        <div style={{ height: '100%', minHeight: 300 }}>
            <ResponsiveContainer width="100%" height="100%">
                <BarChart data={symbolSeries} layout="vertical" margin={{ left: 40 }}>
                    <CartesianGrid stroke="#27272a" strokeDasharray="3 3" horizontal={false} />
                    <XAxis type="number" stroke="#71717a" />
                    <YAxis dataKey="symbol" type="category" stroke="#71717a" width={60} />
                    <Tooltip
                        contentStyle={{ backgroundColor: '#161616', borderColor: '#27272a' }}
                        itemStyle={{ color: '#fff' }}
                        formatter={(value: number) => [`$${value.toFixed(2)}`, 'PnL']}
                    />
                    <Bar dataKey="pnl">
                        {symbolSeries.map((entry: any, index: number) => (
                            <Cell key={`cell-${index}`} fill={entry.pnl >= 0 ? '#10b981' : '#ef4444'} />
                        ))}
                    </Bar>
                </BarChart>
            </ResponsiveContainer>
        </div>
    );
};
