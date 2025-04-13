import React, { useState } from 'react';
import { ClosureType } from '../../types/database';
import { Button } from '../ui/Button';
import { useTranslation } from 'react-i18next';
import { Pencil, Trash2 } from 'lucide-react';
import { DeleteConfirmationModal } from '../ui/DeleteConfirmationModal';

interface TypeListProps {
  types: ClosureType[];
  onEdit: (type: ClosureType) => void;
  onDelete: (id: string) => void;
}

export function TypeList({ types, onEdit, onDelete }: TypeListProps) {
  const { t } = useTranslation('closureTypes');
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);

  const handleDelete = async () => {
    if (!deletingId) return;
    
    try {
      setIsDeleting(true);
      await onDelete(deletingId);
    } finally {
      setIsDeleting(false);
      setIsDeleteModalOpen(false);
      setDeletingId(null);
    }
  };

  return (
    <>
      <DeleteConfirmationModal
        isOpen={isDeleteModalOpen}
        onClose={() => {
          setIsDeleteModalOpen(false);
          setDeletingId(null);
        }}
        onConfirm={handleDelete}
        isDeleting={isDeleting}
      />

      <div className="rounded-lg border border-gray-200 dark:border-gray-700 shadow-sm overflow-hidden">
        <table className="w-full">
          <thead className="bg-gray-50 dark:bg-gray-800">
            <tr>
              <th className="px-4 py-3 text-left text-sm font-medium text-gray-500 dark:text-gray-400">
                {t('list.title')}
              </th>
              <th className="px-4 py-3 text-left text-sm font-medium text-gray-500 dark:text-gray-400">
                {t('list.color')}
              </th>
              <th className="hidden md:table-cell px-4 py-3 text-left text-sm font-medium text-gray-500 dark:text-gray-400">
                {t('list.flow')}
              </th>
              <th className="px-4 py-3 text-right text-sm font-medium text-gray-500 dark:text-gray-400">
                {t('actions')}
              </th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-200 dark:divide-gray-700">
            {types.map((type) => (
              <tr 
                key={type.id}
                className="hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors"
              >
                <td className="px-4 py-3 text-sm text-gray-900 dark:text-gray-100">
                  {type.title}
                </td>
                <td className="px-4 py-3">
                  <div 
                    className="w-6 h-6 rounded-full border border-gray-200 dark:border-gray-600"
                    style={{ backgroundColor: type.color }}
                  />
                </td>
                <td className="hidden md:table-cell px-4 py-3 text-sm text-gray-500 dark:text-gray-400">
                  {type.flow?.name || '-'}
                </td>
                <td className="flex justify-end px-4 py-3 text-right space-x-2">
                  <Button 
                    variant="ghost" 
                    size="sm"
                    onClick={() => onEdit(type)}
                    className="text-gray-600 hover:bg-gray-100 dark:text-gray-400 dark:hover:bg-gray-700"
                  >
                    <Pencil className="h-4 w-4" />
                    <span className="sr-only">{t('edit')}</span>
                  </Button>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => {
                      setDeletingId(type.id);
                      setIsDeleteModalOpen(true);
                    }}
                    className="text-red-600 hover:bg-red-50 dark:text-red-400 dark:hover:bg-red-900/20"
                  >
                    <Trash2 className="h-4 w-4" />
                    <span className="sr-only">{t('delete')}</span>
                  </Button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </>
  );
} 