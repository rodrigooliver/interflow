/*
  # Atualizar as chaves estrangeiras dos chats

  1. Mudanças:
    - Atualizar as chaves estrangeiras dos chats para permitir que sejam nulas
*/

ALTER TABLE public.chats
DROP CONSTRAINT chats_last_message_id_fkey;

ALTER TABLE public.chats
DROP CONSTRAINT chats_flow_session_id_fkey;

ALTER TABLE public.chats
ADD CONSTRAINT chats_last_message_id_fkey
FOREIGN KEY (last_message_id) REFERENCES public.messages (id)
ON DELETE SET NULL;

ALTER TABLE public.chats
ADD CONSTRAINT chats_flow_session_id_fkey
FOREIGN KEY (flow_session_id) REFERENCES public.flow_sessions (id)
ON DELETE SET NULL;