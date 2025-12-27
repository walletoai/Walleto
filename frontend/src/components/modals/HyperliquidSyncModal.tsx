import React, { useState } from 'react';
import { createClient } from '@supabase/supabase-js';
import { useResponsive } from '../../hooks/useResponsive';
import { API_URL } from '../../config/api';

interface HyperliquidSyncModalProps {
  isOpen: boolean;
  onClose: () => void;
  userId: string;
}

const supabase = createClient(
  import.meta.env.VITE_SUPABASE_URL,
  import.meta.env.VITE_SUPABASE_ANON_KEY
);

export default function HyperliquidSyncModal({
  isOpen,
  onClose,
  userId,
}: HyperliquidSyncModalProps) {
  const { isMobile } = useResponsive();
  const [walletAddress, setWalletAddress] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);
  const [progress, setProgress] = useState<string>('');

  if (!isOpen) return null;

  const handleSync = async () => {
    if (!walletAddress) {
      setError('Wallet address is required');
      return;
    }

    // Basic validation for Ethereum address
    if (!/^0x[a-fA-F0-9]{40}$/.test(walletAddress)) {
      setError('Please enter a valid Ethereum wallet address');
      return;
    }

    setLoading(true);
    setError(null);
    setProgress('');

    try {
      setProgress('Connecting to Hyperliquid...');

      // Fetch trades from Hyperliquid
      setProgress('Fetching trades from Hyperliquid (this may take a few minutes for large histories)...');
      const response = await fetch(`${API_URL}/api/hyperliquid/sync`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          wallet_address: walletAddress,
          user_id: userId,
          save_connection: true,
        }),
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const data = await response.json();

      if (!data.success) {
        setError(data.message || 'Failed to fetch trades from Hyperliquid');
        setLoading(false);
        return;
      }

      console.log(`Fetched ${data.trades_count} trades from Hyperliquid`);

      const tradesToInsert = data.trades;

      // Save to Supabase in batches
      const BATCH_SIZE = 500;
      const totalTrades = tradesToInsert.length;
      let insertedCount = 0;

      for (let i = 0; i < totalTrades; i += BATCH_SIZE) {
        const batch = tradesToInsert.slice(i, i + BATCH_SIZE);
        const batchNumber = Math.floor(i / BATCH_SIZE) + 1;
        const totalBatches = Math.ceil(totalTrades / BATCH_SIZE);

        setProgress(`Saving to database: batch ${batchNumber}/${totalBatches} (${insertedCount}/${totalTrades} trades)...`);

        const { error: insertError } = await supabase
          .from('trades')
          .insert(batch);

        if (insertError) {
          setError(`Failed to save batch ${batchNumber}/${totalBatches}: ${insertError.message}. ${insertedCount} trades saved so far.`);
          setLoading(false);
          return;
        }

        insertedCount += batch.length;
      }

      setSuccess(true);
      setWalletAddress('');

      setTimeout(() => {
        onClose();
        setSuccess(false);
      }, 1500);
    } catch (err) {
      const errorMessage =
        err instanceof Error ? err.message : 'An unknown error occurred';
      console.error('Error during sync:', errorMessage);
      setError(errorMessage);
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
      padding: isMobile ? '12px' : '20px'
    }}>
      <div style={{
        backgroundColor: '#251E17',
        borderRadius: isMobile ? '12px' : '16px',
        border: '1px solid rgba(212, 165, 69, 0.15)',
        padding: isMobile ? '20px' : '32px',
        width: '100%',
        maxWidth: isMobile ? '100%' : '450px',
        maxHeight: '90vh',
        overflowY: 'auto',
        boxShadow: '0 20px 60px rgba(0, 0, 0, 0.8)'
      }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: isMobile ? '16px' : '24px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            <span style={{ fontSize: '28px' }}>⚙️</span>
            <h2 style={{ fontSize: isMobile ? '18px' : '24px', fontWeight: '700', color: '#F5C76D', margin: 0 }}>
              Sync Hyperliquid Trades
            </h2>
          </div>
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
          Enter your Hyperliquid wallet address to sync your perpetual futures trade history.
        </p>

        {success && (
          <div style={{ background: 'rgba(16, 185, 129, 0.15)', color: '#10b981', padding: '14px', borderRadius: '8px', marginBottom: '20px', fontSize: '14px', textAlign: 'center', fontWeight: '600', border: '1px solid rgba(16, 185, 129, 0.3)' }}>
            ✓ Trades synced successfully!
          </div>
        )}

        {error && (
          <div style={{ background: 'rgba(239, 68, 68, 0.15)', color: '#ef4444', padding: '14px', borderRadius: '8px', marginBottom: '20px', fontSize: '14px', border: '1px solid rgba(239, 68, 68, 0.3)' }}>
            {error}
          </div>
        )}

        {loading && progress && (
          <div style={{ background: 'rgba(59, 130, 246, 0.15)', color: '#3b82f6', padding: '14px', borderRadius: '8px', marginBottom: '20px', fontSize: '13px', textAlign: 'center', fontWeight: '600', border: '1px solid rgba(59, 130, 246, 0.3)' }}>
            {progress}
          </div>
        )}

        <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
          <div>
            <label style={{ display: 'block', fontSize: '11px', color: '#8B7355', fontWeight: '600', textTransform: 'uppercase', letterSpacing: '0.5px', marginBottom: '8px' }}>Wallet Address</label>
            <input
              type="text"
              value={walletAddress}
              onChange={(e) => setWalletAddress(e.target.value)}
              placeholder="0x..."
              disabled={success}
              style={{ width: '100%', padding: '12px', borderRadius: '8px', border: '1px solid rgba(212, 165, 69, 0.2)', backgroundColor: 'rgba(37, 30, 23, 0.6)', color: '#C2B280', fontSize: '13px', fontWeight: '500', boxSizing: 'border-box', fontFamily: 'monospace' }}
            />
          </div>

          {/* No API Key Required Info */}
          <div style={{
            background: 'rgba(16, 185, 129, 0.1)',
            border: '1px solid rgba(16, 185, 129, 0.3)',
            borderRadius: '12px',
            padding: '16px',
            marginTop: '4px'
          }}>
            <div style={{ display: 'flex', alignItems: 'flex-start', gap: '10px' }}>
              <span style={{ fontSize: '16px', flexShrink: 0 }}>✓</span>
              <div>
                <div style={{ fontSize: '13px', fontWeight: '600', color: '#10b981', marginBottom: '6px' }}>
                  No API Key Required
                </div>
                <div style={{ fontSize: '12px', color: '#C2B280', lineHeight: '1.5' }}>
                  Hyperliquid trade data is publicly available on-chain. Just enter your wallet address and we'll fetch your complete trade history automatically.
                </div>
              </div>
            </div>
          </div>

          {/* Complete History Info */}
          <div style={{
            background: 'rgba(59, 130, 246, 0.1)',
            border: '1px solid rgba(59, 130, 246, 0.3)',
            borderRadius: '12px',
            padding: '16px'
          }}>
            <div style={{ display: 'flex', alignItems: 'flex-start', gap: '10px' }}>
              <span style={{ fontSize: '16px', flexShrink: 0 }}>i</span>
              <div>
                <div style={{ fontSize: '13px', fontWeight: '600', color: '#3b82f6', marginBottom: '6px' }}>
                  Complete Trade History
                </div>
                <div style={{ fontSize: '12px', color: '#C2B280', lineHeight: '1.5' }}>
                  Hyperliquid provides up to <strong>2000 fills</strong> (~500-1000 complete trades). A "fill" is a single order execution - one trade may have multiple fills. All trades are settled in <strong>USDC</strong>.
                </div>
              </div>
            </div>
          </div>

          {/* Leverage Warning */}
          <div style={{
            background: 'rgba(245, 158, 11, 0.1)',
            border: '1px solid rgba(245, 158, 11, 0.3)',
            borderRadius: '12px',
            padding: '16px'
          }}>
            <div style={{ display: 'flex', alignItems: 'flex-start', gap: '10px' }}>
              <span style={{ fontSize: '16px', flexShrink: 0 }}>!</span>
              <div>
                <div style={{ fontSize: '13px', fontWeight: '600', color: '#f59e0b', marginBottom: '6px' }}>
                  Leverage Not Included
                </div>
                <div style={{ fontSize: '12px', color: '#C2B280', lineHeight: '1.5' }}>
                  Like Blofin and Binance, Hyperliquid doesn't include leverage in historical trades. Default is 10x. Update via Settings → Leverage Settings.
                </div>
              </div>
            </div>
          </div>

          <p style={{ fontSize: '12px', color: '#8B7355', margin: '4px 0 8px 0', lineHeight: '1.5' }}>
            Your wallet address is stored for automatic syncing of new trades.
          </p>

          {!success && (
            <button
              onClick={handleSync}
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
                cursor: loading ? 'not-allowed' : 'pointer'
              }}
            >
              {loading ? 'Syncing...' : 'Sync Trades'}
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
