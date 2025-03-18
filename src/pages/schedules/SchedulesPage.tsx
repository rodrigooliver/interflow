import React, { useState, useEffect, useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import { Calendar, Plus, Filter, CalendarDays, X } from 'lucide-react';
import { useAuthContext } from '../../contexts/AuthContext';
import { useSchedules, useAppointments } from '../../hooks/useQueryes';
import ScheduleCalendar from '../../components/schedules/calendar/ScheduleCalendar';
import { format, startOfMonth, endOfMonth } from 'date-fns';
import ScheduleForm from '../../components/schedules/ScheduleForm';
import AppointmentForm from '../../components/schedules/AppointmentForm';
import { useNavigate } from 'react-router-dom';
import { Schedule, Appointment, ScheduleProvider } from '../../types/schedules';
import { toast } from 'react-hot-toast';
import { supabase } from '../../lib/supabase';

// Tipo para o slot selecionado
interface SelectedSlot {
  start: Date;
  end: Date;
  slots: Date[] | string[];
  action: 'select' | 'click' | 'doubleClick';
}

const SchedulesPage: React.FC = () => {
  const { t } = useTranslation(['schedules', 'common']);
  const { currentOrganizationMember } = useAuthContext();
  const organizationId = currentOrganizationMember?.organization?.id;
  const currentProviderId = currentOrganizationMember?.profile_id;
  const [selectedScheduleId, setSelectedScheduleId] = useState<string | null>(null);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showCreateAppointmentModal, setShowCreateAppointmentModal] = useState(false);
  const [showEditAppointmentModal, setShowEditAppointmentModal] = useState(false);
  const [selectedAppointment, setSelectedAppointment] = useState<Appointment | null>(null);
  const [selectedSlot, setSelectedSlot] = useState<SelectedSlot | null>(null);
  const [isProfessionalMode, setIsProfessionalMode] = useState(false);
  const [isFilterExpanded, setIsFilterExpanded] = useState(false);
  const [showAllSchedules, setShowAllSchedules] = useState(false);
  const [selectedProviderId, setSelectedProviderId] = useState<string | null>(null);
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
    end_date: dateRange.end
  });
  
  // Estado local para guardar agendamentos modificados, aguardando persistência no banco
  const [optimisticAppointments, setOptimisticAppointments] = useState<Record<string, Appointment>>({});
  
  // Combinação dos agendamentos carregados com os modificados localmente
  const combinedAppointments = useMemo(() => {
    if (!appointments) return [];
    
    return appointments
      .filter(appointment => {
        // Se um provedor específico foi selecionado, filtrar por ele
        if (selectedProviderId) {
          return appointment.provider_id === selectedProviderId;
        }
        return true;
      })
      .map(appointment => {
        // Se temos uma versão modificada deste agendamento, use-a no lugar do original
        if (optimisticAppointments[appointment.id]) {
          return optimisticAppointments[appointment.id];
        }
        return appointment;
      });
  }, [appointments, optimisticAppointments, selectedProviderId]);

  // Limpar o estado otimista quando os agendamentos forem recarregados
  useEffect(() => {
    setOptimisticAppointments({});
  }, [appointments]);
  
  // Selecionar a primeira agenda por padrão quando os dados são carregados
  React.useEffect(() => {
    if (schedules?.length && !selectedScheduleId) {
      setSelectedScheduleId(schedules[0].id);
    }
  }, [schedules, selectedScheduleId]);
  
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

  // Toggle para mostrar todas as agendas
  const toggleShowAllSchedules = () => {
    setShowAllSchedules(!showAllSchedules);
    if (!showAllSchedules) {
      // Se estiver ativando "todas as agendas", manter o ID selecionado para referência
    } else {
      // Se estiver desativando, garantir que uma agenda esteja selecionada
      if (!selectedScheduleId && schedules?.length) {
        setSelectedScheduleId(schedules[0].id);
      }
    }
  };
  
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
    <div className="h-full flex flex-col p-5 bg-gray-50 dark:bg-gray-900">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-6">
        <div>
          <h1 className="text-2xl lg:text-3xl font-bold text-gray-800 dark:text-white flex items-center">
            <CalendarDays className="h-8 w-8 mr-2 text-blue-600 dark:text-blue-400 hidden sm:inline-block" />
            {t('schedules:schedules')}
          </h1>
          <p className="text-gray-600 dark:text-gray-300 mt-1">
            {t('schedules:manageYourSchedules')}
          </p>
        </div>
        <div className="flex gap-2 self-end sm:self-auto">
          <div className="flex items-center mr-3">
            <label className="relative inline-flex items-center cursor-pointer">
              <input 
                type="checkbox" 
                checked={isProfessionalMode} 
                onChange={(e) => setIsProfessionalMode(e.target.checked)}
                className="sr-only peer"
              />
              <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-2 peer-focus:ring-blue-500 dark:peer-focus:ring-blue-600 rounded-full peer dark:bg-gray-700 peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all dark:border-gray-600 peer-checked:bg-blue-600"></div>
              <span className="ml-3 text-sm font-medium text-gray-700 dark:text-gray-300">{t('schedules:professionalMode')}</span>
            </label>
          </div>
          <button
            onClick={toggleFilter}
            className={`inline-flex items-center px-3 py-2 border rounded-lg shadow-sm text-sm font-medium transition-colors ${
              isFilterExpanded 
                ? 'border-blue-500 text-blue-700 dark:text-blue-400 bg-blue-50 dark:bg-blue-900/20'
                : 'border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-200 bg-white dark:bg-gray-800 hover:bg-gray-50 dark:hover:bg-gray-700'
            } focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 dark:focus:ring-offset-gray-900`}
          >
            <Filter className={`h-4 w-4 mr-2 ${isFilterExpanded ? 'text-blue-500 dark:text-blue-400' : 'text-gray-500 dark:text-gray-400'}`} />
            <span className="hidden sm:inline">{t('common:filter')}</span>
          </button>
          <button
            onClick={handleGoToSchedulesList}
            className="inline-flex items-center px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg shadow-sm text-sm font-medium text-gray-700 dark:text-gray-200 bg-white dark:bg-gray-800 hover:bg-gray-50 dark:hover:bg-gray-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 dark:focus:ring-offset-gray-900 transition-colors"
          >
            <CalendarDays className="h-4 w-4 mr-2 text-gray-500 dark:text-gray-400" />
            <span className="hidden sm:inline">{t('schedules:manageSchedules')}</span>
            <span className="inline sm:hidden">{t('schedules:manage')}</span>
          </button>
          <button
            onClick={handleCreateAppointment}
            className="inline-flex items-center px-3 py-2 border border-transparent rounded-lg shadow-sm text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 dark:bg-blue-600 dark:hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 dark:focus:ring-offset-gray-900 transition-colors"
          >
            <Plus className="h-4 w-4 mr-2" />
            <span className="hidden sm:inline">{t('schedules:newAppointment')}</span>
            <span className="inline sm:hidden">{t('schedules:new')}</span>
          </button>
        </div>
      </div>
      
      {/* Seletor de agenda - Visível apenas quando o filtro estiver expandido */}
      {isFilterExpanded && (
        <div className="mb-6 animate-slideDown">
          <div className="bg-white dark:bg-gray-800 rounded-xl shadow-md overflow-hidden border border-gray-200 dark:border-gray-700 transition-all duration-200 hover:shadow-lg">
            <div className="p-6">
              <div className="flex justify-between items-center mb-4">
                <h2 className="text-lg font-semibold text-gray-800 dark:text-white">
                  {t('schedules:filters')}
                </h2>
                
                {/* Toggle para todas as agendas */}
                <div className="flex items-center">
                  <label className="relative inline-flex items-center cursor-pointer">
                    <input 
                      type="checkbox" 
                      checked={showAllSchedules} 
                      onChange={toggleShowAllSchedules}
                      className="sr-only peer"
                    />
                    <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-2 peer-focus:ring-blue-500 dark:peer-focus:ring-blue-600 rounded-full peer dark:bg-gray-700 peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all dark:border-gray-600 peer-checked:bg-blue-600"></div>
                    <span className="ml-3 text-sm font-medium text-gray-700 dark:text-gray-300">{t('schedules:allAppointments')}</span>
                  </label>
                </div>
              </div>
              
              <h3 className="text-md font-medium text-gray-700 dark:text-gray-300 mb-3">
                {t('schedules:selectSchedule')}
              </h3>
              
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4 mb-6">
                {schedules?.map(schedule => (
                  <button
                    key={schedule.id}
                    onClick={() => {
                      setSelectedScheduleId(schedule.id);
                      // Se selecionar uma agenda específica, desative o modo "todas"
                      if (showAllSchedules) {
                        setShowAllSchedules(false);
                      }
                    }}
                    disabled={showAllSchedules}
                    className={`flex items-center p-3 rounded-lg border transition-colors ${
                      showAllSchedules 
                        ? 'opacity-60 cursor-not-allowed border-gray-200 dark:border-gray-700'
                        : selectedScheduleId === schedule.id
                          ? 'border-blue-500 bg-blue-50 dark:bg-blue-900/20'
                          : 'border-gray-200 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-700'
                    }`}
                  >
                    <div 
                      className="w-4 h-4 rounded-full mr-3 flex-shrink-0" 
                      style={{ backgroundColor: schedule.color }}
                    ></div>
                    <div className="text-left">
                      <span className={`font-medium ${
                        selectedScheduleId === schedule.id && !showAllSchedules
                          ? 'text-blue-700 dark:text-blue-400'
                          : 'text-gray-800 dark:text-gray-100'
                      }`}>
                        {schedule.title}
                      </span>
                      <div className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                        {schedule.type === 'service' 
                          ? t('schedules:serviceType') 
                          : t('schedules:meetingType')}
                      </div>
                    </div>
                  </button>
                ))}
              </div>
              
              {/* Seletor de Profissional */}
              {(selectedSchedule?.providers?.length > 0 || showAllSchedules) && (
                <>
                  <h3 className="text-md font-medium text-gray-700 dark:text-gray-300 mb-3">
                    {t('schedules:filterByProvider')}
                  </h3>
                  
                  <div className="flex flex-wrap gap-2 mb-3">
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
                    
                    {/* Lista de outros profissionais */}
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
                </>
              )}
              
              {/* Resumo das opções selecionadas */}
              <div className="mt-6 pt-4 border-t border-gray-200 dark:border-gray-700">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <div className="flex flex-wrap items-center gap-2">
                    {showAllSchedules ? (
                      <span className="text-gray-700 dark:text-gray-300">
                        {t('schedules:showingAllSchedules')}
                      </span>
                    ) : selectedSchedule && (
                      <>
                        <div 
                          className="w-4 h-4 rounded-full mr-2" 
                          style={{ backgroundColor: selectedSchedule.color }}
                        ></div>
                        <h3 className="text-lg font-medium text-gray-800 dark:text-white">
                          {selectedSchedule.title}
                        </h3>
                      </>
                    )}
                    
                    {selectedProviderId && (
                      <span className="ml-3 px-2 py-1 bg-teal-100 dark:bg-teal-900/30 text-teal-800 dark:text-teal-200 text-xs rounded-full">
                        {selectedProviderId === currentProviderId 
                          ? t('schedules:onlyMyAppointments') 
                          : `${t('schedules:onlyProviderAppointments')}: ${selectedSchedule?.providers?.find((p: ScheduleProvider) => p.profile_id === selectedProviderId)?.name || ''}`}
                      </span>
                    )}
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
      
      {/* Área do calendário */}
      <div className="bg-white dark:bg-gray-800 rounded-xl shadow-md border border-gray-200 dark:border-gray-700 flex-1 min-h-0 overflow-hidden">
        {isLoadingAppointments ? (
          <div className="flex items-center justify-center h-full">
            <div className="animate-spin rounded-full h-10 w-10 border-t-3 border-b-3 border-blue-600 dark:border-blue-400"></div>
          </div>
        ) : (
          <ScheduleCalendar
            appointments={combinedAppointments}
            providers={selectedSchedule?.providers || []}
            services={selectedSchedule?.services || []}
            onSelectEvent={(appointment) => {
              console.log('Abrindo modal de edição para o agendamento:', appointment);
              setSelectedAppointment(appointment);
              setShowEditAppointmentModal(true);
            }}
            onSelectSlot={handleSelectSlot}
            isProfessionalMode={isProfessionalMode}
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
            <div className="p-6">
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
      {showEditAppointmentModal && selectedAppointment && selectedScheduleId && (
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
            <div className="p-6">
              <AppointmentForm 
                scheduleId={selectedScheduleId}
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
    </div>
  );
};

export default SchedulesPage; 