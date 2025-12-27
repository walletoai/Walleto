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

export const TradeOutcomeDistributionWidget: React.FC<Props> = ({ data }) => {
    const { filteredTrades } = data;

    const chartData = useMemo(() => {
        if (!filteredTrades || filteredTrades.length === 0) return [];

        const pnls = filteredTrades.map((t: any) => t.pnl_usd || 0);

        // Calculate average absolute PnL to base ranges on typical trade size
        const avgAbsPnl = pnls.reduce((sum: number, p: number) => sum + Math.abs(p), 0) / pnls.length;

        // Round to a nice number for cleaner labels
        const roundToNice = (n: number) => {
            if (n <= 5) return Math.ceil(n);
            if (n <= 20) return Math.ceil(n / 5) * 5;
            if (n <= 100) return Math.ceil(n / 10) * 10;
            if (n <= 500) return Math.ceil(n / 25) * 25;
            return Math.ceil(n / 50) * 50;
        };

        const small = roundToNice(avgAbsPnl * 0.5);
        const medium = roundToNice(avgAbsPnl * 1.5);
        const large = roundToNice(avgAbsPnl * 3);

        // Create 7 intuitive bins based on average trade size
        const bins = [
            { rangeStart: -Infinity, rangeEnd: -large, count: 0, label: `< -$${large}`, category: 'big-loss' },
            { rangeStart: -large, rangeEnd: -medium, count: 0, label: `-$${large} to -$${medium}`, category: 'loss' },
            { rangeStart: -medium, rangeEnd: -small, count: 0, label: `-$${medium} to -$${small}`, category: 'small-loss' },
            { rangeStart: -small, rangeEnd: small, count: 0, label: `-$${small} to +$${small}`, category: 'breakeven' },
            { rangeStart: small, rangeEnd: medium, count: 0, label: `+$${small} to +$${medium}`, category: 'small-win' },
            { rangeStart: medium, rangeEnd: large, count: 0, label: `+$${medium} to +$${large}`, category: 'win' },
            { rangeStart: large, rangeEnd: Infinity, count: 0, label: `> +$${large}`, category: 'big-win' },
        ];

        // Count trades in each bin
        pnls.forEach((pnl: number) => {
            const binIndex = bins.findIndex(b => pnl >= b.rangeStart && pnl < b.rangeEnd);
            if (binIndex >= 0) {
                bins[binIndex].count++;
            }
        });

        return bins;
    }, [filteredTrades]);

    if (chartData.length === 0) {
        return <div className="text-center py-8 text-gray-500">No data in this range yet.</div>;
    }

    return (
        <div style={{ height: 300, width: '100%' }}>
            <ResponsiveContainer width="100%" height="100%">
                <BarChart data={chartData}>
                    <CartesianGrid stroke="#27272a" strokeDasharray="3 3" />
                    <XAxis dataKey="label" stroke="#71717a" tick={{ fontSize: 10 }} interval={0} angle={-45} textAnchor="end" height={60} />
                    <YAxis stroke="#71717a" tick={{ fontSize: 11 }} />
                    <Tooltip
                        contentStyle={{ backgroundColor: '#161616', borderColor: '#27272a', borderRadius: '8px' }}
                        itemStyle={{ color: '#fff' }}
                        labelFormatter={(label) => `Range: ${label}`}
                        formatter={(value: any) => `${value} trades`}
                    />
                    <Bar dataKey="count" fill="#D4AF37">
                        {chartData.map((entry: any, index: number) => {
                            const colors: Record<string, string> = {
                                'big-loss': '#dc2626',
                                'loss': '#ef4444',
                                'small-loss': '#f87171',
                                'breakeven': '#D4AF37',
                                'small-win': '#4ade80',
                                'win': '#22c55e',
                                'big-win': '#16a34a',
                            };
                            return <Cell key={`cell-${index}`} fill={colors[entry.category] || '#D4AF37'} />;
                        })}
                    </Bar>
                </BarChart>
            </ResponsiveContainer>
        </div>
    );
};
