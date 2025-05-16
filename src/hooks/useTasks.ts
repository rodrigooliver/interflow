import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '../lib/supabase';
import { toast } from 'react-hot-toast';
import { TaskStage, TaskWithRelations, TaskLabel, TaskAssignee, TaskProject, ProjectMember, ProjectRole } from '../types/tasks';
import { useTranslation } from 'react-i18next';
import { useAuthContext } from '../contexts/AuthContext';

// Hook para buscar projetos
export function useTaskProjects(organizationId?: string) {
  const { session } = useAuthContext();
  const userId = session?.user?.id;

  return useQuery({
    queryKey: ['task-projects', organizationId, userId],
    queryFn: async () => {
      if (!organizationId || !userId) return [];

      // Buscar projetos onde o usuário é membro ou é administrador da organização
      const { data, error } = await supabase
        .from('task_projects')
        .select(`
          *,
          members:task_project_members!inner(
            id,
            user_id
          ),
          allMembers:task_project_members(
            id,
            user_id,
            role,
            profile:profiles(id, full_name, avatar_url)
          ),
          stages:task_stages(
            id,
            name
          )
        `)
        .eq('organization_id', organizationId)
        .eq('members.user_id', userId)
        .order('name');

      if (error) throw error;

      // Limpar a relação de membros, pois só usamos para filtrar
      return (data || []).map(project => ({
        id: project.id,
        name: project.name,
        description: project.description,
        organization_id: project.organization_id,
        created_at: project.created_at,
        updated_at: project.updated_at,
        members: project.members,
        allMembers: project.allMembers,
        stages: project.stages
      })) as TaskProject[];
    },
    enabled: !!organizationId && !!userId,
    staleTime: 5 * 60 * 1000, // 5 minutos
  });
}

// Hook para criar um novo projeto
export function useCreateTaskProject() {
  const queryClient = useQueryClient();
  const { t } = useTranslation('tasks');
  const { session } = useAuthContext();
  const userId = session?.user?.id;

  return useMutation({
    mutationFn: async ({ 
      name, 
      description, 
      organizationId 
    }: { 
      name: string; 
      description?: string; 
      organizationId: string; 
    }) => {
      // 1. Primeiro criamos o projeto
      const { data: project, error: projectError } = await supabase
        .from('task_projects')
        .insert({
          name,
          description,
          organization_id: organizationId
        })
        .select()
        .single();

      if (projectError) throw projectError;
      
      // 2. Adicionamos o usuário atual como administrador do projeto
      if (userId) {
        const { error: memberError } = await supabase
          .from('task_project_members')
          .insert({
            project_id: project.id,
            user_id: userId,
            role: 'admin'
          });
        
        if (memberError) throw memberError;
      }
      
      return project;
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['task-projects', variables.organizationId] });
      toast.success(t('projects.created'));
    },
    onError: (error) => {
      console.error('Error creating project:', error);
      toast.error(t('projects.createError'));
    }
  });
}

// Hook para atualizar um projeto
export function useUpdateTaskProject() {
  const queryClient = useQueryClient();
  const { t } = useTranslation('tasks');

  return useMutation({
    mutationFn: async ({ 
      id, 
      name, 
      description 
    }: { 
      id: string; 
      name?: string; 
      description?: string;
    }) => {
      const updates: Record<string, any> = {};
      if (name !== undefined) updates.name = name;
      if (description !== undefined) updates.description = description;
      
      const { data, error } = await supabase
        .from('task_projects')
        .update(updates)
        .eq('id', id)
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['task-projects', data.organization_id] });
      toast.success(t('projects.updated'));
    },
    onError: (error) => {
      console.error('Error updating project:', error);
      toast.error(t('projects.updateError'));
    }
  });
}

// Hook para excluir um projeto
export function useDeleteTaskProject() {
  const queryClient = useQueryClient();
  const { t } = useTranslation('tasks');

  return useMutation({
    mutationFn: async ({ id, organizationId }: { id: string; organizationId: string }) => {
      const { error } = await supabase
        .from('task_projects')
        .delete()
        .eq('id', id);

      if (error) throw error;
      return { id, organizationId };
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['task-projects', data.organizationId] });
      queryClient.invalidateQueries({ queryKey: ['task-stages', data.organizationId] });
      queryClient.invalidateQueries({ queryKey: ['tasks-by-stage', data.organizationId] });
      toast.success(t('projects.deleted'));
    },
    onError: (error) => {
      console.error('Error deleting project:', error);
      toast.error(t('projects.deleteError'));
    }
  });
}

