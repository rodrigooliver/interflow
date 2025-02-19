import React, { useState, useCallback } from 'react';
import { Handle, Position, NodeProps } from 'reactflow';
import { useTranslation } from 'react-i18next';
import { MessageSquare } from 'lucide-react';
import { BaseNode } from './BaseNode';

interface TextNodeProps {
  id: string;
  data: {
    text?: string;
    label?: string;
  };
  isConnectable: boolean;
}

export function TextNode({ id, data, isConnectable }: TextNodeProps) {
  const { t } = useTranslation('flows');
  const [content, setContent] = useState(data.text || '');

  const handleChange = useCallback((evt: React.ChangeEvent<HTMLTextAreaElement>) => {
    const newContent = evt.target.value;
    setContent(newContent);
  }, []);

  const handleBlur = useCallback(() => {
    // Disparar evento de mudança apenas quando terminar de editar
    const event = new CustomEvent('nodeDataChanged', {
      detail: { 
        nodeId: id, 
        data: { ...data, text: content } 
      }
    });   
    document.dispatchEvent(event);
  }, [id, data, content]);

  const handleLabelChange = (newLabel: string) => {
    const event = new CustomEvent('nodeDataChanged', {
      detail: { nodeId: id, data: { ...data, label: newLabel } }
    });
    console.log('Dispatching event', event);
    document.dispatchEvent(event);
  };

  return (
    <div className="bg-white dark:bg-gray-800">
      <BaseNode 
        id={id} 
        data={data} 
        onLabelChange={handleLabelChange}
        icon={<MessageSquare className="w-4 h-4 text-gray-500" />}
      />
      
      <textarea
          value={content}
          onChange={handleChange}
          onBlur={handleBlur}
          placeholder={t('nodes.messagePlaceholder')}
          className="w-full p-2 text-sm border rounded-md border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:border-blue-500 focus:ring-blue-500"
          rows={4}
        />

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