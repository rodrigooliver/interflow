import React, { useState, useEffect, useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import { Loader2, X, Plus, CheckSquare, Tag, User, Briefcase } from 'lucide-react';
import { supabase } from '../../lib/supabase';
import { toast } from 'react-hot-toast';
import { useQueryClient } from '@tanstack/react-query';
import { format } from 'date-fns';
import { ptBR, enUS } from 'date-fns/locale';
import { useAgents } from '../../hooks/useQueryes';
import { useAuthContext } from '../../contexts/AuthContext';
import { ChecklistItem, TaskProject } from '../../types/tasks';
import { useTaskStages, useTaskLabels, useTaskProjects } from '../../hooks/useTasks';
import { v4 as uuidv4 } from 'uuid';
import CustomerSelectModal from '../customers/CustomerSelectModal';

// Interface estendida para incluir os estágios no projeto
interface TaskProjectWithStages extends TaskProject {
  stages?: {
    id: string;
    name: string;
    [key: string]: string | number | boolean | null;
  }[];
  allMembers?: {
    id: string;
    user_id: string;
    role: string;
    profile?: {
      id: string;
      full_name: string;
      avatar_url?: string;
    };
  }[];
}

interface TaskFormData {
  title: string;
  description: string;
  due_date: string;
  due_time?: string;
  priority: 'low' | 'medium' | 'high';
  status: 'pending' | 'in_progress' | 'completed' | 'cancelled';
  customer_id?: string;
  stage_id?: string;
  checklist: ChecklistItem[];
  project_id?: string;
}

interface TaskModalProps {
  onClose: () => void;
  organizationId?: string;
  taskId?: string;
  mode: 'create' | 'edit';
  initialStageId?: string; // Usado ao criar uma nova tarefa a partir de uma coluna específica
  projectId?: string; // Projeto ao qual a tarefa pertence
}

export function TaskModal({ onClose, organizationId, taskId, mode, initialStageId, projectId }: TaskModalProps) {
  const { t, i18n } = useTranslation('tasks');
  const queryClient = useQueryClient();
  const { session } = useAuthContext();
  const [isLoading, setIsLoading] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [selectedLabels, setSelectedLabels] = useState<string[]>([]);
  const [selectedAssignees, setSelectedAssignees] = useState<string[]>([]);
  const [newChecklistItem, setNewChecklistItem] = useState('');
  const [showValidationErrors, setShowValidationErrors] = useState(false);
  
  // Novo estado para cliente selecionado e modal
  const [selectedCustomer, setSelectedCustomer] = useState<{id: string; name: string; profile_picture?: string} | null>(null);
  const [isCustomerModalOpen, setIsCustomerModalOpen] = useState(false);
  
  const [formData, setFormData] = useState<TaskFormData>({
    title: '',
    description: '',
    due_date: '',
    due_time: '',
    priority: 'medium',
    status: 'pending',
    customer_id: undefined,
    stage_id: initialStageId,
    checklist: [],
    project_id: projectId
  });

  // Usar o hook useTaskStages apenas se tiver um projectId definido
  const { data: stagesFromApi = [] } = useTaskStages(
    organizationId, 
    projectId ? formData.project_id : undefined
  );
  
  const { data: labels = [] } = useTaskLabels(organizationId);
  const { data: agents = [] } = useAgents(organizationId);
  const { data: projects = [] } = useTaskProjects(organizationId) as { data: TaskProjectWithStages[] };
  
  // Obter os estágios com base no projeto selecionado
  const stages = useMemo(() => {
    // Se tem projectId definido, usa os estágios da API
    if (projectId) {
      return stagesFromApi;
    }
    
    // Se não tem projeto selecionado, retorna lista vazia
    if (!formData.project_id) {
      return [];
    }
    
    // Busca o projeto selecionado
    const selectedProject = projects.find(p => p.id === formData.project_id) as TaskProjectWithStages | undefined;
    
    // Se encontrou o projeto e ele tem estágios, retorna os estágios
    if (selectedProject?.stages && Array.isArray(selectedProject.stages)) {
      return selectedProject.stages;
    }
    
    // Caso contrário, retorna lista vazia
    return [];
  }, [projectId, formData.project_id, stagesFromApi, projects]);

  // Filtrar agentes baseado no projeto selecionado
  const filteredAgents = useMemo(() => {
    // Se não temos projeto selecionado, exibir todos os agentes
    if (!formData.project_id && !projectId) {
      return agents;
    }
    
    // Buscar o projeto selecionado
    const projectToUse = projectId || formData.project_id;
    const selectedProject = projects.find(p => p.id === projectToUse);
    
    // Se não encontrar o projeto ou não tiver membros, retornar lista vazia
    if (!selectedProject || !selectedProject.allMembers) {
      return [];
    }
    
    // Filtrar apenas os agentes que são membros do projeto
    const projectMemberIds = selectedProject.allMembers.map((member: {user_id: string}) => member.user_id);
    return agents.filter(agent => projectMemberIds.includes(agent.id));
  }, [agents, formData.project_id, projectId, projects]);

  // Funções para o modal de cliente
  const handleOpenCustomerModal = () => {
    setIsCustomerModalOpen(true);
  };
  
  const handleSelectCustomer = (customer: {id: string; name: string; profile_picture?: string}) => {
    setSelectedCustomer(customer);
    setFormData(prev => ({
      ...prev,
      customer_id: customer.id
    }));
    setIsCustomerModalOpen(false);
  };

  useEffect(() => {
    if (mode === 'edit' && taskId) {
      loadTask();
    }
  }, [mode, taskId]);

  const loadTask = async () => {
    setIsLoading(true);
    try {
      const { data, error } = await supabase
        .from('tasks')
        .select(`
          *,
          assignees:task_assignees(id, user_id),
          labels:task_task_labels(id, label_id),
          customers(id, name, profile_picture)
        `)
        .eq('id', taskId)
        .single();

      if (error) throw error;
      if (data) {
        const locale = i18n.language === 'pt' ? ptBR : enUS;
        
        // Extrair data e hora da due_date
        let formattedDate = '';
        let formattedTime = '';
        
        if (data.due_date) {
          const dueDate = new Date(data.due_date);
          formattedDate = format(dueDate, "yyyy-MM-dd", { locale });
          formattedTime = data.due_time || format(dueDate, "HH:mm", { locale });
        }
        
        // Checklist com valor padrão para evitar erros
        const checklist = Array.isArray(data.checklist) 
          ? data.checklist 
          : [];
        
        setFormData({
          title: data.title,
          description: data.description || '',
          due_date: formattedDate,
          due_time: formattedTime,
          priority: data.priority,
          status: data.status,
          customer_id: data.customer_id,
          stage_id: data.stage_id,
          checklist: checklist,
          project_id: data.project_id
        });
        
        // Carregar labels da tarefa
        if (data.labels && Array.isArray(data.labels)) {
          const labelIds = data.labels.map((label: {label_id: string}) => label.label_id);
          setSelectedLabels(labelIds);
        }
        
        // Carregar responsáveis da tarefa
        if (data.assignees && Array.isArray(data.assignees)) {
          const assigneeIds = data.assignees.map((assignee: {user_id: string}) => assignee.user_id);
          setSelectedAssignees(assigneeIds);
        }
        
        // Carregar informações do cliente
        if (data.customer_id && data.customers) {
          setSelectedCustomer({
            id: data.customer_id,
            name: data.customers.name,
            profile_picture: data.customers.profile_picture
          });
        }
      }
    } catch (error) {
      console.error('Error loading task:', error);
      toast.error(t('error.loading'));
    } finally {
      setIsLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    // Verificar se tem projeto e etapa selecionados
    if (!formData.project_id || !formData.stage_id) {
      setShowValidationErrors(true);
      
      if (!formData.project_id) {
        toast.error(t('error.noProject'));
      }
      
      if (!formData.stage_id) {
        toast.error(t('error.noStage'));
      }
      
      return;
    }
    
    setIsSubmitting(true);
    
    try {
      // Combinar data e hora
      let combinedDueDate: string | null = null;
      
      if (formData.due_date) {
        if (formData.due_time) {
          const locale = i18n.language === 'pt' ? ptBR : enUS;
          const dateObj = new Date(`${formData.due_date}T${formData.due_time}`);
          combinedDueDate = format(dateObj, "yyyy-MM-dd'T'HH:mm:ssxxx", { locale });
        } else {
          combinedDueDate = `${formData.due_date}T00:00:00+00:00`;
        }
      }
      
      // Dados da tarefa
      const taskData = {
        title: formData.title,
        description: formData.description,
        due_date: combinedDueDate,
        due_time: formData.due_time,
        priority: formData.priority,
        status: formData.status,
        customer_id: formData.customer_id || null,
        organization_id: organizationId,
        user_id: session?.user?.id,
        stage_id: formData.stage_id || null,
        checklist: formData.checklist,
        project_id: formData.project_id || null
      };
      
      let updatedTaskId = taskId; // Usar o taskId recebido como parâmetro
      
      if (mode === 'create') {
        const { data, error } = await supabase
          .from('tasks')
          .insert(taskData)
          .select();

        if (error) throw error;
        updatedTaskId = data?.[0]?.id;
        toast.success(t('success.created'));
      } else {
        const { error } = await supabase
          .from('tasks')
          .update(taskData)
          .eq('id', taskId); // Usar o taskId recebido como parâmetro

        if (error) throw error;
        toast.success(t('success.updated'));
      }
      
      // Se temos um ID de tarefa, atualizamos etiquetas e responsáveis
      if (updatedTaskId) {
        // Limpar responsáveis existentes
        await supabase
          .from('task_assignees')
          .delete()
          .eq('task_id', updatedTaskId);
        
        // Adicionar novos responsáveis
        if (selectedAssignees.length > 0) {
          const assigneesData = selectedAssignees.map(userId => ({
            task_id: updatedTaskId,
            user_id: userId
          }));
          
          await supabase
            .from('task_assignees')
            .insert(assigneesData);
        }
        
        // Limpar etiquetas existentes
        await supabase
          .from('task_task_labels')
          .delete()
          .eq('task_id', updatedTaskId);
        
        // Adicionar novas etiquetas
        if (selectedLabels.length > 0) {
          const labelsData = selectedLabels.map(labelId => ({
            task_id: updatedTaskId,
            label_id: labelId
          }));
          
          await supabase
            .from('task_task_labels')
            .insert(labelsData);
        }
      }
      
      // Invalida o cache de tasks para forçar uma nova busca
      await queryClient.invalidateQueries({ queryKey: ['tasks-by-stage'] });
      await queryClient.invalidateQueries({ queryKey: ['tasks'] });
      onClose();
    } catch (error) {
      console.error('Error submitting task:', error);
      toast.error(mode === 'create' ? t('error.create') : t('error.update'));
    } finally {
      setIsSubmitting(false);
    }
  };

  // Funções para gerenciar o checklist
  const addChecklistItem = () => {
    if (!newChecklistItem.trim()) return;
    
    const newItem: ChecklistItem = {
      id: uuidv4(),
      text: newChecklistItem,
      completed: false
    };
    
    setFormData(prev => ({
      ...prev,
      checklist: [...prev.checklist, newItem]
    }));
    
    setNewChecklistItem('');
  };
  
  const toggleChecklistItem = (id: string) => {
    setFormData(prev => ({
      ...prev,
      checklist: prev.checklist.map(item => 
        item.id === id ? { ...item, completed: !item.completed } : item
      )
    }));
  };
  
  const removeChecklistItem = (id: string) => {
    setFormData(prev => ({
      ...prev,
      checklist: prev.checklist.filter(item => item.id !== id)
    }));
  };
  
  // Funções para gerenciar etiquetas
  const toggleLabel = (labelId: string) => {
    setSelectedLabels(prev => 
      prev.includes(labelId)
        ? prev.filter(id => id !== labelId)
        : [...prev, labelId]
    );
  };
  
  // Funções para gerenciar responsáveis
  const toggleAssignee = (userId: string) => {
    setSelectedAssignees(prev => 
      prev.includes(userId)
        ? prev.filter(id => id !== userId)
        : [...prev, userId]
    );
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow-xl w-full max-w-3xl p-6 max-h-[90vh] overflow-y-auto">
        <div className="flex justify-between items-center mb-6">
          <h2 className="text-xl font-semibold text-gray-900 dark:text-white">
            {mode === 'create' ? t('addTask') : t('editTask')}
          </h2>
          <button
            onClick={onClose}
            className="text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {isLoading ? (
          <div className="flex justify-center items-center h-64">
            <Loader2 className="w-12 h-12 animate-spin text-blue-500" />
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-6">
            {showValidationErrors && (
              <div className="text-sm text-red-500 dark:text-red-400 mb-2">
                <span className="text-red-500">*</span> {t('form.requiredFields')}
              </div>
            )}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="space-y-4">
                {/* Título */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                    {t('title')}
                  </label>
                  <input
                    type="text"
                    value={formData.title}
                    onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500 dark:bg-gray-700 dark:text-white"
                    required
                  />
                </div>

                {/* Descrição */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                    {t('form.description')}
                  </label>
                  <textarea
                    value={formData.description}
                    onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500 dark:bg-gray-700 dark:text-white"
                    rows={3}
                  />
                </div>

                {/* Cliente - Novo seletor */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1 flex items-center">
                    <User className="w-4 h-4 mr-1.5" /> {t('form.customer')}
                  </label>
                  <div className="mt-1">
                    {selectedCustomer ? (
                      <div className="flex items-center w-full px-3 py-2 border border-gray-300 rounded-md dark:bg-gray-700 dark:border-gray-600 dark:text-white">
                        <div className="flex-shrink-0 w-8 h-8 bg-gray-200 rounded-full flex items-center justify-center dark:bg-gray-700">
                          {selectedCustomer.profile_picture ? (
                            <img
                              src={selectedCustomer.profile_picture}
                              alt={selectedCustomer.name}
                              className="rounded-full w-8 h-8 object-cover"
                            />
                          ) : (
                            <User className="w-4 h-4 text-gray-500 dark:text-gray-400" />
                          )}
                        </div>
                        <div className="ml-3 flex-grow">
                          <p className="text-sm font-medium">{selectedCustomer.name}</p>
                        </div>
                        <button
                          type="button"
                          className="text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-300"
                          onClick={() => {
                            setSelectedCustomer(null);
                            setFormData(prev => ({...prev, customer_id: undefined}));
                          }}
                        >
                          <X className="w-4 h-4" />
                        </button>
                      </div>
                    ) : (
                      <button
                        type="button"
                        className="flex items-center justify-center w-full px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50 dark:bg-gray-700 dark:text-gray-300 dark:border-gray-600 dark:hover:bg-gray-600"
                        onClick={handleOpenCustomerModal}
                      >
                        <User className="w-4 h-4 mr-2" />
                        {t('form.selectCustomer')}
                      </button>
                    )}
                  </div>
                </div>

                {/* Data e Hora de Vencimento */}
                <div className="space-y-2">
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                    {t('form.dueDate')}
                  </label>
                  <div className="flex gap-2">
                    <input
                      type="date"
                      name="due_date"
                      value={formData.due_date}
                      onChange={(e) => setFormData({ ...formData, due_date: e.target.value })}
                      className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500 dark:bg-gray-700 dark:text-white"
                    />
                    <input
                      type="time"
                      name="due_time"
                      value={formData.due_time}
                      onChange={(e) => setFormData({ ...formData, due_time: e.target.value })}
                      className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500 dark:bg-gray-700 dark:text-white"
                    />
                  </div>
                  <div className="flex gap-2">
                    <button
                      type="button"
                      onClick={() => {
                        const now = new Date();
                        setFormData(prev => ({
                          ...prev,
                          due_date: format(now, "yyyy-MM-dd"),
                          due_time: format(now, "HH:mm")
                        }));
                      }}
                      className="px-3 py-1 text-sm text-blue-600 dark:text-blue-400 border border-blue-600 dark:border-blue-400 rounded-md hover:bg-blue-50 dark:hover:bg-blue-900/30"
                    >
                      {t('now')}
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        const tomorrow = new Date();
                        tomorrow.setDate(tomorrow.getDate() + 1);
                        setFormData(prev => ({
                          ...prev,
                          due_date: format(tomorrow, "yyyy-MM-dd"),
                          due_time: format(tomorrow, "HH:mm")
                        }));
                      }}
                      className="px-3 py-1 text-sm text-blue-600 dark:text-blue-400 border border-blue-600 dark:border-blue-400 rounded-md hover:bg-blue-50 dark:hover:bg-blue-900/30"
                    >
                      {t('tomorrow')}
                    </button>
                  </div>
                </div>

                {/* Projeto - exibir quando não tiver um projeto específico */}
                {!projectId && (
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1 flex items-center">
                      <Briefcase className="w-4 h-4 mr-1.5" /> {t('form.project')} 
                      <span className="text-red-500 ml-1">*</span>
                    </label>
                    <select
                      value={formData.project_id || ''}
                      onChange={(e) => {
                        const newProjectId = e.target.value || undefined;
                        setFormData(prev => ({ 
                          ...prev, 
                          project_id: newProjectId,
                          // Resetar o estágio se o projeto mudar
                          stage_id: undefined 
                        }))
                      }}
                      className={`w-full px-3 py-2 border rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500 dark:bg-gray-700 dark:text-white ${
                        showValidationErrors && !formData.project_id 
                          ? 'border-red-300 dark:border-red-600' 
                          : 'border-gray-300 dark:border-gray-600'
                      }`}
                      required
                    >
                      <option value="">{t('projects.select')}</option>
                      {projects.map((project) => (
                        <option key={project.id} value={project.id}>
                          {project.name}
                        </option>
                      ))}
                      {projects.length === 0 && (
                        <option disabled value="no-projects">{t('projects.noProjects')}</option>
                      )}
                    </select>
                  </div>
                )}

                {/* Estágio */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1 flex items-center">
                    {t('stages.title')}
                    <span className="text-red-500 ml-1">*</span>
                  </label>
                  <select
                    value={formData.stage_id || ''}
                    onChange={(e) => setFormData({ ...formData, stage_id: e.target.value || undefined })}
                    className={`w-full px-3 py-2 border rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500 dark:bg-gray-700 dark:text-white ${
                      showValidationErrors && !formData.stage_id 
                        ? 'border-red-300 dark:border-red-600' 
                        : 'border-gray-300 dark:border-gray-600'
                    }`}
                    disabled={!formData.project_id && !projectId}
                    required
                  >
                    <option value="">{t('stages.select')}</option>
                    {stages.map((stage) => (
                      <option key={stage.id} value={stage.id}>
                        {stage.name}
                      </option>
                    ))}
                    {stages.length === 0 && formData.project_id && (
                      <option disabled value="no-stages">{t('stages.noStagesForProject')}</option>
                    )}
                    {!formData.project_id && !projectId && (
                      <option disabled value="no-project">{t('stages.selectProjectFirst')}</option>
                    )}
                  </select>
                </div>
              </div>

              <div className="space-y-4">
                {/* Prioridade */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                    {t('form.priority')}
                  </label>
                  <select
                    value={formData.priority}
                    onChange={(e) => setFormData({ ...formData, priority: e.target.value as TaskFormData['priority'] })}
                    className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500 dark:bg-gray-700 dark:text-white"
                  >
                    <option value="low">{t('priorities.low')}</option>
                    <option value="medium">{t('priorities.medium')}</option>
                    <option value="high">{t('priorities.high')}</option>
                  </select>
                </div>

                {/* Status */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                    {t('form.status')}
                  </label>
                  <select
                    value={formData.status}
                    onChange={(e) => setFormData({ ...formData, status: e.target.value as TaskFormData['status'] })}
                    className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500 dark:bg-gray-700 dark:text-white"
                  >
                    <option value="pending">{t('statuses.pending')}</option>
                    <option value="in_progress">{t('statuses.in_progress')}</option>
                    <option value="completed">{t('statuses.completed')}</option>
                    <option value="cancelled">{t('statuses.cancelled')}</option>
                  </select>
                </div>

                {/* Responsáveis */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1 flex items-center">
                    <User className="w-4 h-4 mr-1.5" />
                    {t('assignees.title')}
                  </label>
                  <div className="mt-2 space-y-2 max-h-32 overflow-y-auto border border-gray-300 dark:border-gray-600 rounded-md p-2">
                    {filteredAgents.map(agent => (
                      <div key={agent.id} className="flex items-center">
                        <input
                          type="checkbox"
                          id={`assignee-${agent.id}`}
                          checked={selectedAssignees.includes(agent.id)}
                          onChange={() => toggleAssignee(agent.id)}
                          className="mr-2 h-4 w-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500 dark:border-gray-600 dark:bg-gray-700"
                        />
                        <label 
                          htmlFor={`assignee-${agent.id}`}
                          className="text-sm text-gray-700 dark:text-gray-300 flex items-center"
                        >
                          {agent.profile?.avatar_url && (
                            <img 
                              src={agent.profile.avatar_url} 
                              alt="" 
                              className="w-5 h-5 rounded-full mr-2" 
                            />
                          )}
                          {agent.profile?.full_name || agent.id}
                        </label>
                      </div>
                    ))}
                    {filteredAgents.length === 0 && (
                      <p className="text-sm text-gray-500 dark:text-gray-400 italic">
                        {formData.project_id || projectId 
                          ? t('assignees.noProjectMembers') 
                          : t('assignees.noAgents')}
                      </p>
                    )}
                  </div>
                </div>

                {/* Etiquetas */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1 flex items-center">
                    <Tag className="w-4 h-4 mr-1.5" />
                    {t('labels.title')}
                  </label>
                  <div className="mt-2 flex flex-wrap gap-2 max-h-32 overflow-y-auto border border-gray-300 dark:border-gray-600 rounded-md p-2">
                    {labels.map(label => (
                      <div 
                        key={label.id}
                        onClick={() => toggleLabel(label.id)}
                        className={`px-2 py-1 rounded-full text-xs cursor-pointer transition-colors ${
                          selectedLabels.includes(label.id) 
                            ? 'opacity-100' 
                            : 'opacity-50 hover:opacity-80'
                        }`}
                        style={{ 
                          backgroundColor: `${label.color}20`, // 20% opacity
                          color: label.color,
                          border: `1px solid ${label.color}`
                        }}
                      >
                        {label.name}
                      </div>
                    ))}
                    {labels.length === 0 && (
                      <p className="text-sm text-gray-500 dark:text-gray-400 italic">
                        {t('labels.noLabels')}
                      </p>
                    )}
                  </div>
                </div>

                {/* Checklist */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1 flex items-center">
                    <CheckSquare className="w-4 h-4 mr-1.5" />
                    {t('checklist.title')}
                  </label>
                  <div className="flex items-center space-x-2 mb-2">
                    <input
                      type="text"
                      value={newChecklistItem}
                      onChange={(e) => setNewChecklistItem(e.target.value)}
                      placeholder={t('checklist.addItem')}
                      className="flex-1 px-3 py-1.5 text-sm border border-gray-300 dark:border-gray-600 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500 dark:bg-gray-700 dark:text-white"
                      onKeyDown={(e) => {
                        if (e.key === 'Enter') {
                          e.preventDefault();
                          addChecklistItem();
                        }
                      }}
                    />
                    <button
                      type="button"
                      onClick={addChecklistItem}
                      className="p-1.5 text-white bg-blue-600 rounded-md hover:bg-blue-700"
                    >
                      <Plus className="w-4 h-4" />
                    </button>
                  </div>
                  <div className="space-y-2 max-h-32 overflow-y-auto">
                    {formData.checklist.map((item) => (
                      <div key={item.id} className="flex items-center group">
                        <input
                          type="checkbox"
                          checked={item.completed}
                          onChange={() => toggleChecklistItem(item.id)}
                          className="mr-2 h-4 w-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500 dark:border-gray-600 dark:bg-gray-700"
                        />
                        <span className={`flex-1 text-sm ${
                          item.completed 
                            ? 'line-through text-gray-400 dark:text-gray-500' 
                            : 'text-gray-700 dark:text-gray-300'
                        }`}>
                          {item.text}
                        </span>
                        <button
                          type="button"
                          onClick={() => removeChecklistItem(item.id)}
                          className="p-1 text-gray-400 hover:text-red-500 dark:text-gray-500 dark:hover:text-red-400 opacity-0 group-hover:opacity-100 transition-opacity"
                        >
                          <X className="w-4 h-4" />
                        </button>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </div>

            <div className="flex justify-end space-x-3 mt-6">
              <button
                type="button"
                onClick={onClose}
                disabled={isSubmitting}
                className="px-4 py-2 text-sm font-medium text-gray-700 dark:text-gray-300 bg-gray-100 dark:bg-gray-700 rounded-md hover:bg-gray-200 dark:hover:bg-gray-600 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {t('form.cancel')}
              </button>
              <button
                type="submit"
                disabled={isSubmitting}
                className="px-4 py-2 text-sm font-medium text-white bg-blue-600 rounded-md hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed flex items-center"
              >
                {isSubmitting ? (
                  <>
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    {t('form.saving')}
                  </>
                ) : (
                  t('form.submit')
                )}
              </button>
            </div>
          </form>
        )}
      </div>
      
      {/* Modal de seleção de cliente */}
      <CustomerSelectModal
        isOpen={isCustomerModalOpen}
        onClose={() => setIsCustomerModalOpen(false)}
        onSelectCustomer={handleSelectCustomer}
      />
    </div>
  );
} 