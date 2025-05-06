import React, { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { X, Search, User } from 'lucide-react';
import { supabase } from '../../lib/supabase';
import { useAuthContext } from '../../contexts/AuthContext';

interface ProviderWithDetails {
  id: string;
  user_id: string;
  full_name: string;
  avatar_url?: string;
  email?: string;
  organization_id: string;
  role: string;
  [key: string]: unknown;
}

interface ProviderSelectModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSelectProvider: (provider: ProviderWithDetails) => void;
}

const ProviderSelectModal: React.FC<ProviderSelectModalProps> = ({ isOpen, onClose, onSelectProvider }) => {
  const { t } = useTranslation(['common', 'medical']);
  const { currentOrganizationMember } = useAuthContext();
  const organizationId = currentOrganizationMember?.organization_id;
  
  const [providers, setProviders] = useState<ProviderWithDetails[]>([]);
  const [loading, setLoading] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [filteredProviders, setFilteredProviders] = useState<ProviderWithDetails[]>([]);
  
  // Buscar profissionais quando o modal abrir
  useEffect(() => {
    if (isOpen && organizationId) {
      fetchProviders();
    }
  }, [isOpen, organizationId]);
  
  // Filtrar profissionais quando o termo de busca mudar
  useEffect(() => {
    if (!searchTerm.trim()) {
      setFilteredProviders(providers);
      return;
    }
    
    const filtered = providers.filter(
      provider => 
        provider.full_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        (provider.email && provider.email.toLowerCase().includes(searchTerm.toLowerCase()))
    );
    
    setFilteredProviders(filtered);
  }, [searchTerm, providers]);
  
  const fetchProviders = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('organization_members')
        .select('id, user_id, organization_id, role, profiles:profile_id(id, full_name, avatar_url, email)')
        .eq('organization_id', organizationId);
      
      if (error) throw error;
      
      // Formatar dados para o formato esperado
      const formattedProviders = data.map(member => ({
        id: member.id,
        user_id: member.user_id,
        organization_id: member.organization_id,
        role: member.role,
        full_name: member.profiles?.full_name || 'Sem nome',
        avatar_url: member.profiles?.avatar_url,
        email: member.profiles?.email,
      }));
      
      setProviders(formattedProviders);
      setFilteredProviders(formattedProviders);
    } catch (error) {
      console.error('Erro ao buscar profissionais:', error);
    } finally {
      setLoading(false);
    }
  };
  
  if (!isOpen) return null;
  
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black bg-opacity-50">
      <div className="w-full max-w-md p-6 bg-white rounded-lg shadow-xl dark:bg-gray-800">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-xl font-bold text-gray-900 dark:text-white">
            {t('medical:selectProvider')}
          </h2>
          <button
            type="button"
            className="text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-300"
            onClick={onClose}
          >
            <X className="w-5 h-5" />
          </button>
        </div>
        
        {/* Caixa de busca */}
        <div className="relative mb-4">
          <input
            type="text"
            className="w-full px-10 py-2 border border-gray-300 rounded-md shadow-sm focus:ring-green-500 focus:border-green-500 dark:bg-gray-700 dark:border-gray-600 dark:text-white"
            placeholder={t('common:search')}
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
          <Search className="absolute w-5 h-5 text-gray-400 left-3 top-2" />
          {searchTerm && (
            <button
              className="absolute right-3 top-2"
              onClick={() => setSearchTerm('')}
            >
              <X className="w-5 h-5 text-gray-400" />
            </button>
          )}
        </div>
        
        {/* Lista de profissionais */}
        <div className="max-h-60 overflow-y-auto">
          {loading ? (
            <div className="flex items-center justify-center p-4">
              <div className="w-5 h-5 border-2 border-green-600 rounded-full animate-spin border-t-transparent"></div>
              <span className="ml-2 text-gray-600 dark:text-gray-300">{t('common:loading')}</span>
            </div>
          ) : filteredProviders.length === 0 ? (
            <div className="p-4 text-center text-gray-500 dark:text-gray-400">
              {t('common:noResults')}
            </div>
          ) : (
            <ul className="divide-y divide-gray-200 dark:divide-gray-700">
              {filteredProviders.map((provider) => (
                <li 
                  key={provider.id}
                  className="py-2 cursor-pointer hover:bg-gray-50 dark:hover:bg-gray-700"
                  onClick={() => onSelectProvider(provider)}
                >
                  <div className="flex items-center px-2">
                    <div className="flex-shrink-0 w-10 h-10 bg-gray-200 rounded-full flex items-center justify-center dark:bg-gray-700">
                      {provider.avatar_url ? (
                        <img
                          src={provider.avatar_url}
                          alt={provider.full_name}
                          className="rounded-full w-10 h-10 object-cover"
                        />
                      ) : (
                        <User className="w-5 h-5 text-gray-500 dark:text-gray-400" />
                      )}
                    </div>
                    <div className="ml-3">
                      <p className="text-sm font-medium text-gray-900 dark:text-white">{provider.full_name}</p>
                      {/* <p className="text-xs text-gray-500 dark:text-gray-400">{provider.role}</p> */}
                      {provider.email && (
                        <p className="text-xs text-gray-500 dark:text-gray-400">{provider.email}</p>
                      )}
                    </div>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>
    </div>
  );
};

export default ProviderSelectModal; 