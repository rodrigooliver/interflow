import React, { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useNavigate } from 'react-router-dom';
import { 
  Calendar, 
  Plus, 
  ChevronRight, 
  X, 
  CalendarDays, 
  Pencil, 
  Trash2,
  Clock,
  Globe,
  Lock,
  Users,
  UserCheck,
  CalendarOff,
  ExternalLink
} from 'lucide-react';
import { useAuthContext } from '../../contexts/AuthContext';
import { useSchedules } from '../../hooks/useQueryes';
import { format } from 'date-fns';
import ScheduleForm from '../../components/schedules/ScheduleForm';
import { Schedule } from '../../types/schedules';
import { toast } from 'react-hot-toast';
import { supabase } from '../../lib/supabase';

const SchedulesListPage: React.FC = () => {
  const { t } = useTranslation(['schedules', 'common']);
  const { currentOrganizationMember } = useAuthContext();
  const organizationId = currentOrganizationMember?.organization?.id;
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [selectedSchedule, setSelectedSchedule] = useState<Schedule | null>(null);
  const [deleteConfirmScheduleId, setDeleteConfirmScheduleId] = useState<string | null>(null);
  const navigate = useNavigate();
  
  // Buscar as agendas da organização
  const { data: schedules, isLoading: isLoadingSchedules, refetch: refetchSchedules } = useSchedules(organizationId);
  
  // Função para navegar para a página do calendário
  const handleGoToCalendar = () => {
    navigate('/app/schedules');
  };
  
  // Função para navegar para a página de detalhes da agenda
  const handleGoToScheduleDetails = (scheduleId: string) => {
    navigate(`/app/schedules/${scheduleId}`);
  };
  
  // Função para navegar para a página de gerenciamento de profissionais e serviços
  const handleGoToManagement = (scheduleId: string) => {
    navigate(`/app/schedules/${scheduleId}/management`);
  };
  
  // Função para navegar para a página de disponibilidade
  const handleGoToAvailability = (scheduleId: string) => {
    navigate(`/app/schedules/${scheduleId}/availability`);
  };
  
  // Função para navegar para a página de feriados e folgas
  const handleGoToHolidays = (scheduleId: string) => {
    navigate(`/app/schedules/${scheduleId}/holidays`);
  };
  
  // Função para criar uma nova agenda
  const handleCreateSchedule = () => {
    setSelectedSchedule(null);
    setShowCreateModal(true);
  };
  
  // Função para editar uma agenda existente
  const handleEditSchedule = (schedule: Schedule) => {
    setSelectedSchedule(schedule);
    setShowCreateModal(true);
  };
  
  // Função para confirmar exclusão de agenda
  const handleConfirmDelete = (scheduleId: string) => {
    setDeleteConfirmScheduleId(scheduleId);
  };
  
  // Função para cancelar exclusão
  const handleCancelDelete = () => {
    setDeleteConfirmScheduleId(null);
  };
  
  // Função para excluir uma agenda
  const handleDeleteSchedule = async (scheduleId: string) => {
    try {
      const { error } = await supabase
        .from('schedules')
        .delete()
        .eq('id', scheduleId);
        
      if (error) throw error;
      
      toast.success(t('schedules:scheduleDeletedSuccess'));
      refetchSchedules();
      setDeleteConfirmScheduleId(null);
    } catch (error) {
      console.error('Erro ao excluir agenda:', error);
      toast.error(t('schedules:scheduleDeleteError'));
    }
  };
  
  // Função para lidar com o sucesso da criação/edição da agenda
  const handleScheduleFormSuccess = () => {
    setShowCreateModal(false);
    refetchSchedules();
    toast.success(selectedSchedule 
      ? t('schedules:scheduleUpdatedSuccess') 
      : t('schedules:scheduleCreatedSuccess')
    );
  };
  
  // Exibir mensagem de carregamento
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
  
  return (
    <div className="h-full flex flex-col p-5 bg-gray-50 dark:bg-gray-900">
      {/* Se não houver agendas, exibir mensagem e botão para criar */}
      {!schedules?.length ? (
        <div className="flex flex-col items-center justify-center h-full w-full p-6">
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
        </div>
      ) : (
        <>
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-6">
            <div>
              <h1 className="text-2xl lg:text-3xl font-bold text-gray-800 dark:text-white flex items-center">
                <CalendarDays className="h-8 w-8 mr-2 text-blue-600 dark:text-blue-400 hidden sm:inline-block" />
                {t('schedules:manageSchedules')}
              </h1>
              <p className="text-gray-600 dark:text-gray-300 mt-1">
                {t('schedules:createEditManageSchedules')}
              </p>
            </div>
            <div className="flex gap-2 self-end sm:self-auto">
              <button
                onClick={handleGoToCalendar}
                className="inline-flex items-center px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg shadow-sm text-sm font-medium text-gray-700 dark:text-gray-200 bg-white dark:bg-gray-800 hover:bg-gray-50 dark:hover:bg-gray-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 dark:focus:ring-offset-gray-900 transition-colors"
              >
                <Calendar className="h-4 w-4 mr-2 text-gray-500 dark:text-gray-400" />
                <span>{t('schedules:viewCalendar')}</span>
              </button>
              <button
                onClick={handleCreateSchedule}
                className="inline-flex items-center px-3 py-2 border border-transparent rounded-lg shadow-sm text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 dark:bg-blue-600 dark:hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 dark:focus:ring-offset-gray-900 transition-colors"
              >
                <Plus className="h-4 w-4 mr-2" />
                <span>{t('schedules:newSchedule')}</span>
              </button>
            </div>
          </div>
          
          {/* Lista de agendas */}
          <div className="bg-white dark:bg-gray-800 rounded-xl shadow-md border border-gray-200 dark:border-gray-700 overflow-hidden">
            <div className="p-6">
              <h2 className="text-lg font-semibold text-gray-800 dark:text-white mb-4">
                {t('schedules:yourSchedules')}
              </h2>
              
              <div className="overflow-x-auto">
                <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
                  <thead className="bg-gray-50 dark:bg-gray-900/50">
                    <tr>
                      <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                        {t('schedules:scheduleName')}
                      </th>
                      <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                        {t('schedules:type')}
                      </th>
                      <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                        {t('common:status')}
                      </th>
                      <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                        {t('schedules:providers')}
                      </th>
                      <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                        {t('schedules:services')}
                      </th>
                      <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                        {t('schedules:publicBookingPage')}
                      </th>
                      <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                        {t('common:createdAt')}
                      </th>
                      <th scope="col" className="px-6 py-3 text-right text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                        {t('common:actions')}
                      </th>
                    </tr>
                  </thead>
                  <tbody className="bg-white dark:bg-gray-800 divide-y divide-gray-200 dark:divide-gray-700">
                    {schedules.map((schedule) => (
                      <tr 
                        key={schedule.id} 
                        className="hover:bg-gray-50 dark:hover:bg-gray-700/50 transition-colors"
                      >
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="flex items-center">
                            <div 
                              className="w-3 h-3 rounded-full mr-3 flex-shrink-0" 
                              style={{ backgroundColor: schedule.color }}
                            ></div>
                            <div>
                              <div className="text-sm font-medium text-gray-900 dark:text-white">
                                {schedule.title}
                              </div>
                              <div className="text-sm text-gray-500 dark:text-gray-400">
                                {schedule.description || t('schedules:noDescription')}
                              </div>
                            </div>
                          </div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                            schedule.type === 'service'
                              ? 'bg-purple-100 text-purple-800 dark:bg-purple-900/30 dark:text-purple-300'
                              : 'bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-300'
                          }`}>
                            {schedule.type === 'service' 
                              ? <Clock className="h-3 w-3 mr-1" /> 
                              : <Users className="h-3 w-3 mr-1" />
                            }
                            {schedule.type === 'service' 
                              ? t('schedules:serviceType') 
                              : t('schedules:meetingType')
                            }
                          </span>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                            schedule.is_public
                              ? 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-300'
                              : 'bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-300'
                          }`}>
                            {schedule.is_public 
                              ? (
                                <span className="flex items-center">
                                  <Globe className="h-3 w-3 mr-1" /> 
                                  {t('schedules:public')}
                                </span>
                              ) 
                              : (
                                <>
                                  <Lock className="h-3 w-3 mr-1" />
                                  {t('schedules:private')}
                                </>
                              )
                            }
                          </span>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="text-sm text-gray-900 dark:text-white">
                            {schedule.providers?.length || 0}
                          </div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="text-sm text-gray-900 dark:text-white">
                            {schedule.services?.length || 0}
                          </div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm">
                          {schedule.is_public ? (
                            <a
                              href={`/booking/${currentOrganizationMember?.organization?.id}/${schedule.id}`}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="inline-flex items-center text-blue-600 dark:text-blue-400 hover:text-blue-800 dark:hover:text-blue-300 font-medium"
                              title={t('schedules:openPublicPage')}
                            >
                              <ExternalLink className="h-4 w-4 mr-1" />
                              {t('schedules:openPublicPage')}
                            </a>
                          ) : (
                            <span className="text-gray-400 dark:text-gray-500">
                              {t('schedules:privateSchedule')}
                            </span>
                          )}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 dark:text-gray-400">
                          {format(new Date(schedule.created_at), 'dd/MM/yyyy')}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                          {deleteConfirmScheduleId === schedule.id ? (
                            <div className="flex items-center justify-end gap-2">
                              <span className="text-red-600 dark:text-red-400 text-xs mr-2">
                                {t('schedules:confirmDeleteSchedule')}
                              </span>
                              <button
                                onClick={() => handleDeleteSchedule(schedule.id)}
                                className="text-red-600 hover:text-red-900 dark:text-red-400 dark:hover:text-red-300 font-medium"
                              >
                                {t('common:delete')}
                              </button>
                              <button
                                onClick={handleCancelDelete}
                                className="text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-300 font-medium"
                              >
                                {t('common:cancel')}
                              </button>
                            </div>
                          ) : (
                            <div className="flex items-center justify-end gap-3">
                              {/* <button
                                onClick={() => handleGoToScheduleDetails(schedule.id)}
                                className="text-blue-600 hover:text-blue-800 dark:text-blue-400 dark:hover:text-blue-300"
                                title={t('schedules:viewSchedule')}
                              >
                                <ChevronRight className="h-5 w-5" />
                              </button> */}
                              <button
                                onClick={() => handleGoToManagement(schedule.id)}
                                className="text-purple-600 hover:text-purple-800 dark:text-purple-400 dark:hover:text-purple-300"
                                title={t('schedules:manageProvidersServices')}
                              >
                                <UserCheck className="h-5 w-5" />
                              </button>
                              <button
                                onClick={() => handleGoToAvailability(schedule.id)}
                                className="text-green-600 hover:text-green-800 dark:text-green-400 dark:hover:text-green-300"
                                title={t('schedules:manageAvailability')}
                              >
                                <Clock className="h-5 w-5" />
                              </button>
                              <button
                                onClick={() => handleGoToHolidays(schedule.id)}
                                className="text-orange-600 hover:text-orange-800 dark:text-orange-400 dark:hover:text-orange-300"
                                title={t('schedules:holidaysAndDaysOff')}
                              >
                                <CalendarOff className="h-5 w-5" />
                              </button>
                              <button
                                onClick={() => handleEditSchedule(schedule)}
                                className="text-amber-600 hover:text-amber-800 dark:text-amber-400 dark:hover:text-amber-300"
                                title={t('common:edit')}
                              >
                                <Pencil className="h-5 w-5" />
                              </button>
                              <button
                                onClick={() => handleConfirmDelete(schedule.id)}
                                className="text-red-600 hover:text-red-800 dark:text-red-400 dark:hover:text-red-300"
                                title={t('common:delete')}
                              >
                                <Trash2 className="h-5 w-5" />
                              </button>
                            </div>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        </>
      )}
      
      {/* Modal de criação/edição de agenda */}
      {showCreateModal && (
        <div className="fixed inset-0 bg-black bg-opacity-60 backdrop-blur-sm flex items-center justify-center z-50 p-4 animate-fadeIn">
          <div 
            className="bg-white dark:bg-gray-800 rounded-xl w-full max-w-xl max-h-[90vh] overflow-y-auto shadow-2xl transform transition-all duration-300 animate-scaleIn"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex justify-between items-center p-6 border-b border-gray-200 dark:border-gray-700">
              <h2 className="text-xl font-semibold text-gray-800 dark:text-white flex items-center">
                <CalendarDays className="h-5 w-5 mr-2 text-blue-600 dark:text-blue-400" />
                {selectedSchedule
                  ? t('schedules:editSchedule')
                  : t('schedules:createSchedule')
                }
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
                schedule={selectedSchedule || undefined}
                onSuccess={handleScheduleFormSuccess}
                onCancel={() => setShowCreateModal(false)}
              />
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default SchedulesListPage; 