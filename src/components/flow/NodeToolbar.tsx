import React from 'react';
import { useTranslation } from 'react-i18next';
import { NodeType } from '../../types/flow';
import { getNodeIcon } from '../../utils/nodeIcons';

interface NodeCategory {
  title: string;
  nodes: {
    type: NodeType;
    label: string;
  }[];
}

export function NodeToolbar() {
  const { t } = useTranslation('flows');

  const categories: NodeCategory[] = [
    {
      title: t('categories.send'),
      nodes: [
        { type: 'text', label: t('nodes.sendText.title') },
        { type: 'audio', label: t('nodes.sendAudio.title') },
        { type: 'image', label: t('nodes.sendImage.title') },
        { type: 'video', label: t('nodes.sendVideo.title') },
        { type: 'document', label: t('nodes.sendDocument.title') },
      ]
    },
    {
      title: t('categories.receive'),
      nodes: [
        { type: 'input', label: t('nodes.input.title') },
      ]
    },
    {
      title: t('categories.action'),
      nodes: [
        { type: 'delay', label: t('nodes.delay.title') },
        { type: 'variable', label: t('nodes.variable.title') },
        { type: 'condition', label: t('nodes.condition.title') },
        { type: 'update_customer', label: t('nodes.updateCustomer.title') },
        { type: 'jump_to', label: t('nodes.jumpTo.title') },
      ]
    },
    {
      title: t('categories.integrations'),
      nodes: [
        { type: 'openai', label: t('nodes.openai.title') },
        { type: 'agenteia', label: t('nodes.agenteia.title') },
        { type: 'request', label: t('nodes.request.title') },
      ]
    }
  ];

  const onDragStart = (event: React.DragEvent, nodeType: NodeType) => {
    event.dataTransfer.setData('application/reactflow-type', nodeType);
    event.dataTransfer.effectAllowed = 'move';
  };

  return (
    <div className="p-4 h-full">
      <div className="space-y-6">
        {categories.map((category) => (
          <div key={category.title} className="space-y-2">
            <h3 className="text-sm font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
              {category.title}
            </h3>
            <div className="space-y-2">
              {category.nodes.map(({ type, label }) => (
                <div
                  key={type}
                  draggable
                  onDragStart={(e) => onDragStart(e, type)}
                  className="flex items-center p-3 rounded-lg cursor-move bg-gray-50 dark:bg-gray-700/50 hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
                >
                  <div className="mr-3">
                    {getNodeIcon(type, 'md')}
                  </div>
                  <span className="text-sm text-gray-700 dark:text-gray-300">{label}</span>
                </div>
              ))}
            </div>
          </div>
        ))}
        <div className="h-1" />
      </div>
    </div>
  );
}