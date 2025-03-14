import { useQuery } from '@tanstack/react-query';
import { supabase } from '../lib/supabase';
import type { Profile, ServiceTeam, ChatChannel, CustomFieldDefinition, Integration, Prompt, OrganizationMember } from '../types/database';
import api from '../lib/api';
import { useTranslation } from 'react-i18next';
import { reloadTranslations } from '../i18n';
import { PostgrestResponse } from '@supabase/supabase-js';

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

// Remover a interface não utilizada
// interface TeamMemberWithProfile extends OrganizationMember {
//   profile: Profile | null;
// }

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
  price_brl_yearly: number;
  price_usd_yearly: number;
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
  stripe_price_id_brl_monthly: string;
  stripe_price_id_usd_monthly: string;
  stripe_price_id_brl_yearly: string;
  stripe_price_id_usd_yearly: string;
}

interface Subscription {
  id: string;
  organization_id: string;
  plan_id: string;
  status: 'active' | 'trialing' | 'canceled' | 'past_due';
  current_period_start: string;
  current_period_end: string;
  cancel_at_period_end: boolean;
  stripe_subscription_id?: string;
  billing_period?: 'monthly' | 'yearly';
  canceled_at?: string;
  cancel_at?: string;
}

interface Invoice {
  id: string;
  organization_id: string;
  subscription_id: string | null;
  stripe_invoice_id: string | null;
  amount: number;
  currency: string;
  status: string;
  paid_at: string | null;
  due_date: string | null;
  pdf_url: string | null;
  hosted_invoice_url: string | null;
  created_at: string;
  updated_at: string;
  metadata: Record<string, unknown> | null;
}

// Interface para representar uma organização com informações de membro
export interface UserOrganization {
  id: string;
  name: string;
  logo_url: string | null;
  role: string;
  status: string;
  member_id: string;
}

// Hook para buscar todas as organizações do usuário
export const useUserOrganizations = (userId?: string) => {
  return useQuery({
    queryKey: ['user-organizations', userId],
    queryFn: async () => {
      if (!userId) return [];

      const { data, error } = await supabase
        .from('organization_members')
        .select(`
          id,
          role,
          status,
          organization:organizations(
            id,
            name,
            logo_url
          )
        `)
        .eq('user_id', userId)
        .eq('status', 'active');

      if (error) throw error;


      // console.log('data ********************************', data, userId);
      
      // Se não houver dados, retornar array vazio
      if (!data || data.length === 0) return [];
      
      // Transformar os dados para o formato desejado
      // Usar tipagem segura com unknown primeiro
      const result: UserOrganization[] = [];
      
      for (const item of data as unknown[]) {
        // Verificar se o item tem a estrutura esperada
        if (
          typeof item === 'object' && 
          item !== null && 
          'organization' in item && 
          typeof item.organization === 'object' && 
          item.organization !== null &&
          'id' in item.organization &&
          'name' in item.organization
        ) {
          // Acessar logo_url de forma segura
          const org = item.organization as Record<string, unknown>;
          const logoUrl = 'logo_url' in org ? org.logo_url as string | null : null;
          
          if ('role' in item && 'status' in item && 'id' in item) {
            result.push({
              id: String(org.id),
              name: String(org.name),
              logo_url: logoUrl,
              role: String(item.role),
              status: String(item.status),
              member_id: String(item.id)
            });
          }
        }
      }
      
      return result;
    },
    enabled: !!userId,
    staleTime: 5 * 60 * 1000, // 5 minutos
    gcTime: 10 * 60 * 1000, // 10 minutos
  });
};

