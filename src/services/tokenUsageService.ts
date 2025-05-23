import { supabase } from '../lib/supabase';
import type { 
  TokenUsage, 
  MonthlyTokenUsageReport, 
  CustomerTokenUsageReport,
  TokenUsageFilterOptions,
  TokenSourceType 
} from '../types/tokenUsage';

export class TokenUsageService {
  /**
   * Busca registros de uso de tokens com filtros
   */
  static async getTokenUsage(filters: TokenUsageFilterOptions): Promise<TokenUsage[]> {
    try {
      let query = supabase
        .from('token_usage')
        .select('*')
        .eq('organization_id', filters.organization_id)
        .order('created_at', { ascending: false });

      if (filters.start_date) {
        query = query.gte('created_at', filters.start_date);
      }

      if (filters.end_date) {
        query = query.lte('created_at', filters.end_date);
      }

      if (filters.token_source) {
        query = query.eq('token_source', filters.token_source);
      }

      if (filters.customer_id) {
        query = query.eq('customer_id', filters.customer_id);
      }

      if (filters.chat_id) {
        query = query.eq('chat_id', filters.chat_id);
      }

      if (filters.integration_id) {
        query = query.eq('integration_id', filters.integration_id);
      }

      if (filters.model_name) {
        query = query.eq('model_name', filters.model_name);
      }

      const { data, error } = await query;

      if (error) {
        console.error('Erro ao buscar uso de tokens:', error);
        return [];
      }

      return data || [];
    } catch (error) {
      console.error('Erro inesperado ao buscar uso de tokens:', error);
      return [];
    }
  }

  /**
   * Gera relatório mensal de uso de tokens
   */
  static async getMonthlyReport(
    organizationId: string,
    year: number,
    month: number,
    tokenSource?: TokenSourceType
  ): Promise<MonthlyTokenUsageReport[]> {
    try {
      const { data, error } = await supabase
        .rpc('get_monthly_token_usage_report', {
          p_organization_id: organizationId,
          p_year: year,
          p_month: month,
          p_token_source: tokenSource || null
        });

      if (error) {
        console.error('Erro ao gerar relatório mensal:', error);
        return [];
      }

      return data || [];
    } catch (error) {
      console.error('Erro inesperado ao gerar relatório mensal:', error);
      return [];
    }
  }

  /**
   * Gera relatório de uso por cliente
   */
  static async getCustomerReport(
    organizationId: string,
    startDate?: string,
    endDate?: string
  ): Promise<CustomerTokenUsageReport[]> {
    try {
      const { data, error } = await supabase
        .rpc('get_customer_token_usage_report', {
          p_organization_id: organizationId,
          p_start_date: startDate || null,
          p_end_date: endDate || null
        });

      if (error) {
        console.error('Erro ao gerar relatório por cliente:', error);
        return [];
      }

      return data || [];
    } catch (error) {
      console.error('Erro inesperado ao gerar relatório por cliente:', error);
      return [];
    }
  }

  /**
   * Obtém estatísticas gerais de uso de tokens
   */
  static async getUsageStats(
    organizationId: string,
    startDate?: string,
    endDate?: string
  ): Promise<{
    totalTokens: number;
    totalCost: number;
    systemTokens: number;
    clientTokens: number;
    systemCost: number;
    clientCost: number;
    usageCount: number;
    uniqueCustomers: number;
    modelBreakdown: { model: string; tokens: number; cost: number }[];
  }> {
    try {
      let query = supabase
        .from('token_usage')
        .select('*')
        .eq('organization_id', organizationId);

      if (startDate) {
        query = query.gte('created_at', startDate);
      }

      if (endDate) {
        query = query.lte('created_at', endDate);
      }

      const { data, error } = await query;

      if (error) {
        console.error('Erro ao buscar estatísticas:', error);
        return {
          totalTokens: 0,
          totalCost: 0,
          systemTokens: 0,
          clientTokens: 0,
          systemCost: 0,
          clientCost: 0,
          usageCount: 0,
          uniqueCustomers: 0,
          modelBreakdown: []
        };
      }

      const usage = data || [];
      
      // Agrupar por modelo para o breakdown
      const modelBreakdownMap = usage.reduce((acc, item) => {
        if (!acc[item.model_name]) {
          acc[item.model_name] = {
            model: item.model_name,
            tokens: 0,
            cost: 0
          };
        }
        acc[item.model_name].tokens += item.total_tokens;
        acc[item.model_name].cost += item.cost_usd || 0;
        return acc;
      }, {} as Record<string, { model: string; tokens: number; cost: number }>);

      const modelBreakdown = Object.values(modelBreakdownMap)
        .sort((a, b) => b.tokens - a.tokens);

      const stats = {
        totalTokens: usage.reduce((sum, item) => sum + item.total_tokens, 0),
        totalCost: usage.reduce((sum, item) => sum + (item.cost_usd || 0), 0),
        systemTokens: usage
          .filter(item => item.token_source === 'system')
          .reduce((sum, item) => sum + item.total_tokens, 0),
        clientTokens: usage
          .filter(item => item.token_source === 'client')
          .reduce((sum, item) => sum + item.total_tokens, 0),
        systemCost: usage
          .filter(item => item.token_source === 'system')
          .reduce((sum, item) => sum + (item.cost_usd || 0), 0),
        clientCost: usage
          .filter(item => item.token_source === 'client')
          .reduce((sum, item) => sum + (item.cost_usd || 0), 0),
        usageCount: usage.length,
        uniqueCustomers: new Set(usage.map(item => item.customer_id).filter(Boolean)).size,
        modelBreakdown
      };

      return stats;
    } catch (error) {
      console.error('Erro inesperado ao calcular estatísticas:', error);
      return {
        totalTokens: 0,
        totalCost: 0,
        systemTokens: 0,
        clientTokens: 0,
        systemCost: 0,
        clientCost: 0,
        usageCount: 0,
        uniqueCustomers: 0,
        modelBreakdown: []
      };
    }
  }

