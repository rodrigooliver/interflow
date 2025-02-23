import React from 'react';
import { Clock, Check, CheckCheck, AlertCircle } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import * as Tooltip from '@radix-ui/react-tooltip';

interface MessageStatusProps {
  status: 'pending' | 'sent' | 'delivered' | 'read' | 'failed';
  errorMessage?: string;
  className?: string;
}

export function MessageStatus({ status, errorMessage, className = '' }: MessageStatusProps) {
  const { t } = useTranslation('chats');

  const renderIcon = () => {
    switch (status) {
      case 'pending':
        return <Clock className={`w-4 h-4 text-gray-400 ${className}`} />;
      case 'sent':
        return <Check className={`w-4 h-4 ${className}`} />;
      case 'delivered':
        return <CheckCheck className={`w-4 h-4 ${className}`} />;
      case 'read':
        return <CheckCheck className={`w-4 h-4 text-blue-400 ${className}`} />;
      case 'failed':
        return <AlertCircle className={`w-4 h-4 text-red-500 ${className}`} />;
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