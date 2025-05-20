import React, { useState, useEffect, useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import { Calendar, Plus, Filter, CalendarDays, X, Clock, CheckCircle2, AlertCircle, Video, User, MessageSquare } from 'lucide-react';
import { useAuthContext } from '../../contexts/AuthContext';
import { useSchedules, useAppointments } from '../../hooks/useQueryes';
import ScheduleCalendar from '../../components/schedules/calendar/ScheduleCalendar';
import { format, startOfMonth, endOfMonth } from 'date-fns';
import ScheduleForm from '../../components/schedules/ScheduleForm';
import AppointmentForm from '../../components/schedules/AppointmentForm';
import { CustomerEditModal } from '../../components/customers/CustomerEditModal';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { Customer, Appointment, Schedule, ScheduleProvider, Chat } from '../../types/database';
import { toast } from 'react-hot-toast';
import { supabase } from '../../lib/supabase';
import { ptBR } from 'date-fns/locale';

// Tipo para o slot selecionado
interface SelectedSlot {
  start: Date;
  end: Date;
  slots: Date[] | string[];
  action: 'select' | 'click' | 'doubleClick';
}

// Função para carregar filtros do localStorage
const loadFiltersFromStorage = (organizationId: string | undefined) => {
  if (!organizationId) return null;
  
  try {
    const storageKey = `appointmentsFilters_${organizationId}`;
    const savedFilters = localStorage.getItem(storageKey);
    if (savedFilters) {
      return JSON.parse(savedFilters);
    }
  } catch (error) {
    console.error('Erro ao carregar filtros do localStorage:', error);
  }
  return null;
};

const AppointmentsPage: React.FC = () => {
  const { t } = useTranslation(['schedules', 'common']);
  const { currentOrganizationMember } = useAuthContext();
  const [searchParams] = useSearchParams();
  const organizationId = currentOrganizationMember?.organization?.id;
  const currentProviderId = currentOrganizationMember?.profile_id;
  
  // Carregar filtros salvos
  const savedFilters = useMemo(() => loadFiltersFromStorage(organizationId), [organizationId]);
  
  // Inicializar estados com valores salvos, se disponíveis
  const [selectedScheduleId, setSelectedScheduleId] = useState<string | null>(
    savedFilters?.selectedScheduleId || null
  );
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showCreateAppointmentModal, setShowCreateAppointmentModal] = useState(false);
  const [showEditAppointmentModal, setShowEditAppointmentModal] = useState(false);
  const [selectedAppointment, setSelectedAppointment] = useState<Appointment | null>(null);
  const [selectedSlot, setSelectedSlot] = useState<SelectedSlot | null>(null);
  const [isListView, setIsListView] = useState(
    savedFilters?.isListView !== undefined ? savedFilters.isListView : true
  );
  const [isFilterExpanded, setIsFilterExpanded] = useState(false);
  const [showAllSchedules, setShowAllSchedules] = useState(
    savedFilters?.showAllSchedules !== undefined ? savedFilters.showAllSchedules : false
  );
  const [selectedProviderId, setSelectedProviderId] = useState<string | null>(
    savedFilters?.selectedProviderId || null
  );
  const [selectedStatuses, setSelectedStatuses] = useState<Appointment['status'][]>(
    savedFilters?.selectedStatuses || ['scheduled', 'confirmed']
  );
  const [loadingAppointmentId, setLoadingAppointmentId] = useState<string | null>(null);
  const [showConfirmationModal, setShowConfirmationModal] = useState(false);
  const [confirmationAction, setConfirmationAction] = useState<{
    appointmentId: string;
    newStatus: Appointment['status'];
  } | null>(null);
  const [showPendingOnly, setShowPendingOnly] = useState(
    savedFilters?.showPendingOnly !== undefined ? savedFilters.showPendingOnly : false
  );
  const [showCustomerEditModal, setShowCustomerEditModal] = useState(false);
  const [selectedCustomer, setSelectedCustomer] = useState<Customer | null>(null);
  const navigate = useNavigate();
  
  // Definir o intervalo de datas inicial para o mês atual
  const today = new Date();
  const [dateRange] = useState({
    start: format(startOfMonth(today), 'yyyy-MM-dd'),
    end: format(endOfMonth(today), 'yyyy-MM-dd')
  });
  
  // Buscar as agendas da organização
  const { data: schedules, isLoading: isLoadingSchedules, refetch: refetchSchedules } = useSchedules(organizationId);
  
  // Buscar agendamentos filtrados
  const { data: appointments, isLoading: isLoadingAppointments, refetch: refetchAppointments } = useAppointments({
    schedule_id: showAllSchedules ? undefined : selectedScheduleId || undefined,
    start_date: dateRange.start,
    end_date: dateRange.end,
    provider_id: selectedProviderId || undefined,
    status: selectedStatuses.length > 0 ? selectedStatuses : undefined
  });
  
  // Estado local para guardar agendamentos modificados, aguardando persistência no banco
  const [optimisticAppointments, setOptimisticAppointments] = useState<Record<string, Appointment>>({});
  
  // Filtrar os agendamentos com base nos status selecionados
  const filteredAppointments = useMemo(() => {
    if (!appointments) return [];
    
    return appointments
      .map(appointment => {
        // Se temos uma versão modificada deste agendamento, use-a no lugar do original
        if (optimisticAppointments[appointment.id]) {
          return optimisticAppointments[appointment.id];
        }
        return appointment;
      }) as Appointment[];
  }, [appointments, optimisticAppointments]);
  
  // Calcular número de agendamentos pendentes
  const pendingAppointmentsCount = useMemo(() => {
    if (!appointments) return 0;
    return appointments.filter(appointment => appointment.status === 'scheduled').length;
  }, [appointments]);
  
  // Chave para o localStorage
  const storageKey = `appointmentsFilters_${organizationId || 'default'}`;

  // Salvar os filtros no localStorage quando mudarem
  useEffect(() => {
    if (!organizationId) return;
    
    try {
      const filtersToSave = {
        isListView,
        showAllSchedules,
        selectedScheduleId,
        selectedProviderId,
        selectedStatuses,
        showPendingOnly
      };
      
      localStorage.setItem(storageKey, JSON.stringify(filtersToSave));
    } catch (error) {
      console.error('Erro ao salvar filtros no localStorage:', error);
    }
  }, [organizationId, storageKey, isListView, showAllSchedules, selectedScheduleId, selectedProviderId, selectedStatuses, showPendingOnly]);
  
  // Atualizar os status selecionados quando mudar o filtro de pendentes
  useEffect(() => {
    // Evita sobrescrever os status selecionados se estiver carregando do localStorage
    if (savedFilters?.selectedStatuses && !showPendingOnly) {
      return;
    }
    
    if (showPendingOnly) {
      setSelectedStatuses(['scheduled']);
    } else {
      setSelectedStatuses(['scheduled', 'confirmed']);
    }
  }, [showPendingOnly, savedFilters]);
  
  // Função para lidar com o clique no botão de pendentes
  const handlePendingClick = () => {
    setShowPendingOnly(!showPendingOnly);
    if (!showPendingOnly) {
      // Se estiver ativando, desmarca todos os outros status
      setSelectedStatuses(['scheduled']);
    } else {
      // Se estiver desativando, volta para o padrão
      setSelectedStatuses(['scheduled', 'confirmed']);
    }
    // Fecha a janela de filtro
    setIsFilterExpanded(false);
  };

  // Função para selecionar a opção "Todos" no filtro de agendas
  const handleSelectAllSchedules = () => {
    setShowAllSchedules(true);
    setSelectedScheduleId(null);
  };
  
  // Configurar subscrições em tempo real para agendamentos
  useEffect(() => {
    if (!organizationId) return;

    // Canal para mudanças em agendamentos
    const appointmentsSubscription = supabase
      .channel('appointments-changes')
      .on('postgres_changes', {
        event: '*',
        schema: 'public',
        table: 'appointments',
        filter: `schedule_id=eq.${selectedScheduleId}`
      }, async (payload) => {
        console.log('Mudança em agendamento detectada:', payload);
        
        // Recarregar os agendamentos quando houver mudanças
        await refetchAppointments();
        
        // Exibir notificação baseada no tipo de mudança
        if (payload.eventType === 'INSERT') {
          toast.success(t('schedules:appointmentCreatedSuccess'));
        } else if (payload.eventType === 'UPDATE') {
          toast.success(t('schedules:appointmentUpdatedSuccess'));
        } else if (payload.eventType === 'DELETE') {
          toast.success(t('schedules:appointmentDeletedSuccess'));
        }
      })
      .subscribe();

    // Canal para mudanças em lembretes de agendamento
    const remindersSubscription = supabase
      .channel('appointment-reminders-changes')
      .on('postgres_changes', {
        event: '*',
        schema: 'public',
        table: 'appointment_reminders',
        filter: `appointment_id=in.(${filteredAppointments.map(a => a.id).join(',')})`
      }, async (payload) => {
        console.log('Mudança em lembrete detectada:', payload);
        
        // Recarregar os agendamentos para atualizar os lembretes
        await refetchAppointments();
      })
      .subscribe();

    // Cleanup das subscrições quando o componente for desmontado
    return () => {
      appointmentsSubscription.unsubscribe();
      remindersSubscription.unsubscribe();
    };
  }, [organizationId, selectedScheduleId, filteredAppointments, refetchAppointments, t]);
  
  // Limpar o estado otimista quando os agendamentos forem recarregados
  useEffect(() => {
    setOptimisticAppointments({});
  }, [appointments]);
  
  // Selecionar a primeira agenda por padrão quando os dados são carregados
  React.useEffect(() => {
    if (schedules?.length && !selectedScheduleId && !showAllSchedules) {
      setSelectedScheduleId(schedules[0].id);
    }
  }, [schedules, selectedScheduleId, showAllSchedules]);
  
  // Encontrar a agenda selecionada
  const selectedSchedule = selectedScheduleId 
    ? schedules?.find(schedule => schedule.id === selectedScheduleId) 
    : null;
  
  // Função para navegar para a página de gerenciamento de agendas
  const handleGoToSchedulesList = () => {
    navigate('/app/schedules/list');
  };
  
  // Função para criar uma nova agenda
  const handleCreateSchedule = () => {
    setShowCreateModal(true);
  };
  
  // Função para criar um novo agendamento
  const handleCreateAppointment = () => {
    setShowCreateAppointmentModal(true);
  };
  
  // Função para lidar com o sucesso da criação da agenda
  const handleScheduleCreated = (newSchedule: Schedule) => {
    setShowCreateModal(false);
    refetchSchedules();
    setSelectedScheduleId(newSchedule.id);
  };
  
  // Função para lidar com o sucesso da criação do agendamento
  const handleAppointmentCreated = (newAppointment: Appointment) => {
    setShowCreateAppointmentModal(false);
    setSelectedSlot(null);
    refetchAppointments();
    console.log('Novo agendamento criado:', newAppointment);
  };
  
  // Função para lidar com o sucesso da atualização do agendamento
  const handleAppointmentUpdated = (updatedAppointment: Appointment) => {
    setShowEditAppointmentModal(false);
    setSelectedAppointment(null);
    refetchAppointments();
    console.log('Agendamento atualizado:', updatedAppointment);
  };
  
  // Handler para selecionar um slot
  const handleSelectSlot = (slotInfo: SelectedSlot) => {
    console.log('Abrindo modal de criação para o slot:', slotInfo);
    setSelectedSlot(slotInfo);
    setShowCreateAppointmentModal(true);
  };
  
  // Toggle do filtro expandido
  const toggleFilter = () => {
    setIsFilterExpanded(!isFilterExpanded);
  };

  // Selecionar provedor específico
  const handleProviderSelect = (providerId: string | null) => {
    setSelectedProviderId(providerId);
  };
  
  // Função para lidar com a seleção de status
  const handleStatusSelect = (status: Appointment['status']) => {
    setSelectedStatuses(prev => {
      const newStatuses = prev.includes(status)
        ? prev.filter(s => s !== status)
        : [...prev, status];
      
      // Se o novo status não incluir 'scheduled' ou incluir outros status, desativa o modo pendente
      if (!newStatuses.includes('scheduled') || newStatuses.length > 1) {
        setShowPendingOnly(false);
      }
      
      // Caso não haja nenhum status selecionado, selecione pelo menos "scheduled"
      if (newStatuses.length === 0) {
        return ['scheduled'];
      }
      
      return newStatuses;
    });
  };

  // Função para verificar se um status está selecionado
  const isStatusSelected = (status: Appointment['status']) => {
    return selectedStatuses.includes(status);
  };

  // Função para obter a cor do status
  const getStatusColor = (status: Appointment['status']) => {
    switch (status) {
      case 'scheduled':
        return 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-300';
      case 'confirmed':
        return 'bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-300';
      case 'completed':
        return 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-300';
      case 'canceled':
        return 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-300';
      case 'no_show':
        return 'bg-orange-100 text-orange-800 dark:bg-orange-900/30 dark:text-orange-300';
      default:
        return 'bg-gray-100 text-gray-800 dark:bg-gray-900/30 dark:text-gray-300';
    }
  };

  // Função para obter o ícone do status
  const getStatusIcon = (status: Appointment['status']) => {
    switch (status) {
      case 'scheduled':
        return <Clock className="h-4 w-4" />;
      case 'confirmed':
        return <CheckCircle2 className="h-4 w-4" />;
      case 'completed':
        return <CheckCircle2 className="h-4 w-4" />;
      case 'canceled':
        return <X className="h-4 w-4" />;
      case 'no_show':
        return <AlertCircle className="h-4 w-4" />;
      default:
        return null;
    }
  };
  
  // Função para exibir o modal de confirmação
  const handleStatusChangeClick = (appointmentId: string, newStatus: Appointment['status']) => {
    setConfirmationAction({ appointmentId, newStatus });
    setShowConfirmationModal(true);
  };

  // Função para confirmar a mudança de status
  const handleConfirmStatusChange = async () => {
    if (!confirmationAction) return;
    
    try {
      setLoadingAppointmentId(confirmationAction.appointmentId);
      
      // Atualizar o agendamento no banco de dados
      const { error } = await supabase
        .from('appointments')
        .update({ status: confirmationAction.newStatus })
        .eq('id', confirmationAction.appointmentId);

      if (error) {
        console.error('Erro ao atualizar status do agendamento:', error);
        toast.error(t('common:errorUpdatingAppointment'));
      } else {
        // Exibir mensagem de sucesso
        toast.success(t(`schedules:appointment${confirmationAction.newStatus.charAt(0).toUpperCase() + confirmationAction.newStatus.slice(1)}Success`));
        
        // Recarregar os agendamentos
        refetchAppointments();
      }
    } catch (error) {
      console.error('Erro ao processar mudança de status:', error);
      toast.error(t('common:unknownError'));
    } finally {
      setLoadingAppointmentId(null);
      setShowConfirmationModal(false);
      setConfirmationAction(null);
    }
  };

  // Função para obter o título do modal de confirmação
  const getConfirmationTitle = () => {
    if (!confirmationAction) return '';
    
    switch (confirmationAction.newStatus) {
      case 'confirmed':
        return t('schedules:confirmAppointmentTitle');
      case 'canceled':
        return t('schedules:cancelAppointmentTitle');
      case 'completed':
        return t('schedules:completeAppointmentTitle');
      case 'no_show':
        return t('schedules:markAsNoShowTitle');
      default:
        return '';
    }
  };

  // Função para obter a mensagem do modal de confirmação
  const getConfirmationMessage = () => {
    if (!confirmationAction) return '';
    
    switch (confirmationAction.newStatus) {
      case 'confirmed':
        return t('schedules:confirmAppointmentMessage');
      case 'canceled':
        return t('schedules:cancelAppointmentMessage');
      case 'completed':
        return t('schedules:completeAppointmentMessage');
      case 'no_show':
        return t('schedules:markAsNoShowMessage');
      default:
        return '';
    }
  };
  
  // Função para lidar com o sucesso da edição do cliente
  const handleCustomerUpdated = () => {
    setShowCustomerEditModal(false);
    setSelectedCustomer(null);
    refetchAppointments();
  };
  
  // Dentro do componente, adicionar a função de navegação para o chat
  const handleGoToChat = (chatId: Chat | undefined) => {
    if(!chatId)
      return;
    navigate(`/app/chat/${chatId}`);
  };
  
  // Efeito para verificar o parâmetro create na URL
  useEffect(() => {
    const shouldCreate = searchParams.get('create') === 'true';
    if (shouldCreate) {
      setShowCreateAppointmentModal(true);
    }
  }, [searchParams]);
  
  // Exibir mensagem de carregamento ou de nenhuma agenda
  if (isLoadingSchedules) {
    return (
      <div className="flex items-center justify-center h-full w-full bg-gray-50 dark:bg-gray-900">
        <div className="flex flex-col items-center">
          <div className="animate-spin rounded-full h-14 w-14 border-t-3 border-b-3 border-blue-600 dark:border-blue-400"></div>
          <p className="mt-4 text-gray-600 dark:text-gray-300 text-lg">{t('common:loading')}</p>
        </div>
      </div>
    );
  }
  
  // Se não houver agendas, exibir mensagem e botão para criar
  if (!schedules?.length) {
    return (
      <div className="flex flex-col items-center justify-center h-full w-full p-6 bg-gray-50 dark:bg-gray-900">
        <div className="bg-white dark:bg-gray-800 rounded-xl p-8 shadow-lg text-center max-w-lg transition-all duration-300 transform hover:scale-[1.02]">
          <div className="mx-auto w-20 h-20 bg-blue-50 dark:bg-blue-900/30 rounded-full flex items-center justify-center mb-6">
            <Calendar className="h-10 w-10 text-blue-600 dark:text-blue-400" />
          </div>
          <h2 className="text-2xl font-bold text-gray-800 dark:text-white mb-3">
            {t('schedules:noSchedulesFound')}
          </h2>
          <p className="text-gray-600 dark:text-gray-300 mb-8 text-lg">
            {t('schedules:createScheduleMessage')}
          </p>
          <button
            onClick={handleCreateSchedule}
            className="px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 dark:bg-blue-600 dark:hover:bg-blue-700 inline-flex items-center font-medium transition-colors duration-200 shadow-md hover:shadow-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 dark:focus:ring-offset-gray-800"
          >
            <Plus className="h-5 w-5 mr-2" />
            {t('schedules:createSchedule')}
          </button>
        </div>
        
        {/* Modal de criação de agenda */}
        {showCreateModal && (
          <div className="fixed inset-0 bg-black bg-opacity-60 backdrop-blur-sm flex items-center justify-center z-50 p-4 animate-fadeIn">
            <div 
              className="bg-white dark:bg-gray-800 rounded-xl w-full max-w-xl max-h-[90vh] overflow-y-auto shadow-2xl transform transition-all duration-300 animate-scaleIn"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="flex justify-between items-center p-6 border-b border-gray-200 dark:border-gray-700">
                <h2 className="text-xl font-semibold text-gray-800 dark:text-white flex items-center">
                  <CalendarDays className="h-5 w-5 mr-2 text-blue-600 dark:text-blue-400" />
                  {t('schedules:createSchedule')}
                </h2>
                <button 
                  onClick={() => setShowCreateModal(false)}
                  className="text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200 rounded-full p-1 hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
                  aria-label="Fechar"
                >
                  <X className="h-5 w-5" />
                </button>
              </div>
              <div className="p-6">
                <ScheduleForm 
                  onSuccess={handleScheduleCreated}
                  onCancel={() => setShowCreateModal(false)}
                />
              </div>
            </div>
          </div>
        )}
      </div>
    );
  }
  
  return (
    <div className="h-full flex flex-col p-4 md:p-5 bg-gray-50 dark:bg-gray-900">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 mb-6">
        <div className="hidden md:block">
          <h1 className="text-2xl lg:text-3xl font-bold text-gray-800 dark:text-white flex items-center">
            <CalendarDays className="h-6 w-6 md:h-8 md:w-8 mr-2 text-blue-600 dark:text-blue-400" />
            <span>{t('schedules:schedules')}</span>
          </h1>
          <p className="text-gray-600 dark:text-gray-300 mt-1 text-sm md:text-base">
            {t('schedules:manageYourSchedules')}
          </p>
        </div>
        <div className="flex gap-2 self-end md:self-auto w-full md:w-auto justify-end">
          <div className="flex items-center mr-2 md:mr-3">
            <button
              onClick={() => setIsListView(!isListView)}
              className={`inline-flex items-center px-2 md:px-3 py-2 border rounded-lg shadow-sm text-sm font-medium transition-colors ${
                isListView
                  ? 'border-blue-500 text-blue-700 dark:text-blue-400 bg-blue-50 dark:bg-blue-900/20'
                  : 'border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-200 bg-white dark:bg-gray-800 hover:bg-gray-50 dark:hover:bg-gray-700'
              } focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 dark:focus:ring-offset-gray-900`}
              title={t('schedules:listMode')}
            >
              <svg 
                className={`h-4 w-4 ${isListView ? 'text-blue-500 dark:text-blue-400' : 'text-gray-500 dark:text-gray-400'}`}
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d={isListView 
                    ? "M4 6h16M4 10h16M4 14h16M4 18h16"
                    : "M4 6h16M4 12h16M4 18h16"
                  }
                />
              </svg>
              <span className="hidden md:inline ml-2">{t('schedules:listMode')}</span>
            </button>
          </div>
          <button
            onClick={handlePendingClick}
            className={`inline-flex items-center px-2 md:px-3 py-2 border rounded-lg shadow-sm text-sm font-medium transition-colors ${
              showPendingOnly
                ? 'border-yellow-500 text-yellow-700 dark:text-yellow-400 bg-yellow-50 dark:bg-yellow-900/20'
                : 'border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-200 bg-white dark:bg-gray-800 hover:bg-gray-50 dark:hover:bg-gray-700'
            } focus:outline-none focus:ring-2 focus:ring-yellow-500 focus:ring-offset-2 dark:focus:ring-offset-gray-900`}
          >
            <Clock className={`h-4 w-4 ${showPendingOnly ? 'text-yellow-500 dark:text-yellow-400' : 'text-gray-500 dark:text-gray-400'}`} />
            <span className="hidden md:inline ml-2">{t('schedules:pendingApproval')}</span>
            {pendingAppointmentsCount > 0 && (
              <span className={`ml-2 px-2 py-0.5 rounded-full text-xs font-medium ${
                showPendingOnly
                  ? 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-300'
                  : 'bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-300'
              }`}>
                {pendingAppointmentsCount}
              </span>
            )}
          </button>
          <button
            onClick={toggleFilter}
            className={`inline-flex items-center px-2 md:px-3 py-2 border rounded-lg shadow-sm text-sm font-medium transition-colors ${
              isFilterExpanded 
                ? 'border-blue-500 text-blue-700 dark:text-blue-400 bg-blue-50 dark:bg-blue-900/20'
                : 'border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-200 bg-white dark:bg-gray-800 hover:bg-gray-50 dark:hover:bg-gray-700'
            } focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 dark:focus:ring-offset-gray-900`}
          >
            <Filter className={`h-4 w-4 ${isFilterExpanded ? 'text-blue-500 dark:text-blue-400' : 'text-gray-500 dark:text-gray-400'}`} />
            <span className="hidden md:inline ml-2">{t('common:filter')}</span>
          </button>
          <button
            onClick={handleGoToSchedulesList}
            className="inline-flex items-center px-2 md:px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg shadow-sm text-sm font-medium text-gray-700 dark:text-gray-200 bg-white dark:bg-gray-800 hover:bg-gray-50 dark:hover:bg-gray-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 dark:focus:ring-offset-gray-900 transition-colors"
          >
            <CalendarDays className="h-4 w-4 text-gray-500 dark:text-gray-400" />
            <span className="hidden md:inline ml-2">{t('schedules:manageSchedules')}</span>
          </button>
          <button
            onClick={handleCreateAppointment}
            className="inline-flex items-center px-2 md:px-3 py-2 border border-transparent rounded-lg shadow-sm text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 dark:bg-blue-600 dark:hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 dark:focus:ring-offset-gray-900 transition-colors"
          >
            <Plus className="h-4 w-4" />
            <span className="hidden md:inline ml-2">{t('schedules:newAppointment')}</span>
          </button>
        </div>
      </div>
      
      {/* Seletor de agenda - Visível apenas quando o filtro estiver expandido */}
      {isFilterExpanded && (
        <div className="mb-6 animate-slideDown">
          <div className="bg-white dark:bg-gray-800 rounded-xl shadow-md overflow-hidden border border-gray-200 dark:border-gray-700 transition-all duration-200 hover:shadow-lg">
            <div className="p-6">
              {/* Filtro de Agenda */}
              <div className="mb-6">
                <h3 className="text-md font-medium text-gray-700 dark:text-gray-300 mb-3">
                  {t('schedules:filterBySchedule')}
                </h3>
                <div className="flex flex-wrap gap-2">
                  <button
                    onClick={handleSelectAllSchedules}
                    className={`inline-flex items-center px-3 py-1.5 rounded-md text-sm ${
                      showAllSchedules 
                        ? 'bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-300 font-medium'
                        : 'bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-200 hover:bg-gray-200 dark:hover:bg-gray-600'
                    }`}
                  >
                    {t('common:all')}
                  </button>
                  {schedules?.map(schedule => (
                    <button
                      key={schedule.id}
                      onClick={() => {
                        setSelectedScheduleId(schedule.id);
                        if (showAllSchedules) {
                          setShowAllSchedules(false);
                        }
                      }}
                      className={`inline-flex items-center px-3 py-1.5 rounded-md text-sm ${
                        !showAllSchedules && selectedScheduleId === schedule.id
                          ? 'bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-300 font-medium'
                          : 'bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-200 hover:bg-gray-200 dark:hover:bg-gray-600'
                      }`}
                    >
                      <div 
                        className="w-2 h-2 rounded-full mr-2 flex-shrink-0" 
                        style={{ backgroundColor: schedule.color }}
                      ></div>
                      <span>{schedule.title}</span>
                    </button>
                  ))}
                </div>
              </div>

              {/* Filtro de Status */}
              <div className="mb-6">
                <h3 className="text-md font-medium text-gray-700 dark:text-gray-300 mb-3">
                  {t('schedules:filterByStatus')}
                </h3>
                <div className="flex flex-wrap gap-2">
                  {(['scheduled', 'confirmed', 'completed', 'canceled', 'no_show'] as Appointment['status'][]).map((status) => (
                    <button
                      key={status}
                      onClick={() => handleStatusSelect(status)}
                      className={`inline-flex items-center px-3 py-1.5 rounded-md text-sm ${
                        isStatusSelected(status)
                          ? `${getStatusColor(status)} font-medium`
                          : 'bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-200 hover:bg-gray-200 dark:hover:bg-gray-600'
                      }`}
                    >
                      {getStatusIcon(status)}
                      <span className="ml-1.5">
                        {t(`schedules:status${status.charAt(0).toUpperCase() + status.slice(1)}`)}
                      </span>
                    </button>
                  ))}
                </div>
              </div>
              
              {/* Seletor de Profissional */}
              <div className="mb-6">
                <h3 className="text-md font-medium text-gray-700 dark:text-gray-300 mb-3">
                  {t('schedules:filterByProvider')}
                </h3>
                
                <div className="flex flex-wrap gap-2">
                  <button
                    onClick={() => handleProviderSelect(null)}
                    className={`inline-flex items-center px-3 py-1.5 rounded-md text-sm ${
                      selectedProviderId === null
                        ? 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200 font-medium'
                        : 'bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-200 hover:bg-gray-200 dark:hover:bg-gray-600'
                    }`}
                  >
                    {t('common:all')}
                  </button>
                  
                  <button
                    onClick={() => handleProviderSelect(currentProviderId || null)}
                    className={`inline-flex items-center px-3 py-1.5 rounded-md text-sm ${
                      selectedProviderId === currentProviderId
                        ? 'bg-teal-100 text-teal-800 dark:bg-teal-900 dark:text-teal-200 font-medium'
                        : 'bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-200 hover:bg-gray-200 dark:hover:bg-gray-600'
                    }`}
                  >
                    {t('schedules:myAppointments')}
                  </button>
                  
                  {selectedSchedule?.providers?.map((provider: ScheduleProvider) => (
                    provider.profile_id !== currentProviderId && (
                      <button
                        key={provider.id}
                        onClick={() => handleProviderSelect(provider.profile_id)}
                        className={`inline-flex items-center px-3 py-1.5 rounded-md text-sm ${
                          selectedProviderId === provider.profile_id
                            ? 'bg-purple-100 text-purple-800 dark:bg-purple-900 dark:text-purple-200 font-medium'
                            : 'bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-200 hover:bg-gray-200 dark:hover:bg-gray-600'
                        }`}
                      >
                        {provider.name}
                      </button>
                    )
                  ))}
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
      
      {/* Área do calendário ou lista */}
      <div className="bg-white dark:bg-gray-800 rounded-xl shadow-md border border-gray-200 dark:border-gray-700 flex-1 min-h-0 overflow-hidden">
        {isLoadingAppointments ? (
          <div className="flex items-center justify-center h-full">
            <div className="animate-spin rounded-full h-8 w-8 border-2 border-blue-600 dark:border-blue-400 border-t-transparent"></div>
          </div>
        ) : isListView ? (
          <div className="h-full overflow-y-auto">
            <div className="p-3 md:p-4">
              {filteredAppointments.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-12 text-center">
                  <Calendar className="h-12 w-12 text-gray-400 dark:text-gray-500 mb-4" />
                  <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-2">
                    {t('schedules:noMatchingAppointments')}
                  </h3>
                  <p className="text-gray-500 dark:text-gray-400 mb-6">
                    {t('schedules:noMatchingAppointmentsMessage')}
                  </p>
                  <div className="flex flex-col sm:flex-row gap-3">
                    <button
                      onClick={() => setIsFilterExpanded(true)}
                      className="inline-flex items-center px-4 py-2 border border-gray-300 dark:border-gray-600 text-sm font-medium rounded-md shadow-sm text-gray-700 dark:text-gray-200 bg-white dark:bg-gray-800 hover:bg-gray-50 dark:hover:bg-gray-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 dark:focus:ring-offset-gray-900"
                    >
                      <Filter className="h-4 w-4 mr-2" />
                      {t('schedules:viewFilters')}
                    </button>
                    <button
                      onClick={handleCreateAppointment}
                      className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 dark:focus:ring-offset-gray-900"
                    >
                      <Plus className="h-4 w-4 mr-2" />
                      {t('schedules:newAppointment')}
                    </button>
                  </div>
                </div>
              ) : (
                <div className="space-y-6">
                  {Object.entries(
                    filteredAppointments.reduce((acc, appointment) => {
                      const date = appointment.date;
                      if (!acc[date]) {
                        acc[date] = [];
                      }
                      acc[date].push(appointment);
                      return acc;
                    }, {} as Record<string, typeof filteredAppointments>)
                  ).map(([date, appointments]) => (
                    <div key={date}>
                      <div className="sticky top-0 bg-white dark:bg-gray-800 py-2 mb-3 border-b border-gray-200 dark:border-gray-700">
                        <h3 className="text-sm font-medium text-gray-500 dark:text-gray-400">
                          {format(new Date(`${date}T12:00:00`), "EEEE, d 'de' MMMM", { locale: ptBR })}
                        </h3>
                      </div>
                      <div className="space-y-4">
                        {appointments.map((appointment) => (
                          <div
                            key={appointment.id}
                            onClick={() => {
                              setSelectedAppointment(appointment);
                              setShowEditAppointmentModal(true);
                            }}
                            className={`bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg p-3 sm:p-4 hover:shadow-md transition-shadow cursor-pointer ${
                              appointment.status === 'canceled' ? 'opacity-60' : ''
                            }`}
                          >
                            <div className="flex items-start justify-between">
                              <div className="flex-1 min-w-0">
                                <div className="flex flex-wrap items-center gap-2 mb-2">
                                  <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${getStatusColor(appointment.status)}`}>
                                    {getStatusIcon(appointment.status)}
                                    <span className="ml-1">
                                      {t(`schedules:status${appointment.status.charAt(0).toUpperCase() + appointment.status.slice(1)}`)}
                                    </span>
                                  </span>
                                  {appointment.has_videoconference && (
                                    <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-200">
                                      <Video className="h-3 w-3 mr-1" />
                                      {t('schedules:videoconference')}
                                    </span>
                                  )}
                                  <div className="flex items-center gap-1 ml-auto">
                                    {appointment.customer && (
                                      <>
                                        <button
                                          onClick={(e) => {
                                            e.stopPropagation();
                                            setSelectedCustomer(appointment.customer || null);
                                            setShowCustomerEditModal(true);
                                          }}
                                          className="p-2 sm:p-2.5 text-purple-600 hover:text-purple-700 dark:text-purple-400 dark:hover:text-purple-300 rounded-full hover:bg-purple-50 dark:hover:bg-purple-900/20"
                                          title={t('schedules:editCustomer')}
                                        >
                                          <User className="h-5 w-5 sm:h-6 sm:w-6" />
                                        </button>
                                        {
                                          appointment.chat_id ? (
                                            <button
                                              onClick={(e) => {
                                                e.stopPropagation();
                                                handleGoToChat(appointment.chat_id);
                                              }}
                                              className="p-2 sm:p-2.5 text-blue-600 hover:text-blue-700 dark:text-blue-400 dark:hover:text-blue-300 rounded-full hover:bg-blue-50 dark:hover:bg-blue-900/20"
                                              title={t('schedules:openChat')}
                                            >
                                              <MessageSquare className="h-5 w-5 sm:h-6 sm:w-6" />
                                            </button>
                                          ) : null
                                        }
                                        
                                      </>
                                    )}
                                    {appointment.status === 'scheduled' && (
                                      <>
                                        <button
                                          onClick={(e) => {
                                            e.stopPropagation();
                                            handleStatusChangeClick(appointment.id, 'confirmed');
                                          }}
                                          disabled={loadingAppointmentId === appointment.id}
                                          className={`p-2 sm:p-2.5 text-green-600 hover:text-green-700 dark:text-green-400 dark:hover:text-green-300 rounded-full hover:bg-green-50 dark:hover:bg-green-900/20 ${
                                            loadingAppointmentId === appointment.id ? 'opacity-50 cursor-not-allowed' : ''
                                          }`}
                                          title={t('schedules:confirmAppointment')}
                                        >
                                          {loadingAppointmentId === appointment.id ? (
                                            <div className="animate-spin rounded-full h-5 w-5 sm:h-6 sm:w-6 border-2 border-green-600 dark:border-green-400 border-t-transparent"></div>
                                          ) : (
                                            <CheckCircle2 className="h-5 w-5 sm:h-6 sm:w-6" />
                                          )}
                                        </button>
                                        <button
                                          onClick={(e) => {
                                            e.stopPropagation();
                                            handleStatusChangeClick(appointment.id, 'canceled');
                                          }}
                                          disabled={loadingAppointmentId === appointment.id}
                                          className={`p-2 sm:p-2.5 text-red-600 hover:text-red-700 dark:text-red-400 dark:hover:text-red-300 rounded-full hover:bg-red-50 dark:hover:bg-red-900/20 ${
                                            loadingAppointmentId === appointment.id ? 'opacity-50 cursor-not-allowed' : ''
                                          }`}
                                          title={t('schedules:cancelAppointment')}
                                        >
                                          {loadingAppointmentId === appointment.id ? (
                                            <div className="animate-spin rounded-full h-5 w-5 sm:h-6 sm:w-6 border-2 border-red-600 dark:border-red-400 border-t-transparent"></div>
                                          ) : (
                                            <X className="h-5 w-5 sm:h-6 sm:w-6" />
                                          )}
                                        </button>
                                      </>
                                    )}
                                    {appointment.status === 'confirmed' && (
                                      <>
                                        <button
                                          onClick={(e) => {
                                            e.stopPropagation();
                                            handleStatusChangeClick(appointment.id, 'completed');
                                          }}
                                          disabled={loadingAppointmentId === appointment.id}
                                          className={`p-2 sm:p-2.5 text-green-600 hover:text-green-700 dark:text-green-400 dark:hover:text-green-300 rounded-full hover:bg-green-50 dark:hover:bg-green-900/20 ${
                                            loadingAppointmentId === appointment.id ? 'opacity-50 cursor-not-allowed' : ''
                                          }`}
                                          title={t('schedules:completeAppointment')}
                                        >
                                          {loadingAppointmentId === appointment.id ? (
                                            <div className="animate-spin rounded-full h-5 w-5 sm:h-6 sm:w-6 border-2 border-green-600 dark:border-green-400 border-t-transparent"></div>
                                          ) : (
                                            <CheckCircle2 className="h-5 w-5 sm:h-6 sm:w-6" />
                                          )}
                                        </button>
                                        <button
                                          onClick={(e) => {
                                            e.stopPropagation();
                                            handleStatusChangeClick(appointment.id, 'no_show');
                                          }}
                                          disabled={loadingAppointmentId === appointment.id}
                                          className={`p-2 sm:p-2.5 text-orange-600 hover:text-orange-700 dark:text-orange-400 dark:hover:text-orange-300 rounded-full hover:bg-orange-50 dark:hover:bg-orange-900/20 ${
                                            loadingAppointmentId === appointment.id ? 'opacity-50 cursor-not-allowed' : ''
                                          }`}
                                          title={t('schedules:markAsNoShow')}
                                        >
                                          {loadingAppointmentId === appointment.id ? (
                                            <div className="animate-spin rounded-full h-5 w-5 sm:h-6 sm:w-6 border-2 border-orange-600 dark:border-orange-400 border-t-transparent"></div>
                                          ) : (
                                            <AlertCircle className="h-5 w-5 sm:h-6 sm:w-6" />
                                          )}
                                        </button>
                                      </>
                                    )}
                                  </div>
                                </div>
                                <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-1 sm:gap-2">
                                  <h3 className={`text-base sm:text-lg font-medium text-gray-900 dark:text-white truncate ${
                                    appointment.status === 'canceled' ? 'line-through' : ''
                                  }`}>
                                    {appointment.customer?.name || appointment.customer_name || t('schedules:noCustomer')}
                                  </h3>
                                  <div className="flex items-center text-sm text-gray-500 dark:text-gray-400">
                                    <Clock className="h-3.5 w-3.5 sm:h-4 sm:w-4 mr-1" />
                                    <p className={`text-sm font-medium text-gray-900 dark:text-white ${
                                      appointment.status === 'canceled' ? 'line-through' : ''
                                    }`}>
                                      {format(new Date(`${appointment.date}T${appointment.start_time}`), 'HH:mm')}
                                    </p>
                                  </div>
                                </div>
                                <p className={`text-xs sm:text-sm text-gray-500 dark:text-gray-400 mt-1 mb-2 truncate ${
                                  appointment.status === 'canceled' ? 'line-through' : ''
                                }`}>
                                  {appointment.service?.title || t('schedules:untitledService')}
                                </p>
                                {showAllSchedules && schedules && (
                                  <div className="flex items-center mt-1 mb-2">
                                    {(() => {
                                      // A propriedade schedule_id é do tipo Schedule (objeto) e não string
                                      const scheduleId = typeof appointment.schedule_id === 'string' 
                                        ? appointment.schedule_id 
                                        : appointment.schedule_id?.id;
                                          
                                      // Se já temos o objeto schedule_id com as informações, usamos ele diretamente
                                      if (typeof appointment.schedule_id !== 'string' && appointment.schedule_id) {
                                        return (
                                          <>
                                            <div 
                                              className="w-2 h-2 rounded-full mr-1.5 flex-shrink-0" 
                                              style={{ backgroundColor: appointment.schedule_id.color }}
                                            ></div>
                                            <p className={`text-xs text-gray-500 dark:text-gray-400 ${
                                              appointment.status === 'canceled' ? 'line-through' : ''
                                            }`}>
                                              {appointment.schedule_id.title}
                                            </p>
                                          </>
                                        );
                                      }
                                      
                                      // Caso contrário, procuramos nos schedules
                                      const appointmentSchedule = schedules.find(s => s.id === scheduleId);
                                      if (!appointmentSchedule) return null;
                                      
                                      return (
                                        <>
                                          <div 
                                            className="w-2 h-2 rounded-full mr-1.5 flex-shrink-0" 
                                            style={{ backgroundColor: appointmentSchedule.color }}
                                          ></div>
                                          <p className={`text-xs text-gray-500 dark:text-gray-400 ${
                                            appointment.status === 'canceled' ? 'line-through' : ''
                                          }`}>
                                            {appointmentSchedule.title}
                                          </p>
                                        </>
                                      );
                                    })()}
                                  </div>
                                )}
                                {appointment.notes && (
                                  <div className="mt-2 text-xs sm:text-sm text-gray-500 dark:text-gray-400">
                                    <p className={`line-clamp-2 ${
                                      appointment.status === 'canceled' ? 'line-through' : ''
                                    }`}>
                                      {appointment.notes}
                                    </p>
                                  </div>
                                )}
                              </div>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        ) : (
          <ScheduleCalendar
            appointments={filteredAppointments}
            providers={selectedSchedule?.providers || []}
            services={selectedSchedule?.services || []}
            onSelectEvent={(appointment) => {
              console.log('Abrindo modal de edição para o agendamento:', appointment);
              setSelectedAppointment(appointment);
              setShowEditAppointmentModal(true);
            }}
            onSelectSlot={handleSelectSlot}
            allowedViews={['month', 'week', 'day', 'agenda']}
            defaultView="week"
            currentProviderId={currentProviderId}
            onEventDrop={async (appointment, start, end) => {
              try {
                // Formatar datas para o formato correto para o banco de dados
                const newDate = format(start, 'yyyy-MM-dd');
                const newStartTime = format(start, 'HH:mm:ss');
                const newEndTime = format(end, 'HH:mm:ss');
                
                console.log(`Agendamento arrastado: ${appointment.id}`);
                console.log(`Nova data: ${newDate}`);
                console.log(`Novo horário de início: ${newStartTime}`);
                console.log(`Novo horário de término: ${newEndTime}`);
                
                // Criar uma versão atualizada do agendamento para manter na UI
                const updatedAppointment = {
                  ...appointment,
                  date: newDate,
                  start_time: newStartTime,
                  end_time: newEndTime
                };
                
                // Atualizar o estado otimista para refletir imediatamente as mudanças
                setOptimisticAppointments(prev => ({
                  ...prev,
                  [appointment.id]: updatedAppointment
                }));
                
                // Atualizar o agendamento no banco de dados sem recarregar imediatamente
                const { error } = await supabase
                  .from('appointments')
                  .update({
                    date: newDate,
                    start_time: newStartTime,
                    end_time: newEndTime
                  })
                  .eq('id', appointment.id);
                
                if (error) {
                  console.error('Erro ao atualizar agendamento:', error);
                  toast.error(t('common:errorUpdatingAppointment'));
                  
                  // Remover o agendamento otimista em caso de erro
                  setOptimisticAppointments(prev => {
                    const newState = { ...prev };
                    delete newState[appointment.id];
                    return newState;
                  });
                  
                  // Recarregar os agendamentos para reverter qualquer mudança visual
                  refetchAppointments();
                } else {
                  // Exibir mensagem de sucesso
                  toast.success(t('schedules:appointmentUpdatedSuccess'));
                  
                  // Recarregar silenciosamente para atualizar outros detalhes
                  refetchAppointments().then(() => {
                    // Após recarregar, remover do estado otimista
                    setOptimisticAppointments(prev => {
                      const newState = { ...prev };
                      delete newState[appointment.id];
                      return newState;
                    });
                  });
                }
              } catch (error) {
                console.error('Erro ao processar arrastar e soltar:', error);
                toast.error(t('common:unknownError'));
                // Recarregar os agendamentos para reverter qualquer mudança visual
                refetchAppointments();
              }
            }}
            onEventResize={async (appointment, start, end) => {
              try {
                // Formatar datas para o formato correto para o banco de dados
                const newDate = format(start, 'yyyy-MM-dd');
                const newStartTime = format(start, 'HH:mm:ss');
                const newEndTime = format(end, 'HH:mm:ss');
                
                console.log(`Agendamento redimensionado: ${appointment.id}`);
                console.log(`Data: ${newDate}`);
                console.log(`Novo horário de início: ${newStartTime}`);
                console.log(`Novo horário de término: ${newEndTime}`);
                
                // Criar uma versão atualizada do agendamento para manter na UI
                const updatedAppointment = {
                  ...appointment,
                  date: newDate,
                  start_time: newStartTime,
                  end_time: newEndTime
                };
                
                // Atualizar o estado otimista para refletir imediatamente as mudanças
                setOptimisticAppointments(prev => ({
                  ...prev,
                  [appointment.id]: updatedAppointment
                }));
                
                // Atualizar o agendamento no banco de dados sem recarregar imediatamente
                const { error } = await supabase
                  .from('appointments')
                  .update({
                    date: newDate,
                    start_time: newStartTime,
                    end_time: newEndTime
                  })
                  .eq('id', appointment.id);
                
                if (error) {
                  console.error('Erro ao atualizar agendamento:', error);
                  toast.error(t('common:errorUpdatingAppointment'));
                  
                  // Remover o agendamento otimista em caso de erro
                  setOptimisticAppointments(prev => {
                    const newState = { ...prev };
                    delete newState[appointment.id];
                    return newState;
                  });
                  
                  // Recarregar os agendamentos para reverter qualquer mudança visual
                  refetchAppointments();
                } else {
                  // Exibir mensagem de sucesso
                  toast.success(t('schedules:appointmentUpdatedSuccess'));
                  
                  // Recarregar silenciosamente para atualizar outros detalhes
                  refetchAppointments().then(() => {
                    // Após recarregar, remover do estado otimista
                    setOptimisticAppointments(prev => {
                      const newState = { ...prev };
                      delete newState[appointment.id];
                      return newState;
                    });
                  });
                }
              } catch (error) {
                console.error('Erro ao processar redimensionamento:', error);
                toast.error(t('common:unknownError'));
                // Recarregar os agendamentos para reverter qualquer mudança visual
                refetchAppointments();
              }
            }}
          />
        )}
      </div>
      
      {/* Modal de criação de agenda */}
      {showCreateModal && (
        <div 
          className="fixed inset-0 bg-black bg-opacity-60 backdrop-blur-sm flex items-center justify-center z-50 p-4 animate-fadeIn"
          onClick={() => setShowCreateModal(false)}
        >
          <div 
            className="bg-white dark:bg-gray-800 rounded-xl w-full max-w-xl max-h-[90vh] overflow-y-auto shadow-2xl transform transition-all duration-300 animate-scaleIn"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex justify-between items-center p-6 border-b border-gray-200 dark:border-gray-700">
              <h2 className="text-xl font-semibold text-gray-800 dark:text-white flex items-center">
                <CalendarDays className="h-5 w-5 mr-2 text-blue-600 dark:text-blue-400" />
                {t('schedules:createSchedule')}
              </h2>
              <button 
                onClick={() => setShowCreateModal(false)}
                className="text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200 rounded-full p-1 hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
                aria-label="Fechar"
              >
                <X className="h-5 w-5" />
              </button>
            </div>
            <div className="p-6">
              <ScheduleForm 
                onSuccess={handleScheduleCreated}
                onCancel={() => setShowCreateModal(false)}
              />
            </div>
          </div>
        </div>
      )}
      
      {/* Modal de criação de agendamento */}
      {showCreateAppointmentModal && selectedScheduleId && (
        <div 
          className="fixed inset-0 bg-black bg-opacity-60 backdrop-blur-sm flex items-center justify-center z-50 p-4 animate-fadeIn"
          onClick={() => {
            setShowCreateAppointmentModal(false);
            setSelectedSlot(null);
          }}
        >
          <div 
            className="bg-white dark:bg-gray-800 rounded-xl w-full max-w-2xl max-h-[90vh] overflow-y-auto shadow-2xl transform transition-all duration-300 animate-scaleIn"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex justify-between items-center p-6 border-b border-gray-200 dark:border-gray-700">
              <h2 className="text-xl font-semibold text-gray-800 dark:text-white flex items-center">
                <CalendarDays className="h-5 w-5 mr-2 text-blue-600 dark:text-blue-400" />
                {t('schedules:newAppointment')}
              </h2>
              <button 
                onClick={() => {
                  setShowCreateAppointmentModal(false);
                  setSelectedSlot(null);
                }}
                className="text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200 rounded-full p-1 hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
                aria-label="Fechar"
              >
                <X className="h-5 w-5" />
              </button>
            </div>
            <div className="p-2 md:p-6">
              <AppointmentForm 
                scheduleId={selectedScheduleId}
                initialDate={selectedSlot ? selectedSlot.start : undefined}
                initialEndDate={selectedSlot ? selectedSlot.end : undefined}
                onSuccess={handleAppointmentCreated}
                onCancel={() => {
                  setShowCreateAppointmentModal(false);
                  setSelectedSlot(null);
                }}
              />
            </div>
          </div>
        </div>
      )}
      
      {/* Modal de edição de agendamento */}
      {showEditAppointmentModal && selectedAppointment && (
        <div 
          className="fixed inset-0 bg-black bg-opacity-60 backdrop-blur-sm flex items-center justify-center z-50 p-4 animate-fadeIn"
          onClick={() => {
            setShowEditAppointmentModal(false);
            setSelectedAppointment(null);
          }}
        >
          <div 
            className="bg-white dark:bg-gray-800 rounded-xl w-full max-w-2xl max-h-[90vh] overflow-y-auto shadow-2xl transform transition-all duration-300 animate-scaleIn"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex justify-between items-center p-6 border-b border-gray-200 dark:border-gray-700">
              <h2 className="text-xl font-semibold text-gray-800 dark:text-white flex items-center">
                <CalendarDays className="h-5 w-5 mr-2 text-blue-600 dark:text-blue-400" />
                {t('schedules:editAppointment')}
              </h2>
              <button 
                onClick={() => {
                  setShowEditAppointmentModal(false);
                  setSelectedAppointment(null);
                }}
                className="text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200 rounded-full p-1 hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
                aria-label="Fechar"
              >
                <X className="h-5 w-5" />
              </button>
            </div>
            <div className="p-2 md:p-6">
              <AppointmentForm 
                scheduleId={selectedAppointment.schedule_id?.id || selectedAppointment.schedule_id?.toString() || selectedScheduleId || ''}
                appointment={selectedAppointment}
                onSuccess={handleAppointmentUpdated}
                onCancel={() => {
                  setShowEditAppointmentModal(false);
                  setSelectedAppointment(null);
                }}
              />
            </div>
          </div>
        </div>
      )}
      
      {/* Modal de confirmação */}
      {showConfirmationModal && confirmationAction && (
        <div 
          className="fixed inset-0 bg-black bg-opacity-60 backdrop-blur-sm flex items-center justify-center z-50 p-4 animate-fadeIn"
          onClick={() => {
            setShowConfirmationModal(false);
            setConfirmationAction(null);
          }}
        >
          <div 
            className="bg-white dark:bg-gray-800 rounded-xl w-full max-w-md shadow-2xl transform transition-all duration-300 animate-scaleIn"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="p-6">
              <div className="flex items-center justify-center mb-6">
                <div className={`p-3 rounded-full ${
                  confirmationAction.newStatus === 'confirmed' 
                    ? 'bg-green-100 dark:bg-green-900/30' 
                    : confirmationAction.newStatus === 'canceled'
                    ? 'bg-red-100 dark:bg-red-900/30'
                    : confirmationAction.newStatus === 'completed'
                    ? 'bg-blue-100 dark:bg-blue-900/30'
                    : 'bg-orange-100 dark:bg-orange-900/30'
                }`}>
                  {confirmationAction.newStatus === 'confirmed' ? (
                    <CheckCircle2 className="h-8 w-8 text-green-600 dark:text-green-400" />
                  ) : confirmationAction.newStatus === 'canceled' ? (
                    <X className="h-8 w-8 text-red-600 dark:text-red-400" />
                  ) : confirmationAction.newStatus === 'completed' ? (
                    <CheckCircle2 className="h-8 w-8 text-blue-600 dark:text-blue-400" />
                  ) : (
                    <AlertCircle className="h-8 w-8 text-orange-600 dark:text-orange-400" />
                  )}
                </div>
              </div>
              
              <h2 className="text-xl font-semibold text-gray-900 dark:text-white text-center mb-2">
                {getConfirmationTitle()}
              </h2>
              
              <p className="text-gray-600 dark:text-gray-300 text-center mb-6">
                {getConfirmationMessage()}
              </p>
              
              <div className="flex justify-end gap-3">
                <button
                  onClick={() => {
                    setShowConfirmationModal(false);
                    setConfirmationAction(null);
                  }}
                  className="px-4 py-2 text-sm font-medium text-gray-700 dark:text-gray-300 bg-white dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-600 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-gray-500 dark:focus:ring-offset-gray-900 transition-colors"
                >
                  {t('common:confirmCancel')}
                </button>
                <button
                  onClick={handleConfirmStatusChange}
                  disabled={loadingAppointmentId === confirmationAction.appointmentId}
                  className={`px-4 py-2 text-sm font-medium text-white rounded-lg focus:outline-none focus:ring-2 focus:ring-offset-2 transition-colors ${
                    confirmationAction.newStatus === 'confirmed'
                      ? 'bg-green-600 hover:bg-green-700 focus:ring-green-500 dark:focus:ring-offset-gray-900'
                      : confirmationAction.newStatus === 'canceled'
                      ? 'bg-red-600 hover:bg-red-700 focus:ring-red-500 dark:focus:ring-offset-gray-900'
                      : confirmationAction.newStatus === 'completed'
                      ? 'bg-blue-600 hover:bg-blue-700 focus:ring-blue-500 dark:focus:ring-offset-gray-900'
                      : 'bg-orange-600 hover:bg-orange-700 focus:ring-orange-500 dark:focus:ring-offset-gray-900'
                  } ${
                    loadingAppointmentId === confirmationAction.appointmentId
                      ? 'opacity-50 cursor-not-allowed'
                      : ''
                  }`}
                >
                  {loadingAppointmentId === confirmationAction.appointmentId ? (
                    <div className="flex items-center">
                      <div className="animate-spin rounded-full h-4 w-4 border-2 border-white border-t-transparent mr-2"></div>
                      {t('common:confirmLoading')}
                    </div>
                  ) : (
                    t('common:confirm')
                  )}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
      
      {/* Modal de edição de cliente */}
      {showCustomerEditModal && selectedCustomer && (
        <CustomerEditModal
          customer={selectedCustomer}
          onClose={() => {
            setShowCustomerEditModal(false);
            setSelectedCustomer(null);
          }}
          onSuccess={handleCustomerUpdated}
        />
      )}
    </div>
  );
};

export default AppointmentsPage; 