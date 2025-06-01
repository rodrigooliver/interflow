import React from 'react';
import { useTranslation } from 'react-i18next';
import { Power, PowerOff, Edit, Trash2, Loader2, CheckCircle2, XCircle } from 'lucide-react';
import { ChatChannel } from '../../types/database';
import { getChannelIcon } from '../../utils/channel';

interface ChannelCardProps {
  channel: ChatChannel;
  canManage: boolean;
  onToggleStatus: () => void;
  onEdit?: () => void;
  onDelete?: () => void;
  updatingStatus: boolean;
}

export function ChannelCard({
  channel,
  canManage,
  onToggleStatus,
  onEdit,
  onDelete,
  updatingStatus
}: ChannelCardProps) {
  const { t } = useTranslation('channels');

  const handleEdit = () => {
    if (onEdit) {
      onEdit();
    }
  };

  return (
    <div className="bg-white dark:bg-gray-800 shadow rounded-lg overflow-hidden">
      <div className="p-4 sm:p-6">
        <div className="flex flex-row justify-between sm:items-start gap-4">
          <div className="flex flex-col items-start">
            <img
              src={getChannelIcon(channel.type)}
              alt={t(`types.${channel.type}`)}
              className="w-6 h-6 flex-shrink-0"
            />
            
          </div>

          {canManage && (
            <div className="flex items-center space-x-2 self-end sm:self-start">
              <button
                onClick={onToggleStatus}
                disabled={updatingStatus || !channel.is_tested || !channel.is_connected}
                className={`p-2 rounded-full ${
                  channel.status === 'active'
                    ? 'text-green-600 hover:text-green-700 dark:text-green-400 dark:hover:text-green-500'
                    : 'text-gray-400 hover:text-gray-500 dark:text-gray-500 dark:hover:text-gray-400'
                } disabled:opacity-50 disabled:cursor-not-allowed`}
                title={!channel.is_tested ? t('errors.testRequired') : !channel.is_connected ? t('errors.connectionRequired') : undefined}
              >
                {updatingStatus ? (
                  <Loader2 className="w-5 h-5 animate-spin" />
                ) : channel.status === 'active' ? (
                  <Power className="w-5 h-5" />
                ) : (
                  <PowerOff className="w-5 h-5" />
                )}
              </button>
              <button
                onClick={handleEdit}
                className="p-2 rounded-full text-blue-600 hover:text-blue-700 dark:text-blue-400 dark:hover:text-blue-500"
              >
                <Edit className="w-5 h-5" />
              </button>
              {onDelete && (
                <button
                  onClick={onDelete}
                  className="p-2 rounded-full text-red-600 hover:text-red-700 dark:text-red-400 dark:hover:text-red-500"
                >
                  <Trash2 className="w-5 h-5" />
                </button>
              )}
            </div>
          )}
        </div>

        <div className="w-full min-w-0">
          <h3 className="text-lg font-medium text-gray-900 dark:text-white truncate">
            {channel.name}
          </h3>
          <p className="text-sm text-gray-500 dark:text-gray-400">
            {channel.type !== 'instagram' && t(`types.${channel.type}`)}
            {channel.type === 'email' && channel.credentials?.username && (' [' + channel.credentials.username + ']')}
            {channel.type === 'whatsapp_wapi' && channel.credentials?.numberPhone && (' [' + channel.credentials.numberPhone + ']')}
          </p>
          {channel.type === 'instagram' && (
            <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
              {channel.is_connected && channel.credentials?.username ? (
                <>
                  @{channel.credentials.username}
                  {channel.credentials.instagram_id && (
                    <span className="ml-1 text-xs text-gray-400 dark:text-gray-500">
                      (ID: {channel.credentials.instagram_id})
                    </span>
                  )}
                </>
              ) : (
                <span className="text-gray-500 dark:text-gray-400">{t('form.instagram.noAccount')}</span>
              )}
            </p>
          )}
        </div>
        
        <div className="mt-4">
          <div className="flex flex-wrap items-center gap-2">
            <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
              channel.status === 'active'
                ? 'bg-green-100 text-green-800 dark:bg-green-900/50 dark:text-green-400'
                : 'bg-gray-100 text-gray-800 dark:bg-gray-900/50 dark:text-gray-400'
            }`}>
              {t(`status.${channel.status}`)}
            </span>

            <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
              channel.is_connected
                ? 'bg-green-100 text-green-800 dark:bg-green-900/50 dark:text-green-400'
                : 'bg-red-100 text-red-800 dark:bg-red-900/50 dark:text-red-400'
            }`}>
              {channel.is_connected ? (
                <CheckCircle2 className="w-3 h-3 mr-1" />
              ) : (
                <XCircle className="w-3 h-3 mr-1" />
              )}
              {t(channel.is_connected ? 'status.connected' : 'status.disconnected')}
            </span>
          </div>
        </div>
      </div>
    </div>
  );
}