// Hook para buscar estágios de tarefas
export function useTaskStages(organizationId?: string, projectId?: string) {
  return useQuery({
    queryKey: ['task-stages', organizationId, projectId],
    queryFn: async () => {
      if (!organizationId) return [];

      let query = supabase
        .from('task_stages')
        .select('*')
        .eq('organization_id', organizationId);
        
      if (projectId) {
        query = query.eq('project_id', projectId);
      }
        
      query = query.order('position');

      const { data, error } = await query;

      if (error) throw error;
      return data as TaskStage[];
    },
    enabled: !!organizationId,
    staleTime: 5 * 60 * 1000, // 5 minutos
  });
}

// Hook para buscar tarefas por estágio
export function useTasksByStage(
  organizationId?: string, 
  projectId?: string, 
  userId?: string, 
  includeArchived: boolean = false,
  filterOverdue: boolean = false
) {
  return useQuery({
    queryKey: ['tasks-by-stage', organizationId, projectId, userId, includeArchived, filterOverdue],
    queryFn: async () => {
      if (!organizationId) return [];

      let query = supabase
        .from('tasks')
        .select(`
          *,
          stage:task_stages(*),
          customer:customers!tasks_customer_id_fkey(*),
          assignees:task_assignees${userId ? '!inner' : ''}(
            *,
            profile:profiles(*)
          ),
          labels:task_task_labels(
            id,
            label:task_labels(*)
          ),
          project:task_projects(*)
        `)
        .eq('organization_id', organizationId);

      // Se includeArchived for true, exibir apenas tarefas arquivadas
      // Se includeArchived for false, exibir apenas tarefas não arquivadas
      query = query.eq('is_archived', includeArchived);
      
      if (projectId) {
        query = query.eq('project_id', projectId);
      }

      if (userId) {
        query = query.eq('assignees.user_id', userId);
      }
      
      // Filtrar tarefas vencidas - onde a data de vencimento é menor que hoje e o status não é completed ou cancelled
      if (filterOverdue) {
        const today = new Date().toISOString().split('T')[0]; // Formato YYYY-MM-DD
        query = query
          .lt('due_date', today)
          .not('status', 'in', '(completed,cancelled)')
          .not('due_date', 'is', null);
      }

      query = query.order('stage_order', { ascending: true });

      const { data, error } = await query;

      if (error) throw error;

      // Processar os resultados para o formato necessário
      return (data || []).map(task => ({
        ...task,
        // Converter checklist de JSON para array se necessário
        checklist: Array.isArray(task.checklist) ? task.checklist : [],
        // Processar os relacionamentos
        assignees: task.assignees,
        labels: task.labels?.map((labelRel: {label: TaskLabel}) => labelRel.label)
      })) as TaskWithRelations[];
    },
    enabled: !!organizationId,
    staleTime: 1 * 60 * 1000, // 1 minuto
  });
}

// Hook para buscar tarefas por cliente
export function useTasksByCustomer(organizationId?: string, customerId?: string, includeArchived: boolean = false) {
  return useQuery({
    queryKey: ['tasks-by-customer', organizationId, customerId, includeArchived],
    queryFn: async () => {
      if (!organizationId || !customerId) return [];

      let query = supabase
        .from('tasks')
        .select(`
          *,
          stage:task_stages(*),
          customer:customers!tasks_customer_id_fkey(*),
          assignees:task_assignees(
            *,
            profile:profiles(*)
          ),
          labels:task_task_labels(
            id,
            label:task_labels(*)
          ),
          project:task_projects(*)
        `)
        .eq('organization_id', organizationId)
        .eq('customer_id', customerId);

      // Se includeArchived for true, exibir apenas tarefas arquivadas
      // Se includeArchived for false, exibir apenas tarefas não arquivadas
      query = query.eq('is_archived', includeArchived);
      
      query = query.order('updated_at', { ascending: false });

      const { data, error } = await query;

      if (error) throw error;

      // Processar os resultados para o formato necessário
      return (data || []).map(task => ({
        ...task,
        // Converter checklist de JSON para array se necessário
        checklist: Array.isArray(task.checklist) ? task.checklist : [],
        // Processar os relacionamentos
        assignees: task.assignees,
        labels: task.labels?.map((labelRel: {label: TaskLabel}) => labelRel.label)
      })) as TaskWithRelations[];
    },
    enabled: !!organizationId && !!customerId,
    staleTime: 1 * 60 * 1000, // 1 minuto
  });
}

