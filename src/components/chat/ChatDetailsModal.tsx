import React, { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Chat } from '../../types/database';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "../../components/ui/Dialog";
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { Card } from "../../components/ui/Card";
import { Badge } from "../../components/ui/Badge";
import { User, MessageSquare, Clock, Star, BarChart, Loader2 } from "lucide-react";
import { supabase } from '../../lib/supabase';

interface ChatDetailsModalProps {
  chatId: string;
  isOpen: boolean;
  onClose: () => void;
}

export function ChatDetailsModal({ chatId, isOpen, onClose }: ChatDetailsModalProps) {
  const { t } = useTranslation('chats');
  const [chat, setChat] = useState<Chat | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (isOpen && chatId) {
      loadChatDetails();
    }
  }, [isOpen, chatId]);

  const loadChatDetails = async () => {
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from('chats')
        .select(`
          *,
          channel_details:chat_channels(
            id,
            name,
            type,
            is_connected
          ),
          assigned_agent:profiles(
            id,
            full_name,
            email
          ),
          customer:customers(
            id,
            name,
            email
          )
        `)
        .eq('id', chatId)
        .single();

      if (error) {
        throw error;
      }

      setChat(data);
    } catch (error) {
      console.error('Error loading chat details:', error);
    } finally {
      setLoading(false);
    }
  };

  const formatDate = (date: string | null | undefined) => {
    if (!date) return '-';
    return format(new Date(date), "dd 'de' MMMM 'de' yyyy 'às' HH:mm", { locale: ptBR });
  };

  const getStatusText = (status: string) => {
    switch (status) {
      case 'pending':
        return t('status.pending');
      case 'in_progress':
        return t('status.in_progress');
      case 'closed':
        return t('status.closed');
      default:
        return status;
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'pending':
        return 'bg-yellow-500/10 text-yellow-500';
      case 'in_progress':
        return 'bg-blue-500/10 text-blue-500';
      case 'closed':
        return 'bg-green-500/10 text-green-500';
      default:
        return 'bg-gray-500/10 text-gray-500';
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-3xl bg-white dark:bg-gray-800 [&>button]:text-gray-900 dark:[&>button]:text-gray-200 max-h-[90vh] flex flex-col">
        <DialogHeader className="flex-none">
          <DialogTitle className="text-xl font-semibold text-gray-900 dark:text-gray-200">{t('chatDetails.title')}</DialogTitle>
          <DialogDescription className="text-sm text-gray-500 dark:text-gray-400">
            {t('chatDetails.description')}
          </DialogDescription>
        </DialogHeader>
        
        <div className="flex-1 overflow-y-auto mt-4 pr-2 -mr-2">
          {loading ? (
            <div className="flex flex-col items-center justify-center p-8 space-y-4">
              <Loader2 className="w-8 h-8 animate-spin text-gray-500 dark:text-gray-400" />
              <p className="text-sm text-gray-500 dark:text-gray-400">{t('loading')}</p>
            </div>
          ) : chat ? (
            <div className="grid grid-cols-1 gap-4 md:gap-6 max-w-2xl mx-auto">
              {/* Informações do Canal e Atendente */}
              <Card className="border-border">
                <Card.Content className="pt-6">
                  <div className="flex items-center gap-4 mb-4">
                    <div className="p-2 bg-gray-100 dark:bg-gray-700 rounded-lg">
                      <MessageSquare className="w-5 h-5 text-gray-900 dark:text-gray-200" />
                    </div>
                    <div>
                      <h3 className="text-sm font-medium text-gray-500 dark:text-gray-400">{t('chatDetails.channel')}</h3>
                      <p className="text-sm text-gray-900 dark:text-gray-200">{chat.channel_details?.name || '-'}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-4">
                    <div className="p-2 bg-gray-100 dark:bg-gray-700 rounded-lg">
                      <User className="w-5 h-5 text-gray-900 dark:text-gray-200" />
                    </div>
                    <div>
                      <h3 className="text-sm font-medium text-gray-500 dark:text-gray-400">{t('chatDetails.agent')}</h3>
                      <p className="text-sm text-gray-900 dark:text-gray-200">{chat.assigned_agent?.full_name || '-'}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-4 mt-4">
                    <div className="p-2 bg-gray-100 dark:bg-gray-700 rounded-lg">
                      <MessageSquare className="w-5 h-5 text-gray-900 dark:text-gray-200" />
                    </div>
                    <div>
                      <h3 className="text-sm font-medium text-gray-500 dark:text-gray-400">{t('chatDetails.externalId')}</h3>
                      <p className="text-sm text-gray-900 dark:text-gray-200">{chat.external_id || '-'}</p>
                    </div>
                  </div>
                  <div className="flex items-start gap-4 mt-4">
                    <div className="p-2 bg-gray-100 dark:bg-gray-700 rounded-lg mt-1">
                      <MessageSquare className="w-5 h-5 text-gray-900 dark:text-gray-200" />
                    </div>
                    <div className="min-w-0 flex-1">
                      <h3 className="text-sm font-medium text-gray-500 dark:text-gray-400">{t('chatDetails.chatTitle')}</h3>
                      <p className="text-sm text-gray-900 dark:text-gray-200 line-clamp-2">{chat.title || '-'}</p>
                    </div>
                  </div>
                </Card.Content>
              </Card>

              {/* Informações Básicas */}
              <Card className="border-border">
                <Card.Content className="pt-6">
                  <div className="flex items-center gap-4 mb-4">
                    <div className="p-2 bg-gray-100 dark:bg-gray-700 rounded-lg">
                      <BarChart className="w-5 h-5 text-gray-900 dark:text-gray-200" />
                    </div>
                    <h3 className="text-sm font-medium text-gray-500 dark:text-gray-400">{t('chatDetails.basicInfo')}</h3>
                  </div>
                  <dl className="space-y-3">
                    <div className="flex justify-between items-center">
                      <dt className="text-sm text-gray-500 dark:text-gray-400">{t('chatDetails.ticketNumber')}</dt>
                      <dd className="text-sm text-gray-900 dark:text-gray-200">{chat.ticket_number || '-'}</dd>
                    </div>
                    <div className="flex justify-between items-center">
                      <dt className="text-sm text-gray-500 dark:text-gray-400">{t('chatDetails.status')}</dt>
                      <Badge variant="secondary" className={getStatusColor(chat.status)}>
                        {getStatusText(chat.status)}
                      </Badge>
                    </div>
                    <div className="flex justify-between items-center">
                      <dt className="text-sm text-gray-500 dark:text-gray-400">{t('chatDetails.isArchived')}</dt>
                      <dd className="text-sm text-gray-900 dark:text-gray-200">{chat.is_archived ? t('common.yes') : t('common.no')}</dd>
                    </div>
                    <div className="flex justify-between items-center">
                      <dt className="text-sm text-gray-500 dark:text-gray-400">{t('chatDetails.isFixed')}</dt>
                      <dd className="text-sm text-gray-900 dark:text-gray-200">{chat.is_fixed ? t('common.yes') : t('common.no')}</dd>
                    </div>
                  </dl>
                </Card.Content>
              </Card>

              {/* Datas e Horários */}
              <Card className="border-border">
                <Card.Content className="pt-6">
                  <div className="flex items-center gap-4 mb-4">
                    <div className="p-2 bg-gray-100 dark:bg-gray-700 rounded-lg">
                      <Clock className="w-5 h-5 text-gray-900 dark:text-gray-200" />
                    </div>
                    <h3 className="text-sm font-medium text-gray-500 dark:text-gray-400">{t('chatDetails.timestamps')}</h3>
                  </div>
                  <dl className="space-y-3">
                    <div className="flex flex-col sm:flex-row sm:items-center gap-1 sm:gap-4">
                      <dt className="text-sm text-gray-500 dark:text-gray-400 sm:w-[140px] sm:shrink-0">{t('chatDetails.createdAt')}</dt>
                      <dd className="text-sm text-gray-900 dark:text-gray-200 sm:flex-1 text-right">{formatDate(chat.created_at)}</dd>
                    </div>
                    <div className="flex flex-col sm:flex-row sm:items-center gap-1 sm:gap-4">
                      <dt className="text-sm text-gray-500 dark:text-gray-400 sm:w-[140px] sm:shrink-0">{t('chatDetails.arrivalTime')}</dt>
                      <dd className="text-sm text-gray-900 dark:text-gray-200 sm:flex-1 text-right">{formatDate(chat.arrival_time)}</dd>
                    </div>
                    <div className="flex flex-col sm:flex-row sm:items-center gap-1 sm:gap-4">
                      <dt className="text-sm text-gray-500 dark:text-gray-400 sm:w-[140px] sm:shrink-0">{t('chatDetails.startTime')}</dt>
                      <dd className="text-sm text-gray-900 dark:text-gray-200 sm:flex-1 text-right">{formatDate(chat.start_time)}</dd>
                    </div>
                    <div className="flex flex-col sm:flex-row sm:items-center gap-1 sm:gap-4">
                      <dt className="text-sm text-gray-500 dark:text-gray-400 sm:w-[140px] sm:shrink-0">{t('chatDetails.endTime')}</dt>
                      <dd className="text-sm text-gray-900 dark:text-gray-200 sm:flex-1 text-right">{formatDate(chat.end_time)}</dd>
                    </div>
                    <div className="flex flex-col sm:flex-row sm:items-center gap-1 sm:gap-4">
                      <dt className="text-sm text-gray-500 dark:text-gray-400 sm:w-[140px] sm:shrink-0">{t('chatDetails.lastMessageAt')}</dt>
                      <dd className="text-sm text-gray-900 dark:text-gray-200 sm:flex-1 text-right">{formatDate(chat.last_message_at)}</dd>
                    </div>
                  </dl>
                </Card.Content>
              </Card>

              {/* Feedback e Métricas */}
              <Card className="border-border">
                <Card.Content className="pt-6">
                  <div className="flex items-center gap-4 mb-4">
                    <div className="p-2 bg-gray-100 dark:bg-gray-700 rounded-lg">
                      <Star className="w-5 h-5 text-gray-900 dark:text-gray-200" />
                    </div>
                    <h3 className="text-sm font-medium text-gray-500 dark:text-gray-400">{t('chatDetails.feedback')}</h3>
                  </div>
                  <dl className="space-y-3">
                    <div className="flex justify-between items-center">
                      <dt className="text-sm text-gray-500 dark:text-gray-400">{t('chatDetails.rating')}</dt>
                      <dd className="text-sm text-gray-900 dark:text-gray-200">
                        {chat.rating ? (
                          <div className="flex items-center gap-1">
                            <span>{chat.rating}/5</span>
                            <Star className="w-4 h-4 text-yellow-500 fill-yellow-500" />
                          </div>
                        ) : '-'}
                      </dd>
                    </div>
                    <div className="flex justify-between items-center">
                      <dt className="text-sm text-gray-500 dark:text-gray-400">{t('chatDetails.feedbackText')}</dt>
                      <dd className="text-sm text-gray-900 dark:text-gray-200 max-w-[200px] text-right">{chat.feedback || '-'}</dd>
                    </div>
                    <div className="flex justify-between items-center">
                      <dt className="text-sm text-gray-500 dark:text-gray-400">{t('chatDetails.unreadCount')}</dt>
                      <dd className="text-sm text-gray-900 dark:text-gray-200">{chat.unread_count}</dd>
                    </div>
                  </dl>
                </Card.Content>
              </Card>
            </div>
          ) : null}
        </div>
      </DialogContent>
    </Dialog>
  );
} 