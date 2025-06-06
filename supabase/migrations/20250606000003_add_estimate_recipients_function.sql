-- Função para estimar número de destinatários baseado nos filtros
CREATE OR REPLACE FUNCTION estimate_bulk_message_recipients(
    p_organization_id UUID,
    p_channel_id UUID,
    p_stage_ids UUID[] DEFAULT NULL,
    p_tag_ids UUID[] DEFAULT NULL
)
RETURNS INTEGER AS $$
DECLARE
    channel_type VARCHAR(50);
    required_contact_type VARCHAR(20);
    recipients_count INTEGER := 0;
BEGIN
    -- Buscar tipo do canal
    SELECT type INTO channel_type
    FROM chat_channels
    WHERE id = p_channel_id AND organization_id = p_organization_id;
    
    IF NOT FOUND THEN
        RETURN 0;
    END IF;
    
    -- Determinar o tipo de contato necessário baseado no tipo do canal
    CASE channel_type
        WHEN 'whatsapp_official', 'whatsapp_wapi', 'whatsapp_zapi', 'whatsapp_evo' THEN
            required_contact_type := 'whatsapp';
        WHEN 'email' THEN
            required_contact_type := 'email';
        WHEN 'instagram' THEN
            required_contact_type := 'instagramId';
        WHEN 'facebook' THEN
            required_contact_type := 'facebookId';
        ELSE
            RETURN 0;
    END CASE;
    
    -- Contar clientes que atendem aos critérios
    WITH filtered_customers AS (
        SELECT DISTINCT c.id
        FROM customers c
        WHERE c.organization_id = p_organization_id
        -- Filtro por estágio do funil
        AND (
            p_stage_ids IS NULL OR 
            array_length(p_stage_ids, 1) IS NULL OR
            c.stage_id = ANY(p_stage_ids)
        )
        -- Filtro por tags
        AND (
            p_tag_ids IS NULL OR 
            array_length(p_tag_ids, 1) IS NULL OR
            EXISTS (
                SELECT 1 FROM customer_tags ct 
                WHERE ct.customer_id = c.id 
                AND ct.tag_id = ANY(p_tag_ids)
            )
        )
        -- Verificar se o cliente tem contato do tipo necessário
        AND EXISTS (
            SELECT 1 FROM customer_contacts cc
            WHERE cc.customer_id = c.id
            AND cc.type::text = required_contact_type
            AND cc.value IS NOT NULL
            AND cc.value != ''
        )
    )
    SELECT COUNT(*) INTO recipients_count
    FROM filtered_customers;
    
    RETURN recipients_count;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER; 