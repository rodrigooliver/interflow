import React, { useEffect, useState, useRef } from 'react';
import { useTranslation } from 'react-i18next';
import { Chat, Customer } from '../../types/database';
import { ChatAvatar } from './ChatAvatar';
import { MessageStatus } from './MessageStatus';
import { formatLastMessageTime } from '../../utils/date';
import { supabase } from '../../lib/supabase';
import { MoreVertical, Pin, Archive, Eye, CheckCircle, User, ArrowLeft, AlertTriangle, Info } from 'lucide-react';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "../../components/ui/dropdown-menu";
import { ChatDetailsModal } from './ChatDetailsModal';
import './styles.css';

interface CustomerTag {
  tag_id: string;
  tags?: {
    id: string;
    name: string;
    color: string;
  };
}

interface Stage {
  id: string;
  name: string;
  funnel_id: string;
  color?: string;
}

interface ChatListProps {
  chats: Chat[];
  selectedChat: string | null;
  onSelectChat: (chatId: string) => void;
  isLoading?: boolean;
  onEditCustomer?: (customer: Customer) => void;
  onUpdateChat?: (chatId: string, updates: Partial<Chat>) => void;
}

// Componente de Tooltip personalizado
interface CustomTooltipProps {
  content: string;
  children: React.ReactNode;
  color?: string;
}

function CustomTooltip({ content, children, color }: CustomTooltipProps) {
  const [isVisible, setIsVisible] = useState(false);
  const [position, setPosition] = useState({ top: 0, left: 0 });
  const tooltipRef = useRef<HTMLDivElement>(null);
  const childRef = useRef<HTMLDivElement>(null);

  const showTooltip = () => {
    if (childRef.current) {
      const rect = childRef.current.getBoundingClientRect();
      setPosition({
        top: rect.bottom + window.scrollY + 5,
        left: rect.left + window.scrollX + rect.width / 2
      });
      setIsVisible(true);
    }
  };

  const hideTooltip = () => {
    setIsVisible(false);
  };

  return (
    <>
      <div 
        ref={childRef}
        onMouseEnter={showTooltip}
        onMouseLeave={hideTooltip}
        onFocus={showTooltip}
        onBlur={hideTooltip}
      >
        {children}
      </div>
      {isVisible && (
        <div
          ref={tooltipRef}
          className="fixed z-50 px-2 py-1 text-xs font-medium text-white bg-gray-800 dark:bg-gray-700 rounded shadow-lg pointer-events-none transform -translate-x-1/2"
          style={{ 
            top: `${position.top}px`, 
            left: `${position.left}px`,
            backgroundColor: color ? `${color}` : undefined,
            maxWidth: '200px',
            wordBreak: 'break-word'
          }}
        >
          {content}
          <div 
            className="absolute w-2 h-2 transform rotate-45 -top-1 left-1/2 -ml-1"
            style={{ backgroundColor: color ? `${color}` : '#1F2937' }}
          />
        </div>
      )}
    </>
  );
}

