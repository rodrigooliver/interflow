import React, { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { Plus, Archive, ChevronDown, Settings, FolderPlus, Folder } from 'lucide-react';
import { supabase } from '../lib/supabase';
import { useAuthContext } from '../contexts/AuthContext';
import { toast } from 'react-hot-toast';
import { TaskWithRelations, TaskStage, TaskProject } from '../types/tasks';
import { useTaskStages, useTasksByStage, useDeleteTaskStage, useToggleTaskArchived, useTaskProjects, useCreateTaskProject, useUpdateTaskProject, useDeleteTaskProject, useUpdateTaskStatus } from '../hooks/useTasks';
import { TaskBoard } from '../components/tasks/TaskBoard';
import { TaskModal } from '../components/tasks/TaskModal';
import { StageDialog } from '../components/tasks/StageDialog';
import { LabelModal } from '../components/tasks/LabelModal';
import { ProjectSelector } from '../components/tasks/ProjectSelector';
import { ProjectModal } from '../components/tasks/ProjectModal';
import { ProjectMembersModal } from '../components/tasks/ProjectMembersModal';
import { useQueryClient } from '@tanstack/react-query';
import { useNavigate, useLocation, useSearchParams } from 'react-router-dom';
import { RealtimeChannel } from '@supabase/supabase-js';

interface DeleteConfirmationModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: () => Promise<void>;
  title: string;
  message: string;
}

const DeleteConfirmationModal: React.FC<DeleteConfirmationModalProps> = ({
  isOpen,
  onClose,
  onConfirm,
  title,
  message
}) => {
  const { t } = useTranslation('tasks');
  const [isDeleting, setIsDeleting] = useState(false);

  if (!isOpen) return null;

  const handleConfirm = async () => {
    setIsDeleting(true);
    try {
      await onConfirm();
    } finally {
      setIsDeleting(false);
      onClose();
    }
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white dark:bg-gray-800 rounded-lg p-6 w-full max-w-md">
        <h2 className="text-xl text-red-600 dark:text-red-400 font-semibold mb-4">{title}</h2>
        <p className="text-gray-600 dark:text-gray-300 mb-6">
          {message}
        </p>
        <div className="flex justify-end space-x-3">
          <button
            onClick={onClose}
            className="px-4 py-2 text-sm font-medium text-gray-700 dark:text-gray-300 bg-gray-100 dark:bg-gray-700 rounded-md hover:bg-gray-200 dark:hover:bg-gray-600"
            disabled={isDeleting}
          >
            {t('form.cancel')}
          </button>
          <button
            onClick={handleConfirm}
            className="px-4 py-2 text-sm font-medium text-white bg-red-600 rounded-md hover:bg-red-700"
            disabled={isDeleting}
          >
            {isDeleting ? t('form.deleting') : t('form.delete')}
          </button>
        </div>
      </div>
    </div>
  );
};

// Componente para o card de projeto
const ProjectCard: React.FC<{
  project: TaskProject;
  onSelect: (id: string) => void;
}> = ({ project, onSelect }) => {
  return (
    <div 
      className="bg-white dark:bg-gray-800 rounded-lg shadow-md p-6 cursor-pointer hover:shadow-lg transition-shadow border border-gray-200 dark:border-gray-700"
      onClick={() => onSelect(project.id)}
    >
      <div className="flex items-center gap-3 mb-3">
        <Folder className="w-6 h-6 text-blue-500 dark:text-blue-400" />
        <h3 className="text-lg font-semibold text-gray-900 dark:text-white truncate">
          {project.name}
        </h3>
      </div>
      {project.description && (
        <p className="text-gray-600 dark:text-gray-300 text-sm line-clamp-2">
          {project.description}
        </p>
      )}
    </div>
  );
};

