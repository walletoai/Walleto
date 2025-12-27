import React, { useState, useEffect, useRef } from 'react';
import { createPortal } from 'react-dom';
import { computeRiskMetrics } from '../../utils/riskEngine';

interface AddTradeModalProps {
    isOpen: boolean;
    onClose: () => void;
    onSave: (trade: any) => void;
    setups: any[];
    exchange: string;
}

export default function AddTradeModal({ isOpen, onClose, onSave, setups, exchange }: AddTradeModalProps) {
    const modalRef = useRef<HTMLDivElement>(null);

    const [form, setForm] = useState({
        date: new Date().toISOString().slice(0, 16),
        symbol: '',
        side: 'LONG',
        setupId: '',
        entry: '',
        exit: '',
        size: '',
        leverage: '',
        fees: '',
        stopLoss: '',
        takeProfit: ''
    });

    const [loading, setLoading] = useState(false);

    // Reset form when opening
    useEffect(() => {
        if (isOpen) {
            setForm({
                date: new Date().toISOString().slice(0, 16),
                symbol: '',
                side: 'LONG',
                setupId: '',
                entry: '',
                exit: '',
                size: '',
                leverage: '',
                fees: '',
                stopLoss: '',
                takeProfit: ''
            });
        }
    }, [isOpen]);

    // Close on Escape
    useEffect(() => {
        const handleEsc = (e: KeyboardEvent) => {
            if (e.key === 'Escape') onClose();
        };
        if (isOpen) window.addEventListener('keydown', handleEsc);
        return () => window.removeEventListener('keydown', handleEsc);
    }, [isOpen, onClose]);

    // Close on Click Outside
    const handleBackdropClick = (e: React.MouseEvent) => {
        if (modalRef.current && !modalRef.current.contains(e.target as Node)) {
            onClose();
        }
    };

    const handleChange = (field: string, value: string) => {
        setForm(prev => ({ ...prev, [field]: value }));
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setLoading(true);
        try {
            await onSave(form);
            onClose();
        } catch (error) {
            console.error("Failed to save trade", error);
        } finally {
            setLoading(false);
        }
    };

    // Live Calculations
    const entry = parseFloat(form.entry) || 0;
    const exit = parseFloat(form.exit) || 0;
    const size = parseFloat(form.size) || 0;
    const fees = parseFloat(form.fees) || 0;
    const isLong = form.side === 'LONG';

    let estPnl = 0;
    let estRoe = 0;

    if (entry > 0 && exit > 0 && size > 0) {
        const priceDiff = isLong ? (exit - entry) : (entry - exit);
        const pnlRaw = (priceDiff / entry) * size;
        estPnl = pnlRaw - fees;

        // ROE based on margin (assuming leverage or full size if no leverage)
        const lev = parseFloat(form.leverage) || 1;
        const margin = size / lev;
        if (margin > 0) {
            estRoe = (estPnl / margin) * 100;
        }
    }

    if (!isOpen) return null;

    const modalContent = (
        <div
            style={{
                position: 'fixed',
                inset: 0,
                backgroundColor: 'rgba(0, 0, 0, 0.8)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                zIndex: 9999,
                backdropFilter: 'blur(4px)',
                padding: '20px'
            }}
            onClick={handleBackdropClick}
        >
            <style>{`
                .walleto-input {
                    width: 100%;
                    background-color: rgba(37, 30, 23, 0.6);
                    border: 1px solid rgba(212, 165, 69, 0.2);
                    color: #C2B280;
                    border-radius: 8px;
                    height: 44px;
                    padding: 0 12px;
                    font-size: 13px;
                    font-weight: 500;
                    transition: all 200ms;
                    outline: none;
                    box-sizing: border-box;
                }
                .walleto-input:focus {
                    border-color: rgba(212, 165, 69, 0.5);
                    background-color: rgba(37, 30, 23, 0.8);
                }
                .walleto-input::placeholder {
                    color: rgba(139, 115, 85, 0.6);
                }
                .walleto-label {
                    display: block;
                    font-size: 11px;
                    font-weight: 600;
                    color: #8B7355;
                    margin-bottom: 8px;
                    text-transform: uppercase;
                    letter-spacing: 0.5px;
                }
                .walleto-section-title {
                    font-size: 16px;
                    font-weight: 600;
                    color: #F5C76D;
                    margin-bottom: 16px;
                    margin-top: 0;
                }
                /* Scrollbar styling for Webkit */
                .custom-scrollbar::-webkit-scrollbar {
                    width: 6px;
                }
                .custom-scrollbar::-webkit-scrollbar-track {
                    background: rgba(0,0,0,0.2);
                }
                .custom-scrollbar::-webkit-scrollbar-thumb {
                    background: rgba(212, 165, 69, 0.2);
                    border-radius: 3px;
                }
                .custom-scrollbar::-webkit-scrollbar-thumb:hover {
                    background: rgba(212, 165, 69, 0.4);
                }
            `}</style>
            <div
                ref={modalRef}
                style={{
                    backgroundColor: '#251E17',
                    borderRadius: '16px',
                    border: '1px solid rgba(212, 165, 69, 0.15)',
                    width: '100%',
                    maxWidth: '700px',
                    maxHeight: '90vh',
                    display: 'flex',
                    flexDirection: 'column',
                    boxShadow: '0 20px 60px rgba(0, 0, 0, 0.8)',
                    overflow: 'hidden'
                }}
            >
                {/* Header */}
                <div style={{ padding: '24px 32px', borderBottom: '1px solid rgba(212, 165, 69, 0.1)' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
                        <h2 style={{ fontSize: '24px', fontWeight: '700', color: '#F5C76D', margin: 0 }}>
                            Add New Trade
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
                    <p style={{ fontSize: '13px', color: '#8B7355', margin: 0 }}>
                        Enter your trade details to log it in your journal.
                    </p>
                </div>

                {/* Scrollable Body */}
                <div className="custom-scrollbar" style={{ padding: '24px 32px', overflowY: 'auto', flex: 1 }}>
                    <form onSubmit={handleSubmit} className="flex flex-col gap-6" style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>

                        {/* Date - Full Width */}
                        <div>
                            <label className="walleto-label">Date & Time</label>
                            <input
                                type="datetime-local"
                                className="walleto-input"
                                value={form.date}
                                onChange={e => handleChange('date', e.target.value)}
                                required
                            />
                        </div>

                        {/* Main Grid */}
                        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', columnGap: '32px', rowGap: '0px' }}>

                            {/* Column 1: Trade Info */}
                            <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
                                <div className="walleto-section-title">Trade Info</div>

                                <div>
                                    <label className="walleto-label">Symbol</label>
                                    <input
                                        type="text"
                                        className="walleto-input"
                                        style={{ textTransform: 'uppercase', fontWeight: 'bold', letterSpacing: '0.05em' }}
                                        value={form.symbol}
                                        onChange={e => handleChange('symbol', e.target.value)}
                                        placeholder="BTC"
                                        required
                                        autoFocus
                                    />
                                </div>

                                <div>
                                    <label className="walleto-label">Entry Price</label>
                                    <input
                                        type="number"
                                        step="any"
                                        className="walleto-input"
                                        style={{ fontFamily: 'monospace' }}
                                        value={form.entry}
                                        onChange={e => handleChange('entry', e.target.value)}
                                        placeholder="0.00"
                                        required
                                    />
                                </div>

                                <div>
                                    <label className="walleto-label">Size ($)</label>
                                    <input
                                        type="number"
                                        step="any"
                                        className="walleto-input"
                                        style={{ fontFamily: 'monospace' }}
                                        value={form.size}
                                        onChange={e => handleChange('size', e.target.value)}
                                        placeholder="1000"
                                        required
                                    />
                                </div>

                                <div>
                                    <label className="walleto-label">Stop Loss</label>
                                    <input
                                        type="number"
                                        step="any"
                                        className="walleto-input"
                                        style={{ color: '#f87171' }}
                                        value={form.stopLoss}
                                        onChange={e => handleChange('stopLoss', e.target.value)}
                                        placeholder="Optional"
                                    />
                                </div>

                                <div>
                                    <label className="walleto-label">Take Profit</label>
                                    <input
                                        type="number"
                                        step="any"
                                        className="walleto-input"
                                        style={{ color: '#34d399' }}
                                        value={form.takeProfit}
                                        onChange={e => handleChange('takeProfit', e.target.value)}
                                        placeholder="Optional"
                                    />
                                </div>
                            </div>

                            {/* Column 2: Strategy & Risk */}
                            <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
                                <div className="walleto-section-title">Strategy & Execution</div>

                                <div>
                                    <label className="walleto-label">Side</label>
                                    <select
                                        className="walleto-input"
                                        style={{ fontWeight: 'bold', color: form.side === 'LONG' ? '#34d399' : '#f87171' }}
                                        value={form.side}
                                        onChange={e => handleChange('side', e.target.value)}
                                    >
                                        <option value="LONG">LONG</option>
                                        <option value="SHORT">SHORT</option>
                                    </select>
                                </div>

                                <div>
                                    <label className="walleto-label">Setup Strategy</label>
                                    <select
                                        className="walleto-input"
                                        value={form.setupId}
                                        onChange={e => handleChange('setupId', e.target.value)}
                                    >
                                        <option value="">No Setup</option>
                                        {setups.map(s => (
                                            <option key={s.id} value={s.id}>{s.name}</option>
                                        ))}
                                    </select>
                                </div>

                                <div>
                                    <label className="walleto-label">Fees ($)</label>
                                    <input
                                        type="number"
                                        step="any"
                                        className="walleto-input"
                                        value={form.fees}
                                        onChange={e => handleChange('fees', e.target.value)}
                                        placeholder="0"
                                    />
                                </div>

                                <div>
                                    <label className="walleto-label">Leverage (x)</label>
                                    <input
                                        type="number"
                                        step="any"
                                        className="walleto-input"
                                        value={form.leverage}
                                        onChange={e => handleChange('leverage', e.target.value)}
                                        placeholder="1"
                                    />
                                </div>

                                <div>
                                    <label className="walleto-label">Exit Price</label>
                                    <input
                                        type="number"
                                        step="any"
                                        className="walleto-input"
                                        style={{ fontFamily: 'monospace' }}
                                        value={form.exit}
                                        onChange={e => handleChange('exit', e.target.value)}
                                        placeholder="0.00"
                                        required
                                    />
                                </div>
                            </div>
                        </div>

                        {/* Live PnL Indicator (Enhanced) */}
                        {(estPnl !== 0 || estRoe !== 0) && (
                            <div style={{
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'space-between',
                                backgroundColor: 'rgba(26, 23, 20, 0.6)',
                                borderRadius: '8px',
                                padding: '14px 16px',
                                border: '1px solid rgba(212, 175, 55, 0.15)',
                                marginTop: '8px',
                                backdropFilter: 'blur(4px)'
                            }}>
                                <span style={{ fontSize: '0.75rem', color: '#999', textTransform: 'uppercase', letterSpacing: '0.1em', fontWeight: '600' }}>Estimated Outcome</span>
                                <div style={{ display: 'flex', gap: '20px', alignItems: 'center' }}>
                                    <div style={{ textAlign: 'right' }}>
                                        <div style={{ fontSize: '0.65rem', color: '#666', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '2px' }}>PnL</div>
                                        <span style={{ fontFamily: 'monospace', fontSize: '0.95rem', fontWeight: 'bold', color: estPnl >= 0 ? '#34d399' : '#f87171' }}>
                                            ${estPnl.toFixed(2)}
                                        </span>
                                    </div>
                                    <div style={{ width: '1px', height: '24px', backgroundColor: 'rgba(212, 175, 55, 0.1)' }} />
                                    <div style={{ textAlign: 'right' }}>
                                        <div style={{ fontSize: '0.65rem', color: '#666', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '2px' }}>ROE</div>
                                        <span style={{ fontFamily: 'monospace', fontSize: '0.95rem', fontWeight: 'bold', color: estRoe >= 0 ? '#34d399' : '#f87171' }}>
                                            {estRoe.toFixed(2)}%
                                        </span>
                                    </div>
                                </div>
                            </div>
                        )}

                        {/* Save Button */}
                        <button
                            type="submit"
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
                                transition: 'all 200ms',
                                marginTop: '8px'
                            }}
                        >
                            {loading ? 'Saving...' : 'Save Trade'}
                        </button>

                    </form>
                </div>
            </div>
        </div>
    );

    return createPortal(modalContent, document.body);
}
