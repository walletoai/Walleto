/**
 * JournalEditor - Notion-style block editor
 */

import { useState, useEffect, useRef, useCallback } from 'react';
import type { JournalEntry, JournalBlock, BlockType, MoodType } from '../../types/journal';
import { BLOCK_INFO, MOOD_INFO } from '../../types/journal';
import MoodPickerModal from './MoodPickerModal';
import TradeLinkerModal from './TradeLinkerModal';
import VoiceCaptureWidget from './VoiceCaptureWidget';

interface JournalEditorProps {
  entry: JournalEntry | null;
  onUpdate: (entryId: string, updates: Partial<JournalEntry>) => void;
  saving: boolean;
  trades: any[];
  userId: string;
}

export default function JournalEditor({
  entry,
  onUpdate,
  saving,
  trades,
  userId,
}: JournalEditorProps) {
  const [title, setTitle] = useState('');
  const [blocks, setBlocks] = useState<JournalBlock[]>([]);
  const [focusedBlockId, setFocusedBlockId] = useState<string | null>(null);
  const [showSlashMenu, setShowSlashMenu] = useState(false);
  const [slashMenuPosition, setSlashMenuPosition] = useState({ x: 0, y: 0 });
  const [showMoodPicker, setShowMoodPicker] = useState<'pre' | 'post' | null>(null);
  const [showTradeLinker, setShowTradeLinker] = useState(false);

  const saveTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const editorRef = useRef<HTMLDivElement>(null);

  // Sync with entry
  useEffect(() => {
    if (entry) {
      setTitle(entry.title);
      setBlocks(entry.content || []);
    } else {
      setTitle('');
      setBlocks([]);
    }
  }, [entry?.id]);

  // Auto-save with debounce
  const saveChanges = useCallback(() => {
    if (!entry) return;

    if (saveTimeoutRef.current) {
      clearTimeout(saveTimeoutRef.current);
    }

    saveTimeoutRef.current = setTimeout(() => {
      onUpdate(entry.id, { title, content: blocks });
    }, 1000);
  }, [entry, title, blocks, onUpdate]);

  useEffect(() => {
    saveChanges();
    return () => {
      if (saveTimeoutRef.current) {
        clearTimeout(saveTimeoutRef.current);
      }
    };
  }, [title, blocks]);

  function generateId() {
    return crypto.randomUUID();
  }

  function addBlock(type: BlockType, afterId?: string) {
    const newBlock: JournalBlock = {
      id: generateId(),
      type,
      content: '',
      properties: type === 'callout' ? { color: 'gold' } : undefined,
    };

    setBlocks((prev) => {
      if (!afterId) {
        return [...prev, newBlock];
      }
      const index = prev.findIndex((b) => b.id === afterId);
      if (index === -1) return [...prev, newBlock];
      const newBlocks = [...prev];
      newBlocks.splice(index + 1, 0, newBlock);
      return newBlocks;
    });

    setShowSlashMenu(false);
    setFocusedBlockId(newBlock.id);
  }

  function updateBlock(id: string, updates: Partial<JournalBlock>) {
    setBlocks((prev) =>
      prev.map((b) => (b.id === id ? { ...b, ...updates } : b))
    );
  }

  function deleteBlock(id: string) {
    if (blocks.length <= 1) return;

    const index = blocks.findIndex((b) => b.id === id);
    setBlocks((prev) => prev.filter((b) => b.id !== id));

    // Focus previous block
    if (index > 0) {
      setFocusedBlockId(blocks[index - 1].id);
    }
  }

  function handleKeyDown(e: React.KeyboardEvent, block: JournalBlock) {
    // Enter: Create new block
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      addBlock('paragraph', block.id);
    }

    // Backspace on empty: Delete block
    if (e.key === 'Backspace' && block.content === '' && blocks.length > 1) {
      e.preventDefault();
      deleteBlock(block.id);
    }

    // Slash command
    if (e.key === '/' && block.content === '') {
      const target = e.currentTarget as HTMLElement;
      const rect = target.getBoundingClientRect();
      setSlashMenuPosition({ x: rect.left, y: rect.bottom + 4 });
      setShowSlashMenu(true);
    }

    // Escape: Close slash menu
    if (e.key === 'Escape') {
      setShowSlashMenu(false);
    }
  }

  function handleMoodSelect(type: 'pre' | 'post', mood: MoodType) {
    if (!entry) return;

    onUpdate(entry.id, {
      [type === 'pre' ? 'pre_trade_mood' : 'post_trade_mood']: mood,
    });
    setShowMoodPicker(null);
  }

  function handleVoiceTranscript(text: string) {
    // Add the transcript as a new paragraph block
    const newBlock: JournalBlock = {
      id: generateId(),
      type: 'paragraph',
      content: text,
    };
    setBlocks((prev) => [...prev, newBlock]);
    setFocusedBlockId(newBlock.id);
  }

  if (!entry) {
    return (
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          height: '100%',
          color: '#8B7355',
          textAlign: 'center',
          padding: '32px',
        }}
      >
        <div>
          <div style={{ fontSize: '48px', marginBottom: '16px' }}>📝</div>
          <div style={{ fontSize: '16px', fontWeight: 600 }}>No Entry Selected</div>
          <div style={{ fontSize: '14px', marginTop: '8px' }}>
            Select an entry from the sidebar or create a new one
          </div>
        </div>
      </div>
    );
  }

  return (
    <div
      ref={editorRef}
      style={{
        height: '100%',
        display: 'flex',
        flexDirection: 'column',
        backgroundColor: '#1D1A16',
      }}
    >
      {/* Toolbar */}
      <div
        style={{
          padding: '12px 24px',
          borderBottom: '1px solid rgba(212, 165, 69, 0.1)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          backgroundColor: '#251E17',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          {/* Mood Pills */}
          <button
            onClick={() => setShowMoodPicker('pre')}
            style={{
              padding: '4px 10px',
              backgroundColor: entry.pre_trade_mood
                ? 'rgba(245, 199, 109, 0.15)'
                : 'rgba(139, 115, 85, 0.1)',
              border: '1px solid rgba(212, 165, 69, 0.2)',
              borderRadius: '12px',
              color: entry.pre_trade_mood ? '#F5C76D' : '#8B7355',
              fontSize: '12px',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: '4px',
            }}
          >
            {entry.pre_trade_mood ? (
              <>
                <span>{MOOD_INFO[entry.pre_trade_mood]?.emoji}</span>
                <span>Pre: {MOOD_INFO[entry.pre_trade_mood]?.label}</span>
              </>
            ) : (
              '+ Pre-trade Mood'
            )}
          </button>

          <button
            onClick={() => setShowMoodPicker('post')}
            style={{
              padding: '4px 10px',
              backgroundColor: entry.post_trade_mood
                ? 'rgba(245, 199, 109, 0.15)'
                : 'rgba(139, 115, 85, 0.1)',
              border: '1px solid rgba(212, 165, 69, 0.2)',
              borderRadius: '12px',
              color: entry.post_trade_mood ? '#F5C76D' : '#8B7355',
              fontSize: '12px',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: '4px',
            }}
          >
            {entry.post_trade_mood ? (
              <>
                <span>{MOOD_INFO[entry.post_trade_mood]?.emoji}</span>
                <span>Post: {MOOD_INFO[entry.post_trade_mood]?.label}</span>
              </>
            ) : (
              '+ Post-trade Mood'
            )}
          </button>

          <button
            onClick={() => setShowTradeLinker(true)}
            style={{
              padding: '4px 10px',
              backgroundColor: 'rgba(139, 115, 85, 0.1)',
              border: '1px solid rgba(212, 165, 69, 0.2)',
              borderRadius: '12px',
              color: '#8B7355',
              fontSize: '12px',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: '4px',
            }}
          >
            📈 Link Trades
            {entry.journal_trade_links && entry.journal_trade_links.length > 0 && (
              <span
                style={{
                  backgroundColor: 'rgba(245, 199, 109, 0.3)',
                  padding: '0 6px',
                  borderRadius: '8px',
                  fontSize: '11px',
                  color: '#F5C76D',
                }}
              >
                {entry.journal_trade_links.length}
              </span>
            )}
          </button>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
          <VoiceCaptureWidget onTranscriptComplete={handleVoiceTranscript} />
          {saving && (
            <span style={{ fontSize: '12px', color: '#8B7355' }}>Saving...</span>
          )}
          <span style={{ fontSize: '12px', color: '#6B5D4D' }}>
            {entry.word_count} words
          </span>
        </div>
      </div>

      {/* Editor Content */}
      <div
        style={{
          flex: 1,
          overflow: 'auto',
          padding: '32px',
          maxWidth: '800px',
          margin: '0 auto',
          width: '100%',
        }}
      >
        {/* Title */}
        <input
          type="text"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          placeholder="Untitled Entry"
          style={{
            width: '100%',
            padding: '0',
            marginBottom: '24px',
            backgroundColor: 'transparent',
            border: 'none',
            color: '#F5C76D',
            fontSize: '28px',
            fontWeight: 700,
            outline: 'none',
          }}
        />

        {/* Blocks */}
        {blocks.map((block) => (
          <BlockRenderer
            key={block.id}
            block={block}
            isFocused={focusedBlockId === block.id}
            onUpdate={(updates) => updateBlock(block.id, updates)}
            onKeyDown={(e) => handleKeyDown(e, block)}
            onFocus={() => setFocusedBlockId(block.id)}
            onDelete={() => deleteBlock(block.id)}
          />
        ))}

        {/* Add Block Button */}
        <button
          onClick={() => addBlock('paragraph')}
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '8px',
            padding: '8px 0',
            backgroundColor: 'transparent',
            border: 'none',
            color: '#6B5D4D',
            fontSize: '14px',
            cursor: 'pointer',
            opacity: 0.6,
          }}
        >
          <span>+</span>
          <span>Add a block or type / for commands</span>
        </button>
      </div>

      {/* Slash Command Menu */}
      {showSlashMenu && (
        <SlashMenu
          position={slashMenuPosition}
          onSelect={(type) => {
            const currentBlock = blocks.find((b) => b.id === focusedBlockId);
            if (currentBlock) {
              updateBlock(currentBlock.id, { type, content: '' });
            } else {
              addBlock(type);
            }
            setShowSlashMenu(false);
          }}
          onClose={() => setShowSlashMenu(false)}
        />
      )}

      {/* Mood Picker Modal */}
      <MoodPickerModal
        isOpen={showMoodPicker !== null}
        type={showMoodPicker || 'pre'}
        currentMood={showMoodPicker === 'pre' ? entry.pre_trade_mood : entry.post_trade_mood}
        onSelect={(mood) => handleMoodSelect(showMoodPicker!, mood)}
        onClose={() => setShowMoodPicker(null)}
      />

      {/* Trade Linker Modal */}
      <TradeLinkerModal
        isOpen={showTradeLinker}
        trades={trades}
        linkedTradeIds={entry.journal_trade_links?.map((l) => l.trade_id) || []}
        userId={userId}
        entryId={entry.id}
        onClose={() => setShowTradeLinker(false)}
      />
    </div>
  );
}

