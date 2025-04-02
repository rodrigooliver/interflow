import { useQuery, useQueryClient } from '@tanstack/react-query';
import { supabase } from '../lib/supabase';
import { useAuthContext } from '../contexts/AuthContext';

interface Cashier {
  id: string;
  name: string;
  description: string | null;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

interface Category {
  id: string;
  name: string;
  type: 'income' | 'expense';
  organization_id: string;
  created_at: string;
  updated_at: string;
}

interface PaymentMethod {
  id: string;
  name: string;
  installments_allowed: boolean;
  max_installments: number | null;
  organization_id: string;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

interface UseFinancialReturn {
  cashiers: Cashier[];
  categories: Category[];
  paymentMethods: PaymentMethod[];
  isLoading: boolean;
  error: Error | null;
  refetch: () => Promise<void>;
  invalidateCache: () => void;
}

export function useFinancial(): UseFinancialReturn {
  const queryClient = useQueryClient();
  const { currentOrganizationMember } = useAuthContext();

  const {
    data: cashiers = [],
    isLoading: isLoadingCashiers,
    error: errorCashiers,
    refetch: refetchCashiers
  } = useQuery({
    queryKey: ['financial-cashiers', currentOrganizationMember?.organization.id],
    queryFn: async () => {
      if (!currentOrganizationMember?.organization.id) {
        return [];
      }

      const { data, error } = await supabase
        .from('financial_cashiers')
        .select('*')
        .eq('organization_id', currentOrganizationMember.organization.id)
        .order('name', { ascending: true });

      if (error) {
        throw error;
      }

      return data || [];
    },
    enabled: !!currentOrganizationMember?.organization.id
  });

  const {
    data: categories = [],
    isLoading: isLoadingCategories,
    error: errorCategories,
    refetch: refetchCategories
  } = useQuery({
    queryKey: ['financial-categories', currentOrganizationMember?.organization.id],
    queryFn: async () => {
      if (!currentOrganizationMember?.organization.id) {
        return [];
      }

      const { data, error } = await supabase
        .from('financial_categories')
        .select('*')
        .eq('organization_id', currentOrganizationMember.organization.id)
        .order('name', { ascending: true });

      if (error) {
        throw error;
      }

      return data || [];
    },
    enabled: !!currentOrganizationMember?.organization.id
  });

  const {
    data: paymentMethods = [],
    isLoading: isLoadingPaymentMethods,
    error: errorPaymentMethods,
    refetch: refetchPaymentMethods
  } = useQuery({
    queryKey: ['financial-payment-methods', currentOrganizationMember?.organization.id],
    queryFn: async () => {
      if (!currentOrganizationMember?.organization.id) {
        return [];
      }

      const { data, error } = await supabase
        .from('financial_payment_methods')
        .select('*')
        .eq('organization_id', currentOrganizationMember.organization.id)
        .eq('is_active', true)
        .order('name', { ascending: true });

      if (error) {
        throw error;
      }

      return data || [];
    },
    enabled: !!currentOrganizationMember?.organization.id
  });

  const invalidateCache = () => {
    queryClient.invalidateQueries({ queryKey: ['financial-cashiers'] });
    queryClient.invalidateQueries({ queryKey: ['financial-categories'] });
    queryClient.invalidateQueries({ queryKey: ['financial-payment-methods'] });
  };

  const refetch = async () => {
    await Promise.all([
      refetchCashiers(),
      refetchCategories(),
      refetchPaymentMethods()
    ]);
  };

  return {
    cashiers,
    categories,
    paymentMethods,
    isLoading: isLoadingCashiers || isLoadingCategories || isLoadingPaymentMethods,
    error: (errorCashiers || errorCategories || errorPaymentMethods) as Error | null,
    refetch,
    invalidateCache
  };
} 