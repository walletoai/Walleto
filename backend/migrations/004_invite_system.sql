-- Invite System Tables for Walleto
-- Run this in Supabase SQL Editor

-- 1. Waitlist table for early access signups
CREATE TABLE IF NOT EXISTS waitlist (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    email TEXT NOT NULL UNIQUE,
    name TEXT,
    source TEXT DEFAULT 'landing_page',
    referral_code TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    notified_at TIMESTAMPTZ,
    converted_at TIMESTAMPTZ
);

-- Index for quick email lookups
CREATE INDEX IF NOT EXISTS idx_waitlist_email ON waitlist(email);
CREATE INDEX IF NOT EXISTS idx_waitlist_created_at ON waitlist(created_at DESC);

-- 2. Invite codes table
CREATE TABLE IF NOT EXISTS invite_codes (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    code TEXT NOT NULL UNIQUE,
    email TEXT,  -- If set, code is locked to this email
    max_uses INTEGER DEFAULT 1,
    current_uses INTEGER DEFAULT 0,
    created_by TEXT,
    expires_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    is_active BOOLEAN DEFAULT TRUE,
    note TEXT  -- Admin note about who this is for
);

-- Index for quick code lookups
CREATE INDEX IF NOT EXISTS idx_invite_codes_code ON invite_codes(code);

-- 3. Track which invite code was used for each signup
CREATE TABLE IF NOT EXISTS invite_redemptions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    invite_code_id UUID REFERENCES invite_codes(id),
    user_id TEXT NOT NULL,
    email TEXT NOT NULL,
    redeemed_at TIMESTAMPTZ DEFAULT NOW()
);

-- Index for tracking redemptions
CREATE INDEX IF NOT EXISTS idx_invite_redemptions_user ON invite_redemptions(user_id);

-- 4. Admin users table (for managing invite codes)
CREATE TABLE IF NOT EXISTS admin_users (
    user_id TEXT PRIMARY KEY,
    email TEXT NOT NULL,
    role TEXT DEFAULT 'admin',
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Enable RLS on all tables
ALTER TABLE waitlist ENABLE ROW LEVEL SECURITY;
ALTER TABLE invite_codes ENABLE ROW LEVEL SECURITY;
ALTER TABLE invite_redemptions ENABLE ROW LEVEL SECURITY;
ALTER TABLE admin_users ENABLE ROW LEVEL SECURITY;

-- RLS Policies

-- Waitlist: Anyone can insert (for signups), only service role can read
CREATE POLICY "Anyone can join waitlist" ON waitlist
    FOR INSERT TO anon, authenticated
    WITH CHECK (true);

CREATE POLICY "Service role can read waitlist" ON waitlist
    FOR SELECT TO service_role
    USING (true);

-- Invite codes: Service role only (backend manages this)
CREATE POLICY "Service role manages invite codes" ON invite_codes
    FOR ALL TO service_role
    USING (true);

-- Allow anon to check if code is valid (read-only, limited fields via API)
CREATE POLICY "Anyone can validate codes" ON invite_codes
    FOR SELECT TO anon, authenticated
    USING (is_active = true AND (expires_at IS NULL OR expires_at > NOW()));

-- Invite redemptions: Service role only
CREATE POLICY "Service role manages redemptions" ON invite_redemptions
    FOR ALL TO service_role
    USING (true);

-- Admin users: Service role only
CREATE POLICY "Service role manages admins" ON admin_users
    FOR ALL TO service_role
    USING (true);

-- Insert your admin user (replace with your actual user_id from auth.users)
-- INSERT INTO admin_users (user_id, email, role) VALUES ('your-user-id', 'your@email.com', 'super_admin');
