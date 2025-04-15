import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { ArrowLeft, MessageSquare, User, Clock, Calendar, Check, CheckCheck, AlertCircle, Share2, X, GitMerge } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { useAuthContext } from '../../contexts/AuthContext';
import { supabase } from '../../lib/supabase';
import { formatDistanceToNow, format } from 'date-fns';
import { ptBR, enUS, es } from 'date-fns/locale';
import { Chat } from '../../types/database';
import { Customer } from '../../types/database';
import { getChannelIcon } from '../../utils/channel';
import { ChatMessages } from '../../components/chat/ChatMessages';
import { TransferAllChatsCustomerModal } from '../../components/chat/TransferAllChatsCustomerModal';
import { toast } from 'react-hot-toast';

const locales = {
  pt: ptBR,
  en: enUS,
  es: es
};

export default function CustomerChats() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { t, i18n } = useTranslation(['customers', 'chats', 'common']);
  const { currentOrganizationMember } = useAuthContext();
  const [customer, setCustomer] = useState<Customer | null>(null);
  const [chats, setChats] = useState<Chat[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [selectedChatId, setSelectedChatId] = useState<string | null>(null);
  const [showChatModal, setShowChatModal] = useState(false);
  const [showTransferModal, setShowTransferModal] = useState(false);
  const [selectedChat, setSelectedChat] = useState<Chat | null>(null);

  useEffect(() => {
    if (currentOrganizationMember && id) {
      loadCustomerAndChats();
    }
  }, [currentOrganizationMember, id]);

  async function loadCustomerAndChats() {
    try {
      // Load customer details
      const { data: customerData, error: customerError } = await supabase
        .from('customers')
        .select('*')
        .eq('id', id)
        .single();

      if (customerError) throw customerError;
      setCustomer(customerData);

      // Load customer's chats with assigned agent details, last message, and channel details
      const { data: chatsData, error: chatsError } = await supabase
        .from('chats')
        .select(`
          *,
          assigned_agent:profiles(
            full_name,
            email
          ),
          last_message:messages!chats_last_message_id_fkey(
            content,
            status,
            error_message,
            created_at
          ),
          channel_details:chat_channels(
            id,
            name,
            type
          ),
          team:service_teams!inner(
            id,
            name,
            members:service_team_members!inner(
              id,
              user_id
            )
          )
        `)
        .eq('customer_id', id)
        .eq('team.members.user_id', currentOrganizationMember?.profile_id)
        .order('created_at', { ascending: false });
        console.log(currentOrganizationMember?.profile_id);

      if (chatsError) throw chatsError;

      // Processar os chats para manter a estrutura existente
      const processedChats = (chatsData || []).map(chat => ({
        ...chat,
        last_message: chat.last_message ? {
          content: chat.last_message.content,
          status: chat.last_message.status,
          error_message: chat.last_message.error_message,
          created_at: chat.last_message.created_at
        } : undefined
      }));

      setChats(processedChats);
    } catch (error) {
      console.error('Error loading customer chats:', error);
      setError(t('common:error'));
    } finally {
      setLoading(false);
    }
  }

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'pending':
        return <Clock className="w-4 h-4 text-gray-400" />;
      case 'sent':
        return <Check className="w-4 h-4" />;
      case 'delivered':
        return <CheckCheck className="w-4 h-4" />;
      case 'read':
        return <CheckCheck className="w-4 h-4 text-blue-400" />;
      case 'failed':
        return <AlertCircle className="w-4 h-4 text-red-500" />;
      default:
        return null;
    }
  };

  const handleChatClick = (e: React.MouseEvent, chatId: string) => {
    e.preventDefault();
    setSelectedChatId(chatId);
    setShowChatModal(true);
  };

  const handleCloseModal = () => {
    setShowChatModal(false);
    setSelectedChatId(null);
  };

  const handleTransferClick = (e: React.MouseEvent, chat: Chat) => {
    e.preventDefault();
    e.stopPropagation();
    setSelectedChat(chat);
    setShowTransferModal(true);
  };

  const handleTransfer = async () => {
    if (!customer) return;

    try {
      // Atualizar a lista de chats
      await loadCustomerAndChats();
      setShowTransferModal(false);
      setSelectedChat(null);
    } catch (error) {
      console.error('Error after transfer:', error);
      toast.error(t('chats:transfer.error'));
    }
  };

  // Adicionamos um estilo para o modal
  useEffect(() => {
    // Adicionar estilo para esconder o botão de voltar no modal
    if (showChatModal) {
      const style = document.createElement('style');
      style.id = 'chat-modal-style';
      style.innerHTML = `
        .chat-modal-wrapper [aria-label="Voltar para a lista"] {
          display: none !important;
        }
        .chat-modal-wrapper [aria-label="Voltar para a lista de atendimentos"] {
          display: none !important;
        }
        .chat-modal-wrapper [aria-label="backToList"] {
          display: none !important;
        }
        .chat-modal-wrapper .border-b.border-gray-200 {
          border-top: none !important;
        }
        .chat-modal-wrapper {
          padding-top: 0 !important;
        }
      `;
      document.head.appendChild(style);
    }
    
    // Limpar o estilo quando o modal for fechado
    return () => {
      const existingStyle = document.getElementById('chat-modal-style');
      if (existingStyle) {
        existingStyle.remove();
      }
    };
  }, [showChatModal]);

  if (loading) {
    return (
      <div className="p-6">
        <div className="flex justify-center items-center min-h-[200px]">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
        </div>
      </div>
    );
  }

  if (!customer) {
    return (
      <div className="p-6">
        <div className="text-center text-gray-500 dark:text-gray-400">
          {t('customers:notFound')}
        </div>
      </div>
    );
  }

  return (
    <div className="p-6">
      <div className="max-w-7xl mx-auto">
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center">
            <button
              onClick={() => navigate(-1)}
              className="mr-4 text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300"
            >
              <ArrowLeft className="w-5 h-5" />
            </button>
            <div>
              <h1 className="text-2xl font-bold text-gray-900 dark:text-white">
                {customer.name}
              </h1>
              <p className="text-sm text-gray-500 dark:text-gray-400">
                {customer.contacts?.find(c => c.type === 'email')?.value || 
                 customer.contacts?.find(c => c.type === 'whatsapp')?.value}
              </p>
            </div>
          </div>
        </div>

        {error ? (
          <div className="bg-red-50 dark:bg-red-900/50 text-red-600 dark:text-red-400 p-4 rounded-lg">
            {error}
          </div>
        ) : chats.length === 0 ? (
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6 text-center">
            <MessageSquare className="w-12 h-12 text-gray-400 dark:text-gray-500 mx-auto mb-4" />
            <p className="text-gray-500 dark:text-gray-400">
              {t('chats:emptyState.title')}
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {chats.map((chat) => (
              <div
                key={chat.id}
                onClick={(e) => handleChatClick(e, chat.id)}
                className="block bg-white dark:bg-gray-800 rounded-lg shadow hover:shadow-md transition-shadow border border-gray-100 dark:border-gray-700 cursor-pointer"
              >
                <div className="p-4">
                  {/* Cabeçalho do atendimento com status e data */}
                  <div className="flex items-center justify-between mb-3">
                    <div className="flex items-center space-x-3">
                      <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                        chat.status === 'in_progress'
                          ? 'bg-green-100 text-green-800 dark:bg-green-900/50 dark:text-green-400'
                          : chat.status === 'closed' || chat.status === 'await_closing'
                            ? 'bg-gray-100 text-gray-800 dark:bg-gray-900/50 dark:text-gray-400'
                            : 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/50 dark:text-yellow-400'
                      }`}>
                        {t(`chats:status.${chat.status}`)}
                      </span>
                      <span className="text-xs text-gray-500 dark:text-gray-400">
                        {format(new Date(chat.created_at), "dd/MM/yyyy 'às' HH:mm", { locale: locales[i18n.language as keyof typeof locales] || enUS })}
                      </span>
                    </div>
                    <div className="flex items-center space-x-2">
                      {chat.last_message?.status && getStatusIcon(chat.last_message.status)}
                      <span className="text-xs text-gray-500 dark:text-gray-400">
                        {formatDistanceToNow(new Date(chat.created_at), {
                          addSuffix: true,
                          locale: locales[i18n.language as keyof typeof locales] || enUS
                        })}
                      </span>
                    </div>
                  </div>
                  
                  {/* Título do atendimento */}
                  <div className="mb-2">
                    <h4 className="text-sm font-medium text-gray-900 dark:text-white flex items-center">
                      <MessageSquare className="w-4 h-4 mr-1.5 text-blue-500" />
                      {chat.title || t('chats:untitledConversation', 'Atendimento sem título')} 
                      <span className="ml-2 text-xs text-gray-500 dark:text-gray-400 flex items-center">
                        #{chat.ticket_number}
                      </span>
                    </h4>
                    <div className="flex flex-wrap items-center mt-1.5 text-xs text-gray-500 dark:text-gray-400 gap-2">
                      {chat.channel_details && (
                        <div className="flex items-center bg-gray-100 dark:bg-gray-700 px-1.5 py-0.5 rounded">
                          <Share2 className="w-3.5 h-3.5 mr-1 text-gray-500 dark:text-gray-400" />
                          <span className="font-medium">{chat.channel_details.name}</span>
                        </div>
                      )}
                      {chat.external_id && (
                        <div className="flex items-center text-xs text-gray-400 dark:text-gray-500">
                          <img 
                            src={getChannelIcon(chat.channel_details?.type || 'whatsapp_official')} 
                            alt="Canal" 
                            className="w-3.5 h-3.5 mr-1"
                          />
                          <code className="bg-gray-50 dark:bg-gray-800 px-1.5 py-0.5 rounded border border-gray-200 dark:border-gray-700 text-gray-600 dark:text-gray-300 text-xs">
                            {chat.external_id}
                          </code>
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Conteúdo da última mensagem */}
                  <div className="mt-2">
                    <div className="flex-1">
                      {chat.last_message ? (
                        <div className="bg-gray-50 dark:bg-gray-700/50 rounded p-2 text-sm text-gray-600 dark:text-gray-300 line-clamp-2 italic">
                          {chat.last_message.content}
                        </div>
                      ) : (
                        <div className="bg-gray-50 dark:bg-gray-700/50 rounded p-2 text-sm text-gray-500 dark:text-gray-400 italic">
                          {t('chats:noMessages', 'Sem mensagens')}
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Rodapé com informações adicionais */}
                  <div className="mt-3 flex flex-wrap items-center justify-between text-xs text-gray-500 dark:text-gray-400">
                    <div className="flex items-center space-x-3">
                      {chat.start_time && (
                        <div className="flex items-center">
                          <Clock className="w-3 h-3 mr-1" />
                          {t('chats:time.start')}: {format(new Date(chat.start_time), "HH:mm")}
                        </div>
                      )}
                      {chat.end_time && (
                        <div className="flex items-center">
                          <Calendar className="w-3 h-3 mr-1" />
                          {t('chats:time.end')}: {format(new Date(chat.end_time), "HH:mm")}
                        </div>
                      )}
                    </div>
                    
                    <div className="flex items-center space-x-3 mt-2 sm:mt-0">
                      {chat.assigned_agent && (
                        <div className="flex items-center">
                          <User className="w-3 h-3 mr-1" />
                          {t('chats:assignedTo', 'Atendente')}: {chat.assigned_agent.full_name}
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Adicionar botão de transferência */}
                  <div className="absolute top-4 right-4">
                    <button
                      onClick={(e) => handleTransferClick(e, chat)}
                      className="p-2 text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-300"
                      title={t('chats:transfer.title')}
                    >
                      <GitMerge className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Modal para exibir o chat */}
      {showChatModal && selectedChatId && (
        <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex items-center justify-center p-4">
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow-xl w-full max-w-5xl h-[90vh] flex flex-col overflow-hidden">
            <div className="flex justify-between items-center p-4 border-b border-gray-200 dark:border-gray-700">
              <h2 className="text-lg font-medium text-gray-900 dark:text-white flex items-center">
                <MessageSquare className="w-5 h-5 mr-2 text-blue-500" />
                {chats.find(chat => chat.id === selectedChatId)?.title || t('chats:viewChat', 'Visualizar Atendimento')}
                {selectedChatId && (
                  <span className="ml-2 text-sm text-gray-500 dark:text-gray-400">
                    #{chats.find(chat => chat.id === selectedChatId)?.ticket_number}
                  </span>
                )}
              </h2>
              <button 
                onClick={handleCloseModal}
                className="text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-300"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            <div className="flex-1 relative chat-modal-wrapper overflow-hidden">
              <div className="absolute inset-0 flex flex-col h-full">
                <ChatMessages 
                  chatId={selectedChatId} 
                  organizationId={currentOrganizationMember?.organization.id || ''} 
                  onBack={handleCloseModal}
                />
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Modal de transferência */}
      {showTransferModal && selectedChat && (
        <TransferAllChatsCustomerModal
          chat={selectedChat}
          onClose={() => {
            setShowTransferModal(false);
            setSelectedChat(null);
          }}
          onTransfer={handleTransfer}
        />
      )}
    </div>
  );
}