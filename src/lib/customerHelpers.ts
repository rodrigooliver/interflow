import { supabase } from './supabase';
import { Customer, CustomerContact, CustomerFormData } from '../types/database';

// Função para obter o contato primário de um tipo específico
export function getPrimaryContact(customer: Customer, type: 'email' | 'whatsapp' | 'phone'): string | null {
  if (!customer.contacts) return null;
  
  const primaryContact = customer.contacts.find(
    contact => contact.type === type && contact.is_primary
  );
  
  return primaryContact ? primaryContact.value : null;
}

// Função para obter o valor de um campo personalizado
export function getCustomFieldValue(customer: Customer, fieldName: string): string | null {
  if (!customer.custom_fields) return null;
  
  const field = customer.custom_fields.find(
    cf => cf.definition.name === fieldName
  );
  
  return field ? field.value : null;
}

// Função para carregar um cliente com todos os dados relacionados
export async function loadCustomerWithRelations(customerId: string): Promise<Customer | null> {
  try {
    // Carregar o cliente básico
    const { data: customer, error } = await supabase
      .from('customers')
      .select('*')
      .eq('id', customerId)
      .single();
      
    if (error || !customer) return null;
    
    // Carregar contatos
    const { data: contacts } = await supabase
      .from('customer_contacts')
      .select('*')
      .eq('customer_id', customerId);
      
    // Carregar campos personalizados
    const { data: fieldValues } = await supabase
      .from('customer_field_values')
      .select(`
        *,
        definition:field_definition_id(*)
      `)
      .eq('customer_id', customerId);
      
    // Carregar tags
    const { data: tagRelations } = await supabase
      .from('customer_tags')
      .select(`
        tag:tags(*)
      `)
      .eq('customer_id', customerId);
      
    // Montar o objeto completo
    return {
      ...customer,
      contacts: contacts || [],
      custom_fields: fieldValues ? fieldValues.map(fv => ({
        definition: fv.definition,
        value: fv.value
      })) : [],
      tags: tagRelations ? tagRelations.map(tr => tr.tag) : []
    } as Customer;
    
  } catch (error) {
    console.error('Erro ao carregar cliente:', error);
    return null;
  }
}

// Função para salvar um cliente com todos os dados relacionados
export async function saveCustomer(
  organizationId: string, 
  customerData: CustomerFormData, 
  customerId?: string
): Promise<{ success: boolean; id?: string; error?: string }> {
  // Implementar a lógica para salvar o cliente com transações
  // Esta função seria mais complexa e envolveria múltiplas operações no banco
  // ...
} 