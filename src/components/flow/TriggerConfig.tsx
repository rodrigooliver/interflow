import React, { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Plus, X, Clock, MessageSquare, Calendar, Tag } from 'lucide-react';
import { Trigger } from '../../types/flow';
import { FirstContactConfig } from './triggers/FirstContactConfig';
import { InactivityConfig } from './triggers/InactivityConfig';

interface TriggerConfigProps {
  flowId: string;
  triggers: Trigger[];
  onUpdate: (triggers: Trigger[]) => void;
}

export function TriggerConfig({ flowId, triggers, onUpdate }: TriggerConfigProps) {
  const { t } = useTranslation('flows');
  const [selectedTrigger, setSelectedTrigger] = useState<Trigger | null>(null);

  const triggerTypes = [
    { 
      type: 'first_contact',
      icon: MessageSquare,
      label: t('triggers.firstContact'),
      component: FirstContactConfig
    },
    { 
      type: 'inactivity',
      icon: Clock,
      label: t('triggers.inactivity'),
      component: InactivityConfig
    },
  ];

  const addTrigger = (type: string) => {
    const newTrigger: Trigger = {
      id: crypto.randomUUID(),
      flow_id: flowId,
      type,
      conditions: {
        operator: 'AND',
        rules: []
      },
      is_active: true
    };
    onUpdate([...triggers, newTrigger]);
  };

  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center">
        <h3 className="text-lg font-medium">
          {t('triggers.title')}
        </h3>
        <div className="relative">
          <button
            className="btn btn-primary btn-sm"
            onClick={() => setSelectedTrigger(null)}
          >
            <Plus className="w-4 h-4 mr-2" />
            {t('triggers.add')}
          </button>
          
          {/* Dropdown de tipos de trigger */}
          {!selectedTrigger && (
            <div className="absolute right-0 mt-2 w-56 rounded-md shadow-lg bg-white dark:bg-gray-800 ring-1 ring-black ring-opacity-5">
              {triggerTypes.map(({ type, icon: Icon, label }) => (
                <button
                  key={type}
                  className="w-full text-left px-4 py-2 hover:bg-gray-100 dark:hover:bg-gray-700 flex items-center"
                  onClick={() => addTrigger(type)}
                >
                  <Icon className="w-4 h-4 mr-2" />
                  {label}
                </button>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Lista de triggers configurados */}
      <div className="space-y-4">
        {triggers.map(trigger => {
          const TriggerComponent = triggerTypes.find(t => t.type === trigger.type)?.component;
          return (
            <div key={trigger.id} className="border rounded-lg p-4">
              <div className="flex justify-between items-start mb-4">
                <h4 className="font-medium">
                  {triggerTypes.find(t => t.type === trigger.type)?.label}
                </h4>
                <button
                  className="text-gray-400 hover:text-gray-500"
                  onClick={() => onUpdate(triggers.filter(t => t.id !== trigger.id))}
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
              {TriggerComponent && (
                <TriggerComponent
                  flowId={flowId}
                  trigger={trigger}
                  onChange={(rules) => {
                    onUpdate(triggers.map(t => 
                      t.id === trigger.id 
                        ? { ...trigger, conditions: { ...trigger.conditions, rules } }
                        : t
                    ));
                  }}
                />
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
} 