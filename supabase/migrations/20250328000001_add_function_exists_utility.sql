-- Migration para adicionar função utilitária para verificar existência de outras funções
-- Criado em: 2025-03-28

-- Função para verificar se outra função existe no banco de dados
CREATE OR REPLACE FUNCTION public.function_exists(function_name TEXT)
RETURNS BOOLEAN AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1
    FROM pg_proc p
    JOIN pg_namespace n ON p.pronamespace = n.oid
    WHERE n.nspname = 'public'
    AND p.proname = function_name
  );
END;
$$ LANGUAGE plpgsql;

-- Função para criar dinamicamente outras funções (usado pelo backend)
CREATE OR REPLACE FUNCTION public.create_function(function_definition TEXT)
RETURNS VOID AS $$
BEGIN
  EXECUTE function_definition;
END;
$$ LANGUAGE plpgsql; 