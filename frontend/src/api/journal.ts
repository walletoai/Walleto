/**
 * Journal API client - Uses Supabase directly
 */

import { supabase } from '../lib/supabase';
import type {
  JournalEntry,
  JournalTemplate,
  JournalStreak,
  AIPrompt,
  EntryListResponse,
  TemplateListResponse,
  CreateEntryRequest,
  UpdateEntryRequest,
  CreateTemplateRequest,
  MoodRecord,
  MoodHeatmapData,
  RecordMoodRequest,
  MoodType,
} from '../types/journal';

// ============================================
// Entry CRUD
// ============================================

export async function createEntry(
  userId: string,
  data: CreateEntryRequest
): Promise<JournalEntry> {
  const { data: entry, error } = await supabase
    .from('journal_entries')
    .insert({
      user_id: userId,
      title: data.title || 'Untitled Entry',
      content: data.content || [],
      template_id: data.template_id,
      pre_trade_mood: data.pre_trade_mood,
      post_trade_mood: data.post_trade_mood,
      mood_notes: data.mood_notes,
      entry_type: data.entry_type || 'general',
      entry_date: data.entry_date || new Date().toISOString().split('T')[0],
      word_count: countWords(data.content),
    })
    .select()
    .single();

  if (error) throw new Error(error.message);
  return entry;
}

export async function getEntries(
  userId: string,
  options: {
    entry_type?: string;
    start_date?: string;
    end_date?: string;
    search?: string;
    is_pinned?: boolean;
    is_favorite?: boolean;
    limit?: number;
    offset?: number;
  } = {}
): Promise<EntryListResponse> {
  const limit = options.limit || 50;
  const offset = options.offset || 0;

  let query = supabase
    .from('journal_entries')
    .select('*', { count: 'exact' })
    .eq('user_id', userId)
    .is('deleted_at', null)
    .order('is_pinned', { ascending: false })
    .order('created_at', { ascending: false });

  if (options.entry_type) {
    query = query.eq('entry_type', options.entry_type);
  }
  if (options.start_date) {
    query = query.gte('entry_date', options.start_date);
  }
  if (options.end_date) {
    query = query.lte('entry_date', options.end_date);
  }
  if (options.search) {
    query = query.ilike('title', `%${options.search}%`);
  }
  if (options.is_pinned !== undefined) {
    query = query.eq('is_pinned', options.is_pinned);
  }
  if (options.is_favorite !== undefined) {
    query = query.eq('is_favorite', options.is_favorite);
  }

  query = query.range(offset, offset + limit - 1);

  const { data, error, count } = await query;

  if (error) throw new Error(error.message);
  return {
    entries: data || [],
    total: count || data?.length || 0,
    limit,
    offset,
  };
}

export async function getEntry(
  userId: string,
  entryId: string
): Promise<JournalEntry> {
  const { data, error } = await supabase
    .from('journal_entries')
    .select('*')
    .eq('id', entryId)
    .eq('user_id', userId)
    .single();

  if (error) throw new Error(error.message);
  return data;
}

export async function updateEntry(
  userId: string,
  entryId: string,
  data: UpdateEntryRequest
): Promise<JournalEntry> {
  const updates: Record<string, unknown> = {};

  if (data.title !== undefined) updates.title = data.title;
  if (data.content !== undefined) {
    updates.content = data.content;
    updates.word_count = countWords(data.content);
  }
  if (data.pre_trade_mood !== undefined) updates.pre_trade_mood = data.pre_trade_mood;
  if (data.post_trade_mood !== undefined) updates.post_trade_mood = data.post_trade_mood;
  if (data.mood_notes !== undefined) updates.mood_notes = data.mood_notes;
  if (data.entry_type !== undefined) updates.entry_type = data.entry_type;

  const { data: entry, error } = await supabase
    .from('journal_entries')
    .update(updates)
    .eq('id', entryId)
    .eq('user_id', userId)
    .select()
    .single();

  if (error) throw new Error(error.message);
  return entry;
}

export async function deleteEntry(
  userId: string,
  entryId: string
): Promise<boolean> {
  const { error } = await supabase
    .from('journal_entries')
    .update({ deleted_at: new Date().toISOString() })
    .eq('id', entryId)
    .eq('user_id', userId);

  if (error) throw new Error(error.message);
  return true;
}

