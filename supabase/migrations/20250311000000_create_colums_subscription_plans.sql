-- supabase/migrations/20240319000000_add_yearly_prices.sql
alter table subscription_plans
add column price_brl_yearly numeric(10,2),
add column price_usd_yearly numeric(10,2),
add column stripe_price_id_brl_monthly text,
add column stripe_price_id_usd_monthly text,
add column stripe_price_id_brl_yearly text,
add column stripe_price_id_usd_yearly text;

-- Remover a coluna antiga que não será mais usada
alter table subscription_plans
drop column stripe_price_id;
