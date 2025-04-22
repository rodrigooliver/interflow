/*
  # Adiciona token_expires_at para chat_channels
  
  Adiciona uma nova coluna para controlar quando o token expira:
  - `token_expires_at` (timestamptz, nullable) - data e hora em que o token expira
*/

-- Adiciona a coluna token_expires_at à tabela chat_channels
ALTER TABLE chat_channels 
ADD COLUMN token_expires_at TIMESTAMPTZ;