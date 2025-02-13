import React from 'react';
import { formatDistanceToNow } from 'date-fns';
import { ptBR, enUS, es } from 'date-fns/locale';
import { useTranslation } from 'react-i18next';
import { AlertCircle, Clock, Check, CheckCheck } from 'lucide-react';

const locales = {
  pt: ptBR,
  en: enUS,
  es: es
};

interface Chat {
  id: string;
  customer_id: string;
  status: string;
  channel: string;
  assigned_to: string | null;
  team_id: string | null;
  last_message_at: string;
  customer: {
    name: string;
    email: string | null;
    whatsapp: string | null;
  };
  isSelected?: boolean;
  last_message?: {
    status: 'pending' | 'sent' | 'delivered' | 'read' | 'failed';
    error_message?: string;
  };
}

interface ChatListProps {
  chats: Chat[];
}

export function ChatList({ chats }: ChatListProps) {
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
            title={t('messageStatus.pending')}
          />
        );
      case 'sent':
        return (
          <Check 
            className="w-4 h-4 text-gray-500 dark:text-gray-400" 
            title={t('messageStatus.sent')}
          />
        );
      case 'delivered':
        return (
          <CheckCheck 
            className="w-4 h-4 text-gray-500 dark:text-gray-400" 
            title={t('messageStatus.delivered')}
          />
        );
      case 'read':
        return (
          <CheckCheck 
            className="w-4 h-4 text-blue-500 dark:text-blue-400" 
            title={t('messageStatus.read')}
          />
        );
      case 'failed':
        return (
          <AlertCircle 
            className="w-4 h-4 text-red-500 dark:text-red-400" 
            title={chat.last_message.error_message || t('messageStatus.failed')}
          />
        );
      default:
        return null;
    }
  };

  return (
    <div className="divide-y divide-gray-200 dark:divide-gray-700">
      {chats.map((chat) => (
        <a
          key={chat.id}
          href={`/chats/${chat.id}`}
          data-chat-id={chat.id}
          className={`block p-4 transition-colors ${
            chat.isSelected 
              ? 'bg-blue-50 dark:bg-blue-900/50'
              : 'hover:bg-gray-50 dark:hover:bg-gray-700/50'
          }`}
        >
          <div className="flex items-start space-x-3">
            <div className={`flex-shrink-0 w-10 h-10 rounded-full ${getRandomColor(chat.customer.name)} flex items-center justify-center text-white font-medium`}>
              {getInitials(chat.customer.name)}
            </div>
            <div className="flex-1 min-w-0">
              <div className="flex justify-between items-center">
                <h4 className="text-sm font-medium text-gray-900 dark:text-white truncate">
                  {chat.customer.name}
                </h4>
                <div className="flex items-center space-x-2">
                  {getStatusIcon(chat)}
                  <span className="text-xs text-gray-500 dark:text-gray-400 whitespace-nowrap">
                    {formatLastMessageTime(chat.last_message_at)}
                  </span>
                </div>
              </div>
              <p className="text-sm text-gray-500 dark:text-gray-400 truncate">
                {chat.customer.email || chat.customer.whatsapp}
              </p>
              <div className="mt-1">
                <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${
                  chat.status === 'open'
                    ? 'bg-green-100 text-green-800 dark:bg-green-900/50 dark:text-green-400'
                    : 'bg-gray-100 text-gray-800 dark:bg-gray-900/50 dark:text-gray-400'
                }`}>
                  {t(`status.${chat.status}`)}
                </span>
              </div>
            </div>
          </div>
        </a>
      ))}
    </div>
  );
}