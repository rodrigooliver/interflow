import { useQuery } from '@tanstack/react-query';
import { supabase } from '../lib/supabase';
import { Chat } from '../types/database';

// Constantes para configuração de cache (em milissegundos)
const CACHE_CONFIG = {
  // Contadores e estatísticas básicas
  COUNTERS: {
    staleTime: 30 * 60 * 1000, // 30 minutos
    cacheTime: 2 * 60 * 60 * 1000, // 2 horas
  },
  // Estatísticas de período
  PERIOD_METRICS: {
    staleTime: 1 * 60 * 60 * 1000, // 1 hora
    cacheTime: 4 * 60 * 60 * 1000, // 4 horas
  },
  // Chats recentes
  CHATS: {
    staleTime: 15 * 60 * 1000, // 15 minutos
    cacheTime: 1 * 60 * 60 * 1000, // 1 hora
  },
  // Dados para gráficos
  CHART_DATA: {
    staleTime: 1 * 60 * 60 * 1000, // 1 hora
    cacheTime: 6 * 60 * 60 * 1000, // 6 horas
  }
};

interface UseDashboardParams {
  organizationId?: string;
  timeRange: 'day' | 'week' | 'month' | 'year';
  useSpecificPeriod: boolean;
  specificDate: Date | null;
  specificMonth: Date | null;
  specificYear: Date | null;
}

// Função auxiliar para formatar datas para o formato esperado pelo banco de dados
const formatDateForDB = (date: Date): string => {
  return date.toISOString().split('T')[0];
};

