-- ============================================
-- AI Coach Memory System
-- Run this migration in Supabase SQL Editor
-- ============================================

-- Enable pgvector extension for semantic search
CREATE EXTENSION IF NOT EXISTS vector;

-- ============================================
-- 1. CORE MEMORIES
-- Structured knowledge about each user
-- ============================================
CREATE TABLE IF NOT EXISTS coach_memories (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id TEXT NOT NULL,

    -- Memory categorization
    memory_type TEXT NOT NULL CHECK (memory_type IN (
        'trading_style',    -- How they trade (scalper, swing, etc.)
        'strength',         -- What they're good at
        'weakness',         -- What they struggle with
        'goal',             -- What they want to achieve
        'rule',             -- Trading rules they've set
        'trigger',          -- Emotional triggers (FOMO, revenge, etc.)
        'preference',       -- Preferences (favorite pairs, sessions, etc.)
        'breakthrough',     -- Key realizations they've had
        'personality'       -- Communication style, what motivates them
    )),

    -- The actual memory content
    content TEXT NOT NULL,

    -- Metadata
    confidence FLOAT DEFAULT 0.5 CHECK (confidence >= 0 AND confidence <= 1),
    importance TEXT DEFAULT 'medium' CHECK (importance IN ('low', 'medium', 'high', 'critical')),

    -- Source tracking
    source_type TEXT,  -- 'conversation', 'trade_analysis', 'pattern_detection', 'user_stated'
    source_id TEXT,    -- ID of the conversation/trade that created this

    -- Learning tracking
    times_reinforced INT DEFAULT 1,
    times_contradicted INT DEFAULT 0,
    last_reinforced_at TIMESTAMPTZ,

    -- Lifecycle
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Index for fast user lookups
CREATE INDEX IF NOT EXISTS idx_coach_memories_user ON coach_memories(user_id);
CREATE INDEX IF NOT EXISTS idx_coach_memories_type ON coach_memories(user_id, memory_type);
CREATE INDEX IF NOT EXISTS idx_coach_memories_active ON coach_memories(user_id, is_active);

-- ============================================
-- 2. EPISODIC MEMORIES
-- Key moments in the user's trading journey
-- ============================================
CREATE TABLE IF NOT EXISTS coach_episodes (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id TEXT NOT NULL,

    -- Episode categorization
    episode_type TEXT NOT NULL CHECK (episode_type IN (
        'milestone',        -- Achievement (first $1k day, 100 trades, etc.)
        'breakthrough',     -- Key realization or improvement
        'setback',          -- Significant loss or mistake
        'lesson',           -- Important coaching moment
        'commitment',       -- User made a commitment/promise
        'pattern_change',   -- User changed a behavior pattern
        'goal_set',         -- User set a new goal
        'goal_achieved'     -- User achieved a goal
    )),

    -- Episode content
    title TEXT NOT NULL,
    description TEXT NOT NULL,

    -- Context
    related_trades TEXT[],           -- Trade IDs involved
    related_conversation_id TEXT,    -- Conversation where this happened
    advice_given TEXT,               -- What the coach recommended
    user_response TEXT,              -- How user responded to advice

    -- Outcome tracking (filled in later)
    outcome TEXT CHECK (outcome IN ('positive', 'neutral', 'negative', 'pending')),
    outcome_notes TEXT,
    outcome_measured_at TIMESTAMPTZ,

    -- Emotional context
    emotional_state TEXT,  -- User's emotional state during this

    -- Importance
    significance TEXT DEFAULT 'medium' CHECK (significance IN ('low', 'medium', 'high', 'critical')),

    -- Lifecycle
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_coach_episodes_user ON coach_episodes(user_id);
CREATE INDEX IF NOT EXISTS idx_coach_episodes_type ON coach_episodes(user_id, episode_type);
CREATE INDEX IF NOT EXISTS idx_coach_episodes_date ON coach_episodes(user_id, created_at DESC);

-- ============================================
-- 3. CONVERSATION EMBEDDINGS
-- Vector embeddings for semantic search
-- ============================================
CREATE TABLE IF NOT EXISTS coach_message_embeddings (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id TEXT NOT NULL,
    message_id TEXT NOT NULL,
    conversation_id TEXT NOT NULL,

    -- Message content (for reference)
    role TEXT NOT NULL,  -- 'user' or 'assistant'
    content_summary TEXT,  -- Shortened version of content

    -- The embedding vector (1536 dimensions for OpenAI ada-002)
    embedding vector(1536),

    -- Metadata for filtering
    topics TEXT[],  -- Extracted topics like ['risk', 'btc', 'leverage']
    sentiment TEXT,  -- 'positive', 'negative', 'neutral'

    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Vector similarity search index
CREATE INDEX IF NOT EXISTS idx_embeddings_vector ON coach_message_embeddings
    USING ivfflat (embedding vector_cosine_ops) WITH (lists = 100);
CREATE INDEX IF NOT EXISTS idx_embeddings_user ON coach_message_embeddings(user_id);

-- ============================================
-- 4. ADVICE OUTCOMES
-- Track if coach advice actually helped
-- ============================================
CREATE TABLE IF NOT EXISTS coach_advice_outcomes (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id TEXT NOT NULL,

    -- Reference to the advice
    conversation_id TEXT NOT NULL,
    message_id TEXT,
    advice_summary TEXT NOT NULL,  -- What was the advice
    advice_category TEXT,  -- 'risk', 'psychology', 'strategy', 'execution'

    -- When advice was given
    given_at TIMESTAMPTZ DEFAULT NOW(),

    -- Measurement window
    measurement_start TIMESTAMPTZ,
    measurement_end TIMESTAMPTZ,

    -- Metrics before advice
    metrics_before JSONB,  -- {win_rate: 45, avg_pnl: -50, etc.}

    -- Metrics after following advice
    metrics_after JSONB,

    -- Outcome
    was_followed BOOLEAN,  -- Did user actually follow the advice?
    outcome TEXT CHECK (outcome IN ('improved', 'no_change', 'worsened', 'pending', 'unknown')),
    outcome_notes TEXT,

    -- Learning value
    learning_value FLOAT,  -- How valuable was this advice? (-1 to 1)

    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_advice_outcomes_user ON coach_advice_outcomes(user_id);
CREATE INDEX IF NOT EXISTS idx_advice_outcomes_outcome ON coach_advice_outcomes(user_id, outcome);

-- ============================================
-- 5. USER GOALS
-- Track user's trading goals and progress
-- ============================================
CREATE TABLE IF NOT EXISTS coach_user_goals (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id TEXT NOT NULL,

    -- Goal definition
    goal_type TEXT NOT NULL CHECK (goal_type IN (
        'win_rate',         -- Improve win rate
        'pnl',              -- Achieve PnL target
        'risk',             -- Reduce risk/leverage
        'consistency',      -- Trade more consistently
        'psychology',       -- Improve emotional control
        'habit',            -- Build/break a habit
        'skill',            -- Learn a skill
        'custom'            -- User-defined
    )),

    title TEXT NOT NULL,
    description TEXT,

    -- Measurable targets
    target_metric TEXT,       -- What to measure
    target_value FLOAT,       -- Target value
    baseline_value FLOAT,     -- Starting value
    current_value FLOAT,      -- Current value

    -- Timeline
    deadline TIMESTAMPTZ,

    -- Status
    status TEXT DEFAULT 'active' CHECK (status IN ('active', 'achieved', 'abandoned', 'paused')),
    progress_percent FLOAT DEFAULT 0,

    -- Tracking
    last_check_in TIMESTAMPTZ,
    check_in_notes TEXT,

    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    achieved_at TIMESTAMPTZ
);

CREATE INDEX IF NOT EXISTS idx_user_goals_user ON coach_user_goals(user_id);
CREATE INDEX IF NOT EXISTS idx_user_goals_active ON coach_user_goals(user_id, status);

-- ============================================
-- 6. COACH LEARNING LOG
-- Track what the coach has learned over time
-- ============================================
CREATE TABLE IF NOT EXISTS coach_learning_log (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id TEXT NOT NULL,

    -- What was learned
    learning_type TEXT NOT NULL,  -- 'memory_created', 'memory_updated', 'pattern_discovered', etc.
    description TEXT NOT NULL,

    -- Source
    source_conversation_id TEXT,
    source_trade_ids TEXT[],

    -- Impact
    confidence FLOAT,

    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_learning_log_user ON coach_learning_log(user_id, created_at DESC);

-- ============================================
-- HELPER FUNCTIONS
-- ============================================

-- Function to search memories by semantic similarity
CREATE OR REPLACE FUNCTION search_coach_memories(
    p_user_id TEXT,
    p_query_embedding vector(1536),
    p_limit INT DEFAULT 10
)
RETURNS TABLE (
    id UUID,
    message_id TEXT,
    content_summary TEXT,
    role TEXT,
    similarity FLOAT
) AS $$
BEGIN
    RETURN QUERY
    SELECT
        e.id,
        e.message_id,
        e.content_summary,
        e.role,
        1 - (e.embedding <=> p_query_embedding) as similarity
    FROM coach_message_embeddings e
    WHERE e.user_id = p_user_id
    ORDER BY e.embedding <=> p_query_embedding
    LIMIT p_limit;
END;
$$ LANGUAGE plpgsql;

-- Function to get user's active memories summary
CREATE OR REPLACE FUNCTION get_user_memory_summary(p_user_id TEXT)
RETURNS TABLE (
    memory_type TEXT,
    count BIGINT,
    avg_confidence FLOAT
) AS $$
BEGIN
    RETURN QUERY
    SELECT
        m.memory_type,
        COUNT(*)::BIGINT,
        AVG(m.confidence)::FLOAT
    FROM coach_memories m
    WHERE m.user_id = p_user_id AND m.is_active = TRUE
    GROUP BY m.memory_type
    ORDER BY COUNT(*) DESC;
END;
$$ LANGUAGE plpgsql;

-- ============================================
-- ROW LEVEL SECURITY
-- Ensure users can only access their own data
-- ============================================

ALTER TABLE coach_memories ENABLE ROW LEVEL SECURITY;
ALTER TABLE coach_episodes ENABLE ROW LEVEL SECURITY;
ALTER TABLE coach_message_embeddings ENABLE ROW LEVEL SECURITY;
ALTER TABLE coach_advice_outcomes ENABLE ROW LEVEL SECURITY;
ALTER TABLE coach_user_goals ENABLE ROW LEVEL SECURITY;
ALTER TABLE coach_learning_log ENABLE ROW LEVEL SECURITY;

-- Policies (adjust based on your auth setup)
-- These allow service role full access, users access only their own data

CREATE POLICY "Users can view own memories" ON coach_memories
    FOR SELECT USING (auth.uid()::text = user_id OR auth.role() = 'service_role');

CREATE POLICY "Users can view own episodes" ON coach_episodes
    FOR SELECT USING (auth.uid()::text = user_id OR auth.role() = 'service_role');

CREATE POLICY "Users can view own embeddings" ON coach_message_embeddings
    FOR SELECT USING (auth.uid()::text = user_id OR auth.role() = 'service_role');

CREATE POLICY "Users can view own outcomes" ON coach_advice_outcomes
    FOR SELECT USING (auth.uid()::text = user_id OR auth.role() = 'service_role');

CREATE POLICY "Users can view own goals" ON coach_user_goals
    FOR SELECT USING (auth.uid()::text = user_id OR auth.role() = 'service_role');

CREATE POLICY "Users can view own learning log" ON coach_learning_log
    FOR SELECT USING (auth.uid()::text = user_id OR auth.role() = 'service_role');

-- Service role can insert/update all tables
CREATE POLICY "Service can manage memories" ON coach_memories
    FOR ALL USING (auth.role() = 'service_role');

CREATE POLICY "Service can manage episodes" ON coach_episodes
    FOR ALL USING (auth.role() = 'service_role');

CREATE POLICY "Service can manage embeddings" ON coach_message_embeddings
    FOR ALL USING (auth.role() = 'service_role');

CREATE POLICY "Service can manage outcomes" ON coach_advice_outcomes
    FOR ALL USING (auth.role() = 'service_role');

CREATE POLICY "Service can manage goals" ON coach_user_goals
    FOR ALL USING (auth.role() = 'service_role');

CREATE POLICY "Service can manage learning log" ON coach_learning_log
    FOR ALL USING (auth.role() = 'service_role');

-- ============================================
-- DONE
-- ============================================
