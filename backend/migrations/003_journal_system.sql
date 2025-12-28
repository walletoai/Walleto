-- Journal System Migration
-- Comprehensive trading journal with Notion-style blocks, mood tracking, and AI integration

-- ================================================
-- JOURNAL TEMPLATES (must be created first for FK)
-- ================================================
CREATE TABLE IF NOT EXISTS journal_templates (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id TEXT,  -- NULL for system templates
    name VARCHAR(100) NOT NULL,
    description TEXT,
    content JSONB NOT NULL DEFAULT '[]',
    category VARCHAR(50) DEFAULT 'custom',  -- pre_trade, post_trade, review, daily, weekly, custom
    is_system BOOLEAN DEFAULT FALSE,
    usage_count INTEGER DEFAULT 0,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- ================================================
-- JOURNAL ENTRIES (main table)
-- ================================================
CREATE TABLE IF NOT EXISTS journal_entries (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id TEXT NOT NULL,
    title VARCHAR(255) DEFAULT 'Untitled Entry',
    content JSONB NOT NULL DEFAULT '[]',  -- Notion-style block structure
    template_id UUID REFERENCES journal_templates(id) ON DELETE SET NULL,

    -- Mood tracking
    pre_trade_mood VARCHAR(50),      -- excited, confident, anxious, fearful, neutral, fomo, revenge
    post_trade_mood VARCHAR(50),
    mood_notes TEXT,

    -- Metadata
    entry_type VARCHAR(50) DEFAULT 'general',  -- general, pre_trade, post_trade, trade_review, weekly_review, lesson_learned
    is_pinned BOOLEAN DEFAULT FALSE,
    is_favorite BOOLEAN DEFAULT FALSE,
    word_count INTEGER DEFAULT 0,

    -- AI-related
    ai_summary TEXT,
    ai_detected_patterns JSONB DEFAULT '[]',

    -- Timestamps
    entry_date DATE NOT NULL DEFAULT CURRENT_DATE,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    deleted_at TIMESTAMPTZ  -- Soft delete
);

-- ================================================
-- JOURNAL TRADE LINKS (many-to-many)
-- ================================================
CREATE TABLE IF NOT EXISTS journal_trade_links (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    journal_entry_id UUID NOT NULL REFERENCES journal_entries(id) ON DELETE CASCADE,
    trade_id TEXT NOT NULL,  -- References trades table
    link_context TEXT,       -- Why linked: "review", "mistake", "win", "lesson"
    created_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(journal_entry_id, trade_id)
);

-- ================================================
-- JOURNAL MOODS (for heatmap visualization)
-- ================================================
CREATE TABLE IF NOT EXISTS journal_moods (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id TEXT NOT NULL,
    journal_entry_id UUID REFERENCES journal_entries(id) ON DELETE SET NULL,
    mood VARCHAR(50) NOT NULL,
    mood_intensity INTEGER CHECK (mood_intensity BETWEEN 1 AND 5),
    context VARCHAR(50),  -- pre_trade, post_trade, morning, evening, general
    notes TEXT,
    recorded_at TIMESTAMPTZ DEFAULT NOW()
);

-- ================================================
-- JOURNAL STREAKS (gamification)
-- ================================================
CREATE TABLE IF NOT EXISTS journal_streaks (
    user_id TEXT PRIMARY KEY,
    current_streak INTEGER DEFAULT 0,
    longest_streak INTEGER DEFAULT 0,
    last_entry_date DATE,
    total_entries INTEGER DEFAULT 0,
    total_words INTEGER DEFAULT 0,
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- ================================================
-- INDEXES for performance
-- ================================================
CREATE INDEX IF NOT EXISTS idx_journal_entries_user_id ON journal_entries(user_id);
CREATE INDEX IF NOT EXISTS idx_journal_entries_entry_date ON journal_entries(entry_date DESC);
CREATE INDEX IF NOT EXISTS idx_journal_entries_entry_type ON journal_entries(entry_type);
CREATE INDEX IF NOT EXISTS idx_journal_entries_deleted ON journal_entries(deleted_at) WHERE deleted_at IS NULL;
CREATE INDEX IF NOT EXISTS idx_journal_trade_links_entry ON journal_trade_links(journal_entry_id);
CREATE INDEX IF NOT EXISTS idx_journal_trade_links_trade ON journal_trade_links(trade_id);
CREATE INDEX IF NOT EXISTS idx_journal_moods_user_date ON journal_moods(user_id, recorded_at DESC);
CREATE INDEX IF NOT EXISTS idx_journal_templates_user ON journal_templates(user_id);
CREATE INDEX IF NOT EXISTS idx_journal_templates_system ON journal_templates(is_system) WHERE is_system = TRUE;

-- ================================================
-- ROW LEVEL SECURITY
-- ================================================
ALTER TABLE journal_entries ENABLE ROW LEVEL SECURITY;
ALTER TABLE journal_trade_links ENABLE ROW LEVEL SECURITY;
ALTER TABLE journal_templates ENABLE ROW LEVEL SECURITY;
ALTER TABLE journal_moods ENABLE ROW LEVEL SECURITY;
ALTER TABLE journal_streaks ENABLE ROW LEVEL SECURITY;

-- Journal Entries Policies
CREATE POLICY "journal_entries_select" ON journal_entries
    FOR SELECT USING (
        user_id::text = (select auth.uid())::text
        OR (select auth.role()) = 'service_role'
    );

CREATE POLICY "journal_entries_insert" ON journal_entries
    FOR INSERT WITH CHECK (
        user_id::text = (select auth.uid())::text
        OR (select auth.role()) = 'service_role'
    );

CREATE POLICY "journal_entries_update" ON journal_entries
    FOR UPDATE USING (
        user_id::text = (select auth.uid())::text
        OR (select auth.role()) = 'service_role'
    );

CREATE POLICY "journal_entries_delete" ON journal_entries
    FOR DELETE USING (
        user_id::text = (select auth.uid())::text
        OR (select auth.role()) = 'service_role'
    );

-- Journal Trade Links Policies (access via entry ownership)
CREATE POLICY "journal_trade_links_all" ON journal_trade_links
    FOR ALL USING (
        EXISTS (
            SELECT 1 FROM journal_entries
            WHERE journal_entries.id = journal_trade_links.journal_entry_id
            AND (journal_entries.user_id::text = (select auth.uid())::text OR (select auth.role()) = 'service_role')
        )
    );

-- Journal Templates Policies (user templates + system templates readable by all)
CREATE POLICY "journal_templates_select" ON journal_templates
    FOR SELECT USING (
        is_system = TRUE
        OR user_id::text = (select auth.uid())::text
        OR (select auth.role()) = 'service_role'
    );

CREATE POLICY "journal_templates_insert" ON journal_templates
    FOR INSERT WITH CHECK (
        user_id::text = (select auth.uid())::text
        OR (select auth.role()) = 'service_role'
    );

CREATE POLICY "journal_templates_update" ON journal_templates
    FOR UPDATE USING (
        user_id::text = (select auth.uid())::text
        OR (select auth.role()) = 'service_role'
    );

CREATE POLICY "journal_templates_delete" ON journal_templates
    FOR DELETE USING (
        user_id::text = (select auth.uid())::text
        OR (select auth.role()) = 'service_role'
    );

-- Journal Moods Policies
CREATE POLICY "journal_moods_select" ON journal_moods
    FOR SELECT USING (
        user_id::text = (select auth.uid())::text
        OR (select auth.role()) = 'service_role'
    );

CREATE POLICY "journal_moods_insert" ON journal_moods
    FOR INSERT WITH CHECK (
        user_id::text = (select auth.uid())::text
        OR (select auth.role()) = 'service_role'
    );

CREATE POLICY "journal_moods_update" ON journal_moods
    FOR UPDATE USING (
        user_id::text = (select auth.uid())::text
        OR (select auth.role()) = 'service_role'
    );

CREATE POLICY "journal_moods_delete" ON journal_moods
    FOR DELETE USING (
        user_id::text = (select auth.uid())::text
        OR (select auth.role()) = 'service_role'
    );

-- Journal Streaks Policies
CREATE POLICY "journal_streaks_select" ON journal_streaks
    FOR SELECT USING (
        user_id::text = (select auth.uid())::text
        OR (select auth.role()) = 'service_role'
    );

CREATE POLICY "journal_streaks_insert" ON journal_streaks
    FOR INSERT WITH CHECK (
        user_id::text = (select auth.uid())::text
        OR (select auth.role()) = 'service_role'
    );

CREATE POLICY "journal_streaks_update" ON journal_streaks
    FOR UPDATE USING (
        user_id::text = (select auth.uid())::text
        OR (select auth.role()) = 'service_role'
    );

CREATE POLICY "journal_streaks_delete" ON journal_streaks
    FOR DELETE USING (
        user_id::text = (select auth.uid())::text
        OR (select auth.role()) = 'service_role'
    );

-- ================================================
-- SYSTEM TEMPLATES (Pre-built)
-- ================================================
INSERT INTO journal_templates (id, user_id, name, description, content, category, is_system) VALUES
(
    'a1b2c3d4-e5f6-7890-abcd-ef1234567890',
    NULL,
    'Pre-Trade Analysis',
    'Document your thesis, risk management, and emotional state before entering a trade',
    '[
        {"id": "1", "type": "heading1", "content": "Pre-Trade Analysis"},
        {"id": "2", "type": "heading2", "content": "Market Context"},
        {"id": "3", "type": "paragraph", "content": "What is the current market structure? Key levels?"},
        {"id": "4", "type": "heading2", "content": "Entry Thesis"},
        {"id": "5", "type": "paragraph", "content": "Why are you taking this trade? What''s your edge?"},
        {"id": "6", "type": "heading2", "content": "Risk Management"},
        {"id": "7", "type": "checklist", "content": [
            {"text": "Stop loss defined", "checked": false},
            {"text": "Position size calculated", "checked": false},
            {"text": "Risk/reward ratio acceptable (>2:1)", "checked": false},
            {"text": "Max daily loss not exceeded", "checked": false}
        ]},
        {"id": "8", "type": "heading2", "content": "Emotional State"},
        {"id": "9", "type": "paragraph", "content": "How am I feeling? Any FOMO/fear/revenge trading?"}
    ]'::jsonb,
    'pre_trade',
    TRUE
),
(
    'b2c3d4e5-f6a7-8901-bcde-f23456789012',
    NULL,
    'Post-Trade Review',
    'Review your trade execution, what worked, what didn''t, and lessons learned',
    '[
        {"id": "1", "type": "heading1", "content": "Post-Trade Review"},
        {"id": "2", "type": "trade_card", "content": "", "properties": {"tradeId": "{{selected_trade}}"}},
        {"id": "3", "type": "heading2", "content": "What Went Well"},
        {"id": "4", "type": "bullet_list", "content": []},
        {"id": "5", "type": "heading2", "content": "What Could Improve"},
        {"id": "6", "type": "bullet_list", "content": []},
        {"id": "7", "type": "heading2", "content": "Did I Follow My Plan?"},
        {"id": "8", "type": "checklist", "content": [
            {"text": "Entered at planned level", "checked": false},
            {"text": "Used correct position size", "checked": false},
            {"text": "Held to target/stop", "checked": false},
            {"text": "Managed emotions well", "checked": false}
        ]},
        {"id": "9", "type": "heading2", "content": "Lessons Learned"},
        {"id": "10", "type": "paragraph", "content": ""},
        {"id": "11", "type": "heading2", "content": "Action Items"},
        {"id": "12", "type": "checklist", "content": []}
    ]'::jsonb,
    'post_trade',
    TRUE
),
(
    'c3d4e5f6-a7b8-9012-cdef-345678901234',
    NULL,
    'Weekly Review',
    'Comprehensive weekly performance review with stats, highlights, and goals',
    '[
        {"id": "1", "type": "heading1", "content": "Weekly Trading Review"},
        {"id": "2", "type": "stats_widget", "content": "", "properties": {"statType": "weekly_summary"}},
        {"id": "3", "type": "divider", "content": ""},
        {"id": "4", "type": "heading2", "content": "This Week''s Highlights"},
        {"id": "5", "type": "paragraph", "content": "Best trades and wins this week:"},
        {"id": "6", "type": "bullet_list", "content": []},
        {"id": "7", "type": "heading2", "content": "Challenges Faced"},
        {"id": "8", "type": "paragraph", "content": "Difficult moments and losses:"},
        {"id": "9", "type": "bullet_list", "content": []},
        {"id": "10", "type": "heading2", "content": "Patterns I Noticed"},
        {"id": "11", "type": "paragraph", "content": ""},
        {"id": "12", "type": "heading2", "content": "Goals for Next Week"},
        {"id": "13", "type": "checklist", "content": [
            {"text": "Focus on A+ setups only", "checked": false},
            {"text": "Stick to position sizing rules", "checked": false},
            {"text": "Journal every trade", "checked": false}
        ]}
    ]'::jsonb,
    'weekly',
    TRUE
),
(
    'd4e5f6a7-b8c9-0123-defa-456789012345',
    NULL,
    'Lesson Learned',
    'Document a key trading lesson or insight for future reference',
    '[
        {"id": "1", "type": "heading1", "content": "Trading Lesson"},
        {"id": "2", "type": "callout", "content": "Key insight goes here...", "properties": {"calloutType": "info"}},
        {"id": "3", "type": "heading2", "content": "The Situation"},
        {"id": "4", "type": "paragraph", "content": "What happened? Describe the context."},
        {"id": "5", "type": "heading2", "content": "What I Learned"},
        {"id": "6", "type": "paragraph", "content": "The key takeaway from this experience."},
        {"id": "7", "type": "heading2", "content": "How I''ll Apply This"},
        {"id": "8", "type": "bullet_list", "content": []},
        {"id": "9", "type": "heading2", "content": "Related Trades"},
        {"id": "10", "type": "paragraph", "content": "Link any trades that relate to this lesson."}
    ]'::jsonb,
    'lesson',
    TRUE
),
(
    'e5f6a7b8-c9d0-1234-efab-567890123456',
    NULL,
    'Quick Mood Check',
    'Fast emotional state check-in before or during trading',
    '[
        {"id": "1", "type": "heading2", "content": "Mood Check"},
        {"id": "2", "type": "paragraph", "content": "Current mood (1-5): "},
        {"id": "3", "type": "paragraph", "content": "Energy level (1-5): "},
        {"id": "4", "type": "paragraph", "content": "Focus level (1-5): "},
        {"id": "5", "type": "divider", "content": ""},
        {"id": "6", "type": "heading2", "content": "What''s on my mind:"},
        {"id": "7", "type": "paragraph", "content": ""},
        {"id": "8", "type": "heading2", "content": "Am I in the right state to trade?"},
        {"id": "9", "type": "checklist", "content": [
            {"text": "Rested and alert", "checked": false},
            {"text": "No external stressors", "checked": false},
            {"text": "Clear trading plan for today", "checked": false},
            {"text": "Accepting of potential losses", "checked": false}
        ]}
    ]'::jsonb,
    'mood',
    TRUE
)
ON CONFLICT (id) DO NOTHING;

