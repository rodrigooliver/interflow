-- Adicionar task_stages para criar as colunas do quadro Kanban
CREATE TABLE IF NOT EXISTS public.task_stages (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  name text NOT NULL,
  organization_id uuid NOT NULL,
  position integer NOT NULL DEFAULT 0,
  color text NOT NULL DEFAULT '#3B82F6',
  created_at timestamp with time zone NULL DEFAULT now(),
  updated_at timestamp with time zone NULL DEFAULT now(),
  CONSTRAINT task_stages_pkey PRIMARY KEY (id),
  CONSTRAINT task_stages_organization_id_fkey FOREIGN KEY (organization_id) REFERENCES organizations (id) ON DELETE CASCADE
);

-- Criar tabela de projetos
CREATE TABLE IF NOT EXISTS public.task_projects (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  name text NOT NULL,
  description text,
  organization_id uuid NOT NULL,
  created_at timestamp with time zone NULL DEFAULT now(),
  updated_at timestamp with time zone NULL DEFAULT now(),
  CONSTRAINT task_projects_pkey PRIMARY KEY (id),
  CONSTRAINT task_projects_organization_id_fkey FOREIGN KEY (organization_id) REFERENCES organizations (id) ON DELETE CASCADE
);

-- Criar tabela de membros do projeto
CREATE TABLE IF NOT EXISTS public.task_project_members (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  project_id uuid NOT NULL,
  user_id uuid NOT NULL,
  role text NOT NULL DEFAULT 'editor',
  created_at timestamp with time zone NULL DEFAULT now(),
  updated_at timestamp with time zone NULL DEFAULT now(),
  CONSTRAINT task_project_members_pkey PRIMARY KEY (id),
  CONSTRAINT task_project_members_project_id_fkey FOREIGN KEY (project_id) REFERENCES task_projects(id) ON DELETE CASCADE,
  CONSTRAINT task_project_members_user_id_fkey FOREIGN KEY (user_id) REFERENCES profiles(id) ON DELETE CASCADE,
  CONSTRAINT task_project_members_role_check CHECK (role IN ('reader', 'editor', 'admin')),
  CONSTRAINT task_project_members_unique UNIQUE (project_id, user_id)
);

-- Adicionar coluna project_id à tabela task_stages
ALTER TABLE public.task_stages 
  ADD COLUMN IF NOT EXISTS project_id uuid,
  ADD CONSTRAINT task_stages_project_id_fkey 
  FOREIGN KEY (project_id) 
  REFERENCES task_projects(id) 
  ON DELETE CASCADE;

-- Adicionar coluna project_id à tabela tasks
ALTER TABLE public.tasks 
  ADD COLUMN IF NOT EXISTS project_id uuid,
  ADD CONSTRAINT tasks_project_id_fkey 
  FOREIGN KEY (project_id) 
  REFERENCES task_projects(id) 
  ON DELETE CASCADE;

-- Criar projeto padrão para cada organização
INSERT INTO public.task_projects (name, description, organization_id)
SELECT 'Projeto Padrão', 'Projeto inicial criado automaticamente', id FROM organizations;

-- Atualizar estágios existentes para associá-los ao projeto padrão
UPDATE public.task_stages
SET project_id = (
  SELECT id
  FROM public.task_projects
  WHERE organization_id = task_stages.organization_id
  LIMIT 1
);

-- Atualizar tarefas existentes para associá-las ao projeto padrão
UPDATE public.tasks
SET project_id = (
  SELECT id
  FROM public.task_projects
  WHERE organization_id = tasks.organization_id
  LIMIT 1
);

-- Adicionar todos os membros da organização como administradores do projeto padrão
INSERT INTO public.task_project_members (project_id, user_id, role)
SELECT p.id, m.user_id, 'admin'
FROM public.task_projects p
JOIN organization_members m ON p.organization_id = m.organization_id
WHERE m.status = 'active';

-- Adicionar task_assignees para permitir atribuir tarefas a múltiplos usuários
CREATE TABLE IF NOT EXISTS public.task_assignees (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  task_id uuid NOT NULL,
  user_id uuid NOT NULL,
  created_at timestamp with time zone NULL DEFAULT now(),
  CONSTRAINT task_assignees_pkey PRIMARY KEY (id),
  CONSTRAINT task_assignees_task_id_fkey FOREIGN KEY (task_id) REFERENCES tasks (id) ON DELETE CASCADE,
  CONSTRAINT task_assignees_user_id_fkey FOREIGN KEY (user_id) REFERENCES profiles (id) ON DELETE CASCADE,
  CONSTRAINT task_assignees_unique UNIQUE (task_id, user_id)
);

