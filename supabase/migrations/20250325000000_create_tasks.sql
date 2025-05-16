-- Create tasks table
CREATE TYPE task_priority AS ENUM ('low', 'medium', 'high');
CREATE TYPE task_status AS ENUM ('pending', 'in_progress', 'completed', 'cancelled');

CREATE TABLE tasks (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    title TEXT NOT NULL,
    description TEXT,
    due_date TIMESTAMP WITH TIME ZONE,
    priority task_priority,
    status task_status DEFAULT 'pending',
    user_id UUID REFERENCES profiles(id) ON DELETE CASCADE,
    customer_id UUID REFERENCES customers(id) ON DELETE CASCADE,
    chat_id UUID REFERENCES chats(id) ON DELETE CASCADE,
    appointment_id UUID REFERENCES appointments(id) ON DELETE CASCADE,
    organization_id UUID REFERENCES organizations(id) ON DELETE CASCADE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create index for better performance
CREATE INDEX tasks_user_id_idx ON tasks(user_id);
CREATE INDEX tasks_customer_id_idx ON tasks(customer_id);
CREATE INDEX tasks_chat_id_idx ON tasks(chat_id);
CREATE INDEX tasks_appointment_id_idx ON tasks(appointment_id);
CREATE INDEX tasks_organization_id_idx ON tasks(organization_id);

-- Create RLS policies
ALTER TABLE tasks ENABLE ROW LEVEL SECURITY;

-- Policy for viewing tasks
DROP POLICY IF EXISTS "Users can view their own tasks" ON tasks;
CREATE POLICY "Membros do projeto podem visualizar tarefas"
    ON tasks FOR SELECT
    USING (
        project_id IN (
            SELECT project_id FROM task_project_members
            WHERE user_id = auth.uid()
        )
    );

-- Policy for inserting tasks
DROP POLICY IF EXISTS "Users can insert their own tasks" ON tasks;
CREATE POLICY "Editores e admins podem cadastrar tarefas"
    ON tasks FOR INSERT
    WITH CHECK (
        public.user_is_project_editor_or_admin(project_id)
    );

-- Policy for updating tasks
DROP POLICY IF EXISTS "Users can update their own tasks" ON tasks;
CREATE POLICY "Editores e admins podem atualizar tarefas"
    ON tasks FOR UPDATE
    USING (
        public.user_is_project_editor_or_admin(project_id)
    )
    WITH CHECK (
        public.user_is_project_editor_or_admin(project_id)
    );

-- Policy for deleting tasks
DROP POLICY IF EXISTS "Users can delete their own tasks" ON tasks;
CREATE POLICY "Editores e admins podem excluir tarefas"
    ON tasks FOR DELETE
    USING (
        public.user_is_project_editor_or_admin(project_id)
    );

-- Create function to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Create trigger to automatically update updated_at
CREATE TRIGGER update_tasks_updated_at
    BEFORE UPDATE ON tasks
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column(); 