import React, { useState, useEffect } from 'react';
import { Handle, Position, useReactFlow, useUpdateNodeInternals } from 'reactflow';
import { useTranslation } from 'react-i18next';
import { GitFork, Plus, X } from 'lucide-react';

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
  const { setNodes } = useReactFlow();
  const updateNodeInternals = useUpdateNodeInternals();
  const [conditions, setConditions] = useState<Condition[]>(
    data.conditions || [{ variable: '', operator: '==', value: '' }]
  );

  useEffect(() => {
    setNodes((nodes) =>
      nodes.map((node) =>
        node.id === id ? { ...node, data: { ...node.data, conditions } } : node
      )
    );
    updateNodeInternals(id);
  }, [conditions, id, setNodes, updateNodeInternals]);

  const addCondition = () => {
    setConditions([...conditions, { variable: '', operator: '==', value: '' }]);
  };

  const removeCondition = (index: number) => {
    setConditions(conditions.filter((_, i) => i !== index));
  };

  const updateCondition = (index: number, field: keyof Condition, value: string) => {
    const newConditions = [...conditions];
    newConditions[index] = { ...newConditions[index], [field]: value };
    setConditions(newConditions);
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
    <div className="node-content">
      <Handle
        type="target"
        position={Position.Left}
        isConnectable={isConnectable}
        className="w-3 h-3 bg-gray-300 dark:bg-gray-600"
      />
      
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center">
          <GitFork className="w-5 h-5 text-gray-500 dark:text-gray-400 mr-2" />
          <span className="text-sm font-medium text-gray-700 dark:text-gray-300">
            {t('nodes.condition.title')}
          </span>
        </div>
        <button
          onClick={addCondition}
          className="p-1 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-full"
        >
          <Plus className="w-4 h-4 text-gray-500 dark:text-gray-400" />
        </button>
      </div>

      <div className="space-y-4">
        {conditions.map((condition, index) => (
          <div key={index} className="relative bg-gray-50 dark:bg-gray-700/50 rounded-lg p-4">
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
              <input
                type="text"
                value={condition.variable}
                onChange={(e) => updateCondition(index, 'variable', e.target.value)}
                placeholder={t('nodes.condition.variablePlaceholder')}
                className="w-full p-2 text-sm border rounded-md border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:border-blue-500 focus:ring-blue-500"
              />
              
              <div className="flex space-x-2">
                <select
                  value={condition.operator}
                  onChange={(e) => updateCondition(index, 'operator', e.target.value as any)}
                  className="w-32 p-2 text-sm border rounded-md border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:border-blue-500 focus:ring-blue-500"
                >
                  {operators.map(op => (
                    <option key={op.value} value={op.value}>{op.label}</option>
                  ))}
                </select>

                <input
                  type="text"
                  value={condition.value}
                  onChange={(e) => updateCondition(index, 'value', e.target.value)}
                  placeholder={t('nodes.condition.valuePlaceholder')}
                  className="flex-1 p-2 text-sm border rounded-md border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:border-blue-500 focus:ring-blue-500"
                />
              </div>
            </div>

            <Handle
              type="source"
              position={Position.Right}
              id={`condition-${index}`}
              style={{ 
                top: '50%',
                transform: 'translateY(-50%)'
              }}
              isConnectable={isConnectable}
              className="w-3 h-3 bg-blue-500"
            />
          </div>
        ))}

        <div className="relative bg-gray-50 dark:bg-gray-700/50 rounded-lg p-4">
          <span className="text-sm text-gray-500 dark:text-gray-400">
            {t('nodes.condition.else')}
          </span>
          <Handle
            type="source"
            position={Position.Right}
            id="else"
            style={{ 
              top: '50%',
              transform: 'translateY(-50%)'
            }}
            isConnectable={isConnectable}
            className="w-3 h-3 bg-red-500"
          />
        </div>
      </div>
    </div>
  );
}