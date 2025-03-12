import React, { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { CheckCircle2, Circle, ArrowRight, Settings, MessageSquare, Zap, GitBranch, Key } from 'lucide-react';
import { Link } from 'react-router-dom';
import { useOrganizationContext } from '../../contexts/OrganizationContext';
import { supabase } from '../../lib/supabase';
import { IntegrationFormOpenAI } from '../settings/IntegrationFormOpenAI';

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
  const { t } = useTranslation('dashboard');
  const { currentOrganization } = useOrganizationContext();
  const [loading, setLoading] = useState(true);
  const [showGuide, setShowGuide] = useState(true);
  const [steps, setSteps] = useState<SetupStep[]>([]);
  const [setupProgress, setSetupProgress] = useState(0);
  const [showOpenAIModal, setShowOpenAIModal] = useState(false);

  useEffect(() => {
    if (currentOrganization) {
      checkSetupStatus();
    }
  }, [currentOrganization]);

  const checkSetupStatus = async () => {
    setLoading(true);
    try {
      // Verificar se já tem funil CRM
      const { data: funnels, error: funnelsError } = await supabase
        .from('crm_funnels')
        .select('id')
        .eq('organization_id', currentOrganization?.id)
        .limit(1);

      if (funnelsError) throw funnelsError;
      const hasFunnel = funnels && funnels.length > 0;

      // Se não tiver funil, criar automaticamente
      if (!hasFunnel) {
        await createDefaultFunnel();
      }

      // Verificar se já tem tipos de encerramento
      const { data: closureTypes, error: closureTypesError } = await supabase
        .from('closure_types')
        .select('id')
        .eq('organization_id', currentOrganization?.id)
        .limit(1);

      if (closureTypesError) throw closureTypesError;
      const hasClosureTypes = closureTypes && closureTypes.length > 0;

      // Se não tiver tipos de encerramento, criar automaticamente
      if (!hasClosureTypes) {
        await createDefaultClosureTypes();
      }

      // Verificar se já tem canais
      const { data: channels, error: channelsError } = await supabase
        .from('chat_channels')
        .select('id')
        .eq('organization_id', currentOrganization?.id)
        .limit(1);

      if (channelsError) throw channelsError;
      const hasChannels = channels && channels.length > 0;

      // Verificar se já tem integração com OpenAI
      const { data: openaiIntegration, error: openaiError } = await supabase
        .from('integrations')
        .select('id')
        .eq('organization_id', currentOrganization?.id)
        .eq('type', 'openai')
        .limit(1);

      if (openaiError) throw openaiError;
      const hasOpenAI = openaiIntegration && openaiIntegration.length > 0;

      // Verificar se já tem prompts
      const { data: prompts, error: promptsError } = await supabase
        .from('prompts')
        .select('id')
        .eq('organization_id', currentOrganization?.id)
        .limit(1);

      if (promptsError) throw promptsError;
      const hasPrompts = prompts && prompts.length > 0;

      // Verificar se já tem flows
      const { data: flows, error: flowsError } = await supabase
        .from('flows')
        .select('id')
        .eq('organization_id', currentOrganization?.id)
        .limit(1);

      if (flowsError) throw flowsError;
      const hasFlows = flows && flows.length > 0;

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
          icon: GitBranch
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

  const createDefaultFunnel = async () => {
    try {
      // Criar funil padrão
      const { data: funnel, error: funnelError } = await supabase
        .from('crm_funnels')
        .insert({
          organization_id: currentOrganization?.id,
          name: t('quickSetup.defaultFunnelName'),
          description: t('quickSetup.defaultFunnelDesc')
        })
        .select('id')
        .single();

      if (funnelError) throw funnelError;

      if (funnel) {
        // Criar estágios padrão
        const stages = [
          {
            funnel_id: funnel.id,
            name: t('quickSetup.leadStage'),
            description: t('quickSetup.leadStageDesc'),
            color: '#3B82F6',
            position: 1
          },
          {
            funnel_id: funnel.id,
            name: t('quickSetup.contactStage'),
            description: t('quickSetup.contactStageDesc'),
            color: '#8B5CF6',
            position: 2
          },
          {
            funnel_id: funnel.id,
            name: t('quickSetup.proposalStage'),
            description: t('quickSetup.proposalStageDesc'),
            color: '#EC4899',
            position: 3
          },
          {
            funnel_id: funnel.id,
            name: t('quickSetup.negotiationStage'),
            description: t('quickSetup.negotiationStageDesc'),
            color: '#F59E0B',
            position: 4
          },
          {
            funnel_id: funnel.id,
            name: t('quickSetup.closedWonStage'),
            description: t('quickSetup.closedWonStageDesc'),
            color: '#10B981',
            position: 5
          },
          {
            funnel_id: funnel.id,
            name: t('quickSetup.closedLostStage'),
            description: t('quickSetup.closedLostStageDesc'),
            color: '#EF4444',
            position: 6
          }
        ];

        const { error: stagesError } = await supabase
          .from('crm_stages')
          .insert(stages);

        if (stagesError) throw stagesError;
      }
    } catch (error) {
      console.error('Erro ao criar funil padrão:', error);
    }
  };

  const createDefaultClosureTypes = async () => {
    try {
      const closureTypes = [
        {
          organization_id: currentOrganization?.id,
          title: t('quickSetup.resolvedClosureType'),
          color: '#10B981'
        },
        {
          organization_id: currentOrganization?.id,
          title: t('quickSetup.unresolvedClosureType'),
          color: '#EF4444'
        }
      ];

      const { error } = await supabase
        .from('closure_types')
        .insert(closureTypes);

      if (error) throw error;
    } catch (error) {
      console.error('Erro ao criar tipos de encerramento padrão:', error);
    }
  };

  const handleCloseOpenAIModal = () => {
    setShowOpenAIModal(false);
    // Recarregar o status após fechar o modal
    checkSetupStatus();
  };

  if (loading) {
    return (
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm p-6 mb-8 animate-pulse">
        <div className="h-8 bg-gray-200 dark:bg-gray-700 rounded w-1/3 mb-4"></div>
        <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded w-2/3 mb-6"></div>
        <div className="space-y-4">
          {[1, 2, 3, 4].map((i) => (
            <div key={i} className="flex items-start">
              <div className="h-10 w-10 rounded-full bg-gray-200 dark:bg-gray-700 mr-4"></div>
              <div className="flex-1">
                <div className="h-5 bg-gray-200 dark:bg-gray-700 rounded w-1/2 mb-2"></div>
                <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded w-full"></div>
              </div>
            </div>
          ))}
        </div>
      </div>
    );
  }

  if (!showGuide) {
    return null;
  }

  return (
    <>
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm p-6 mb-8">
        <div className="flex justify-between items-start mb-6">
          <div>
            <h2 className="text-xl font-semibold text-gray-900 dark:text-white flex items-center">
              <Settings className="w-5 h-5 mr-2 text-blue-500" />
              {t('quickSetup.title')}
            </h2>
            <p className="text-gray-600 dark:text-gray-400 mt-1">
              {t('quickSetup.description')}
            </p>
          </div>
          <div className="flex items-center">
            <div className="mr-3">
              <span className="text-sm font-medium text-gray-700 dark:text-gray-300">
                {setupProgress}% {t('quickSetup.complete')}
              </span>
              <div className="w-32 h-2 bg-gray-200 dark:bg-gray-700 rounded-full mt-1">
                <div 
                  className="h-2 bg-blue-500 rounded-full" 
                  style={{ width: `${setupProgress}%` }}
                ></div>
              </div>
            </div>
            <button 
              onClick={() => setShowGuide(false)}
              className="text-gray-400 hover:text-gray-500 dark:text-gray-500 dark:hover:text-gray-400"
            >
              <span className="sr-only">{t('close')}</span>
              <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>
        </div>

        <div className="space-y-4">
          {steps.map((step) => (
            <div 
              key={step.id}
              className={`flex items-start p-4 rounded-lg border ${
                step.completed 
                  ? 'border-green-100 bg-green-50 dark:border-green-900/30 dark:bg-green-900/10' 
                  : 'border-gray-100 hover:bg-gray-50 dark:border-gray-700 dark:hover:bg-gray-700/30'
              }`}
            >
              <div className="flex-shrink-0 mr-4">
                {step.completed ? (
                  <CheckCircle2 className="w-6 h-6 text-green-500" />
                ) : (
                  <Circle className="w-6 h-6 text-gray-300 dark:text-gray-600" />
                )}
              </div>
              <div className="flex-1">
                <h3 className="text-base font-medium text-gray-900 dark:text-white">
                  {step.title}
                </h3>
                <p className="mt-1 text-sm text-gray-600 dark:text-gray-400">
                  {step.description}
                </p>
              </div>
              {!step.completed && (
                step.onClick ? (
                  <button 
                    onClick={step.onClick}
                    className="flex-shrink-0 ml-4 px-3 py-1.5 text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 rounded-md flex items-center"
                  >
                    {t('quickSetup.setup')}
                    <ArrowRight className="w-4 h-4 ml-1" />
                  </button>
                ) : (
                  <Link 
                    to={step.link}
                    className="flex-shrink-0 ml-4 px-3 py-1.5 text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 rounded-md flex items-center"
                  >
                    {t('quickSetup.setup')}
                    <ArrowRight className="w-4 h-4 ml-1" />
                  </Link>
                )
              )}
            </div>
          ))}
        </div>
      </div>

      {/* Modal para configuração da OpenAI */}
      {showOpenAIModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4 overflow-y-auto">
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow-lg max-w-md w-full p-6 max-h-[90vh] overflow-y-auto">
            <h2 className="text-xl font-semibold text-gray-900 dark:text-white mb-4">
              {t('quickSetup.setupOpenAI')}
            </h2>
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
    </>
  );
};

export default QuickSetupGuide; 