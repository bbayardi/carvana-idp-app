-- Drop the unique constraint that prevents re-sharing
-- Run this in your Supabase SQL Editor

ALTER TABLE shares DROP CONSTRAINT IF EXISTS shares_original_user_id_original_user_email_collaborator_em_key;
