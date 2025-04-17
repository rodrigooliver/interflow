-- Adicionar coluna stage_order à tabela customers
ALTER TABLE customers
ADD COLUMN stage_order NUMERIC(10,5) DEFAULT 1000.0;

-- Criar índice para performance de consultas ordenadas
CREATE INDEX IF NOT EXISTS idx_customers_stage_id_stage_order 
ON customers (stage_id, stage_order);

-- Função simplificada para definir stage_order ao mover ou inserir um cliente
CREATE OR REPLACE FUNCTION fix_stage_order()
RETURNS TRIGGER AS $$
DECLARE
  max_order NUMERIC(10,5);
BEGIN
  -- Usado apenas quando o stage_id é alterado ou em inserção
  IF (TG_OP = 'UPDATE' AND OLD.stage_id IS DISTINCT FROM NEW.stage_id) OR 
     (TG_OP = 'INSERT' AND NEW.stage_order IS NULL) THEN
    
    -- Se o stage_order não foi especificado, coloca no final
    IF NEW.stage_order IS NULL THEN
      -- Encontrar o maior valor atual e adicionar 1000
      SELECT COALESCE(MAX(stage_order), 0) + 1000.0
      INTO max_order
      FROM customers
      WHERE stage_id = NEW.stage_id;
      
      NEW.stage_order := max_order;
    END IF;
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger para inserções na tabela customers
CREATE TRIGGER customers_stage_order_insert_trigger
BEFORE INSERT ON customers
FOR EACH ROW
EXECUTE FUNCTION fix_stage_order();

-- Trigger para atualizações na tabela customers
CREATE TRIGGER customers_stage_order_update_trigger
BEFORE UPDATE ON customers
FOR EACH ROW
WHEN (OLD.stage_id IS DISTINCT FROM NEW.stage_id OR OLD.stage_order IS DISTINCT FROM NEW.stage_order)
EXECUTE FUNCTION fix_stage_order();

-- Função separada para reordenar valores quando necessário (executada manualmente por estágio)
CREATE OR REPLACE FUNCTION reorder_stage_customers(p_stage_id UUID)
RETURNS VOID AS $$
DECLARE
  step_size NUMERIC(10,5) := 1000.0;
BEGIN
  -- Reordenar os clientes neste estágio
  WITH ordered_customers AS (
    SELECT 
      id,
      ROW_NUMBER() OVER (ORDER BY stage_order) * step_size as new_order
    FROM customers
    WHERE stage_id = p_stage_id
  )
  UPDATE customers c
  SET stage_order = oc.new_order
  FROM ordered_customers oc
  WHERE c.id = oc.id
  AND c.stage_id = p_stage_id;
END;
$$ LANGUAGE plpgsql;

-- Função para reordenar todos os clientes em todos os estágios de uma vez só
CREATE OR REPLACE FUNCTION reorder_all_customers()
RETURNS VOID AS $$
DECLARE
  stage record;
BEGIN
  -- Percorrer cada estágio e reordenar seus clientes
  FOR stage IN SELECT id FROM crm_stages
  LOOP
    PERFORM reorder_stage_customers(stage.id);
  END LOOP;
END;
$$ LANGUAGE plpgsql;

-- Inicializar os valores de stage_order para os clientes existentes
UPDATE customers
SET stage_order = subquery.new_order
FROM (
  SELECT 
    id,
    ROW_NUMBER() OVER (PARTITION BY stage_id ORDER BY updated_at) * 1000.0 as new_order
  FROM customers
  WHERE stage_id IS NOT NULL
) AS subquery
WHERE customers.id = subquery.id
AND customers.stage_order IS NULL; 