// Hook para buscar etiquetas de tarefas
export function useTaskLabels(organizationId?: string) {
  return useQuery({
    queryKey: ['task-labels', organizationId],
    queryFn: async () => {
      if (!organizationId) return [];

      const { data, error } = await supabase
        .from('task_labels')
        .select('*')
        .eq('organization_id', organizationId)
        .order('name');

      if (error) throw error;
      return data as TaskLabel[];
    },
    enabled: !!organizationId,
    staleTime: 5 * 60 * 1000, // 5 minutos
  });
}

// Hook para criar um novo estágio
export function useCreateTaskStage() {
  const queryClient = useQueryClient();
  const { t } = useTranslation('tasks');

  return useMutation({
    mutationFn: async ({ 
      name, 
      organizationId, 
      position, 
      color = '#3B82F6',
      project_id 
    }: { 
      name: string; 
      organizationId: string; 
      position: number; 
      color?: string;
      project_id?: string;
    }) => {
      const { data, error } = await supabase
        .from('task_stages')
        .insert({
          name,
          organization_id: organizationId,
          position,
          color,
          project_id
        })
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['task-stages', variables.organizationId, variables.project_id] });
      queryClient.invalidateQueries({ queryKey: ['tasks-by-stage', variables.organizationId] });
      queryClient.invalidateQueries({ queryKey: ['task-projects', variables.organizationId] });
      toast.success(t('stages.created'));
    },
    onError: (error) => {
      console.error('Error creating task stage:', error);
      toast.error(t('stages.createError'));
    }
  });
}

// Hook para atualizar um estágio
export function useUpdateTaskStage() {
  const queryClient = useQueryClient();
  const { t } = useTranslation('tasks');

  return useMutation({
    mutationFn: async ({ 
      id, 
      name, 
      position, 
      color,
      project_id
    }: { 
      id: string; 
      name?: string; 
      position?: number; 
      color?: string;
      project_id?: string;
    }) => {
      const updates: Record<string, any> = {};
      if (name !== undefined) updates.name = name;
      if (position !== undefined) updates.position = position;
      if (color !== undefined) updates.color = color;
      if (project_id !== undefined) updates.project_id = project_id;
      
      const { data, error } = await supabase
        .from('task_stages')
        .update(updates)
        .eq('id', id)
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['task-stages', data.organization_id, data.project_id] });
      toast.success(t('stages.updated'));
    },
    onError: (error) => {
      console.error('Error updating task stage:', error);
      toast.error(t('stages.updateError'));
    }
  });
}

// Hook para excluir um estágio
export function useDeleteTaskStage() {
  const queryClient = useQueryClient();
  const { t } = useTranslation('tasks');

  return useMutation({
    mutationFn: async ({ id, organizationId }: { id: string; organizationId: string }) => {
      const { error } = await supabase
        .from('task_stages')
        .delete()
        .eq('id', id);

      if (error) throw error;
      return { id, organizationId };
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['task-stages', data.organizationId] });
      queryClient.invalidateQueries({ queryKey: ['tasks-by-stage', data.organizationId] });
      queryClient.invalidateQueries({ queryKey: ['task-projects', data.organizationId] });
      toast.success(t('stages.deleted'));
    },
    onError: (error) => {
      console.error('Error deleting task stage:', error);
      toast.error(t('stages.deleteError'));
    }
  });
}

// Hook para mover uma tarefa para outro estágio ou mudar a ordem
export function useUpdateTaskStageOrder() {
  const queryClient = useQueryClient();
  const { t } = useTranslation('tasks');

  return useMutation({
    mutationFn: async ({ 
      taskId, 
      stageId, 
      order, 
      organizationId 
    }: { 
      taskId: string; 
      stageId: string; 
      order: number; 
      organizationId: string;
    }) => {
      const { data, error } = await supabase
        .from('tasks')
        .update({
          stage_id: stageId,
          stage_order: order,
          updated_at: new Date().toISOString()
        })
        .eq('id', taskId)
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['tasks-by-stage', variables.organizationId] });
    },
    onError: (error) => {
      console.error('Error updating task stage/order:', error);
      toast.error(t('error.taskMove'));
    }
  });
}