-- Adicionar task_labels para representar etiquetas coloridas das tarefas
CREATE TABLE IF NOT EXISTS public.task_labels (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  name text NOT NULL,
  color text NOT NULL DEFAULT '#3B82F6',
  organization_id uuid NOT NULL,
  created_at timestamp with time zone NULL DEFAULT now(),
  updated_at timestamp with time zone NULL DEFAULT now(),
  CONSTRAINT task_labels_pkey PRIMARY KEY (id),
  CONSTRAINT task_labels_organization_id_fkey FOREIGN KEY (organization_id) REFERENCES organizations (id) ON DELETE CASCADE
);

-- Associação de labels a tarefas
CREATE TABLE IF NOT EXISTS public.task_task_labels (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  task_id uuid NOT NULL,
  label_id uuid NOT NULL,
  created_at timestamp with time zone NULL DEFAULT now(),
  CONSTRAINT task_task_labels_pkey PRIMARY KEY (id),
  CONSTRAINT task_task_labels_task_id_fkey FOREIGN KEY (task_id) REFERENCES tasks (id) ON DELETE CASCADE,
  CONSTRAINT task_task_labels_label_id_fkey FOREIGN KEY (label_id) REFERENCES task_labels (id) ON DELETE CASCADE,
  CONSTRAINT task_task_labels_unique UNIQUE (task_id, label_id)
);

-- Adicionar colunas à tabela tasks existente
ALTER TABLE public.tasks 
  ADD COLUMN IF NOT EXISTS stage_id uuid,
  ADD COLUMN IF NOT EXISTS stage_order integer DEFAULT 0,
  ADD COLUMN IF NOT EXISTS is_archived boolean DEFAULT false,
  ADD COLUMN IF NOT EXISTS checklist jsonb DEFAULT '[]'::jsonb,
  ADD COLUMN IF NOT EXISTS due_time text;

-- Adicionar chave estrangeira para task_stages
ALTER TABLE public.tasks 
  ADD CONSTRAINT tasks_stage_id_fkey 
  FOREIGN KEY (stage_id) 
  REFERENCES task_stages(id) 
  ON DELETE SET NULL;

-- Criar estágios padrão para organizações existentes
INSERT INTO public.task_stages (name, organization_id, position, color)
SELECT 'A fazer', id, 0, '#3498db' FROM organizations;

INSERT INTO public.task_stages (name, organization_id, position, color)
SELECT 'Em progresso', id, 1, '#f39c12' FROM organizations;

INSERT INTO public.task_stages (name, organization_id, position, color)
SELECT 'Concluído', id, 2, '#2ecc71' FROM organizations;

-- Atualizar tarefas existentes para associá-las ao primeiro estágio (A fazer)
UPDATE public.tasks
SET stage_id = (
  SELECT id
  FROM public.task_stages
  WHERE organization_id = tasks.organization_id
  AND position = 0
  LIMIT 1
)
WHERE stage_id IS NULL;

-- Atualizar tarefas com status 'in_progress' para o estágio 'Em progresso'
UPDATE public.tasks
SET stage_id = (
  SELECT id
  FROM public.task_stages
  WHERE organization_id = tasks.organization_id
  AND position = 1
  LIMIT 1
)
WHERE status = 'in_progress';

-- Atualizar tarefas com status 'completed' para o estágio 'Concluído'
UPDATE public.tasks
SET stage_id = (
  SELECT id
  FROM public.task_stages
  WHERE organization_id = tasks.organization_id
  AND position = 2
  LIMIT 1
)
WHERE status = 'completed';

-- Criar políticas de segurança para as novas tabelas
ALTER TABLE public.task_stages ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.task_assignees ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.task_labels ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.task_task_labels ENABLE ROW LEVEL SECURITY;

-- Políticas para task_stages
CREATE POLICY "Membros da organização podem visualizar estágios" 
ON public.task_stages FOR SELECT 
USING (organization_id IN (
  SELECT organization_id FROM organization_members 
  WHERE user_id = auth.uid() AND status = 'active'
));

CREATE POLICY "Membros da organização podem inserir estágios" 
ON public.task_stages FOR INSERT 
WITH CHECK (organization_id IN (
  SELECT organization_id FROM organization_members 
  WHERE user_id = auth.uid() AND status = 'active'
));

CREATE POLICY "Membros da organização podem atualizar estágios" 
ON public.task_stages FOR UPDATE 
USING (organization_id IN (
  SELECT organization_id FROM organization_members 
  WHERE user_id = auth.uid() AND status = 'active'
))
WITH CHECK (organization_id IN (
  SELECT organization_id FROM organization_members 
  WHERE user_id = auth.uid() AND status = 'active'
));

