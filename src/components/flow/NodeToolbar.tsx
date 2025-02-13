import React from 'react';
import { useTranslation } from 'react-i18next';
import { MessageSquare, Music, Image, Video, FileText, Clock, Variable, GitFork, MessageCircle, Play } from 'lucide-react';
import { NodeType } from '../../types/flow';

export function NodeToolbar() {
  const { t } = useTranslation('flows');

  const nodeTypes = [
    { type: 'text', label: t('nodes.sendText'), icon: MessageSquare },
    { type: 'audio', label: t('nodes.sendAudio'), icon: Music },
    { type: 'image', label: t('nodes.sendImage'), icon: Image },
    { type: 'video', label: t('nodes.sendVideo'), icon: Video },
    { type: 'document', label: t('nodes.sendDocument'), icon: FileText },
    { type: 'delay', label: t('nodes.delay'), icon: Clock },
    { type: 'variable', label: t('nodes.variable.title'), icon: Variable },
    { type: 'condition', label: t('nodes.condition.title'), icon: GitFork },
    { type: 'input', label: t('nodes.input'), icon: MessageCircle },
  ];

  const onDragStart = (event: React.DragEvent, nodeType: NodeType) => {
    event.dataTransfer.setData('application/reactflow-type', nodeType);
    event.dataTransfer.effectAllowed = 'move';
  };

  return (
    <div className="p-4 h-full">
      <div className="space-y-2">
        {nodeTypes.map(({ type, label, icon: Icon }) => (
          <div
            key={type}
            draggable
            onDragStart={(e) => onDragStart(e, type)}
            className="flex items-center p-3 rounded-lg cursor-move bg-gray-50 dark:bg-gray-700/50 hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
          >
            <Icon className="w-5 h-5 text-gray-500 dark:text-gray-400 mr-3" />
            <span className="text-sm text-gray-700 dark:text-gray-300">{label}</span>
          </div>
        ))}
      </div>
    </div>
  );
}