-- Adiciona índice para melhorar a consulta de mensagens por customer_id e channel_id
-- Este índice otimiza a consulta usada em src/components/chat/ChatMessages.tsx na função loadAllCustomerMessages

-- Verificando se algum dos índices já existe

-- Não precisamos criar idx_messages_chat_id pois já existe idx_messages_chat_created e idx_messages_chat_sender
-- CREATE INDEX IF NOT EXISTS idx_messages_chat_id ON public.messages (chat_id);

-- Adicionando um índice específico para a consulta que busca mensagens por chats.customer_id e chats.channel_id
CREATE INDEX IF NOT EXISTS idx_chats_customer_channel ON public.chats (customer_id, channel_id);
