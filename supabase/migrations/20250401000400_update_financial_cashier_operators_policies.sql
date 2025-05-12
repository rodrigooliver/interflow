-- Migration para atualizar as políticas RLS da tabela financial_cashier_operators
-- Criado em: 2025-04-01

-- Remover políticas existentes para financial_cashier_operators
DROP POLICY IF EXISTS "Organization members can view their financial cashier operators" ON public.financial_cashier_operators;
DROP POLICY IF EXISTS "Organization members can insert their financial cashier operators" ON public.financial_cashier_operators;
DROP POLICY IF EXISTS "Organization members can update their financial cashier operators" ON public.financial_cashier_operators;
DROP POLICY IF EXISTS "Organization members can delete their financial cashier operators" ON public.financial_cashier_operators;

-- Política 1: Visualização de operadores de caixa
-- Permite que membros da organização possam visualizar os operadores dos caixas da organização
CREATE POLICY "org_members_view_cashier_operators"
ON public.financial_cashier_operators
FOR SELECT
USING (
    EXISTS (
        SELECT 1 FROM public.financial_cashiers c
        JOIN public.organization_members om ON c.organization_id = om.organization_id
        WHERE c.id = financial_cashier_operators.cashier_id
        AND om.profile_id = auth.uid()
        AND om.status = 'active'
    )
);

-- Política 2: Criação de operadores de caixa
-- Somente dono ou administrador da organização pode adicionar operadores
CREATE POLICY "org_admins_insert_cashier_operators"
ON public.financial_cashier_operators
FOR INSERT
WITH CHECK (
    EXISTS (
        SELECT 1 FROM public.financial_cashiers c
        JOIN public.organization_members om ON c.organization_id = om.organization_id
        WHERE c.id = financial_cashier_operators.cashier_id
        AND om.profile_id = auth.uid()
        AND om.status = 'active'
        AND om.role IN ('owner', 'admin')
    )
);

-- Política 3: Atualização de operadores de caixa
-- Somente dono ou admin da organização pode atualizar operadores
CREATE POLICY "org_admins_update_cashier_operators"
ON public.financial_cashier_operators
FOR UPDATE
USING (
    EXISTS (
        SELECT 1 FROM public.financial_cashiers c
        JOIN public.organization_members om ON c.organization_id = om.organization_id
        WHERE c.id = financial_cashier_operators.cashier_id
        AND om.profile_id = auth.uid()
        AND om.status = 'active'
        AND om.role IN ('owner', 'admin')
    )
);

-- Política 4: Exclusão de operadores de caixa
-- Somente dono ou admin da organização pode excluir operadores
CREATE POLICY "org_admins_delete_cashier_operators"
ON public.financial_cashier_operators
FOR DELETE
USING (
    EXISTS (
        SELECT 1 FROM public.financial_cashiers c
        JOIN public.organization_members om ON c.organization_id = om.organization_id
        WHERE c.id = financial_cashier_operators.cashier_id
        AND om.profile_id = auth.uid()
        AND om.status = 'active'
        AND om.role IN ('owner', 'admin')
    )
); 