CREATE POLICY "Membros da organização podem excluir estágios" 
ON public.task_stages FOR DELETE 
USING (organization_id IN (
  SELECT organization_id FROM organization_members 
  WHERE user_id = auth.uid() AND status = 'active'
));

-- Políticas para task_assignees
CREATE POLICY "Membros da organização podem visualizar atribuições" 
ON public.task_assignees FOR SELECT 
USING (task_id IN (
  SELECT id FROM tasks WHERE organization_id IN (
    SELECT organization_id FROM organization_members 
    WHERE user_id = auth.uid() AND status = 'active'
  )
));

CREATE POLICY "Membros da organização podem inserir atribuições" 
ON public.task_assignees FOR INSERT 
WITH CHECK (task_id IN (
  SELECT id FROM tasks WHERE organization_id IN (
    SELECT organization_id FROM organization_members 
    WHERE user_id = auth.uid() AND status = 'active'
  )
));

CREATE POLICY "Membros da organização podem atualizar atribuições" 
ON public.task_assignees FOR UPDATE 
USING (task_id IN (
  SELECT id FROM tasks WHERE organization_id IN (
    SELECT organization_id FROM organization_members 
    WHERE user_id = auth.uid() AND status = 'active'
  )
))
WITH CHECK (task_id IN (
  SELECT id FROM tasks WHERE organization_id IN (
    SELECT organization_id FROM organization_members 
    WHERE user_id = auth.uid() AND status = 'active'
  )
));

CREATE POLICY "Membros da organização podem excluir atribuições" 
ON public.task_assignees FOR DELETE 
USING (task_id IN (
  SELECT id FROM tasks WHERE organization_id IN (
    SELECT organization_id FROM organization_members 
    WHERE user_id = auth.uid() AND status = 'active'
  )
));

-- Políticas para task_labels
CREATE POLICY "Membros da organização podem visualizar etiquetas" 
ON public.task_labels FOR SELECT 
USING (organization_id IN (
  SELECT organization_id FROM organization_members 
  WHERE user_id = auth.uid() AND status = 'active'
));

CREATE POLICY "Membros da organização podem inserir etiquetas" 
ON public.task_labels FOR INSERT 
WITH CHECK (organization_id IN (
  SELECT organization_id FROM organization_members 
  WHERE user_id = auth.uid() AND status = 'active'
));

CREATE POLICY "Membros da organização podem atualizar etiquetas" 
ON public.task_labels FOR UPDATE 
USING (organization_id IN (
  SELECT organization_id FROM organization_members 
  WHERE user_id = auth.uid() AND status = 'active'
))
WITH CHECK (organization_id IN (
  SELECT organization_id FROM organization_members 
  WHERE user_id = auth.uid() AND status = 'active'
));

CREATE POLICY "Membros da organização podem excluir etiquetas" 
ON public.task_labels FOR DELETE 
USING (organization_id IN (
  SELECT organization_id FROM organization_members 
  WHERE user_id = auth.uid() AND status = 'active'
));

-- Políticas para task_task_labels
CREATE POLICY "Membros da organização podem visualizar associações de etiquetas" 
ON public.task_task_labels FOR SELECT 
USING (task_id IN (
  SELECT id FROM tasks WHERE organization_id IN (
    SELECT organization_id FROM organization_members 
    WHERE user_id = auth.uid() AND status = 'active'
  )
));

CREATE POLICY "Membros da organização podem inserir associações de etiquetas" 
ON public.task_task_labels FOR INSERT 
WITH CHECK (task_id IN (
  SELECT id FROM tasks WHERE organization_id IN (
    SELECT organization_id FROM organization_members 
    WHERE user_id = auth.uid() AND status = 'active'
  )
));

CREATE POLICY "Membros da organização podem atualizar associações de etiquetas" 
ON public.task_task_labels FOR UPDATE 
USING (task_id IN (
  SELECT id FROM tasks WHERE organization_id IN (
    SELECT organization_id FROM organization_members 
    WHERE user_id = auth.uid() AND status = 'active'
  )
))
WITH CHECK (task_id IN (
  SELECT id FROM tasks WHERE organization_id IN (
    SELECT organization_id FROM organization_members 
    WHERE user_id = auth.uid() AND status = 'active'
  )
));

CREATE POLICY "Membros da organização podem excluir associações de etiquetas" 
ON public.task_task_labels FOR DELETE 
USING (task_id IN (
  SELECT id FROM tasks WHERE organization_id IN (
    SELECT organization_id FROM organization_members 
    WHERE user_id = auth.uid() AND status = 'active'
  )
));

