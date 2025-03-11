import { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import { useOrganizationContext } from '../contexts/OrganizationContext';

export function useSubscription() {
  const { currentOrganization } = useOrganizationContext();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);


  const getInvoices = async () => {
    if (!currentOrganization) return [];

    try {
      const { data, error: queryError } = await supabase
        .from('invoices')
        .select('*')
        .eq('organization_id', currentOrganization.id)
        .order('created_at', { ascending: false });

      if (queryError) throw queryError;
      return data || [];
    } catch (err) {
      console.error('Error loading invoices:', err);
      setError('Failed to load invoices');
      return [];
    }
  };

  useEffect(() => {
    setLoading(false);
  }, [currentOrganization]);

  return {
    loading,
    error,
    getInvoices
  };
}