export default function Tasks() {
  const { t } = useTranslation('tasks');
  const { currentOrganizationMember } = useAuthContext();
  const queryClient = useQueryClient();
  const organizationId = currentOrganizationMember?.organization.id;
  
  // Estados do modal
  const [showTaskModal, setShowTaskModal] = useState(false);
  const [showDeleteTaskModal, setShowDeleteTaskModal] = useState(false);
  const [showEditStageModal, setShowEditStageModal] = useState(false);
  const [showDeleteStageModal, setShowDeleteStageModal] = useState(false);
  const [showLabelModal, setShowLabelModal] = useState(false);
  const [showProjectModal, setShowProjectModal] = useState(false);
  const [showDeleteProjectModal, setShowDeleteProjectModal] = useState(false);
  const [showProjectMembersModal, setShowProjectMembersModal] = useState(false);
  
  // Estados para seleção
  const [selectedTask, setSelectedTask] = useState<TaskWithRelations | null>(null);
  const [selectedStage, setSelectedStage] = useState<TaskStage | null>(null);
  const [selectedProject, setSelectedProject] = useState<TaskProject | null>(null);
  
  // Inicializa o selectedProjectId com o valor do localStorage, se disponível
  const getLocalStorageProjectId = () => {
    if (!organizationId) return null;
    const projectKey = `selectedProjectId_${organizationId}`;
    return localStorage.getItem(projectKey);
  };
  
  const [selectedProjectId, setSelectedProjectId] = useState<string | null>(null);
  const [showArchivedTasks, setShowArchivedTasks] = useState(false);
  
  // Router hooks
  const navigate = useNavigate();
  const location = useLocation();
  const [searchParams] = useSearchParams();
  
  // Hooks de mutação
  const toggleTaskArchived = useToggleTaskArchived();
  const deleteStage = useDeleteTaskStage();
  const createProject = useCreateTaskProject();
  const updateProject = useUpdateTaskProject();
  const deleteProject = useDeleteTaskProject();
  const updateTaskStatus = useUpdateTaskStatus();
  
  // Dados do backend
  const { data: projects = [], isLoading: isProjectsLoading } = useTaskProjects(organizationId);
  const { data: stages = [], isLoading: isStagesLoading } = useTaskStages(
    organizationId, 
    selectedProjectId as string | undefined
  );
  const { data: tasks = [], isLoading: isTasksLoading } = useTasksByStage(
    organizationId,
    selectedProjectId as string | undefined,
    undefined, // Não filtrar por usuário
    showArchivedTasks // Mostrar ou não tarefas arquivadas
  );

  // Subscription para atualizações na tabela tasks
  useEffect(() => {
    let tasksSubscription: RealtimeChannel;
    let tasksDeleteSubscription: RealtimeChannel;

    if (organizationId) {
      // Subscription para eventos INSERT e UPDATE
      tasksSubscription = supabase
        .channel('tasks-changes')
        .on('postgres_changes', {
          event: 'INSERT' as const,
          schema: 'public',
          table: 'tasks',
          filter: `project_id=eq.${selectedProjectId}`
        }, () => {
          
          // Invalida o cache para forçar uma nova busca
          queryClient.invalidateQueries({ queryKey: ['tasks-by-stage'] });
          
          // Mensagem de notificação para o usuário
          toast.success(t('realtime.taskCreated'));
        })
        .on('postgres_changes', {
          event: 'UPDATE' as const,
          schema: 'public',
          table: 'tasks',
          filter: `project_id=eq.${selectedProjectId}`
        }, () => {
          
          // Invalida o cache para forçar uma nova busca
          queryClient.invalidateQueries({ queryKey: ['tasks-by-stage'] });
          
          // Mensagem de notificação para o usuário
          toast.success(t('realtime.taskUpdated'));
        })
        .subscribe();

      // Subscription separada para eventos DELETE
      tasksDeleteSubscription = supabase
        .channel('tasks-delete')
        .on('postgres_changes', {
          event: 'DELETE' as const,
          schema: 'public',
          table: 'tasks',
          // Sem filtro, porque eventos DELETE não têm project_id
        }, (payload) => {
          
          // Verifica se o ID da tarefa excluída existe na lista atual
          const deletedTaskId = payload.old?.id;
          
          if (deletedTaskId) {
            // Verifica se a tarefa excluída está na lista atual
            const taskExists = tasks.some(task => task.id === deletedTaskId);
            
            if (taskExists) {
              // Só invalida o cache se a tarefa excluída estiver na lista atual
              queryClient.invalidateQueries({ queryKey: ['tasks-by-stage'] });
              toast.success(t('realtime.taskDeleted'));
            } else {
              console.log('Tarefa excluída não pertence ao projeto atual:', deletedTaskId);
            }
          }
        })
        .subscribe();
    }

    // Cleanup das subscriptions quando o componente for desmontado
    return () => {
      if (tasksSubscription) {
        supabase.removeChannel(tasksSubscription);
      }
      if (tasksDeleteSubscription) {
        supabase.removeChannel(tasksDeleteSubscription);
      }
    };
  }, [organizationId, queryClient, t, selectedProjectId, tasks]);

  const isLoading = isProjectsLoading || isStagesLoading || isTasksLoading;

  // Inicializar o projeto a partir da URL ou localStorage
  useEffect(() => {
    if (!organizationId) return;

    // Verificar se há um projectId na URL
    const projectId = searchParams.get('projectId');
    
    if (projectId) {
      // Se há um projectId na URL, verificar se o projeto existe
      if (!isProjectsLoading && projects.some(p => p.id === projectId)) {
        // Atualizar o estado e o localStorage
        handleSelectProject(projectId);
      }
    } else {
      // Se não há projectId na URL, verificar o localStorage
      const savedProjectId = getLocalStorageProjectId();
      
      // Verificar se o projeto salvo existe na lista de projetos
      if (savedProjectId && !isProjectsLoading && projects.some(p => p.id === savedProjectId)) {
        // Atualizar o estado e a URL
        handleSelectProject(savedProjectId);
      }
    }
  }, [searchParams, projects, isProjectsLoading, organizationId]);

  // Função para atualizar o ID do projeto na URL, no state e no localStorage
  const handleSelectProject = (projectId: string | null) => {
    setSelectedProjectId(projectId);
    
    // Salvar no localStorage se tiver um ID de organização
    if (organizationId) {
      const projectKey = `selectedProjectId_${organizationId}`;
      
      if (projectId) {
        localStorage.setItem(projectKey, projectId);
        
        // Salvar o nome do projeto no sessionStorage para uso no sidebar
        const project = projects.find(p => p.id === projectId);
        if (project) {
          const projectNameKey = `projectName_${projectId}`;
          sessionStorage.setItem(projectNameKey, project.name);
        }
      } else {
        localStorage.removeItem(projectKey);
      }
    }
    
    // Atualizar a URL
    if (projectId) {
      // Criar novos parâmetros de URL com o projectId
      const newParams = new URLSearchParams(searchParams);
      newParams.set('projectId', projectId);
      
      // Atualizar a URL sem recarregar a página
      navigate(`${location.pathname}?${newParams.toString()}`, { replace: true });
    } else {
      // Remover o parâmetro projectId da URL
      const newParams = new URLSearchParams(searchParams);
      newParams.delete('projectId');
      
      // Se não houver outros parâmetros, remover o ? da URL
      const queryString = newParams.toString();
      navigate(queryString ? `${location.pathname}?${queryString}` : location.pathname, { replace: true });
    }
  };

  // Manipulação de projetos
  const handleAddProject = () => {
    setSelectedProject(null);
    setShowProjectModal(true);
  };

  const handleEditProject = (project: TaskProject) => {
    setSelectedProject(project);
    setShowProjectModal(true);
  };

  const handleDeleteProject = async () => {
    if (!selectedProject || !organizationId) return;

    try {
      deleteProject.mutate({ 
        id: selectedProject.id, 
        organizationId 
      });
      // Se o projeto excluído era o selecionado, limpar a seleção
      if (selectedProjectId === selectedProject.id) {
        handleSelectProject(null);
      }
    } catch (error) {
      console.error('Error deleting project:', error);
      toast.error(t('projects.deleteError'));
    }
  };

  const handleProjectSubmit = (name: string, description: string) => {
    if (!organizationId) return;

    if (selectedProject) {
      // Editar projeto existente
      updateProject.mutate({
        id: selectedProject.id,
        name,
        description
      });
    } else {
      // Criar novo projeto
      createProject.mutate({
        name,
        description,
        organizationId
      }, {
        onSuccess: (newProject) => {
          // Selecionar automaticamente o projeto recém-criado e atualizar a URL
          handleSelectProject(newProject.id);
          
          // Também atualizar o nome do projeto no sessionStorage
          const projectNameKey = `projectName_${newProject.id}`;
          sessionStorage.setItem(projectNameKey, newProject.name);
        }
      });
    }
  };

  // Manipulação de tarefas
  const handleAddTask = (stage: TaskStage) => {
    setSelectedTask(null);
    setSelectedStage(stage);
    setShowTaskModal(true);
  };

  const handleEditTask = (task: TaskWithRelations) => {
    setSelectedTask(task);
    setShowTaskModal(true);
  };

  const handleDeleteTask = async () => {
    if (!selectedTask) return;

    try {
      const { error } = await supabase
        .from('tasks')
        .delete()
        .eq('id', selectedTask.id);

      if (error) throw error;
      toast.success(t('success.deleted'));

      if( selectedTask.chat_id) {
        //Após excluir o task, verificar e exlcuir messages com task_id
        const { error: deleteMessagesError } = await supabase
          .from('messages')
          .delete()
          .eq('task_id', selectedTask.id)
          .eq('chat_id', selectedTask.chat_id)
          .eq('organization_id', organizationId);

        if (deleteMessagesError) {
          console.error('Error deleting messages:', deleteMessagesError);
        }
      }

      // A invalidação do cache agora é tratada pela subscription em tempo real
      // queryClient.invalidateQueries({ queryKey: ['tasks-by-stage'] });
    } catch (error) {
      console.error('Error deleting task:', error);
      toast.error(t('error.delete'));
    }
  };

  // Manipulação de estágios
  const handleEditStage = (stage: TaskStage) => {
    setSelectedStage(stage);
    setShowEditStageModal(true);
  };

  const handleDeleteStage = (stage: TaskStage) => {
    setSelectedStage(stage);
    setShowDeleteStageModal(true);
  };

  const confirmDeleteStage = async () => {
    if (!selectedStage || !organizationId) return;
    
    try {
      // Primeiro procuramos por um estágio padrão para mover as tarefas
      const defaultStage = stages.find(s => s.position === 0);
      
      if (defaultStage && defaultStage.id !== selectedStage.id) {
        // Mover tarefas para o estágio padrão
        const { error: moveError } = await supabase
          .from('tasks')
          .update({ stage_id: defaultStage.id })
          .eq('stage_id', selectedStage.id);
          
        if (moveError) throw moveError;
      }
      
      // Agora excluímos o estágio
      deleteStage.mutate({ 
        id: selectedStage.id, 
        organizationId 
      });
    } catch (error) {
      console.error('Error deleting stage:', error);
      toast.error(t('stages.deleteError'));
    }
  };

  // Manipulação de arquivamento de tarefas
  const handleToggleArchived = (task: TaskWithRelations) => {
    if (!organizationId) return;
    
    toggleTaskArchived.mutate({
      taskId: task.id,
      isArchived: !task.is_archived,
      organizationId
    });
  };

  // Função para atualizar o status de uma tarefa
  const handleUpdateTaskStatus = (taskId: string, status: 'pending' | 'in_progress' | 'completed' | 'cancelled') => {
    if (!organizationId) return;
    
    updateTaskStatus.mutate({
      taskId,
      status,
      organizationId
    });
  };

  const [isProjectMenuOpen, setIsProjectMenuOpen] = useState(false);
  const projectMenuRef = React.useRef<HTMLDivElement>(null);

  // Fechar o menu quando clicar fora dele
  React.useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (projectMenuRef.current && !projectMenuRef.current.contains(event.target as Node)) {
        setIsProjectMenuOpen(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, []);

  // Renderização da tela de seleção/criação de projeto
  if (!selectedProjectId) {
    return (
      <div className="flex flex-col h-full">
        <div className="p-4 sm:p-6">
          <h1 className="hidden sm:block text-xl sm:text-2xl font-bold text-gray-900 dark:text-white mb-4 sm:mb-6">
            {t('title')}
          </h1>
          
          <div className="flex flex-col items-center justify-center max-w-4xl mx-auto">
            <div className="text-center mb-6 sm:mb-8">
              <h2 className="text-lg sm:text-xl font-semibold text-gray-800 dark:text-gray-200 mb-2">
                {t('projects.selectOrCreate')}
              </h2>
              <p className="text-sm sm:text-base text-gray-600 dark:text-gray-400">
                {t('projects.noProjectSelected')}
              </p>
            </div>
            
            {isProjectsLoading ? (
              <div className="flex justify-center items-center py-8 sm:py-12">
                <div className="animate-spin rounded-full h-10 w-10 sm:h-12 sm:w-12 border-t-2 border-b-2 border-blue-500"></div>
              </div>
            ) : projects.length > 0 ? (
              <>
                <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3 sm:gap-4 w-full mb-6 sm:mb-8">
                  {projects.map(project => (
                    <ProjectCard 
                      key={project.id} 
                      project={project} 
                      onSelect={handleSelectProject}
                    />
                  ))}
                </div>
                
                <button
                  onClick={handleAddProject}
                  className="flex items-center px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700"
                >
                  <FolderPlus className="w-5 h-5 mr-2" />
                  {t('projects.addProject')}
                </button>
              </>
            ) : (
              <div className="text-center py-6 sm:py-8">
                <div className="bg-gray-100 dark:bg-gray-800 p-6 sm:p-8 rounded-lg mb-4 sm:mb-6 inline-flex">
                  <FolderPlus className="w-12 h-12 sm:w-16 sm:h-16 text-blue-500 dark:text-blue-400" />
                </div>
                <p className="text-sm sm:text-base text-gray-600 dark:text-gray-400 mb-4 sm:mb-6">
                  {t('projects.noProjects')}
                </p>
                <button
                  onClick={handleAddProject}
                  className="flex items-center px-4 py-2 sm:px-5 sm:py-2.5 bg-blue-600 text-white rounded-md hover:bg-blue-700 mx-auto"
                >
                  <Plus className="w-5 h-5 mr-2" />
                  {t('projects.createFirstProject')}
                </button>
              </div>
            )}
          </div>
        </div>
        
        {/* Modal de criação de projeto */}
        {showProjectModal && (
          <ProjectModal
            onClose={() => {
              setShowProjectModal(false);
              setSelectedProject(null);
            }}
            organizationId={organizationId || ''}
            project={selectedProject || undefined}
            mode={selectedProject ? 'edit' : 'create'}
            onSubmit={handleProjectSubmit}
          />
        )}
      </div>
    );
  }

  // Renderização normal quando um projeto está selecionado
  return (
    <div className="flex flex-col h-full">
      <div className="p-4 sm:p-6 pb-0">
        <div className="flex flex-col sm:flex-row sm:flex-wrap justify-between items-start sm:items-center gap-4">
          <div className="flex flex-col sm:flex-row items-start sm:items-center gap-2 sm:gap-4 w-full sm:w-auto">
            <h1 className="hidden sm:block text-xl sm:text-2xl font-bold text-gray-900 dark:text-white">
              {t('title')}
            </h1>
            
            {/* Seletor de Projetos */}
            <ProjectSelector
              projects={projects}
              selectedProjectId={selectedProjectId}
              onSelectProject={handleSelectProject}
              onAddProject={handleAddProject}
            />
          </div>
          
          <div className="flex flex-wrap items-center gap-2 sm:gap-4 w-full sm:w-auto">
            {/* Mostrar/ocultar arquivados */}
            <button
              onClick={() => setShowArchivedTasks(!showArchivedTasks)}
              className={`flex items-center px-3 py-1.5 rounded-md text-sm ${
                showArchivedTasks 
                  ? 'bg-blue-100 text-blue-700 dark:bg-blue-800/30 dark:text-blue-400' 
                  : 'bg-gray-100 text-gray-700 dark:bg-gray-700 dark:text-gray-300'
              }`}
            >
              <Archive className="w-4 h-4 mr-1" />
              <span className="hidden sm:inline">{showArchivedTasks ? t('viewActive') : t('viewArchived')}</span>
            </button>
            
            {/* Dropdown de gerenciamento do projeto atual */}
            {selectedProjectId && (
              <div className="relative group" ref={projectMenuRef}>
                <button
                  onClick={() => setIsProjectMenuOpen(!isProjectMenuOpen)}
                  className="flex items-center px-3 py-1.5 bg-gray-100 text-gray-700 dark:bg-gray-700 dark:text-gray-300 rounded-md text-sm hover:bg-gray-200 dark:hover:bg-gray-600"
                >
                  <Settings className="w-4 h-4 mr-1" />
                  <span className="hidden sm:inline">{t('projects.manageProject')}</span>
                  <ChevronDown className="w-3 h-3 ml-1" />
                </button>
                
                {isProjectMenuOpen && (
                  <div className="absolute z-10 right-0 mt-1 bg-white dark:bg-gray-800 rounded-md shadow-lg border border-gray-200 dark:border-gray-700 min-w-[200px]">
                    <div className="py-1">
                      {/* Opção: Editar Projeto */}
                      <button
                        onClick={() => {
                          setIsProjectMenuOpen(false);
                          if (selectedProjectId) {
                            const project = projects.find(p => p.id === selectedProjectId);
                            if (project) {
                              handleEditProject(project);
                            }
                          }
                        }}
                        className="flex items-center w-full px-4 py-2 text-left text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700"
                      >
                        {t('projects.editProject')}
                      </button>
                      
                      {/* Opção: Gerenciar Membros */}
                      <button
                        onClick={() => {
                          setIsProjectMenuOpen(false);
                          setShowProjectMembersModal(true);
                        }}
                        className="flex items-center w-full px-4 py-2 text-left text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700"
                      >
                        {t('projects.manageMembers')}
                      </button>
                      
                      {/* Opção: Gerenciar Etiquetas */}
                      <button
                        onClick={() => {
                          setIsProjectMenuOpen(false);
                          setShowLabelModal(true);
                        }}
                        className="flex items-center w-full px-4 py-2 text-left text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700"
                      >
                        {t('labels.manage')}
                      </button>
                      
                      {/* Separador */}
                      <div className="border-t border-gray-200 dark:border-gray-700 my-1"></div>
                      
                      {/* Opção: Excluir Projeto */}
                      <button
                        onClick={() => {
                          setIsProjectMenuOpen(false);
                          if (selectedProjectId) {
                            const project = projects.find(p => p.id === selectedProjectId);
                            if (project) {
                              setSelectedProject(project);
                              setShowDeleteProjectModal(true);
                            }
                          }
                        }}
                        className="flex items-center w-full px-4 py-2 text-left text-sm text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20"
                      >
                        {t('projects.deleteProject')}
                      </button>
                    </div>
                  </div>
                )}
              </div>
            )}
            
            {/* Botão adicionar tarefa */}
            <button
              onClick={() => {
                setSelectedTask(null);
                setShowTaskModal(true);
              }}
              className="flex items-center px-3 sm:px-4 py-1.5 sm:py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700"
            >
              <Plus className="w-5 h-5 mr-1 sm:mr-2" />
              <span className="hidden sm:inline">{t('addTask')}</span>
            </button>
          </div>
        </div>
      </div>

      {/* Quadro principal */}
      <div className="flex-1 p-0 h-full overflow-hidden">
        {isLoading ? (
          <div className="flex justify-center items-center h-64">
            <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-blue-500"></div>
          </div>
        ) : stages.length === 0 && selectedProjectId ? (
          <div className="flex flex-col items-center justify-center h-64">
            <p className="text-gray-500 dark:text-gray-400 mb-4">
              {t('stages.noStagesInProject')}
            </p>
            <button
              onClick={() => setShowEditStageModal(true)}
              className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700"
            >
              {t('stages.addStage')}
            </button>
          </div>
        ) : (
          <TaskBoard
            stages={stages}
            tasks={tasks}
            onEditStage={handleEditStage}
            onDeleteStage={handleDeleteStage}
            onAddTask={handleAddTask}
            onEditTask={handleEditTask}
            onRemoveTask={(task) => {
              setSelectedTask(task);
              setShowDeleteTaskModal(true);
            }}
            onToggleArchived={handleToggleArchived}
            onUpdateTaskStatus={handleUpdateTaskStatus}
            organizationId={organizationId || ''}
            showingArchived={showArchivedTasks}
            projectId={selectedProjectId as string | undefined}
          />
        )}
      </div>

      {/* Modais */}
      {showTaskModal && (
        <TaskModal
          onClose={() => {
            setShowTaskModal(false);
            setSelectedTask(null);
          }}
          organizationId={organizationId}
          taskId={selectedTask?.id}
          mode={selectedTask ? 'edit' : 'create'}
          initialStageId={selectedStage?.id}
          projectId={selectedProjectId as string | undefined}
        />
      )}

      {showEditStageModal && (
        <StageDialog
          onClose={() => {
            setShowEditStageModal(false);
            setSelectedStage(null);
          }}
          organizationId={organizationId || ''}
          stage={selectedStage || undefined}
          positionCount={stages.length}
          projectId={selectedProjectId as string | undefined}
        />
      )}

      {showLabelModal && (
        <LabelModal
          onClose={() => setShowLabelModal(false)}
          organizationId={organizationId || ''}
        />
      )}

      {showProjectModal && (
        <ProjectModal
          onClose={() => {
            setShowProjectModal(false);
            setSelectedProject(null);
          }}
          organizationId={organizationId || ''}
          project={selectedProject || undefined}
          mode={selectedProject ? 'edit' : 'create'}
          onSubmit={handleProjectSubmit}
        />
      )}

      <DeleteConfirmationModal
        isOpen={showDeleteTaskModal}
        onClose={() => {
          setShowDeleteTaskModal(false);
          setSelectedTask(null);
        }}
        onConfirm={handleDeleteTask}
        title={t('deleteTask')}
        message={t('form.confirmDeleteTask')}
      />
      
      <DeleteConfirmationModal
        isOpen={showDeleteStageModal}
        onClose={() => {
          setShowDeleteStageModal(false);
          setSelectedStage(null);
        }}
        onConfirm={confirmDeleteStage}
        title={t('stages.deleteStage')}
        message={t('stages.confirmDeleteStage')}
      />
      
      <DeleteConfirmationModal
        isOpen={showDeleteProjectModal}
        onClose={() => {
          setShowDeleteProjectModal(false);
          setSelectedProject(null);
        }}
        onConfirm={handleDeleteProject}
        title={t('projects.deleteProject')}
        message={t('projects.confirmDelete')}
      />

      {/* Modal de membros do projeto */}
      {showProjectMembersModal && selectedProjectId && (
        <ProjectMembersModal
          onClose={() => setShowProjectMembersModal(false)}
          projectId={selectedProjectId}
          organizationId={organizationId || ''}
        />
      )}
    </div>
  );
} 