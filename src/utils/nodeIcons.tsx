import React from 'react';
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
  UserCog,
  Globe,
  SkipForward,
  RectangleHorizontal
} from 'lucide-react';
import { NodeType } from '../types/flow';

// Componente para exibir o logo do OpenAI
export const OpenAILogo = () => (
  <img 
    src="/images/logos/openai.svg" 
    alt="OpenAI Logo" 
    className="w-4 h-4 transition-all dark:invert dark:brightness-200 flex-shrink-0"
  />
);

// Componente para exibir o logo do AgenteIA
export const AgenteIALogo = () => (
  <img 
    src="/images/logos/agenteia.svg" 
    alt="Agente IA Logo" 
    className="w-4 h-4 transition-all dark:invert dark:brightness-200 flex-shrink-0"
  />
);

// Função para obter o ícone baseado no tipo do nó
export const getNodeIcon = (type: NodeType, size: 'sm' | 'md' = 'sm') => {
  const iconSize = size === 'sm' ? "w-4 h-4" : "w-5 h-5";
  
  const iconMap: Record<NodeType, React.ReactNode> = {
    text: <MessageSquare className={`${iconSize} text-blue-500`} />,
    audio: <Music className={`${iconSize} text-purple-500`} />,
    image: <Image className={`${iconSize} text-green-500`} />,
    video: <Video className={`${iconSize} text-red-500`} />,
    document: <FileText className={`${iconSize} text-amber-500`} />,
    delay: <Clock className={`${iconSize} text-cyan-500`} />,
    variable: <Variable className={`${iconSize} text-indigo-500`} />,
    condition: <GitFork className={`${iconSize} text-pink-500`} />,
    input: <MessageCircle className={`${iconSize} text-teal-500`} />,
    update_customer: <UserCog className={`${iconSize} text-orange-500`} />,
    start: <MessageSquare className={`${iconSize} text-green-600`} />,
    openai: <OpenAILogo />,
    agenteia: <AgenteIALogo />,
    request: <Globe className={`${iconSize} text-violet-500`} />,
    jump_to: <SkipForward className={`${iconSize} text-blue-600`} />,
    group: <RectangleHorizontal className={`${iconSize} text-gray-500`} />
  };

  return iconMap[type] || <div className={iconSize} />;
};

// Função para obter a cor associada a cada tipo de nó
export const getNodeColor = (type: NodeType): string => {
  const colorMap: Record<NodeType, string> = {
    text: 'text-blue-500',
    audio: 'text-purple-500',
    image: 'text-green-500',
    video: 'text-red-500',
    document: 'text-amber-500',
    delay: 'text-cyan-500',
    variable: 'text-indigo-500',
    condition: 'text-pink-500',
    input: 'text-teal-500',
    update_customer: 'text-orange-500',
    start: 'text-green-600',
    openai: 'text-gray-700 dark:text-gray-300',
    agenteia: 'text-gray-700 dark:text-gray-300',
    request: 'text-violet-500',
    jump_to: 'text-blue-600',
    group: 'text-gray-500'
  };

  return colorMap[type] || 'text-gray-500';
}; 