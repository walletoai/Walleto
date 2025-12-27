import React, { useMemo } from 'react';
import { WidgetWrapper } from '../widgets/WidgetWrapper';
import { PnLCurveWidget } from '../widgets/PnLCurveWidget';
import MonthlyCalendar from './MonthlyCalendar';
import WeeklyHeatmap from './WeeklyHeatmap';
import { WinRateTimelineWidget } from '../analytics/widgets/WinRateTimelineWidget';
import { useResponsive } from '../../hooks/useResponsive';

interface DashboardGridProps {
    trades: any[];
    stats: any;
    pnlData: { date: string; pnl: number }[];
    year: number;
    onDayClick: (dayKey: string) => void;
    onAddTradeClick: () => void;
}

export const DashboardGrid: React.FC<DashboardGridProps> = ({ trades, stats, pnlData, year, onDayClick, onAddTradeClick }) => {
    const { isMobile, isTablet } = useResponsive();

    // Debug log to confirm rendering
    console.log("Rendering DashboardGrid v5.19");

    // Calendar state
    const [calendarDate, setCalendarDate] = React.useState(new Date());
    const handlePrevMonth = () => setCalendarDate(new Date(calendarDate.getFullYear(), calendarDate.getMonth() - 1, 1));
    const handleNextMonth = () => setCalendarDate(new Date(calendarDate.getFullYear(), calendarDate.getMonth() + 1, 1));

    // Helper for Stat Cards
    const renderStat = (label: string, value: string | number, isCurrency = false, isPositive?: boolean) => (
        <div className="flex flex-col items-center justify-center h-full">
            <h4 className="text-leather-accent text-sm uppercase tracking-wider mb-1 opacity-80">{label}</h4>
            <div className={`text-3xl font-bold font-mono ${isPositive === undefined ? 'text-white' : isPositive ? 'text-emerald-400' : 'text-rose-400'
                }`}>
                {value}
            </div>
        </div>
    );

    // Helper for Win Rate Circle
    const renderWinRate = (rate: number) => {
        const isPositive = rate >= 50;
        const color = isPositive ? '#34d399' : '#f87171'; // emerald-400 : rose-400
        const radius = 20;
        const circumference = 2 * Math.PI * radius;
        const offset = circumference - (rate / 100) * circumference;

        return (
            <div className="flex flex-col items-center justify-center h-full">
                <h4 className="text-leather-accent text-sm uppercase tracking-wider mb-1 opacity-80">Win Rate</h4>
                <div className="relative flex items-center justify-center">
                    <svg className="transform -rotate-90 w-14 h-14">
                        <circle
                            cx="28"
                            cy="28"
                            r={radius}
                            stroke="#27272a"
                            strokeWidth="4"
                            fill="transparent"
                        />
                        <circle
                            cx="28"
                            cy="28"
                            r={radius}
                            stroke={color}
                            strokeWidth="4"
                            fill="transparent"
                            strokeDasharray={circumference}
                            strokeDashoffset={offset}
                            strokeLinecap="round"
                        />
                    </svg>
                    <div className={`absolute text-sm font-bold font-mono ${isPositive ? 'text-emerald-400' : 'text-rose-400'}`}>
                        {rate.toFixed(0)}%
                    </div>
                </div>
            </div>
        );
    };

    // Time Range State
    type TimeRange = '1W' | '1M' | 'YTD' | 'ALL';
    const [netPnlTimeRange, setNetPnlTimeRange] = React.useState<TimeRange>('ALL');
    const [winRateTimeRange, setWinRateTimeRange] = React.useState<TimeRange>('ALL');

    // Helper to filter trades by time range
    const filterTradesByRange = (tradesToFilter: any[], range: TimeRange) => {
        if (range === 'ALL') return tradesToFilter;

        const now = new Date();
        let startDate: Date;

        if (range === '1W') {
            startDate = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
        } else if (range === '1M') {
            startDate = new Date(now.getFullYear(), now.getMonth() - 1, now.getDate());
        } else if (range === 'YTD') {
            startDate = new Date(now.getFullYear(), 0, 1);
        } else {
            startDate = new Date(0);
        }

        return tradesToFilter.filter(t => {
            // Use entry_time (Blofin trades) or fall back to date
            const tradeDate = t.entry_time || t.date;
            if (!tradeDate) return false;
            return new Date(tradeDate) >= startDate;
        });
    };

    // Computed Stats based on Time Range
    const currentNetPnl = useMemo(() => {
        const filtered = filterTradesByRange(trades, netPnlTimeRange);
        return filtered.reduce((acc, t) => acc + (t.pnl_usd || 0), 0);
    }, [trades, netPnlTimeRange]);

    const currentWinRate = useMemo(() => {
        const filtered = filterTradesByRange(trades, winRateTimeRange);
        if (filtered.length === 0) return 0;
        const wins = filtered.filter(t => (t.pnl_usd || 0) > 0).length;
        return (wins / filtered.length) * 100;
    }, [trades, winRateTimeRange]);

    // ... (keep existing data preparation code) ...

    // Prepare data for specific widgets
    const enrichedTrades = useMemo(() => {
        return trades.map(t => ({
            ...t,
            _dateObj: new Date(t.entry_time || t.date),
            pnlUsd: t.pnl_usd || 0
        }));
    }, [trades]);

    const widgetData = useMemo(() => ({
        filteredTrades: enrichedTrades
    }), [enrichedTrades]);

    const symbolData = useMemo(() => {
        const statsMap = new Map();
        trades.forEach(t => {
            const symbol = t.symbol || 'Unknown';
            if (!statsMap.has(symbol)) {
                statsMap.set(symbol, { symbol, pnl: 0, trades: 0, wins: 0 });
            }
            const entry = statsMap.get(symbol);
            entry.pnl += t.pnl_usd || 0;
            entry.trades += 1;
            if ((t.pnl_usd || 0) > 0) entry.wins += 1;
        });

        const symbolStats = Array.from(statsMap.values()).map((s: any) => ({
            ...s,
            winRate: s.trades > 0 ? (s.wins / s.trades) * 100 : 0
        })).sort((a: any, b: any) => b.pnl - a.pnl).slice(0, 5);

        return { extras: { symbolStats } };
    }, [trades]);

    return (
        <div className="grid grid-cols-12 gap-4 w-full">
            {/* Row 1: Net PnL, Win Rate, Sharpe Ratio (Strict Code Injection Round 3) */}
            <div className="col-span-12">
                <div
                    className="w-full max-w-6xl mx-auto"
                    style={{
                        display: "grid",
                        gridTemplateColumns: isMobile ? "1fr" : isTablet ? "repeat(2, 1fr)" : "repeat(3, 1fr)",
                        gap: isMobile ? "12px" : "18px",
                        alignItems: "stretch"
                    }}
                >

                    {/* NET PNL */}
                    <WidgetWrapper>
                        <div className="flex flex-col items-center justify-center h-full relative p-4" style={{ minHeight: '175px' }}>
                            {/* Background gradient accent */}
                            <div
                                style={{
                                    position: 'absolute',
                                    top: 0,
                                    right: 0,
                                    width: '500px',
                                    height: '500px',
                                    background: `radial-gradient(circle, ${currentNetPnl >= 0 ? 'rgba(16, 185, 129, 0.25)' : 'rgba(239, 68, 68, 0.25)'} 0%, transparent 70%)`,
                                    borderRadius: '50%',
                                    pointerEvents: 'none',
                                }}
                            />

                            {/* Title */}
                            <div
                                style={{
                                    color: '#888',
                                    fontSize: '12px',
                                    fontWeight: '600',
                                    letterSpacing: '1px',
                                    textTransform: 'uppercase',
                                    marginBottom: '12px',
                                    position: 'relative',
                                    zIndex: 10,
                                    textAlign: 'center'
                                }}
                            >
                                Net PnL
                            </div>

                            {/* Time range selector */}
                            <div style={{
                                position: 'absolute',
                                top: '12px',
                                right: '16px',
                                zIndex: 20
                            }}>
                                <select
                                    value={netPnlTimeRange}
                                    onChange={(e) => setNetPnlTimeRange(e.target.value as TimeRange)}
                                    className="appearance-none text-xs font-bold rounded px-3 py-1 focus:outline-none transition-colors cursor-pointer"
                                    style={{
                                        backgroundColor: 'rgba(35, 24, 12, 0.8)',
                                        color: '#F5C76D',
                                        border: '1px solid rgba(245, 199, 109, 0.3)',
                                        padding: '6px 12px'
                                    }}
                                >
                                    <option value="ALL">ALL</option>
                                    <option value="1W">1W</option>
                                    <option value="1M">1M</option>
                                    <option value="YTD">YTD</option>
                                </select>
                            </div>

                            {/* Main PnL Display with animation */}
                            <div className="flex flex-col items-center justify-center flex-1 relative z-10">
                                {/* Sparkle effect container */}
                                <div
                                    style={{
                                        position: 'relative',
                                        width: '150px',
                                        height: '100px',
                                        display: 'flex',
                                        alignItems: 'center',
                                        justifyContent: 'center',
                                    }}
                                >
                                    {/* Animated border effect */}
                                    <div
                                        style={{
                                            position: 'absolute',
                                            top: '-10px',
                                            left: '-10px',
                                            right: '-10px',
                                            bottom: '-10px',
                                            borderRadius: '16px',
                                            background: `linear-gradient(135deg, ${currentNetPnl >= 0 ? '#10b981' : '#ef4444'}20, ${currentNetPnl >= 0 ? '#34d39920' : '#f8717120'})`,
                                            opacity: 0.3,
                                            pointerEvents: 'none',
                                            animation: 'pulse 3s ease-in-out infinite',
                                        }}
                                    />

                                    {/* Main value */}
                                    <div
                                        style={{
                                            position: 'relative',
                                            zIndex: 1,
                                            fontSize: '3rem',
                                            fontWeight: 'bold',
                                            fontFamily: 'monospace',
                                            color: currentNetPnl >= 0 ? '#10b981' : '#ef4444',
                                            textShadow: `0 0 20px ${currentNetPnl >= 0 ? 'rgba(16, 185, 129, 0.5)' : 'rgba(239, 68, 68, 0.5)'}`,
                                            lineHeight: '1',
                                        }}
                                    >
                                        ${currentNetPnl.toFixed(2)}
                                    </div>
                                </div>

                                {/* Performance indicator */}
                                <div
                                    style={{
                                        marginTop: '16px',
                                        fontSize: '12px',
                                        color: currentNetPnl >= 0 ? '#10b981' : '#ef4444',
                                        fontWeight: '600',
                                        textTransform: 'uppercase',
                                        letterSpacing: '1px',
                                        background: currentNetPnl >= 0 ? 'rgba(16, 185, 129, 0.15)' : 'rgba(239, 68, 68, 0.15)',
                                        padding: '6px 12px',
                                        borderRadius: '20px',
                                        border: `1px solid ${currentNetPnl >= 0 ? 'rgba(16, 185, 129, 0.3)' : 'rgba(239, 68, 68, 0.3)'}`,
                                    }}
                                >
                                    {currentNetPnl >= 0 ? '📈 Profitable' : '📉 Loss'}
                                </div>
                            </div>

                            <style>{`
                                @keyframes pulse {
                                    0%, 100% { transform: scale(1); opacity: 0.3; }
                                    50% { transform: scale(1.1); opacity: 0.5; }
                                }
                            `}</style>
                        </div>
                    </WidgetWrapper>

                    {/* WIN RATE */}
                    <WidgetWrapper>
                        <div className="flex flex-col items-center justify-center h-full relative p-4" style={{ minHeight: '175px' }}>
                            {/* Radial gradient background effect */}
                            <div style={{
                                position: 'absolute',
                                top: 0,
                                right: 0,
                                width: '280px',
                                height: '280px',
                                background: `radial-gradient(circle, ${currentWinRate >= 50 ? 'rgba(52, 211, 153, 0.1)' : 'rgba(248, 113, 113, 0.1)'} 0%, transparent 70%)`,
                                borderRadius: '50%',
                                pointerEvents: 'none',
                                zIndex: 0
                            }} />

                            {/* Title */}
                            <div style={{
                                color: '#888',
                                fontSize: '12px',
                                fontWeight: '600',
                                letterSpacing: '1px',
                                textTransform: 'uppercase',
                                marginBottom: '12px',
                                position: 'relative',
                                zIndex: 1,
                                textAlign: 'center'
                            }}>
                                Win Rate
                            </div>

                            {/* Time range selector - positioned in header */}
                            <div style={{
                                position: 'absolute',
                                top: '12px',
                                right: '16px',
                                zIndex: 20
                            }}>
                                <select
                                    value={winRateTimeRange}
                                    onChange={(e) => setWinRateTimeRange(e.target.value as TimeRange)}
                                    className="appearance-none text-xs font-bold rounded px-3 py-1 focus:outline-none transition-colors cursor-pointer"
                                    style={{
                                        backgroundColor: 'rgba(35, 24, 12, 0.8)',
                                        color: '#F5C76D',
                                        border: '1px solid rgba(245, 199, 109, 0.3)',
                                        padding: '6px 12px'
                                    }}
                                >
                                    <option value="ALL">ALL</option>
                                    <option value="1W">1W</option>
                                    <option value="1M">1M</option>
                                    <option value="YTD">YTD</option>
                                </select>
                            </div>

                            {/* Main content */}
                            <div style={{
                                display: 'flex',
                                flexDirection: 'column',
                                alignItems: 'center',
                                justifyContent: 'center',
                                gap: '12px',
                                position: 'relative',
                                zIndex: 1
                            }}>

                                {/* Circular progress container with animation */}
                                <div style={{
                                    position: 'relative',
                                    width: '120px',
                                    height: '120px',
                                    display: 'flex',
                                    alignItems: 'center',
                                    justifyContent: 'center'
                                }}>
                                    {/* Animated border ring */}
                                    <div style={{
                                        position: 'absolute',
                                        width: '120px',
                                        height: '120px',
                                        borderRadius: '50%',
                                        animation: 'pulse 3s ease-in-out infinite',
                                        background: `linear-gradient(135deg, ${currentWinRate >= 50 ? '#34d39920' : '#f8717120'}, transparent)`,
                                        border: `2px solid ${currentWinRate >= 50 ? 'rgba(52, 211, 153, 0.3)' : 'rgba(248, 113, 113, 0.3)'}`
                                    }} />

                                    {/* SVG circular progress */}
                                    <svg width="120" height="120" viewBox="0 0 36 36" style={{
                                        position: 'absolute',
                                        transform: 'rotate(-90deg)',
                                        zIndex: 2
                                    }}>
                                        {/* Background circle */}
                                        <circle
                                            cx="18"
                                            cy="18"
                                            r="17.5"
                                            fill="none"
                                            stroke="rgba(255, 255, 255, 0.05)"
                                            strokeWidth="1.5"
                                        />
                                        {/* Progress circle */}
                                        <circle
                                            cx="18"
                                            cy="18"
                                            r="17.5"
                                            fill="none"
                                            stroke={currentWinRate >= 50 ? '#34d399' : '#f87171'}
                                            strokeWidth="1.5"
                                            strokeDasharray={`${currentWinRate * 1.1}, 100`}
                                            strokeLinecap="round"
                                            style={{
                                                transition: 'stroke-dasharray 0.6s ease-in-out',
                                                filter: currentWinRate >= 50 ? 'drop-shadow(0 0 4px rgba(52, 211, 153, 0.5))' : 'drop-shadow(0 0 4px rgba(248, 113, 113, 0.5))'
                                            }}
                                        />
                                    </svg>

                                    {/* Center text */}
                                    <div style={{
                                        position: 'relative',
                                        zIndex: 3,
                                        textAlign: 'center'
                                    }}>
                                        <div style={{
                                            fontSize: '2.25rem',
                                            fontWeight: '700',
                                            color: currentWinRate >= 50 ? '#34d399' : '#f87171',
                                            lineHeight: '1',
                                            textShadow: `0 0 16px ${currentWinRate >= 50 ? 'rgba(52, 211, 153, 0.5)' : 'rgba(248, 113, 113, 0.5)'}`
                                        }}>
                                            {currentWinRate.toFixed(1)}%
                                        </div>
                                    </div>
                                </div>

                                {/* Status badge */}
                                <div style={{
                                    background: currentWinRate >= 50 ? 'rgba(52, 211, 153, 0.15)' : 'rgba(248, 113, 113, 0.15)',
                                    border: `1px solid ${currentWinRate >= 50 ? 'rgba(52, 211, 153, 0.3)' : 'rgba(248, 113, 113, 0.3)'}`,
                                    padding: '8px 16px',
                                    borderRadius: '20px',
                                    fontSize: '12px',
                                    fontWeight: '600',
                                    color: currentWinRate >= 50 ? '#34d399' : '#f87171',
                                    display: 'flex',
                                    alignItems: 'center',
                                    gap: '6px'
                                }}>
                                    {currentWinRate >= 50 ? '✓ Winning' : '✕ Losing'}
                                </div>
                            </div>

                            {/* Pulse animation keyframes */}
                            <style>{`
                                @keyframes pulse {
                                    0% {
                                        box-shadow: 0 0 0 0 ${currentWinRate >= 50 ? 'rgba(52, 211, 153, 0.4)' : 'rgba(248, 113, 113, 0.4)'};
                                    }
                                    70% {
                                        box-shadow: 0 0 0 20px ${currentWinRate >= 50 ? 'rgba(52, 211, 153, 0)' : 'rgba(248, 113, 113, 0)'};
                                    }
                                    100% {
                                        box-shadow: 0 0 0 0 ${currentWinRate >= 50 ? 'rgba(52, 211, 153, 0)' : 'rgba(248, 113, 113, 0)'};
                                    }
                                }
                            `}</style>
                        </div>
                    </WidgetWrapper>

                    {/* ADD TRADE */}
                    <WidgetWrapper>
                        <div className="flex flex-col items-center justify-center h-full relative p-4" style={{ minHeight: '175px' }}>
                            {/* Radial gradient background effect */}
                            <div style={{
                                position: 'absolute',
                                top: 0,
                                right: 0,
                                width: '280px',
                                height: '280px',
                                background: 'radial-gradient(circle, rgba(212, 175, 55, 0.08) 0%, transparent 70%)',
                                borderRadius: '50%',
                                pointerEvents: 'none',
                                zIndex: 0
                            }} />

                            {/* Title */}
                            <div style={{
                                color: '#888',
                                fontSize: '12px',
                                fontWeight: '600',
                                letterSpacing: '1px',
                                textTransform: 'uppercase',
                                marginBottom: '20px',
                                position: 'relative',
                                zIndex: 1,
                                textAlign: 'center'
                            }}>
                                Add Trade
                            </div>

                            {/* Main button container with animation */}
                            <div style={{
                                display: 'flex',
                                flexDirection: 'column',
                                alignItems: 'center',
                                justifyContent: 'center',
                                gap: '12px',
                                position: 'relative',
                                zIndex: 1,
                                flex: 1
                            }}>
                                {/* Animated glow ring */}
                                <div style={{
                                    position: 'relative',
                                    width: '80px',
                                    height: '80px',
                                    display: 'flex',
                                    alignItems: 'center',
                                    justifyContent: 'center'
                                }}>
                                    {/* Pulsing ring background */}
                                    <div style={{
                                        position: 'absolute',
                                        width: '80px',
                                        height: '80px',
                                        borderRadius: '50%',
                                        border: '2px solid rgba(212, 175, 55, 0.2)',
                                        animation: 'pulse 3s ease-in-out infinite'
                                    }} />

                                    {/* Main button */}
                                    <button
                                        onClick={onAddTradeClick}
                                        className="flex items-center justify-center transition-all hover:scale-110 active:scale-95 group"
                                        style={{
                                            position: 'relative',
                                            zIndex: 2,
                                            width: '56px',
                                            height: '56px',
                                            padding: 0,
                                            background: 'linear-gradient(135deg, #D4A545 0%, #F5C76D 50%, #D4A545 100%)',
                                            boxShadow: '0 0 20px rgba(212, 175, 55, 0.4), 0 4px 12px rgba(212, 175, 55, 0.2)',
                                            border: '1px solid rgba(245, 199, 109, 0.8)',
                                            borderRadius: '50%',
                                            display: 'flex',
                                            alignItems: 'center',
                                            justifyContent: 'center',
                                            cursor: 'pointer'
                                        }}
                                    >
                                        <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="#2A1F0F" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" className="opacity-90 group-hover:opacity-100 transition-opacity">
                                            <line x1="12" y1="5" x2="12" y2="19"></line>
                                            <line x1="5" y1="12" x2="19" y2="12"></line>
                                        </svg>
                                    </button>
                                </div>

                                {/* Description text */}
                                <div style={{
                                    fontSize: '11px',
                                    color: 'rgba(136, 136, 136, 0.7)',
                                    textAlign: 'center',
                                    marginTop: '8px'
                                }}>
                                    Click to create a new trade
                                </div>
                            </div>

                            {/* Pulse animation keyframes */}
                            <style>{`
                                @keyframes pulse {
                                    0%, 100% {
                                        box-shadow: 0 0 0 0 rgba(212, 175, 55, 0.4);
                                    }
                                    50% {
                                        box-shadow: 0 0 0 12px rgba(212, 175, 55, 0);
                                    }
                                }
                            `}</style>
                        </div>
                    </WidgetWrapper>


                </div >
            </div >

            {/* NEW LAYOUT: INLINE GRID (Calendar Left, Stacked Right) */}
            < div
                style={{
                    display: "grid",
                    gridTemplateColumns: isMobile || isTablet ? "1fr" : "1.8fr 1.2fr",
                    gap: isMobile ? "12px" : "18px",
                    marginTop: isMobile ? "12px" : "18px",
                    width: "100%"
                }}
            >

                {/* LEFT SIDE: LARGE CALENDAR */}
                < WidgetWrapper className="!h-[420px]" style={{ height: isMobile ? '350px' : '420px' }}>
                    <div className="flex flex-col flex-1 min-h-0 h-full" style={{ height: '100%' }}>
                        <div style={{
                            color: '#888',
                            fontSize: '11px',
                            fontWeight: '600',
                            letterSpacing: '1px',
                            textTransform: 'uppercase',
                            marginBottom: '12px'
                        }}>Monthly Performance</div>
                        <div className="flex-1 flex flex-col min-h-0 h-full" style={{ height: '100%' }}>
                            <MonthlyCalendar
                                trades={trades}
                                events={[]}
                                year={calendarDate.getFullYear()}
                                month={calendarDate.getMonth()}
                                onPrevMonth={handlePrevMonth}
                                onNextMonth={handleNextMonth}
                                onDayClick={onDayClick}
                            />
                        </div>
                    </div>
                </WidgetWrapper >

                {/* RIGHT SIDE: STACKED WIDGETS */}
                < div
                    style={{
                        display: "grid",
                        gridTemplateRows: isMobile ? "160px 160px" : "190px 190px",
                        gap: isMobile ? "12px" : "18px"
                    }}
                >

                    {/* EQUITY CURVE */}
                    < WidgetWrapper style={{ padding: '12px', display: 'flex', flexDirection: 'column', minHeight: 0 }}>
                        <PnLCurveWidget data={pnlData} />
                    </WidgetWrapper >

                    {/* DAILY HEATMAP */}
                    < WidgetWrapper style={{ padding: '12px', display: 'flex', flexDirection: 'column', minHeight: 0 }}>
                        <WeeklyHeatmap trades={trades} year={year} />
                    </WidgetWrapper >

                </div >
            </div >
        </div >
    );
};
