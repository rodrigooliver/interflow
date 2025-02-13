-- Add storage limit fields to organizations table
ALTER TABLE organizations
ADD COLUMN storage_limit BIGINT NOT NULL DEFAULT 104857600, -- 100MB default
ADD COLUMN storage_used BIGINT NOT NULL DEFAULT 0;

-- Create function to update storage usage
CREATE OR REPLACE FUNCTION update_organization_storage()
RETURNS TRIGGER AS $$
DECLARE
  org_id UUID;
  file_size BIGINT;
BEGIN
  -- Get organization ID from the file path
  org_id := (regexp_match(NEW.name, '^([^/]+)/'))[1]::UUID;
  
  IF TG_OP = 'INSERT' THEN
    -- Add file size to storage used
    UPDATE organizations 
    SET storage_used = storage_used + NEW.metadata->>'size'::BIGINT
    WHERE id = org_id;
  ELSIF TG_OP = 'DELETE' THEN
    -- Subtract file size from storage used
    UPDATE organizations 
    SET storage_used = GREATEST(0, storage_used - OLD.metadata->>'size'::BIGINT)
    WHERE id = org_id;
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger for storage tracking
DROP TRIGGER IF EXISTS track_storage_changes ON storage.objects;
CREATE TRIGGER track_storage_changes
  AFTER INSERT OR DELETE ON storage.objects
  FOR EACH ROW
  EXECUTE FUNCTION update_organization_storage();

-- Add storage limit to subscription plans
ALTER TABLE subscription_plans
ADD COLUMN storage_limit BIGINT NOT NULL DEFAULT 104857600; -- 100MB default

-- Update existing subscription plans with storage limits
UPDATE subscription_plans
SET storage_limit = CASE 
  WHEN name = 'Starter' THEN 104857600    -- 100MB
  WHEN name = 'Professional' THEN 524288000  -- 500MB
  WHEN name = 'Enterprise' THEN 1073741824   -- 1GB
  ELSE 104857600  -- Default 100MB
END;