import React, { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { CheckCircle2, Circle, ArrowRight, Settings, MessageSquare, Zap, GitBranch, Key } from 'lucide-react';
import { Link } from 'react-router-dom';
import { useAuthContext } from '../../contexts/AuthContext';
import { IntegrationFormOpenAI } from '../settings/IntegrationFormOpenAI';
import FlowCreateModal from '../flow/FlowCreateModal';
import { useClosureTypes, usePrompts, useFlows, useOpenAIIntegrations, useChannels } from '../../hooks/useQueryes';
import { useQueryClient } from '@tanstack/react-query';

interface SetupStep {
  id: string;
  title: string;
  description: string;
  completed: boolean;
  link: string;
  icon: React.ElementType;
  onClick?: () => void;
}

const QuickSetupGuide: React.FC = () => {
  const { t } = useTranslation(['dashboard', 'flows', 'common']);
  const { currentOrganizationMember } = useAuthContext();
  const [loading, setLoading] = useState(true);
  const [showGuide, setShowGuide] = useState(true);
  const [steps, setSteps] = useState<SetupStep[]>([]);
  const [setupProgress, setSetupProgress] = useState(0);
  const [showOpenAIModal, setShowOpenAIModal] = useState(false);
  const [showFlowCreateModal, setShowFlowCreateModal] = useState(false);
  const [setupChecked, setSetupChecked] = useState(false);
  
  // Usar o hook useClosureTypes para buscar os tipos de encerramento
  const { isLoading: isLoadingClosureTypes } = useClosureTypes(currentOrganizationMember?.organization.id);
  
  // Usar o hook usePrompts para buscar os prompts
  const { data: promptsData, isLoading: promptsLoading } = usePrompts();
  
  // Usar o hook useFlows para buscar os fluxos
  const { data: flowsData, isLoading: flowsLoading } = useFlows();
  
  // Usar o hook useOpenAIIntegrations para buscar as integrações OpenAI
  const { data: openAIIntegrationsData, isLoading: openAIIntegrationsLoading } = useOpenAIIntegrations();
  
  // Usar o hook useChannels para buscar os canais de chat
  const { data: channelsData, isLoading: channelsLoading } = useChannels();
  
  // Obter o queryClient para invalidar consultas
  const queryClient = useQueryClient();

  // Verificar se todos os hooks terminaram de carregar
  const allHooksLoaded = !isLoadingClosureTypes && !promptsLoading && 
                          !flowsLoading && !openAIIntegrationsLoading && 
                          !channelsLoading;

  useEffect(() => {
    // Resetar o setupChecked quando currentOrganizationMember mudar
    if (currentOrganizationMember) {
      // Resetar todos os estados relevantes
      setSetupChecked(false);
      setLoading(true);
      setShowGuide(true);
      setSteps([]);
      setSetupProgress(0);
    }
  }, [currentOrganizationMember]);

  useEffect(() => {
    if (currentOrganizationMember && !setupChecked && allHooksLoaded) {
      setSetupChecked(true);
      checkSetupStatus();
    }
  }, [currentOrganizationMember, setupChecked, allHooksLoaded]);

  useEffect(() => {
    // Verificar o status quando os dados dos hooks são carregados ou quando o setupChecked muda
    if (allHooksLoaded && currentOrganizationMember && setupChecked) {
      checkSetupStatus();
    }
  }, [allHooksLoaded, currentOrganizationMember, setupChecked]);

  const checkSetupStatus = async () => {
    if (!currentOrganizationMember) {
      setLoading(false);
      return;
    }
    
    setLoading(true);
    try {
      // Verificar se já tem canais usando o hook
      const hasChannels = Boolean(channelsData && channelsData.length > 0);
      
      // Verificar se já tem integração com OpenAI usando o hook
      const hasOpenAI = Boolean(openAIIntegrationsData && openAIIntegrationsData.length > 0);

      // Verificar se já tem prompts usando os dados do hook
      const hasPrompts = Boolean(promptsData && promptsData.length > 0);

      // Verificar se já tem flows usando os dados do hook
      const hasFlows = Boolean(flowsData && flowsData.length > 0);

      // Atualizar os passos com base no status
      const updatedSteps: SetupStep[] = [
        {
          id: 'channel',
          title: t('quickSetup.createChannel'),
          description: t('quickSetup.createChannelDesc'),
          completed: hasChannels,
          link: '/app/channels/new',
          icon: MessageSquare
        },
        {
          id: 'openai',
          title: t('quickSetup.setupOpenAI'),
          description: t('quickSetup.setupOpenAIDesc'),
          completed: hasOpenAI,
          link: '/app/settings/integrations',
          icon: Key,
          onClick: () => setShowOpenAIModal(true)
        },
        {
          id: 'prompt',
          title: t('quickSetup.createPrompt'),
          description: t('quickSetup.createPromptDesc'),
          completed: hasPrompts,
          link: '/app/prompts/new',
          icon: Zap
        },
        {
          id: 'flow',
          title: t('quickSetup.createFlow'),
          description: t('quickSetup.createFlowDesc'),
          completed: hasFlows,
          link: '/app/flows',
          icon: GitBranch,
          onClick: () => setShowFlowCreateModal(true)
        }
      ];

      setSteps(updatedSteps);

      // Calcular progresso
      const completedSteps = updatedSteps.filter(step => step.completed).length;
      const progress = Math.round((completedSteps / updatedSteps.length) * 100);
      setSetupProgress(progress);

      // Se todos os passos estiverem completos, ocultar o guia
      if (progress === 100) {
        setShowGuide(false);
      }
    } catch (error) {
      console.error('Erro ao verificar status de configuração:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleCloseOpenAIModal = () => {
    setShowOpenAIModal(false);
    // Recarregar apenas os passos sem criar novos recursos
    loadStepsStatus();
  };

  const handleFlowCreated = () => {
    setShowFlowCreateModal(false);
    // Recarregar apenas os passos sem criar novos recursos
    loadStepsStatus();
    // Invalidar o cache dos flows incluindo o organizationId
    if (currentOrganizationMember?.organization.id) {
      queryClient.invalidateQueries({ 
        queryKey: ['flows', currentOrganizationMember.organization.id] 
      });
    }
  };

  // Função para carregar apenas o status dos passos sem criar recursos
  const loadStepsStatus = async () => {
    if (!currentOrganizationMember || !allHooksLoaded) {
      return;
    }
    
    try {
      // Verificar se já tem canais usando o hook
      const hasChannels = Boolean(channelsData && channelsData.length > 0);

      // Verificar se já tem integração com OpenAI usando o hook
      const hasOpenAI = Boolean(openAIIntegrationsData && openAIIntegrationsData.length > 0);

      // Verificar se já tem prompts usando os dados do hook
      const hasPrompts = Boolean(promptsData && promptsData.length > 0);

      // Verificar se já tem flows usando os dados do hook
      const hasFlows = Boolean(flowsData && flowsData.length > 0);

      // Atualizar os passos com base no status
      const updatedSteps: SetupStep[] = [
        {
          id: 'channel',
          title: t('quickSetup.createChannel'),
          description: t('quickSetup.createChannelDesc'),
          completed: hasChannels,
          link: '/app/channels/new',
          icon: MessageSquare
        },
        {
          id: 'openai',
          title: t('quickSetup.setupOpenAI'),
          description: t('quickSetup.setupOpenAIDesc'),
          completed: hasOpenAI,
          link: '/app/settings/integrations',
          icon: Key,
          onClick: () => setShowOpenAIModal(true)
        },
        {
          id: 'prompt',
          title: t('quickSetup.createPrompt'),
          description: t('quickSetup.createPromptDesc'),
          completed: hasPrompts,
          link: '/app/prompts/new',
          icon: Zap
        },
        {
          id: 'flow',
          title: t('quickSetup.createFlow'),
          description: t('quickSetup.createFlowDesc'),
          completed: hasFlows,
          link: '/app/flows',
          icon: GitBranch,
          onClick: () => setShowFlowCreateModal(true)
        }
      ];

      setSteps(updatedSteps);

      // Calcular progresso
      const completedSteps = updatedSteps.filter(step => step.completed).length;
      const progress = Math.round((completedSteps / updatedSteps.length) * 100);
      setSetupProgress(progress);

      // Se todos os passos estiverem completos, ocultar o guia
      if (progress === 100) {
        setShowGuide(false);
      }
    } catch (error) {
      console.error('Erro ao verificar status de configuração:', error);
    }
  };

  if (loading) {
    return null;
  }

  if (!showGuide) {
    return null;
  }

  return (
    <>
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm p-4 sm:p-6 mb-6 sm:mb-8">
        <div className="flex flex-col sm:flex-row sm:justify-between sm:items-start mb-4 sm:mb-6">
          <div className="flex flex-col w-full mb-4 sm:mb-0 sm:w-auto">
            <div className="flex justify-between items-start w-full">
              <h2 className="text-lg sm:text-xl font-semibold text-gray-900 dark:text-white flex items-center">
                <Settings className="w-5 h-5 mr-2 text-blue-500" />
                {t('quickSetup.title')}
              </h2>
              <button 
                onClick={() => setShowGuide(false)}
                className="text-gray-400 hover:text-gray-500 dark:text-gray-500 dark:hover:text-gray-400 sm:hidden"
                aria-label={t('close')}
              >
                <span className="sr-only">{t('close')}</span>
                <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
            <p className="text-sm sm:text-base text-gray-600 dark:text-gray-400 mt-1">
              {t('quickSetup.description')}
            </p>
          </div>
          <div className="flex items-center justify-between w-full sm:w-auto sm:justify-start">
            <div className="w-full sm:w-auto mr-0 sm:mr-3">
              <span className="text-xs sm:text-sm font-medium text-gray-700 dark:text-gray-300">
                {setupProgress}% {t('quickSetup.complete')}
              </span>
              <div className="w-full sm:w-32 h-2 bg-gray-200 dark:bg-gray-700 rounded-full mt-1">
                <div 
                  className="h-2 bg-blue-500 rounded-full" 
                  style={{ width: `${setupProgress}%` }}
                ></div>
              </div>
            </div>
            <button 
              onClick={() => setShowGuide(false)}
              className="hidden sm:block text-gray-400 hover:text-gray-500 dark:text-gray-500 dark:hover:text-gray-400 ml-3"
              aria-label={t('close')}
            >
              <span className="sr-only">{t('close')}</span>
              <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>
        </div>

        <div className="space-y-3 sm:space-y-4">
          {steps.map((step) => (
            <div 
              key={step.id}
              className={`flex flex-col sm:flex-row items-start p-3 sm:p-4 rounded-lg border ${
                step.completed 
                  ? 'border-green-100 bg-green-50 dark:border-green-900/30 dark:bg-green-900/10' 
                  : 'border-gray-100 hover:bg-gray-50 dark:border-gray-700 dark:hover:bg-gray-700/30'
              }`}
            >
              <div className="flex items-start w-full mb-3 sm:mb-0">
                <div className="flex-shrink-0 mr-3 sm:mr-4">
                  {step.completed ? (
                    <CheckCircle2 className="w-5 h-5 sm:w-6 sm:h-6 text-green-500" />
                  ) : (
                    <Circle className="w-5 h-5 sm:w-6 sm:h-6 text-gray-300 dark:text-gray-600" />
                  )}
                </div>
                <div className="flex-1">
                  <h3 className="text-sm sm:text-base font-medium text-gray-900 dark:text-white">
                    {step.title}
                  </h3>
                  <p className="mt-1 text-xs sm:text-sm text-gray-600 dark:text-gray-400">
                    {step.description}
                  </p>
                </div>
              </div>
              {!step.completed && (
                <div className="w-full sm:w-auto flex justify-end sm:ml-4 mt-2 sm:mt-0">
                  {step.onClick ? (
                    <button 
                      onClick={step.onClick}
                      className="w-full sm:w-auto px-3 py-1.5 text-xs sm:text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 rounded-md flex items-center justify-center"
                    >
                      {t('quickSetup.setup')}
                      <ArrowRight className="w-3 h-3 sm:w-4 sm:h-4 ml-1" />
                    </button>
                  ) : (
                    <Link 
                      to={step.link}
                      className="w-full sm:w-auto px-3 py-1.5 text-xs sm:text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 rounded-md flex items-center justify-center"
                    >
                      {t('quickSetup.setup')}
                      <ArrowRight className="w-3 h-3 sm:w-4 sm:h-4 ml-1" />
                    </Link>
                  )}
                </div>
              )}
            </div>
          ))}
        </div>
      </div>

      {/* Modal para configuração da OpenAI */}
      {showOpenAIModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-2 sm:p-4 overflow-y-auto">
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow-lg w-full max-w-md p-4 sm:p-6 max-h-[90vh] overflow-y-auto">
            <div className="flex justify-between items-center mb-4">
              <h2 className="text-lg sm:text-xl font-semibold text-gray-900 dark:text-white">
                {t('quickSetup.setupOpenAI')}
              </h2>
              <button 
                onClick={handleCloseOpenAIModal}
                className="text-gray-400 hover:text-gray-500 dark:text-gray-500 dark:hover:text-gray-400"
                aria-label={t('close')}
              >
                <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
            <IntegrationFormOpenAI 
              onSuccess={() => {
                handleCloseOpenAIModal();
                checkSetupStatus();
              }}
              onCancel={handleCloseOpenAIModal}
            />
          </div>
        </div>
      )}

      {/* Modal para criação de fluxo */}
      <FlowCreateModal 
        isOpen={showFlowCreateModal}
        onClose={() => setShowFlowCreateModal(false)}
        onSuccess={() => handleFlowCreated()}
      />
    </>
  );
};

export default QuickSetupGuide; 