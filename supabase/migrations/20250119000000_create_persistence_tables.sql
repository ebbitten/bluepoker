-- Create tables for game persistence and reconnection functionality

-- Table for persisting game states
CREATE TABLE persisted_games (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    game_id TEXT NOT NULL UNIQUE,
    game_state JSONB NOT NULL,
    persisted_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    version INTEGER NOT NULL DEFAULT 1,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Index for faster game lookups
CREATE INDEX idx_persisted_games_game_id ON persisted_games(game_id);
CREATE INDEX idx_persisted_games_updated_at ON persisted_games(updated_at);

-- Table for reconnection tokens
CREATE TABLE reconnection_tokens (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    token TEXT NOT NULL UNIQUE,
    game_id TEXT NOT NULL,
    player_id TEXT NOT NULL,
    expires_at TIMESTAMPTZ NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Indexes for token validation
CREATE INDEX idx_reconnection_tokens_token ON reconnection_tokens(token);
CREATE INDEX idx_reconnection_tokens_game_id ON reconnection_tokens(game_id);
CREATE INDEX idx_reconnection_tokens_expires_at ON reconnection_tokens(expires_at);

-- Foreign key relationship (optional, since games might be in-memory)
-- ALTER TABLE reconnection_tokens 
-- ADD CONSTRAINT fk_reconnection_tokens_game 
-- FOREIGN KEY (game_id) REFERENCES persisted_games(game_id) ON DELETE CASCADE;

-- Function to automatically update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Trigger to update updated_at on persisted_games
CREATE TRIGGER update_persisted_games_updated_at 
    BEFORE UPDATE ON persisted_games 
    FOR EACH ROW 
    EXECUTE FUNCTION update_updated_at_column();

-- RLS (Row Level Security) policies for security
ALTER TABLE persisted_games ENABLE ROW LEVEL SECURITY;
ALTER TABLE reconnection_tokens ENABLE ROW LEVEL SECURITY;

-- Allow all operations for now (in production, would be more restrictive)
CREATE POLICY "Allow all operations on persisted_games" ON persisted_games
    FOR ALL USING (true);

CREATE POLICY "Allow all operations on reconnection_tokens" ON reconnection_tokens
    FOR ALL USING (true);

-- Comments for documentation
COMMENT ON TABLE persisted_games IS 'Stores game states for persistence across server restarts';
COMMENT ON TABLE reconnection_tokens IS 'Stores temporary tokens for player reconnection';
COMMENT ON COLUMN persisted_games.game_state IS 'Complete game state stored as JSONB for flexibility';
COMMENT ON COLUMN persisted_games.version IS 'Incremental version number for each persist operation';
COMMENT ON COLUMN reconnection_tokens.expires_at IS 'Token expiration time (typically 30 minutes from creation)';

-- Grant permissions (adjust based on your Supabase setup)
-- GRANT ALL ON persisted_games TO authenticated;
-- GRANT ALL ON reconnection_tokens TO authenticated;