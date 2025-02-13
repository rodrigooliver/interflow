/*
  # Flow Configuration Update

  1. Changes
    - Add debounce_time to flows table
    - Add input_type to flow_sessions table
    - Add selected_option to flow_sessions table
    
  2. Security
    - Maintain existing RLS policies
*/

-- Add debounce_time to flows table
ALTER TABLE flows
ADD COLUMN debounce_time INTEGER NOT NULL DEFAULT 1000;

-- Add input related columns to flow_sessions
ALTER TABLE flow_sessions
ADD COLUMN input_type TEXT CHECK (input_type IN ('text', 'options')),
ADD COLUMN selected_option JSONB;