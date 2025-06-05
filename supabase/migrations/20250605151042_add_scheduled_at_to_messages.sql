/*
  # Adição de coluna para mensagens agendadas

  1. Alterações:
    - Adiciona uma coluna 'scheduled_at' na tabela 'messages' para armazenar a data/hora de envio das mensagens agendadas
    - A coluna é opcional (pode ser NULL) para mensagens que não são agendadas
    - Mensagens enviadas imediatamente terão scheduled_at como NULL

  2. Segurança:
    - Mantém as políticas RLS existentes
*/

-- Adiciona coluna 'scheduled_at' na tabela 'messages'
ALTER TABLE public.messages 
  ADD COLUMN scheduled_at TIMESTAMPTZ;

-- Cria um índice composto otimizado para consultas de mensagens agendadas
-- Usado para consultas como: WHERE status = 'scheduled' AND scheduled_at <= NOW()
CREATE INDEX idx_messages_scheduled_status_date ON public.messages(status, scheduled_at) 
  WHERE status = 'scheduled';

-- Comentário explicativo sobre a coluna
COMMENT ON COLUMN public.messages.scheduled_at IS 'Data e hora agendada para envio da mensagem. NULL para mensagens enviadas imediatamente'; 