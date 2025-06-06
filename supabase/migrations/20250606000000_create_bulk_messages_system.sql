-- Criar enum para status das campanhas
CREATE TYPE bulk_message_campaign_status AS ENUM ('draft', 'scheduled', 'processing', 'completed', 'cancelled', 'failed');

-- Criar enum para status das mensagens individuais
CREATE TYPE bulk_message_status AS ENUM ('pending', 'processing', 'sent', 'failed', 'cancelled');

-- Tabela principal para campanhas de mensagens em massa
CREATE TABLE bulk_message_campaigns (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
    created_by UUID NOT NULL REFERENCES profiles(id) ON DELETE RESTRICT,
    
    -- Informações da campanha
    name VARCHAR(255) NOT NULL,
    description TEXT,
    content TEXT NOT NULL,
    
    -- Configurações de envio
    channel_ids UUID[] NOT NULL, -- Array de IDs dos canais
    stage_ids UUID[] DEFAULT '{}', -- Array de IDs dos estágios do funil
    tag_ids UUID[] DEFAULT '{}', -- Array de IDs das tags
    custom_field_filters JSONB DEFAULT '{}', -- Filtros de campos customizados
    
    -- Configurações de timing
    delay_between_messages INTEGER DEFAULT 1000, -- Delay em milissegundos entre mensagens individuais
    batch_size INTEGER DEFAULT 50, -- Quantas mensagens por lote
    delay_between_batches INTEGER DEFAULT 30000, -- Delay em milissegundos entre lotes
    
    -- Agendamento
    scheduled_at TIMESTAMP WITH TIME ZONE, -- NULL = envio imediato
    
    -- Status e controle
    status bulk_message_campaign_status DEFAULT 'draft',
    started_at TIMESTAMP WITH TIME ZONE,
    completed_at TIMESTAMP WITH TIME ZONE,
    
    -- Estatísticas
    total_recipients INTEGER DEFAULT 0,
    messages_sent INTEGER DEFAULT 0,
    messages_failed INTEGER DEFAULT 0,
    
    -- Metadados
    metadata JSONB DEFAULT '{}',
    
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Tabela para armazenar a fila de mensagens a serem enviadas
CREATE TABLE bulk_message_queue (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    campaign_id UUID NOT NULL REFERENCES bulk_message_campaigns(id) ON DELETE CASCADE,
    organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
    
    -- Destinatário
    customer_id UUID NOT NULL REFERENCES customers(id) ON DELETE CASCADE,
    channel_id UUID NOT NULL REFERENCES chat_channels(id) ON DELETE CASCADE,
    
    -- Conteúdo da mensagem (pode ser personalizado por cliente)
    content TEXT NOT NULL,
    
    -- Controle de envio
    status bulk_message_status DEFAULT 'pending',
    batch_number INTEGER NOT NULL DEFAULT 1,
    position_in_batch INTEGER NOT NULL DEFAULT 1,
    
    -- Timing
    scheduled_at TIMESTAMP WITH TIME ZONE NOT NULL,
    sent_at TIMESTAMP WITH TIME ZONE,
    
    -- Resultado
    message_id UUID REFERENCES messages(id) ON DELETE SET NULL, -- ID da mensagem criada na tabela messages
    error_message TEXT,
    
    -- Metadados
    metadata JSONB DEFAULT '{}',
    
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Tabela para logs detalhados da campanha
CREATE TABLE bulk_message_logs (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    campaign_id UUID NOT NULL REFERENCES bulk_message_campaigns(id) ON DELETE CASCADE,
    organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
    
    level VARCHAR(10) NOT NULL DEFAULT 'info', -- info, warning, error
    message TEXT NOT NULL,
    details JSONB DEFAULT '{}',
    
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Índices para performance
CREATE INDEX idx_bulk_message_campaigns_org_id ON bulk_message_campaigns(organization_id);
CREATE INDEX idx_bulk_message_campaigns_status ON bulk_message_campaigns(status);
CREATE INDEX idx_bulk_message_campaigns_scheduled_at ON bulk_message_campaigns(scheduled_at);

CREATE INDEX idx_bulk_message_queue_campaign_id ON bulk_message_queue(campaign_id);
CREATE INDEX idx_bulk_message_queue_org_id ON bulk_message_queue(organization_id);
CREATE INDEX idx_bulk_message_queue_status ON bulk_message_queue(status);
CREATE INDEX idx_bulk_message_queue_scheduled_at ON bulk_message_queue(scheduled_at);
CREATE INDEX idx_bulk_message_queue_batch_number ON bulk_message_queue(campaign_id, batch_number);

CREATE INDEX idx_bulk_message_logs_campaign_id ON bulk_message_logs(campaign_id);
CREATE INDEX idx_bulk_message_logs_created_at ON bulk_message_logs(created_at);

-- Função para atualizar updated_at automaticamente
CREATE OR REPLACE FUNCTION update_bulk_message_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Triggers para atualizar updated_at
CREATE TRIGGER update_bulk_message_campaigns_updated_at
    BEFORE UPDATE ON bulk_message_campaigns
    FOR EACH ROW
    EXECUTE FUNCTION update_bulk_message_updated_at();

CREATE TRIGGER update_bulk_message_queue_updated_at
    BEFORE UPDATE ON bulk_message_queue
    FOR EACH ROW
    EXECUTE FUNCTION update_bulk_message_updated_at();

-- RLS (Row Level Security)
ALTER TABLE bulk_message_campaigns ENABLE ROW LEVEL SECURITY;
ALTER TABLE bulk_message_queue ENABLE ROW LEVEL SECURITY;
ALTER TABLE bulk_message_logs ENABLE ROW LEVEL SECURITY;

-- Políticas RLS para bulk_message_campaigns
CREATE POLICY "Users can view campaigns from their organization" ON bulk_message_campaigns
    FOR SELECT USING (
        organization_id IN (
            SELECT om.organization_id 
            FROM organization_members om 
            WHERE om.profile_id = auth.uid()
        )
    );

CREATE POLICY "Users can create campaigns in their organization" ON bulk_message_campaigns
    FOR INSERT WITH CHECK (
        organization_id IN (
            SELECT om.organization_id 
            FROM organization_members om 
            WHERE om.profile_id = auth.uid()
        )
    );

CREATE POLICY "Users can update campaigns from their organization" ON bulk_message_campaigns
    FOR UPDATE USING (
        organization_id IN (
            SELECT om.organization_id 
            FROM organization_members om 
            WHERE om.profile_id = auth.uid()
        )
    );

-- Políticas RLS para bulk_message_queue
CREATE POLICY "Users can view queue from their organization" ON bulk_message_queue
    FOR SELECT USING (
        organization_id IN (
            SELECT om.organization_id 
            FROM organization_members om 
            WHERE om.profile_id = auth.uid()
        )
    );

-- Políticas RLS para bulk_message_logs
CREATE POLICY "Users can view logs from their organization" ON bulk_message_logs
    FOR SELECT USING (
        organization_id IN (
            SELECT om.organization_id 
            FROM organization_members om 
            WHERE om.profile_id = auth.uid()
        )
    );

-- Função para calcular próximo horário de envio
CREATE OR REPLACE FUNCTION calculate_next_send_time(
    p_campaign_id UUID,
    p_batch_number INTEGER,
    p_position_in_batch INTEGER
) RETURNS TIMESTAMP WITH TIME ZONE AS $$
DECLARE
    campaign_record RECORD;
    base_time TIMESTAMP WITH TIME ZONE;
    message_delay INTEGER;
    batch_delay INTEGER;
BEGIN
    -- Buscar configurações da campanha
    SELECT 
        COALESCE(scheduled_at, NOW()) as start_time,
        delay_between_messages,
        delay_between_batches,
        batch_size
    INTO campaign_record
    FROM bulk_message_campaigns 
    WHERE id = p_campaign_id;
    
    IF NOT FOUND THEN
        RAISE EXCEPTION 'Campaign not found';
    END IF;
    
    -- Calcular tempo base (início da campanha + delay dos lotes anteriores)
    batch_delay := (p_batch_number - 1) * campaign_record.delay_between_batches;
    base_time := campaign_record.start_time + (batch_delay || ' milliseconds')::INTERVAL;
    
    -- Adicionar delay das mensagens dentro do lote atual
    message_delay := (p_position_in_batch - 1) * campaign_record.delay_between_messages;
    
    RETURN base_time + (message_delay || ' milliseconds')::INTERVAL;
END;
$$ LANGUAGE plpgsql;

-- Função para processar filtros e criar a fila de mensagens
CREATE OR REPLACE FUNCTION create_bulk_message_queue(p_campaign_id UUID)
RETURNS INTEGER AS $$
DECLARE
    campaign_record RECORD;
    customer_record RECORD;
    batch_number INTEGER := 1;
    position_in_batch INTEGER := 1;
    total_count INTEGER := 0;
    send_time TIMESTAMP WITH TIME ZONE;
    channel_id UUID;
BEGIN
    -- Buscar configurações da campanha
    SELECT * INTO campaign_record FROM bulk_message_campaigns WHERE id = p_campaign_id;
    
    IF NOT FOUND THEN
        RAISE EXCEPTION 'Campaign not found';
    END IF;
    
    -- Loop através de todos os canais
    FOREACH channel_id IN ARRAY campaign_record.channel_ids
    LOOP
        -- Buscar clientes que atendem aos critérios
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
                channel_id,
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
    END LOOP;
    
    -- Atualizar contador total na campanha
    UPDATE bulk_message_campaigns 
    SET total_recipients = total_count
    WHERE id = p_campaign_id;
    
    RETURN total_count;
END;
$$ LANGUAGE plpgsql;

-- Função para incrementar estatísticas da campanha
CREATE OR REPLACE FUNCTION increment_campaign_stats(
    p_campaign_id UUID,
    p_messages_sent INTEGER,
    p_messages_failed INTEGER
) RETURNS VOID AS $$
BEGIN
    UPDATE bulk_message_campaigns
    SET 
        messages_sent = messages_sent + p_messages_sent,
        messages_failed = messages_failed + p_messages_failed
    WHERE id = p_campaign_id;
END;
$$ LANGUAGE plpgsql; 