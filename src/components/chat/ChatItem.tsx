import React, { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Chat, Customer } from '../../types/database';
import { ChatAvatar } from './ChatAvatar';
import { MessageStatus } from './MessageStatus';
import { formatLastMessageTime } from '../../utils/date';
import { getMessageTypeIcon } from '../../utils/chat';
import { supabase } from '../../lib/supabase';
import { MoreVertical, Pin, Archive, Eye, CheckCircle, User, AlertTriangle, Info, GitMerge, Users2, Ban } from 'lucide-react';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "../../components/ui/DropdownMenu";
import { CustomTooltip } from './CustomTooltip';
import { ChatDetailsModal } from './ChatDetailsModal';
import { CustomerEditModal } from '../../components/customers/CustomerEditModal';
import { MarkdownRenderer } from '../ui/MarkdownRenderer';
import { TeamTransferModal } from './TeamTransferModal';
import { MergeChatModal } from './MergeChatModal';
import { TransferChatToCustomerModal } from './TransferChatToCustomerModal';

interface CustomerTag {
  tag_id: string;
  tags?: {
    id: string;
    name: string;
    color: string;
  };
}

interface ChatItemProps {
  chat: Chat;
  isSelected: boolean;
  onSelectChat: (chatId: string) => void;
  onUpdateChat?: (chatId: string, updates: Partial<Chat>) => void;
}

