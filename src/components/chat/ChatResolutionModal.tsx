import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { ClosureType } from '../../types/database';

interface ChatResolutionModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: (data: { closureTypeId: string; title: string }) => void;
  closureTypes: ClosureType[];
}

export function ChatResolutionModal({ isOpen, onClose, onConfirm, closureTypes }: ChatResolutionModalProps) {
  const { t } = useTranslation('chats');
  const [selectedType, setSelectedType] = useState<string>('');
  const [title, setTitle] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  if (!isOpen) return null;

  const handleConfirm = async () => {
    setIsLoading(true);
    try {
      await onConfirm({ closureTypeId: selectedType, title });
    } finally {
      setIsLoading(false);
    }
  };

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

          <div>
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
              placeholder={t('resolution.summaryPlaceholder')}
            />
          </div>
        </div>

        <div className="flex justify-end space-x-2 mt-6">
          <button
            onClick={onClose}
            className="px-4 py-2 rounded-md
              text-gray-700 dark:text-gray-300 
              hover:bg-gray-100 dark:hover:bg-gray-700 
              transition-colors"
          >
            {t('cancel')}
          </button>
          <button
            onClick={handleConfirm}
            disabled={!selectedType || !title.trim() || isLoading}
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