// Block Renderer Component
function BlockRenderer({
  block,
  isFocused,
  onUpdate,
  onKeyDown,
  onFocus,
  onDelete,
}: {
  block: JournalBlock;
  isFocused: boolean;
  onUpdate: (updates: Partial<JournalBlock>) => void;
  onKeyDown: (e: React.KeyboardEvent) => void;
  onFocus: () => void;
  onDelete: () => void;
}) {
  const inputRef = useRef<HTMLTextAreaElement | HTMLInputElement>(null);

  useEffect(() => {
    if (isFocused && inputRef.current) {
      inputRef.current.focus();
    }
  }, [isFocused]);

  const baseStyle: React.CSSProperties = {
    width: '100%',
    backgroundColor: 'transparent',
    border: 'none',
    color: '#F7E7C6',
    outline: 'none',
    resize: 'none',
    fontFamily: 'inherit',
  };

  const wrapperStyle: React.CSSProperties = {
    position: 'relative',
    marginBottom: '4px',
    padding: '4px 0',
    borderRadius: '4px',
  };

  // Render based on block type
  switch (block.type) {
    case 'heading1':
      return (
        <div style={wrapperStyle}>
          <input
            ref={inputRef as React.RefObject<HTMLInputElement>}
            type="text"
            value={block.content}
            onChange={(e) => onUpdate({ content: e.target.value })}
            onKeyDown={onKeyDown}
            onFocus={onFocus}
            placeholder="Heading 1"
            style={{ ...baseStyle, fontSize: '24px', fontWeight: 700, color: '#F5C76D' }}
          />
        </div>
      );

    case 'heading2':
      return (
        <div style={wrapperStyle}>
          <input
            ref={inputRef as React.RefObject<HTMLInputElement>}
            type="text"
            value={block.content}
            onChange={(e) => onUpdate({ content: e.target.value })}
            onKeyDown={onKeyDown}
            onFocus={onFocus}
            placeholder="Heading 2"
            style={{ ...baseStyle, fontSize: '20px', fontWeight: 600, color: '#E8D5A3' }}
          />
        </div>
      );

    case 'heading3':
      return (
        <div style={wrapperStyle}>
          <input
            ref={inputRef as React.RefObject<HTMLInputElement>}
            type="text"
            value={block.content}
            onChange={(e) => onUpdate({ content: e.target.value })}
            onKeyDown={onKeyDown}
            onFocus={onFocus}
            placeholder="Heading 3"
            style={{ ...baseStyle, fontSize: '17px', fontWeight: 600 }}
          />
        </div>
      );

    case 'bullet_list':
      return (
        <div style={{ ...wrapperStyle, display: 'flex', alignItems: 'flex-start', gap: '8px' }}>
          <span style={{ color: '#F5C76D', fontWeight: 700 }}>•</span>
          <textarea
            ref={inputRef as React.RefObject<HTMLTextAreaElement>}
            value={block.content}
            onChange={(e) => onUpdate({ content: e.target.value })}
            onKeyDown={onKeyDown}
            onFocus={onFocus}
            placeholder="List item"
            rows={1}
            style={{ ...baseStyle, flex: 1, fontSize: '15px', lineHeight: '1.6' }}
          />
        </div>
      );

    case 'numbered_list':
      return (
        <div style={{ ...wrapperStyle, display: 'flex', alignItems: 'flex-start', gap: '8px' }}>
          <span style={{ color: '#F5C76D', fontWeight: 600, minWidth: '20px' }}>1.</span>
          <textarea
            ref={inputRef as React.RefObject<HTMLTextAreaElement>}
            value={block.content}
            onChange={(e) => onUpdate({ content: e.target.value })}
            onKeyDown={onKeyDown}
            onFocus={onFocus}
            placeholder="List item"
            rows={1}
            style={{ ...baseStyle, flex: 1, fontSize: '15px', lineHeight: '1.6' }}
          />
        </div>
      );

    case 'checklist':
      return (
        <div style={{ ...wrapperStyle, display: 'flex', alignItems: 'flex-start', gap: '8px' }}>
          <input
            type="checkbox"
            checked={block.checked || false}
            onChange={(e) => onUpdate({ checked: e.target.checked })}
            style={{ marginTop: '4px', accentColor: '#F5C76D' }}
          />
          <textarea
            ref={inputRef as React.RefObject<HTMLTextAreaElement>}
            value={block.content}
            onChange={(e) => onUpdate({ content: e.target.value })}
            onKeyDown={onKeyDown}
            onFocus={onFocus}
            placeholder="To-do item"
            rows={1}
            style={{
              ...baseStyle,
              flex: 1,
              fontSize: '15px',
              lineHeight: '1.6',
              textDecoration: block.checked ? 'line-through' : 'none',
              opacity: block.checked ? 0.6 : 1,
            }}
          />
        </div>
      );

    case 'quote':
      return (
        <div
          style={{
            ...wrapperStyle,
            borderLeft: '3px solid #F5C76D',
            paddingLeft: '16px',
            backgroundColor: 'rgba(245, 199, 109, 0.05)',
          }}
        >
          <textarea
            ref={inputRef as React.RefObject<HTMLTextAreaElement>}
            value={block.content}
            onChange={(e) => onUpdate({ content: e.target.value })}
            onKeyDown={onKeyDown}
            onFocus={onFocus}
            placeholder="Quote..."
            rows={1}
            style={{ ...baseStyle, fontSize: '15px', fontStyle: 'italic', lineHeight: '1.6' }}
          />
        </div>
      );

    case 'callout':
      return (
        <div
          style={{
            ...wrapperStyle,
            padding: '12px 16px',
            backgroundColor: 'rgba(245, 199, 109, 0.1)',
            border: '1px solid rgba(245, 199, 109, 0.2)',
            borderRadius: '8px',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'flex-start', gap: '12px' }}>
            <span style={{ fontSize: '18px' }}>💡</span>
            <textarea
              ref={inputRef as React.RefObject<HTMLTextAreaElement>}
              value={block.content}
              onChange={(e) => onUpdate({ content: e.target.value })}
              onKeyDown={onKeyDown}
              onFocus={onFocus}
              placeholder="Callout text..."
              rows={1}
              style={{ ...baseStyle, flex: 1, fontSize: '14px', lineHeight: '1.6' }}
            />
          </div>
        </div>
      );

    case 'divider':
      return (
        <div style={{ ...wrapperStyle, padding: '16px 0' }}>
          <hr
            style={{
              border: 'none',
              borderTop: '1px solid rgba(212, 165, 69, 0.2)',
              margin: 0,
            }}
          />
        </div>
      );

    default: // paragraph
      return (
        <div style={wrapperStyle}>
          <textarea
            ref={inputRef as React.RefObject<HTMLTextAreaElement>}
            value={block.content}
            onChange={(e) => onUpdate({ content: e.target.value })}
            onKeyDown={onKeyDown}
            onFocus={onFocus}
            placeholder="Type something, or press / for commands..."
            rows={1}
            style={{ ...baseStyle, fontSize: '15px', lineHeight: '1.6' }}
          />
        </div>
      );
  }
}

