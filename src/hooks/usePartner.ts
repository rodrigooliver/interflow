import { useQuery } from '@tanstack/react-query';
import api from '../lib/api';
import { useAuthContext } from '../contexts/AuthContext';

// Interface para organização
export interface PartnerOrganization {
  id: string;
  name: string;
  slug: string;
  logo_url: string | null;
  status: string;
  email: string | null;
  whatsapp: string | null;
  created_at: string;
  relationships: string[];
}

/**
 * Hook para buscar organizações parceiras
 */
export function usePartnerOrganizations() {
  const { profile } = useAuthContext();
  
  return useQuery({
    queryKey: ['partner-organizations', profile?.id],
    queryFn: async () => {
      if (!profile?.id) return [];
      
      const response = await api.get('/api/profile/partner/organizations');
      return response.data?.organizations || [];
    },
    enabled: !!profile?.id,
    staleTime: 5 * 60 * 1000, // 5 minutos
    gcTime: 10 * 60 * 1000 // 10 minutos
  });
} 