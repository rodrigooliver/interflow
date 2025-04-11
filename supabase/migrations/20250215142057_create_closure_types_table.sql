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


  -- Adiciona novos valores ao enum existente
ALTER TYPE message_type ADD VALUE 'location';
ALTER TYPE message_type ADD VALUE 'user_entered';
ALTER TYPE message_type ADD VALUE 'user_left';
ALTER TYPE message_type ADD VALUE 'user_transferred';
ALTER TYPE message_type ADD VALUE 'user_transferred_himself';
ALTER TYPE message_type ADD VALUE 'user_closed';
ALTER TYPE message_type ADD VALUE 'user_start';
ALTER TYPE message_type ADD VALUE 'user_join';
ALTER TYPE message_type ADD VALUE 'template';
ALTER TYPE message_type ADD VALUE 'team_transferred';
ALTER TYPE message_type ADD VALUE 'instructions_model';

-- Atualiza o comentário da coluna type
COMMENT ON COLUMN messages.type IS 'Tipo da mensagem (text, image, video, audio, document, sticker, email, user_entered, user_left, user_transferred, user_closed, user_start)'; 

-- Remove a restrição NOT NULL da coluna color
alter table public.messages 
  alter column content drop not null;

-- Adiciona a coluna sent_from_system na tabela messages
ALTER TABLE messages
  ADD COLUMN sent_from_system boolean DEFAULT false;

-- Adiciona comentário explicativo na coluna
COMMENT ON COLUMN messages.sent_from_system IS 'Indica se a mensagem foi enviada pelo sistema de atendimento';

-- Atualiza as mensagens existentes para false
UPDATE messages SET sent_from_system = false WHERE sent_from_system IS NULL;


-- Torna a coluna NOT NULL após atualizar os dados existentes
ALTER TABLE messages
  ALTER COLUMN sent_from_system SET NOT NULL;

-- Remove a constraint unique de channel_id e external_id
ALTER TABLE public.chats
  DROP CONSTRAINT IF EXISTS chats_channel_external_unique;