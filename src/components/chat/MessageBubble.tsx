import React, { useState } from 'react';
import { MessageStatus } from './MessageStatus';
import { FileText, UserPlus, UserMinus, UserCog, CheckCircle, MessageSquare, MoreVertical, Reply, X, Info, ChevronRight, ChevronDown, Trash2, Loader2, RefreshCw, Menu, Ban, Users, ExternalLink, CheckSquare } from 'lucide-react';
import { AudioPlayer } from './AudioPlayer';
import { Message } from '../../types/database';
import { useTranslation } from 'react-i18next';
import { MarkdownRenderer } from '../ui/MarkdownRenderer';
import './styles.css';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "../../components/ui/DropdownMenu";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription
} from "../../components/ui/Dialog";
import { Button } from "../../components/ui/Button";
import { TaskModal } from '../tasks/TaskModal';
import { useAuthContext } from '../../contexts/AuthContext';
// Interface para configurações de funcionalidades por canal
interface ChannelFeatures {
  canReplyToMessages: boolean;
  canSendAudio: boolean;
  canSendTemplates: boolean;
  has24HourWindow: boolean;
  canSendAfter24Hours: boolean;
  canDeleteMessages: boolean;
}

// Interfaces para o formato de lista do WhatsApp
interface WhatsAppListRow {
  title: string;
  description: string;
}

interface WhatsAppListSection {
  title: string;
  rows: WhatsAppListRow[];
}

interface WhatsAppList {
  title: string;
  description: string;
  buttonText: string;
  sections: WhatsAppListSection[];
}

interface MessageBubbleProps {
  message: Message
  chatStatus: string;
  onReply?: (message: Message) => void;
  isHighlighted?: boolean;
  channelFeatures?: ChannelFeatures;
  onDeleteMessage?: (message: Message) => void;
  isPending?: boolean;
  onRetry?: (message: Message) => void;
}

