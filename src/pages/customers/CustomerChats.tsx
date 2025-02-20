import React, { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import { ArrowLeft, MessageSquare, User, Clock, Calendar, Check, CheckCheck, AlertCircle } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { useOrganizationContext } from '../../contexts/OrganizationContext';
import { supabase } from '../../lib/supabase';
import { formatDistanceToNow, format } from 'date-fns';
import { ptBR, enUS, es } from 'date-fns/locale';
import { Chat } from '../../types/database';
import { Customer } from '../../types/database';
const locales = {
  pt: ptBR,
  en: enUS,
  es: es
};

export default function CustomerChats() {
  const { id } = useParams();
  const { t, i18n } = useTranslation(['customers', 'chats', 'common']);
  const { currentOrganization } = useOrganizationContext();
  const [customer, setCustomer] = useState<Customer | null>(null);
  const [chats, setChats] = useState<Chat[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    if (currentOrganization && id) {
      loadCustomerAndChats();
    }
  }, [currentOrganization, id]);

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

      // Load customer's chats with assigned agent details and last message
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
          )
        `)
        .eq('customer_id', id)
        .order('created_at', { ascending: false });

      if (chatsError) throw chatsError;

      // Processar os chats para manter a estrutura existente
      const processedChats = (chatsData || []).map(chat => ({
        ...chat,
        last_message: chat.last_message ? {
          content: chat.last_message.content,
          status: chat.last_message.status,
          error_message: chat.last_message.error_message
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
            <Link
              to="/app/customers"
              className="mr-4 text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300"
            >
              <ArrowLeft className="w-5 h-5" />
            </Link>
            <div>
              <h1 className="text-2xl font-bold text-gray-900 dark:text-white">
                {customer.name}
              </h1>
              <p className="text-sm text-gray-500 dark:text-gray-400">
                {customer.email || customer.whatsapp}
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
          <div className="space-y-4">
            {chats.map((chat) => (
              <Link
                key={chat.id}
                to={`/app/chats/${chat.id}`}
                className="block bg-white dark:bg-gray-800 rounded-lg shadow hover:shadow-md transition-shadow"
              >
                <div className="p-6">
                  <div className="flex items-center justify-between mb-4">
                    <div className="flex items-center space-x-4">
                      <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                        chat.status === 'in_progress'
                          ? 'bg-green-100 text-green-800 dark:bg-green-900/50 dark:text-green-400'
                          : 'bg-gray-100 text-gray-800 dark:bg-gray-900/50 dark:text-gray-400'
                      }`}>
                        {t(`chats:status.${chat.status}`)}
                      </span>
                      <span className="text-sm text-gray-500 dark:text-gray-400">
                        {format(new Date(chat.created_at), "dd/MM/yyyy 'às' HH:mm")}
                      </span>
                    </div>
                    <div className="flex items-center space-x-2">
                      {chat.last_message?.status && getStatusIcon(chat.last_message.status)}
                      <span className="text-sm text-gray-500 dark:text-gray-400">
                        {formatDistanceToNow(new Date(chat.last_message_at), {
                          addSuffix: true,
                          locale: locales[i18n.language as keyof typeof locales] || enUS
                        })}
                      </span>
                    </div>
                  </div>

                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      {chat.last_message && (
                        <p className="text-gray-600 dark:text-gray-300 line-clamp-2">
                          {chat.last_message.content}
                        </p>
                      )}
                    </div>
                    {chat.assigned_agent && (
                      <div className="ml-4 flex items-center text-sm text-gray-500 dark:text-gray-400">
                        <User className="w-4 h-4 mr-1" />
                        {chat.assigned_agent.full_name}
                      </div>
                    )}
                  </div>

                  {chat.start_time && (
                    <div className="mt-4 flex items-center space-x-4 text-sm text-gray-500 dark:text-gray-400">
                      <div className="flex items-center">
                        <Clock className="w-4 h-4 mr-1" />
                        {t('chats:time.start')}: {format(new Date(chat.start_time), "HH:mm")}
                      </div>
                      {chat.end_time && (
                        <div className="flex items-center">
                          <Calendar className="w-4 h-4 mr-1" />
                          {t('chats:time.end')}: {format(new Date(chat.end_time), "HH:mm")}
                        </div>
                      )}
                    </div>
                  )}
                </div>
              </Link>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}