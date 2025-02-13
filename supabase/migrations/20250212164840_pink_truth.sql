/*
  # Add Flow Draft System

  1. Changes
    - Add draft_nodes and draft_edges columns to flows table
    - Add is_published column to flows table
    - Add published_at column to flows table

  2. Notes
    - draft_nodes and draft_edges store the work in progress version
    - nodes and edges store the published version
    - is_published indicates if the flow has ever been published
    - published_at tracks when the flow was last published
*/

-- Add new columns for draft system
ALTER TABLE flows 
ADD COLUMN IF NOT EXISTS draft_nodes jsonb DEFAULT '[]'::jsonb,
ADD COLUMN IF NOT EXISTS draft_edges jsonb DEFAULT '[]'::jsonb,
ADD COLUMN IF NOT EXISTS is_published boolean DEFAULT false,
ADD COLUMN IF NOT EXISTS published_at timestamptz;

-- Update RLS policies
CREATE POLICY "Users can read flows they have access to"
ON flows
FOR SELECT
TO authenticated
USING (
  organization_id IN (
    SELECT organization_id 
    FROM organization_members 
    WHERE user_id = auth.uid()
  )
);

CREATE POLICY "Users can update flows they have access to"
ON flows
FOR UPDATE
TO authenticated
USING (
  organization_id IN (
    SELECT organization_id 
    FROM organization_members 
    WHERE user_id = auth.uid()
  )
)
WITH CHECK (
  organization_id IN (
    SELECT organization_id 
    FROM organization_members 
    WHERE user_id = auth.uid()
  )
);