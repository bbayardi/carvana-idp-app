-- Create user_responses table
CREATE TABLE IF NOT EXISTS user_responses (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  email TEXT NOT NULL,
  role_id INTEGER NOT NULL,
  competency_id INTEGER NOT NULL,
  assessment_level INTEGER,
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),

  -- Ensure one response per user per competency per role
  UNIQUE(user_id, role_id, competency_id)
);

-- Create index for faster queries
CREATE INDEX IF NOT EXISTS idx_user_responses_user_role
  ON user_responses(user_id, role_id);

-- Create index for email lookups (useful for migration)
CREATE INDEX IF NOT EXISTS idx_user_responses_email_role
  ON user_responses(email, role_id);

-- Enable Row Level Security
ALTER TABLE user_responses ENABLE ROW LEVEL SECURITY;

-- Policy: Users can only read their own responses
CREATE POLICY "Users can view own responses"
  ON user_responses
  FOR SELECT
  USING (auth.uid() = user_id);

-- Policy: Users can insert their own responses
CREATE POLICY "Users can insert own responses"
  ON user_responses
  FOR INSERT
  WITH CHECK (auth.uid() = user_id);

-- Policy: Users can update their own responses
CREATE POLICY "Users can update own responses"
  ON user_responses
  FOR UPDATE
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- Policy: Users can delete their own responses
CREATE POLICY "Users can delete own responses"
  ON user_responses
  FOR DELETE
  USING (auth.uid() = user_id);

-- Create function to automatically update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger to automatically update updated_at
CREATE TRIGGER update_user_responses_updated_at
  BEFORE UPDATE ON user_responses
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();
