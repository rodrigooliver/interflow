import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { Calendar, momentLocalizer, Event as CalendarEvent, View, ViewsProps } from 'react-big-calendar';
import withDragAndDrop from 'react-big-calendar/lib/addons/dragAndDrop';
import moment from 'moment';
import 'react-big-calendar/lib/css/react-big-calendar.css';
import 'react-big-calendar/lib/addons/dragAndDrop/styles.css';
import 'moment/locale/pt-br';
import 'moment/locale/es';
import './schedule-calendar.css';
import './schedule-calendar-professional.css';
import { useTranslation } from 'react-i18next';
import { 
  ChevronLeft, 
  ChevronRight, 
  CheckCircle2, 
  Clock, 
  X,
  AlertCircle,
  Loader2
} from 'lucide-react';
import { Appointment, ScheduleProvider, ScheduleService } from '../../../types/schedules';

// Estender o tipo Appointment para incluir propriedades adicionais que podem existir na API
interface ExtendedAppointment extends Appointment {
  customer?: {
    id: string;
    name: string;
    email?: string;
  };
  service?: {
    id: string;
    title: string;
    color: string;
  };
  provider?: {
    full_name: string;
    avatar_url?: string | null;
  };
}

// Configurar o localizador para o calendário
const localizer = momentLocalizer(moment);

// Criar o componente com suporte para arrastar e soltar
const DragAndDropCalendar = withDragAndDrop(Calendar);

// Definir o tipo para eventos no calendário
interface CalendarEventType extends CalendarEvent {
  id: string;
  title: string;
  start: Date;
  end: Date;
  resource: ExtendedAppointment;
  className?: string;
  style?: React.CSSProperties;
}

interface ScheduleCalendarProps {
  appointments: ExtendedAppointment[];
  providers: ScheduleProvider[];
  services: ScheduleService[];
  height?: string;
  onSelectSlot?: (slotInfo: { start: Date; end: Date; slots: Date[] | string[]; action: 'select' | 'click' | 'doubleClick' }) => void;
  onSelectEvent?: (appointment: ExtendedAppointment) => void;
  allowedViews?: View[];
  defaultDate?: Date;
  defaultView?: View;
  providerColorMode?: boolean;
  isLoading?: boolean;
  isProfessionalMode?: boolean;
  onEventDrop?: (appointmentData: ExtendedAppointment, start: Date, end: Date) => void;
  onEventResize?: (appointmentData: ExtendedAppointment, start: Date, end: Date) => void;
  currentProviderId?: string; // ID do provider logado
}

interface EventProps {
  event: CalendarEventType;
}

// Componente para o conteúdo personalizado do evento no calendário
const EventComponent: React.FC<EventProps> = ({ event }) => {
  const appointment = event.resource;
  const { t } = useTranslation(['schedules', 'common']);
  
  // Determinar ícone baseado no status
  const getStatusIcon = () => {
    switch (appointment.status) {
      case 'confirmed':
        return <CheckCircle2 className="h-3 w-3 text-green-500 dark:text-green-400" />;
      case 'scheduled':
        return <Clock className="h-3 w-3 text-yellow-500 dark:text-yellow-400" />;
      case 'canceled':
        return <X className="h-3 w-3 text-red-500 dark:text-red-400" />;
      case 'no_show':
        return <AlertCircle className="h-3 w-3 text-orange-500 dark:text-orange-400" />;
      case 'completed':
        return <CheckCircle2 className="h-3 w-3 text-blue-500 dark:text-blue-400" />;
      default:
        return null;
    }
  };

  // Formatar o horário do agendamento
  const formatTime = () => {
    const startTime = moment(event.start).format('HH:mm');
    return startTime;
  };

  // Estilo para eventos cancelados ou no-show
  const isCanceled = appointment.status === 'canceled' || appointment.status === 'no_show';
  
  // Obter as informações do cliente, serviço e horário
  const customerName = appointment.customer?.name || appointment.customer_name || t('schedules:noCustomer');
  const serviceTitle = appointment.service?.title || t('schedules:untitledService');
  
  return (
    <div className={`px-1 py-0.5 h-full overflow-hidden ${isCanceled ? 'opacity-60' : ''}`}>
      {/* Nome do cliente */}
      <div className="flex items-center gap-1 text-xs">
        {getStatusIcon()}
        <span className={`font-medium truncate ${isCanceled ? 'line-through' : ''}`}>
          {customerName}
        </span>
      </div>
      
      {/* Serviço e horário */}
      <div className="flex items-center text-xs mt-0.5">
        <span className="truncate font-light">
          {serviceTitle} • {formatTime()}
        </span>
      </div>
      
      {/* Videoconferência (se tiver) */}
      {appointment.has_videoconference && (
        <div className="flex items-center text-xs mt-0.5">
          <span className="w-1.5 h-1.5 bg-green-500 rounded-full mr-1 flex-shrink-0"></span>
          <span className="truncate">Videoconferência</span>
        </div>
      )}
    </div>
  );
};

