import React, { useMemo } from 'react';

interface YtdPanelProps {
    trades: any[];
    year: number;
}

export default function YtdPanel({ trades, year }: YtdPanelProps) {
    const stats = useMemo(() => {
        const yearTrades = (trades || []).filter((t: any) => {
            const tradeDate = t.entry_time || t.date;
            if (!tradeDate) return false;
            const d = new Date(tradeDate);
            if (isNaN(d.getTime())) return false;
            return d.getFullYear() === year;
        });

        if (yearTrades.length === 0) {
            return {
                totalTrades: 0,
                totalPnl: 0,
                winRate: 0,
                avgTrade: 0,
                maxDrawdown: 0,
                longPnl: 0,
                shortPnl: 0,
                topSymbol: null as null | { symbol: string; pnl: number },
                worstSymbol: null as null | { symbol: string; pnl: number },
                topSetup: null as null | { setup: string; pnl: number },
                worstSetup: null as null | { setup: string; pnl: number },
            };
        }

        let running = 0;
        let peak = 0;
        let maxDrawdown = 0;
        let wins = 0;
        let longPnl = 0;
        let shortPnl = 0;

        const symbolMap = new Map<string, number>();
        const setupMap = new Map<string, number>();

        const sorted = [...yearTrades].sort((a, b) => {
            const da = new Date(a.entry_time || a.date).getTime();
            const db = new Date(b.entry_time || b.date).getTime();
            return da - db;
        });

        for (const t of sorted) {
            const pnl = t.pnl_usd || 0;
            running += pnl;
            if (running > peak) peak = running;
            const dd = running - peak;
            if (dd < maxDrawdown) maxDrawdown = dd;

            if (pnl > 0) wins += 1;
            if (t.side === "SHORT") shortPnl += pnl;
            else longPnl += pnl;

            const symbolKey = t.symbol || "UNKNOWN";
            symbolMap.set(symbolKey, (symbolMap.get(symbolKey) || 0) + pnl);

            const setupKey = t.setup_name || "No setup";
            setupMap.set(setupKey, (setupMap.get(setupKey) || 0) + pnl);
        }

        const totalTrades = yearTrades.length;
        const totalPnl = running;
        const winRate = totalTrades ? (wins / totalTrades) * 100 : 0;
        const avgTrade = totalTrades ? totalPnl / totalTrades : 0;

        const symbolEntries = Array.from(symbolMap.entries());
        const topSymbolEntry =
            symbolEntries.length > 0
                ? symbolEntries.reduce((a, b) => (b[1] > a[1] ? b : a))
                : null;
        const worstSymbolEntry =
            symbolEntries.length > 0
                ? symbolEntries.reduce((a, b) => (b[1] < a[1] ? b : a))
                : null;

        const setupEntries = Array.from(setupMap.entries());
        const topSetupEntry =
            setupEntries.length > 0
                ? setupEntries.reduce((a, b) => (b[1] > a[1] ? b : a))
                : null;
        const worstSetupEntry =
            setupEntries.length > 0
                ? setupEntries.reduce((a, b) => (b[1] < a[1] ? b : a))
                : null;

        return {
            totalTrades,
            totalPnl,
            winRate,
            avgTrade,
            maxDrawdown,
            longPnl,
            shortPnl,
            topSymbol: topSymbolEntry
                ? { symbol: topSymbolEntry[0], pnl: topSymbolEntry[1] }
                : null,
            worstSymbol: worstSymbolEntry
                ? { symbol: worstSymbolEntry[0], pnl: worstSymbolEntry[1] }
                : null,
            topSetup: topSetupEntry
                ? { setup: topSetupEntry[0], pnl: topSetupEntry[1] }
                : null,
            worstSetup: worstSetupEntry
                ? { setup: worstSetupEntry[0], pnl: worstSetupEntry[1] }
                : null,
        };
    }, [trades, year]);

    const metricStyle: React.CSSProperties = {
        fontSize: 12,
        opacity: 0.7,
        marginBottom: 4,
    };

    const valueStyle: React.CSSProperties = {
        fontSize: 18,
        fontWeight: 600,
    };

    function coloredValue(
        label: string,
        value: number,
        prefix = "$"
    ): React.ReactElement {
        return (
            <div>
                <div style={metricStyle}>{label}</div>
                <div
                    className={`font-mono font-bold text-lg ${value >= 0 ? "text-emerald-400" : "text-rose-400"}`}
                >
                    {prefix}
                    {value.toFixed(2)}
                </div>
            </div>
        );
    }

    return (
        <div
            style={{
                display: "grid",
                gridTemplateColumns: "repeat(auto-fit,minmax(150px,1fr))",
                gap: 16,
                fontSize: 12,
            }}
        >
            <div>
                <div style={metricStyle}>YTD Trades</div>
                <div style={valueStyle}>{stats.totalTrades}</div>
            </div>
            {coloredValue("YTD PnL", stats.totalPnl)}
            <div>
                <div style={metricStyle}>YTD Win Rate</div>
                <div
                    className={`font-mono font-bold text-lg ${stats.winRate >= 50 ? "text-emerald-400" : "text-amber-400"}`}
                >
                    {stats.winRate.toFixed(2)}%
                </div>
            </div>
            {coloredValue("Avg PnL / Trade", stats.avgTrade)}
            {coloredValue("Max Drawdown", stats.maxDrawdown)}
            {coloredValue("Long PnL", stats.longPnl)}
            {coloredValue("Short PnL", stats.shortPnl)}

            <div>
                <div style={metricStyle}>Top Coin</div>
                <div style={valueStyle}>
                    {stats.topSymbol
                        ? `${stats.topSymbol.symbol} ($${stats.topSymbol.pnl.toFixed(
                            2
                        )
                        })`
                        : "—"}
                </div>
            </div>
            <div>
                <div style={metricStyle}>Worst Coin</div>
                <div style={valueStyle}>
                    {stats.worstSymbol
                        ? `${stats.worstSymbol.symbol} ($${stats.worstSymbol.pnl.toFixed(
                            2
                        )
                        })`
                        : "—"}
                </div>
            </div>

            <div>
                <div style={metricStyle}>Top Setup</div>
                <div style={valueStyle}>
                    {stats.topSetup
                        ? `${stats.topSetup.setup} ($${stats.topSetup.pnl.toFixed(
                            2
                        )
                        })`
                        : "—"}
                </div>
            </div>
            <div>
                <div style={metricStyle}>Worst Setup</div>
                <div style={valueStyle}>
                    {stats.worstSetup
                        ? `${stats.worstSetup.setup} ($${stats.worstSetup.pnl.toFixed(
                            2
                        )
                        })`
                        : "—"}
                </div>
            </div>
        </div>
    );
}