// Hook para criar uma nova etiqueta
export function useCreateTaskLabel() {
  const queryClient = useQueryClient();
  const { t } = useTranslation('tasks');

  return useMutation({
    mutationFn: async ({ 
      name, 
      color, 
      organizationId 
    }: { 
      name: string; 
      color: string; 
      organizationId: string;
    }) => {
      const { data, error } = await supabase
        .from('task_labels')
        .insert({
          name,
          color,
          organization_id: organizationId
        })
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['task-labels', data.organization_id] });
      toast.success(t('labels.created'));
    },
    onError: (error) => {
      console.error('Error creating task label:', error);
      toast.error(t('labels.createError'));
    }
  });
}

// Hook para adicionar uma etiqueta a uma tarefa
export function useAddLabelToTask() {
  const queryClient = useQueryClient();
  const { t } = useTranslation('tasks');

  return useMutation({
    mutationFn: async ({ 
      taskId, 
      labelId, 
      organizationId 
    }: { 
      taskId: string; 
      labelId: string; 
      organizationId: string;
    }) => {
      const { data, error } = await supabase
        .from('task_task_labels')
        .insert({
          task_id: taskId,
          label_id: labelId
        })
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['tasks-by-stage', variables.organizationId] });
    },
    onError: (error) => {
      console.error('Error adding label to task:', error);
      toast.error(t('labels.addError'));
    }
  });
}

// Hook para remover uma etiqueta de uma tarefa
export function useRemoveLabelFromTask() {
  const queryClient = useQueryClient();
  const { t } = useTranslation('tasks');

  return useMutation({
    mutationFn: async ({ 
      taskId, 
      labelId, 
      organizationId 
    }: { 
      taskId: string; 
      labelId: string; 
      organizationId: string;
    }) => {
      const { error } = await supabase
        .from('task_task_labels')
        .delete()
        .eq('task_id', taskId)
        .eq('label_id', labelId);

      if (error) throw error;
      return { taskId, labelId, organizationId };
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['tasks-by-stage', data.organizationId] });
    },
    onError: (error) => {
      console.error('Error removing label from task:', error);
      toast.error(t('labels.removeError'));
    }
  });
}

// Hook para atribuir uma tarefa a um usuário
export function useAssignTaskToUser() {
  const queryClient = useQueryClient();
  const { t } = useTranslation('tasks');

  return useMutation({
    mutationFn: async ({ 
      taskId, 
      userId, 
      organizationId 
    }: { 
      taskId: string; 
      userId: string; 
      organizationId: string;
    }) => {
      // Primeiro verificamos se já existe uma atribuição
      const { data: existingAssignment, error: checkError } = await supabase
        .from('task_assignees')
        .select('id')
        .eq('task_id', taskId)
        .eq('user_id', userId)
        .single();

      if (checkError && checkError.code !== 'PGRST116') {
        // Erro real (não o erro de não encontrar registro)
        throw checkError;
      }

      // Se já existe, retornamos sem fazer nada
      if (existingAssignment) {
        return existingAssignment;
      }

      // Caso contrário, criamos uma nova atribuição
      const { data, error } = await supabase
        .from('task_assignees')
        .insert({
          task_id: taskId,
          user_id: userId
        })
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['tasks-by-stage', variables.organizationId] });
      toast.success(t('assignees.assigned'));
    },
    onError: (error) => {
      console.error('Error assigning task to user:', error);
      toast.error(t('assignees.assignError'));
    }
  });
}

// Hook para remover uma atribuição de tarefa
export function useRemoveTaskAssignment() {
  const queryClient = useQueryClient();
  const { t } = useTranslation('tasks');

  return useMutation({
    mutationFn: async ({ 
      assignmentId, 
      organizationId 
    }: { 
      assignmentId: string; 
      organizationId: string;
    }) => {
      const { error } = await supabase
        .from('task_assignees')
        .delete()
        .eq('id', assignmentId);

      if (error) throw error;
      return { assignmentId, organizationId };
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['tasks-by-stage', data.organizationId] });
      toast.success(t('assignees.removed'));
    },
    onError: (error) => {
      console.error('Error removing task assignment:', error);
      toast.error(t('assignees.removeError'));
    }
  });
}

