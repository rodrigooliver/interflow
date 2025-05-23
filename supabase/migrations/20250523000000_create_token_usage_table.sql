-- Criar enum para fonte do token
CREATE TYPE token_source_type AS ENUM ('system', 'client');

-- Criar tabela para controle de uso de tokens
CREATE TABLE token_usage (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
    prompt_id UUID REFERENCES prompts(id) ON DELETE SET NULL,
    customer_id UUID REFERENCES customers(id) ON DELETE SET NULL,
    chat_id UUID REFERENCES chats(id) ON DELETE SET NULL,
    integration_id UUID REFERENCES integrations(id) ON DELETE SET NULL,
    
    -- Fonte do token (sistema ou cliente)
    token_source token_source_type NOT NULL DEFAULT 'system',
    
    -- Informações do modelo e tokens
    model_name VARCHAR(100) NOT NULL,
    input_tokens INTEGER NOT NULL DEFAULT 0,
    output_tokens INTEGER NOT NULL DEFAULT 0,
    total_tokens INTEGER GENERATED ALWAYS AS (input_tokens + output_tokens) STORED,
    
    -- Custo estimado em USD (opcional)
    cost_usd DECIMAL(10, 6) DEFAULT NULL,
    
    -- Metadados adicionais
    metadata JSONB DEFAULT '{}',
    
    -- Timestamps
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW() NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW() NOT NULL
);

-- Criar índices para otimizar consultas de relatórios
CREATE INDEX idx_token_usage_organization_id ON token_usage(organization_id);
CREATE INDEX idx_token_usage_created_at ON token_usage(created_at);
CREATE INDEX idx_token_usage_org_date ON token_usage(organization_id, created_at);
CREATE INDEX idx_token_usage_token_source ON token_usage(token_source);
CREATE INDEX idx_token_usage_integration_id ON token_usage(integration_id) WHERE integration_id IS NOT NULL;
CREATE INDEX idx_token_usage_prompt_id ON token_usage(prompt_id) WHERE prompt_id IS NOT NULL;
CREATE INDEX idx_token_usage_customer_id ON token_usage(customer_id) WHERE customer_id IS NOT NULL;
CREATE INDEX idx_token_usage_chat_id ON token_usage(chat_id) WHERE chat_id IS NOT NULL;

-- Índices compostos para relatórios
CREATE INDEX idx_token_usage_org_source ON token_usage(organization_id, token_source);
CREATE INDEX idx_token_usage_org_source_date ON token_usage(organization_id, token_source, created_at);

-- Trigger para atualizar updated_at
CREATE OR REPLACE FUNCTION update_token_usage_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_update_token_usage_updated_at
    BEFORE UPDATE ON token_usage
    FOR EACH ROW
    EXECUTE FUNCTION update_token_usage_updated_at();

-- Habilitar RLS
ALTER TABLE token_usage ENABLE ROW LEVEL SECURITY;

-- Política RLS: usuários só podem ver dados da própria organização
CREATE POLICY "Users can view token usage from their organization" ON token_usage
    FOR SELECT 
    USING (
        organization_id IN (
            SELECT om.organization_id 
            FROM organization_members om 
            WHERE om.user_id = auth.uid()
        )
    );

-- Política RLS: usuários podem inserir dados para sua organização
CREATE POLICY "Users can insert token usage for their organization" ON token_usage
    FOR INSERT 
    WITH CHECK (
        organization_id IN (
            SELECT om.organization_id 
            FROM organization_members om 
            WHERE om.user_id = auth.uid()
        )
    );

-- Política RLS: usuários podem atualizar dados da própria organização
CREATE POLICY "Users can update token usage from their organization" ON token_usage
    FOR UPDATE 
    USING (
        organization_id IN (
            SELECT om.organization_id 
            FROM organization_members om 
            WHERE om.user_id = auth.uid()
        )
    );

-- Política RLS: usuários podem deletar dados da própria organização (apenas admins)
CREATE POLICY "Admins can delete token usage from their organization" ON token_usage
    FOR DELETE 
    USING (
        organization_id IN (
            SELECT om.organization_id 
            FROM organization_members om 
            WHERE om.user_id = auth.uid() 
            AND om.role = 'admin'
        )
    );