export function MessageBubble({ 
  message, 
  chatStatus, 
  onReply, 
  isHighlighted = false,
  channelFeatures = {
    canReplyToMessages: true,
    canSendAudio: false,
    canSendTemplates: false,
    has24HourWindow: false,
    canSendAfter24Hours: true,
    canDeleteMessages: false
  },
  onDeleteMessage,
  isPending = false,
  onRetry
}: MessageBubbleProps) {
  const { t } = useTranslation('chats');
  const { currentOrganizationMember } = useAuthContext();
  const [imageModalOpen, setImageModalOpen] = useState(false);
  const [selectedImage, setSelectedImage] = useState<{ url: string; name: string } | null>(null);
  const [detailsModalOpen, setDetailsModalOpen] = useState(false);
  const [expandedMetadataKeys, setExpandedMetadataKeys] = useState<string[]>([]);
  const [isDeleting, setIsDeleting] = useState(false);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [taskModalOpen, setTaskModalOpen] = useState(false);
  const {
    content,
    created_at,
    sender_type,
    status,
    error_message,
    attachments,
    type,
    sender_agent,
    metadata
  } = message;
  
  // Verificar se existe uma lista no metadata
  const whatsappList = metadata?.list as WhatsAppList | undefined;
  
  // Extrair reações se existirem no metadata
  const reactions = metadata?.reactions || {};
  const hasReactions = Object.keys(reactions).length > 0;
  
  // Se a mensagem tiver status 'deleted', mostrar um formato especial
  if (status === 'deleted') {
    const isAgent = sender_type === 'agent';
    return (
      <div className={`flex ${isAgent ? 'justify-end' : 'justify-start'} group relative w-full ${isHighlighted ? 'highlighted-message' : ''}`}>
        <div 
          className={`max-w-[85%] md:max-w-[75%] lg:max-w-[65%] rounded-lg p-3 relative ${
            isAgent
              ? 'bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-300'
              : 'bg-gray-100 dark:bg-gray-800/50 text-gray-500 dark:text-gray-400'
          } italic`}
        >
          <div className="flex items-center gap-2">
            <Ban className="w-4 h-4" />
            <span>{t('messageStatus.deleted')}</span>
          </div>
          <div className={`flex items-center justify-end space-x-1 text-xs mt-1 ${
            isAgent
              ? 'text-blue-500 dark:text-blue-400'
              : 'text-gray-500 dark:text-gray-400'
          }`}>
            <span>{new Date(created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
          </div>
        </div>
      </div>
    );
  }
  
  // Se a mensagem for uma resposta a uma mensagem que foi apagada, precisamos verificar
  if (message.response_to && message.response_to.status === 'deleted') {
    // Remover a referência à mensagem deletada
    message.response_to = undefined;
  }
  
  const isAgent = sender_type === 'agent';
  const isSystem = sender_type === 'system';
  const isCustomer = sender_type === 'customer';

  const handleReply = () => {
    if (onReply) {
      onReply(message);
    }
  };

  // Função para verificar se a mensagem tem menos de 48 horas
  const canDeleteMessage = () => {
    if (!created_at) return false;
    
    // Mensagens pendentes podem ser excluídas a qualquer momento
    if (isPending) return true;
    
    const messageDate = new Date(created_at);
    const now = new Date();
    const diffHours = (now.getTime() - messageDate.getTime()) / (1000 * 60 * 60);
    
    return diffHours <= 48;
  };
  
  // Verificação combinada para habilitar exclusão
  const isDeletionAllowed = channelFeatures.canDeleteMessages && onDeleteMessage && canDeleteMessage() && isAgent;
  
  const handleDelete = async () => {
    if (!onDeleteMessage || !canDeleteMessage()) return;
    
    setIsDeleting(true);
    setError(null);
    
    try {
      await onDeleteMessage(message);
      setShowDeleteModal(false);
    } catch (err) {
      setError(t("errors.deleteMessage"));
      console.error("Erro ao excluir mensagem:", err);
      // Não fechar o modal em caso de erro
    } finally {
      setIsDeleting(false);
    }
  };

  // Função para formatar data e hora
  const formatDateTime = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleString();
  };

  // Função para renderizar o valor do metadata de forma amigável
  const renderMetadataValue = (value: unknown, depth = 0, path = ''): React.ReactNode => {
    if (value === null) return <span className="text-gray-500 dark:text-gray-400">null</span>;
    if (value === undefined) return <span className="text-gray-500 dark:text-gray-400">undefined</span>;
    
    if (typeof value === 'object') {
      if (Array.isArray(value)) {
        if (value.length === 0) return <span className="text-gray-500 dark:text-gray-400">[]</span>;
        
        const isExpanded = expandedMetadataKeys.includes(path);
        
        return (
          <div className="ml-4">
            <div 
              className="flex items-center cursor-pointer" 
              onClick={() => toggleMetadataExpand(path)}
            >
              {isExpanded ? 
                <ChevronDown className="w-4 h-4 mr-1 text-gray-500 dark:text-gray-400" /> : 
                <ChevronRight className="w-4 h-4 mr-1 text-gray-500 dark:text-gray-400" />
              }
              <span className="text-blue-600 dark:text-blue-400">Array[{value.length}]</span>
            </div>
            
            {isExpanded && (
              <div className="ml-4 border-l-2 border-gray-300 dark:border-gray-600 pl-2">
                {value.map((item, index) => (
                  <div key={index} className="my-1">
                    <span className="text-gray-600 dark:text-gray-300">{index}: </span>
                    {renderMetadataValue(item, depth + 1, `${path}.${index}`)}
                  </div>
                ))}
              </div>
            )}
          </div>
        );
      } else {
        const entries = Object.entries(value);
        if (entries.length === 0) return <span className="text-gray-500 dark:text-gray-400">{"{}"}</span>;
        
        const isExpanded = expandedMetadataKeys.includes(path);
        
        return (
          <div className="ml-4">
            <div 
              className="flex items-center cursor-pointer" 
              onClick={() => toggleMetadataExpand(path)}
            >
              {isExpanded ? 
                <ChevronDown className="w-4 h-4 mr-1 text-gray-500 dark:text-gray-400" /> : 
                <ChevronRight className="w-4 h-4 mr-1 text-gray-500 dark:text-gray-400" />
              }
              <span className="text-blue-600 dark:text-blue-400">Object{`{${entries.length}}`}</span>
            </div>
            
            {isExpanded && (
              <div className="ml-4 border-l-2 border-gray-300 dark:border-gray-600 pl-2">
                {entries.map(([key, val]) => (
                  <div key={key} className="my-1">
                    <span className="text-gray-600 dark:text-gray-300">{key}: </span>
                    {renderMetadataValue(val, depth + 1, `${path}.${key}`)}
                  </div>
                ))}
              </div>
            )}
          </div>
        );
      }
    }
    
    if (typeof value === 'string') {
      // Verificar se é uma URL
      if (/^https?:\/\//.test(value)) {
        return (
          <a 
            href={value} 
            target="_blank" 
            rel="noopener noreferrer"
            className="text-blue-500 dark:text-blue-400 underline hover:opacity-80 break-all"
          >
            {value}
          </a>
        );
      }
      
      // Verificar se é uma data ISO
      if (/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}/.test(value)) {
        const date = new Date(value);
        if (!isNaN(date.getTime())) {
          return <span className="text-green-600 dark:text-green-400">{date.toLocaleString()}</span>;
        }
      }
      
      return <span className="text-green-600 dark:text-green-400">"{value}"</span>;
    }
    
    if (typeof value === 'number') {
      return <span className="text-purple-600 dark:text-purple-400">{value}</span>;
    }
    
    if (typeof value === 'boolean') {
      return <span className="text-orange-600 dark:text-orange-400">{value.toString()}</span>;
    }
    
    return <span>{String(value)}</span>;
  };

  // Função para alternar a expansão de um nó do metadata
  const toggleMetadataExpand = (path: string) => {
    setExpandedMetadataKeys(prev => 
      prev.includes(path) 
        ? prev.filter(key => key !== path)
        : [...prev, path]
    );
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
      case 'user_transferred_himself':
        return <UserCog className="w-4 h-4" />;
      case 'team_transferred':
        return <Users className="w-4 h-4" />;
      case 'user_join':
        return <UserPlus className="w-4 h-4" />;
      case 'user_closed':
        return <CheckCircle className="w-4 h-4" />;
      case 'task':
        return <CheckSquare className="w-4 h-4" />;
      default:
        return null;
    }
  };

  // Função para obter a mensagem do sistema
  const getSystemMessage = (): string => {
    const agentName = sender_agent?.full_name || t('unnamed');
    
    switch (type) {
      case 'user_start':
        return t('systemMessages.userStart', { name: agentName });
      case 'user_entered':
        return t('systemMessages.userEntered', { name: agentName });
      case 'user_left':
        return t('systemMessages.userLeft', { name: agentName });
      case 'user_transferred':
        return t('systemMessages.userTransfer', { name: agentName });
      case 'user_transferred_himself':
        return t('systemMessages.userTransferredHimself', { name: agentName });
      case 'team_transferred':
        return t('systemMessages.teamTransferred', { name: content });
      case 'user_join':
        return t('systemMessages.userJoin', { name: agentName });
      case 'user_closed':
        return t('systemMessages.userClosed', { name: agentName });
      case 'task':
        // No caso de mensagem de tarefa, vamos retornar somente o texto inicial
        if (metadata?.task_id) {
          const taskTitle = metadata.task_title as string || t('systemMessages.taskUnknown', 'tarefa');
          
          return `${taskTitle}`;
        }
        return content || '';
      default:
        return content || '';
    }
  };

  // Função para renderizar anexos
  const renderAttachment = (attachment: { url: string; type: string; name: string }) => {
    if (attachment.type.startsWith('image') || attachment.type.startsWith('image/')) {
      return (
        <div className="mt-2 max-w-full">
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
              className="max-w-full w-auto rounded-lg h-[200px] object-contain"
            />
          </div>
        </div>
      );
    }

    if (attachment.type.startsWith('audio') || attachment.type.startsWith('audio/')) {
      return (
        <div className="w-[300px]">
          <div className="bg-gray-200 dark:bg-gray-800/50 rounded-full p-2">
            <AudioPlayer
              src={attachment.url}
              fileName={attachment.name}
            />
          </div>
          {content && (
            <div className="mt-2">
              <span className="text-xs font-medium text-gray-500 dark:text-gray-400">
                {t('voice.transcription')}:
              </span>
              <div className="mt-1 text-sm">
                {content}
              </div>
            </div>
          )}
        </div>
      );
    }

    return (
      <div className="mt-2 max-w-full">
        <a
          href={attachment.url}
          target="_blank"
          rel="noopener noreferrer"
          className="flex items-center space-x-2 bg-gray-100 dark:bg-gray-700/50 rounded-lg p-2 hover:bg-gray-200 dark:hover:bg-gray-700 transition-colors overflow-hidden max-w-[200px] md:max-w-[300px]"
        >
          <FileText className="w-4 h-4 flex-shrink-0 text-gray-500 dark:text-gray-400" />
          <span className="text-sm text-gray-700 dark:text-gray-300 truncate flex-1 min-w-0">
            {attachment.name}
          </span>
        </a>
      </div>
    );
  };

  // Renderização condicional baseada no tipo de mensagem
  let messageContent;
  
  if (isSystem) {
    messageContent = (
      <div className="flex justify-center my-2 relative group">
        <div className={`flex items-center flex-row gap-2 bg-gray-100 dark:bg-gray-800 rounded-full px-4 py-2 text-sm text-gray-600 dark:text-gray-300 ${
          isHighlighted ? 'ring-2 ring-blue-500 dark:ring-blue-400 animate-pulse' : ''
        } ${isPending ? 'opacity-70' : ''}`}>
          {renderSystemIcon()}
          <span className=''>{getSystemMessage()}</span>
          {/* Botão para abrir o modal da tarefa */}
          {type === 'task' && metadata && 'task_id' in metadata && metadata.task_id && (
            <button 
              onClick={(e) => {
                e.stopPropagation();
                setTaskModalOpen(true);
              }}
              className="text-blue-600 dark:text-blue-400 hover:underline inline-flex items-center"
            >
              <ExternalLink className="w-3 h-3 ml-0.5" />
            </button>
          )}
          <span className="text-xs text-gray-500">
            {new Date(created_at).toLocaleTimeString([], { 
              hour: '2-digit', 
              minute: '2-digit' 
            })}
          </span>
          {isPending && (
            <div className="absolute -top-6 right-2 bg-yellow-100 dark:bg-yellow-900 text-yellow-800 dark:text-yellow-200 text-xs px-3 py-1 rounded-full flex items-center z-10 shadow-md animate-pulse border border-yellow-300 dark:border-yellow-700">
              <Loader2 className="w-3 h-3 mr-1.5 animate-spin" />
              <span className="font-medium">{t('messageStatus.sending')}</span>
              {isDeletionAllowed && (
                <button 
                  onClick={(e) => {
                    e.stopPropagation();
                    setShowDeleteModal(true);
                  }}
                  className="ml-2 px-2 py-0.5 bg-red-500 hover:bg-red-600 text-white rounded text-xs flex items-center whitespace-nowrap"
                >
                  <Trash2 className="w-3 h-3 mr-1" />
                  {t('actions.delete')}
                </button>
              )}
            </div>
          )}
          <div className="absolute right-0 top-0 mr-1 opacity-0 group-hover:opacity-100 transition-opacity">
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <button className="p-1 hover:bg-gray-100 dark:hover:bg-gray-700 rounded">
                  <MoreVertical className="w-4 h-4 text-gray-500 dark:text-gray-400" />
                </button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                {chatStatus === 'in_progress' && channelFeatures.canReplyToMessages && onReply && (
                  <DropdownMenuItem onClick={handleReply}>
                    <Reply className="w-4 h-4 mr-2" />
                    {t('actions.reply')}
                  </DropdownMenuItem>
                )}
                {isDeletionAllowed && (
                  <DropdownMenuItem 
                    onClick={() => setShowDeleteModal(true)}
                    className="text-destructive focus:text-destructive"
                  >
                    <Trash2 className="mr-2 h-4 w-4" />
                    {t('actions.delete')}
                  </DropdownMenuItem>
                )}
                <DropdownMenuItem onClick={() => setDetailsModalOpen(true)}>
                  <Info className="w-4 h-4 mr-2" />
                  {t('actions.details')}
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </div>
      </div>
    );
  } else {
    messageContent = (
      <div 
        id={`message-${message.id}`}
        className={`flex ${isAgent ? 'justify-end' : 'justify-start'} group relative w-full ${isHighlighted ? 'highlighted-message' : ''}  ${hasReactions ? 'mb-3' : ''}`}
        onDoubleClick={handleReply}
      >
        <div
          className={`max-w-[85%] md:max-w-[75%] lg:max-w-[65%] rounded-lg p-3 relative ${
            isAgent
              ? 'bg-blue-600 text-gray-300'
              : 'bg-gray-100 dark:bg-gray-700 text-gray-900 dark:text-white'
          } ${isPending ? 'opacity-80 border-2 border-dashed border-yellow-300 dark:border-yellow-500 animate-pulse' : ''}`}
        >
          {isPending && (
            <div className="absolute -top-6 right-2 bg-yellow-100 dark:bg-yellow-900 text-yellow-800 dark:text-yellow-200 text-xs px-3 py-1 rounded-full flex items-center z-10 shadow-md animate-pulse border border-yellow-300 dark:border-yellow-700">
              <Loader2 className="w-3 h-3 mr-1.5 animate-spin" />
              <span className="font-medium">{t('messageStatus.sending')}</span>
              {isDeletionAllowed && (
                <button 
                  onClick={(e) => {
                    e.stopPropagation();
                    setShowDeleteModal(true);
                  }}
                  className="ml-2 px-2 py-0.5 bg-red-500 hover:bg-red-600 text-white rounded text-xs flex items-center whitespace-nowrap"
                >
                  <Trash2 className="w-3 h-3 mr-1" />
                  {t('actions.delete')}
                </button>
              )}
            </div>
          )}
          {message.response_to && (
            <button 
              onClick={() => {
                // Encontrar e rolar até a mensagem original
                const element = document.getElementById(`message-${message.response_to?.id}`);
                element?.scrollIntoView({ behavior: 'auto', block: 'center' });
                // Adicionar um highlight temporário
                element?.classList.add('highlight-message');
                setTimeout(() => element?.classList.remove('highlight-message'), 2000);
              }}
              className={`
                mb-2 text-sm rounded-md p-2 w-full max-w-full text-left
                hover:opacity-90 transition-opacity cursor-pointer
                overflow-hidden break-words
                ${isAgent 
                  ? 'bg-blue-900/60 text-blue-100' 
                  : 'bg-gray-200 dark:bg-gray-600 text-gray-700 dark:text-gray-300'
                }
              `}
            >
              <div className="font-medium flex items-center gap-1">
                <span className="text-xs px-2 py-0.5 rounded bg-opacity-20 bg-white ">
                  {message.response_to.sender_type === 'agent' ? t('you') : t('customer')}:
                </span>
              </div>
              <div className="mt-1 break-words overflow-hidden line-clamp-2 text-ellipsis max-w-[400px] max-h-[35px] overflow-x-hidden">
                {message.response_to.content ? <MarkdownRenderer content={message.response_to.content}  /> : message.response_to.content}
              </div>
            </button>
          )}
          
          {/* Dropdown Menu */}
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
                {chatStatus === 'in_progress' && channelFeatures.canReplyToMessages && onReply && (
                  <DropdownMenuItem onClick={handleReply}>
                    <Reply className="w-4 h-4 mr-2" />
                    {t('actions.reply')}
                  </DropdownMenuItem>
                )}
                <DropdownMenuItem onClick={() => setDetailsModalOpen(true)}>
                  <Info className="w-4 h-4 mr-2" />
                  {t('actions.details')}
                </DropdownMenuItem>
                {isDeletionAllowed && (
                  <DropdownMenuItem 
                    onClick={() => setShowDeleteModal(true)}
                    className="text-destructive focus:text-destructive"
                  >
                    <Trash2 className="mr-2 h-4 w-4" />
                    {t('actions.delete')}
                  </DropdownMenuItem>
                )}
              </DropdownMenuContent>
            </DropdownMenu>
          </div>

          <div className="flex flex-col gap-3">
            {attachments?.map((attachment, index) => (
              <div key={index} className="max-w-full overflow-hidden">
                {renderAttachment(attachment)}
              </div>
            ))}

            {/* Renderizar a lista do WhatsApp se estiver presente no metadata */}
            {whatsappList && (
              <WhatsappList list={whatsappList} />
            )}

            {/* Existing message content - não exibir quando tiver lista */}
            {content && !whatsappList && !attachments?.some(attachment => 
              attachment.type.startsWith('audio') || attachment.type.startsWith('audio/')
            ) && (
              <MarkdownRenderer content={content} />
            )}
          </div>

          <div className={`flex items-center justify-end space-x-1 text-xs mt-1 -mb-1.5 -mr-1 ${
            isAgent
              ? 'text-gray-400 dark:text-gray-400'
              : 'text-gray-500 dark:text-gray-400'
          }`}>
            {metadata?.edited === true && (
              <span className="italic">{t('messageStatus.edited')}</span>
            )}
            <span>{new Date(created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
            {isAgent && status && (
              <>
                <MessageStatus 
                  status={status} 
                  errorMessage={error_message}
                />
                {status === 'failed' && onRetry && (
                  <div className="flex items-center gap-1">
                    <button 
                      onClick={(e) => {
                        e.stopPropagation();
                        onRetry(message);
                      }}
                      className="ml-2 px-2 py-0.5 bg-yellow-500 hover:bg-yellow-600 text-white rounded text-xs flex items-center whitespace-nowrap"
                    >
                      <RefreshCw className="w-3 h-3 mr-1" />
                      {t('actions.retry')}
                    </button>
                    {isDeletionAllowed && (
                      <button 
                        onClick={(e) => {
                          e.stopPropagation();
                          setShowDeleteModal(true);
                        }}
                        className="px-2 py-0.5 bg-red-500 hover:bg-red-600 text-white rounded text-xs flex items-center whitespace-nowrap"
                      >
                        <Trash2 className="w-3 h-3 mr-1" />
                        {t('actions.delete')}
                      </button>
                    )}
                  </div>
                )}
              </>
            )}
          </div>
          
          {/* Exibir as reações */}
          {hasReactions && (
            <div className="absolute -bottom-4 right-4 flex flex-row gap-1 z-10">
              {Object.entries(reactions).map(([senderId, reaction], index) => (
                <div 
                  key={`${senderId}-${index}`} 
                  className="text-xs leading-none bg-white dark:bg-gray-800 rounded-full pt-1 pb-0.5 px-2 shadow-sm border border-gray-100 dark:border-gray-700"
                >
                  {reaction.reaction}
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    );
  }

  return (
    <>
      {messageContent}

      {/* Modal de imagem - compartilhado */}
      {imageModalOpen && selectedImage && (
        <div 
          className="fixed inset-0 bg-black bg-opacity-80 z-50 flex items-center justify-center p-4 overflow-y-auto"
          onClick={() => setImageModalOpen(false)}
        >
          <div className="relative max-w-[90vw] max-h-[90vh] overflow-auto">
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

      {/* Modal de detalhes da mensagem - compartilhado */}
      <Dialog open={detailsModalOpen} onOpenChange={setDetailsModalOpen}>
        <DialogContent className="sm:max-w-md bg-white dark:bg-gray-800 dark:text-gray-100">
          <DialogHeader>
            <DialogTitle className="text-gray-900 dark:text-gray-100">{t('messageDetails.title')}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 max-h-[70vh] overflow-y-auto">
            <div className="grid grid-cols-2 gap-2 text-sm">
              <div className="font-semibold text-gray-700 dark:text-gray-300">{t('messageDetails.id')}:</div>
              <div className="break-all text-gray-900 dark:text-gray-100">{message.id}</div>
              
              <div className="font-semibold text-gray-700 dark:text-gray-300">{t('messageDetails.type')}:</div>
              <div className="text-gray-900 dark:text-gray-100">{message.type}</div>
              
              <div className="font-semibold text-gray-700 dark:text-gray-300">{t('messageDetails.senderType')}:</div>
              <div className="text-gray-900 dark:text-gray-100">{message.sender_type}</div>
              
              <div className="font-semibold text-gray-700 dark:text-gray-300">{t('messageDetails.status')}:</div>
              <div className="text-gray-900 dark:text-gray-100">{message.status || '-'}</div>
              
              <div className="font-semibold text-gray-700 dark:text-gray-300">{t('messageDetails.createdAt')}:</div>
              <div className="text-gray-900 dark:text-gray-100">{formatDateTime(message.created_at)}</div>
              
              {message.sender_agent && (
                <>
                  <div className="font-semibold text-gray-700 dark:text-gray-300">{t('messageDetails.sentBy')}:</div>
                  <div className="text-gray-900 dark:text-gray-100">{message.sender_agent.full_name}</div>
                </>
              )}
              
              {message.external_id && (
                <>
                  <div className="font-semibold text-gray-700 dark:text-gray-300">{t('messageDetails.externalId')}:</div>
                  <div className="break-all text-gray-900 dark:text-gray-100">{message.external_id}</div>
                </>
              )}
              
              {message.session_id && (
                <>
                  <div className="font-semibold text-gray-700 dark:text-gray-300">{t('messageDetails.sessionId')}:</div>
                  <div className="break-all text-gray-900 dark:text-gray-100">{message.session_id}</div>
                </>
              )}
              
              {message.response_message_id && (
                <>
                  <div className="font-semibold text-gray-700 dark:text-gray-300">{t('messageDetails.responseMessageId')}:</div>
                  <div className="break-all text-gray-900 dark:text-gray-100">{message.response_message_id}</div>
                </>
              )}
              
              {message.error_message && (
                <>
                  <div className="font-semibold text-gray-700 dark:text-gray-300">{t('messageDetails.errorMessage')}:</div>
                  <div className="text-red-500 dark:text-red-400">{message.error_message}</div>
                </>
              )}
            </div>
            
            {message.content && (
              <div className="space-y-1">
                <div className="font-semibold text-gray-700 dark:text-gray-300">{t('messageDetails.content')}:</div>
                <div className="bg-gray-100 dark:bg-gray-700 p-3 rounded-md whitespace-pre-wrap break-words text-gray-900 dark:text-gray-100">
                  {message.content}
                </div>
              </div>
            )}
            
            {message.attachments && message.attachments.length > 0 && (
              <div className="space-y-2">
                <div className="font-semibold text-gray-700 dark:text-gray-300">{t('messageDetails.attachments')}:</div>
                <div className="space-y-2">
                  {message.attachments.map((attachment, index) => (
                    <div key={index} className="bg-gray-100 dark:bg-gray-700 p-2 rounded-md">
                      <div><span className="font-medium text-gray-700 dark:text-gray-300">{t('messageDetails.name')}:</span> <span className="text-gray-900 dark:text-gray-100">{attachment.name}</span></div>
                      <div><span className="font-medium text-gray-700 dark:text-gray-300">{t('messageDetails.type')}:</span> <span className="text-gray-900 dark:text-gray-100">{attachment.type}</span></div>
                      <div className="truncate"><span className="font-medium text-gray-700 dark:text-gray-300">{t('messageDetails.url')}:</span> <span className="text-gray-900 dark:text-gray-100">{attachment.url}</span></div>
                    </div>
                  ))}
                </div>
              </div>
            )}
            
            {message.metadata && Object.keys(message.metadata).length > 0 && (
              <div className="space-y-1">
                <div className="font-semibold text-gray-700 dark:text-gray-300">{t('messageDetails.metadata')}:</div>
                <div className="bg-gray-100 dark:bg-gray-700 p-3 rounded-md">
                  {renderMetadataValue(message.metadata, 0, 'root')}
                </div>
              </div>
            )}
          </div>
        </DialogContent>
      </Dialog>

      <Dialog open={showDeleteModal} onOpenChange={(open) => {
        // Só permite fechar o modal se não estiver deletando
        if (!isDeleting) {
          setShowDeleteModal(open);
        }
      }}>
        <DialogContent className="sm:max-w-md bg-white dark:bg-gray-800">
          <DialogHeader>
            <DialogTitle className="text-red-600 dark:text-red-400 flex items-center gap-2">
              <Trash2 className="h-5 w-5" />
              {t("deleteConfirmation.title")}
            </DialogTitle>
            <DialogDescription className="text-gray-600 dark:text-gray-300">
              {t("deleteConfirmation.message")}
            </DialogDescription>
          </DialogHeader>
          <div className="flex flex-col gap-4">
            <div className="bg-red-50 dark:bg-red-950/30 p-4 rounded-lg border border-red-200 dark:border-red-800">
              <div className="flex items-start gap-3">
                <div className="mt-1">
                  <svg className="h-5 w-5 text-red-500 dark:text-red-400" viewBox="0 0 20 20" fill="currentColor">
                    <path fillRule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
                  </svg>
                </div>
                <div className="text-sm text-red-700 dark:text-red-300">
                  {t("deleteConfirmation.warning")}
                </div>
              </div>
            </div>
            <div className="flex justify-end gap-2">
              <Button
                variant="outline"
                onClick={() => setShowDeleteModal(false)}
                disabled={isDeleting}
                className="hover:bg-gray-100 dark:hover:bg-gray-700"
              >
                {t("deleteConfirmation.cancel")}
              </Button>
              <Button
                variant="danger"
                onClick={handleDelete}
                disabled={isDeleting}
                className="bg-red-600 hover:bg-red-700 text-white dark:bg-red-500 dark:hover:bg-red-600 flex items-center"
              >
                {isDeleting ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    {t("actions.deleting")}
                  </>
                ) : (
                  <>
                    <Trash2 className="mr-2 h-4 w-4" />
                    {t("deleteConfirmation.confirm")}
                  </>
                )}
              </Button>
            </div>
            {error && (
              <div className="mt-2 text-sm text-red-600 dark:text-red-400 bg-red-50 dark:bg-red-950/30 p-3 rounded-lg border border-red-200 dark:border-red-800">
                {error}
              </div>
            )}
          </div>
        </DialogContent>
      </Dialog>

      {/* Modal da tarefa */}
      {/* NOTA: Existem alguns erros de tipagem TypeScript conhecidos nesta implementação, 
         mas a funcionalidade deve funcionar corretamente. Para corrigir completamente os erros,
         uma refatoração mais ampla seria necessária no futuro. */}
      {taskModalOpen && metadata && 'task_id' in metadata && metadata.task_id && (
        <TaskModal
          onClose={() => setTaskModalOpen(false)}
          organizationId={currentOrganizationMember?.organization_id}
          taskId={String(metadata.task_id)}
          mode="edit"
          chatId={typeof message.chat_id === 'object' ? (message.chat_id as any).id : String(message.chat_id)}
        />
      )}
    </>
  );
}

// Componente para renderizar uma lista no formato do WhatsApp
function WhatsappList({ list }: { list: WhatsAppList }) {
  const [isModalOpen, setIsModalOpen] = useState(false);

  if (!list) return null;

  return (
    <>
      <div className="w-full mt-2">
        {/* Título e descrição como texto normal */}
        <div className="mb-2">
          <MarkdownRenderer content={`**${list.title}**`} />
          <div className="text-sm mt-1">{list.description}</div>
        </div>

        {/* Botão com estilo WhatsApp */}
        <button 
          onClick={() => setIsModalOpen(true)}
          className="w-full p-2.5 text-center flex justify-center items-center rounded-md hover:bg-gray-50 dark:hover:bg-gray-700/50 transition-colors gap-1.5"
        >
          <Menu className="w-4 h-4 text-blue-600 dark:text-blue-400" />
          <span className="text-blue-600 dark:text-blue-400 font-medium">{list.buttonText}</span>
        </button>
      </div>

      {/* Modal da lista */}
      {isModalOpen && (
        <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex items-center justify-center p-4 overflow-y-auto">
          <div className="bg-white dark:bg-gray-800 rounded-lg w-full max-w-md max-h-[90vh] overflow-hidden flex flex-col">
            <div className="p-4 border-b border-gray-200 dark:border-gray-700 flex justify-between items-center">
              <h3 className="text-xl font-bold">{list.title}</h3>
              <button 
                onClick={() => setIsModalOpen(false)}
                className="text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-300"
              >
                <X className="w-6 h-6" />
              </button>
            </div>
            
            <div className="p-4 overflow-y-auto flex-1">
              <p className="text-gray-600 dark:text-gray-300 mb-4">{list.description}</p>
              
              {list.sections.map((section, sectionIndex) => (
                <div key={sectionIndex} className="mb-4 last:mb-0">
                  <div className="bg-gray-100 dark:bg-gray-700 p-3 rounded-t-lg font-medium">
                    {section.title}
                  </div>
                  
                  <div className="border border-gray-200 dark:border-gray-700 rounded-b-lg">
                    {section.rows.map((row, rowIndex) => (
                      <div 
                        key={rowIndex} 
                        className="p-3 border-t border-gray-200 dark:border-gray-700 first:border-t-0 hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors"
                      >
                        <div className="font-bold">{row.title}</div>
                        <div className="text-sm text-gray-600 dark:text-gray-300 mt-1">{row.description}</div>
                      </div>
                    ))}
                  </div>
                </div>
              ))}
            </div>
            
            <div className="p-4 border-t border-gray-200 dark:border-gray-700">
              <button 
                onClick={() => setIsModalOpen(false)}
                className="w-full bg-blue-600 hover:bg-blue-700 text-white font-medium py-2 px-4 rounded transition-colors"
              >
                Fechar
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}