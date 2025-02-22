import { useQuery } from '@tanstack/react-query';
import { supabase } from '../lib/supabase';
import type { Profile, ServiceTeam, ChatChannel, Funnel } from '../types/database';


interface Tag {
  id: string;
  name: string;
  color: string;
}

interface FunnelStage {
  id: string;
  name: string;
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

        console.log(data)

      if (error) throw error;
      return data?.map(item => item.profile) as Agent[];
    },
    enabled: !!organizationId
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
    enabled: !!organizationId
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
    enabled: !!organizationId
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
        .eq('organization_id', organizationId);

      if (error) throw error;
      return data as Tag[];
    },
    enabled: !!organizationId
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
            name
          )
        `)
        .eq('organization_id', organizationId)
        .order('created_at', { ascending: false });

      if (funnelError) throw funnelError;

      // Garantir que stages sempre seja um array
      return (funnels || []).map(funnel => ({
        ...funnel,
        stages: funnel.stages || []
      })) as Funnel[];
    },
    enabled: !!organizationId
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