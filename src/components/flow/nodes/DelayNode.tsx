import React, { useState } from 'react';
import { Handle, Position } from 'reactflow';
import { useTranslation } from 'react-i18next';
import { Clock } from 'lucide-react';

interface DelayNodeProps {
  data: {
    delaySeconds?: number;
  };
  isConnectable: boolean;
}

export function DelayNode({ data, isConnectable }: DelayNodeProps) {
  const { t } = useTranslation('flows');
  const [delay, setDelay] = useState(data.delaySeconds || 0);

  return (
    <div className="node-content">
      <Handle
        type="target"
        position={Position.Left}
        isConnectable={isConnectable}
        className="w-3 h-3 bg-gray-300 dark:bg-gray-600"
      />
      
      <div className="flex items-center mb-2">
        <Clock className="w-5 h-5 text-gray-500 dark:text-gray-400 mr-2" />
        <span className="text-sm font-medium text-gray-700 dark:text-gray-300">
          {t('nodes.delay')}
        </span>
      </div>

      <div className="flex items-center space-x-2">
        <input
          type="number"
          min="0"
          value={delay}
          onChange={(e) => setDelay(Number(e.target.value))}
          className="w-20 p-2 text-sm border rounded-md border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:border-blue-500 focus:ring-blue-500"
        />
        <span className="text-sm text-gray-500 dark:text-gray-400">
          {t('nodes.delaySeconds')}
        </span>
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