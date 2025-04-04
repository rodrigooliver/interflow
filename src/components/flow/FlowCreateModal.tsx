import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { GitFork, Loader2, X, MessageSquareText, ArrowLeft, Settings } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { useAuthContext } from '../../contexts/AuthContext';
import { supabase } from '../../lib/supabase';
import { Prompt } from '../../types/database';
import { createFlowFromPrompt } from '../../components/prompts/PromptFormMain';
import { Trigger } from '../../types/flow';
import Select from 'react-select';
import { useChannels } from '../../hooks/useQueryes';
import { useQueryClient } from '@tanstack/react-query';

// Default start node
const defaultStartNode = {
  id: 'start-node',
  type: 'start',
  position: { x: 100, y: 100 },
  data: {}
};

// Default trigger
const createDefaultTrigger = (flowId: string, organizationId: string): Trigger => ({
  id: crypto.randomUUID(),
  flow_id: flowId,
  type: 'first_contact',
  conditions: {
    operator: 'AND',
    rules: []
  },
  organization_id: organizationId,
  is_active: true
});

interface FlowCreateModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess?: (flowId: string) => void;
  redirectToFlow?: boolean;
}

export default function FlowCreateModal({ isOpen, onClose, onSuccess, redirectToFlow = true }: FlowCreateModalProps) {
  const navigate = useNavigate();
  const { t } = useTranslation(['flows', 'common']);
  const { currentOrganizationMember } = useAuthContext();
  const queryClient = useQueryClient();
  const [creatingFlow, setCreatingFlow] = useState(false);
  const [newFlowData, setNewFlowData] = useState({ name: '', description: '' });
  const [flowCreationType, setFlowCreationType] = useState<'free' | 'agent' | null>(null);
  const [availablePrompts, setAvailablePrompts] = useState<Prompt[]>([]);
  const [selectedPromptId, setSelectedPromptId] = useState<string | null>(null);
  const [loadingPrompts, setLoadingPrompts] = useState(false);
  const [showTriggerConfig, setShowTriggerConfig] = useState(false);
  const [triggerType, setTriggerType] = useState<'first_contact' | 'inactivity'>('first_contact');
  const [selectedChannels, setSelectedChannels] = useState<string[]>([]);
  const [createTrigger, setCreateTrigger] = useState(true);
  
  // Usar o hook useChannels para carregar os canais
  const { data: chatChannels, isLoading: loadingChannels } = useChannels(currentOrganizationMember?.organization.id);
  
  // Transformar os canais no formato esperado pelo componente Select
  const channels = chatChannels?.map(channel => ({
    value: channel.id,
    label: channel.name
  })) || [];

  useEffect(() => {
    if (isOpen) {
      loadPrompts();
    }
  }, [isOpen]);

  async function loadPrompts() {
    if (!currentOrganizationMember) return;
    setLoadingPrompts(true);

    try {
      const { data, error } = await supabase
        .from('prompts')
        .select('*')
        .eq('organization_id', currentOrganizationMember.organization.id)
        .order('title');

      if (error) throw error;
      setAvailablePrompts(data || []);
    } catch (error) {
      console.error('Error loading prompts:', error);
    } finally {
      setLoadingPrompts(false);
    }
  }

  async function handleCreateFlow() {
    if (!currentOrganizationMember || !newFlowData.name.trim()) return;
    setCreatingFlow(true);

    try {
      if (flowCreationType === 'agent' && selectedPromptId) {
        // Criar fluxo baseado em um agente
        const selectedPrompt = availablePrompts.find(p => p.id === selectedPromptId);
        if (selectedPrompt) {
          const flowData = await createFlowFromPrompt(
            selectedPromptId, 
            currentOrganizationMember.organization.id, 
            newFlowData.name || selectedPrompt.title
          );
          
          if (flowData) {
            // Criar trigger para o flow baseado em agente se a opção estiver ativada
            if (createTrigger) {
              const trigger = createDefaultTrigger(flowData.id, currentOrganizationMember.organization.id);
              trigger.type = triggerType;
              
              // Adicionar regra de canal se houver canais selecionados
              if (selectedChannels.length > 0) {
                trigger.conditions.rules.push({
                  id: crypto.randomUUID(),
                  type: 'channel',
                  params: {
                    channels: selectedChannels
                  }
                });
              }
              
              const { error: triggerError } = await supabase
                .from('flow_triggers')
                .insert([trigger]);

              if (triggerError) throw triggerError;
            }
            
            resetForm();
            
            // Invalidar o cache dos flows após criar
            if (currentOrganizationMember?.organization.id) {
              await queryClient.invalidateQueries({ 
                queryKey: ['flows', currentOrganizationMember.organization.id] 
              });
            }
            
            // Callback de sucesso ou redirecionamento
            if (onSuccess) {
              onSuccess(flowData.id);
            } else if (redirectToFlow) {
              navigate(`/app/flows/${flowData.id}`);
            }
          }
        }
      } else {
        // Criar fluxo livre
        const { data: flowData, error: flowError } = await supabase
          .from('flows')
          .insert([{
            organization_id: currentOrganizationMember.organization.id,
            name: newFlowData.name,
            description: newFlowData.description,
            nodes: [],
            edges: [],
            debounce_time: 20000,
            draft_nodes: [defaultStartNode],
            draft_edges: [],
            variables: [],
            is_published: false
          }])
          .select()
          .single();

        if (flowError) throw flowError;

        // Criar trigger para o flow se a opção estiver ativada
        if (flowData && createTrigger) {
          const trigger = createDefaultTrigger(flowData.id, currentOrganizationMember.organization.id);
          trigger.type = triggerType;
          
          // Adicionar regra de canal se houver canais selecionados
          if (selectedChannels.length > 0) {
            trigger.conditions.rules.push({
              id: crypto.randomUUID(),
              type: 'channel',
              params: {
                channels: selectedChannels
              }
            });
          }
          
          const { error: triggerError } = await supabase
            .from('flow_triggers')
            .insert([trigger]);

          if (triggerError) throw triggerError;
        }

        resetForm();
        
        // Invalidar o cache dos flows após criar
        if (currentOrganizationMember?.organization.id) {
          await queryClient.invalidateQueries({ 
            queryKey: ['flows', currentOrganizationMember.organization.id] 
          });
        }
        
        // Callback de sucesso ou redirecionamento
        if (flowData) {
          if (onSuccess) {
            onSuccess(flowData.id);
          } else if (redirectToFlow) {
            navigate(`/app/flows/${flowData.id}`);
          }
        }
      }
    } catch (error) {
      console.error('Error creating flow:', error);
    } finally {
      setCreatingFlow(false);
    }
  }

  function resetForm() {
    setNewFlowData({ name: '', description: '' });
    setFlowCreationType(null);
    setSelectedPromptId(null);
    setShowTriggerConfig(false);
    setTriggerType('first_contact');
    setSelectedChannels([]);
    setCreateTrigger(true);
  }

  function handleClose() {
    resetForm();
    onClose();
  }

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-gray-500 bg-opacity-75 flex items-center justify-center p-4 z-50">
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow-xl max-w-md w-full p-6">
        <div className="flex justify-between items-center mb-4">
          <h3 className="text-lg font-medium text-gray-900 dark:text-white">
            {t('flows:newFlow')}
          </h3>
          <button
            onClick={handleClose}
            className="text-gray-400 hover:text-gray-500 dark:text-gray-300 dark:hover:text-gray-200"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {!flowCreationType ? (
          <div className="space-y-4">
            <p className="text-sm text-gray-500 dark:text-gray-400 mb-4">
              {t('flows:selectCreationType')}
            </p>
            <button
              onClick={() => setFlowCreationType('free')}
              className="w-full flex items-center p-4 border border-gray-300 dark:border-gray-600 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors"
            >
              <GitFork className="w-6 h-6 text-gray-400 dark:text-gray-500 mr-3" />
              <div>
                <h4 className="text-base font-medium text-gray-900 dark:text-white">
                  {t('flows:createFreeFlow')}
                </h4>
                <p className="text-sm text-gray-500 dark:text-gray-400">
                  {t('flows:createFreeFlowDescription')}
                </p>
              </div>
            </button>
            <button
              onClick={() => setFlowCreationType('agent')}
              className="w-full flex items-center p-4 border border-gray-300 dark:border-gray-600 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors"
            >
              <MessageSquareText className="w-6 h-6 text-gray-400 dark:text-gray-500 mr-3" />
              <div>
                <h4 className="text-base font-medium text-gray-900 dark:text-white">
                  {t('flows:createFromAgent')}
                </h4>
                <p className="text-sm text-gray-500 dark:text-gray-400">
                  {t('flows:createFromAgentDescription')}
                </p>
              </div>
            </button>
          </div>
        ) : showTriggerConfig ? (
          <div className="space-y-4">
            <button
              onClick={() => setShowTriggerConfig(false)}
              className="flex items-center text-sm text-blue-600 hover:text-blue-800 dark:text-blue-400 dark:hover:text-blue-300 mb-2"
            >
              <ArrowLeft className="w-4 h-4 mr-1" />
              {t('common:back')}
            </button>
            
            <div>
              <h4 className="text-base font-medium text-gray-900 dark:text-white mb-2">
                {t('flows:triggers.title')}
              </h4>
              
              <div className="flex items-center mb-4">
                <input
                  type="checkbox"
                  id="create-trigger"
                  checked={createTrigger}
                  onChange={(e) => setCreateTrigger(e.target.checked)}
                  className="mr-2 h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                />
                <label htmlFor="create-trigger" className="text-sm text-gray-700 dark:text-gray-300">
                  {t('flows:triggers.enableAutomation')}
                </label>
              </div>
              
              {createTrigger && (
                <>
                  <p className="text-sm text-gray-500 dark:text-gray-400 mb-4">
                    {t('flows:triggers.description')}
                  </p>
                  
                  <div className="space-y-3">
                    <div className="flex items-start p-3 border border-gray-200 dark:border-gray-700 rounded-lg">
                      <input
                        type="radio"
                        id="first_contact"
                        name="trigger_type"
                        value="first_contact"
                        checked={triggerType === 'first_contact'}
                        onChange={() => setTriggerType('first_contact')}
                        className="mt-1 mr-3"
                      />
                      <label htmlFor="first_contact" className="flex-1 cursor-pointer">
                        <div className="font-medium text-gray-900 dark:text-white">
                          {t('flows:triggers.firstContact')}
                        </div>
                        <div className="text-sm text-gray-500 dark:text-gray-400">
                          {t('flows:triggers.firstContactDescription')}
                        </div>
                      </label>
                    </div>
                    
                    <div className="flex items-start p-3 border border-gray-200 dark:border-gray-700 rounded-lg">
                      <input
                        type="radio"
                        id="inactivity"
                        name="trigger_type"
                        value="inactivity"
                        checked={triggerType === 'inactivity'}
                        onChange={() => setTriggerType('inactivity')}
                        className="mt-1 mr-3"
                      />
                      <label htmlFor="inactivity" className="flex-1 cursor-pointer">
                        <div className="font-medium text-gray-900 dark:text-white">
                          {t('flows:triggers.inactivity')}
                        </div>
                        <div className="text-sm text-gray-500 dark:text-gray-400">
                          {t('flows:triggers.inactivityDescription')}
                        </div>
                      </label>
                    </div>
                    
                    <div className="mt-4">
                      <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                        {t('flows:triggers.filterByChannel')}
                      </label>
                      <Select
                        isMulti
                        isLoading={loadingChannels}
                        options={channels}
                        value={channels.filter(channel => selectedChannels.includes(channel.value))}
                        onChange={(selected) => {
                          setSelectedChannels(selected.map(option => option.value));
                        }}
                        className="react-select-container"
                        classNamePrefix="react-select"
                        placeholder={t('flows:triggers.selectChannels')}
                        menuPlacement="top"
                        styles={{
                          control: (base, state) => ({
                            ...base,
                            backgroundColor: 'var(--select-bg)',
                            borderColor: state.isFocused ? 'var(--select-focus-border)' : 'var(--select-border)',
                            '&:hover': {
                              borderColor: 'var(--select-hover-border)'
                            }
                          }),
                          menu: (base) => ({
                            ...base,
                            backgroundColor: 'var(--select-bg)',
                            border: '1px solid var(--select-border)'
                          }),
                          option: (base, { isFocused, isSelected }) => ({
                            ...base,
                            backgroundColor: isSelected 
                              ? 'var(--select-selected-bg)'
                              : isFocused 
                                ? 'var(--select-hover-bg)'
                                : 'transparent',
                            color: isSelected 
                              ? 'var(--select-selected-text)'
                              : 'var(--select-text)'
                          }),
                          singleValue: (base) => ({
                            ...base,
                            color: 'var(--select-text)'
                          }),
                          multiValue: (base) => ({
                            ...base,
                            backgroundColor: 'var(--select-selected-bg)',
                            color: 'var(--select-selected-text)'
                          }),
                          multiValueLabel: (base) => ({
                            ...base,
                            color: 'var(--select-selected-text)'
                          }),
                          multiValueRemove: (base) => ({
                            ...base,
                            color: 'var(--select-selected-text)',
                            ':hover': {
                              backgroundColor: 'var(--select-tag-remove-hover-bg)',
                              color: 'var(--select-tag-remove-hover-text)'
                            }
                          })
                        }}
                      />
                      <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">
                        {t('flows:triggers.channelFilterDescription')}
                      </p>
                    </div>
                  </div>
                </>
              )}
              
              {!createTrigger && (
                <div className="p-4 bg-gray-50 dark:bg-gray-700 rounded-lg mt-2">
                  <p className="text-sm text-gray-500 dark:text-gray-400">
                    {t('flows:triggers.noAutomationDescription')}
                  </p>
                </div>
              )}
            </div>
          </div>
        ) : flowCreationType === 'agent' ? (
          <div className="space-y-4">
            <button
              onClick={() => setFlowCreationType(null)}
              className="flex items-center text-sm text-blue-600 hover:text-blue-800 dark:text-blue-400 dark:hover:text-blue-300 mb-2"
            >
              <ArrowLeft className="w-4 h-4 mr-1" />
              {t('common:back')}
            </button>
            <div>
              <label htmlFor="flow-name" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                {t('flows:flowName')}
              </label>
              <input
                id="flow-name"
                type="text"
                value={newFlowData.name}
                onChange={(e) => setNewFlowData({ ...newFlowData, name: e.target.value })}
                placeholder={t('flows:flowName')}
                className="block w-full px-4 py-2 rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 dark:bg-gray-700 dark:border-gray-600 dark:text-white"
              />
              <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">
                {t('flows:optionalIfAgentSelected')}
              </p>
            </div>
            <div>
              <label htmlFor="prompt-select" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                {t('flows:selectAgent')}
              </label>
              {loadingPrompts ? (
                <div className="flex items-center justify-center py-4">
                  <Loader2 className="w-5 h-5 animate-spin text-blue-600" />
                </div>
              ) : availablePrompts.length > 0 ? (
                <select
                  id="prompt-select"
                  value={selectedPromptId || ''}
                  onChange={(e) => setSelectedPromptId(e.target.value)}
                  className="block w-full px-4 py-2 rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 dark:bg-gray-700 dark:border-gray-600 dark:text-white"
                >
                  <option value="">{t('flows:selectAgent')}</option>
                  {availablePrompts.map((prompt) => (
                    <option key={prompt.id} value={prompt.id}>
                      {prompt.title}
                    </option>
                  ))}
                </select>
              ) : (
                <div className="text-sm text-gray-500 dark:text-gray-400 py-2">
                  {t('flows:noAgentsAvailable')}
                </div>
              )}
            </div>
            
            <div className="mt-2">
              <button
                onClick={() => setShowTriggerConfig(true)}
                className="flex items-center text-sm text-blue-600 hover:text-blue-800 dark:text-blue-400 dark:hover:text-blue-300"
              >
                <Settings className="w-4 h-4 mr-1" />
                {t('flows:triggers.configure')}
              </button>
            </div>
          </div>
        ) : (
          <div className="space-y-4">
            <button
              onClick={() => setFlowCreationType(null)}
              className="flex items-center text-sm text-blue-600 hover:text-blue-800 dark:text-blue-400 dark:hover:text-blue-300 mb-2"
            >
              <ArrowLeft className="w-4 h-4 mr-1" />
              {t('common:back')}
            </button>
            <div>
              <label htmlFor="flow-name" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                {t('flows:flowName')}
              </label>
              <input
                id="flow-name"
                type="text"
                value={newFlowData.name}
                onChange={(e) => setNewFlowData({ ...newFlowData, name: e.target.value })}
                placeholder={t('flows:flowName')}
                className="block w-full px-4 py-2 rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 dark:bg-gray-700 dark:border-gray-600 dark:text-white"
              />
            </div>
            <div>
              <label htmlFor="flow-description" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                {t('flows:flowDescription')}
              </label>
              <textarea
                id="flow-description"
                value={newFlowData.description}
                onChange={(e) => setNewFlowData({ ...newFlowData, description: e.target.value })}
                placeholder={t('flows:flowDescription')}
                className="block w-full px-4 py-2 rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 dark:bg-gray-700 dark:border-gray-600 dark:text-white"
                rows={3}
              />
            </div>
            
            <div className="mt-2">
              <button
                onClick={() => setShowTriggerConfig(true)}
                className="flex items-center text-sm text-blue-600 hover:text-blue-800 dark:text-blue-400 dark:hover:text-blue-300"
              >
                <Settings className="w-4 h-4 mr-1" />
                {t('flows:triggers.configure')}
              </button>
            </div>
          </div>
        )}

        <div className="mt-4 flex justify-end space-x-2">
          <button
            onClick={handleClose}
            disabled={creatingFlow}
            className="px-4 py-2 text-sm font-medium text-gray-700 dark:text-gray-300 hover:text-gray-900 dark:hover:text-white"
          >
            {t('common:back')}
          </button>
          {(flowCreationType && !showTriggerConfig) && (
            <button
              onClick={handleCreateFlow}
              disabled={creatingFlow || (flowCreationType === 'agent' && !selectedPromptId) || !newFlowData.name.trim()}
              className="px-4 py-2 text-sm font-medium text-white bg-blue-600 rounded-md hover:bg-blue-700 flex items-center disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {creatingFlow ? <><Loader2 className="w-4 h-4 mr-2 animate-spin" />{t('common:saving')}</> : t('common:save')}
            </button>
          )}
          {showTriggerConfig && (
            <button
              onClick={() => setShowTriggerConfig(false)}
              className="px-4 py-2 text-sm font-medium text-white bg-blue-600 rounded-md hover:bg-blue-700 flex items-center"
            >
              {t('common:save')}
            </button>
          )}
        </div>
      </div>
    </div>
  );
} 