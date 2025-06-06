-- Adicionar status "paused" aos enums
ALTER TYPE bulk_message_campaign_status ADD VALUE IF NOT EXISTS 'paused';
ALTER TYPE bulk_message_status ADD VALUE IF NOT EXISTS 'paused'; 