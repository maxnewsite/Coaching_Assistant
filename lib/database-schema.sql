-- Database schema for coaching sessions
-- Run this in your Supabase SQL editor

-- Create coaching_sessions table
CREATE TABLE IF NOT EXISTS coaching_sessions (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    session_start_time TIMESTAMPTZ NOT NULL,
    session_end_time TIMESTAMPTZ,
    duration_seconds INTEGER,
    total_entries INTEGER DEFAULT 0,
    coach_entries INTEGER DEFAULT 0,
    coachee_entries INTEGER DEFAULT 0,
    ai_entries INTEGER DEFAULT 0,
    session_metadata JSONB DEFAULT '{}',
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create session_entries table for transcript entries
CREATE TABLE IF NOT EXISTS session_entries (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    session_id UUID REFERENCES coaching_sessions(id) ON DELETE CASCADE,
    timestamp_utc TIMESTAMPTZ NOT NULL,
    elapsed_seconds INTEGER NOT NULL,
    speaker TEXT NOT NULL CHECK (speaker IN ('coach', 'coachee', 'ai')),
    content TEXT NOT NULL,
    entry_order INTEGER NOT NULL,
    metadata JSONB DEFAULT '{}',
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_session_entries_session_id ON session_entries(session_id);
CREATE INDEX IF NOT EXISTS idx_session_entries_timestamp ON session_entries(timestamp_utc);
CREATE INDEX IF NOT EXISTS idx_session_entries_speaker ON session_entries(speaker);
CREATE INDEX IF NOT EXISTS idx_session_entries_order ON session_entries(session_id, entry_order);

-- Create function to update the updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Create trigger to automatically update updated_at
DROP TRIGGER IF EXISTS update_coaching_sessions_updated_at ON coaching_sessions;
CREATE TRIGGER update_coaching_sessions_updated_at
    BEFORE UPDATE ON coaching_sessions
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- Create function to update session statistics
CREATE OR REPLACE FUNCTION update_session_stats()
RETURNS TRIGGER AS $$
BEGIN
    -- Update the session statistics
    UPDATE coaching_sessions 
    SET 
        total_entries = (
            SELECT COUNT(*) 
            FROM session_entries 
            WHERE session_id = COALESCE(NEW.session_id, OLD.session_id)
        ),
        coach_entries = (
            SELECT COUNT(*) 
            FROM session_entries 
            WHERE session_id = COALESCE(NEW.session_id, OLD.session_id) 
            AND speaker = 'coach'
        ),
        coachee_entries = (
            SELECT COUNT(*) 
            FROM session_entries 
            WHERE session_id = COALESCE(NEW.session_id, OLD.session_id) 
            AND speaker = 'coachee'
        ),
        ai_entries = (
            SELECT COUNT(*) 
            FROM session_entries 
            WHERE session_id = COALESCE(NEW.session_id, OLD.session_id) 
            AND speaker = 'ai'
        )
    WHERE id = COALESCE(NEW.session_id, OLD.session_id);
    
    RETURN COALESCE(NEW, OLD);
END;
$$ language 'plpgsql';

-- Create triggers to automatically update statistics
DROP TRIGGER IF EXISTS update_session_stats_on_insert ON session_entries;
CREATE TRIGGER update_session_stats_on_insert
    AFTER INSERT ON session_entries
    FOR EACH ROW
    EXECUTE FUNCTION update_session_stats();

DROP TRIGGER IF EXISTS update_session_stats_on_delete ON session_entries;
CREATE TRIGGER update_session_stats_on_delete
    AFTER DELETE ON session_entries
    FOR EACH ROW
    EXECUTE FUNCTION update_session_stats();

-- Enable Row Level Security (RLS) - optional, for multi-tenant scenarios
-- ALTER TABLE coaching_sessions ENABLE ROW LEVEL SECURITY;
-- ALTER TABLE session_entries ENABLE ROW LEVEL SECURITY;

-- Example policies (uncomment if you need user-specific access control)
-- CREATE POLICY "Users can view their own sessions" ON coaching_sessions
--     FOR SELECT USING (auth.uid()::text = (session_metadata->>'user_id'));

-- CREATE POLICY "Users can insert their own sessions" ON coaching_sessions
--     FOR INSERT WITH CHECK (auth.uid()::text = (session_metadata->>'user_id'));
