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

interface CashierOperator {
  id: string;
  cashier_id: string;
  profile_id: string;
  is_active: boolean;
  created_at: string;
  updated_at: string;
  profile?: {
    id: string;
    full_name: string;
    email: string;
    avatar_url?: string;
  };
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

interface OrganizationProfileUser {
  id: string;
  email: string;
  full_name: string;
  avatar_url: string | null;
  role: string;
}

interface UseFinancialReturn {
  cashiers: Cashier[];
  categories: Category[];
  paymentMethods: PaymentMethod[];
  isLoading: boolean;
  error: Error | null;
  refetch: () => Promise<void>;
  invalidateCache: () => void;
  cashierOperators: (cashierId: string) => Promise<CashierOperator[]>;
  organizationProfiles: () => Promise<OrganizationProfileUser[]>;
  addCashierOperator: (cashierId: string, profileId: string) => Promise<{ success: boolean; error?: Error }>;
  updateCashierOperator: (id: string, data: { is_active: boolean }) => Promise<{ success: boolean; error?: Error }>;
  removeCashierOperator: (id: string) => Promise<{ success: boolean; error?: Error }>;
  fetchActiveCashiers: (organizationId?: string) => Promise<Cashier[]>;
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
    queryClient.invalidateQueries({ queryKey: ['financial-cashier-operators'] });
  };

  const refetch = async () => {
    await Promise.all([
      refetchCashiers(),
      refetchCategories(),
      refetchPaymentMethods()
    ]);
  };

  const cashierOperators = async (cashierId: string): Promise<CashierOperator[]> => {
    if (!currentOrganizationMember?.organization.id || !cashierId) {
      return [];
    }

    const { data, error } = await supabase
      .from('financial_cashier_operators')
      .select(`
        *,
        profile:profiles(
          id,
          full_name,
          email,
          avatar_url
        )
      `)
      .eq('cashier_id', cashierId);

    if (error) {
      throw error;
    }

    return data || [];
  };

  const organizationProfiles = async (): Promise<OrganizationProfileUser[]> => {
    if (!currentOrganizationMember?.organization.id) {
      return [];
    }

    const { data, error } = await supabase.rpc(
      'get_organization_users',
      { org_id: currentOrganizationMember.organization.id }
    );

    if (error) {
      throw error;
    }

    return data || [];
  };

  const addCashierOperator = async (cashierId: string, profileId: string): Promise<{ success: boolean; error?: Error }> => {
    try {
      const { error } = await supabase
        .from('financial_cashier_operators')
        .insert([{
          cashier_id: cashierId,
          profile_id: profileId,
          is_active: true
        }]);

      if (error) {
        throw error;
      }

      invalidateCache();
      return { success: true };
    } catch (error) {
      console.error('Erro ao adicionar operador:', error);
      return { success: false, error: error as Error };
    }
  };

  const updateCashierOperator = async (id: string, data: { is_active: boolean }): Promise<{ success: boolean; error?: Error }> => {
    try {
      const { error } = await supabase
        .from('financial_cashier_operators')
        .update(data)
        .eq('id', id);

      if (error) {
        throw error;
      }

      invalidateCache();
      return { success: true };
    } catch (error) {
      console.error('Erro ao atualizar operador:', error);
      return { success: false, error: error as Error };
    }
  };

  const removeCashierOperator = async (id: string): Promise<{ success: boolean; error?: Error }> => {
    try {
      const { error } = await supabase
        .from('financial_cashier_operators')
        .delete()
        .eq('id', id);

      if (error) {
        throw error;
      }

      invalidateCache();
      return { success: true };
    } catch (error) {
      console.error('Erro ao remover operador:', error);
      return { success: false, error: error as Error };
    }
  };

  const fetchActiveCashiers = async (organizationId?: string): Promise<Cashier[]> => {
    try {
      const orgId = organizationId || currentOrganizationMember?.organization?.id;
      
      if (!orgId) {
        return [];
      }
      
      const { data, error } = await supabase
        .from('financial_cashiers')
        .select('id, name, description, is_active, created_at, updated_at')
        .eq('organization_id', orgId)
        .eq('is_active', true)
        .order('name');

      if (error) throw error;
      return data || [];
    } catch (error) {
      console.error('Erro ao buscar caixas:', error);
      return [];
    }
  };

  return {
    cashiers,
    categories,
    paymentMethods,
    isLoading: isLoadingCashiers || isLoadingCategories || isLoadingPaymentMethods,
    error: (errorCashiers || errorCategories || errorPaymentMethods) as Error | null,
    refetch,
    invalidateCache,
    cashierOperators,
    organizationProfiles,
    addCashierOperator,
    updateCashierOperator,
    removeCashierOperator,
    fetchActiveCashiers
  };
} 