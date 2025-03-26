import React, { useState, useEffect } from 'react';
import { Loader2 } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { toast } from 'react-hot-toast';
import { supabase } from '../../lib/supabase';
import api from '../../lib/api';
import { useAuthContext } from '../../contexts/AuthContext';

interface TransferChatsModalProps {
  isOpen: boolean;
  onClose: () => void;
  currentChannelId: string;
  channelType: string;
  onTransferSuccess?: () => void;
}

interface Channel {
  id: string;
  name: string;
}

interface ApiError {
  response?: {
    data?: {
      error?: string;
    };
  };
  message?: string;
}

export default function TransferChatsModal({
  isOpen,
  onClose,
  currentChannelId,
  channelType,
  onTransferSuccess
}: TransferChatsModalProps) {
  const { t } = useTranslation(['channels', 'common']);
  const { currentOrganizationMember } = useAuthContext();
  const [availableChannels, setAvailableChannels] = useState<Channel[]>([]);
  const [selectedChannelId, setSelectedChannelId] = useState('');
  const [transferring, setTransferring] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    if (isOpen) {
      loadAvailableChannels();
    }
  }, [isOpen]);

  const loadAvailableChannels = async () => {
    try {
      const { data, error } = await supabase
        .from('chat_channels')
        .select('id, name')
        .eq('type', channelType)
        .eq('organization_id', currentOrganizationMember?.organization.id)
        .neq('id', currentChannelId)
        // .eq('status', 'active');

      if (error) throw error;
      setAvailableChannels(data || []);
    } catch (error) {
      console.error('Error loading channels:', error);
      setError(t('common:error'));
    }
  };

  const handleTransferChats = async () => {
    if (!selectedChannelId || !currentChannelId) return;
    
    setTransferring(true);
    setError('');

    try {
      const response = await api.post(`/api/${currentOrganizationMember?.organization.id}/channel/transfer/${currentChannelId}`, {
        targetChannelId: selectedChannelId
      });

      if (!response.data.success) {
        throw new Error(response.data.error || 'Failed to transfer chats');
      }

      onClose();
      onTransferSuccess?.();
      toast.success(t('channels:form.whatsapp.transferSuccess'));
    } catch (error: unknown) {
      const apiError = error as ApiError;
      console.error('Error transferring chats:', error);
      setError(apiError.response?.data?.error || apiError.message || t('common:error'));
    } finally {
      setTransferring(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white dark:bg-gray-800 rounded-lg p-6 max-w-md w-full mx-4">
        <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-4">
          {t('channels:form.whatsapp.transferTitle')}
        </h3>
        
        {error && (
          <div className="mb-4 bg-red-50 dark:bg-red-900/50 text-red-700 dark:text-red-400 p-4 rounded-md">
            {error}
          </div>
        )}

        <div className="mb-6">
          <label htmlFor="targetChannel" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
            {t('channels:form.whatsapp.selectTargetChannel')}
          </label>
          <select
            id="targetChannel"
            value={selectedChannelId}
            onChange={(e) => setSelectedChannelId(e.target.value)}
            className="w-full rounded-md border p-2 border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white shadow-sm focus:border-blue-500 focus:ring-blue-500"
          >
            {availableChannels.length > 0 ? (
              <>
                <option value="">{t('channels:form.whatsapp.selectChannel')}</option>
                {availableChannels.map(channel => (
                  <option key={channel.id} value={channel.id}>
                    {channel.name}
                  </option>
                ))}
              </>
            ) : (
              <option value="">{t('channels:form.noChannelsAvailable')}</option>
            )}
          </select>
        </div>

        <div className="flex justify-end space-x-3">
          <button
            onClick={onClose}
            disabled={transferring}
            className="px-4 py-2 text-sm font-medium text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700 rounded-md"
          >
            {t('common:cancel')}
          </button>
          <button
            onClick={handleTransferChats}
            disabled={transferring || !selectedChannelId}
            className="px-4 py-2 text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 rounded-md disabled:opacity-50 inline-flex items-center"
          >
            {transferring ? (
              <>
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                {t('channels:form.whatsapp.transferring')}
              </>
            ) : (
              t('channels:form.whatsapp.transfer')
            )}
          </button>
        </div>
      </div>
    </div>
  );
} 