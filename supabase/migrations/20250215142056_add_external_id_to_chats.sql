-- Adiciona coluna external_id para referência externa
ALTER TABLE chats ADD COLUMN external_id TEXT;

-- Cria índice composto para melhorar performance de consultas
-- que filtram por channel_id e external_id simultaneamente
CREATE INDEX chats_channel_external_idx ON chats(channel_id, external_id);

-- Garante que a combinação de channel_id e external_id seja única
ALTER TABLE chats ADD CONSTRAINT chats_channel_external_unique UNIQUE (channel_id, external_id); 

-- Remove a coluna channel que não será mais utilizada
ALTER TABLE chats DROP COLUMN channel; 

-- Adiciona coluna external_id para referência externa em messages
ALTER TABLE messages ADD COLUMN external_id TEXT;
-- Adiciona coluna response_message_id que referencia outra mensagem
ALTER TABLE messages ADD COLUMN response_message_id UUID REFERENCES messages(id);
-- Adiciona coluna metadata para armazenar dados adicionais da mensagem
ALTER TABLE messages ADD COLUMN metadata JSONB;

-- Cria índice composto para melhorar performance de consultas
-- que filtram por chat_id e external_id simultaneamente
CREATE INDEX messages_chat_external_idx ON messages(chat_id, external_id);
-- Cria índice para melhorar performance de consultas que usam response_message_id
CREATE INDEX messages_response_idx ON messages(response_message_id);
-- Cria índice GIN para permitir buscas eficientes dentro do JSONB
CREATE INDEX messages_metadata_idx ON messages USING GIN (metadata);

-- Adiciona coluna profile_picture para armazenar URL da imagem de perfil
ALTER TABLE chats ADD COLUMN profile_picture TEXT;

-- Adiciona coluna profile_picture para armazenar URL da imagem de perfil em customers
ALTER TABLE customers ADD COLUMN profile_picture TEXT;

-- Adiciona coluna profile_id em organization_members referenciando profiles
ALTER TABLE organization_members 
ADD COLUMN profile_id UUID,
ADD CONSTRAINT fk_organization_members_profile 
    FOREIGN KEY (profile_id) 
    REFERENCES profiles(id);

-- Cria índice para melhorar performance de consultas que usam profile_id
CREATE INDEX organization_members_profile_idx ON organization_members(profile_id);

-- Atualiza profile_id com os valores de user_id onde profile_id está nulo
UPDATE organization_members 
SET profile_id = user_id 
WHERE profile_id IS NULL;

-- Remove colunas whatsapp e email que não serão mais utilizadas
ALTER TABLE chats DROP COLUMN whatsapp;
ALTER TABLE chats DROP COLUMN email;

-- Adiciona novas colunas
ALTER TABLE chats ADD COLUMN title TEXT;
ALTER TABLE chats ADD COLUMN flow_session_id UUID REFERENCES flow_sessions(id);
ALTER TABLE chats ADD COLUMN rating INTEGER CHECK (rating >= 1 AND rating <= 5);
ALTER TABLE chats ADD COLUMN feedback TEXT;
ALTER TABLE chats ADD COLUMN profile_updated_at TIMESTAMPTZ DEFAULT NOW();

-- Cria índice para melhorar performance de consultas que usam flow_session_id
CREATE INDEX chats_flow_session_idx ON chats(flow_session_id);

-- Cria índice para melhorar performance de consultas que usam profile_updated_at
CREATE INDEX chats_profile_updated_idx ON chats(profile_updated_at);
