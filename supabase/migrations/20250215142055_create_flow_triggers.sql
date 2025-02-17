-- Criar tabela de triggers
create table flow_triggers (
  id uuid default gen_random_uuid() primary key,
  flow_id uuid references flows(id) on delete cascade,
  type text not null,
  is_active boolean default true,
  conditions jsonb not null default '{"operator": "AND", "rules": []}'::jsonb,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null,
  updated_at timestamp with time zone default timezone('utc'::text, now()) not null,
  organization_id uuid references organizations(id) on delete cascade not null
);

-- Criar índices
create index flow_triggers_flow_id_idx on flow_triggers(flow_id);
create index flow_triggers_organization_id_idx on flow_triggers(organization_id);

-- Remover coluna triggers da tabela flows
alter table flows drop column if exists triggers;

-- Configurar políticas RLS
alter table flow_triggers enable row level security;

-- Política para SELECT
create policy "Usuários podem visualizar triggers da sua organização"
on flow_triggers
for select
using (
  exists (
    select 1 from organization_members
    where organization_members.organization_id = flow_triggers.organization_id
    and organization_members.user_id = auth.uid()
  )
);

-- Política para INSERT
create policy "Usuários podem criar triggers para sua organização"
on flow_triggers
for insert
with check (
  exists (
    select 1 from organization_members
    where organization_members.organization_id = flow_triggers.organization_id
    and organization_members.user_id = auth.uid()
  )
);

-- Política para UPDATE
create policy "Usuários podem atualizar triggers da sua organização"
on flow_triggers
for update
using (
  exists (
    select 1 from organization_members
    where organization_members.organization_id = flow_triggers.organization_id
    and organization_members.user_id = auth.uid()
  )
)
with check (
  exists (
    select 1 from organization_members
    where organization_members.organization_id = flow_triggers.organization_id
    and organization_members.user_id = auth.uid()
  )
);

-- Política para DELETE
create policy "Usuários podem deletar triggers da sua organização"
on flow_triggers
for delete
using (
  exists (
    select 1 from organization_members
    where organization_members.organization_id = flow_triggers.organization_id
    and organization_members.user_id = auth.uid()
  )
);
