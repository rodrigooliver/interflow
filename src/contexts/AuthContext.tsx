import { createContext, useContext, ReactNode, useState, useEffect } from 'react';
import { Session } from '@supabase/supabase-js';
import { Profile, OrganizationMember } from '../types/database';
import { useAuth } from '../hooks/useAuth';
import { useProfile, useOrganizationMember, useUserOrganizations, UserOrganization } from '../hooks/useQueryes';
import { useQueryClient } from '@tanstack/react-query';
import { supabase } from '../lib/supabase';

interface AuthContextType {
  session: Session | null;
  profile: Profile | null;
  currentOrganizationMember: OrganizationMember | null;
  userOrganizations: UserOrganization[];
  loadingCurrentOrganizationMember: boolean;
  loadingOrganizations: boolean;
  loading: boolean;
  signIn: (email: string, password: string) => Promise<{ error: Error | null }>;
  signOut: () => Promise<{ error?: Error | null } | undefined>;
  setCurrentOrganizationId: (organizationId: string) => void;
}

export const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function useAuthContext() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuthContext deve ser usado dentro de um AuthProvider');
  }
  return context;
}

interface AuthProviderProps {
  children: ReactNode;
}

export function AuthProvider({ children }: AuthProviderProps) {
  // console.log('[AuthProvider] Inicializando AuthProvider');
  
  const { session, loading: authLoading, signIn: authSignIn, signOut } = useAuth();
  const { data: profile, isLoading: profileLoading } = useProfile(session?.user?.id);
  const { data: currentOrganizationMember, isLoading: loadingCurrentOrganizationMember } = useOrganizationMember(session?.user?.id);
  const { data: userOrganizations, isLoading: orgsLoading } = useUserOrganizations(session?.user?.id);
  const queryClient = useQueryClient();

  
  // Estado para armazenar o ID da organização selecionada
  const [selectedOrgId, setSelectedOrgId] = useState<string | null>(null);

  // Efeito para salvar a organização selecionada no localStorage
  useEffect(() => {
    if (selectedOrgId) {
      // console.log('[AuthProvider] Salvando organização selecionada:', selectedOrgId);
      // localStorage.setItem('selectedOrganizationId', selectedOrgId);
    }
  }, [selectedOrgId]);

  // Função para definir a organização atual
  const setCurrentOrganizationId = (organizationId: string) => {
    queryClient.invalidateQueries({ queryKey: ['organization'] }); // Invalida todas as queries
    // console.log('[AuthProvider] Definindo organização atual:', organizationId);
    setSelectedOrgId(organizationId);

    // Salvar no localStorage para persistir a seleção
    // console.log('[AuthProvider] Salvar no localStorage para persistir a seleção:', organizationId, currentOrganizationMember);
    localStorage.setItem('selectedOrganizationId', organizationId);

    queryClient.invalidateQueries(); // Invalida todas as queries
    // queryClient.clear()
    
    // Invalida o cache para forçar uma nova busca
    // queryClient.invalidateQueries({ queryKey: ['organization', session?.user?.id] });
    
    
  };

  // Wrapper para o signIn que verifica se o usuário tem múltiplas organizações
  const signIn = async (email: string, password: string) => {
    const result = await authSignIn(email, password);
    
    if (!result.error) {
      // Buscar a sessão atual após o login
      const { data: { session: currentSession } } = await supabase.auth.getSession();
      
      if (currentSession?.user?.id) {
        // Buscar as organizações do usuário
        const { data: organizations, error } = await supabase
          .from('organization_members')
          .select(`
            id,
            role,
            status,
            organization:organizations(
              id,
              name,
              logo_url
            )
          `)
          .eq('user_id', currentSession.user.id)
          .eq('status', 'active');
        
        if (error) {
          console.error('[AuthProvider] Erro ao buscar organizações:', error);
        }
        // console.log('[AuthProvider] Organizações encontradas ******************:', organizations);

        if(organizations && organizations.length === 1) {
          // Verificar se a organização tem um ID e salvá-lo
          const organizationData = organizations[0].organization;
          if (typeof organizationData === 'object' && organizationData !== null && 'id' in organizationData) {
            setCurrentOrganizationId(String(organizationData.id));
          }
        }
      
      }
    }
    
    // Retornar apenas o resultado do login, sem a flag multipleOrgs
    return { error: result.error };
  };

  const loading = authLoading || profileLoading || loadingCurrentOrganizationMember;

  // Se ainda estiver carregando, não renderiza os filhos
  if (loading) {
    // console.log('[AuthProvider] Ainda carregando, não renderizando filhos');
    return null;
  }

  // console.log('[AuthProvider] Renderizando AuthProvider com dados completos');
  
  return (
    <AuthContext.Provider value={{
      session,
      profile: profile || null,
      currentOrganizationMember: currentOrganizationMember || null,
      userOrganizations: userOrganizations || [],
      loadingOrganizations: orgsLoading,
      loadingCurrentOrganizationMember,
      loading,
      signIn,
      signOut,
      setCurrentOrganizationId
    }}>
      {children}
    </AuthContext.Provider>
  );
} 