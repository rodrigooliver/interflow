import { createContext, useContext, ReactNode } from 'react';
import { Organization, OrganizationMember, Subscription } from '../types/database';
import { useOrganization } from '../hooks/useOrganization';

interface OrganizationContextType {
  organizations: Organization[];
  currentOrganization: Organization | null;
  membership: OrganizationMember | null;
  subscription: Subscription | null;
  loading: boolean;
  switchOrganization: (organizationId: string) => Promise<void>;
}

export const OrganizationContext = createContext<OrganizationContextType | undefined>(undefined);

export function useOrganizationContext() {
  const context = useContext(OrganizationContext);
  if (context === undefined) {
    throw new Error('useOrganizationContext deve ser usado dentro de um OrganizationProvider');
  }
  return context;
}

interface OrganizationProviderProps {
  children: ReactNode;
}

export function OrganizationProvider({ children }: OrganizationProviderProps) {
  const organizationData = useOrganization();
  
  return (
    <OrganizationContext.Provider value={organizationData}>
      {children}
    </OrganizationContext.Provider>
  );
} 