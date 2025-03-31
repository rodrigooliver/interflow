import React from 'react';
import { useTranslation } from 'react-i18next';
import { Loader2, Pause } from 'lucide-react';
import { useFlows } from '../../hooks/useQueryes';
import { Flow } from '../../types/database';
import api from '../../lib/api';
import { supabase } from '../../lib/supabase';
import { toast } from 'react-hot-toast';

interface FlowModalProps {
  isOpen: boolean;
  onClose: () => void;
  chatId: string;
  organizationId: string;
  onFlowStarted: (sessionId: string) => void;
  onFlowPaused: () => void;
  currentFlowSessionId?: string | null;
}

interface ApiError {
  response?: {
    data?: {
      error?: string;
    };
  };
  message?: string;
}

export function FlowModal({ 
  isOpen, 
  onClose, 
  chatId, 
  organizationId, 
  onFlowStarted,
  onFlowPaused,
  currentFlowSessionId
}: FlowModalProps) {
  const { t } = useTranslation('chats');
  const [startingFlowId, setStartingFlowId] = React.useState<string | null>(null);
  const [error, setError] = React.useState<string | null>(null);
  const { data: flows = [], isLoading } = useFlows(organizationId);

  const handleStartFlow = async (flow: Flow) => {
    if (!chatId || !organizationId) return;

    setStartingFlowId(flow.id);
    setError(null);

    try {
      const response = await api.post(`/api/${organizationId}/chat/${chatId}/start-flow`, {
        flowId: flow.id
      });

      if (!response.data.success) {
        throw new Error(response.data.error || t('flows.error'));
      }

      onFlowStarted(response.data.session.id);
      toast.success(t('flows.started'));
      onClose();
    } catch (error: unknown) {
      const apiError = error as ApiError;
      const errorMessage = apiError.response?.data?.error || apiError.message || t('flows.error');
      setError(errorMessage);
      toast.error(errorMessage);
      console.error('Error starting flow:', error);
    } finally {
      setStartingFlowId(null);
    }
  };

  const handlePauseFlow = async () => {
    if (!chatId || !organizationId || !currentFlowSessionId) return;

    setStartingFlowId('pause');
    setError(null);

    try {
      const { error: sessionError } = await supabase
        .from('flow_sessions')
        .update({ status: 'inactive' })
        .eq('id', currentFlowSessionId);

      if (sessionError) {
        throw sessionError;
      }

      const { error: chatError } = await supabase
        .from('chats')
        .update({ flow_session_id: null })
        .eq('id', chatId);

      if (chatError) {
        throw chatError;
      }

      onFlowPaused();
      toast.success(t('flows.paused'));
      onClose();
    } catch (error: unknown) {
      const apiError = error as ApiError;
      const errorMessage = apiError.message || t('flows.error');
      setError(errorMessage);
      toast.error(errorMessage);
      console.error('Error pausing flow:', error);
    } finally {
      setStartingFlowId(null);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white dark:bg-gray-800 rounded-lg p-6 max-w-md w-full mx-4">
        <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-4">
          {t('flows.title')}
        </h3>
        {!currentFlowSessionId && (
          <p className="text-sm text-gray-500 dark:text-gray-400 mb-6">
            {t('flows.description')}
          </p>
        )}

        {currentFlowSessionId ? (
          <div className="space-y-4">
            <div className="p-4 bg-yellow-50 dark:bg-yellow-900/20 text-yellow-700 dark:text-yellow-300 rounded-lg">
              {t('flows.activeFlow')}
            </div>
            <button
              onClick={handlePauseFlow}
              disabled={startingFlowId === 'pause'}
              className="w-full flex items-center justify-center px-4 py-2 bg-yellow-500 hover:bg-yellow-600 text-white rounded-md transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {startingFlowId === 'pause' ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin mr-2" />
                  {t('loading')}
                </>
              ) : (
                <>
                  <Pause className="w-4 h-4 mr-2" />
                  {t('flows.pause')}
                </>
              )}
            </button>
          </div>
        ) : isLoading ? (
          <div className="flex items-center justify-center py-8">
            <Loader2 className="w-6 h-6 animate-spin text-blue-600" />
          </div>
        ) : flows.length === 0 ? (
          <div className="text-center py-8 text-gray-500 dark:text-gray-400">
            {t('flows.noFlows')}
          </div>
        ) : (
          <div className="space-y-2">
            {error && (
              <div className="p-3 rounded-lg bg-red-50 dark:bg-red-900/20 text-red-600 dark:text-red-400 text-sm">
                {error}
              </div>
            )}
            {flows.map((flow) => (
              <button
                key={flow.id}
                onClick={() => handleStartFlow(flow)}
                disabled={startingFlowId !== null}
                className="w-full text-left p-3 rounded-lg border border-gray-200 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <div className="font-medium text-gray-900 dark:text-white">
                  {flow.name}
                </div>
                <div className="text-sm text-gray-500 dark:text-gray-400">
                  {flow.description || t('flows.noDescription')}
                </div>
                {startingFlowId === flow.id && (
                  <div className="mt-2 flex items-center text-sm text-blue-600">
                    <Loader2 className="w-4 h-4 animate-spin mr-2" />
                    {t('loading')}
                  </div>
                )}
              </button>
            ))}
          </div>
        )}

        <div className="mt-6 flex justify-end">
          <button
            onClick={onClose}
            disabled={startingFlowId !== null}
            className="px-4 py-2 text-sm font-medium text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700 rounded-md disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {t('common:cancel')}
          </button>
        </div>
      </div>
    </div>
  );
} 