export const useDashboard = ({
  organizationId,
  timeRange,
  useSpecificPeriod,
  specificDate,
  specificMonth,
  specificYear
}: UseDashboardParams) => {
  // Verificar se tem organizationId antes de fazer qualquer consulta
  const enabled = !!organizationId;

  // Consulta para contar clientes
  const customerCount = useQuery({
    queryKey: ['customerCount', organizationId],
    queryFn: async () => {
      const { count, error } = await supabase
        .from('customers')
        .select('*', { count: 'exact', head: true })
        .eq('organization_id', organizationId);

      if (error) throw error;
      return count || 0;
    },
    staleTime: CACHE_CONFIG.COUNTERS.staleTime, 
    gcTime: CACHE_CONFIG.COUNTERS.cacheTime,
    refetchOnWindowFocus: false,
    enabled
  });

  // Consulta para contar chats ativos
  const activeChatsCount = useQuery({
    queryKey: ['activeChatsCount', organizationId],
    queryFn: async () => {
      const { count, error } = await supabase
        .from('chats')
        .select('*', { count: 'exact', head: true })
        .eq('organization_id', organizationId)
        .eq('status', 'in_progress');

      if (error) throw error;
      return count || 0;
    },
    staleTime: CACHE_CONFIG.COUNTERS.staleTime,
    gcTime: CACHE_CONFIG.COUNTERS.cacheTime,
    refetchOnWindowFocus: false,
    enabled
  });

  // Parâmetros para consultas com período
  const getPeriodParams = () => {
    const params: Record<string, unknown> = { 
      org_id: organizationId
    };
    
    if (useSpecificPeriod) {
      if (specificDate) {
        params.current_specific_date = formatDateForDB(specificDate);
      } else if (specificMonth) {
        params.current_specific_month = formatDateForDB(specificMonth);
      } else if (specificYear) {
        params.current_specific_year = formatDateForDB(specificYear);
      }
    } else {
      params.current_period = timeRange;
    }
    
    return params;
  };

  // Consulta para contar mensagens do período
  const periodMessagesCount = useQuery({
    queryKey: ['periodMessagesCount', organizationId, timeRange, useSpecificPeriod, specificDate, specificMonth, specificYear],
    queryFn: async () => {
      const params = {
        ...getPeriodParams(),
        metric: 'messages_count'
      };
      
      const { data, error } = await supabase.rpc(
        'calculate_percentage_change',
        params
      );

      if (error) throw error;
      
      return {
        value: data?.current_value || 0,
        change: {
          value: data?.value || 0,
          type: data?.type === 'increase' ? 'increase' : 'decrease'
        }
      };
    },
    staleTime: CACHE_CONFIG.PERIOD_METRICS.staleTime,
    gcTime: CACHE_CONFIG.PERIOD_METRICS.cacheTime,
    refetchOnWindowFocus: false,
    enabled
  });

  // Consulta para tempo médio de resposta
  const responseTime = useQuery({
    queryKey: ['responseTime', organizationId, timeRange, useSpecificPeriod, specificDate, specificMonth, specificYear],
    queryFn: async () => {
      const params = {
        ...getPeriodParams(),
        metric: 'response_time'
      };
      
      const { data, error } = await supabase.rpc(
        'calculate_percentage_change',
        params
      );

      if (error) throw error;
      
      return {
        value: data?.current_value || 0,
        change: {
          value: data?.value || 0,
          type: data?.type === 'increase' ? 'increase' : 'decrease'
        }
      };
    },
    staleTime: CACHE_CONFIG.PERIOD_METRICS.staleTime,
    gcTime: CACHE_CONFIG.PERIOD_METRICS.cacheTime, 
    refetchOnWindowFocus: false,
    enabled
  });

  // Consulta para chats recentes
  const recentChats = useQuery({
    queryKey: ['recentChats', organizationId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('chats')
        .select(`
          *,
          customer:customers!chats_customer_id_fkey(
            id,
            name,
            email,
            whatsapp,
            stage_id,
            is_spam,
            profile_picture,
            tags:customer_tags(
              tag_id,
              tags:tags(
                id,
                name,
                color
              )
            ),
            stage:crm_stages(
              id,
              name
            )
          ),
          channel:chat_channels(
            type,
            is_connected,
            name
          ),
          last_message:messages!chats_last_message_id_fkey(
            content,
            status,
            error_message,
            created_at,
            sender_type,
            type
          )
        `)
        .eq('organization_id', organizationId)
        .order('last_message_at', { ascending: false })
        .limit(4);

      if (error) throw error;

      return data as Chat[];
    },
    staleTime: CACHE_CONFIG.CHATS.staleTime,
    gcTime: CACHE_CONFIG.CHATS.cacheTime,
    refetchOnWindowFocus: false,
    enabled
  });

  // Consulta para dados do gráfico
  const chartData = useQuery({
    queryKey: ['chartData', organizationId, timeRange, useSpecificPeriod, specificDate, specificMonth, specificYear],
    queryFn: async () => {
      // Definir parâmetros de data com base no período selecionado
      let startDate: Date;
      let endDate: Date = new Date();
      let groupBy: 'hour' | 'day' | 'week' | 'month';
      
      if (specificDate) {
        startDate = new Date(specificDate);
        startDate.setHours(0, 0, 0, 0);
        endDate = new Date(specificDate);
        endDate.setHours(23, 59, 59, 999);
        groupBy = 'hour';
      } else if (specificMonth) {
        startDate = new Date(specificMonth.getFullYear(), specificMonth.getMonth(), 1);
        endDate = new Date(specificMonth.getFullYear(), specificMonth.getMonth() + 1, 0, 23, 59, 59, 999);
        groupBy = 'day';
      } else if (specificYear) {
        startDate = new Date(specificYear.getFullYear(), 0, 1);
        endDate = new Date(specificYear.getFullYear(), 11, 31, 23, 59, 59, 999);
        groupBy = 'month';
      } else if (timeRange === 'day') {
        startDate = new Date();
        startDate.setHours(0, 0, 0, 0);
        groupBy = 'hour';
      } else if (timeRange === 'week') {
        startDate = new Date();
        startDate.setDate(startDate.getDate() - 6);
        startDate.setHours(0, 0, 0, 0);
        groupBy = 'day';
      } else if (timeRange === 'month') {
        startDate = new Date();
        startDate.setDate(startDate.getDate() - 29);
        startDate.setHours(0, 0, 0, 0);
        groupBy = 'day';
      } else {
        startDate = new Date();
        startDate.setFullYear(startDate.getFullYear() - 1);
        startDate.setDate(1);
        startDate.setHours(0, 0, 0, 0);
        groupBy = 'month';
      }
      
      // Formatar datas para o formato ISO
      const startDateISO = startDate.toISOString();
      const endDateISO = endDate.toISOString();
      
      // Buscar mensagens agrupadas por período e equipe
      const { data, error } = await supabase.rpc('get_messages_by_team', {
        org_id: organizationId,
        start_date: startDateISO,
        end_date: endDateISO,
        group_by: groupBy
      });
      
      if (error) throw error;
      
      return {
        data,
        period: {
          startDate,
          endDate,
          groupBy
        }
      };
    },
    staleTime: CACHE_CONFIG.CHART_DATA.staleTime,
    gcTime: CACHE_CONFIG.CHART_DATA.cacheTime,
    refetchOnWindowFocus: false,
    enabled
  });

  return {
    customerCount,
    activeChatsCount,
    periodMessagesCount,
    responseTime,
    recentChats,
    chartData,
    isLoading: 
      customerCount.isLoading || 
      activeChatsCount.isLoading || 
      periodMessagesCount.isLoading || 
      responseTime.isLoading || 
      recentChats.isLoading || 
      chartData.isLoading,
    isFetching: 
      customerCount.isFetching || 
      activeChatsCount.isFetching || 
      periodMessagesCount.isFetching || 
      responseTime.isFetching || 
      recentChats.isFetching || 
      chartData.isFetching
  };
}; 