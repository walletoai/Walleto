/**
 * ConnectionStatus Component
 * Shows WebSocket connection status
 */

import React, { memo } from 'react';

interface ConnectionStatusProps {
  isConnected: boolean;
  symbol?: string;
  lastUpdate?: number;
}

const ConnectionStatusComponent: React.FC<ConnectionStatusProps> = ({
  isConnected,
  symbol,
  lastUpdate,
}) => {
  // Calculate time since last update
  let timeSinceUpdate = '';
  if (lastUpdate) {
    const secondsAgo = Math.floor((Date.now() - lastUpdate) / 1000);
    if (secondsAgo < 60) {
      timeSinceUpdate = `${secondsAgo}s ago`;
    } else {
      timeSinceUpdate = `${Math.floor(secondsAgo / 60)}m ago`;
    }
  }

  return (
    <div
      style={{
        display: 'flex',
        alignItems: 'center',
        gap: '8px',
        padding: '8px 12px',
        backgroundColor: isConnected ? 'rgba(16, 185, 129, 0.1)' : 'rgba(239, 68, 68, 0.1)',
        border: `1px solid ${isConnected ? 'rgba(16, 185, 129, 0.3)' : 'rgba(239, 68, 68, 0.3)'}`,
        borderRadius: '6px',
        fontSize: '11px',
        color: isConnected ? '#10b981' : '#ef4444',
        fontWeight: '600',
      }}
    >
      {/* Status Dot */}
      <div
        style={{
          width: '8px',
          height: '8px',
          borderRadius: '50%',
          backgroundColor: isConnected ? '#10b981' : '#ef4444',
          animation: isConnected ? 'none' : 'pulse 1.5s ease-in-out infinite',
        }}
      />

      {/* Status Text */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
        <span>{isConnected ? '🟢 Connected' : '🔴 Disconnected'}</span>
        {symbol && <span style={{ color: '#C2B280' }}>({symbol})</span>}
        {timeSinceUpdate && <span style={{ color: '#8B7355', fontSize: '10px' }}>{timeSinceUpdate}</span>}
      </div>

      <style>{`
        @keyframes pulse {
          0%, 100% { opacity: 1; }
          50% { opacity: 0.5; }
        }
      `}</style>
    </div>
  );
};

export const ConnectionStatus = memo(ConnectionStatusComponent);
