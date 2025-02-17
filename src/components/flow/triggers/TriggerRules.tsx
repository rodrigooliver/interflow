import React from 'react';
import { useTranslation } from 'react-i18next';
import { Plus, X } from 'lucide-react';
import { TriggerRule } from '../../../types/flow';
import { ChannelRule } from './rules/ChannelRule';
import { ScheduleRule } from './rules/ScheduleRule';

interface TriggerRulesProps {
  rules: TriggerRule[];
  onChange: (rules: TriggerRule[]) => void;
}

export function TriggerRules({ rules, onChange }: TriggerRulesProps) {
  const { t } = useTranslation('flows');
  const [isDropdownOpen, setIsDropdownOpen] = React.useState(false);

  const ruleTypes = [
    {
      type: 'channel',
      label: t('rules.channel'),
      component: ChannelRule
    },
    {
      type: 'schedule',
      label: t('rules.schedule'),
      component: ScheduleRule
    }
  ];

  const addRule = (type: string) => {
    const newRule: TriggerRule = {
      id: crypto.randomUUID(),
      type,
      params: type === 'channel' ? { channels: [] } : { timeSlots: [], timezone: Intl.DateTimeFormat().resolvedOptions().timeZone }
    };
    onChange([...rules, newRule]);
  };

  const removeRule = (ruleId: string) => {
    onChange(rules.filter(rule => rule.id !== ruleId));
  };

  const updateRule = (ruleId: string, params: any) => {
    onChange(rules.map(rule => 
      rule.id === ruleId ? { ...rule, params } : rule
    ));
  };

  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center">
        <h4 className="text-sm font-medium text-gray-700 dark:text-gray-300">
          {t('rules.title')}
        </h4>
        <div className="relative">
          <button
            className="inline-flex items-center px-3 py-2 text-sm font-medium rounded-md text-gray-700 dark:text-gray-200 bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary-500 dark:focus:ring-offset-gray-800"
            onClick={() => setIsDropdownOpen(!isDropdownOpen)}
          >
            <Plus className="w-4 h-4 mr-2" />
            {t('rules.add')}
          </button>
          
          {isDropdownOpen && (
            <>
              <div 
                className="fixed inset-0 z-10"
                onClick={() => setIsDropdownOpen(false)}
              />
              <div className="absolute right-0 bottom-full mb-2 w-48 rounded-md shadow-lg bg-white dark:bg-gray-800 ring-1 ring-black ring-opacity-5 z-20">
                {ruleTypes.map(({ type, label }) => (
                  <button
                    key={type}
                    className="w-full text-left px-4 py-2 text-gray-700 dark:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-700"
                    onClick={() => {
                      addRule(type);
                      setIsDropdownOpen(false);
                    }}
                  >
                    {label}
                  </button>
                ))}
              </div>
            </>
          )}
        </div>
      </div>

      {/* Lista de regras configuradas */}
      <div className="space-y-4">
        {rules.map(rule => {
          const RuleComponent = ruleTypes.find(t => t.type === rule.type)?.component;
          if (!RuleComponent) return null;

          return (
            <div key={rule.id} className="border border-gray-300 dark:border-gray-700 rounded-lg p-4">
              <div className="flex justify-between items-start mb-4">
                <h5 className="text-sm font-medium text-gray-700 dark:text-gray-300">
                  {ruleTypes.find(t => t.type === rule.type)?.label}
                </h5>
                <button
                  className="text-gray-400 hover:text-gray-500"
                  onClick={() => removeRule(rule.id)}
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
              <RuleComponent
                params={rule.params}
                onChange={(params) => updateRule(rule.id, params)}
              />
            </div>
          );
        })}
      </div>
    </div>
  );
} 