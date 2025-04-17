/*
  Adiciona coluna 'default' para a tabela crm_funnels
  
  Esta migração adiciona:
  - Uma coluna 'default' do tipo boolean com valor padrão false
  - Uma constraint para garantir que apenas um funil seja definido como padrão por organização
*/

-- Adiciona a coluna default com valor padrão false
ALTER TABLE crm_funnels ADD COLUMN "default" BOOLEAN DEFAULT false;

-- Cria uma função que garante que apenas um funil seja padrão por organização
CREATE OR REPLACE FUNCTION check_default_funnel()
RETURNS TRIGGER AS $$
BEGIN
  -- Se o novo registro ou atualização define default como true
  IF NEW."default" = true THEN
    -- Define todos os outros funis da mesma organização como false
    UPDATE crm_funnels
    SET "default" = false
    WHERE organization_id = NEW.organization_id
    AND id <> NEW.id;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Cria um trigger para executar a função antes de inserir ou atualizar
CREATE TRIGGER ensure_single_default_funnel
  BEFORE INSERT OR UPDATE ON crm_funnels
  FOR EACH ROW
  EXECUTE FUNCTION check_default_funnel();

-- Adiciona um índice para consultas por default
CREATE INDEX crm_funnels_default_idx ON crm_funnels("default");

-- Comentário na coluna para documentação
COMMENT ON COLUMN crm_funnels."default" IS 'Indica se este é o funil padrão da organização. Apenas um funil pode ser padrão por organização.'; 