import React, { useMemo, useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import {
    ResponsiveContainer,
    PieChart,
    Pie,
    Cell,
    Legend,
    Tooltip,
} from 'recharts';

interface Props {
    data: any;
    widgetId?: string;
}

export const SymbolBreakdownWidget: React.FC<Props> = ({ data, widgetId }) => {
    const { filteredTrades, extras, allTrades } = data;
    const { symbolStats } = extras;
    const [selectedYear, setSelectedYear] = useState<string | null>(null);
    const [controlElement, setControlElement] = useState<HTMLElement | null>(null);

    useEffect(() => {
        if (!widgetId) return;
        const element = document.getElementById(`${widgetId}-controls`);
        setControlElement(element);
    }, [widgetId]);

    const yearFilteredStats = useMemo(() => {
        if (!selectedYear || selectedYear === 'ALL') {
            return symbolStats;
        }

        const trades = (filteredTrades || []).filter((t: any) => {
            const year = t._dateObj.getFullYear().toString();
            return year === selectedYear;
        });

        const statsMap = new Map<string, { pnl: number; trades: number; wins: number }>();

        trades.forEach((t: any) => {
            const pnlUsd = t.pnl_usd || 0;
            const prevSym = statsMap.get(t.symbol) || { pnl: 0, trades: 0, wins: 0 };
            prevSym.pnl += pnlUsd;
            prevSym.trades += 1;
            if (pnlUsd > 0) prevSym.wins += 1;
            statsMap.set(t.symbol, prevSym);
        });

        return Array.from(statsMap.entries())
            .map(([symbol, s]) => ({
                symbol,
                pnl: s.pnl,
                trades: s.trades,
                winRate: s.trades ? (s.wins / s.trades) * 100 : 0,
            }))
            .sort((a, b) => b.pnl - a.pnl);
    }, [selectedYear, filteredTrades, symbolStats]);

    // Get list of unique years
    const years = useMemo(() => {
        const yearSet = new Set<string>();
        (filteredTrades || []).forEach((t: any) => {
            yearSet.add(t._dateObj.getFullYear().toString());
        });
        return Array.from(yearSet).sort().reverse();
    }, [filteredTrades]);

    const controlsPortal = controlElement ? (
        createPortal(
            <select
                value={selectedYear || 'ALL'}
                onChange={(e) => setSelectedYear(e.target.value === 'ALL' ? null : e.target.value)}
                className="appearance-none text-xs font-bold rounded px-3 py-2 focus:outline-none transition-colors cursor-pointer"
                style={{
                    backgroundColor: '#23180C',
                    color: '#F5C76D',
                    border: '1px solid rgba(245, 199, 109, 0.3)',
                    minWidth: '120px'
                }}
            >
                <option value="ALL">All Years</option>
                {years.map(year => (
                    <option key={year} value={year}>{year}</option>
                ))}
            </select>,
            controlElement
        )
    ) : null;

    // Prepare data for pie chart - top 8 coins + "Other"
    const MAX_COINS = 8;

    const allPieData = (yearFilteredStats || [])
        .filter(item => item && item.trades && item.trades > 0)
        .map(item => ({
            name: item.symbol,
            value: Math.abs(item.pnl),
            pnl: item.pnl,
            trades: item.trades,
            winRate: item.winRate,
        }))
        .sort((a, b) => b.value - a.value); // Sort by absolute PnL

    let pieData;
    if (allPieData.length <= MAX_COINS) {
        pieData = allPieData;
    } else {
        // Take top coins and group the rest as "Other"
        const topCoins = allPieData.slice(0, MAX_COINS);
        const otherCoins = allPieData.slice(MAX_COINS);

        const otherPnl = otherCoins.reduce((sum, c) => sum + c.pnl, 0);
        const otherTrades = otherCoins.reduce((sum, c) => sum + c.trades, 0);
        const otherWins = otherCoins.reduce((sum, c) => sum + (c.trades * c.winRate / 100), 0);

        pieData = [
            ...topCoins,
            {
                name: `Other (${otherCoins.length})`,
                value: Math.abs(otherPnl),
                pnl: otherPnl,
                trades: otherTrades,
                winRate: otherTrades > 0 ? (otherWins / otherTrades) * 100 : 0,
            }
        ];
    }

    if (pieData.length === 0) {
        return <div className="text-center py-8 text-gray-500">No data in this range yet.</div>;
    }

    // Distinct color palette
    const colorPalette = [
        '#10b981', '#ef4444', '#f59e0b', '#8b5cf6', '#ec4899',
        '#06b6d4', '#14b8a6', '#f97316', '#6366f1', '#84cc16',
        '#0ea5e9', '#d946ef', '#22c55e', '#eab308', '#64748b',
        '#3b82f6', '#fb923c', '#a855f7', '#1e40af', '#047857'
    ];

    // Color palette - green for positive, red for negative, but rotate through distinct colors
    const colors = pieData.map((item: any, index: number) => {
        const baseColor = colorPalette[index % colorPalette.length];
        return baseColor;
    });

    const renderCustomLabel = (entry: any) => {
        return `${entry.name}`;
    };

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
                    <div style={{ fontSize: '12px', color: '#f5c76d' }}>
                        PnL: ${data.pnl.toFixed(2)}
                    </div>
                    <div style={{ fontSize: '12px', color: '#a0a0a0' }}>
                        Trades: {data.trades}
                    </div>
                    <div style={{ fontSize: '12px', color: '#a0a0a0' }}>
                        Win Rate: {data.winRate.toFixed(2)}%
                    </div>
                </div>
            );
        }
        return null;
    };

    return (
        <>
            {controlsPortal}
            <div style={{ height: 350, width: '100%' }}>
                <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                        <Pie
                            data={pieData}
                            cx="50%"
                            cy="50%"
                            labelLine={false}
                            outerRadius={100}
                            fill="#D4AF37"
                            dataKey="value"
                        >
                            {pieData.map((entry: any, index: number) => (
                                <Cell key={`cell-${index}`} fill={colors[index]} />
                            ))}
                        </Pie>
                        <Tooltip content={renderTooltip} />
                        <Legend
                            verticalAlign="bottom"
                            height={36}
                            formatter={(value: any) => value}
                        />
                    </PieChart>
                </ResponsiveContainer>
            </div>
        </>
    );
};
