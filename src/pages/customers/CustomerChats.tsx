import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { ArrowLeft, GitMerge } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { useAuthContext } from '../../contexts/AuthContext';
import { supabase } from '../../lib/supabase';
import { Chat } from '../../types/database';
import { Customer } from '../../types/database';
import { CustomerChatsList } from '../../components/chat/CustomerChatsList';
import { TransferAllChatsCustomerModal } from '../../components/chat/TransferAllChatsCustomerModal';
import { toast } from 'react-hot-toast';

export default function CustomerChats() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { t } = useTranslation(['customers', 'chats', 'common']);
  const { currentOrganizationMember } = useAuthContext();
  const [customer, setCustomer] = useState<Customer | null>(null);
  const [chats, setChats] = useState<Chat[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
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

  const handleTransferClick = (chat: Chat) => {
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

  const handleMergeChat = async (sourceChatId: string) => {
    try {
      // Atualizar localmente antes de fazer a requisição para uma experiência mais responsiva
      setChats(prevChats => prevChats.filter(chat => chat.id !== sourceChatId));
      
      // Depois atualiza a lista de chats do servidor de forma assíncrona
      await loadCustomerAndChats();
      
      // Mensagem de sucesso
      toast.success(t('chats:merge.successRefresh', 'Lista de atendimentos atualizada'));
    } catch (error) {
      console.error(`Error refreshing chats after merging chat ${sourceChatId}:`, error);
      toast.error(t('chats:merge.errorRefresh', 'Não foi possível atualizar a lista'));
      
      // Em caso de erro, recarrega os dados para garantir consistência
      loadCustomerAndChats();
    }
  };

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
          
          {/* Botão para transferir todos os chats */}
          {chats.length > 0 && (
            <button
              onClick={() => {
                // Usar o primeiro chat como referência para o modal
                setSelectedChat(chats[0]);
                setShowTransferModal(true);
              }}
              className="inline-flex items-center px-4 py-2 text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 rounded-md"
            >
              <GitMerge className="w-4 h-4 mr-2" />
              {t('chats:transfer.transferAll')}
            </button>
          )}
        </div>

        <CustomerChatsList 
          chats={chats}
          loadingChats={loading}
          errorMessage={error}
          organizationId={currentOrganizationMember?.organization.id || ''}
          isModal={false}
          onTransferChat={handleTransferClick}
          onMergeChats={handleMergeChat}
        />
      </div>

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