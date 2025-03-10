-- Altera a estrutura da tabela para suportar features em múltiplos idiomas
ALTER TABLE subscription_plans
  ADD COLUMN features_pt JSONB DEFAULT '[]'::jsonb,
  ADD COLUMN features_en JSONB DEFAULT '[]'::jsonb,
  ADD COLUMN features_es JSONB DEFAULT '[]'::jsonb;

-- Migra os dados existentes
UPDATE subscription_plans
SET 
  features_pt = features,
  features_en = features,
  features_es = features;

-- Remove a coluna antiga
ALTER TABLE subscription_plans
  DROP COLUMN features; 