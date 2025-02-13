import React, { useState } from 'react';
import { Handle, Position } from 'reactflow';
import { useTranslation } from 'react-i18next';
import { Variable } from 'lucide-react';

interface VariableNodeProps {
  data: {
    variable?: {
      name: string;
      value: string;
    };
  };
  isConnectable: boolean;
}

export function VariableNode({ data, isConnectable }: VariableNodeProps) {
  const { t } = useTranslation('flows');
  const [name, setName] = useState(data.variable?.name || '');
  const [value, setValue] = useState(data.variable?.value || '');

  return (
    <div className="node-content">
      <Handle
        type="target"
        position={Position.Left}
        isConnectable={isConnectable}
        className="w-3 h-3 bg-gray-300 dark:bg-gray-600"
      />
      
      <div className="flex items-center mb-2">
        <Variable className="w-5 h-5 text-gray-500 dark:text-gray-400 mr-2" />
        <span className="text-sm font-medium text-gray-700 dark:text-gray-300">
          {t('nodes.variable.title')}
        </span>
      </div>

      <div className="space-y-2">
        <input
          type="text"
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder={t('nodes.variable.namePlaceholder')}
          className="w-full p-2 text-sm border rounded-md border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:border-blue-500 focus:ring-blue-500"
        />
        <input
          type="text"
          value={value}
          onChange={(e) => setValue(e.target.value)}
          placeholder={t('nodes.variable.valuePlaceholder')}
          className="w-full p-2 text-sm border rounded-md border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:border-blue-500 focus:ring-blue-500"
        />
      </div>

      <Handle
        type="source"
        position={Position.Right}
        isConnectable={isConnectable}
        className="w-3 h-3 bg-gray-300 dark:bg-gray-600"
      />
    </div>
  );
}