-- Sharing and Collaboration Tables for IDP Tool

-- Table to track sharing relationships
CREATE TABLE shares (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  original_user_id UUID NOT NULL,          -- Person sharing their assessment (references auth.users)
  original_user_email TEXT NOT NULL,       -- Email of original user
  collaborator_email TEXT NOT NULL,        -- Email of person receiving the share
  role_id INTEGER NOT NULL,                -- Role being assessed
  shared_at TIMESTAMP DEFAULT NOW(),
  feedback_submitted BOOLEAN DEFAULT FALSE,
  feedback_submitted_at TIMESTAMP,
  share_token UUID DEFAULT uuid_generate_v4() -- Token for direct access without magic link expiry
  -- Note: No unique constraint - allows multiple shares of same role to same collaborator over time
);

-- Snapshot of original user's responses at time of sharing
CREATE TABLE share_snapshots (
  share_id UUID REFERENCES shares(id) ON DELETE CASCADE,
  competency_id INTEGER NOT NULL,
  assessment_level INTEGER,
  notes TEXT,
  PRIMARY KEY (share_id, competency_id)
);

-- Collaborator's feedback on each competency
CREATE TABLE collaborator_feedback (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  share_id UUID REFERENCES shares(id) ON DELETE CASCADE,
  competency_id INTEGER NOT NULL,
  collaborator_assessment_level INTEGER,
  collaborator_notes TEXT,
  updated_at TIMESTAMP DEFAULT NOW(),
  UNIQUE(share_id, competency_id)
);

-- Row Level Security Policies

-- Enable RLS
ALTER TABLE shares ENABLE ROW LEVEL SECURITY;
ALTER TABLE share_snapshots ENABLE ROW LEVEL SECURITY;
ALTER TABLE collaborator_feedback ENABLE ROW LEVEL SECURITY;

-- Shares: Users can see shares where they are original_user OR collaborator (by email)
CREATE POLICY "Users can view their own shares and shares they're collaborating on"
  ON shares FOR SELECT
  USING (
    auth.uid() = original_user_id
    OR
    collaborator_email = auth.jwt() ->> 'email'
  );

-- Shares: Users can create shares for themselves
CREATE POLICY "Users can create shares"
  ON shares FOR INSERT
  WITH CHECK (auth.uid() = original_user_id);

-- Shares: Original user can update their shares (for canceling, etc)
CREATE POLICY "Original users can update their shares"
  ON shares FOR UPDATE
  USING (auth.uid() = original_user_id);

-- Share Snapshots: Visible to both original user and collaborator
CREATE POLICY "Users can view snapshots for their shares"
  ON share_snapshots FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM shares
      WHERE shares.id = share_snapshots.share_id
      AND (
        auth.uid() = shares.original_user_id
        OR
        shares.collaborator_email = auth.jwt() ->> 'email'
      )
    )
  );

-- Share Snapshots: Can be inserted when creating a share
CREATE POLICY "Users can create snapshots for their shares"
  ON share_snapshots FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM shares
      WHERE shares.id = share_snapshots.share_id
      AND auth.uid() = shares.original_user_id
    )
  );

-- Collaborator Feedback: Visible to both original user and collaborator
CREATE POLICY "Users can view feedback for their shares"
  ON collaborator_feedback FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM shares
      WHERE shares.id = collaborator_feedback.share_id
      AND (
        auth.uid() = shares.original_user_id
        OR
        shares.collaborator_email = auth.jwt() ->> 'email'
      )
    )
  );

-- Collaborator Feedback: Only collaborator can insert/update (before submission)
CREATE POLICY "Collaborators can create feedback"
  ON collaborator_feedback FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM shares
      WHERE shares.id = collaborator_feedback.share_id
      AND shares.collaborator_email = auth.jwt() ->> 'email'
    )
  );

CREATE POLICY "Collaborators can update feedback"
  ON collaborator_feedback FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM shares
      WHERE shares.id = collaborator_feedback.share_id
      AND shares.collaborator_email = auth.jwt() ->> 'email'
    )
  );

-- Indexes for performance
CREATE INDEX idx_shares_original_user ON shares(original_user_id);
CREATE INDEX idx_shares_collaborator ON shares(collaborator_email);
CREATE INDEX idx_shares_token ON shares(share_token);
CREATE INDEX idx_share_snapshots_share ON share_snapshots(share_id);
CREATE INDEX idx_collaborator_feedback_share ON collaborator_feedback(share_id);
