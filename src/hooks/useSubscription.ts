import { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import { useAuthContext } from '../contexts/AuthContext';

export function useSubscription() {
  const { currentOrganizationMember } = useAuthContext();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);


  const getInvoices = async () => {
    if (!currentOrganizationMember) return [];

    try {
      const { data, error: queryError } = await supabase
        .from('invoices')
        .select('*')
        .eq('organization_id', currentOrganizationMember.organization.id)
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
  }, [currentOrganizationMember]);

  return {
    loading,
    error,
    getInvoices
  };
}