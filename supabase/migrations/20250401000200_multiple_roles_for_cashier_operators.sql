-- Migration para implementar um sistema de permissões flexíveis para operadores de caixa
-- Criado em: 2025-04-01

-- Remover políticas antigas baseadas em membros da organização
DROP POLICY IF EXISTS "Organization members can view their financial transactions" ON public.financial_transactions;
DROP POLICY IF EXISTS "Organization members can insert their financial transactions" ON public.financial_transactions;
DROP POLICY IF EXISTS "Organization members can update their financial transactions" ON public.financial_transactions;
DROP POLICY IF EXISTS "Organization members can delete their financial transactions" ON public.financial_transactions;

-- Adicionar colunas de permissões individuais à tabela financial_cashier_operators
ALTER TABLE public.financial_cashier_operators 
ADD COLUMN IF NOT EXISTS can_view BOOLEAN NOT NULL DEFAULT true,
ADD COLUMN IF NOT EXISTS can_create BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN IF NOT EXISTS can_edit_any BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN IF NOT EXISTS can_edit_own BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN IF NOT EXISTS can_delete_any BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN IF NOT EXISTS can_delete_own BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN IF NOT EXISTS is_admin BOOLEAN NOT NULL DEFAULT false;

-- Adicionar comentário explicando as permissões
COMMENT ON TABLE public.financial_cashier_operators IS 
'Operadores de caixa e suas permissões:
- can_view: pode visualizar transações do caixa
- can_create: pode criar novas transações
- can_edit_any: pode editar qualquer transação
- can_edit_own: pode editar apenas suas próprias transações
- can_delete_any: pode excluir qualquer transação
- can_delete_own: pode excluir apenas suas próprias transações
- is_admin: acesso completo (todas as permissões)';

-- Políticas para financial_transactions baseadas nas novas permissões

-- Política 1: Visualização de transações
-- Permite que operadores com permissão de visualização (can_view) ou administradores (is_admin)
-- possam ver as transações dos caixas aos quais estão vinculados
CREATE POLICY "Cashier operators can view financial transactions"
ON public.financial_transactions
FOR SELECT
USING (
    EXISTS (
        SELECT 1 FROM public.financial_cashier_operators op
        JOIN public.financial_cashiers c ON op.cashier_id = c.id
        WHERE c.id = financial_transactions.cashier_id
        AND op.profile_id = auth.uid()
        AND op.is_active = true
        AND (op.can_view = true OR op.is_admin = true)
    )
);

-- Política 2: Criação de transações
-- Permite que operadores com permissão de criação (can_create) ou administradores (is_admin)
-- possam criar novas transações nos caixas aos quais estão vinculados
CREATE POLICY "Cashier operators can insert financial transactions"
ON public.financial_transactions
FOR INSERT
WITH CHECK (
    EXISTS (
        SELECT 1 FROM public.financial_cashier_operators op
        JOIN public.financial_cashiers c ON op.cashier_id = c.id
        WHERE c.id = financial_transactions.cashier_id
        AND op.profile_id = auth.uid()
        AND op.is_active = true
        AND (op.can_create = true OR op.is_admin = true)
    )
);

-- Política 3: Edição de qualquer transação
-- Permite que operadores com permissão de edição geral (can_edit_any) ou administradores (is_admin)
-- possam editar qualquer transação nos caixas aos quais estão vinculados
CREATE POLICY "Cashier operators can update any financial transactions"
ON public.financial_transactions
FOR UPDATE
USING (
    EXISTS (
        SELECT 1 FROM public.financial_cashier_operators op
        JOIN public.financial_cashiers c ON op.cashier_id = c.id
        WHERE c.id = financial_transactions.cashier_id
        AND op.profile_id = auth.uid()
        AND op.is_active = true
        AND (op.can_edit_any = true OR op.is_admin = true)
    )
);

-- Política 4: Edição de transações próprias
-- Permite que operadores com permissão de edição própria (can_edit_own) ou administradores (is_admin)
-- possam editar apenas as transações que eles mesmos criaram nos caixas aos quais estão vinculados
CREATE POLICY "Cashier operators can update only their financial transactions"
ON public.financial_transactions
FOR UPDATE
USING (
    (
        financial_transactions.created_by = auth.uid()
        AND
        EXISTS (
            SELECT 1 FROM public.financial_cashier_operators op
            JOIN public.financial_cashiers c ON op.cashier_id = c.id
            WHERE c.id = financial_transactions.cashier_id
            AND op.profile_id = auth.uid()
            AND op.is_active = true
            AND (op.can_edit_own = true OR op.is_admin = true)
        )
    )
);

-- Política 5: Exclusão de qualquer transação
-- Permite que operadores com permissão de exclusão geral (can_delete_any) ou administradores (is_admin)
-- possam excluir qualquer transação nos caixas aos quais estão vinculados
CREATE POLICY "Cashier operators can delete any financial transactions"
ON public.financial_transactions
FOR DELETE
USING (
    EXISTS (
        SELECT 1 FROM public.financial_cashier_operators op
        JOIN public.financial_cashiers c ON op.cashier_id = c.id
        WHERE c.id = financial_transactions.cashier_id
        AND op.profile_id = auth.uid()
        AND op.is_active = true
        AND (op.can_delete_any = true OR op.is_admin = true)
    )
);

-- Política 6: Exclusão de transações próprias
-- Permite que operadores com permissão de exclusão própria (can_delete_own) ou administradores (is_admin)
-- possam excluir apenas as transações que eles mesmos criaram nos caixas aos quais estão vinculados
CREATE POLICY "Cashier operators can delete only their financial transactions"
ON public.financial_transactions
FOR DELETE
USING (
    (
        financial_transactions.created_by = auth.uid()
        AND
        EXISTS (
            SELECT 1 FROM public.financial_cashier_operators op
            JOIN public.financial_cashiers c ON op.cashier_id = c.id
            WHERE c.id = financial_transactions.cashier_id
            AND op.profile_id = auth.uid()
            AND op.is_active = true
            AND (op.can_delete_own = true OR op.is_admin = true)
        )
    )
); 