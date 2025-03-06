import React from 'react';
import { useTranslation } from 'react-i18next';
import { 
  MessageSquare, 
  Music, 
  Image, 
  Video, 
  FileText, 
  Clock, 
  Variable, 
  GitFork, 
  MessageCircle,
  UserCog
} from 'lucide-react';
import { NodeType } from '../../types/flow';

interface NodeCategory {
  title: string;
  nodes: {
    type: NodeType;
    label: string;
    icon: React.ElementType;
  }[];
}

// Adicionar componente do logo
const OpenAILogo = () => (
  <img 
    src="/images/logos/openai.svg" 
    alt="OpenAI Logo" 
    className="w-5 h-5 mr-3 transition-all dark:invert dark:brightness-200 flex-shrink-0"
  />
);

export function NodeToolbar() {
  const { t } = useTranslation('flows');

  const categories: NodeCategory[] = [
    {
      title: t('categories.send'),
      nodes: [
        { type: 'text', label: t('nodes.sendText.title'), icon: MessageSquare },
        { type: 'audio', label: t('nodes.sendAudio.title'), icon: Music },
        { type: 'image', label: t('nodes.sendImage.title'), icon: Image },
        { type: 'video', label: t('nodes.sendVideo.title'), icon: Video },
        { type: 'document', label: t('nodes.sendDocument.title'), icon: FileText },
      ]
    },
    {
      title: t('categories.receive'),
      nodes: [
        { type: 'input', label: t('nodes.input.title'), icon: MessageCircle },
      ]
    },
    {
      title: t('categories.action'),
      nodes: [
        { type: 'delay', label: t('nodes.delay.title'), icon: Clock },
        { type: 'variable', label: t('nodes.variable.title'), icon: Variable },
        { type: 'condition', label: t('nodes.condition.title'), icon: GitFork },
        { type: 'update_customer', label: t('nodes.updateCustomer.title'), icon: UserCog },
      ]
    },
    {
      title: t('categories.integrations'),
      nodes: [
        { type: 'openai', label: t('nodes.openai.title'), icon: OpenAILogo },
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
              {category.nodes.map(({ type, label, icon: Icon }) => (
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
        ))}
        <div className="h-1" />
      </div>
    </div>
  );
}