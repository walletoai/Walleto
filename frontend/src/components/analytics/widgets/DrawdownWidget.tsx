import React, { useMemo, useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import {
    ResponsiveContainer,
    AreaChart,
    Area,
    CartesianGrid,
    XAxis,
    YAxis,
    Tooltip,
    ReferenceLine,
} from "recharts";

interface Props {
    data: any;
    widgetId?: string;
}

export const DrawdownWidget: React.FC<Props> = ({ data, widgetId }) => {
    const { drawdownSeries, extras } = data;
    const [sortType, setSortType] = useState("chronological");
    const [controlElement, setControlElement] = useState<HTMLElement | null>(null);

    useEffect(() => {
        if (!widgetId) return;
        const element = document.getElementById(`${widgetId}-controls`);
        setControlElement(element);
    }, [widgetId]);

    const stats = useMemo(() => {
        if (!drawdownSeries || drawdownSeries.length === 0) return { maxDD: 0, avgDD: 0 };

        const drawdowns = drawdownSeries.map(d => d.drawdown);
        const maxDD = Math.min(...drawdowns);
        const avgDD = (drawdowns.reduce((a, b) => a + b, 0) / drawdowns.length);

        return { maxDD, avgDD };
    }, [drawdownSeries]);

    const sortedData = useMemo(() => {
        if (!drawdownSeries || drawdownSeries.length === 0) return [];

        const data = [...drawdownSeries];
        if (sortType === "severity") {
            return data.sort((a, b) => a.drawdown - b.drawdown);
        }
        return data;
    }, [drawdownSeries, sortType]);

    if (drawdownSeries.length === 0) {
        return <div className="text-center py-8 text-gray-500">No data in this range yet.</div>;
    }

    const controlsPortal = controlElement ? (
        createPortal(
            <select
                value={sortType}
                onChange={(e) => setSortType(e.target.value)}
                className="appearance-none text-xs font-bold rounded px-3 py-2 focus:outline-none transition-colors cursor-pointer"
                style={{
                    backgroundColor: '#23180C',
                    color: '#F5C76D',
                    border: '1px solid rgba(245, 199, 109, 0.3)',
                    minWidth: '120px'
                }}
            >
                <option value="chronological">Chronological</option>
                <option value="severity">By Severity</option>
            </select>,
            controlElement
        )
    ) : null;

    return (
        <div style={{ height: '100%', display: 'flex', flexDirection: 'column' }}>
            {controlsPortal}
            {/* Stats */}
            <div className="px-2 flex gap-12" style={{ justifyContent: 'flex-start', marginBottom: '24px' }}>
                <div className="bg-red-500/10 border border-red-500/30 rounded-lg p-2" style={{ minWidth: '140px' }}>
                    <div className="text-xs text-gray-400 uppercase tracking-wider">Max Drawdown</div>
                    <div className="text-lg font-bold text-red-400">${stats.maxDD.toFixed(2)}</div>
                </div>
                <div className="bg-orange-500/10 border border-orange-500/30 rounded-lg p-2" style={{ minWidth: '140px' }}>
                    <div className="text-xs text-gray-400 uppercase tracking-wider">Avg Drawdown</div>
                    <div className="text-lg font-bold text-orange-400">${stats.avgDD.toFixed(2)}</div>
                </div>
            </div>

            {/* Chart */}
            <div style={{ height: 200, minHeight: 200, width: '100%' }}>
                <ResponsiveContainer width="100%" height="100%">
                    <AreaChart data={sortedData} margin={{ top: 5, right: 10, left: 0, bottom: 5 }}>
                        <CartesianGrid stroke="#27272a" strokeDasharray="3 3" />
                        <XAxis dataKey="date" stroke="#71717a" tick={{ fontSize: 11 }} />
                        <YAxis stroke="#71717a" tick={{ fontSize: 11 }} />
                        <Tooltip
                            contentStyle={{ backgroundColor: '#161616', borderColor: '#27272a', borderRadius: '8px' }}
                            itemStyle={{ color: '#fff' }}
                            labelStyle={{ color: '#ef4444' }}
                            formatter={(value: any) => `$${value.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`}
                            labelFormatter={(label) => `Date: ${label}`}
                        />
                        <ReferenceLine y={0} stroke="#71717a" strokeDasharray="5 5" />
                        <Area
                            dataKey="drawdown"
                            stroke="#ef4444"
                            fill="#ef444440"
                            type="monotone"
                            isAnimationActive={true}
                        />
                    </AreaChart>
                </ResponsiveContainer>
            </div>
        </div>
    );
};