-- Criar políticas de segurança para a tabela de membros do projeto
ALTER TABLE public.task_project_members ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Membros da organização podem visualizar membros do projeto" 
ON public.task_project_members FOR SELECT 
USING (project_id IN (
  SELECT tp.id FROM task_projects tp
  JOIN organization_members om ON tp.organization_id = om.organization_id
  WHERE om.user_id = auth.uid() AND om.status = 'active'
));

CREATE POLICY "Administradores do projeto podem gerenciar membros" 
ON public.task_project_members FOR INSERT 
WITH CHECK (
  EXISTS (
    SELECT 1 FROM task_projects tp
    JOIN organization_members om ON tp.organization_id = om.organization_id
    WHERE tp.id = project_id
    AND om.user_id = auth.uid()
    AND om.status = 'active'
    AND om.role IN ('admin', 'owner')
  )
);

CREATE POLICY "Administradores do projeto podem atualizar membros" 
ON public.task_project_members FOR UPDATE 
USING (
  EXISTS (
    SELECT 1 FROM task_projects tp
    JOIN organization_members om ON tp.organization_id = om.organization_id
    WHERE tp.id = project_id
    AND om.user_id = auth.uid()
    AND om.status = 'active'
    AND om.role IN ('admin', 'owner')
  )
)
WITH CHECK (
  EXISTS (
    SELECT 1 FROM task_projects tp
    JOIN organization_members om ON tp.organization_id = om.organization_id
    WHERE tp.id = project_id
    AND om.user_id = auth.uid()
    AND om.status = 'active'
    AND om.role IN ('admin', 'owner')
  )
);

CREATE POLICY "Administradores do projeto podem excluir membros" 
ON public.task_project_members FOR DELETE 
USING (
  EXISTS (
    SELECT 1 FROM task_projects tp
    JOIN organization_members om ON tp.organization_id = om.organization_id
    WHERE tp.id = project_id
    AND om.user_id = auth.uid()
    AND om.status = 'active'
    AND om.role IN ('admin', 'owner')
  )
);

-- Modificar as políticas de projetos para considerar as permissões
-- Os usuários podem visualizar apenas projetos aos quais têm acesso
DROP POLICY IF EXISTS "Membros da organização podem visualizar projetos" ON public.task_projects;
CREATE POLICY "Usuários podem visualizar projetos aos quais têm acesso" 
ON public.task_projects FOR SELECT 
USING (
  organization_id IN (
    SELECT organization_id FROM organization_members 
    WHERE user_id = auth.uid() AND status = 'active'
  )
);

-- Qualquer membro da organização pode criar projetos
DROP POLICY IF EXISTS "Administradores da organização podem criar projetos" ON public.task_projects;
CREATE POLICY "Membros da organização podem criar projetos" 
ON public.task_projects FOR INSERT 
WITH CHECK (organization_id IN (
  SELECT organization_id FROM organization_members 
  WHERE user_id = auth.uid() AND status = 'active'
));

-- Criar funções auxiliares para verificar permissões
CREATE OR REPLACE FUNCTION public.user_is_project_admin(project_id uuid) 
RETURNS boolean AS $$
  SELECT EXISTS (
    SELECT 1 FROM task_project_members
    WHERE task_project_members.project_id = project_id 
    AND task_project_members.user_id = auth.uid()
    AND task_project_members.role = 'admin'
  );
$$ LANGUAGE sql SECURITY DEFINER;

CREATE OR REPLACE FUNCTION public.user_is_org_admin(org_id uuid)
RETURNS boolean AS $$
  SELECT EXISTS (
    SELECT 1 FROM organization_members
    WHERE organization_members.organization_id = org_id
    AND organization_members.user_id = auth.uid()
    AND organization_members.status = 'active'
    AND (organization_members.role = 'admin' OR organization_members.role = 'owner')
  );
$$ LANGUAGE sql SECURITY DEFINER;

-- Políticas de segurança usando as funções auxiliares
DROP POLICY IF EXISTS "Administradores da organização podem atualizar projetos" ON public.task_projects;
CREATE POLICY "Administradores podem atualizar projetos" 
ON public.task_projects FOR UPDATE 
USING (
  public.user_is_project_admin(id) OR public.user_is_org_admin(organization_id)
);

DROP POLICY IF EXISTS "Administradores da organização podem excluir projetos" ON public.task_projects;
CREATE POLICY "Administradores podem excluir projetos" 
ON public.task_projects FOR DELETE 
USING (
  public.user_is_project_admin(id) OR public.user_is_org_admin(organization_id)
); 