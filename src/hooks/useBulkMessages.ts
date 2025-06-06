import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '../lib/supabase';
import { BulkMessageCampaign, BulkMessageQueue, CustomerContact } from '../types/database';

// Tipo estendido para incluir os contatos e mensagem
interface BulkMessageQueueWithContacts extends Omit<BulkMessageQueue, 'customer' | 'channel'> {
  customer?: {
    id: string;
    name: string;
    contacts?: CustomerContact[];
  };
  message?: {
    id: string;
    chat_id: string;
  };
  channel?: {
    id: string;
    name: string;
    type: string;
  };
}

export const useBulkMessageCampaign = (campaignId: string, organizationId?: string) => {
  return useQuery({
    queryKey: ['bulk-message-campaign', campaignId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('bulk_message_campaigns')
        .select(`
          *,
          created_by_profile:profiles!bulk_message_campaigns_created_by_fkey(
            id, full_name, avatar_url
          )
        `)
        .eq('id', campaignId)
        .eq('organization_id', organizationId)
        .single();

      if (error) throw error;
      return data as BulkMessageCampaign;
    },
    enabled: !!campaignId && !!organizationId,
  });
};

export const useBulkMessageQueue = (campaignId: string, organizationId?: string, filter?: string) => {
  return useQuery({
    queryKey: ['bulk-message-queue', campaignId, filter],
    queryFn: async () => {
      let query = supabase
        .from('bulk_message_queue')
        .select(`
          *,
          customer:customers!bulk_message_queue_customer_id_fkey(
            id, 
            name,
            contacts:customer_contacts(
              type,
              value
            )
          ),
          message:messages(
            id,
            chat_id
          ),
          channel:chat_channels!bulk_message_queue_channel_id_fkey(
            id, name, type
          )
        `)
        .eq('campaign_id', campaignId)
        .eq('organization_id', organizationId);

      // Aplicar filtro de status se necessário
      if (filter && filter !== 'all') {
        query = query.eq('status', filter);
      }

      // Ordenar por batch_number e position_in_batch
      query = query.order('batch_number', { ascending: true })
                  .order('position_in_batch', { ascending: true });

      const { data, error } = await query;

      if (error) throw error;
      return data as BulkMessageQueueWithContacts[];
    },
    enabled: !!campaignId && !!organizationId,
  });
};

export const useBulkMessageCampaigns = (organizationId?: string) => {
  return useQuery({
    queryKey: ['bulk-message-campaigns', organizationId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('bulk_message_campaigns')
        .select(`
          *,
          created_by_profile:profiles!bulk_message_campaigns_created_by_fkey(
            id, full_name, avatar_url
          )
        `)
        .eq('organization_id', organizationId)
        .order('created_at', { ascending: false });

      if (error) throw error;
      return data as BulkMessageCampaign[];
    },
    enabled: !!organizationId,
  });
};

export const useRefreshBulkMessageQueue = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ campaignId }: { campaignId: string; organizationId?: string }) => {
      // Invalidar apenas as queries específicas da campanha
      // Não invalidamos todas as campanhas para evitar requests desnecessários
      await queryClient.invalidateQueries({ queryKey: ['bulk-message-queue', campaignId] });
      await queryClient.invalidateQueries({ queryKey: ['bulk-message-campaign', campaignId] });
    },
  });
}; 