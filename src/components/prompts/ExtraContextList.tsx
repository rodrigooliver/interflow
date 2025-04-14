import React from 'react';
import { useTranslation } from 'react-i18next';
import { Pencil, Trash2, MessageSquare } from 'lucide-react';

interface ExtraContext {
  id: string;
  title: string;
  description: string;
  content: string;
  type: 'whatsapp_list';
}

interface ExtraContextListProps {
  contexts: ExtraContext[];
  onEdit: (context: ExtraContext) => void;
  onDelete: (id: string) => void;
}

const ExtraContextList: React.FC<ExtraContextListProps> = ({
  contexts,
  onEdit,
  onDelete
}) => {
  const { t } = useTranslation(['prompts']);

  if (contexts.length === 0) {
    return (
      <div className="bg-gray-50 dark:bg-gray-800/50 rounded-lg p-4">
        <p className="text-sm text-gray-500 dark:text-gray-400">
          {t('prompts:noExtraContexts')}
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {contexts.map((context) => (
        <div
          key={context.id}
          className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 p-4"
        >
          <div className="flex items-start justify-between">
            <div className="flex items-start space-x-3">
              <div className="flex-shrink-0">
                <MessageSquare className="w-5 h-5 text-blue-600 dark:text-blue-400" />
              </div>
              <div className="flex-1 min-w-0">
                <h4 className="text-sm font-medium text-gray-900 dark:text-white">
                  {context.title}
                </h4>
                {context.description && (
                  <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
                    {context.description}
                  </p>
                )}
              </div>
            </div>
            <div className="flex items-center space-x-2">
              <button
                onClick={() => onEdit(context)}
                className="p-1 text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-300"
                title={t('common:edit')}
              >
                <Pencil className="w-4 h-4" />
              </button>
              <button
                onClick={() => onDelete(context.id)}
                className="p-1 text-red-500 hover:text-red-700 dark:text-red-400 dark:hover:text-red-300"
                title={t('common:delete')}
              >
                <Trash2 className="w-4 h-4" />
              </button>
            </div>
          </div>
        </div>
      ))}
    </div>
  );
};

export default ExtraContextList; 