import { useState, useEffect } from "react";
import BlofinSyncModal from "../components/modals/BlofinSyncModal";
import BinanceSyncModal from "../components/modals/BinanceSyncModal";
import BybitSyncModal from "../components/modals/BybitSyncModal";
import HyperliquidSyncModal from "../components/modals/HyperliquidSyncModal";
import { getConnections, deleteConnection, syncTrades, type ExchangeConnection } from "../api/exchanges";
import { useResponsive } from "../hooks/useResponsive";
import { API_URL } from "../config/api";
import { useModals } from "../components/modals/CustomModals";

interface SettingsPageProps {
    user: any;
}

const EXCHANGE_INFO = {
    binance: {
        name: 'Binance',
        icon: '⚡',
        description: 'Global crypto trading platform',
        features: ['Spot & Futures', 'Full trade history', 'Real-time syncing'],
        guide: 'https://www.binance.com/en/support/faq/12a60396e7ad46f0a584160457dc4563'
    },
    bybit: {
        name: 'Bybit',
        icon: '📊',
        description: 'Derivatives trading exchange',
        features: ['Perpetuals', 'Complete history', 'Instant updates'],
        guide: 'https://www.bybit.com/en/help-center'
    },
    blofin: {
        name: 'Blofin',
        icon: '🔷',
        description: 'Options & futures trading',
        features: ['Perpetuals & Options', 'Complete history', '⚠️ Set leverage manually'],
        guide: 'https://blofin.com/docs'
    },
    hyperliquid: {
        name: 'Hyperliquid',
        icon: '⚙️',
        description: 'High-performance derivatives',
        features: ['Ultra-low latency', 'Real-time feeds', 'Full history'],
        guide: 'https://hyperliquid.gitbook.io/hyperliquid-docs'
    }
};

