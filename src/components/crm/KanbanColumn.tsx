import React from 'react';
import { Pencil, Trash2, MoreVertical, UserPlus } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { useDroppable } from '@dnd-kit/core';
import { SortableContext, verticalListSortingStrategy } from '@dnd-kit/sortable';
import { CRMStage } from '../../types/crm';
import { Customer } from '../../types/database';
import { KanbanCard } from './KanbanCard';

// Tipo composto para cliente com estágio
type CustomerWithStage = Customer & {
  stage?: CRMStage;
};

interface KanbanColumnProps {
  stage: CRMStage;
  customers: Customer[];
  onEdit: () => void;
  onDelete: () => void;
  onAddCustomer: () => void;
  onEditCustomer: (customer: Customer) => void;
  onRemoveCustomer: (customer: Customer) => void;
}

export function KanbanColumn({
  stage,
  customers,
  onEdit,
  onDelete,
  onAddCustomer,
  onEditCustomer,
  onRemoveCustomer
}: KanbanColumnProps) {
  const { t } = useTranslation(['crm', 'common']);
  const { setNodeRef, isOver } = useDroppable({
    id: stage.id
  });

  return (
    <div
      ref={setNodeRef}
      className={`flex-shrink-0 w-80 bg-gray-100 dark:bg-gray-800/50 rounded-lg ${
        isOver ? 'ring-2 ring-dashed ring-blue-500 dark:ring-blue-400' : ''
      }`}
    >
      <div className="p-4">
        <div className="flex justify-between items-start mb-4">
          <div className="flex items-center">
            <div
              className="w-3 h-3 rounded-full mr-2"
              style={{ backgroundColor: stage.color }}
            />
            <h3 className="text-sm font-medium text-gray-900 dark:text-white">
              {stage.name}
            </h3>
            <span className="ml-2 text-sm text-gray-500 dark:text-gray-400">
              ({customers.length})
            </span>
          </div>
          <div className="flex items-center space-x-2">
            <button
              onClick={onAddCustomer}
              className="p-2 rounded-full text-gray-400 hover:text-gray-500 dark:hover:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700/50 transition-colors"
              title={t('crm:customers.addToStage', { stage: stage.name })}
            >
              <UserPlus className="w-4 h-4" />
            </button>
            <div className="relative group">
              <button className="p-2 rounded-full text-gray-400 hover:text-gray-500 dark:hover:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700/50 transition-colors">
                <MoreVertical className="w-4 h-4" />
              </button>
              <div className="absolute right-0 mt-1 w-48 bg-white dark:bg-gray-800 rounded-md shadow-lg py-1 hidden group-hover:block z-10">
                <button
                  onClick={onEdit}
                  className="w-full px-4 py-2 text-sm text-left text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 flex items-center"
                >
                  <Pencil className="w-4 h-4 mr-2" />
                  {t('crm:stages.editStage')}
                </button>
                <button
                  onClick={onDelete}
                  className="w-full px-4 py-2 text-sm text-left text-red-600 hover:bg-gray-100 dark:hover:bg-gray-700 flex items-center"
                >
                  <Trash2 className="w-4 h-4 mr-2" />
                  {t('crm:stages.deleteStage')}
                </button>
              </div>
            </div>
          </div>
        </div>

        <div className={`space-y-3 ${isOver ? 'opacity-50' : ''}`}>
          {customers.map((customer, index) => (
            <KanbanCard
              key={customer.id}
              customer={customer}
              index={index}
              onEdit={() => onEditCustomer(customer)}
              onEditCustomer={() => onEditCustomer(customer)}
              onRemove={() => onRemoveCustomer(customer)}
            />
          ))}
        </div>
      </div>
    </div>
  );
}