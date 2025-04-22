-- Adiciona coluna settings do tipo JSONB na tabela profiles
ALTER TABLE profiles 
ADD COLUMN IF NOT EXISTS settings JSONB DEFAULT jsonb_build_object('first_login', false);

-- Atualiza registros existentes para adicionar o campo first_login como false
UPDATE profiles 
SET settings = jsonb_build_object('first_login', true)
WHERE settings IS NULL OR NOT (settings ? 'first_login');

-- Comentários para documentação
COMMENT ON COLUMN profiles.settings IS 'Configurações do perfil do usuário, incluindo first_login e futuras preferências';