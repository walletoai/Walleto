-- JOURNAL SYSTEM - CLEAN MIGRATION
-- Run this entire file in Supabase SQL Editor

-- TABLES
CREATE TABLE IF NOT EXISTS journal_templates (id UUID PRIMARY KEY DEFAULT gen_random_uuid(), user_id TEXT, name VARCHAR(100) NOT NULL, description TEXT, content JSONB NOT NULL DEFAULT '[]', category VARCHAR(50) DEFAULT 'custom', is_system BOOLEAN DEFAULT FALSE, usage_count INTEGER DEFAULT 0, created_at TIMESTAMPTZ DEFAULT NOW(), updated_at TIMESTAMPTZ DEFAULT NOW());

CREATE TABLE IF NOT EXISTS journal_entries (id UUID PRIMARY KEY DEFAULT gen_random_uuid(), user_id TEXT NOT NULL, title VARCHAR(255) DEFAULT 'Untitled Entry', content JSONB NOT NULL DEFAULT '[]', template_id UUID REFERENCES journal_templates(id) ON DELETE SET NULL, pre_trade_mood VARCHAR(50), post_trade_mood VARCHAR(50), mood_notes TEXT, entry_type VARCHAR(50) DEFAULT 'general', is_pinned BOOLEAN DEFAULT FALSE, is_favorite BOOLEAN DEFAULT FALSE, word_count INTEGER DEFAULT 0, ai_summary TEXT, ai_detected_patterns JSONB DEFAULT '[]', entry_date DATE NOT NULL DEFAULT CURRENT_DATE, created_at TIMESTAMPTZ DEFAULT NOW(), updated_at TIMESTAMPTZ DEFAULT NOW(), deleted_at TIMESTAMPTZ);

CREATE TABLE IF NOT EXISTS journal_trade_links (id UUID PRIMARY KEY DEFAULT gen_random_uuid(), journal_entry_id UUID NOT NULL REFERENCES journal_entries(id) ON DELETE CASCADE, trade_id TEXT NOT NULL, link_context TEXT, created_at TIMESTAMPTZ DEFAULT NOW(), UNIQUE(journal_entry_id, trade_id));

CREATE TABLE IF NOT EXISTS journal_moods (id UUID PRIMARY KEY DEFAULT gen_random_uuid(), user_id TEXT NOT NULL, journal_entry_id UUID REFERENCES journal_entries(id) ON DELETE SET NULL, mood VARCHAR(50) NOT NULL, mood_intensity INTEGER CHECK (mood_intensity BETWEEN 1 AND 5), context VARCHAR(50), notes TEXT, recorded_at TIMESTAMPTZ DEFAULT NOW());

CREATE TABLE IF NOT EXISTS journal_streaks (user_id TEXT PRIMARY KEY, current_streak INTEGER DEFAULT 0, longest_streak INTEGER DEFAULT 0, last_entry_date DATE, total_entries INTEGER DEFAULT 0, total_words INTEGER DEFAULT 0, updated_at TIMESTAMPTZ DEFAULT NOW());

-- INDEXES
CREATE INDEX IF NOT EXISTS idx_journal_entries_user_id ON journal_entries(user_id);
CREATE INDEX IF NOT EXISTS idx_journal_entries_entry_date ON journal_entries(entry_date DESC);
CREATE INDEX IF NOT EXISTS idx_journal_entries_entry_type ON journal_entries(entry_type);
CREATE INDEX IF NOT EXISTS idx_journal_entries_deleted ON journal_entries(deleted_at) WHERE deleted_at IS NULL;
CREATE INDEX IF NOT EXISTS idx_journal_trade_links_entry ON journal_trade_links(journal_entry_id);
CREATE INDEX IF NOT EXISTS idx_journal_trade_links_trade ON journal_trade_links(trade_id);
CREATE INDEX IF NOT EXISTS idx_journal_moods_user_date ON journal_moods(user_id, recorded_at DESC);
CREATE INDEX IF NOT EXISTS idx_journal_templates_user ON journal_templates(user_id);
CREATE INDEX IF NOT EXISTS idx_journal_templates_system ON journal_templates(is_system) WHERE is_system = TRUE;

-- RLS
ALTER TABLE journal_entries ENABLE ROW LEVEL SECURITY;
ALTER TABLE journal_trade_links ENABLE ROW LEVEL SECURITY;
ALTER TABLE journal_templates ENABLE ROW LEVEL SECURITY;
ALTER TABLE journal_moods ENABLE ROW LEVEL SECURITY;
ALTER TABLE journal_streaks ENABLE ROW LEVEL SECURITY;

