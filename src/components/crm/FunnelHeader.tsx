import React, { useState, useEffect } from 'react';
import { ArrowLeft, Plus, ChevronDown, Check, Star, StarOff, Pencil } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { CustomerAddModal } from '../customers/CustomerAddModal';
import { CRMFunnel, CRMStage } from '../../types/crm';
import { supabase } from '../../lib/supabase';
import { FunnelModal } from './FunnelModal';

// Interface estendida para incluir a propriedade 'default'
interface FunnelWithDefault extends Omit<CRMFunnel, 'stages'> {
  default?: boolean;
  stages?: CRMStage[];
  // Definindo explicitamente os tipos possíveis para o indexer
  [key: string]: string | boolean | CRMStage[] | undefined | null | number;
}

interface FunnelHeaderProps {
  funnelName: string;
  funnel: FunnelWithDefault;
  onAddStage: () => void;
  onCustomerAdded?: () => void;
  onBack: () => void;
  allFunnels?: FunnelWithDefault[];
  onSelectFunnel?: (funnelId: string) => void;
  organizationId?: string;
}

export function FunnelHeader({ 
  funnelName, 
  funnel, 
  onAddStage, 
  onCustomerAdded, 
  onBack,
  allFunnels = [], 
  onSelectFunnel,
  organizationId
}: FunnelHeaderProps) {
  const { t } = useTranslation(['crm', 'common']);
  const [showAddCustomerModal, setShowAddCustomerModal] = useState(false);
  const [showFunnelSelector, setShowFunnelSelector] = useState(false);
  const [isMakingDefault, setIsMakingDefault] = useState(false);
  const [showEditFunnelModal, setShowEditFunnelModal] = useState(false);
  // Estado local para controlar quais funis são padrão
  const [localDefaultFunnelId, setLocalDefaultFunnelId] = useState<string | null>(
    allFunnels.find(f => f.default)?.id || null
  );

  // Efeito para sincronizar o estado local com as props quando elas mudam
  useEffect(() => {
    const defaultFunnel = allFunnels.find(f => f.default);
    setLocalDefaultFunnelId(defaultFunnel?.id || null);
  }, [allFunnels]);

  const handleCustomerAdded = () => {
    setShowAddCustomerModal(false);
    if (onCustomerAdded) {
      onCustomerAdded();
    }
  };

  const handleSelectFunnel = (funnelId: string) => {
    if (onSelectFunnel) {
      onSelectFunnel(funnelId);
    }
  };
  
  const handleMakeDefault = async (funnelId: string, e: React.MouseEvent) => {
    e.stopPropagation();
    if (!organizationId || isMakingDefault) return;
    
    setIsMakingDefault(true);
    try {
      await supabase
        .from('crm_funnels')
        .update({ default: true })
        .eq('id', funnelId)
        .eq('organization_id', organizationId);
      
      // Atualizar o estado local para mostrar a estrela imediatamente
      setLocalDefaultFunnelId(funnelId);
    } catch (error) {
      console.error('Erro ao definir funil padrão:', error);
    } finally {
      setIsMakingDefault(false);
    }
  };

  // Função para verificar se um funil é o padrão, usando o estado local
  const isFunnelDefault = (funnelId: string) => {
    return localDefaultFunnelId === funnelId;
  };

  const handleFunnelEdited = async () => {
    // Recarregar a lista de funis após a edição
    // Esta é uma solução simples, mas você pode preferir uma abordagem mais eficiente
    // como passar um callback para recarregar apenas o funil específico
    if (onSelectFunnel && funnel) {
      onSelectFunnel(funnel.id);
    }
  };

  return (
    <div className="flex-shrink-0 border-b border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 p-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center">
          <button
            onClick={onBack}
            className="mr-4 text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300"
          >
            <ArrowLeft className="w-5 h-5" />
          </button>
          
          {/* Seletor de Funis */}
          <div className="relative">
            <button
              onClick={() => setShowFunnelSelector(!showFunnelSelector)}
              className="flex items-center space-x-2 text-lg font-medium text-gray-900 dark:text-white hover:bg-gray-100 dark:hover:bg-gray-700 px-3 py-1.5 rounded transition-colors duration-150"
            >
              <span>{funnelName}</span>
              {isFunnelDefault(funnel.id) && <Star className="w-4 h-4 text-yellow-500 ml-1 flex-shrink-0" />}
              <ChevronDown className={`w-4 h-4 ml-1 flex-shrink-0 transition-transform duration-200 ${showFunnelSelector ? 'transform rotate-180' : ''}`} />
            </button>
            
            {showFunnelSelector && allFunnels.length > 0 && (
              <>
                {/* Overlay para fechar o dropdown ao clicar fora */}
                <div 
                  className="fixed inset-0 z-10" 
                  onClick={() => setShowFunnelSelector(false)}
                />
                
                <div className="absolute z-20 mt-2 w-72 rounded-md shadow-lg bg-white dark:bg-gray-800 ring-1 ring-black dark:ring-gray-700 ring-opacity-5 overflow-hidden transform origin-top scale-100 opacity-100 transition-all duration-200 ease-out">
                  <div className="flex items-center justify-between px-4 py-2 border-b border-gray-200 dark:border-gray-700">
                    <div className="text-sm font-medium text-gray-700 dark:text-gray-300">
                      {t('crm:funnels.selectFunnel')}
                    </div>
                    <button
                      className="text-gray-400 hover:text-gray-500 dark:hover:text-gray-300"
                      onClick={() => setShowFunnelSelector(false)}
                    >
                      <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                      </svg>
                    </button>
                  </div>
                  
                  <div className="py-1 max-h-96 overflow-y-auto scrollbar-thin scrollbar-thumb-gray-300 dark:scrollbar-thumb-gray-600" role="menu" aria-orientation="vertical">
                    {allFunnels.map((f) => (
                      <div
                        key={f.id}
                        className={`flex items-center justify-between px-4 py-2.5 text-sm text-gray-800 dark:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-700 cursor-pointer transition-colors duration-150 ${f.id === funnel.id ? 'bg-blue-50 dark:bg-blue-900/20 font-medium' : ''}`}
                        role="menuitem"
                        onClick={() => handleSelectFunnel(f.id)}
                      >
                        <div className="flex items-center truncate pr-2">
                          {f.id === funnel.id && <Check className="w-4 h-4 mr-2 text-blue-500 flex-shrink-0" />}
                          <span className={`${f.id === funnel.id ? 'font-medium' : ''} text-gray-800 dark:text-gray-200 truncate`}>{f.name}</span>
                        </div>
                        
                        <button
                          onClick={(e) => handleMakeDefault(f.id, e)}
                          disabled={isFunnelDefault(f.id)}
                          title={isFunnelDefault(f.id) ? t('crm:funnels.alreadyDefault') : t('crm:funnels.makeDefault')}
                          className={`flex-shrink-0 p-1 rounded-full hover:bg-gray-200 dark:hover:bg-gray-600 transition-colors duration-150 ${isFunnelDefault(f.id) ? 'text-yellow-500' : 'text-gray-400 dark:text-gray-500 hover:text-yellow-500 dark:hover:text-yellow-500'}`}
                        >
                          {isFunnelDefault(f.id) ? <Star className="w-4 h-4" /> : <StarOff className="w-4 h-4" />}
                        </button>
                      </div>
                    ))}
                  </div>
                </div>
              </>
            )}
          </div>
        </div>
        <div className="flex items-center space-x-2">
          <button
            onClick={() => setShowAddCustomerModal(true)}
            className="inline-flex items-center px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 transition-colors duration-150"
          >
            <Plus className="w-4 h-4 mr-2" />
            {t('customers:addCustomer')}
          </button>
          <button
            onClick={onAddStage}
            className="inline-flex items-center px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm text-sm font-medium text-gray-700 dark:text-gray-300 bg-white dark:bg-gray-800 hover:bg-gray-50 dark:hover:bg-gray-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 transition-colors duration-150"
          >
            <Plus className="w-4 h-4 mr-2" />
            {t('crm:stages.addStage')}
          </button>
          <button
            onClick={() => setShowEditFunnelModal(true)}
            className="inline-flex items-center px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm text-sm font-medium text-gray-700 dark:text-gray-300 bg-white dark:bg-gray-800 hover:bg-gray-50 dark:hover:bg-gray-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 transition-colors duration-150"
            title={t('crm:funnels.editFunnel')}
          >
            <Pencil className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Customer Add Modal */}
      {showAddCustomerModal && (
        <CustomerAddModal 
          onClose={() => setShowAddCustomerModal(false)}
          onSuccess={handleCustomerAdded}
          initialFunnelId={funnel.id}
        />
      )}

      {/* Funnel Edit Modal */}
      {showEditFunnelModal && organizationId && (
        <FunnelModal
          onClose={() => setShowEditFunnelModal(false)}
          funnel={funnel}
          organizationId={organizationId}
          onSuccess={handleFunnelEdited}
        />
      )}
    </div>
  );
}