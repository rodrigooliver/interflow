-- Adiciona novas colunas para recursos adicionais
ALTER TABLE subscription_plans
  -- Limites adicionais
  ADD COLUMN max_channels INTEGER NOT NULL DEFAULT 1,
  ADD COLUMN max_flows INTEGER NOT NULL DEFAULT 5,
  ADD COLUMN max_teams INTEGER NOT NULL DEFAULT 1,
  
  -- Preços para recursos adicionais
  ADD COLUMN additional_user_price_brl NUMERIC(10, 2),
  ADD COLUMN additional_user_price_usd NUMERIC(10, 2),
  ADD COLUMN additional_channel_price_brl NUMERIC(10, 2),
  ADD COLUMN additional_channel_price_usd NUMERIC(10, 2),
  ADD COLUMN additional_flow_price_brl NUMERIC(10, 2),
  ADD COLUMN additional_flow_price_usd NUMERIC(10, 2),
  ADD COLUMN additional_team_price_brl NUMERIC(10, 2),
  ADD COLUMN additional_team_price_usd NUMERIC(10, 2);

-- Atualiza os planos existentes com valores padrão
UPDATE subscription_plans
SET 
  max_channels = 2,
  max_flows = 5,
  max_teams = 2,
  additional_user_price_brl = 39.99,
  additional_user_price_usd = 7.99,
  additional_channel_price_brl = 89.99,
  additional_channel_price_usd = 17.99; 