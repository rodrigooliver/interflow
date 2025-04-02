-- Migration para criar as tabelas principais do sistema financeiro
-- Criado em: 2025-03-27

-- Tipos para enumerações
CREATE TYPE public.financial_transaction_type AS ENUM ('income', 'expense');
CREATE TYPE public.financial_frequency AS ENUM ('once', 'daily', 'weekly', 'monthly', 'quarterly', 'semiannual', 'annual');
CREATE TYPE public.financial_status AS ENUM ('pending', 'paid', 'received', 'overdue', 'cancelled');
CREATE TYPE public.cashier_status AS ENUM ('open', 'closed');

-- Tabela de categorias financeiras
CREATE TABLE public.financial_categories (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    organization_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
    name VARCHAR(100) NOT NULL,
    type financial_transaction_type NOT NULL,
    icon VARCHAR(50),
    color VARCHAR(20),
    parent_id UUID REFERENCES public.financial_categories(id),
    key VARCHAR(50),
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    UNIQUE (organization_id, name, type),
    UNIQUE (organization_id, key, type)
);

-- Tabela de caixas financeiros
CREATE TABLE public.financial_cashiers (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    organization_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
    name VARCHAR(100) NOT NULL,
    description TEXT,
    is_active BOOLEAN NOT NULL DEFAULT true,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    UNIQUE (organization_id, name)
);

-- Tabela de operadores de caixa (vínculo entre usuários e caixas)
CREATE TABLE public.financial_cashier_operators (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    cashier_id UUID NOT NULL REFERENCES public.financial_cashiers(id) ON DELETE CASCADE,
    profile_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    is_active BOOLEAN NOT NULL DEFAULT true,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    UNIQUE (cashier_id, profile_id)
);

