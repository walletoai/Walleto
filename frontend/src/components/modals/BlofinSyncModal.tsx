import React, { useState } from 'react';
import { createClient } from '@supabase/supabase-js';
import { useResponsive } from '../../hooks/useResponsive';
import { API_URL } from '../../config/api';

interface BlofinSyncModalProps {
  isOpen: boolean;
  onClose: () => void;
  userId: string;
}

interface Trade {
  date: string;
  symbol: string;
  side: string;
  entry: number;
  exit: number;
  size: number;
  leverage: number;
  fees: number;
  pnl_usd: number;
  pnl_pct: number;
}

const supabase = createClient(
  import.meta.env.VITE_SUPABASE_URL,
  import.meta.env.VITE_SUPABASE_ANON_KEY
);

export default function BlofinSyncModal({
  isOpen,
  onClose,
  userId,
}: BlofinSyncModalProps) {
  const { isMobile } = useResponsive();
  const [apiKey, setApiKey] = useState('');
  const [apiSecret, setApiSecret] = useState('');
  const [apiPassphrase, setApiPassphrase] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);
  const [progress, setProgress] = useState<string>('');

  if (!isOpen) return null;

  const handleSync = async () => {
    if (!apiKey || !apiSecret) {
      setError('API Key and API Secret are required');
      return;
    }

    setLoading(true);
    setError(null);
    setProgress('');

    try {
      setProgress('Connecting to Blofin...');
      // First, diagnose the Supabase table structure
      console.log('🔍 Diagnosing Supabase trades table structure...');
      const { data: existingTrades, error: queryError } = await supabase
        .from('trades')
        .select('*')
        .limit(1);

      if (queryError) {
        console.error('Query error:', queryError);
        console.log('📋 Unable to query trades table:', queryError.message);
      } else if (existingTrades && existingTrades.length > 0) {
        const sampleTrade = existingTrades[0];
        console.log('✅ Found existing trade with columns:', Object.keys(sampleTrade));
        console.log('📝 Sample existing trade:', sampleTrade);
      } else {
        console.log('ℹ️ No existing trades found, but table is accessible');
      }

      // Step 1: Fetch trades from Blofin
      setProgress('Fetching trades from Blofin (this may take a few minutes for large histories)...');
      console.log('Fetching trades from Blofin...');
      const response = await fetch(`${API_URL}/api/blofin/sync`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          api_key: apiKey,
          api_secret: apiSecret,
          api_passphrase: apiPassphrase,
          user_id: userId,
          save_connection: true,  // Save credentials for future resyncs
        }),
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const data = await response.json();

      if (!data.success) {
        setError(data.message || 'Failed to fetch trades from Blofin');
        setLoading(false);
        return;
      }

      console.log(`✅ Fetched ${data.trades_count} trades from Blofin`);

      // Step 2: Trades are already normalized by backend with user_id included
      const tradesToInsert = data.trades;

      console.log('📝 Backend-normalized trades received from API');
      console.log('📝 Sample trade to insert:', tradesToInsert[0]);
      console.log('📝 Trade keys:', Object.keys(tradesToInsert[0] || {}));

      // Step 3: Save to Supabase in batches (for large datasets)
      // Supabase has limits: ~1000 rows per insert, ~5MB payload
      // For 3+ years of data, we batch insert to avoid limits
      const BATCH_SIZE = 500;
      const totalTrades = tradesToInsert.length;
      let insertedCount = 0;

      console.log(`💾 Saving ${totalTrades} trades to Supabase in batches of ${BATCH_SIZE}...`);

      for (let i = 0; i < totalTrades; i += BATCH_SIZE) {
        const batch = tradesToInsert.slice(i, i + BATCH_SIZE);
        const batchNumber = Math.floor(i / BATCH_SIZE) + 1;
        const totalBatches = Math.ceil(totalTrades / BATCH_SIZE);

        setProgress(`Saving to database: batch ${batchNumber}/${totalBatches} (${insertedCount}/${totalTrades} trades)...`);
        console.log(`📦 Inserting batch ${batchNumber}/${totalBatches} (${batch.length} trades)...`);

        const { error: insertError } = await supabase
          .from('trades')
          .insert(batch);

        if (insertError) {
          console.error(`❌ Supabase insert error in batch ${batchNumber}:`, insertError);
          console.error('Error code:', insertError.code);
          console.error('Error message:', insertError.message);
          console.error('Error details:', insertError.details);
          setError(`Failed to save batch ${batchNumber}/${totalBatches}: ${insertError.message}. ${insertedCount} trades saved so far.`);
          setLoading(false);
          return;
        }

        insertedCount += batch.length;
        console.log(`✅ Batch ${batchNumber}/${totalBatches} saved (${insertedCount}/${totalTrades} total)`);
      }

      console.log(`✅ Successfully saved all ${insertedCount} trades to Supabase!`);

      setSuccess(true);

      // Clear form after success
      setApiKey('');
      setApiSecret('');
      setApiPassphrase('');

      // Close modal after 1.5 seconds
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
          <h2 style={{ fontSize: isMobile ? '18px' : '24px', fontWeight: '700', color: '#F5C76D', margin: 0 }}>
            Sync Blofin Trades
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
          Enter your Blofin API credentials to sync your trade history.
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
            <label style={{ display: 'block', fontSize: '11px', color: '#8B7355', fontWeight: '600', textTransform: 'uppercase', letterSpacing: '0.5px', marginBottom: '8px' }}>API Key</label>
            <input
              type="password"
              value={apiKey}
              onChange={(e) => setApiKey(e.target.value)}
              placeholder="Enter your API key"
              disabled={success}
              style={{ width: '100%', padding: '12px', borderRadius: '8px', border: '1px solid rgba(212, 165, 69, 0.2)', backgroundColor: 'rgba(37, 30, 23, 0.6)', color: '#C2B280', fontSize: '13px', fontWeight: '500', boxSizing: 'border-box' }}
            />
          </div>

          <div>
            <label style={{ display: 'block', fontSize: '11px', color: '#8B7355', fontWeight: '600', textTransform: 'uppercase', letterSpacing: '0.5px', marginBottom: '8px' }}>API Secret</label>
            <input
              type="password"
              value={apiSecret}
              onChange={(e) => setApiSecret(e.target.value)}
              placeholder="Enter your API secret"
              disabled={success}
              style={{ width: '100%', padding: '12px', borderRadius: '8px', border: '1px solid rgba(212, 165, 69, 0.2)', backgroundColor: 'rgba(37, 30, 23, 0.6)', color: '#C2B280', fontSize: '13px', fontWeight: '500', boxSizing: 'border-box' }}
            />
          </div>

          <div>
            <label style={{ display: 'block', fontSize: '11px', color: '#8B7355', fontWeight: '600', textTransform: 'uppercase', letterSpacing: '0.5px', marginBottom: '8px' }}>Passphrase</label>
            <input
              type="password"
              value={apiPassphrase}
              onChange={(e) => setApiPassphrase(e.target.value)}
              placeholder="Enter your passphrase"
              disabled={success}
              style={{ width: '100%', padding: '12px', borderRadius: '8px', border: '1px solid rgba(212, 165, 69, 0.2)', backgroundColor: 'rgba(37, 30, 23, 0.6)', color: '#C2B280', fontSize: '13px', fontWeight: '500', boxSizing: 'border-box' }}
            />
          </div>

          {/* Leverage Warning */}
          <div style={{
            background: 'rgba(245, 158, 11, 0.1)',
            border: '1px solid rgba(245, 158, 11, 0.3)',
            borderRadius: '12px',
            padding: '16px',
            marginTop: '4px'
          }}>
            <div style={{ display: 'flex', alignItems: 'flex-start', gap: '10px' }}>
              <span style={{ fontSize: '16px', flexShrink: 0 }}>⚠️</span>
              <div>
                <div style={{ fontSize: '13px', fontWeight: '600', color: '#f59e0b', marginBottom: '6px' }}>
                  Important: Set Leverage After Sync
                </div>
                <div style={{ fontSize: '12px', color: '#C2B280', lineHeight: '1.5' }}>
                  Blofin doesn't provide leverage data. All trades will default to 1x. After syncing, go to the Trades page and click "Set Leverage" to configure your default leverage for each symbol.
                </div>
              </div>
            </div>
          </div>

          <p style={{ fontSize: '12px', color: '#8B7355', margin: '4px 0 8px 0', lineHeight: '1.5' }}>
            Your credentials are sent directly to the backend and never stored.
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
