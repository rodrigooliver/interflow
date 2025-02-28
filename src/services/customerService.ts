import { supabase } from '../lib/supabase';
import { Customer, Tag } from '../types/database';

// Interface para o resultado da consulta de tags
interface CustomerTagResult {
  tags: Tag;
}

// Função para buscar as tags de um cliente
export async function getCustomerTags(customerId: string) {
  const { data, error } = await supabase
    .from('customer_tags')
    .select(`
      tag_id,
      tags (*)
    `)
    .eq('customer_id', customerId);

  if (error) {
    console.error('Erro ao buscar tags do cliente:', error);
    throw error;
  }

  // Corrigindo o tipo do retorno para corresponder à estrutura real dos dados
  return data?.map((item: any) => item.tags) || [];
}

// Função para atualizar as tags de um cliente
export const updateCustomerTags = async (
  customerId: string,
  tagIds: string[],
  organizationId: string
): Promise<void> => {
  try {
    // 1. Primeiro, obter as tags atuais do cliente para evitar duplicações
    const { data: existingTags, error: fetchError } = await supabase
      .from('customer_tags')
      .select('tag_id')
      .eq('customer_id', customerId);
      
    if (fetchError) throw fetchError;
    
    const existingTagIds = new Set(existingTags?.map(tag => tag.tag_id) || []);
    
    // 2. Determinar quais tags precisam ser adicionadas (não existem ainda)
    const tagsToAdd = tagIds.filter(id => !existingTagIds.has(id));
    
    // 3. Determinar quais tags precisam ser removidas (existem mas não estão na nova lista)
    const tagsToRemove = Array.from(existingTagIds).filter(id => !tagIds.includes(id));
    
    // 4. Executar as operações em sequência
    
    // Remover tags que não estão mais na lista
    if (tagsToRemove.length > 0) {
      const { error: removeError } = await supabase
        .from('customer_tags')
        .delete()
        .eq('customer_id', customerId)
        .in('tag_id', tagsToRemove);
        
      if (removeError) throw removeError;
    }
    
    // Adicionar novas tags
    if (tagsToAdd.length > 0) {
      const tagsToInsert = tagsToAdd.map(tagId => ({
        customer_id: customerId,
        tag_id: tagId,
        organization_id: organizationId
      }));
      
      // Usar upsert para evitar duplicações
      const { error: insertError } = await supabase
        .from('customer_tags')
        .upsert(tagsToInsert, { 
          onConflict: 'customer_id,tag_id',
          ignoreDuplicates: true 
        });
        
      if (insertError) {
        console.error('Erro ao inserir tags:', insertError);
        throw insertError;
      }
    }
    
    console.log(`Tags atualizadas: ${tagsToAdd.length} adicionadas, ${tagsToRemove.length} removidas`);
    
  } catch (error) {
    console.error('Erro ao atualizar tags do cliente:', error);
    throw error;
  }
};

// Interface para o resultado da consulta de clientes com tags
interface CustomerWithTagsResponse extends Omit<Customer, 'tags'> {
  tags: { tags: Tag }[];
}

export async function getCustomers(organizationId: string) {
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
    console.error('Erro ao buscar clientes:', error);
    throw error;
  }

  // Transformar o formato das tags para ficar mais simples
  return data?.map((customer: CustomerWithTagsResponse) => ({
    ...customer,
    tags: customer.tags?.map(t => t.tags) || []
  })) || [];
}

export async function getCustomer(customerId: string) {
  const { data, error } = await supabase
    .from('customers')
    .select(`
      *,
      tags:customer_tags(
        tags(*)
      )
    `)
    .eq('id', customerId)
    .single();

  if (error) {
    console.error('Erro ao buscar cliente:', error);
    throw error;
  }

  // Transformar o formato das tags para ficar mais simples
  return {
    ...data,
    tags: data?.tags?.map((t: any) => t.tags) || []
  };
} 