export function ChatList({ chats, selectedChat, onSelectChat, isLoading = false, onEditCustomer, onUpdateChat }: ChatListProps) {
  const { t, i18n } = useTranslation('chats');
  const [stages, setStages] = useState<Record<string, Stage>>({});
  const [showArchived, setShowArchived] = useState(false);
  const [selectedChatForDetails, setSelectedChatForDetails] = useState<Chat | null>(null);

  const handleUpdateChat = async (chatId: string, updates: Partial<Chat>) => {
    try {
      const { error } = await supabase
        .from('chats')
        .update(updates)
        .eq('id', chatId)
        .select()
        .single();

      if (error) {
        console.error('Erro ao atualizar chat:', error);
        return;
      }

      // Atualiza o estado no componente pai
      if (onUpdateChat) {
        onUpdateChat(chatId, updates);
      }
    } catch (error) {
      console.error('Erro ao atualizar chat:', error);
    }
  };

  // Separar chats arquivados e não arquivados
  const archivedChats = chats.filter(chat => chat.is_archived);
  const activeChats = chats.filter(chat => !chat.is_archived);

  // Carregar os estágios para todos os chats que têm stage_id
  useEffect(() => {
    const stageIds = chats
      .filter(chat => chat.customer?.stage_id)
      .map(chat => chat.customer?.stage_id)
      .filter((value, index, self) => value && self.indexOf(value) === index) as string[];
    
    if (stageIds.length > 0) {
      const fetchStages = async () => {
        const { data } = await supabase
          .from('crm_stages')
          .select('id, name, funnel_id, color')
          .in('id', stageIds);
        
        if (data) {
          const stagesMap = data.reduce((acc, stage) => {
            acc[stage.id] = stage;
            return acc;
          }, {} as Record<string, Stage>);
          
          setStages(stagesMap);
        }
      };
      
      fetchStages();
    }
  }, [chats]);

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

  const handleChatAction = async (action: string, chat: Chat) => {
    const currentUnreadCount = chat.unread_count || 0;
    
    switch (action) {
      case 'mark_unread':
        await handleUpdateChat(chat.id, { 
          unread_count: currentUnreadCount > 0 ? 0 : 1
        });
        break;
      case 'mark_resolved':
        if (chat.status === 'pending') {
          await handleUpdateChat(chat.id, { 
            status: 'closed',
            end_time: new Date().toISOString()
          });
        }
        break;
      case 'archive':
        if (chat.is_archived) {
          await handleUpdateChat(chat.id, { 
            is_archived: false
          });
        } else if (chat.status === 'pending') {
          await handleUpdateChat(chat.id, { 
            is_archived: true
          });
        }
        break;
      case 'pin':
        await handleUpdateChat(chat.id, { 
          is_fixed: !chat.is_fixed
        });
        break;
      case 'mark_spam':
        if (chat.customer?.id) {
          const { error } = await supabase
            .from('customers')
            .update({ is_spam: true })
            .eq('id', chat.customer.id);
          
          if (error) {
            console.error('Erro ao marcar cliente como spam:', error);
          } else if (onUpdateChat) {
            onUpdateChat(chat.id, {
              customer: {
                ...chat.customer,
                is_spam: true
              }
            });
          }
        }
        break;
      case 'unmark_spam':
        if (chat.customer?.id) {
          const { error } = await supabase
            .from('customers')
            .update({ is_spam: false })
            .eq('id', chat.customer.id);
          
          if (error) {
            console.error('Erro ao desmarcar cliente como spam:', error);
          } else if (onUpdateChat) {
            onUpdateChat(chat.id, {
              customer: {
                ...chat.customer,
                is_spam: false
              }
            });
          }
        }
        break;
      case 'customer_details':
        if (chat.customer && onEditCustomer) {
          onEditCustomer(chat.customer);
        }
        break;
    }
  };

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
          <p className="text-sm">{t('emptyState.description.unassigned')}</p>
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
            <div
          key={chat.id}
              className={`block p-4 border-b border-gray-200 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-700 cursor-pointer ${
            selectedChat === chat.id ? 'bg-blue-50 dark:bg-blue-900/50' : ''
              } ${chat.is_fixed ? 'bg-yellow-50 dark:bg-yellow-900/20' : ''}`}
              onClick={() => onSelectChat(chat.id)}
        >
          <div className="flex items-start space-x-3">
            <div className="flex flex-col items-center">
              <ChatAvatar 
                id={chat.id}
                name={chat.customer?.name || 'Anônimo'}
                profilePicture={chat.profile_picture}
                channel={chat.channel_id}
              />
              
              {/* Estágio do funil abaixo do avatar */}
              {chat.customer?.stage_id && stages[chat.customer.stage_id] ? (
                <CustomTooltip 
                  content={stages[chat.customer.stage_id].name}
                  color={stages[chat.customer.stage_id].color || '#4B5563'}
                >
                  <span 
                    className="mt-3 inline-flex items-center px-1.5 py-0.5 text-xs rounded-full whitespace-nowrap overflow-hidden max-w-[60px] border border-gray-200 dark:border-gray-700 cursor-pointer"
                    style={{ 
                      backgroundColor: stages[chat.customer.stage_id].color ? `${stages[chat.customer.stage_id].color}10` : 'transparent',
                      color: stages[chat.customer.stage_id].color || 'currentColor'
                    }}
                    onClick={(e) => {
                      e.stopPropagation();
                      if (onEditCustomer && chat.customer) {
                        onEditCustomer(chat.customer);
                      }
                    }}
                  >
                    <span className="inline-block w-1.5 h-1.5 rounded-full mr-1 flex-shrink-0" style={{ backgroundColor: stages[chat.customer.stage_id].color || '#9CA3AF' }}></span>
                    <span className="truncate">{stages[chat.customer.stage_id].name}</span>
                  </span>
                </CustomTooltip>
              ) : (
                <CustomTooltip 
                  content={t('chats:noFunnelStage')}
                  color="#6B7280"
                >
                  <span 
                    className="mt-3 inline-flex items-center px-1.5 py-0.5 text-xs rounded-full whitespace-nowrap overflow-hidden max-w-[60px] border border-gray-200 dark:border-gray-700 text-gray-500 dark:text-gray-400 bg-gray-50 dark:bg-gray-800 cursor-pointer"
                    onClick={(e) => {
                      e.stopPropagation();
                      if (onEditCustomer && chat.customer) {
                        onEditCustomer(chat.customer);
                      }
                    }}
                  >
                    <span className="truncate">{t('chats:noFunnelStage')}</span>
                  </span>
                </CustomTooltip>
              )}
            </div>
            
            <div className="flex-1 truncate">
              <div className="flex justify-between items-center w-full mb-1">
                    <div className="flex items-center gap-2 min-w-0">
                      {chat.is_fixed && (
                        <Pin className="w-3 h-3 text-yellow-500 flex-shrink-0" />
                      )}
                      <div className="flex items-center justify-between">
                        <div className="flex items-center space-x-2">
                          <span className="font-medium text-gray-900 dark:text-white">
                  {chat.customer?.name || t('unnamed')}
                </span>
                          {chat.customer?.is_spam && (
                            <div className="relative group">
                              <AlertTriangle className="w-4 h-4 text-red-500" />
                              <div className="absolute bottom-full left-1/2 transform -translate-x-1/2 mb-2 px-2 py-1 bg-gray-900 text-white text-xs rounded opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap">
                                {t('chats:filters.spam')}
                              </div>
                            </div>
                          )}
                        </div>
                      </div>
                    </div>
                    <div className="flex items-center gap-2 flex-shrink-0">
                      <span className="text-xs text-gray-500 dark:text-gray-400">
                  {formatLastMessageTime(chat.last_message_at || chat.created_at, i18n.language, t)}
                </span>
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <button 
                            className="p-1 hover:bg-gray-100 dark:hover:bg-gray-700 rounded"
                            onClick={(e) => e.stopPropagation()}
                          >
                            <MoreVertical className="w-4 h-4 text-gray-500 dark:text-gray-400" />
                          </button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          <DropdownMenuItem onClick={(e) => {
                            e.stopPropagation();
                            handleChatAction('pin', chat);
                          }}>
                            <Pin className={`w-4 h-4 mr-2 ${chat.is_fixed ? 'text-yellow-500' : ''}`} />
                            {t(chat.is_fixed ? 'actions.unpin' : 'actions.pin')}
                          </DropdownMenuItem>
                          {chat.is_archived ? (
                            <DropdownMenuItem onClick={(e) => {
                              e.stopPropagation();
                              handleChatAction('archive', chat);
                            }}>
                              <Archive className="w-4 h-4 mr-2" />
                              {t('actions.unarchive')}
                            </DropdownMenuItem>
                          ) : chat.status === 'pending' && (
                            <DropdownMenuItem onClick={(e) => {
                              e.stopPropagation();
                              handleChatAction('archive', chat);
                            }}>
                              <Archive className="w-4 h-4 mr-2" />
                              {t('actions.archive')}
                            </DropdownMenuItem>
                          )}
                          <DropdownMenuItem onClick={(e) => {
                            e.stopPropagation();
                            handleChatAction('mark_unread', chat);
                          }}>
                            <Eye className="w-4 h-4 mr-2" />
                            {t((chat.unread_count || 0) > 0 ? 'actions.markRead' : 'actions.markUnread')}
                          </DropdownMenuItem>
                          {chat.status === 'pending' && (
                            <DropdownMenuItem onClick={(e) => {
                              e.stopPropagation();
                              handleChatAction('mark_resolved', chat);
                            }}>
                              <CheckCircle className="w-4 h-4 mr-2" />
                              {t('actions.markResolved')}
                            </DropdownMenuItem>
                          )}
                          <DropdownMenuItem onClick={(e) => {
                            e.stopPropagation();
                            handleChatAction(chat.customer?.is_spam ? 'unmark_spam' : 'mark_spam', chat);
                          }}>
                            <AlertTriangle className="w-4 h-4 mr-2" />
                            {t(chat.customer?.is_spam ? 'actions.unmarkSpam' : 'actions.markSpam')}
                          </DropdownMenuItem>
                          <DropdownMenuItem onClick={(e) => {
                            e.stopPropagation();
                            handleChatAction('customer_details', chat);
                          }}>
                            <User className="w-4 h-4 mr-2" />
                            {t('actions.customerDetails')}
                          </DropdownMenuItem>
                          <DropdownMenuItem onClick={(e) => {
                            e.stopPropagation();
                            setSelectedChatForDetails(chat);
                          }}>
                            <Info className="w-4 h-4 mr-2" />
                            {t('actions.chatDetails')}
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </div>
              </div>
              
              {chat.last_message && (
                <div className="flex items-center gap-1 mb-1">
                  {chat.last_message.sender_type === 'agent' && (
                    <MessageStatus 
                      status={chat.last_message.status === 'deleted' ? 'failed' : 
                              chat.last_message.status === 'pending' ? 'pending' : 
                              chat.last_message.status === 'sent' ? 'sent' : 
                              chat.last_message.status === 'delivered' ? 'delivered' : 
                              chat.last_message.status === 'read' ? 'read' : 'failed'} 
                      errorMessage={chat.last_message.error_message}
                    />
                  )}
                  <div className="flex-1 min-w-0">
                    <div className="text-sm text-gray-600 dark:text-gray-300 truncate">
                      {chat.last_message.content}
                    </div>
                  </div>
                  {(chat.unread_count || 0) > 0 && (
                    <span className="flex-shrink-0 px-1.5 py-0.5 text-xs font-medium rounded-full bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200">
                      {chat.unread_count}
                    </span>
                  )}
                </div>
              )}
              
              <div className="flex items-center gap-1.5 flex-wrap">
                <div className="flex items-center gap-1.5">
                  {getStatusBadge(chat)}
                </div>
                
                {/* Tags do cliente */}
                {chat.customer?.tags && chat.customer.tags.length > 0 && (
                  <div className="flex items-center gap-1 overflow-hidden">
                    {chat.customer.tags.slice(0, 2).map((tagItem: CustomerTag) => (
                      <CustomTooltip 
                        key={tagItem.tag_id}
                        content={tagItem.tags?.name || ''}
                        color={tagItem.tags?.color ? tagItem.tags.color : '#3B82F6'}
                      >
                        <span 
                          className="inline-flex items-center px-1.5 py-0.5 text-xs rounded-full whitespace-nowrap overflow-hidden max-w-[50px]"
                          style={{ 
                            backgroundColor: tagItem.tags?.color ? `${tagItem.tags.color}20` : '#3B82F620',
                            color: tagItem.tags?.color || '#3B82F6'
                          }}
                        >
                          <span className="truncate">{tagItem.tags?.name || ''}</span>
                        </span>
                      </CustomTooltip>
                    ))}
                    {chat.customer.tags.length > 2 && (
                      <CustomTooltip 
                        content={chat.customer.tags.slice(2).map(tag => 
                          tag.tags?.name || ''
                        ).join(', ')}
                        color="#4B5563"
                      >
                        <span className="text-xs text-gray-500 dark:text-gray-400 whitespace-nowrap px-1.5 py-0.5 rounded-full bg-gray-100 dark:bg-gray-700">
                          +{chat.customer.tags.length - 2}
                        </span>
                      </CustomTooltip>
                    )}
                  </div>
                )}
              </div>
            </div>
          </div>
            </div>
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
            <div
              key={chat.id}
              className={`block p-4 border-b border-gray-200 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-700 cursor-pointer ${
                selectedChat === chat.id ? 'bg-blue-50 dark:bg-blue-900/50' : ''
              } ${chat.is_fixed ? 'bg-yellow-50 dark:bg-yellow-900/20' : ''}`}
              onClick={() => onSelectChat(chat.id)}
            >
              <div className="flex items-start space-x-3">
                <div className="flex flex-col items-center">
                  <ChatAvatar 
                    id={chat.id}
                    name={chat.customer?.name || 'Anônimo'}
                    profilePicture={chat.profile_picture}
                    channel={chat.channel_id}
                  />
                  
                  {/* Estágio do funil abaixo do avatar */}
                  {chat.customer?.stage_id && stages[chat.customer.stage_id] ? (
                    <CustomTooltip 
                      content={stages[chat.customer.stage_id].name}
                      color={stages[chat.customer.stage_id].color || '#4B5563'}
                    >
                      <span 
                        className="mt-3 inline-flex items-center px-1.5 py-0.5 text-xs rounded-full whitespace-nowrap overflow-hidden max-w-[60px] border border-gray-200 dark:border-gray-700 cursor-pointer"
                        style={{ 
                          backgroundColor: stages[chat.customer.stage_id].color ? `${stages[chat.customer.stage_id].color}10` : 'transparent',
                          color: stages[chat.customer.stage_id].color || 'currentColor'
                        }}
                        onClick={(e) => {
                          e.stopPropagation();
                          if (onEditCustomer && chat.customer) {
                            onEditCustomer(chat.customer);
                          }
                        }}
                      >
                        <span className="inline-block w-1.5 h-1.5 rounded-full mr-1 flex-shrink-0" style={{ backgroundColor: stages[chat.customer.stage_id].color || '#9CA3AF' }}></span>
                        <span className="truncate">{stages[chat.customer.stage_id].name}</span>
                      </span>
                    </CustomTooltip>
                  ) : (
                    <CustomTooltip 
                      content={t('chats:noFunnelStage')}
                      color="#6B7280"
                    >
                      <span 
                        className="mt-3 inline-flex items-center px-1.5 py-0.5 text-xs rounded-full whitespace-nowrap overflow-hidden max-w-[60px] border border-gray-200 dark:border-gray-700 text-gray-500 dark:text-gray-400 bg-gray-50 dark:bg-gray-800 cursor-pointer"
                        onClick={(e) => {
                          e.stopPropagation();
                          if (onEditCustomer && chat.customer) {
                            onEditCustomer(chat.customer);
                          }
                        }}
                      >
                        <span className="truncate">{t('chats:noFunnelStage')}</span>
                      </span>
                    </CustomTooltip>
                  )}
                </div>
                
                <div className="flex-1 truncate">
                  <div className="flex justify-between items-center w-full mb-1">
                    <div className="flex items-center gap-2 min-w-0">
                      {chat.is_fixed && (
                        <Pin className="w-3 h-3 text-yellow-500 flex-shrink-0" />
                      )}
                      <div className="flex items-center justify-between">
                        <div className="flex items-center space-x-2">
                          <span className="font-medium text-gray-900 dark:text-white">
                            {chat.customer?.name || t('unnamed')}
                          </span>
                          {chat.customer?.is_spam && (
                            <div className="relative group">
                              <AlertTriangle className="w-4 h-4 text-red-500" />
                              <div className="absolute bottom-full left-1/2 transform -translate-x-1/2 mb-2 px-2 py-1 bg-gray-900 text-white text-xs rounded opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap">
                                {t('chats:filters.spam')}
                              </div>
                            </div>
                          )}
                        </div>
                      </div>
                    </div>
                    <div className="flex items-center gap-2 flex-shrink-0">
                      <span className="text-xs text-gray-500 dark:text-gray-400">
                        {formatLastMessageTime(chat.last_message_at || chat.created_at, i18n.language, t)}
                      </span>
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <button 
                            className="p-1 hover:bg-gray-100 dark:hover:bg-gray-700 rounded"
                            onClick={(e) => e.stopPropagation()}
                          >
                            <MoreVertical className="w-4 h-4 text-gray-500 dark:text-gray-400" />
                          </button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          <DropdownMenuItem onClick={(e) => {
                            e.stopPropagation();
                            handleChatAction('pin', chat);
                          }}>
                            <Pin className={`w-4 h-4 mr-2 ${chat.is_fixed ? 'text-yellow-500' : ''}`} />
                            {t(chat.is_fixed ? 'actions.unpin' : 'actions.pin')}
                          </DropdownMenuItem>
                          {chat.is_archived ? (
                            <DropdownMenuItem onClick={(e) => {
                              e.stopPropagation();
                              handleChatAction('archive', chat);
                            }}>
                              <Archive className="w-4 h-4 mr-2" />
                              {t('actions.unarchive')}
                            </DropdownMenuItem>
                          ) : chat.status === 'pending' && (
                            <DropdownMenuItem onClick={(e) => {
                              e.stopPropagation();
                              handleChatAction('archive', chat);
                            }}>
                              <Archive className="w-4 h-4 mr-2" />
                              {t('actions.archive')}
                            </DropdownMenuItem>
                          )}
                          <DropdownMenuItem onClick={(e) => {
                            e.stopPropagation();
                            handleChatAction('mark_unread', chat);
                          }}>
                            <Eye className="w-4 h-4 mr-2" />
                            {t((chat.unread_count || 0) > 0 ? 'actions.markRead' : 'actions.markUnread')}
                          </DropdownMenuItem>
                          {chat.status === 'pending' && (
                            <DropdownMenuItem onClick={(e) => {
                              e.stopPropagation();
                              handleChatAction('mark_resolved', chat);
                            }}>
                              <CheckCircle className="w-4 h-4 mr-2" />
                              {t('actions.markResolved')}
                            </DropdownMenuItem>
                          )}
                          <DropdownMenuItem onClick={(e) => {
                            e.stopPropagation();
                            handleChatAction(chat.customer?.is_spam ? 'unmark_spam' : 'mark_spam', chat);
                          }}>
                            <AlertTriangle className="w-4 h-4 mr-2" />
                            {t(chat.customer?.is_spam ? 'actions.unmarkSpam' : 'actions.markSpam')}
                          </DropdownMenuItem>
                          <DropdownMenuItem onClick={(e) => {
                            e.stopPropagation();
                            handleChatAction('customer_details', chat);
                          }}>
                            <User className="w-4 h-4 mr-2" />
                            {t('actions.customerDetails')}
                          </DropdownMenuItem>
                          <DropdownMenuItem onClick={(e) => {
                            e.stopPropagation();
                            setSelectedChatForDetails(chat);
                          }}>
                            <Info className="w-4 h-4 mr-2" />
                            {t('actions.chatDetails')}
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </div>
                  </div>
                  
                  {chat.last_message && (
                    <div className="flex items-center gap-1 mb-1">
                      {chat.last_message.sender_type === 'agent' && (
                        <MessageStatus 
                          status={chat.last_message.status === 'deleted' ? 'failed' : 
                                  chat.last_message.status === 'pending' ? 'pending' : 
                                  chat.last_message.status === 'sent' ? 'sent' : 
                                  chat.last_message.status === 'delivered' ? 'delivered' : 
                                  chat.last_message.status === 'read' ? 'read' : 'failed'} 
                          errorMessage={chat.last_message.error_message}
                        />
                      )}
                      <div className="flex-1 min-w-0">
                        <div className="text-sm text-gray-600 dark:text-gray-300 truncate">
                          {chat.last_message.content}
                        </div>
                      </div>
                      {(chat.unread_count || 0) > 0 && (
                        <span className="flex-shrink-0 px-1.5 py-0.5 text-xs font-medium rounded-full bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200">
                          {chat.unread_count}
                        </span>
                      )}
                    </div>
                  )}
                  
                  <div className="flex items-center gap-1.5 flex-wrap">
                    <div className="flex items-center gap-1.5">
                      {getStatusBadge(chat)}
                    </div>
                    
                    {/* Tags do cliente */}
                    {chat.customer?.tags && chat.customer.tags.length > 0 && (
                      <div className="flex items-center gap-1 overflow-hidden">
                        {chat.customer.tags.slice(0, 2).map((tagItem: CustomerTag) => (
                          <CustomTooltip 
                            key={tagItem.tag_id}
                            content={tagItem.tags?.name || ''}
                            color={tagItem.tags?.color ? tagItem.tags.color : '#3B82F6'}
                          >
                            <span 
                              className="inline-flex items-center px-1.5 py-0.5 text-xs rounded-full whitespace-nowrap overflow-hidden max-w-[50px]"
                              style={{ 
                                backgroundColor: tagItem.tags?.color ? `${tagItem.tags.color}20` : '#3B82F620',
                                color: tagItem.tags?.color || '#3B82F6'
                              }}
                            >
                              <span className="truncate">{tagItem.tags?.name || ''}</span>
                            </span>
                          </CustomTooltip>
                        ))}
                        {chat.customer.tags.length > 2 && (
                          <CustomTooltip 
                            content={chat.customer.tags.slice(2).map(tag => 
                              tag.tags?.name || ''
                            ).join(', ')}
                            color="#4B5563"
                          >
                            <span className="text-xs text-gray-500 dark:text-gray-400 whitespace-nowrap px-1.5 py-0.5 rounded-full bg-gray-100 dark:bg-gray-700">
                              +{chat.customer.tags.length - 2}
                            </span>
                          </CustomTooltip>
                        )}
                      </div>
                    )}
                  </div>
                </div>
              </div>
            </div>
          ))}
        </>
      )}

      {selectedChatForDetails && (
        <ChatDetailsModal
          chatId={selectedChatForDetails.id || ''}
          isOpen={!!selectedChatForDetails}
          onClose={() => setSelectedChatForDetails(null)}
        />
      )}
    </div>
  );
}