// Hook para arquivar/desarquivar uma tarefa
export function useToggleTaskArchived() {
  const queryClient = useQueryClient();
  const { t } = useTranslation('tasks');

  return useMutation({
    mutationFn: async ({ 
      taskId, 
      isArchived, 
      organizationId 
    }: { 
      taskId: string; 
      isArchived: boolean; 
      organizationId: string;
    }) => {
      const { data, error } = await supabase
        .from('tasks')
        .update({
          is_archived: isArchived,
          updated_at: new Date().toISOString()
        })
        .eq('id', taskId)
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['tasks-by-stage', variables.organizationId] });
      toast.success(variables.isArchived ? t('archived') : t('unarchived'));
    },
    onError: (error) => {
      console.error('Error toggling task archived status:', error);
      toast.error(t('error.archiveToggle'));
    }
  });
}

// Hook para atualizar os itens de checklist de uma tarefa
export function useUpdateTaskChecklist() {
  const queryClient = useQueryClient();
  const { t } = useTranslation('tasks');

  return useMutation({
    mutationFn: async ({ 
      taskId, 
      checklist, 
      organizationId 
    }: { 
      taskId: string; 
      checklist: any[]; 
      organizationId: string;
    }) => {
      const { data, error } = await supabase
        .from('tasks')
        .update({
          checklist,
          updated_at: new Date().toISOString()
        })
        .eq('id', taskId)
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['tasks-by-stage', variables.organizationId] });
    },
    onError: (error) => {
      console.error('Error updating task checklist:', error);
      toast.error(t('error.checklistUpdate'));
    }
  });
}

// Hook para buscar usuários que podem ser adicionados ao projeto
export function useProjectPotentialMembers(organizationId?: string, projectId?: string) {
  return useQuery({
    queryKey: ['project-potential-members', organizationId, projectId],
    queryFn: async () => {
      if (!organizationId) return [];

      // Buscar todos os membros da organização
      const { data: orgMembers, error: orgError } = await supabase
        .from('organization_members')
        .select(`
          user_id,
          profiles:profiles(*)
        `)
        .eq('organization_id', organizationId)
        .eq('status', 'active');

      if (orgError) throw orgError;

      // Se não temos um projeto específico, retornar todos os membros da organização
      if (!projectId) {
        return orgMembers.map(member => ({
          ...member.profiles,
          user_id: member.user_id
        }));
      }

      // Buscar membros atuais do projeto
      const { data: projectMembers, error: projError } = await supabase
        .from('task_project_members')
        .select('user_id')
        .eq('project_id', projectId);

      if (projError) throw projError;

      // Filtrar membros da organização que ainda não estão no projeto
      const projectMemberIds = projectMembers.map(pm => pm.user_id);
      const potentialMembers = orgMembers.filter(om => !projectMemberIds.includes(om.user_id));

      return potentialMembers.map(member => ({
        ...member.profiles,
        user_id: member.user_id
      }));
    },
    enabled: !!organizationId,
    staleTime: 5 * 60 * 1000, // 5 minutos
  });
}

// Hook para buscar membros do projeto
export function useProjectMembers(projectId?: string) {
  return useQuery({
    queryKey: ['project-members', projectId],
    queryFn: async () => {
      if (!projectId) return [];

      const { data, error } = await supabase
        .from('task_project_members')
        .select(`
          *,
          profile:profiles(*)
        `)
        .eq('project_id', projectId);

      if (error) throw error;
      return data as ProjectMember[];
    },
    enabled: !!projectId,
    staleTime: 5 * 60 * 1000, // 5 minutos
  });
}

// Hook para adicionar membro ao projeto
export function useAddProjectMember() {
  const queryClient = useQueryClient();
  const { t } = useTranslation('tasks');

  return useMutation({
    mutationFn: async ({ 
      projectId, 
      userId, 
      role = 'editor' 
    }: { 
      projectId: string; 
      userId: string; 
      role?: ProjectRole;
    }) => {
      const { data, error } = await supabase
        .from('task_project_members')
        .insert({
          project_id: projectId,
          user_id: userId,
          role
        })
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['project-members', variables.projectId] });
      queryClient.invalidateQueries({ queryKey: ['project-potential-members', undefined, variables.projectId] });
      toast.success(t('projects.memberAdded'));
    },
    onError: (error) => {
      console.error('Error adding project member:', error);
      toast.error(t('projects.memberAddError'));
    }
  });
}

