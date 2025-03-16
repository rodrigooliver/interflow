import React, { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { X, Search, MessageSquare, Loader2 } from 'lucide-react';
import { supabase } from '../../lib/supabase';
import { useAuthContext } from '../../contexts/AuthContext';
import { useNavigate } from 'react-router-dom';

type SearchResult = {
  id: string;
  chatId: string;
  title: string;
  subtitle: string;
  date: string;
  messageId: string;
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
      // Buscar apenas mensagens
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
        .limit(20);

      if (messagesError) throw messagesError;

      // Processar resultados de mensagens
      const messageResults: SearchResult[] = [];
      if (messagesData) {
        for (const message of messagesData) {
          if (!message.content) continue; // Pular mensagens sem conteúdo
          
          // Acessar os dados do cliente de forma segura
          let customerName = t('chats:unnamed');
          try {
            if (message.chat && 
                message.chat.customer && 
                typeof message.chat.customer === 'object' && 
                message.chat.customer.name) {
              customerName = message.chat.customer.name;
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
          });
        }
      }

      setResults(messageResults);
    } catch (error) {
      console.error('Erro ao buscar:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleResultClick = (result: SearchResult) => {
    // Navegar para o chat e destacar a mensagem específica
    navigate(`/app/chats/${result.chatId}?messageId=${result.messageId}`);
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
                      <MessageSquare className="w-5 h-5 text-gray-500 dark:text-gray-400" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-gray-900 dark:text-white truncate">
                        {result.title}
                      </p>
                      <p className="text-sm text-gray-500 dark:text-gray-400 truncate">
                        {result.subtitle}
                      </p>
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