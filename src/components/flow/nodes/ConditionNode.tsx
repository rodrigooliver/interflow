import React, { useState, useCallback } from 'react';
import { Handle, Position } from 'reactflow';
import { useTranslation } from 'react-i18next';
import { GitFork, Plus, X } from 'lucide-react';
import { BaseNode } from './BaseNode';
import { useFlowEditor } from '../../../contexts/FlowEditorContext';

interface Condition {
  variable: string;
  operator: '==' | '!=' | '>' | '<' | '>=' | '<=';
  value: string;
}

interface ConditionNodeProps {
  data: {
    conditions?: Condition[];
  };
  id: string;
  isConnectable: boolean;
}

export function ConditionNode({ data, id, isConnectable }: ConditionNodeProps) {
  const { t } = useTranslation('flows');
  const { updateNodeData, variables } = useFlowEditor();
  const [localConditions, setLocalConditions] = useState<Condition[]>(
    data.conditions || [{ variable: '', operator: '==', value: '' }]
  );

  const handleConditionChange = (index: number, field: keyof Condition, value: string) => {
    const newConditions = [...localConditions];
    newConditions[index] = { ...newConditions[index], [field]: value };
    setLocalConditions(newConditions);
  };

  const handleBlur = useCallback(() => {
    updateNodeData(id, { ...data, conditions: localConditions });
  }, [id, data, localConditions, updateNodeData]);

  const addCondition = () => {
    setLocalConditions([...localConditions, { variable: '', operator: '==', value: '' }]);
  };

  const removeCondition = (index: number) => {
    setLocalConditions(localConditions.filter((_, i) => i !== index));
  };

  const operators = [
    { value: '==', label: t('nodes.condition.operators.equals') },
    { value: '!=', label: t('nodes.condition.operators.notEquals') },
    { value: '>', label: t('nodes.condition.operators.greaterThan') },
    { value: '<', label: t('nodes.condition.operators.lessThan') },
    { value: '>=', label: t('nodes.condition.operators.greaterOrEqual') },
    { value: '<=', label: t('nodes.condition.operators.lessOrEqual') }
  ];

  return (
    <div className="bg-white dark:bg-gray-800 relative">
      <BaseNode 
        id={id} 
        data={data}
        icon={<GitFork className="w-4 h-4 text-gray-500" />}
      />
      
      <div className="">
        <div className="space-y-4">
          {localConditions.map((condition, index) => (
            <div key={index} className="relative bg-gray-50 dark:bg-gray-700/50 rounded-lg p-2">
              <div className="flex items-center justify-between">
                <span className="text-sm text-gray-500 dark:text-gray-400">
                  {index === 0 ? t('nodes.condition.if') : t('nodes.condition.elseIf')}
                </span>
                {index > 0 && (
                  <button
                    onClick={() => removeCondition(index)}
                    className="p-1 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-full"
                  >
                    <X className="w-4 h-4 text-gray-500 dark:text-gray-400" />
                  </button>
                )}
              </div>

              <div className="mt-2 space-y-2">
                <select
                  value={condition.variable}
                  onChange={(e) => handleConditionChange(index, 'variable', e.target.value)}
                  onBlur={handleBlur}
                  className="w-full p-2 text-sm border rounded-md border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:border-blue-500 focus:ring-blue-500"
                >
                  <option value="">{t('nodes.condition.selectVariable')}</option>
                  {variables.map((variable) => (
                    <option key={variable.id} value={variable.name}>
                      {variable.name}
                    </option>
                  ))}
                </select>
                
                <div className="flex space-x-2">
                  <div className="flex-1">
                    <select
                      value={condition.operator}
                      onChange={(e) => handleConditionChange(index, 'operator', e.target.value as any)}
                      onBlur={handleBlur}
                      className="w-full p-2 text-sm border rounded-md border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:border-blue-500 focus:ring-blue-500"
                    >
                      {operators.map(op => (
                        <option key={op.value} value={op.value}>{op.label}</option>
                      ))}
                    </select>
                  </div>

                  <div className="flex-1">
                    <input
                      type="text"
                      value={condition.value}
                      onChange={(e) => handleConditionChange(index, 'value', e.target.value)}
                      onBlur={handleBlur}
                      placeholder={t('nodes.condition.valuePlaceholder')}
                      className="w-full p-2 text-sm border rounded-md border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:border-blue-500 focus:ring-blue-500"
                    />
                  </div>
                </div>
              </div>

              <Handle
                type="source"
                position={Position.Right}
                id={`condition-${index}`}
                style={{ top: '50%', transform: 'translateY(-50%)' }}
                isConnectable={isConnectable}
                className="w-3 h-3 -mr-2 bg-blue-500"
              />
            </div>
          ))}

          <button
            onClick={addCondition}
            className="w-full p-2 mb-4 flex items-center justify-center hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg border border-dashed border-gray-300 dark:border-gray-600"
          >
            <Plus className="w-4 h-4 text-gray-500 dark:text-gray-400 mr-2" />
            <span className="text-sm text-gray-500 dark:text-gray-400">{t('nodes.condition.addCondition')}</span>
          </button>

          <div className="relative bg-gray-50 dark:bg-gray-700/50 rounded-lg p-4">
            <span className="text-sm text-gray-500 dark:text-gray-400">
              {t('nodes.condition.else')}
            </span>
            <Handle
              type="source"
              position={Position.Right}
              id="else"
              style={{ top: '50%', transform: 'translateY(-50%)' }}
              isConnectable={isConnectable}
              className="w-3 h-3 -mr-2 bg-red-500"
            />
          </div>
        </div>
      </div>

      <Handle
        type="target"
        position={Position.Left}
        isConnectable={isConnectable}
        className="w-3 h-3 -ml-2 bg-gray-300 dark:bg-gray-600"
      />
    </div>
  );
}