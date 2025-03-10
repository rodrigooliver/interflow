import { useQuery } from '@tanstack/react-query';
import { supabase } from '../lib/supabase';
import type { Profile, ServiceTeam, ChatChannel, CustomFieldDefinition } from '../types/database';

interface Tag {
  id: string;
  name: string;
  color: string;
}

interface FunnelStage {
  id: string;
  name: string;
  color: string;
  position: number;
  funnel_id: string;
}

interface Funnel {
  id: string;
  name: string;
  stages: FunnelStage[];
}

// Atualização do tipo Agent
interface Agent extends Profile {
  organization_member: {
    role: 'agent';
  }
}

// Remover a interface MessageShortcut se não estiver sendo usada
// interface MessageShortcut {
//   id: string;
//   organization_id: string;
//   title: string;
//   content: string;
//   attachments: {
//     name: string;
//     type: string;
//     url?: string;
//   }[];
//   created_at: string;
//   updated_at: string;
// }

interface SubscriptionPlan {
  id: string;
  name_pt: string;
  name_en: string;
  name_es: string;
  description_pt: string;
  description_en: string;
  description_es: string;
  price_brl: number;
  price_usd: number;
  default_currency: 'BRL' | 'USD';
  max_users: number;
  max_customers: number;
  max_channels: number;
  max_flows: number;
  max_teams: number;
  storage_limit: number;
  additional_user_price_brl: number;
  additional_user_price_usd: number;
  additional_channel_price_brl: number;
  additional_channel_price_usd: number;
  additional_flow_price_brl: number;
  additional_flow_price_usd: number;
  additional_team_price_brl: number;
  additional_team_price_usd: number;
  features_pt: string[] | Record<string, string>;
  features_en: string[] | Record<string, string>;
  features_es: string[] | Record<string, string>;
  stripe_price_id?: string;
}

// Hooks individuais para cada tipo de filtro
export const useAgents = (organizationId?: string) => {
  return useQuery({
    queryKey: ['agents', organizationId],
    queryFn: async () => {
      if (!organizationId) return [];
      
      const { data, error } = await supabase
        .from('organization_members')
        .select(`
          profile_id,
          profile:profiles!fk_organization_members_profile(
            id,
            email,
            full_name,
            avatar_url,
            created_at
          )
        `)
        .eq('organization_id', organizationId)
        .in('role', ['agent', 'admin', 'owner']);

      if (error) throw error;
      
      // Corrigindo o tipo de retorno
      return (data || []).map(item => {
        const profile = item.profile as unknown as Profile;
        return {
          ...profile,
          organization_member: {
            role: 'agent'
          }
        } as Agent;
      });
    },
    enabled: !!organizationId,
    staleTime: 5 * 60 * 1000, // 5 minutos
    gcTime: 10 * 60 * 1000 // 10 minutos
  });
};

export const useTeams = (organizationId?: string) => {
  return useQuery({
    queryKey: ['teams', organizationId],
    queryFn: async () => {
      if (!organizationId) return [];

      const { data, error } = await supabase
        .from('service_teams')
        .select('id, name')
        .eq('organization_id', organizationId)
        .order('name');

      if (error) throw error;
      return data as ServiceTeam[];
    },
    enabled: !!organizationId,
    staleTime: 5 * 60 * 1000, // 5 minutos
    gcTime: 10 * 60 * 1000 // 10 minutos
  });
};

export const useChannels = (organizationId?: string) => {
  return useQuery({
    queryKey: ['channels', organizationId],
    queryFn: async () => {
      if (!organizationId) return [];

      const { data, error } = await supabase
        .from('chat_channels')
        .select('*')
        .eq('organization_id', organizationId)
        .order('created_at', { ascending: false });

      if (error) throw error;
      return data as ChatChannel[];
    },
    enabled: !!organizationId,
    staleTime: 5 * 60 * 1000, // 5 minutos
    gcTime: 10 * 60 * 1000 // 10 minutos
  });
};

