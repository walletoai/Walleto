
import React from 'react';

interface StatsOverviewWidgetProps {
    stats: {
        totalTrades: number;
        totalPnl: number;
        winRate: number;
        avgReturn: number;
    } | null;
    title?: string;
}

export const StatsOverviewWidget: React.FC<StatsOverviewWidgetProps> = ({ stats, title = "Weekly Overview" }) => {
    if (!stats || (stats.totalTrades === 0 && stats.totalPnl === 0)) {
        return (
            <div className="card bg-leather-800 border-leather-700 p-6 h-full flex flex-col justify-center items-center text-center">
                <h3 className="font-serif text-lg mb-2" style={{ color: '#D4AF37' }}>{title}</h3>
                <p className="text-gray-500 text-sm">No trades recorded.</p>
            </div>
        );
    }
    const metricStyle = "text-xs mb-1 uppercase tracking-wider font-bold";
    const goldStyle = { color: '#D4AF37' }; // Hardcoded gold
    const valueStyle = "text-2xl font-bold font-mono";

    const coloredValue = (value: number, prefix = "$") => (
        <div className={`font-mono font-bold text-lg ${value >= 0 ? "text-emerald-400" : "text-rose-400"}`}>
            {prefix}{value.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
        </div>
    );

    return (
        <div className="card bg-leather-800 border-leather-700 p-6 h-full flex flex-col justify-center">
            <h3 className="font-serif text-lg mb-6 border-b border-leather-700 pb-2" style={goldStyle}>{title}</h3>
            <div className="flex flex-row justify-between items-center">
                <div className="flex flex-col flex-1">
                    <div className={metricStyle} style={{ color: 'rgba(212, 175, 55, 0.7)' }}>Net PnL</div>
                    {coloredValue(stats.totalPnl)}
                </div>
                <div className="w-px h-12 bg-leather-700 mx-4"></div>
                <div className="flex flex-col flex-1">
                    <div className={metricStyle} style={{ color: 'rgba(212, 175, 55, 0.7)' }}>Win Rate</div>
                    <div className={`font-mono font-bold text-lg ${stats.winRate >= 50 ? "text-emerald-400" : "text-amber-400"}`}>
                        {stats.winRate.toFixed(1)}%
                    </div>
                </div>
                <div className="w-px h-12 bg-leather-700 mx-4"></div>
                <div className="flex flex-col flex-1">
                    <div className={metricStyle} style={{ color: 'rgba(212, 175, 55, 0.7)' }}>Trades</div>
                    <div className={valueStyle}>{stats.totalTrades}</div>
                </div>
                <div className="w-px h-12 bg-leather-700 mx-4"></div>
                <div className="flex flex-col flex-1">
                    <div className={metricStyle} style={{ color: 'rgba(212, 175, 55, 0.7)' }}>Avg Return</div>
                    {coloredValue(stats.avgReturn)}
                </div>
            </div>
        </div>
    );
};
