/**
 * DiscoverPanel Component
 * Right sidebar for user discovery and search
 */

import React from 'react';
import { Link } from 'react-router-dom';

interface DiscoverPanelProps {
  searchQuery: string;
  searchResults: any[];
  onSearchChange: (query: string) => void;
  onSearchSubmit: (e: React.FormEvent) => void;
  isSearching?: boolean;
}

export default function DiscoverPanel({
  searchQuery,
  searchResults,
  onSearchChange,
  onSearchSubmit,
  isSearching = false,
}: DiscoverPanelProps) {
  return (
    <div className="sticky top-6 flex flex-col gap-6">
      {/* Search Card */}
      <div
        style={{
          backgroundColor: 'rgba(42, 37, 31, 0.6)',
          border: '1px solid rgba(212, 165, 69, 0.15)',
          borderRadius: '12px',
          padding: '20px',
          backdropFilter: 'blur(10px)',
        }}
      >
        <h3 style={{ fontSize: '13px', fontWeight: '700', color: '#F5C76D', margin: '0 0 16px 0', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
          🔍 Discover Traders
        </h3>

        <form onSubmit={onSearchSubmit} style={{ display: 'flex', gap: '8px', marginBottom: '12px' }}>
          <input
            type="text"
            placeholder="Search username..."
            value={searchQuery}
            onChange={(e) => onSearchChange(e.target.value)}
            style={{
              flex: 1,
              padding: '10px 12px',
              backgroundColor: 'rgba(37, 30, 23, 0.8)',
              border: '1px solid rgba(212, 165, 69, 0.25)',
              borderRadius: '8px',
              color: '#F5C76D',
              fontSize: '12px',
              outline: 'none',
            }}
          />
          <button
            type="submit"
            disabled={isSearching}
            style={{
              padding: '10px 14px',
              backgroundColor: 'rgba(245, 199, 109, 0.2)',
              border: '1px solid rgba(245, 199, 109, 0.4)',
              color: '#F5C76D',
              borderRadius: '8px',
              cursor: isSearching ? 'not-allowed' : 'pointer',
              fontWeight: '600',
              fontSize: '11px',
              transition: 'all 150ms ease',
              opacity: isSearching ? 0.6 : 1,
            }}
          >
            {isSearching ? '...' : 'Go'}
          </button>
        </form>

        {/* Search Results */}
        {searchResults.length > 0 && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
            <p style={{ fontSize: '11px', color: '#8B7355', margin: '0 0 8px 0', fontWeight: '600' }}>
              Found {searchResults.length} trader(s)
            </p>
            {searchResults.slice(0, 5).map((user) => (
              <Link
                key={user.user_id}
                to={`/profile/${user.user_id}`}
                style={{ textDecoration: 'none', color: 'inherit' }}
              >
                <div
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '8px',
                    padding: '10px 12px',
                    backgroundColor: 'rgba(37, 30, 23, 0.4)',
                    border: '1px solid rgba(212, 165, 69, 0.15)',
                    borderRadius: '8px',
                    cursor: 'pointer',
                    transition: 'all 150ms ease',
                  }}
                  onMouseEnter={(e) => {
                    (e.currentTarget as HTMLDivElement).style.backgroundColor = 'rgba(37, 30, 23, 0.6)';
                    (e.currentTarget as HTMLDivElement).style.borderColor = 'rgba(212, 165, 69, 0.25)';
                  }}
                  onMouseLeave={(e) => {
                    (e.currentTarget as HTMLDivElement).style.backgroundColor = 'rgba(37, 30, 23, 0.4)';
                    (e.currentTarget as HTMLDivElement).style.borderColor = 'rgba(212, 165, 69, 0.15)';
                  }}
                >
                  <div
                    style={{
                      width: '28px',
                      height: '28px',
                      borderRadius: '50%',
                      backgroundColor: 'rgba(212, 165, 69, 0.2)',
                      border: '1px solid rgba(212, 165, 69, 0.2)',
                      overflow: 'hidden',
                      flexShrink: 0,
                    }}
                  >
                    {user.avatar_url ? (
                      <img
                        src={user.avatar_url}
                        alt={user.username}
                        style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                      />
                    ) : null}
                  </div>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <p style={{ fontSize: '12px', fontWeight: '600', color: '#F5C76D', margin: '0', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                      {user.username}
                    </p>
                  </div>
                  <span style={{ fontSize: '10px', color: '#8B7355', flexShrink: 0 }}>
                    👥 {user.followers_count || 0}
                  </span>
                </div>
              </Link>
            ))}
            {searchResults.length > 5 && (
              <p style={{ fontSize: '11px', color: '#8B7355', margin: '8px 0 0 0', textAlign: 'center' }}>
                +{searchResults.length - 5} more results
              </p>
            )}
          </div>
        )}

        {searchQuery && searchResults.length === 0 && !isSearching && (
          <p style={{ fontSize: '12px', color: '#8B7355', margin: '0', textAlign: 'center', padding: '12px 0' }}>
            No traders found
          </p>
        )}
      </div>

      {/* Info Card */}
      <div
        style={{
          backgroundColor: 'rgba(42, 37, 31, 0.6)',
          border: '1px solid rgba(212, 165, 69, 0.15)',
          borderRadius: '12px',
          padding: '16px',
          backdropFilter: 'blur(10px)',
        }}
      >
        <p style={{ fontSize: '11px', color: '#C2B280', margin: '0', lineHeight: '1.6' }}>
          💡 <strong>Tip:</strong> Follow successful traders to see their insights and strategies in your feed!
        </p>
      </div>
    </div>
  );
}
