-- Create agent_sessions table for tracking browser automation sessions
CREATE TABLE IF NOT EXISTS agent_sessions (
    id TEXT PRIMARY KEY,
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    bill_id TEXT NOT NULL REFERENCES bill_extractions(id) ON DELETE CASCADE,
    status TEXT NOT NULL DEFAULT 'idle' CHECK (status IN ('idle', 'running', 'completed', 'failed')),
    progress INTEGER NOT NULL DEFAULT 0 CHECK (progress >= 0 AND progress <= 100),
    current_step TEXT,
    error TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_agent_sessions_user_id ON agent_sessions(user_id);
CREATE INDEX IF NOT EXISTS idx_agent_sessions_bill_id ON agent_sessions(bill_id);
CREATE INDEX IF NOT EXISTS idx_agent_sessions_status ON agent_sessions(status);
CREATE INDEX IF NOT EXISTS idx_agent_sessions_created_at ON agent_sessions(created_at);

-- Create updated_at trigger
CREATE OR REPLACE FUNCTION update_agent_sessions_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_update_agent_sessions_updated_at
    BEFORE UPDATE ON agent_sessions
    FOR EACH ROW
    EXECUTE FUNCTION update_agent_sessions_updated_at();

-- Add RLS policies
ALTER TABLE agent_sessions ENABLE ROW LEVEL SECURITY;

-- Policy: Users can only see their own agent sessions
CREATE POLICY "Users can view their own agent sessions" ON agent_sessions
    FOR SELECT USING (auth.uid() = user_id);

-- Policy: Users can only insert their own agent sessions
CREATE POLICY "Users can insert their own agent sessions" ON agent_sessions
    FOR INSERT WITH CHECK (auth.uid() = user_id);

-- Policy: Users can only update their own agent sessions
CREATE POLICY "Users can update their own agent sessions" ON agent_sessions
    FOR UPDATE USING (auth.uid() = user_id);

-- Policy: Users can only delete their own agent sessions
CREATE POLICY "Users can delete their own agent sessions" ON agent_sessions
    FOR DELETE USING (auth.uid() = user_id);

-- Add comments
COMMENT ON TABLE agent_sessions IS 'Tracks browser automation sessions for utility bill payments';
COMMENT ON COLUMN agent_sessions.id IS 'Unique session identifier';
COMMENT ON COLUMN agent_sessions.user_id IS 'User who owns this session';
COMMENT ON COLUMN agent_sessions.bill_id IS 'Bill being processed in this session';
COMMENT ON COLUMN agent_sessions.status IS 'Current status of the agent session';
COMMENT ON COLUMN agent_sessions.progress IS 'Progress percentage (0-100)';
COMMENT ON COLUMN agent_sessions.current_step IS 'Current step being executed';
COMMENT ON COLUMN agent_sessions.error IS 'Error message if session failed';

