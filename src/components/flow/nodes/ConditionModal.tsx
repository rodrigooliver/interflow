import React, { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Plus, X } from 'lucide-react';
import { createPortal } from 'react-dom';
import { useFlowEditor } from '../../../contexts/FlowEditorContext';
import { SearchableSelect } from '../../../components/common/SearchableSelect';

const Portal = ({ children }) => {
  return createPortal(children, document.body);
};

interface SubCondition {
  type: 'variable' | 'clientData';
  field: string;
  operator: 'equalTo' | 'notEqual' | 'contains' | 'doesNotContain' | 
           'greaterThan' | 'lessThan' | 'isSet' | 'isEmpty' | 
           'startsWith' | 'endsWith' | 'matchesRegex' | 'doesNotMatchRegex' |
           'inList' | 'notInList';
  value: string;
}

interface Condition {
  logicOperator: 'AND' | 'OR';
  subConditions: SubCondition[];
}

interface ConditionModalProps {
  condition: Condition;
  onClose: () => void;
  onSave: (condition: Condition) => void;
  variables: { id: string; name: string }[];
}

export function ConditionModal({ condition, onClose, onSave, variables }: ConditionModalProps) {
  const { t } = useTranslation('flows');
  const { funnels, teams, users } = useFlowEditor();

  const operatorOptions = [
    { value: 'equalTo', labelKey: 'equalTo' },
    { value: 'notEqual', labelKey: 'notEqual' },
    { value: 'contains', labelKey: 'contains' },
    { value: 'doesNotContain', labelKey: 'doesNotContain' },
    { value: 'greaterThan', labelKey: 'greaterThan' },
    { value: 'lessThan', labelKey: 'lessThan' },
    { value: 'isSet', labelKey: 'isSet' },
    { value: 'isEmpty', labelKey: 'isEmpty' },
    { value: 'startsWith', labelKey: 'startsWith' },
    { value: 'endsWith', labelKey: 'endsWith' },
    { value: 'matchesRegex', labelKey: 'matchesRegex' },
    { value: 'doesNotMatchRegex', labelKey: 'doesNotMatchRegex' },
    { value: 'inList', labelKey: 'inList' },
    { value: 'notInList', labelKey: 'notInList' }
  ];

  const clientDataOptions = [
    { value: 'custumer_name', labelKey: 'name' },
    { value: 'custumer_surname', labelKey: 'surname' },
    { value: 'custumer_phone', labelKey: 'phone' },
    { value: 'custumer_email', labelKey: 'email' },
    { value: 'chat_funil', labelKey: 'funnel' },
    { value: 'chat_price', labelKey: 'saleValue' },
    { value: 'chat_team', labelKey: 'team' },
    { value: 'chat_attendant', labelKey: 'attendant' },
    { value: 'chat_tag', labelKey: 'tags' }
  ];

  const [localCondition, setLocalCondition] = useState<Condition>({ 
    ...condition,
    subConditions: condition.subConditions || []
  });

  const getFilteredOperators = (field: string) => {
    const isSelectField = ['chat_funil', 'chat_team', 'chat_attendant'].includes(field);
    
    return operatorOptions.filter(op => {
      if (isSelectField) {
        return ['equalTo', 'notEqual', 'contains', 'doesNotContain', 'isSet', 'isEmpty', 'inList', 'notInList'].includes(op.value);
      }
      return true;
    });
  };

  const handleConfigBlur = () => {
    // Implementation of handleConfigBlur
  };

  return (
    <Portal>
      <div className="fixed inset-0 z-50">
        <div className="fixed inset-0 bg-black bg-opacity-50" onClick={onClose} />
        <div className="fixed right-0 top-0 h-full bg-white dark:bg-gray-800 w-[600px] shadow-xl overflow-y-auto">
          <div className="p-6">
            <div className="flex items-center justify-between mb-6">
              <h3 className="text-lg font-medium text-gray-900 dark:text-white">
                {t('nodes.condition.editCondition')}
              </h3>
              <button
                onClick={onClose}
                className="text-gray-400 hover:text-gray-500"
              >
                <X className="w-6 h-6" />
              </button>
            </div>

            <div className="space-y-4">
              <div className="space-y-4">
                {localCondition.subConditions.map((subCondition, index) => (
                  <React.Fragment key={index}>
                    {index > 0 && (
                      <div className="flex justify-center items-center my-4">
                        <SearchableSelect
                          value={{
                            value: localCondition.logicOperator,
                            label: t(`nodes.condition.${localCondition.logicOperator.toLowerCase()}`)
                          }}
                          onChange={(selected) => setLocalCondition({
                            ...localCondition,
                            logicOperator: selected ? selected.value as 'AND' | 'OR' : 'AND'
                          })}
                          onBlur={handleConfigBlur}
                          options={[
                            { value: 'AND', label: t('nodes.condition.and') },
                            { value: 'OR', label: t('nodes.condition.or') }
                          ]}
                          placeholder={t('nodes.condition.selectLogicOperator')}
                        />
                      </div>
                    )}
                    
                    <div className="p-4 border border-gray-200 dark:border-gray-700 rounded-lg">
                      <div className="flex justify-between items-center mb-4">
                        <h4 className="text-sm font-medium text-gray-700 dark:text-gray-300">
                          {t('nodes.condition.subCondition')} {index + 1}
                        </h4>
                        {localCondition.subConditions.length > 1 && (
                          <button
                            onClick={() => {
                              const newSubConditions = localCondition.subConditions.filter((_, i) => i !== index);
                              setLocalCondition({
                                ...localCondition,
                                subConditions: newSubConditions
                              });
                            }}
                            className="text-red-500 hover:text-red-600"
                          >
                            <X className="w-5 h-5" />
                          </button>
                        )}
                      </div>

                      <div className="space-y-3">
                        <div>
                          <label className="block text-sm font-medium text-gray-500 dark:text-gray-400 mb-1">
                            {t('nodes.condition.type')}
                          </label>
                          <select
                            value={subCondition.type}
                            onChange={(e) => {
                              const newSubConditions = [...localCondition.subConditions];
                              newSubConditions[index] = {
                                ...subCondition,
                                type: e.target.value as 'variable' | 'clientData',
                                field: ''
                              };
                              setLocalCondition({
                                ...localCondition,
                                subConditions: newSubConditions
                              });
                            }}
                            className="w-full p-2 text-sm border rounded-md border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                          >
                            <option value="variable">{t('nodes.condition.variable')}</option>
                            <option value="clientData">{t('nodes.condition.clientData.title')}</option>
                          </select>
                        </div>

                        <div>
                          <label className="block text-sm font-medium text-gray-500 dark:text-gray-400 mb-1">
                            {subCondition.type === 'variable' ? t('nodes.condition.selectVariable') : t('nodes.condition.selectClientData')}
                          </label>
                          {subCondition.type === 'variable' ? (
                            <SearchableSelect
                              value={variables
                                .filter(variable => variable.name === subCondition.field)
                                .map(variable => ({
                                  value: variable.name,
                                  label: variable.name
                                }))[0]}
                              onChange={(selected) => {
                                const newSubConditions = [...localCondition.subConditions];
                                newSubConditions[index] = {
                                  ...subCondition,
                                  field: selected ? selected.value : ''
                                };
                                setLocalCondition({
                                  ...localCondition,
                                  subConditions: newSubConditions
                                });
                              }}
                              onBlur={handleConfigBlur}
                              options={variables.map(variable => ({
                                value: variable.name,
                                label: variable.name
                              }))}
                              placeholder={t('nodes.condition.select')}
                            />
                          ) : (
                            <SearchableSelect
                              value={clientDataOptions
                                .filter(option => option.value === subCondition.field)
                                .map(option => ({
                                  value: option.value,
                                  label: t(`nodes.condition.clientData.${option.labelKey}`)
                                }))[0]}
                              onChange={(selected) => {
                                const newSubConditions = [...localCondition.subConditions];
                                newSubConditions[index] = {
                                  ...subCondition,
                                  field: selected ? selected.value : ''
                                };
                                setLocalCondition({
                                  ...localCondition,
                                  subConditions: newSubConditions
                                });
                              }}
                              onBlur={handleConfigBlur}
                              options={clientDataOptions.map(option => ({
                                value: option.value,
                                label: t(`nodes.condition.clientData.${option.labelKey}`)
                              }))}
                              placeholder={t('nodes.condition.select')}
                            />
                          )}
                        </div>

                        <div>
                          <label className="block text-sm font-medium text-gray-500 dark:text-gray-400 mb-1">
                            {t('nodes.condition.operator')}
                          </label>
                          <SearchableSelect
                            value={getFilteredOperators(subCondition.field)
                              .find(op => op.value === subCondition.operator)
                              ? {
                                  value: subCondition.operator,
                                  label: t(`nodes.condition.operators.${getFilteredOperators(subCondition.field)
                                    .find(op => op.value === subCondition.operator)?.labelKey}`)
                                }
                              : null
                            }
                            onChange={(selected) => {
                              const newSubConditions = [...localCondition.subConditions];
                              newSubConditions[index] = {
                                ...subCondition,
                                operator: selected ? selected.value : 'equalTo'
                              };
                              setLocalCondition({
                                ...localCondition,
                                subConditions: newSubConditions
                              });
                            }}
                            onBlur={handleConfigBlur}
                            options={getFilteredOperators(subCondition.field).map(op => ({
                              value: op.value,
                              label: t(`nodes.condition.operators.${op.labelKey}`)
                            }))}
                            placeholder={t('nodes.condition.selectOperator')}
                          />
                        </div>

                        {!['isSet', 'isEmpty'].includes(subCondition.operator) && (
                          <div>
                            <label className="block text-sm font-medium text-gray-500 dark:text-gray-400 mb-1">
                              {t('nodes.condition.value')}
                            </label>
                            {['inList', 'notInList'].includes(subCondition.operator) && 
                             !['chat_funil', 'chat_team', 'chat_attendant'].includes(subCondition.field) && (
                              <p className="text-xs text-gray-500 dark:text-gray-400 mb-2">
                                {t('nodes.condition.separateByComma')}
                              </p>
                            )}
                            
                            {subCondition.field === 'chat_funil' ? (
                              <>
                                <SearchableSelect
                                  value={funnels
                                    .filter(funnel => funnel.id === subCondition.value)
                                    .map(funnel => ({
                                      value: funnel.id,
                                      label: funnel.name
                                    }))[0]}
                                  onChange={(selected) => {
                                    const newSubConditions = [...localCondition.subConditions];
                                    newSubConditions[index] = {
                                      ...subCondition,
                                      value: selected ? selected.value : '',
                                      stageId: ''
                                    };
                                    setLocalCondition({
                                      ...localCondition,
                                      subConditions: newSubConditions
                                    });
                                  }}
                                  onBlur={handleConfigBlur}
                                  options={funnels.map(funnel => ({
                                    value: funnel.id,
                                    label: funnel.name
                                  }))}
                                  placeholder={t('nodes.condition.selectFunnel')}
                                />

                                {subCondition.value && (
                                  <div className="mt-3">
                                    <SearchableSelect
                                      value={funnels
                                        .find(f => f.id === subCondition.value)
                                        ?.stages
                                        .filter(stage => (subCondition.stageId || '').split(',').includes(stage.id))
                                        .map(stage => ({
                                          value: stage.id,
                                          label: stage.name
                                        }))}
                                      onChange={(selected) => {
                                        const newSubConditions = [...localCondition.subConditions];
                                        const value = Array.isArray(selected)
                                          ? selected.map(option => option.value).join(',')
                                          : selected ? selected.value : '';
                                        newSubConditions[index] = {
                                          ...subCondition,
                                          stageId: value
                                        };
                                        setLocalCondition({
                                          ...localCondition,
                                          subConditions: newSubConditions
                                        });
                                      }}
                                      onBlur={handleConfigBlur}
                                      options={funnels
                                        .find(f => f.id === subCondition.value)
                                        ?.stages.map(stage => ({
                                          value: stage.id,
                                          label: stage.name
                                        })) || []}
                                      placeholder={t('nodes.condition.selectStage')}
                                      isMulti={['inList', 'notInList'].includes(subCondition.operator)}
                                    />
                                  </div>
                                )}
                              </>
                            ) : subCondition.field === 'chat_team' ? (
                              <SearchableSelect
                                value={teams
                                  .filter(team => (subCondition.value || '').split(',').includes(team.id))
                                  .map(team => ({
                                    value: team.id,
                                    label: team.name
                                  }))}
                                onChange={(selected) => {
                                  const newSubConditions = [...localCondition.subConditions];
                                  const value = Array.isArray(selected)
                                    ? selected.map(option => option.value).join(',')
                                    : selected ? selected.value : '';
                                  newSubConditions[index] = {
                                    ...subCondition,
                                    value
                                  };
                                  setLocalCondition({
                                    ...localCondition,
                                    subConditions: newSubConditions
                                  });
                                }}
                                onBlur={handleConfigBlur}
                                options={teams.map(team => ({
                                  value: team.id,
                                  label: team.name
                                }))}
                                placeholder={t('nodes.condition.selectTeam')}
                                isMulti={['inList', 'notInList'].includes(subCondition.operator)}
                              />
                            ) : subCondition.field === 'chat_attendant' ? (
                              <SearchableSelect
                                value={users
                                  .filter(user => (subCondition.value || '').split(',').includes(user.id))
                                  .map(user => ({
                                    value: user.id,
                                    label: user.full_name
                                  }))}
                                onChange={(selected) => {
                                  const newSubConditions = [...localCondition.subConditions];
                                  const value = Array.isArray(selected)
                                    ? selected.map(option => option.value).join(',')
                                    : selected ? selected.value : '';
                                  newSubConditions[index] = {
                                    ...subCondition,
                                    value
                                  };
                                  setLocalCondition({
                                    ...localCondition,
                                    subConditions: newSubConditions
                                  });
                                }}
                                onBlur={handleConfigBlur}
                                options={users.map(user => ({
                                  value: user.id,
                                  label: user.full_name
                                }))}
                                placeholder={t('nodes.condition.selectAttendant')}
                                isMulti={['inList', 'notInList'].includes(subCondition.operator)}
                              />
                            ) : (
                              <input
                                type="text"
                                value={subCondition.value}
                                onChange={(e) => {
                                  const newSubConditions = [...localCondition.subConditions];
                                  newSubConditions[index] = {
                                    ...subCondition,
                                    value: e.target.value
                                  };
                                  setLocalCondition({
                                    ...localCondition,
                                    subConditions: newSubConditions
                                  });
                                }}
                                className="w-full p-2 text-sm border rounded-md border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                                placeholder={t('nodes.condition.enterValue')}
                              />
                            )}
                          </div>
                        )}
                      </div>
                    </div>
                  </React.Fragment>
                ))}

                <button
                  onClick={() => {
                    setLocalCondition({
                      ...localCondition,
                      subConditions: [
                        ...localCondition.subConditions,
                        { type: 'variable', field: '', operator: 'equalTo', value: '' }
                      ]
                    });
                  }}
                  className="w-full p-2 flex items-center justify-center hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg border border-dashed border-gray-300 dark:border-gray-600"
                >
                  <Plus className="w-4 h-4 text-gray-500 dark:text-gray-400 mr-2" />
                  <span className="text-sm text-gray-500 dark:text-gray-400">
                    {t('nodes.condition.addSubCondition')}
                  </span>
                </button>
              </div>
            </div>

            <div className="mt-6 flex justify-end space-x-3">
              <button
                onClick={onClose}
                className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50 dark:bg-gray-700 dark:text-gray-300 dark:border-gray-600 dark:hover:bg-gray-600"
              >
                {t('common:cancel')}
              </button>
              <button
                onClick={() => onSave(localCondition)}
                className="px-4 py-2 text-sm font-medium text-white bg-blue-500 rounded-md hover:bg-blue-600"
              >
                {t('common:save')}
              </button>
            </div>
          </div>
        </div>
      </div>
    </Portal>
  );
} 