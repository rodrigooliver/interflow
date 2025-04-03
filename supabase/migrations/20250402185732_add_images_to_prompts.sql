-- Adiciona a coluna media na tabela prompts
ALTER TABLE prompts
ADD COLUMN media JSONB DEFAULT '[]'::jsonb;

-- Adiciona um comentário na coluna
COMMENT ON COLUMN prompts.media IS 'Array de mídia associada ao prompt';

-- Cria um índice GIN para melhorar a performance de consultas na coluna JSONB
CREATE INDEX prompts_media_idx ON prompts USING GIN (media);

-- Adiciona a coluna prompt_id na tabela files
ALTER TABLE files
ADD COLUMN prompt_id UUID REFERENCES prompts(id) ON DELETE CASCADE;

-- Adiciona um comentário na coluna
COMMENT ON COLUMN files.prompt_id IS 'ID do prompt associado ao arquivo';

-- Cria um índice para melhorar a performance de consultas
CREATE INDEX files_prompt_id_idx ON files(prompt_id); 