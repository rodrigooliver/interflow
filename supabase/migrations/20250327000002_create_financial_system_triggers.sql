-- Migration para criar gatilhos de atualização automática de transações financeiras
-- Criado em: 2025-03-27

-- Nota: A função process_daily_financial_jobs() foi movida para o backend Node.js
-- e será executada como cron job pelo servidor.

-- Criar função para atualizar o saldo do caixa após cada transação
CREATE OR REPLACE FUNCTION public.update_cashier_balance_after_transaction()
RETURNS TRIGGER AS $$
DECLARE
    v_current_date DATE;
    v_cashier_id UUID;
    v_amount DECIMAL(15, 2);
    v_transaction_type financial_transaction_type;
BEGIN
    v_cashier_id := NEW.cashier_id;
    
    -- Se não tem caixa associado, não faz nada
    IF v_cashier_id IS NULL THEN
        RETURN NEW;
    END IF;
    
    -- Determinar a data e o valor
    IF TG_OP = 'INSERT' OR TG_OP = 'UPDATE' THEN
        v_transaction_type := NEW.transaction_type;
        
        -- Se a transação foi paga/recebida
        IF NEW.status = 'paid' OR NEW.status = 'received' THEN
            v_current_date := COALESCE(NEW.payment_date, CURRENT_DATE);
            v_amount := NEW.amount;
            
            -- Atualizar o saldo do caixa para a data
            INSERT INTO public.financial_cashier_balances (
                cashier_id, 
                date, 
                opening_balance,
                closing_balance
            )
            VALUES (
                v_cashier_id,
                v_current_date,
                COALESCE((SELECT closing_balance 
                 FROM public.financial_cashier_balances 
                 WHERE cashier_id = v_cashier_id 
                 AND date < v_current_date 
                 ORDER BY date DESC 
                 LIMIT 1), 0),
                0
            )
            ON CONFLICT (cashier_id, date) DO NOTHING;
            
            -- Atualizar o saldo de fechamento
            UPDATE public.financial_cashier_balances
            SET closing_balance = closing_balance + 
                CASE 
                    WHEN v_transaction_type = 'income' THEN v_amount
                    WHEN v_transaction_type = 'expense' THEN -v_amount
                    ELSE 0
                END
            WHERE cashier_id = v_cashier_id
            AND date = v_current_date;
            
            -- Atualizar os saldos de abertura dos dias seguintes
            UPDATE public.financial_cashier_balances
            SET opening_balance = (
                SELECT COALESCE((
                    SELECT closing_balance
                    FROM public.financial_cashier_balances
                    WHERE cashier_id = v_cashier_id
                    AND date < financial_cashier_balances.date
                    ORDER BY date DESC
                    LIMIT 1
                ), 0)
            )
            WHERE cashier_id = v_cashier_id
            AND date > v_current_date;
        END IF;
    END IF;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger para atualizar o saldo do caixa após cada transação
CREATE TRIGGER update_cashier_balance_after_transaction
AFTER INSERT OR UPDATE ON public.financial_transactions
FOR EACH ROW
WHEN (NEW.cashier_id IS NOT NULL AND (NEW.status = 'paid' OR NEW.status = 'received'))
EXECUTE FUNCTION public.update_cashier_balance_after_transaction();

-- Trigger para atualizar o saldo do caixa quando uma transação é removida
CREATE OR REPLACE FUNCTION public.update_cashier_balance_after_delete()
RETURNS TRIGGER AS $$
DECLARE
    v_current_date DATE;
    v_cashier_id UUID;
    v_amount DECIMAL(15, 2);
    v_transaction_type financial_transaction_type;
BEGIN
    v_cashier_id := OLD.cashier_id;
    
    -- Se não tem caixa associado, não faz nada
    IF v_cashier_id IS NULL THEN
        RETURN OLD;
    END IF;
    
    -- Se a transação estava paga/recebida
    IF OLD.status = 'paid' OR OLD.status = 'received' THEN
        v_current_date := COALESCE(OLD.payment_date, CURRENT_DATE);
        v_amount := OLD.amount;
        v_transaction_type := OLD.transaction_type;
        
        -- Atualizar o saldo de fechamento
        UPDATE public.financial_cashier_balances
        SET closing_balance = closing_balance - 
            CASE 
                WHEN v_transaction_type = 'income' THEN v_amount
                WHEN v_transaction_type = 'expense' THEN -v_amount
                ELSE 0
            END
        WHERE cashier_id = v_cashier_id
        AND date = v_current_date;
        
        -- Atualizar os saldos de abertura dos dias seguintes
        UPDATE public.financial_cashier_balances
        SET opening_balance = (
            SELECT COALESCE((
                SELECT closing_balance
                FROM public.financial_cashier_balances
                WHERE cashier_id = v_cashier_id
                AND date < financial_cashier_balances.date
                ORDER BY date DESC
                LIMIT 1
            ), 0)
        )
        WHERE cashier_id = v_cashier_id
        AND date > v_current_date;
    END IF;
    
    RETURN OLD;
END;
$$ LANGUAGE plpgsql;

-- Trigger para atualizar o saldo do caixa quando uma transação é removida
CREATE TRIGGER update_cashier_balance_after_delete
AFTER DELETE ON public.financial_transactions
FOR EACH ROW
WHEN (OLD.cashier_id IS NOT NULL AND (OLD.status = 'paid' OR OLD.status = 'received'))
EXECUTE FUNCTION public.update_cashier_balance_after_delete();

-- Função para registrar histórico de mudança de status das transações
CREATE OR REPLACE FUNCTION public.log_transaction_status_change()
RETURNS TRIGGER AS $$
BEGIN
    IF (TG_OP = 'UPDATE' AND OLD.status <> NEW.status) THEN
        INSERT INTO public.financial_transaction_history (
            transaction_id,
            old_status,
            new_status,
            changed_by,
            notes
        ) VALUES (
            NEW.id,
            OLD.status,
            NEW.status,
            auth.uid(),
            'Status atualizado de ' || OLD.status || ' para ' || NEW.status
        );
    END IF;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Criar tabela de histórico de transações
CREATE TABLE IF NOT EXISTS public.financial_transaction_history (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    transaction_id UUID NOT NULL REFERENCES public.financial_transactions(id) ON DELETE CASCADE,
    old_status financial_status,
    new_status financial_status,
    changed_by UUID REFERENCES public.profiles(id),
    notes TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Aplicar políticas RLS para a tabela de histórico
ALTER TABLE public.financial_transaction_history ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Organization members can view transaction history"
ON public.financial_transaction_history
FOR SELECT
USING (
    EXISTS (
        SELECT 1 FROM public.financial_transactions ft
        JOIN public.organization_members om ON ft.organization_id = om.organization_id
        WHERE ft.id = financial_transaction_history.transaction_id
        AND om.profile_id = auth.uid()
        AND om.status = 'active'
    )
);

-- Trigger para registrar histórico de mudança de status
CREATE TRIGGER log_transaction_status_change
AFTER UPDATE ON public.financial_transactions
FOR EACH ROW
EXECUTE FUNCTION public.log_transaction_status_change(); 