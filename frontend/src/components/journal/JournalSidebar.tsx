/**
 * JournalSidebar - Entry list with filters and search
 */

import { useState } from 'react';
import type { JournalEntry } from '../../types/journal';

interface JournalSidebarProps {
  entries: JournalEntry[];
  selectedEntry: JournalEntry | null;
  onSelectEntry: (entry: JournalEntry) => void;
  onCreateEntry: () => void;
  onDeleteEntry: (id: string) => void;
  onTogglePin: (id: string) => void;
  onToggleFavorite: (id: string) => void;
}

export default function JournalSidebar({
  entries,
  selectedEntry,
  onSelectEntry,
  onCreateEntry,
  onDeleteEntry,
  onTogglePin,
  onToggleFavorite,
}: JournalSidebarProps) {
  const [search, setSearch] = useState('');
  const [filter, setFilter] = useState<'all' | 'pinned' | 'favorites'>('all');
  const [contextMenu, setContextMenu] = useState<{ id: string; x: number; y: number } | null>(null);

  // Filter and search entries
  const filteredEntries = entries.filter((entry) => {
    // Apply search
    if (search && !entry.title.toLowerCase().includes(search.toLowerCase())) {
      return false;
    }

    // Apply filter
    if (filter === 'pinned' && !entry.is_pinned) return false;
    if (filter === 'favorites' && !entry.is_favorite) return false;

    return true;
  });

  // Sort: pinned first, then by date
  const sortedEntries = [...filteredEntries].sort((a, b) => {
    if (a.is_pinned && !b.is_pinned) return -1;
    if (!a.is_pinned && b.is_pinned) return 1;
    return new Date(b.entry_date).getTime() - new Date(a.entry_date).getTime();
  });

  function handleContextMenu(e: React.MouseEvent, entryId: string) {
    e.preventDefault();
    setContextMenu({ id: entryId, x: e.clientX, y: e.clientY });
  }

  function formatDate(dateStr: string) {
    const date = new Date(dateStr);
    const today = new Date();
    const yesterday = new Date(today);
    yesterday.setDate(yesterday.getDate() - 1);

    if (date.toDateString() === today.toDateString()) {
      return 'Today';
    }
    if (date.toDateString() === yesterday.toDateString()) {
      return 'Yesterday';
    }
    return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
      {/* Header */}
      <div style={{ padding: '16px', borderBottom: '1px solid rgba(212, 165, 69, 0.1)' }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '12px' }}>
          <h2 style={{ margin: 0, fontSize: '18px', color: '#F5C76D', fontWeight: 700 }}>
            Journal
          </h2>
          <button
            onClick={onCreateEntry}
            style={{
              padding: '6px 12px',
              backgroundColor: 'rgba(245, 199, 109, 0.15)',
              border: '1px solid rgba(245, 199, 109, 0.3)',
              borderRadius: '6px',
              color: '#F5C76D',
              fontSize: '13px',
              fontWeight: 600,
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: '4px',
            }}
          >
            <span style={{ fontSize: '16px' }}>+</span>
            New
          </button>
        </div>

        {/* Search */}
        <input
          type="text"
          placeholder="Search entries..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          style={{
            width: '100%',
            boxSizing: 'border-box',
            padding: '8px 12px',
            backgroundColor: 'rgba(37, 30, 23, 0.6)',
            border: '1px solid rgba(212, 165, 69, 0.2)',
            borderRadius: '8px',
            color: '#F7E7C6',
            fontSize: '13px',
            outline: 'none',
          }}
        />

        {/* Filters */}
        <div style={{ display: 'flex', gap: '6px', marginTop: '10px' }}>
          {(['all', 'pinned', 'favorites'] as const).map((f) => (
            <button
              key={f}
              onClick={() => setFilter(f)}
              style={{
                padding: '4px 10px',
                backgroundColor: filter === f ? 'rgba(245, 199, 109, 0.15)' : 'transparent',
                border: filter === f ? '1px solid rgba(245, 199, 109, 0.3)' : '1px solid transparent',
                borderRadius: '12px',
                color: filter === f ? '#F5C76D' : '#8B7355',
                fontSize: '12px',
                cursor: 'pointer',
                textTransform: 'capitalize',
              }}
            >
              {f === 'all' ? 'All' : f === 'pinned' ? '📌 Pinned' : '⭐ Favorites'}
            </button>
          ))}
        </div>
      </div>

      {/* Entry List */}
      <div style={{ flex: 1, overflow: 'auto', padding: '8px' }}>
        {sortedEntries.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '32px 16px', color: '#8B7355' }}>
            <div style={{ fontSize: '32px', marginBottom: '12px' }}>📓</div>
            <div style={{ fontSize: '14px' }}>No entries yet</div>
            <div style={{ fontSize: '12px', marginTop: '4px' }}>
              Create your first journal entry
            </div>
          </div>
        ) : (
          sortedEntries.map((entry) => (
            <div
              key={entry.id}
              onClick={() => onSelectEntry(entry)}
              onContextMenu={(e) => handleContextMenu(e, entry.id)}
              style={{
                padding: '12px',
                marginBottom: '4px',
                backgroundColor: selectedEntry?.id === entry.id
                  ? 'rgba(245, 199, 109, 0.12)'
                  : 'transparent',
                border: selectedEntry?.id === entry.id
                  ? '1px solid rgba(245, 199, 109, 0.25)'
                  : '1px solid transparent',
                borderRadius: '8px',
                cursor: 'pointer',
                transition: 'all 150ms ease',
              }}
            >
              <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between' }}>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginBottom: '4px' }}>
                    {entry.is_pinned && <span style={{ fontSize: '12px' }}>📌</span>}
                    {entry.is_favorite && <span style={{ fontSize: '12px' }}>⭐</span>}
                    <span
                      style={{
                        fontSize: '13px',
                        fontWeight: 600,
                        color: '#F7E7C6',
                        overflow: 'hidden',
                        textOverflow: 'ellipsis',
                        whiteSpace: 'nowrap',
                      }}
                    >
                      {entry.title || 'Untitled Entry'}
                    </span>
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <span style={{ fontSize: '11px', color: '#8B7355' }}>
                      {formatDate(entry.entry_date)}
                    </span>
                    {entry.word_count > 0 && (
                      <span style={{ fontSize: '11px', color: '#6B5D4D' }}>
                        {entry.word_count} words
                      </span>
                    )}
                    {entry.pre_trade_mood && (
                      <span
                        style={{
                          fontSize: '10px',
                          padding: '1px 6px',
                          backgroundColor: 'rgba(245, 199, 109, 0.1)',
                          borderRadius: '8px',
                          color: '#C2B280',
                        }}
                      >
                        {entry.pre_trade_mood}
                      </span>
                    )}
                  </div>
                </div>
              </div>
            </div>
          ))
        )}
      </div>

      {/* Context Menu */}
      {contextMenu && (
        <>
          <div
            onClick={() => setContextMenu(null)}
            style={{
              position: 'fixed',
              inset: 0,
              zIndex: 999,
            }}
          />
          <div
            style={{
              position: 'fixed',
              left: contextMenu.x,
              top: contextMenu.y,
              backgroundColor: '#2A2118',
              border: '1px solid rgba(212, 165, 69, 0.2)',
              borderRadius: '8px',
              padding: '4px',
              zIndex: 1000,
              boxShadow: '0 4px 16px rgba(0, 0, 0, 0.4)',
              minWidth: '140px',
            }}
          >
            {[
              { icon: '📌', label: 'Toggle Pin', action: () => onTogglePin(contextMenu.id) },
              { icon: '⭐', label: 'Toggle Favorite', action: () => onToggleFavorite(contextMenu.id) },
              { icon: '🗑️', label: 'Delete', action: () => onDeleteEntry(contextMenu.id), danger: true },
            ].map((item, i) => (
              <button
                key={i}
                onClick={() => {
                  item.action();
                  setContextMenu(null);
                }}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '8px',
                  width: '100%',
                  padding: '8px 12px',
                  backgroundColor: 'transparent',
                  border: 'none',
                  borderRadius: '4px',
                  color: item.danger ? '#ef4444' : '#F7E7C6',
                  fontSize: '13px',
                  cursor: 'pointer',
                  textAlign: 'left',
                }}
              >
                <span>{item.icon}</span>
                <span>{item.label}</span>
              </button>
            ))}
          </div>
        </>
      )}
    </div>
  );
}