export default function SettingsPage({ user }: SettingsPageProps) {
    const { isMobile, isTablet } = useResponsive();
    const { confirm, alert } = useModals();
    const [connections, setConnections] = useState<ExchangeConnection[]>([]);
    const [syncingIds, setSyncingIds] = useState<Set<string>>(new Set());
    const [loading, setLoading] = useState(true);

    // Exchange sync modals
    const [showBlofinModal, setShowBlofinModal] = useState(false);
    const [showBinanceModal, setShowBinanceModal] = useState(false);
    const [showBybitModal, setShowBybitModal] = useState(false);
    const [showHyperliquidModal, setShowHyperliquidModal] = useState(false);

    useEffect(() => {
        loadConnections();
    }, [user]);

    async function loadConnections() {
        if (!user) return;
        setLoading(true);
        try {
            console.log("[SettingsPage] Loading connections for user:", user.id);
            const data = await getConnections(user.id);
            console.log("[SettingsPage] Loaded connections:", data);
            setConnections(data);
        } catch (err) {
            console.error("[SettingsPage] Error loading connections:", err);
        } finally {
            setLoading(false);
        }
    }

    async function handleSync(id: string) {
        const connection = connections.find(c => c.id === id);
        if (!connection) return;

        setSyncingIds(prev => new Set(prev).add(id));
        try {
            // For Blofin, use the custom resync endpoint that supports incremental sync
            if (connection.exchange_name.toLowerCase() === 'blofin') {
                const response = await fetch(`${API_URL}/api/blofin/resync/${id}`, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' }
                });

                if (!response.ok) {
                    throw new Error('Failed to sync Blofin trades');
                }

                const data = await response.json();

                if (!data.success) {
                    throw new Error(data.message || 'Sync failed');
                }

                await alert({ message: `Synced successfully! Imported ${data.trades_count} new trades from Blofin.`, type: 'success' });
                await loadConnections(); // Reload to show updated sync time
            } else {
                // For other exchanges, use the standard sync endpoint
                await syncTrades(id);
                await alert({ message: "Sync started! Fetching all trades in the background...", type: 'info' });
            }
        } catch (err: any) {
            await alert({ message: err.message || "Failed to start sync", type: 'error' });
        } finally {
            setSyncingIds(prev => {
                const next = new Set(prev);
                next.delete(id);
                return next;
            });
        }
    }

    async function handleDeleteConnection(id: string) {
        const confirmed = await confirm({
            title: "Disconnect Exchange",
            message: "Are you sure you want to disconnect this exchange? This will stop all future syncs.",
            type: 'warning',
            confirmText: 'Disconnect',
        });
        if (!confirmed) return;
        try {
            await deleteConnection(id);
            setConnections(connections.filter(c => c.id !== id));
            await alert({ message: "Exchange disconnected successfully.", type: 'success' });
        } catch (err: any) {
            await alert({ message: err.message || "Failed to delete connection", type: 'error' });
        }
    }

    const connectedExchanges = new Set(connections.map(c => c.exchange_name.toLowerCase()));

    return (
        <div style={{ minHeight: '100vh', backgroundColor: 'rgba(29, 26, 22, 0.3)' }}>
            <div style={{
                maxWidth: '1400px',
                margin: '0 auto',
                padding: isMobile ? '12px 16px 32px 16px' : isTablet ? '16px 20px 40px 20px' : '16px 24px 48px 24px'
            }}>
                {/* Header */}
                <div style={{ marginBottom: isMobile ? '16px' : '24px' }}>
                    <h1 style={{
                        fontSize: isMobile ? '1.75rem' : '2.25rem',
                        fontWeight: '700',
                        color: '#F5C76D',
                        marginBottom: '4px'
                    }}>
                        Settings
                    </h1>
                    <p style={{ fontSize: isMobile ? '12px' : '13px', color: '#8B7355' }}>
                        Manage your exchange integrations and trading data
                    </p>
                </div>

                {/* Integrations Section */}
                <div style={{
                    backgroundColor: 'rgba(42, 37, 31, 0.6)',
                    border: '1px solid rgba(212, 165, 69, 0.15)',
                    borderRadius: '12px',
                    padding: isMobile ? '20px 16px' : '32px',
                    backdropFilter: 'blur(10px)',
                    marginBottom: isMobile ? '20px' : '32px'
                }}>
                    <div style={{ marginBottom: '32px' }}>
                        <h2 style={{ fontSize: '1.5rem', fontWeight: '700', color: '#F5C76D', marginBottom: '8px' }}>
                            Exchange Integrations
                        </h2>
                        <p style={{ fontSize: '13px', color: '#8B7355', marginBottom: '16px' }}>
                            Connect your exchange accounts to import and track all your trades automatically.
                            Your API keys are encrypted and never stored in plain text.
                        </p>
                    </div>

                    {loading ? (
                        <div style={{ textAlign: 'center', padding: '40px', color: '#8B7355' }}>
                            Loading connections...
                        </div>
                    ) : (
                        <>
                            {/* Connected Exchanges Grid */}
                            {connections.length > 0 && (
                                <div style={{ marginBottom: '32px' }}>
                                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
                                        <h3 style={{ fontSize: '13px', fontWeight: '600', color: '#C2B280', textTransform: 'uppercase', letterSpacing: '0.5px', margin: 0 }}>
                                            Connected Exchanges ({connections.length})
                                        </h3>
                                        <div style={{
                                            display: 'flex',
                                            alignItems: 'center',
                                            gap: '6px',
                                            padding: '6px 12px',
                                            backgroundColor: 'rgba(245, 199, 109, 0.1)',
                                            border: '1px solid rgba(245, 199, 109, 0.2)',
                                            borderRadius: '20px',
                                            fontSize: '11px',
                                            color: '#F5C76D'
                                        }}>
                                            <span>🔄</span>
                                            <span>Auto-sync every 24 hours</span>
                                        </div>
                                    </div>
                                    <div style={{ display: 'grid', gridTemplateColumns: isMobile ? '1fr' : 'repeat(auto-fill, minmax(340px, 1fr))', gap: '16px' }}>
                                        {connections.map(conn => {
                                            const exchange = EXCHANGE_INFO[conn.exchange_name.toLowerCase() as keyof typeof EXCHANGE_INFO];
                                            const lastSyncTime = conn.last_sync_time ? new Date(conn.last_sync_time).toLocaleString() : 'Never';

                                            // Calculate next auto-sync time (24 hours after last sync)
                                            const getNextSyncTime = () => {
                                                if (!conn.last_sync_time) return 'After first manual sync';
                                                const lastSync = new Date(conn.last_sync_time);
                                                const nextSync = new Date(lastSync.getTime() + 24 * 60 * 60 * 1000);
                                                const now = new Date();

                                                if (nextSync <= now) {
                                                    return 'Soon (scheduled)';
                                                }

                                                // Show relative time
                                                const hoursUntil = Math.round((nextSync.getTime() - now.getTime()) / (1000 * 60 * 60));
                                                if (hoursUntil < 1) {
                                                    const minsUntil = Math.round((nextSync.getTime() - now.getTime()) / (1000 * 60));
                                                    return `In ${minsUntil} minute${minsUntil !== 1 ? 's' : ''}`;
                                                }
                                                if (hoursUntil < 24) {
                                                    return `In ${hoursUntil} hour${hoursUntil !== 1 ? 's' : ''}`;
                                                }
                                                return nextSync.toLocaleString();
                                            };

                                            return (
                                                <div key={conn.id} style={{
                                                    backgroundColor: 'rgba(37, 30, 23, 0.5)',
                                                    border: '1px solid rgba(52, 211, 153, 0.3)',
                                                    borderRadius: '10px',
                                                    padding: '16px',
                                                    display: 'flex',
                                                    flexDirection: 'column',
                                                    gap: '12px'
                                                }}>
                                                    {/* Header */}
                                                    <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                                                        <div style={{
                                                            fontSize: '24px',
                                                            width: '40px',
                                                            height: '40px',
                                                            display: 'flex',
                                                            alignItems: 'center',
                                                            justifyContent: 'center',
                                                            backgroundColor: 'rgba(52, 211, 153, 0.1)',
                                                            borderRadius: '8px'
                                                        }}>
                                                            {exchange?.icon}
                                                        </div>
                                                        <div style={{ flex: 1 }}>
                                                            <div style={{ fontWeight: '600', color: '#F5C76D', fontSize: '14px' }}>
                                                                {exchange?.name}
                                                            </div>
                                                            <div style={{ fontSize: '11px', color: '#8B7355' }}>
                                                                API Key: •••• {conn.api_key_last_4}
                                                            </div>
                                                        </div>
                                                    </div>

                                                    {/* Sync Status */}
                                                    <div style={{
                                                        backgroundColor: 'rgba(52, 211, 153, 0.05)',
                                                        border: '1px solid rgba(52, 211, 153, 0.2)',
                                                        borderRadius: '8px',
                                                        padding: '12px',
                                                    }}>
                                                        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '8px' }}>
                                                            <div>
                                                                <div style={{ fontSize: '10px', color: '#8B7355', marginBottom: '2px' }}>Last Sync</div>
                                                                <div style={{ fontSize: '12px', color: '#10b981', fontWeight: '600' }}>
                                                                    {lastSyncTime}
                                                                </div>
                                                            </div>
                                                            <div style={{ textAlign: 'right' }}>
                                                                <div style={{ fontSize: '10px', color: '#8B7355', marginBottom: '2px' }}>Next Auto-Sync</div>
                                                                <div style={{ fontSize: '12px', color: '#F5C76D', fontWeight: '600' }}>
                                                                    {getNextSyncTime()}
                                                                </div>
                                                            </div>
                                                        </div>
                                                        {conn.last_sync_status && (
                                                            <div style={{ fontSize: '10px', color: '#C2B280', display: 'flex', alignItems: 'center', gap: '6px' }}>
                                                                <span style={{
                                                                    width: '6px',
                                                                    height: '6px',
                                                                    borderRadius: '50%',
                                                                    backgroundColor: conn.last_sync_status === 'success' ? '#10b981' : conn.last_sync_status === 'failed' ? '#ef4444' : '#f59e0b'
                                                                }}></span>
                                                                Status: {conn.last_sync_status}
                                                            </div>
                                                        )}
                                                    </div>

                                                    {/* Actions */}
                                                    <div style={{
                                                        display: 'flex',
                                                        gap: '8px',
                                                        paddingTop: '8px',
                                                    }}>
                                                        <button
                                                            onClick={() => handleSync(conn.id)}
                                                            disabled={syncingIds.has(conn.id)}
                                                            style={{
                                                                flex: 1,
                                                                padding: '10px 12px',
                                                                backgroundColor: syncingIds.has(conn.id) ? 'rgba(52, 211, 153, 0.2)' : 'rgba(52, 211, 153, 0.15)',
                                                                border: '1px solid rgba(52, 211, 153, 0.3)',
                                                                color: '#10b981',
                                                                borderRadius: '6px',
                                                                fontSize: '12px',
                                                                fontWeight: '600',
                                                                cursor: syncingIds.has(conn.id) ? 'not-allowed' : 'pointer',
                                                                opacity: syncingIds.has(conn.id) ? 0.6 : 1
                                                            }}
                                                        >
                                                            {syncingIds.has(conn.id) ? '⟳ Syncing...' : '↻ Sync Now'}
                                                        </button>
                                                        <button
                                                            onClick={() => handleDeleteConnection(conn.id)}
                                                            style={{
                                                                flex: 1,
                                                                padding: '10px 12px',
                                                                backgroundColor: 'rgba(239, 68, 68, 0.1)',
                                                                border: '1px solid rgba(239, 68, 68, 0.3)',
                                                                color: '#ef4444',
                                                                borderRadius: '6px',
                                                                fontSize: '12px',
                                                                fontWeight: '600',
                                                                cursor: 'pointer'
                                                            }}
                                                        >
                                                            🗑️ Delete
                                                        </button>
                                                    </div>
                                                </div>
                                            );
                                        })}
                                    </div>
                                </div>
                            )}

                            {/* Available Exchanges */}
                            <div>
                                <h3 style={{ fontSize: '13px', fontWeight: '600', color: '#C2B280', textTransform: 'uppercase', letterSpacing: '0.5px', marginBottom: '16px' }}>
                                    Available Exchanges
                                </h3>
                                <div style={{ display: 'grid', gridTemplateColumns: isMobile ? '1fr' : 'repeat(auto-fill, minmax(280px, 1fr))', gap: '16px' }}>
                                    {Object.entries(EXCHANGE_INFO).map(([key, exchange]) => {
                                        const isConnected = connectedExchanges.has(key);
                                        return (
                                            <div key={key} style={{
                                                backgroundColor: 'rgba(37, 30, 23, 0.5)',
                                                border: isConnected ? '1px solid rgba(52, 211, 153, 0.3)' : '1px solid rgba(212, 165, 69, 0.15)',
                                                borderRadius: '10px',
                                                padding: '16px',
                                                display: 'flex',
                                                flexDirection: 'column',
                                                gap: '12px',
                                                opacity: isConnected ? 0.7 : 1,
                                                position: 'relative'
                                            }}>
                                                {isConnected && (
                                                    <div style={{
                                                        position: 'absolute',
                                                        top: '8px',
                                                        right: '8px',
                                                        backgroundColor: 'rgba(52, 211, 153, 0.2)',
                                                        color: '#10b981',
                                                        padding: '4px 8px',
                                                        borderRadius: '4px',
                                                        fontSize: '10px',
                                                        fontWeight: '600'
                                                    }}>
                                                        ✓ Connected
                                                    </div>
                                                )}

                                                <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                                                    <div style={{ fontSize: '32px' }}>
                                                        {exchange.icon}
                                                    </div>
                                                    <div>
                                                        <div style={{ fontWeight: '600', color: '#F5C76D', fontSize: '14px' }}>
                                                            {exchange.name}
                                                        </div>
                                                        <div style={{ fontSize: '12px', color: '#8B7355' }}>
                                                            {exchange.description}
                                                        </div>
                                                    </div>
                                                </div>

                                                <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                                                    {exchange.features.map((feature, idx) => (
                                                        <div key={idx} style={{ fontSize: '11px', color: '#C2B280', display: 'flex', alignItems: 'center', gap: '6px' }}>
                                                            <span style={{ color: '#F5C76D' }}>•</span> {feature}
                                                        </div>
                                                    ))}
                                                </div>

                                                {!isConnected && (
                                                    <button
                                                        onClick={() => {
                                                            if (key === 'blofin') setShowBlofinModal(true);
                                                            else if (key === 'binance') setShowBinanceModal(true);
                                                            else if (key === 'bybit') setShowBybitModal(true);
                                                            else if (key === 'hyperliquid') setShowHyperliquidModal(true);
                                                        }}
                                                        style={{
                                                            width: '100%',
                                                            padding: '10px',
                                                            marginTop: '8px',
                                                            backgroundColor: 'rgba(59, 130, 246, 0.15)',
                                                            border: '1px solid rgba(59, 130, 246, 0.3)',
                                                            color: '#3b82f6',
                                                            borderRadius: '6px',
                                                            fontSize: '12px',
                                                            fontWeight: '600',
                                                            cursor: 'pointer'
                                                        }}
                                                    >
                                                        Sync Trades
                                                    </button>
                                                )}
                                            </div>
                                        );
                                    })}
                                </div>
                            </div>
                        </>
                    )}
                </div>

                {/* Help Section */}
                <div style={{
                    backgroundColor: 'rgba(42, 37, 31, 0.6)',
                    border: '1px solid rgba(212, 165, 69, 0.15)',
                    borderRadius: '12px',
                    padding: '32px',
                    backdropFilter: 'blur(10px)'
                }}>
                    <h2 style={{ fontSize: '1.5rem', fontWeight: '700', color: '#F5C76D', marginBottom: '24px' }}>
                        Need Help?
                    </h2>
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))', gap: '16px' }}>
                        <a href="/docs" style={{
                            backgroundColor: 'rgba(37, 30, 23, 0.5)',
                            border: '1px solid rgba(212, 165, 69, 0.15)',
                            borderRadius: '10px',
                            padding: '20px',
                            textDecoration: 'none',
                            transition: 'all 150ms ease',
                            display: 'flex',
                            flexDirection: 'column',
                            gap: '12px'
                        }} onMouseEnter={(e) => {
                            e.currentTarget.style.backgroundColor = 'rgba(37, 30, 23, 0.8)';
                            e.currentTarget.style.borderColor = 'rgba(212, 165, 69, 0.3)';
                        }} onMouseLeave={(e) => {
                            e.currentTarget.style.backgroundColor = 'rgba(37, 30, 23, 0.5)';
                            e.currentTarget.style.borderColor = 'rgba(212, 165, 69, 0.15)';
                        }}>
                            <div style={{ fontSize: '24px' }}>📚</div>
                            <div>
                                <div style={{ fontWeight: '600', color: '#F5C76D', fontSize: '14px' }}>Documentation</div>
                                <div style={{ fontSize: '12px', color: '#8B7355' }}>Learn how to use Walleto</div>
                            </div>
                        </a>

                        <a href="mailto:support@walleto.app" style={{
                            backgroundColor: 'rgba(37, 30, 23, 0.5)',
                            border: '1px solid rgba(212, 165, 69, 0.15)',
                            borderRadius: '10px',
                            padding: '20px',
                            textDecoration: 'none',
                            transition: 'all 150ms ease',
                            display: 'flex',
                            flexDirection: 'column',
                            gap: '12px'
                        }} onMouseEnter={(e) => {
                            e.currentTarget.style.backgroundColor = 'rgba(37, 30, 23, 0.8)';
                            e.currentTarget.style.borderColor = 'rgba(212, 165, 69, 0.3)';
                        }} onMouseLeave={(e) => {
                            e.currentTarget.style.backgroundColor = 'rgba(37, 30, 23, 0.5)';
                            e.currentTarget.style.borderColor = 'rgba(212, 165, 69, 0.15)';
                        }}>
                            <div style={{ fontSize: '24px' }}>📧</div>
                            <div>
                                <div style={{ fontWeight: '600', color: '#F5C76D', fontSize: '14px' }}>Support</div>
                                <div style={{ fontSize: '12px', color: '#8B7355' }}>Contact our team</div>
                            </div>
                        </a>
                    </div>
                </div>
            </div>

            {/* Exchange Sync Modals */}
            {showBlofinModal && user && (
                <BlofinSyncModal
                    isOpen={showBlofinModal}
                    onClose={() => {
                        setShowBlofinModal(false);
                        loadConnections();
                    }}
                    userId={user.id}
                />
            )}

            {showBinanceModal && user && (
                <BinanceSyncModal
                    isOpen={showBinanceModal}
                    onClose={() => {
                        setShowBinanceModal(false);
                        loadConnections();
                    }}
                    userId={user.id}
                />
            )}

            {showBybitModal && user && (
                <BybitSyncModal
                    isOpen={showBybitModal}
                    onClose={() => {
                        setShowBybitModal(false);
                        loadConnections();
                    }}
                    userId={user.id}
                />
            )}

            {showHyperliquidModal && user && (
                <HyperliquidSyncModal
                    isOpen={showHyperliquidModal}
                    onClose={() => {
                        setShowHyperliquidModal(false);
                        loadConnections();
                    }}
                    userId={user.id}
                />
            )}
        </div>
    );
}
