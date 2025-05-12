-- Migration para atualizar as políticas RLS da tabela financial_cashiers
-- Criado em: 2025-04-01

-- Remover todas as políticas existentes para financial_cashiers
DROP POLICY IF EXISTS "Organization members can view their financial cashiers" ON public.financial_cashiers;
DROP POLICY IF EXISTS "Organization members can insert their financial cashiers" ON public.financial_cashiers;
DROP POLICY IF EXISTS "Organization members can update their financial cashiers" ON public.financial_cashiers;
DROP POLICY IF EXISTS "Organization members can delete their financial cashiers" ON public.financial_cashiers;
DROP POLICY IF EXISTS "view_cashiers" ON public.financial_cashiers;
DROP POLICY IF EXISTS "insert_cashiers" ON public.financial_cashiers;
DROP POLICY IF EXISTS "update_cashiers" ON public.financial_cashiers;
DROP POLICY IF EXISTS "delete_cashiers" ON public.financial_cashiers;

-- Política 1: Visualização de caixas financeiros
-- Permite que membros da organização possam visualizar os caixas da organização
CREATE POLICY "org_members_view_cashiers"
ON public.financial_cashiers
FOR SELECT
USING (
    EXISTS (
        SELECT 1 FROM public.organization_members
        WHERE organization_members.organization_id = financial_cashiers.organization_id
        AND organization_members.profile_id = auth.uid()
        AND organization_members.status = 'active'
    )
);

-- Política 2: Criação de caixas financeiros
-- Somente dono ou administrador da organização pode criar caixas
CREATE POLICY "org_admins_insert_cashiers"
ON public.financial_cashiers
FOR INSERT
WITH CHECK (
    EXISTS (
        SELECT 1 FROM public.organization_members
        WHERE organization_members.organization_id = financial_cashiers.organization_id
        AND organization_members.profile_id = auth.uid()
        AND organization_members.status = 'active'
        AND organization_members.role IN ('owner', 'admin')
    )
);

-- Política 3: Atualização de caixas financeiros
-- Somente dono ou admin da organização pode atualizar
CREATE POLICY "org_admins_update_cashiers"
ON public.financial_cashiers
FOR UPDATE
USING (
    EXISTS (
        SELECT 1 FROM public.organization_members
        WHERE organization_members.organization_id = financial_cashiers.organization_id
        AND organization_members.profile_id = auth.uid()
        AND organization_members.status = 'active'
        AND organization_members.role IN ('owner', 'admin')
    )
);

-- Política 4: Exclusão de caixas financeiros
-- Somente dono ou admin da organização pode excluir
CREATE POLICY "org_admins_delete_cashiers"
ON public.financial_cashiers
FOR DELETE
USING (
    EXISTS (
        SELECT 1 FROM public.organization_members
        WHERE organization_members.organization_id = financial_cashiers.organization_id
        AND organization_members.profile_id = auth.uid()
        AND organization_members.status = 'active'
        AND organization_members.role IN ('owner', 'admin')
    )
); 