import React, { useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { X, Building2, Loader2 } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { UserOrganization } from '../../hooks/useQueryes';

interface OrganizationSelectorProps {
  organizations: UserOrganization[];
  isLoading: boolean;
  onSelect: (organizationId: string) => void;
  onClose: () => void;
  isRequired?: boolean;
}

export default function OrganizationSelector({
  organizations,
  isLoading,
  onSelect,
  onClose,
  isRequired = false
}: OrganizationSelectorProps) {
  console.log('[OrgSelector] Renderizando seletor de organizações', {
    organizationsCount: organizations?.length || 0,
    isLoading,
    organizations,
    isRequired
  });
  
  const { t } = useTranslation(['common']);
  const navigate = useNavigate();
  
  useEffect(() => {
    console.log('[OrgSelector] Organizações disponíveis:', organizations);
    
    // Impedir o scroll da página quando o modal estiver aberto
    document.body.style.overflow = 'hidden';
    
    // Garantir que o modal seja visível
    const modalElement = document.getElementById('organization-selector-modal');
    if (modalElement) {
      console.log('[OrgSelector] Modal encontrado no DOM');
      modalElement.style.display = 'flex';
      modalElement.style.zIndex = '9999'; // Garantir que o z-index seja alto o suficiente
    } else {
      console.log('[OrgSelector] Modal não encontrado no DOM');
      
      // Se o modal não existir, criar um novo
      const newModalElement = document.createElement('div');
      newModalElement.id = 'organization-selector-modal';
      newModalElement.className = 'fixed inset-0 bg-gray-500 bg-opacity-75 flex items-center justify-center p-4 z-[9999]';
      newModalElement.style.display = 'flex';
      document.body.appendChild(newModalElement);
      console.log('[OrgSelector] Modal criado dinamicamente');
    }
    
    // Adicionar uma classe ao body para indicar que o modal está aberto
    document.body.classList.add('modal-open');
    
    return () => {
      console.log('[OrgSelector] Desmontando componente');
      document.body.style.overflow = 'auto';
      document.body.classList.remove('modal-open');
      
      // Remover o modal se foi criado dinamicamente
      const modalElement = document.getElementById('organization-selector-modal');
      if (modalElement && modalElement.parentNode && !modalElement.hasChildNodes()) {
        modalElement.parentNode.removeChild(modalElement);
        console.log('[OrgSelector] Modal removido');
      }
    };
  }, [organizations]);

  const handleSelect = (organizationId: string) => {
    console.log('[OrgSelector] Organização selecionada:', organizationId);
    onSelect(organizationId);
  };
  
  // Verificar se temos organizações para mostrar
  if (!organizations || organizations.length === 0) {
    console.log('[OrgSelector] Sem organizações para mostrar');
    return null;
  }
  
  console.log('[OrgSelector] Renderizando modal com', organizations.length, 'organizações');

  return (
    <div 
      id="organization-selector-modal"
      className="fixed inset-0 bg-gray-500 bg-opacity-75 flex items-center justify-center p-4 z-[9999]"
      style={{ display: 'flex' }}
    >
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow-xl max-w-md w-full">
        <div className="flex justify-between items-center p-6 border-b dark:border-gray-700">
          <h3 className="text-lg font-medium text-gray-900 dark:text-white">
            {t('common:selectOrganization', 'Selecionar organização')}
          </h3>
          {!isRequired && (
            <button
              onClick={() => {
                console.log('[OrgSelector] Modal fechado pelo usuário');
                onClose();
              }}
              className="text-gray-400 hover:text-gray-500 dark:hover:text-gray-300"
            >
              <X className="w-5 h-5" />
            </button>
          )}
        </div>
        <div className="p-6">
          <p className="mb-4 text-sm text-gray-600 dark:text-gray-400">
            {isRequired 
              ? t('common:selectOrganizationRequired', 'Você precisa selecionar uma organização para continuar:')
              : t('common:selectOrganizationDescription', 'Você pertence a várias organizações. Selecione qual deseja acessar:')}
          </p>
          
          {isLoading ? (
            <div className="flex justify-center items-center py-8">
              <Loader2 className="w-8 h-8 animate-spin text-blue-600" />
              <span className="ml-2 text-gray-700 dark:text-gray-300">
                {t('common:loading', 'Carregando...')}
              </span>
            </div>
          ) : (
            <div className="space-y-3 mt-4">
              {organizations.map((org) => (
                <button
                  key={org.id}
                  onClick={() => handleSelect(org.id)}
                  className="w-full flex items-center p-4 border border-gray-200 dark:border-gray-700 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors"
                >
                  <div className="flex-shrink-0 mr-3">
                    {org.logo_url ? (
                      <img 
                        src={org.logo_url} 
                        alt={org.name} 
                        className="w-10 h-10 rounded-full object-cover"
                      />
                    ) : (
                      <div className="w-10 h-10 rounded-full bg-blue-100 dark:bg-blue-900 flex items-center justify-center">
                        <Building2 className="w-5 h-5 text-blue-600 dark:text-blue-400" />
                      </div>
                    )}
                  </div>
                  <div className="flex-1 text-left">
                    <h4 className="font-medium text-gray-900 dark:text-white">{org.name}</h4>
                    <p className="text-sm text-gray-500 dark:text-gray-400 capitalize">{t(`common:roles.${org.role}`, org.role)}</p>
                  </div>
                </button>
              ))}
            </div>
          )}
          
          {!isRequired && (
            <div className="mt-6 flex justify-end">
              <button
                onClick={() => {
                  console.log('[OrgSelector] Redirecionando para criação de nova organização');
                  navigate('/signup');
                }}
                className="text-sm text-blue-600 hover:text-blue-500 dark:text-blue-400 dark:hover:text-blue-300"
              >
                {t('common:createNewOrganization', 'Criar nova organização')}
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
} 