interface ToolbarProps {
  date: Date;
  onNavigate: (action: 'PREV' | 'NEXT' | 'TODAY' | Date) => void;
  onView: (view: View) => void;
  views: ViewsProps;
}

const ScheduleCalendar = ({
  appointments,
  providers,
  services,
  height = '700px',
  onSelectSlot,
  onSelectEvent,
  allowedViews = ['month', 'week', 'day', 'agenda'] as View[],
  defaultDate = new Date(),
  defaultView = 'month' as View,
  providerColorMode = false,
  isLoading = false,
  isProfessionalMode = false,
  onEventDrop,
  onEventResize,
  currentProviderId,
}: ScheduleCalendarProps) => {
  const { t, i18n } = useTranslation(['schedules', 'common']);
  const [calendarView, setCalendarView] = useState<"month" | "week" | "day" | "agenda">(defaultView as "month" | "week" | "day" | "agenda");
  const [selectedDate, setSelectedDate] = useState<Date>(defaultDate);
  
  // Estado local para armazenar os eventos arrastados (para manter a posição visual)
  const [draggedAppointmentPositions, setDraggedAppointmentPositions] = useState<Record<string, { start: Date, end: Date }>>({});
  
  // Estado para filtrar apenas os agendamentos do provider atual
  const [showOnlyMyAppointments, setShowOnlyMyAppointments] = useState(false);
  
  // Configurar o idioma do momento baseado no i18n
  useEffect(() => {
    moment.locale(i18n.language);
  }, [i18n.language]);

  // Resetar as posições arrastadas quando os agendamentos mudarem
  useEffect(() => {
    setDraggedAppointmentPositions({});
  }, [appointments]);

  // Filtrar os agendamentos com base no estado showOnlyMyAppointments
  const filteredAppointments = useMemo(() => {
    if (!showOnlyMyAppointments || !currentProviderId) {
      return appointments;
    }
    return appointments.filter(appointment => 
      appointment.provider_id === currentProviderId
    );
  }, [appointments, showOnlyMyAppointments, currentProviderId]);

  // Converter os agendamentos para o formato esperado pelo calendário
  const events = useMemo(() => filteredAppointments
  .map(appointment => {
    // Encontrar o serviço e o provedor para dados adicionais
    const service = services.find(s => s.id === appointment.service_id);
    const provider = providers.find(p => p.profile_id === appointment.provider_id);

    // Verificar se este agendamento foi arrastado e tem posição temporária
    const draggedPosition = draggedAppointmentPositions[appointment.id];
    
    // Calcular datas de início e fim (usando a posição arrastada, se disponível)
    const startDate = draggedPosition ? draggedPosition.start : new Date(`${appointment.date}T${appointment.start_time}`);
    const endDate = draggedPosition ? draggedPosition.end : new Date(`${appointment.date}T${appointment.end_time}`);

    // Formatar o horário para o título
    const startTime = moment(startDate).format('HH:mm');
    
    // Obter o nome do cliente (pode estar em customer.name ou customer_name)
    const customerName = appointment.customer?.name || appointment.customer_name || t('schedules:noCustomer');
    
    // Obter o título do serviço (pode estar em service.title ou service_id)
    const serviceTitle = appointment.service?.title || 
                        service?.title || 
                        t('schedules:untitledService');
    
    // Determinar a cor do evento
    let eventColor = appointment.service?.color || 
                    service?.color || 
                    '#3b82f6';
                    
    if (providerColorMode && provider) {
      // Usar a cor do profissional se estiver em modo de cor por profissional
      eventColor = provider.color || '#3b82f6';
    }

    // Determinar status para estilos visuais
    const statusStyles: Record<string, string> = {
      scheduled: 'opacity-90',
      confirmed: '',
      completed: 'opacity-80',
      canceled: 'opacity-60',
      no_show: 'opacity-60'
    };

    return {
      id: appointment.id,
      title: `${customerName} - ${serviceTitle} (${startTime})`,
      start: startDate,
      end: endDate,
      resource: appointment,
      className: `appointment-${appointment.status} ${statusStyles[appointment.status] || ''}`,
      style: {
        backgroundColor: eventColor,
        borderColor: eventColor,
        color: 'white',
        borderRadius: '4px',
        border: '1px solid rgba(0,0,0,0.1)',
        boxShadow: '0 1px 2px rgba(0,0,0,0.1)'
      }
    } as CalendarEventType;
  }), [filteredAppointments, services, providers, providerColorMode, t, draggedAppointmentPositions]);

  // Manipulador para navegação de data
  const handleNavigate = (date: Date) => {
    setSelectedDate(date);
  };

  // Manipulador para mudança de visualização
  const handleViewChange = (newView: string) => {
    setCalendarView(newView as "month" | "week" | "day" | "agenda");
  };

  // Função para lidar com eventos arrastados
  const handleEventDrop = useCallback(
    ({ event, start, end }: { event: CalendarEventType; start: Date; end: Date }) => {
      if (onEventDrop) {
        // Primeiro atualizamos o evento visualmente no estado local
        // Isso garante que o evento permaneça na posição onde foi arrastado
        setDraggedAppointmentPositions(prev => ({
          ...prev,
          [event.id]: { start, end }
        }));
        
        // Chamar a função onEventDrop passada nas props com os dados atualizados
        onEventDrop(event.resource, start, end);
      }
    },
    [onEventDrop]
  );

  // Função para lidar com o redimensionamento de eventos
  const handleEventResize = useCallback(
    ({ event, start, end }: { event: CalendarEventType; start: Date; end: Date }) => {
      if (onEventResize) {
        // Atualizar visualmente o evento no estado local
        setDraggedAppointmentPositions(prev => ({
          ...prev,
          [event.id]: { start, end }
        }));
        
        // Chamar a função onEventResize passada nas props
        onEventResize(event.resource, start, end);
      }
    },
    [onEventResize]
  );

  // Componente personalizado para a barra de ferramentas
  const CustomToolbar = useCallback(({ date, onNavigate, onView, views }: ToolbarProps) => {
    const goToBack = () => {
      onNavigate('PREV');
    };

    const goToNext = () => {
      onNavigate('NEXT');
    };

    const goToCurrent = () => {
      onNavigate('TODAY');
    };

    // Formatar o label da data baseado na visualização atual
    const formatDateLabel = () => {
      if (calendarView === 'month') {
        return moment(date).format('MMMM YYYY');
      } else if (calendarView === 'week') {
        const start = moment(date).startOf('week').format('DD/MM');
        const end = moment(date).endOf('week').format('DD/MM');
        return `${start} - ${end}`;
      } else if (calendarView === 'day') {
        return moment(date).format('DD MMMM YYYY');
      } else {
        return moment(date).format('MMMM YYYY');
      }
    };

    // Contar eventos visíveis
    const visibleEvents = events.length;
    const totalEvents = appointments.length;
    
    // Renderizar a barra de ferramentas
    return (
      <div className="rbc-toolbar p-3 flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 bg-white dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700">
        <div className="flex flex-col sm:flex-row items-start sm:items-center gap-3 sm:gap-0">
          {/* Navegação de data */}
          <div className="inline-flex rounded-md shadow-sm sm:mr-3">
            <button
              type="button"
              onClick={goToBack}
              className="relative inline-flex items-center px-2 py-1.5 rounded-l-md border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 text-sm font-medium text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700 focus:z-10 focus:outline-none focus:ring-1 focus:ring-teal-500 focus:border-teal-500"
            >
              <ChevronLeft className="h-4 w-4" />
            </button>
            <button
              type="button"
              onClick={goToCurrent}
              className="relative inline-flex items-center px-3 py-1.5 border-t border-b border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 text-sm font-medium text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700 focus:z-10 focus:outline-none focus:ring-1 focus:ring-teal-500 focus:border-teal-500"
            >
              {t('common:today')}
            </button>
            <button
              type="button"
              onClick={goToNext}
              className="relative inline-flex items-center px-2 py-1.5 rounded-r-md border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 text-sm font-medium text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700 focus:z-10 focus:outline-none focus:ring-1 focus:ring-teal-500 focus:border-teal-500"
            >
              <ChevronRight className="h-4 w-4" />
            </button>
          </div>
          
          {/* Data atual */}
          <span className="text-lg font-semibold text-gray-800 dark:text-gray-200">
            {formatDateLabel()}
          </span>

          {/* Contador de agendamentos */}
          <div className="ml-0 sm:ml-3 mt-2 sm:mt-0 flex items-center">
            <span className="px-2 py-0.5 rounded-full text-xs bg-teal-100 dark:bg-teal-900/30 text-teal-700 dark:text-teal-300 border border-teal-200 dark:border-teal-800">
              {t('schedules:showing')} {visibleEvents} {t('schedules:of')} {totalEvents} {t('schedules:appointments')}
            </span>
          </div>
        </div>
        
        <div className="flex flex-col xs:flex-row gap-2">
          {/* Botão para mostrar apenas agendamentos do colaborador atual */}
          {currentProviderId && (
            <button
              type="button"
              onClick={() => setShowOnlyMyAppointments(!showOnlyMyAppointments)}
              className={`inline-flex items-center px-3 py-1.5 text-sm font-medium rounded-md border ${
                showOnlyMyAppointments
                  ? 'bg-teal-600 dark:bg-teal-700 text-white border-teal-600 dark:border-teal-700 shadow-inner'
                  : 'bg-white dark:bg-gray-800 text-gray-600 dark:text-gray-300 border-gray-300 dark:border-gray-600 hover:bg-gray-50 dark:hover:bg-gray-700'
              } focus:outline-none focus:ring-2 focus:ring-teal-500 focus:ring-offset-2 dark:focus:ring-offset-gray-900 mr-2`}
            >
              {showOnlyMyAppointments ? t('schedules:showingMyAppointments') : t('schedules:showMyAppointments')}
            </button>
          )}
          
          {/* Controles de visualização */}
          <div className="inline-flex shadow-sm rounded-md overflow-hidden self-start sm:self-auto">
            {allowedViews.map((viewName) => (
              <button
                key={viewName}
                type="button"
                onClick={() => onView(viewName)}
                className={`px-3 py-1.5 text-sm font-medium ${
                  calendarView === viewName
                    ? 'bg-teal-600 dark:bg-teal-700 text-white border-teal-600 dark:border-teal-700 shadow-inner'
                    : 'bg-white dark:bg-gray-800 text-gray-600 dark:text-gray-300 border-gray-300 dark:border-gray-600 hover:bg-gray-50 dark:hover:bg-gray-700'
                } focus:z-10 focus:outline-none focus:ring-2 focus:ring-teal-500 focus:ring-offset-2 dark:focus:ring-offset-gray-900 relative border border-r-0 first:rounded-l-md first:border-r-0 last:rounded-r-md last:border-r`}
              >
                {viewName === 'month' && t('schedules:monthView')}
                {viewName === 'week' && t('schedules:weekView')}
                {viewName === 'day' && t('schedules:dayView')}
                {viewName === 'agenda' && t('schedules:agendaView')}
              </button>
            ))}
          </div>
        </div>
      </div>
    );
  }, [t, calendarView, events.length, appointments.length, allowedViews, showOnlyMyAppointments, currentProviderId]);

  // Gerar classes para o componente do calendário
  const calendarClassNames = {
    container: 'rbc-calendar schedule-calendar-inner',
    toolbar: 'hidden', // Ocultamos a barra padrão e usamos nossa personalizada
    month: {
      dateHeader: 'font-medium text-gray-800 dark:text-gray-200',
      header: 'font-semibold text-gray-700 dark:text-gray-300',
      event: 'rounded-md shadow-sm overflow-hidden',
    },
    agenda: {
      event: 'text-gray-800 dark:text-gray-200',
    },
    day: {
      event: 'rounded-md shadow-sm overflow-hidden',
    },
    week: {
      event: 'rounded-md shadow-sm overflow-hidden',
    }
  };

  if (isLoading) {
    return (
      <div className="h-full flex items-center justify-center bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700">
        <div className="flex flex-col items-center py-10">
          <Loader2 className="h-10 w-10 text-teal-600 dark:text-teal-400 animate-spin mb-3" />
          <p className="text-gray-600 dark:text-gray-300 text-lg">{t('common:loading')}</p>
        </div>
      </div>
    );
  }

  return (
    <div 
      className={`schedule-calendar ${isProfessionalMode ? 'schedule-calendar-professional' : ''}`} 
      style={{ height: height || '100%' }}
    >
      <div className="schedule-calendar-inner">
        <DragAndDropCalendar
          localizer={localizer}
          events={events}
          startAccessor={(event: any) => event.start}
          endAccessor={(event: any) => event.end}
          style={{ height: '100%' }}
          onNavigate={handleNavigate}
          date={selectedDate}
          view={calendarView}
          onView={handleViewChange}
          views={allowedViews.reduce((obj: any, view) => ({ ...obj, [view]: true }), {})}
          selectable={true}
          onSelectEvent={(event: any) => onSelectEvent && onSelectEvent(event.resource)}
          onSelectSlot={onSelectSlot as any}
          tooltipAccessor={null}
          components={{
            toolbar: CustomToolbar as any,
            event: EventComponent as any,
          }}
          className={calendarClassNames.container}
          messages={{
            today: t('common:today'),
            previous: t('schedules:previous'),
            next: t('schedules:next'),
            month: t('schedules:monthView'),
            week: t('schedules:weekView'),
            day: t('schedules:dayView'),
            agenda: t('schedules:agendaView'),
            date: t('schedules:date'),
            time: t('schedules:time'),
            event: t('schedules:event'),
            noEventsInRange: t('schedules:noAppointmentsInRange'),
            showMore: (total) => `+ ${total} ${t('schedules:more')}`
          }}
          onEventDrop={handleEventDrop as any}
          onEventResize={handleEventResize as any}
          resizable={true}
          draggableAccessor={() => true}
        />
      </div>
    </div>
  );
};

export default ScheduleCalendar; 