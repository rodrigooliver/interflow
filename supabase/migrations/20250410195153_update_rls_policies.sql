/*
  # Atualização de políticas RLS para controle de acesso organizacional

  1. Alterações
    - Remove políticas existentes que permitem acesso amplo a mensagens e chats
    - Adiciona novas políticas que restringem acesso apenas a membros da organização
    - Garante que apenas usuários pertencentes a uma organização possam acessar seus dados

  2. Segurança
    - Restrito por organização: apenas membros da organização podem acessar seus dados
    - Mantém as permissões de CRUD com base em perfil do usuário
*/


-- Remover políticas existentes que não respeitam a estrutura organizacional
DROP POLICY IF EXISTS "Agents can read all messages" ON messages;
DROP POLICY IF EXISTS "Agents can create messages" ON messages;
DROP POLICY IF EXISTS "Agents can read all chats" ON chats;
DROP POLICY IF EXISTS "Agents can create and update chats" ON chats;
DROP POLICY IF EXISTS "Agents can read all customers" ON customers;
DROP POLICY IF EXISTS "Agents can create customers" ON customers;
DROP POLICY IF EXISTS "Users can access organization customers" ON customers;
DROP POLICY IF EXISTS "Agents can read all profiles" ON profiles;
DROP POLICY IF EXISTS "Users can update own profile" ON profiles;
-- Remover políticas existentes que não respeitam a estrutura organizacional
DROP POLICY IF EXISTS "Authenticated users can read profiles" ON profiles;
DROP POLICY IF EXISTS "organization_members_policy" ON organization_members;

-- Criar novas políticas para mensagens
CREATE POLICY "Members can read organization messages"
  ON messages
  FOR SELECT
  TO authenticated
  USING (
    auth.uid() IN (
      SELECT user_id 
      FROM organization_members 
      WHERE organization_id = messages.organization_id
    )
  );

CREATE POLICY "Members can create organization messages"
  ON messages
  FOR INSERT
  TO authenticated
  WITH CHECK (
    auth.uid() IN (
      SELECT user_id 
      FROM organization_members 
      WHERE organization_id = messages.organization_id
    )
  );

CREATE POLICY "Members can update organization messages"
  ON messages
  FOR UPDATE
  TO authenticated
  USING (
    auth.uid() IN (
      SELECT user_id 
      FROM organization_members 
      WHERE organization_id = messages.organization_id
    )
  )
  WITH CHECK (
    auth.uid() IN (
      SELECT user_id 
      FROM organization_members 
      WHERE organization_id = messages.organization_id
    )
  );

CREATE POLICY "Members can delete organization messages"
  ON messages
  FOR DELETE
  TO authenticated
  USING (
    auth.uid() IN (
      SELECT user_id 
      FROM organization_members 
      WHERE organization_id = messages.organization_id
    )
  );

-- Criar novas políticas para chats
CREATE POLICY "Members can read organization chats"
  ON chats
  FOR SELECT
  TO authenticated
  USING (
    auth.uid() IN (
      SELECT user_id 
      FROM organization_members 
      WHERE organization_id = chats.organization_id
    )
  );

CREATE POLICY "Members can manage organization chats"
  ON chats
  FOR ALL
  TO authenticated
  USING (
    auth.uid() IN (
      SELECT user_id 
      FROM organization_members 
      WHERE organization_id = chats.organization_id
    )
  )
  WITH CHECK (
    auth.uid() IN (
      SELECT user_id 
      FROM organization_members 
      WHERE organization_id = chats.organization_id
    )
  );

-- Criar novas políticas para customers
CREATE POLICY "Members can read organization customers"
  ON customers
  FOR SELECT
  TO authenticated
  USING (
    auth.uid() IN (
      SELECT user_id 
      FROM organization_members 
      WHERE organization_id = customers.organization_id
    )
  );

CREATE POLICY "Members can create organization customers"
  ON customers
  FOR INSERT
  TO authenticated
  WITH CHECK (
    auth.uid() IN (
      SELECT user_id 
      FROM organization_members 
      WHERE organization_id = customers.organization_id
    )
  );

CREATE POLICY "Members can update organization customers"
  ON customers
  FOR UPDATE
  TO authenticated
  USING (
    auth.uid() IN (
      SELECT user_id 
      FROM organization_members 
      WHERE organization_id = customers.organization_id
    )
  )
  WITH CHECK (
    auth.uid() IN (
      SELECT user_id 
      FROM organization_members 
      WHERE organization_id = customers.organization_id
    )
  );

CREATE POLICY "Members can delete organization customers"
  ON customers
  FOR DELETE
  TO authenticated
  USING (
    auth.uid() IN (
      SELECT user_id 
      FROM organization_members 
      WHERE organization_id = customers.organization_id
    )
  );

-- Criar nova política para organization_members (somente visualização)
CREATE POLICY "Members can read organization members"
  ON organization_members
  FOR SELECT
  TO authenticated
  USING (
    -- Super admins podem visualizar todos os membros
    user_is_superadmin()
    OR
    -- Membros podem visualizar outros membros da mesma organização
    user_is_org_member(organization_members.organization_id)
  );

-- Criar novas políticas para profiles
DROP POLICY IF EXISTS "Users can read profiles from same organization" ON profiles;
CREATE POLICY "Users can read profiles from same organization"
  ON profiles
  FOR SELECT
  TO authenticated
  USING (
    -- Super admins podem visualizar todos os profiles
    user_is_superadmin()
    OR
    -- Usuários podem visualizar profiles da mesma organização
    EXISTS (
      SELECT 1 FROM organization_members om1
      WHERE om1.user_id = auth.uid()
      AND EXISTS (
        SELECT 1 FROM organization_members om2
        WHERE om2.user_id = profiles.id
        AND om1.organization_id = om2.organization_id
      )
    )
  );

CREATE POLICY "Users can update own profile"
  ON profiles
  FOR UPDATE
  TO authenticated
  USING (auth.uid() = id)
  WITH CHECK (auth.uid() = id);

CREATE POLICY "Organization admins can update profiles in same organization"
  ON profiles
  FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM organization_members om1
      WHERE om1.user_id = auth.uid()
      AND om1.role IN ('owner', 'admin')
      AND EXISTS (
        SELECT 1 FROM organization_members om2
        WHERE om2.user_id = profiles.id
        AND om1.organization_id = om2.organization_id
      )
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM organization_members om1
      WHERE om1.user_id = auth.uid()
      AND om1.role IN ('owner', 'admin')
      AND EXISTS (
        SELECT 1 FROM organization_members om2
        WHERE om2.user_id = profiles.id
        AND om1.organization_id = om2.organization_id
      )
    )
  ); 