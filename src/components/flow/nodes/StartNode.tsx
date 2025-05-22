import React from 'react';
import { Handle, Position } from 'reactflow';
import { Play } from 'lucide-react';
import { useTranslation } from 'react-i18next';

interface StartNodeProps {
  isConnectable: boolean;
}

export function StartNode({ isConnectable }: StartNodeProps) {
  const { t } = useTranslation('flows');

  return (
    <div className="node-content">
      <div className="flex items-center justify-center p-4">
        <div className="flex flex-col items-center">
          <div className="w-10 h-10 rounded-full bg-green-100 dark:bg-green-900/50 flex items-center justify-center mb-2">
            <Play className="w-6 h-6 text-green-600 dark:text-green-400" />
          </div>
          <span className="text-sm font-medium text-gray-700 dark:text-gray-300">
            {t('nodes.start.title')}
          </span>
        </div>
      </div>

      <Handle
        type="source"
        position={Position.Right}
        isConnectable={isConnectable}
        className="w-3 h-3 bg-green-500"
      />
    </div>
  );
}