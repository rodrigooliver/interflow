import React from 'react';
import { formatDistanceToNow } from 'date-fns';
import { ptBR, enUS, es } from 'date-fns/locale';
import { useTranslation } from 'react-i18next';
import { AlertCircle, Clock, Check, CheckCheck } from 'lucide-react';
import { Chat } from '../../types/database';

const locales = {
  pt: ptBR,
  en: enUS,
  es: es
};

interface ChatListProps {
  chats: Chat[];
  selectedChat: string | null;
  onSelectChat: (chatId: string) => void;
}

export function ChatList({ chats, selectedChat, onSelectChat }: ChatListProps) {
  const { t, i18n } = useTranslation('chats');

  const getInitials = (name: string) => {
    return name
      .split(' ')
      .map(n => n[0])
      .join('')
      .toUpperCase()
      .slice(0, 2);
  };

  const getRandomColor = (name: string) => {
    const colors = [
      'bg-blue-500',
      'bg-green-500',
      'bg-yellow-500',
      'bg-purple-500',
      'bg-pink-500',
      'bg-indigo-500',
      'bg-red-500',
      'bg-teal-500'
    ];
    
    // Use name to generate consistent color
    const index = name.split('').reduce((acc, char) => acc + char.charCodeAt(0), 0);
    return colors[index % colors.length];
  };

  const formatLastMessageTime = (timestamp: string) => {
    return formatDistanceToNow(new Date(timestamp), {
      addSuffix: true,
      locale: locales[i18n.language as keyof typeof locales] || enUS
    });
  };

  const getStatusIcon = (chat: Chat) => {
    
    if (!chat.last_message) return null;

    switch (chat.last_message.status) {
      case 'pending':
        return (
          <Clock 
            className="w-4 h-4 text-gray-400 dark:text-gray-500" 
          />
        );
      case 'sent':
        return (
          <Check 
            className="w-4 h-4 text-gray-500 dark:text-gray-400" 
          />
        );
      case 'delivered':
        return (
          <CheckCheck 
            className="w-4 h-4 text-gray-500 dark:text-gray-400" 
          />
        );
      case 'read':
        return (
          <CheckCheck 
            className="w-4 h-4 text-blue-500 dark:text-blue-400" 
          />
        );
      case 'failed':
        return (
          <AlertCircle 
            className="w-4 h-4 text-red-500 dark:text-red-400" 
          />
        );
      default:
        return null;
    }
  };

  const getStatusBadge = (chat: Chat) => {
    switch (chat.status) {
      case 'pending':
        return (
          <span className="px-2 py-1 text-xs font-medium rounded-full bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200">
            {t('status.pending')}
          </span>
        );
      case 'in_progress':
        return (
          <span className="px-2 py-1 text-xs font-medium rounded-full bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200">
            {t('status.in_progress')}
          </span>
        );
      case 'closed':
        return (
          <span className="px-2 py-1 text-xs font-medium rounded-full bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-200">
            {t('status.closed')}
          </span>
        );
      default:
        return null;
    }
  };

  return (
    <div className="flex-1 overflow-y-auto">
      {chats.map((chat) => (
        <a
          key={chat.id}
          href="#"
          onClick={(e) => {
            e.preventDefault();
            onSelectChat(chat.id);
          }}
          data-chat-id={chat.id}
          className={`block p-4 border-b border-gray-200 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-700 ${
            selectedChat === chat.id ? 'bg-blue-50 dark:bg-blue-900/50' : ''
          }`}
        >
          <div className="flex items-start space-x-3">
            <div className={`flex-shrink-0 w-10 h-10 rounded-full ${getRandomColor(chat.customer?.name || 'Anônimo')} flex items-center justify-center`}>
              <span className="text-white font-medium">
                {getInitials(chat.customer?.name || 'Anônimo')}
              </span>
            </div>
            
            <div className="flex-1 min-w-0">
              <div className="flex justify-between items-center w-full mb-1">
                <span className="font-medium text-gray-900 dark:text-white truncate">
                  {chat.customer?.name || chat.customer?.whatsapp || 'Sem nome'}
                </span>
                <span className="text-xs text-gray-500 dark:text-gray-400 ml-2 flex-shrink-0">
                  {new Date(chat.last_message?.created_at || chat.created_at).toLocaleTimeString([], { 
                    hour: '2-digit', 
                    minute: '2-digit' 
                  })}
                </span>
              </div>
              
              {chat.last_message && (
                <div className="flex items-center gap-1 mb-1">
                  {chat.last_message.sender_type === 'agent' && getStatusIcon(chat)}
                  <div className="text-sm text-gray-600 dark:text-gray-300 truncate">
                    {chat.last_message.content}
                  </div>
                </div>
              )}
              
              <div className="flex items-center gap-2">
                {getStatusBadge(chat)}
                {chat.last_message?.status && chat.last_message.sender_type === 'agent' && chat.last_message.error_message && (
                  <div className="text-xs text-red-500">
                    {chat.last_message.error_message}
                  </div>
                )}
              </div>
            </div>
          </div>
        </a>
      ))}
    </div>
  );
}