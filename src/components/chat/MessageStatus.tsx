import React from 'react';
import { Clock, Check, CheckCheck, AlertCircle, Loader2, Calendar } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import * as Tooltip from '@radix-ui/react-tooltip';

interface MessageStatusProps {
  status: 'pending' | 'sent' | 'delivered' | 'read' | 'failed' | 'received' | 'deleted' | 'scheduled';
  errorMessage?: string;
  className?: string;
  isPending?: boolean;
}

export function MessageStatus({ status, errorMessage, className = '', isPending = false }: MessageStatusProps) {
  const { t } = useTranslation('chats');

  const renderIcon = () => {
    if(isPending) {
      return <Loader2 className={`w-4 h-4 text-yellow-300 dark:text-yellow-500 animate-spin ${className}`} />;
    }
    switch (status) {
      case 'pending'://className="text-gray-500 dark:text-gray-400"
        return <Clock className={`w-4 h-4 text-gray-100/600 dark:text-gray-400 ${className}`} />;
      case 'sent':
        return <Check className={`w-4 h-4 text-gray-100/60 dark:text-gray-400 ${className}`} />;
      case 'delivered':
        return <CheckCheck className={`w-4 h-4 text-gray-100/60 dark:text-gray-400 ${className}`} />;
      case 'read':
        return <CheckCheck className={`w-4 h-4 text-blue-400 ${className}`} />;
      case 'failed':
        return <AlertCircle className={`w-4 h-4 text-red-400 ${className}`} />;
      case 'received':
        return <Check className={`w-4 h-4 text-gray-100/60 dark:text-gray-400 ${className}`} />;
      case 'deleted':
        return <AlertCircle className={`w-4 h-4 text-gray-100/60 dark:text-gray-400 ${className}`} />;
      case 'scheduled':
        return <Calendar className={`w-4 h-4 text-amber-400 ${className}`} />;
      default:
        return null;
    }
  };

  const getMessage = () => {
    switch (status) {
      case 'pending':
        return t('messageStatus.pending');
      case 'sent':
        return t('messageStatus.sent');
      case 'delivered':
        return t('messageStatus.delivered');
      case 'read':
        return t('messageStatus.read');
      case 'failed':
        return errorMessage || t('messageStatus.failed');
      case 'received':
        return t('messageStatus.received');
      case 'deleted':
        return t('messageStatus.deleted');
      case 'scheduled':
        return t('messageStatus.scheduled');
      default:
        return '';
    }
  };

  return (
    <Tooltip.Provider delayDuration={200}>
      <Tooltip.Root>
        <Tooltip.Trigger asChild>
          <div>{renderIcon()}</div>
        </Tooltip.Trigger>
        <Tooltip.Portal>
          <Tooltip.Content
            className="px-2 py-1 text-xs rounded bg-gray-900 text-white dark:bg-white dark:text-gray-900"
            sideOffset={5}
          >
            {getMessage()}
            <Tooltip.Arrow className="fill-gray-900 dark:fill-white" />
          </Tooltip.Content>
        </Tooltip.Portal>
      </Tooltip.Root>
    </Tooltip.Provider>
  );
}