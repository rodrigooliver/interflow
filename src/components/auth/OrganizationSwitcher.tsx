import React, { useState } from 'react';
import { useAuthContext } from '../../contexts/AuthContext';
import { createPortal } from 'react-dom';
import OrganizationSelector from './OrganizationSelector';
import { Building2, ChevronDown } from 'lucide-react';

interface OrganizationSwitcherProps {
  isCollapsed?: boolean;
}

export const OrganizationSwitcher: React.FC<OrganizationSwitcherProps> = ({ isCollapsed }) => {
  const { userOrganizations, loadingOrganizations, currentOrganizationMember, setCurrentOrganizationId } = useAuthContext();
  const [modalOrganization, setModalOrganization] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [modalRoot, setModalRoot] = useState<HTMLElement | null>(null);

  // Inicializar o elemento do portal para o modal
  React.useEffect(() => {
    let portalElement = document.getElementById('organization-selector-portal');
    
    if (!portalElement) {
      portalElement = document.createElement('div');
      portalElement.id = 'organization-selector-portal';
      document.body.appendChild(portalElement);
    }
    
    setModalRoot(portalElement);
    
    return () => {
      if (portalElement && portalElement.parentNode) {
        portalElement.parentNode.removeChild(portalElement);
      }
    };
  }, []);

  const handleOrganizationSelect = async (orgId: string) => {
    try {
      setIsLoading(true);
      setCurrentOrganizationId(orgId);
      setModalOrganization(false);
    } catch (error) {
      console.error('[OrganizationSwitcher] Erro ao selecionar organização:', error);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <>
      <button
        onClick={() => setModalOrganization(true)}
        className={`flex items-center ${isCollapsed ? 'justify-center' : 'justify-between'} w-full text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700/50 rounded-lg transition-colors ${
          isCollapsed ? 'p-2' : 'px-3 py-2'
        }`}
      >
        <div className="flex items-center min-w-0">
          <Building2 className={`w-5 h-5 flex-shrink-0 ${!isCollapsed && 'mr-3'}`} />
          {!isCollapsed && (
            <span className="text-sm truncate">
              {currentOrganizationMember?.organization.name || 'Selecionar Organização'}
            </span>
          )}
        </div>
        {!isCollapsed && (
          <ChevronDown className="w-4 h-4 ml-2 flex-shrink-0" />
        )}
      </button>

      {modalOrganization && modalRoot && createPortal(
        <>
          <div className="fixed inset-0 bg-black bg-opacity-50 z-40"></div>
          <OrganizationSelector
            organizations={userOrganizations}
            isLoading={loadingOrganizations || isLoading}
            isRequired={false}
            onSelect={handleOrganizationSelect}
            onClose={() => setModalOrganization(false)}
          />
        </>,
        modalRoot
      )}
    </>
  );
}; 