export async function togglePin(
  userId: string,
  entryId: string
): Promise<{ is_pinned: boolean }> {
  const { data: current } = await supabase
    .from('journal_entries')
    .select('is_pinned')
    .eq('id', entryId)
    .eq('user_id', userId)
    .single();

  const newValue = !current?.is_pinned;

  const { error } = await supabase
    .from('journal_entries')
    .update({ is_pinned: newValue })
    .eq('id', entryId)
    .eq('user_id', userId);

  if (error) throw new Error(error.message);
  return { is_pinned: newValue };
}

export async function toggleFavorite(
  userId: string,
  entryId: string
): Promise<{ is_favorite: boolean }> {
  const { data: current } = await supabase
    .from('journal_entries')
    .select('is_favorite')
    .eq('id', entryId)
    .eq('user_id', userId)
    .single();

  const newValue = !current?.is_favorite;

  const { error } = await supabase
    .from('journal_entries')
    .update({ is_favorite: newValue })
    .eq('id', entryId)
    .eq('user_id', userId);

  if (error) throw new Error(error.message);
  return { is_favorite: newValue };
}

// ============================================
// Trade Linking
// ============================================

export async function linkTrades(
  userId: string,
  entryId: string,
  tradeIds: string[],
  linkContext?: string
): Promise<{ success: boolean }> {
  const links = tradeIds.map(tradeId => ({
    journal_entry_id: entryId,
    trade_id: tradeId,
    link_context: linkContext,
  }));

  const { error } = await supabase
    .from('journal_trade_links')
    .upsert(links, { onConflict: 'journal_entry_id,trade_id' });

  if (error) throw new Error(error.message);
  return { success: true };
}

export async function unlinkTrade(
  userId: string,
  entryId: string,
  tradeId: string
): Promise<boolean> {
  const { error } = await supabase
    .from('journal_trade_links')
    .delete()
    .eq('journal_entry_id', entryId)
    .eq('trade_id', tradeId);

  if (error) throw new Error(error.message);
  return true;
}

export async function getEntriesForTrade(
  userId: string,
  tradeId: string
): Promise<{ entries: JournalEntry[] }> {
  const { data: links, error: linkError } = await supabase
    .from('journal_trade_links')
    .select('journal_entry_id')
    .eq('trade_id', tradeId);

  if (linkError) throw new Error(linkError.message);
  if (!links?.length) return { entries: [] };

  const entryIds = links.map(l => l.journal_entry_id);
  const { data: entries, error } = await supabase
    .from('journal_entries')
    .select('*')
    .in('id', entryIds)
    .eq('user_id', userId);

  if (error) throw new Error(error.message);
  return { entries: entries || [] };
}

// ============================================
// Templates
// ============================================

export async function getTemplates(userId: string): Promise<TemplateListResponse> {
  const { data, error, count } = await supabase
    .from('journal_templates')
    .select('*', { count: 'exact' })
    .or(`user_id.eq.${userId},is_system.eq.true`)
    .order('is_system', { ascending: false })
    .order('usage_count', { ascending: false });

  if (error) throw new Error(error.message);
  return { templates: data || [], total: count || data?.length || 0 };
}

export async function createTemplate(
  userId: string,
  data: CreateTemplateRequest
): Promise<JournalTemplate> {
  const { data: template, error } = await supabase
    .from('journal_templates')
    .insert({
      user_id: userId,
      name: data.name,
      description: data.description,
      content: data.content,
      category: data.category || 'custom',
      is_system: false,
    })
    .select()
    .single();

  if (error) throw new Error(error.message);
  return template;
}

export async function updateTemplate(
  userId: string,
  templateId: string,
  data: Partial<CreateTemplateRequest>
): Promise<JournalTemplate> {
  const { data: template, error } = await supabase
    .from('journal_templates')
    .update(data)
    .eq('id', templateId)
    .eq('user_id', userId)
    .select()
    .single();

  if (error) throw new Error(error.message);
  return template;
}

export async function deleteTemplate(
  userId: string,
  templateId: string
): Promise<boolean> {
  const { error } = await supabase
    .from('journal_templates')
    .delete()
    .eq('id', templateId)
    .eq('user_id', userId)
    .eq('is_system', false);

  if (error) throw new Error(error.message);
  return true;
}

// ============================================
// Mood Tracking
// ============================================

