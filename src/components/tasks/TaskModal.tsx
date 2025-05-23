import React, { useState, useEffect, useMemo, useRef, lazy, Suspense } from 'react';
import { useTranslation } from 'react-i18next';
import { Loader2, X, Plus, CheckSquare, Tag, User, Briefcase, Search, Check, RefreshCw, MessageSquare } from 'lucide-react';
import { supabase } from '../../lib/supabase';
import { toast } from 'react-hot-toast';
import { useQueryClient } from '@tanstack/react-query';
import { format, addBusinessDays } from 'date-fns';
import { ptBR, enUS } from 'date-fns/locale';
import { useAgents } from '../../hooks/useQueryes';
import { useAuthContext } from '../../contexts/AuthContext';
import { ChecklistItem, TaskProject } from '../../types/tasks';
import { useTaskLabels, useTaskProjects } from '../../hooks/useTasks';
import { v4 as uuidv4 } from 'uuid';
import api from '../../lib/api';
import { useNavigate } from 'react-router-dom';

// Lazy load de CustomerSelectModal para não carregá-lo até que seja necessário
const CustomerSelectModal = lazy(() => import('../customers/CustomerSelectModal'));

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
  chat_id?: string | null;
}

interface TaskModalProps {
  onClose: () => void;
  organizationId?: string;
  taskId?: string;
  mode: 'create' | 'edit';
  initialStageId?: string; // Usado ao criar uma nova tarefa a partir de uma coluna específica
  projectId?: string; // Projeto ao qual a tarefa pertence
  chatId?: string | null; // Chat ao qual a tarefa está relacionada
  initialCustomerId?: string; // Cliente pré-selecionado ao criar uma tarefa
}

