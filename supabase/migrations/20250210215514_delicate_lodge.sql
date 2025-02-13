-- Add file size validation function
CREATE OR REPLACE FUNCTION validate_attachment_size()
RETURNS TRIGGER AS $$
BEGIN
  -- Check if any attachment in the array exceeds 10MB (10485760 bytes)
  IF EXISTS (
    SELECT 1
    FROM jsonb_array_elements(NEW.attachments) AS attachment
    WHERE (attachment->>'size')::bigint > 10485760
  ) THEN
    RAISE EXCEPTION 'Attachment size exceeds 10MB limit';
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger for file size validation
DROP TRIGGER IF EXISTS check_attachment_size ON message_shortcuts;
CREATE TRIGGER check_attachment_size
  BEFORE INSERT OR UPDATE ON message_shortcuts
  FOR EACH ROW
  EXECUTE FUNCTION validate_attachment_size();