import React, { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { MessageSquare, Users, MessageCircle, BarChart2, Calendar, TrendingUp, Clock, AlertCircle, ChevronLeft, ChevronRight } from 'lucide-react';
import { supabase } from '../lib/supabase';
import { Link } from 'react-router-dom';
import { useAuthContext } from '../contexts/AuthContext';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import QuickSetupGuide from '../components/dashboard/QuickSetupGuide';
import { ChatFlowModal } from '../components/chat/ChatFlowModal';
import { formatLastMessageTime } from '../utils/date';
import { useTeams, useTasks, useAppointments } from '../hooks/useQueryes';
import { TaskModal } from '../components/tasks/TaskModal';
import { useDashboard } from '../hooks/useDashboard';

interface StatCard {
  id: string;
  title: string;
  description: string;
  value: number;
  icon: React.ElementType;
  bgColor: string;
  iconColor: string;
  textColor: string;
  link?: string;
  change?: {
    value: number;
    type: 'increase' | 'decrease';
  };
}

interface ChatData {
  id: string;
  customer_name: string;
  last_message: string;
  time: string;
  status: 'new' | 'in_progress' | 'resolved';
}

interface ChartDataPoint {
  name: string;
  [key: string]: string | number; // Permite adicionar dinamicamente dados por equipe
}

interface Customer {
  name: string;
}

interface ChatWithRelations {
  id: string;
  customers: Customer;
  status: 'new' | 'in_progress' | 'resolved';
  last_message_at: string;
  last_message: {
    content: string;
    created_at: string;
  };
}

// Componente DatePicker simples
interface DatePickerProps {
  selectedDate: Date | null;
  selectedMonth: Date | null;
  selectedYear: Date | null;
  onSelectDate: (date: Date) => void;
  onSelectMonth: (date: Date) => void;
  onSelectYear: (date: Date) => void;
  mode: 'day' | 'month' | 'year';
  onClose: () => void;
}

const SimpleDatePicker: React.FC<DatePickerProps> = ({
  selectedDate,
  selectedMonth,
  selectedYear,
  onSelectDate,
  onSelectMonth,
  onSelectYear,
  mode,
  onClose
}) => {
  const { t } = useTranslation('dashboard');
  const [viewDate, setViewDate] = useState<Date>(
    selectedDate || selectedMonth || selectedYear || new Date()
  );
  const [viewMode, setViewMode] = useState<'day' | 'month' | 'year'>(mode);

  // Navegar para o mês anterior
  const prevMonth = () => {
    setViewDate(new Date(viewDate.getFullYear(), viewDate.getMonth() - 1, 1));
  };

  // Navegar para o próximo mês
  const nextMonth = () => {
    setViewDate(new Date(viewDate.getFullYear(), viewDate.getMonth() + 1, 1));
  };

  // Navegar para o ano anterior
  const prevYear = () => {
    setViewDate(new Date(viewDate.getFullYear() - 1, viewDate.getMonth(), 1));
  };

  // Navegar para o próximo ano
  const nextYear = () => {
    setViewDate(new Date(viewDate.getFullYear() + 1, viewDate.getMonth(), 1));
  };

  // Navegar para a década anterior
  const prevDecade = () => {
    setViewDate(new Date(viewDate.getFullYear() - 10, viewDate.getMonth(), 1));
  };

  // Navegar para a próxima década
  const nextDecade = () => {
    setViewDate(new Date(viewDate.getFullYear() + 10, viewDate.getMonth(), 1));
  };

  // Selecionar um dia específico
  const handleSelectDay = (day: number) => {
    const newDate = new Date(viewDate.getFullYear(), viewDate.getMonth(), day);
    onSelectDate(newDate);
    onClose();
  };

  // Selecionar um mês específico
  const handleSelectMonth = (month: number) => {
    if (viewMode === 'month') {
      const newDate = new Date(viewDate.getFullYear(), month, 1);
      onSelectMonth(newDate);
      onClose();
    } else {
      setViewDate(new Date(viewDate.getFullYear(), month, 1));
      setViewMode('day');
    }
  };

  // Selecionar um ano específico
  const handleSelectYear = (year: number) => {
    if (viewMode === 'year') {
      const newDate = new Date(year, 0, 1);
      onSelectYear(newDate);
      onClose();
    } else {
      setViewDate(new Date(year, viewDate.getMonth(), 1));
      setViewMode('month');
    }
  };

  // Alternar entre visualizações (dia, mês, ano)
  const toggleViewMode = () => {
    if (viewMode === 'day') {
      setViewMode('month');
    } else if (viewMode === 'month') {
      setViewMode('year');
    } else {
      setViewMode('day');
    }
  };

  // Renderizar o calendário de dias
  const renderDays = () => {
    const daysInMonth = new Date(
      viewDate.getFullYear(),
      viewDate.getMonth() + 1,
      0
    ).getDate();
    
    const firstDayOfMonth = new Date(
      viewDate.getFullYear(),
      viewDate.getMonth(),
      1
    ).getDay();
    
    const days = [];
    
    // Dias da semana - usando fallback para garantir que é um array
    const weekDaysTranslation = t('calendar.weekdays.short', { returnObjects: true });
    const weekDays = Array.isArray(weekDaysTranslation) 
      ? weekDaysTranslation 
      : ['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb'];
    
    // Cabeçalho com dias da semana
    days.push(
      <div key="weekdays" className="grid grid-cols-7 mb-1">
        {weekDays.map((day: string) => (
          <div key={day} className="text-center text-xs text-gray-500 py-1">
            {day}
          </div>
        ))}
      </div>
    );
    
    // Células do calendário
    const cells = [];
    
    // Espaços vazios para os dias antes do primeiro dia do mês
    for (let i = 0; i < firstDayOfMonth; i++) {
      cells.push(
        <div key={`empty-${i}`} className="text-center py-1"></div>
      );
    }
    
    // Dias do mês
    for (let day = 1; day <= daysInMonth; day++) {
      const date = new Date(viewDate.getFullYear(), viewDate.getMonth(), day);
      const isToday = new Date().toDateString() === date.toDateString();
      const isSelected = selectedDate && selectedDate.toDateString() === date.toDateString();
      
      cells.push(
        <div 
          key={`day-${day}`}
          onClick={() => handleSelectDay(day)}
          className={`text-center py-1 cursor-pointer hover:bg-blue-100 dark:hover:bg-blue-900/30 rounded-full w-8 h-8 mx-auto flex items-center justify-center ${
            isToday ? 'border border-blue-500' : ''
          } ${
            isSelected ? 'bg-blue-500 text-white hover:bg-blue-600' : ''
          }`}
        >
          {day}
        </div>
      );
    }
    
    days.push(
      <div key="days" className="grid grid-cols-7 gap-1">
        {cells}
      </div>
    );
    
    return days;
  };

  // Renderizar os meses
  const renderMonths = () => {
    // Meses - usando fallback para garantir que é um array
    const monthsTranslation = t('calendar.months.short', { returnObjects: true });
    const months = Array.isArray(monthsTranslation)
      ? monthsTranslation
      : [
          'Jan', 'Fev', 'Mar', 'Abr', 'Mai', 'Jun',
          'Jul', 'Ago', 'Set', 'Out', 'Nov', 'Dez'
        ];
    
    const isCurrentYear = viewDate.getFullYear() === new Date().getFullYear();
    const currentMonth = new Date().getMonth();
    
    return (
      <div className="grid grid-cols-3 gap-2">
        {months.map((month: string, index: number) => {
          const isCurrentMonth = isCurrentYear && index === currentMonth;
          const isSelected = selectedMonth && 
            selectedMonth.getMonth() === index && 
            selectedMonth.getFullYear() === viewDate.getFullYear();
          
          return (
            <div
              key={month}
              onClick={() => handleSelectMonth(index)}
              className={`text-center py-2 cursor-pointer hover:bg-blue-100 dark:hover:bg-blue-900/30 rounded-md ${
                isCurrentMonth ? 'border border-blue-500' : ''
              } ${
                isSelected ? 'bg-blue-500 text-white hover:bg-blue-600' : ''
              }`}
            >
              {month}
            </div>
          );
        })}
      </div>
    );
  };

  // Renderizar os anos
  const renderYears = () => {
    const currentYear = viewDate.getFullYear();
    const startYear = Math.floor(currentYear / 10) * 10;
    const years = [];
    
    for (let i = 0; i < 12; i++) {
      const year = startYear - 1 + i;
      const isCurrentYear = year === new Date().getFullYear();
      const isSelected = selectedYear && selectedYear.getFullYear() === year;
      
      years.push(
        <div
          key={year}
          onClick={() => handleSelectYear(year)}
          className={`text-center py-2 cursor-pointer hover:bg-blue-100 dark:hover:bg-blue-900/30 rounded-md ${
            isCurrentYear ? 'border border-blue-500' : ''
          } ${
            isSelected ? 'bg-blue-500 text-white hover:bg-blue-600' : ''
          }`}
        >
          {year}
        </div>
      );
    }
    
    return (
      <div className="grid grid-cols-3 gap-2">
        {years}
      </div>
    );
  };

  // Renderizar o cabeçalho do calendário
  const renderHeader = () => {
    let title = '';
    let prevHandler = () => {};
    let nextHandler = () => {};
    
    if (viewMode === 'day') {
      // Usar os nomes dos meses traduzidos
      const monthsTranslation = t('calendar.months.long', { returnObjects: true });
      let monthName = '';
      
      if (Array.isArray(monthsTranslation) && monthsTranslation.length > viewDate.getMonth()) {
        monthName = monthsTranslation[viewDate.getMonth()];
      } else {
        monthName = new Intl.DateTimeFormat('pt-BR', { month: 'long' }).format(viewDate);
      }
      
      title = `${monthName} ${viewDate.getFullYear()}`;
      prevHandler = prevMonth;
      nextHandler = nextMonth;
    } else if (viewMode === 'month') {
      title = viewDate.getFullYear().toString();
      prevHandler = prevYear;
      nextHandler = nextYear;
    } else {
      const startYear = Math.floor(viewDate.getFullYear() / 10) * 10;
      title = `${startYear} - ${startYear + 9}`;
      prevHandler = prevDecade;
      nextHandler = nextDecade;
    }
    
    return (
      <div className="flex justify-between items-center mb-4">
        <button 
          onClick={prevHandler}
          className="p-1 rounded-full hover:bg-gray-200 dark:hover:bg-gray-700"
        >
          <ChevronLeft className="w-5 h-5" />
        </button>
        <button 
          onClick={toggleViewMode}
          className="font-medium hover:underline"
        >
          {title}
        </button>
        <button 
          onClick={nextHandler}
          className="p-1 rounded-full hover:bg-gray-200 dark:hover:bg-gray-700"
        >
          <ChevronRight className="w-5 h-5" />
        </button>
      </div>
    );
  };

  return (
    <div className="bg-white dark:bg-gray-800 rounded-lg shadow-lg p-4 w-64">
      {renderHeader()}
      
      <div className="mt-2">
        {viewMode === 'day' && renderDays()}
        {viewMode === 'month' && renderMonths()}
        {viewMode === 'year' && renderYears()}
      </div>
      
      <div className="mt-4 flex justify-end">
        <button 
          onClick={onClose}
          className="px-3 py-1 text-sm text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-md"
        >
          {t('datePicker.cancel')}
        </button>
      </div>
    </div>
  );
};

export default function Dashboard() {
  const { t, i18n } = useTranslation('dashboard');
  const { currentOrganizationMember, session } = useAuthContext();
  
  // Estados removidos e substituídos pelo hook useDashboard
  const [loading, setLoading] = useState(false);
  const [showChatFlowModal, setShowChatFlowModal] = useState(false);
  const [showTaskModal, setShowTaskModal] = useState(false);
  
  // Estados para períodos específicos
  const [useSpecificPeriod, setUseSpecificPeriod] = useState(false);
  const [specificDate, setSpecificDate] = useState<Date | null>(null);
  const [specificMonth, setSpecificMonth] = useState<Date | null>(null);
  const [specificYear, setSpecificYear] = useState<Date | null>(null);
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [selectedTimeRange, setSelectedTimeRange] = useState('week');

  // Usar o hook useTeams para buscar as equipes
  const organizationId = currentOrganizationMember?.organization.id;
  const { data: teams = [], isLoading: teamsLoading, refetch: refetchTeams } = useTeams(organizationId);
  
  // Usar o hook useDashboard para todas as consultas do dashboard
  const {
    customerCount: { data: customerCount = 0 },
    activeChatsCount: { data: activeChatsCount = 0 },
    periodMessagesCount: { data: periodMessagesData },
    responseTime: { data: responseTimeData },
    recentChats: { data: recentChatsData = [] },
    chartData: { data: chartDataResponse },
    isLoading: isDashboardLoading
  } = useDashboard({
    organizationId,
    timeRange: selectedTimeRange as 'day' | 'week' | 'month' | 'year',
    useSpecificPeriod,
    specificDate,
    specificMonth,
    specificYear
  });

  // Extrair dados do hook
  const periodMessagesCount = periodMessagesData?.value || 0;
  const messagesChange = periodMessagesData?.change || { value: 0, type: 'increase' };
  const responseTime = responseTimeData?.value || 0;
  const responseTimeChange = responseTimeData?.change || { value: 0, type: 'increase' };

  // Formatar os recentChats
  const recentChats = recentChatsData.map(chat => ({
    id: chat.id,
    customer_name: chat.customers?.name || t('customer.anonymous'),
    last_message: chat.last_message?.content || t('noMessages'),
    time: chat.last_message_at 
      ? formatLastMessageTime(chat.last_message_at, i18n.language, t)
      : '--:--',
    status: chat.status
  }));

  // Processar dados do gráfico
  const [chartData, setChartData] = useState<any[]>([]);
  const [chartLoading, setChartLoading] = useState(true);

  useEffect(() => {
    if (chartDataResponse && teams) {
      processChartData(chartDataResponse.data, chartDataResponse.period);
      setChartLoading(false);
    }
  }, [chartDataResponse, teams]);

  const { data: tasks = [] } = useTasks(organizationId, 'pending', session?.user?.id);

  // Buscar próximos compromissos usando o hook useAppointments
  const { data: upcomingAppointments = [], isLoading: loadingAppointments } = useAppointments({
    schedule_id: undefined,
    start_date: new Date().toISOString().split('T')[0],
    end_date: undefined,
    provider_id: currentOrganizationMember?.profile_id,
    status: ['scheduled', 'confirmed']
  });

  // Efeito para depurar o carregamento das equipes
  useEffect(() => {
    console.log('Teams loaded:', teams);
    console.log('Organization ID:', organizationId);
    console.log('Teams loading:', teamsLoading);
  }, [teams, organizationId, teamsLoading]);
  
  // Efeito para recarregar as equipes quando o organizationId mudar
  useEffect(() => {
    if (organizationId) {
      refetchTeams();
    }
  }, [organizationId, refetchTeams]);

  // Subscribe to updates
  useEffect(() => {
    if (currentOrganizationMember) {
      subscribeToUpdates();
    }
  }, [currentOrganizationMember]);

  const subscribeToUpdates = () => {
    // Subscribe to chats changes
    const chatsSubscription = supabase
      .channel('chats-changes')
      .on('postgres_changes', {
        event: '*',
        schema: 'public',
        table: 'chats',
        filter: `organization_id=eq.${currentOrganizationMember?.organization.id}`
      }, () => {
        // As consultas agora são gerenciadas pelo react-query
      })
      .subscribe();

    // Subscribe to messages changes
    const messagesSubscription = supabase
      .channel('messages-changes')
      .on('postgres_changes', {
        event: '*',
        schema: 'public',
        table: 'messages',
        filter: `organization_id=eq.${currentOrganizationMember?.organization.id}`
      }, () => {
        // As consultas agora são gerenciadas pelo react-query
      })
      .subscribe();

    return () => {
      chatsSubscription.unsubscribe();
      messagesSubscription.unsubscribe();
    };
  };

  // Função para processar os dados do gráfico
  const processChartData = (data: any, period: { startDate: Date; endDate: Date; groupBy: 'hour' | 'day' | 'week' | 'month' }) => {
    try {
      const chartData: any[] = [];
      const timePoints: Record<string, any> = {};
      
      // Se não houver dados ou equipes, retornar um array vazio
      if (!data || !teams || teams.length === 0) {
        setChartData([]);
        return;
      }
      
      // Inicializar pontos de tempo com base no período
      if (period.groupBy === 'hour') {
        // Para agrupamento por hora (dia específico ou hoje)
        for (let i = 0; i < 24; i++) {
          const date = new Date(period.startDate);
          date.setHours(i, 0, 0, 0);
          const timeKey = date.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });
          timePoints[timeKey] = { name: timeKey };
          
          // Inicializar contagem zero para cada equipe
          teams.forEach(team => {
            timePoints[timeKey][team.name] = 0;
          });
        }
      } else if (period.groupBy === 'day') {
        // Para agrupamento por dia (mês específico ou última semana/mês)
        const days = (period.endDate.getTime() - period.startDate.getTime()) / (1000 * 60 * 60 * 24) + 1;
        for (let i = 0; i < days; i++) {
          const date = new Date(period.startDate);
          date.setDate(date.getDate() + i);
          const timeKey = date.toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit' });
          timePoints[timeKey] = { name: timeKey };
          
          // Inicializar contagem zero para cada equipe
          teams.forEach(team => {
            timePoints[timeKey][team.name] = 0;
          });
        }
      } else if (period.groupBy === 'month') {
        // Para agrupamento por mês (ano específico ou último ano)
        for (let i = 0; i < 12; i++) {
          const date = new Date(period.startDate.getFullYear(), period.startDate.getMonth() + i, 1);
          const timeKey = date.toLocaleDateString('pt-BR', { month: 'short' });
          timePoints[timeKey] = { name: timeKey };
          
          // Inicializar contagem zero para cada equipe
          teams.forEach(team => {
            timePoints[timeKey][team.name] = 0;
          });
        }
      }
      
      // Preencher os dados reais
      data.forEach((item: { time_period: string, team_name: string, message_count: number }) => {
        const { time_period, team_name, message_count } = item;
        
        let timeKey = '';
        if (period.groupBy === 'hour') {
          // Formatar hora
          const date = new Date(time_period);
          timeKey = date.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });
        } else if (period.groupBy === 'day') {
          // Formatar dia
          const date = new Date(time_period);
          timeKey = date.toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit' });
        } else if (period.groupBy === 'month') {
          // Formatar mês
          const date = new Date(time_period);
          timeKey = date.toLocaleDateString('pt-BR', { month: 'short' });
        }
        
        // Se o ponto de tempo existe e a equipe é conhecida
        if (timePoints[timeKey] && team_name) {
          timePoints[timeKey][team_name] = message_count;
        }
      });
      
      // Converter o objeto em array para o gráfico
      Object.values(timePoints).forEach(point => {
        chartData.push(point);
      });
      
      setChartData(chartData);
    } catch (error) {
      console.error('Erro ao processar dados do gráfico:', error);
      setChartData([]);
    }
  };

  // Função para obter o título do período atual
  const getPeriodTitle = (): string => {
    if (useSpecificPeriod) {
      if (specificDate) {
        return new Intl.DateTimeFormat('pt-BR', { day: '2-digit', month: '2-digit', year: 'numeric' }).format(specificDate);
      } else if (specificMonth) {
        return new Intl.DateTimeFormat('pt-BR', { month: 'long', year: 'numeric' }).format(specificMonth);
      } else if (specificYear) {
        return specificYear.getFullYear().toString();
      }
    }
    
    return selectedTimeRange === 'day' 
      ? t('today') 
      : selectedTimeRange === 'week' 
        ? t('week') 
        : selectedTimeRange === 'month' 
          ? t('month') 
          : t('year');
  };

  // Função para alternar entre período relativo e específico
  const togglePeriodType = () => {
    setUseSpecificPeriod(!useSpecificPeriod);
    if (!useSpecificPeriod) {
      // Ao mudar para período específico, inicializa com a data atual
      setSpecificDate(new Date());
      setSpecificMonth(null);
      setSpecificYear(null);
    } else {
      // Ao voltar para período relativo, limpa as datas específicas
      setSpecificDate(null);
      setSpecificMonth(null);
      setSpecificYear(null);
    }
  };

  // Função para selecionar o tipo de período específico
  const selectSpecificPeriodType = (type: 'day' | 'month' | 'year') => {
    const today = new Date();
    if (type === 'day') {
      setSpecificDate(today);
      setSpecificMonth(null);
      setSpecificYear(null);
    } else if (type === 'month') {
      setSpecificDate(null);
      setSpecificMonth(today);
      setSpecificYear(null);
    } else {
      setSpecificDate(null);
      setSpecificMonth(null);
      setSpecificYear(today);
    }
  };

  const formatTime = (seconds: number) => {
    const minutes = Math.floor(seconds / 60);
    const remainingSeconds = seconds % 60;
    return `${minutes}m ${remainingSeconds}s`;
  };

  const stats: StatCard[] = [
    {
      id: 'active-chats',
      title: t('activeChats'),
      description: t('activeChatsDescription'),
      value: activeChatsCount,
      icon: MessageSquare,
      bgColor: 'bg-blue-100 dark:bg-blue-900/30',
      iconColor: 'text-blue-500 dark:text-blue-400',
      textColor: 'text-blue-600 dark:text-blue-400',
      link: '/app/chats',
      change: {
        value: 12,
        type: 'increase'
      }
    },
    {
      id: 'total-customers',
      title: t('totalCustomers'),
      description: t('totalCustomersDescription'),
      value: customerCount,
      icon: Users,
      bgColor: 'bg-green-100 dark:bg-green-900/30',
      iconColor: 'text-green-500 dark:text-green-400',
      textColor: 'text-green-600 dark:text-green-400',
      link: '/app/customers',
      change: {
        value: 5,
        type: 'increase'
      }
    },
    {
      id: 'period-messages',
      title: useSpecificPeriod
        ? specificDate 
          ? t('specificDayMessages') 
          : specificMonth 
            ? t('specificMonthMessages') 
            : t('specificYearMessages')
        : selectedTimeRange === 'day' 
          ? t('todayMessages') 
          : selectedTimeRange === 'week' 
            ? t('weekMessages') 
            : selectedTimeRange === 'month' 
              ? t('monthMessages') 
              : t('yearMessages'),
      description: useSpecificPeriod
        ? t('specificPeriodMessagesDescription', { 
            period: specificDate 
              ? new Intl.DateTimeFormat('pt-BR', { day: '2-digit', month: '2-digit', year: 'numeric' }).format(specificDate)
              : specificMonth 
                ? new Intl.DateTimeFormat('pt-BR', { month: 'long', year: 'numeric' }).format(specificMonth)
                : specificYear 
                  ? specificYear.getFullYear().toString()
                  : ''
          })
        : selectedTimeRange === 'day' 
          ? t('todayMessagesDescription') 
          : t('periodMessagesDescription', { 
              period: selectedTimeRange === 'week' 
                ? t('week').toLowerCase() 
                : selectedTimeRange === 'month' 
                  ? t('month').toLowerCase() 
                  : t('year').toLowerCase() 
            }),
      value: periodMessagesCount,
      icon: MessageCircle,
      bgColor: 'bg-purple-100 dark:bg-purple-900/30',
      iconColor: 'text-purple-500 dark:text-purple-400',
      textColor: 'text-purple-600 dark:text-purple-400',
      change: messagesChange
    },
    {
      id: 'response-time',
      title: t('responseTime'),
      description: useSpecificPeriod
        ? t('responseTimePeriodDescription', { 
            period: specificDate 
              ? new Intl.DateTimeFormat('pt-BR', { day: '2-digit', month: '2-digit', year: 'numeric' }).format(specificDate)
              : specificMonth 
                ? new Intl.DateTimeFormat('pt-BR', { month: 'long', year: 'numeric' }).format(specificMonth)
                : specificYear 
                  ? specificYear.getFullYear().toString()
                  : ''
          })
        : selectedTimeRange === 'day' 
          ? t('responseTimePeriodDescription', { period: t('today').toLowerCase() }) 
          : t('responseTimePeriodDescription', { 
              period: selectedTimeRange === 'week' 
                ? t('week').toLowerCase() 
                : selectedTimeRange === 'month' 
                  ? t('month').toLowerCase() 
                  : t('year').toLowerCase() 
            }),
      value: responseTime,
      icon: Clock,
      bgColor: 'bg-amber-100 dark:bg-amber-900/30',
      iconColor: 'text-amber-500 dark:text-amber-400',
      textColor: 'text-amber-600 dark:text-amber-400',
      change: responseTimeChange
    }
  ];

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'new':
        return 'bg-blue-500';
      case 'in_progress':
        return 'bg-amber-500';
      case 'resolved':
        return 'bg-green-500';
      default:
        return 'bg-gray-500';
    }
  };

  return (
    <div className="p-6  pb-20 md:pb-6">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-8">
        <h1 className="text-2xl font-bold text-gray-900 dark:text-white">
          {t('title')}
        </h1>
        
        <div className="flex flex-col space-y-2 mt-4 md:mt-0 self-end">
          {/* Botão para alternar entre período relativo e específico */}
          <div className="flex justify-end">
            <button 
              onClick={togglePeriodType}
              className="px-3 py-1 rounded-md text-sm bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-600"
            >
              {useSpecificPeriod ? t('useRelativePeriod') : t('useSpecificPeriod')}
            </button>
          </div>
          
          {/* Seletores de período */}
          <div className="flex space-x-2">
            {useSpecificPeriod ? (
              <>
                {/* Seletores de tipo de período específico */}
                <button 
                  onClick={() => selectSpecificPeriodType('day')}
                  className={`px-3 py-1 rounded-md text-sm ${
                    specificDate ? 'bg-blue-600 text-white' : 'bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300'
                  }`}
                >
                  {t('specificDay')}
                </button>
                <button 
                  onClick={() => selectSpecificPeriodType('month')}
                  className={`px-3 py-1 rounded-md text-sm ${
                    specificMonth ? 'bg-blue-600 text-white' : 'bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300'
                  }`}
                >
                  {t('specificMonth')}
                </button>
                <button 
                  onClick={() => selectSpecificPeriodType('year')}
                  className={`px-3 py-1 rounded-md text-sm ${
                    specificYear ? 'bg-blue-600 text-white' : 'bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300'
                  }`}
                >
                  {t('specificYear')}
                </button>
                
                {/* Botão para abrir seletor de data */}
                <button 
                  onClick={() => setShowDatePicker(!showDatePicker)}
                  className="px-3 py-1 rounded-md text-sm bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300"
                >
                  {getPeriodTitle()} <span className="ml-1">▼</span>
                </button>
                
                {/* DatePicker real */}
                {showDatePicker && (
                  <div className="absolute mt-10 right-6 z-10">
                    <SimpleDatePicker
                      selectedDate={specificDate}
                      selectedMonth={specificMonth}
                      selectedYear={specificYear}
                      onSelectDate={(date) => {
                        setSpecificDate(date);
                        setSpecificMonth(null);
                        setSpecificYear(null);
                        setShowDatePicker(false);
                      }}
                      onSelectMonth={(date) => {
                        setSpecificDate(null);
                        setSpecificMonth(date);
                        setSpecificYear(null);
                        setShowDatePicker(false);
                      }}
                      onSelectYear={(date) => {
                        setSpecificDate(null);
                        setSpecificMonth(null);
                        setSpecificYear(date);
                        setShowDatePicker(false);
                      }}
                      mode={specificDate ? 'day' : specificMonth ? 'month' : 'year'}
                      onClose={() => setShowDatePicker(false)}
                    />
                  </div>
                )}
              </>
            ) : (
              <>
                {/* Botões de período relativo */}
                <button 
                  onClick={() => setSelectedTimeRange('day')}
                  className={`px-3 py-1 rounded-md text-sm ${
                    selectedTimeRange === 'day' 
                      ? 'bg-blue-600 text-white' 
                      : 'bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300'
                  }`}
                >
                  {t('today')}
                </button>
                <button 
                  onClick={() => setSelectedTimeRange('week')}
                  className={`px-3 py-1 rounded-md text-sm ${
                    selectedTimeRange === 'week' 
                      ? 'bg-blue-600 text-white' 
                      : 'bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300'
                  }`}
                >
                  {t('week')}
                </button>
                <button 
                  onClick={() => setSelectedTimeRange('month')}
                  className={`px-3 py-1 rounded-md text-sm ${
                    selectedTimeRange === 'month' 
                      ? 'bg-blue-600 text-white' 
                      : 'bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300'
                  }`}
                >
                  {t('month')}
                </button>
                <button 
                  onClick={() => setSelectedTimeRange('year')}
                  className={`px-3 py-1 rounded-md text-sm ${
                    selectedTimeRange === 'year' 
                      ? 'bg-blue-600 text-white' 
                      : 'bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300'
                  }`}
                >
                  {t('year')}
                </button>
              </>
            )}
          </div>
        </div>
      </div>

      <QuickSetupGuide />

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {stats.map(({ id, title, description, value, icon: Icon, bgColor, iconColor, textColor, link, change }) => {
          const CardContent = (
            <div className="bg-white dark:bg-gray-800 shadow-sm rounded-lg p-6 transition-transform duration-200 hover:shadow-md">
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-lg font-semibold text-gray-700 dark:text-gray-300">
                  {title}
                </h2>
                <div className={`p-3 rounded-full ${bgColor}`}>
                  <Icon className={`w-5 h-5 ${iconColor}`} />
                </div>
              </div>
              
              <div className="flex flex-col">
                <p className={`text-3xl font-bold ${textColor} ${isDashboardLoading ? 'animate-pulse' : ''}`}>
                  {isDashboardLoading ? '-' : id === 'response-time' ? formatTime(value) : value.toLocaleString()}
                </p>
                <div className="flex items-center mt-2">
                  {change && (
                    <span className={`text-xs font-medium mr-2 ${
                      id === 'response-time'
                        ? change.type === 'increase' 
                          ? 'text-red-500 dark:text-red-400' 
                          : 'text-green-500 dark:text-green-400'
                        : change.type === 'increase' 
                          ? 'text-green-500 dark:text-green-400' 
                          : 'text-red-500 dark:text-red-400'
                    }`}>
                      {change.type === 'increase' ? '↑' : '↓'} {change.value}%
                    </span>
                  )}
                  <p className="text-sm text-gray-500 dark:text-gray-400">
                    {description}
                  </p>
                </div>
              </div>

              <div className="mt-4 h-1 w-full bg-gray-200 dark:bg-gray-700 rounded">
                <div 
                  className={`h-1 rounded ${iconColor.replace('text', 'bg')}`}
                  style={{ width: isDashboardLoading ? '0%' : '100%', transition: 'width 1s ease-in-out' }}
                />
              </div>
            </div>
          );

          return (
            <div key={id}>
              {link ? (
                <Link to={link} className="block">
                  {CardContent}
                </Link>
              ) : (
                CardContent
              )}
            </div>
          );
        })}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mt-8">
        <div className="lg:col-span-2 bg-white dark:bg-gray-800 rounded-lg shadow-sm px-6 pt-6 pb-3">
          <div className="flex justify-between items-center mb-4">
            <h2 className="text-lg font-semibold text-gray-900 dark:text-white">
              {teams.length > 0 ? t('messagesByTeam') : t('activityOverview')}
            </h2>
            <div className="flex items-center">
              <div className="flex items-center text-sm text-gray-500 dark:text-gray-400">
                <BarChart2 className="w-4 h-4 mr-1" />
                {t('statisticsFor')} {
                  useSpecificPeriod
                    ? getPeriodTitle()
                    : selectedTimeRange === 'day' 
                      ? t('today') 
                      : selectedTimeRange === 'week' 
                        ? t('lastWeek') 
                        : selectedTimeRange === 'month' 
                          ? t('lastMonth') 
                          : t('lastYear')
                }
              </div>
            </div>
          </div>
          
          <div className="h-[28rem] md:h-[32rem] lg:h-[28rem]">
            {chartLoading ? (
              <div className="h-full flex flex-col items-center justify-center text-center p-6">
                <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-blue-500 mb-4"></div>
                <p className="text-gray-500 dark:text-gray-400 mb-2">
                  {t('loading')}...
                </p>
              </div>
            ) : teams.length > 0 ? (
              <ResponsiveContainer width="100%" height="100%">
                <LineChart
                  data={chartData}
                  margin={{
                    top: 5,
                    right: 30,
                    left: 20,
                    bottom: 0,
                  }}
                >
                  <CartesianGrid strokeDasharray="3 3" stroke="#374151" opacity={0.1} />
                  <XAxis 
                    dataKey="name" 
                    stroke="#6B7280" 
                    fontSize={12}
                    tickLine={false}
                  />
                  <YAxis 
                    stroke="#6B7280" 
                    fontSize={12}
                    tickLine={false}
                    axisLine={false}
                    padding={{ top: 10, bottom: 0 }}
                    allowDecimals={false}
                  />
                  <Tooltip 
                    contentStyle={{ 
                      backgroundColor: 'rgba(255, 255, 255, 0.95)', 
                      borderRadius: '0.5rem',
                      border: 'none',
                      boxShadow: '0 4px 10px -1px rgba(0, 0, 0, 0.2)',
                      padding: '10px'
                    }}
                    labelStyle={{
                      fontWeight: 'bold',
                      marginBottom: '5px'
                    }}
                    itemStyle={{
                      padding: '2px 0'
                    }}
                  />
                  {/* Renderizar uma linha para cada equipe com cores diferentes */}
                  {teams && teams.length > 0 && teams
                    .filter(team => {
                      // Verificar se há dados para esta equipe em pelo menos um ponto
                      return chartData.some(point => point[team.name] !== undefined && point[team.name] !== 0);
                    })
                    .map((team, index) => {
                    // Array de cores para as linhas
                    const colors = ['#8B5CF6', '#3B82F6', '#EC4899', '#10B981', '#F59E0B', '#EF4444', '#6366F1'];
                    const color = colors[index % colors.length];
                    
                    return (
                      <Line 
                        key={team.id}
                        type="monotone" 
                        dataKey={team.name} 
                        stroke={color} 
                        strokeWidth={2}
                        dot={{ r: 4, strokeWidth: 2 }}
                        activeDot={{ r: 6, strokeWidth: 2 }}
                        name={team.name}
                      />
                    );
                  })}
                </LineChart>
              </ResponsiveContainer>
            ) : (
              <div className="h-full flex flex-col items-center justify-center text-center p-6">
                <BarChart2 className="h-16 w-16 text-gray-300 dark:text-gray-600 mb-4" />
                <p className="text-gray-500 dark:text-gray-400 mb-2">
                  {t('noTeamData')}
                </p>
                <p className="text-sm text-gray-400 dark:text-gray-500 max-w-md">
                  {t('teamActivity')}
                </p>
              </div>
            )}
          </div>
        </div>

        <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm p-6">
          <div className="flex justify-between items-center mb-6">
            <h2 className="text-lg font-semibold text-gray-900 dark:text-white">
              {t('recentChats')}
            </h2>
            <Link 
              to="/app/chats" 
              className="text-sm text-blue-600 dark:text-blue-400 hover:underline"
            >
              {t('viewAll')}
            </Link>
          </div>
          
          <div className="space-y-4">
            {loading ? (
              Array(5).fill(0).map((_, index) => (
                <div key={index} className="animate-pulse flex items-center p-3">
                  <div className="rounded-full bg-gray-300 dark:bg-gray-600 h-10 w-10"></div>
                  <div className="ml-4 flex-1">
                    <div className="h-4 bg-gray-300 dark:bg-gray-600 rounded w-3/4 mb-2"></div>
                    <div className="h-3 bg-gray-300 dark:bg-gray-600 rounded w-1/2"></div>
                  </div>
                </div>
              ))
            ) : recentChats.length > 0 ? (
              recentChats.map((chat) => (
                <Link 
                  key={chat.id} 
                  to={`/app/chats/${chat.id}`}
                  className="flex items-start p-3 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors"
                >
                  <div className="flex-shrink-0 relative">
                    <div className="h-10 w-10 rounded-full bg-gray-200 dark:bg-gray-700 flex items-center justify-center text-gray-500 dark:text-gray-400">
                      {chat.customer_name.charAt(0).toUpperCase()}
                    </div>
                    <div className={`absolute -bottom-1 -right-1 h-3 w-3 rounded-full ${getStatusColor(chat.status)}`}></div>
                  </div>
                  <div className="ml-3 flex-1 min-w-0">
                    <div className="flex justify-between">
                      <p className="text-sm font-medium text-gray-900 dark:text-white truncate">
                        {chat.customer_name}
                      </p>
                      <p className="text-xs text-gray-500 dark:text-gray-400">
                        {chat.time}
                      </p>
                    </div>
                    <p className="text-sm text-gray-500 dark:text-gray-400 truncate">
                      {chat.last_message}
                    </p>
                  </div>
                </Link>
              ))
            ) : (
              <div className="flex flex-col items-center justify-center py-8 text-center">
                <MessageCircle className="h-12 w-12 text-gray-400 mb-4" />
                <p className="text-gray-500 dark:text-gray-400">
                  {t('noRecentChats')}
                </p>
              </div>
            )}
          </div>
          
          <div className="mt-6">
            <button
              onClick={() => setShowChatFlowModal(true)}
              className="block w-full py-2 px-4 text-center text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 rounded-md transition-colors"
            >
              {t('startNewChat')}
            </button>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mt-8">
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm p-6">
          <div className="flex justify-between items-center mb-6">
            <h2 className="text-lg font-semibold text-gray-900 dark:text-white">
              {t('upcomingTasks')}
            </h2>
            <Link 
              to="/app/tasks" 
              className="text-sm text-blue-600 dark:text-blue-400 hover:underline"
            >
              {t('viewAll')}
            </Link>
          </div>
          
          <div className="space-y-3">
            {tasks.map((task) => (
              <div 
                key={task.id}
                className="flex items-center p-3 border border-gray-100 dark:border-gray-700 rounded-lg"
              >
                <div className={`h-4 w-4 rounded-full mr-3 ${
                  task.priority === 'high' 
                    ? 'bg-red-500' 
                    : task.priority === 'medium' 
                      ? 'bg-amber-500' 
                      : 'bg-green-500'
                }`}></div>
                <div className="flex-1">
                  <p className="text-sm font-medium text-gray-900 dark:text-white">
                    {task.title}
                  </p>
                  {task.customer && (
                    <p className="text-xs text-gray-500 dark:text-gray-400">
                      {task.customer.name}
                    </p>
                  )}
                </div>
                <div className="flex items-center">
                  <Calendar className="h-4 w-4 text-gray-400 mr-1" />
                  <span className="text-xs text-gray-500 dark:text-gray-400">
                    {new Date(task.due_date).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}
                  </span>
                </div>
              </div>
            ))}
          </div>
          
          <div className="mt-6">
            <button 
              onClick={() => setShowTaskModal(true)}
              className="flex items-center justify-center w-full py-2 px-4 text-sm font-medium text-blue-600 dark:text-blue-400 border border-blue-600 dark:border-blue-400 rounded-md hover:bg-blue-50 dark:hover:bg-blue-900/30 transition-colors"
            >
              <span className="mr-2">+</span> {t('addNewTask')}
            </button>
          </div>
        </div>
        
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm p-6">
          <div className="flex justify-between items-center mb-6">
            <h2 className="text-lg font-semibold text-gray-900 dark:text-white">
              {t('performanceMetrics')}
            </h2>
            <div className="text-sm text-gray-500 dark:text-gray-400">
              <TrendingUp className="w-4 h-4 inline mr-1" />
              {t('thisMonth')}
            </div>
          </div>
          
          <div className="space-y-6">
            {[
              { 
                label: t('satisfactionRate'), 
                value: 92, 
                change: 3, 
                changeType: 'increase',
                color: 'bg-green-500' 
              },
              { 
                label: t('firstResponseTime'), 
                value: 65, 
                change: 12, 
                changeType: 'decrease',
                color: 'bg-blue-500' 
              },
              { 
                label: t('resolutionRate'), 
                value: 78, 
                change: 5, 
                changeType: 'increase',
                color: 'bg-purple-500' 
              }
            ].map((metric, index) => (
              <div key={index}>
                <div className="flex justify-between items-center mb-2">
                  <div className="text-sm font-medium text-gray-700 dark:text-gray-300">
                    {metric.label}
                  </div>
                  <div className="flex items-center">
                    <span className="text-lg font-bold text-gray-900 dark:text-white mr-2">
                      {metric.value}%
                    </span>
                    <span className={`text-xs font-medium ${
                      metric.changeType === 'increase' 
                        ? 'text-green-500' 
                        : 'text-red-500'
                    }`}>
                      {metric.changeType === 'increase' ? '↑' : '↓'} {metric.change}%
                    </span>
                  </div>
                </div>
                <div className="h-2 w-full bg-gray-200 dark:bg-gray-700 rounded-full">
                  <div 
                    className={`h-2 rounded-full ${metric.color}`}
                    style={{ width: `${metric.value}%` }}
                  ></div>
                </div>
              </div>
            ))}
          </div>
          
          <div className="mt-6 p-4 bg-amber-50 dark:bg-amber-900/20 rounded-lg border border-amber-100 dark:border-amber-800/30">
            <div className="flex">
              <AlertCircle className="h-5 w-5 text-amber-500 mr-2 flex-shrink-0" />
              <div>
                <p className="text-sm font-medium text-amber-800 dark:text-amber-300">
                  {t('attentionNeeded')}
                </p>
                <p className="text-xs text-amber-700 dark:text-amber-400 mt-1">
                  {t('attentionNeededDescription')}
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Nova seção de compromissos */}
      <div className="mt-8">
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm p-6">
          <div className="flex justify-between items-center mb-6">
            <h2 className="text-lg font-semibold text-gray-900 dark:text-white">
              {t('upcomingAppointments')}
            </h2>
            <Link 
              to="/app/appointments?create=true" 
              className="text-sm text-blue-600 dark:text-blue-400 hover:underline"
            >
              {t('viewAll')}
            </Link>
          </div>
          
          <div className="space-y-4">
            {loadingAppointments ? (
              Array(3).fill(0).map((_, index) => (
                <div key={index} className="animate-pulse flex items-center p-3">
                  <div className="rounded-full bg-gray-300 dark:bg-gray-600 h-10 w-10"></div>
                  <div className="ml-4 flex-1">
                    <div className="h-4 bg-gray-300 dark:bg-gray-600 rounded w-3/4 mb-2"></div>
                    <div className="h-3 bg-gray-300 dark:bg-gray-600 rounded w-1/2"></div>
                  </div>
                </div>
              ))
            ) : upcomingAppointments.length > 0 ? (
              upcomingAppointments.map((appointment) => (
                <div 
                  key={appointment.id}
                  className="flex items-center p-3 border border-gray-100 dark:border-gray-700 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors"
                >
                  <div className="flex-shrink-0">
                    <div className="h-10 w-10 rounded-full bg-blue-100 dark:bg-blue-900/30 flex items-center justify-center">
                      <Calendar className="h-5 w-5 text-blue-600 dark:text-blue-400" />
                    </div>
                  </div>
                  <div className="ml-4 flex-1">
                    <div className="flex items-center justify-between">
                      <p className="text-sm font-medium text-gray-900 dark:text-white">
                        {appointment.customer?.name || t('noCustomer')}
                      </p>
                      <span className={`text-xs px-2 py-1 rounded-full ${
                        appointment.status === 'confirmed' 
                          ? 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400'
                          : 'bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-400'
                      }`}>
                        {t(appointment.status)}
                      </span>
                    </div>
                    <p className="text-sm text-gray-500 dark:text-gray-400">
                      {appointment.service?.title || t('untitledService')}
                    </p>
                  </div>
                  <div className="flex items-center text-sm text-gray-500 dark:text-gray-400">
                    <Clock className="h-4 w-4 mr-1" />
                    <span>
                      {new Date(`${appointment.date}T${appointment.start_time}`).toLocaleDateString('pt-BR', { 
                        day: '2-digit', 
                        month: '2-digit',
                        hour: '2-digit',
                        minute: '2-digit'
                      })}
                    </span>
                  </div>
                </div>
              ))
            ) : (
              <div className="flex flex-col items-center justify-center py-8 text-center">
                <Calendar className="h-12 w-12 text-gray-400 mb-4" />
                <p className="text-gray-500 dark:text-gray-400">
                  {t('noUpcomingAppointments')}
                </p>
              </div>
            )}
          </div>
          
          <div className="mt-6">
            <Link 
              to="/app/appointments?create=true"
              className="flex items-center justify-center w-full py-2 px-4 text-sm font-medium text-blue-600 dark:text-blue-400 border border-blue-600 dark:border-blue-400 rounded-md hover:bg-blue-50 dark:hover:bg-blue-900/30 transition-colors"
            >
              <Calendar className="h-4 w-4 mr-2" />
              {t('scheduleNewAppointment')}
            </Link>
          </div>
        </div>
      </div>

      {/* Modal para iniciar nova conversa */}
      {showChatFlowModal && (
        <ChatFlowModal onClose={() => setShowChatFlowModal(false)} />
      )}

      {/* Modal para criar nova tarefa */}
      {showTaskModal && (
        <TaskModal 
          onClose={() => setShowTaskModal(false)}
          organizationId={organizationId}
          mode="create"
        />
      )}
    </div>
  );
}