-- ================================================
-- FUNCTIONS for streak management
-- ================================================
CREATE OR REPLACE FUNCTION update_journal_streak()
RETURNS TRIGGER AS $$
DECLARE
    last_date DATE;
    current_date_val DATE := CURRENT_DATE;
    streak_record journal_streaks%ROWTYPE;
BEGIN
    -- Get or create streak record
    SELECT * INTO streak_record FROM journal_streaks WHERE user_id = NEW.user_id;

    IF NOT FOUND THEN
        -- Create new streak record
        INSERT INTO journal_streaks (user_id, current_streak, longest_streak, last_entry_date, total_entries, total_words)
        VALUES (NEW.user_id, 1, 1, current_date_val, 1, COALESCE(NEW.word_count, 0));
    ELSE
        -- Update existing streak
        IF streak_record.last_entry_date = current_date_val THEN
            -- Same day, just update word count
            UPDATE journal_streaks
            SET total_words = total_words + COALESCE(NEW.word_count, 0),
                updated_at = NOW()
            WHERE user_id = NEW.user_id;
        ELSIF streak_record.last_entry_date = current_date_val - INTERVAL '1 day' THEN
            -- Consecutive day, increment streak
            UPDATE journal_streaks
            SET current_streak = current_streak + 1,
                longest_streak = GREATEST(longest_streak, current_streak + 1),
                last_entry_date = current_date_val,
                total_entries = total_entries + 1,
                total_words = total_words + COALESCE(NEW.word_count, 0),
                updated_at = NOW()
            WHERE user_id = NEW.user_id;
        ELSE
            -- Streak broken, reset to 1
            UPDATE journal_streaks
            SET current_streak = 1,
                last_entry_date = current_date_val,
                total_entries = total_entries + 1,
                total_words = total_words + COALESCE(NEW.word_count, 0),
                updated_at = NOW()
            WHERE user_id = NEW.user_id;
        END IF;
    END IF;

    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = '';

-- Create trigger for streak updates
DROP TRIGGER IF EXISTS trigger_update_journal_streak ON journal_entries;
CREATE TRIGGER trigger_update_journal_streak
    AFTER INSERT ON journal_entries
    FOR EACH ROW
    EXECUTE FUNCTION update_journal_streak();

-- ================================================
-- FUNCTION for updating updated_at timestamp
-- ================================================
CREATE OR REPLACE FUNCTION update_journal_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create triggers for updated_at
DROP TRIGGER IF EXISTS trigger_journal_entries_updated ON journal_entries;
CREATE TRIGGER trigger_journal_entries_updated
    BEFORE UPDATE ON journal_entries
    FOR EACH ROW
    EXECUTE FUNCTION update_journal_updated_at();

DROP TRIGGER IF EXISTS trigger_journal_templates_updated ON journal_templates;
CREATE TRIGGER trigger_journal_templates_updated
    BEFORE UPDATE ON journal_templates
    FOR EACH ROW
    EXECUTE FUNCTION update_journal_updated_at();
