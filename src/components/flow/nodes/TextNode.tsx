import React, { useState, useCallback } from 'react';
import { Handle, Position } from 'reactflow';
import { useTranslation } from 'react-i18next';
import { MessageSquare } from 'lucide-react';

interface TextNodeProps {
  data: {
    content?: string;
  };
  isConnectable: boolean;
}

export function TextNode({ data, isConnectable }: TextNodeProps) {
  const { t } = useTranslation('flows');
  const [content, setContent] = useState(data.content || '');

  const handleChange = useCallback((evt: React.ChangeEvent<HTMLTextAreaElement>) => {
    setContent(evt.target.value);
  }, []);

  return (
    <div className="node-content">
      <Handle
        type="target"
        position={Position.Left}
        isConnectable={isConnectable}
        className="w-3 h-3 bg-gray-300 dark:bg-gray-600"
      />
      
      <div className="flex items-center mb-2">
        <MessageSquare className="w-5 h-5 text-gray-500 dark:text-gray-400 mr-2" />
        <span className="text-sm font-medium text-gray-700 dark:text-gray-300">
          {t('nodes.sendText')}
        </span>
      </div>

      <textarea
        value={content}
        onChange={handleChange}
        placeholder={t('nodes.messagePlaceholder')}
        className="w-full p-2 text-sm border rounded-md border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:border-blue-500 focus:ring-blue-500"
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