import { Pencil, X, MessageSquare } from 'lucide-react';
import { useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { Customer } from '../../types/database';
import { formatDistanceToNow } from 'date-fns';
import { useTranslation } from 'react-i18next';
import { ptBR, enUS, es } from 'date-fns/locale';
import { CRMStage } from '../../types/crm';
import { useState, useMemo } from 'react';
import { useAuthContext } from '../../contexts/AuthContext';
import { ChatMessages } from '../../components/chat/ChatMessages';
import { getChannelIcon } from '../../utils/channel';
import { useNavigate } from 'react-router-dom';

// Interface para o chat do cliente
interface CustomerChat {
  id: string;
  created_at: string;
  last_message_id?: string;
  external_id?: string;
  status?: 'pending' | 'in_progress' | 'closed' | 'await_closing';
  title: string;
  channel_details?: {
    id: string;
    name: string;
    type: string;
    
  };
  messages?: {
    id: string;
    content: string;
    created_at: string;
    sender_type: string;
  };
}

// Interface para as tags do cliente recebidas do banco de dados
interface CustomerDbTag {
  id: string;
  tag_id: string;
  tags: {
    id: string;
    name: string;
    color: string;
  };
}

// Interface para as tags processadas
interface CustomerTag {
  id: string;
  name: string;
  color: string;
}

// Tipo composto para cliente com estágio
type CustomerWithStage = Customer & {
  stage?: CRMStage;
  last_message?: {
    id: string;
    content: string;
    created_at: string;
    sender_type: string;
  };
  tags?: CustomerDbTag[] | CustomerTag[];
  chats?: CustomerChat[];
};

const locales = {
  pt: ptBR,
  en: enUS,
  es: es
};

interface KanbanCardProps {
  customer: CustomerWithStage;
  index: number;
  onEditCustomer: () => void;
  onRemove: () => void;
}

export function KanbanCard({ customer, index, onEditCustomer, onRemove }: KanbanCardProps) {
  const { t, i18n } = useTranslation(['common']);
  const { currentOrganizationMember } = useAuthContext();
  const navigate = useNavigate();
  
  // Estado para controlar a exibição do modal de chat
  const [showChatModal, setShowChatModal] = useState(false);
  const [selectedChatId, setSelectedChatId] = useState<string | null>(null);
  
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging
  } = useSortable({
    id: customer.id,
    data: {
      index,
      stageId: customer.stage_id
    }
  });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
    overflow: 'scroll',
  };

  // Extrair o último chat, a última mensagem e o external_id
  const { lastMessage, lastChatId, externalId, channelType, channelName, chatStatus, chatTitle } = useMemo(() => {
    let lastMessage = customer.last_message; // Compatibilidade com a implementação anterior
    let lastChatId = null;
    let externalId = null;
    let channelType = null;
    let channelName = null;
    let chatStatus = null;
    let chatTitle = null;
    
    // Se temos o array de chats, extraímos diretamente
    if (customer.chats && customer.chats.length > 0) {
      // Ordenar os chats pela data de criação (mais recente primeiro)
      const sortedChats = [...customer.chats]
        .sort((a, b) => {
          const dateA = new Date(a.created_at).getTime();
          const dateB = new Date(b.created_at).getTime();
          return dateB - dateA;
        });
      
      // Pegar o chat mais recente que tenha uma mensagem
      const recentChatWithMessage = sortedChats.find(
        (chat) => chat.messages && chat.last_message_id
      );
      
      if (recentChatWithMessage) {
        lastChatId = recentChatWithMessage.id;
        externalId = recentChatWithMessage.external_id;
        channelType = recentChatWithMessage.channel_details?.type;
        channelName = recentChatWithMessage.channel_details?.name;
        chatStatus = recentChatWithMessage.status;
        chatTitle = recentChatWithMessage.title;
        
        if (recentChatWithMessage.messages) {
          lastMessage = recentChatWithMessage.messages;
        }
      }
    }
    
    return { lastMessage, lastChatId, externalId, channelType, channelName, chatStatus, chatTitle };
  }, [customer.chats, customer.last_message]);

  // Processar as tags do cliente
  const processedTags = useMemo(() => {
    if (!customer.tags || customer.tags.length === 0) {
      return [];
    }

    // Verificar se as tags já estão no formato processado
    const firstTag = customer.tags[0];
    
    // Se já estiver no formato processado (CustomerTag[]), retorna como está
    if ('name' in firstTag) {
      return customer.tags as CustomerTag[];
    }
    
    // Caso contrário, processa do formato do banco de dados (CustomerDbTag[])
    return (customer.tags as CustomerDbTag[])
      .filter(tagRelation => tagRelation.tags) // Garantir que a tag existe
      .map(tagRelation => ({
        id: tagRelation.tags.id,
        name: tagRelation.tags.name,
        color: tagRelation.tags.color
      }));
  }, [customer.tags]);

  // Formatar a última mensagem
  const formattedLastMessage = useMemo(() => {
    if (!lastMessage) return null;
    
    const currentLocale = locales[i18n.language as keyof typeof locales] || locales.en;
    
    try {
      const timeAgo = formatDistanceToNow(new Date(lastMessage.created_at), { 
        addSuffix: true,
        locale: currentLocale
      });
      
      // Limitar o tamanho da mensagem
      const truncatedContent = lastMessage.content.length > 30 
        ? `${lastMessage.content.substring(0, 30)}...` 
        : lastMessage.content;
      
      return {
        content: truncatedContent,
        timeAgo,
        senderType: lastMessage.sender_type
      };
    } catch (error) {
      console.error('Error formatting date:', error);
      return null;
    }
  }, [lastMessage, i18n.language]);

  // Função para abrir o modal de chat
  const handleChatClick = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    
    if (lastChatId) {
      setSelectedChatId(lastChatId);
      setShowChatModal(true);
    }
  };

  // Função para fechar o modal de chat
  const handleCloseChatModal = () => {
    setShowChatModal(false);
    setSelectedChatId(null);
  };

  // Função para expandir o chat em uma nova página
  const handleExpandChat = (chatId: string) => {
    navigate(`/app/chats/${chatId}`);
  };

  return (
    <div
      ref={setNodeRef}
      style={style}
      {...attributes}
      {...listeners}
      className="bg-white dark:bg-gray-800 p-3 rounded-md shadow-sm border border-gray-200 dark:border-gray-700 mb-2 cursor-grab"
      data-id={customer.id}
      data-card="true"
    >
      <div className="flex justify-between items-start">
        <div className="flex-1 min-w-0">
          <h3 className="font-medium text-gray-900 dark:text-white truncate">
            {customer.name}
          </h3>
        </div>
        <div className="flex space-x-1 flex-shrink-0">
          <button
            onClick={onEditCustomer}
            className="text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-300"
          >
            <Pencil className="w-4 h-4" />
          </button>
          <button
            onClick={onRemove}
            className="text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-300"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      </div>

      <div className="space-y-1 mt-2">
        {externalId ? (
          <div className="flex items-center text-sm text-gray-500 dark:text-gray-400">
            {channelType && (
              <img 
                src={getChannelIcon(channelType || 'whatsapp_official')} 
                alt="Canal" 
                className="w-4 h-4 mr-2 opacity-70"
              />
            )}
            <code className="bg-gray-50 dark:bg-gray-700 px-1.5 py-0.5 rounded border border-gray-200 dark:border-gray-600 text-xs">
              {externalId}
            </code>
            {channelName && (
              <span className="ml-1 text-xs bg-gray-100 dark:bg-gray-700 px-1 py-0.5 rounded">
                {channelName}
              </span>
            )}
          </div>
        ) : (
          <div className="flex items-center text-sm text-gray-400 dark:text-gray-500 italic">
            <MessageSquare className="w-4 h-4 mr-2 opacity-50" />
            {t('common:noConversation', 'Sem conversas recentes')}
          </div>
        )}
      </div>

      {formattedLastMessage && (
        <div 
          className="mt-2 p-2 bg-gray-50 dark:bg-gray-700 rounded text-sm cursor-pointer hover:bg-gray-100 dark:hover:bg-gray-600 transition-colors"
          onClick={handleChatClick}
        >
          <div className="flex items-center">
            <MessageSquare className="w-4 h-4 mr-2 text-gray-500 dark:text-gray-400 flex-shrink-0" />
            <p className="text-gray-700 dark:text-gray-300 truncate">
                {chatTitle ?? formattedLastMessage.content}
            </p>
          </div>
        </div>
      )}

      {(chatStatus || processedTags.length > 0) && (
        <div className="flex flex-wrap gap-1 mt-2">
          {chatStatus && (
            <span 
              className={`text-xs px-1.5 py-0.5 rounded-full flex-shrink-0 ${
                chatStatus === 'in_progress' 
                  ? 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400' 
                  : chatStatus === 'pending' 
                  ? 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-400'
                  : chatStatus === 'await_closing'
                  ? 'bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-400'
                  : 'bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-400'
              }`}
            >
              {chatStatus === 'in_progress' 
                ? t('common:inProgress', 'Em andamento') 
                : chatStatus === 'pending' 
                ? t('common:pending', 'Pendente')
                : chatStatus === 'await_closing'
                ? t('common:awaiting', 'Aguardando')
                : t('common:closed', 'Fechado')}
            </span>
          )}
          {processedTags.map((tag) => (
            <div 
              key={tag.id}
              className="px-1.5 py-0.5 rounded-full text-xs"
              style={{ 
                backgroundColor: `${tag.color || '#3B82F6'}20`, // 20% opacity
                color: tag.color || '#3B82F6',
                border: `1px solid ${tag.color || '#3B82F6'}`
              }}
            >
              {tag.name}
            </div>
          ))}
        </div>
      )}
      
      {/* Modal para exibir o chat */}
      {showChatModal && selectedChatId && currentOrganizationMember && (
        <div className="fixed inset-0 bg-black bg-opacity-50 z-[60] flex items-center justify-center p-4">
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow-xl w-full max-w-5xl h-[90vh] flex flex-col overflow-hidden">
            <div className="flex justify-between items-center p-4 border-b border-gray-200 dark:border-gray-700">
              <h2 className="text-lg font-medium text-gray-900 dark:text-white flex items-center">
                <MessageSquare className="w-5 h-5 mr-2 text-blue-500" />
                {t('common:customerChat', 'Atendimento do Cliente')}
              </h2>
              <div className="flex items-center space-x-2">
                <button 
                  onClick={() => handleExpandChat(selectedChatId)}
                  className="text-gray-500 hover:text-blue-600 dark:text-gray-400 dark:hover:text-blue-400 p-1.5 rounded-full hover:bg-gray-100 dark:hover:bg-gray-700"
                  title={t('common:expandChat', 'Expandir conversa')}
                >
                  <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="lucide lucide-expand">
                    <path d="m21 21-6-6m6 6v-4.8m0 4.8h-4.8"></path>
                    <path d="M3 16.2V21m0 0h4.8M3 21l6-6"></path>
                    <path d="M21 7.8V3m0 0h-4.8M21 3l-6 6"></path>
                    <path d="M3 7.8V3m0 0h4.8M3 3l6 6"></path>
                  </svg>
                </button>
                <button 
                  onClick={handleCloseChatModal}
                  className="text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-300"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>
            </div>
            <div className="flex-1 relative chat-modal-wrapper overflow-hidden">
              <div className="absolute inset-0 flex flex-col h-full">
                <ChatMessages 
                  chatId={selectedChatId} 
                  organizationId={currentOrganizationMember.organization.id} 
                  onBack={handleCloseChatModal}
                />
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}