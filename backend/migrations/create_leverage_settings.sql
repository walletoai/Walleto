-- Create leverage_settings table to store user's default leverage per symbol
-- This allows users to set default leverage for each trading pair they use

CREATE TABLE IF NOT EXISTS leverage_settings (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL,
    symbol VARCHAR(50) NOT NULL,
    leverage NUMERIC(10,2) NOT NULL DEFAULT 1.0,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,

    -- Ensure one setting per user per symbol
    UNIQUE(user_id, symbol)
);

-- Add index for faster lookups
CREATE INDEX IF NOT EXISTS idx_leverage_settings_user_id ON leverage_settings(user_id);
CREATE INDEX IF NOT EXISTS idx_leverage_settings_user_symbol ON leverage_settings(user_id, symbol);

-- Add updated_at trigger
CREATE OR REPLACE FUNCTION update_leverage_settings_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_leverage_settings_updated_at
    BEFORE UPDATE ON leverage_settings
    FOR EACH ROW
    EXECUTE FUNCTION update_leverage_settings_updated_at();

-- Grant permissions (adjust based on your RLS policies)
-- ALTER TABLE leverage_settings ENABLE ROW LEVEL SECURITY;
