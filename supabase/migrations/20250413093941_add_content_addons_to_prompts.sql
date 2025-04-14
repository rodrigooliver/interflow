-- Adiciona a coluna content_addons à tabela prompts
ALTER TABLE prompts
ADD COLUMN content_addons JSONB DEFAULT '[]'::jsonb;

-- Comentário explicativo da coluna
COMMENT ON COLUMN prompts.content_addons IS 'Lista de objetos JSON que complementam o conteúdo do prompt';

-- Adiciona índice para melhorar performance das consultas por organization_id
CREATE INDEX IF NOT EXISTS idx_prompts_organization_id ON prompts(organization_id); 