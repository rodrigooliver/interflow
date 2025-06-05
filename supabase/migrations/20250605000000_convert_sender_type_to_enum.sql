/*
  # Convert sender_type to ENUM for better performance and storage efficiency
  # Safe migration for large tables - processes data in batches
  # This migration checks if conversion is needed (idempotent)

  1. Check if sender_type is already ENUM type
  2. If not, create ENUM type and migrate data safely
  3. If already ENUM, skip migration
*/

DO $$
DECLARE
    current_type TEXT;
BEGIN
    -- Check current data type of sender_type column
    SELECT data_type INTO current_type
    FROM information_schema.columns 
    WHERE table_name = 'messages' 
    AND column_name = 'sender_type' 
    AND table_schema = 'public';

    -- Only proceed if current type is not already USER-DEFINED (enum)
    IF current_type = 'text' THEN
        RAISE NOTICE 'Converting sender_type from TEXT to ENUM...';
        
        -- Create ENUM type if it doesn't exist
        CREATE TYPE IF NOT EXISTS sender_type_enum AS ENUM ('customer', 'agent', 'system');

        -- Add new column with ENUM type (nullable initially to allow batch processing)
        ALTER TABLE messages ADD COLUMN sender_type_new sender_type_enum;

        -- Create function to migrate data in batches
        CREATE OR REPLACE FUNCTION migrate_sender_type_batch() RETURNS void AS $$
        DECLARE
            batch_size INTEGER := 10000;
            updated_rows INTEGER;
            total_migrated INTEGER := 0;
        BEGIN
            LOOP
                -- Update batch of records where new column is still null
                UPDATE messages 
                SET sender_type_new = sender_type::sender_type_enum 
                WHERE sender_type_new IS NULL 
                AND id IN (
                    SELECT id FROM messages 
                    WHERE sender_type_new IS NULL 
                    LIMIT batch_size
                );
                
                GET DIAGNOSTICS updated_rows = ROW_COUNT;
                total_migrated := total_migrated + updated_rows;
                
                -- Log progress
                RAISE NOTICE 'Migrated % rows (total: %)', updated_rows, total_migrated;
                
                -- Exit if no more rows to update
                EXIT WHEN updated_rows = 0;
                
                -- Small delay to avoid overwhelming the database
                PERFORM pg_sleep(0.1);
            END LOOP;
            
            RAISE NOTICE 'Migration completed! Total rows migrated: %', total_migrated;
        END;
        $$ LANGUAGE plpgsql;

        -- Execute the batch migration
        SELECT migrate_sender_type_batch();

        -- Drop the migration function as it's no longer needed
        DROP FUNCTION migrate_sender_type_batch();

        -- Make the new column NOT NULL (only after all data is migrated)
        ALTER TABLE messages ALTER COLUMN sender_type_new SET NOT NULL;

        -- Drop the old column
        ALTER TABLE messages DROP COLUMN sender_type;

        -- Rename new column to original name
        ALTER TABLE messages RENAME COLUMN sender_type_new TO sender_type;
        
        RAISE NOTICE 'Successfully converted sender_type to ENUM!';
        
    ELSE
        RAISE NOTICE 'sender_type is already ENUM type, skipping migration.';
    END IF;
END $$; 