// Hooks individuais para cada tipo de filtro
export const useAgents = (organizationId?: string, roles?: ('agent' | 'admin' | 'owner' | 'member')[]) => {
  return useQuery({
    queryKey: ['agents', organizationId, roles],
    queryFn: async () => {
      if (!organizationId) return [];
      
      type MemberWithProfile = {
        id: string;
        organization_id: string;
        user_id: string;
        role: string;
        status: string;
        created_at: string;
        profile: {
          id: string;
          email: string;
          full_name: string;
          avatar_url: string;
          whatsapp: string;
          created_at: string;
        } | null;
      };
      
      const { data, error } = await supabase
        .from('organization_members')
        .select(`
          id,
          organization_id,
          user_id,
          role,
          status,
          created_at,
          profile:profiles!fk_organization_members_profile(
            id,
            email,
            full_name,
            avatar_url,
            whatsapp,
            created_at
          )
        `)
        .eq('organization_id', organizationId)
        .in('role', roles || ['agent', 'admin', 'owner']) as PostgrestResponse<MemberWithProfile>;

      if (error) throw error;
      
      return data || [];
    },
    enabled: !!organizationId,
    staleTime: 5 * 60 * 1000, // 5 minutos
    gcTime: 10 * 60 * 1000, // 10 minutos
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
    gcTime: 10 * 60 * 1000, // 10 minutos
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
    gcTime: 10 * 60 * 1000, // 10 minutos
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
    gcTime: 60 * 60 * 1000, // 1 hora
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
    gcTime: 60 * 60 * 1000, // 1 hora
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
    gcTime: 60 * 60 * 1000, // 1 hora
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

/**
 * Hook para buscar a subscription atual da organização
 */
export const useCurrentSubscription = (organizationId?: string) => {
  return useQuery({
    queryKey: ['current-subscription', organizationId],
    queryFn: async () => {
      if (!organizationId) return null;

      const { data, error } = await supabase
        .from('subscriptions')
        .select('*')
        .eq('organization_id', organizationId)
        .order('created_at', { ascending: false })
        .limit(1);

      if (error) throw error;
      
      // Se não houver resultados, retornar null
      if (!data || data.length === 0) return null;
      
      return data[0] as Subscription;
    },
    enabled: !!organizationId,
    staleTime: 5 * 60 * 1000, // 5 minutos
    gcTime: 10 * 60 * 1000, // 10 minutos
  });
};

export const useInvoices = (organizationId?: string) => {
  return useQuery({
    queryKey: ['invoices', organizationId],
    queryFn: async () => {
      if (!organizationId) return [];

      const { data, error } = await supabase
        .from('invoices')
        .select('*')
        .eq('organization_id', organizationId)
        .order('created_at', { ascending: false });

      if (error) throw error;
      return data as Invoice[];
    },
    enabled: !!organizationId,
    staleTime: 5 * 60 * 1000, // 5 minutos
    gcTime: 10 * 60 * 1000, // 10 minutos
  });
};

// Definindo o tipo para os modelos da OpenAI
interface OpenAIModel {
  id: string;
  name: string;
}

/**
 * Hook para buscar os modelos disponíveis da OpenAI para uma integração específica
 */
export const useOpenAIModels = (organizationId?: string, integrationId?: string) => {
  return useQuery({
    queryKey: ['openai-models', organizationId, integrationId],
    queryFn: async () => {
      if (!organizationId || !integrationId) return [];

      try {
        const response = await api.get(
          `/api/${organizationId}/integrations/${integrationId}/openai-models`
        );
        
        if (response.data.success && response.data.data.length > 0) {
          return response.data.data as OpenAIModel[];
        }
        
        return [] as OpenAIModel[];
      } catch (error) {
        console.error('Erro ao carregar modelos da OpenAI:', error);
        return [] as OpenAIModel[];
      }
    },
    enabled: !!organizationId && !!integrationId,
    staleTime: 30 * 60 * 1000, // 30 minutos
    gcTime: 60 * 60 * 1000 // 1 hora
  });
};

/**
 * Hook para buscar as integrações OpenAI ativas de uma organização
 */
export const useOpenAIIntegrations = (organizationId?: string) => {
  return useQuery({
    queryKey: ['openai-integrations', organizationId],
    queryFn: async () => {
      if (!organizationId) return [];

      try {
        const { data, error } = await supabase
          .from('integrations')
          .select('*')
          .eq('organization_id', organizationId)
          .eq('type', 'openai')
          .eq('status', 'active');

        if (error) throw error;
        return data as Integration[];
      } catch (error) {
        console.error('Erro ao carregar integrações OpenAI:', error);
        return [] as Integration[];
      }
    },
    enabled: !!organizationId,
    staleTime: 5 * 60 * 1000, // 5 minutos
    gcTime: 10 * 60 * 1000 // 10 minutos
  });
};

export const useFlows = (organizationId?: string) => {
  return useQuery({
    queryKey: ['flows', organizationId],
    queryFn: async () => {
      if (!organizationId) return [];

      const { data, error } = await supabase
        .from('flows')
        .select('id, name')
        .eq('organization_id', organizationId)
        .order('name');

      if (error) throw error;
      return data || [];
    },
    enabled: !!organizationId,
    staleTime: 30 * 60 * 1000, // 30 minutos
    gcTime: 60 * 60 * 1000 // 1 hora
  });
};

export function usePrompts(organizationId?: string) {
  return useQuery({
    queryKey: ['prompts', organizationId],
    queryFn: async () => {
      if (!organizationId) return [];

      const { data, error } = await supabase
        .from('prompts')
        .select('*')
        .eq('organization_id', organizationId)
        .order('created_at', { ascending: false });

      if (error) throw error;
      return data as Prompt[];
    },
    enabled: !!organizationId,
    staleTime: 5 * 60 * 1000, // 5 minutos
    gcTime: 10 * 60 * 1000, // 10 minutos
  });
}

export function useProfile(userId?: string) {
  const { i18n } = useTranslation();

  return useQuery({
    queryKey: ['profile', userId],
    queryFn: async () => {
      if (!userId) return null;

      const { data, error } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', userId);

      if (error) throw error;
      
      // Se não houver resultados, retornar null
      if (!data || data.length === 0) return null;
      
      // Usar o primeiro perfil encontrado
      // Nota: Normalmente só deve existir um perfil por usuário
      const profile = data[0] as Profile;

      // Atualizar o idioma da aplicação se o perfil tiver um idioma diferente do atual
      if (profile.language && profile.language !== i18n.language) {
        await reloadTranslations(profile.language);
      }

      return profile;
    },
    enabled: !!userId,
    staleTime: 5 * 60 * 1000, // 5 minutos
    gcTime: 10 * 60 * 1000, // 10 minutos
  });
}

export function useOrganizationMember(userId?: string) {
  return useQuery({
    queryKey: ['organization', userId],
    queryFn: async () => {
      if (!userId) return null;
      
      // // Verificar se há uma organização selecionada no localStorage
      const selectedOrgId = localStorage.getItem('selectedOrganizationId');
      
      if (selectedOrgId) {
        // Lógica padrão: buscar a organização mais recente do usuário
          const { data, error } = await supabase
          .from('organization_members')
          .select(`
            *,
            organization:organizations(*)
          `)
          .eq('user_id', userId)
          .eq('organization_id', selectedOrgId)
          .eq('status', 'active')
          .order('created_at', { ascending: false });
          // console.log('data ----------------------------', data);

          if (error) throw error;

          return data.length > 0 ? data[0] as OrganizationMember : null;
      } else {
        return null;
        // const { data, error } = await supabase
        //   .from('organization_members')
        //   .select(`
        //     *,
        //     organization:organizations(*)
        //   `)
        //   .eq('user_id', userId)
        //   .eq('status', 'active')
        //   .order('created_at', { ascending: false });

        //   if (error) throw error;

        //   return data.length > 0 ? data[0] as OrganizationMember : null;
      }
    },
    enabled: !!userId,
    staleTime: 5 * 60 * 1000, // 5 minutos
    gcTime: 10 * 60 * 1000, // 10 minutos
  });
}

export function useIntegrations(organizationId?: string) {
  return useQuery({
    queryKey: ['integrations', organizationId],
    queryFn: async () => {
      if (!organizationId) return [];

      const { data, error } = await supabase
        .from('integrations')
        .select('*')
        .eq('organization_id', organizationId)
        .order('created_at', { ascending: false });

      if (error) throw error;
      return data as Integration[];
    },
    enabled: !!organizationId,
    staleTime: 5 * 60 * 1000, // 5 minutos
    gcTime: 10 * 60 * 1000, // 10 minutos
  });
}

// Hook para buscar todos os tipos de encerramento de uma organização
export function useClosureTypes(organizationId?: string) {
  return useQuery({
    queryKey: ['closure_types', organizationId],
    queryFn: async () => {
      if (!organizationId) return [];

      const { data, error } = await supabase
        .from('closure_types')
        .select('*')
        .eq('organization_id', organizationId)
        .order('created_at', { ascending: false });

      if (error) throw error;
      return data || [];
    },
    enabled: !!organizationId,
    staleTime: 5 * 60 * 1000, // 5 minutos
    gcTime: 10 * 60 * 1000, // 10 minutos
  });
} 