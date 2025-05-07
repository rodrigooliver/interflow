import React, { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { MessageSquare, User, Clock, Calendar, Check, CheckCheck, AlertCircle, Share2, X, GitMerge, MoreVertical, Info } from 'lucide-react';
import { formatDistanceToNow, format } from 'date-fns';
import { ptBR, enUS, es } from 'date-fns/locale';
import { Chat } from '../../types/database';
import { getChannelIcon } from '../../utils/channel';
import { ChatMessages } from './ChatMessages';
import { ChatDetailsModal } from './ChatDetailsModal';
import { MergeChatModal } from './MergeChatModal';
import { useNavigate } from 'react-router-dom';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "../../components/ui/DropdownMenu";
import { toast } from 'react-hot-toast';

// Interface para os locales de formatação de data
const locales = {
  pt: ptBR,
  en: enUS,
  es: es
};

export interface CustomerChatsListProps {
  chats: Chat[];
  loadingChats?: boolean;
  errorMessage?: string;
  organizationId: string;
  isModal?: boolean; // Define se está sendo exibido em um modal ou página completa
  onTransferChat?: (chat: Chat) => void; // Callback opcional para transferência de chat
  onCloseModal?: () => void; // Callback opcional para fechar o modal pai
  onMergeChats?: (chatId: string) => void; // Callback opcional para mesclar chats
}

export function CustomerChatsList({
  chats,
  loadingChats = false,
  errorMessage = '',
  organizationId,
  isModal = false,
  onTransferChat,
  onCloseModal,
  onMergeChats
}: CustomerChatsListProps) {
  const { t, i18n } = useTranslation(['chats', 'common']);
  const navigate = useNavigate();
  
  // Estados para o modal de chat
  const [selectedChatId, setSelectedChatId] = useState<string | null>(null);
  const [showChatModal, setShowChatModal] = useState(false);
  const [showChatDetailsModal, setShowChatDetailsModal] = useState(false);
  const [chatDetailsId, setChatDetailsId] = useState<string | null>(null);
  
  // Estado para o modal de mesclagem
  const [showMergeChatModal, setShowMergeChatModal] = useState(false);
  const [mergeChatId, setMergeChatId] = useState<string | null>(null);
  
  // Estado para controlar os dropdowns abertos
  const [openDropdownId, setOpenDropdownId] = useState<string | null>(null);

  // Função para obter o ícone de status da mensagem
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

  // Função para abrir o modal de chat
  const handleChatClick = (e: React.MouseEvent, chatId: string) => {
    e.preventDefault();
    setSelectedChatId(chatId);
    setShowChatModal(true);
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

  // Função para abrir o modal de detalhes do chat
  const handleViewChatDetails = (e: React.MouseEvent, chatId: string) => {
    e.preventDefault();
    e.stopPropagation();
    
    // Fechar o dropdown
    setOpenDropdownId(null);
    
    setChatDetailsId(chatId);
    setShowChatDetailsModal(true);
  };

  // Função para iniciar o processo de mesclagem de chats
  const handleMergeChats = (e: React.MouseEvent, chatId: string) => {
    e.preventDefault();
    e.stopPropagation();
    
    // Fechar o dropdown imediatamente
    setOpenDropdownId(null);
    
    // Iniciar o processo de mesclagem
    setMergeChatId(chatId);
    setShowMergeChatModal(true);
  };

  // Função para lidar com a conclusão da mesclagem
  const handleMergeComplete = (details: { 
    sourceChatId: string; 
    targetChatId: string;
    success: boolean;
  }) => {
    if (details.success) {
      // Garantir que o dropdown esteja fechado
      setOpenDropdownId(null);
      
      // Importante: Devemos usar uma técnica de mutação de estado para que React detecte a mudança
      // Criar uma referência distinta para force o re-render
      const updatedChats = chats.filter(chat => chat.id !== details.sourceChatId);
      
      // Se o callback onMergeChats foi fornecido, chamá-lo com os detalhes
      if (onMergeChats) {
        onMergeChats(details.sourceChatId);
      }
      
      // Fechar o modal e resetar o estado
      setShowMergeChatModal(false);
      setMergeChatId(null);
      
      // Exibir mensagem de sucesso
      toast.success(t('chats:merge.successMessage', 'Atendimentos mesclados com sucesso'));
      
      // A grande diferença está aqui: vamos atualizar diretamente o DOM
      // Procurar o elemento do chat que deve ser removido
      const chatElement = document.querySelector(`[data-chat-id="${details.sourceChatId}"]`);
      if (chatElement) {
        chatElement.classList.add('opacity-0', 'scale-95');
        setTimeout(() => {
          chatElement.classList.add('hidden');
        }, 300);
      }
    } else {
      // Garantir que o dropdown esteja fechado mesmo em caso de falha
      setOpenDropdownId(null);
      
      // Fechar o modal em caso de erro, mas manter o estado para possível tentativa futura
      setShowMergeChatModal(false);
      
      // Exibir mensagem de erro
      toast.error(t('chats:merge.errorMessage', 'Não foi possível mesclar os atendimentos'));
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

  // Efeito para gerenciar o ciclo de vida do menu dropdown
  useEffect(() => {
    // Fechar todos os dropdowns quando a lista de chats mudar
    setOpenDropdownId(null);
    
    // Fechar todos os dropdowns quando o componente for desmontado
    return () => {
      setOpenDropdownId(null);
    };
  }, [chats]);

  // Renderização do componente
  if (loadingChats) {
    return (
      <div className="flex justify-center items-center min-h-[200px]">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  if (errorMessage) {
    return (
      <div className="bg-red-50 dark:bg-red-900/50 text-red-600 dark:text-red-400 p-4 rounded-lg">
        {errorMessage}
      </div>
    );
  }

  if (chats.length === 0) {
    return (
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6 text-center">
        <MessageSquare className="w-12 h-12 text-gray-400 dark:text-gray-500 mx-auto mb-4" />
        <p className="text-gray-500 dark:text-gray-400">
          {t('chats:emptyState.title')}
        </p>
      </div>
    );
  }

  // Determinar o layout com base no tipo de exibição (modal ou página completa)
  const containerClass = isModal
    ? "space-y-4" // Layout vertical para modal
    : "grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4"; // Layout em grid para página completa

  return (
    <>
      {/* Cabeçalho opcional para o modo modal */}
      {isModal && (
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-sm font-medium text-gray-700 dark:text-gray-300">
            {t('chats:history', 'Histórico de Atendimentos')} ({chats.length})
          </h3>
        </div>
      )}

      {/* Lista de chats */}
      <div className={`${containerClass} transition-all duration-500`}>
        {chats.map((chat) => (
          <div
            key={chat.id}
            data-chat-id={chat.id}
            onClick={(e) => handleChatClick(e, chat.id)}
            className="block bg-white dark:bg-gray-800 rounded-lg shadow hover:shadow-md transition-shadow border border-gray-100 dark:border-gray-700 cursor-pointer relative transition-all duration-300"
          >
            <div className="p-4">
              {/* Cabeçalho do atendimento com status e data */}
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center space-x-3">
                  <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium truncate ${
                    chat.status === 'in_progress'
                      ? 'bg-green-100 text-green-800 dark:bg-green-900/50 dark:text-green-400'
                      : chat.status === 'closed' || chat.status === 'await_closing'
                        ? 'bg-gray-100 text-gray-800 dark:bg-gray-900/50 dark:text-gray-400'
                        : 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/50 dark:text-yellow-400'
                  }`}>
                    {t(`chats:status.${chat.status}`)}
                  </span>
                  <span className="text-xs text-gray-500 dark:text-gray-400 truncate">
                    {format(new Date(chat.created_at), "dd/MM/yyyy 'às' HH:mm", { locale: locales[i18n.language as keyof typeof locales] || enUS })}
                  </span>
                </div>
                <div className="flex items-center space-x-2">
                  {chat.last_message?.status && getStatusIcon(chat.last_message.status)}
                  <span className="text-xs text-gray-500 dark:text-gray-400 truncate">
                    {formatDistanceToNow(new Date(chat.created_at), {
                      addSuffix: true,
                      locale: locales[i18n.language as keyof typeof locales] || enUS
                    })}
                  </span>
                  <DropdownMenu open={openDropdownId === chat.id} onOpenChange={(open) => {
                    setOpenDropdownId(open ? chat.id : null);
                  }}>
                    <DropdownMenuTrigger asChild>
                      <button 
                        className="p-1 hover:bg-gray-100 dark:hover:bg-gray-700 rounded"
                        onClick={(e) => e.stopPropagation()}
                      >
                        <MoreVertical className="w-4 h-4 text-gray-500 dark:text-gray-400" />
                      </button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end">
                      <DropdownMenuItem onClick={(e) => handleMergeChats(e, chat.id)}>
                        <GitMerge className="w-4 h-4 mr-2" />
                        {t('actions.mergeChats', 'Mesclar com outro chat')}
                      </DropdownMenuItem>
                      <DropdownMenuItem onClick={(e) => handleViewChatDetails(e, chat.id)}>
                        <Info className="w-4 h-4 mr-2" />
                        {t('actions.chatDetails', 'Detalhes do atendimento')}
                      </DropdownMenuItem>
                      {onTransferChat && (
                        <DropdownMenuItem onClick={(e) => {
                          e.stopPropagation();
                          setOpenDropdownId(null);
                          onTransferChat(chat);
                        }}>
                          <GitMerge className="w-4 h-4 mr-2" />
                          {t('actions.transferChat', 'Transferir atendimento')}
                        </DropdownMenuItem>
                      )}
                    </DropdownMenuContent>
                  </DropdownMenu>
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
              <div className="flex items-start justify-between mt-2">
                <div className="flex-1 truncate">
                  {chat.last_message ? (
                    <div className="bg-gray-50 dark:bg-gray-700/50 rounded p-2 text-sm text-gray-600 dark:text-gray-300 line-clamp-2 italic truncate">
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
            </div>
          </div>
        ))}
      </div>

      {/* Modal para exibir o chat */}
      {showChatModal && selectedChatId && (
        <div className="fixed inset-0 bg-black bg-opacity-50 z-[60] flex items-center justify-center p-4">
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
              <div className="flex items-center space-x-2">
                <button 
                  onClick={() => handleExpandChat(selectedChatId)}
                  className="text-gray-500 hover:text-blue-600 dark:text-gray-400 dark:hover:text-blue-400 p-1.5 rounded-full hover:bg-gray-100 dark:hover:bg-gray-700"
                  title={t('chats:expandChat', 'Expandir conversa')}
                >
                  <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="lucide lucide-expand">
                    <path d="m21 21-6-6m6 6v-4.8m0 4.8h-4.8"></path>
                    <path d="M3 16.2V21m0 0h4.8M3 21l6-6"></path>
                    <path d="M21 7.8V3m0 0h-4.8M21 3l-6 6"></path>
                    <path d="M3 7.8V3m0 0h4.8M3 3l6 6"></path>
                  </svg>
                </button>
                <button 
                  onClick={() => {
                    handleCloseChatModal();
                    if (onCloseModal) {
                      onCloseModal();
                    }
                  }}
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
                  organizationId={organizationId}
                  onBack={handleCloseChatModal}
                />
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Modal de Detalhes do Chat */}
      {showChatDetailsModal && chatDetailsId && (
        <ChatDetailsModal 
          chatId={chatDetailsId}
          isOpen={showChatDetailsModal}
          onClose={() => {
            setShowChatDetailsModal(false);
            setChatDetailsId(null);
          }}
        />
      )}

      {/* Modal de Mesclagem de Chats */}
      {showMergeChatModal && mergeChatId && (
        <MergeChatModal
          sourceChatId={mergeChatId}
          customerId={chats.find(chat => chat.id === mergeChatId)?.customer_id?.toString() || ''}
          isOpen={showMergeChatModal}
          onClose={() => {
            setShowMergeChatModal(false);
            setMergeChatId(null);
          }}
          onMergeComplete={handleMergeComplete}
        />
      )}
    </>
  );
} 