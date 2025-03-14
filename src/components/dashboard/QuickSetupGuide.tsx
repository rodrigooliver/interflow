import React, { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { CheckCircle2, Circle, ArrowRight, Settings, MessageSquare, Zap, GitBranch, Key } from 'lucide-react';
import { Link } from 'react-router-dom';
import { useAuthContext } from '../../contexts/AuthContext';
import { supabase } from '../../lib/supabase';
import { IntegrationFormOpenAI } from '../settings/IntegrationFormOpenAI';
import FlowCreateModal from '../flow/FlowCreateModal';
import { useClosureTypes } from '../../hooks/useQueryes';
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
  const [isCreatingFunnel, setIsCreatingFunnel] = useState(false);
  
  // Usar o hook useClosureTypes para buscar os tipos de encerramento
  const { data: closureTypesData, isLoading: isLoadingClosureTypes } = useClosureTypes(currentOrganizationMember?.organization.id);
  
  // Obter o queryClient para invalidar consultas
  const queryClient = useQueryClient();

  useEffect(() => {
    // Resetar o setupChecked quando currentOrganizationMember mudar
    if (currentOrganizationMember) {
      // Resetar todos os estados relevantes
      setSetupChecked(false);
      setLoading(true);
      setShowGuide(true);
      setSteps([]);
      setSetupProgress(0);
      setIsCreatingFunnel(false);
    }
    
    // Limpar bloqueios quando o componente for desmontado ou quando currentOrganizationMember mudar
    return () => {
      if (currentOrganizationMember) {
        const lockKey = `funnel_creation_lock_${currentOrganizationMember.organization.id}`;
        localStorage.removeItem(lockKey);
      }
    };
  }, [currentOrganizationMember]);

  useEffect(() => {
    if (currentOrganizationMember && !setupChecked) {
      // Verificar se já existe um bloqueio global
      const lockKey = `funnel_creation_lock_${currentOrganizationMember?.organization.id}`;
      const existingLock = localStorage.getItem(lockKey);
      
      if (existingLock) {
        const lockData = JSON.parse(existingLock);
        const lockTime = new Date(lockData.timestamp);
        const now = new Date();
        
        // Se o bloqueio tiver menos de 30 segundos, aguardar e verificar novamente
        if ((now.getTime() - lockTime.getTime()) < 30000) {
          console.log('Outra instância está criando um funil, aguardando...');
          
          // Aguardar 5 segundos e verificar novamente
          const timeoutId = setTimeout(() => {
            setSetupChecked(false); // Forçar nova verificação
          }, 5000);
          
          return () => clearTimeout(timeoutId);
        } else {
          // Se o bloqueio for antigo, removê-lo
          localStorage.removeItem(lockKey);
        }
      }
      
      setSetupChecked(true);
      checkSetupStatus();
    }
  }, [currentOrganizationMember, setupChecked]);

  const checkSetupStatus = async () => {
    if (!currentOrganizationMember) {
      setLoading(false);
      return;
    }
    
    setLoading(true);
    try {
      // Limpar funis incompletos que possam ter sido criados em tentativas anteriores
      await cleanupIncompleteFunnels();
      
      // Verificar se já tem funil CRM
      const { data: funnels, error: funnelsError } = await supabase
        .from('crm_funnels')
        .select('id, is_active')
        .eq('organization_id', currentOrganizationMember?.organization.id);

      if (funnelsError) throw funnelsError;
      
      // Verificar se existe algum funil ativo
      const activeFunnels = funnels?.filter(f => f.is_active === true) || [];
      const hasFunnel = activeFunnels.length > 0;
      
      // Verificar se existe algum funil em processo de criação
      const inProgressFunnels = funnels?.filter(f => f.is_active === false) || [];
      const hasInProgressFunnel = inProgressFunnels.length > 0;

      // Se não tiver funil e não estiver criando um, criar automaticamente
      if (!hasFunnel && !hasInProgressFunnel && !isCreatingFunnel) {
        setIsCreatingFunnel(true);
        await createDefaultFunnel();
        setIsCreatingFunnel(false);
      }

      // Verificar se já tem tipos de encerramento usando os dados do hook
      const hasClosureTypes = closureTypesData && closureTypesData.length > 0;

      // Se não tiver tipos de encerramento, criar automaticamente
      if (!hasClosureTypes && !isLoadingClosureTypes) {
        await createDefaultClosureTypes();
      }

      // Verificar se já tem canais
      const { data: channels, error: channelsError } = await supabase
        .from('chat_channels')
        .select('id')
        .eq('organization_id', currentOrganizationMember?.organization.id)
        .limit(1);

      if (channelsError) throw channelsError;
      const hasChannels = channels && channels.length > 0;

      // Verificar se já tem integração com OpenAI
      const { data: openaiIntegration, error: openaiError } = await supabase
        .from('integrations')
        .select('id')
        .eq('organization_id', currentOrganizationMember?.organization.id)
        .eq('type', 'openai')
        .limit(1);

      if (openaiError) throw openaiError;
      const hasOpenAI = openaiIntegration && openaiIntegration.length > 0;

      // Verificar se já tem prompts
      const { data: prompts, error: promptsError } = await supabase
        .from('prompts')
        .select('id')
        .eq('organization_id', currentOrganizationMember?.organization.id)
        .limit(1);

      if (promptsError) throw promptsError;
      const hasPrompts = prompts && prompts.length > 0;

      // Verificar se já tem flows
      const { data: flows, error: flowsError } = await supabase
        .from('flows')
        .select('id')
        .eq('organization_id', currentOrganizationMember?.organization.id)
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

  const createDefaultFunnel = async () => {
    if (!currentOrganizationMember) {
      return;
    }
    
    try {
      // Verificar se já existe um bloqueio global
      const lockKey = `funnel_creation_lock_${currentOrganizationMember?.organization.id}`;
      const existingLock = localStorage.getItem(lockKey);
      
      if (existingLock) {
        const lockData = JSON.parse(existingLock);
        const lockTime = new Date(lockData.timestamp);
        const now = new Date();
        
        // Se o bloqueio tiver menos de 30 segundos, não prosseguir
        if ((now.getTime() - lockTime.getTime()) < 30000) {
          console.log('Outra instância está criando um funil, aguardando...');
          return;
        } else {
          // Se o bloqueio for antigo, removê-lo
          localStorage.removeItem(lockKey);
        }
      }
      
      // Criar um bloqueio global
      localStorage.setItem(lockKey, JSON.stringify({
        timestamp: new Date().toISOString(),
        instanceId: Math.random().toString(36).substring(2, 9)
      }));
      
      // Usar uma abordagem com transação para evitar duplicação
      // Primeiro, verificamos se já existe um funil
      const { data: existingFunnels, error: checkError } = await supabase
        .from('crm_funnels')
        .select('id')
        .eq('organization_id', currentOrganizationMember?.organization.id)
        .limit(1);
      
      if (checkError) throw checkError;
      
      // Se já existir um funil, não criar novamente
      if (existingFunnels && existingFunnels.length > 0) {
        console.log('Funil já existe, não criando novamente:', existingFunnels[0].id);
        localStorage.removeItem(lockKey);
        return;
      }
      
      // Adicionar um identificador único para esta operação
      const operationId = `create_funnel_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;
      
      // Criar um registro temporário para "bloquear" a criação
      const { data: lockRecord, error: lockError } = await supabase
        .from('crm_funnels')
        .insert({
          organization_id: currentOrganizationMember?.organization.id,
          name: `${t('quickSetup.defaultFunnelName')} (criando...)`,
          description: `Operação: ${operationId}`,
          is_active: false
        })
        .select('id')
        .single();
      
      if (lockError) {
        console.error('Erro ao criar registro de bloqueio:', lockError);
        localStorage.removeItem(lockKey);
        return;
      }
      
      // Agora atualizamos o registro com os dados corretos
      const { data: funnel, error: updateError } = await supabase
        .from('crm_funnels')
        .update({
          name: t('quickSetup.defaultFunnelName'),
          description: t('quickSetup.defaultFunnelDesc'),
          is_active: true
        })
        .eq('id', lockRecord.id)
        .select('id')
        .single();
      
      if (updateError) throw updateError;
      
      if (funnel) {
        console.log('Funil criado com sucesso:', funnel.id);
        
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
      
      // Remover o bloqueio global
      localStorage.removeItem(lockKey);
    } catch (error) {
      console.error('Erro ao criar funil padrão:', error);
      
      // Remover o bloqueio global em caso de erro
      const lockKey = `funnel_creation_lock_${currentOrganizationMember?.organization.id}`;
      localStorage.removeItem(lockKey);
    }
  };

  const createDefaultClosureTypes = async () => {
    if (!currentOrganizationMember) {
      return;
    }
    
    try {
      // Definir os tipos de encerramento padrão
      const closureTypes = [
        {
          organization_id: currentOrganizationMember?.organization.id,
          title: t('quickSetup.resolvedClosureType'),
          color: '#10B981'
        },
        {
          organization_id: currentOrganizationMember?.organization.id,
          title: t('quickSetup.unresolvedClosureType'),
          color: '#EF4444'
        }
      ];

      const { error } = await supabase
        .from('closure_types')
        .insert(closureTypes);

      if (error) throw error;
      
      // Invalidar a consulta de tipos de encerramento para forçar uma nova busca
      queryClient.invalidateQueries({ queryKey: ['closure_types', currentOrganizationMember.organization.id] });
    } catch (error) {
      console.error('Erro ao criar tipos de encerramento padrão:', error);
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
  };

  // Função para carregar apenas o status dos passos sem criar recursos
  const loadStepsStatus = async () => {
    if (!currentOrganizationMember) {
      return;
    }
    
    try {
      // Verificar se já tem canais
      const { data: channels, error: channelsError } = await supabase
        .from('chat_channels')
        .select('id')
        .eq('organization_id', currentOrganizationMember?.organization.id)
        .limit(1);

      if (channelsError) throw channelsError;
      const hasChannels = channels && channels.length > 0;

      // Verificar se já tem integração com OpenAI
      const { data: openaiIntegration, error: openaiError } = await supabase
        .from('integrations')
        .select('id')
        .eq('organization_id', currentOrganizationMember?.organization.id)
        .eq('type', 'openai')
        .limit(1);

      if (openaiError) throw openaiError;
      const hasOpenAI = openaiIntegration && openaiIntegration.length > 0;

      // Verificar se já tem prompts
      const { data: prompts, error: promptsError } = await supabase
        .from('prompts')
        .select('id')
        .eq('organization_id', currentOrganizationMember?.organization.id)
        .limit(1);

      if (promptsError) throw promptsError;
      const hasPrompts = prompts && prompts.length > 0;

      // Verificar se já tem flows
      const { data: flows, error: flowsError } = await supabase
        .from('flows')
        .select('id')
        .eq('organization_id', currentOrganizationMember?.organization.id)
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

  // Função para limpar funis incompletos
  const cleanupIncompleteFunnels = async () => {
    if (!currentOrganizationMember) {
      return;
    }
    
    try {
      // Buscar funis inativos ou com descrição contendo "Operação:"
      const { data: incompleteFunnels, error } = await supabase
        .from('crm_funnels')
        .select('id')
        .eq('organization_id', currentOrganizationMember?.organization.id)
        .eq('is_active', false);
      
      if (error) {
        console.error('Erro ao buscar funis incompletos:', error);
        return;
      }
      
      // Se encontrar funis incompletos, excluí-los
      if (incompleteFunnels && incompleteFunnels.length > 0) {
        console.log('Removendo funis incompletos:', incompleteFunnels.map(f => f.id));
        
        // Primeiro excluir os estágios associados
        for (const funnel of incompleteFunnels) {
          await supabase
            .from('crm_stages')
            .delete()
            .eq('funnel_id', funnel.id);
        }
        
        // Depois excluir os funis
        await supabase
          .from('crm_funnels')
          .delete()
          .in('id', incompleteFunnels.map(f => f.id));
      }
    } catch (error) {
      console.error('Erro ao limpar funis incompletos:', error);
    }
  };

  if (loading) {
    return (
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm p-4 sm:p-6 mb-6 sm:mb-8 animate-pulse">
        <div className="h-7 sm:h-8 bg-gray-200 dark:bg-gray-700 rounded w-2/3 sm:w-1/3 mb-3 sm:mb-4"></div>
        <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded w-full sm:w-2/3 mb-5 sm:mb-6"></div>
        <div className="space-y-3 sm:space-y-4">
          {[1, 2, 3, 4].map((i) => (
            <div key={i} className="flex items-start">
              <div className="h-8 w-8 sm:h-10 sm:w-10 rounded-full bg-gray-200 dark:bg-gray-700 mr-3 sm:mr-4"></div>
              <div className="flex-1">
                <div className="h-4 sm:h-5 bg-gray-200 dark:bg-gray-700 rounded w-1/2 mb-2"></div>
                <div className="h-3 sm:h-4 bg-gray-200 dark:bg-gray-700 rounded w-full"></div>
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