/*
  # Adicionar coluna de status aos membros da organização

  1. Alterações
    - Cria tipo enum 'member_status' para os possíveis status
    - Adiciona coluna 'status' à tabela organization_members usando o tipo enum
    - Define valores padrão para membros existentes

  2. Segurança
    - Mantém as políticas de segurança existentes
*/

-- Criar tipo enum para status do membro
CREATE TYPE public.member_status AS ENUM ('active', 'pending', 'inactive');

-- Adicionar coluna de status à tabela organization_members
ALTER TABLE public.organization_members
ADD COLUMN status public.member_status NOT NULL DEFAULT 'active';

-- Atualizar membros existentes para status 'active'
UPDATE public.organization_members
SET status = 'active';

-- Comentário na coluna para documentação
COMMENT ON COLUMN public.organization_members.status IS 'Status do membro: active (ativo), pending (aguardando aceitação do convite), inactive (inativo)'; 