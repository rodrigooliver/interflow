import { supabase } from '../lib/supabase';
import { Customer, Tag } from '../types/database';

// Interface para o resultado da consulta de clientes com tags
interface CustomerWithTagsResponse extends Omit<Customer, 'tags'> {
  tags: { tags: Tag }[];
}

export async function getCustomersForCRM(organizationId: string) {
  const { data, error } = await supabase
    .from('customers')
    .select(`
      *,
      tags:customer_tags(
        tags(*)
      )
    `)
    .eq('organization_id', organizationId)
    .order('name');

  if (error) {
    console.error('Erro ao buscar clientes para o CRM:', error);
    throw error;
  }

  // Transformar o formato das tags para ficar mais simples
  return data?.map((customer: CustomerWithTagsResponse) => ({
    ...customer,
    tags: customer.tags?.map(t => t.tags) || []
  })) || [];
} 