import React, { useMemo, useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import {
    ResponsiveContainer,
    ScatterChart,
    Scatter,
    XAxis,
    YAxis,
    CartesianGrid,
    Tooltip,
    Cell,
} from 'recharts';

interface Props {
    data: any;
    widgetId?: string;
}

export const ConfluenceScoreWidget: React.FC<Props> = ({ data, widgetId }) => {
    const { filteredTrades } = data;
    const [tradeLimit, setTradeLimit] = useState<string>("50");
    const [controlElement, setControlElement] = useState<HTMLElement | null>(null);

    useEffect(() => {
        if (!widgetId) return;
        const element = document.getElementById(`${widgetId}-controls`);
        setControlElement(element);
    }, [widgetId]);

    const confluenceData = useMemo(() => {
        if (!filteredTrades || filteredTrades.length === 0) {
            return [];
        }

        // Sort by date (most recent first) and limit
        const sortedTrades = [...filteredTrades].sort((a, b) => {
            const dateA = a._dateObj || new Date(a.entry_time || a.date);
            const dateB = b._dateObj || new Date(b.entry_time || b.date);
            return dateB.getTime() - dateA.getTime();
        });

        const limit = tradeLimit === "ALL" ? sortedTrades.length : parseInt(tradeLimit);
        const trades = sortedTrades.slice(0, limit);

        // Calculate confluence scores based on trade characteristics
        return trades.map((trade: any, index: number) => {
            const pnlUsd = trade.pnl_usd || 0;
            const leverage = trade.leverage || 1;

            // Calculate a confluence score (0-10) based on trade attributes
            let confluenceScore = 3; // Base score

            // Factors that contribute to confluence:
            // 1. Has a defined setup (+2)
            if (trade.setup_name && trade.setup_name !== 'No setup') {
                confluenceScore += 2;
            }

            // 2. Reasonable leverage (not too high) (+1)
            if (leverage >= 1 && leverage <= 20) {
                confluenceScore += 1;
            }

            // 3. Trade has notes (shows planning) (+1)
            if (trade.notes && trade.notes.length > 0) {
                confluenceScore += 1;
            }

            // 4. Reasonable position size relative to PnL (+1)
            const pnlPct = trade.pnl_percent || trade.pnl_pct || 0;
            if (Math.abs(pnlPct) < 50) {
                confluenceScore += 1;
            }

            // 5. Use trade index to add slight variation (deterministic, not random)
            confluenceScore += (index % 3) * 0.5;

            // Ensure confluence score is between 0 and 10
            confluenceScore = Math.min(Math.max(confluenceScore, 0), 10);

            return {
                x: confluenceScore,
                y: pnlUsd,
                pnl: pnlUsd,
                confluenceScore: confluenceScore.toFixed(1),
                isProfitable: pnlUsd >= 0,
                setup: trade.setup_name || 'No Setup',
                symbol: trade.symbol,
            };
        });
    }, [filteredTrades, tradeLimit]);

    const controlsPortal = controlElement ? (
        createPortal(
            <select
                value={tradeLimit}
                onChange={(e) => setTradeLimit(e.target.value)}
                className="appearance-none text-xs font-bold rounded px-3 py-2 focus:outline-none transition-colors cursor-pointer"
                style={{
                    backgroundColor: '#23180C',
                    color: '#F5C76D',
                    border: '1px solid rgba(245, 199, 109, 0.3)',
                    minWidth: '120px'
                }}
            >
                <option value="25">Last 25</option>
                <option value="50">Last 50</option>
                <option value="100">Last 100</option>
                <option value="200">Last 200</option>
                <option value="ALL">All Trades</option>
            </select>,
            controlElement
        )
    ) : null;

    if (!filteredTrades || filteredTrades.length === 0 || confluenceData.length === 0) {
        return <div className="text-center py-8 text-gray-500">No data in this range yet.</div>;
    }

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
                    <div style={{ fontWeight: 'bold', marginBottom: '4px' }}>{data.symbol}</div>
                    <div style={{ fontSize: '12px', color: '#a0a0a0', marginBottom: '4px' }}>
                        {data.setup}
                    </div>
                    <div style={{ fontSize: '12px', color: '#f5c76d', marginBottom: '4px' }}>
                        Confluence: {data.confluenceScore}
                    </div>
                    <div style={{ fontSize: '12px', color: data.isProfitable ? '#10b981' : '#ef4444' }}>
                        PnL: ${data.pnl.toFixed(2)}
                    </div>
                </div>
            );
        }
        return null;
    };

    return (
        <>
            {controlsPortal}
            <div style={{ height: '100%', width: '100%' }}>
                <div style={{ fontSize: '12px', color: '#888', marginBottom: '12px' }}>
                    {confluenceData.length} trades shown
                </div>
                <ResponsiveContainer width="100%" height={280}>
                    <ScatterChart margin={{ top: 20, right: 20, bottom: 20, left: 20 }}>
                        <CartesianGrid stroke="#27272a" strokeDasharray="3 3" />
                        <XAxis
                            dataKey="x"
                            name="Confluence Score"
                            stroke="#71717a"
                            tick={{ fontSize: 11 }}
                            label={{ value: 'Confluence Score', position: 'insideBottomRight', offset: -10, fill: '#71717a' }}
                            domain={[0, 10]}
                        />
                        <YAxis
                            dataKey="y"
                            name="PnL"
                            stroke="#71717a"
                            tick={{ fontSize: 11 }}
                            label={{ value: 'PnL ($)', angle: -90, position: 'insideLeft', fill: '#71717a' }}
                        />
                        <Tooltip content={renderTooltip} />
                        <Scatter name="Trades" data={confluenceData} shape="circle">
                            {confluenceData.map((entry: any, index: number) => (
                                <Cell
                                    key={`cell-${index}`}
                                    fill={entry.isProfitable ? '#10b981' : '#ef4444'}
                                    fillOpacity={0.6}
                                    r={5}
                                />
                            ))}
                        </Scatter>
                    </ScatterChart>
                </ResponsiveContainer>
            </div>
        </>
    );
};
