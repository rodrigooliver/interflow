-- Migration para criar funções úteis para o sistema financeiro
-- Criado em: 2025-03-27

-- Função para calcular saldo atual total de um caixa
CREATE OR REPLACE FUNCTION public.get_cashier_current_balance(p_cashier_id UUID)
RETURNS DECIMAL(15, 2) AS $$
DECLARE
    v_balance DECIMAL(15, 2);
BEGIN
    SELECT COALESCE(
        (SELECT opening_balance 
         FROM public.financial_cashier_operations 
         WHERE cashier_id = p_cashier_id 
         AND status = 'open' 
         ORDER BY opening_date DESC 
         LIMIT 1),
        0
    ) + 
    COALESCE(
        (SELECT SUM(
            CASE 
                WHEN transaction_type = 'income' THEN amount 
                WHEN transaction_type = 'expense' THEN -amount 
                ELSE 0 
            END)
         FROM public.financial_transactions 
         WHERE cashier_id = p_cashier_id 
         AND (status = 'paid' OR status = 'received')
         AND cashier_operation_id = (
             SELECT id 
             FROM public.financial_cashier_operations 
             WHERE cashier_id = p_cashier_id 
             AND status = 'open' 
             ORDER BY opening_date DESC 
             LIMIT 1
         )),
        0
    ) INTO v_balance;

    RETURN v_balance;
END;
$$ LANGUAGE plpgsql;

-- NOTA: As seguintes funções foram completamente movidas para o backend Node.js:
-- 1. generate_recurring_transactions - Geração de transações recorrentes
-- 2. update_overdue_transactions - Atualização de status de transações vencidas
--
-- Benefícios da implementação no backend:
-- 1. Mantém pelo menos 20 transações futuras para cada série recorrente
-- 2. Monitoramento e melhor tratamento de erros
-- 3. Possibilidade de regeneração manual através de API
-- 4. Implementação mais flexível e manutenível
-- 5. Melhores logs e rastreabilidade de execução

-- Função para calcular o saldo previsto por período
CREATE OR REPLACE FUNCTION public.get_forecasted_balance(
    p_organization_id UUID,
    p_start_date DATE,
    p_end_date DATE
) RETURNS TABLE (
    date DATE,
    income DECIMAL(15, 2),
    expense DECIMAL(15, 2),
    balance DECIMAL(15, 2),
    cumulative_balance DECIMAL(15, 2)
) AS $$
DECLARE
    v_initial_balance DECIMAL(15, 2);
    v_current_date DATE := p_start_date;
BEGIN
    -- Calcular saldo inicial (todas as transações pagas/recebidas antes da data inicial)
    SELECT COALESCE(
        SUM(
            CASE 
                WHEN transaction_type = 'income' THEN amount 
                WHEN transaction_type = 'expense' THEN -amount 
                ELSE 0 
            END
        ), 0
    ) INTO v_initial_balance
    FROM public.financial_transactions
    WHERE organization_id = p_organization_id
    AND (status = 'paid' OR status = 'received')
    AND payment_date < p_start_date;

    -- Para cada dia no período
    WHILE v_current_date <= p_end_date LOOP
        -- Calcular receitas e despesas do dia
        income := COALESCE(
            (SELECT SUM(amount)
             FROM public.financial_transactions
             WHERE organization_id = p_organization_id
             AND transaction_type = 'income'
             AND due_date = v_current_date),
            0
        );
        
        expense := COALESCE(
            (SELECT SUM(amount)
             FROM public.financial_transactions
             WHERE organization_id = p_organization_id
             AND transaction_type = 'expense'
             AND due_date = v_current_date),
            0
        );
        
        -- Calcular saldo do dia
        balance := income - expense;
        
        -- Ajustar saldo acumulado
        IF v_current_date = p_start_date THEN
            cumulative_balance := v_initial_balance + balance;
        ELSE
            -- Buscar o último saldo acumulado
            SELECT ft.cumulative_balance INTO cumulative_balance
            FROM (
                SELECT * FROM get_forecasted_balance(p_organization_id, p_start_date, v_current_date - INTERVAL '1 day')
                ORDER BY date DESC
                LIMIT 1
            ) ft;
            
            cumulative_balance := cumulative_balance + balance;
        END IF;
        
        date := v_current_date;
        RETURN NEXT;
        
        v_current_date := v_current_date + INTERVAL '1 day';
    END LOOP;
    
    RETURN;
END;
$$ LANGUAGE plpgsql;

-- Função para total de contas a pagar e receber por categoria
CREATE OR REPLACE FUNCTION public.get_financial_summary_by_category(
    p_organization_id UUID,
    p_start_date DATE,
    p_end_date DATE
) RETURNS TABLE (
    category_id UUID,
    category_name VARCHAR(100),
    transaction_type financial_transaction_type,
    total_amount DECIMAL(15, 2),
    percentage DECIMAL(5, 2)
) AS $$
BEGIN
    RETURN QUERY
    WITH category_totals AS (
        SELECT 
            ft.category_id,
            fc.name AS category_name,
            ft.transaction_type,
            SUM(ft.amount) AS total_amount
        FROM public.financial_transactions ft
        LEFT JOIN public.financial_categories fc ON ft.category_id = fc.id
        WHERE ft.organization_id = p_organization_id
        AND ft.due_date BETWEEN p_start_date AND p_end_date
        GROUP BY ft.category_id, fc.name, ft.transaction_type
    ),
    transaction_type_totals AS (
        SELECT 
            transaction_type,
            SUM(total_amount) AS type_total
        FROM category_totals
        GROUP BY transaction_type
    )
    SELECT 
        ct.category_id,
        ct.category_name,
        ct.transaction_type,
        ct.total_amount,
        CASE
            WHEN ttt.type_total > 0 THEN ROUND((ct.total_amount / ttt.type_total) * 100, 2)
            ELSE 0
        END AS percentage
    FROM category_totals ct
    JOIN transaction_type_totals ttt ON ct.transaction_type = ttt.transaction_type
    ORDER BY ct.transaction_type, ct.total_amount DESC;
END;
$$ LANGUAGE plpgsql; 