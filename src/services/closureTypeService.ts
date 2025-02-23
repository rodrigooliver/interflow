import { supabase } from '../lib/supabase';
import { ClosureType } from '../types/database';

export const getClosureTypes = async (organizationId: string) => {
  const { data, error } = await supabase
    .from('closure_types')
    .select(`
      *,
      flow:flows (
        id,
        name
      )
    `)
    .eq('organization_id', organizationId)
    .order('created_at', { ascending: false });
  
  if (error) throw error;
  return data;
};

export const createClosureType = async (type: Omit<ClosureType, 'id' | 'created_at'>) => {
  const { data, error } = await supabase
    .from('closure_types')
    .insert(type)
    .single();
  
  if (error) throw error;
  return data;
};

export const updateClosureType = async (id: string, type: Partial<ClosureType>) => {
  const { data, error } = await supabase
    .from('closure_types')
    .update(type)
    .eq('id', id)
    .single();
  
  if (error) throw error;
  return data;
};

export const deleteClosureType = async (id: string) => {
  const { error } = await supabase
    .from('closure_types')
    .delete()
    .eq('id', id);
  
  if (error) throw error;
}; 