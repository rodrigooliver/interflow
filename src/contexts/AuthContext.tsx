import { createContext, useContext, ReactNode } from 'react';
import { Session } from '@supabase/supabase-js';
import { Profile, Organization } from '../types/database';
import { useAuth } from '../hooks/useAuth';

interface AuthContextType {
  session: Session | null;
  profile: Profile | null;
  currentOrganization: Organization | null;
  loading: boolean;
  signIn: (email: string, password: string) => Promise<{ error: Error | null }>;
  signOut: () => Promise<{ error?: Error | null } | undefined>;
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
  const auth = useAuth();
  
  return (
    <AuthContext.Provider value={auth}>
      {children}
    </AuthContext.Provider>
  );
} 