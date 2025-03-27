import React from 'react';
import { AlertCircle } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import * as Tooltip from '@radix-ui/react-tooltip';
import { getChannelIcon } from '../../utils/channel';
import { getRandomColor } from '../../utils/chat';
import { supabase } from '../../lib/supabase';

interface ChatAvatarProps {
  id: string;
  name: string;
  profilePicture?: string | null;
  channel?: {
    type?: string;
    name?: string;
    is_connected?: boolean;
  };
  size?: 'sm' | 'md' | 'lg';
}

export function ChatAvatar({ 
  id, 
  name, 
  profilePicture, 
  channel, 
  size = 'md' 
}: ChatAvatarProps) {
  const { t } = useTranslation('chats');
  const [hasImageError, setHasImageError] = React.useState(false);
  
  const handleImageError = async (chatId: string) => {
    console.log('handleImageError chamado para chatId:', chatId);
    console.log('URL da imagem que falhou:', profilePicture);
    
    if (!chatId) {
      console.error('chatId não fornecido para handleImageError');
      return;
    }

    setHasImageError(true);

    try {
      console.log('Tentando atualizar profile_picture para null no chat:', chatId);
      
      // Atualiza na tabela chats
      const { error: chatError } = await supabase
        .from('chats')
        .update({ profile_picture: null })
        .eq('id', chatId);
      
      if (chatError) {
        console.error('Erro ao atualizar profile picture no chat:', chatError);
      }
    } catch (error) {
      console.error('Erro ao executar handleImageError:', error);
    }
  };
  
  const getInitials = (name: string) => {
    return name
      .split(' ')
      .map(n => n[0])
      .join('')
      .toUpperCase()
      .slice(0, 2);
  };

  const sizeClasses = {
    sm: {
      avatar: 'w-8 h-8',
      channelIcon: 'w-3 h-3',
      channelContainer: 'w-3 h-3',
      alertIcon: 'w-1.5 h-1.5'
    },
    md: {
      avatar: 'w-10 h-10',
      channelIcon: 'w-3 h-3',
      channelContainer: 'w-4 h-4',
      alertIcon: 'w-2 h-2'
    },
    lg: {
      avatar: 'w-12 h-12',
      channelIcon: 'w-4 h-4',
      channelContainer: 'w-5 h-5',
      alertIcon: 'w-2.5 h-2.5'
    }
  };

  return (
    <div className="relative">
      <div className={`flex-shrink-0 ${sizeClasses[size].avatar} rounded-full ${(!profilePicture || hasImageError) ? getRandomColor(name || 'Anônimo') : ''} flex items-center justify-center overflow-hidden`}>
        {profilePicture && !hasImageError ? (
          <img
            src={profilePicture}
            alt={name || 'Anônimo'}
            className="w-full h-full object-cover"
            onError={() => handleImageError(id)}
          />
        ) : (
          <span className="text-white font-medium">
            {getInitials(name || 'Anônimo')}
          </span>
        )}
      </div>
      
      {channel && (
        <div className={`absolute -bottom-1 -right-1 ${sizeClasses[size].channelContainer} rounded-full bg-white dark:bg-gray-800 flex items-center justify-center`}>
          <Tooltip.Provider delayDuration={200}>
            <Tooltip.Root>
              <Tooltip.Trigger asChild>
                <div className="relative w-full h-full flex items-center justify-center">
                  <img
                    src={getChannelIcon(channel.type)}
                    alt={channel.type}
                    className={sizeClasses[size].channelIcon}
                  />
                  {channel.is_connected === false && (
                    <div className="absolute -top-1 -right-1">
                      <AlertCircle className={`${sizeClasses[size].alertIcon} text-red-500 fill-red-500`} />
                    </div>
                  )}
                </div>
              </Tooltip.Trigger>
              <Tooltip.Portal>
                <Tooltip.Content
                  className="px-2 py-1 text-xs rounded bg-gray-900 text-white dark:bg-white dark:text-gray-900"
                  sideOffset={5}
                >
                  {channel.name ? `${channel.name} - ` : ''}
                  {channel.is_connected !== false 
                    ? t('connected') 
                    : t('disconnected')}
                  <Tooltip.Arrow className="fill-gray-900 dark:fill-white" />
                </Tooltip.Content>
              </Tooltip.Portal>
            </Tooltip.Root>
          </Tooltip.Provider>
        </div>
      )}
    </div>
  );
} 