export const useTags = (organizationId?: string) => {
  return useQuery({
    queryKey: ['tags', organizationId],
    queryFn: async () => {
      if (!organizationId) return [];

      const { data, error } = await supabase
        .from('tags')
        .select('id, name, color')
        .eq('organization_id', organizationId)
        .order('name');

      if (error) throw error;
      return data as Tag[];
    },
    enabled: !!organizationId,
    staleTime: 30 * 60 * 1000, // 30 minutos
    gcTime: 60 * 60 * 1000 // 1 hora
  });
};

export const useFunnels = (organizationId?: string) => {
  return useQuery({
    queryKey: ['funnels', organizationId],
    queryFn: async () => {
      if (!organizationId) return [];

      const { data: funnels, error: funnelError } = await supabase
        .from('crm_funnels')
        .select(`
          id,
          name,
          stages:crm_stages(
            id,
            name,
            color,
            position,
            funnel_id
          )
        `)
        .eq('organization_id', organizationId)
        .order('created_at', { ascending: false });

      if (funnelError) throw funnelError;

      // Garantir que stages sempre seja um array e ordenar por position
      return (funnels || []).map(funnel => ({
        ...funnel,
        stages: (funnel.stages || []).sort((a, b) => a.position - b.position)
      })) as Funnel[];
    },
    enabled: !!organizationId,
    staleTime: 30 * 60 * 1000, // 30 minutos
    gcTime: 60 * 60 * 1000 // 1 hora
  });
};

// Hook para carregar definições de campos personalizados
export const useCustomFieldDefinitions = (organizationId?: string) => {
  return useQuery({
    queryKey: ['custom_field_definitions', organizationId],
    queryFn: async () => {
      if (!organizationId) return [];
      
      const { data, error } = await supabase
        .from('custom_fields_definition')
        .select('*')
        .eq('organization_id', organizationId)
        .order('name');
        
      if (error) throw error;
      
      return data as CustomFieldDefinition[];
    },
    enabled: !!organizationId,
    staleTime: 30 * 60 * 1000, // 30 minutos
    gcTime: 60 * 60 * 1000 // 1 hora
  });
};

// Hook combinado para todos os filtros
export const useFilters = (organizationId?: string) => {
  const agents = useAgents(organizationId);
  const teams = useTeams(organizationId);
  const channels = useChannels(organizationId);
  const tags = useTags(organizationId);
  const funnels = useFunnels(organizationId);

  return {
    agents,
    teams,
    channels,
    tags,
    funnels,
    isLoading: agents.isLoading || teams.isLoading || channels.isLoading || tags.isLoading || funnels.isLoading,
    error: agents.error || teams.error || channels.error || tags.error || funnels.error
  };
};

export const useMessageShortcuts = (organizationId?: string) => {
  const { data, error, isLoading, refetch } = useQuery({
    queryKey: ['messageShortcuts', organizationId],
    queryFn: async () => {
      if (!organizationId) return [];
      
      const { data, error } = await supabase
        .from('message_shortcuts')
        .select('*')
        .eq('organization_id', organizationId)
        .order('title', { ascending: true });
        
      if (error) throw error;
      return data || [];
    },
    enabled: !!organizationId,
    staleTime: 1000 * 60 * 5, // 5 minutos
  });

  return {
    messageShortcuts: data || [],
    isLoading,
    error,
    refetchMessageShortcuts: refetch,
  };
};

/**
 * Hook para buscar os planos de assinatura
 */
export const useSubscriptionPlans = () => {
  const { data: plans, isLoading, error, refetch } = useQuery({
    queryKey: ['subscription-plans'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('subscription_plans')
        .select('*')
        .order('price_brl', { ascending: true });

      if (error) throw error;
      return data || [];
    },
    refetchOnWindowFocus: false
  });

  return {
    plans: plans as SubscriptionPlan[],
    isLoading,
    error,
    refetch,
  };
}; 