-- Função para relatório mensal de uso de tokens
CREATE OR REPLACE FUNCTION get_monthly_token_usage_report(
    p_organization_id UUID,
    p_year INTEGER,
    p_month INTEGER,
    p_token_source token_source_type DEFAULT NULL
)
RETURNS TABLE (
    month_year TEXT,
    token_source token_source_type,
    model_name VARCHAR(100),
    total_usage_count BIGINT,
    total_input_tokens BIGINT,
    total_output_tokens BIGINT,
    total_tokens BIGINT,
    total_cost_usd DECIMAL(15, 6),
    avg_tokens_per_usage DECIMAL(10, 2)
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
    RETURN QUERY
    SELECT 
        TO_CHAR(DATE_TRUNC('month', tu.created_at), 'YYYY-MM') as month_year,
        tu.token_source,
        tu.model_name,
        COUNT(*) as total_usage_count,
        SUM(tu.input_tokens) as total_input_tokens,
        SUM(tu.output_tokens) as total_output_tokens,
        SUM(tu.total_tokens) as total_tokens,
        COALESCE(SUM(tu.cost_usd), 0) as total_cost_usd,
        ROUND(AVG(tu.total_tokens), 2) as avg_tokens_per_usage
    FROM token_usage tu
    WHERE tu.organization_id = p_organization_id
        AND EXTRACT(YEAR FROM tu.created_at) = p_year
        AND EXTRACT(MONTH FROM tu.created_at) = p_month
        AND (p_token_source IS NULL OR tu.token_source = p_token_source)
    GROUP BY 
        DATE_TRUNC('month', tu.created_at),
        tu.token_source,
        tu.model_name
    ORDER BY 
        month_year DESC,
        tu.token_source,
        total_tokens DESC;
END;
$$;

-- Função para relatório de uso por cliente
CREATE OR REPLACE FUNCTION get_customer_token_usage_report(
    p_organization_id UUID,
    p_start_date DATE DEFAULT NULL,
    p_end_date DATE DEFAULT NULL
)
RETURNS TABLE (
    customer_id UUID,
    customer_name VARCHAR(255),
    total_usage_count BIGINT,
    total_input_tokens BIGINT,
    total_output_tokens BIGINT,
    total_tokens BIGINT,
    total_cost_usd DECIMAL(15, 6)
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
    RETURN QUERY
    SELECT 
        c.id as customer_id,
        c.name as customer_name,
        COUNT(tu.*) as total_usage_count,
        COALESCE(SUM(tu.input_tokens), 0) as total_input_tokens,
        COALESCE(SUM(tu.output_tokens), 0) as total_output_tokens,
        COALESCE(SUM(tu.total_tokens), 0) as total_tokens,
        COALESCE(SUM(tu.cost_usd), 0) as total_cost_usd
    FROM customers c
    LEFT JOIN token_usage tu ON c.id = tu.customer_id
        AND tu.organization_id = p_organization_id
        AND (p_start_date IS NULL OR tu.created_at >= p_start_date)
        AND (p_end_date IS NULL OR tu.created_at <= p_end_date)
    WHERE c.organization_id = p_organization_id
    GROUP BY c.id, c.name
    HAVING COUNT(tu.*) > 0
    ORDER BY total_tokens DESC;
END;
$$;

-- Comentários na tabela e colunas
COMMENT ON TABLE token_usage IS 'Tabela para controle de uso de tokens de IA por organização';
COMMENT ON COLUMN token_usage.token_source IS 'Fonte do token: system (do sistema) ou client (do cliente)';
COMMENT ON COLUMN token_usage.integration_id IS 'ID da integração quando usar token do cliente, NULL quando usar token do sistema';
COMMENT ON COLUMN token_usage.model_name IS 'Nome do modelo de IA utilizado (ex: gpt-4, claude-3, etc.)';
COMMENT ON COLUMN token_usage.input_tokens IS 'Número de tokens de entrada (prompt)';
COMMENT ON COLUMN token_usage.output_tokens IS 'Número de tokens de saída (resposta)';
COMMENT ON COLUMN token_usage.total_tokens IS 'Total de tokens utilizados (calculado automaticamente)';
COMMENT ON COLUMN token_usage.cost_usd IS 'Custo estimado em dólares americanos';
COMMENT ON COLUMN token_usage.metadata IS 'Metadados adicionais em formato JSON'; 