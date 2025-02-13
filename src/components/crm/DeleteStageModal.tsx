import React from 'react';
import { AlertTriangle, Loader2 } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { CRMStage } from '../../types/crm';

interface DeleteStageModalProps {
  stage: CRMStage;
  onConfirm: () => Promise<void>;
  onCancel: () => void;
  loading: boolean;
  error?: string;
}

export function DeleteStageModal({ stage, onConfirm, onCancel, loading, error }: DeleteStageModalProps) {
  const { t } = useTranslation(['crm', 'common']);

  return (
    <div className="fixed inset-0 bg-gray-500 bg-opacity-75 flex items-center justify-center p-4 z-50">
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow-xl max-w-md w-full">
        <div className="p-6">
          <div className="flex items-center justify-center w-12 h-12 mx-auto bg-red-100 dark:bg-red-900/50 rounded-full mb-4">
            <AlertTriangle className="h-6 w-6 text-red-600 dark:text-red-400" />
          </div>
          <h3 className="text-lg font-medium text-gray-900 dark:text-white text-center mb-2">
            {t('crm:stages.deleteStage')}
          </h3>
          <p className="text-sm text-gray-500 dark:text-gray-400 text-center mb-6">
            {t('crm:funnels.delete.confirmation', { name: stage.name })}
            <br />
            {t('crm:funnels.delete.warning')}
          </p>

          {error && (
            <div className="mb-4 bg-red-50 dark:bg-red-900/50 text-red-700 dark:text-red-400 p-3 rounded-md">
              {error}
            </div>
          )}

          <div className="flex justify-end space-x-3">
            <button
              type="button"
              onClick={onCancel}
              disabled={loading}
              className="px-4 py-2 text-sm font-medium text-gray-700 dark:text-gray-300 bg-white dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded-md hover:bg-gray-50 dark:hover:bg-gray-600 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
            >
              {t('common:back')}
            </button>
            <button
              type="button"
              onClick={onConfirm}
              disabled={loading}
              className="inline-flex items-center px-4 py-2 text-sm font-medium text-white bg-red-600 border border-transparent rounded-md hover:bg-red-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-red-500 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {loading ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  {t('common:deleting')}
                </>
              ) : (
                t('common:confirmDelete')
              )}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}