// Slash Command Menu
function SlashMenu({
  position,
  onSelect,
  onClose,
}: {
  position: { x: number; y: number };
  onSelect: (type: BlockType) => void;
  onClose: () => void;
}) {
  const blockTypes: BlockType[] = [
    'paragraph',
    'heading1',
    'heading2',
    'heading3',
    'bullet_list',
    'numbered_list',
    'checklist',
    'quote',
    'callout',
    'divider',
  ];

  return (
    <>
      <div onClick={onClose} style={{ position: 'fixed', inset: 0, zIndex: 999 }} />
      <div
        style={{
          position: 'fixed',
          left: position.x,
          top: position.y,
          backgroundColor: '#2A2118',
          border: '1px solid rgba(212, 165, 69, 0.2)',
          borderRadius: '8px',
          padding: '8px',
          zIndex: 1000,
          boxShadow: '0 4px 16px rgba(0, 0, 0, 0.4)',
          minWidth: '200px',
          maxHeight: '300px',
          overflow: 'auto',
        }}
      >
        <div style={{ padding: '4px 8px', fontSize: '11px', color: '#8B7355', fontWeight: 600 }}>
          BASIC BLOCKS
        </div>
        {blockTypes.map((type) => (
          <button
            key={type}
            onClick={() => onSelect(type)}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '10px',
              width: '100%',
              padding: '8px',
              backgroundColor: 'transparent',
              border: 'none',
              borderRadius: '4px',
              color: '#F7E7C6',
              fontSize: '13px',
              cursor: 'pointer',
              textAlign: 'left',
            }}
          >
            <span
              style={{
                width: '24px',
                height: '24px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                backgroundColor: 'rgba(245, 199, 109, 0.1)',
                borderRadius: '4px',
                fontSize: '12px',
              }}
            >
              {BLOCK_INFO[type]?.icon}
            </span>
            <div>
              <div style={{ fontWeight: 500 }}>{BLOCK_INFO[type]?.label}</div>
              <div style={{ fontSize: '11px', color: '#8B7355' }}>
                {BLOCK_INFO[type]?.shortcut}
              </div>
            </div>
          </button>
        ))}
      </div>
    </>
  );
}
