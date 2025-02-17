-- Adiciona a coluna triggers à tabela flows
ALTER TABLE public.flows ADD COLUMN IF NOT EXISTS triggers jsonb NOT NULL DEFAULT '[]'::jsonb;

-- Garante que a coluna está com o valor padrão correto para registros existentes
UPDATE public.flows SET triggers = '[]'::jsonb WHERE triggers IS NULL; 