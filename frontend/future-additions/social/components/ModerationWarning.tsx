/**
 * ModerationWarning Component
 * Displays moderation feedback to users (warnings or blocks)
 */

import React from 'react';
import type { ModerationResult } from '../../utils/moderation';

interface ModerationWarningProps {
  moderation: ModerationResult;
  onDismiss?: () => void;
  onProceed?: () => void;
}

export default function ModerationWarning({
  moderation,
  onDismiss,
  onProceed,
}: ModerationWarningProps) {
  if (moderation.severity === 'none') {
    return null;
  }

  const isBlocked = moderation.severity === 'blocked';
  const isWarning = moderation.severity === 'warning';

  const bgColor = isBlocked
    ? 'rgba(239, 68, 68, 0.1)' // Red for blocked
    : 'rgba(217, 119, 6, 0.1)'; // Amber for warning

  const borderColor = isBlocked
    ? 'rgba(239, 68, 68, 0.3)'
    : 'rgba(217, 119, 6, 0.3)';

  const accentColor = isBlocked ? '#ef4444' : '#d97706';
  const icon = isBlocked ? '⛔' : '⚠️';

  return (
    <div
      style={{
        backgroundColor: bgColor,
        border: `1px solid ${borderColor}`,
        borderLeft: `3px solid ${accentColor}`,
        borderRadius: '8px',
        padding: '12px 14px',
        marginBottom: '12px',
        animation: 'slideDown 300ms ease-out',
      }}
    >
      <style>{`
        @keyframes slideDown {
          from {
            opacity: 0;
            transform: translateY(-8px);
          }
          to {
            opacity: 1;
            transform: translateY(0);
          }
        }
      `}</style>

      {/* Header with icon and title */}
      <div style={{ display: 'flex', alignItems: 'start', gap: '8px', marginBottom: '8px' }}>
        <span style={{ fontSize: '16px', flexShrink: 0, marginTop: '2px' }}>{icon}</span>
        <div style={{ flex: 1 }}>
          <p
            style={{
              fontSize: '12px',
              fontWeight: '600',
              color: accentColor,
              margin: '0 0 4px 0',
              textTransform: 'uppercase',
              letterSpacing: '0.5px',
            }}
          >
            {isBlocked ? 'Post Blocked' : 'Post Warning'}
          </p>
          <p
            style={{
              fontSize: '13px',
              color: '#E8E8E8',
              margin: '0',
              lineHeight: '1.5',
            }}
          >
            {moderation.message}
          </p>
        </div>
      </div>

      {/* Details if available */}
      {moderation.details && moderation.details.length > 0 && (
        <div style={{ marginBottom: '10px', paddingLeft: '24px' }}>
          <ul
            style={{
              margin: '0',
              paddingLeft: '18px',
              fontSize: '12px',
              color: '#C2B280',
            }}
          >
            {moderation.details.map((detail, idx) => (
              <li key={idx} style={{ marginBottom: '4px' }}>
                {detail}
              </li>
            ))}
          </ul>
        </div>
      )}

      {/* Action buttons */}
      <div
        style={{
          display: 'flex',
          gap: '8px',
          marginTop: '10px',
          paddingTop: '10px',
          borderTop: `1px solid ${borderColor}`,
        }}
      >
        {isWarning && onProceed && (
          <button
            onClick={onProceed}
            style={{
              padding: '6px 12px',
              backgroundColor: 'rgba(217, 119, 6, 0.2)',
              border: '1px solid rgba(217, 119, 6, 0.4)',
              color: '#d97706',
              borderRadius: '6px',
              cursor: 'pointer',
              fontWeight: '600',
              fontSize: '11px',
              transition: 'all 150ms ease',
            }}
            onMouseEnter={(e) => {
              (e.currentTarget as HTMLButtonElement).style.backgroundColor = 'rgba(217, 119, 6, 0.3)';
              (e.currentTarget as HTMLButtonElement).style.borderColor = 'rgba(217, 119, 6, 0.6)';
            }}
            onMouseLeave={(e) => {
              (e.currentTarget as HTMLButtonElement).style.backgroundColor = 'rgba(217, 119, 6, 0.2)';
              (e.currentTarget as HTMLButtonElement).style.borderColor = 'rgba(217, 119, 6, 0.4)';
            }}
          >
            Post Anyway
          </button>
        )}

        {onDismiss && (
          <button
            onClick={onDismiss}
            style={{
              padding: '6px 12px',
              backgroundColor: 'transparent',
              border: `1px solid ${accentColor}`,
              color: accentColor,
              borderRadius: '6px',
              cursor: 'pointer',
              fontWeight: '600',
              fontSize: '11px',
              transition: 'all 150ms ease',
            }}
            onMouseEnter={(e) => {
              (e.currentTarget as HTMLButtonElement).style.backgroundColor = `${accentColor}20`;
            }}
            onMouseLeave={(e) => {
              (e.currentTarget as HTMLButtonElement).style.backgroundColor = 'transparent';
            }}
          >
            {isBlocked ? 'Revise' : 'Dismiss'}
          </button>
        )}
      </div>
    </div>
  );
}