export function ChatItem({ 
  chat, 
  isSelected, 
  onSelectChat, 
  onUpdateChat
}: ChatItemProps) {
  const { t, i18n } = useTranslation('chats');
  const [showDetails, setShowDetails] = useState(false);
  const [showEditCustomerModal, setShowEditCustomerModal] = useState(false);
  const [showTeamTransferModal, setShowTeamTransferModal] = useState(false);
  const [selectedCustomer, setSelectedCustomer] = useState<Customer | null>(null);
  const [showMergeModal, setShowMergeModal] = useState(false);
  const [showTransferCustomerModal, setShowTransferCustomerModal] = useState(false);

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

      if (onUpdateChat) {
        onUpdateChat(chatId, updates);
      }
    } catch (error) {
      console.error('Erro ao atualizar chat:', error);
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
        if (chat.customer) {
          setSelectedCustomer(chat.customer);
          setShowEditCustomerModal(true);
        }
        break;
      case 'chat_details':
        setShowDetails(true);
        break;
      case 'team_transfer':
        setShowTeamTransferModal(true);
        break;
      case 'merge_chat':
        setShowMergeModal(true);
        break;
      case 'transfer_to_customer':
        setShowTransferCustomerModal(true);
        break;
    }
  };

  const handleCloseEditCustomerModal = () => {
    setShowEditCustomerModal(false);
    setSelectedCustomer(null);
  };

  const handleCustomerEditSuccess = async () => {
    handleCloseEditCustomerModal();
    if (onUpdateChat && chat.id) {
      // Recarregar os dados do chat
      const { data: chatData } = await supabase
        .from('chats')
        .select(`
          *,
          customer:customers(
            id,
            name,
            email,
            whatsapp,
            stage_id,
            is_spam,
            tags:customer_tags(
              tag_id,
              tags:tags(
                id,
                name,
                color
              )
            )
          )
        `)
        .eq('id', chat.id)
        .single();

      if (chatData) {
        onUpdateChat(chat.id, chatData);
      }
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

  // Função para obter as iniciais da equipe
  const getTeamInitials = (teamName: string) => {
    if (!teamName) return '';
    
    // Dividir o nome da equipe em palavras
    const words = teamName.trim().split(/\s+/);
    
    // Se tiver apenas uma palavra, pegar as duas primeiras letras
    if (words.length === 1) {
      return words[0].substring(0, 2).toUpperCase();
    }
    
    // Se tiver mais de uma palavra, pegar a primeira letra de cada palavra (até 2 letras)
    return words.slice(0, 2).map(word => word[0]).join('').toUpperCase();
  };

  // Função para gerar uma cor consistente baseada no nome da equipe
  const getTeamColor = (teamName: string) => {
    if (!teamName) return '#4B5563'; // Cor padrão cinza
    
    // Lista de cores predefinidas (tons diferentes para melhor visualização)
    const colors = [
      '#2563EB', // azul
      '#D97706', // âmbar
      '#059669', // esmeralda
      '#DC2626', // vermelho
      '#7C3AED', // violeta
      '#DB2777', // rosa
      '#0891B2', // ciano
      '#4338CA', // indigo
      '#65A30D', // lima
      '#9333EA'  // púrpura
    ];
    
    // Calcular um hash simples a partir do nome da equipe
    let hash = 0;
    for (let i = 0; i < teamName.length; i++) {
      hash = teamName.charCodeAt(i) + ((hash << 5) - hash);
    }
    
    // Usar o hash para escolher uma cor da lista
    const index = Math.abs(hash) % colors.length;
    return colors[index];
  };

  // Função para obter as iniciais do canal
  const getChannelInitials = (channelName?: string, channelType?: string) => {
    // Priorizar o nome do canal para as iniciais
    if (channelName && channelName.trim()) {
      const words = channelName.trim().split(/\s+/);
      if (words.length === 1) {
        return words[0].substring(0, 4).toUpperCase();
      }
      if (words.length === 2) {
        return (words[0].substring(0, 2) + words[1].substring(0, 2)).toUpperCase();
      }
      if (words.length === 3) {
        return (words[0][0] + words[1][0] + words[2].substring(0, 2)).toUpperCase();
      }
      return words.slice(0, 4).map(word => word[0]).join('').toUpperCase();
    }
    
    // Fallback para tipo do canal se não houver nome
    switch (channelType) {
      case 'whatsapp_official':
      case 'whatsapp_wapi':
      case 'whatsapp_zapi':
      case 'whatsapp_evo':
        return 'WHAP';
      case 'instagram':
      case 'instagramId':
        return 'INST';
      case 'facebook':
      case 'facebookId':
        return 'FACE';
      case 'email':
        return 'MAIL';
      case 'telegram':
        return 'TELE';
      default:
        return 'CHAN';
    }
  };

  // Função para gerar cor do canal
  const getChannelColor = (channelType: string) => {
    switch (channelType) {
      case 'whatsapp_official':
      case 'whatsapp_wapi':
      case 'whatsapp_zapi':
      case 'whatsapp_evo':
        return '#25D366';
      case 'instagram':
      case 'instagramId':
        return '#E4405F';
      case 'facebook':
      case 'facebookId':
        return '#1877F2';
      case 'email':
        return '#EA4335';
      case 'telegram':
        return '#0088CC';
      default:
        return '#6B7280';
    }
  };

  const handleMergeComplete = () => {
    setShowMergeModal(false);
    // Recarregar os dados ou atualizar a UI conforme necessário
    if (onUpdateChat && chat.id) {
      onUpdateChat(chat.id, { is_archived: true });
    }
  };

  const handleTransferCustomerComplete = () => {
    setShowTransferCustomerModal(false);
    // Aqui você pode adicionar lógica para atualizar a UI ou recarregar os dados
    if (onUpdateChat && chat.id) {
      // Recarregar os dados do chat ou atualizar conforme necessário
      supabase
        .from('chats')
        .select('*')
        .eq('id', chat.id)
        .single()
        .then(({ data }) => {
          if (data && onUpdateChat) {
            onUpdateChat(chat.id, data);
          }
        });
    }
  };

  return (
    <>
      <div
        className={`block p-4 border-b border-gray-200 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-700 cursor-pointer ${
          isSelected ? 'bg-blue-50 dark:bg-blue-900/50' : ''
        } ${chat.is_fixed ? 'bg-yellow-50 dark:bg-yellow-900/20' : ''}`}
        onClick={() => onSelectChat(chat.id)}
      >
        <div className="flex items-start flex-row gap-2">
          <div className="flex flex-col items-center">
            <ChatAvatar 
              id={chat.id}
              name={chat.customer?.name || 'Anônimo'}
              profilePicture={chat.profile_picture || chat.customer?.profile_picture}
              channel={chat.channel_id}
            />
            
            {/* Canal abaixo do avatar */}
            {chat.channel_id && (() => {
              // Debug temporário
              
              return (
                <CustomTooltip 
                  content={`${chat.channel_id.name || chat.channel_id.type || 'Canal'}`}
                  color={getChannelColor(chat.channel_id.type || '')}
                >
                  <div className="mt-3 flex items-center gap-1 px-1.5 py-0.5 text-xs font-medium rounded-full  text-gray-500 dark:text-gray-500 whitespace-nowrap overflow-hidden max-w-[80px]">

                    <span className="">{getChannelInitials(chat.channel_id.name, chat.channel_id.type)}</span>
                  </div>
                </CustomTooltip>
              );
            })()}
          </div>
          
          <div className="flex-1 truncate">
            <div className="flex items-center w-full mb-1">
              {chat.is_fixed && (
                <Pin className="w-3 h-3 text-yellow-500 flex-shrink-0 mr-2" />
              )}
              <div className="flex-1 min-w-0 mr-2">
                <div className="flex items-center space-x-2 overflow-hidden">
                  <span className="font-medium text-gray-900 dark:text-white truncate block w-full">
                    {chat.customer?.name || t('unnamed')}
                  </span>
                  {chat.customer?.is_spam && (
                    <div className="relative group flex-shrink-0">
                      <AlertTriangle className="w-4 h-4 text-red-500" />
                      <div className="absolute bottom-full left-1/2 transform -translate-x-1/2 mb-2 px-2 py-1 bg-gray-900 text-white text-xs rounded opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap">
                        {t('chats:filters.spam')}
                      </div>
                    </div>
                  )}
                </div>
              </div>
              <div className="flex items-center gap-2 flex-shrink-0">
                <span className="text-xs text-gray-500 dark:text-gray-400 whitespace-nowrap">
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
                    <DropdownMenuItem onClick={(e) => {
                      e.stopPropagation();
                      handleChatAction('merge_chat', chat);
                    }}>
                      <GitMerge className="w-4 h-4 mr-2" />
                      {t('actions.mergeChats', 'Mesclar com outro chat')}
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
                      handleChatAction('team_transfer', chat);
                    }}>
                      <Users2 className="w-4 h-4 mr-2" />
                      {t('actions.transferTeam')}
                    </DropdownMenuItem>
                    <DropdownMenuItem onClick={(e) => {
                      e.stopPropagation();
                      handleChatAction('transfer_to_customer', chat);
                    }}>
                      <User className="w-4 h-4 mr-2" />
                      {t('actions.transferChatToCustomer', 'Transferir para outro cliente')}
                    </DropdownMenuItem>
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
                      handleChatAction('chat_details', chat);
                    }}>
                      <Info className="w-4 h-4 mr-2" />
                      {t('actions.chatDetails')}
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              </div>
            </div>
            
            <div className="flex items-center gap-1 mb-1">
                {chat.last_message && chat.last_message.sender_type === 'agent' && (
                  <MessageStatus 
                    status={chat.last_message.status === 'deleted' ? 'failed' : 
                            chat.last_message.status === 'pending' ? 'pending' : 
                            chat.last_message.status === 'sent' ? 'sent' : 
                            chat.last_message.status === 'delivered' ? 'delivered' : 
                            chat.last_message.status === 'read' ? 'read' : 'failed'} 
                    errorMessage={chat.last_message.error_message}
                  />
                )}
                <div className="flex-1 min-w-0 flex items-center gap-2">
                  {chat.last_message && chat.last_message.type !== 'text' && (
                    <div className="flex-shrink-0 text-gray-400 dark:text-gray-500">
                      {getMessageTypeIcon(chat.last_message.type)}
                    </div>
                  )}
                  <div className="text-sm text-gray-600 dark:text-gray-300 truncate">
                    {chat.last_message && chat.last_message.type === 'text' ? (
                      <MarkdownRenderer 
                        content={chat.last_message.content || t(`chats:messageTypes.text`)}
                        variant="compact"
                      />
                    ) : chat.last_message?.type ? (
                      t(`messageTypes.${chat.last_message?.type}`)
                    ) : chat.metadata?.last_message && chat.metadata.last_message.type === 'reaction' ? (
                      <span className="flex items-center gap-1 text-gray-500 dark:text-gray-400">
                        <span className="text-xs flex items-center gap-1">
                          {t('reactedWith')} {chat.metadata.last_message.reaction}
                          {chat.metadata.last_message.message_type && (
                            <>
                              {' '}{t('in')}{' '}
                              {chat.metadata.last_message.message_type === 'text' && chat.metadata.last_message.message_content ? (
                                <span className="italic">"{chat.metadata.last_message.message_content.length > 30 
                                  ? chat.metadata.last_message.message_content.substring(0, 30) + '...'
                                  : chat.metadata.last_message.message_content}"</span>
                              ) : (
                                <span className="flex items-center gap-1 italic">
                                  {getMessageTypeIcon(chat.metadata.last_message.message_type, "w-3 h-3")}
                                  {t(`messageTypes.${chat.metadata.last_message.message_type}`)}
                                </span>
                              )}
                            </>
                          )}
                        </span>
                      </span>
                    ) : chat.metadata?.last_message && chat.metadata.last_message.type === 'deleted' ? (
                      <span className="flex items-center gap-1 text-gray-500 dark:text-gray-400 italic">
                         <Ban className="w-3 h-3" />
                         <span>{t('messageStatus.deleted')}</span>
                      </span>
                    ) : (
                      t('noMessages')
                    )}
                  </div>
                </div>
                {(chat.unread_count || 0) > 0 && (
                  <span className="flex-shrink-0 px-1.5 py-0.5 text-xs font-medium rounded-full bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200">
                    {chat.unread_count}
                  </span>
                )}
              </div>
            
            <div className="flex items-center gap-1.5 flex-wrap">
              <div className="flex items-center gap-1.5">
                {getStatusBadge(chat)}
                {chat.team?.name && (
                  <CustomTooltip 
                    content={chat.team.name}
                    color={getTeamColor(chat.team.name)}
                  >
                    <span 
                      className="px-2 py-1 text-xs font-medium rounded-full text-white"
                      style={{ 
                        backgroundColor: getTeamColor(chat.team.name),
                      }}
                    >
                      {getTeamInitials(chat.team.name)}
                    </span>
                  </CustomTooltip>
                )}
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

      {showDetails && (
        <ChatDetailsModal
          chatId={chat.id || ''}
          isOpen={showDetails}
          onClose={() => setShowDetails(false)}
        />
      )}

      {showEditCustomerModal && selectedCustomer && (
        <CustomerEditModal
          customer={selectedCustomer}
          onClose={handleCloseEditCustomerModal}
          onSuccess={handleCustomerEditSuccess}
        />
      )}

      {showTeamTransferModal && (
        <TeamTransferModal
          chatId={chat.id || ''}
          isOpen={showTeamTransferModal}
          onClose={() => setShowTeamTransferModal(false)}
          organizationId={chat.organization_id?.toString() || ''}
          currentTeamId={chat.team_id || ''}
          onTransfer={() => {
            if (onUpdateChat && chat.id) {
              // Recarregar os dados do chat após a transferência
              supabase
                .from('chats')
                .select('*')
                .eq('id', chat.id)
                .single()
                .then(({ data }) => {
                  if (data && onUpdateChat) {
                    onUpdateChat(chat.id, data);
                  }
                });
            }
          }}
        />
      )}

      {/* Modal de Mesclagem de Chats */}
      {showMergeModal && (
        <MergeChatModal
          sourceChatId={chat.id}
          customerId={chat.customer_id?.toString() || ''}
          isOpen={showMergeModal}
          onClose={() => setShowMergeModal(false)}
          onMergeComplete={handleMergeComplete}
        />
      )}

      {/* Modal de Transferência para Outro Cliente */}
      {showTransferCustomerModal && (
        <TransferChatToCustomerModal
          chat={chat}
          onClose={() => setShowTransferCustomerModal(false)}
          onTransferComplete={handleTransferCustomerComplete}
        />
      )}
    </>
  );
} 