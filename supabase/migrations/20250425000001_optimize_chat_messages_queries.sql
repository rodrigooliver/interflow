-- Otimização para consultas de mensagens por cliente e canal
-- Esta migração adiciona índices específicos para melhorar a performance da função loadAllCustomerMessages

-- 1. Índice composto para chats por customer_id e channel_id com created_at para ordenação
-- UPGRADE do índice existente idx_chats_customer_channel para incluir created_at para ordenação
-- O índice existente é (customer_id, channel_id), mas precisamos de (customer_id, channel_id, created_at DESC)
DROP INDEX IF EXISTS idx_chats_customer_channel;
CREATE INDEX IF NOT EXISTS idx_chats_customer_channel_created 
ON public.chats (customer_id, channel_id, created_at DESC);

-- 2. Índice para mensagens usando IN clause com múltiplos chat_ids
-- Este é diferente do idx_messages_chat_created existente que é (chat_id, created_at)
-- Precisamos de um índice simples btree para otimizar IN queries
CREATE INDEX IF NOT EXISTS idx_messages_chat_id_btree 
ON public.messages USING btree (chat_id);

-- 3. Índice para messages.sender_agent_id para otimizar joins com profiles
-- Este índice não existe e é necessário para os JOINs com a tabela profiles
CREATE INDEX IF NOT EXISTS idx_messages_sender_agent 
ON public.messages (sender_agent_id) 
WHERE sender_agent_id IS NOT NULL;

-- 4. Verificar estatísticas das tabelas para otimização do planner
-- Isso força o PostgreSQL a atualizar as estatísticas para melhor planejamento de consultas
ANALYZE public.chats;
ANALYZE public.messages;

-- Comentários explicativos
COMMENT ON INDEX idx_chats_customer_channel_created IS 'Otimiza consultas por customer_id e channel_id com ordenação por created_at DESC (upgrade do idx_chats_customer_channel)';
COMMENT ON INDEX idx_messages_chat_id_btree IS 'Otimiza consultas IN com múltiplos chat_ids (complementa o idx_messages_chat_created)';
COMMENT ON INDEX idx_messages_sender_agent IS 'Otimiza joins com profiles para sender_agent_id'; 