import React from 'react';
import { Modal } from './Modal';
import { Button } from './Button';
import { useTranslation } from 'react-i18next';
import { AlertTriangle, Loader2 } from 'lucide-react';

interface DeleteConfirmationModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: () => Promise<void>;
  isDeleting: boolean;
}

export function DeleteConfirmationModal({ 
  isOpen, 
  onClose, 
  onConfirm,
  isDeleting
}: DeleteConfirmationModalProps) {
  const { t } = useTranslation('common');

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      size="md"
    >
      <div className="text-center">
        <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-red-100 dark:bg-red-900/30 mb-4">
          <AlertTriangle className="h-6 w-6 text-red-600 dark:text-red-400" />
        </div>
        
        <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-2">
          {t('delete_confirmation.title')}
        </h3>
        
        <p className="text-sm text-gray-500 dark:text-gray-400 mb-6">
          {t('delete_confirmation.message')}
        </p>

        <div className="flex justify-end space-x-3">
          <Button
            variant="outline"
            onClick={onClose}
            disabled={isDeleting}
          >
            {t('cancel')}
          </Button>
          <Button
            variant="destructive"
            onClick={onConfirm}
            disabled={isDeleting}
            className="bg-red-600 hover:bg-red-700 text-white focus-visible:ring-red-500 disabled:opacity-50"
          >
            {isDeleting ? (
              <div className="flex items-center gap-2">
                <Loader2 className="h-4 w-4 animate-spin" />
                {t('deleting')}...
              </div>
            ) : (
              t('delete')
            )}
          </Button>
        </div>
      </div>
    </Modal>
  );
} 