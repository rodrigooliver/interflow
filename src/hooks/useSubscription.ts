import { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import { createCheckoutSession, createCustomerPortalSession } from '../lib/stripe';
import { useOrganizationContext } from '../contexts/OrganizationContext';

export function useSubscription() {
  const { currentOrganization } = useOrganizationContext();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const subscribe = async (priceId: string) => {
    if (!currentOrganization) return;

    try {
      await createCheckoutSession({
        priceId,
        organizationId: currentOrganization.id,
        successUrl: `${window.location.origin}/settings?success=true`,
        cancelUrl: `${window.location.origin}/settings?canceled=true`
      });
    } catch (err) {
      console.error('Error subscribing:', err);
      setError('Failed to start subscription process');
    }
  };

  const manageSubscription = async () => {
    if (!currentOrganization) return;

    try {
      await createCustomerPortalSession({
        organizationId: currentOrganization.id,
        returnUrl: `${window.location.origin}/settings`
      });
    } catch (err) {
      console.error('Error opening customer portal:', err);
      setError('Failed to open customer portal');
    }
  };

  const getPaymentMethods = async () => {
    if (!currentOrganization) return [];

    try {
      const { data, error: queryError } = await supabase
        .from('payment_methods')
        .select('*')
        .eq('organization_id', currentOrganization.id)
        .eq('status', 'active')
        .order('is_default', { ascending: false });

      if (queryError) throw queryError;
      return data || [];
    } catch (err) {
      console.error('Error loading payment methods:', err);
      setError('Failed to load payment methods');
      return [];
    }
  };

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
    subscribe,
    manageSubscription,
    getPaymentMethods,
    getInvoices
  };
}