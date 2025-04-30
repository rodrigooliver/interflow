import React, { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { X, Search, MessageSquare, Loader2, MessageCircle, Hash } from 'lucide-react';
import { supabase } from '../../lib/supabase';
import { useAuthContext } from '../../contexts/AuthContext';
import { useNavigate } from 'react-router-dom';

type CustomerData = {
  name?: string;
  id?: string;
};

type ChatData = {
  id: string;
  title?: string;
  ticket_number?: number;
  created_at: string;
  customer?: CustomerData | CustomerData[];
};

type MessageData = {
  id: string;
  chat_id: string;
  content: string;
  created_at: string;
  sender_type: string;
  chat?: {
    customer?: CustomerData | CustomerData[];
  };
};

type SearchResult = {
  id: string;
  chatId: string;
  title: string;
  subtitle: string;
  date: string;
  messageId?: string;
  type: 'message' | 'chat';
  ticketNumber?: number;
};

type SearchModalProps = {
  isOpen: boolean;
  onClose: () => void;
};

export const SearchModal: React.FC<SearchModalProps> = ({ isOpen, onClose }) => {
  const { t } = useTranslation(['chats', 'common']);
  const { currentOrganizationMember } = useAuthContext();
  const [searchTerm, setSearchTerm] = useState('');
  const [results, setResults] = useState<SearchResult[]>([]);
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();

  useEffect(() => {
    if (isOpen) {
      // Focar no input quando o modal abrir
      const searchInput = document.getElementById('search-modal-input');
      if (searchInput) {
        searchInput.focus();
      }
    }
  }, [isOpen]);

  useEffect(() => {
    // Debounce para evitar muitas requisições
    const timer = setTimeout(() => {
      if (searchTerm.trim().length >= 3 && currentOrganizationMember) {
        performSearch();
      } else {
        setResults([]);
      }
    }, 300);

    return () => clearTimeout(timer);
  }, [searchTerm, currentOrganizationMember]);

  const performSearch = async () => {
    if (!currentOrganizationMember || searchTerm.trim().length < 3) return;

    setLoading(true);
    try {
      // Buscar mensagens
      const { data: messagesData, error: messagesError } = await supabase
        .from('messages')
        .select(`
          id,
          chat_id,
          content,
          created_at,
          sender_type,
          chat:chats!messages_chat_id_fkey(
            customer:customers(
              name
            )
          )
        `)
        .eq('organization_id', currentOrganizationMember.organization.id)
        .ilike('content', `%${searchTerm}%`)
        .order('created_at', { ascending: false })
        .limit(10);

      if (messagesError) throw messagesError;

      // Buscar chats por título, nome do cliente e número de ticket
      const { data: chatsData, error: chatsError } = await supabase
        .from('chats')
        .select(`
          id,
          title,
          ticket_number,
          created_at,
          customer:customers!inner(
            id,
            name
          )
        `)
        .eq('organization_id', currentOrganizationMember.organization.id)
        .or(`title.ilike.%${searchTerm}%,ticket_number.eq.${!isNaN(Number(searchTerm)) ? Number(searchTerm) : 0}`)
        .order('created_at', { ascending: false })
        .limit(10);

      if (chatsError) throw chatsError;

      // Buscar chats pelo nome do cliente
      const { data: customerChatsData, error: customerChatsError } = await supabase
        .from('chats')
        .select(`
          id,
          title,
          ticket_number,
          created_at,
          customer:customers!inner(
            id,
            name
          )
        `)
        .eq('organization_id', currentOrganizationMember.organization.id)
        .filter('customer.name', 'ilike', `%${searchTerm}%`)
        .order('created_at', { ascending: false })
        .limit(10);

      if (customerChatsError) throw customerChatsError;

      // Processar resultados de mensagens
      const messageResults: SearchResult[] = [];
      if (messagesData) {
        for (const message of messagesData as MessageData[]) {
          if (!message.content) continue; // Pular mensagens sem conteúdo
          
          // Acessar os dados do cliente de forma segura
          let customerName = t('chats:unnamed');
          try {
            const customerData = message.chat?.customer;
            if (customerData) {
              // Verificar o formato dos dados retornados
              if (Array.isArray(customerData) && customerData.length > 0) {
                customerName = customerData[0].name || t('chats:unnamed');
              } else if (typeof customerData === 'object' && 'name' in customerData) {
                customerName = (customerData as CustomerData).name || t('chats:unnamed');
              }
            }
          } catch (e) {
            console.error('Erro ao acessar dados do cliente:', e);
          }
          
          messageResults.push({
            id: `message-${message.id}`,
            chatId: message.chat_id,
            messageId: message.id,
            title: customerName,
            subtitle: message.content,
            date: new Date(message.created_at).toLocaleDateString(),
            type: 'message'
          });
        }
      }

      // Processar resultados de chats por título e número de ticket
      const chatResults: SearchResult[] = [];
      if (chatsData) {
        for (const chat of chatsData as ChatData[]) {
          let customerName = t('chats:unnamed');
          try {
            const customerData = chat.customer;
            if (customerData) {
              // Verificar o formato dos dados retornados
              if (Array.isArray(customerData) && customerData.length > 0) {
                customerName = customerData[0].name || t('chats:unnamed');
              } else if (typeof customerData === 'object' && 'name' in customerData) {
                customerName = (customerData as CustomerData).name || t('chats:unnamed');
              }
            }
          } catch (e) {
            console.error('Erro ao acessar dados do cliente:', e);
          }

          const chatTitle = chat.title || '';
          
          chatResults.push({
            id: `chat-${chat.id}`,
            chatId: chat.id,
            title: customerName,
            subtitle: chatTitle,
            date: new Date(chat.created_at).toLocaleDateString(),
            type: 'chat',
            ticketNumber: chat.ticket_number
          });
        }
      }

      // Processar resultados de chats por nome do cliente
      if (customerChatsData) {
        for (const chat of customerChatsData as ChatData[]) {
          // Verificar se este chat já está nos resultados
          if (chatResults.some(result => result.chatId === chat.id)) {
            continue;
          }
          
          let customerName = t('chats:unnamed');
          try {
            const customerData = chat.customer;
            if (customerData) {
              // Verificar o formato dos dados retornados
              if (Array.isArray(customerData) && customerData.length > 0) {
                customerName = customerData[0].name || t('chats:unnamed');
              } else if (typeof customerData === 'object' && 'name' in customerData) {
                customerName = (customerData as CustomerData).name || t('chats:unnamed');
              }
            }
          } catch (e) {
            console.error('Erro ao acessar dados do cliente:', e);
          }

          const chatTitle = chat.title || '';
          
          chatResults.push({
            id: `chat-${chat.id}`,
            chatId: chat.id,
            title: customerName,
            subtitle: chatTitle,
            date: new Date(chat.created_at).toLocaleDateString(),
            type: 'chat',
            ticketNumber: chat.ticket_number
          });
        }
      }

      // Combinar e ordenar todos os resultados
      setResults([...chatResults, ...messageResults].sort((a, b) => {
        return new Date(b.date).getTime() - new Date(a.date).getTime();
      }));
    } catch (error) {
      console.error('Erro ao buscar:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleResultClick = (result: SearchResult) => {
    // Navegar para o chat e destacar a mensagem específica se for uma mensagem
    if (result.type === 'message' && result.messageId) {
      navigate(`/app/chats/${result.chatId}?messageId=${result.messageId}`);
    } else {
      navigate(`/app/chats/${result.chatId}`);
    }
    onClose();
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black bg-opacity-50">
      <div className="w-full max-w-2xl bg-white dark:bg-gray-800 rounded-lg shadow-lg overflow-hidden">
        {/* Cabeçalho */}
        <div className="flex items-center justify-between p-4 border-b border-gray-200 dark:border-gray-700">
          <h3 className="text-lg font-medium text-gray-900 dark:text-white">
            {t('chats:search.title')}
          </h3>
          <button
            onClick={onClose}
            className="p-1 rounded-full hover:bg-gray-100 dark:hover:bg-gray-700"
          >
            <X className="w-5 h-5 text-gray-500 dark:text-gray-400" />
          </button>
        </div>

        {/* Campo de busca */}
        <div className="p-4 border-b border-gray-200 dark:border-gray-700">
          <div className="relative">
            <input
              id="search-modal-input"
              type="text"
              placeholder={t('chats:search.placeholder')}
              className="w-full pl-10 pr-4 py-3 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-700 text-gray-900 dark:text-white placeholder-gray-500 dark:placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500 dark:focus:ring-blue-400"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              autoFocus
            />
            <Search className="absolute left-3 top-3.5 w-5 h-5 text-gray-400" />
          </div>
        </div>

        {/* Resultados */}
        <div className="max-h-96 overflow-y-auto">
          {loading ? (
            <div className="flex items-center justify-center p-8">
              <Loader2 className="w-6 h-6 text-blue-500 animate-spin" />
            </div>
          ) : results.length > 0 ? (
            <div className="divide-y divide-gray-200 dark:divide-gray-700">
              {results.map((result) => (
                <div
                  key={result.id}
                  className="p-4 hover:bg-gray-50 dark:hover:bg-gray-700 cursor-pointer"
                  onClick={() => handleResultClick(result)}
                >
                  <div className="flex items-start">
                    <div className="flex-shrink-0 mr-3">
                      {result.type === 'message' ? (
                        <MessageSquare className="w-5 h-5 text-gray-500 dark:text-gray-400" />
                      ) : (
                        <MessageCircle className="w-5 h-5 text-blue-500 dark:text-blue-400" />
                      )}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center">
                        <p className="text-sm font-medium text-gray-900 dark:text-white truncate">
                          {result.title}
                        </p>
                        {result.ticketNumber && (
                          <div className="ml-2 flex items-center text-xs bg-gray-100 dark:bg-gray-700 px-2 py-0.5 rounded-full">
                            <Hash className="w-3 h-3 mr-1" />
                            <span>{result.ticketNumber}</span>
                          </div>
                        )}
                      </div>
                      {(result.type === 'message' || (result.type === 'chat' && result.subtitle)) && (
                        <p className="text-sm text-gray-500 dark:text-gray-400 truncate">
                          {result.subtitle}
                        </p>
                      )}
                    </div>
                    <div className="flex-shrink-0 ml-3">
                      <p className="text-xs text-gray-500 dark:text-gray-400">
                        {result.date}
                      </p>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          ) : searchTerm.length >= 3 ? (
            <div className="flex flex-col items-center justify-center p-8 text-center">
              <MessageSquare className="w-12 h-12 text-gray-400 dark:text-gray-500 mb-4" />
              <p className="text-gray-500 dark:text-gray-400">
                {t('chats:search.noResults')}
              </p>
            </div>
          ) : searchTerm.length > 0 ? (
            <div className="flex flex-col items-center justify-center p-8 text-center">
              <p className="text-gray-500 dark:text-gray-400">
                {t('chats:search.minChars')}
              </p>
            </div>
          ) : (
            <div className="flex flex-col items-center justify-center p-8 text-center">
              <Search className="w-12 h-12 text-gray-400 dark:text-gray-500 mb-4" />
              <p className="text-gray-500 dark:text-gray-400">
                {t('chats:search.startTyping')}
              </p>
            </div>
          )}
        </div>

        {/* Rodapé */}
        <div className="p-4 border-t border-gray-200 dark:border-gray-700 text-xs text-gray-500 dark:text-gray-400">
          {t('chats:search.footer')}
        </div>
      </div>
    </div>
  );
}; 