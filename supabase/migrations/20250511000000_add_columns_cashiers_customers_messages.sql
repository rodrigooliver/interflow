/*
  # Adição de colunas em tabelas existentes

  1. Alterações:
    - Adiciona uma coluna 'balance' na tabela 'financial_cashiers'
    - Adiciona uma coluna 'last_task' na tabela 'customers' com referência à tabela 'tasks'
    - Adiciona uma coluna 'task_id' na tabela 'messages' com referência à tabela 'tasks'
      (com exclusão em cascata para excluir mensagens quando a tarefa é excluída)

  2. Segurança:
    - Mantém as políticas RLS existentes
*/

-- Adiciona coluna 'balance' na tabela 'financial_cashiers'
ALTER TABLE public.financial_cashiers 
  ADD COLUMN balance DECIMAL(15, 2) NOT NULL DEFAULT 0;

-- Cria um índice para melhorar o desempenho das consultas pelo saldo
CREATE INDEX idx_financial_cashiers_balance ON public.financial_cashiers(balance);

-- Comentário explicativo sobre a coluna
COMMENT ON COLUMN public.financial_cashiers.balance IS 'Saldo atual do caixa financeiro';

-- Adiciona coluna 'last_task' na tabela 'customers'
ALTER TABLE public.customers
  ADD COLUMN last_task UUID REFERENCES public.tasks(id) ON DELETE SET NULL;

-- Cria um índice para melhorar o desempenho das consultas pela última tarefa
CREATE INDEX idx_customers_last_task ON public.customers(last_task);

-- Comentário explicativo sobre a coluna
COMMENT ON COLUMN public.customers.last_task IS 'Referência à última tarefa relacionada ao cliente';

-- Adiciona coluna 'task_id' na tabela 'messages'
ALTER TABLE public.messages
  ADD COLUMN task_id UUID REFERENCES public.tasks(id) ON DELETE CASCADE;

-- Cria um índice para melhorar o desempenho das consultas por tarefa
CREATE INDEX idx_messages_task_id ON public.messages(task_id);

-- Comentário explicativo sobre a coluna
COMMENT ON COLUMN public.messages.task_id IS 'Referência à tarefa relacionada à mensagem. Mensagens são excluídas quando a tarefa é excluída'; 