-- Tabela de abertura e fechamento de caixa
CREATE TABLE public.financial_cashier_operations (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    cashier_id UUID NOT NULL REFERENCES public.financial_cashiers(id) ON DELETE CASCADE,
    operator_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    operation_type cashier_status NOT NULL,
    opening_date TIMESTAMPTZ,
    closing_date TIMESTAMPTZ,
    opening_balance DECIMAL(15, 2) NOT NULL DEFAULT 0,
    expected_closing_balance DECIMAL(15, 2),
    actual_closing_balance DECIMAL(15, 2),
    difference DECIMAL(15, 2),
    notes TEXT,
    status cashier_status NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Tabela de meios de pagamento
CREATE TABLE public.financial_payment_methods (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    organization_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
    name VARCHAR(100) NOT NULL,
    description TEXT,
    requires_confirmation BOOLEAN NOT NULL DEFAULT false,
    is_credit BOOLEAN NOT NULL DEFAULT false,
    installments_allowed BOOLEAN NOT NULL DEFAULT false,
    max_installments INTEGER,
    fee_percentage DECIMAL(5, 2) DEFAULT 0,
    is_active BOOLEAN NOT NULL DEFAULT true,
    key VARCHAR(50),
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    UNIQUE (organization_id, name),
    UNIQUE (organization_id, key)
);

-- Tabela principal de transações financeiras
CREATE TABLE public.financial_transactions (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    organization_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
    transaction_code VARCHAR(50),
    description TEXT NOT NULL,
    amount DECIMAL(15, 2) NOT NULL,
    transaction_type financial_transaction_type NOT NULL,
    category_id UUID REFERENCES public.financial_categories(id),
    payment_method_id UUID REFERENCES public.financial_payment_methods(id),
    cashier_id UUID REFERENCES public.financial_cashiers(id),
    cashier_operation_id UUID REFERENCES public.financial_cashier_operations(id),
    due_date DATE NOT NULL,
    payment_date DATE,
    frequency financial_frequency NOT NULL DEFAULT 'once',
    installment_number INTEGER,
    total_installments INTEGER,
    parent_transaction_id UUID REFERENCES public.financial_transactions(id),
    status financial_status NOT NULL DEFAULT 'pending',
    notes TEXT,
    customer_id UUID REFERENCES public.customers(id),
    chat_id UUID REFERENCES public.chats(id),
    appointment_id UUID REFERENCES public.appointments(id),
    created_by UUID NOT NULL REFERENCES public.profiles(id),
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Tabela para armazenar arquivos anexados às transações (comprovantes, recibos, etc.)
CREATE TABLE public.financial_transaction_attachments (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    transaction_id UUID NOT NULL REFERENCES public.financial_transactions(id) ON DELETE CASCADE,
    file_name VARCHAR(255) NOT NULL,
    file_path TEXT NOT NULL,
    file_type VARCHAR(50),
    file_size INTEGER,
    uploaded_by UUID NOT NULL REFERENCES public.profiles(id),
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Tabela para armazenar detalhes de conciliação financeira
CREATE TABLE public.financial_reconciliations (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    transaction_id UUID NOT NULL REFERENCES public.financial_transactions(id) ON DELETE CASCADE,
    reconciled_by UUID NOT NULL REFERENCES public.profiles(id),
    reconciliation_date TIMESTAMPTZ NOT NULL DEFAULT now(),
    notes TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Tabela para armazenar saldos dos caixas
CREATE TABLE public.financial_cashier_balances (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    cashier_id UUID NOT NULL REFERENCES public.financial_cashiers(id) ON DELETE CASCADE,
    date DATE NOT NULL,
    opening_balance DECIMAL(15, 2) NOT NULL DEFAULT 0,
    closing_balance DECIMAL(15, 2) NOT NULL DEFAULT 0,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    UNIQUE (cashier_id, date)
);

-- Funções e Triggers

-- Função para atualizar o campo updated_at automaticamente
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
   NEW.updated_at = now();
   RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Triggers para atualizar updated_at
CREATE TRIGGER set_updated_at_financial_categories
BEFORE UPDATE ON public.financial_categories
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER set_updated_at_financial_cashiers
BEFORE UPDATE ON public.financial_cashiers
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER set_updated_at_financial_cashier_operators
BEFORE UPDATE ON public.financial_cashier_operators
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER set_updated_at_financial_cashier_operations
BEFORE UPDATE ON public.financial_cashier_operations
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER set_updated_at_financial_payment_methods
BEFORE UPDATE ON public.financial_payment_methods
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER set_updated_at_financial_transactions
BEFORE UPDATE ON public.financial_transactions
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER set_updated_at_financial_transaction_attachments
BEFORE UPDATE ON public.financial_transaction_attachments
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER set_updated_at_financial_reconciliations
BEFORE UPDATE ON public.financial_reconciliations
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER set_updated_at_financial_cashier_balances
BEFORE UPDATE ON public.financial_cashier_balances
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

-- Policies RLS (Row Level Security)

-- Policies para financial_categories
ALTER TABLE public.financial_categories ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Organization members can view their financial categories"
ON public.financial_categories
FOR SELECT
USING (
    EXISTS (
        SELECT 1 FROM public.organization_members
        WHERE organization_members.organization_id = financial_categories.organization_id
        AND organization_members.profile_id = auth.uid()
        AND organization_members.status = 'active'
    )
);

CREATE POLICY "Organization members can insert their financial categories"
ON public.financial_categories
FOR INSERT
WITH CHECK (
    EXISTS (
        SELECT 1 FROM public.organization_members
        WHERE organization_members.organization_id = financial_categories.organization_id
        AND organization_members.profile_id = auth.uid()
        AND organization_members.status = 'active'
    )
);

CREATE POLICY "Organization members can update their financial categories"
ON public.financial_categories
FOR UPDATE
USING (
    EXISTS (
        SELECT 1 FROM public.organization_members
        WHERE organization_members.organization_id = financial_categories.organization_id
        AND organization_members.profile_id = auth.uid()
        AND organization_members.status = 'active'
    )
);

CREATE POLICY "Organization members can delete their financial categories"
ON public.financial_categories
FOR DELETE
USING (
    EXISTS (
        SELECT 1 FROM public.organization_members
        WHERE organization_members.organization_id = financial_categories.organization_id
        AND organization_members.profile_id = auth.uid()
        AND organization_members.status = 'active'
    )
);

-- Policies similares para as outras tabelas
ALTER TABLE public.financial_cashiers ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.financial_cashier_operators ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.financial_cashier_operations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.financial_payment_methods ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.financial_transactions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.financial_transaction_attachments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.financial_reconciliations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.financial_cashier_balances ENABLE ROW LEVEL SECURITY;

-- Criar policies básicas para todas tabelas (similar ao financial_categories)
-- Exemplo simplificado para financial_transactions:

CREATE POLICY "Organization members can view their financial transactions"
ON public.financial_transactions
FOR SELECT
USING (
    EXISTS (
        SELECT 1 FROM public.organization_members
        WHERE organization_members.organization_id = financial_transactions.organization_id
        AND organization_members.profile_id = auth.uid()
        AND organization_members.status = 'active'
    )
);

CREATE POLICY "Organization members can insert their financial transactions"
ON public.financial_transactions
FOR INSERT
WITH CHECK (
    EXISTS (
        SELECT 1 FROM public.organization_members
        WHERE organization_members.organization_id = financial_transactions.organization_id
        AND organization_members.profile_id = auth.uid()
        AND organization_members.status = 'active'
    )
);

CREATE POLICY "Organization members can update their financial transactions"
ON public.financial_transactions
FOR UPDATE
USING (
    EXISTS (
        SELECT 1 FROM public.organization_members
        WHERE organization_members.organization_id = financial_transactions.organization_id
        AND organization_members.profile_id = auth.uid()
        AND organization_members.status = 'active'
    )
);

CREATE POLICY "Organization members can delete their financial transactions"
ON public.financial_transactions
FOR DELETE
USING (
    EXISTS (
        SELECT 1 FROM public.organization_members
        WHERE organization_members.organization_id = financial_transactions.organization_id
        AND organization_members.profile_id = auth.uid()
        AND organization_members.status = 'active'
    )
);

-- Políticas para financial_cashiers
CREATE POLICY "Organization members can view their financial cashiers"
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

CREATE POLICY "Organization members can insert their financial cashiers"
ON public.financial_cashiers
FOR INSERT
WITH CHECK (
    EXISTS (
        SELECT 1 FROM public.organization_members
        WHERE organization_members.organization_id = financial_cashiers.organization_id
        AND organization_members.profile_id = auth.uid()
        AND organization_members.status = 'active'
    )
);

CREATE POLICY "Organization members can update their financial cashiers"
ON public.financial_cashiers
FOR UPDATE
USING (
    EXISTS (
        SELECT 1 FROM public.organization_members
        WHERE organization_members.organization_id = financial_cashiers.organization_id
        AND organization_members.profile_id = auth.uid()
        AND organization_members.status = 'active'
    )
);

CREATE POLICY "Organization members can delete their financial cashiers"
ON public.financial_cashiers
FOR DELETE
USING (
    EXISTS (
        SELECT 1 FROM public.organization_members
        WHERE organization_members.organization_id = financial_cashiers.organization_id
        AND organization_members.profile_id = auth.uid()
        AND organization_members.status = 'active'
    )
);

-- Políticas para financial_cashier_operators
CREATE POLICY "Organization members can view their financial cashier operators"
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

CREATE POLICY "Organization members can insert their financial cashier operators"
ON public.financial_cashier_operators
FOR INSERT
WITH CHECK (
    EXISTS (
        SELECT 1 FROM public.financial_cashiers c
        JOIN public.organization_members om ON c.organization_id = om.organization_id
        WHERE c.id = financial_cashier_operators.cashier_id
        AND om.profile_id = auth.uid()
        AND om.status = 'active'
    )
);

CREATE POLICY "Organization members can update their financial cashier operators"
ON public.financial_cashier_operators
FOR UPDATE
USING (
    EXISTS (
        SELECT 1 FROM public.financial_cashiers c
        JOIN public.organization_members om ON c.organization_id = om.organization_id
        WHERE c.id = financial_cashier_operators.cashier_id
        AND om.profile_id = auth.uid()
        AND om.status = 'active'
    )
);

CREATE POLICY "Organization members can delete their financial cashier operators"
ON public.financial_cashier_operators
FOR DELETE
USING (
    EXISTS (
        SELECT 1 FROM public.financial_cashiers c
        JOIN public.organization_members om ON c.organization_id = om.organization_id
        WHERE c.id = financial_cashier_operators.cashier_id
        AND om.profile_id = auth.uid()
        AND om.status = 'active'
    )
);

-- Políticas para financial_cashier_operations
CREATE POLICY "Organization members can view their financial cashier operations"
ON public.financial_cashier_operations
FOR SELECT
USING (
    EXISTS (
        SELECT 1 FROM public.financial_cashiers c
        JOIN public.organization_members om ON c.organization_id = om.organization_id
        WHERE c.id = financial_cashier_operations.cashier_id
        AND om.profile_id = auth.uid()
        AND om.status = 'active'
    )
);

CREATE POLICY "Organization members can insert their financial cashier operations"
ON public.financial_cashier_operations
FOR INSERT
WITH CHECK (
    EXISTS (
        SELECT 1 FROM public.financial_cashiers c
        JOIN public.organization_members om ON c.organization_id = om.organization_id
        WHERE c.id = financial_cashier_operations.cashier_id
        AND om.profile_id = auth.uid()
        AND om.status = 'active'
    )
);

CREATE POLICY "Organization members can update their financial cashier operations"
ON public.financial_cashier_operations
FOR UPDATE
USING (
    EXISTS (
        SELECT 1 FROM public.financial_cashiers c
        JOIN public.organization_members om ON c.organization_id = om.organization_id
        WHERE c.id = financial_cashier_operations.cashier_id
        AND om.profile_id = auth.uid()
        AND om.status = 'active'
    )
);

CREATE POLICY "Organization members can delete their financial cashier operations"
ON public.financial_cashier_operations
FOR DELETE
USING (
    EXISTS (
        SELECT 1 FROM public.financial_cashiers c
        JOIN public.organization_members om ON c.organization_id = om.organization_id
        WHERE c.id = financial_cashier_operations.cashier_id
        AND om.profile_id = auth.uid()
        AND om.status = 'active'
    )
);

-- Políticas para financial_payment_methods
CREATE POLICY "Organization members can view their financial payment methods"
ON public.financial_payment_methods
FOR SELECT
USING (
    EXISTS (
        SELECT 1 FROM public.organization_members
        WHERE organization_members.organization_id = financial_payment_methods.organization_id
        AND organization_members.profile_id = auth.uid()
        AND organization_members.status = 'active'
    )
);

CREATE POLICY "Organization members can insert their financial payment methods"
ON public.financial_payment_methods
FOR INSERT
WITH CHECK (
    EXISTS (
        SELECT 1 FROM public.organization_members
        WHERE organization_members.organization_id = financial_payment_methods.organization_id
        AND organization_members.profile_id = auth.uid()
        AND organization_members.status = 'active'
    )
);

CREATE POLICY "Organization members can update their financial payment methods"
ON public.financial_payment_methods
FOR UPDATE
USING (
    EXISTS (
        SELECT 1 FROM public.organization_members
        WHERE organization_members.organization_id = financial_payment_methods.organization_id
        AND organization_members.profile_id = auth.uid()
        AND organization_members.status = 'active'
    )
);

CREATE POLICY "Organization members can delete their financial payment methods"
ON public.financial_payment_methods
FOR DELETE
USING (
    EXISTS (
        SELECT 1 FROM public.organization_members
        WHERE organization_members.organization_id = financial_payment_methods.organization_id
        AND organization_members.profile_id = auth.uid()
        AND organization_members.status = 'active'
    )
);

-- Políticas para financial_transaction_attachments
CREATE POLICY "Organization members can view their financial transaction attachments"
ON public.financial_transaction_attachments
FOR SELECT
USING (
    EXISTS (
        SELECT 1 FROM public.financial_transactions t
        JOIN public.organization_members om ON t.organization_id = om.organization_id
        WHERE t.id = financial_transaction_attachments.transaction_id
        AND om.profile_id = auth.uid()
        AND om.status = 'active'
    )
);

CREATE POLICY "Organization members can insert their financial transaction attachments"
ON public.financial_transaction_attachments
FOR INSERT
WITH CHECK (
    EXISTS (
        SELECT 1 FROM public.financial_transactions t
        JOIN public.organization_members om ON t.organization_id = om.organization_id
        WHERE t.id = financial_transaction_attachments.transaction_id
        AND om.profile_id = auth.uid()
        AND om.status = 'active'
    )
);

CREATE POLICY "Organization members can update their financial transaction attachments"
ON public.financial_transaction_attachments
FOR UPDATE
USING (
    EXISTS (
        SELECT 1 FROM public.financial_transactions t
        JOIN public.organization_members om ON t.organization_id = om.organization_id
        WHERE t.id = financial_transaction_attachments.transaction_id
        AND om.profile_id = auth.uid()
        AND om.status = 'active'
    )
);

CREATE POLICY "Organization members can delete their financial transaction attachments"
ON public.financial_transaction_attachments
FOR DELETE
USING (
    EXISTS (
        SELECT 1 FROM public.financial_transactions t
        JOIN public.organization_members om ON t.organization_id = om.organization_id
        WHERE t.id = financial_transaction_attachments.transaction_id
        AND om.profile_id = auth.uid()
        AND om.status = 'active'
    )
);

-- Políticas para financial_reconciliations
CREATE POLICY "Organization members can view their financial reconciliations"
ON public.financial_reconciliations
FOR SELECT
USING (
    EXISTS (
        SELECT 1 FROM public.financial_transactions t
        JOIN public.organization_members om ON t.organization_id = om.organization_id
        WHERE t.id = financial_reconciliations.transaction_id
        AND om.profile_id = auth.uid()
        AND om.status = 'active'
    )
);

CREATE POLICY "Organization members can insert their financial reconciliations"
ON public.financial_reconciliations
FOR INSERT
WITH CHECK (
    EXISTS (
        SELECT 1 FROM public.financial_transactions t
        JOIN public.organization_members om ON t.organization_id = om.organization_id
        WHERE t.id = financial_reconciliations.transaction_id
        AND om.profile_id = auth.uid()
        AND om.status = 'active'
    )
);

CREATE POLICY "Organization members can update their financial reconciliations"
ON public.financial_reconciliations
FOR UPDATE
USING (
    EXISTS (
        SELECT 1 FROM public.financial_transactions t
        JOIN public.organization_members om ON t.organization_id = om.organization_id
        WHERE t.id = financial_reconciliations.transaction_id
        AND om.profile_id = auth.uid()
        AND om.status = 'active'
    )
);

CREATE POLICY "Organization members can delete their financial reconciliations"
ON public.financial_reconciliations
FOR DELETE
USING (
    EXISTS (
        SELECT 1 FROM public.financial_transactions t
        JOIN public.organization_members om ON t.organization_id = om.organization_id
        WHERE t.id = financial_reconciliations.transaction_id
        AND om.profile_id = auth.uid()
        AND om.status = 'active'
    )
);

-- Políticas para financial_cashier_balances
CREATE POLICY "Organization members can view their financial cashier balances"
ON public.financial_cashier_balances
FOR SELECT
USING (
    EXISTS (
        SELECT 1 FROM public.financial_cashiers c
        JOIN public.organization_members om ON c.organization_id = om.organization_id
        WHERE c.id = financial_cashier_balances.cashier_id
        AND om.profile_id = auth.uid()
        AND om.status = 'active'
    )
);

CREATE POLICY "Organization members can insert their financial cashier balances"
ON public.financial_cashier_balances
FOR INSERT
WITH CHECK (
    EXISTS (
        SELECT 1 FROM public.financial_cashiers c
        JOIN public.organization_members om ON c.organization_id = om.organization_id
        WHERE c.id = financial_cashier_balances.cashier_id
        AND om.profile_id = auth.uid()
        AND om.status = 'active'
    )
);

CREATE POLICY "Organization members can update their financial cashier balances"
ON public.financial_cashier_balances
FOR UPDATE
USING (
    EXISTS (
        SELECT 1 FROM public.financial_cashiers c
        JOIN public.organization_members om ON c.organization_id = om.organization_id
        WHERE c.id = financial_cashier_balances.cashier_id
        AND om.profile_id = auth.uid()
        AND om.status = 'active'
    )
);

CREATE POLICY "Organization members can delete their financial cashier balances"
ON public.financial_cashier_balances
FOR DELETE
USING (
    EXISTS (
        SELECT 1 FROM public.financial_cashiers c
        JOIN public.organization_members om ON c.organization_id = om.organization_id
        WHERE c.id = financial_cashier_balances.cashier_id
        AND om.profile_id = auth.uid()
        AND om.status = 'active'
    )
); 