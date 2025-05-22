import React, { useState, useCallback } from 'react';
import { Handle, Position } from 'reactflow';
import { useTranslation } from 'react-i18next';
import { BaseNode } from './BaseNode';
import { useFlowEditor } from '../../../contexts/FlowEditorContext';

interface VariableNodeProps {
  id: string;
  data: {
    variable?: {
      name: string;
      value: string;
    };
    label?: string;
  };
  isConnectable: boolean;
}

export function VariableNode({ id, data, isConnectable }: VariableNodeProps) {
  const { t } = useTranslation('flows');
  const { updateNodeData, variables } = useFlowEditor();
  const [localVariable, setLocalVariable] = useState(data.variable || {
    name: '',
    value: ''
  });

  const handleChange = (field: 'name' | 'value', value: string) => {
    setLocalVariable(prev => ({
      ...prev,
      [field]: value
    }));
  };

  const handleBlur = useCallback(() => {
    updateNodeData(id, {
      ...data,
      variable: localVariable
    });
  }, [id, data, localVariable, updateNodeData]);

  return (
    <div className="bg-white dark:bg-gray-800">
      <BaseNode 
        id={id} 
        data={data}
        type="variable"
      />

      <div className="space-y-2">
        <select
          value={localVariable.name}
          onChange={(e) => handleChange('name', e.target.value)}
          onBlur={handleBlur}
          className="w-full p-2 text-sm border rounded-md border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:border-blue-500 focus:ring-blue-500"
        >
          <option value="">{t('nodes.variable.selectVariable')}</option>
          {variables.map((variable) => (
            <option key={variable.name} value={variable.name}>
              {variable.name}
            </option>
          ))}
        </select>
        
        <input
          type="text"
          value={localVariable.value}
          onChange={(e) => handleChange('value', e.target.value)}
          onBlur={handleBlur}
          placeholder={t('nodes.variable.valuePlaceholder')}
          className="w-full p-2 text-sm border rounded-md border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:border-blue-500 focus:ring-blue-500"
        />
      </div>

      <Handle
        type="target"
        position={Position.Left}
        isConnectable={isConnectable}
        className="w-3 h-3 bg-gray-300 dark:bg-gray-600"
      />
      <Handle
        type="source"
        position={Position.Right}
        isConnectable={isConnectable}
        className="w-3 h-3 bg-gray-300 dark:bg-gray-600"
      />
    </div>
  );
}