/*
  # Create file statistics function

  1. New Functions
    - `get_file_stats_by_type` - Get file statistics grouped by type
      - Parameters:
        - `org_id` (uuid) - Organization ID
      - Returns:
        - `message_files_count` (integer) - Number of files attached to messages
        - `message_files_size` (bigint) - Total size of files attached to messages
        - `integration_files_count` (integer) - Number of files attached to integrations
        - `integration_files_size` (bigint) - Total size of files attached to integrations
        - `flow_files_count` (integer) - Number of files attached to flows
        - `flow_files_size` (bigint) - Total size of files attached to flows
        - `prompt_files_count` (integer) - Number of files attached to prompts
        - `prompt_files_size` (bigint) - Total size of files attached to prompts
        - `shortcut_files_count` (integer) - Number of files attached to shortcuts
        - `shortcut_files_size` (bigint) - Total size of files attached to shortcuts
        - `other_files_count` (integer) - Number of files not attached to any entity
        - `other_files_size` (bigint) - Total size of files not attached to any entity
        - `total_size` (bigint) - Total size of all files
*/

-- Create function to get file statistics by type
CREATE OR REPLACE FUNCTION public.get_file_stats_by_type(org_id uuid)
RETURNS TABLE (
  message_files_count integer,
  message_files_size bigint,
  integration_files_count integer,
  integration_files_size bigint,
  flow_files_count integer,
  flow_files_size bigint,
  prompt_files_count integer,
  prompt_files_size bigint,
  shortcut_files_count integer,
  shortcut_files_size bigint,
  other_files_count integer,
  other_files_size bigint,
  total_size bigint
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Count and sum files by type
  RETURN QUERY
  WITH file_stats AS (
    SELECT
      CASE
        WHEN message_id IS NOT NULL THEN 'message'
        WHEN integration_id IS NOT NULL THEN 'integration'
        WHEN flow_id IS NOT NULL THEN 'flow'
        WHEN prompt_id IS NOT NULL THEN 'prompt'
        WHEN shortcut_id IS NOT NULL THEN 'shortcut'
        ELSE 'other'
      END AS file_type,
      COUNT(*) AS file_count,
      SUM(size) AS total_size
    FROM files
    WHERE organization_id = org_id
    GROUP BY file_type
  ),
  total AS (
    SELECT SUM(size) AS total_size
    FROM files
    WHERE organization_id = org_id
  )
  SELECT
    COALESCE((SELECT file_count FROM file_stats WHERE file_type = 'message'), 0)::integer AS message_files_count,
    COALESCE((SELECT file_stats.total_size FROM file_stats WHERE file_type = 'message'), 0)::bigint AS message_files_size,
    COALESCE((SELECT file_count FROM file_stats WHERE file_type = 'integration'), 0)::integer AS integration_files_count,
    COALESCE((SELECT file_stats.total_size FROM file_stats WHERE file_type = 'integration'), 0)::bigint AS integration_files_size,
    COALESCE((SELECT file_count FROM file_stats WHERE file_type = 'flow'), 0)::integer AS flow_files_count,
    COALESCE((SELECT file_stats.total_size FROM file_stats WHERE file_type = 'flow'), 0)::bigint AS flow_files_size,
    COALESCE((SELECT file_count FROM file_stats WHERE file_type = 'prompt'), 0)::integer AS prompt_files_count,
    COALESCE((SELECT file_stats.total_size FROM file_stats WHERE file_type = 'prompt'), 0)::bigint AS prompt_files_size,
    COALESCE((SELECT file_count FROM file_stats WHERE file_type = 'shortcut'), 0)::integer AS shortcut_files_count,
    COALESCE((SELECT file_stats.total_size FROM file_stats WHERE file_type = 'shortcut'), 0)::bigint AS shortcut_files_size,
    COALESCE((SELECT file_count FROM file_stats WHERE file_type = 'other'), 0)::integer AS other_files_count,
    COALESCE((SELECT file_stats.total_size FROM file_stats WHERE file_type = 'other'), 0)::bigint AS other_files_size,
    COALESCE((SELECT total.total_size FROM total), 0)::bigint AS total_size;
END;
$$;

-- Grant access to authenticated users
GRANT EXECUTE ON FUNCTION public.get_file_stats_by_type(uuid) TO authenticated; 