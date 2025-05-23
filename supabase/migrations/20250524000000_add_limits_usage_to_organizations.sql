-- Adicionar colunas de limits e usage na tabela organizations
ALTER TABLE organizations
ADD COLUMN limits JSONB NOT NULL DEFAULT '{}'::jsonb,
ADD COLUMN usage JSONB NOT NULL DEFAULT '{}'::jsonb;

-- Criar índices GIN para consultas eficientes em campos JSONB
CREATE INDEX idx_organizations_limits ON organizations USING GIN (limits);
CREATE INDEX idx_organizations_usage ON organizations USING GIN (usage);

-- Adicionar comentários nas colunas para documentação
COMMENT ON COLUMN organizations.limits IS 'Limites de uso da organização (ex: tokens_per_month, max_users, max_customers, etc.) em formato JSON';
COMMENT ON COLUMN organizations.usage IS 'Uso atual da organização (ex: tokens_used_this_month, current_users, current_customers, etc.) em formato JSON';


-- Adicionar coluna max_tokens mensais na tabela subscription_plans
ALTER TABLE subscription_plans
ADD COLUMN max_tokens BIGINT NOT NULL DEFAULT 10000;

-- Adicionar comentário na coluna para documentação
COMMENT ON COLUMN subscription_plans.max_tokens IS 'Limite máximo de tokens por mês para este plano de assinatura';
