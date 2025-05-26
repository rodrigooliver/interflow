/*
  # Marca a tabela emr_consultations para remoção futura
  
  Após a migração bem-sucedida de todos os dados para a tabela appointments,
  este script adiciona comentários e renomeia a tabela original para
  indicar que ela está depreciada e será removida em uma versão futura.
  
  IMPORTANTE: A remoção definitiva da tabela só deve ser feita após:
  1. Verificar que todos os dados foram migrados corretamente
  2. Atualizar todo o código que faz referência à tabela emr_consultations
  3. Garantir que os sistemas estão funcionando corretamente com a nova estrutura
*/

-- Adicionar comentário à tabela
COMMENT ON TABLE emr_consultations IS '**DEPRECIADA** Esta tabela foi substituída pela tabela appointments com is_medical_appointment=true. Será removida em uma versão futura.';

-- Adicionar comentário às colunas importantes
COMMENT ON COLUMN emr_consultations.appointment_id IS 'Referência para o registro correspondente na tabela appointments que agora é a fonte primária dos dados';

-- Adicionar prefixo "deprecated_" ao nome da tabela não é recomendado neste momento,
-- pois isso quebraria o código existente. 
-- A instrução abaixo está comentada para ser usada em uma versão futura:

-- ALTER TABLE emr_consultations RENAME TO deprecated_emr_consultations;

-- Adicionamos apenas um trigger para registrar tentativas de uso da tabela:
CREATE OR REPLACE FUNCTION log_deprecated_emr_consultations_usage()
RETURNS TRIGGER AS $$
BEGIN
  RAISE WARNING 'Uso de tabela depreciada: emr_consultations. Use appointments com is_medical_appointment=true.';
  INSERT INTO system_logs (
    log_type, 
    log_level, 
    message, 
    details
  ) VALUES (
    'deprecation_warning',
    'WARNING',
    'Uso de tabela depreciada: emr_consultations',
    jsonb_build_object(
      'operation', TG_OP,
      'table', TG_TABLE_NAME,
      'timestamp', now()
    )
  );
  RETURN NULL;
END;
$$ LANGUAGE plpgsql;

-- Verificar se a tabela system_logs existe, se não, criá-la
DO $$
BEGIN
  IF NOT EXISTS (SELECT FROM information_schema.tables WHERE table_name = 'system_logs') THEN
    CREATE TABLE system_logs (
      id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
      log_type text NOT NULL,
      log_level text NOT NULL,
      message text NOT NULL,
      details jsonb,
      created_at timestamptz NOT NULL DEFAULT now()
    );
    
    CREATE INDEX system_logs_log_type_idx ON system_logs(log_type);
    CREATE INDEX system_logs_log_level_idx ON system_logs(log_level);
    CREATE INDEX system_logs_created_at_idx ON system_logs(created_at);
  END IF;
END
$$;

-- Adicionar trigger para INSERT, UPDATE, DELETE na tabela
CREATE TRIGGER log_deprecated_emr_consultations_usage
AFTER INSERT OR UPDATE OR DELETE ON emr_consultations
FOR EACH STATEMENT
EXECUTE FUNCTION log_deprecated_emr_consultations_usage(); 