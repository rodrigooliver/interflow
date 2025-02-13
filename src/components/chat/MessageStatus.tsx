import React from 'react';
import { Clock, Check, CheckCheck, AlertCircle } from 'lucide-react';
import { useTranslation } from 'react-i18next';

interface MessageStatusProps {
  status: 'pending' | 'sent' | 'delivered' | 'read' | 'failed';
  errorMessage?: string;
  className?: string;
}

export function MessageStatus({ status, errorMessage, className = '' }: MessageStatusProps) {
  const { t } = useTranslation('chats');

  switch (status) {
    case 'pending':
      return (
        <Clock 
          className={`w-4 h-4 text-gray-400 ${className}`}
          title={t('messageStatus.pending')}
        />
      );
    case 'sent':
      return (
        <Check 
          className={`w-4 h-4 ${className}`}
          title={t('messageStatus.sent')}
        />
      );
    case 'delivered':
      return (
        <CheckCheck 
          className={`w-4 h-4 ${className}`}
          title={t('messageStatus.delivered')}
        />
      );
    case 'read':
      return (
        <CheckCheck 
          className={`w-4 h-4 text-blue-400 ${className}`}
          title={t('messageStatus.read')}
        />
      );
    case 'failed':
      return (
        <AlertCircle 
          className={`w-4 h-4 text-red-500 ${className}`}
          title={errorMessage || t('messageStatus.failed')}
        />
      );
    default:
      return null;
  }
}