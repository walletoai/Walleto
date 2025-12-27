import React, { useMemo, useState, useEffect } from 'react';
import { createPortal } from 'react-dom';

interface Props {
    data: any;
    widgetId?: string;
}

export const PerformanceSummaryWidget: React.FC<Props> = ({ data, widgetId }) => {
    const { summary, extras, filteredTrades } = data;
    const [timeRange, setTimeRange] = useState<'ALL' | 'YEAR' | 'MONTH' | 'WEEK'>('ALL');
    const [controlElement, setControlElement] = useState<HTMLElement | null>(null);

    useEffect(() => {
        if (!widgetId) return;
        const element = document.getElementById(`${widgetId}-controls`);
        setControlElement(element);
    }, [widgetId]);

    const timeFilteredSummary = useMemo(() => {
        if (!filteredTrades || filteredTrades.length === 0) {
            return { totalTrades: 0, totalPnl: 0, winRate: 0, avgPnl: 0, maxDrawdown: 0, avgWin: 0, avgLoss: 0, profitFactor: 0 };
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

        let filtered = filteredTrades;
        if (startDate) {
            filtered = filteredTrades.filter((t: any) => {
                // Use _dateObj (already parsed) or parse entry_time/date
                const entryDate = t._dateObj || new Date(t.entry_time || t.date);
                return entryDate >= startDate;
            });
        }

        let wins = 0;
        let total = 0;
        let totalPnl = 0;
        let peak = 0;
        let maxDrawdown = 0;
        let sumWin = 0;
        let sumLoss = 0;
        let countWin = 0;
        let countLoss = 0;
        let running = 0;

        filtered.forEach((t: any) => {
            const pnlUsd = t.pnl_usd || 0;
            totalPnl += pnlUsd;
            total += 1;

            if (pnlUsd > 0) {
                wins += 1;
                sumWin += pnlUsd;
                countWin += 1;
            } else if (pnlUsd < 0) {
                sumLoss += pnlUsd;
                countLoss += 1;
            }

            running += pnlUsd;
            if (running > peak) peak = running;
            const dd = running - peak;
            if (dd < maxDrawdown) maxDrawdown = dd;
        });

        const winRate = total ? (wins / total) * 100 : 0;
        const avgPnl = total ? totalPnl / total : 0;
        const avgWin = countWin ? sumWin / countWin : 0;
        const avgLoss = countLoss ? Math.abs(sumLoss / countLoss) : 0;
        const profitFactor = avgLoss > 0 ? avgWin / avgLoss : (avgWin > 0 ? Infinity : 0);

        return { totalTrades: total, totalPnl, winRate, avgPnl, maxDrawdown, avgWin, avgLoss, profitFactor };
    }, [filteredTrades, timeRange]);

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
                    minWidth: '100px'
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

    const allTimeMetrics = useMemo(() => {
        if (!filteredTrades || filteredTrades.length === 0) {
            return { totalTrades: 0, totalPnl: 0, winRate: 0, avgPnl: 0, maxDrawdown: 0, avgWin: 0, avgLoss: 0, profitFactor: 0 };
        }

        let wins = 0;
        let total = 0;
        let totalPnl = 0;
        let peak = 0;
        let maxDrawdown = 0;
        let sumWin = 0;
        let sumLoss = 0;
        let countWin = 0;
        let countLoss = 0;
        let running = 0;

        filteredTrades.forEach((t: any) => {
            const pnlUsd = t.pnl_usd || 0;
            totalPnl += pnlUsd;
            total += 1;

            if (pnlUsd > 0) {
                wins += 1;
                sumWin += pnlUsd;
                countWin += 1;
            } else if (pnlUsd < 0) {
                sumLoss += pnlUsd;
                countLoss += 1;
            }

            running += pnlUsd;
            if (running > peak) peak = running;
            const dd = running - peak;
            if (dd < maxDrawdown) maxDrawdown = dd;
        });

        const winRate = total ? (wins / total) * 100 : 0;
        const avgPnl = total ? totalPnl / total : 0;
        const avgWin = countWin ? sumWin / countWin : 0;
        const avgLoss = countLoss ? Math.abs(sumLoss / countLoss) : 0;
        const profitFactor = avgLoss > 0 ? avgWin / avgLoss : (avgWin > 0 ? Infinity : 0);

        return { totalTrades: total, totalPnl, winRate, avgPnl, maxDrawdown, avgWin, avgLoss, profitFactor };
    }, [filteredTrades]);

    const displaySummary = timeRange === "ALL" ? allTimeMetrics : timeFilteredSummary;

    // Color helper functions
    const getPnlColor = (value: number) => {
        return value >= 0 ? '#10b981' : '#ef4444';
    };

    const getWinRateColor = (value: number) => {
        if (value >= 60) return '#10b981'; // Green - Good win rate
        if (value >= 50) return '#f59e0b'; // Amber - Acceptable
        return '#ef4444'; // Red - Poor
    };

    const getProfitFactorColor = (value: number) => {
        if (value >= 1.5) return '#10b981'; // Green - Strong
        if (value >= 1) return '#f59e0b'; // Amber - Breakeven
        return '#ef4444'; // Red - Unprofitable
    };

    if (!filteredTrades || filteredTrades.length === 0) {
        return <div style={{ textAlign: 'center', padding: '20px', color: '#666' }}>No data in this range yet.</div>;
    }

    return (
        <>
            {controlsPortal}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: '12px', height: '100%' }}>
                {/* Total Trades */}
                <div style={{
                    backgroundColor: '#1a1a1a',
                    border: '2px solid #D4AF37',
                    borderRadius: '8px',
                    padding: '16px',
                    textAlign: 'center'
                }}>
                    <div style={{ fontSize: '10px', color: '#999', marginBottom: '8px', textTransform: 'uppercase', letterSpacing: '0.05em', fontWeight: 'bold' }}>
                        Total Trades
                    </div>
                    <div style={{ fontSize: '28px', fontWeight: 'bold', color: '#D4AF37', marginBottom: '4px' }}>
                        {displaySummary.totalTrades}
                    </div>
                    <div style={{ fontSize: '11px', color: '#666' }}>
                        Trade count
                    </div>
                </div>

                {/* Total PnL */}
                <div style={{
                    backgroundColor: '#1a1a1a',
                    border: `2px solid ${getPnlColor(displaySummary.totalPnl)}`,
                    borderRadius: '8px',
                    padding: '16px',
                    textAlign: 'center'
                }}>
                    <div style={{ fontSize: '10px', color: '#999', marginBottom: '8px', textTransform: 'uppercase', letterSpacing: '0.05em', fontWeight: 'bold' }}>
                        Total PnL
                    </div>
                    <div style={{ fontSize: '28px', fontWeight: 'bold', color: getPnlColor(displaySummary.totalPnl), marginBottom: '4px' }}>
                        ${displaySummary.totalPnl.toFixed(2)}
                    </div>
                    <div style={{ fontSize: '11px', color: '#666' }}>
                        Cumulative profit
                    </div>
                </div>

                {/* Win Rate */}
                <div style={{
                    backgroundColor: '#1a1a1a',
                    border: `2px solid ${getWinRateColor(displaySummary.winRate)}`,
                    borderRadius: '8px',
                    padding: '16px',
                    textAlign: 'center'
                }}>
                    <div style={{ fontSize: '10px', color: '#999', marginBottom: '8px', textTransform: 'uppercase', letterSpacing: '0.05em', fontWeight: 'bold' }}>
                        Win Rate
                    </div>
                    <div style={{ fontSize: '28px', fontWeight: 'bold', color: getWinRateColor(displaySummary.winRate), marginBottom: '4px' }}>
                        {displaySummary.winRate.toFixed(1)}%
                    </div>
                    <div style={{
                        fontSize: '10px',
                        padding: '6px',
                        backgroundColor: getWinRateColor(displaySummary.winRate) + '20',
                        borderRadius: '4px',
                        color: getWinRateColor(displaySummary.winRate),
                        marginTop: '8px'
                    }}>
                        {displaySummary.winRate >= 60 ? '✓ Excellent' : displaySummary.winRate >= 50 ? '⚠ Good' : '✕ Needs Work'}
                    </div>
                </div>

                {/* Avg PnL */}
                <div style={{
                    backgroundColor: '#1a1a1a',
                    border: `2px solid ${getPnlColor(displaySummary.avgPnl)}`,
                    borderRadius: '8px',
                    padding: '16px',
                    textAlign: 'center'
                }}>
                    <div style={{ fontSize: '10px', color: '#999', marginBottom: '8px', textTransform: 'uppercase', letterSpacing: '0.05em', fontWeight: 'bold' }}>
                        Avg PnL/Trade
                    </div>
                    <div style={{ fontSize: '28px', fontWeight: 'bold', color: getPnlColor(displaySummary.avgPnl), marginBottom: '4px' }}>
                        ${displaySummary.avgPnl.toFixed(2)}
                    </div>
                    <div style={{ fontSize: '11px', color: '#666' }}>
                        Per-trade average
                    </div>
                </div>

                {/* Avg Win */}
                <div style={{
                    backgroundColor: '#1a1a1a',
                    border: '2px solid #10b981',
                    borderRadius: '8px',
                    padding: '16px',
                    textAlign: 'center'
                }}>
                    <div style={{ fontSize: '10px', color: '#999', marginBottom: '8px', textTransform: 'uppercase', letterSpacing: '0.05em', fontWeight: 'bold' }}>
                        Avg Win
                    </div>
                    <div style={{ fontSize: '28px', fontWeight: 'bold', color: '#10b981', marginBottom: '4px' }}>
                        ${displaySummary.avgWin.toFixed(2)}
                    </div>
                    <div style={{ fontSize: '11px', color: '#666' }}>
                        Average winner
                    </div>
                </div>

                {/* Avg Loss */}
                <div style={{
                    backgroundColor: '#1a1a1a',
                    border: '2px solid #ef4444',
                    borderRadius: '8px',
                    padding: '16px',
                    textAlign: 'center'
                }}>
                    <div style={{ fontSize: '10px', color: '#999', marginBottom: '8px', textTransform: 'uppercase', letterSpacing: '0.05em', fontWeight: 'bold' }}>
                        Avg Loss
                    </div>
                    <div style={{ fontSize: '28px', fontWeight: 'bold', color: '#ef4444', marginBottom: '4px' }}>
                        -${displaySummary.avgLoss.toFixed(2)}
                    </div>
                    <div style={{ fontSize: '11px', color: '#666' }}>
                        Average loser
                    </div>
                </div>

                {/* Profit Factor */}
                <div style={{
                    backgroundColor: '#1a1a1a',
                    border: `2px solid ${getProfitFactorColor(displaySummary.profitFactor)}`,
                    borderRadius: '8px',
                    padding: '16px',
                    textAlign: 'center'
                }}>
                    <div style={{ fontSize: '10px', color: '#999', marginBottom: '8px', textTransform: 'uppercase', letterSpacing: '0.05em', fontWeight: 'bold' }}>
                        Profit Factor
                    </div>
                    <div style={{ fontSize: '28px', fontWeight: 'bold', color: getProfitFactorColor(displaySummary.profitFactor), marginBottom: '4px' }}>
                        {isFinite(displaySummary.profitFactor) ? displaySummary.profitFactor.toFixed(2) : '∞'}
                    </div>
                    <div style={{
                        fontSize: '10px',
                        padding: '6px',
                        backgroundColor: getProfitFactorColor(displaySummary.profitFactor) + '20',
                        borderRadius: '4px',
                        color: getProfitFactorColor(displaySummary.profitFactor),
                        marginTop: '8px'
                    }}>
                        {displaySummary.profitFactor >= 1.5 ? '✓ Strong' : displaySummary.profitFactor >= 1 ? '⚠ Viable' : '✕ Losing'}
                    </div>
                </div>
            </div>
        </>
    );
};
