import React, { useState, useCallback } from 'react';
import { Handle, Position } from 'reactflow';
import { useTranslation } from 'react-i18next';
import { BaseNode } from './BaseNode';
import { useFlowEditor } from '../../../contexts/FlowEditorContext';

interface DelayNodeProps {
  id: string;
  data: {
    delaySeconds?: number|string;
    label?: string;
  };
  isConnectable: boolean;
}

export function DelayNode({ id, data, isConnectable }: DelayNodeProps) {
  const { t } = useTranslation('flows');
  const { updateNodeData } = useFlowEditor();
  const [delaySeconds, setDelaySeconds] = useState(data.delaySeconds || 0);

  const handleChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    setDelaySeconds(e.target.value);
  }, []);

  const handleBlur = useCallback(() => {
    updateNodeData(id, {
      ...data,
      delaySeconds
    });
  }, [id, data, delaySeconds, updateNodeData]);

  return (
    <div className="bg-white dark:bg-gray-800">
      <BaseNode 
        id={id} 
        data={data}
        type="delay"
      />

      <div className="flex items-center p-2">
        <input
          type="number"
          min="0"
          value={delaySeconds}
          onChange={handleChange}
          onBlur={handleBlur}
          className="w-full p-2 text-sm border rounded-md border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:border-blue-500 focus:ring-blue-500"
        />
        <span className="ml-2 text-sm text-gray-500 dark:text-gray-400">
          {t('nodes.delaySeconds')}
        </span>
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