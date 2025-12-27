import React from 'react';

interface DayDetailModalProps {
    dayKey: string | null;
    trades: any[];
    onClose: () => void;
}

export default function DayDetailModal({
    dayKey,
    trades,
    onClose,
}: DayDetailModalProps) {
    if (!dayKey) return null;

    let totalPnl = 0;
    let wins = 0;
    let best: any = null;
    let worst: any = null;

    const rows = trades.map((t) => {
        const pnl = t.pnl_usd || 0;
        totalPnl += pnl;
        if (pnl > 0) wins += 1;
        if (!best || pnl > best.pnlUsd) best = { ...t, pnlUsd: pnl };
        if (!worst || pnl < worst.pnlUsd) worst = { ...t, pnlUsd: pnl };

        const entryPrice = t.entry_price ?? t.entry ?? 0;
        const exitPrice = t.exit_price ?? t.exit ?? 0;
        const size = t.quantity ?? t.size ?? 0;
        const tradeDate = t.entry_time || t.date;

        let pnlPercent = t.pnl_percent ?? t.pnl_pct ?? 0;
        if (!pnlPercent && entryPrice > 0 && exitPrice > 0) {
            const direction = t.side === "SHORT" || t.side === "SELL" ? -1 : 1;
            const pctMove = ((exitPrice - entryPrice) / entryPrice) * direction;
            pnlPercent = pctMove * 100 * (t.leverage ?? 1);
        }

        return { ...t, pnlUsd: pnl, pnlPercent, entryPrice, exitPrice, size, tradeDate };
    });

    const winRate = rows.length ? (wins / rows.length) * 100 : 0;

    return (
        <div
            style={{
                position: "fixed",
                inset: 0,
                backgroundColor: "rgba(0, 0, 0, 0.8)",
                display: "flex",
                justifyContent: "center",
                alignItems: "center",
                zIndex: 2000,
                backdropFilter: "blur(4px)",
                padding: "20px"
            }}
        >
            <div
                style={{
                    backgroundColor: "#251E17",
                    padding: "32px",
                    borderRadius: "16px",
                    width: "min(900px, 95vw)",
                    maxHeight: "90vh",
                    overflow: "auto",
                    border: "1px solid rgba(212, 165, 69, 0.15)",
                    boxShadow: "0 20px 60px rgba(0, 0, 0, 0.8)"
                }}
            >
                {/* Header */}
                <div
                    style={{
                        display: "flex",
                        justifyContent: "space-between",
                        marginBottom: "24px",
                        alignItems: "center",
                    }}
                >
                    <h2 style={{ margin: 0, fontSize: "24px", fontWeight: "700", color: "#F5C76D" }}>
                        Day Breakdown · {dayKey}
                    </h2>
                    <button
                        onClick={onClose}
                        style={{
                            padding: "8px 16px",
                            backgroundColor: "rgba(37, 30, 23, 0.6)",
                            color: "#C2B280",
                            border: "1px solid rgba(212, 165, 69, 0.15)",
                            borderRadius: "8px",
                            fontSize: "13px",
                            fontWeight: "600",
                            cursor: "pointer"
                        }}
                    >
                        Close
                    </button>
                </div>

                {/* Stats Grid */}
                <div
                    style={{
                        display: "grid",
                        gridTemplateColumns: "repeat(auto-fit, minmax(150px, 1fr))",
                        gap: "16px",
                        marginBottom: "24px",
                    }}
                >
                    <div style={{
                        backgroundColor: "rgba(37, 30, 23, 0.4)",
                        padding: "16px",
                        borderRadius: "12px",
                        border: "1px solid rgba(212, 165, 69, 0.12)"
                    }}>
                        <div style={{ fontSize: "11px", color: "#8B7355", fontWeight: "600", textTransform: "uppercase", letterSpacing: "0.5px", marginBottom: "8px" }}>Trades</div>
                        <div style={{ fontSize: "20px", fontWeight: "700", color: "#F5C76D" }}>
                            {rows.length}
                        </div>
                    </div>
                    <div style={{
                        backgroundColor: "rgba(37, 30, 23, 0.4)",
                        padding: "16px",
                        borderRadius: "12px",
                        border: "1px solid rgba(212, 165, 69, 0.12)"
                    }}>
                        <div style={{ fontSize: "11px", color: "#8B7355", fontWeight: "600", textTransform: "uppercase", letterSpacing: "0.5px", marginBottom: "8px" }}>Total PnL</div>
                        <div
                            style={{
                                fontSize: "20px",
                                fontWeight: "700",
                                color: totalPnl >= 0 ? "#10b981" : "#ef4444",
                            }}
                        >
                            ${totalPnl.toFixed(2)}
                        </div>
                    </div>
                    <div style={{
                        backgroundColor: "rgba(37, 30, 23, 0.4)",
                        padding: "16px",
                        borderRadius: "12px",
                        border: "1px solid rgba(212, 165, 69, 0.12)"
                    }}>
                        <div style={{ fontSize: "11px", color: "#8B7355", fontWeight: "600", textTransform: "uppercase", letterSpacing: "0.5px", marginBottom: "8px" }}>Win Rate</div>
                        <div
                            style={{
                                fontSize: "20px",
                                fontWeight: "700",
                                color: winRate >= 50 ? "#10b981" : "#f59e0b",
                            }}
                        >
                            {winRate.toFixed(1)}%
                        </div>
                    </div>
                    <div style={{
                        backgroundColor: "rgba(37, 30, 23, 0.4)",
                        padding: "16px",
                        borderRadius: "12px",
                        border: "1px solid rgba(212, 165, 69, 0.12)"
                    }}>
                        <div style={{ fontSize: "11px", color: "#8B7355", fontWeight: "600", textTransform: "uppercase", letterSpacing: "0.5px", marginBottom: "8px" }}>Best Trade</div>
                        <div style={{ fontSize: "14px", fontWeight: "600", color: "#C2B280" }}>
                            {best
                                ? `${best.symbol} ${best.side} $${best.pnlUsd.toFixed(2)}`
                                : "—"}
                        </div>
                    </div>
                    <div style={{
                        backgroundColor: "rgba(37, 30, 23, 0.4)",
                        padding: "16px",
                        borderRadius: "12px",
                        border: "1px solid rgba(212, 165, 69, 0.12)"
                    }}>
                        <div style={{ fontSize: "11px", color: "#8B7355", fontWeight: "600", textTransform: "uppercase", letterSpacing: "0.5px", marginBottom: "8px" }}>Worst Trade</div>
                        <div style={{ fontSize: "14px", fontWeight: "600", color: "#C2B280" }}>
                            {worst
                                ? `${worst.symbol} ${worst.side} $${worst.pnlUsd.toFixed(2)}`
                                : "—"}
                        </div>
                    </div>
                </div>

                {rows.length === 0 ? (
                    <div style={{ fontSize: "14px", color: "#8B7355", textAlign: "center", padding: "40px" }}>
                        No trades for this day with current filters.
                    </div>
                ) : (
                    <div style={{ overflowX: "auto", borderRadius: "12px", border: "1px solid rgba(212, 165, 69, 0.12)" }}>
                        <table
                            style={{
                                width: "100%",
                                borderCollapse: "collapse",
                                fontSize: "13px",
                                minWidth: 700,
                            }}
                        >
                            <thead>
                                <tr style={{ backgroundColor: "rgba(37, 30, 23, 0.6)" }}>
                                    {[
                                        "Time",
                                        "Symbol",
                                        "Side",
                                        "Setup",
                                        "Entry",
                                        "Exit",
                                        "Size",
                                        "PnL $",
                                        "PnL %",
                                        "Notes",
                                    ].map((h) => (
                                        <th
                                            key={h}
                                            style={{
                                                textAlign: "left",
                                                padding: "12px 14px",
                                                borderBottom: "1px solid rgba(212, 165, 69, 0.12)",
                                                color: "#8B7355",
                                                fontWeight: "600",
                                                fontSize: "11px",
                                                textTransform: "uppercase",
                                                letterSpacing: "0.5px"
                                            }}
                                        >
                                            {h}
                                        </th>
                                    ))}
                                </tr>
                            </thead>
                            <tbody>
                                {rows.map((t) => {
                                    const d = t.tradeDate ? new Date(t.tradeDate) : null;
                                    const timeStr = d
                                        ? d.toLocaleTimeString(undefined, {
                                            hour: "2-digit",
                                            minute: "2-digit",
                                        })
                                        : "—";

                                    return (
                                        <tr key={t.id} style={{ backgroundColor: "rgba(37, 30, 23, 0.3)" }}>
                                            <td style={{ padding: "12px 14px", borderBottom: "1px solid rgba(212, 165, 69, 0.08)", color: "#C2B280" }}>
                                                {timeStr}
                                            </td>
                                            <td style={{ padding: "12px 14px", borderBottom: "1px solid rgba(212, 165, 69, 0.08)", color: "#F5C76D", fontWeight: "600" }}>
                                                {t.symbol}
                                            </td>
                                            <td style={{ padding: "12px 14px", borderBottom: "1px solid rgba(212, 165, 69, 0.08)", color: "#C2B280" }}>
                                                {t.side}
                                            </td>
                                            <td style={{ padding: "12px 14px", borderBottom: "1px solid rgba(212, 165, 69, 0.08)", color: "#C2B280" }}>
                                                {t.setup_name || "—"}
                                            </td>
                                            <td style={{ padding: "12px 14px", borderBottom: "1px solid rgba(212, 165, 69, 0.08)", color: "#C2B280" }}>
                                                {t.entryPrice ? `$${Number(t.entryPrice).toLocaleString(undefined, { maximumFractionDigits: 2 })}` : "—"}
                                            </td>
                                            <td style={{ padding: "12px 14px", borderBottom: "1px solid rgba(212, 165, 69, 0.08)", color: "#C2B280" }}>
                                                {t.exitPrice ? `$${Number(t.exitPrice).toLocaleString(undefined, { maximumFractionDigits: 2 })}` : "—"}
                                            </td>
                                            <td style={{ padding: "12px 14px", borderBottom: "1px solid rgba(212, 165, 69, 0.08)", color: "#C2B280" }}>
                                                {t.size ? Number(t.size).toFixed(4) : "—"}
                                            </td>
                                            <td
                                                style={{
                                                    padding: "12px 14px",
                                                    borderBottom: "1px solid rgba(212, 165, 69, 0.08)",
                                                    color: t.pnlUsd >= 0 ? "#10b981" : "#ef4444",
                                                    fontWeight: "600",
                                                }}
                                            >
                                                {t.pnlUsd >= 0 ? "+" : ""}
                                                {t.pnlUsd.toFixed(2)}
                                            </td>
                                            <td
                                                style={{
                                                    padding: "12px 14px",
                                                    borderBottom: "1px solid rgba(212, 165, 69, 0.08)",
                                                    color: t.pnlPercent >= 0 ? "#10b981" : "#ef4444",
                                                }}
                                            >
                                                {isNaN(t.pnlPercent) ? "—" : `${t.pnlPercent >= 0 ? "+" : ""}${t.pnlPercent.toFixed(2)}%`}
                                            </td>
                                            <td
                                                style={{
                                                    padding: "12px 14px",
                                                    borderBottom: "1px solid rgba(212, 165, 69, 0.08)",
                                                    maxWidth: 200,
                                                    whiteSpace: "nowrap",
                                                    textOverflow: "ellipsis",
                                                    overflow: "hidden",
                                                    color: "#8B7355"
                                                }}
                                            >
                                                {t.notes || ""}
                                            </td>
                                        </tr>
                                    );
                                })}
                            </tbody>
                        </table>
                    </div>
                )}
            </div>
        </div>
    );
}