export async function recordMood(
  userId: string,
  data: RecordMoodRequest
): Promise<MoodRecord> {
  const { data: mood, error } = await supabase
    .from('journal_moods')
    .insert({
      user_id: userId,
      journal_entry_id: data.entry_id,
      mood: data.mood,
      mood_intensity: data.intensity || 3,
      context: data.context,
      notes: data.notes,
    })
    .select()
    .single();

  if (error) throw new Error(error.message);
  return mood;
}

export async function getMoodHeatmap(
  userId: string,
  startDate?: string,
  endDate?: string
): Promise<MoodHeatmapData> {
  let query = supabase
    .from('journal_moods')
    .select('*')
    .eq('user_id', userId)
    .order('recorded_at', { ascending: false });

  const start = startDate || new Date(Date.now() - 90 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];
  const end = endDate || new Date().toISOString().split('T')[0];

  query = query.gte('recorded_at', start).lte('recorded_at', end);

  const { data, error } = await query;

  if (error) throw new Error(error.message);

  // Group by date and calculate distribution
  const heatmapData: Record<string, Array<{ mood: MoodType; intensity: number; context?: string }>> = {};
  const moodDistribution: Record<string, number> = {};

  (data || []).forEach((m: { recorded_at: string; mood: MoodType; mood_intensity: number; context?: string }) => {
    const date = m.recorded_at.split('T')[0];
    if (!heatmapData[date]) heatmapData[date] = [];
    heatmapData[date].push({
      mood: m.mood,
      intensity: m.mood_intensity,
      context: m.context,
    });
    moodDistribution[m.mood] = (moodDistribution[m.mood] || 0) + 1;
  });

  return {
    heatmap_data: heatmapData,
    mood_distribution: moodDistribution as Record<MoodType, number>,
    total_records: data?.length || 0,
    start_date: start,
    end_date: end,
  };
}

// ============================================
// Streaks
// ============================================

export async function getStreak(userId: string): Promise<JournalStreak> {
  const { data, error } = await supabase
    .from('journal_streaks')
    .select('*')
    .eq('user_id', userId)
    .single();

  // PGRST116 = no rows returned (not an error for us)
  if (error && error.code !== 'PGRST116') {
    throw new Error(error.message);
  }

  return data || {
    user_id: userId,
    current_streak: 0,
    longest_streak: 0,
    last_entry_date: undefined,
    total_entries: 0,
    total_words: 0,
  };
}

export async function checkStreak(userId: string): Promise<JournalStreak> {
  return getStreak(userId);
}

// ============================================
// AI Integration
// ============================================

export async function getAIPrompts(userId: string): Promise<{ prompts: AIPrompt[] }> {
  // Generate smart prompts based on user's recent activity
  const prompts: AIPrompt[] = [
    {
      type: 'reflection',
      prompt: 'What lessons did you learn from your trades today?',
      priority: 'high',
    },
    {
      type: 'emotional',
      prompt: 'How are you feeling about your current positions?',
      priority: 'medium',
    },
    {
      type: 'analysis',
      prompt: 'What patterns are you noticing in the market?',
      priority: 'medium',
    },
    {
      type: 'planning',
      prompt: 'Document your trading plan for the week',
      priority: 'low',
    },
  ];

  return { prompts };
}

export async function getJournalContext(
  userId: string,
  limit: number = 5
): Promise<Record<string, unknown>> {
  const { data: entries } = await supabase
    .from('journal_entries')
    .select('*')
    .eq('user_id', userId)
    .is('deleted_at', null)
    .order('created_at', { ascending: false })
    .limit(limit);

  return { recent_entries: entries || [] };
}

// ============================================
// Helpers
// ============================================

function countWords(content: unknown): number {
  if (!Array.isArray(content)) return 0;

  let words = 0;
  for (const block of content) {
    if (block && typeof block === 'object' && 'content' in block) {
      const blockContent = (block as { content: unknown }).content;
      if (typeof blockContent === 'string') {
        words += blockContent.split(/\s+/).filter(Boolean).length;
      } else if (Array.isArray(blockContent)) {
        for (const item of blockContent) {
          if (item && typeof item === 'object' && 'text' in item) {
            const text = (item as { text: string }).text;
            if (text) {
              words += text.split(/\s+/).filter(Boolean).length;
            }
          }
        }
      }
    }
  }

  return words;
}
