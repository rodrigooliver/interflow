-- Adiciona novas colunas para suportar múltiplos idiomas e moedas
ALTER TABLE subscription_plans
  -- Descrições em diferentes idiomas
  ADD COLUMN description_pt TEXT,
  ADD COLUMN description_en TEXT,
  ADD COLUMN description_es TEXT,
  -- Nome em diferentes idiomas
  ADD COLUMN name_pt TEXT,
  ADD COLUMN name_en TEXT,
  ADD COLUMN name_es TEXT,
  -- Preços em diferentes moedas
  ADD COLUMN price_brl NUMERIC(10, 2),
  ADD COLUMN price_usd NUMERIC(10, 2),
  -- Moeda padrão do plano
  ADD COLUMN default_currency TEXT CHECK (default_currency IN ('BRL', 'USD')) DEFAULT 'BRL';

-- Migra os dados existentes
UPDATE subscription_plans
SET 
  description_pt = description,
  name_pt = name,
  price_brl = price;

-- Remove as colunas antigas
ALTER TABLE subscription_plans
  DROP COLUMN description,
  DROP COLUMN name,
  DROP COLUMN price; 