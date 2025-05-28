import React, { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Chat } from '../../types/database';
import { Archive, ArrowLeft } from 'lucide-react';
import { ChatItem } from './ChatItem';
import './styles.css';

interface ChatListProps {
  chats: Chat[];
  selectedChat: string | null;
  onSelectChat: (chatId: string) => void;
  isLoading?: boolean;
  onUpdateChat?: (chatId: string, updates: Partial<Chat>) => void;
  selectedFilter?: string;
}

export function ChatList({ chats, selectedChat, onSelectChat, isLoading = false, onUpdateChat, selectedFilter = 'unassigned' }: ChatListProps) {
  const { t } = useTranslation('chats');
  const [showArchived, setShowArchived] = useState(false);

  // Separar chats arquivados e não arquivados
  const archivedChats = chats.filter(chat => chat.is_archived);
  const activeChats = chats.filter(chat => !chat.is_archived);

  if (isLoading) {
    return (
      <div className="flex-1 overflow-y-auto">
        {[1, 2, 3, 4, 5].map((i) => (
          <div key={i} className="p-4 border-b border-gray-200 dark:border-gray-700 animate-pulse">
            <div className="flex items-start space-x-3">
              <div className="w-10 h-10 bg-gray-200 dark:bg-gray-700 rounded-full" />
              <div className="flex-1">
                <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded w-3/4 mb-2" />
                <div className="h-3 bg-gray-200 dark:bg-gray-700 rounded w-1/2 mb-2" />
                <div className="h-3 bg-gray-200 dark:bg-gray-700 rounded w-1/4" />
              </div>
            </div>
          </div>
        ))}
      </div>
    );
  }

  if (chats.length === 0) {
    return (
      <div className="flex-1 flex items-center justify-center p-4">
        <div className="text-center text-gray-500 dark:text-gray-400">
          <p className="text-lg font-medium mb-2">{t('noChatsFound')}</p>
          <p className="text-sm">{t(`emptyState.description.${selectedFilter}`)}</p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex-1 overflow-y-auto custom-scrollbar"> 
      {!showArchived ? (
        <>
          {archivedChats.length > 0 && (
            <button
              onClick={() => setShowArchived(true)}
              className="w-full p-3 text-left border-b border-gray-200 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-700 flex items-center justify-between"
            >
              <div className="flex items-center gap-2">
                <Archive className="w-4 h-4 text-gray-500 dark:text-gray-400" />
                <span className="text-sm text-gray-600 dark:text-gray-300">
                  {t('archivedChats')}
                </span>
              </div>
              <span className="px-2 py-1 text-xs font-medium rounded-full bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-200">
                {archivedChats.length}
              </span>
            </button>
          )}
          {activeChats.map((chat) => (
            <ChatItem
              key={chat.id}
              chat={chat}
              isSelected={selectedChat === chat.id}
              onSelectChat={onSelectChat}
              onUpdateChat={onUpdateChat}
            />
          ))}
        </>
      ) : (
        <>
          <button
            onClick={() => setShowArchived(false)}
            className="w-full p-3 text-left border-b border-gray-200 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-700 flex items-center gap-2"
          >
            <ArrowLeft className="w-4 h-4 text-gray-500 dark:text-gray-400" />
            <span className="text-sm text-gray-600 dark:text-gray-300">
              {t('backToActiveChats')}
            </span>
          </button>
          {archivedChats.map((chat) => (
            <ChatItem
              key={chat.id}
              chat={chat}
              isSelected={selectedChat === chat.id}
              onSelectChat={onSelectChat}
              onUpdateChat={onUpdateChat}
            />
          ))}
        </>
      )}
    </div>
  );
}