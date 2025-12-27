import React from 'react';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';

interface Props {
    data: any;
}

export const EquityCurveWidget: React.FC<Props> = ({ data }) => {
    const { equitySeries, filteredTrades } = data;

    if (!filteredTrades || filteredTrades.length === 0 || !equitySeries || equitySeries.length === 0) {
        return (
            <div className="w-full h-full flex items-center justify-center text-gray-400">
                <div className="text-sm">No data available</div>
            </div>
        );
    }

    return (
        <ResponsiveContainer width="100%" height="100%">
            <LineChart data={equitySeries} margin={{ top: 5, right: 30, left: 0, bottom: 5 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#5D4037" opacity={0.1} />
                <XAxis
                    dataKey="date"
                    stroke="#888"
                    fontSize={10}
                    minTickGap={30}
                    tickLine={false}
                    axisLine={false}
                />
                <YAxis
                    stroke="#888"
                    fontSize={10}
                    tickFormatter={(val) => `$${val}`}
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
                    itemStyle={{ color: '#D4A545' }}
                    formatter={(value: any) => [`$${value.toFixed(2)}`, 'Equity']}
                    labelFormatter={(label) => label}
                />
                <Line
                    type="monotone"
                    dataKey="equity"
                    stroke="#D4A545"
                    strokeWidth={2}
                    dot={false}
                    activeDot={{ r: 4, fill: '#D4A545', stroke: '#111', strokeWidth: 1 }}
                />
            </LineChart>
        </ResponsiveContainer>
    );
};
