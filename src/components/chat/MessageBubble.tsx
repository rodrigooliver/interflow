import React, { useState } from 'react';
import { MessageStatus } from './MessageStatus';
import { FileText, UserPlus, UserMinus, UserCog, CheckCircle, MessageSquare, MoreVertical, Reply, X } from 'lucide-react';
import { AudioPlayer } from './AudioPlayer';
import { Message } from '../../types/database';
import { useTranslation } from 'react-i18next';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "../../components/ui/dropdown-menu";

interface MessageBubbleProps {
  message: Message & {
    sender_agent: {
      id: string;
      full_name: string;
    } | null;
    response_to?: Message | null;
  };
  chatStatus: string;
  onReply?: (message: Message) => void;
}

export function MessageBubble({ message, chatStatus, onReply }: MessageBubbleProps) {
  const { t } = useTranslation('chats');
  const [imageModalOpen, setImageModalOpen] = useState(false);
  const [selectedImage, setSelectedImage] = useState<{ url: string; name: string } | null>(null);
  const {
    content,
    created_at,
    sender_type,
    status,
    error_message,
    attachments,
    type,
    sender_agent,
    response_to
  } = message;
  
  const isAgent = sender_type === 'agent';
  const isSystem = sender_type === 'system';
  const isCustomer = sender_type === 'customer';

  const handleReply = () => {
    if (onReply) {
      onReply(message);
    }
  };

  // Função para renderizar ícone do sistema
  const renderSystemIcon = () => {
    switch (type) {
      case 'user_start':
        return <MessageSquare className="w-4 h-4" />;
      case 'user_entered':
        return <UserPlus className="w-4 h-4" />;
      case 'user_left':
        return <UserMinus className="w-4 h-4" />;
      case 'user_transferred':
        return <UserCog className="w-4 h-4" />;
      case 'user_closed':
        return <CheckCircle className="w-4 h-4" />;
      default:
        return null;
    }
  };

  // Função para obter a mensagem do sistema
  const getSystemMessage = () => {
    const agentName = sender_agent?.full_name || t('unnamed');
    
    switch (type) {
      case 'user_start':
        return t('systemMessages.userStart', { name: agentName });
      case 'user_entered':
        return t('systemMessages.userEntered', { name: agentName });
      case 'user_left':
        return t('systemMessages.userLeft', { name: agentName });
      case 'user_transferred':
        return t('systemMessages.userTransferred', { name: agentName });
      case 'user_closed':
        return t('systemMessages.userClosed', { name: agentName });
      default:
        return content;
    }
  };

  // Se for mensagem do sistema, renderiza um layout diferente
  if (isSystem) {
    return (
      <div className="flex justify-center my-2 relative group">
        <div className="flex items-center space-x-2 bg-gray-100 dark:bg-gray-800 rounded-full px-4 py-2 text-sm text-gray-600 dark:text-gray-300">
          {renderSystemIcon()}
          <span>{getSystemMessage()}</span>
          <span className="text-xs text-gray-500">
            {new Date(created_at).toLocaleTimeString([], { 
              hour: '2-digit', 
              minute: '2-digit' 
            })}
          </span>
          {chatStatus === 'in_progress' && (
            <div className="absolute right-0 top-0 mr-1 opacity-0 group-hover:opacity-100 transition-opacity">
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <button className="p-1 hover:bg-gray-100 dark:hover:bg-gray-700 rounded">
                    <MoreVertical className="w-4 h-4 text-gray-500 dark:text-gray-400" />
                  </button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end">
                  <DropdownMenuItem onClick={handleReply}>
                    <Reply className="w-4 h-4 mr-2" />
                    {t('actions.reply')}
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </div>
          )}
        </div>
      </div>
    );
  }

  const formatMessageContent = (content: string) => {
    let formatted = content;
    formatted = formatted.replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>');
    formatted = formatted.replace(/_(.*?)_/g, '<em>$1</em>');
    formatted = formatted.replace(/\n/g, '<br>');
    return formatted;
  };

  const renderAttachment = (attachment: { url: string; type: string; name: string }) => {
    if (attachment.type.startsWith('image') || attachment.type.startsWith('image/')) {
      return (
        <div className="mt-2">
          <div 
            onClick={() => {
              setSelectedImage(attachment);
              setImageModalOpen(true);
            }}
            className="cursor-pointer hover:opacity-90 transition-opacity"
          >
            <img
              src={attachment.url}
              alt={attachment.name}
              className="max-w-full rounded-lg h-[200px] object-contain"
            />
          </div>
        </div>
      );
    }

    if (attachment.type.startsWith('audio') || attachment.type.startsWith('audio/')) {
      return (
        <div className="bg-gray-200 dark:bg-gray-800/50 rounded-full p-2">
          <AudioPlayer
            src={attachment.url}
            fileName={attachment.name}
          />
        </div>
      );
    }

    return (
      <div className="mt-2">
        <a
          href={attachment.url}
          target="_blank"
          rel="noopener noreferrer"
          className="flex items-center space-x-2 bg-gray-100 dark:bg-gray-700/50 rounded-lg p-2 hover:bg-gray-200 dark:hover:bg-gray-700 transition-colors"
        >
          <FileText className="w-4 h-4 text-gray-500 dark:text-gray-400" />
          <span className="text-sm text-gray-700 dark:text-gray-300 truncate max-w-[250px]">
            {attachment.name}
          </span>
        </a>
      </div>
    );
  };

  return (
    <>
      <div 
        id={`message-${message.id}`}
        className={`flex ${isAgent ? 'justify-end' : 'justify-start'} group relative`}
        onDoubleClick={handleReply}
      >
        <div
          className={`max-w-[85%] rounded-lg p-3 relative ${
            isAgent
              ? 'bg-blue-600 text-white'
              : 'bg-gray-100 dark:bg-gray-700 text-gray-900 dark:text-white'
          }`}
        >
          {message.response_to && (
            <button 
              onClick={() => {
                // Encontrar e rolar até a mensagem original
                const element = document.getElementById(`message-${message.response_to?.id}`);
                element?.scrollIntoView({ behavior: 'smooth', block: 'center' });
                // Adicionar um highlight temporário
                element?.classList.add('highlight-message');
                setTimeout(() => element?.classList.remove('highlight-message'), 2000);
              }}
              className={`
                mb-2 text-sm rounded-md p-2 w-full max-w-[400px] min-w-[150px] text-left
                hover:opacity-90 transition-opacity cursor-pointer
                ${isAgent 
                  ? 'bg-blue-700/60 text-blue-100' 
                  : 'bg-gray-200 dark:bg-gray-600 text-gray-700 dark:text-gray-300'
                }
              `}
            >
              <div className="font-medium flex items-center gap-1">
                <span className="text-xs px-2 py-0.5 rounded bg-opacity-20 bg-white ">
                  {message.response_to.sender_type === 'agent' ? t('you') : t('customer')}:
                </span>
              </div>
              <div className="truncate mt-1">
                {message.response_to.content}
              </div>
            </button>
          )}
          
          {/* Dropdown Menu */}
          {chatStatus === 'in_progress' && (
            <div className={`absolute top-0 opacity-0 group-hover:opacity-100 transition-opacity ${
              isCustomer ? 'right-0 mr-1 mt-1' : 'right-0 mr-1 mt-1'
            }`}>
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <button className="p-1 hover:bg-gray-100 dark:hover:bg-gray-700 rounded">
                    <MoreVertical className="w-4 h-4 text-gray-500 dark:text-gray-400" />
                  </button>
                </DropdownMenuTrigger>
                <DropdownMenuContent 
                  side={isCustomer ? "right" : "left"}
                >
                  <DropdownMenuItem onClick={handleReply}>
                    <Reply className="w-4 h-4 mr-2" />
                    {t('actions.reply')}
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </div>
          )}

          <div className="flex flex-col gap-3">
            {attachments?.map((attachment, index) => (
              <div key={index}>
                {renderAttachment(attachment)}
              </div>
            ))}

            {/* Existing message content */}
            {content && (
              <div
                dangerouslySetInnerHTML={{
                  __html: formatMessageContent(content)
                }}
                className="whitespace-pre-wrap"
              />
            )}
          </div>

          

          <div className={`flex items-center justify-end space-x-1 text-xs mt-1 ${
            isAgent
              ? 'text-blue-100'
              : 'text-gray-500 dark:text-gray-400'
          }`}>
            <span>{new Date(created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
            {isAgent && status && (
              <MessageStatus 
                status={status} 
                errorMessage={error_message}
              />
            )}
          </div>
        </div>
      </div>

      {/* Modal de imagem */}
      {imageModalOpen && selectedImage && (
        <div 
          className="fixed inset-0 bg-black bg-opacity-80 z-50 flex items-center justify-center p-4"
          onClick={() => setImageModalOpen(false)}
        >
          <div className="relative max-w-[90vw] max-h-[90vh]">
            <button 
              className="absolute top-2 right-2 bg-black bg-opacity-50 text-white p-2 rounded-full hover:bg-opacity-70 transition-opacity"
              onClick={(e) => {
                e.stopPropagation();
                setImageModalOpen(false);
              }}
            >
              <X className="w-5 h-5" />
            </button>
            <img 
              src={selectedImage.url} 
              alt={selectedImage.name} 
              className="max-w-full max-h-[85vh] object-contain"
            />
            <div className="text-white text-center mt-2">{selectedImage.name}</div>
          </div>
        </div>
      )}
    </>
  );
}