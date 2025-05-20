import React from 'react';
import { format } from 'date-fns';
import { useTranslation } from 'react-i18next';
import { Clock, CheckCircle2, AlertCircle, X, Video, User, MessageSquare } from 'lucide-react';
import { Appointment, Customer, Chat, Schedule } from '../../types/database';
import { toast } from 'react-hot-toast';
import { supabase } from '../../lib/supabase';

interface AppointmentCardProps {
  appointment: Appointment;
  onEdit: (appointment: Appointment) => void;
  onCustomerEdit?: (customer: Customer | null) => void;
  onChatOpen?: (chatId: Chat | undefined) => void;
  showScheduleName?: boolean;
  schedules?: Schedule[];
  hideCustomerEditButton?: boolean;
}

const AppointmentCard: React.FC<AppointmentCardProps> = ({
  appointment,
  onEdit,
  onCustomerEdit,
  onChatOpen,
  showScheduleName = false,
  schedules = [],
  hideCustomerEditButton = false
}) => {
  const { t } = useTranslation(['schedules', 'common']);
  const [loadingAppointmentId, setLoadingAppointmentId] = React.useState<string | null>(null);
  const [showConfirmationModal, setShowConfirmationModal] = React.useState(false);
  const [confirmationAction, setConfirmationAction] = React.useState<{
    appointmentId: string;
    newStatus: Appointment['status'];
  } | null>(null);

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

  // Encontrar detalhes da agenda se necessário
  const getScheduleDetails = () => {
    if (!showScheduleName || !schedules || schedules.length === 0) return null;

    // A propriedade schedule_id pode ser tanto string quanto objeto Schedule
    const scheduleId = typeof appointment.schedule_id === 'string' 
      ? appointment.schedule_id 
      : appointment.schedule_id?.id;
      
    // Se schedule_id é um objeto Schedule, usar diretamente
    if (typeof appointment.schedule_id !== 'string' && appointment.schedule_id) {
      return appointment.schedule_id;
    }
    
    // Caso contrário, procurar nos schedules
    return schedules.find(s => s.id === scheduleId) || null;
  };

  const scheduleDetails = getScheduleDetails();

  return (
    <>
      <div
        key={appointment.id}
        onClick={() => onEdit(appointment)}
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
                {appointment.customer && onCustomerEdit && !hideCustomerEditButton && (
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      onCustomerEdit(appointment.customer || null);
                    }}
                    className="p-2 sm:p-2.5 text-purple-600 hover:text-purple-700 dark:text-purple-400 dark:hover:text-purple-300 rounded-full hover:bg-purple-50 dark:hover:bg-purple-900/20"
                    title={t('schedules:editCustomer')}
                  >
                    <User className="h-5 w-5 sm:h-6 sm:w-6" />
                  </button>
                )}
                
                {appointment.chat_id && onChatOpen && (
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      onChatOpen(appointment.chat_id);
                    }}
                    className="p-2 sm:p-2.5 text-blue-600 hover:text-blue-700 dark:text-blue-400 dark:hover:text-blue-300 rounded-full hover:bg-blue-50 dark:hover:bg-blue-900/20"
                    title={t('schedules:openChat')}
                  >
                    <MessageSquare className="h-5 w-5 sm:h-6 sm:w-6" />
                  </button>
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
            
            {/* Mostrar nome da agenda se solicitado */}
            {showScheduleName && scheduleDetails && (
              <div className="flex items-center mt-1 mb-2">
                <div 
                  className="w-2 h-2 rounded-full mr-1.5 flex-shrink-0" 
                  style={{ backgroundColor: scheduleDetails.color }}
                ></div>
                <p className={`text-xs text-gray-500 dark:text-gray-400 ${
                  appointment.status === 'canceled' ? 'line-through' : ''
                }`}>
                  {scheduleDetails.title}
                </p>
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
    </>
  );
};

export default AppointmentCard; 