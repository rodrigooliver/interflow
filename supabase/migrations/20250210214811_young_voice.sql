-- Drop existing storage policies to avoid conflicts
DROP POLICY IF EXISTS "Authenticated users can upload files" ON storage.objects;
DROP POLICY IF EXISTS "Authenticated users can read files" ON storage.objects;
DROP POLICY IF EXISTS "Users can delete their own files" ON storage.objects;

-- Create storage bucket for attachments if it doesn't exist
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM storage.buckets WHERE id = 'attachments'
  ) THEN
    INSERT INTO storage.buckets (id, name, public)
    VALUES ('attachments', 'attachments', true);
  END IF;
END $$;

-- Allow authenticated users to upload files
CREATE POLICY "Authenticated users can upload files"
  ON storage.objects
  FOR INSERT
  TO authenticated
  WITH CHECK (bucket_id = 'attachments');

-- Allow authenticated users to read files
CREATE POLICY "Authenticated users can read files"
  ON storage.objects
  FOR SELECT
  TO authenticated
  USING (bucket_id = 'attachments');

-- Allow authenticated users to delete files
CREATE POLICY "Authenticated users can delete files"
  ON storage.objects
  FOR DELETE
  TO authenticated
  USING (bucket_id = 'attachments');

-- Drop existing policies for message_shortcuts if they exist
DROP POLICY IF EXISTS "Organization members can view shortcuts" ON message_shortcuts;
DROP POLICY IF EXISTS "Organization members can manage shortcuts" ON message_shortcuts;

-- Create new policies for message shortcuts
CREATE POLICY "Organization members can view shortcuts"
  ON message_shortcuts
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM organization_members
      WHERE organization_members.organization_id = message_shortcuts.organization_id
      AND organization_members.user_id = auth.uid()
    )
  );

CREATE POLICY "Organization members can manage shortcuts"
  ON message_shortcuts
  FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM organization_members
      WHERE organization_members.organization_id = message_shortcuts.organization_id
      AND organization_members.user_id = auth.uid()
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM organization_members
      WHERE organization_members.organization_id = message_shortcuts.organization_id
      AND organization_members.user_id = auth.uid()
    )
  );