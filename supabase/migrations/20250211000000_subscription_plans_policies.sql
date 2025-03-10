-- Drop existing policies
DROP POLICY IF EXISTS "subscriptions_policy" ON subscription_plans;

-- Enable RLS (caso ainda não esteja habilitado)
ALTER TABLE subscription_plans ENABLE ROW LEVEL SECURITY;

-- Política para permitir que apenas superadmins possam criar e deletar planos
CREATE POLICY "Super admins can manage subscription plans"
  ON subscription_plans
  FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.is_superadmin = true
    )
  );

-- Política para permitir que qualquer pessoa (mesmo sem autenticação) possa visualizar os planos
CREATE POLICY "Anyone can view subscription plans"
  ON subscription_plans
  FOR SELECT
  TO anon, authenticated
  USING (true); 