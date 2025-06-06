-- Primeiro, remover registros existentes na tabela bulk_message_campaigns (se houver)
-- para evitar problemas com a migração
DELETE FROM bulk_message_campaigns;

-- Alterar a tabela bulk_message_campaigns para usar apenas um canal
ALTER TABLE bulk_message_campaigns 
DROP COLUMN IF EXISTS channel_ids,
ADD COLUMN IF NOT EXISTS channel_id UUID;

-- Agora adicionar a constraint NOT NULL e a foreign key
ALTER TABLE bulk_message_campaigns 
ALTER COLUMN channel_id SET NOT NULL,
ADD CONSTRAINT fk_bulk_message_campaigns_channel_id 
FOREIGN KEY (channel_id) REFERENCES chat_channels(id) ON DELETE CASCADE;

-- Atualizar a função create_bulk_message_queue para trabalhar com apenas um canal
CREATE OR REPLACE FUNCTION create_bulk_message_queue(p_campaign_id UUID)
RETURNS INTEGER AS $$
DECLARE
    campaign_record RECORD;
    customer_record RECORD;
    batch_number INTEGER := 1;
    position_in_batch INTEGER := 1;
    total_count INTEGER := 0;
    send_time TIMESTAMP WITH TIME ZONE;
    required_contact_type VARCHAR(20);
BEGIN
    -- Buscar configurações da campanha
    SELECT 
        c.*,
        ch.type as channel_type
    INTO campaign_record 
    FROM bulk_message_campaigns c
    JOIN chat_channels ch ON ch.id = c.channel_id
    WHERE c.id = p_campaign_id;
    
    IF NOT FOUND THEN
        RAISE EXCEPTION 'Campaign not found';
    END IF;
    
    -- Determinar o tipo de contato necessário baseado no tipo do canal
    CASE campaign_record.channel_type
        WHEN 'whatsapp_official', 'whatsapp_wapi', 'whatsapp_zapi', 'whatsapp_evo' THEN
            required_contact_type := 'whatsapp';
        WHEN 'email' THEN
            required_contact_type := 'email';
        WHEN 'instagram' THEN
            required_contact_type := 'instagramId';
        WHEN 'facebook' THEN
            required_contact_type := 'facebookId';
        ELSE
            RAISE EXCEPTION 'Unsupported channel type: %', campaign_record.channel_type;
    END CASE;
    
    -- Buscar clientes que atendem aos critérios E têm contato apropriado
    FOR customer_record IN
        SELECT DISTINCT c.id as customer_id
        FROM customers c
        WHERE c.organization_id = campaign_record.organization_id
        AND (
            -- Filtro por estágio do funil
            array_length(campaign_record.stage_ids, 1) IS NULL OR
            c.stage_id = ANY(campaign_record.stage_ids)
        )
        AND (
            -- Filtro por tags
            array_length(campaign_record.tag_ids, 1) IS NULL OR
            EXISTS (
                SELECT 1 FROM customer_tags ct 
                WHERE ct.customer_id = c.id 
                AND ct.tag_id = ANY(campaign_record.tag_ids)
            )
        )
        AND (
            -- Verificar se o cliente tem contato do tipo necessário
            EXISTS (
                SELECT 1 FROM customer_contacts cc
                WHERE cc.customer_id = c.id
                AND cc.type::text = required_contact_type
                AND cc.value IS NOT NULL
                AND cc.value != ''
            )
        )
        -- Aqui podem ser adicionados mais filtros baseados em custom_field_filters
    LOOP
        -- Calcular horário de envio para esta mensagem
        send_time := calculate_next_send_time(p_campaign_id, batch_number, position_in_batch);
        
        -- Inserir na fila
        INSERT INTO bulk_message_queue (
            campaign_id,
            organization_id,
            customer_id,
            channel_id,
            content,
            batch_number,
            position_in_batch,
            scheduled_at
        ) VALUES (
            p_campaign_id,
            campaign_record.organization_id,
            customer_record.customer_id,
            campaign_record.channel_id,
            campaign_record.content,
            batch_number,
            position_in_batch,
            send_time
        );
        
        total_count := total_count + 1;
        position_in_batch := position_in_batch + 1;
        
        -- Se atingiu o tamanho do lote, mover para o próximo lote
        IF position_in_batch > campaign_record.batch_size THEN
            batch_number := batch_number + 1;
            position_in_batch := 1;
        END IF;
    END LOOP;
    
    -- Atualizar contador total na campanha
    UPDATE bulk_message_campaigns 
    SET total_recipients = total_count
    WHERE id = p_campaign_id;
    
    RETURN total_count;
END;
$$ LANGUAGE plpgsql; 