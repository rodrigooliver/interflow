import { useQuery } from '@tanstack/react-query';
import { supabase } from '../lib/supabase';
import { CustomFieldDefinition } from '../types/database';

export function useCustomFieldDefinitions(organizationId?: string) {
  return useQuery({
    queryKey: ['custom_field_definitions', organizationId],
    queryFn: async () => {
      if (!organizationId) return [];

      const { data, error } = await supabase
        .from('custom_fields_definition')
        .select('*')
        .eq('organization_id', organizationId)
        .order('created_at', { ascending: true });

      if (error) throw error;
      return data as CustomFieldDefinition[];
    },
    enabled: !!organizationId
  });
} 