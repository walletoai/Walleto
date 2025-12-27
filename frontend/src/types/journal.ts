/**
 * Journal Types
 * Type definitions for the trading journal feature
 */

// Block types for Notion-style editor
export type BlockType =
  | 'paragraph'
  | 'heading1'
  | 'heading2'
  | 'heading3'
  | 'bullet_list'
  | 'numbered_list'
  | 'checklist'
  | 'quote'
  | 'callout'
  | 'divider'
  | 'trade_card'
  | 'stats_widget'
  | 'image';

export interface JournalBlock {
  id: string;
  type: BlockType;
  content: string;
  properties?: Record<string, unknown>;
  children?: JournalBlock[];
  checked?: boolean; // For checklist items
}

// Entry types
export type EntryType = 'general' | 'pre_trade' | 'post_trade' | 'weekly' | 'lesson';

// Mood types
export type MoodType =
  | 'confident'
  | 'excited'
  | 'neutral'
  | 'anxious'
  | 'fearful'
  | 'fomo'
  | 'revenge'
  | 'frustrated'
  | 'calm'
  | 'focused';

export interface JournalEntry {
  id: string;
  user_id: string;
  title: string;
  content: JournalBlock[];
  template_id?: string;
  pre_trade_mood?: MoodType;
  post_trade_mood?: MoodType;
  mood_notes?: string;
  entry_type: EntryType;
  is_pinned: boolean;
  is_favorite: boolean;
  word_count: number;
  ai_summary?: string;
  entry_date: string;
  created_at: string;
  updated_at: string;
  journal_trade_links?: TradeLink[];
}

export interface TradeLink {
  id: string;
  journal_entry_id: string;
  trade_id: string;
  link_context?: string;
  created_at: string;
}

export interface JournalTemplate {
  id: string;
  user_id?: string;
  name: string;
  description?: string;
  content: JournalBlock[];
  category: string;
  is_system: boolean;
  usage_count: number;
  created_at: string;
}

export interface MoodRecord {
  id: string;
  user_id: string;
  mood: MoodType;
  mood_intensity: number;
  context?: string;
  journal_entry_id?: string;
  recorded_at: string;
}

export interface MoodHeatmapData {
  heatmap_data: Record<string, Array<{
    mood: MoodType;
    intensity: number;
    context?: string;
  }>>;
  mood_distribution: Record<MoodType, number>;
  total_records: number;
  start_date: string;
  end_date: string;
}

export interface MoodAnalytics {
  average_mood_score: number;
  total_mood_entries: number;
  pre_trade_average: number;
  post_trade_average: number;
  mood_improvement_after_trade: number;
  most_common_mood?: MoodType;
}

export interface JournalStreak {
  user_id: string;
  current_streak: number;
  longest_streak: number;
  last_entry_date?: string;
  total_entries: number;
  total_words: number;
  is_active?: boolean;
  days_since_last_entry?: number;
}

export interface AIPrompt {
  type: string;
  prompt: string;
  priority: 'high' | 'medium' | 'low';
  related_trade_id?: string;
}

// API Response types
export interface EntryListResponse {
  entries: JournalEntry[];
  total: number;
  limit: number;
  offset: number;
}

export interface TemplateListResponse {
  templates: JournalTemplate[];
  total: number;
}

export interface AIPromptsResponse {
  prompts: AIPrompt[];
}

// Create/Update request types
export interface CreateEntryRequest {
  title?: string;
  content?: JournalBlock[];
  entry_type?: EntryType;
  template_id?: string;
  pre_trade_mood?: MoodType;
  post_trade_mood?: MoodType;
  mood_notes?: string;
  entry_date?: string;
}

export interface UpdateEntryRequest {
  title?: string;
  content?: JournalBlock[];
  entry_type?: EntryType;
  pre_trade_mood?: MoodType;
  post_trade_mood?: MoodType;
  mood_notes?: string;
  ai_summary?: string;
}

export interface CreateTemplateRequest {
  name: string;
  content: JournalBlock[];
  description?: string;
  category?: string;
}

export interface RecordMoodRequest {
  mood: MoodType;
  context?: string;
  entry_id?: string;
  intensity?: number;
  notes?: string;
}

// Mood info for UI
export const MOOD_INFO: Record<MoodType, { emoji: string; label: string; color: string }> = {
  confident: { emoji: '💪', label: 'Confident', color: '#22c55e' },
  excited: { emoji: '🔥', label: 'Excited', color: '#f97316' },
  neutral: { emoji: '😐', label: 'Neutral', color: '#8B7355' },
  calm: { emoji: '😌', label: 'Calm', color: '#3b82f6' },
  focused: { emoji: '🎯', label: 'Focused', color: '#8b5cf6' },
  anxious: { emoji: '😰', label: 'Anxious', color: '#eab308' },
  fearful: { emoji: '😨', label: 'Fearful', color: '#ef4444' },
  fomo: { emoji: '😫', label: 'FOMO', color: '#f59e0b' },
  revenge: { emoji: '😤', label: 'Revenge Trading', color: '#dc2626' },
  frustrated: { emoji: '😠', label: 'Frustrated', color: '#b91c1c' },
};

// Block type info for editor
export const BLOCK_INFO: Record<BlockType, { icon: string; label: string; shortcut?: string }> = {
  paragraph: { icon: '¶', label: 'Text', shortcut: '/text' },
  heading1: { icon: 'H1', label: 'Heading 1', shortcut: '/h1' },
  heading2: { icon: 'H2', label: 'Heading 2', shortcut: '/h2' },
  heading3: { icon: 'H3', label: 'Heading 3', shortcut: '/h3' },
  bullet_list: { icon: '•', label: 'Bullet List', shortcut: '/bullet' },
  numbered_list: { icon: '1.', label: 'Numbered List', shortcut: '/numbered' },
  checklist: { icon: '☑', label: 'Checklist', shortcut: '/checklist' },
  quote: { icon: '"', label: 'Quote', shortcut: '/quote' },
  callout: { icon: '💡', label: 'Callout', shortcut: '/callout' },
  divider: { icon: '—', label: 'Divider', shortcut: '/divider' },
  trade_card: { icon: '📈', label: 'Trade Card', shortcut: '/trade' },
  stats_widget: { icon: '📊', label: 'Stats Widget', shortcut: '/stats' },
  image: { icon: '🖼', label: 'Image', shortcut: '/image' },
};
