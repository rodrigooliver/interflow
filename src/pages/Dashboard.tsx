import React, { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { MessageSquare, Users, MessageCircle, BarChart2, Calendar, TrendingUp, Clock, AlertCircle } from 'lucide-react';
import { supabase } from '../lib/supabase';
import { Link } from 'react-router-dom';
import { useOrganizationContext } from '../contexts/OrganizationContext';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';

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

export default function Dashboard() {
  const { t } = useTranslation('dashboard');
  const { currentOrganization } = useOrganizationContext();
  const [customerCount, setCustomerCount] = useState(0);
  const [activeChatsCount, setActiveChatsCount] = useState(0);
  const [todayMessagesCount, setTodayMessagesCount] = useState(0);
  const [responseTime, setResponseTime] = useState(0);
  const [loading, setLoading] = useState(true);
  const [recentChats, setRecentChats] = useState<ChatData[]>([]);
  const [chartData, setChartData] = useState([]);
  const [selectedTimeRange, setSelectedTimeRange] = useState('week');

  useEffect(() => {
    if (currentOrganization) {
      loadStats();
      loadRecentChats();
      loadChartData(selectedTimeRange);
      subscribeToUpdates();
    }
  }, [currentOrganization, selectedTimeRange]);

  const subscribeToUpdates = () => {
    // Subscribe to chats changes
    const chatsSubscription = supabase
      .channel('chats-changes')
      .on('postgres_changes', {
        event: '*',
        schema: 'public',
        table: 'chats',
        filter: `organization_id=eq.${currentOrganization?.id}`
      }, () => {
        loadActiveChatsCount();
        loadRecentChats();
      })
      .subscribe();

    // Subscribe to messages changes
    const messagesSubscription = supabase
      .channel('messages-changes')
      .on('postgres_changes', {
        event: '*',
        schema: 'public',
        table: 'messages',
        filter: `organization_id=eq.${currentOrganization?.id}`
      }, () => {
        loadTodayMessagesCount();
        loadChartData(selectedTimeRange);
      })
      .subscribe();

    return () => {
      chatsSubscription.unsubscribe();
      messagesSubscription.unsubscribe();
    };
  };

  async function loadStats() {
    try {
      await Promise.all([
        loadCustomerCount(),
        loadActiveChatsCount(),
        loadTodayMessagesCount(),
        loadResponseTime()
      ]);
    } finally {
      setLoading(false);
    }
  }

  async function loadCustomerCount() {
    try {
      const { count, error } = await supabase
        .from('customers')
        .select('*', { count: 'exact', head: true })
        .eq('organization_id', currentOrganization?.id);

      if (error) throw error;
      setCustomerCount(count || 0);
    } catch (error) {
      console.error('Error loading customer count:', error);
    }
  }

  async function loadActiveChatsCount() {
    try {
      const { count, error } = await supabase
        .from('chats')
        .select('*', { count: 'exact', head: true })
        .eq('organization_id', currentOrganization?.id)
        .eq('status', 'in_progress');

      if (error) throw error;
      setActiveChatsCount(count || 0);
    } catch (error) {
      console.error('Error loading active chats count:', error);
    }
  }

  async function loadTodayMessagesCount() {
    try {
      // Get today's date at midnight in UTC
      const today = new Date();
      today.setUTCHours(0, 0, 0, 0);

      const { count, error } = await supabase
        .from('messages')
        .select('*', { count: 'exact', head: true })
        .eq('organization_id', currentOrganization?.id)
        .gte('created_at', today.toISOString());

      if (error) throw error;
      setTodayMessagesCount(count || 0);
    } catch (error) {
      console.error('Error loading today\'s messages count:', error);
    }
  }

  async function loadResponseTime() {
    // Simulando um tempo médio de resposta de 5 minutos (em segundos)
    setResponseTime(300);
  }

  async function loadRecentChats() {
    try {
      const { data, error } = await supabase
        .from('chats')
        .select(`
          id,
          customers(name),
          status,
          messages(content, created_at)
        `)
        .eq('organization_id', currentOrganization?.id)
        .order('updated_at', { ascending: false })
        .limit(5);

      if (error) throw error;

      const formattedChats = data.map(chat => {
        const lastMessage = chat.messages && chat.messages.length > 0 
          ? chat.messages[chat.messages.length - 1] 
          : null;
        
        return {
          id: chat.id,
          customer_name: chat.customers?.name || 'Cliente',
          last_message: lastMessage?.content || 'Sem mensagens',
          time: lastMessage?.created_at 
            ? new Date(lastMessage.created_at).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'}) 
            : '--:--',
          status: chat.status
        };
      });

      setRecentChats(formattedChats);
    } catch (error) {
      console.error('Error loading recent chats:', error);
    }
  }

  async function loadChartData(timeRange) {
    // Simulando dados de gráfico para diferentes períodos
    const today = new Date();
    let data = [];

    if (timeRange === 'week') {
      // Dados para a última semana
      for (let i = 6; i >= 0; i--) {
        const date = new Date(today);
        date.setDate(date.getDate() - i);
        data.push({
          name: date.toLocaleDateString('pt-BR', { weekday: 'short' }),
          messages: Math.floor(Math.random() * 100) + 20,
          chats: Math.floor(Math.random() * 30) + 5,
        });
      }
    } else if (timeRange === 'month') {
      // Dados para o último mês (últimos 30 dias agrupados por semana)
      for (let i = 4; i >= 0; i--) {
        const date = new Date(today);
        date.setDate(date.getDate() - (i * 7));
        data.push({
          name: `Sem ${4-i}`,
          messages: Math.floor(Math.random() * 500) + 100,
          chats: Math.floor(Math.random() * 150) + 30,
        });
      }
    } else {
      // Dados para o último ano (12 meses)
      for (let i = 11; i >= 0; i--) {
        const date = new Date(today);
        date.setMonth(date.getMonth() - i);
        data.push({
          name: date.toLocaleDateString('pt-BR', { month: 'short' }),
          messages: Math.floor(Math.random() * 2000) + 500,
          chats: Math.floor(Math.random() * 600) + 100,
        });
      }
    }

    setChartData(data);
  }

  const formatTime = (seconds) => {
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
      id: 'today-messages',
      title: t('todayMessages'),
      description: t('todayMessagesDescription'),
      value: todayMessagesCount,
      icon: MessageCircle,
      bgColor: 'bg-purple-100 dark:bg-purple-900/30',
      iconColor: 'text-purple-500 dark:text-purple-400',
      textColor: 'text-purple-600 dark:text-purple-400',
      change: {
        value: 23,
        type: 'increase'
      }
    },
    {
      id: 'response-time',
      title: t('responseTime'),
      description: t('responseTimeDescription'),
      value: responseTime,
      icon: Clock,
      bgColor: 'bg-amber-100 dark:bg-amber-900/30',
      iconColor: 'text-amber-500 dark:text-amber-400',
      textColor: 'text-amber-600 dark:text-amber-400',
      change: {
        value: 8,
        type: 'decrease'
      }
    }
  ];

  const getStatusColor = (status) => {
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
    <div className="p-6">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-8">
        <h1 className="text-2xl font-bold text-gray-900 dark:text-white">
          {t('title')}
        </h1>
        <div className="flex space-x-2 mt-4 md:mt-0">
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
        </div>
      </div>

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
                <p className={`text-3xl font-bold ${textColor} ${loading ? 'animate-pulse' : ''}`}>
                  {loading ? '-' : id === 'response-time' ? formatTime(value) : value.toLocaleString()}
                </p>
                <div className="flex items-center mt-2">
                  {change && (
                    <span className={`text-xs font-medium mr-2 ${
                      change.type === 'increase' 
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
                  style={{ width: loading ? '0%' : '100%', transition: 'width 1s ease-in-out' }}
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
        <div className="lg:col-span-2 bg-white dark:bg-gray-800 rounded-lg shadow-sm p-6">
          <div className="flex justify-between items-center mb-6">
            <h2 className="text-lg font-semibold text-gray-900 dark:text-white">
              {t('activityOverview')}
            </h2>
            <div className="flex items-center text-sm text-gray-500 dark:text-gray-400">
              <BarChart2 className="w-4 h-4 mr-1" />
              {t('statisticsFor')} {selectedTimeRange === 'week' ? t('lastWeek') : selectedTimeRange === 'month' ? t('lastMonth') : t('lastYear')}
            </div>
          </div>
          
          <div className="h-80">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart
                data={chartData}
                margin={{
                  top: 5,
                  right: 30,
                  left: 20,
                  bottom: 5,
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
                />
                <Tooltip 
                  contentStyle={{ 
                    backgroundColor: 'rgba(255, 255, 255, 0.8)', 
                    borderRadius: '0.5rem',
                    border: 'none',
                    boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)'
                  }} 
                />
                <Line 
                  type="monotone" 
                  dataKey="messages" 
                  stroke="#8B5CF6" 
                  strokeWidth={2}
                  dot={{ r: 4, strokeWidth: 2 }}
                  activeDot={{ r: 6, strokeWidth: 2 }}
                  name={t('messages')}
                />
                <Line 
                  type="monotone" 
                  dataKey="chats" 
                  stroke="#3B82F6" 
                  strokeWidth={2}
                  dot={{ r: 4, strokeWidth: 2 }}
                  activeDot={{ r: 6, strokeWidth: 2 }}
                  name={t('chats')}
                />
              </LineChart>
            </ResponsiveContainer>
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
            <Link
              to="/app/chats/new"
              className="block w-full py-2 px-4 text-center text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 rounded-md transition-colors"
            >
              {t('startNewChat')}
            </Link>
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
            {[
              { id: 1, title: 'Responder cliente ABC', due: '14:30', priority: 'high' },
              { id: 2, title: 'Enviar proposta comercial', due: '16:00', priority: 'medium' },
              { id: 3, title: 'Agendar reunião de follow-up', due: 'Amanhã', priority: 'low' },
            ].map((task) => (
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
                </div>
                <div className="flex items-center">
                  <Calendar className="h-4 w-4 text-gray-400 mr-1" />
                  <span className="text-xs text-gray-500 dark:text-gray-400">
                    {task.due}
                  </span>
                </div>
              </div>
            ))}
          </div>
          
          <div className="mt-6">
            <button className="flex items-center justify-center w-full py-2 px-4 text-sm font-medium text-blue-600 dark:text-blue-400 border border-blue-600 dark:border-blue-400 rounded-md hover:bg-blue-50 dark:hover:bg-blue-900/30 transition-colors">
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
    </div>
  );
}