import React, { useState, useCallback } from 'react';
import { useTranslation } from 'react-i18next';
import { Plus, X, Clock, MessageSquare, Loader2 } from 'lucide-react';
import { Trigger, TriggerRule } from '../../types/flow';
import { Switch } from '../ui/switch';
import { FirstContactConfig } from './triggers/FirstContactConfig';
import { InactivityConfig } from './triggers/InactivityConfig';
import { supabase } from '../../lib/supabase';
import { useAuthContext } from '../../contexts/AuthContext';
import { debounce } from 'lodash';

interface FlowTriggersProps {
  flowId: string;
  triggersInitial: Trigger[];
  onChange: (triggers: Trigger[]) => void;
}

export function FlowTriggers({ flowId, triggersInitial, onChange }: FlowTriggersProps) {
  const { t } = useTranslation('flows');
  const [showAddTrigger, setShowAddTrigger] = useState(false);
  const [triggers, setTriggers] = useState<Trigger[]>(triggersInitial);
  const [removingTriggerId, setRemovingTriggerId] = useState<string | null>(null);
  const [togglingTriggerId, setTogglingTriggerId] = useState<string | null>(null);
  const { currentOrganizationMember } = useAuthContext();

  const triggerTypes = [
    {
      type: 'first_contact',
      Icon: MessageSquare,
      label: t('triggers.firstContact'),
      description: t('triggers.firstContactDescription')
    },
    {
      type: 'inactivity',
      Icon: Clock,
      label: t('triggers.inactivity'),
      description: t('triggers.inactivityDescription')
    }
  ];


  const addTrigger = async (type: string) => {
    if (!flowId || !currentOrganizationMember) return;

    try {
      const newTrigger: Trigger = {
        id: crypto.randomUUID(),
        flow_id: flowId,
        type: type as Trigger['type'],
        conditions: {
          operator: 'AND',
          rules: []
        },
        organization_id: currentOrganizationMember?.organization.id || '',
        is_active: true,
        updated_at: new Date().toISOString()
      };
      const { error: insertError } = await supabase
        .from('flow_triggers')
        .insert(newTrigger);

      if (insertError) throw insertError;

      const newTriggers = [...triggers, newTrigger];
      setTriggers(newTriggers);
      onChange(newTriggers);
      setShowAddTrigger(false);
    } catch (error) {
      console.error('Error updating triggers:', error);
    }
   
  };

  const removeTrigger = async (triggerId: string) => {
    setRemovingTriggerId(triggerId);
    try {
      const { error } = await supabase
        .from('flow_triggers')
        .delete()
        .eq('id', triggerId);

      if (error) throw error;
      
      const newTriggers = triggers.filter(t => t.id !== triggerId);
      setTriggers(newTriggers);
      onChange(newTriggers);
    } catch (error) {
      console.error('Error removing trigger:', error);
    } finally {
      setRemovingTriggerId(null);
    }
  };

  const toggleTrigger = async (triggerId: string) => {
    setTogglingTriggerId(triggerId);
    try {
      const trigger = triggers.find(t => t.id === triggerId);
      if (!trigger) return;

      const { error } = await supabase
        .from('flow_triggers')
        .update({ is_active: !trigger.is_active })
        .eq('id', triggerId);

      if (error) throw error;

      const newTriggers = triggers.map(t =>
        t.id === triggerId ? { ...t, is_active: !t.is_active } : t
      );
      setTriggers(newTriggers);
      onChange(newTriggers);
    } catch (error) {
      console.error('Error toggling trigger:', error);
    } finally {
      setTogglingTriggerId(null);
    }
  };

  const debouncedUpdate = useCallback(
    
    debounce(async (triggerId: string, rules: TriggerRule[]) => {
      try {
        await supabase
          .from('flow_triggers')
          .update({ 
            conditions: { 
              operator: 'AND', 
              rules 
            } 
          })
          .eq('id', triggerId);
          onChange(triggers);
      } catch (error) {
        console.error('Error updating trigger:', error);
      }
    }, 1000),
    []
  );

  const updateTriggerRules = useCallback((triggerId: string, rules: TriggerRule[]) => {
    // Atualiza UI imediatamente
    const newTriggers =  triggers.map(t =>
      t.id === triggerId
        ? { ...t, conditions: { ...t.conditions, rules } }
        : t
    )
    setTriggers (newTriggers);

    // Agenda atualização do banco
    debouncedUpdate(triggerId, rules);
  }, [triggers, onChange, debouncedUpdate]);

  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center">
        <h3 className="text-lg font-medium text-gray-900 dark:text-gray-100">
          {t('triggers.title')}
        </h3>
        <button
          onClick={() => setShowAddTrigger(true)}
          className="inline-flex items-center px-3 py-2 border border-transparent text-sm leading-4 font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 dark:focus:ring-offset-gray-800"
        >
          <Plus className="w-4 h-4 mr-2" />
          {t('triggers.add')}
        </button>
      </div>

      {showAddTrigger && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white dark:bg-gray-800 rounded-lg p-6 max-w-md w-full">
            <div className="flex justify-between items-center mb-4">
              <h4 className="text-lg font-medium text-gray-900 dark:text-gray-100">
                {t('triggers.selectType')}
              </h4>
              <button
                onClick={() => setShowAddTrigger(false)}
                className="text-gray-400 hover:text-gray-500 dark:text-gray-500 dark:hover:text-gray-400"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            <div className="space-y-2">
              {triggerTypes.map(({ type, Icon, label, description }) => (
                <button
                  key={type}
                  onClick={() => addTrigger(type)}
                  className="w-full text-left p-4 rounded-lg border border-gray-200 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors"
                >
                  <div className="flex items-center">
                    <Icon className="w-5 h-5 text-gray-400 dark:text-gray-500 mr-3" />
                    <div>
                      <div className="font-medium text-gray-900 dark:text-gray-100">
                        {label}
                      </div>
                      <div className="text-sm text-gray-500 dark:text-gray-400">
                        {description}
                      </div>
                    </div>
                  </div>
                </button>
              ))}
            </div>
          </div>
        </div>
      )}

      <div className="space-y-4">
        {triggers.map(trigger => {
          const triggerType = triggerTypes.find(t => t.type === trigger.type);
          const Icon = triggerType?.Icon;

          return (
            <div
              key={trigger.id}
              className={`border border-gray-200 dark:border-gray-700 rounded-lg p-4 bg-white dark:bg-gray-800 ${
                !trigger.is_active ? 'opacity-60' : ''
              }`}
            >
              <div className="flex justify-between items-start mb-4">
                <div className="flex items-center">
                  {Icon && (
                    <Icon 
                      className={`w-5 h-5 mr-3 ${
                        trigger.is_active 
                          ? 'text-gray-400 dark:text-gray-500' 
                          : 'text-gray-300 dark:text-gray-600'
                      }`} 
                    />
                  )}
                  <div>
                    <h4 className={`font-medium ${
                      trigger.is_active 
                        ? 'text-gray-900 dark:text-gray-100' 
                        : 'text-gray-400 dark:text-gray-500'
                    }`}>
                      {triggerType?.label}
                    </h4>
                  </div>
                </div>
                <div className="flex items-center space-x-4">
                  {togglingTriggerId === trigger.id ? (
                    <div className="w-9 h-5 flex items-center justify-center">
                      <Loader2 className="w-4 h-4 animate-spin text-blue-600 dark:text-blue-400" />
                    </div>
                  ) : (
                    <Switch
                      checked={trigger.is_active}
                      onCheckedChange={() => toggleTrigger(trigger.id)}
                      className={`${
                        trigger.is_active 
                          ? 'bg-blue-600' 
                          : 'bg-gray-200 dark:bg-gray-700'
                      }`}
                    />
                  )}
                  {removingTriggerId === trigger.id ? (
                    <div className="w-4 h-4">
                      <Loader2 className="w-4 h-4 animate-spin text-gray-400 dark:text-gray-500" />
                    </div>
                  ) : (
                    <button
                      onClick={() => removeTrigger(trigger.id)}
                      className="text-gray-400 hover:text-gray-500 dark:text-gray-500 dark:hover:text-gray-400"
                    >
                      <X className="w-4 h-4" />
                    </button>
                  )}
                </div>
              </div>
              
              {removingTriggerId !== trigger.id && (
                <>
                  {trigger.type === 'first_contact' && (
                    <FirstContactConfig
                      flowId={flowId}
                      trigger={trigger}
                      onChange={(rules) => updateTriggerRules(trigger.id, rules)}
                    />
                  )}
                  
                  {trigger.type === 'inactivity' && (
                    <InactivityConfig
                      trigger={trigger}
                      onChange={(rules) => updateTriggerRules(trigger.id, rules)}
                    />
                  )}
                </>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
} 