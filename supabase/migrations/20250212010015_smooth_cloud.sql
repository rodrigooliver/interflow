-- Add storage limit fields to organizations table
ALTER TABLE organizations
ADD COLUMN storage_limit BIGINT NOT NULL DEFAULT 104857600, -- 100MB default
ADD COLUMN storage_used BIGINT NOT NULL DEFAULT 0;
