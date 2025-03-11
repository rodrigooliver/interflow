-- Add email column to organizations table
alter table organizations
add column email text;

-- Add a comment to the column
comment on column organizations.email is 'Email principal da organização';

-- Create an index for email lookups
create index organizations_email_idx on organizations(email);

-- Create billing period enum type
create type billing_period_type as enum ('monthly', 'yearly');

-- Add new columns to subscriptions table
alter table subscriptions
add column billing_period billing_period_type not null default 'monthly',
add column stripe_subscription_id text null,
add column canceled_at timestamptz null,
add column cancel_at timestamptz null;

-- Add comments to the new columns
comment on column subscriptions.billing_period is 'Período de cobrança da assinatura (monthly/yearly)';
comment on column subscriptions.stripe_subscription_id is 'ID da assinatura no Stripe';
comment on column subscriptions.canceled_at is 'Data e hora em que a assinatura foi cancelada';
comment on column subscriptions.cancel_at is 'Data e hora em que a assinatura será efetivamente encerrada';