-- POLICIES
DROP POLICY IF EXISTS "journal_entries_select" ON journal_entries;
DROP POLICY IF EXISTS "journal_entries_insert" ON journal_entries;
DROP POLICY IF EXISTS "journal_entries_update" ON journal_entries;
DROP POLICY IF EXISTS "journal_entries_delete" ON journal_entries;
CREATE POLICY "journal_entries_select" ON journal_entries FOR SELECT USING (user_id::text = (select auth.uid())::text OR (select auth.role()) = 'service_role');
CREATE POLICY "journal_entries_insert" ON journal_entries FOR INSERT WITH CHECK (user_id::text = (select auth.uid())::text OR (select auth.role()) = 'service_role');
CREATE POLICY "journal_entries_update" ON journal_entries FOR UPDATE USING (user_id::text = (select auth.uid())::text OR (select auth.role()) = 'service_role');
CREATE POLICY "journal_entries_delete" ON journal_entries FOR DELETE USING (user_id::text = (select auth.uid())::text OR (select auth.role()) = 'service_role');

DROP POLICY IF EXISTS "journal_trade_links_all" ON journal_trade_links;
CREATE POLICY "journal_trade_links_all" ON journal_trade_links FOR ALL USING (EXISTS (SELECT 1 FROM journal_entries WHERE journal_entries.id = journal_trade_links.journal_entry_id AND (journal_entries.user_id::text = (select auth.uid())::text OR (select auth.role()) = 'service_role')));

DROP POLICY IF EXISTS "journal_templates_select" ON journal_templates;
DROP POLICY IF EXISTS "journal_templates_insert" ON journal_templates;
DROP POLICY IF EXISTS "journal_templates_update" ON journal_templates;
DROP POLICY IF EXISTS "journal_templates_delete" ON journal_templates;
CREATE POLICY "journal_templates_select" ON journal_templates FOR SELECT USING (is_system = TRUE OR user_id::text = (select auth.uid())::text OR (select auth.role()) = 'service_role');
CREATE POLICY "journal_templates_insert" ON journal_templates FOR INSERT WITH CHECK (user_id::text = (select auth.uid())::text OR (select auth.role()) = 'service_role');
CREATE POLICY "journal_templates_update" ON journal_templates FOR UPDATE USING (user_id::text = (select auth.uid())::text OR (select auth.role()) = 'service_role');
CREATE POLICY "journal_templates_delete" ON journal_templates FOR DELETE USING (user_id::text = (select auth.uid())::text OR (select auth.role()) = 'service_role');

DROP POLICY IF EXISTS "journal_moods_select" ON journal_moods;
DROP POLICY IF EXISTS "journal_moods_insert" ON journal_moods;
DROP POLICY IF EXISTS "journal_moods_update" ON journal_moods;
DROP POLICY IF EXISTS "journal_moods_delete" ON journal_moods;
CREATE POLICY "journal_moods_select" ON journal_moods FOR SELECT USING (user_id::text = (select auth.uid())::text OR (select auth.role()) = 'service_role');
CREATE POLICY "journal_moods_insert" ON journal_moods FOR INSERT WITH CHECK (user_id::text = (select auth.uid())::text OR (select auth.role()) = 'service_role');
CREATE POLICY "journal_moods_update" ON journal_moods FOR UPDATE USING (user_id::text = (select auth.uid())::text OR (select auth.role()) = 'service_role');
CREATE POLICY "journal_moods_delete" ON journal_moods FOR DELETE USING (user_id::text = (select auth.uid())::text OR (select auth.role()) = 'service_role');

DROP POLICY IF EXISTS "journal_streaks_select" ON journal_streaks;
DROP POLICY IF EXISTS "journal_streaks_insert" ON journal_streaks;
DROP POLICY IF EXISTS "journal_streaks_update" ON journal_streaks;
DROP POLICY IF EXISTS "journal_streaks_delete" ON journal_streaks;
CREATE POLICY "journal_streaks_select" ON journal_streaks FOR SELECT USING (user_id::text = (select auth.uid())::text OR (select auth.role()) = 'service_role');
CREATE POLICY "journal_streaks_insert" ON journal_streaks FOR INSERT WITH CHECK (user_id::text = (select auth.uid())::text OR (select auth.role()) = 'service_role');
CREATE POLICY "journal_streaks_update" ON journal_streaks FOR UPDATE USING (user_id::text = (select auth.uid())::text OR (select auth.role()) = 'service_role');
CREATE POLICY "journal_streaks_delete" ON journal_streaks FOR DELETE USING (user_id::text = (select auth.uid())::text OR (select auth.role()) = 'service_role');

