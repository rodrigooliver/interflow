import React from 'react';
import { useTranslation } from 'react-i18next';
import { Building2, Users, Loader2 } from 'lucide-react';
import { usePartnerOrganizations, PartnerOrganization } from '../../hooks/usePartner';

const PartnerOrganizations: React.FC = () => {
  const { t } = useTranslation(['profile', 'common']);
  const { data: organizations = [], isLoading, error } = usePartnerOrganizations();
  
  // Componente para exibir cada organização
  const OrganizationCard = ({ org }: { org: PartnerOrganization }) => (
    <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm p-3 mb-2 flex items-center">
      {org.logo_url ? (
        <img src={org.logo_url} alt={org.name} className="w-10 h-10 rounded-full mr-3 object-cover" />
      ) : (
        <div className="w-10 h-10 rounded-full bg-gray-200 dark:bg-gray-700 mr-3 flex items-center justify-center">
          <Building2 className="w-5 h-5 text-gray-500 dark:text-gray-400" />
        </div>
      )}
      <div className="flex-1">
        <h4 className="text-sm font-medium text-gray-900 dark:text-white">{org.name}</h4>
        <p className="text-xs text-gray-500 dark:text-gray-400">
          {org.email || t('profile:noEmail', 'Sem email')}
        </p>
      </div>
    </div>
  );
  
  // Componente para exibir cada seção
  const OrganizationSection = ({ 
    title, 
    orgs, 
    icon 
  }: { 
    title: string; 
    orgs: PartnerOrganization[]; 
    icon: React.ReactNode 
  }) => (
    orgs.length > 0 ? (
      <div className="mb-4">
        <h4 className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-2 flex items-center">
          {icon}
          <span className="ml-2">{title}</span>
          <span className="ml-2 text-xs bg-gray-200 dark:bg-gray-600 text-gray-700 dark:text-gray-300 px-2 py-0.5 rounded-full">
            {orgs.length}
          </span>
        </h4>
        <div className="space-y-2">
          {orgs.map(org => (
            <OrganizationCard key={org.id} org={org} />
          ))}
        </div>
      </div>
    ) : null
  );
  
  if (isLoading) {
    return (
      <div className="flex justify-center items-center py-4">
        <Loader2 className="w-6 h-6 animate-spin text-blue-500" />
      </div>
    );
  }
  
  if (error) {
    return (
      <div className="bg-red-50 dark:bg-red-900/50 text-red-700 dark:text-red-400 p-4 rounded-md">
        {t('common:errorFetchingData')}
      </div>
    );
  }
  
  if (organizations.length === 0) {
    return (
      <p className="text-sm text-gray-500 dark:text-gray-400">
        {t('profile:noOrganizations', 'Você ainda não possui organizações vinculadas como parceiro.')}
      </p>
    );
  }
  
  // Separar organizações por tipo de relacionamento
  const indicationOrgs = organizations.filter((org: PartnerOrganization) => org.relationships.includes('indication'));
  const sellerOrgs = organizations.filter((org: PartnerOrganization) => org.relationships.includes('seller'));
  const supportOrgs = organizations.filter((org: PartnerOrganization) => org.relationships.includes('support'));
  
  return (
    <div className="space-y-4">
      <OrganizationSection 
        title={t('profile:indicationOrganizations', 'Organizações de Indicação')} 
        orgs={indicationOrgs} 
        icon={<Users className="w-4 h-4 text-purple-500" />} 
      />
      
      <OrganizationSection 
        title={t('profile:sellerOrganizations', 'Organizações de Venda')} 
        orgs={sellerOrgs} 
        icon={<Users className="w-4 h-4 text-green-500" />} 
      />
      
      <OrganizationSection 
        title={t('profile:supportOrganizations', 'Organizações de Suporte')} 
        orgs={supportOrgs} 
        icon={<Users className="w-4 h-4 text-blue-500" />} 
      />
    </div>
  );
};

export default PartnerOrganizations; 