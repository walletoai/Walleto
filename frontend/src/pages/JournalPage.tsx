/**
 * JournalPage - Trading Journal with Notion-style Editor
 * Three-column layout: Sidebar | Editor | Widgets
 */

import { useState, useEffect } from 'react';
import JournalSidebar from '../components/journal/JournalSidebar';
import JournalEditor from '../components/journal/JournalEditor';
import JournalWidgets from '../components/journal/JournalWidgets';
import TemplatePickerModal from '../components/journal/TemplatePickerModal';
import { useResponsive } from '../hooks/useResponsive';
import * as journalApi from '../api/journal';
import type { JournalEntry, JournalTemplate, JournalStreak, AIPrompt, JournalBlock } from '../types/journal';

interface JournalPageProps {
  userId: string;
  trades?: any[];
}

export default function JournalPage({ userId, trades = [] }: JournalPageProps) {
  const { isMobile, isTablet } = useResponsive();

  // State
  const [entries, setEntries] = useState<JournalEntry[]>([]);
  const [selectedEntry, setSelectedEntry] = useState<JournalEntry | null>(null);
  const [templates, setTemplates] = useState<JournalTemplate[]>([]);
  const [streak, setStreak] = useState<JournalStreak | null>(null);
  const [aiPrompts, setAIPrompts] = useState<AIPrompt[]>([]);

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [showTemplateModal, setShowTemplateModal] = useState(false);

  // Mobile view state
  const [mobileView, setMobileView] = useState<'list' | 'editor' | 'widgets'>('list');

  // Load initial data
  useEffect(() => {
    if (userId) {
      loadData();
    }
  }, [userId]);

  async function loadData() {
    setLoading(true);
    try {
      // Load each independently so one failure doesn't break everything
      const [entriesRes, templatesRes, streakRes, promptsRes] = await Promise.allSettled([
        journalApi.getEntries(userId, { limit: 50 }),
        journalApi.getTemplates(userId),
        journalApi.getStreak(userId),
        journalApi.getAIPrompts(userId),
      ]);

      if (entriesRes.status === 'fulfilled') {
        setEntries(entriesRes.value.entries || []);
        if (entriesRes.value.entries?.length > 0 && !selectedEntry) {
          setSelectedEntry(entriesRes.value.entries[0]);
        }
      }
      if (templatesRes.status === 'fulfilled') {
        setTemplates(templatesRes.value.templates || []);
      }
      if (streakRes.status === 'fulfilled') {
        setStreak(streakRes.value);
      }
      if (promptsRes.status === 'fulfilled') {
        setAIPrompts(promptsRes.value.prompts || []);
      }
    } catch (err) {
      console.error('Failed to load journal data:', err);
    } finally {
      setLoading(false);
    }
  }

  async function handleCreateEntry(templateId?: string) {
    try {
      const template = templateId
        ? templates.find((t) => t.id === templateId)
        : null;

      const entry = await journalApi.createEntry(userId, {
        title: template ? template.name : 'Untitled Entry',
        content: template ? template.content : [
          { id: crypto.randomUUID(), type: 'paragraph', content: '' }
        ],
        template_id: templateId,
        entry_date: new Date().toISOString().split('T')[0],
      });

      setEntries((prev) => [entry, ...prev]);
      setSelectedEntry(entry);
      setShowTemplateModal(false);

      if (isMobile) {
        setMobileView('editor');
      }

      // Refresh streak
      journalApi.checkStreak(userId).then(setStreak);
    } catch (err) {
      console.error('Failed to create entry:', err);
    }
  }

  async function handleUpdateEntry(entryId: string, updates: Partial<JournalEntry>) {
    setSaving(true);
    try {
      const updated = await journalApi.updateEntry(userId, entryId, {
        title: updates.title,
        content: updates.content as JournalBlock[],
        pre_trade_mood: updates.pre_trade_mood,
        post_trade_mood: updates.post_trade_mood,
        mood_notes: updates.mood_notes,
      });

      setEntries((prev) =>
        prev.map((e) => (e.id === entryId ? updated : e))
      );
      setSelectedEntry(updated);
    } catch (err) {
      console.error('Failed to update entry:', err);
    } finally {
      setSaving(false);
    }
  }

  async function handleDeleteEntry(entryId: string) {
    try {
      await journalApi.deleteEntry(userId, entryId);
      setEntries((prev) => prev.filter((e) => e.id !== entryId));

      if (selectedEntry?.id === entryId) {
        setSelectedEntry(entries.find((e) => e.id !== entryId) || null);
      }
    } catch (err) {
      console.error('Failed to delete entry:', err);
    }
  }

  async function handleTogglePin(entryId: string) {
    try {
      const result = await journalApi.togglePin(userId, entryId);
      setEntries((prev) =>
        prev.map((e) => (e.id === entryId ? { ...e, is_pinned: result.is_pinned } : e))
      );
      if (selectedEntry?.id === entryId) {
        setSelectedEntry((prev) => prev ? { ...prev, is_pinned: result.is_pinned } : null);
      }
    } catch (err) {
      console.error('Failed to toggle pin:', err);
    }
  }

  async function handleToggleFavorite(entryId: string) {
    try {
      const result = await journalApi.toggleFavorite(userId, entryId);
      setEntries((prev) =>
        prev.map((e) => (e.id === entryId ? { ...e, is_favorite: result.is_favorite } : e))
      );
      if (selectedEntry?.id === entryId) {
        setSelectedEntry((prev) => prev ? { ...prev, is_favorite: result.is_favorite } : null);
      }
    } catch (err) {
      console.error('Failed to toggle favorite:', err);
    }
  }

  function handleSelectEntry(entry: JournalEntry) {
    setSelectedEntry(entry);
    if (isMobile) {
      setMobileView('editor');
    }
  }

  function handlePromptClick(prompt: AIPrompt) {
    handleCreateEntry().then(() => {
      // After creating, update the content with the prompt
      if (selectedEntry) {
        handleUpdateEntry(selectedEntry.id, {
          content: [
            { id: crypto.randomUUID(), type: 'heading2', content: prompt.prompt },
            { id: crypto.randomUUID(), type: 'paragraph', content: '' },
          ],
        });
      }
    });
  }

  if (loading) {
    return (
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          height: 'calc(100vh - 60px)',
          backgroundColor: '#1D1A16',
          color: '#F7E7C6',
        }}
      >
        <div style={{ textAlign: 'center' }}>
          <div style={{ fontSize: '24px', marginBottom: '12px' }}>Loading Journal...</div>
          <div style={{ color: '#8B7355' }}>Preparing your trading journal</div>
        </div>
      </div>
    );
  }

  // Mobile Layout
  if (isMobile) {
    return (
      <div style={{ height: 'calc(100vh - 60px)', backgroundColor: '#1D1A16' }}>
        {/* Mobile Navigation Tabs */}
        <div
          style={{
            display: 'flex',
            borderBottom: '1px solid rgba(212, 165, 69, 0.15)',
            backgroundColor: '#251E17',
          }}
        >
          {['list', 'editor', 'widgets'].map((view) => (
            <button
              key={view}
              onClick={() => setMobileView(view as typeof mobileView)}
              style={{
                flex: 1,
                padding: '12px',
                backgroundColor: mobileView === view ? 'rgba(245, 199, 109, 0.1)' : 'transparent',
                border: 'none',
                borderBottom: mobileView === view ? '2px solid #F5C76D' : '2px solid transparent',
                color: mobileView === view ? '#F5C76D' : '#8B7355',
                fontSize: '14px',
                fontWeight: 600,
                cursor: 'pointer',
                textTransform: 'capitalize',
              }}
            >
              {view === 'list' ? 'Entries' : view === 'editor' ? 'Editor' : 'Insights'}
            </button>
          ))}
        </div>

        {/* Mobile Content */}
        <div style={{ height: 'calc(100% - 48px)', overflow: 'auto' }}>
          {mobileView === 'list' && (
            <JournalSidebar
              entries={entries}
              selectedEntry={selectedEntry}
              onSelectEntry={handleSelectEntry}
              onCreateEntry={() => setShowTemplateModal(true)}
              onDeleteEntry={handleDeleteEntry}
              onTogglePin={handleTogglePin}
              onToggleFavorite={handleToggleFavorite}
            />
          )}
          {mobileView === 'editor' && (
            <JournalEditor
              entry={selectedEntry}
              onUpdate={handleUpdateEntry}
              saving={saving}
              trades={trades}
              userId={userId}
            />
          )}
          {mobileView === 'widgets' && (
            <JournalWidgets
              userId={userId}
              streak={streak}
              aiPrompts={aiPrompts}
              onPromptClick={handlePromptClick}
            />
          )}
        </div>

        {/* Template Modal */}
        <TemplatePickerModal
          isOpen={showTemplateModal}
          templates={templates}
          onClose={() => setShowTemplateModal(false)}
          onSelectTemplate={(id) => handleCreateEntry(id)}
          onCreateBlank={() => handleCreateEntry()}
        />
      </div>
    );
  }

  // Desktop/Tablet Layout - 3 columns
  return (
    <div
      style={{
        display: 'flex',
        height: 'calc(100vh - 60px)',
        backgroundColor: '#1D1A16',
        overflow: 'hidden',
      }}
    >
      {/* Left Sidebar - Entry List */}
      <div
        style={{
          width: isTablet ? '240px' : '280px',
          borderRight: '1px solid rgba(212, 165, 69, 0.15)',
          flexShrink: 0,
          display: 'flex',
          flexDirection: 'column',
          backgroundColor: '#251E17',
        }}
      >
        <JournalSidebar
          entries={entries}
          selectedEntry={selectedEntry}
          onSelectEntry={handleSelectEntry}
          onCreateEntry={() => setShowTemplateModal(true)}
          onDeleteEntry={handleDeleteEntry}
          onTogglePin={handleTogglePin}
          onToggleFavorite={handleToggleFavorite}
        />
      </div>

      {/* Center - Editor */}
      <div
        style={{
          flex: 1,
          display: 'flex',
          flexDirection: 'column',
          overflow: 'hidden',
        }}
      >
        <JournalEditor
          entry={selectedEntry}
          onUpdate={handleUpdateEntry}
          saving={saving}
          trades={trades}
          userId={userId}
        />
      </div>

      {/* Right Sidebar - Widgets */}
      {!isTablet && (
        <div
          style={{
            width: '300px',
            borderLeft: '1px solid rgba(212, 165, 69, 0.15)',
            flexShrink: 0,
            overflow: 'auto',
            backgroundColor: '#251E17',
          }}
        >
          <JournalWidgets
            userId={userId}
            streak={streak}
            aiPrompts={aiPrompts}
            onPromptClick={handlePromptClick}
          />
        </div>
      )}

      {/* Template Modal */}
      <TemplatePickerModal
        isOpen={showTemplateModal}
        templates={templates}
        onClose={() => setShowTemplateModal(false)}
        onSelectTemplate={(id) => handleCreateEntry(id)}
        onCreateBlank={() => handleCreateEntry()}
      />
    </div>
  );
}