// Hook para atualizar função de membro do projeto
export function useUpdateProjectMemberRole() {
  const queryClient = useQueryClient();
  const { t } = useTranslation('tasks');

  return useMutation({
    mutationFn: async ({ 
      memberId, 
      projectId, 
      role 
    }: { 
      memberId: string; 
      projectId: string;
      role: ProjectRole;
    }) => {
      const { data, error } = await supabase
        .from('task_project_members')
        .update({
          role,
          updated_at: new Date().toISOString()
        })
        .eq('id', memberId)
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['project-members', variables.projectId] });
      toast.success(t('projects.memberRoleUpdated'));
    },
    onError: (error) => {
      console.error('Error updating project member role:', error);
      toast.error(t('projects.memberRoleUpdateError'));
    }
  });
}

// Hook para remover membro do projeto
export function useRemoveProjectMember() {
  const queryClient = useQueryClient();
  const { t } = useTranslation('tasks');

  return useMutation({
    mutationFn: async ({ 
      memberId, 
      projectId 
    }: { 
      memberId: string; 
      projectId: string;
    }) => {
      const { error } = await supabase
        .from('task_project_members')
        .delete()
        .eq('id', memberId);

      if (error) throw error;
      return { memberId, projectId };
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['project-members', data.projectId] });
      queryClient.invalidateQueries({ queryKey: ['project-potential-members', undefined, data.projectId] });
      toast.success(t('projects.memberRemoved'));
    },
    onError: (error) => {
      console.error('Error removing project member:', error);
      toast.error(t('projects.memberRemoveError'));
    }
  });
}

// Hook para verificar acesso do usuário atual ao projeto
export function useCurrentUserProjectAccess(projectId?: string) {
  const { session } = useAuthContext(); // Importe useAuthContext
  
  return useQuery({
    queryKey: ['project-access', projectId, session?.user?.id],
    queryFn: async () => {
      if (!projectId || !session?.user?.id) {
        return { 
          hasAccess: false, 
          role: null as ProjectRole | null,
          isAdmin: false
        };
      }

      const { data, error } = await supabase
        .from('task_project_members')
        .select('role')
        .eq('project_id', projectId)
        .eq('user_id', session.user.id)
        .single();

      if (error) {
        if (error.code === 'PGRST116') { // Código para 'não encontrado'
          return { 
            hasAccess: false, 
            role: null as ProjectRole | null,
            isAdmin: false
          };
        }
        throw error;
      }

      return { 
        hasAccess: true, 
        role: data.role as ProjectRole,
        isAdmin: data.role === 'admin'
      };
    },
    enabled: !!projectId && !!session?.user?.id,
    staleTime: 5 * 60 * 1000, // 5 minutos
  });
}

// Hook para atualizar o status de uma tarefa
export function useUpdateTaskStatus() {
  const queryClient = useQueryClient();
  const { t } = useTranslation('tasks');

  return useMutation({
    mutationFn: async ({
      taskId,
      status,
      organizationId
    }: {
      taskId: string;
      status: 'pending' | 'in_progress' | 'completed' | 'cancelled';
      organizationId: string;
    }) => {
      const { data, error } = await supabase
        .from('tasks')
        .update({
          status,
          updated_at: new Date().toISOString()
        })
        .eq('id', taskId)
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: (data, variables) => {
      queryClient.invalidateQueries({ queryKey: ['tasks-by-stage', variables.organizationId] });
      
      // Mostrar mensagem de sucesso com base no status
      const statusMessages: Record<string, string> = {
        'completed': t('statuses.markedAsCompleted'),
        'pending': t('statuses.markedAsPending'),
        'in_progress': t('statuses.markedAsInProgress'),
        'cancelled': t('statuses.markedAsCancelled')
      };
      
      toast.success(statusMessages[data.status] || t('success.updated'));
    },
    onError: (error) => {
      console.error('Error updating task status:', error);
      toast.error(t('error.updateStatus'));
    }
  });
} 