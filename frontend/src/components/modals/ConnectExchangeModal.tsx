import React, { useState } from 'react';
import { addConnection, syncTrades, syncTradesToSupabase, type CreateConnectionRequest } from '../../api/exchanges';

interface ConnectExchangeModalProps {
    userId: string;
    onClose: () => void;
    onSuccess: () => void;
    exchangeName?: string | null;
}

const EXCHANGES = ['binance', 'bybit', 'blofin', 'hyperliquid'];

export function ConnectExchangeModal({ userId, onClose, onSuccess, exchangeName }: ConnectExchangeModalProps) {
    const [exchange, setExchange] = useState(exchangeName || EXCHANGES[0]);
    const [apiKey, setApiKey] = useState('');
    const [apiSecret, setApiSecret] = useState('');
    const [apiPassphrase, setApiPassphrase] = useState('');
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [success, setSuccess] = useState(false);

    const handleSubmit = async () => {
        if (!apiKey || !apiSecret) {
            setError('API Key and API Secret are required');
            return;
        }

        setLoading(true);
        setError(null);
        try {
            const connection = await addConnection({
                user_id: userId,
                exchange_name: exchange,
                api_key: apiKey,
                api_secret: apiSecret,
                api_passphrase: apiPassphrase,
            });
            setSuccess(true);

            // Automatically start sync in the background
            try {
                await syncTrades(connection.id);
                // Give it a few seconds to sync before copying to Supabase
                setTimeout(async () => {
                    try {
                        await syncTradesToSupabase(userId);
                        console.log('Trades synced to Supabase');
                    } catch (supabaseErr) {
                        console.warn('Failed to sync trades to Supabase:', supabaseErr);
                    }
                }, 3000);
            } catch (syncErr) {
                console.warn('Sync failed to start, but connection was successful:', syncErr);
            }

            onSuccess();
            // Close modal after showing success message for 1.5 seconds
            setTimeout(() => {
                onClose();
            }, 1500);
        } catch (err: any) {
            const errorMsg = err.message || 'Failed to connect exchange';
            console.error('Connection error:', err);
            setError(errorMsg);
        } finally {
            setLoading(false);
        }
    };

    return (
        <div style={{
            position: 'fixed',
            inset: 0,
            backgroundColor: 'rgba(0, 0, 0, 0.8)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 1000,
            backdropFilter: 'blur(4px)',
            padding: '20px'
        }}>
            <div style={{
                backgroundColor: '#251E17',
                borderRadius: '16px',
                border: '1px solid rgba(212, 165, 69, 0.15)',
                padding: '32px',
                width: '100%',
                maxWidth: '450px',
                boxShadow: '0 20px 60px rgba(0, 0, 0, 0.8)'
            }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px' }}>
                    <h2 style={{ fontSize: '24px', fontWeight: '700', color: '#F5C76D', margin: 0 }}>
                        Connect Exchange
                    </h2>
                    <button
                        onClick={onClose}
                        style={{
                            padding: '8px 16px',
                            backgroundColor: 'rgba(37, 30, 23, 0.6)',
                            color: '#C2B280',
                            border: '1px solid rgba(212, 165, 69, 0.15)',
                            borderRadius: '8px',
                            fontSize: '13px',
                            fontWeight: '600',
                            cursor: 'pointer'
                        }}
                    >
                        Close
                    </button>
                </div>
                <p style={{ fontSize: '13px', color: '#8B7355', marginBottom: '24px', marginTop: 0 }}>
                    Enter your API credentials to connect your exchange.
                </p>

                {success && (
                    <div style={{ background: 'rgba(16, 185, 129, 0.15)', color: '#10b981', padding: '14px', borderRadius: '8px', marginBottom: '20px', fontSize: '14px', textAlign: 'center', fontWeight: '600', border: '1px solid rgba(16, 185, 129, 0.3)' }}>
                        ✓ Connection successful! Your exchange has been connected.
                    </div>
                )}

                {error && (
                    <div style={{ background: 'rgba(239, 68, 68, 0.15)', color: '#ef4444', padding: '14px', borderRadius: '8px', marginBottom: '20px', fontSize: '14px', border: '1px solid rgba(239, 68, 68, 0.3)' }}>
                        {error}
                    </div>
                )}

                <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                    <div>
                        <label style={{ display: 'block', fontSize: '11px', color: '#8B7355', fontWeight: '600', textTransform: 'uppercase', letterSpacing: '0.5px', marginBottom: '8px' }}>Exchange</label>
                        <select
                            value={exchange}
                            onChange={e => setExchange(e.target.value)}
                            disabled={success}
                            style={{
                                width: '100%',
                                padding: '12px',
                                backgroundColor: 'rgba(37, 30, 23, 0.6)',
                                border: '1px solid rgba(212, 165, 69, 0.2)',
                                borderRadius: '8px',
                                color: '#C2B280',
                                fontSize: '13px',
                                fontWeight: '500',
                                cursor: 'pointer'
                            }}
                        >
                            {EXCHANGES.map(ex => <option key={ex} value={ex}>{ex.toUpperCase()}</option>)}
                        </select>
                    </div>

                    <div>
                        <label style={{ display: 'block', fontSize: '11px', color: '#8B7355', fontWeight: '600', textTransform: 'uppercase', letterSpacing: '0.5px', marginBottom: '8px' }}>API Key</label>
                        <input
                            value={apiKey}
                            onChange={e => setApiKey(e.target.value)}
                            placeholder="Enter API Key"
                            disabled={success}
                            style={{
                                width: '100%',
                                padding: '12px',
                                backgroundColor: 'rgba(37, 30, 23, 0.6)',
                                border: '1px solid rgba(212, 165, 69, 0.2)',
                                borderRadius: '8px',
                                color: '#C2B280',
                                fontSize: '13px',
                                fontWeight: '500',
                                boxSizing: 'border-box'
                            }}
                        />
                    </div>

                    <div>
                        <label style={{ display: 'block', fontSize: '11px', color: '#8B7355', fontWeight: '600', textTransform: 'uppercase', letterSpacing: '0.5px', marginBottom: '8px' }}>API Secret</label>
                        <input
                            type="password"
                            value={apiSecret}
                            onChange={e => setApiSecret(e.target.value)}
                            placeholder="Enter API Secret"
                            disabled={success}
                            style={{
                                width: '100%',
                                padding: '12px',
                                backgroundColor: 'rgba(37, 30, 23, 0.6)',
                                border: '1px solid rgba(212, 165, 69, 0.2)',
                                borderRadius: '8px',
                                color: '#C2B280',
                                fontSize: '13px',
                                fontWeight: '500',
                                boxSizing: 'border-box'
                            }}
                        />
                    </div>

                    <div>
                        <label style={{ display: 'block', fontSize: '11px', color: '#8B7355', fontWeight: '600', textTransform: 'uppercase', letterSpacing: '0.5px', marginBottom: '8px' }}>Passphrase (Optional)</label>
                        <input
                            type="password"
                            value={apiPassphrase}
                            onChange={e => setApiPassphrase(e.target.value)}
                            placeholder="Enter Passphrase (if required)"
                            disabled={success}
                            style={{
                                width: '100%',
                                padding: '12px',
                                backgroundColor: 'rgba(37, 30, 23, 0.6)',
                                border: '1px solid rgba(212, 165, 69, 0.2)',
                                borderRadius: '8px',
                                color: '#C2B280',
                                fontSize: '13px',
                                fontWeight: '500',
                                boxSizing: 'border-box'
                            }}
                        />
                    </div>

                    {!success && (
                        <button
                            onClick={handleSubmit}
                            disabled={loading}
                            style={{
                                width: '100%',
                                padding: '14px',
                                backgroundColor: loading ? 'rgba(245, 199, 109, 0.3)' : '#F5C76D',
                                color: loading ? '#8B7355' : '#1D1A16',
                                border: 'none',
                                borderRadius: '8px',
                                fontSize: '14px',
                                fontWeight: '700',
                                cursor: loading ? 'not-allowed' : 'pointer',
                                marginTop: '8px'
                            }}
                        >
                            {loading ? 'Connecting...' : 'Connect Exchange'}
                        </button>
                    )}
                </div>
            </div>
        </div>
    );
}
