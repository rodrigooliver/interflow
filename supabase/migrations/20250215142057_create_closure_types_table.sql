-- Criação da tabela closure_types
create table if not exists public.closure_types (
  id uuid not null default gen_random_uuid(),
  title text not null,
  color text,
  flow_id uuid,
  organization_id uuid not null references organizations(id),
  created_at timestamp with time zone not null default now(),
  
  constraint closure_types_pkey primary key (id),
  constraint closure_types_flow_id_fkey foreign key (flow_id) references flows(id)
);

-- Habilita RLS se necessário
alter table public.closure_types enable row level security;

-- Cria políticas de segurança se necessário
create policy "Permitir leitura para membros da organização" 
on public.closure_types 
for select using (
  exists (
    select 1 from organization_members
    where organization_members.organization_id = closure_types.organization_id
    and organization_members.user_id = auth.uid()
  )
);

create policy "Permitir inserção para administradores da organização"
on public.closure_types
for insert with check (
  exists (
    select 1 from organization_members
    where organization_members.organization_id = closure_types.organization_id
    and organization_members.user_id = auth.uid()
    and organization_members.role in ('owner', 'admin')
  )
);

create policy "Permitir atualização para administradores da organização"
on public.closure_types
for update using (
  exists (
    select 1 from organization_members
    where organization_members.organization_id = closure_types.organization_id
    and organization_members.user_id = auth.uid()
    and organization_members.role in ('owner', 'admin')
  )
);

create policy "Permitir exclusão para administradores da organização"
on public.closure_types
for delete using (
  exists (
    select 1 from organization_members
    where organization_members.organization_id = closure_types.organization_id
    and organization_members.user_id = auth.uid()
    and organization_members.role in ('owner', 'admin')
  )
); 


-- Adiciona a coluna closure_type_id na tabela chats
alter table public.chats
  add column closure_type_id uuid references public.closure_types(id);