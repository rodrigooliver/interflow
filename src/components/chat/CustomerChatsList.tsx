import React, { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { MessageSquare, User, Clock, Calendar, Check, CheckCheck, AlertCircle, Share2, X, GitMerge, MoreVertical, Info, Trash2 } from 'lucide-react';
import { formatDistanceToNow, format } from 'date-fns';
import { ptBR, enUS, es } from 'date-fns/locale';
import { Chat } from '../../types/database';
import { getChannelIcon } from '../../utils/channel';
import { ChatMessages } from './ChatMessages';
import { ChatDetailsModal } from './ChatDetailsModal';
import { MergeChatModal } from './MergeChatModal';
import { TransferChatToCustomerModal } from './TransferChatToCustomerModal';
import { useNavigate } from 'react-router-dom';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "../../components/ui/DropdownMenu";
import { toast } from 'react-hot-toast';
import api from '../../lib/api';
import { useAuthContext } from '../../contexts/AuthContext';

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
  onCloseModal?: () => void; // Callback opcional para fechar o modal pai
  onMergeChats?: (chatId: string) => void; // Callback opcional para mesclar chats
}

export function CustomerChatsList({
  chats: initialChats,
  loadingChats = false,
  errorMessage = '',
  organizationId,
  isModal = false,
  onCloseModal,
  onMergeChats
}: CustomerChatsListProps) {
  const { t, i18n } = useTranslation(['chats', 'common']);
  const navigate = useNavigate();
  const { currentOrganizationMember } = useAuthContext();
  
  // Estado local de chats
  const [chats, setChats] = useState<Chat[]>(initialChats);
  
  // Estados para o modal de chat
  const [selectedChatId, setSelectedChatId] = useState<string | null>(null);
  const [showChatModal, setShowChatModal] = useState(false);
  const [showChatDetailsModal, setShowChatDetailsModal] = useState(false);
  const [chatDetailsId, setChatDetailsId] = useState<string | null>(null);
  
  // Estado para o modal de mesclagem
  const [showMergeChatModal, setShowMergeChatModal] = useState(false);
  const [mergeChatId, setMergeChatId] = useState<string | null>(null);
  
  // Estado para o modal de transferência de chat
  const [showTransferChatModal, setShowTransferChatModal] = useState(false);
  const [transferChat, setTransferChat] = useState<Chat | null>(null);
  
  // Estado para confirmação de exclusão
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [chatToDelete, setChatToDelete] = useState<Chat | null>(null);
  const [deletingChat, setDeletingChat] = useState(false);
  
  // Estado para controlar os dropdowns abertos
  const [openDropdownId, setOpenDropdownId] = useState<string | null>(null);

  // Atualizar os chats locais quando os props mudarem
  useEffect(() => {
    setChats(initialChats);
  }, [initialChats]);

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

  // Função para iniciar a transferência de chat para outro cliente
  const handleTransferChatToCustomer = (e: React.MouseEvent, chat: Chat) => {
    e.preventDefault();
    e.stopPropagation();
    
    // Fechar o dropdown imediatamente
    setOpenDropdownId(null);
    
   // Iniciar o processo de transferência interno
   setTransferChat(chat);
   setShowTransferChatModal(true);
  };

  // Função para iniciar o processo de exclusão
  const handleDeleteChat = (e: React.MouseEvent, chat: Chat) => {
    e.preventDefault();
    e.stopPropagation();
    
    // Fechar o dropdown imediatamente
    setOpenDropdownId(null);
    
    // Configurar o chat para exclusão e mostrar confirmação
    setChatToDelete(chat);
    setShowDeleteConfirm(true);
  };

  // Função para confirmar a exclusão
  const confirmDeleteChat = async () => {
    if (!chatToDelete || !currentOrganizationMember) return;
    
    setDeletingChat(true);
    
    try {
      await api.delete(
        `/api/${currentOrganizationMember.organization.id}/chat/${chatToDelete.id}`
      );
      
      // Animar o chat sendo removido
      const chatElement = document.querySelector(`[data-chat-id="${chatToDelete.id}"]`);
      if (chatElement) {
        chatElement.classList.add('opacity-0', 'scale-95');
      }
      
      // Mostrar mensagem de sucesso
      toast.success(t('chats:delete.success', 'Atendimento excluído com sucesso'));
      
      const chatIdToDelete = chatToDelete.id;
      
      // Esperar a animação terminar antes de atualizar o estado
      setTimeout(() => {
        // Remover o chat do estado
        setChats(prevChats => prevChats.filter(chat => chat.id !== chatIdToDelete));
        
        // Notificar o componente pai se necessário
        if (onMergeChats) {
          onMergeChats(chatIdToDelete);
        }
        
        // Limpar os estados
        setShowDeleteConfirm(false);
        setChatToDelete(null);
      }, 300);
    } catch (error) {
      console.error('Erro ao excluir chat:', error);
      toast.error(t('chats:delete.error', 'Erro ao excluir atendimento'));
      
      // Limpar os estados em caso de erro
      setShowDeleteConfirm(false);
      setChatToDelete(null);
    } finally {
      setDeletingChat(false);
    }
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
      
      // Animar o chat sendo removido
      const chatElement = document.querySelector(`[data-chat-id="${details.sourceChatId}"]`);
      if (chatElement) {
        chatElement.classList.add('opacity-0', 'scale-95');
      }
      
      // Notificar o componente pai
      if (onMergeChats) {
        onMergeChats(details.sourceChatId);
      }
      
      // Mostrar mensagem de sucesso
      toast.success(t('chats:merge.successMessage', 'Atendimentos mesclados com sucesso'));
      
      // Esperar a animação terminar antes de atualizar o estado
      setTimeout(() => {
        // Atualizar o estado local
        setChats(prevChats => prevChats.filter(chat => chat.id !== details.sourceChatId));
        
        // Fechar o modal e resetar o estado
        setShowMergeChatModal(false);
        setMergeChatId(null);
      }, 300);
    } else {
      // Garantir que o dropdown esteja fechado mesmo em caso de falha
      setOpenDropdownId(null);
      
      // Fechar o modal em caso de erro, mas manter o estado para possível tentativa futura
      setShowMergeChatModal(false);
      
      // Exibir mensagem de erro
      toast.error(t('chats:merge.errorMessage', 'Não foi possível mesclar os atendimentos'));
    }
  };

  // Função para lidar com a conclusão da transferência
  const handleTransferComplete = () => {
    // Fechar todos os menus dropdown
    setOpenDropdownId(null);
    
    if (transferChat) {
      // Animar o chat sendo removido
      const chatElement = document.querySelector(`[data-chat-id="${transferChat.id}"]`);
      if (chatElement) {
        chatElement.classList.add('opacity-0', 'scale-95');
      }
      
      // Exibir mensagem de sucesso
      toast.success(t('chats:transfer.singleChatSuccess', 'Atendimento transferido com sucesso'));
      
      // Esperar a animação terminar antes de atualizar o estado
      setTimeout(() => {
        // Remover o chat transferido da lista
        setChats(prevChats => prevChats.filter(chat => chat.id !== transferChat.id));
        
        // Fechar o modal
        setShowTransferChatModal(false);
        setTransferChat(null);
      }, 300);
    } else {
      // Fechar o modal se não houver chat para transferir
      setShowTransferChatModal(false);
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
                      <DropdownMenuItem onClick={(e) => handleTransferChatToCustomer(e, chat)}>
                        <User className="w-4 h-4 mr-2" />
                        {t('actions.transferChatToCustomer', 'Transferir para outro cliente')}
                      </DropdownMenuItem>
                      <DropdownMenuItem 
                        onClick={(e) => handleDeleteChat(e, chat)}
                        className="text-red-600 dark:text-red-400 hover:text-red-700 dark:hover:text-red-300"
                      >
                        <Trash2 className="w-4 h-4 mr-2" />
                        {t('actions.deleteChat', 'Excluir atendimento')}
                      </DropdownMenuItem>
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

      {/* Modal de Transferência de Chat */}
      {showTransferChatModal && transferChat && (
        <TransferChatToCustomerModal
          chat={transferChat}
          onClose={() => {
            setShowTransferChatModal(false);
            setTransferChat(null);
          }}
          onTransferComplete={handleTransferComplete}
        />
      )}

      {/* Modal de confirmação de exclusão */}
      {showDeleteConfirm && chatToDelete && (
        <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex items-center justify-center p-4">
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow-xl w-full max-w-md">
            <div className="p-6">
              <h2 className="text-xl font-semibold text-gray-900 dark:text-white mb-4 flex items-center">
                <AlertCircle className="w-6 h-6 text-red-500 mr-2" />
                {t('chats:delete.confirmTitle', 'Excluir atendimento')}
              </h2>
              
              <p className="text-gray-600 dark:text-gray-300 mb-6">
                {t('chats:delete.confirmMessage', 'Tem certeza que deseja excluir este atendimento? Esta ação não pode ser desfeita.')}
              </p>
              
              <div className="flex justify-end space-x-3">
                <button
                  onClick={() => {
                    setShowDeleteConfirm(false);
                    setChatToDelete(null);
                  }}
                  disabled={deletingChat}
                  className="px-4 py-2 text-gray-700 dark:text-gray-300 bg-gray-100 dark:bg-gray-700 hover:bg-gray-200 dark:hover:bg-gray-600 rounded-lg transition-colors disabled:opacity-50"
                >
                  {t('common:cancel', 'Cancelar')}
                </button>
                <button
                  onClick={confirmDeleteChat}
                  disabled={deletingChat}
                  className="px-4 py-2 bg-red-600 text-white hover:bg-red-700 rounded-lg transition-colors disabled:opacity-50 flex items-center space-x-2"
                >
                  {deletingChat && <span className="animate-spin">
                    <svg className="w-4 h-4" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                    </svg>
                  </span>}
                  <span>{t('chats:delete.confirm', 'Excluir')}</span>
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  );
} 