import { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { ClosureType } from '../../types/database';
import { useAuthContext } from '../../contexts/AuthContext';
import api from '../../lib/api';
import { Loader2 } from 'lucide-react';

interface ApiError {
  response?: {
    data?: {
      error?: string;
    };
  };
  message?: string;
}

interface ChatResolutionModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: (data: { closureTypeId: string; title: string }) => void;
  closureTypes: ClosureType[];
  chatId: string;
}

export function ChatResolutionModal({ isOpen, onClose, onConfirm, closureTypes, chatId }: ChatResolutionModalProps) {
  const { t } = useTranslation('chats');
  const { currentOrganizationMember } = useAuthContext();
  const [selectedType, setSelectedType] = useState<string>('');
  const [title, setTitle] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [isGeneratingSummary, setIsGeneratingSummary] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    if (isOpen && currentOrganizationMember) {
      generateSummary();
    }
  }, [isOpen, currentOrganizationMember]);

  const generateSummary = async () => {
    if (!currentOrganizationMember) return;
    
    setIsGeneratingSummary(true);
    setError('');
    
    try {
      const response = await api.post(
        `/api/${currentOrganizationMember.organization.id}/chat/${chatId}/generate-summary`
      );

      if (!response.data.success) {
        throw new Error(response.data.error || t('resolution.error'));
      }

      setTitle(response.data.data.summary);
    } catch (err: unknown) {
      console.error('Erro ao gerar resumo:', err);
      const apiError = err as ApiError;
      setError(apiError.response?.data?.error || apiError.message || t('resolution.error'));
    } finally {
      setIsGeneratingSummary(false);
    }
  };

  const handleConfirm = async () => {

    if (!currentOrganizationMember) return;
    
    setIsLoading(true);
    setError('');
    
    try {
      await onConfirm({ closureTypeId: selectedType, title });
    } catch (err: unknown) {
      console.error('Erro ao resolver chat:', err);
      const apiError = err as ApiError;
      setError(apiError.response?.data?.error || apiError.message || t('resolution.error'));
    } finally {
      setIsLoading(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
      <div className="bg-white dark:bg-gray-800 rounded-lg p-6 w-full max-w-md">
        <h2 className="text-xl font-semibold mb-4 text-gray-900 dark:text-gray-100">
          {t('resolution.title')}
        </h2>
        
        <div className="space-y-4">
          <div>
            <div className="grid grid-cols-2 gap-2">
              {closureTypes.map((type) => (
                <button
                  key={type.id}
                  onClick={() => setSelectedType(type.id)}
                  className={`p-2 rounded-md border text-left transition-colors
                    ${selectedType === type.id
                      ? 'border-blue-500 bg-blue-50 dark:bg-blue-900/20 text-gray-900 dark:text-gray-100'
                      : 'border-gray-200 dark:border-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700/50'
                    }`}
                  style={{ borderLeftColor: type.color, borderLeftWidth: '4px' }}
                >
                  {type.title}
                </button>
              ))}
            </div>
          </div>

          <div className="space-y-2">
            <div className="flex justify-between items-center">
              <label className="text-sm font-medium text-gray-700 dark:text-gray-300">
                {t('resolution.summary')}
              </label>
              <button
                onClick={generateSummary}
                disabled={isGeneratingSummary}
                className="text-sm text-blue-600 dark:text-blue-400 hover:text-blue-700 dark:hover:text-blue-300 flex items-center gap-1 disabled:opacity-50"
              >
                {isGeneratingSummary ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    {t('resolution.generating')}
                  </>
                ) : (
                  t('resolution.generateNew')
                )}
              </button>
            </div>
            <textarea
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              className="w-full p-2 border rounded-md 
                bg-white dark:bg-gray-700 
                border-gray-300 dark:border-gray-600
                text-gray-900 dark:text-gray-100
                placeholder-gray-400 dark:placeholder-gray-500
                focus:ring-2 focus:ring-blue-500 dark:focus:ring-blue-600 
                focus:border-transparent
                transition-colors"
              rows={3}
              placeholder={isGeneratingSummary ? t('resolution.generatingSummary') : t('resolution.summaryPlaceholder')}
              disabled={isGeneratingSummary}
            />
          </div>

          {error && (
            <div className="text-red-500 text-sm">
              {error}
            </div>
          )}
        </div>

        <div className="flex justify-end space-x-2 mt-6">
          <button
            onClick={onClose}
            className="px-4 py-2 rounded-md
              text-gray-700 dark:text-gray-300 
              hover:bg-gray-100 dark:hover:bg-gray-700 
              transition-colors"
            disabled={isGeneratingSummary}
          >
            {t('cancel')}
          </button>
          <button
            onClick={handleConfirm}
            disabled={!selectedType || !title.trim() || isLoading || isGeneratingSummary}
            className="px-4 py-2 rounded-md
              bg-blue-600 hover:bg-blue-700 
              text-white
              disabled:opacity-50 disabled:cursor-not-allowed
              transition-colors"
          >
            {isLoading ? t('loading') : t('confirm')}
          </button>
        </div>
      </div>
    </div>
  );
} 