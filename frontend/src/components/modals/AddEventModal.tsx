import React, { useState } from 'react';
import Modal from './Modal';
import { useModals } from './CustomModals';

interface AddEventModalProps {
    isOpen: boolean;
    onClose: () => void;
    onSave: (title: string, date: string) => Promise<void>;
}

export default function AddEventModal({ isOpen, onClose, onSave }: AddEventModalProps) {
    const { alert } = useModals();
    const [title, setTitle] = useState('');
    const [date, setDate] = useState(new Date().toISOString().slice(0, 10));
    const [time, setTime] = useState('12:00');
    const [loading, setLoading] = useState(false);

    async function handleSubmit(e: React.FormEvent) {
        e.preventDefault();
        if (!title || !date || !time) return;

        setLoading(true);
        try {
            // Combine date and time into ISO string
            const dateTime = new Date(`${date}T${time}`).toISOString();
            await onSave(title, dateTime);
            onClose();
            // Reset form
            setTitle('');
            setDate(new Date().toISOString().slice(0, 10));
            setTime('12:00');
        } catch (err) {
            console.error(err);
            await alert({ message: "Failed to save event", type: 'error' });
        } finally {
            setLoading(false);
        }
    }

    const inputStyle = {
        width: '100%',
        padding: '12px',
        backgroundColor: 'rgba(37, 30, 23, 0.6)',
        border: '1px solid rgba(212, 165, 69, 0.2)',
        borderRadius: '8px',
        color: '#C2B280',
        fontSize: '13px',
        fontWeight: 500,
        boxSizing: 'border-box' as const
    };

    const labelStyle = {
        display: 'block',
        fontSize: '11px',
        color: '#8B7355',
        fontWeight: 600,
        textTransform: 'uppercase' as const,
        letterSpacing: '0.5px',
        marginBottom: '8px'
    };

    return (
        <Modal isOpen={isOpen} onClose={onClose} title="Add Calendar Event">
            <p style={{ fontSize: '13px', color: '#8B7355', marginBottom: '24px', marginTop: 0 }}>
                Add an event to your trading calendar.
            </p>
            <form onSubmit={handleSubmit}>
                <div style={{ marginBottom: '16px' }}>
                    <label style={labelStyle}>Event Title</label>
                    <input
                        type="text"
                        value={title}
                        onChange={e => setTitle(e.target.value)}
                        placeholder="e.g., Bitcoin Halving"
                        required
                        autoFocus
                        style={inputStyle}
                    />
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px', marginBottom: '24px' }}>
                    <div>
                        <label style={labelStyle}>Date</label>
                        <input
                            type="date"
                            value={date}
                            onChange={e => setDate(e.target.value)}
                            required
                            style={inputStyle}
                        />
                    </div>
                    <div>
                        <label style={labelStyle}>Time</label>
                        <input
                            type="time"
                            value={time}
                            onChange={e => setTime(e.target.value)}
                            required
                            style={inputStyle}
                        />
                    </div>
                </div>

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
                        fontWeight: 700,
                        cursor: loading ? 'not-allowed' : 'pointer'
                    }}
                >
                    {loading ? 'Saving...' : 'Save Event'}
                </button>
            </form>
        </Modal>
    );
}
