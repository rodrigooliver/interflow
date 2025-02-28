import { supabase } from '../lib/supabase';
import { CustomFieldDefinition, CustomFieldValue, CustomFieldFormData } from '../types/database';

/**
 * Carrega as definições de campos personalizados de uma organização
 */
export async function loadCustomFieldDefinitions(organizationId: string): Promise<CustomFieldDefinition[]> {
  try {
    const { data, error } = await supabase
      .from('custom_fields_definition')
      .select('*')
      .eq('organization_id', organizationId)
      .order('name');
      
    if (error) throw error;
    return data || [];
  } catch (error) {
    console.error('Erro ao carregar definições de campos personalizados:', error);
    return [];
  }
}

/**
 * Carrega os valores de campos personalizados de um cliente
 */
export async function loadCustomFieldValues(customerId: string): Promise<CustomFieldValue[]> {
  try {
    const { data, error } = await supabase
      .from('customer_field_values')
      .select('*')
      .eq('customer_id', customerId);
      
    if (error) throw error;
    return data || [];
  } catch (error) {
    console.error('Erro ao carregar valores de campos personalizados:', error);
    return [];
  }
}

/**
 * Cria uma nova definição de campo personalizado
 */
export async function createCustomFieldDefinition(
  field: Partial<CustomFieldDefinition>
): Promise<CustomFieldDefinition | null> {
  try {
    // Validar se temos o organization_id
    if (!field.organization_id) {
      console.error('Erro ao criar definição de campo: organization_id é obrigatório');
      return null;
    }

    console.log('Criando campo personalizado com dados:', field);
    
    const { data, error } = await supabase
      .from('custom_fields_definition')
      .insert(field)
      .select()
      .single();
      
    if (error) {
      console.error('Erro do Supabase ao criar campo:', error);
      throw error;
    }
    
    console.log('Campo personalizado criado com sucesso:', data);
    return data;
  } catch (error) {
    console.error('Erro ao criar definição de campo personalizado:', error);
    return null;
  }
}

/**
 * Atualiza uma definição de campo personalizado existente
 */
export async function updateCustomFieldDefinition(
  fieldId: string,
  updates: Partial<CustomFieldDefinition>
): Promise<boolean> {
  try {
    const { error } = await supabase
      .from('custom_fields_definition')
      .update(updates)
      .eq('id', fieldId);
      
    if (error) throw error;
    return true;
  } catch (error) {
    console.error('Erro ao atualizar definição de campo personalizado:', error);
    return false;
  }
}

/**
 * Cria ou atualiza um valor de campo personalizado para um cliente
 */
export async function upsertCustomFieldValue(
  customerId: string,
  fieldDefinitionId: string,
  value: string,
  existingValueId?: string
): Promise<CustomFieldValue | null> {
  try {
    if (existingValueId) {
      // Atualizar valor existente
      const { data, error } = await supabase
        .from('customer_field_values')
        .update({ value })
        .eq('id', existingValueId)
        .eq('customer_id', customerId)
        .select()
        .single();
        
      if (error) throw error;
      return data;
    } else {
      // Inserir novo valor
      const { data, error } = await supabase
        .from('customer_field_values')
        .insert({
          customer_id: customerId,
          field_definition_id: fieldDefinitionId,
          value
        })
        .select()
        .single();
        
      if (error) throw error;
      return data;
    }
  } catch (error) {
    console.error('Erro ao salvar valor de campo personalizado:', error);
    return null;
  }
}

/**
 * Remove um valor de campo personalizado
 */
export async function removeCustomFieldValue(valueId: string, customerId: string): Promise<boolean> {
  try {
    const { error } = await supabase
      .from('customer_field_values')
      .delete()
      .eq('id', valueId)
      .eq('customer_id', customerId);
      
    if (error) throw error;
    return true;
  } catch (error) {
    console.error('Erro ao remover valor de campo personalizado:', error);
    return false;
  }
}

/**
 * Formata os dados de campos personalizados para exibição no formulário
 */
export function formatCustomFieldsData(
  fieldDefinitions: CustomFieldDefinition[],
  fieldValues: CustomFieldValue[]
): CustomFieldFormData[] {
  const formattedFields: CustomFieldFormData[] = [];
  
  // Adicionar campos que já têm valores
  if (fieldValues.length > 0) {
    fieldValues.forEach(fieldValue => {
      const fieldDef = fieldDefinitions.find(def => def.id === fieldValue.field_definition_id);
      if (fieldDef) {
        formattedFields.push({
          id: fieldValue.id,
          field_id: fieldValue.field_definition_id,
          field_name: fieldDef.name,
          value: fieldValue.value,
          type: fieldDef.type,
          options: fieldDef.options
        });
      }
    });
  }
  
  // Adicionar campos da organização que ainda não têm valores
  const existingFieldIds = new Set(formattedFields.map(field => field.field_id));
  
  fieldDefinitions.forEach(fieldDef => {
    if (!existingFieldIds.has(fieldDef.id)) {
      formattedFields.push({
        field_id: fieldDef.id,
        field_name: fieldDef.name,
        value: '',
        type: fieldDef.type,
        options: fieldDef.options,
        isNew: true
      });
    }
  });
  
  return formattedFields;
} 