-- FUNCTIONS
CREATE OR REPLACE FUNCTION update_journal_streak() RETURNS TRIGGER AS $func$ DECLARE current_date_val DATE := CURRENT_DATE; streak_record journal_streaks%ROWTYPE; BEGIN SELECT * INTO streak_record FROM journal_streaks WHERE user_id = NEW.user_id; IF NOT FOUND THEN INSERT INTO journal_streaks (user_id, current_streak, longest_streak, last_entry_date, total_entries, total_words) VALUES (NEW.user_id, 1, 1, current_date_val, 1, COALESCE(NEW.word_count, 0)); ELSE IF streak_record.last_entry_date = current_date_val THEN UPDATE journal_streaks SET total_words = total_words + COALESCE(NEW.word_count, 0), updated_at = NOW() WHERE user_id = NEW.user_id; ELSIF streak_record.last_entry_date = current_date_val - INTERVAL '1 day' THEN UPDATE journal_streaks SET current_streak = current_streak + 1, longest_streak = GREATEST(longest_streak, current_streak + 1), last_entry_date = current_date_val, total_entries = total_entries + 1, total_words = total_words + COALESCE(NEW.word_count, 0), updated_at = NOW() WHERE user_id = NEW.user_id; ELSE UPDATE journal_streaks SET current_streak = 1, last_entry_date = current_date_val, total_entries = total_entries + 1, total_words = total_words + COALESCE(NEW.word_count, 0), updated_at = NOW() WHERE user_id = NEW.user_id; END IF; END IF; RETURN NEW; END; $func$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE OR REPLACE FUNCTION update_journal_updated_at() RETURNS TRIGGER AS $func$ BEGIN NEW.updated_at = NOW(); RETURN NEW; END; $func$ LANGUAGE plpgsql;

-- TRIGGERS
DROP TRIGGER IF EXISTS trigger_update_journal_streak ON journal_entries;
CREATE TRIGGER trigger_update_journal_streak AFTER INSERT ON journal_entries FOR EACH ROW EXECUTE FUNCTION update_journal_streak();

DROP TRIGGER IF EXISTS trigger_journal_entries_updated ON journal_entries;
CREATE TRIGGER trigger_journal_entries_updated BEFORE UPDATE ON journal_entries FOR EACH ROW EXECUTE FUNCTION update_journal_updated_at();

DROP TRIGGER IF EXISTS trigger_journal_templates_updated ON journal_templates;
CREATE TRIGGER trigger_journal_templates_updated BEFORE UPDATE ON journal_templates FOR EACH ROW EXECUTE FUNCTION update_journal_updated_at();

-- TEMPLATES (simple empty content)
INSERT INTO journal_templates (id, user_id, name, description, content, category, is_system) VALUES ('a1b2c3d4-e5f6-7890-abcd-ef1234567890', NULL, 'Pre-Trade Analysis', 'Document your thesis before a trade', '[]'::jsonb, 'pre_trade', TRUE) ON CONFLICT (id) DO NOTHING;
INSERT INTO journal_templates (id, user_id, name, description, content, category, is_system) VALUES ('b2c3d4e5-f6a7-8901-bcde-f23456789012', NULL, 'Post-Trade Review', 'Review your trade execution', '[]'::jsonb, 'post_trade', TRUE) ON CONFLICT (id) DO NOTHING;
INSERT INTO journal_templates (id, user_id, name, description, content, category, is_system) VALUES ('c3d4e5f6-a7b8-9012-cdef-345678901234', NULL, 'Weekly Review', 'Weekly performance review', '[]'::jsonb, 'weekly', TRUE) ON CONFLICT (id) DO NOTHING;
INSERT INTO journal_templates (id, user_id, name, description, content, category, is_system) VALUES ('d4e5f6a7-b8c9-0123-defa-456789012345', NULL, 'Lesson Learned', 'Document a trading lesson', '[]'::jsonb, 'lesson', TRUE) ON CONFLICT (id) DO NOTHING;
INSERT INTO journal_templates (id, user_id, name, description, content, category, is_system) VALUES ('e5f6a7b8-c9d0-1234-efab-567890123456', NULL, 'Quick Mood Check', 'Fast emotional check-in', '[]'::jsonb, 'mood', TRUE) ON CONFLICT (id) DO NOTHING;
