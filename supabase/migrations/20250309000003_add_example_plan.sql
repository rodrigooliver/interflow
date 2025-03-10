-- Adiciona um plano de exemplo
INSERT INTO subscription_plans (
  name_pt, name_en, name_es,
  description_pt, description_en, description_es,
  price_brl, price_usd, default_currency,
  max_users, max_customers, max_channels, max_flows, max_teams,
  storage_limit,
  additional_user_price_brl, additional_user_price_usd,
  additional_channel_price_brl, additional_channel_price_usd,
  features_pt, features_en, features_es
) VALUES (
  'Plano Básico', 'Basic Plan', 'Plan Básico',
  'Ideal para pequenas empresas', 'Ideal for small businesses', 'Ideal para pequeñas empresas',
  199.00, 39.99, 'BRL',
  5, 2000, 2, 5, 2,
  1073741824, -- 1GB
  39.99, 7.99,
  89.99, 17.99,
  '["Suporte por email", "Integrações básicas", "Relatórios mensais"]',
  '["Email support", "Basic integrations", "Monthly reports"]',
  '["Soporte por correo electrónico", "Integraciones básicas", "Informes mensuales"]'
); 