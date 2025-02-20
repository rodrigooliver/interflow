import React, { useState, useCallback } from 'react';
import { Handle, Position } from 'reactflow';
import { useTranslation } from 'react-i18next';
import { Clock } from 'lucide-react';
import { BaseNode } from './BaseNode';

interface DelayNodeProps {
  id: string;
  data: {
    delaySeconds?: number;
    label?: string;
  };
  isConnectable: boolean;
}

export function DelayNode({ id, data, isConnectable }: DelayNodeProps) {
  const { t } = useTranslation('flows');
  const [delay, setDelay] = useState(data.delaySeconds || 0);

  const handleBlur = useCallback(() => {
    const event = new CustomEvent('nodeDataChanged', {
      detail: { 
        nodeId: id, 
        data: { ...data, delaySeconds: delay } 
      }
    });
    document.dispatchEvent(event);
  }, [id, data, delay]);

  const handleLabelChange = (newLabel: string) => {
    const event = new CustomEvent('nodeDataChanged', {
      detail: { nodeId: id, data: { ...data, label: newLabel } }
    });
    document.dispatchEvent(event);
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value === '' ? 0 : Number(e.target.value);
    setDelay(value);
  };

  return (
    <div className="bg-white dark:bg-gray-800">
      <BaseNode 
        id={id} 
        data={data} 
        onLabelChange={handleLabelChange}
        icon={<Clock className="w-4 h-4 text-gray-500" />}
      />

      <div className="flex items-center space-x-2 p-2">
        <input
          type="number"
          min="0"
          value={delay}
          onChange={handleChange}
          onBlur={handleBlur}
          className="w-20 p-2 text-sm border rounded-md border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:border-blue-500 focus:ring-blue-500"
        />
        <span className="text-sm text-gray-500 dark:text-gray-400">
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