export function TaskModal({ onClose, organizationId, taskId, mode, initialStageId, projectId, chatId, initialCustomerId }: TaskModalProps) {
  const { t, i18n } = useTranslation('tasks');
  const queryClient = useQueryClient();
  const { session, currentOrganizationMember } = useAuthContext();
  const [isLoading, setIsLoading] = useState(mode === 'edit' || (mode === 'create' && chatId !== undefined));
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [selectedLabels, setSelectedLabels] = useState<string[]>([]);
  const [selectedAssignees, setSelectedAssignees] = useState<string[]>([]);
  const [newChecklistItem, setNewChecklistItem] = useState('');
  const [showValidationErrors, setShowValidationErrors] = useState(false);
  const [showLabelDropdown, setShowLabelDropdown] = useState(false);
  const [showAssigneesDropdown, setShowAssigneesDropdown] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [isGeneratingSummary, setIsGeneratingSummary] = useState(false);
  const navigate = useNavigate();
  
  // Refs para detectar cliques fora dos dropdowns
  const labelsDropdownRef = useRef<HTMLDivElement>(null);
  const assigneesDropdownRef = useRef<HTMLDivElement>(null);
  // Ref para controlar se loadChatInfo já foi chamado para este chatId
  const chatInfoLoadedRef = useRef<string | null>(null);
  
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
    customer_id: initialCustomerId,
    stage_id: initialStageId,
    checklist: [],
    project_id: projectId,
    chat_id: chatId
  });

  const { data: labels = [] } = useTaskLabels(organizationId);
  const { data: agents = [] } = useAgents(organizationId);
  const { data: projects = [] } = useTaskProjects(organizationId) as { 
    data: TaskProjectWithStages[]
  };
  
  // Obter os estágios com base no projeto selecionado
  const stages = useMemo(() => {
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
  }, [formData.project_id, projects]);

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

  // Efeito para selecionar automaticamente o primeiro projeto e etapa
  useEffect(() => {
    if (mode === 'create' && !taskId && !formData.project_id && projects.length > 0) {
      // Verificar se existe um projeto padrão no localStorage
      if (organizationId) {
        const projectKey = `selectedProjectId_${organizationId}`;
        const defaultProjectId = localStorage.getItem(projectKey);
        
        // Se existe um projeto padrão e ele está disponível na lista
        if (defaultProjectId && projects.some(p => p.id === defaultProjectId)) {
          // Selecionar o projeto padrão
          const defaultProject = projects.find(p => p.id === defaultProjectId);
          
          if (defaultProject) {
            // Atualizar o projeto
            setFormData(prev => ({ 
              ...prev, 
              project_id: defaultProject.id 
            }));
            
            // Selecionar primeira etapa do projeto padrão se disponível
            if (defaultProject.stages && defaultProject.stages.length > 0) {
              const firstStage = defaultProject.stages[0];
              
              if (firstStage) {
                setFormData(prev => ({ 
                  ...prev, 
                  stage_id: firstStage.id 
                }));
              }
            }
            return;
          }
        }
      }
      
      // Se não existe projeto padrão, selecionar o primeiro da lista
      const firstProject = projects[0];
      
      if (firstProject) {
        // Atualizar o projeto
        setFormData(prev => ({ 
          ...prev, 
          project_id: firstProject.id 
        }));
        
        // Selecionar primeira etapa se disponível
        if (firstProject.stages && firstProject.stages.length > 0) {
          const firstStage = firstProject.stages[0];
          
          if (firstStage) {
            setFormData(prev => ({ 
              ...prev, 
              stage_id: firstStage.id 
            }));
          }
        }
      }
    }
  }, [mode, taskId, formData.project_id, projects, organizationId]);

  // Efeito para carregar tarefa ou informações do chat
  useEffect(() => {
    if (mode === 'edit' && taskId) {
      loadTask();
    } else if (mode === 'create' && chatId && chatInfoLoadedRef.current !== chatId) {
      chatInfoLoadedRef.current = chatId;
      loadChatInfo();
    } else if (mode === 'create' && !chatId) {
      // Se não é um edit nem tem chatId, não precisa de carregamento
      setIsLoading(false);
    }
  }, [mode, taskId, chatId]);

  // Efeito para selecionar automaticamente o usuário atual como responsável
  useEffect(() => {
    if (mode === 'create' && !taskId && selectedAssignees.length === 0 && session?.user?.id) {
      setSelectedAssignees([session.user.id]);
    }
  }, [mode, taskId, selectedAssignees.length, session?.user?.id]);

  // Efeito para fechar os dropdowns quando clicar fora deles
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (labelsDropdownRef.current && !labelsDropdownRef.current.contains(event.target as Node)) {
        setShowLabelDropdown(false);
      }
      if (assigneesDropdownRef.current && !assigneesDropdownRef.current.contains(event.target as Node)) {
        setShowAssigneesDropdown(false);
      }
    }
    
    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, []);

  // Filtrar agentes que correspondem ao termo de pesquisa
  const filteredAndSearchedAgents = useMemo(() => {
    if (!searchTerm.trim()) {
      return filteredAgents;
    }
    
    const normalizedSearchTerm = searchTerm.toLowerCase().trim();
    return filteredAgents.filter(agent => {
      const agentName = agent.profile?.full_name || agent.id;
      return agentName.toLowerCase().includes(normalizedSearchTerm);
    });
  }, [filteredAgents, searchTerm]);

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

  // Carregar o cliente se o initialCustomerId for fornecido
  useEffect(() => {
    if (mode === 'create' && initialCustomerId && !selectedCustomer) {
      // Buscar informações do cliente
      const fetchCustomer = async () => {
        try {
          const { data, error } = await supabase
            .from('customers')
            .select('id, name, profile_picture')
            .eq('id', initialCustomerId)
            .single();
          
          if (error) throw error;
          
          if (data) {
            setSelectedCustomer({
              id: data.id,
              name: data.name,
              profile_picture: data.profile_picture
            });
          }
        } catch (error) {
          console.error('Erro ao buscar cliente:', error);
        }
      };
      
      fetchCustomer();
    }
  }, [mode, initialCustomerId, selectedCustomer]);

  const loadTask = async () => {
    setIsLoading(true);
    try {
      const { data, error } = await supabase
        .from('tasks')
        .select(`
          *,
          assignees:task_assignees(id, user_id),
          labels:task_task_labels(id, label_id),
          customers!tasks_customer_id_fkey(id, name, profile_picture)
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
          project_id: data.project_id,
          chat_id: data.chat_id
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

  // Nova função para gerar conteúdo da tarefa usando IA
  const generateTaskContent = async () => {
    if (!currentOrganizationMember || !chatId) return null;
    
    setIsGeneratingSummary(true);
    
    try {
      const response = await api.post(
        `/api/${currentOrganizationMember.organization.id}/chat/${chatId}/generate-task-content`,
        { language: i18n.language }
      );

      if (!response.data.success) {
        throw new Error(response.data.error || t('error.generateTaskContent'));
      }

      return response.data.data;
    } catch (err) {
      console.error('Erro ao gerar conteúdo da tarefa:', err);
      toast.error(t('error.generateTaskContent', 'Erro ao gerar conteúdo da tarefa'));
      return null;
    } finally {
      setIsGeneratingSummary(false);
    }
  };

  // Nova função para carregar informações do chat
  const loadChatInfo = async () => {
    try {
      if (!chatId || !currentOrganizationMember) return;
      
      setIsLoading(true);
      
      // Fazemos apenas uma consulta com relacionamento para obter o customer em uma única operação
      const { data: chatData } = await supabase
        .from('chats')
        .select(`
          customer_id,
          customers:customer_id (
            id,
            name,
            profile_picture
          )
        `)
        .eq('id', chatId)
        .single();
      
      // Se o chat tem um cliente associado, usamos as informações já obtidas
      if (chatData?.customers) {
        // TypeScript "hack" para garantir que possamos acessar os campos necessários com segurança
        const customerObj = chatData.customers as unknown;
        let customerId = '';
        let customerName = '';
        let profilePicture: string | undefined;
        
        // Verificar se é um array ou objeto e extrair os dados corretamente
        if (Array.isArray(customerObj) && customerObj.length > 0) {
          customerId = customerObj[0].id;
          customerName = customerObj[0].name;
          profilePicture = customerObj[0].profile_picture;
        } else {
          // Tratar como objeto
          const customerData = customerObj as { id: string; name: string; profile_picture?: string };
          customerId = customerData.id;
          customerName = customerData.name;
          profilePicture = customerData.profile_picture;
        }
        
        // Definir o cliente selecionado
        setSelectedCustomer({
          id: customerId,
          name: customerName,
          profile_picture: profilePicture
        });
        
        setFormData(prev => ({
          ...prev,
          customer_id: customerId
        }));
      }
      
      // Tentar gerar conteúdo de tarefa com IA
      const generatedContent = await generateTaskContent();
      
      if (generatedContent) {
        // Converter data sugerida para o formato adequado
        let dueDate = '';
        let dueTime = '';
        
        // Quando recebemos a data sugerida do backend
        if (generatedContent.due_date) {
          try {
            // Validar se a data está no formato YYYY-MM-DD
            const dateRegex = /^\d{4}-\d{2}-\d{2}$/;
            
            if (dateRegex.test(generatedContent.due_date)) {
              const suggestedDate = new Date(generatedContent.due_date + 'T12:00:00');
              
              // Verificar se a data é válida
              if (!isNaN(suggestedDate.getTime())) {
                // Formatar para YYYY-MM-DD (garantindo formato correto)
                dueDate = format(suggestedDate, 'yyyy-MM-dd');
                dueTime = '12:00'; // Meio-dia por padrão
              } else {
                // Se a data for inválida, usar a data atual + 3 dias úteis
                const fallbackDate = addBusinessDays(new Date(), 3);
                dueDate = format(fallbackDate, 'yyyy-MM-dd');
                dueTime = '12:00';
                
                // Adicionar aviso na descrição
                if (generatedContent.description) {
                  generatedContent.description += `\n\n**${t('dueDate.fallback', 'Nota')}:** ${t(
                    'dueDate.fallbackMessage',
                    'A data sugerida era inválida. Uma data padrão foi definida no lugar.'
                  )}`;
                }
              }
            } else {
              // Se não estiver no formato correto, usar data padrão
              const fallbackDate = addBusinessDays(new Date(), 3);
              dueDate = format(fallbackDate, 'yyyy-MM-dd');
              dueTime = '12:00';
            }
          } catch (error) {
            console.error('Erro ao processar data sugerida:', error);
            // Em caso de erro, não definir data
          }
        }
        
        // Criar itens de checklist a partir das subtarefas sugeridas
        const checklist = generatedContent.subtasks && Array.isArray(generatedContent.subtasks)
          ? generatedContent.subtasks.map((text: string) => ({
              id: uuidv4(),
              text,
              completed: false
            }))
          : [];
          
        // Adicionar a justificativa da data à descrição, se existir
        let fullDescription = generatedContent.description || '';

        // Adicionar justificativa da data de vencimento, se existir
        if (generatedContent.due_date_reason) {
          fullDescription += `\n\n**${t('dueDate.reason', 'Justificativa da data sugerida')}:** ${generatedContent.due_date_reason}`;
        }

        // Adicionar justificativa da prioridade, se existir
        if (generatedContent.priority_reason) {
          fullDescription += `\n\n**${t('priority.reason', 'Justificativa da prioridade sugerida')}:** ${generatedContent.priority_reason}`;
        }
        
        // Aplicar os dados gerados ao formulário
        setFormData(prev => ({
          ...prev,
          title: generatedContent.title,
          description: fullDescription,
          due_date: dueDate,
          due_time: dueTime,
          // Mapear a prioridade sugerida para o formato esperado pelo formulário
          priority: generatedContent.priority === 'high' ? 'high' : 
                    generatedContent.priority === 'low' ? 'low' : 'medium',
          checklist: checklist
        }));
      } else {
        // Fallback se a IA falhar - criar uma descrição simplificada
        const customerName = selectedCustomer?.name || '';
        const ticketInfo = `#${chatId.substring(0, 8)}`;
        
        const title = customerName 
          ? t('taskForCustomer', 'Tarefa para {{customerName}}', { customerName }) 
          : t('taskForChat', 'Tarefa para chat {{ticketInfo}}', { ticketInfo });
        
        let description = t('taskFromChat', 'Tarefa criada a partir do chat {{ticketInfo}}', { ticketInfo });
        
        if (customerName) {
          description += `\n\n**${t('customer', 'Cliente')}:** ${customerName}`;
        }
        
        setFormData(prev => ({
          ...prev,
          title,
          description
        }));
      }
    } catch (error) {
      console.error('Erro ao carregar informações do chat:', error);
      toast.error(t('error.loadChatInfo', 'Erro ao carregar informações do chat'));
    } finally {
      setIsLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    // Verificar se tem título, projeto e etapa selecionados
    if (!formData.title.trim() || !formData.project_id || !formData.stage_id) {
      setShowValidationErrors(true);
      
      if (!formData.title.trim()) {
        toast.error(t('error.noTitle', 'Título da tarefa é obrigatório'));
      }
      
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
        project_id: formData.project_id || null,
        chat_id: formData.chat_id
      };

      if(chatId){
        taskData.chat_id = chatId; // Adicionar o ID do chat se disponível
      }
      
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
        
        // Adicionar mensagem do sistema no chat apenas quando estiver criando uma nova tarefa
        if (chatId && session?.user?.id && mode === 'create') {
          await supabase
            .from('messages')
            .insert({
              chat_id: chatId,
              type: 'task',
              sender_type: 'system',
              sender_agent_id: session.user.id,
              organization_id: organizationId,
              task_id: updatedTaskId,
              created_at: new Date().toISOString(),
              metadata: {
                task_id: updatedTaskId,
                task_title: formData.title,
                task_status: formData.status,
                task_priority: formData.priority
              }
            });

          //Atualizar last_task em customer
          await supabase
            .from('customers')
            .update({ last_task: updatedTaskId })
            .eq('id', selectedCustomer?.id);
        }
      }
      
      // Salvar o projeto atual como padrão no localStorage
      if (organizationId && formData.project_id) {
        const projectKey = `selectedProjectId_${organizationId}`;
        localStorage.setItem(projectKey, formData.project_id);
        
        // Salvar o nome do projeto no sessionStorage
        const project = projects.find(p => p.id === formData.project_id);
        if (project) {
          const projectNameKey = `projectName_${formData.project_id}`;
          sessionStorage.setItem(projectNameKey, project.name);
        }
      }
      
      // Invalida o cache de tasks para forçar uma nova busca
      await queryClient.invalidateQueries({ queryKey: ['tasks-by-stage'] });
      await queryClient.invalidateQueries({ queryKey: ['tasks'] });
      await queryClient.invalidateQueries({ queryKey: ['enhanced-tasks'] });
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

  // Função para alternar a seleção de um responsável
  const toggleAssignee = (userId: string) => {
    setSelectedAssignees(prev => 
      prev.includes(userId)
        ? prev.filter(id => id !== userId)
        : [...prev, userId]
    );
  };

  // Função para regenerar o conteúdo da tarefa com IA
  const handleRegenerateContent = async () => {
    if (!chatId || !currentOrganizationMember) {
      toast.error(t('error.regenerateContent', 'Não é possível regenerar conteúdo para esta tarefa'));
      return;
    }

    setIsGeneratingSummary(true);
    
    try {
      // Buscar dados atuais do chat para garantir que temos o customer_id
      const { data: chatData } = await supabase
        .from('chats')
        .select('id, customer_id')
        .eq('id', chatId)
        .single();
      
      if (chatData?.customer_id) {
        setFormData(prev => ({
          ...prev,
          customer_id: chatData.customer_id
        }));
      }
      
      // Gerar novo conteúdo
      const generatedContent = await generateTaskContent();
      
      if (generatedContent) {
        // Processamento similar ao da função loadChatInfo
        let dueDate = '';
        let dueTime = '';
        
        // Processar a data sugerida
        if (generatedContent.due_date) {
          try {
            const dateRegex = /^\d{4}-\d{2}-\d{2}$/;
            
            if (dateRegex.test(generatedContent.due_date)) {
              const suggestedDate = new Date(generatedContent.due_date + 'T12:00:00');
              
              if (!isNaN(suggestedDate.getTime())) {
                dueDate = format(suggestedDate, 'yyyy-MM-dd');
                dueTime = '12:00';
              } else {
                const fallbackDate = addBusinessDays(new Date(), 3);
                dueDate = format(fallbackDate, 'yyyy-MM-dd');
                dueTime = '12:00';
              }
            } else {
              const fallbackDate = addBusinessDays(new Date(), 3);
              dueDate = format(fallbackDate, 'yyyy-MM-dd');
              dueTime = '12:00';
            }
          } catch (error) {
            console.error('Erro ao processar data sugerida:', error);
          }
        }
        
        // Criar itens de checklist
        const checklist = generatedContent.subtasks && Array.isArray(generatedContent.subtasks)
          ? generatedContent.subtasks.map((text: string) => ({
              id: uuidv4(),
              text,
              completed: false
            }))
          : [];
        
        // Preparar a descrição completa
        let fullDescription = generatedContent.description || '';
        
        if (generatedContent.due_date_reason) {
          fullDescription += `\n\n**${t('dueDate.reason', 'Justificativa da data sugerida')}:** ${generatedContent.due_date_reason}`;
        }
        
        if (generatedContent.priority_reason) {
          fullDescription += `\n\n**${t('priority.reason', 'Justificativa da prioridade sugerida')}:** ${generatedContent.priority_reason}`;
        }
        
        // Atualizar o formulário com o novo conteúdo gerado
        setFormData(prev => ({
          ...prev,
          title: generatedContent.title,
          description: fullDescription,
          due_date: dueDate,
          due_time: dueTime,
          priority: generatedContent.priority === 'high' ? 'high' : 
                    generatedContent.priority === 'low' ? 'low' : 'medium',
          checklist: checklist
        }));
        
        toast.success(t('success.regenerateContent', 'Conteúdo regenerado com sucesso'));
      } else {
        toast.error(t('error.generateContent', 'Não foi possível gerar novo conteúdo'));
      }
    } catch (error) {
      console.error('Erro ao regenerar conteúdo:', error);
      toast.error(t('error.regenerateContent', 'Erro ao regenerar conteúdo'));
    } finally {
      setIsGeneratingSummary(false);
    }
  };

  // Adicionar função para navegar para a página do chat
  const navigateToChatPage = () => {
    if (formData.chat_id) {
      navigate(`/app/chats/${formData.chat_id}`);
    } else if (chatId) {
      navigate(`/app/chats/${chatId}`);
    }
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow-xl w-full max-w-3xl max-h-[90vh] overflow-y-auto">
        {/* Cabeçalho fixo */}
        <div className="sticky top-0 bg-white dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700 p-3 z-10">
          <div className="flex justify-between items-center gap-4">
            <div className="flex-1">
              <div className="flex items-center gap-3">
                <div className="w-full">
                  <div className="flex items-center gap-1">
                    <input
                      type="text"
                      value={formData.title}
                      onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                      placeholder={mode === 'create' ? t('form.titlePlaceholderCreate', 'Escreva aqui o título...') : t('form.titlePlaceholderEdit', 'Título da tarefa...')}
                      className={`w-full text-lg font-medium bg-transparent border rounded-md px-2 py-1 focus:ring-2 focus:ring-blue-500 text-gray-900 dark:text-white placeholder-gray-400 dark:placeholder-gray-500 transition-all ${
                        showValidationErrors && !formData.title.trim() 
                          ? 'border-red-300 dark:border-red-600 focus:border-red-500 focus:ring-red-500' 
                          : 'border-transparent hover:border-gray-300 dark:hover:border-gray-600 focus:border-transparent'
                      }`}
                      required
                    />
                    <span className="text-red-500">*</span>
                  </div>
                  {showValidationErrors && !formData.title.trim() && (
                    <p className="text-xs text-red-500 mt-1">{t('error.noTitle', 'Título da tarefa é obrigatório')}</p>
                  )}
                </div>
                <button
                  onClick={onClose}
                  className="text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200 p-1.5 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-md transition-colors"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>
              {chatId && (
                <div className="flex items-center">
                   {isGeneratingSummary ? (
                      <div className="px-2">
                        <span className="text-sm font-normal text-blue-600 dark:text-blue-400 inline-flex items-center bg-blue-50 dark:bg-blue-900/20 px-2 py-1 rounded">
                          <Loader2 className="inline h-3 w-3 mr-1 animate-spin" />
                          {t('generatingContent', 'Gerando conteúdo com IA...')}
                        </span>
                      </div>
                    ) : mode === 'create' && (
                      <button
                        type="button"
                        onClick={handleRegenerateContent}
                        disabled={isGeneratingSummary}
                        className="ml-2 text-xs text-blue-600 dark:text-blue-400 hover:text-blue-700 dark:hover:text-blue-300 disabled:opacity-50 disabled:cursor-not-allowed flex items-center"
                        title={t('regenerateContent', 'Regenerar conteúdo com IA')}
                      >
                        <RefreshCw className="h-3.5 w-3.5 mr-1" />
                        {t('regenerate', 'Regenerar')}
                      </button>
                    )}
                </div>
              )}
            </div>
          </div>
         
        </div>

        {isLoading ? (
          <div className="flex justify-center items-center h-64">
            <Loader2 className="w-12 h-12 animate-spin text-blue-500" />
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="p-6 pt-2 space-y-6">
            {showValidationErrors && (
              <div className="text-sm text-red-500 dark:text-red-400 mb-2">
                <span className="text-red-500">*</span> {t('form.requiredFields')}
              </div>
            )}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="space-y-4">

                {/* Descrição */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                    {t('form.description')}
                  </label>
                  <textarea
                    value={formData.description}
                    onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500 dark:bg-gray-700 dark:text-white"
                    rows={10}
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
                <div className="bg-gray-50 dark:bg-gray-800/50 rounded-lg ">
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-3">
                    {t('form.dueDate')}
                  </label>
                  <div className="space-y-3">
                    {/* Campos de data e hora */}
                    <div className="grid grid-cols-2 gap-3">
                      <div className="relative">
                        <input
                          type="date"
                          name="due_date"
                          value={formData.due_date}
                          onChange={(e) => setFormData({ ...formData, due_date: e.target.value })}
                          className="w-full pl-10 pr-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500 dark:bg-gray-700 dark:text-white"
                        />
                        <svg className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                        </svg>
                      </div>
                      <div className="relative">
                        <input
                          type="time"
                          name="due_time"
                          value={formData.due_time}
                          onChange={(e) => setFormData({ ...formData, due_time: e.target.value })}
                          className="w-full pl-10 pr-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500 dark:bg-gray-700 dark:text-white"
                        />
                        <svg className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                        </svg>
                      </div>
                    </div>

                    {/* Botões de atalho */}
                    <div className="flex flex-wrap gap-2">
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
                        className="inline-flex items-center px-3 py-1.5 text-sm text-blue-600 dark:text-blue-400 bg-blue-50 dark:bg-blue-900/30 rounded-md hover:bg-blue-100 dark:hover:bg-blue-900/50 transition-colors"
                      >
                        {t('now')}
                      </button>
                      <button
                        type="button"
                        onClick={() => {
                          const tomorrow = addBusinessDays(new Date(), 1);
                          setFormData(prev => ({
                            ...prev,
                            due_date: format(tomorrow, "yyyy-MM-dd"),
                            due_time: "09:00"
                          }));
                        }}
                        className="inline-flex items-center px-3 py-1.5 text-sm text-blue-600 dark:text-blue-400 bg-blue-50 dark:bg-blue-900/30 rounded-md hover:bg-blue-100 dark:hover:bg-blue-900/50 transition-colors"
                      >
                        {t('tomorrow')}
                      </button>
                      <button
                        type="button"
                        onClick={() => {
                          const nextWeek = addBusinessDays(new Date(), 5);
                          setFormData(prev => ({
                            ...prev,
                            due_date: format(nextWeek, "yyyy-MM-dd"),
                            due_time: "09:00"
                          }));
                        }}
                        className="inline-flex items-center px-3 py-1.5 text-sm text-blue-600 dark:text-blue-400 bg-blue-50 dark:bg-blue-900/30 rounded-md hover:bg-blue-100 dark:hover:bg-blue-900/50 transition-colors"
                      >
                        {t('nextWeek', 'Próxima semana')}
                      </button>
                    </div>
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
                        
                        // Buscar o projeto selecionado para obter suas etapas
                        const selectedProject = projects.find(p => p.id === newProjectId) as TaskProjectWithStages | undefined;
                        
                        // Verificar se o projeto tem etapas e selecionar a primeira
                        let firstStageId: string | undefined = undefined;
                        
                        if (selectedProject?.stages && selectedProject.stages.length > 0) {
                          firstStageId = selectedProject.stages[0].id;
                        }
                        
                        // Atualizar o formulário com o novo projeto e a primeira etapa
                        setFormData(prev => ({ 
                          ...prev, 
                          project_id: newProjectId,
                          stage_id: firstStageId // Selecionar a primeira etapa automaticamente
                        }));
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
                {/* Prioridade e Status */}
                <div className="space-y-4">
                  {/* Prioridade */}
                  <div className="bg-gray-50 dark:bg-gray-800/50 rounded-lg">
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-3">
                      {t('form.priority')}
                    </label>
                    <div className="grid grid-cols-3 gap-2">
                      <button
                        type="button"
                        onClick={() => setFormData({ ...formData, priority: 'low' })}
                        className={`flex items-center justify-center px-3 py-2 rounded-md text-sm font-medium transition-colors ${
                          formData.priority === 'low'
                            ? 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400'
                            : 'bg-white text-gray-700 hover:bg-gray-50 dark:bg-gray-700 dark:text-gray-300 dark:hover:bg-gray-600'
                        }`}
                      >
                        {t('priorities.low')}
                      </button>
                      <button
                        type="button"
                        onClick={() => setFormData({ ...formData, priority: 'medium' })}
                        className={`flex items-center justify-center px-3 py-2 rounded-md text-sm font-medium transition-colors ${
                          formData.priority === 'medium'
                            ? 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-400'
                            : 'bg-white text-gray-700 hover:bg-gray-50 dark:bg-gray-700 dark:text-gray-300 dark:hover:bg-gray-600'
                        }`}
                      >
                        {t('priorities.medium')}
                      </button>
                      <button
                        type="button"
                        onClick={() => setFormData({ ...formData, priority: 'high' })}
                        className={`flex items-center justify-center px-3 py-2 rounded-md text-sm font-medium transition-colors ${
                          formData.priority === 'high'
                            ? 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400'
                            : 'bg-white text-gray-700 hover:bg-gray-50 dark:bg-gray-700 dark:text-gray-300 dark:hover:bg-gray-600'
                        }`}
                      >
                        {t('priorities.high')}
                      </button>
                    </div>
                  </div>

                  {/* Status */}
                  <div className="bg-gray-50 dark:bg-gray-800/50 rounded-lg">
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-3">
                      {t('form.status')}
                    </label>
                    <div className="grid grid-cols-2 gap-2">
                      <button
                        type="button"
                        onClick={() => setFormData({ ...formData, status: 'pending' })}
                        className={`flex items-center justify-center px-3 py-2 rounded-md text-sm font-medium transition-colors ${
                          formData.status === 'pending'
                            ? 'bg-orange-100 text-orange-800 dark:bg-orange-900/30 dark:text-orange-400'
                            : 'bg-white text-gray-700 hover:bg-gray-50 dark:bg-gray-700 dark:text-gray-300 dark:hover:bg-gray-600'
                        }`}
                      >
                        {t('statuses.pending')}
                      </button>
                      <button
                        type="button"
                        onClick={() => setFormData({ ...formData, status: 'in_progress' })}
                        className={`flex items-center justify-center px-3 py-2 rounded-md text-sm font-medium transition-colors ${
                          formData.status === 'in_progress'
                            ? 'bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-400'
                            : 'bg-white text-gray-700 hover:bg-gray-50 dark:bg-gray-700 dark:text-gray-300 dark:hover:bg-gray-600'
                        }`}
                      >
                        {t('statuses.in_progress')}
                      </button>
                      <button
                        type="button"
                        onClick={() => setFormData({ ...formData, status: 'completed' })}
                        className={`flex items-center justify-center px-3 py-2 rounded-md text-sm font-medium transition-colors ${
                          formData.status === 'completed'
                            ? 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400'
                            : 'bg-white text-gray-700 hover:bg-gray-50 dark:bg-gray-700 dark:text-gray-300 dark:hover:bg-gray-600'
                        }`}
                      >
                        {t('statuses.completed')}
                      </button>
                      <button
                        type="button"
                        onClick={() => setFormData({ ...formData, status: 'cancelled' })}
                        className={`flex items-center justify-center px-3 py-2 rounded-md text-sm font-medium transition-colors ${
                          formData.status === 'cancelled'
                            ? 'bg-gray-100 text-gray-800 dark:bg-gray-900/30 dark:text-gray-400'
                            : 'bg-white text-gray-700 hover:bg-gray-50 dark:bg-gray-700 dark:text-gray-300 dark:hover:bg-gray-600'
                        }`}
                      >
                        {t('statuses.cancelled')}
                      </button>
                    </div>
                  </div>
                </div>

                {/* Responsáveis - select pesquisável múltiplo */}
                <div ref={assigneesDropdownRef}>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1 flex items-center">
                    <User className="w-4 h-4 mr-1.5" />
                    {t('assignees.title')}
                  </label>
                  
                  <div className="relative">
                    {/* Campo para mostrar os responsáveis selecionados */}
                    <div 
                      onClick={() => setShowAssigneesDropdown(!showAssigneesDropdown)}
                      className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm bg-white dark:bg-gray-700 cursor-pointer flex items-center justify-between"
                    >
                      <div className="flex flex-wrap gap-1">
                        {selectedAssignees.length > 0 ? (
                          selectedAssignees.map(userId => {
                            const agent = filteredAgents.find(a => a.id === userId);
                            return (
                              <div 
                                key={userId} 
                                className="inline-flex items-center bg-blue-100 dark:bg-blue-800 text-blue-800 dark:text-blue-200 text-xs rounded px-2 py-1 mr-1 mb-1"
                              >
                                {agent?.profile?.avatar_url && (
                                  <img 
                                    src={agent.profile.avatar_url} 
                                    alt="" 
                                    className="w-4 h-4 rounded-full mr-1" 
                                  />
                                )}
                                <span>{agent?.profile?.full_name || userId}</span>
                                <button
                                  type="button"
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    toggleAssignee(userId);
                                  }}
                                  className="ml-1 text-blue-500 hover:text-blue-700 dark:text-blue-300 dark:hover:text-blue-100"
                                >
                                  <X className="w-3 h-3" />
                                </button>
                              </div>
                            );
                          })
                        ) : (
                          <span className="text-gray-500 dark:text-gray-400">
                            {t('assignees.title')}
                          </span>
                        )}
                      </div>
                      <div>
                        <User className="w-5 h-5 text-gray-400" />
                      </div>
                    </div>
                    
                    {/* Dropdown para pesquisar e selecionar responsáveis */}
                    {showAssigneesDropdown && (
                      <div className="absolute z-10 mt-1 w-full bg-white dark:bg-gray-800 rounded-md shadow-lg border border-gray-200 dark:border-gray-700 max-h-60 overflow-auto">
                        {/* Campo de pesquisa */}
                        <div className="sticky top-0 p-2 bg-white dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700">
                          <div className="relative">
                            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
                            <input
                              type="text"
                              className="w-full pl-9 pr-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500 dark:bg-gray-700 dark:text-white text-sm"
                              placeholder={t('assignees.searchPlaceholder', 'Pesquisar responsáveis...')}
                              value={searchTerm}
                              onChange={(e) => setSearchTerm(e.target.value)}
                              onClick={(e) => e.stopPropagation()}
                            />
                          </div>
                        </div>
                        
                        {/* Lista de responsáveis */}
                        <div className="py-1">
                          {filteredAndSearchedAgents.length > 0 ? (
                            filteredAndSearchedAgents.map(agent => (
                              <div
                                key={agent.id}
                                onClick={() => toggleAssignee(agent.id)}
                                className="flex items-center px-4 py-2 text-sm hover:bg-gray-100 dark:hover:bg-gray-700 cursor-pointer"
                              >
                                <div className="flex items-center flex-1">
                                  {agent.profile?.avatar_url ? (
                                    <img 
                                      src={agent.profile.avatar_url} 
                                      alt="" 
                                      className="w-6 h-6 rounded-full mr-2" 
                                    />
                                  ) : (
                                    <div className="w-6 h-6 rounded-full bg-gray-200 dark:bg-gray-600 mr-2 flex items-center justify-center">
                                      <User className="w-4 h-4 text-gray-500 dark:text-gray-400" />
                                    </div>
                                  )}
                                  <span className="text-gray-700 dark:text-gray-300">
                                    {agent.profile?.full_name || agent.id}
                                  </span>
                                </div>
                                {selectedAssignees.includes(agent.id) && (
                                  <Check className="w-4 h-4 text-blue-500 dark:text-blue-400" />
                                )}
                              </div>
                            ))
                          ) : searchTerm ? (
                            <div className="px-4 py-2 text-sm text-gray-500 dark:text-gray-400 italic">
                              {t('assignees.noResults', 'Nenhum resultado encontrado')}
                            </div>
                          ) : (
                            <div className="px-4 py-2 text-sm text-gray-500 dark:text-gray-400 italic">
                              {formData.project_id || projectId 
                                ? t('assignees.noProjectMembers') 
                                : t('assignees.noAgents')}
                            </div>
                          )}
                        </div>
                      </div>
                    )}
                  </div>
                </div>

                {/* Etiquetas - agora referenciando o ref */}
                <div ref={labelsDropdownRef}>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1 flex items-center">
                    <Tag className="w-4 h-4 mr-1.5" />
                      {t('labels.title')}
                      {/* Botão para abrir dropdown */}
                    <button
                      type="button"
                      onClick={() => setShowLabelDropdown(!showLabelDropdown)}
                      className="ml-2"
                    >
                      <Plus className="w-4 h-4" />
                    </button>
                  </label>
                  
                  <div className="mt-2 relative">
                    {/* Exibir etiquetas selecionadas */}
                    <div className="flex flex-wrap gap-2 mb-2">
                      {selectedLabels.map(labelId => {
                        const label = labels.find(l => l.id === labelId);
                        if (!label) return null;
                        
                        return (
                          <div 
                            key={label.id}
                            className="px-2 py-1 rounded-full text-xs flex items-center"
                            style={{ 
                              backgroundColor: `${label.color}20`, // 20% opacity
                              color: label.color,
                              border: `1px solid ${label.color}`
                            }}
                          >
                            <span>{label.name}</span>
                            <button
                              type="button"
                              onClick={() => toggleLabel(label.id)}
                              className="ml-2 text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200"
                            >
                              <X className="w-3 h-3" />
                            </button>
                          </div>
                        );
                      })}
                    </div>
                    
                   
                    
                    {/* Dropdown das etiquetas */}
                    {showLabelDropdown && (
                      <div className="absolute z-10 mt-2 w-full max-h-40 overflow-y-auto bg-white border border-gray-200 rounded-md shadow-lg dark:bg-gray-800 dark:border-gray-700">
                        {labels.length > 0 ? (
                          labels.map(label => (
                            <div 
                              key={label.id}
                              onClick={() => toggleLabel(label.id)}
                              className={`px-4 py-2 text-sm text-gray-700 dark:text-gray-300 cursor-pointer hover:bg-gray-100 dark:hover:bg-gray-700 flex items-center ${
                                selectedLabels.includes(label.id) ? 'bg-gray-100 dark:bg-gray-700' : ''
                              }`}
                            >
                              <span 
                                className="w-3 h-3 rounded-full mr-2" 
                                style={{ backgroundColor: label.color }}
                              />
                              <span>{label.name}</span>
                            </div>
                          ))
                        ) : (
                          <div className="px-4 py-2 text-sm text-gray-500 dark:text-gray-400 italic">
                            {t('labels.noLabels')}
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                </div>

                {/* Checklist */}
                <div className="bg-gray-50 dark:bg-gray-800/50 rounded-lg">
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-3 flex items-center">
                    <CheckSquare className="w-4 h-4 mr-1.5" />
                    {t('checklist.title')}
                    <span className="ml-2 text-xs text-gray-500 dark:text-gray-400">
                      ({formData.checklist.filter(item => item.completed).length}/{formData.checklist.length})
                    </span>
                  </label>
                  
                  {/* Campo de adição de item */}
                  <div className="flex items-center space-x-2 mb-4">
                    <div className="flex-1 relative">
                      <input
                        type="text"
                        value={newChecklistItem}
                        onChange={(e) => setNewChecklistItem(e.target.value)}
                        placeholder={t('checklist.addItem')}
                        className="w-full pl-8 pr-3 py-2 text-sm border border-gray-300 dark:border-gray-600 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500 dark:bg-gray-700 dark:text-white"
                        onKeyDown={(e) => {
                          if (e.key === 'Enter') {
                            e.preventDefault();
                            addChecklistItem();
                          }
                        }}
                      />
                      <Plus className="absolute left-2.5 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" />
                    </div>
                    <button
                      type="button"
                      onClick={addChecklistItem}
                      className="p-2 text-white bg-blue-600 rounded-md hover:bg-blue-700 flex-shrink-0"
                    >
                      {t('checklist.add', 'Adicionar')}
                    </button>
                  </div>

                  {/* Lista de itens */}
                  <div className="space-y-2 max-h-48 overflow-y-auto pr-2 pb-2">
                    {formData.checklist.length === 0 ? (
                      <div className="text-center py-4 text-sm text-gray-500 dark:text-gray-400">
                        {t('checklist.empty', 'Nenhum item na checklist')}
                      </div>
                    ) : (
                      formData.checklist.map((item) => (
                        <div 
                          key={item.id} 
                          className={`flex items-center group rounded-md transition-colors duration-150 ${
                            item.completed 
                              ? 'bg-green-50 dark:bg-green-900/10' 
                              : 'hover:bg-gray-100 dark:hover:bg-gray-700/50'
                          }`}
                        >
                          <div className="relative flex items-center">
                            <input
                              type="checkbox"
                              checked={item.completed}
                              onChange={() => toggleChecklistItem(item.id)}
                              className="w-4 h-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500 dark:border-gray-600 dark:bg-gray-700"
                            />
                            {item.completed && (
                              <Check className="absolute w-3 h-3 text-white transform translate-x-0.5 translate-y-0.5 pointer-events-none" />
                            )}
                          </div>
                          <span className={`flex-1 ml-3 text-sm ${
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
                      ))
                    )}
                  </div>

                  {/* Barra de progresso */}
                  {formData.checklist.length > 0 && (
                    <div className="">
                      <div className="h-1.5 bg-gray-200 dark:bg-gray-700 rounded-full overflow-hidden">
                        <div 
                          className="h-full bg-blue-600 rounded-full transition-all duration-300"
                          style={{ 
                            width: `${(formData.checklist.filter(item => item.completed).length / formData.checklist.length) * 100}%` 
                          }}
                        />
                      </div>
                    </div>
                  )}
                </div>
              </div>
            </div>

            <div className="flex justify-end space-x-3 mt-6">
              {mode === 'edit' && formData.chat_id && (
                <button
                  type="button"
                  onClick={navigateToChatPage}
                  className="px-4 py-2 text-sm font-medium text-blue-600 dark:text-blue-400 bg-white dark:bg-gray-800 border border-blue-600 dark:border-blue-400 rounded-md hover:bg-blue-50 dark:hover:bg-gray-700 flex items-center"
                >
                  <MessageSquare className="w-4 h-4 mr-2" />
                  {t('viewChat', 'Ver Atendimento')}
                </button>
              )}
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
      {isCustomerModalOpen && (
        <Suspense fallback={
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50">
            <div className="bg-white dark:bg-gray-800 rounded-lg p-6 flex justify-center items-center">
              <Loader2 className="w-8 h-8 animate-spin text-blue-500" />
            </div>
          </div>
        }>
          <CustomerSelectModal
            isOpen={isCustomerModalOpen}
            onClose={() => setIsCustomerModalOpen(false)}
            onSelectCustomer={handleSelectCustomer}
          />
        </Suspense>
      )}
    </div>
  );
} 