  /**
   * Obtém modelos mais utilizados
   */
  static async getTopModels(
    organizationId: string,
    limit = 10,
    startDate?: string,
    endDate?: string
  ): Promise<{ model_name: string; total_tokens: number; usage_count: number; total_cost: number }[]> {
    try {
      let query = supabase
        .from('token_usage')
        .select('model_name, total_tokens, cost_usd')
        .eq('organization_id', organizationId);

      if (startDate) {
        query = query.gte('created_at', startDate);
      }

      if (endDate) {
        query = query.lte('created_at', endDate);
      }

      const { data, error } = await query;

      if (error) {
        console.error('Erro ao buscar modelos mais utilizados:', error);
        return [];
      }

      const usage = data || [];
      
      const modelStats = Object.values(
        usage.reduce((acc, item) => {
          if (!acc[item.model_name]) {
            acc[item.model_name] = {
              model_name: item.model_name,
              total_tokens: 0,
              usage_count: 0,
              total_cost: 0
            };
          }
          acc[item.model_name].total_tokens += item.total_tokens;
          acc[item.model_name].usage_count += 1;
          acc[item.model_name].total_cost += item.cost_usd || 0;
          return acc;
        }, {} as Record<string, { model_name: string; total_tokens: number; usage_count: number; total_cost: number }>)
      )
        .sort((a, b) => b.total_tokens - a.total_tokens)
        .slice(0, limit);

      return modelStats;
    } catch (error) {
      console.error('Erro inesperado ao buscar modelos mais utilizados:', error);
      return [];
    }
  }

  /**
   * Obtém uso diário para gráficos
   */
  static async getDailyUsage(
    organizationId: string,
    startDate: string,
    endDate: string,
    tokenSource?: TokenSourceType
  ): Promise<{ date: string; total_tokens: number; total_cost: number; usage_count: number }[]> {
    try {
      let query = supabase
        .from('token_usage')
        .select('created_at, total_tokens, cost_usd')
        .eq('organization_id', organizationId)
        .gte('created_at', startDate)
        .lte('created_at', endDate);

      if (tokenSource) {
        query = query.eq('token_source', tokenSource);
      }

      const { data, error } = await query;

      if (error) {
        console.error('Erro ao buscar uso diário:', error);
        return [];
      }

      const usage = data || [];
      
      const dailyStats = Object.values(
        usage.reduce((acc, item) => {
          const date = new Date(item.created_at).toISOString().split('T')[0];
          if (!acc[date]) {
            acc[date] = {
              date,
              total_tokens: 0,
              total_cost: 0,
              usage_count: 0
            };
          }
          acc[date].total_tokens += item.total_tokens;
          acc[date].total_cost += item.cost_usd || 0;
          acc[date].usage_count += 1;
          return acc;
        }, {} as Record<string, { date: string; total_tokens: number; total_cost: number; usage_count: number }>)
      ).sort((a, b) => a.date.localeCompare(b.date));

      return dailyStats;
    } catch (error) {
      console.error('Erro inesperado ao buscar uso diário:', error);
      return [];
    }
  }
} 