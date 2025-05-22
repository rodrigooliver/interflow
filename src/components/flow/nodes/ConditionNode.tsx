import React, { useState } from 'react';
import { Handle, Position } from 'reactflow';
import { useTranslation } from 'react-i18next';
import { Plus, X } from 'lucide-react';
import { BaseNode } from './BaseNode';
import { useFlowEditor } from '../../../contexts/FlowEditorContext';
import { ConditionModal } from './ConditionModal';

interface SubCondition {
  type: 'variable' | 'clientData';
  field: string;
  operator: 'equalTo' | 'notEqual' | 'contains' | 'doesNotContain' | 
           'greaterThan' | 'lessThan' | 'isSet' | 'isEmpty' | 
           'startsWith' | 'endsWith' | 'matchesRegex' | 'doesNotMatchRegex' |
           'inList' | 'notInList';
  value: string;
}

export interface Condition {
  logicOperator: 'AND' | 'OR';
  subConditions: SubCondition[];
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
    data.conditions || [{
      logicOperator: 'AND' as const,
      subConditions: [{
        type: 'variable' as const,
        field: '',
        operator: 'equalTo' as const,
        value: ''
      }]
    }]
  );
  const [activeModalIndex, setActiveModalIndex] = useState<number | null>(null);

  return (
    <div className="bg-white dark:bg-gray-800 relative">
      <BaseNode 
        id={id} 
        data={data}
        type="condition"
      />
      
      <div className="space-y-4">
        {localConditions?.map((condition, index) => (
          <div key={index} className="relative bg-gray-50 dark:bg-gray-700/50 rounded-lg p-2">
            <div 
              onClick={() => setActiveModalIndex(index)}
              className="cursor-pointer hover:bg-gray-100 dark:hover:bg-gray-600 p-2 rounded-md"
            >
              <div className="flex items-center justify-between">
                <span className="text-sm text-gray-500 dark:text-gray-400">
                  {index === 0 ? t('nodes.condition.if') : t('nodes.condition.elseIf')}
                </span>
                {index > 0 && (
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      const newConditions = localConditions.filter((_, i) => i !== index);
                      setLocalConditions(newConditions);
                      updateNodeData(id, { ...data, conditions: newConditions });
                    }}
                    className="p-1 hover:bg-gray-200 dark:hover:bg-gray-600 rounded-full"
                  >
                    <X className="w-4 h-4 text-gray-500 dark:text-gray-400" />
                  </button>
                )}
              </div>

              <div className="mt-2">
                <div className="text-sm text-gray-600 dark:text-gray-300">
                  {condition?.subConditions?.length || 0} {t('nodes.condition.conditions')} ({condition?.logicOperator})
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

        {/* Modal para edição das condições */}
        {activeModalIndex !== null && localConditions[activeModalIndex] && (
          <ConditionModal
            condition={localConditions[activeModalIndex]}
            onClose={() => setActiveModalIndex(null)}
            onSave={(updatedCondition) => {
              const newConditions = [...localConditions];
              newConditions[activeModalIndex] = updatedCondition;
              setLocalConditions(newConditions);
              updateNodeData(id, { ...data, conditions: newConditions });
              setActiveModalIndex(null);
            }}
            variables={variables}
          />
        )}

        <button
          onClick={() => {
            const newConditions = [...localConditions, {
              logicOperator: 'AND' as const,
              subConditions: [{ 
                type: 'variable' as const, 
                field: '', 
                operator: 'equalTo' as const, 
                value: '' 
              }]
            }];
            setLocalConditions(newConditions);
            updateNodeData(id, { ...data, conditions: newConditions });
          }}
          className="w-full p-2 flex items-center justify-center hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg border border-dashed border-gray-300 dark:border-gray-600"
        >
          <Plus className="w-4 h-4 text-gray-500 dark:text-gray-400 mr-2" />
          <span className="text-sm text-gray-500 dark:text-gray-400">
            {t('nodes.condition.addCondition')}
          </span>
        </button>

        {/* Else handle */}
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

      <Handle
        type="target"
        position={Position.Left}
        isConnectable={isConnectable}
        className="w-3 h-3 -ml-2 bg-gray-300 dark:bg-gray-600"
      />
    </div>
  );
}