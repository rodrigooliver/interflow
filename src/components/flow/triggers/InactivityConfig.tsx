import React from 'react';
import { useTranslation } from 'react-i18next';
import { Trigger, TriggerRule } from '../../../types/flow';
import { TriggerRules } from './TriggerRules';

interface InactivityConfigProps {
  trigger: Trigger;
  onChange: (rules: TriggerRule[]) => void;
}

export function InactivityConfig({ trigger, onChange }: InactivityConfigProps) {
  const { t } = useTranslation('flows');

  const updateInactivityRule = (rules: TriggerRule[]) => {
    // Manter a regra de inatividade existente ou criar uma nova
    const inactivityRule = rules.find(r => r.type === 'inactivity') || {
      id: crypto.randomUUID(),
      type: 'inactivity',
      params: {
        source: 'customer',
        minutes: 5
      }
    };

    // Garantir que a regra de inatividade esteja sempre presente
    const updatedRules = [
      inactivityRule,
      ...rules.filter(r => r.type !== 'inactivity')
    ];

    onChange(updatedRules);
  };

  return (
    <div className="space-y-4">
      {/* Configuração específica de inatividade */}
      <div className="space-y-4">
        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
            {t('triggers.inactivitySource')}
          </label>
          <select
            value={trigger.conditions.rules.find(r => r.type === 'inactivity')?.params?.source || 'customer'}
            onChange={(e) => {
              const rules = [...trigger.conditions.rules];
              const inactivityRule = rules.find(r => r.type === 'inactivity');
              if (inactivityRule) {
                inactivityRule.params = {
                  ...inactivityRule.params,
                  source: e.target.value
                };
                onChange(rules);
              }
            }}
            className="w-full rounded-md border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 px-3 py-2 text-gray-700 dark:text-gray-200"
          >
            <option value="customer" className="dark:bg-gray-700 dark:text-gray-200">{t('triggers.customer')}</option>
            <option value="agent" className="dark:bg-gray-700 dark:text-gray-200">{t('triggers.agent')}</option>
          </select>
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
            {t('triggers.inactivityMinutes')}
          </label>
          <input
            type="number"
            min="1"
            value={trigger.conditions.rules.find(r => r.type === 'inactivity')?.params?.minutes || 5}
            onChange={(e) => {
              const rules = [...trigger.conditions.rules];
              const inactivityRule = rules.find(r => r.type === 'inactivity');
              if (inactivityRule) {
                inactivityRule.params = {
                  ...inactivityRule.params,
                  minutes: parseInt(e.target.value)
                };
                onChange(rules);
              }
            }}
            className="w-full rounded-md border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 px-3 py-2 text-gray-700 dark:text-gray-200"
          />
        </div>
      </div>

      {/* Regras compartilhadas (Channel e Schedule) */}
      <TriggerRules
        rules={trigger.conditions.rules.filter(r => r.type !== 'inactivity')}
        onChange={(rules) => updateInactivityRule(rules)}
      />
    </div>
  );
} 