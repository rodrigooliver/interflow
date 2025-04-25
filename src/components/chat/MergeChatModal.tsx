import React, { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { Chat } from '../../types/database';
import { supabase } from '../../lib/supabase';
import { useAuthContext } from '../../contexts/AuthContext';
import { Search, Loader2, MessageSquare, GitMerge, AlertTriangle } from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "../../components/ui/Dialog";
import { Button } from "../../components/ui/Button";
import { Input } from "../../components/ui/Input";
import { toast } from 'react-hot-toast';
import { formatDistanceToNow } from 'date-fns';
import { ptBR, enUS, es } from 'date-fns/locale';
import { ChatAvatar } from './ChatAvatar';
import { MarkdownRenderer } from '../ui/MarkdownRenderer';

// Interface para os locales de formatação de data
const locales = {
  pt: ptBR,
  en: enUS,
  es: es
};

interface MergeChatModalProps {
  sourceChatId: string;
  customerId: string;
  isOpen: boolean;
  onClose: () => void;
  onMergeComplete?: (details: { 
    sourceChatId: string; 
    targetChatId: string;
    success: boolean;
  }) => void;
}

export function MergeChatModal({ 
  sourceChatId, 
  customerId,
  isOpen, 
  onClose,
  onMergeComplete
}: MergeChatModalProps) {
  const { t, i18n } = useTranslation(['chats', 'common']);
  const { currentOrganizationMember } = useAuthContext();
  const [loading, setLoading] = useState(false);
  const [filteredChats, setFilteredChats] = useState<Chat[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedChatId, setSelectedChatId] = useState<string | null>(null);
  const [merging, setMerging] = useState(false);
  const [error, setError] = useState('');

  // Carregar os atendimentos disponíveis para mesclar
  useEffect(() => {
    if (isOpen && sourceChatId && currentOrganizationMember) {
      loadAvailableChats();
    }
  }, [isOpen, sourceChatId, currentOrganizationMember]);

  // Efeito para executar a pesquisa quando o termo mudar
  useEffect(() => {
    if (isOpen && sourceChatId && currentOrganizationMember && customerId) {
      const delayDebounceFn = setTimeout(() => {
        loadAvailableChats(false);
      }, 300); // 300ms de debounce para evitar muitas consultas
      
      return () => clearTimeout(delayDebounceFn);
    }
  }, [searchQuery]);

  // Carrega os atendimentos disponíveis para mesclar
  const loadAvailableChats = async (showLoading = true) => {
    if (!currentOrganizationMember?.organization.id || !customerId) return;
    
    if (showLoading) {
      setLoading(true);
    }
    setError('');
    
    try {
      // Obter a consulta base
      let query = supabase
        .from('chats')
        .select(`
          id,
          ticket_number,
          title,
          status,
          created_at,
          external_id,
          customer_id,
          organization_id,
          channel_id,
          profile_picture,
          arrival_time,
          last_message:messages!chats_last_message_id_fkey(
            id,
            content,
            created_at,
            status,
            type
          ),
          channel_details:chat_channels(
            id,
            name,
            type,
            is_connected
          ),
          customer:customers(
            id,
            name
          )
        `)
        .neq('id', sourceChatId)
        .eq('organization_id', currentOrganizationMember.organization.id)
        .eq('customer_id', customerId)
        .order('last_message_at', { ascending: false })
        .limit(10);
        
      
      // Adicionar a pesquisa à consulta se houver um termo de pesquisa
      if (searchQuery.trim()) {
        // Verificar se a busca é um número para pesquisar pelo ticket
        const isNumberSearch = !isNaN(Number(searchQuery.trim()));
        
        if (isNumberSearch) {
          // Se a busca for um número, buscamos pelo número do ticket
          query = query.filter('ticket_number', 'eq', searchQuery.trim());
        } else {
          // Caso contrário, continuamos com a busca por título
          query = query.filter('title', 'ilike', `%${searchQuery}%`);
        }
      }
      
      const { data: chatsData, error: chatsError } = await query;

      console.log(chatsData);
        
      if (chatsError) throw chatsError;


      setFilteredChats(chatsData);
    } catch (error) {
      console.error('Erro ao carregar atendimentos disponíveis:', error);
      setError(t('common:error'));
    } finally {
      if (showLoading) {
        setLoading(false);
      }
    }
  };

  // Realiza a mesclagem dos atendimentos
  const handleMergeChats = async () => {
    if (!selectedChatId || !sourceChatId || !currentOrganizationMember) {
      setError(t('chats:merge.selectChatError'));
      return;
    }

    setMerging(true);
    setError('');

    try {
      // Primeiro, obtenha informações de ambos os chats
      const { data: sourceChat, error: sourceChatError } = await supabase
        .from('chats')
        .select('id, title, ticket_number')
        .eq('id', sourceChatId)
        .single();

      if (sourceChatError) throw sourceChatError;

      const { data: targetChat, error: targetChatError } = await supabase
        .from('chats')
        .select('id, title, ticket_number')
        .eq('id', selectedChatId)
        .single();

      if (targetChatError) throw targetChatError;

      // Atualizar todas as mensagens do chat de origem para o novo chat de uma vez só
      const { error: updateMessagesError } = await supabase
        .from('messages')
        .update({ chat_id: selectedChatId })
        .eq('chat_id', sourceChatId);

      if (updateMessagesError) throw updateMessagesError;

      // Atualizar todas as sessões de fluxo do chat de origem para o novo chat
      const { error: updateFlowSessionsError } = await supabase
        .from('flow_sessions')
        .update({ chat_id: selectedChatId })
        .eq('chat_id', sourceChatId);

      if (updateFlowSessionsError) throw updateFlowSessionsError;

      // Atualizar o título do chat de destino
      if (!targetChat.title && sourceChat.title) {
        const { error: updateChatError } = await supabase
          .from('chats')
          .update({ title: sourceChat.title })
          .eq('id', selectedChatId);

        if (updateChatError) throw updateChatError;
      }

      // Excluir o chat de origem
      const { error: deleteError } = await supabase
        .from('chats')
        .delete()
        .eq('id', sourceChatId);

      if (deleteError) {
        console.error('Não foi possível excluir o chat de origem:', deleteError);
        // Alternativa: marcar como arquivado se não puder excluir
        const { error: archiveError } = await supabase
          .from('chats')
          .update({
            is_archived: true,
            status: 'closed',
            end_time: new Date().toISOString(),
            title: sourceChat.title ? `${sourceChat.title} (arquivado)` : 'Chat arquivado'
          })
          .eq('id', sourceChatId);
          
        if (archiveError) throw archiveError;
      }

      // Sucesso
      toast.success(t('chats:merge.success'));
      
      if (onMergeComplete) {
        onMergeComplete({ 
          sourceChatId, 
          targetChatId: selectedChatId,
          success: true
        });
      }
      
      onClose();
    } catch (error: unknown) {
      console.error('Erro ao mesclar atendimentos:', error);
      setError(error instanceof Error ? error.message : t('common:error'));
      toast.error(t('chats:merge.error'));
      
      if (onMergeComplete) {
        onMergeComplete({ 
          sourceChatId, 
          targetChatId: selectedChatId || '',
          success: false
        });
      }
    } finally {
      setMerging(false);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-2xl bg-white dark:bg-gray-800 [&>button]:text-gray-900 dark:[&>button]:text-gray-200">
        <DialogHeader>
          <DialogTitle>
            <div className="flex items-center gap-2">
              <GitMerge className="w-5 h-5 text-blue-500" />
              <span>{t('chats:merge.title', 'Mesclar Atendimentos')}</span>
            </div>
          </DialogTitle>
          <DialogDescription>
            {t('chats:merge.description', 'Selecione outro atendimento para mesclar com este. Todas as mensagens serão combinadas em um único atendimento.')}
          </DialogDescription>
        </DialogHeader>

        {error && (
          <div className="bg-red-50 dark:bg-red-900/30 text-red-600 dark:text-red-400 p-3 rounded-md flex items-start gap-2">
            <AlertTriangle className="w-5 h-5 flex-shrink-0 mt-0.5" />
            <p>{error}</p>
          </div>
        )}

        <div className="space-y-4">
          <div className="relative">
            <Search className="absolute left-3 top-2.5 h-4 w-4 text-gray-500 dark:text-gray-400" />
            <Input
              placeholder={t('chats:merge.searchPlaceholder', 'Buscar por número, título ou cliente...')}
              className="pl-10"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
          </div>

          <div className="border border-gray-200 dark:border-gray-700 rounded-md max-h-[400px] overflow-y-auto">
            {loading ? (
              <div className="flex items-center justify-center py-8">
                <Loader2 className="h-8 w-8 animate-spin text-blue-500" />
              </div>
            ) : filteredChats.length === 0 ? (
              <div className="text-center py-8 text-gray-500 dark:text-gray-400">
                <MessageSquare className="h-8 w-8 mx-auto mb-2 opacity-50" />
                <p>{t('chats:merge.noChatsFound', 'Nenhum atendimento encontrado para mesclar.')}</p>
                <p className="mt-2 text-sm">
                  {t('chats:merge.noChatsFoundHelp', 'Para mesclar atendimentos, é necessário ter outros atendimentos ativos do mesmo cliente.')}
                </p>
              </div>
            ) : (
              <div className="divide-y divide-gray-200 dark:divide-gray-700">
                {filteredChats.map(chat => (
                  <div 
                    key={chat.id}
                    className={`flex items-start p-3 hover:bg-gray-50 dark:hover:bg-gray-700/50 cursor-pointer ${
                      selectedChatId === chat.id ? 'bg-blue-50 dark:bg-blue-900/30' : ''
                    }`}
                    onClick={() => setSelectedChatId(chat.id)}
                  >
                    <div className="mr-3">
                      <ChatAvatar 
                        id={chat.id}
                        name={chat.customer?.name || 'Anônimo'}
                        profilePicture={chat.profile_picture}
                        channel={chat.channel_details}
                        size="sm"
                      />
                    </div>
                    <div className="flex-1 min-w-0 overflow-hidden">
                      <div className="flex items-center gap-2">
                        <span className="font-medium text-gray-900 dark:text-white">
                          #{chat.ticket_number}
                        </span>
                        <span className="text-sm text-gray-500 dark:text-gray-400 truncate max-w-[200px]">
                          {chat.title || t('chats:untitledConversation')}
                        </span>
                      </div>
                      
                      {chat.last_message && (
                        <div className="text-sm text-gray-500 dark:text-gray-400 truncate mt-1 max-w-[400px]">
                          {chat.last_message.type === 'text' ? (
                            <MarkdownRenderer 
                              content={chat.last_message.content || ''}
                              variant="compact"
                            />
                          ) : (
                            t(`chats:messageTypes.${chat.last_message.type || 'text'}`, chat.last_message.type)
                          )}
                        </div>
                      )}
                      
                      <div className="mt-1 text-xs text-gray-500 dark:text-gray-400">
                        {chat.last_message ? formatDistanceToNow(
                          new Date(chat.last_message.created_at),
                          { addSuffix: true, locale: locales[i18n.language as keyof typeof locales] || enUS }
                        ) : formatDistanceToNow(
                          new Date(chat.created_at),
                          { addSuffix: true, locale: locales[i18n.language as keyof typeof locales] || enUS }
                        )}
                      </div>
                    </div>
                    <div className="ml-2 flex-shrink-0">
                      <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                        chat.status === 'in_progress'
                          ? 'bg-green-100 text-green-800 dark:bg-green-900/50 dark:text-green-400'
                          : chat.status === 'closed'
                            ? 'bg-gray-100 text-gray-800 dark:bg-gray-900/50 dark:text-gray-400'
                            : 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/50 dark:text-yellow-400'
                      }`}>
                        {t(`chats:status.${chat.status}`)}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        <DialogFooter>
          <Button
            variant="outline"
            onClick={onClose}
            disabled={merging}
          >
            {t('common:cancel')}
          </Button>
          <Button
            onClick={handleMergeChats}
            disabled={!selectedChatId || merging}
            className="gap-2"
          >
            {merging && <Loader2 className="h-4 w-4 animate-spin" />}
            <GitMerge className="h-4 w-4" />
            {t('chats:merge.confirmButton', 'Mesclar Atendimentos')}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
} 