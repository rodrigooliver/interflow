/*
  # Remove storage tracking system

  1. Changes
    - Drop triggers for updating organization storage
    - Drop function for updating organization storage
    - Remove storage_used column from organizations table

  2. Security
    - No security changes

  Note: Using CASCADE to safely remove all dependent objects
*/

-- Drop all triggers that depend on the function first
DROP TRIGGER IF EXISTS track_storage_changes ON storage.objects;
DROP TRIGGER IF EXISTS update_storage_trigger ON storage.objects;
DROP TRIGGER IF EXISTS update_organization_storage_trigger ON storage.objects;

-- Now we can safely drop the function
DROP FUNCTION IF EXISTS update_organization_storage();

-- Remove storage_used column from organizations
ALTER TABLE organizations 
DROP COLUMN IF EXISTS storage_used;