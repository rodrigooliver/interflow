-- Criar função para atualizar timestamp
create or replace function public.set_current_timestamp_updated_at()
returns trigger as $$
begin
    new.updated_at = now();
    return new;
end;
$$ language plpgsql;

-- Criar tabela webhook_logs para registrar eventos de webhook
create table if not exists public.webhook_logs (
    id uuid not null default uuid_generate_v4() primary key,
    organization_id uuid not null references public.organizations(id) on delete cascade,
    channel_id uuid not null references public.chat_channels(id) on delete cascade,
    event_type text not null,
    payload jsonb not null default '{}'::jsonb,
    created_at timestamp with time zone not null default now(),
    updated_at timestamp with time zone not null default now()
);

-- Criar índices para melhor performance
create index if not exists webhook_logs_organization_id_idx on public.webhook_logs(organization_id);
create index if not exists webhook_logs_channel_id_idx on public.webhook_logs(channel_id);
create index if not exists webhook_logs_event_type_idx on public.webhook_logs(event_type);
create index if not exists webhook_logs_created_at_idx on public.webhook_logs(created_at desc);

-- Adicionar comentários para documentação
comment on table public.webhook_logs is 'Registros de webhooks recebidos dos canais de comunicação';
comment on column public.webhook_logs.id is 'ID único do registro de webhook';
comment on column public.webhook_logs.organization_id is 'ID da organização relacionada ao webhook';
comment on column public.webhook_logs.channel_id is 'ID do canal de comunicação que gerou o webhook';
comment on column public.webhook_logs.event_type is 'Tipo do evento do webhook (ex: whatsapp_status_sent, whatsapp_template_status_update)';
comment on column public.webhook_logs.payload is 'Payload completo do webhook em formato JSON';
comment on column public.webhook_logs.created_at is 'Data e hora de criação do registro';
comment on column public.webhook_logs.updated_at is 'Data e hora da última atualização do registro';

-- Criar trigger para atualizar updated_at automaticamente
create trigger set_webhook_logs_updated_at
    before update on public.webhook_logs
    for each row
    execute function public.set_current_timestamp_updated_at();

-- Criar políticas RLS (Row Level Security)
alter table public.webhook_logs enable row level security;

-- Política para SELECT
drop policy if exists "Usuários podem ver logs de webhook da sua organização" on webhook_logs;
create policy "Usuários podem ver logs de webhook da sua organização"
on webhook_logs
for select
using (
    exists (
        select 1 from organization_members
        where organization_members.organization_id = webhook_logs.organization_id
        and organization_members.user_id = auth.uid()
    )
);

-- Política para INSERT
drop policy if exists "Sistema pode inserir logs de webhook" on webhook_logs;
create policy "Sistema pode inserir logs de webhook"
on webhook_logs
for insert
with check (true);

-- Política para UPDATE
drop policy if exists "Sistema pode atualizar logs de webhook" on webhook_logs;
create policy "Sistema pode atualizar logs de webhook"
on webhook_logs
for update
using (true)
with check (true);

-- Conceder permissões necessárias
grant all on public.webhook_logs to authenticated;
grant all on public.webhook_logs to service_role; 