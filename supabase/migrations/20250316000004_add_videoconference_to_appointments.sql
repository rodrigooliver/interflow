-- Add videoconference capability to appointments
ALTER TABLE IF EXISTS appointments
ADD COLUMN IF NOT EXISTS has_videoconference boolean NOT NULL DEFAULT false; 